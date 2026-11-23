import { AdminCoursesTable } from "@/components/admin/AdminCoursesTable";
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
          {courses.length} cursos · {students} inscripciones. Entra a cualquiera para ver su trabajo y calificaciones, o
          cambia el docente que lo imparte.
        </p>
      </header>
      <AdminCoursesTable initialCourses={courses} />
    </section>
  );
}
