"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarClock, Pencil, Trash2 } from "lucide-react";
import { AssignmentForm } from "@/components/classwork/AssignmentForm";
import { CARD } from "@/components/dashboard/tone";
import { BTN_DANGER, BTN_GHOST } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { AssignmentView } from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";

/** Instrucciones de la tarea; el docente puede editarla o borrarla. */
export function AssignmentDetail({ assignment }: { assignment: AssignmentView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const manager = assignment.myRole !== "student";

  async function remove() {
    if (!window.confirm("Se borrarán la tarea, las entregas y sus archivos. ¿Continuar?")) return;
    setDeleting(true);
    try {
      await api(`/assignments/${assignment.id}`, { method: "DELETE" });
      router.replace(`/cursos/${assignment.courseId}/tareas`);
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar la tarea.");
      setDeleting(false);
    }
  }

  if (editing) {
    return <AssignmentForm courseId={assignment.courseId} assignment={assignment} onDone={() => setEditing(false)} />;
  }

  return (
    <article className={`${CARD} p-5 sm:p-6`}>
      <Link
        href={`/cursos/${assignment.courseId}/tareas`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-uach-teal hover:text-uach-tealDark"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Trabajo de clase
      </Link>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-uach-ink sm:text-2xl">{assignment.title}</h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-uach-ink/75">
        <CalendarClock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {assignment.dueAt ? `Vence ${formatDateTime(assignment.dueAt)}` : "Sin fecha de entrega"}
        <span aria-hidden>·</span>
        <span className="tabular-nums">{assignment.points} puntos</span>
      </p>

      <div className="mt-5 border-t border-uach-ink/[0.06] pt-5">
        {assignment.instructions ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-uach-ink">{assignment.instructions}</p>
        ) : (
          <p className="text-sm text-uach-ink/75">Sin instrucciones adicionales.</p>
        )}
      </div>

      {manager && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-uach-ink/[0.06] pt-4">
          <button type="button" onClick={() => setEditing(true)} className={BTN_GHOST}>
            <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Editar
          </button>
          <button type="button" onClick={remove} disabled={deleting} className={BTN_DANGER}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {deleting ? "Borrando…" : "Borrar"}
          </button>
        </div>
      )}
    </article>
  );
}
