import Link from "next/link";
import { ClipboardCheck, MessageSquareText, Plus } from "lucide-react";
import { QuizList } from "@/components/quizzes/QuizList";
import { CARD } from "@/components/dashboard/tone";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { canManage, canTeach } from "@/lib/courses";
import { getCourse } from "@/lib/courses-server";
import type { QuizListItem } from "@/lib/quizzes";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Cuestionarios" };

export default async function CuestionariosPage({ params }: { params: { cursoId: string } }) {
  const [course, quizzes] = await Promise.all([
    getCourse(params.cursoId),
    serverApi<QuizListItem[]>(`/courses/${encodeURIComponent(params.cursoId)}/quizzes`),
  ]);
  const manager = canManage(course);
  const teacher = canTeach(course);
  const base = `/cursos/${course.id}/cuestionarios`;

  return (
    <div className="space-y-4">
      {teacher && (
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/nuevo?tipo=QUIZ`} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Nuevo cuestionario
          </Link>
          <Link href={`${base}/nuevo?tipo=SURVEY`} className={BTN_SECONDARY}>
            <MessageSquareText className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Nueva encuesta
          </Link>
        </div>
      )}

      {quizzes.length > 0 ? (
        <QuizList courseId={course.id} quizzes={quizzes} manager={manager} />
      ) : (
        <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
            <ClipboardCheck className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-uach-ink">
            {teacher ? "Arma tu primer cuestionario" : "Sin cuestionarios por ahora"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-uach-ink/75">
            {teacher
              ? "Como en Google Forms: opción múltiple, casillas, verdadero o falso, respuesta corta y párrafo. Se califica solo, y también puedes hacer encuestas."
              : manager
                ? "El docente todavía no publica cuestionarios ni encuestas en esta clase."
                : "Cuando tu docente publique un examen o una encuesta, aparecerá aquí."}
          </p>
        </div>
      )}
    </div>
  );
}
