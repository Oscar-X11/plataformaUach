import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { CARD, FOCUS_RING, TONE_BG, toneFor } from "@/components/dashboard/tone";
import { BTN_SECONDARY } from "@/components/ui/styles";
import { UACH_TIME_ZONE } from "@/lib/dashboard/format";
import type { CalendarItem } from "@/lib/institutional";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Calendario" };

/** México no usa horario de verano desde 2022: la universidad está siempre en UTC-6. */
const OFFSET = "-06:00";
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: UACH_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeOf = new Intl.DateTimeFormat("es-MX", { timeZone: UACH_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const monthTitle = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long", year: "numeric" });
const agendaDay = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const pad = (n: number) => String(n).padStart(2, "0");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "?mes=2026-11" → año y mes; si no es válido, el mes actual en Chiapas. */
function parseMonth(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }
  const [year, month] = dayKey.format(new Date()).split("-").map(Number);
  return { year, month };
}

const shift = (year: number, month: number, delta: number) => {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
};

export default async function CalendarioPage({ searchParams }: { searchParams: { mes?: string } }) {
  const user = await requireUser(["STUDENT", "TEACHER"]);
  const { year, month } = parseMonth(searchParams.mes);
  const next = shift(year, month, 1);
  const from = `${year}-${pad(month)}-01T00:00:00${OFFSET}`;
  const to = `${next}-01T00:00:00${OFFSET}`;
  const items = await serverApi<CalendarItem[]>(
    `/calendar?from=${encodeURIComponent(new Date(from).toISOString())}&to=${encodeURIComponent(new Date(to).toISOString())}`,
  );

  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dayKey.format(new Date(item.dueAt));
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  // Cuadrícula de lunes a domingo que cubre el mes completo.
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((leading + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const today = dayKey.format(new Date());
  const key = (day: number) => `${year}-${pad(month)}-${pad(day)}`;
  const agenda = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  const student = user.role === "STUDENT";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">
            {capitalize(monthTitle.format(first))}
          </h1>
          <p className="mt-1 text-sm text-uach-ink/75">
            {items.length === 0
              ? "Sin entregas este mes."
              : `${items.length} ${items.length === 1 ? "entrega" : "entregas"} este mes.`}
          </p>
        </div>
        <nav aria-label="Cambiar de mes" className="flex gap-2">
          <Link href={`/calendario?mes=${shift(year, month, -1)}`} className={BTN_SECONDARY} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/calendario" className={BTN_SECONDARY}>Hoy</Link>
          <Link href={`/calendario?mes=${next}`} className={BTN_SECONDARY} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </header>

      {/* Cuadrícula (tableta y escritorio). */}
      <div className={`${CARD} hidden overflow-hidden md:block`}>
        <div className="grid grid-cols-7 border-b border-uach-ink/[0.08] bg-uach-canvas text-center text-xs font-medium text-uach-ink/75">
          {WEEKDAYS.map((name) => (
            <div key={name} className="py-2">{name}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            const list = day ? (byDay.get(key(day)) ?? []) : [];
            const isToday = day !== null && key(day) === today;
            return (
              <div
                key={index}
                className={`min-h-[7.5rem] border-b border-r border-uach-ink/[0.06] p-1.5 [&:nth-child(7n)]:border-r-0 ${day ? "" : "bg-uach-canvas/60"}`}
              >
                {day && (
                  <>
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs tabular-nums ${
                        isToday ? "bg-uach-teal font-semibold text-white" : "text-uach-ink/75"
                      }`}
                    >
                      {day}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {list.slice(0, 3).map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/cursos/${item.course.id}/tareas/${item.id}`}
                            title={`${item.title} · ${item.course.name}`}
                            className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] leading-tight text-uach-ink hover:bg-uach-canvas ${FOCUS_RING}`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG[toneFor(item.course.id)]}`} aria-hidden />
                            <span className="min-w-0 truncate">{item.title}</span>
                          </Link>
                        </li>
                      ))}
                      {list.length > 3 && <li className="px-1.5 text-[11px] text-uach-ink/75">+{list.length - 3} más</li>}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (todas las pantallas; en móvil es la vista principal). */}
      <section aria-label="Agenda del mes" className="space-y-3">
        <h2 className="text-base font-semibold text-uach-ink md:sr-only">Agenda</h2>
        {agenda.length === 0 ? (
          <p className={`${CARD} flex items-center justify-center gap-2 px-6 py-10 text-sm text-uach-ink/75 md:hidden`}>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-uach-emerald" strokeWidth={1.75} aria-hidden />
            Nada que entregar este mes
          </p>
        ) : (
          agenda.map(([day, list]) => (
            <div key={day} className={`${CARD} p-2 sm:p-3 md:hidden`}>
              <h3 className={`px-2 pb-1 pt-1 text-sm font-semibold ${day === today ? "text-uach-tealDark" : "text-uach-ink"}`}>
                {capitalize(agendaDay.format(new Date(`${day}T12:00:00Z`)))}
                {day === today && " · hoy"}
              </h3>
              <ul className="divide-y divide-uach-ink/[0.06]">
                {list.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/cursos/${item.course.id}/tareas/${item.id}`}
                      className="press-soft flex min-h-[52px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-uach-canvas"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_BG[toneFor(item.course.id)]}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-uach-ink">{item.title}</span>
                        <span className="block truncate text-xs text-uach-ink/75">
                          {item.course.name} · {timeOf.format(new Date(item.dueAt))}
                        </span>
                      </span>
                      {student && item.state ? (
                        <StateChip state={item.state} />
                      ) : (
                        <span className="shrink-0 text-xs tabular-nums text-uach-ink/75">
                          {item.submitted}/{item.students}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </section>
  );
}
