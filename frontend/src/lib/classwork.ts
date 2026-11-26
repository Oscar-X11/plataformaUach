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
  /** Rúbrica: { criterioId: nivelId } elegido por el docente. */
  rubricSelection: Record<string, string> | null;
  submittedAt: string | null;
  returnedAt: string | null;
  files: SubmissionFileView[];
}

export interface RubricLevel {
  id: string;
  label: string;
  points: number;
  description?: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string | null;
  levels: RubricLevel[];
}

/** Acceso condicional: si el alumno ya puede abrirla y, si no, por qué. */
export interface Availability {
  available: boolean;
  reason: string | null;
}

export type RequirementKind = "assignment" | "quiz";

export interface AssignmentView {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  points: number;
  availableFrom: string | null;
  requiresKind: RequirementKind | null;
  requiresId: string | null;
  rubric: RubricCriterion[];
  availability: Availability;
  createdAt: string;
  updatedAt: string;
  myRole: CourseRole;
  mySubmission: SubmissionView | null;
  stats: { students: number; submitted: number; returned: number } | null;
}

export interface StudentSubmissionRow {
  student: { id: string; fullName: string; username: string };
  submission: SubmissionView;
  /** Alumnos con el mismo archivo entregado (posible copia). */
  duplicateWith: string[];
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

interface GradeBook {
  /** Pesos (%) de tareas y cuestionarios en la final; suman 100. */
  weights: { assignments: number; quizzes: number };
  /** Calificación aprobatoria del nivel (6 preparatoria, 7 licenciatura). */
  passing: number;
  /** Periodo cerrado: ya no se pueden cambiar calificaciones. */
  locked: boolean;
}

export type CourseGrades =
  | (GradeBook & {
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
      quizzes: {
        id: string;
        title: string;
        closesAt: string | null;
        points: number;
        status: "not_started" | "in_progress" | "submitted";
        score: number | null;
        needsReview: boolean;
      }[];
      average: number | null;
      assignmentsAverage: number | null;
      quizzesAverage: number | null;
      final: number | null;
      passed: boolean | null;
    })
  | (GradeBook & {
      role: "teacher" | "admin";
      assignments: { id: string; title: string; dueAt: string | null; points: number }[];
      quizzes: { id: string; title: string; closesAt: string | null; points: number }[];
      students: {
        id: string;
        fullName: string;
        username: string;
        average: number | null;
        assignmentsAverage: number | null;
        quizzesAverage: number | null;
        final: number | null;
        passed: boolean | null;
        cells: { assignmentId: string; state: SubmissionState; grade: number | null; returned: boolean; points: number }[];
        quizCells: { quizId: string; score: number | null; points: number; submitted: boolean; needsReview: boolean }[];
      }[];
    });

/** Progreso de un alumno en una clase (GET /courses/:id/progress y /tracking). */
export interface StudentProgress {
  student: { id: string; fullName: string; username: string };
  completed: number;
  total: number;
  percent: number;
  overdue: number;
  assignmentsAverage: number | null;
  quizzesAverage: number | null;
  final: number | null;
  passed: boolean | null;
  risk: string[];
  lastActivityAt: string | null;
}

export interface CourseTracking {
  passing: number;
  weights: { assignments: number; quizzes: number };
  students: StudentProgress[];
  atRisk: number;
}

export type MyProgress = StudentProgress & {
  passingGrade: number;
  weights: { assignments: number; quizzes: number };
};

/** Bitácora de actividad. */
export interface ActivityEntry {
  id: string;
  action: string;
  summary: string;
  courseId: string | null;
  createdAt: string;
  user: { id: string; fullName: string; username: string; role: UserRole } | null;
}

export interface ActivityPage {
  items: ActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Etiquetas de las acciones de la bitácora. */
export const ACTIVITY_LABEL: Record<string, string> = {
  LOGIN: "Inicio de sesión",
  PASSWORD_CHANGED: "Cambio de contraseña",
  USER_CREATED: "Alta de usuario",
  USER_STATUS: "Estado de usuario",
  PASSWORD_RESET: "Restablecimiento",
  STUDENTS_IMPORTED: "Importación",
  COURSE_CREATED: "Alta de clase",
  COURSE_COPIED: "Clase reutilizada",
  COURSE_JOINED: "Inscripción",
  ASSIGNMENT_CREATED: "Tarea creada",
  ASSIGNMENT_DELETED: "Tarea borrada",
  SUBMISSION_TURNED_IN: "Entrega",
  GRADE_CHANGED: "Calificación",
  QUIZ_PUBLISHED: "Cuestionario publicado",
  QUIZ_SUBMITTED: "Cuestionario respondido",
  QUIZ_GRADED: "Cuestionario calificado",
  MATERIAL_ADDED: "Material",
  WEIGHTS_CHANGED: "Pesos",
  TERM_CHANGED: "Periodo",
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
  /** Solo el docente publica avisos. */
  canPost: boolean;
  /** El administrador no comenta. */
  canComment: boolean;
  /** Docente o administrador: borra avisos y comentarios de otros. */
  canModerate: boolean;
  posts: PostView[];
}

export type NotificationType =
  | "ASSIGNMENT_CREATED"
  | "SUBMISSION_RETURNED"
  | "POST_CREATED"
  | "COMMENT_CREATED"
  | "MATERIAL_CREATED"
  | "RESOURCE_REVIEWED"
  | "COURSE_ASSIGNED"
  | "QUIZ_PUBLISHED";

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
  career: { id: string; name: string; code: string } | null;
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
export const MAX_SUBMISSION_FILE_MB = 10;

/** Materia del catálogo (GET /academic/subjects). */
export interface SubjectOptionLite {
  id: string;
  name: string;
  code: string;
  semester: number;
  career: { id: string; name: string; code: string };
}
