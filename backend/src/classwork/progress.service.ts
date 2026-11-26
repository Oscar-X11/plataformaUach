import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { resultsVisible } from '../quizzes/quiz-rules';
import { finalGrade, quizAverage, riskReasons } from './final-grade';
import { average, decimalToNumber, submissionState } from './submission-state';

export interface StudentProgress {
  student: { id: string; fullName: string; username: string };
  completed: number;
  total: number;
  percent: number;
  /** Tareas y cuestionarios vencidos sin entregar. */
  overdue: number;
  assignmentsAverage: number | null;
  quizzesAverage: number | null;
  final: number | null;
  passed: boolean | null;
  risk: string[];
  lastActivityAt: Date | null;
}

/**
 * Progreso y seguimiento de una clase. Actividades = tareas + cuestionarios y
 * encuestas publicados + material. Completada = tarea entregada, formulario
 * enviado o material abierto.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly activity: ActivityService,
  ) {}

  /** Docente: todos los alumnos (pestaña Seguimiento). */
  async tracking(courseId: string, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const course = await this.courseInfo(courseId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { student: { fullName: 'asc' } },
      select: { student: { select: { id: true, fullName: true, username: true } } },
    });
    const rows = await this.compute(courseId, enrollments.map((row) => row.student), false);
    return {
      passing: course.passing,
      weights: course.weights,
      students: rows,
      atRisk: rows.filter((row) => row.risk.length > 0).length,
    };
  }

  /** Alumno: su propio progreso en la clase. */
  async mine(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    if (role !== 'student') throw new ForbiddenException('Solo los alumnos tienen progreso');
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
      select: { id: true, fullName: true, username: true },
    });
    const course = await this.courseInfo(courseId);
    const [row] = await this.compute(courseId, [me], true);
    return { ...row, passingGrade: course.passing, weights: course.weights };
  }

  /**
   * Progreso de todos los alumnos de una clase, sin comprobar permisos
   * (reportes de administración; el controlador ya exige ADMIN).
   */
  async studentRows(courseId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { student: { fullName: 'asc' } },
      select: { student: { select: { id: true, fullName: true, username: true } } },
    });
    return this.compute(courseId, enrollments.map((row) => row.student), false);
  }

  /** El alumno abrió un material: cuenta para su progreso. */
  async markMaterialViewed(materialId: string, user: TokenPayload) {
    const material = await this.prisma.courseMaterial.findUnique({
      where: { id: materialId },
      select: { courseId: true },
    });
    if (!material) throw new NotFoundException('Material no encontrado');
    const role = await this.access.roleIn(material.courseId, user);
    if (role !== 'student') return { viewed: false };
    await this.prisma.materialView.upsert({
      where: { materialId_studentId: { materialId, studentId: user.sub } },
      update: {},
      create: { materialId, studentId: user.sub },
    });
    return { viewed: true };
  }

  async courseInfo(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        weightAssignments: true,
        weightQuizzes: true,
        career: { select: { faculty: { select: { passingGrade: true } } } },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return {
      passing: Number(course.career.faculty.passingGrade),
      weights: { assignments: course.weightAssignments, quizzes: course.weightQuizzes },
    };
  }

  /**
   * Cálculo para varios alumnos de la misma clase. `forStudent` respeta lo que
   * el alumno puede ver (calificaciones devueltas y resultados visibles).
   */
  private async compute(
    courseId: string,
    students: { id: string; fullName: string; username: string }[],
    forStudent: boolean,
  ): Promise<StudentProgress[]> {
    if (students.length === 0) return [];
    const ids = students.map((student) => student.id);
    const now = new Date();
    const [course, assignments, quizzes, materials, views, logs] = await Promise.all([
      this.courseInfo(courseId),
      this.prisma.assignment.findMany({
        where: { courseId },
        select: {
          id: true,
          dueAt: true,
          points: true,
          submissions: {
            where: { studentId: { in: ids } },
            select: { studentId: true, status: true, submittedAt: true, grade: true },
          },
        },
      }),
      this.prisma.quiz.findMany({
        where: { courseId, published: true },
        select: {
          id: true,
          kind: true,
          closesAt: true,
          resultsVisibility: true,
          attempts: {
            where: { studentId: { in: ids } },
            select: { studentId: true, submittedAt: true, score: true, maxScore: true },
          },
        },
      }),
      this.prisma.courseMaterial.findMany({ where: { courseId }, select: { id: true } }),
      this.prisma.materialView.findMany({
        where: { studentId: { in: ids }, material: { courseId } },
        select: { studentId: true },
      }),
      this.prisma.activityLog.groupBy({
        by: ['userId'],
        where: { courseId, userId: { in: ids } },
        _max: { createdAt: true },
      }),
    ]);
    const total = assignments.length + quizzes.length + materials.length;
    const lastActivity = new Map(logs.map((log) => [log.userId, log._max.createdAt]));

    return students.map((student) => {
      let completed = views.filter((view) => view.studentId === student.id).length;
      let overdue = 0;
      const assignmentGrades: { grade: number | null; points: number }[] = [];
      const quizScores: { score: number | null; maxScore: number }[] = [];

      for (const assignment of assignments) {
        const submission = assignment.submissions.find((row) => row.studentId === student.id);
        const state = submissionState(assignment.dueAt, submission, now);
        if (state === 'missing') overdue++;
        else if (state !== 'pending') completed++;
        const returned = submission?.status === 'RETURNED';
        if (!forStudent || returned) {
          assignmentGrades.push({ grade: returned ? decimalToNumber(submission?.grade) : null, points: assignment.points });
        }
      }
      for (const quiz of quizzes) {
        const attempt = quiz.attempts.find((row) => row.studentId === student.id);
        const sent = Boolean(attempt?.submittedAt);
        if (sent) completed++;
        else if (quiz.kind === 'QUIZ' && quiz.closesAt && quiz.closesAt < now) overdue++;
        if (quiz.kind !== 'QUIZ' || !sent) continue;
        if (forStudent && !resultsVisible(quiz, true, now)) continue;
        quizScores.push({ score: decimalToNumber(attempt?.score), maxScore: attempt?.maxScore ?? 0 });
      }

      const assignmentsAverage = average(assignmentGrades);
      const quizzesAverage = quizAverage(quizScores);
      const final = finalGrade(assignmentsAverage, quizzesAverage, course.weights);
      return {
        student,
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
        overdue,
        assignmentsAverage,
        quizzesAverage,
        final,
        passed: final === null ? null : final >= course.passing,
        risk: riskReasons(overdue, final, course.passing),
        lastActivityAt: lastActivity.get(student.id) ?? null,
      };
    });
  }

  /** Pesos del libro de calificaciones de la clase (suman 100). */
  async setWeights(courseId: string, weights: { weightAssignments: number; weightQuizzes: number }, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    await this.prisma.course.update({ where: { id: courseId }, data: weights });
    this.activity.log({
      userId: user.sub,
      courseId,
      action: 'WEIGHTS_CHANGED',
      summary: `Cambió los pesos: tareas ${weights.weightAssignments} %, cuestionarios ${weights.weightQuizzes} %`,
    });
    return this.courseInfo(courseId);
  }
}
