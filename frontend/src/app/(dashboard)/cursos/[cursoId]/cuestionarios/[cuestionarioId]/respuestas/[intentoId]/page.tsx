import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GradeAnswerForm } from "@/components/quizzes/GradeAnswerForm";
import { ResultCard } from "@/components/quizzes/QuizTaker";
import { CARD } from "@/components/dashboard/tone";
import { formatDateTime } from "@/lib/dashboard/format";
import { formatPoints, type AttemptDetail, type QuizView } from "@/lib/quizzes";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Respuesta del alumno" };

/** Docente: lo que respondió un alumno y la calificación manual de las preguntas abiertas. */
export default async function IntentoPage({
  params,
}: {
  params: { cursoId: string; cuestionarioId: string; intentoId: string };
}) {
  const id = encodeURIComponent(params.cuestionarioId);
  const quiz = await serverApi<QuizView>(`/quizzes/${id}`);
  if (quiz.myRole === "student" || quiz.courseId !== params.cursoId) notFound();
  const attempt = await serverApi<AttemptDetail>(`/quizzes/${id}/attempts/${encodeURIComponent(params.intentoId)}`);
  const graded = attempt.kind === "QUIZ";

  return (
    <div className="space-y-4">
      <Link
        href={`/cursos/${quiz.courseId}/cuestionarios/${quiz.id}/respuestas`}
        className="inline-flex h-11 items-center gap-2 text-sm font-medium text-uach-teal hover:text-uach-tealDark"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Todas las respuestas
      </Link>

      <section className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className="text-lg font-semibold text-uach-petrol">{attempt.student.fullName}</h2>
          <p className="text-sm tabular-nums text-uach-ink/75">
            {attempt.student.username}
            {attempt.submittedAt && ` · enviado ${formatDateTime(attempt.submittedAt)}`}
          </p>
        </div>
        {graded && (
          <div className="sm:text-right">
            <p className="text-3xl font-semibold tabular-nums text-uach-petrol">
              {formatPoints(attempt.score)}
              <span className="text-base font-medium text-uach-ink/75"> / {attempt.maxScore}</span>
            </p>
            {attempt.needsReview && <p className="text-xs font-medium text-amber-800">Faltan preguntas por calificar</p>}
          </div>
        )}
      </section>

      <ol className="space-y-3">
        {attempt.questions.map((q, index) => (
          <li key={q.id}>
            <ResultCard question={q} index={index}>
              {/* Solo el docente ajusta puntos; el administrador ve el resultado. */}
              {graded && quiz.myRole === "teacher" && q.answerId && q.points > 0 && (
                <GradeAnswerForm answerId={q.answerId} max={q.points} current={q.earned ?? null} />
              )}
            </ResultCard>
          </li>
        ))}
      </ol>
    </div>
  );
}
