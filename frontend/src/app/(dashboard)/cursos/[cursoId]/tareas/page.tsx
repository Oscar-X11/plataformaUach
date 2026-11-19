import { ClipboardList } from "lucide-react";
import { AssignmentList } from "@/components/classwork/AssignmentList";
import { NewAssignmentButton } from "@/components/classwork/NewAssignmentButton";
import { CARD } from "@/components/dashboard/tone";
import type { AssignmentView } from "@/lib/classwork";
import { canManage } from "@/lib/courses";
import { getCourse } from "@/lib/courses-server";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Trabajo de clase" };

export default async function TareasCursoPage({ params }: { params: { cursoId: string } }) {
  const [course, assignments] = await Promise.all([
    getCourse(params.cursoId),
    serverApi<AssignmentView[]>(`/courses/${encodeURIComponent(params.cursoId)}/assignments`),
  ]);
  const manager = canManage(course);

  return (
    <div className="space-y-4">
      {manager && assignments.length > 0 && <NewAssignmentButton courseId={course.id} />}

      {assignments.length > 0 ? (
        <AssignmentList assignments={assignments} />
      ) : manager ? (
        <NewAssignmentButton courseId={course.id} startOpen />
      ) : (
        <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
            <ClipboardList className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-uach-ink">Sin tareas por ahora</h2>
          <p className="mt-1 max-w-sm text-sm text-uach-ink/75">
            Cuando tu docente asigne trabajo, aparecerá aquí con su fecha de entrega.
          </p>
        </div>
      )}
    </div>
  );
}
