/** Tipos de la API de cuestionarios y encuestas (backend/src/quizzes). */

export type QuizKind = "QUIZ" | "SURVEY";
export type QuizResultsVisibility = "ON_SUBMIT" | "AFTER_CLOSE" | "NEVER";
export type QuestionType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "SHORT" | "PARAGRAPH";
export type QuizWindow = "draft" | "upcoming" | "open" | "closed";

export interface QuizOption {
  id: string;
  text: string;
}

export type AnswerKey = { option?: string; options?: string[]; accepted?: string[] } | null;
export type AnswerValue = { option?: string; options?: string[]; text?: string } | null;

export interface QuizQuestion {
  id: string;
  position: number;
  type: QuestionType;
  prompt: string;
  points: number;
  required: boolean;
  options: QuizOption[] | null;
  answerKey?: AnswerKey;
  answer?: AnswerValue;
  /** Puntos obtenidos (null = por revisar). */
  earned?: number | null;
}

interface QuizBase {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  kind: QuizKind;
  opensAt: string | null;
  closesAt: string | null;
  timeLimitMinutes: number | null;
  resultsVisibility: QuizResultsVisibility;
  window: QuizWindow;
  questionCount: number;
  totalPoints: number;
  questions: QuizQuestion[];
}

export interface QuizManagerView extends QuizBase {
  myRole: "teacher" | "admin";
  published: boolean;
  locked: boolean;
  responses: number;
  needsReview: number;
  students: number;
}

export interface QuizStudentView extends QuizBase {
  myRole: "student";
  resultsVisible: boolean;
  attempt: {
    status: "in_progress" | "submitted";
    startedAt: string;
    deadlineAt: string | null;
    submittedAt: string | null;
    score: number | null;
    maxScore: number;
    needsReview: boolean;
  } | null;
}

export type QuizView = QuizManagerView | QuizStudentView;

export interface QuizListItem {
  id: string;
  title: string;
  kind: QuizKind;
  published: boolean;
  opensAt: string | null;
  closesAt: string | null;
  timeLimitMinutes: number | null;
  window: QuizWindow;
  questionCount: number;
  totalPoints: number;
  createdAt: string;
  // Docente
  responses?: number;
  needsReview?: number;
  // Alumno
  myStatus?: "not_started" | "in_progress" | "submitted";
  myScore?: number | null;
  myNeedsReview?: boolean;
}

export interface QuizResults {
  kind: QuizKind;
  totalPoints: number;
  responses: number;
  enrolled: number;
  average: number | null;
  summary: (QuizQuestion & {
    answered: number;
    correct: number | null;
    counts?: Record<string, number>;
    texts?: string[];
  })[];
  students: {
    student: { id: string; fullName: string; username: string };
    attemptId: string | null;
    status: "not_started" | "in_progress" | "submitted";
    submittedAt: string | null;
    score: number | null;
    needsReview: boolean;
  }[];
}

export interface AttemptDetail {
  id: string;
  kind: QuizKind;
  student: { id: string; fullName: string; username: string };
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  needsReview: boolean;
  questions: (QuizQuestion & { answerId: string | null })[];
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: "Opción múltiple",
  MULTIPLE: "Casillas",
  TRUE_FALSE: "Verdadero o falso",
  SHORT: "Respuesta corta",
  PARAGRAPH: "Párrafo",
};

export const KIND_LABEL: Record<QuizKind, { one: string; new: string }> = {
  QUIZ: { one: "cuestionario", new: "Nuevo cuestionario" },
  SURVEY: { one: "encuesta", new: "Nueva encuesta" },
};

export const RESULTS_LABEL: Record<QuizResultsVisibility, string> = {
  ON_SUBMIT: "Al enviar",
  AFTER_CLOSE: "Después del cierre",
  NEVER: "Nunca (solo el docente)",
};

/** "1.5" → "1.5", 2 → "2": puntos sin ceros de más. */
export const formatPoints = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : String(Math.round(value * 100) / 100);

/** ¿La respuesta del alumno es correcta? (para pintar las opciones en resultados). */
export function optionIsCorrect(key: AnswerKey | undefined, optionId: string) {
  if (!key) return false;
  if (key.option) return key.option === optionId;
  return Boolean(key.options?.includes(optionId));
}

export function optionIsChosen(value: AnswerValue | undefined, optionId: string) {
  if (!value) return false;
  if (value.option) return value.option === optionId;
  return Boolean(value.options?.includes(optionId));
}
