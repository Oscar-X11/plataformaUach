"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { AssignmentView, RubricCriterion } from "@/lib/classwork";

interface LevelDraft {
  key: string;
  id?: string;
  label: string;
  points: string;
  description: string;
}

interface CriterionDraft {
  key: string;
  title: string;
  description: string;
  levels: LevelDraft[];
}

/**
 * Revisión en vivo de un criterio, con las mismas reglas que el backend, para que
 * el docente vea el problema mientras arma la rúbrica y no al guardar.
 */
function criterionIssues(criterion: CriterionDraft, others: CriterionDraft[]): string[] {
  const issues: string[] = [];
  const title = criterion.title.trim().toLowerCase();
  if (!title) issues.push("Escribe el nombre del criterio.");
  else if (others.some((other) => other.title.trim().toLowerCase() === title)) issues.push("Ya hay otro criterio con este nombre.");
  const labels = criterion.levels.map((level) => level.label.trim().toLowerCase());
  if (labels.some((label) => !label)) issues.push("Hay niveles sin nombre.");
  else if (new Set(labels).size !== labels.length) issues.push("Dos niveles tienen el mismo nombre.");
  const points = criterion.levels.map((level) => Number(level.points));
  if (points.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
    issues.push("Los puntos de cada nivel deben ser un entero de 0 a 100.");
  } else {
    if (new Set(points).size !== points.length) issues.push("Dos niveles valen lo mismo: cada nivel debe valer distinto.");
    if (Math.max(...points) === 0) issues.push("El mejor nivel debe valer más de 0 puntos.");
  }
  return issues;
}

let seq = 0;
const nextKey = () => `k${++seq}`;

const DEFAULT_LEVELS: [string, number][] = [
  ["Excelente", 4],
  ["Bien", 3],
  ["Suficiente", 2],
  ["Insuficiente", 0],
];

function blankCriterion(): CriterionDraft {
  return {
    key: nextKey(),
    title: "",
    description: "",
    levels: DEFAULT_LEVELS.map(([label, points]) => ({ key: nextKey(), label, points: String(points), description: "" })),
  };
}

function fromRubric(rubric: RubricCriterion[]): CriterionDraft[] {
  return rubric.map((criterion) => ({
    key: nextKey(),
    title: criterion.title,
    description: criterion.description ?? "",
    levels: criterion.levels.map((level) => ({
      key: nextKey(),
      id: level.id,
      label: level.label,
      points: String(level.points),
      description: level.description ?? "",
    })),
  }));
}

const maxOf = (levels: { points: number | string }[]) => Math.max(0, ...levels.map((level) => Number(level.points) || 0));

