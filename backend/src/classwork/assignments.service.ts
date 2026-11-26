import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { TokenPayload } from '../auth/token.service';
import { AvailabilityService } from '../courses/availability.service';
import { CourseAccessService, CourseRole } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignment.dto';
import { normalizeRubric, rubricMaxPoints } from './rubric-rules';
import { decimalToNumber, submissionState } from './submission-state';

export const SUBMISSION_SELECT = {
  id: true,
  status: true,
  grade: true,
  feedback: true,
  rubricSelection: true,
  submittedAt: true,
  returnedAt: true,
  files: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, fileUrl: true, originalName: true, mimeType: true, size: true, createdAt: true },
  },
} satisfies Prisma.SubmissionSelect;

type SubmissionRow = Prisma.SubmissionGetPayload<{ select: typeof SUBMISSION_SELECT }>;

const ASSIGNMENT_SELECT = {
  id: true,
  courseId: true,
  title: true,
  instructions: true,
  dueAt: true,
  points: true,
  availableFrom: true,
  requiresKind: true,
  requiresId: true,
  rubric: {
    orderBy: { position: 'asc' },
    select: { id: true, title: true, description: true, levels: true },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssignmentSelect;

type AssignmentRow = Prisma.AssignmentGetPayload<{ select: typeof ASSIGNMENT_SELECT }>;

/** La entrega tal como la ve su dueño (la calificación solo tras devolverla). */
export function submissionView(dueAt: Date | null, row: SubmissionRow | null, forStudent: boolean) {
  const returned = row?.status === 'RETURNED';
  return {
    id: row?.id ?? null,
    status: row?.status ?? 'ASSIGNED',
    state: submissionState(dueAt, row),
    grade: !forStudent || returned ? decimalToNumber(row?.grade) : null,
    feedback: !forStudent || returned ? (row?.feedback ?? null) : null,
    rubricSelection: !forStudent || returned ? ((row?.rubricSelection as Record<string, string> | null) ?? null) : null,
    submittedAt: row?.submittedAt ?? null,
    returnedAt: row?.returnedAt ?? null,
    files: row?.files ?? [],
  };
}

/** Margen para no rechazar una fecha de «ahora mismo» por segundos de diferencia. */
const PAST_TOLERANCE_MS = 5 * 60_000;
const isPast = (date: Date | null | undefined) => Boolean(date && date.getTime() < Date.now() - PAST_TOLERANCE_MS);

/**
 * Reglas de fechas para que el docente no deje una tarea imposible de entregar:
 * la entrega no puede estar en el pasado y debe ser posterior a la apertura.
 */
function assertAssignmentDates(dueAt: Date | null, availableFrom: Date | null, dueChanged: boolean) {
  if (dueChanged && isPast(dueAt)) {
    throw new BadRequestException('La fecha de entrega ya pasó: todos los alumnos quedarían con la tarea vencida');
  }
  if (dueAt && availableFrom && availableFrom >= dueAt) {
    throw new BadRequestException('La tarea debe abrirse antes de su fecha de entrega');
  }
}

const parseDue = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('La fecha de entrega no es válida');
  return date;
};

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly availability: AvailabilityService,
    private readonly activity: ActivityService,
  ) {}

  /** Curso de la tarea y rol del usuario en él (404 si no pertenece). */
  async resolve(assignmentId: string, user: TokenPayload) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: ASSIGNMENT_SELECT,
    });
    if (!assignment) throw new NotFoundException('Tarea no encontrada');
    const role = await this.access.roleIn(assignment.courseId, user);
    return { assignment, role };
  }

  async list(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      select: ASSIGNMENT_SELECT,
    });
    return this.decorate(assignments, role, user);
  }

  async get(assignmentId: string, user: TokenPayload) {
    const { assignment, role } = await this.resolve(assignmentId, user);
    const [view] = await this.decorate([assignment], role, user);
    return view;
  }

  async create(courseId: string, dto: CreateAssignmentDto, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    await this.access.assertTermOpen(courseId, 'ya no se pueden crear tareas');
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { name: true, teacherId: true, enrollments: { select: { studentId: true } } },
    });
    const dueAt = parseDue(dto.dueAt) ?? null;

    const requirement = await this.availability.validateRequirement(
      courseId,
      { kind: 'assignment' },
      dto.requiresKind,
      dto.requiresId,
    );
    const availableFrom = parseDue(dto.availableFrom) ?? null;
    assertAssignmentDates(dueAt, availableFrom, true);
    const assignment = await this.prisma.assignment.create({
      data: {
        courseId,
        // Si lo crea un admin, la tarea queda a nombre del docente del curso.
        teacherId: course.teacherId,
        title: dto.title,
        instructions: dto.instructions ?? '',
        dueAt,
        points: dto.points ?? 10,
        availableFrom,
        ...requirement,
      },
      select: ASSIGNMENT_SELECT,
    });
    this.activity.log({
      userId: user.sub,
      courseId,
      action: 'ASSIGNMENT_CREATED',
      summary: `Creó la tarea «${assignment.title}» en ${course.name}`,
    });

    // Si todavía no está disponible, no se avisa (los alumnos la verán al abrirse).
    if (availableFrom && availableFrom > new Date()) return this.get(assignment.id, user);
    await this.notifications.notify(
      course.enrollments.map((enrollment) => enrollment.studentId),
      {
        type: 'ASSIGNMENT_CREATED',
        title: `Nueva tarea en ${course.name}: ${assignment.title}`,
        link: `/cursos/${courseId}/tareas/${assignment.id}`,
      },
    );
    return this.get(assignment.id, user);
  }

  async update(assignmentId: string, dto: UpdateAssignmentDto, user: TokenPayload) {
    const { assignment } = await this.resolve(assignmentId, user);
    await this.access.assertCanManage(assignment.courseId, user);

    const dueAt = parseDue(dto.dueAt);
    const availableFrom = parseDue(dto.availableFrom);
    assertAssignmentDates(
      dueAt === undefined ? assignment.dueAt : dueAt,
      availableFrom === undefined ? assignment.availableFrom : availableFrom,
      dueAt !== undefined && dueAt?.getTime() !== assignment.dueAt?.getTime(),
    );

    if (dto.points !== undefined && dto.points !== assignment.points) {
      await this.access.assertTermOpen(assignment.courseId, 'los puntos ya no se pueden cambiar');
      const highest = await this.prisma.submission.aggregate({
        where: { assignmentId },
        _max: { grade: true },
      });
      const max = decimalToNumber(highest._max.grade);
      if (max !== null && max > dto.points) {
        throw new BadRequestException(
          `Ya hay calificaciones de hasta ${max}; los puntos no pueden ser menores.`,
        );
      }
    }

    if (dto.points !== undefined && dto.points !== assignment.points && assignment.rubric.length) {
      throw new BadRequestException('Con rúbrica, los puntos son la suma de sus criterios');
    }
    const requirement =
      dto.requiresKind !== undefined || dto.requiresId !== undefined
        ? await this.availability.validateRequirement(
            assignment.courseId,
            { kind: 'assignment', id: assignmentId },
            dto.requiresKind,
            dto.requiresId,
          )
        : {};

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: dto.title,
        instructions: dto.instructions,
        dueAt,
        points: dto.points,
        availableFrom,
        ...requirement,
      },
    });
    return this.get(assignmentId, user);
  }

  /** Borra la tarea, sus entregas y los archivos subidos. */
  async remove(assignmentId: string, user: TokenPayload) {
    const { assignment } = await this.resolve(assignmentId, user);
    await this.access.assertCanManage(assignment.courseId, user);
    const files = await this.prisma.submissionFile.findMany({
      where: { submission: { assignmentId } },
      select: { fileUrl: true },
    });
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
    await Promise.all(files.map((file) => this.storage.remove(file.fileUrl)));
    this.activity.log({
      userId: user.sub,
      courseId: assignment.courseId,
      action: 'ASSIGNMENT_DELETED',
      summary: `Borró la tarea «${assignment.title}»`,
    });
  }

  /**
   * Rúbrica de la tarea (reemplaza la anterior). Los puntos de la tarea pasan a
   * ser la suma de los criterios. No se cambia si ya se calificó con ella.
   */
  async setRubric(assignmentId: string, input: unknown[], user: TokenPayload) {
    const { assignment } = await this.resolve(assignmentId, user);
    await this.access.assertCanManage(assignment.courseId, user);
    await this.access.assertTermOpen(assignment.courseId, 'la rúbrica ya no se puede cambiar');
    const criteria = normalizeRubric(input);
    const used = await this.prisma.submission.count({
      where: { assignmentId, rubricSelection: { not: Prisma.AnyNull } },
    });
    if (used > 0) {
      throw new ConflictException('Ya se calificó con esta rúbrica: no se puede cambiar');
    }
    const points = criteria.length ? rubricMaxPoints(criteria) : assignment.points;
    if (criteria.length && (points < 1 || points > 100)) {
      throw new BadRequestException('La suma de los puntos máximos de la rúbrica debe estar entre 1 y 100');
    }
    const highest = await this.prisma.submission.aggregate({ where: { assignmentId }, _max: { grade: true } });
    const max = decimalToNumber(highest._max.grade);
    if (max !== null && max > points) {
      throw new BadRequestException(`Ya hay calificaciones de hasta ${max}; la rúbrica no puede valer menos.`);
    }
    await this.prisma.$transaction([
      this.prisma.rubricCriterion.deleteMany({ where: { assignmentId } }),
      ...criteria.map((criterion, position) =>
        this.prisma.rubricCriterion.create({
          data: {
            assignmentId,
            position,
            title: criterion.title,
            description: criterion.description,
            levels: criterion.levels as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
      this.prisma.assignment.update({ where: { id: assignmentId }, data: { points } }),
    ]);
    return this.get(assignmentId, user);
  }

  /**
   * Tareas con fecha dentro del rango, de los cursos del usuario.
   * Alumno: con el estado de su entrega. Docente: cuántos entregaron.
   */
  async calendar(user: TokenPayload, from: Date, to: Date) {
    const courseFilter: Prisma.CourseWhereInput =
      user.role === 'ADMIN'
        ? {}
        : user.role === 'TEACHER'
          ? { teacherId: user.sub }
          : { enrollments: { some: { studentId: user.sub } } };
    const rows = await this.prisma.assignment.findMany({
      where: { dueAt: { gte: from, lt: to }, course: courseFilter },
      orderBy: { dueAt: 'asc' },
      take: 500,
      select: {
        id: true,
        title: true,
        dueAt: true,
        points: true,
        availableFrom: true,
        requiresKind: true,
        requiresId: true,
        course: { select: { id: true, name: true, _count: { select: { enrollments: true } } } },
        submissions:
          user.role === 'STUDENT'
            ? { where: { studentId: user.sub }, select: { status: true, submittedAt: true } }
            : { where: { status: { not: 'ASSIGNED' } }, select: { status: true, submittedAt: true } },
      },
    });
    // Alumno: lo bloqueado (acceso condicional) no aparece en su calendario.
    const open =
      user.role === 'STUDENT'
        ? await this.availability.availableMany(
            user.sub,
            rows.map((row) => ({ from: row.availableFrom, requiresKind: row.requiresKind, requiresId: row.requiresId })),
          )
        : null;
    const visibleRows = open ? rows.filter((_, index) => open[index]) : rows;
    const assignments = visibleRows.map(({ course, submissions, availableFrom: _from, requiresKind: _kind, requiresId: _id, ...assignment }) => ({
      ...assignment,
      kind: 'assignment' as const,
      href: `/cursos/${course.id}/tareas/${assignment.id}`,
      course: { id: course.id, name: course.name },
      state: user.role === 'STUDENT' ? submissionState(assignment.dueAt, submissions[0]) : null,
      submitted: user.role === 'STUDENT' ? null : submissions.length,
      students: user.role === 'STUDENT' ? null : course._count.enrollments,
    }));

    // Cuestionarios y encuestas publicados: aparecen en su fecha de cierre.
    const student = user.role === 'STUDENT';
    const quizRows = await this.prisma.quiz.findMany({
      where: { published: true, closesAt: { gte: from, lt: to }, course: courseFilter },
      orderBy: { closesAt: 'asc' },
      take: 200,
      select: {
        id: true,
        kind: true,
        title: true,
        closesAt: true,
        requiresKind: true,
        requiresId: true,
        course: { select: { id: true, name: true, _count: { select: { enrollments: true } } } },
        questions: { select: { points: true } },
        attempts: student
          ? { where: { studentId: user.sub }, select: { submittedAt: true } }
          : { where: { submittedAt: { not: null } }, select: { submittedAt: true } },
      },
    });
    const now = new Date();
    const quizOpen = student
      ? await this.availability.availableMany(
          user.sub,
          quizRows.map((row) => ({ requiresKind: row.requiresKind, requiresId: row.requiresId })),
        )
      : null;
    const visibleQuizzes = quizOpen ? quizRows.filter((_, index) => quizOpen[index]) : quizRows;
    const quizzes = visibleQuizzes.map((quiz) => {
      const sent = Boolean(quiz.attempts[0]?.submittedAt);
      return {
        id: quiz.id,
        kind: quiz.kind === 'SURVEY' ? ('survey' as const) : ('quiz' as const),
        href: `/cursos/${quiz.course.id}/cuestionarios/${quiz.id}`,
        title: quiz.title,
        dueAt: quiz.closesAt as Date,
        points: quiz.questions.reduce((sum, question) => sum + question.points, 0),
        course: { id: quiz.course.id, name: quiz.course.name },
        state: student ? (sent ? 'submitted' : (quiz.closesAt as Date) <= now ? 'missing' : 'pending') : null,
        submitted: student ? null : quiz.attempts.length,
        students: student ? null : quiz.course._count.enrollments,
      };
    });

    // En el rango todas tienen fecha (las tareas se filtran por dueAt).
    const time = (date: Date | null) => date?.getTime() ?? 0;
    return [...assignments, ...quizzes].sort((a, b) => time(a.dueAt) - time(b.dueAt));
  }

  /** Alumno: su entrega. Docente/admin: cuántos entregaron y cuántas devolvió. */
  private async decorate(assignments: AssignmentRow[], role: CourseRole, user: TokenPayload) {
    const ids = assignments.map((assignment) => assignment.id);

    if (role === 'student') {
      const mine = await this.prisma.submission.findMany({
        where: { assignmentId: { in: ids }, studentId: user.sub },
        select: { ...SUBMISSION_SELECT, assignmentId: true },
      });
      const byAssignment = new Map(mine.map((row) => [row.assignmentId, row]));
      const courseId = assignments[0]?.courseId;
      const evaluate = courseId ? await this.availability.evaluator(courseId, user.sub) : null;
      return assignments.map((assignment) => {
        const availability = evaluate
          ? evaluate({ from: assignment.availableFrom, requiresKind: assignment.requiresKind, requiresId: assignment.requiresId })
          : { available: true, reason: null };
        return {
          ...assignment,
          // Bloqueada: el alumno ve el título y la razón, no las instrucciones.
          instructions: availability.available ? assignment.instructions : '',
          myRole: role,
          availability,
          mySubmission: submissionView(assignment.dueAt, byAssignment.get(assignment.id) ?? null, true),
          stats: null,
        };
      });
    }

    const courseId = assignments[0]?.courseId;
    const [students, grouped] = await Promise.all([
      courseId ? this.prisma.enrollment.count({ where: { courseId } }) : 0,
      this.prisma.submission.groupBy({
        by: ['assignmentId', 'status'],
        where: { assignmentId: { in: ids } },
        _count: { _all: true },
      }),
    ]);
    const count = (assignmentId: string, status: string) =>
      grouped.find((row) => row.assignmentId === assignmentId && row.status === status)?._count._all ?? 0;

    return assignments.map((assignment) => ({
      ...assignment,
      myRole: role,
      availability: { available: true, reason: null },
      mySubmission: null,
      stats: {
        students,
        submitted: count(assignment.id, 'SUBMITTED'),
        returned: count(assignment.id, 'RETURNED'),
      },
    }));
  }
}
