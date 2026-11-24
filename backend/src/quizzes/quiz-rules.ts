/**
 * Reglas de los cuestionarios (estilo Google Forms), sin base de datos para
 * poder probarlas: validar las preguntas del editor, normalizar respuestas y
 * calificar.
 */
import { BadRequestException } from '@nestjs/common';
import type { QuizKind, QuizQuestionType } from '@prisma/client';

export const QUESTION_TYPES: QuizQuestionType[] = ['SINGLE', 'MULTIPLE', 'TRUE_FALSE', 'SHORT', 'PARAGRAPH'];
export const MAX_QUESTIONS = 100;
const MAX_PROMPT = 2000;
const MAX_OPTIONS = 20;
const MAX_OPTION_TEXT = 300;
const MAX_ACCEPTED = 10;
const MAX_POINTS = 100;
export const MAX_SHORT_ANSWER = 300;
export const MAX_PARAGRAPH_ANSWER = 5000;

/** Verdadero/falso usa siempre estas dos opciones. */
export const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { id: 'true', text: 'Verdadero' },
  { id: 'false', text: 'Falso' },
];

export interface QuizOption {
  id: string;
  text: string;
}

export type AnswerKey = { option: string } | { options: string[] } | { accepted: string[] } | null;
export type AnswerValue = { option: string } | { options: string[] } | { text: string };

/** Pregunta lista para guardar. */
export interface QuestionData {
  type: QuizQuestionType;
  prompt: string;
  points: number;
  required: boolean;
  options: QuizOption[] | null;
  answerKey: AnswerKey;
}

/** Lo mínimo de una pregunta guardada que hace falta para calificar. */
export interface GradableQuestion {
  type: QuizQuestionType;
  points: number;
  options: unknown;
  answerKey: unknown;
}

const OPTION_ID = /^[A-Za-z0-9_-]{1,40}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const clean = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');
const isChoice = (type: QuizQuestionType) => type === 'SINGLE' || type === 'MULTIPLE' || type === 'TRUE_FALSE';

/**
 * Valida y normaliza las preguntas que manda el editor. Lanza un 400 con el
 * número de pregunta para que el docente sepa qué corregir.
 * En encuestas no hay puntos ni respuestas correctas.
 */
