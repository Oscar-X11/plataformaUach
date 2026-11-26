"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Copy,
  LoaderCircle,
  Lock,
  Plus,
  Square,
  SquareCheck,
  Trash2,
  X,
} from "lucide-react";
import { parseRequirement, requirementValue, RequirementSelect } from "@/components/classwork/ConditionsFields";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import {
  KIND_LABEL,
  QUESTION_TYPE_LABEL,
  RESULTS_LABEL,
  type QuestionType,
  type QuizKind,
  type QuizManagerView,
  type QuizOption,
  type QuizResultsVisibility,
} from "@/lib/quizzes";

/** Pregunta mientras se edita. `key` es local, solo para React. */
interface Draft {
  key: string;
  type: QuestionType;
  prompt: string;
  points: number;
  required: boolean;
  options: QuizOption[];
  correct: string[];
  accepted: string;
}

const newId = () => Math.random().toString(36).slice(2, 10);
const CHOICE: QuestionType[] = ["SINGLE", "MULTIPLE"];

function blankQuestion(type: QuestionType = "SINGLE"): Draft {
  return {
    key: newId(),
    type,
    prompt: "",
    points: 1,
    required: true,
    options: [
      { id: newId(), text: "" },
      { id: newId(), text: "" },
    ],
    correct: type === "TRUE_FALSE" ? ["true"] : [],
    accepted: "",
  };
}

function fromQuiz(quiz: QuizManagerView): Draft[] {
  return quiz.questions.map((q) => ({
    key: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    required: q.required,
    options: q.type === "TRUE_FALSE" ? [] : (q.options ?? []),
    correct: q.answerKey?.option ? [q.answerKey.option] : (q.answerKey?.options ?? []),
    accepted: (q.answerKey?.accepted ?? []).join("\n"),
  }));
}

/** Lo que espera la API (backend/src/quizzes/quiz-rules.ts). */
function toPayload(kind: QuizKind, drafts: Draft[]) {
  const graded = kind === "QUIZ";
  return drafts.map((d) => {
    const base = { type: d.type, prompt: d.prompt, required: d.required, ...(graded ? { points: d.points } : {}) };
    if (CHOICE.includes(d.type)) {
      const key = !graded ? null : d.type === "SINGLE" ? { option: d.correct[0] } : { options: d.correct };
      return { ...base, options: d.options, answerKey: key };
    }
    if (d.type === "TRUE_FALSE") return { ...base, answerKey: graded ? { option: d.correct[0] } : null };
    if (d.type === "SHORT" && graded) {
      const accepted = d.accepted.split("\n").map((line) => line.trim()).filter(Boolean);
      return { ...base, answerKey: { accepted } };
    }
    return base;
  });
}

/** ISO → valor de <input type="datetime-local"> en la hora local del navegador. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

/**
 * Editor estilo Google Forms: ajustes arriba y preguntas en tarjetas. Crea
 * (courseId + kind) o edita (quiz). Con respuestas, las preguntas quedan fijas.
 */