/** Rúbrica de solo lectura. `selection` resalta el nivel elegido por el docente. */
export function RubricTable({ rubric, selection }: { rubric: RubricCriterion[]; selection?: Record<string, string> | null }) {
  const total = rubric.reduce((sum, criterion) => sum + maxOf(criterion.levels), 0);
  const earned = selection
    ? rubric.reduce(
        (sum, criterion) => sum + (criterion.levels.find((level) => level.id === selection[criterion.id])?.points ?? 0),
        0,
      )
    : null;
  return (
    <div className="space-y-3">
      {rubric.map((criterion) => (
        <div key={criterion.id} className="rounded-xl border border-uach-ink/10 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-uach-ink">{criterion.title}</p>
            <span className="shrink-0 text-xs tabular-nums text-uach-ink/75">{maxOf(criterion.levels)} pts</span>
          </div>
          {criterion.description && <p className="mt-0.5 text-xs text-uach-ink/75">{criterion.description}</p>}
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {criterion.levels.map((level) => {
              const chosen = selection?.[criterion.id] === level.id;
              return (
                <li
                  key={level.id}
                  className={`rounded-lg px-2.5 py-2 text-xs ${
                    chosen ? "bg-uach-teal/10 text-uach-tealDark ring-1 ring-uach-teal/40" : "bg-uach-canvas text-uach-ink/80"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2 font-medium">
                    {level.label}
                    <span className="tabular-nums">{level.points}</span>
                  </span>
                  {level.description && <span className="mt-0.5 block">{level.description}</span>}
                  {chosen && <span className="sr-only"> (nivel asignado)</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-right text-sm text-uach-ink/75">
        {earned !== null ? (
          <>
            Obtenido: <span className="font-semibold tabular-nums text-uach-ink">{earned}</span>/{total}
          </>
        ) : (
          <>
            Total: <span className="font-semibold tabular-nums text-uach-ink">{total}</span> puntos
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Editor de rúbrica del docente: criterios con niveles y puntos. Los puntos
 * de la tarea pasan a ser la suma del mejor nivel de cada criterio.
 */
export function RubricEditor({ assignment, onDone }: { assignment: AssignmentView; onDone: () => void }) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<CriterionDraft[]>(
    assignment.rubric.length ? fromRubric(assignment.rubric) : [blankCriterion()],
  );
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = criteria.reduce((sum, criterion) => sum + maxOf(criterion.levels), 0);
  const issues = criteria.map((criterion) => criterionIssues(criterion, criteria.filter((other) => other.key !== criterion.key)));
  const totalIssue = criteria.length && (total < 1 || total > 100) ? "La suma de los mejores niveles debe estar entre 1 y 100 puntos." : null;
  const valid = criteria.length > 0 && !totalIssue && issues.every((list) => list.length === 0);
  const pointsChange = criteria.length > 0 && total !== assignment.points;

  const patch = (key: string, change: Partial<CriterionDraft>) =>
    setCriteria((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));
  const patchLevel = (criterion: CriterionDraft, levelKey: string, change: Partial<LevelDraft>) =>
    patch(criterion.key, {
      levels: criterion.levels.map((level) => (level.key === levelKey ? { ...level, ...change } : level)),
    });
  const move = (index: number, delta: number) =>
    setCriteria((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  async function send(list: CriterionDraft[], mode: "save" | "remove") {
    setBusy(mode);
    setError(null);
    try {
      await api(`/assignments/${assignment.id}/rubric`, {
        method: "PUT",
        body: {
          criteria: list.map((criterion) => ({
            title: criterion.title,
            description: criterion.description,
            levels: criterion.levels.map((level, index) => ({
              id: level.id ?? `n${index + 1}`,
              label: level.label,
              points: Number(level.points),
              description: level.description,
            })),
          })),
        },
      });
      onDone();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar la rúbrica.");
      setBusy(null);
    }
  }

  function removeRubric() {
    if (!window.confirm(`¿Quitar la rúbrica? La tarea conservará ${assignment.points} puntos y calificarás escribiendo la nota.`)) return;
    void send([], "remove");
  }

  function save() {
    if (!valid) return;
    if (pointsChange && !window.confirm(`Con esta rúbrica la tarea pasará de ${assignment.points} a ${total} puntos. ¿Guardar?`)) return;
    void send(criteria, "save");
  }

  return (
    <div className="space-y-4">
      <FormAlert
        tone="info"
        message="Revisa la rúbrica antes de calificar: en cuanto califiques a un alumno con ella ya no se podrá cambiar. Los puntos de la tarea serán la suma del mejor nivel de cada criterio."
      />
      {error && <FormAlert message={error} />}
      {criteria.map((criterion, index) => (
        <fieldset key={criterion.key} className="space-y-3 rounded-xl border border-uach-ink/10 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-uach-ink/60">
            Criterio {index + 1}
          </legend>
          <div className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                aria-label={`Nombre del criterio ${index + 1}`}
                value={criterion.title}
                onChange={(event) => patch(criterion.key, { title: event.target.value })}
                maxLength={150}
                placeholder="Contenido, Ortografía, Presentación…"
                className={`${INPUT} font-medium`}
              />
              <input
                aria-label={`Descripción del criterio ${index + 1}`}
                value={criterion.description}
                onChange={(event) => patch(criterion.key, { description: event.target.value })}
                maxLength={500}
                placeholder="Qué se evalúa (opcional)"
                className={INPUT}
              />
            </div>
            <div className="flex shrink-0">
              <button type="button" aria-label="Subir criterio" disabled={index === 0} onClick={() => move(index, -1)} className={`${BTN_GHOST} px-2`}>
                <ArrowUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Bajar criterio"
                disabled={index === criteria.length - 1}
                onClick={() => move(index, 1)}
                className={`${BTN_GHOST} px-2`}
              >
                <ArrowDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Quitar criterio ${index + 1}`}
                onClick={() => setCriteria((list) => list.filter((item) => item.key !== criterion.key))}
                className={`${BTN_DANGER} px-2`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {criterion.levels.map((level, levelIndex) => (
              <li key={level.key} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_5rem_auto]">
                <input
                  aria-label={`Nivel ${levelIndex + 1}`}
                  value={level.label}
                  onChange={(event) => patchLevel(criterion, level.key, { label: event.target.value })}
                  maxLength={60}
                  placeholder="Nivel"
                  className={INPUT}
                />
                <input
                  aria-label={`Descripción del nivel ${levelIndex + 1}`}
                  value={level.description}
                  onChange={(event) => patchLevel(criterion, level.key, { description: event.target.value })}
                  maxLength={300}
                  placeholder="Descripción (opcional)"
                  className={`${INPUT} hidden sm:block`}
                />
                <input
                  aria-label={`Puntos del nivel ${levelIndex + 1}`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={level.points}
                  onChange={(event) => patchLevel(criterion, level.key, { points: event.target.value })}
                  className={`${INPUT} tabular-nums`}
                />
                <button
                  type="button"
                  aria-label={`Quitar nivel ${levelIndex + 1}`}
                  disabled={criterion.levels.length <= 2}
                  onClick={() => patch(criterion.key, { levels: criterion.levels.filter((item) => item.key !== level.key) })}
                  className={`${BTN_GHOST} px-2`}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {criterion.levels.length < 6 && (
            <button
              type="button"
              onClick={() =>
                patch(criterion.key, {
                  levels: [...criterion.levels, { key: nextKey(), label: "", points: "0", description: "" }],
                })
              }
              className={BTN_GHOST}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Nivel
            </button>
          )}
          {issues[index].length > 0 && (
            <ul className="space-y-0.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" aria-live="polite">
              {issues[index].map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </fieldset>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {criteria.length < 20 && (
            <button type="button" onClick={() => setCriteria((list) => [...list, blankCriterion()])} className={BTN_SECONDARY}>
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Agregar criterio
            </button>
          )}
          <span className={`text-sm ${totalIssue ? "text-red-700" : "text-uach-ink/75"}`}>
            La tarea valdrá <span className="font-semibold tabular-nums text-uach-ink">{total}</span> puntos
            {pointsChange && !totalIssue && <span> (ahora vale {assignment.points})</span>}
            {totalIssue && <span className="block text-xs">{totalIssue}</span>}
          </span>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {assignment.rubric.length > 0 && (
            <button type="button" disabled={busy !== null} onClick={removeRubric} className={BTN_DANGER}>
              {busy === "remove" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              Quitar rúbrica
            </button>
          )}
          <button type="button" onClick={onDone} className={BTN_GHOST}>Cancelar</button>
          <button type="button" disabled={busy !== null || !valid} onClick={save} className={BTN_PRIMARY}>
            {busy === "save" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Guardar rúbrica
          </button>
        </div>
      </div>
    </div>
  );
}
