import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CourseAccessService, CourseRole } from './course-access.service';
import { CreateCourseDto, UpdateDescriptionDto, UpdateMeetingInfoDto } from './dto/create-course.dto';

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
export const MAX_GRADE = { CUATRIMESTRAL: 12, SEMESTRAL: 6 } as const;

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
      select: { id: true },
    });
    if (!course) throw new NotFoundException('El código de invitación no es válido');

    await this.prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId: course.id, studentId: user.sub } },
      update: {},
      create: { courseId: course.id, studentId: user.sub },
    });
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
