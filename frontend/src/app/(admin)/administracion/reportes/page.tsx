import Link from "next/link";
import { Download, Info } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { formatGrade } from "@/lib/dashboard/format";
import type { CourseReport, ReportOptions, StudentRiskReport } from "@/lib/institutional";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Reportes" };

type View = "cursos" | "alumnos";

interface Search {
  periodo?: string;
  carrera?: string;
  vista?: string;
}

const rateTone = (rate: number | null) =>
  rate === null ? "text-uach-ink/50" : rate >= 80 ? "text-uach-emerald" : rate >= 60 ? "text-amber-800" : "text-red-700";

const countTone = (value: number) => (value > 0 ? "font-semibold text-red-700" : "text-uach-ink/60");

/** Arma la URL de la página conservando los filtros. */
function pageHref(view: View, term: string, career: string) {
  const params = new URLSearchParams();
  if (view === "alumnos") params.set("vista", "alumnos");
  if (term) params.set("periodo", term);
  if (career) params.set("carrera", career);
  const query = params.toString();
  return `/administracion/reportes${query ? `?${query}` : ""}`;
}

export default async function ReportesPage({ searchParams }: { searchParams: Search }) {
  const view: View = searchParams.vista === "alumnos" ? "alumnos" : "cursos";
  const term = (searchParams.periodo ?? "").slice(0, 20);
  const career = (searchParams.carrera ?? "").slice(0, 40);
  const api = new URLSearchParams();
  if (term) api.set("term", term);
  if (career) api.set("career", career);
  const query = api.toString() ? `?${api.toString()}` : "";
  const endpoint = view === "alumnos" ? "/reports/students" : "/reports/courses";

  const report =
    view === "alumnos"
      ? { view, data: await serverApi<StudentRiskReport>(`${endpoint}${query}`) }
      : { view, data: await serverApi<CourseReport>(`${endpoint}${query}`) };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Reportes</h1>
        <p className="text-sm text-uach-ink/75">Seguimiento de clases y alumnos para coordinación y tutorías.</p>
      </header>

      <nav aria-label="Tipo de reporte" className="flex gap-1 border-b border-uach-ink/10">
        {(
          [
            ["cursos", "Por curso"],
            ["alumnos", "Alumnos en riesgo"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={pageHref(value, term, career)}
            aria-current={view === value ? "page" : undefined}
            className={`-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium ${
              view === value
                ? "border-uach-teal text-uach-tealDark"
                : "border-transparent text-uach-ink/75 hover:text-uach-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <Filters view={view} term={term} career={career} options={report.data} exportHref={`/api${endpoint}/export${query}`} />

      <p className="flex gap-2 rounded-xl bg-uach-canvas px-4 py-3 text-xs text-uach-ink/80">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-uach-ink/60" strokeWidth={1.75} aria-hidden />
        <span>
          Los números solo reflejan lo que se registra en la plataforma. Si un docente recibe trabajos o califica por
          otro medio, su clase aparecerá con entregas bajas o pendientes aunque vaya bien. Confirma con el docente
          antes de sacar conclusiones.
        </span>
      </p>

      {report.view === "alumnos" ? <StudentsView data={report.data} /> : <CoursesView data={report.data} />}
    </section>
  );
}

function Filters({
  view,
  term,
  career,
  options,
  exportHref,
}: {
  view: View;
  term: string;
  career: string;
  options: ReportOptions;
  exportHref: string;
}) {
  return (
    <form method="get" action="/administracion/reportes" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {view === "alumnos" ? <input type="hidden" name="vista" value="alumnos" /> : null}
      <label className="block text-xs font-medium text-uach-ink/75 sm:w-44">
        Periodo
        <select name="periodo" defaultValue={term} className={`${INPUT} mt-1 h-11 py-0`}>
          <option value="">Todos</option>
          {options.terms.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-uach-ink/75 sm:w-80">
        Carrera
        <select name="carrera" defaultValue={career} className={`${INPUT} mt-1 h-11 py-0`}>
          <option value="">Todas</option>
          {options.careers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} — {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className={BTN_SECONDARY}>
          Aplicar
        </button>
        <a href={exportHref} className={BTN_SECONDARY} download>
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Exportar CSV
        </a>
      </div>
    </form>
  );
}

function CoursesView({ data }: { data: CourseReport }) {
  const totalStudents = data.rows.reduce((sum, row) => sum + row.students, 0);
  const lowDelivery = data.rows.filter((row) => row.deliveryRate !== null && row.deliveryRate < 60).length;
  const ungraded = data.rows.reduce((sum, row) => sum + row.ungraded, 0);

  if (data.rows.length === 0) {
    return <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>No hay cursos con estos filtros.</p>;
  }
  return (
    <>
      <p className="text-sm text-uach-ink/75">
        {data.rows.length} cursos · {totalStudents} inscripciones
        {lowDelivery > 0 ? ` · ${lowDelivery} con menos del 60 % de entregas` : ""}
        {ungraded > 0 ? ` · ${ungraded} entregas sin calificar` : ""}
      </p>
      <div className={`${CARD} overflow-x-auto p-2 sm:p-3`}>
        <table className="w-full min-w-[48rem] text-sm">
          <caption className="sr-only">Seguimiento por curso</caption>
          <thead>
            <tr className="text-left text-xs text-uach-ink/75">
              <th scope="col" className="px-3 py-2 font-medium">Curso</th>
              <th scope="col" className="px-3 py-2 font-medium">Docente</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Alumnos</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Tareas</th>
              <th scope="col" className="px-3 py-2 text-right font-medium" title="Entregas realizadas sobre tareas ya vencidas">
                % entrega
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium" title="Entregas que el docente aún no califica ni devuelve">
                Sin calificar
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium" title="Alumnos con 2 o más actividades vencidas o calificación reprobatoria">
                En riesgo
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t border-uach-ink/[0.06] hover:bg-uach-canvas">
                <th scope="row" className="px-3 py-2.5 text-left font-normal">
                  <Link href={`/cursos/${row.id}/seguimiento`} className="font-medium text-uach-ink hover:text-uach-tealDark">
                    {row.name}
                  </Link>
                  <span className="block text-xs text-uach-ink/75">
                    {row.label} · {row.term}
                  </span>
                </th>
                <td className="px-3 py-2.5 text-uach-ink">{row.teacherName}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-uach-ink">{row.students}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-uach-ink">{row.assignments}</td>
                <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${rateTone(row.deliveryRate)}`}>
                  {row.deliveryRate === null ? "—" : `${row.deliveryRate} %`}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${row.ungraded > 0 ? "font-medium text-amber-800" : "text-uach-ink/60"}`}>
                  {row.ungraded}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {row.atRisk > 0 ? (
                    <Link
                      href={`/cursos/${row.id}/seguimiento?riesgo=1`}
                      className={`${countTone(row.atRisk)} underline-offset-2 hover:underline`}
                    >
                      {row.atRisk}
                    </Link>
                  ) : (
                    <span className={countTone(0)}>0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-uach-ink/75">
        Abre un curso para ver su seguimiento por alumno. «% entrega» cuenta solo las tareas cuya fecha ya pasó. «En
        riesgo»: 2 o más actividades vencidas sin entregar, o calificación actual menor a la aprobatoria.
      </p>
    </>
  );
}

function StudentsView({ data }: { data: StudentRiskReport }) {
  if (data.students.length === 0) {
    return (
      <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>
        {data.coursesChecked === 0 ? "No hay cursos con estos filtros." : "Ningún alumno está en riesgo con estos filtros."}
      </p>
    );
  }
  const multiple = data.students.filter((entry) => entry.courses.length > 1).length;
  return (
    <>
      <p className="text-sm text-uach-ink/75">
        {data.students.length} alumnos en riesgo en {data.coursesChecked} cursos revisados
        {multiple > 0 ? ` · ${multiple} en más de una clase` : ""}
      </p>
      <div className={`${CARD} overflow-x-auto p-2 sm:p-3`}>
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Alumnos en riesgo</caption>
          <thead>
            <tr className="text-left text-xs text-uach-ink/75">
              <th scope="col" className="px-3 py-2 font-medium">Alumno</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Clases</th>
              <th scope="col" className="px-3 py-2 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((entry) => (
              <tr key={entry.student.id} className="border-t border-uach-ink/[0.06] align-top">
                <th scope="row" className="px-3 py-2.5 text-left font-normal">
                  <span className="font-medium text-uach-ink">{entry.student.fullName}</span>
                  <span className="block text-xs tabular-nums text-uach-ink/75">{entry.student.username}</span>
                </th>
                <td className={`px-3 py-2.5 text-right tabular-nums ${entry.courses.length > 1 ? "font-semibold text-red-700" : "text-uach-ink"}`}>
                  {entry.courses.length}
                </td>
                <td className="px-3 py-2.5">
                  <ul className="space-y-1.5">
                    {entry.courses.map((course) => (
                      <li key={course.id}>
                        <Link
                          href={`/cursos/${course.id}/seguimiento?riesgo=1`}
                          className="font-medium text-uach-ink hover:text-uach-tealDark"
                        >
                          {course.name}
                        </Link>
                        <span className="text-xs text-uach-ink/75">
                          {" "}
                          · {course.label} · {course.term}
                          {course.final !== null ? ` · calificación actual ${formatGrade(course.final)}` : ""}
                        </span>
                        <span className="block text-xs text-red-700">{course.risk.join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
