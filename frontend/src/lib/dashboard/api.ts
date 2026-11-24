import { toneFor } from "@/components/dashboard/tone";
import type { StudentDashboardData } from "@/lib/dashboard/types";

/** Respuesta de GET /dashboard/student: igual que la vista pero sin el color del curso. */
type WithoutTone<T> = T extends { tone: unknown } ? Omit<T, "tone"> : T;
export interface StudentDashboardResponse
  extends Omit<StudentDashboardData, "courses" | "pending" | "recentlySubmitted" | "recentGrades"> {
  courses: WithoutTone<StudentDashboardData["courses"][number]>[];
  pending: WithoutTone<StudentDashboardData["pending"][number]>[];
  recentlySubmitted: WithoutTone<StudentDashboardData["recentlySubmitted"][number]>[];
  recentGrades: WithoutTone<StudentDashboardData["recentGrades"][number]>[];
}

/** Asigna a cada curso su color estable (el backend no conoce la paleta). */
export function withTones(data: StudentDashboardResponse): StudentDashboardData {
  const tone = <T extends { courseId: string }>(item: T) => ({ ...item, tone: toneFor(item.courseId) });
  return {
    ...data,
    courses: data.courses.map((course) => ({ ...course, tone: toneFor(course.id) })),
    pending: data.pending.map(tone),
    recentlySubmitted: data.recentlySubmitted.map(tone),
    recentGrades: data.recentGrades.map(tone),
  };
}

export interface TeacherDashboardData {
  courses: {
    id: string;
    name: string;
    term: string;
    subjectCode: string;
    studentCount: number;
    assignmentCount: number;
    toReview: number;
  }[];
  upcoming: {
    id: string;
    title: string;
    dueAt: string;
    courseId: string;
    courseName: string;
    submitted: number;
    students: number;
  }[];
  toReview: {
    assignmentId: string;
    title: string;
    courseId: string;
    courseName: string;
    student: { id: string; fullName: string };
    submittedAt: string | null;
    late: boolean;
  }[];
}
