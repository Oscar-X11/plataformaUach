/**
 * Niveles, carreras, materias y periodos (vistas de administración y formularios).
 * En la API el nivel se llama faculty; en la web nunca se dice «facultad».
 */

/** Licenciaturas e ingenierías: cuatrimestres. Bachillerato: semestres. */
export type TermScheme = "CUATRIMESTRAL" | "SEMESTRAL";

export const TERM_SCHEMES: TermScheme[] = ["CUATRIMESTRAL", "SEMESTRAL"];

/** Textos por tipo de periodo: "Cuatrimestral", "cuatrimestre", "cuat". */
export const SCHEME_TEXT: Record<TermScheme, { label: string; unit: string; short: string }> = {
  CUATRIMESTRAL: { label: "Cuatrimestral", unit: "cuatrimestre", short: "cuat" },
  SEMESTRAL: { label: "Semestral", unit: "semestre", short: "sem" },
};

/** Las respuestas antiguas (o del backend simulado) pueden no traer el tipo. */
export const schemeOf = (value: { scheme?: TermScheme } | null | undefined): TermScheme =>
  value?.scheme ?? "CUATRIMESTRAL";

export interface AcademicTerm {
  id: string;
  code: string;
  name: string;
  scheme: TermScheme;
  startsAt: string | null;
  endsAt: string | null;
  isCurrent: boolean;
  closed: boolean;
  _count: { courses: number };
}

export interface CatalogSubject {
  id: string;
  name: string;
  code: string;
  semester: number;
  _count: { courses: number; resources: number };
}

export interface CatalogCareer {
  id: string;
  name: string;
  code: string;
  _count: { users: number };
  subjects: CatalogSubject[];
}

export interface CatalogFaculty {
  id: string;
  name: string;
  code: string;
  scheme: TermScheme;
  /** Calificación mínima aprobatoria (Decimal: llega como texto). */
  passingGrade: string | number;
  _count: { users: number };
  careers: CatalogCareer[];
}

/** Lista plana de carreras para un <select>, agrupable por nivel. */
export interface CareerOption {
  id: string;
  name: string;
  code: string;
  faculty: string;
}

export function careerOptions(catalog: CatalogFaculty[]): CareerOption[] {
  return catalog.flatMap((faculty) =>
    faculty.careers.map((career) => ({ id: career.id, name: career.name, code: career.code, faculty: faculty.name })),
  );
}

/** "2026-08-01" → "1 ago 2026" (las fechas de periodo son días, sin hora). */
export function formatTermDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
