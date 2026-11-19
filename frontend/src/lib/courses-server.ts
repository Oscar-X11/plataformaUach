import { cache } from "react";
import type { CourseSummary } from "@/lib/courses";
import { serverApi } from "@/lib/server-session";

/** Curso validado por el backend (404 si no pertenece). Una consulta por petición. */
export const getCourse = cache((courseId: string) =>
  serverApi<CourseSummary>(`/courses/${encodeURIComponent(courseId)}`),
);
