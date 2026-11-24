"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Check, CheckCircle2, Clock, LoaderCircle, Send, XCircle } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/dashboard/format";
import {
  formatPoints,
  optionIsChosen,
  optionIsCorrect,
  QUESTION_TYPE_LABEL,
  type AnswerValue,
  type QuizQuestion,
  type QuizStudentView,
} from "@/lib/quizzes";

type Answers = Record<string, AnswerValue>;

const TRUE_FALSE = [
  { id: "true", text: "Verdadero" },
  { id: "false", text: "Falso" },
];
const optionsOf = (q: QuizQuestion) => (q.type === "TRUE_FALSE" ? TRUE_FALSE : (q.options ?? []));
const toPayload = (answers: Answers) =>
  Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));

/** El alumno responde (o ve su resultado). Un solo intento. */
export function QuizTaker({ quiz }: { quiz: QuizStudentView }) {
  const status = quiz.attempt?.status ?? "not_started";
  if (status === "in_progress") return <InProgress quiz={quiz} />;
  if (status === "submitted") return <Submitted quiz={quiz} />;
  return <NotStarted quiz={quiz} />;
}

function Facts({ quiz }: { quiz: QuizStudentView }) {
  const survey = quiz.kind === "SURVEY";
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-uach-ink/75">
      <li className="tabular-nums">
        {quiz.questionCount} {quiz.questionCount === 1 ? "pregunta" : "preguntas"}
        {!survey && ` · ${quiz.totalPoints} puntos`}
      </li>
      {quiz.timeLimitMinutes && (
        <li className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {quiz.timeLimitMinutes} min para responder
        </li>
      )}
      {quiz.closesAt && (
        <li className="flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Cierra {formatDateTime(quiz.closesAt)}
        </li>
      )}
    </ul>
  );
}

