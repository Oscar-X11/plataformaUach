/**
 * Calificación final de una clase y alumnos en riesgo. Funciones puras.
 *
 * - Tareas: promedio (0-10) de las tareas devueltas con calificación.
 * - Cuestionarios: puntos obtenidos / puntos posibles (0-10) de los enviados.
 * - Final: promedio ponderado con los pesos de la clase. Si una categoría aún
 *   no tiene calificaciones, la final usa solo la otra.
 */

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Promedio 0-10 de cuestionarios: suma de puntajes / suma de máximos. */
export function quizAverage(attempts: { score: number | null; maxScore: number }[]) {
  const graded = attempts.filter((attempt) => attempt.score !== null && attempt.maxScore > 0);
  const possible = graded.reduce((sum, attempt) => sum + attempt.maxScore, 0);
  if (possible === 0) return null;
  const earned = graded.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
  return round1((earned / possible) * 10);
}

export function finalGrade(
  assignments: number | null,
  quizzes: number | null,
  weights: { assignments: number; quizzes: number },
) {
  if (assignments === null && quizzes === null) return null;
  if (quizzes === null || weights.quizzes === 0) return assignments ?? quizzes;
  if (assignments === null || weights.assignments === 0) return quizzes ?? assignments;
  const total = weights.assignments + weights.quizzes;
  return round1((assignments * weights.assignments + quizzes * weights.quizzes) / total);
}

/** Vencidas sin entregar que hacen «en riesgo» a un alumno. */
export const RISK_OVERDUE = 2;

/** En riesgo: 2 o más actividades vencidas sin entregar, o final por debajo del aprobatorio. */
export function riskReasons(overdue: number, final: number | null, passing: number) {
  const reasons: string[] = [];
  if (overdue >= RISK_OVERDUE) reasons.push(`${overdue} actividades vencidas sin entregar`);
  if (final !== null && final < passing) reasons.push(`Promedio ${final} (aprueba con ${passing})`);
  return reasons;
}
