import { BookOpen } from "lucide-react";
import { CourseGrid } from "@/components/courses/CourseGrid";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";
import { JoinCourseForm } from "@/components/courses/JoinCourseForm";
import { CARD } from "@/components/dashboard/tone";
import type { CourseSummary } from "@/lib/courses";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Cursos" };

const COPY = {
  STUDENT: {
    title: "Mis cursos",
    intro: "Tus clases del periodo. Para entrar a una nueva, pide el código a tu docente.",
    empty: "Aún no estás en ningún curso",
    emptyHint: "Escribe arriba el código que te dio tu docente y aparecerá aquí.",
  },
  TEACHER: {
    title: "Mis clases",
    intro: "Crea un curso y comparte su código de invitación con tus alumnos.",
    empty: "Tu primera clase empieza aquí",
    emptyHint: "Crea un curso, comparte el código y tus alumnos se unirán solos.",
  },
  ADMIN: {
    title: "Cursos",
    intro: "Todos los cursos de la plataforma.",
    empty: "Todavía no hay cursos",
    emptyHint: "Los cursos aparecerán cuando los docentes los creen.",
  },
} as const;

export default async function CursosPage() {
  const user = await requireUser();
  const courses = await serverApi<CourseSummary[]>("/courses");
  const copy = COPY[user.role];

  return (
    <section className="space-y-6 lg:space-y-8">
      <header className="rounded-2xl bg-uach-petrol p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="mt-1.5 text-sm text-white/80">{copy.intro}</p>
          </div>
          {user.role === "STUDENT" && <JoinCourseForm />}
          {user.role === "TEACHER" && courses.length > 0 && <CreateCourseForm />}
        </div>
      </header>

      {courses.length > 0 ? (
        <CourseGrid courses={courses} />
      ) : user.role === "TEACHER" ? (
        <CreateCourseForm startOpen />
      ) : (
        <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
            <BookOpen className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-uach-ink">{copy.empty}</h2>
          <p className="mt-1 max-w-sm text-sm text-uach-ink/75">{copy.emptyHint}</p>
        </div>
      )}
    </section>
  );
}
