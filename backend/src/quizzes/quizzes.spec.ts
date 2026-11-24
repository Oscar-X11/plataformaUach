import { BadRequestException } from '@nestjs/common';
import {
  attemptDeadline,
  gradeAnswer,
  normalizeAnswer,
  normalizeQuestions,
  normalizeText,
  quizWindow,
  resultsVisible,
} from './quiz-rules';

const single = {
  type: 'SINGLE',
  prompt: '¿Capital de Chiapas?',
  points: 2,
  options: [
    { id: 'a', text: 'Tuxtla Gutiérrez' },
    { id: 'b', text: 'San Cristóbal' },
  ],
  answerKey: { option: 'a' },
};

describe('normalizeQuestions', () => {
  it('acepta los cinco tipos y fija las opciones de verdadero/falso', () => {
    const questions = normalizeQuestions('QUIZ', [
      single,
      { type: 'MULTIPLE', prompt: 'Primos', options: [{ id: 'x', text: '2' }, { id: 'y', text: '4' }, { id: 'z', text: '5' }], answerKey: { options: ['x', 'z'] } },
      { type: 'TRUE_FALSE', prompt: 'El agua hierve a 100 °C', answerKey: { option: 'true' } },
      { type: 'SHORT', prompt: 'Autor del Quijote', answerKey: { accepted: ['Cervantes', ' cervantes '] } },
      { type: 'PARAGRAPH', prompt: 'Explica', points: 5 },
    ]);
    expect(questions.map((q) => q.type)).toEqual(['SINGLE', 'MULTIPLE', 'TRUE_FALSE', 'SHORT', 'PARAGRAPH']);
    expect(questions[2].options).toHaveLength(2);
    expect(questions[3].answerKey).toEqual({ accepted: ['Cervantes', 'cervantes'] });
    expect(questions[4].answerKey).toBeNull();
  });

  it('dice qué pregunta corregir', () => {
    expect(() => normalizeQuestions('QUIZ', [single, { ...single, answerKey: {} }])).toThrow(
      /Pregunta 2: marca la respuesta correcta/,
    );
    expect(() => normalizeQuestions('QUIZ', [{ ...single, options: [{ text: 'Sola' }] }])).toThrow(/al menos 2 opciones/);
    expect(() => normalizeQuestions('QUIZ', [{ ...single, prompt: '  ' }])).toThrow(/escribe la pregunta/);
    expect(() => normalizeQuestions('QUIZ', [{ ...single, points: -1 }])).toThrow(/puntos/);
  });

  it('en encuestas no hay puntos ni respuestas correctas', () => {
    const [question] = normalizeQuestions('SURVEY', [{ ...single, answerKey: undefined }]);
    expect(question.points).toBe(0);
    expect(question.answerKey).toBeNull();
  });
});

describe('Calificación automática', () => {
  const [q] = normalizeQuestions('QUIZ', [single]);

  it('opción múltiple', () => {
    expect(gradeAnswer(q, { option: 'a' })).toBe(2);
    expect(gradeAnswer(q, { option: 'b' })).toBe(0);
    expect(gradeAnswer(q, null)).toBe(0);
  });

  it('casillas: todo o nada', () => {
    const question = { type: 'MULTIPLE' as const, points: 3, options: [], answerKey: { options: ['x', 'z'] } };
    expect(gradeAnswer(question, { options: ['z', 'x'] })).toBe(3);
    expect(gradeAnswer(question, { options: ['x'] })).toBe(0);
    expect(gradeAnswer(question, { options: ['x', 'y', 'z'] })).toBe(0);
  });

  it('respuesta corta sin mayúsculas, acentos ni punto final; sin clave la califica el docente', () => {
    const question = { type: 'SHORT' as const, points: 1, options: null, answerKey: { accepted: ['Miguel de Cervantes'] } };
    expect(gradeAnswer(question, { text: 'miguel de  CERVÁNTES.' })).toBe(1);
    expect(gradeAnswer(question, { text: 'Lope' })).toBe(0);
    expect(gradeAnswer({ ...question, answerKey: null }, { text: 'Lope' })).toBeNull();
    expect(normalizeText('  José  Pérez. ')).toBe('jose perez');
  });

  it('párrafo: manual si respondió, 0 si no', () => {
    const question = { type: 'PARAGRAPH' as const, points: 5, options: null, answerKey: null };
    expect(gradeAnswer(question, { text: 'Mi ensayo' })).toBeNull();
    expect(gradeAnswer(question, null)).toBe(0);
  });
});

describe('normalizeAnswer', () => {
  it('rechaza opciones que no existen y trata lo vacío como sin contestar', () => {
    expect(() => normalizeAnswer({ type: 'SINGLE', options: single.options }, { option: 'zzz' })).toThrow(
      BadRequestException,
    );
    expect(normalizeAnswer({ type: 'SINGLE', options: single.options }, { option: '' })).toBeNull();
    expect(normalizeAnswer({ type: 'SHORT', options: null }, { text: '   ' })).toBeNull();
    expect(normalizeAnswer({ type: 'MULTIPLE', options: single.options }, { options: ['a', 'a'] })).toEqual({
      options: ['a'],
    });
  });
});

describe('Fechas, tiempo límite y resultados', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  const at = (iso: string) => new Date(iso);

  it('estado del formulario', () => {
    expect(quizWindow({ published: false, opensAt: null, closesAt: null }, now)).toBe('draft');
    expect(quizWindow({ published: true, opensAt: at('2026-11-25T00:00:00Z'), closesAt: null }, now)).toBe('upcoming');
    expect(quizWindow({ published: true, opensAt: null, closesAt: at('2026-11-24T09:00:00Z') }, now)).toBe('closed');
    expect(quizWindow({ published: true, opensAt: null, closesAt: null }, now)).toBe('open');
  });

  it('el límite es el tiempo o el cierre, lo que llegue antes', () => {
    expect(attemptDeadline({ timeLimitMinutes: 30, closesAt: null }, now)).toEqual(at('2026-11-24T10:30:00Z'));
    expect(attemptDeadline({ timeLimitMinutes: 30, closesAt: at('2026-11-24T10:10:00Z') }, now)).toEqual(
      at('2026-11-24T10:10:00Z'),
    );
    expect(attemptDeadline({ timeLimitMinutes: null, closesAt: null }, now)).toBeNull();
  });

  it('cuándo ve el alumno su resultado', () => {
    const quiz = { kind: 'QUIZ' as const, closesAt: at('2026-11-24T12:00:00Z') };
    expect(resultsVisible({ ...quiz, resultsVisibility: 'ON_SUBMIT' }, true, now)).toBe(true);
    expect(resultsVisible({ ...quiz, resultsVisibility: 'ON_SUBMIT' }, false, now)).toBe(false);
    expect(resultsVisible({ ...quiz, resultsVisibility: 'AFTER_CLOSE' }, true, now)).toBe(false);
    expect(resultsVisible({ ...quiz, resultsVisibility: 'AFTER_CLOSE' }, true, at('2026-11-24T13:00:00Z'))).toBe(true);
    expect(resultsVisible({ ...quiz, resultsVisibility: 'NEVER' }, true, now)).toBe(false);
    expect(resultsVisible({ ...quiz, kind: 'SURVEY', resultsVisibility: 'ON_SUBMIT' }, true, now)).toBe(false);
  });
});
