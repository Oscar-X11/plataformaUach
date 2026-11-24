"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseRequirement, requirementValue, RequirementSelect } from "@/components/classwork/ConditionsFields";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { CARD } from "@/components/dashboard/tone";
import { api, ApiError } from "@/lib/api";
import type { AssignmentView } from "@/lib/classwork";

/** ISO → valor de <input type="datetime-local"> en la hora local del navegador. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const toIso = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return text ? new Date(text).toISOString() : null;
};

/** Crear (courseId) o editar (assignment) una tarea. */
export function AssignmentForm({
  courseId,
  assignment,
  onDone,
}: {
  courseId: string;
  assignment?: AssignmentView;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requirement, setRequirement] = useState(
    requirementValue(assignment?.requiresKind, assignment?.requiresId),
  );
  const editing = Boolean(assignment);
  // Con rúbrica, los puntos son la suma de sus criterios.
  const rubricPoints = Boolean(assignment?.rubric.length);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      title: form.get("title"),
      instructions: form.get("instructions"),
      ...(rubricPoints ? {} : { points: Number(form.get("points")) }),
      dueAt: toIso(form.get("dueAt")),
      availableFrom: toIso(form.get("availableFrom")),
      ...parseRequirement(requirement),
    };
    setError(null);
    setLoading(true);
    try {
      const saved = await api<AssignmentView>(
        editing ? `/assignments/${assignment!.id}` : `/courses/${courseId}/assignments`,
        { method: editing ? "PATCH" : "POST", body },
      );
      onDone();
      if (editing) router.refresh();
      else router.push(`/cursos/${courseId}/tareas/${saved.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar la tarea.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={`${CARD} space-y-4 p-5 sm:p-6`}>
      <h2 className="text-base font-semibold text-uach-ink">{editing ? "Editar tarea" : "Nueva tarea"}</h2>
      {error && <FormAlert message={error} />}

      <div>
        <label htmlFor="as-title" className="mb-1.5 block text-sm font-medium text-uach-ink">Título</label>
        <input id="as-title" name="title" required minLength={3} maxLength={150} defaultValue={assignment?.title} className={INPUT} autoFocus />
      </div>
      <div>
        <label htmlFor="as-instructions" className="mb-1.5 block text-sm font-medium text-uach-ink">
          Instrucciones <span className="font-normal text-uach-ink/60">(opcional)</span>
        </label>
        <textarea id="as-instructions" name="instructions" rows={5} maxLength={5000} defaultValue={assignment?.instructions} className={`${INPUT} resize-y`} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="as-due" className="mb-1.5 block text-sm font-medium text-uach-ink">
            Fecha de entrega <span className="font-normal text-uach-ink/60">(opcional)</span>
          </label>
          <input id="as-due" name="dueAt" type="datetime-local" defaultValue={toLocalInput(assignment?.dueAt ?? null)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="as-points" className="mb-1.5 block text-sm font-medium text-uach-ink">Puntos</label>
          <input
            id="as-points"
            name="points"
            type="number"
            min={1}
            max={100}
            step={1}
            defaultValue={assignment?.points ?? 10}
            disabled={rubricPoints}
            aria-describedby={rubricPoints ? "as-points-hint" : undefined}
            className={INPUT}
          />
          {rubricPoints && (
            <p id="as-points-hint" className="mt-1 text-xs text-uach-ink/75">Suma de la rúbrica.</p>
          )}
        </div>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-uach-ink/10 p-4">
        <legend className="px-1 text-sm font-semibold text-uach-ink">Condiciones de acceso</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="as-available" className="mb-1.5 block text-sm font-medium text-uach-ink">
              Visible desde <span className="font-normal text-uach-ink/60">(opcional)</span>
            </label>
            <input
              id="as-available"
              name="availableFrom"
              type="datetime-local"
              defaultValue={toLocalInput(assignment?.availableFrom ?? null)}
              className={INPUT}
            />
            <p className="mt-1 text-xs text-uach-ink/75">Vacío: desde ahora. Con fecha futura no se envía aviso al crearla.</p>
          </div>
          <RequirementSelect
            id="as-requires"
            courseId={courseId}
            self={{ kind: "assignment", id: assignment?.id }}
            value={requirement}
            onChange={setRequirement}
          />
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={loading} className={BTN_PRIMARY}>
          {loading ? "Guardando…" : editing ? "Guardar cambios" : "Asignar tarea"}
        </button>
      </div>
    </form>
  );
}
