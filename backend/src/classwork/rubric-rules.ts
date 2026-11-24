/**
 * Rúbricas: validar lo que manda el editor y calificar con los niveles
 * elegidos. Funciones puras para probarlas sin base de datos.
 */
import { BadRequestException } from '@nestjs/common';

export interface RubricLevel {
  id: string;
  label: string;
  points: number;
  description?: string;
}

export interface RubricCriterionData {
  title: string;
  description: string | null;
  levels: RubricLevel[];
}

const MAX_CRITERIA = 20;
const MAX_LEVELS = 6;
const LEVEL_ID = /^[A-Za-z0-9_-]{1,40}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const clean = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

/** Valida y normaliza los criterios. Los niveles se ordenan de más a menos puntos. */
export function normalizeRubric(input: unknown): RubricCriterionData[] {
  if (!Array.isArray(input)) throw new BadRequestException('La rúbrica debe ser una lista de criterios');
  if (input.length > MAX_CRITERIA) throw new BadRequestException(`Una rúbrica admite como máximo ${MAX_CRITERIA} criterios`);

  return input.map((raw, index) => {
    const fail = (message: string): never => {
      throw new BadRequestException(`Criterio ${index + 1}: ${message}`);
    };
    const item = isRecord(raw) ? raw : {};
    const title = clean(item.title);
    if (!title) fail('escribe el nombre del criterio');
    if (title.length > 150) fail('el nombre es demasiado largo');
    const description = clean(item.description) || null;
    if (description && description.length > 500) fail('la descripción es demasiado larga');

    if (!Array.isArray(item.levels)) fail('agrega los niveles');
    const levels = (item.levels as unknown[]).map((level, levelIndex) => {
      const record = isRecord(level) ? level : {};
      const label = clean(record.label);
      if (!label) fail(`el nivel ${levelIndex + 1} no tiene nombre`);
      if (label.length > 60) fail(`el nombre del nivel ${levelIndex + 1} es demasiado largo`);
      const points = Number(record.points);
      if (!Number.isInteger(points) || points < 0 || points > 100) {
        fail(`los puntos del nivel ${levelIndex + 1} deben ser un entero de 0 a 100`);
      }
      const id = typeof record.id === 'string' && LEVEL_ID.test(record.id) ? record.id : `n${levelIndex + 1}`;
      const levelDescription = clean(record.description);
      if (levelDescription.length > 300) fail(`la descripción del nivel ${levelIndex + 1} es demasiado larga`);
      return { id, label, points, ...(levelDescription ? { description: levelDescription } : {}) };
    });
    if (levels.length < 2) fail('necesita al menos 2 niveles');
    if (levels.length > MAX_LEVELS) fail(`admite como máximo ${MAX_LEVELS} niveles`);
    if (new Set(levels.map((level) => level.id)).size !== levels.length) fail('hay niveles repetidos');
    levels.sort((a, b) => b.points - a.points);
    return { title, description, levels };
  });
}

/** Puntos máximos de la rúbrica: la suma del mejor nivel de cada criterio. */
export function rubricMaxPoints(criteria: { levels: unknown }[]) {
  return criteria.reduce((sum, criterion) => {
    const levels = Array.isArray(criterion.levels) ? (criterion.levels as RubricLevel[]) : [];
    return sum + Math.max(0, ...levels.map((level) => Number(level.points) || 0));
  }, 0);
}

/**
 * Calificación con la rúbrica: suma de los niveles elegidos. Exige un nivel
 * válido en cada criterio. Devuelve la selección limpia y el total.
 */
export function gradeWithRubric(criteria: { id: string; title: string; levels: unknown }[], selection: unknown) {
  if (!isRecord(selection)) throw new BadRequestException('Elige un nivel en cada criterio de la rúbrica');
  const clean: Record<string, string> = {};
  let total = 0;
  for (const criterion of criteria) {
    const levels = Array.isArray(criterion.levels) ? (criterion.levels as RubricLevel[]) : [];
    const chosen = levels.find((level) => level.id === selection[criterion.id]);
    if (!chosen) throw new BadRequestException(`Elige un nivel en «${criterion.title}»`);
    clean[criterion.id] = chosen.id;
    total += chosen.points;
  }
  return { selection: clean, grade: total };
}
