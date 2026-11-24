import { notFound } from "next/navigation";
import { QuizEditor } from "@/components/quizzes/QuizEditor";
import { QuizManagerBar } from "@/components/quizzes/QuizManagerBar";
import { QuizTaker } from "@/components/quizzes/QuizTaker";
import type { QuizView } from "@/lib/quizzes";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Cuestionario" };

export default async function CuestionarioPage({ params }: { params: { cursoId: string; cuestionarioId: string } }) {
  const quiz = await serverApi<QuizView>(`/quizzes/${encodeURIComponent(params.cuestionarioId)}`);
  if (quiz.courseId !== params.cursoId) notFound();

  if (quiz.myRole === "student") return <QuizTaker quiz={quiz} />;

  return (
    <div className="space-y-4">
      <QuizManagerBar quiz={quiz} />
      <QuizEditor key={`${quiz.id}-${quiz.locked}`} courseId={quiz.courseId} kind={quiz.kind} quiz={quiz} />
    </div>
  );
}
