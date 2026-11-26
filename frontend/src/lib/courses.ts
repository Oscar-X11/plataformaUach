/** Tipos de la API de cursos (backend/src/courses). */

import type { TermScheme } from "@/lib/academic";

export type CourseRole = "teacher" | "student" | "admin";

export interface CourseSummary {
  id: string;
  name: string;
  term: string;
  /** Carrera y número de cuatrimestre o semestre de la clase. */
  career: { id: string; name: string; code: string; faculty: { name: string; scheme: TermScheme } };
  grade: number;
  /** Materia del catálogo (opcional). */
  subject: { id: string; name: string; code: string; semester: number } | null;
  teacher: { id: string; fullName: string };
  /** Descripción de la clase (como en Classroom). */
  description: string | null;
  /** Aula: salón y horario, o enlace de la reunión (texto libre del docente). */
  meetingInfo: string | null;
  studentCount: number;
  createdAt: string;
  myRole: CourseRole;
  /** Solo lo recibe quien gestiona el curso (docente o admin). */
  invitation: string | null;
}

export interface CoursePeople {
  teacher: { id: string; fullName: string };
  students: {
    id: string;
    fullName: string;
    /** null cuando quien consulta es alumno: no ve matrículas ajenas. */
    username: string | null;
    joinedAt: string;
  }[];
}

export interface SubjectOption {
  id: string;
  name: string;
  code: string;
  semester: number;
  /** faculty = nivel (Licenciaturas, Ingenierías, Preparatoria). */
  career: { id: string; name: string; code: string; faculty?: { id: string; name: string; scheme: TermScheme } };
}

/** "ISC · 4.º cuat" — etiqueta corta de la clase. */
export function courseLabel(course: Pick<CourseSummary, "career" | "grade">) {
  const unit = course.career.faculty.scheme === "SEMESTRAL" ? "sem" : "cuat";
  return `${course.career.code} · ${course.grade}.º ${unit}`;
}

/** "4.º cuatrimestre" */
export function gradeText(course: Pick<CourseSummary, "career" | "grade">) {
  return `${course.grade}.º ${course.career.faculty.scheme === "SEMESTRAL" ? "semestre" : "cuatrimestre"}`;
}

/** Docente o administrador: ve el seguimiento, las entregas y modera. */
export const canManage = (course: Pick<CourseSummary, "myRole">) => course.myRole !== "student";
/**
 * Solo el docente crea contenido académico (avisos, tareas, cuestionarios,
 * material) y califica. El administrador consulta y modera.
 */
export const canTeach = (course: Pick<CourseSummary, "myRole">) => course.myRole === "teacher";
