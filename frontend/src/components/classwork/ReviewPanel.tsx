"use client";

import { useRef, useState } from "react";
import { ChevronDown, Copy, FileText, LoaderCircle } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { CARD } from "@/components/dashboard/tone";
import { Avatar } from "@/components/ui/Avatar";
import { FormAlert } from "@/components/ui/form";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { FILE_DELETED_TEXT, fileHref, formatBytes, type RubricCriterion, type StudentSubmissionRow, type SubmissionView } from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";

type Filter = "all" | "toReview" | "missing" | "returned";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "toReview", label: "Por calificar" },
  { id: "missing", label: "Sin entregar" },
  { id: "returned", label: "Devueltas" },
];

const matches = (filter: Filter, row: StudentSubmissionRow) => {
  const state = row.submission.state;
  if (filter === "toReview") return state === "submitted" || state === "late";
  if (filter === "missing") return state === "pending" || state === "missing";
  if (filter === "returned") return state === "returned";
  return true;
};

/** Calificar con rúbrica: un nivel por criterio; el total se calcula solo. */
function RubricPicker({
  rubric,
  studentId,
  selection,
  onChange,
}: {
  rubric: RubricCriterion[];
  studentId: string;
  selection: Record<string, string>;
  onChange: (selection: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3">
      {rubric.map((criterion) => (
        <fieldset key={criterion.id}>
          <legend className="mb-1.5 text-xs font-semibold text-uach-ink">{criterion.title}</legend>
          <div className="flex flex-wrap gap-1.5">
            {criterion.levels.map((level) => {
              const id = `r-${studentId}-${criterion.id}-${level.id}`;
              const checked = selection[criterion.id] === level.id;
              return (
                <label
                  key={level.id}
                  htmlFor={id}
                  title={level.description}
                  className={`press-soft inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${
                    checked
                      ? "border-uach-teal bg-uach-teal/10 font-medium text-uach-tealDark"
                      : "border-uach-ink/15 text-uach-ink/80 hover:bg-uach-canvas"
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`rubric-${criterion.id}`}
                    checked={checked}
                    onChange={() => onChange({ ...selection, [criterion.id]: level.id })}
                    className="sr-only"
                  />
                  {level.label}
                  <span className="tabular-nums text-uach-ink/60">{level.points}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function GradeForm({
  assignmentId,
  points,
  rubric,
  row,
  onSaved,
  readOnly,
}: {
  assignmentId: string;
  points: number;
  rubric: RubricCriterion[];
  row: StudentSubmissionRow;
  onSaved: (submission: SubmissionView) => void;
  readOnly: boolean;
}) {
  const [busy, setBusy] = useState<"save" | "return" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>(row.submission.rubricSelection ?? {});
  const formRef = useRef<HTMLFormElement>(null);
  const withRubric = rubric.length > 0;
  const complete = withRubric && rubric.every((criterion) => selection[criterion.id]);
  const rubricTotal = rubric.reduce(
    (sum, criterion) => sum + (criterion.levels.find((level) => level.id === selection[criterion.id])?.points ?? 0),
    0,
  );

  async function save(giveBack: boolean) {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const raw = String(form.get("grade") ?? "").replace(",", ".").trim();
    setBusy(giveBack ? "return" : "save");
    setError(null);
    try {
      const saved = await api<SubmissionView>(`/assignments/${assignmentId}/submissions/${row.student.id}`, {
        method: "PATCH",
        body: {
          // Con rúbrica completa, el backend calcula la calificación con los niveles.
          ...(complete ? { rubric: selection } : { grade: raw === "" ? null : Number(raw) }),
          feedback: String(form.get("feedback") ?? ""),
          return: giveBack,
        },
      });
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  }

  const { submission } = row;
  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void save(true);
      }}
      className="space-y-3 border-t border-uach-ink/[0.06] px-3 pb-4 pt-3">
      {submission.files.length > 0 ? (
        <ul className="space-y-1.5">
          {submission.files.map((file) => (
            <li key={file.id}>
              {file.fileDeletedAt ? (
                <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-uach-ink/60">
                  <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
                  <span className="text-xs">{FILE_DELETED_TEXT}</span>
                </p>
              ) : (
                <a
                  href={fileHref(file.fileUrl)}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-uach-ink hover:bg-uach-canvas"
                >
                  <FileText className="h-4 w-4 shrink-0 text-uach-teal" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
                  <span className="text-xs tabular-nums text-uach-ink/75">{formatBytes(file.size)}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-uach-ink/75">Sin archivos adjuntos.</p>
      )}
      {submission.submittedAt && (
        <p className="text-xs text-uach-ink/75">Entregada el {formatDateTime(submission.submittedAt)}</p>
      )}
      {row.duplicateWith.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Entregó un archivo idéntico al de {row.duplicateWith.join(", ")}.
        </p>
      )}
      {error && <FormAlert message={error} />}
      <fieldset disabled={readOnly} className="contents">
      {withRubric && (
        <RubricPicker rubric={rubric} studentId={row.student.id} selection={selection} onChange={setSelection} />
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div>
          <label className="mb-1 block text-xs font-medium text-uach-ink" htmlFor={`g-${row.student.id}`}>
            Calificación /{points}
          </label>
          {complete ? (
            <output
              id={`g-${row.student.id}`}
              className="flex h-[42px] items-center rounded-lg bg-uach-canvas px-3 text-sm font-semibold tabular-nums text-uach-ink"
            >
              {rubricTotal}
            </output>
          ) : (
            <input
              id={`g-${row.student.id}`}
              name="grade"
              inputMode="decimal"
              defaultValue={submission.grade ?? ""}
              className={`${INPUT} tabular-nums`}
            />
          )}
          {withRubric && !complete && (
            <p className="mt-1 text-xs text-uach-ink/75">Elige un nivel en cada criterio o escribe la calificación.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-uach-ink" htmlFor={`f-${row.student.id}`}>
            Comentario para el alumno
          </label>
          <textarea
            id={`f-${row.student.id}`}
            name="feedback"
            rows={2}
            maxLength={3000}
            defaultValue={submission.feedback ?? ""}
            className={`${INPUT} resize-y`}
          />
        </div>
      </div>
      </fieldset>
      {readOnly ? (
        <p className="text-xs text-uach-ink/75">Vista de consulta: solo el docente de la clase califica y devuelve.</p>
      ) : (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void save(false)}
          className={BTN_SECONDARY}
        >
          {busy === "save" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Guardar borrador
        </button>
        <button type="submit" disabled={busy !== null} className={BTN_PRIMARY}>
          {busy === "return" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {submission.status === "RETURNED" ? "Actualizar y devolver" : "Devolver al alumno"}
        </button>
      </div>
      )}
    </form>
  );
}

/** Docente: lista de alumnos con su entrega y formulario para calificar. */
export function ReviewPanel({
  assignmentId,
  points,
  rubric = [],
  initial,
  readOnly = false,
}: {
  assignmentId: string;
  points: number;
  rubric?: RubricCriterion[];
  initial: StudentSubmissionRow[];
  /** Administrador: ve entregas y calificaciones, no califica. */
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = rows.filter((row) => matches(filter, row));

  const update = (studentId: string, submission: SubmissionView) =>
    setRows((list) => list.map((row) => (row.student.id === studentId ? { ...row, submission } : row)));

  return (
    <section aria-labelledby="entregas-alumnos" className={`${CARD} p-2 sm:p-3`}>
      <div className="flex flex-col gap-3 px-2 pb-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="entregas-alumnos" className="text-base font-semibold text-uach-ink">
          Entregas de los alumnos
        </h2>
        <div role="tablist" aria-label="Filtrar entregas" className="flex flex-wrap gap-1">
          {FILTERS.map((item) => {
            const count = rows.filter((row) => matches(item.id, row)).length;
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`press-soft h-9 rounded-lg px-3 text-xs font-medium transition-colors ${
                  active ? "bg-uach-teal/10 text-uach-tealDark" : "text-uach-ink/75 hover:bg-uach-canvas"
                }`}
              >
                {item.label} <span className="tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">
          {readOnly ? "Aún no hay alumnos inscritos." : "Aún no hay alumnos inscritos. Comparte el código del curso."}
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">
          Nadie en esta categoría.
        </p>
      ) : (
        <ul className="divide-y divide-uach-ink/[0.06]">
          {visible.map((row) => {
            const open = openId === row.student.id;
            return (
              <li key={row.student.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : row.student.id)}
                  className="press-soft flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-uach-canvas"
                >
                  <Avatar name={row.student.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-uach-ink">{row.student.fullName}</span>
                    <span className="block truncate text-xs tabular-nums text-uach-ink/75">
                      {row.student.username} · {row.submission.files.length} archivo(s)
                      {row.duplicateWith.length > 0 && <span className="text-amber-800"> · archivo repetido</span>}
                    </span>
                  </span>
                  {row.submission.grade !== null && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-uach-ink">
                      {row.submission.grade}/{points}
                    </span>
                  )}
                  <StateChip state={row.submission.state} />
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-uach-ink/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {open && (
                  <GradeForm
                    assignmentId={assignmentId}
                    points={points}
                    rubric={rubric}
                    row={row}
                    onSaved={(submission) => update(row.student.id, submission)}
                    readOnly={readOnly}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
