import type { NotificationType } from "@/lib/classwork";
/**
 * Tipos del dashboard del alumno. Reflejan los modelos de `schema.prisma`
 * (Course, Assignment, Submission, Post) en la forma en que la vista los usa,
 * para que el endpoint futuro pueda devolver exactamente esto.
 */

export type SubmissionStatus = "ASSIGNED" | "SUBMITTED" | "LATE" | "GRADED";

/** Color asignado al curso, siempre de la paleta institucional `uach.*`. */
export type CourseTone = "teal" | "petrol" | "emerald" | "tealDark" | "ink";

export interface DashboardCourse {
  id: string;
  name: string;
  subjectCode: string;
  term: string;
  teacherName: string;
  tone: CourseTone;
  /** Tareas del curso entregadas o calificadas / total asignadas. */
  submittedCount: number;
  assignmentCount: number;
  /** Promedio del alumno en el curso (0–10), null si aún no hay calificaciones. */
  average: number | null;
  /** Próxima tarea sin entregar, si existe. */
  nextDue: { title: string; dueAt: string } | null;
  /** Última actividad del alumno en el curso ("Continúa donde te quedaste"). */
  lastActivity: { label: string; at: string } | null;
}

export interface DashboardAssignment {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  tone: CourseTone;
  dueAt: string;
  status: SubmissionStatus;
  points: number;
}

/** Notificación de aviso o cuestionario para el panel del inicio. */
export interface DashboardNotice {
  id: string;
  type: NotificationType;
  title: string;
  link: string | null;
  createdAt: string;
  unread: boolean;
}

/** Los 3 más recientes y cuántos hay sin leer en total. */
export interface DashboardNotices {
  items: DashboardNotice[];
  unread: number;
}

export interface DashboardGrade {
  id: string;
  assignmentTitle: string;
  courseId: string;
  courseName: string;
  tone: CourseTone;
  grade: number;
  points: number;
  gradedAt: string;
}

export interface StudentDashboardData {
  term: string;
  /** true mientras la vista se alimenta de datos de ejemplo. */
  isSample: boolean;
  courses: DashboardCourse[];
  /** Tareas sin entregar (ASSIGNED o LATE) de todos los cursos. */
  pending: DashboardAssignment[];
  /** Tareas ya entregadas cuya fecha cae en los últimos días (para la semana). */
  recentlySubmitted: DashboardAssignment[];
  /** Avisos y cuestionarios (máximo 3); el resto, en Notificaciones. */
  notices: DashboardNotices;
  recentGrades: DashboardGrade[];
  stats: {
    overallAverage: number | null;
    onTimeCount: number;
    submittedCount: number;
  };
}
