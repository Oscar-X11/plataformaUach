/** Tipos de la API de trabajo de clase, tablón, notificaciones, perfil y usuarios. */
import type { CourseRole } from "@/lib/courses";
import type { UserRole } from "@/lib/session";

export type SubmissionState = "pending" | "missing" | "submitted" | "late" | "returned";

export interface SubmissionFileView {
  id: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface SubmissionView {
  id: string | null;
  status: "ASSIGNED" | "SUBMITTED" | "RETURNED";
  state: SubmissionState;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  returnedAt: string | null;
  files: SubmissionFileView[];
}

export interface AssignmentView {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  points: number;
  createdAt: string;
  updatedAt: string;
  myRole: CourseRole;
  mySubmission: SubmissionView | null;
  stats: { students: number; submitted: number; returned: number } | null;
}

export interface StudentSubmissionRow {
  student: { id: string; fullName: string; username: string };
  submission: SubmissionView;
}

export type ClassworkOverview =
  | {
      role: "student";
      items: {
        id: string;
        title: string;
        dueAt: string | null;
        points: number;
        course: { id: string; name: string };
        submission: SubmissionView;
      }[];
    }
  | {
      role: "teacher";
      items: {
        id: string;
        title: string;
        dueAt: string | null;
        points: number;
        course: { id: string; name: string };
        student: { id: string; fullName: string };
        submittedAt: string | null;
        state: SubmissionState;
      }[];
    };

export type CourseGrades =
  | {
      role: "student";
      assignments: {
        id: string;
        title: string;
        dueAt: string | null;
        points: number;
        state: SubmissionState;
        grade: number | null;
        feedback: string | null;
      }[];
      average: number | null;
    }
  | {
      role: "teacher" | "admin";
      assignments: { id: string; title: string; dueAt: string | null; points: number }[];
      students: {
        id: string;
        fullName: string;
        username: string;
        average: number | null;
        cells: { assignmentId: string; state: SubmissionState; grade: number | null; returned: boolean; points: number }[];
      }[];
    };

export interface Author {
  id: string;
  fullName: string;
  role: UserRole;
}

export interface CommentView {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

export interface PostView {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  comments: CommentView[];
}

export interface StreamView {
  canPost: boolean;
  posts: PostView[];
}

export type NotificationType = "ASSIGNMENT_CREATED" | "SUBMISSION_RETURNED" | "POST_CREATED" | "COMMENT_CREATED";

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationView[];
  unreadCount: number;
}

export interface ProfileView {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED";
  avatarUrl: string | null;
  createdAt: string;
  faculty: { id: string; name: string } | null;
  career: { id: string; name: string } | null;
  courseCount: number;
}

export interface AdminUserRow {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED";
  mustChangePassword: boolean;
  createdAt: string;
  career: { name: string; code: string } | null;
}

export interface AdminUserPage {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** URL de descarga de un archivo de storage/ (pasa por permisos del backend). */
export const fileHref = (fileUrl: string) => `/api/files/${fileUrl.split("/").map(encodeURIComponent).join("/")}`;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Tipos aceptados en entregas (deben coincidir con backend/src/files/upload.ts). */
export const SUBMISSION_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.zip,.txt,.csv";
export const MAX_SUBMISSION_FILE_MB = 20;
