"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, SlidersHorizontal } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";

/** Pesos de tareas y cuestionarios en la calificación final (suman 100 %). */
export function WeightsEditor({
  courseId,
  weights,
  passing,
  readOnly = false,
}: {
  courseId: string;
  weights: { assignments: number; quizzes: number };
  passing: number;
  /** Administrador: ve los pesos pero no los cambia. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState(String(weights.assignments));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasks = Math.max(0, Math.min(100, Math.round(Number(assignments) || 0)));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (tasks === weights.assignments) {
      setOpen(false);
      return;
    }
    const confirmed = window.confirm(
      `La calificación final de todos los alumnos se recalculará con tareas ${tasks} % y cuestionarios ${100 - tasks} %. ¿Guardar?`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/courses/${courseId}/weights`, {
        method: "PATCH",
        body: { weightAssignments: tasks, weightQuizzes: 100 - tasks },
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudieron guardar los pesos.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-uach-ink/75">
        <span>
          Final = tareas <span className="font-semibold tabular-nums text-uach-ink">{weights.assignments} %</span> +
          cuestionarios <span className="font-semibold tabular-nums text-uach-ink">{weights.quizzes} %</span> · aprueba
          con <span className="font-semibold tabular-nums text-uach-ink">{passing}</span>
        </span>
        {!readOnly && (
          <button type="button" onClick={() => setOpen(true)} className={`${BTN_GHOST} h-9 px-2 text-xs`}>
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Cambiar pesos
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-xl bg-uach-canvas p-3 sm:flex-row sm:items-end">
      {error && <FormAlert message={error} />}
      <div className="w-full sm:w-36">
        <label htmlFor="w-tasks" className="mb-1 block text-xs font-medium text-uach-ink">Tareas (%)</label>
        <input
          id="w-tasks"
          type="number"
          min={0}
          max={100}
          step={5}
          inputMode="numeric"
          value={assignments}
          onChange={(event) => setAssignments(event.target.value)}
          className={`${INPUT} tabular-nums`}
        />
      </div>
      <p className="text-sm text-uach-ink/75 sm:pb-2.5">
        Cuestionarios: <span className="font-semibold tabular-nums text-uach-ink">{100 - tasks} %</span>
      </p>
      <div className="flex gap-2 sm:ml-auto">
        <button type="button" onClick={() => setOpen(false)} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Guardar
        </button>
      </div>
    </form>
  );
}
