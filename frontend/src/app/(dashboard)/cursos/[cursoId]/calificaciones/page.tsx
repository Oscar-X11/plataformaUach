import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { WeightsEditor } from "@/components/classwork/WeightsEditor";
import { CARD } from "@/components/dashboard/tone";
import { BTN_SECONDARY } from "@/components/ui/styles";
import type { CourseGrades } from "@/lib/classwork";
import { formatGrade } from "@/lib/dashboard/format";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Calificaciones" };

const show = (value: number | null) => (value === null ? "—" : formatGrade(value));

function Situation({ passed }: { passed: boolean | null }) {
  if (passed === null) return <span className="text-xs text-uach-ink/50">—</span>;
  return passed ? (
    <span className="rounded-full bg-uach-emerald/10 px-2 py-0.5 text-xs font-medium text-uach-emerald">Aprobado</span>
  ) : (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">No aprobado</span>
  );
}

function LockedNotice() {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-uach-canvas px-3 py-2 text-sm text-uach-ink/80">
      <Lock className="h-4 w-4 shrink-0 text-uach-ink/60" strokeWidth={1.75} aria-hidden />
      El periodo está cerrado: las calificaciones ya no se pueden cambiar.
    </p>
  );
}

const QUIZ_STATUS: Record<string, string> = {
  not_started: "Sin responder",
  in_progress: "En curso",
  submitted: "Enviado",
};

export default async function CalificacionesPage({ params }: { params: { cursoId: string } }) {
  const id = encodeURIComponent(params.cursoId);
  const data = await serverApi<CourseGrades>(`/courses/${id}/grades`);

  if (data.assignments.length === 0 && data.quizzes.length === 0) {
    return (
      <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>
        Todavía no hay tareas ni cuestionarios en este curso, así que no hay calificaciones.
      </p>
    );
  }

  if (data.role === "student") {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          {data.locked && <LockedNotice />}
          {data.assignments.length > 0 && (
            <section aria-labelledby="cal-tareas" className={`${CARD} p-2`}>
              <h2 id="cal-tareas" className="px-3 pb-1 pt-2 text-sm font-semibold text-uach-ink">Tareas</h2>
              <ul className="divide-y divide-uach-ink/[0.06]">
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
            </section>
          )}
          {data.quizzes.length > 0 && (
            <section aria-labelledby="cal-cuestionarios" className={`${CARD} p-2`}>
              <h2 id="cal-cuestionarios" className="px-3 pb-1 pt-2 text-sm font-semibold text-uach-ink">Cuestionarios</h2>
              <ul className="divide-y divide-uach-ink/[0.06]">
                {data.quizzes.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/cursos/${params.cursoId}/cuestionarios/${item.id}`}
                      className="press-soft flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 hover:bg-uach-canvas"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-uach-ink">{item.title}</span>
                        <span className="block text-xs text-uach-ink/75">
                          {QUIZ_STATUS[item.status]}
                          {item.needsReview && " · por revisar"}
                        </span>
                      </span>
                      <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-uach-ink">
                        {show(item.score)}
                        <span className="font-normal text-uach-ink/60">/{item.points}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <section className="rounded-2xl bg-uach-petrol p-5 text-white">
          <h2 className="text-sm text-white/80">Tu calificación en el curso</h2>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{show(data.final)}</p>
          {data.passed !== null && (
            <p className="mt-1 text-sm font-medium">{data.passed ? "Vas aprobando" : "Por debajo del aprobatorio"}</p>
          )}
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-white/80">Tareas ({data.weights.assignments} %)</dt>
              <dd className="tabular-nums">{show(data.assignmentsAverage)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-white/80">Cuestionarios ({data.weights.quizzes} %)</dt>
              <dd className="tabular-nums">{show(data.quizzesAverage)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-white/70">
            Escala 0–10; aprueba con {data.passing}. Solo cuenta lo que tu docente ya calificó y los resultados que puedes ver.
          </p>
        </section>
      </div>
    );
  }

  const cell = "border-t border-uach-ink/[0.06] px-3 py-2";
  return (
    <section className={`${CARD} space-y-3 p-2 sm:p-3`}>
      <div className="flex flex-col gap-3 px-2 pt-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-uach-ink">Libro de calificaciones</h2>
          <p className="text-xs text-uach-ink/75">
            Las cifras en gris aún no se devuelven al alumno. Los promedios solo cuentan lo devuelto.
          </p>
          <WeightsEditor courseId={params.cursoId} weights={data.weights} passing={data.passing} readOnly={data.role === "admin"} />
        </div>
        {/* Enlace normal: la cookie de sesión viaja con la descarga. */}
        <a href={`/api/courses/${id}/grades/export`} className={`${BTN_SECONDARY} shrink-0`} download>
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Exportar CSV
        </a>
      </div>
      {data.locked && (
        <div className="px-2">
          <LockedNotice />
        </div>
      )}
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
                {data.quizzes.map((quiz) => (
                  <th key={quiz.id} scope="col" className="max-w-[10rem] bg-uach-canvas/60 px-3 py-2 font-medium">
                    <Link href={`/cursos/${params.cursoId}/cuestionarios/${quiz.id}`} className="line-clamp-2 hover:text-uach-tealDark">
                      {quiz.title}
                    </Link>
                    <span className="block font-normal text-uach-ink/60">Cuestionario /{quiz.points}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">Tareas</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Cuest.</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Final</th>
                <th scope="col" className="px-3 py-2 font-medium">Situación</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.id} className="hover:bg-uach-canvas">
                  <th scope="row" className={`sticky left-0 z-10 bg-uach-surface text-left font-normal ${cell}`}>
                    <span className="block font-medium text-uach-ink">{student.fullName}</span>
                    <span className="block text-xs tabular-nums text-uach-ink/75">{student.username}</span>
                  </th>
                  {student.cells.map((item) => (
                    <td key={item.assignmentId} className={`${cell} tabular-nums`}>
                      {item.grade !== null ? (
                        <span className={item.returned ? "font-medium text-uach-ink" : "text-uach-ink/50"}>
                          {formatGrade(item.grade)}
                        </span>
                      ) : item.state === "missing" ? (
                        <span className="text-xs text-red-700">Sin entregar</span>
                      ) : item.state === "submitted" || item.state === "late" ? (
                        <span className="text-xs text-uach-emerald">Por calificar</span>
                      ) : (
                        <span className="text-uach-ink/40">—</span>
                      )}
                    </td>
                  ))}
                  {student.quizCells.map((item) => (
                    <td key={item.quizId} className={`${cell} bg-uach-canvas/40 tabular-nums`}>
                      {!item.submitted ? (
                        <span className="text-uach-ink/40">—</span>
                      ) : item.needsReview ? (
                        <span className="text-xs text-uach-emerald">Por revisar</span>
                      ) : (
                        <span className="font-medium text-uach-ink">{show(item.score)}</span>
                      )}
                    </td>
                  ))}
                  <td className={`${cell} text-right tabular-nums text-uach-ink`}>{show(student.assignmentsAverage)}</td>
                  <td className={`${cell} text-right tabular-nums text-uach-ink`}>{show(student.quizzesAverage)}</td>
                  <td className={`${cell} text-right font-semibold tabular-nums text-uach-ink`}>{show(student.final)}</td>
                  <td className={cell}>
                    <Situation passed={student.passed} />
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
