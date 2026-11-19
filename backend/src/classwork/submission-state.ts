import { Prisma, SubmissionStatus } from '@prisma/client';

/**
 * Estado que ve la interfaz, calculado a partir de lo guardado y la fecha:
 * - pending:   sin entregar y aún a tiempo (o sin fecha).
 * - missing:   sin entregar y ya venció.
 * - submitted: entregada a tiempo.
 * - late:      entregada después de la fecha.
 * - returned:  calificada y devuelta.
 */
export type SubmissionState = 'pending' | 'missing' | 'submitted' | 'late' | 'returned';

export interface SubmissionLike {
  status: SubmissionStatus;
  submittedAt: Date | null;
}

export function submissionState(
  dueAt: Date | null,
  submission: SubmissionLike | null | undefined,
  now = new Date(),
): SubmissionState {
  const status = submission?.status ?? 'ASSIGNED';
  if (status === 'RETURNED') return 'returned';
  if (status === 'SUBMITTED') {
    const at = submission?.submittedAt;
    return dueAt && at && at > dueAt ? 'late' : 'submitted';
  }
  return dueAt && dueAt < now ? 'missing' : 'pending';
}

export const decimalToNumber = (value: Prisma.Decimal | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

/** Promedio en escala 0–10 sobre las tareas devueltas con calificación. */
export function average(items: { grade: number | null; points: number }[]) {
  const graded = items.filter((item) => item.grade !== null);
  const possible = graded.reduce((sum, item) => sum + item.points, 0);
  if (possible === 0) return null;
  const earned = graded.reduce((sum, item) => sum + (item.grade ?? 0), 0);
  return Math.round((earned / possible) * 100) / 10;
}
