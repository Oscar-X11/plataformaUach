import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type ActivityKind = 'assignment' | 'quiz';

/** Condiciones de una tarea o cuestionario (acceso condicional). */
export interface Conditions {
  /** Fecha desde la que se muestra (tareas: availableFrom; cuestionarios: opensAt). */
  from?: Date | null;
  requiresKind?: string | null;
  requiresId?: string | null;
}

export interface Availability {
  available: boolean;
  /** Por qué todavía no: "Disponible desde…" o "Completa «…» primero". */
  reason: string | null;
}

const dateText = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Acceso condicional. Una actividad está disponible para un alumno si ya pasó
 * su fecha de inicio y completó la actividad requerida (entregó la tarea o
 * envió el cuestionario). Docentes y administradores siempre la ven.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lo que el alumno ya completó en el curso. */
  async completions(courseId: string, studentId: string) {
    const [submissions, attempts] = await Promise.all([
      this.prisma.submission.findMany({
        where: { studentId, assignment: { courseId }, status: { in: ['SUBMITTED', 'RETURNED'] } },
        select: { assignmentId: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { studentId, quiz: { courseId }, submittedAt: { not: null } },
        select: { quizId: true },
      }),
    ]);
    return {
      assignments: new Set(submissions.map((row) => row.assignmentId)),
      quizzes: new Set(attempts.map((row) => row.quizId)),
    };
  }

  /** Títulos de las actividades del curso (para explicar el requisito). */
  async titles(courseId: string) {
    const [assignments, quizzes] = await Promise.all([
      this.prisma.assignment.findMany({ where: { courseId }, select: { id: true, title: true } }),
      this.prisma.quiz.findMany({ where: { courseId }, select: { id: true, title: true } }),
    ]);
    return new Map<string, string>([
      ...assignments.map((row) => [`assignment:${row.id}`, row.title] as [string, string]),
      ...quizzes.map((row) => [`quiz:${row.id}`, row.title] as [string, string]),
    ]);
  }

  /** Evalúa varias actividades del mismo curso para un alumno. */
  async evaluator(courseId: string, studentId: string) {
    const [done, titles] = await Promise.all([this.completions(courseId, studentId), this.titles(courseId)]);
    const now = new Date();
    return (conditions: Conditions): Availability => {
      if (conditions.from && conditions.from > now) {
        return { available: false, reason: `Disponible desde el ${dateText.format(conditions.from)}` };
      }
      const { requiresKind: kind, requiresId: id } = conditions;
      if (kind && id) {
        const title = titles.get(`${kind}:${id}`);
        // Si la actividad requerida se borró, la condición ya no aplica.
        if (title) {
          const completed = kind === 'assignment' ? done.assignments.has(id) : done.quizzes.has(id);
          if (!completed) {
            const verb = kind === 'assignment' ? 'Entrega' : 'Responde';
            return { available: false, reason: `${verb} «${title}» primero` };
          }
        }
      }
      return { available: true, reason: null };
    };
  }

  /**
   * Varias actividades de distintos cursos a la vez (inicio y calendario del
   * alumno): true = disponible. Solo consulta los requisitos que aparecen.
   */
  async availableMany(studentId: string, items: Conditions[]) {
    const now = new Date();
    const wanted = (kind: string) => [
      ...new Set(items.filter((item) => item.requiresKind === kind && item.requiresId).map((item) => item.requiresId!)),
    ];
    const needAssignments = wanted('assignment');
    const needQuizzes = wanted('quiz');
    const [submissions, attempts, assignments, quizzes] = await Promise.all([
      needAssignments.length
        ? this.prisma.submission.findMany({
            where: { studentId, assignmentId: { in: needAssignments }, status: { in: ['SUBMITTED', 'RETURNED'] } },
            select: { assignmentId: true },
          })
        : [],
      needQuizzes.length
        ? this.prisma.quizAttempt.findMany({
            where: { studentId, quizId: { in: needQuizzes }, submittedAt: { not: null } },
            select: { quizId: true },
          })
        : [],
      needAssignments.length
        ? this.prisma.assignment.findMany({ where: { id: { in: needAssignments } }, select: { id: true } })
        : [],
      needQuizzes.length ? this.prisma.quiz.findMany({ where: { id: { in: needQuizzes } }, select: { id: true } }) : [],
    ]);
    const done = new Set([
      ...submissions.map((row) => `assignment:${row.assignmentId}`),
      ...attempts.map((row) => `quiz:${row.quizId}`),
    ]);
    const exists = new Set([
      ...assignments.map((row) => `assignment:${row.id}`),
      ...quizzes.map((row) => `quiz:${row.id}`),
    ]);
    return items.map((item) => {
      if (item.from && item.from > now) return false;
      if (!item.requiresKind || !item.requiresId) return true;
      const key = `${item.requiresKind}:${item.requiresId}`;
      // Si la actividad requerida se borró, la condición ya no aplica.
      return !exists.has(key) || done.has(key);
    });
  }

  /** Para endpoints de alumno: 403 con la razón si todavía no puede abrirla. */
  async assertAvailable(courseId: string, studentId: string, conditions: Conditions) {
    const evaluate = await this.evaluator(courseId, studentId);
    const result = evaluate(conditions);
    if (!result.available) throw new ForbiddenException(`Aún no disponible: ${result.reason}`);
  }

  /**
   * Valida el requisito que pone el docente: debe ser otra actividad del mismo
   * curso y no puede formar un ciclo (A requiere B y B requiere A).
   */
  async validateRequirement(
    courseId: string,
    self: { kind: ActivityKind; id?: string },
    kind: string | null | undefined,
    id: string | null | undefined,
  ) {
    if (!kind && !id) return { requiresKind: null, requiresId: null };
    if ((kind !== 'assignment' && kind !== 'quiz') || !id) {
      throw new BadRequestException('Elige la actividad que se debe completar antes');
    }
    if (self.id && self.kind === kind && self.id === id) {
      throw new BadRequestException('Una actividad no puede requerirse a sí misma');
    }
    // Recorre la cadena de requisitos para detectar ciclos.
    let current: { kind: string; id: string } | null = { kind, id };
    for (let depth = 0; current && depth < 25; depth++) {
      const row: { courseId: string; requiresKind: string | null; requiresId: string | null } | null =
        current.kind === 'assignment'
          ? await this.prisma.assignment.findUnique({
              where: { id: current.id },
              select: { courseId: true, requiresKind: true, requiresId: true },
            })
          : await this.prisma.quiz.findUnique({
              where: { id: current.id },
              select: { courseId: true, requiresKind: true, requiresId: true },
            });
      if (!row || row.courseId !== courseId) {
        if (depth === 0) throw new BadRequestException('La actividad requerida no es de esta clase');
        break;
      }
      if (self.id && row.requiresKind === self.kind && row.requiresId === self.id) {
        throw new BadRequestException('Ese requisito formaría un ciclo entre actividades');
      }
      current = row.requiresKind && row.requiresId ? { kind: row.requiresKind, id: row.requiresId } : null;
    }
    return { requiresKind: kind, requiresId: id };
  }
}