export function normalizeQuestions(kind: QuizKind, input: unknown): QuestionData[] {
  if (!Array.isArray(input)) throw new BadRequestException('Las preguntas deben ser una lista');
  if (input.length > MAX_QUESTIONS) {
    throw new BadRequestException(`Un formulario admite como máximo ${MAX_QUESTIONS} preguntas`);
  }
  const survey = kind === 'SURVEY';

  return input.map((raw, index) => {
    const fail = (message: string): never => {
      throw new BadRequestException(`Pregunta ${index + 1}: ${message}`);
    };
    if (!isRecord(raw)) fail('formato inválido');
    const item = raw as Record<string, unknown>;

    const type = item.type as QuizQuestionType;
    if (!QUESTION_TYPES.includes(type)) fail('tipo de pregunta inválido');

    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
    if (!prompt) fail('escribe la pregunta');
    if (prompt.length > MAX_PROMPT) fail(`la pregunta no puede exceder ${MAX_PROMPT} caracteres`);

    const required = item.required !== false;
    let points = 0;
    if (!survey) {
      points = Number(item.points ?? 1);
      if (!Number.isInteger(points) || points < 0 || points > MAX_POINTS) {
        fail(`los puntos deben ser un entero de 0 a ${MAX_POINTS}`);
      }
    }

    // Opciones
    let options: QuizOption[] | null = null;
    if (type === 'TRUE_FALSE') {
      options = TRUE_FALSE_OPTIONS;
    } else if (isChoice(type)) {
      if (!Array.isArray(item.options)) fail('agrega las opciones');
      const list = (item.options as unknown[]).map((option, optionIndex) => {
        const record = isRecord(option) ? option : {};
        const text = clean(record.text);
        if (!text) fail(`la opción ${optionIndex + 1} está vacía`);
        if (text.length > MAX_OPTION_TEXT) fail(`la opción ${optionIndex + 1} es demasiado larga`);
        const id = typeof record.id === 'string' && OPTION_ID.test(record.id) ? record.id : `o${optionIndex + 1}`;
        return { id, text };
      });
      if (list.length < 2) fail('necesita al menos 2 opciones');
      if (list.length > MAX_OPTIONS) fail(`admite como máximo ${MAX_OPTIONS} opciones`);
      if (new Set(list.map((option) => option.id)).size !== list.length) fail('hay opciones repetidas');
      if (new Set(list.map((option) => option.text.toLowerCase())).size !== list.length) {
        fail('hay dos opciones con el mismo texto');
      }
      options = list;
    }

    // Respuesta correcta
    let answerKey: AnswerKey = null;
    if (!survey) {
      const key = isRecord(item.answerKey) ? item.answerKey : {};
      const ids = new Set((options ?? []).map((option) => option.id));
      if (type === 'SINGLE' || type === 'TRUE_FALSE') {
        const option = typeof key.option === 'string' ? key.option : '';
        if (!ids.has(option)) fail('marca la respuesta correcta');
        answerKey = { option };
      } else if (type === 'MULTIPLE') {
        const selected = Array.isArray(key.options) ? key.options.filter((id): id is string => typeof id === 'string') : [];
        const unique = [...new Set(selected)];
        if (unique.length === 0 || unique.some((id) => !ids.has(id))) fail('marca al menos una respuesta correcta');
        answerKey = { options: unique };
      } else if (type === 'SHORT') {
        // Sin respuestas aceptadas, la califica el docente a mano.
        const accepted = Array.isArray(key.accepted)
          ? [...new Set(key.accepted.map(clean).filter(Boolean))]
          : [];
        if (accepted.length > MAX_ACCEPTED) fail(`admite como máximo ${MAX_ACCEPTED} respuestas aceptadas`);
        if (accepted.some((text) => text.length > MAX_SHORT_ANSWER)) fail('una respuesta aceptada es demasiado larga');
        answerKey = accepted.length ? { accepted } : null;
      }
    }

    return { type, prompt, points, required, options, answerKey };
  });
}

/** "  José  Pérez. " → "jose perez": la respuesta corta no distingue mayúsculas, acentos ni punto final. */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/, '');
}

const optionIds = (options: unknown) =>
  new Set(Array.isArray(options) ? options.filter(isRecord).map((option) => String(option.id)) : []);

/**
 * Normaliza lo que manda el alumno para una pregunta. Devuelve null si la dejó
 * sin contestar; lanza 400 si el valor no corresponde a la pregunta.
 */
export function normalizeAnswer(question: Pick<GradableQuestion, 'type' | 'options'>, raw: unknown): AnswerValue | null {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw)) throw new BadRequestException('Respuesta inválida');
  const ids = optionIds(question.options);

  switch (question.type) {
    case 'SINGLE':
    case 'TRUE_FALSE': {
      if (raw.option === null || raw.option === undefined || raw.option === '') return null;
      if (typeof raw.option !== 'string' || !ids.has(raw.option)) throw new BadRequestException('Opción inválida');
      return { option: raw.option };
    }
    case 'MULTIPLE': {
      const list = Array.isArray(raw.options) ? raw.options : [];
      if (list.some((id) => typeof id !== 'string' || !ids.has(id))) throw new BadRequestException('Opción inválida');
      const unique = [...new Set(list as string[])];
      return unique.length ? { options: unique } : null;
    }
    case 'SHORT':
    case 'PARAGRAPH': {
      const text = typeof raw.text === 'string' ? raw.text.trim() : '';
      if (!text) return null;
      const max = question.type === 'SHORT' ? MAX_SHORT_ANSWER : MAX_PARAGRAPH_ANSWER;
      if (text.length > max) throw new BadRequestException(`La respuesta no puede exceder ${max} caracteres`);
      return { text };
    }
    default:
      throw new BadRequestException('Respuesta inválida');
  }
}

