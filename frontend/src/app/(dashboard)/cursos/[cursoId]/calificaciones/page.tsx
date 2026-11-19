import Link from "next/link";
import { Download } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { CARD } from "@/components/dashboard/tone";
import { BTN_SECONDARY } from "@/components/ui/styles";
import type { CourseGrades } from "@/lib/classwork";
import { formatGrade } from "@/lib/dashboard/format";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Calificaciones" };

const show = (value: number | null) => (value === null ? "—" : formatGrade(value));

export default async function CalificacionesPage({ params }: { params: { cursoId: string } }) {
  const id = encodeURIComponent(params.cursoId);
  const data = await serverApi<CourseGrades>(`/courses/${id}/grades`);

  if (data.assignments.length === 0) {
    return (
      <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>
        Todavía no hay tareas en este curso, así que no hay calificaciones.
      </p>
    );
  }

  if (data.role === "student") {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <ul className={`${CARD} divide-y divide-uach-ink/[0.06] p-2`}>
          {data.assignments.map((item) => (
            <li key={item.id}>
              <Link
                href={`/cursos/${params.cursoId}/tareas/${item.id}`}
                className="press-soft flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 hover:bg-uach-canvas"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-uach-ink">{item.title}</span>
                  {item.feedback && (
                    <span className="block truncate text-xs text-uach-ink/75">“{item.feedback}”</span>
                  )}
                </span>
                <StateChip state={item.state} />
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-uach-ink">
                  {show(item.grade)}
                  <span className="font-normal text-uach-ink/60">/{item.points}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <section className="rounded-2xl bg-uach-petrol p-5 text-white">
          <h2 className="text-sm text-white/80">Tu promedio en el curso</h2>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{show(data.average)}</p>
          <p className="mt-2 text-xs text-white/70">
            Escala 0–10. Solo cuenta lo que tu docente ya calificó y devolvió.
          </p>
        </section>
      </div>
    );
  }

  return (
    <section className={`${CARD} p-2 sm:p-3`}>
      <div className="flex flex-col gap-3 px-2 pb-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-uach-ink">Libro de calificaciones</h2>
          <p className="text-xs text-uach-ink/75">
            Las cifras en gris aún no se devuelven al alumno. El promedio solo cuenta lo devuelto.
          </p>
        </div>
        {/* Enlace normal: la cookie de sesión viaja con la descarga. */}
        <a href={`/api/courses/${id}/grades/export`} className={BTN_SECONDARY} download>
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Exportar CSV
        </a>
      </div>
      {data.students.length === 0 ? (
        <p className="rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">
          Aún no hay alumnos inscritos.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-uach-ink/75">
                <th scope="col" className="sticky left-0 z-10 bg-uach-surface px-3 py-2 font-medium">Alumno</th>
                {data.assignments.map((assignment) => (
                  <th key={assignment.id} scope="col" className="max-w-[10rem] px-3 py-2 font-medium">
                    <Link href={`/cursos/${params.cursoId}/tareas/${assignment.id}`} className="line-clamp-2 hover:text-uach-tealDark">
                      {assignment.title}
                    </Link>
                    <span className="block font-normal text-uach-ink/60">/{assignment.points}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.id} className="hover:bg-uach-canvas">
                  <th scope="row" className="sticky left-0 z-10 border-t border-uach-ink/[0.06] bg-uach-surface px-3 py-2 text-left font-normal">
                    <span className="block font-medium text-uach-ink">{student.fullName}</span>
                    <span className="block text-xs tabular-nums text-uach-ink/75">{student.username}</span>
                  </th>
                  {student.cells.map((cell) => (
                    <td key={cell.assignmentId} className="border-t border-uach-ink/[0.06] px-3 py-2 tabular-nums">
                      {cell.grade !== null ? (
                        <span className={cell.returned ? "font-medium text-uach-ink" : "text-uach-ink/50"}>
                          {formatGrade(cell.grade)}
                        </span>
                      ) : cell.state === "missing" ? (
                        <span className="text-xs text-red-700">Sin entregar</span>
                      ) : cell.state === "submitted" || cell.state === "late" ? (
                        <span className="text-xs text-uach-emerald">Por calificar</span>
                      ) : (
                        <span className="text-uach-ink/40">—</span>
                      )}
                    </td>
                  ))}
                  <td className="border-t border-uach-ink/[0.06] px-3 py-2 text-right font-semibold tabular-nums text-uach-ink">
                    {show(student.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
