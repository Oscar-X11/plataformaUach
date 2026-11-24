import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { ProgressBar } from "@/components/dashboard/primitives";
import { CARD } from "@/components/dashboard/tone";
import type { CourseTracking } from "@/lib/classwork";
import { canManage } from "@/lib/courses";
import { getCourse } from "@/lib/courses-server";
import { formatDateTime, formatGrade } from "@/lib/dashboard/format";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Seguimiento" };

const show = (value: number | null) => (value === null ? "—" : formatGrade(value));

export default async function SeguimientoPage({
  params,
  searchParams,
}: {
  params: { cursoId: string };
  searchParams: { riesgo?: string };
}) {
  const course = await getCourse(params.cursoId);
  if (!canManage(course)) notFound();
  const data = await serverApi<CourseTracking>(`/courses/${encodeURIComponent(params.cursoId)}/tracking`);
  const onlyRisk = searchParams.riesgo === "1";
  const rows = onlyRisk ? data.students.filter((row) => row.risk.length > 0) : data.students;
  const meanProgress = data.students.length
    ? Math.round(data.students.reduce((sum, row) => sum + row.percent, 0) / data.students.length)
    : 0;
  const base = `/cursos/${params.cursoId}/seguimiento`;
  const cell = "border-t border-uach-ink/[0.06] px-3 py-2.5";

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={`${CARD} p-4`}>
          <dt className="text-xs text-uach-ink/75">Alumnos</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-uach-ink">{data.students.length}</dd>
        </div>
        <div className={`${CARD} p-4`}>
          <dt className="text-xs text-uach-ink/75">Avance promedio</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-uach-ink">{meanProgress} %</dd>
        </div>
        <div className={`${CARD} p-4`}>
          <dt className="text-xs text-uach-ink/75">En riesgo</dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums ${data.atRisk ? "text-red-700" : "text-uach-ink"}`}>
            {data.atRisk}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="seg-alumnos" className={`${CARD} p-2 sm:p-3`}>
        <div className="flex flex-col gap-2 px-2 pb-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="seg-alumnos" className="text-base font-semibold text-uach-ink">Progreso por alumno</h2>
            <p className="text-xs text-uach-ink/75">
              En riesgo: 2 o más actividades vencidas sin entregar, o promedio menor a {data.passing}.
            </p>
          </div>
          <div role="tablist" aria-label="Filtrar alumnos" className="flex gap-1">
            <Link
              role="tab"
              aria-selected={!onlyRisk}
              href={base}
              className={`press-soft flex h-9 items-center rounded-lg px-3 text-xs font-medium ${
                !onlyRisk ? "bg-uach-teal/10 text-uach-tealDark" : "text-uach-ink/75 hover:bg-uach-canvas"
              }`}
            >
              Todos <span className="ml-1 tabular-nums">{data.students.length}</span>
            </Link>
            <Link
              role="tab"
              aria-selected={onlyRisk}
              href={`${base}?riesgo=1`}
              className={`press-soft flex h-9 items-center rounded-lg px-3 text-xs font-medium ${
                onlyRisk ? "bg-red-50 text-red-700" : "text-uach-ink/75 hover:bg-uach-canvas"
              }`}
            >
              En riesgo <span className="ml-1 tabular-nums">{data.atRisk}</span>
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">
            {data.students.length === 0 ? "Aún no hay alumnos inscritos." : "Nadie en riesgo por ahora."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-uach-ink/75">
                  <th scope="col" className="px-3 py-2 font-medium">Alumno</th>
                  <th scope="col" className="w-48 px-3 py-2 font-medium">Avance</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Vencidas</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Final</th>
                  <th scope="col" className="px-3 py-2 font-medium">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student.id} className="align-top hover:bg-uach-canvas">
                    <th scope="row" className={`${cell} text-left font-normal`}>
                      <span className="block font-medium text-uach-ink">{row.student.fullName}</span>
                      <span className="block text-xs tabular-nums text-uach-ink/75">{row.student.username}</span>
                      {row.risk.length > 0 && (
                        <span className="mt-1 flex items-start gap-1 text-xs text-red-700">
                          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                          <span>
                            <span className="sr-only">En riesgo: </span>
                            {row.risk.join(" · ")}
                          </span>
                        </span>
                      )}
                    </th>
                    <td className={cell}>
                      <span className="mb-1 flex justify-between text-xs tabular-nums text-uach-ink/75">
                        <span>
                          {row.completed}/{row.total}
                        </span>
                        <span>{row.percent} %</span>
                      </span>
                      <ProgressBar
                        value={row.percent / 100}
                        label={`Avance de ${row.student.fullName}`}
                        tone={row.risk.length ? "ink" : "teal"}
                      />
                    </td>
                    <td className={`${cell} text-right tabular-nums ${row.overdue ? "text-red-700" : "text-uach-ink/75"}`}>
                      {row.overdue}
                    </td>
                    <td className={`${cell} text-right font-semibold tabular-nums text-uach-ink`}>{show(row.final)}</td>
                    <td className={`${cell} text-xs text-uach-ink/75`}>
                      {row.lastActivityAt ? formatDateTime(row.lastActivityAt) : "Sin actividad"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="seg-bitacora" className={`${CARD} p-3 sm:p-4`}>
        <h2 id="seg-bitacora" className="px-2 pb-2 text-base font-semibold text-uach-ink">Actividad de la clase</h2>
        <ActivityFeed courseId={params.cursoId} />
      </section>
    </div>
  );
}
