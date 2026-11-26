/** Tipos de la Fase 2: calendario, material del curso, repositorio, grupos y reportes. */
import type { SubmissionState } from "@/lib/classwork";
import type { UserRole } from "@/lib/session";

export interface CalendarItem {
  id: string;
  /** Tarea, cuestionario o encuesta (estos últimos, en su fecha de cierre). */
  kind: "assignment" | "quiz" | "survey";
  href: string;
  title: string;
  dueAt: string;
  points: number;
  course: { id: string; name: string };
  /** Solo alumnos. */
  state: SubmissionState | null;
  /** Solo docentes/admin. */
  submitted: number | null;
  students: number | null;
}

export interface Topic {
  id: string;
  title: string;
  position: number;
}

export interface Material {
  id: string;
  topicId: string | null;
  title: string;
  description: string | null;
  kind: "FILE" | "LINK";
  fileUrl: string | null;
  url: string | null;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  author: { id: string; fullName: string };
}

export interface MaterialsView {
  /** Docente o administrador: puede borrar material y temas. */
  canManage: boolean;
  /** Solo el docente sube material y crea o renombra temas. */
  canCreate: boolean;
  topics: Topic[];
  materials: Material[];
}

export type ResourceType = "NOTE" | "STUDY_GUIDE" | "EXAM" | "BOOK" | "OTHER";
export type ResourceStatus = "PENDING" | "APPROVED" | "REJECTED";

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  NOTE: "Apuntes",
  STUDY_GUIDE: "Guía de estudio",
  EXAM: "Examen resuelto",
  BOOK: "Libro o lectura",
  OTHER: "Otro",
};

export interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  status: ResourceStatus;
  /** Archivo subido o, en su lugar, un enlace (p. ej. Google Drive). */
  fileUrl: string | null;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  url: string | null;
  reviewNote: string | null;
  createdAt: string;
  subject: { id: string; name: string; code: string };
  author: { id: string; fullName: string; role: UserRole };
}

export interface ResourcePage {
  items: ResourceItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudyGroup {
  id: string;
  title: string;
  description: string;
  capacity: number;
  meetingInfo: string | null;
  createdAt: string;
  subject: { id: string; name: string; code: string } | null;
  creator: { id: string; fullName: string };
  memberCount: number;
  isMember: boolean;
  isCreator: boolean;
  canDelete: boolean;
  /** El administrador no se une a grupos. */
  canJoin: boolean;
}

export interface StudyGroupDetail extends StudyGroup {
  members: { id: string; fullName: string; role: UserRole; joinedAt: string }[];
}

export interface CourseReportRow {
  id: string;
  name: string;
  term: string;
  career: { code: string; name: string };
  /** "ISC · 4.º cuat" */
  label: string;
  teacherName: string;
  students: number;
  assignments: number;
  /** % de entregas sobre tareas ya vencidas. */
  deliveryRate: number | null;
  onTime: number;
  /** Entregas que el docente aún no califica. */
  ungraded: number;
  atRisk: number;
}

export interface ReportOptions {
  terms: string[];
  careers: { id: string; code: string; name: string }[];
}

export interface CourseReport extends ReportOptions {
  rows: CourseReportRow[];
}

export interface StudentRiskReport extends ReportOptions {
  coursesChecked: number;
  students: {
    student: { id: string; fullName: string; username: string };
    courses: { id: string; name: string; label: string; term: string; overdue: number; final: number | null; risk: string[] }[];
  }[];
}