/**
 * Puntos de una respuesta. null = la califica el docente (párrafo, o respuesta
 * corta sin respuestas aceptadas). Casillas: todo o nada, como Google Forms.
 */
export function gradeAnswer(question: GradableQuestion, value: AnswerValue | null): number | null {
  const key = isRecord(question.answerKey) ? question.answerKey : null;
  if (question.type === 'PARAGRAPH') return value ? null : 0;
  if (question.type === 'SHORT' && !Array.isArray(key?.accepted)) return value ? null : 0;
  if (!value || !key) return 0;

  switch (question.type) {
    case 'SINGLE':
    case 'TRUE_FALSE':
      return 'option' in value && value.option === key.option ? question.points : 0;
    case 'MULTIPLE': {
      const expected = new Set(Array.isArray(key.options) ? (key.options as string[]) : []);
      const given = 'options' in value ? value.options : [];
      const exact = given.length === expected.size && given.every((id) => expected.has(id));
      return exact ? question.points : 0;
    }
    case 'SHORT': {
      const text = 'text' in value ? normalizeText(value.text) : '';
      const accepted = (key.accepted as string[]).map(normalizeText);
      return accepted.includes(text) ? question.points : 0;
    }
    default:
      return 0;
  }
}

export type QuizWindow = 'draft' | 'upcoming' | 'open' | 'closed';

/** Estado del formulario para los alumnos según publicación y fechas. */
export function quizWindow(
  quiz: { published: boolean; opensAt: Date | null; closesAt: Date | null },
  now = new Date(),
): QuizWindow {
  if (!quiz.published) return 'draft';
  if (quiz.opensAt && now < quiz.opensAt) return 'upcoming';
  if (quiz.closesAt && now >= quiz.closesAt) return 'closed';
  return 'open';
}

/**
 * Límite para enviar un intento: el tiempo límite desde que empieza o el cierre
 * del formulario, lo que llegue antes. null = sin límite.
 */
export function attemptDeadline(
  quiz: { timeLimitMinutes: number | null; closesAt: Date | null },
  startedAt: Date,
): Date | null {
  const byTimer = quiz.timeLimitMinutes ? new Date(startedAt.getTime() + quiz.timeLimitMinutes * 60_000) : null;
  if (byTimer && quiz.closesAt) return byTimer < quiz.closesAt ? byTimer : quiz.closesAt;
  return byTimer ?? quiz.closesAt;
}

/** Margen para la latencia de red al enviar justo al terminar el tiempo. */
export const SUBMIT_GRACE_MS = 30_000;

/** ¿Puede el alumno ver su resultado? Las encuestas no muestran resultados. */
export function resultsVisible(
  quiz: { kind: QuizKind; resultsVisibility: 'ON_SUBMIT' | 'AFTER_CLOSE' | 'NEVER'; closesAt: Date | null },
  submitted: boolean,
  now = new Date(),
) {
  if (quiz.kind === 'SURVEY' || !submitted) return false;
  if (quiz.resultsVisibility === 'ON_SUBMIT') return true;
  if (quiz.resultsVisibility === 'AFTER_CLOSE') return Boolean(quiz.closesAt && now >= quiz.closesAt);
  return false;
}

/** Texto legible de una respuesta (CSV y vista del docente). */
export function answerText(question: { options: unknown }, value: unknown) {
  if (!isRecord(value)) return '';
  const labels = new Map(
    (Array.isArray(question.options) ? question.options.filter(isRecord) : []).map((option) => [
      String(option.id),
      String(option.text),
    ]),
  );
  if (typeof value.option === 'string') return labels.get(value.option) ?? '';
  if (Array.isArray(value.options)) return value.options.map((id) => labels.get(String(id)) ?? '').join(', ');
  if (typeof value.text === 'string') return value.text;
  return '';
}
