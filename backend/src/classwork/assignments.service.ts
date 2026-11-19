import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService, CourseRole } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignment.dto';
import { decimalToNumber, submissionState } from './submission-state';

export const SUBMISSION_SELECT = {
  id: true,
  status: true,
  grade: true,
  feedback: true,
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
    submittedAt: row?.submittedAt ?? null,
    returnedAt: row?.returnedAt ?? null,
    files: row?.files ?? [],
  };
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
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { name: true, teacherId: true, enrollments: { select: { studentId: true } } },
    });

    const assignment = await this.prisma.assignment.create({
      data: {
        courseId,
        // Si lo crea un admin, la tarea queda a nombre del docente del curso.
        teacherId: course.teacherId,
        title: dto.title,
        instructions: dto.instructions ?? '',
        dueAt: parseDue(dto.dueAt) ?? null,
        points: dto.points ?? 10,
      },
      select: ASSIGNMENT_SELECT,
    });

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

    if (dto.points !== undefined) {
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

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: dto.title,
        instructions: dto.instructions,
        dueAt: parseDue(dto.dueAt),
        points: dto.points,
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
        course: { select: { id: true, name: true, _count: { select: { enrollments: true } } } },
        submissions:
          user.role === 'STUDENT'
            ? { where: { studentId: user.sub }, select: { status: true, submittedAt: true } }
            : { where: { status: { not: 'ASSIGNED' } }, select: { status: true, submittedAt: true } },
      },
    });
    return rows.map(({ course, submissions, ...assignment }) => ({
      ...assignment,
      course: { id: course.id, name: course.name },
      state: user.role === 'STUDENT' ? submissionState(assignment.dueAt, submissions[0]) : null,
      submitted: user.role === 'STUDENT' ? null : submissions.length,
      students: user.role === 'STUDENT' ? null : course._count.enrollments,
    }));
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
      return assignments.map((assignment) => ({
        ...assignment,
        myRole: role,
        mySubmission: submissionView(assignment.dueAt, byAssignment.get(assignment.id) ?? null, true),
        stats: null,
      }));
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
      mySubmission: null,
      stats: {
        students,
        submitted: count(assignment.id, 'SUBMITTED'),
        returned: count(assignment.id, 'RETURNED'),
      },
    }));
  }
}
