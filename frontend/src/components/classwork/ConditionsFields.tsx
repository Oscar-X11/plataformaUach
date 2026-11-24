"use client";

import { useEffect, useState } from "react";
import { INPUT } from "@/components/ui/styles";
import { api } from "@/lib/api";
import type { AssignmentView, RequirementKind } from "@/lib/classwork";
import type { QuizListItem } from "@/lib/quizzes";

interface Option {
  value: string;
  label: string;
}

/** "assignment:<uuid>" ↔ { requiresKind, requiresId }. */
export function requirementValue(kind: RequirementKind | null | undefined, id: string | null | undefined) {
  return kind && id ? `${kind}:${id}` : "";
}

export function parseRequirement(value: string) {
  const [kind, id] = value.split(":");
  return kind && id ? { requiresKind: kind, requiresId: id } : { requiresKind: null, requiresId: null };
}

/**
 * Acceso condicional: «Requiere completar antes» otra tarea o cuestionario de
 * la clase. Excluye la actividad que se edita (el backend también rechaza ciclos).
 */
export function RequirementSelect({
  courseId,
  self,
  value,
  onChange,
  id = "requirement",
}: {
  courseId: string;
  self?: { kind: RequirementKind; id?: string };
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [options, setOptions] = useState<{ assignments: Option[]; quizzes: Option[] } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<AssignmentView[]>(`/courses/${courseId}/assignments`),
      api<QuizListItem[]>(`/courses/${courseId}/quizzes`),
    ])
      .then(([assignments, quizzes]) => {
        if (!alive) return;
        const skip = (kind: RequirementKind, itemId: string) => self?.kind === kind && self.id === itemId;
        setOptions({
          assignments: assignments
            .filter((item) => !skip("assignment", item.id))
            .map((item) => ({ value: `assignment:${item.id}`, label: item.title })),
          quizzes: quizzes
            .filter((item) => !skip("quiz", item.id))
            .map((item) => ({
              value: `quiz:${item.id}`,
              label: `${item.title}${item.kind === "SURVEY" ? " (encuesta)" : ""}${item.published ? "" : " (borrador)"}`,
            })),
        });
      })
      .catch(() => alive && setOptions({ assignments: [], quizzes: [] }));
    return () => {
      alive = false;
    };
  }, [courseId, self?.kind, self?.id]);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-uach-ink">
        Requiere completar antes <span className="font-normal text-uach-ink/60">(opcional)</span>
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={!options} className={INPUT}>
        <option value="">{options ? "Ninguna actividad" : "Cargando…"}</option>
        {options && options.assignments.length > 0 && (
          <optgroup label="Tareas (entregarla)">
            {options.assignments.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </optgroup>
        )}
        {options && options.quizzes.length > 0 && (
          <optgroup label="Cuestionarios (enviarlo)">
            {options.quizzes.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </optgroup>
        )}
        {/* Conserva el valor guardado mientras cargan las opciones. */}
        {!options && value && <option value={value}>Actividad guardada</option>}
      </select>
      <p className="mt-1 text-xs text-uach-ink/75">El alumno la ve bloqueada hasta cumplirlo.</p>
    </div>
  );
}
