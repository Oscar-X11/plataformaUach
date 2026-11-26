"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarClock, Lock, Pencil, Table2, Trash2 } from "lucide-react";
import { AssignmentForm } from "@/components/classwork/AssignmentForm";
import { RubricEditor, RubricTable } from "@/components/classwork/Rubric";
import { CARD } from "@/components/dashboard/tone";
import { BTN_DANGER, BTN_GHOST } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { AssignmentView } from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";

/** Instrucciones de la tarea; el docente puede editarla, borrarla y definir su rúbrica. */
export function AssignmentDetail({
  assignment,
  requirementTitle,
}: {
  assignment: AssignmentView;
  /** Título de la actividad requerida (acceso condicional), si hay. */
  requirementTitle?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editingRubric, setEditingRubric] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const manager = assignment.myRole !== "student";
  // Editar la tarea o su rúbrica es del docente; el administrador solo consulta y puede borrar.
  const teacher = assignment.myRole === "teacher";
  const locked = !manager && !assignment.availability.available;
  const opensLater = assignment.availableFrom && new Date(assignment.availableFrom) > new Date();

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
        {assignment.rubric.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>con rúbrica</span>
          </>
        )}
      </p>

      {manager && (opensLater || assignment.requiresId) && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-uach-canvas px-3 py-2 text-sm text-uach-ink/80">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-uach-ink/60" strokeWidth={1.75} aria-hidden />
          <span>
            {opensLater && <>Los alumnos la verán desde el {formatDateTime(assignment.availableFrom!)}. </>}
            {assignment.requiresId && (
              <>Requiere completar antes {requirementTitle ? `«${requirementTitle}»` : "otra actividad"}.</>
            )}
          </span>
        </p>
      )}

      <div className="mt-5 border-t border-uach-ink/[0.06] pt-5">
        {locked ? (
          <p className="flex items-start gap-2 text-sm text-uach-ink">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-uach-ink/60" strokeWidth={1.75} aria-hidden />
            Aún no disponible. {assignment.availability.reason}.
          </p>
        ) : assignment.instructions ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-uach-ink">{assignment.instructions}</p>
        ) : (
          <p className="text-sm text-uach-ink/75">Sin instrucciones adicionales.</p>
        )}
      </div>

      {(assignment.rubric.length > 0 || teacher) && !locked && (
        <section aria-labelledby="rubrica" className="mt-5 border-t border-uach-ink/[0.06] pt-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 id="rubrica" className="flex items-center gap-2 text-sm font-semibold text-uach-ink">
              <Table2 className="h-4 w-4 text-uach-teal" strokeWidth={1.75} aria-hidden />
              Rúbrica
            </h3>
            {teacher && !editingRubric && (
              <button type="button" onClick={() => setEditingRubric(true)} className={BTN_GHOST}>
                <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {assignment.rubric.length ? "Editar rúbrica" : "Crear rúbrica"}
              </button>
            )}
          </div>
          {editingRubric ? (
            <RubricEditor assignment={assignment} onDone={() => setEditingRubric(false)} />
          ) : assignment.rubric.length ? (
            <RubricTable rubric={assignment.rubric} selection={assignment.mySubmission?.rubricSelection} />
          ) : (
            <p className="text-sm text-uach-ink/75">
              Sin rúbrica. Con una, calificas eligiendo un nivel por criterio y la calificación se calcula sola.
            </p>
          )}
        </section>
      )}

      {manager && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-uach-ink/[0.06] pt-4">
          {teacher && (
            <button type="button" onClick={() => setEditing(true)} className={BTN_GHOST}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Editar
            </button>
          )}
          <button type="button" onClick={remove} disabled={deleting} className={BTN_DANGER}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {deleting ? "Borrando…" : "Borrar"}
          </button>
        </div>
      )}
    </article>
  );
}
