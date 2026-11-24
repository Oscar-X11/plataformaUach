import { courseLabel } from '../courses/courses.service';
import { Injectable } from '@nestjs/common';
import { average, decimalToNumber, submissionState } from '../classwork/submission-state';
import { csvCell } from '../classwork/grades.service';
import { PrismaService } from '../database/prisma.service';

/** Reportes para la administración: desempeño por curso. */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async courses(term?: string) {
    const now = new Date();
    const courses = await this.prisma.course.findMany({
      where: term ? { term } : {},
      orderBy: [{ term: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        term: true,
        grade: true,
        career: { select: { code: true, name: true, faculty: { select: { scheme: true } } } },
        teacher: { select: { fullName: true } },
        _count: { select: { enrollments: true } },
        assignments: {
          select: {
            dueAt: true,
            points: true,
            submissions: { select: { status: true, submittedAt: true, grade: true } },
          },
        },
      },
    });

    const rows = courses.map((course) => {
      const students = course._count.enrollments;
      let expected = 0; // tareas ya vencidas × alumnos
      let delivered = 0;
      let onTime = 0;
      const grades: { grade: number | null; points: number }[] = [];
      for (const assignment of course.assignments) {
        const due = assignment.dueAt && assignment.dueAt < now;
        if (due) expected += students;
        for (const submission of assignment.submissions) {
          const state = submissionState(assignment.dueAt, submission, now);
          if (state === 'submitted' || state === 'late' || state === 'returned') {
            if (due) delivered++;
            if (state !== 'late') onTime++;
          }
          if (submission.status === 'RETURNED') {
            grades.push({ grade: decimalToNumber(submission.grade), points: assignment.points });
          }
        }
      }
      return {
        id: course.id,
        name: course.name,
        term: course.term,
        career: { code: course.career.code, name: course.career.name },
        label: courseLabel(course),
        teacherName: course.teacher.fullName,
        students,
        assignments: course.assignments.length,
        /** % de entregas realizadas sobre las tareas ya vencidas. */
        deliveryRate: expected ? Math.round((Math.min(delivered, expected) / expected) * 100) : null,
        onTime,
        average: average(grades),
      };
    });

    const terms = [...new Set((await this.prisma.course.findMany({ select: { term: true } })).map((c) => c.term))].sort().reverse();
    return { terms, rows };
  }

  async coursesCsv(term?: string) {
    const { rows } = await this.courses(term);
    const header = ['Periodo', 'Clase', 'Carrera', 'Docente', 'Alumnos', 'Tareas', 'Entregas a tiempo', '% entrega', 'Promedio (0-10)'];
    const lines = rows.map((row) => [
      row.term,
      row.name,
      `${row.label} — ${row.career.name}`,
      row.teacherName,
      row.students,
      row.assignments,
      row.onTime,
      row.deliveryRate,
      row.average,
    ]);
    return '﻿' + [header, ...lines].map((line) => line.map(csvCell).join(';')).join('\r\n') + '\r\n';
  }
}
