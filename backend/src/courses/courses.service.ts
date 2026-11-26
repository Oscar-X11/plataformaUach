import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { ActivityService } from '../activity/activity.service';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CourseAccessService, CourseRole } from './course-access.service';
import { CopyCourseDto, CreateCourseDto, UpdateDescriptionDto, UpdateMeetingInfoDto } from './dto/create-course.dto';

// Sin caracteres que se confunden al dictarlos o copiarlos del pizarrón (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 7;

export function generateInvitationCode() {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join('');
}

const COURSE_SELECT = {
  id: true,
  name: true,
  term: true,
  invitation: true,
  description: true,
  meetingInfo: true,
  teacherId: true,
  createdAt: true,
  grade: true,
  career: { select: { id: true, name: true, code: true, faculty: { select: { name: true, scheme: true } } } },
  subject: { select: { id: true, name: true, code: true, semester: true } },
  teacher: { select: { id: true, fullName: true } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseSelect;

type CourseRow = Prisma.CourseGetPayload<{ select: typeof COURSE_SELECT }>;

/** Cuatrimestres o semestres que puede tener una carrera según su nivel. */
/** Licenciaturas e ingenierías: 9 cuatrimestres. Bachillerato: 6 semestres. */
export const MAX_GRADE = { CUATRIMESTRAL: 9, SEMESTRAL: 6 } as const;

/** "ISC · 4.º cuat" — etiqueta corta de la clase para listas y paneles. */
export function courseLabel(course: { grade: number; career: { code: string; faculty: { scheme: string } } }) {
  const unit = course.career.faculty.scheme === 'SEMESTRAL' ? 'sem' : 'cuat';
  return `${course.career.code} · ${course.grade}.º ${unit}`;
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
  ) {}

  /** Cursos del usuario: los que imparte, en los que está inscrito o todos (admin). */
  async list(user: TokenPayload) {
    const where: Prisma.CourseWhereInput =
      user.role === 'ADMIN'
        ? {}
        : user.role === 'TEACHER'
          ? { teacherId: user.sub }
          : { enrollments: { some: { studentId: user.sub } } };

    const rows = await this.prisma.course.findMany({
      where,
      select: COURSE_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });
    return rows.map((row) => this.toSummary(row, this.roleFromRow(row, user)));
  }

  async get(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const row = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: COURSE_SELECT,
    });
    return this.toSummary(row, role);
  }

  async create(dto: CreateCourseDto, user: TokenPayload) {
    const career = await this.prisma.career.findUnique({
      where: { id: dto.careerId },
      select: { id: true, faculty: { select: { scheme: true } } },
    });
    if (!career) throw new BadRequestException('La carrera no existe');
    const scheme = career.faculty.scheme;
    const maxGrade = MAX_GRADE[scheme];
    if (dto.grade > maxGrade) {
      const unit = scheme === 'SEMESTRAL' ? 'semestre' : 'cuatrimestre';
      throw new BadRequestException(`El ${unit} va de 1 a ${maxGrade}`);
    }
    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
        select: { careerId: true },
      });
      if (!subject || subject.careerId !== career.id) {
        throw new BadRequestException('La materia no pertenece a esa carrera');
      }
    }
    const term = await this.prisma.academicTerm.findUnique({
      where: { code: dto.term },
      select: { code: true, closed: true, scheme: true },
    });
    if (!term || term.closed) {
      throw new BadRequestException('Elige un periodo abierto (los da de alta la administración)');
    }
    // El bachillerato va por semestres; licenciaturas e ingenierías, por cuatrimestres.
    if (term.scheme !== scheme) {
      const expected = scheme === 'SEMESTRAL' ? 'semestral' : 'cuatrimestral';
      throw new BadRequestException(`Esta carrera va por periodos de tipo ${expected}; elige uno de ese tipo`);
    }

    const row = await this.withFreshCode((invitation) =>
      this.prisma.course.create({
        data: {
          name: dto.name,
          term: term.code,
          description: dto.description ?? null,
          meetingInfo: dto.meetingInfo ?? null,
          invitation,
          careerId: career.id,
          grade: dto.grade,
          subjectId: dto.subjectId ?? null,
          teacherId: user.sub,
        },
        select: COURSE_SELECT,
      }),
    );
    this.activity.log({
      userId: user.sub,
      courseId: row.id,
      action: 'COURSE_CREATED',
      summary: `Creó la clase «${row.name}» (${term.code})`,
    });
    return this.toSummary(row, 'teacher');
  }

  /**
   * El administrador cambia el docente de un curso (por ejemplo, si un profesor
   * deja el grupo). El nuevo docente recibe un aviso.
   */
  async reassignTeacher(courseId: string, teacherId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, name: true },
    });
    if (!course) throw new NotFoundException('El curso no existe');
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true, status: true },
    });
    if (!teacher || teacher.role !== 'TEACHER') throw new BadRequestException('Selecciona un docente');
    if (teacher.status !== 'ACTIVE') throw new BadRequestException('La cuenta del docente no está activa');

    const row = await this.prisma.course.update({
      where: { id: courseId },
      data: { teacherId },
      select: COURSE_SELECT,
    });
    if (course.teacherId !== teacherId) {
      await this.notifications.notify([teacherId], {
        type: 'COURSE_ASSIGNED',
        title: `Te asignaron el curso «${course.name}»`,
        link: `/cursos/${courseId}`,
      });
    }
    return this.toSummary(row, 'admin');
  }

  /** El alumno se une con el código. Repetir la operación no falla. */
  async join(code: string, user: TokenPayload) {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Solo los alumnos se unen con código de invitación');
    }

    const course = await this.prisma.course.findUnique({
      where: { invitation: code },
      select: { id: true, name: true },
    });
    if (!course) throw new NotFoundException('El código de invitación no es válido');

    const already = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: course.id, studentId: user.sub } },
      select: { courseId: true },
    });
    await this.prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId: course.id, studentId: user.sub } },
      update: {},
      create: { courseId: course.id, studentId: user.sub },
    });
    if (!already) {
      this.activity.log({
        userId: user.sub,
        courseId: course.id,
        action: 'COURSE_JOINED',
        summary: `Se unió a la clase «${course.name}»`,
      });
    }
    return this.get(course.id, user);
  }

  /** Docente y alumnos. Los alumnos ven nombres, no matrículas de sus compañeros. */
  async people(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const showUsernames = role !== 'student';

    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        teacher: { select: { id: true, fullName: true } },
        enrollments: {
          orderBy: { student: { fullName: 'asc' } },
          select: {
            joinedAt: true,
            student: { select: { id: true, fullName: true, username: true } },
          },
        },
      },
    });

    return {
      teacher: course.teacher,
      students: course.enrollments.map(({ joinedAt, student }) => ({
        id: student.id,
        fullName: student.fullName,
        username: showUsernames ? student.username : null,
        joinedAt,
      })),
    };
  }

  /** Nuevo código: el anterior deja de funcionar (útil si se filtró). */
  async regenerateInvitation(courseId: string, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const { invitation } = await this.withFreshCode((code) =>
      this.prisma.course.update({
        where: { id: courseId },
        data: { invitation: code },
        select: { invitation: true },
      }),
    );
    return { invitation };
  }

  /** El docente (o un admin) escribe dónde y cuándo se reúne el curso. */
  async updateMeetingInfo(courseId: string, dto: UpdateMeetingInfoDto, user: TokenPayload) {
    const role = await this.access.assertCanManage(courseId, user);
    const row = await this.prisma.course.update({
      where: { id: courseId },
      data: { meetingInfo: dto.meetingInfo ?? null },
      select: COURSE_SELECT,
    });
    return this.toSummary(row, role);
  }

  /**
   * Reutilizar una clase en otro periodo: copia descripción, aula, pesos, temas,
   * material (también los archivos), tareas con su rúbrica y cuestionarios. No
   * copia alumnos, entregas, avisos ni fechas: las tareas quedan sin fecha y los
   * cuestionarios como borrador, para que el docente los ajuste.
   */
  async copy(courseId: string, dto: CopyCourseDto, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const source = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        name: true,
        teacherId: true,
        careerId: true,
        grade: true,
        subjectId: true,
        description: true,
        meetingInfo: true,
        weightAssignments: true,
        weightQuizzes: true,
        career: { select: { faculty: { select: { scheme: true } } } },
        topics: { orderBy: { position: 'asc' }, select: { id: true, title: true, position: true } },
        materials: {
          select: {
            topicId: true,
            title: true,
            description: true,
            kind: true,
            fileUrl: true,
            url: true,
            originalName: true,
            mimeType: true,
            size: true,
            sha256: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            instructions: true,
            points: true,
            requiresKind: true,
            requiresId: true,
            rubric: { orderBy: { position: 'asc' }, select: { position: true, title: true, description: true, levels: true } },
          },
        },
        quizzes: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            kind: true,
            timeLimitMinutes: true,
            resultsVisibility: true,
            requiresKind: true,
            requiresId: true,
            questions: {
              orderBy: { position: 'asc' },
              select: { position: true, type: true, prompt: true, points: true, required: true, options: true, answerKey: true },
            },
          },
        },
      },
    });

    const scheme = source.career.faculty.scheme;
    const grade = dto.grade ?? source.grade;
    if (grade > MAX_GRADE[scheme]) {
      throw new BadRequestException(`El ${scheme === 'SEMESTRAL' ? 'semestre' : 'cuatrimestre'} va de 1 a ${MAX_GRADE[scheme]}`);
    }
    const term = await this.prisma.academicTerm.findUnique({
      where: { code: dto.term },
      select: { code: true, closed: true, scheme: true },
    });
    if (!term || term.closed) throw new BadRequestException('Elige un periodo abierto');
    if (term.scheme !== scheme) {
      throw new BadRequestException(`Esta carrera va por periodos de tipo ${scheme === 'SEMESTRAL' ? 'semestral' : 'cuatrimestral'}`);
    }

    // Un docente copia a su nombre; un admin conserva al docente original.
    const teacherId = user.role === 'ADMIN' ? source.teacherId : user.sub;
    const created = await this.withFreshCode((invitation) =>
      this.prisma.course.create({
        data: {
          name: dto.name,
          term: term.code,
          invitation,
          careerId: source.careerId,
          grade,
          subjectId: source.subjectId,
          description: source.description,
          meetingInfo: source.meetingInfo,
          weightAssignments: source.weightAssignments,
          weightQuizzes: source.weightQuizzes,
          teacherId,
        },
        select: { id: true },
      }),
    );
    const newId = created.id;

    const topicMap = new Map<string, string>();
    for (const topic of source.topics) {
      const copy = await this.prisma.courseTopic.create({
        data: { courseId: newId, title: topic.title, position: topic.position },
        select: { id: true },
      });
      topicMap.set(topic.id, copy.id);
    }

    for (const material of source.materials) {
      let fileUrl: string | null = null;
      if (material.fileUrl) {
        try {
          fileUrl = await this.storage.copy(material.fileUrl, `classroom-drive/${newId}`);
        } catch {
          continue; // Si el archivo original ya no existe, ese material no se copia.
        }
      }
      await this.prisma.courseMaterial.create({
        data: {
          courseId: newId,
          topicId: material.topicId ? (topicMap.get(material.topicId) ?? null) : null,
          title: material.title,
          description: material.description,
          kind: material.kind,
          fileUrl,
          url: material.url,
          originalName: material.originalName,
          mimeType: material.mimeType,
          size: material.size,
          sha256: material.sha256,
          authorId: teacherId,
        },
      });
    }

    const idMap = new Map<string, string>();
    for (const assignment of source.assignments) {
      const copy = await this.prisma.assignment.create({
        data: {
          courseId: newId,
          teacherId,
          title: assignment.title,
          instructions: assignment.instructions,
          points: assignment.points,
          rubric: {
            create: assignment.rubric.map((criterion) => ({
              position: criterion.position,
              title: criterion.title,
              description: criterion.description,
              levels: criterion.levels as Prisma.InputJsonValue,
            })),
          },
        },
        select: { id: true },
      });
      idMap.set(`assignment:${assignment.id}`, copy.id);
    }
    for (const quiz of source.quizzes) {
      const copy = await this.prisma.quiz.create({
        data: {
          courseId: newId,
          title: quiz.title,
          description: quiz.description,
          kind: quiz.kind,
          timeLimitMinutes: quiz.timeLimitMinutes,
          resultsVisibility: quiz.resultsVisibility === 'AFTER_CLOSE' ? 'ON_SUBMIT' : quiz.resultsVisibility,
          questions: {
            create: quiz.questions.map((question) => ({
              position: question.position,
              type: question.type,
              prompt: question.prompt,
              points: question.points,
              required: question.required,
              options: (question.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              answerKey: (question.answerKey ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            })),
          },
        },
        select: { id: true },
      });
      idMap.set(`quiz:${quiz.id}`, copy.id);
    }
    // Requisitos entre actividades: apuntan a las copias.
    for (const assignment of source.assignments) {
      const target = assignment.requiresKind && idMap.get(`${assignment.requiresKind}:${assignment.requiresId}`);
      if (target) {
        await this.prisma.assignment.update({
          where: { id: idMap.get(`assignment:${assignment.id}`) },
          data: { requiresKind: assignment.requiresKind, requiresId: target },
        });
      }
    }
    for (const quiz of source.quizzes) {
      const target = quiz.requiresKind && idMap.get(`${quiz.requiresKind}:${quiz.requiresId}`);
      if (target) {
        await this.prisma.quiz.update({
          where: { id: idMap.get(`quiz:${quiz.id}`) },
          data: { requiresKind: quiz.requiresKind, requiresId: target },
        });
      }
    }

    this.activity.log({
      userId: user.sub,
      courseId: newId,
      action: 'COURSE_COPIED',
      summary: `Reutilizó «${source.name}» como «${dto.name}» (${term.code})`,
    });
    const row = await this.prisma.course.findUniqueOrThrow({ where: { id: newId }, select: COURSE_SELECT });
    return this.toSummary(row, user.role === 'ADMIN' ? 'admin' : 'teacher');
  }

  /** El docente (o un admin) cambia la descripción de la clase. */
  async updateDescription(courseId: string, dto: UpdateDescriptionDto, user: TokenPayload) {
    const role = await this.access.assertCanManage(courseId, user);
    const row = await this.prisma.course.update({
      where: { id: courseId },
      data: { description: dto.description ?? null },
      select: COURSE_SELECT,
    });
    return this.toSummary(row, role);
  }

  async removeStudent(courseId: string, studentId: string, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const { count } = await this.prisma.enrollment.deleteMany({
      where: { courseId, studentId },
    });
    if (count === 0) throw new NotFoundException('El alumno no está inscrito en el curso');
  }

  /** Reintenta si el código aleatorio ya existe (improbable: 31^7 ≈ 2.7·10¹⁰). */
  private async withFreshCode<T>(operation: (code: string) => Promise<T>) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await operation(generateInvitationCode());
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw new Error('No se pudo generar un código de invitación único');
  }

  private roleFromRow(row: CourseRow, user: TokenPayload): CourseRole {
    if (user.role === 'ADMIN') return 'admin';
    return row.teacherId === user.sub ? 'teacher' : 'student';
  }

  private toSummary(row: CourseRow, role: CourseRole) {
    return {
      id: row.id,
      name: row.name,
      term: row.term,
      career: row.career,
      grade: row.grade,
      subject: row.subject,
      teacher: row.teacher,
      description: row.description,
      meetingInfo: row.meetingInfo,
      studentCount: row._count.enrollments,
      createdAt: row.createdAt,
      myRole: role,
      // El código solo lo ve quien gestiona el curso.
      invitation: role === 'student' ? null : row.invitation,
    };
  }
}
