import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardList, Lock } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import type { AssignmentView } from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";

export function AssignmentList({ assignments }: { assignments: AssignmentView[] }) {
  return (
    <ul className={`${CARD} divide-y divide-uach-ink/[0.06] p-2`}>
      {assignments.map((assignment) => {
        const locked = !assignment.availability.available;
        const conditional =
          assignment.stats &&
          (assignment.requiresId || (assignment.availableFrom && new Date(assignment.availableFrom) > new Date()));
        if (locked) {
          // Bloqueada para el alumno: se ve el título y por qué, sin enlace.
          return (
            <li key={assignment.id} className="flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-3 text-uach-ink/60">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-uach-canvas">
                <Lock className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{assignment.title}</span>
                <span className="mt-0.5 block text-xs">{assignment.availability.reason}</span>
              </span>
            </li>
          );
        }
        return (
          <li key={assignment.id}>
            <Link
              href={`/cursos/${assignment.courseId}/tareas/${assignment.id}`}
              className={`press-soft group flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-3 hover:bg-uach-canvas ${FOCUS_RING}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
                <ClipboardList className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-uach-ink">{assignment.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-uach-ink/75">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {assignment.dueAt ? `Vence ${formatDateTime(assignment.dueAt)}` : "Sin fecha de entrega"}
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{assignment.points} pts</span>
                  {conditional && (
                    <span className="inline-flex items-center gap-1 text-uach-ink/75">
                      <span aria-hidden>·</span>
                      <Lock className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                      Con condiciones
                    </span>
                  )}
                </span>
              </span>
              {assignment.mySubmission && <StateChip state={assignment.mySubmission.state} />}
              {assignment.stats && (
                <span className="hidden shrink-0 text-right text-xs tabular-nums text-uach-ink/75 sm:block">
                  <span className="block font-medium text-uach-ink">
                    {assignment.stats.submitted + assignment.stats.returned}/{assignment.stats.students}
                  </span>
                  entregadas
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-uach-ink/40 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
