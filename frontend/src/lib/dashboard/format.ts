/**
 * Formato de fechas y números para el dashboard. Todo se calcula en la zona
 * horaria de la universidad, sin importar dónde corra el servidor.
 */

export const UACH_TIME_ZONE = "America/Mexico_City";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: UACH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("es-MX", {
  timeZone: UACH_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const weekdayFormat = new Intl.DateTimeFormat("es-MX", { timeZone: UACH_TIME_ZONE, weekday: "long" });
const shortDateFormat = new Intl.DateTimeFormat("es-MX", {
  timeZone: UACH_TIME_ZONE,
  day: "numeric",
  month: "short",
});
const longDateFormat = new Intl.DateTimeFormat("es-MX", {
  timeZone: UACH_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const hourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: UACH_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});
const gradeFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Días de calendario (en Chiapas) entre `now` y `date`. Negativo si ya pasó. */
export function calendarDayDiff(date: Date, now: Date) {
  const toUtcMidnight = (d: Date) => Date.parse(`${dayKeyFormat.format(d)}T00:00:00Z`);
  return Math.round((toUtcMidnight(date) - toUtcMidnight(now)) / 86_400_000);
}

export type DueUrgency = "overdue" | "today" | "soon" | "later";

export function dueUrgency(dueAt: string, now: Date): DueUrgency {
  const due = new Date(dueAt);
  if (due.getTime() < now.getTime()) return "overdue";
  const diff = calendarDayDiff(due, now);
  if (diff === 0) return "today";
  if (diff === 1) return "soon";
  return "later";
}

/** "Venció hace 2 días", "Hoy, 23:59", "Mañana, 18:59", "Jueves, 23:59", "12 dic". */
export function formatDue(dueAt: string, now: Date) {
  const due = new Date(dueAt);
  const diff = calendarDayDiff(due, now);
  const time = timeFormat.format(due);

  if (due.getTime() < now.getTime()) {
    if (diff === 0) return `Venció hoy a las ${time}`;
    if (diff === -1) return "Venció ayer";
    return `Venció hace ${-diff} días`;
  }
  if (diff === 0) return `Hoy, ${time}`;
  if (diff === 1) return `Mañana, ${time}`;
  if (diff < 7) return `${capitalize(weekdayFormat.format(due))}, ${time}`;
  return shortDateFormat.format(due).replace(".", "");
}

/** "Hace 3 h", "Ayer", "Hace 4 días", "12 nov". */
export function formatRelative(dateIso: string, now: Date) {
  const date = new Date(dateIso);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const diff = -calendarDayDiff(date, now);
  if (diff === 0) return `Hace ${Math.round(minutes / 60)} h`;
  if (diff === 1) return "Ayer";
  if (diff < 7) return `Hace ${diff} días`;
  return shortDateFormat.format(date).replace(".", "");
}

/** "Miércoles 19 de noviembre". */
export function formatLongDate(now: Date) {
  return capitalize(longDateFormat.format(now));
}

export function greetingFor(now: Date) {
  const hour = Number(hourFormat.format(now));
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function formatGrade(value: number) {
  return gradeFormat.format(value);
}

/** Primer nombre para el saludo ("Ana Sofía Ruiz" → "Ana"). */
export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** "vence en 3 h", "vence en 40 min", "venció hace 2 días", "vence mañana, 18:59", "vence el martes". */
export function formatTimeLeft(dueAt: string, now: Date) {
  const due = new Date(dueAt);
  const minutes = Math.round((due.getTime() - now.getTime()) / 60_000);
  const diff = calendarDayDiff(due, now);

  if (minutes < 0) {
    if (diff === 0) return `venció hace ${Math.max(1, Math.round(-minutes / 60))} h`;
    if (diff === -1) return "venció ayer";
    return `venció hace ${-diff} días`;
  }
  if (minutes < 60) return `vence en ${Math.max(1, minutes)} min`;
  if (diff === 0) return `vence en ${Math.round(minutes / 60)} h`;
  if (diff === 1) return `vence mañana, ${timeFormat.format(due)}`;
  if (diff < 7) return `vence el ${weekdayFormat.format(due)}`;
  return `vence el ${shortDateFormat.format(due).replace(".", "")}`;
}

/** Clave de día (YYYY-MM-DD) en la zona horaria de la universidad. */
export function dayKey(date: Date) {
  return dayKeyFormat.format(date);
}

const weekdayShortFormat = new Intl.DateTimeFormat("es-MX", { timeZone: UACH_TIME_ZONE, weekday: "short" });
const dayNumberFormat = new Intl.DateTimeFormat("es-MX", { timeZone: UACH_TIME_ZONE, day: "numeric" });

export interface WeekDay {
  key: string;
  /** "lun", "mar"… */
  short: string;
  /** "Lunes 17 de noviembre" para lectores de pantalla. */
  long: string;
  day: string;
  isToday: boolean;
}

/** Semana de lunes a domingo que contiene `now`. */
export function weekDays(now: Date): WeekDay[] {
  const todayKey = dayKey(now);
  // Mediodía en Chiapas evita saltos de día por zona horaria.
  const noon = new Date(`${todayKey}T12:00:00-06:00`);
  const weekday = (noon.getUTCDay() + 6) % 7; // 0 = lunes
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(noon.getTime() + (index - weekday) * 86_400_000);
    const key = dayKey(date);
    return {
      key,
      short: weekdayShortFormat.format(date).replace(".", ""),
      long: capitalize(longDateFormat.format(date)),
      day: dayNumberFormat.format(date),
      isToday: key === todayKey,
    };
  });
}

const dateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  timeZone: UACH_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "jue 20 nov, 23:59" (hora de la universidad). */
export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso)).replace(/\./g, "");
}
