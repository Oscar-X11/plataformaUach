import Link from "next/link";
import { Download } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { BTN_SECONDARY } from "@/components/ui/styles";
import { formatGrade } from "@/lib/dashboard/format";
import type { CourseReport } from "@/lib/institutional";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Reportes" };

const rateTone = (rate: number | null) =>
  rate === null ? "text-uach-ink/50" : rate >= 80 ? "text-uach-emerald" : rate >= 60 ? "text-amber-800" : "text-red-700";

export default async function ReportesPage({ searchParams }: { searchParams: { periodo?: string } }) {
  const term = searchParams.periodo ?? "";
  const query = term ? `?term=${encodeURIComponent(term)}` : "";
  const report = await serverApi<CourseReport>(`/reports/courses${query}`);
  const totalStudents = report.rows.reduce((sum, row) => sum + row.students, 0);
  const withRate = report.rows.filter((row) => row.deliveryRate !== null);
  const lowDelivery = withRate.filter((row) => (row.deliveryRate ?? 100) < 60).length;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Reportes por curso</h1>
          <p className="mt-1 text-sm text-uach-ink/75">
            {report.rows.length} cursos · {totalStudents} inscripciones
            {lowDelivery > 0 ? ` · ${lowDelivery} con menos del 60 % de entregas` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <nav aria-label="Periodo" className="flex flex-wrap gap-1">
            {["", ...report.terms].map((value) => (
              <Link
                key={value || "todos"}
                href={value ? `/administracion/reportes?periodo=${encodeURIComponent(value)}` : "/administracion/reportes"}
                aria-current={term === value ? "page" : undefined}
                className={`press-soft inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium ${
                  term === value ? "bg-uach-teal/10 text-uach-tealDark" : "text-uach-ink/75 hover:bg-uach-canvas"
                }`}
              >
                {value || "Todos"}
              </Link>
            ))}
          </nav>
          <a href={`/api/reports/courses/export${query}`} className={BTN_SECONDARY} download>
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Exportar CSV
          </a>
        </div>
      </header>

      {report.rows.length === 0 ? (
        <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>No hay cursos en este periodo.</p>
      ) : (
        <div className={`${CARD} overflow-x-auto p-2 sm:p-3`}>
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">Desempeño por curso</caption>
            <thead>
              <tr className="text-left text-xs text-uach-ink/75">
                <th scope="col" className="px-3 py-2 font-medium">Curso</th>
                <th scope="col" className="px-3 py-2 font-medium">Docente</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Alumnos</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Tareas</th>
                <th scope="col" className="px-3 py-2 text-right font-medium" title="Entregas realizadas sobre tareas ya vencidas">% entrega</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.id} className="border-t border-uach-ink/[0.06] hover:bg-uach-canvas">
                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    <Link href={`/cursos/${row.id}`} className="font-medium text-uach-ink hover:text-uach-tealDark">{row.name}</Link>
                    <span className="block text-xs text-uach-ink/75">{row.subject.code} · {row.term}</span>
                  </th>
                  <td className="px-3 py-2.5 text-uach-ink">{row.teacherName}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-uach-ink">{row.students}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-uach-ink">{row.assignments}</td>
                  <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${rateTone(row.deliveryRate)}`}>
                    {row.deliveryRate === null ? "—" : `${row.deliveryRate} %`}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-uach-ink">
                    {row.average === null ? "—" : formatGrade(row.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-uach-ink/75">
        «% entrega» cuenta solo las tareas cuya fecha ya pasó. El promedio usa las calificaciones devueltas (escala 0–10).
      </p>
    </section>
  );
}
