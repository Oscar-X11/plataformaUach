import { Injectable } from '@nestjs/common';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
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

  /** Alumno: sus calificaciones devueltas. Docente/admin: libro de calificaciones. */
  async forCourse(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: { id: true, title: true, dueAt: true, points: true },
    });

    if (role === 'student') {
      const submissions = await this.prisma.submission.findMany({
        where: { studentId: user.sub, assignment: { courseId } },
        select: { assignmentId: true, status: true, submittedAt: true, grade: true, feedback: true },
      });
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
      return { role, assignments: items, average: average(items) };
    }

    const [enrollments, submissions] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { courseId },
        orderBy: { student: { fullName: 'asc' } },
        select: { student: { select: { id: true, fullName: true, username: true } } },
      }),
      this.prisma.submission.findMany({
        where: { assignment: { courseId } },
        select: { assignmentId: true, studentId: true, status: true, submittedAt: true, grade: true },
      }),
    ]);
    const key = (assignmentId: string, studentId: string) => `${assignmentId}:${studentId}`;
    const byKey = new Map(submissions.map((row) => [key(row.assignmentId, row.studentId), row]));

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
      // El promedio del libro solo cuenta lo ya devuelto: es lo que ve el alumno.
      const official = cells.map((cell) => ({ grade: cell.returned ? cell.grade : null, points: cell.points }));
      return { ...student, cells, average: average(official) };
    });

    return { role, assignments, students };
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
      'Promedio (0-10)',
    ];
    const rows = data.students.map((student) => [
      student.username,
      student.fullName,
      ...student.cells.map((cell) => cell.grade),
      student.average,
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
