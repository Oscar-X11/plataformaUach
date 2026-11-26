import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { TokenPayload } from '../auth/token.service';
import { AvailabilityService } from '../courses/availability.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { inspectUpload, MB, SUBMISSION_EXTENSIONS, UploadedFileData } from '../files/upload';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentsService, SUBMISSION_SELECT, submissionView } from './assignments.service';
import { GradeSubmissionDto } from './dto/grade.dto';
import { gradeWithRubric } from './rubric-rules';
import { decimalToNumber, submissionState } from './submission-state';

export const MAX_FILE_BYTES = 10 * MB;
export const MAX_FILES_PER_SUBMISSION = 10;

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly assignments: AssignmentsService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly availability: AvailabilityService,
    private readonly activity: ActivityService,
  ) {}

  // ───────────── Alumno: su propia entrega ─────────────

  async uploadFiles(assignmentId: string, files: UploadedFileData[], user: TokenPayload) {
    const { assignment } = await this.asStudent(assignmentId, user);
    if (!files?.length) throw new BadRequestException('Selecciona al menos un archivo');

    // Valida todo antes de escribir nada en disco.
    const inspected = [];
    for (const file of files) {
      inspected.push({ file, info: await inspectUpload(file, SUBMISSION_EXTENSIONS, MAX_FILE_BYTES) });
    }

    const submission = await this.ensureDraft(assignmentId, user.sub);
    const existing = await this.prisma.submissionFile.count({ where: { submissionId: submission.id } });
    if (existing + files.length > MAX_FILES_PER_SUBMISSION) {
      throw new BadRequestException(
        `Una entrega admite hasta ${MAX_FILES_PER_SUBMISSION} archivos (ya tienes ${existing}).`,
      );
    }

    const directory = `submissions/${assignment.courseId}/${assignmentId}`;
    for (const { file, info } of inspected) {
      const fileUrl = await this.storage.save(directory, info.ext, file);
      await this.prisma.submissionFile.create({
        data: {
          submissionId: submission.id,
          fileUrl,
          originalName: info.name,
          mimeType: info.mime,
          size: file.size,
          sha256: info.sha256,
        },
      });
    }
    return this.mine(assignmentId, assignment.dueAt, user.sub);
  }

  async removeFile(assignmentId: string, fileId: string, user: TokenPayload) {
    const { assignment } = await this.asStudent(assignmentId, user);
    const file = await this.prisma.submissionFile.findFirst({
      where: { id: fileId, submission: { assignmentId, studentId: user.sub } },
      select: { id: true, fileUrl: true, submission: { select: { status: true } } },
    });
    if (!file) throw new NotFoundException('Archivo no encontrado');
    this.assertEditable(file.submission.status);

    await this.prisma.submissionFile.delete({ where: { id: file.id } });
    await this.storage.remove(file.fileUrl);
    return this.mine(assignmentId, assignment.dueAt, user.sub);
  }

  async turnIn(assignmentId: string, user: TokenPayload) {
    const { assignment } = await this.asStudent(assignmentId, user);
    const submission = await this.ensureDraft(assignmentId, user.sub);
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    this.activity.log({
      userId: user.sub,
      courseId: assignment.courseId,
      action: 'SUBMISSION_TURNED_IN',
      summary: `Entregó «${assignment.title}»`,
    });
    return this.mine(assignmentId, assignment.dueAt, user.sub);
  }

  /** Anular la entrega para corregirla (solo mientras no esté calificada). */
  async unsubmit(assignmentId: string, user: TokenPayload) {
    const { assignment } = await this.asStudent(assignmentId, user);
    const submission = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.sub } },
      select: { id: true, status: true },
    });
    if (submission?.status !== 'SUBMITTED') {
      throw new BadRequestException(
        submission?.status === 'RETURNED'
          ? 'La tarea ya fue calificada; no se puede anular la entrega'
          : 'La tarea no está entregada',
      );
    }
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'ASSIGNED', submittedAt: null },
    });
    return this.mine(assignmentId, assignment.dueAt, user.sub);
  }

  // ───────────── Docente: revisar y calificar ─────────────

  /** Todos los inscritos, hayan entregado o no. */
  async listForAssignment(assignmentId: string, user: TokenPayload) {
    const { assignment } = await this.assignments.resolve(assignmentId, user);
    await this.access.assertCanManage(assignment.courseId, user);

    const [enrollments, submissions] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId: assignment.courseId },
        orderBy: { student: { fullName: 'asc' } },
        select: { student: { select: { id: true, fullName: true, username: true } } },
      }),
      this.prisma.submission.findMany({
        where: { assignmentId },
        select: { ...SUBMISSION_SELECT, studentId: true },
      }),
    ]);
    const byStudent = new Map(submissions.map((row) => [row.studentId, row]));

    // Entregas duplicadas: el mismo archivo (sha256) en entregas de alumnos distintos.
    const files = await this.prisma.submissionFile.findMany({
      where: { submission: { assignmentId } },
      select: { sha256: true, submission: { select: { studentId: true } } },
    });
    const owners = new Map<string, Set<string>>();
    for (const file of files) {
      const set = owners.get(file.sha256) ?? new Set<string>();
      set.add(file.submission.studentId);
      owners.set(file.sha256, set);
    }
    const names = new Map(enrollments.map(({ student }) => [student.id, student.fullName]));
    const duplicatesOf = (studentId: string) => {
      const others = new Set<string>();
      for (const set of owners.values()) {
        if (set.size > 1 && set.has(studentId)) set.forEach((id) => id !== studentId && others.add(id));
      }
      return [...others].map((id) => names.get(id) ?? 'otro alumno');
    };

    return enrollments.map(({ student }) => ({
      student,
      submission: submissionView(assignment.dueAt, byStudent.get(student.id) ?? null, false),
      duplicateWith: duplicatesOf(student.id),
    }));
  }

  async grade(assignmentId: string, studentId: string, dto: GradeSubmissionDto, user: TokenPayload) {
    const { assignment } = await this.assignments.resolve(assignmentId, user);
    await this.access.assertCanManage(assignment.courseId, user);

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: assignment.courseId, studentId } },
      select: { id: true },
    });
    if (!enrolled) throw new NotFoundException('El alumno no está inscrito en el curso');
    await this.access.assertTermOpen(assignment.courseId);

    // Con rúbrica, la calificación es la suma de los niveles elegidos.
    let grade = dto.grade;
    let rubricSelection: Prisma.InputJsonValue | undefined;
    if (dto.rubric !== undefined) {
      if (!assignment.rubric.length) throw new BadRequestException('Esta tarea no tiene rúbrica');
      const result = gradeWithRubric(assignment.rubric, dto.rubric);
      grade = result.grade;
      rubricSelection = result.selection;
    }
    if (grade !== undefined && grade !== null && grade > assignment.points) {
      throw new BadRequestException(`La calificación máxima es ${assignment.points}`);
    }

    const data = {
      grade,
      feedback: dto.feedback,
      ...(rubricSelection !== undefined ? { rubricSelection } : {}),
      ...(dto.return ? { status: 'RETURNED' as const, returnedAt: new Date() } : {}),
    };
    const saved = await this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: data,
      create: { assignmentId, studentId, ...data },
      select: SUBMISSION_SELECT,
    });

    if (grade !== undefined || dto.return) {
      const student = await this.prisma.user.findUnique({ where: { id: studentId }, select: { fullName: true } });
      this.activity.log({
        userId: user.sub,
        courseId: assignment.courseId,
        action: 'GRADE_CHANGED',
        summary: `${dto.return ? 'Devolvió' : 'Calificó'} «${assignment.title}» de ${student?.fullName ?? 'un alumno'}${
          grade !== undefined && grade !== null ? `: ${grade}/${assignment.points}` : ''
        }`,
      });
    }

    if (dto.return) {
      const course = await this.prisma.course.findUnique({
        where: { id: assignment.courseId },
        select: { name: true },
      });
      const grade = decimalToNumber(saved.grade);
      await this.notifications.notify([studentId], {
        type: 'SUBMISSION_RETURNED',
        title:
          grade === null
            ? `Te devolvieron «${assignment.title}» (${course?.name ?? 'curso'})`
            : `Calificaron «${assignment.title}»: ${grade}/${assignment.points}`,
        link: `/cursos/${assignment.courseId}/tareas/${assignmentId}`,
      });
    }
    return submissionView(assignment.dueAt, saved, false);
  }

  // ───────────── Vista "Mis entregas" ─────────────

  /** Alumno: todas sus tareas. Docente: entregas por revisar en sus cursos. */
  async overview(user: TokenPayload) {
    if (user.role === 'STUDENT') {
      const assignments = await this.prisma.assignment.findMany({
        where: { course: { enrollments: { some: { studentId: user.sub } } } },
        orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          dueAt: true,
          points: true,
          course: { select: { id: true, name: true } },
          submissions: { where: { studentId: user.sub }, select: SUBMISSION_SELECT },
        },
      });
      return {
        role: 'student' as const,
        items: assignments.map(({ submissions, ...assignment }) => ({
          ...assignment,
          submission: submissionView(assignment.dueAt, submissions[0] ?? null, true),
        })),
      };
    }

    const submissions = await this.prisma.submission.findMany({
      where: {
        status: 'SUBMITTED',
        assignment: user.role === 'ADMIN' ? {} : { course: { teacherId: user.sub } },
      },
      orderBy: { submittedAt: 'asc' },
      take: 200,
      select: {
        submittedAt: true,
        student: { select: { id: true, fullName: true } },
        assignment: {
          select: {
            id: true,
            title: true,
            dueAt: true,
            points: true,
            course: { select: { id: true, name: true } },
          },
        },
        status: true,
      },
    });
    return {
      role: 'teacher' as const,
      items: submissions.map(({ assignment, student, submittedAt, status }) => ({
        ...assignment,
        student,
        submittedAt,
        state: submissionState(assignment.dueAt, { status, submittedAt }),
      })),
    };
  }

  // ───────────── Auxiliares ─────────────

  private async asStudent(assignmentId: string, user: TokenPayload) {
    const resolved = await this.assignments.resolve(assignmentId, user);
    if (resolved.role !== 'student') {
      throw new ForbiddenException('Solo los alumnos inscritos entregan tareas');
    }
    const { assignment } = resolved;
    await this.availability.assertAvailable(assignment.courseId, user.sub, {
      from: assignment.availableFrom,
      requiresKind: assignment.requiresKind,
      requiresId: assignment.requiresId,
    });
    return resolved;
  }

  /** Con el periodo cerrado, las calificaciones quedan bloqueadas. */
  /** Crea la entrega si no existe y exige que se pueda modificar. */
  private async ensureDraft(assignmentId: string, studentId: string) {
    const submission = await this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: {},
      create: { assignmentId, studentId },
      select: { id: true, status: true },
    });
    this.assertEditable(submission.status);
    return submission;
  }

  private assertEditable(status: string) {
    if (status === 'SUBMITTED') {
      throw new BadRequestException('Anula la entrega para modificarla');
    }
    if (status === 'RETURNED') {
      throw new BadRequestException('La tarea ya fue calificada y devuelta');
    }
  }

  private async mine(assignmentId: string, dueAt: Date | null, studentId: string) {
    const row = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: SUBMISSION_SELECT,
    });
    return submissionView(dueAt, row, true);
  }
}
