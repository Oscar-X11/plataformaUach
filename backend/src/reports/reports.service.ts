import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProgressService } from '../classwork/progress.service';
import { submissionState } from '../classwork/submission-state';
import { csvCell } from '../classwork/grades.service';
import { courseLabel } from '../courses/courses.service';
import { PrismaService } from '../database/prisma.service';

export interface ReportFilters {
  term?: string;
  careerId?: string;
}

const courseSelect = {
  id: true,
  name: true,
  term: true,
  grade: true,
  career: { select: { code: true, name: true, faculty: { select: { scheme: true } } } },
} satisfies Prisma.CourseSelect;

/**
 * Reportes para la administración: seguimiento por curso y alumnos en riesgo.
 * El riesgo usa el mismo cálculo que la pestaña Seguimiento del docente
 * (actividades vencidas y calificación final con los pesos de la clase).
 * Los cursos se recorren uno por uno para no cargar todo en memoria a la vez.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  private where(filters: ReportFilters): Prisma.CourseWhereInput {
    return {
      ...(filters.term ? { term: filters.term } : {}),
      ...(filters.careerId ? { careerId: filters.careerId } : {}),
    };
  }

  /** Periodos y carreras que tienen cursos (opciones de los filtros). */
  private async options() {
    const [terms, careers] = await Promise.all([
      this.prisma.course.findMany({ distinct: ['term'], select: { term: true }, orderBy: { term: 'desc' } }),
      this.prisma.career.findMany({
        where: { courses: { some: {} } },
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true },
      }),
    ]);
    return { terms: terms.map((row) => row.term), careers };
  }

  async courses(filters: ReportFilters) {
    const now = new Date();
    const courses = await this.prisma.course.findMany({
      where: this.where(filters),
      orderBy: [{ term: 'desc' }, { name: 'asc' }],
      select: {
        ...courseSelect,
        teacher: { select: { fullName: true } },
        _count: { select: { enrollments: true } },
        assignments: {
          select: {
            dueAt: true,
            submissions: { select: { status: true, submittedAt: true } },
          },
        },
      },
    });

    const rows = [];
    for (const course of courses) {
      const students = course._count.enrollments;
      let expected = 0; // tareas ya vencidas × alumnos
      let delivered = 0;
      let onTime = 0;
      let ungraded = 0;
      for (const assignment of course.assignments) {
        const due = Boolean(assignment.dueAt && assignment.dueAt < now);
        if (due) expected += students;
        for (const submission of assignment.submissions) {
          const state = submissionState(assignment.dueAt, submission, now);
          // Entregadas que el docente todavía no califica ni devuelve.
          if (state === 'submitted' || state === 'late') ungraded++;
          if (due && (state === 'submitted' || state === 'late' || state === 'returned')) {
            delivered++;
            if (state !== 'late') onTime++;
          }
        }
      }
      const tracking = students ? await this.progress.studentRows(course.id) : [];
      rows.push({
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
        /** De esas entregas, cuántas llegaron a tiempo. */
        onTime,
        ungraded,
        atRisk: tracking.filter((row) => row.risk.length > 0).length,
      });
    }

    return { ...(await this.options()), rows };
  }

  /** Alumnos en riesgo en al menos una clase, con el detalle por clase. */
  async students(filters: ReportFilters) {
    const courses = await this.prisma.course.findMany({
      where: this.where(filters),
      orderBy: [{ term: 'desc' }, { name: 'asc' }],
      select: courseSelect,
    });

    const byStudent = new Map<
      string,
      {
        student: { id: string; fullName: string; username: string };
        courses: { id: string; name: string; label: string; term: string; overdue: number; final: number | null; risk: string[] }[];
      }
    >();
    for (const course of courses) {
      for (const row of await this.progress.studentRows(course.id)) {
        if (row.risk.length === 0) continue;
        const entry = byStudent.get(row.student.id) ?? { student: row.student, courses: [] };
        entry.courses.push({
          id: course.id,
          name: course.name,
          label: courseLabel(course),
          term: course.term,
          overdue: row.overdue,
          final: row.final,
          risk: row.risk,
        });
        byStudent.set(row.student.id, entry);
      }
    }

    const students = [...byStudent.values()].sort(
      (a, b) => b.courses.length - a.courses.length || a.student.fullName.localeCompare(b.student.fullName, 'es'),
    );
    return { ...(await this.options()), coursesChecked: courses.length, students };
  }

  async coursesCsv(filters: ReportFilters) {
    const { rows } = await this.courses(filters);
    const header = ['Periodo', 'Clase', 'Carrera', 'Docente', 'Alumnos', 'Tareas', '% entrega', 'Entregas a tiempo', 'Sin calificar', 'Alumnos en riesgo'];
    const lines = rows.map((row) => [
      row.term,
      row.name,
      `${row.label} — ${row.career.name}`,
      row.teacherName,
      row.students,
      row.assignments,
      row.deliveryRate,
      row.onTime,
      row.ungraded,
      row.atRisk,
    ]);
    return toCsv(header, lines);
  }

  async studentsCsv(filters: ReportFilters) {
    const { students } = await this.students(filters);
    const header = ['Matrícula', 'Alumno', 'Clases en riesgo', 'Clase', 'Periodo', 'Vencidas sin entregar', 'Calificación actual', 'Motivo'];
    const lines = students.flatMap((entry) =>
      entry.courses.map((course) => [
        entry.student.username,
        entry.student.fullName,
        entry.courses.length,
        `${course.name} (${course.label})`,
        course.term,
        course.overdue,
        course.final,
        course.risk.join('; '),
      ]),
    );
    return toCsv(header, lines);
  }
}

const toCsv = (header: string[], lines: (string | number | null)[][]) =>
  '﻿' + [header, ...lines].map((line) => line.map(csvCell).join(';')).join('\r\n') + '\r\n';
