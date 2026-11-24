import { notFound } from "next/navigation";
import { AssignmentDetail } from "@/components/classwork/AssignmentDetail";
import { ReviewPanel } from "@/components/classwork/ReviewPanel";
import { SubmissionPanel } from "@/components/classwork/SubmissionPanel";
import type { AssignmentView, StudentSubmissionRow } from "@/lib/classwork";
import type { QuizListItem } from "@/lib/quizzes";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Tarea" };

/** Título de la actividad requerida (para explicarle al docente la condición). */
async function requirementTitle(assignment: AssignmentView) {
  if (!assignment.requiresKind || !assignment.requiresId) return null;
  const course = encodeURIComponent(assignment.courseId);
  if (assignment.requiresKind === "assignment") {
    const list = await serverApi<AssignmentView[]>(`/courses/${course}/assignments`);
    return list.find((item) => item.id === assignment.requiresId)?.title ?? null;
  }
  const list = await serverApi<QuizListItem[]>(`/courses/${course}/quizzes`);
  return list.find((item) => item.id === assignment.requiresId)?.title ?? null;
}

export default async function TareaDetallePage({
  params,
}: {
  params: { cursoId: string; tareaId: string };
}) {
  const assignment = await serverApi<AssignmentView>(`/assignments/${encodeURIComponent(params.tareaId)}`);
  // La tarea debe pertenecer al curso de la URL.
  if (assignment.courseId !== params.cursoId) notFound();

  if (assignment.myRole === "student" && assignment.mySubmission) {
    if (!assignment.availability.available) return <AssignmentDetail assignment={assignment} />;
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <AssignmentDetail assignment={assignment} />
        <SubmissionPanel assignmentId={assignment.id} points={assignment.points} initial={assignment.mySubmission} />
      </div>
    );
  }

  const [rows, required] = await Promise.all([
    serverApi<StudentSubmissionRow[]>(`/assignments/${assignment.id}/submissions`),
    requirementTitle(assignment),
  ]);
  return (
    <div className="space-y-4">
      <AssignmentDetail assignment={assignment} requirementTitle={required} />
      <ReviewPanel assignmentId={assignment.id} points={assignment.points} rubric={assignment.rubric} initial={rows} />
    </div>
  );
}
