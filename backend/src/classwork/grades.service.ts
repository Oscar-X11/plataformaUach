import { Injectable } from '@nestjs/common';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { resultsVisible } from '../quizzes/quiz-rules';
import { finalGrade, quizAverage } from './final-grade';
import { average, decimalToNumber, submissionState } from './submission-state';

/** Evita que Excel interprete una celda como fórmula (inyección CSV). */
export function csvCell(value: string | number | null) {
  if (value === null) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
  ) {}

  /**
   * Libro de calificaciones. Alumno: lo ya devuelto y los resultados visibles.
   * Docente/admin: todo. Incluye cuestionarios (no encuestas), los pesos de la
   * clase, la calificación final y si aprueba según el nivel.
   */
  async forCourse(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const now = new Date();
    const [course, assignments, quizRows] = await Promise.all([
      this.prisma.course.findUniqueOrThrow({
        where: { id: courseId },
        select: {
          weightAssignments: true,
          weightQuizzes: true,
          academicTerm: { select: { closed: true } },
          career: { select: { faculty: { select: { passingGrade: true } } } },
        },
      }),
      this.prisma.assignment.findMany({
        where: { courseId },
        orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        select: { id: true, title: true, dueAt: true, points: true },
      }),
      this.prisma.quiz.findMany({
        where: { courseId, published: true, kind: 'QUIZ' },
        orderBy: [{ closesAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          kind: true,
          closesAt: true,
          resultsVisibility: true,
          questions: { select: { points: true } },
        },
      }),
    ]);
    const weights = { assignments: course.weightAssignments, quizzes: course.weightQuizzes };
    const passing = Number(course.career.faculty.passingGrade);
    const quizzes = quizRows.map(({ questions, ...quiz }) => ({
      ...quiz,
      points: questions.reduce((sum, question) => sum + question.points, 0),
    }));
    const book = { weights, passing, locked: course.academicTerm.closed };

    if (role === 'student') {
      const [submissions, attempts] = await Promise.all([
        this.prisma.submission.findMany({
          where: { studentId: user.sub, assignment: { courseId } },
          select: { assignmentId: true, status: true, submittedAt: true, grade: true, feedback: true },
        }),
        this.prisma.quizAttempt.findMany({
          where: { studentId: user.sub, quiz: { courseId } },
          select: { quizId: true, submittedAt: true, score: true, maxScore: true, needsReview: true },
        }),
      ]);
      const byAssignment = new Map(submissions.map((row) => [row.assignmentId, row]));
      const items = assignments.map((assignment) => {
        const row = byAssignment.get(assignment.id);
        const returned = row?.status === 'RETURNED';
        return {
          ...assignment,
          state: submissionState(assignment.dueAt, row),
          grade: returned ? decimalToNumber(row?.grade) : null,
          feedback: returned ? (row?.feedback ?? null) : null,
        };
      });
      const byQuiz = new Map(attempts.map((row) => [row.quizId, row]));
      const quizItems = quizzes.map((quiz) => {
        const attempt = byQuiz.get(quiz.id);
        const sent = Boolean(attempt?.submittedAt);
        const visible = resultsVisible(quiz, sent, now);
        return {
          id: quiz.id,
          title: quiz.title,
          closesAt: quiz.closesAt,
          points: quiz.points,
          status: !attempt ? 'not_started' : sent ? 'submitted' : 'in_progress',
          score: visible ? decimalToNumber(attempt?.score) : null,
          needsReview: visible ? Boolean(attempt?.needsReview) : false,
        };
      });
      const assignmentsAverage = average(items);
      const quizzesAverage = quizAverage(
        quizItems.filter((item) => item.score !== null).map((item) => ({ score: item.score, maxScore: item.points })),
      );
      const final = finalGrade(assignmentsAverage, quizzesAverage, weights);
      return {
        role,
        ...book,
        assignments: items,
        quizzes: quizItems,
        // Compatibilidad: «average» sigue siendo el promedio de tareas.
        average: assignmentsAverage,
        assignmentsAverage,
        quizzesAverage,
        final,
        passed: final === null ? null : final >= passing,
      };
    }

    const [enrollments, submissions, attempts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId },
        orderBy: { student: { fullName: 'asc' } },
        select: { student: { select: { id: true, fullName: true, username: true } } },
      }),
      this.prisma.submission.findMany({
        where: { assignment: { courseId } },
        select: { assignmentId: true, studentId: true, status: true, submittedAt: true, grade: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { quiz: { courseId, kind: 'QUIZ', published: true }, submittedAt: { not: null } },
        select: { quizId: true, studentId: true, score: true, maxScore: true, needsReview: true },
      }),
    ]);
    const key = (itemId: string, studentId: string) => `${itemId}:${studentId}`;
    const byKey = new Map(submissions.map((row) => [key(row.assignmentId, row.studentId), row]));
    const attemptByKey = new Map(attempts.map((row) => [key(row.quizId, row.studentId), row]));

    const students = enrollments.map(({ student }) => {
      const cells = assignments.map((assignment) => {
        const row = byKey.get(key(assignment.id, student.id));
        return {
          assignmentId: assignment.id,
          state: submissionState(assignment.dueAt, row),
          grade: decimalToNumber(row?.grade),
          returned: row?.status === 'RETURNED',
          points: assignment.points,
        };
      });
      const quizCells = quizzes.map((quiz) => {
        const attempt = attemptByKey.get(key(quiz.id, student.id));
        return {
          quizId: quiz.id,
          score: attempt ? decimalToNumber(attempt.score) : null,
          points: quiz.points,
          submitted: Boolean(attempt),
          needsReview: attempt?.needsReview ?? false,
        };
      });
      // El promedio de tareas solo cuenta lo ya devuelto: es lo que ve el alumno.
      const official = cells.map((cell) => ({ grade: cell.returned ? cell.grade : null, points: cell.points }));
      const assignmentsAverage = average(official);
      const quizzesAverage = quizAverage(
        quizCells.filter((cell) => cell.submitted).map((cell) => ({ score: cell.score, maxScore: cell.points })),
      );
      const final = finalGrade(assignmentsAverage, quizzesAverage, weights);
      return {
        ...student,
        cells,
        quizCells,
        average: assignmentsAverage,
        assignmentsAverage,
        quizzesAverage,
        final,
        passed: final === null ? null : final >= passing,
      };
    });

    return { role, ...book, assignments, quizzes, students };
  }

  /** CSV para Excel (UTF-8 con BOM y ; como separador, habitual en es-MX). */
  async exportCsv(courseId: string, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const data = await this.forCourse(courseId, user);
    if (data.role === 'student') return { filename: 'calificaciones.csv', content: '' };

    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { name: true, term: true },
    });
    const header = [
      'Matrícula',
      'Nombre',
      ...data.assignments.map((assignment) => `${assignment.title} (/${assignment.points})`),
      ...data.quizzes.map((quiz) => `Cuestionario: ${quiz.title} (/${quiz.points})`),
      `Tareas (0-10, ${data.weights.assignments} %)`,
      `Cuestionarios (0-10, ${data.weights.quizzes} %)`,
      'Final (0-10)',
      `Situación (aprueba con ${data.passing})`,
    ];
    const rows = data.students.map((student) => [
      student.username,
      student.fullName,
      ...student.cells.map((cell) => cell.grade),
      ...student.quizCells.map((cell) => cell.score),
      student.assignmentsAverage,
      student.quizzesAverage,
      student.final,
      student.passed === null ? '' : student.passed ? 'Aprobado' : 'No aprobado',
    ]);
    const content =
      '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
    const slug = `${course.name}-${course.term}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return { filename: `calificaciones-${slug || 'curso'}.csv`, content };
  }
}
