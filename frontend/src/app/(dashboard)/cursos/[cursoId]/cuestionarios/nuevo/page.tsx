import { notFound } from "next/navigation";
import { QuizEditor } from "@/components/quizzes/QuizEditor";
import { canTeach } from "@/lib/courses";
import { getCourse } from "@/lib/courses-server";
import { KIND_LABEL, type QuizKind } from "@/lib/quizzes";

export const metadata = { title: "Nuevo formulario" };

export default async function NuevoCuestionarioPage({
  params,
  searchParams,
}: {
  params: { cursoId: string };
  searchParams: { tipo?: string };
}) {
  const course = await getCourse(params.cursoId);
  if (!canTeach(course)) notFound();
  const kind: QuizKind = searchParams.tipo === "SURVEY" ? "SURVEY" : "QUIZ";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-uach-petrol">{KIND_LABEL[kind].new}</h2>
      <QuizEditor courseId={course.id} kind={kind} />
    </div>
  );
}
