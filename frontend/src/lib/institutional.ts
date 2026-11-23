/** Tipos de la Fase 2: calendario, material del curso, repositorio, grupos y reportes. */
import type { SubmissionState } from "@/lib/classwork";
import type { UserRole } from "@/lib/session";

export interface CalendarItem {
  id: string;
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
  canManage: boolean;
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
}

export interface StudyGroupDetail extends StudyGroup {
  members: { id: string; fullName: string; role: UserRole; joinedAt: string }[];
}

export interface CourseReportRow {
  id: string;
  name: string;
  term: string;
  subject: { code: string; name: string };
  teacherName: string;
  students: number;
  assignments: number;
  deliveryRate: number | null;
  onTime: number;
  average: number | null;
}

export interface CourseReport {
  terms: string[];
  rows: CourseReportRow[];
}