export function QuizEditor({ courseId, kind, quiz }: { courseId: string; kind: QuizKind; quiz?: QuizManagerView }) {
  const router = useRouter();
  const graded = kind === "QUIZ";
  // El administrador solo consulta: ve las preguntas, no las cambia.
  const readOnly = quiz?.myRole === "admin";
  const locked = readOnly || Boolean(quiz?.locked);
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [opensAt, setOpensAt] = useState(toLocalInput(quiz?.opensAt ?? null));
  const [closesAt, setClosesAt] = useState(toLocalInput(quiz?.closesAt ?? null));
  const [timeLimit, setTimeLimit] = useState(quiz?.timeLimitMinutes ? String(quiz.timeLimitMinutes) : "");
  const [visibility, setVisibility] = useState<QuizResultsVisibility>(quiz?.resultsVisibility ?? "ON_SUBMIT");
  const [requirement, setRequirement] = useState(requirementValue(quiz?.requiresKind, quiz?.requiresId));
  const [questions, setQuestions] = useState<Draft[]>(quiz ? fromQuiz(quiz) : [blankQuestion()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total = graded ? questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) : 0;

  const update = (key: string, patch: Partial<Draft>) =>
    setQuestions((list) => list.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  const move = (index: number, delta: number) =>
    setQuestions((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const body: Record<string, unknown> = {
      title,
      description,
      opensAt: fromLocalInput(opensAt),
      closesAt: fromLocalInput(closesAt),
      timeLimitMinutes: graded && timeLimit ? Number(timeLimit) : null,
      ...(graded ? { resultsVisibility: visibility } : {}),
      ...parseRequirement(requirement),
      ...(locked ? {} : { questions: toPayload(kind, questions) }),
    };
    try {
      if (quiz) {
        await api(`/quizzes/${quiz.id}`, { method: "PATCH", body });
        setSaved(true);
        router.refresh();
      } else {
        const created = await api<{ id: string }>(`/courses/${courseId}/quizzes`, {
          method: "POST",
          body: { ...body, kind },
        });
        router.push(`/cursos/${courseId}/cuestionarios/${created.id}`);
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {readOnly && (
        <FormAlert tone="info" message="Vista de consulta: solo el docente de la clase puede editar o publicar." />
      )}
      <fieldset disabled={readOnly} className="contents">
      <section className={`${CARD} space-y-4 p-5`}>
        <div>
          <label htmlFor="quiz-title" className="mb-1.5 block text-sm font-medium text-uach-ink">Título</label>
          <input
            id="quiz-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={150}
            placeholder={graded ? "Examen parcial 1" : "Encuesta de la unidad 2"}
            autoFocus={!quiz}
            className={`${INPUT} text-base font-medium`}
          />
        </div>
        <div>
          <label htmlFor="quiz-desc" className="mb-1.5 block text-sm font-medium text-uach-ink">Instrucciones (opcional)</label>
          <textarea
            id="quiz-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={5000}
            className={`${INPUT} resize-y`}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="quiz-opens" className="mb-1.5 block text-sm font-medium text-uach-ink">Abre</label>
            <input id="quiz-opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={INPUT} />
            <p className="mt-1 text-xs text-uach-ink/75">Vacío: al publicar.</p>
          </div>
          <div>
            <label htmlFor="quiz-closes" className="mb-1.5 block text-sm font-medium text-uach-ink">Cierra</label>
            <input id="quiz-closes" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={INPUT} />
            <p className="mt-1 text-xs text-uach-ink/75">Vacío: sin cierre.</p>
          </div>
          {graded && (
            <>
              <div>
                <label htmlFor="quiz-limit" className="mb-1.5 block text-sm font-medium text-uach-ink">Tiempo límite</label>
                <div className="flex items-center gap-2">
                  <input
                    id="quiz-limit"
                    type="number"
                    min={1}
                    max={300}
                    inputMode="numeric"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    placeholder="Sin límite"
                    className={INPUT}
                  />
                  <span className="text-sm text-uach-ink/75">min</span>
                </div>
              </div>
              <div>
                <label htmlFor="quiz-results" className="mb-1.5 block text-sm font-medium text-uach-ink">El alumno ve su resultado</label>
                <select
                  id="quiz-results"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as QuizResultsVisibility)}
                  className={INPUT}
                >
                  {(Object.keys(RESULTS_LABEL) as QuizResultsVisibility[]).map((value) => (
                    <option key={value} value={value}>{RESULTS_LABEL[value]}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="max-w-md">
          <RequirementSelect
            id="quiz-requires"
            courseId={courseId}
            self={{ kind: "quiz", id: quiz?.id }}
            value={requirement}
            onChange={setRequirement}
          />
        </div>
      </section>
      </fieldset>

      {locked && !readOnly && (
        <FormAlert
          tone="info"
          message="Ya hay alumnos que empezaron a responder: las preguntas quedan fijas. Puedes cambiar el título, las instrucciones y las fechas."
        />
      )}

      <ol className="space-y-3">
        {questions.map((q, index) => (
          <li key={q.key}>
            <QuestionCard
              draft={q}
              index={index}
              count={questions.length}
              graded={graded}
              locked={locked}
              onChange={(patch) => update(q.key, patch)}
              onMove={(delta) => move(index, delta)}
              onDuplicate={() =>
                setQuestions((list) => {
                  const next = [...list];
                  next.splice(index + 1, 0, {
                    ...q,
                    key: newId(),
                    options: q.options.map((option) => ({ ...option })),
                    correct: [...q.correct],
                  });
                  return next;
                })
              }
              onRemove={() => setQuestions((list) => list.filter((item) => item.key !== q.key))}
            />
          </li>
        ))}
      </ol>

      {!locked && (
        <button type="button" onClick={() => setQuestions((list) => [...list, blankQuestion()])} className={BTN_SECONDARY}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Agregar pregunta
        </button>
      )}

      {error && <FormAlert message={error} />}
      {saved && <FormAlert tone="info" message="Cambios guardados." />}

      <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-2xl bg-uach-surface p-3 shadow-sm ring-1 ring-uach-ink/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-uach-ink/75 tabular-nums">
          {questions.length} {questions.length === 1 ? "pregunta" : "preguntas"}
          {graded && ` · ${total} ${total === 1 ? "punto" : "puntos"}`}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={() => router.back()} className={BTN_GHOST}>
            {quiz ? "Volver" : "Cancelar"}
          </button>
          {!readOnly && (
            <button type="button" onClick={save} disabled={busy} className={BTN_PRIMARY}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              {quiz ? "Guardar cambios" : `Crear ${KIND_LABEL[kind].one}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  draft: q,
  index,
  count,
  graded,
  locked,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  draft: Draft;
  index: number;
  count: number;
  graded: boolean;
  locked: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const id = `q-${q.key}`;
  const choice = CHOICE.includes(q.type);

  function changeType(type: QuestionType) {
    const keepOptions = CHOICE.includes(type) && q.options.length >= 2;
    onChange({
      type,
      options: keepOptions ? q.options : [{ id: newId(), text: "" }, { id: newId(), text: "" }],
      correct: type === "TRUE_FALSE" ? ["true"] : type === "SINGLE" ? q.correct.slice(0, 1) : type === "MULTIPLE" ? q.correct : [],
    });
  }

  function toggleCorrect(optionId: string) {
    if (q.type === "MULTIPLE") {
      onChange({ correct: q.correct.includes(optionId) ? q.correct.filter((c) => c !== optionId) : [...q.correct, optionId] });
    } else {
      onChange({ correct: [optionId] });
    }
  }

  return (
    <fieldset disabled={locked} className={`${CARD} space-y-3 p-5`}>
      <legend className="sr-only">Pregunta {index + 1}</legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-uach-subtle text-sm font-semibold tabular-nums text-uach-tealDark sm:grid">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-prompt`} className="sr-only">Pregunta {index + 1}</label>
          <textarea
            id={`${id}-prompt`}
            value={q.prompt}
            onChange={(event) => onChange({ prompt: event.target.value })}
            rows={2}
            maxLength={2000}
            placeholder={`Pregunta ${index + 1}`}
            className={`${INPUT} resize-y`}
          />
        </div>
        <div className="sm:w-52">
          <label htmlFor={`${id}-type`} className="sr-only">Tipo de pregunta</label>
          <select id={`${id}-type`} value={q.type} onChange={(event) => changeType(event.target.value as QuestionType)} className={INPUT}>
            {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((type) => (
              <option key={type} value={type}>{QUESTION_TYPE_LABEL[type]}</option>
            ))}
          </select>
        </div>
      </div>

      {choice && (
        <div className="space-y-2 sm:pl-12">
          {graded && (
            <p className="text-xs text-uach-ink/75">
              {q.type === "SINGLE" ? "Marca la respuesta correcta." : "Marca todas las respuestas correctas (se califica todo o nada)."}
            </p>
          )}
          {q.options.map((option, optionIndex) => {
            const isCorrect = q.correct.includes(option.id);
            const Mark = q.type === "MULTIPLE" ? (isCorrect ? SquareCheck : Square) : isCorrect ? CheckCircle2 : Circle;
            return (
              <div key={option.id} className="flex items-center gap-2">
                {graded ? (
                  <button
                    type="button"
                    onClick={() => toggleCorrect(option.id)}
                    aria-pressed={isCorrect}
                    aria-label={`Marcar opción ${optionIndex + 1} como correcta`}
                    className={`press-soft grid h-11 w-11 shrink-0 place-items-center rounded-lg ${isCorrect ? "text-uach-emerald" : "text-uach-ink/40 hover:text-uach-ink/75"}`}
                  >
                    <Mark className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </button>
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center text-uach-ink/40" aria-hidden>
                    {q.type === "MULTIPLE" ? <Square className="h-5 w-5" strokeWidth={1.75} /> : <Circle className="h-5 w-5" strokeWidth={1.75} />}
                  </span>
                )}
                <label htmlFor={`${id}-opt-${option.id}`} className="sr-only">Opción {optionIndex + 1}</label>
                <input
                  id={`${id}-opt-${option.id}`}
                  value={option.text}
                  onChange={(event) =>
                    onChange({ options: q.options.map((o) => (o.id === option.id ? { ...o, text: event.target.value } : o)) })
                  }
                  maxLength={300}
                  placeholder={`Opción ${optionIndex + 1}`}
                  className={INPUT}
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        options: q.options.filter((o) => o.id !== option.id),
                        correct: q.correct.filter((c) => c !== option.id),
                      })
                    }
                    aria-label={`Quitar opción ${optionIndex + 1}`}
                    className={`${BTN_GHOST} h-11 w-11 shrink-0 px-0`}
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                )}
              </div>
            );
          })}
          {q.options.length < 20 && (
            <button
              type="button"
              onClick={() => onChange({ options: [...q.options, { id: newId(), text: "" }] })}
              className="press-soft ml-11 h-11 rounded-lg px-3 text-sm font-medium text-uach-teal hover:bg-uach-canvas hover:text-uach-tealDark"
            >
              Agregar opción
            </button>
          )}
        </div>
      )}

      {q.type === "TRUE_FALSE" && (
        <div className="flex flex-wrap gap-2 sm:pl-12">
          {[
            { id: "true", text: "Verdadero" },
            { id: "false", text: "Falso" },
          ].map((option) => {
            const isCorrect = q.correct[0] === option.id;
            return graded ? (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ correct: [option.id] })}
                aria-pressed={isCorrect}
                className={`press-soft inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium ring-1 ${
                  isCorrect ? "bg-uach-emerald/10 text-uach-emerald ring-uach-emerald/30" : "text-uach-ink/75 ring-uach-ink/15 hover:bg-uach-canvas"
                }`}
              >
                {isCorrect && <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                {option.text}
              </button>
            ) : (
              <span key={option.id} className="inline-flex h-11 items-center rounded-xl px-4 text-sm text-uach-ink/75 ring-1 ring-uach-ink/15">
                {option.text}
              </span>
            );
          })}
        </div>
      )}

      {q.type === "SHORT" && graded && (
        <div className="sm:pl-12">
          <label htmlFor={`${id}-accepted`} className="mb-1.5 block text-sm font-medium text-uach-ink">
            Respuestas aceptadas (una por línea)
          </label>
          <textarea
            id={`${id}-accepted`}
            value={q.accepted}
            onChange={(event) => onChange({ accepted: event.target.value })}
            rows={2}
            placeholder={"Cervantes\nMiguel de Cervantes"}
            className={`${INPUT} resize-y`}
          />
          <p className="mt-1 text-xs text-uach-ink/75">
            No importan mayúsculas ni acentos. Si la dejas vacía, tú la calificas al revisar.
          </p>
        </div>
      )}

      {q.type === "PARAGRAPH" && (
        <p className="text-sm text-uach-ink/75 sm:pl-12">
          {graded ? "Respuesta libre: la calificas tú al revisar las respuestas." : "Respuesta libre."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-uach-ink/[0.06] pt-3 sm:pl-12">
        {graded && (
          <label className="flex items-center gap-2 text-sm text-uach-ink">
            <input
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              value={q.points}
              onChange={(event) => onChange({ points: Number(event.target.value) })}
              className={`${INPUT} w-20`}
              aria-label={`Puntos de la pregunta ${index + 1}`}
            />
            puntos
          </label>
        )}
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-uach-ink">
          <input
            type="checkbox"
            checked={q.required}
            onChange={(event) => onChange({ required: event.target.checked })}
            className="h-4 w-4 accent-uach-teal"
          />
          Obligatoria
        </label>
        <div className="ml-auto flex items-center gap-1">
          {locked ? (
            <Lock className="h-4 w-4 text-uach-ink/40" aria-label="Pregunta fija" />
          ) : (
            <>
              <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Subir pregunta" className={`${BTN_GHOST} h-11 w-11 px-0`}>
                <ArrowUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Bajar pregunta" className={`${BTN_GHOST} h-11 w-11 px-0`}>
                <ArrowDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" onClick={onDuplicate} aria-label="Duplicar pregunta" className={`${BTN_GHOST} h-11 w-11 px-0`}>
                <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" onClick={onRemove} disabled={count === 1} aria-label="Borrar pregunta" className={`${BTN_DANGER} h-11 w-11 px-0`}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>
    </fieldset>
  );
}
