import { notFound } from "next/navigation";
import { AssignmentDetail } from "@/components/classwork/AssignmentDetail";
import { ReviewPanel } from "@/components/classwork/ReviewPanel";
import { SubmissionPanel } from "@/components/classwork/SubmissionPanel";
import type { AssignmentView, StudentSubmissionRow } from "@/lib/classwork";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Tarea" };

export default async function TareaDetallePage({
  params,
}: {
  params: { cursoId: string; tareaId: string };
}) {
  const assignment = await serverApi<AssignmentView>(`/assignments/${encodeURIComponent(params.tareaId)}`);
  // La tarea debe pertenecer al curso de la URL.
  if (assignment.courseId !== params.cursoId) notFound();

  if (assignment.myRole === "student" && assignment.mySubmission) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <AssignmentDetail assignment={assignment} />
        <SubmissionPanel assignmentId={assignment.id} points={assignment.points} initial={assignment.mySubmission} />
      </div>
    );
  }

  const rows = await serverApi<StudentSubmissionRow[]>(`/assignments/${assignment.id}/submissions`);
  return (
    <div className="space-y-4">
      <AssignmentDetail assignment={assignment} />
      <ReviewPanel assignmentId={assignment.id} points={assignment.points} initial={rows} />
    </div>
  );
}
