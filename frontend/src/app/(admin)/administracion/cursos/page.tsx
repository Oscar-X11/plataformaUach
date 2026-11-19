import { CourseGrid } from "@/components/courses/CourseGrid";
import { CARD } from "@/components/dashboard/tone";
import type { CourseSummary } from "@/lib/courses";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Cursos de la plataforma" };

export default async function AdministracionCursosPage() {
  const courses = await serverApi<CourseSummary[]>("/courses");
  const students = courses.reduce((sum, course) => sum + course.studentCount, 0);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Cursos</h1>
        <p className="mt-1 text-sm text-uach-ink/75">
          {courses.length} cursos · {students} inscripciones. Entra a cualquiera para ver su trabajo y
          calificaciones.
        </p>
      </header>
      {courses.length > 0 ? (
        <CourseGrid courses={courses} />
      ) : (
        <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>
          Todavía no hay cursos. Aparecerán cuando los docentes los creen.
        </p>
      )}
    </section>
  );
}
