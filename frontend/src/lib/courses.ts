/** Tipos de la API de cursos (backend/src/courses). */

import type { TermScheme } from "@/lib/academic";

export type CourseRole = "teacher" | "student" | "admin";

export interface CourseSummary {
  id: string;
  name: string;
  term: string;
  subject: { id: string; name: string; code: string; semester: number };
  teacher: { id: string; fullName: string };
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
  career: { id: string; name: string; code: string; faculty?: { scheme: TermScheme } };
}

export const canManage = (course: Pick<CourseSummary, "myRole">) => course.myRole !== "student";
