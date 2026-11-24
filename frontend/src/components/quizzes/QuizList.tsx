import Link from "next/link";
import { ChevronRight, ClipboardCheck, MessageSquareText } from "lucide-react";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { formatDateTime } from "@/lib/dashboard/format";
import { formatPoints, type QuizListItem } from "@/lib/quizzes";

/** Chip de estado: lo que el docente o el alumno necesita saber de un vistazo. */
function statusChip(quiz: QuizListItem, manager: boolean): { label: string; tone: string } | null {
  if (manager) {
    if (!quiz.published) return { label: "Borrador", tone: "bg-uach-canvas text-uach-ink/75" };
    if (quiz.needsReview) return { label: `${quiz.needsReview} por revisar`, tone: "bg-amber-50 text-amber-800" };
    if (quiz.window === "closed") return { label: "Cerrado", tone: "bg-uach-canvas text-uach-ink/75" };
    if (quiz.window === "upcoming") return { label: "Programado", tone: "bg-uach-subtle text-uach-tealDark" };
    return { label: "Abierto", tone: "bg-uach-emerald/10 text-uach-emerald" };
  }
  if (quiz.myStatus === "submitted") {
    if (quiz.myScore !== null && quiz.myScore !== undefined) {
      return { label: `${formatPoints(quiz.myScore)} / ${quiz.totalPoints}`, tone: "bg-uach-teal/10 text-uach-tealDark" };
    }
    return { label: "Enviado", tone: "bg-uach-emerald/10 text-uach-emerald" };
  }
  if (quiz.myStatus === "in_progress") return { label: "En curso", tone: "bg-amber-50 text-amber-800" };
  if (quiz.lockedReason && quiz.window !== "closed") return { label: "Bloqueado", tone: "bg-uach-canvas text-uach-ink/75" };
  if (quiz.window === "closed") return { label: "Sin responder", tone: "bg-red-50 text-red-700" };
  if (quiz.window === "upcoming") return { label: "Próximamente", tone: "bg-uach-canvas text-uach-ink/75" };
  return { label: "Pendiente", tone: "bg-uach-subtle text-uach-tealDark" };
}

function when(quiz: QuizListItem) {
  if (quiz.window === "upcoming" && quiz.opensAt) return `Abre ${formatDateTime(quiz.opensAt)}`;
  if (quiz.closesAt) return `${quiz.window === "closed" ? "Cerró" : "Cierra"} ${formatDateTime(quiz.closesAt)}`;
  return "Sin fecha de cierre";
}

export function QuizList({ courseId, quizzes, manager }: { courseId: string; quizzes: QuizListItem[]; manager: boolean }) {
  return (
    <ul className={`${CARD} divide-y divide-uach-ink/[0.06] p-2`}>
      {quizzes.map((quiz) => {
        const survey = quiz.kind === "SURVEY";
        const Icon = survey ? MessageSquareText : ClipboardCheck;
        const chip = statusChip(quiz, manager);
        return (
          <li key={quiz.id}>
            <Link
              href={`/cursos/${courseId}/cuestionarios/${quiz.id}`}
              className={`press-soft group flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-3 hover:bg-uach-canvas ${FOCUS_RING}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-uach-ink">{quiz.title}</span>
                <span className="mt-0.5 block truncate text-xs text-uach-ink/75">
                  {survey ? "Encuesta" : "Cuestionario"} · {quiz.questionCount}{" "}
                  {quiz.questionCount === 1 ? "pregunta" : "preguntas"}
                  {!survey && ` · ${quiz.totalPoints} pts`}
                  {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""} · {when(quiz)}
                </span>
                {!manager && quiz.lockedReason && quiz.window !== "closed" && (
                  <span className="mt-0.5 block truncate text-xs text-uach-ink/75">{quiz.lockedReason}</span>
                )}
              </span>
              {manager && quiz.published && (
                <span className="hidden shrink-0 text-right text-xs tabular-nums text-uach-ink/75 sm:block">
                  <span className="block font-medium text-uach-ink">{quiz.responses}</span>
                  {quiz.responses === 1 ? "respuesta" : "respuestas"}
                </span>
              )}
              {chip && (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${chip.tone}`}>{chip.label}</span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-uach-ink/40 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