function NotStarted({ quiz }: { quiz: QuizStudentView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const survey = quiz.kind === "SURVEY";

  async function start() {
    if (quiz.timeLimitMinutes && !window.confirm(`Tendrás ${quiz.timeLimitMinutes} minutos desde que empieces. ¿Empezar ahora?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/quizzes/${quiz.id}/start`, { method: "POST" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo empezar.");
      setBusy(false);
    }
  }

  return (
    <section className={`${CARD} space-y-4 p-5 sm:p-6`}>
      <div>
        <h1 className="text-xl font-semibold text-uach-petrol">{quiz.title}</h1>
        {quiz.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-uach-ink">{quiz.description}</p>}
      </div>
      <Facts quiz={quiz} />
      {error && <FormAlert message={error} />}
      {quiz.lockedReason && quiz.window === "open" ? (
        <FormAlert tone="info" message={`Aún no disponible: ${quiz.lockedReason}.`} />
      ) : quiz.window === "open" ? (
        <div className="space-y-2">
          <button type="button" onClick={start} disabled={busy} className={BTN_PRIMARY}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            {survey ? "Responder encuesta" : "Empezar"}
          </button>
          <p className="text-xs text-uach-ink/75">Solo hay un intento. Tus respuestas se guardan solas mientras respondes.</p>
        </div>
      ) : quiz.window === "upcoming" ? (
        <FormAlert tone="info" message={`Abre ${quiz.opensAt ? formatDateTime(quiz.opensAt) : "pronto"}.`} />
      ) : (
        <FormAlert tone="info" message="Este formulario ya cerró y no lo respondiste." />
      )}
    </section>
  );
}

/** Segundos que faltan (null = sin límite). */
function useCountdown(deadline: string | null) {
  const [left, setLeft] = useState<number | null>(() =>
    deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)) : null,
  );
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return left;
}

function InProgress({ quiz }: { quiz: QuizStudentView }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(quiz.questions.map((q) => [q.id, q.answer ?? null])),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  const latest = useRef(answers);
  latest.current = answers;
  const left = useCountdown(quiz.attempt?.deadlineAt ?? null);

  const submit = useCallback(
    async (auto = false) => {
      setSubmitting(true);
      setError(null);
      try {
        await api(`/quizzes/${quiz.id}/submit`, { method: "POST", body: { answers: toPayload(latest.current) } });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "No se pudo enviar. Inténtalo de nuevo.");
        setSubmitting(false);
        if (auto) router.refresh();
      }
    },
    [quiz.id, router],
  );

  // Guardado automático 1.5 s después del último cambio.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await api(`/quizzes/${quiz.id}/answers`, { method: "PUT", body: { answers: toPayload(latest.current) } });
        dirty.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [answers, quiz.id]);

  // Al terminarse el tiempo se envía con lo contestado.
  const autoSent = useRef(false);
  useEffect(() => {
    if (left === 0 && !autoSent.current) {
      autoSent.current = true;
      void submit(true);
    }
  }, [left, submit]);

  const set = (questionId: string, value: AnswerValue) => {
    dirty.current = true;
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const minutes = left === null ? null : Math.floor(left / 60);
  const seconds = left === null ? null : left % 60;
  const urgent = left !== null && left <= 60;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <section className={`${CARD} space-y-3 p-5`}>
        <h1 className="text-xl font-semibold text-uach-petrol">{quiz.title}</h1>
        {quiz.description && <p className="whitespace-pre-line text-sm leading-relaxed text-uach-ink">{quiz.description}</p>}
        <Facts quiz={quiz} />
      </section>

      <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl bg-uach-surface px-4 py-2 text-sm shadow-sm ring-1 ring-uach-ink/[0.06]">
        <span className="text-uach-ink/75" aria-live="polite">
          {saveState === "saving" && "Guardando…"}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1 text-uach-emerald">
              <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
              Guardado
            </span>
          )}
          {saveState === "error" && <span className="text-red-700">No se pudo guardar; revisa tu conexión</span>}
          {saveState === "idle" && "Tus respuestas se guardan solas"}
        </span>
        {left !== null && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold tabular-nums ${
              urgent ? "bg-red-50 text-red-700" : "bg-uach-subtle text-uach-tealDark"
            }`}
            role="timer"
            aria-label={`Tiempo restante: ${minutes} minutos ${seconds} segundos`}
          >
            <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        )}
      </div>

      <ol className="space-y-3">
        {quiz.questions.map((q, index) => (
          <li key={q.id}>
            <fieldset className={`${CARD} space-y-3 p-5`}>
              <legend className="contents">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium leading-relaxed text-uach-ink">
                    <span className="tabular-nums text-uach-ink/75">{index + 1}. </span>
                    <span className="whitespace-pre-line">{q.prompt}</span>
                    {q.required && <span className="text-red-700" aria-label="obligatoria"> *</span>}
                  </span>
                  {quiz.kind === "QUIZ" && (
                    <span className="shrink-0 text-xs tabular-nums text-uach-ink/75">{q.points} pts</span>
                  )}
                </span>
              </legend>
              <AnswerInput question={q} value={answers[q.id] ?? null} onChange={(value) => set(q.id, value)} />
            </fieldset>
          </li>
        ))}
      </ol>

      {error && <FormAlert message={error} />}
      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          Enviar respuestas
        </button>
      </div>
    </form>
  );
}

function AnswerInput({
  question: q,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  const name = `answer-${q.id}`;
  if (q.type === "SHORT") {
    return (
      <input
        aria-label="Tu respuesta"
        value={value?.text ?? ""}
        onChange={(event) => onChange({ text: event.target.value })}
        maxLength={300}
        className={INPUT}
      />
    );
  }
  if (q.type === "PARAGRAPH") {
    return (
      <textarea
        aria-label="Tu respuesta"
        value={value?.text ?? ""}
        onChange={(event) => onChange({ text: event.target.value })}
        rows={5}
        maxLength={5000}
        className={`${INPUT} resize-y`}
      />
    );
  }
  const multiple = q.type === "MULTIPLE";
  return (
    <div className="space-y-1">
      {multiple && <p className="text-xs text-uach-ink/75">Puedes elegir varias.</p>}
      {optionsOf(q).map((option) => {
        const checked = optionIsChosen(value, option.id);
        return (
          <label
            key={option.id}
            className="press-soft flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-uach-ink hover:bg-uach-canvas"
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              checked={checked}
              onChange={() => {
                if (!multiple) return onChange({ option: option.id });
                const current = value?.options ?? [];
                const next = checked ? current.filter((id) => id !== option.id) : [...current, option.id];
                onChange(next.length ? { options: next } : null);
              }}
              className="h-4 w-4 shrink-0 accent-uach-teal"
            />
            {option.text}
          </label>
        );
      })}
      {!multiple && value?.option && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="press-soft h-11 rounded-lg px-3 text-xs font-medium text-uach-ink/75 hover:bg-uach-canvas"
        >
          Borrar selección
        </button>
      )}
    </div>
  );
}

function Submitted({ quiz }: { quiz: QuizStudentView }) {
  const attempt = quiz.attempt!;
  const survey = quiz.kind === "SURVEY";

  if (!quiz.resultsVisible) {
    const message = survey
      ? "¡Gracias! Tu respuesta quedó registrada."
      : quiz.resultsVisibility === "AFTER_CLOSE" && quiz.closesAt
        ? `Respuestas enviadas. Verás tu resultado después del cierre (${formatDateTime(quiz.closesAt)}).`
        : "Respuestas enviadas. Tu docente revisará los resultados.";
    return (
      <section className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-emerald/10 text-uach-emerald">
          <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="mt-4 text-base font-semibold text-uach-ink">{quiz.title}</h1>
        <p className="mt-1 max-w-md text-sm text-uach-ink/75">{message}</p>
        {attempt.submittedAt && (
          <p className="mt-2 text-xs text-uach-ink/75">Enviado {formatDateTime(attempt.submittedAt)}</p>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className={`${CARD} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h1 className="text-xl font-semibold text-uach-petrol">{quiz.title}</h1>
          {attempt.submittedAt && <p className="mt-1 text-sm text-uach-ink/75">Enviado {formatDateTime(attempt.submittedAt)}</p>}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-3xl font-semibold tabular-nums text-uach-petrol">
            {formatPoints(attempt.score)}
            <span className="text-base font-medium text-uach-ink/75"> / {attempt.maxScore}</span>
          </p>
          {attempt.needsReview && (
            <p className="mt-1 text-xs font-medium text-amber-800">Calificación parcial: el docente revisa las preguntas abiertas</p>
          )}
        </div>
      </section>

      <ol className="space-y-3">
        {quiz.questions.map((q, index) => (
          <li key={q.id}>
            <ResultCard question={q} index={index} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Una pregunta ya calificada: lo que respondió, lo correcto y los puntos. */
export function ResultCard({ question: q, index, children }: { question: QuizQuestion; index: number; children?: React.ReactNode }) {
  const full = q.earned !== null && q.earned !== undefined && q.earned === q.points && q.points > 0;
  const pending = q.earned === null;
  return (
    <article className={`${CARD} space-y-3 p-5`}>
      <header className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-relaxed text-uach-ink">
          <span className="tabular-nums text-uach-ink/75">{index + 1}. </span>
          <span className="whitespace-pre-line">{q.prompt}</span>
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
            pending ? "bg-amber-50 text-amber-800" : full ? "bg-uach-emerald/10 text-uach-emerald" : "bg-uach-canvas text-uach-ink/75"
          }`}
        >
          {pending ? "Por revisar" : `${formatPoints(q.earned)} / ${q.points}`}
        </span>
      </header>

      {q.type === "SHORT" || q.type === "PARAGRAPH" ? (
        <div className="space-y-2 text-sm">
          <p className="whitespace-pre-line rounded-xl bg-uach-canvas px-3 py-2 text-uach-ink">
            {q.answer?.text || <span className="text-uach-ink/75">Sin respuesta</span>}
          </p>
          {q.answerKey?.accepted && q.answerKey.accepted.length > 0 && (
            <p className="text-uach-ink/75">
              Respuesta esperada: <span className="text-uach-ink">{q.answerKey.accepted.join(" · ")}</span>
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-1">
          {optionsOf(q).map((option) => {
            const chosen = optionIsChosen(q.answer, option.id);
            const correct = optionIsCorrect(q.answerKey, option.id);
            return (
              <li
                key={option.id}
                className={`flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  correct ? "bg-uach-emerald/10 text-uach-emerald" : chosen ? "bg-red-50 text-red-700" : "text-uach-ink"
                }`}
              >
                {correct ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                ) : chosen ? (
                  <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                ) : (
                  <span className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="flex-1">{option.text}</span>
                {chosen && <span className="text-xs font-medium">Tu respuesta</span>}
                {correct && !chosen && <span className="text-xs font-medium">Correcta</span>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="sr-only">{QUESTION_TYPE_LABEL[q.type]}</p>
      {children}
    </article>
  );
}
