import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Download } from "lucide-react";
import { QuizManagerBar } from "@/components/quizzes/QuizManagerBar";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { BTN_SECONDARY } from "@/components/ui/styles";
import { formatDateTime } from "@/lib/dashboard/format";
import { formatPoints, optionIsCorrect, type QuizResults, type QuizView } from "@/lib/quizzes";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Respuestas" };

const TRUE_FALSE = [
  { id: "true", text: "Verdadero" },
  { id: "false", text: "Falso" },
];

const STATUS = {
  submitted: { label: "Enviado", tone: "bg-uach-emerald/10 text-uach-emerald" },
  in_progress: { label: "Respondiendo", tone: "bg-amber-50 text-amber-800" },
  not_started: { label: "Sin responder", tone: "bg-uach-canvas text-uach-ink/75" },
} as const;

/** Pestaña «Respuestas» del docente: como Google Forms, resumen por pregunta y lista de alumnos. */
export default async function RespuestasPage({ params }: { params: { cursoId: string; cuestionarioId: string } }) {
  const id = encodeURIComponent(params.cuestionarioId);
  const quiz = await serverApi<QuizView>(`/quizzes/${id}`);
  if (quiz.myRole === "student" || quiz.courseId !== params.cursoId) notFound();
  const results = await serverApi<QuizResults>(`/quizzes/${id}/results`);
  const graded = results.kind === "QUIZ";
  const base = `/cursos/${quiz.courseId}/cuestionarios/${quiz.id}`;

  return (
    <div className="space-y-4">
      <QuizManagerBar quiz={quiz} />

      <section className={`${CARD} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-xs text-uach-ink/75">Respuestas</dt>
            <dd className="text-2xl font-semibold tabular-nums text-uach-petrol">
              {results.responses}
              <span className="text-base font-medium text-uach-ink/75"> / {results.enrolled}</span>
            </dd>
          </div>
          {graded && (
            <div>
              <dt className="text-xs text-uach-ink/75">Promedio</dt>
              <dd className="text-2xl font-semibold tabular-nums text-uach-petrol">
                {formatPoints(results.average)}
                <span className="text-base font-medium text-uach-ink/75"> / {results.totalPoints}</span>
              </dd>
            </div>
          )}
        </dl>
        {results.responses > 0 && (
          <a href={`/api/quizzes/${quiz.id}/results/export`} className={BTN_SECONDARY} download>
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Descargar CSV
          </a>
        )}
      </section>

      <section aria-labelledby="students-title" className={`${CARD} p-2`}>
        <h2 id="students-title" className="px-3 pb-1 pt-3 text-base font-semibold text-uach-ink">
          Alumnos
        </h2>
        {results.students.length === 0 ? (
          <p className="px-3 pb-4 text-sm text-uach-ink/75">Todavía no hay alumnos inscritos en el curso.</p>
        ) : (
          <ul className="divide-y divide-uach-ink/[0.06]">
            {results.students.map((row) => {
              const status = STATUS[row.status];
              const content = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-uach-ink">{row.student.fullName}</span>
                    <span className="block text-xs tabular-nums text-uach-ink/75">
                      {row.student.username}
                      {row.submittedAt && ` · ${formatDateTime(row.submittedAt)}`}
                    </span>
                  </span>
                  {row.needsReview && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Por revisar
                    </span>
                  )}
                  {graded && row.status === "submitted" ? (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-uach-ink">
                      {formatPoints(row.score)} / {results.totalPoints}
                    </span>
                  ) : (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span>
                  )}
                </>
              );
              return (
                <li key={row.student.id}>
                  {row.attemptId && row.status === "submitted" ? (
                    <Link
                      href={`${base}/respuestas/${row.attemptId}`}
                      className={`press-soft group flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 hover:bg-uach-canvas ${FOCUS_RING}`}
                    >
                      {content}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-uach-ink/40 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">
                      {content}
                      <span className="h-4 w-4 shrink-0" aria-hidden />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {results.responses > 0 && (
        <section aria-labelledby="summary-title" className="space-y-3">
          <h2 id="summary-title" className="text-base font-semibold text-uach-ink">
            Resumen por pregunta
          </h2>
          <ol className="space-y-3">
            {results.summary.map((q, index) => {
              const options = q.type === "TRUE_FALSE" ? TRUE_FALSE : (q.options ?? []);
              return (
                <li key={q.id} className={`${CARD} space-y-3 p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-relaxed text-uach-ink">
                      <span className="tabular-nums text-uach-ink/75">{index + 1}. </span>
                      <span className="whitespace-pre-line">{q.prompt}</span>
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-uach-ink/75">
                      {q.answered} {q.answered === 1 ? "respuesta" : "respuestas"}
                    </span>
                  </div>
                  {q.correct !== null && q.answered > 0 && (
                    <p className="text-xs text-uach-ink/75">
                      <span className="font-medium tabular-nums text-uach-emerald">
                        {q.correct} de {results.responses}
                      </span>{" "}
                      con todos los puntos
                    </p>
                  )}
                  {q.counts ? (
                    <ul className="space-y-2">
                      {options.map((option) => {
                        const count = q.counts?.[option.id] ?? 0;
                        const pct = q.answered ? Math.round((count / q.answered) * 100) : 0;
                        const correct = optionIsCorrect(q.answerKey, option.id);
                        return (
                          <li key={option.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className={correct ? "font-medium text-uach-emerald" : "text-uach-ink"}>
                                {option.text}
                                {correct && <span className="sr-only"> (correcta)</span>}
                              </span>
                              <span className="shrink-0 tabular-nums text-uach-ink/75">
                                {count} · {pct}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-uach-canvas" aria-hidden>
                              <div
                                className={`h-full rounded-full ${correct ? "bg-uach-emerald" : "bg-uach-teal"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : q.texts && q.texts.length > 0 ? (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                      {q.texts.map((text, i) => (
                        <li key={i} className="whitespace-pre-line rounded-xl bg-uach-canvas px-3 py-2 text-sm text-uach-ink">
                          {text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-uach-ink/75">Sin respuestas.</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
