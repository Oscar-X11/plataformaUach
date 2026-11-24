"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { CountUp, ProgressBar } from "@/components/dashboard/primitives";
import { CARD, FOCUS_RING, TONE_BG } from "@/components/dashboard/tone";
import { dayKey, dueUrgency, formatDue, weekDays } from "@/lib/dashboard/format";
import type { DashboardAssignment } from "@/lib/dashboard/types";
import { EASE_OUT, SLIDE_TRANSITION } from "@/lib/motion";

interface WeekItem extends DashboardAssignment {
  done: boolean;
}

export function WeekPanel({
  pending,
  submitted,
  now,
  className,
  style,
}: {
  pending: DashboardAssignment[];
  submitted: DashboardAssignment[];
  now: Date;
  className?: string;
  style?: React.CSSProperties;
}) {
  const days = useMemo(() => weekDays(now), [now]);
  const [selected, setSelected] = useState(() => days.find((day) => day.isToday)?.key ?? days[0].key);

  const byDay = useMemo(() => {
    const keys = new Set(days.map((day) => day.key));
    const map = new Map<string, WeekItem[]>();
    const add = (item: DashboardAssignment, done: boolean) => {
      const key = dayKey(new Date(item.dueAt));
      if (!keys.has(key)) return;
      map.set(key, [...(map.get(key) ?? []), { ...item, done }]);
    };
    submitted.forEach((item) => add(item, true));
    pending.forEach((item) => add(item, false));
    map.forEach((list) => list.sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
    return map;
  }, [days, pending, submitted]);

  const all = Array.from(byDay.values()).flat();
  const doneCount = all.filter((item) => item.done).length;
  const total = all.length;
  const events = byDay.get(selected) ?? [];
  const selectedDay = days.find((day) => day.key === selected);

  return (
    <section aria-labelledby="semana-titulo" style={style} className={`${CARD} p-5 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="semana-titulo" className="text-base font-semibold text-uach-petrol">
          Tu semana
        </h2>
        <Link
          href="/entregas"
          className={`rounded-md text-sm font-medium text-uach-teal transition-colors hover:text-uach-tealDark ${FOCUS_RING}`}
        >
          Mis entregas
        </Link>
      </div>

      <p className="mt-3 text-sm text-uach-ink/75">
        {total === 0 ? (
          "No hay entregas programadas esta semana."
        ) : (
          <>
            Entregaste{" "}
            <CountUp value={doneCount} className="text-lg font-semibold text-uach-petrol" />
            <span className="font-medium text-uach-ink"> de {total}</span>
            {doneCount === total ? " · ¡semana completa!" : ""}
          </>
        )}
      </p>
      {total > 0 && (
        <div className="mt-2">
          <ProgressBar value={doneCount / total} label={`Entregaste ${doneCount} de ${total} esta semana`} />
        </div>
      )}

      <div role="tablist" aria-label="Días de la semana" className="mt-5 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.key === selected;
          const dayItems = byDay.get(day.key) ?? [];
          const hasPending = dayItems.some((item) => !item.done);
          return (
            <button
              key={day.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`${day.long}${dayItems.length ? `, ${dayItems.length} entregas` : ""}`}
              onClick={() => setSelected(day.key)}
              className={`press relative flex min-h-[56px] flex-col items-center justify-center rounded-xl ${FOCUS_RING}`}
            >
              {isSelected && (
                <motion.span
                  layoutId="week-day-indicator"
                  transition={SLIDE_TRANSITION}
                  className="absolute inset-0 rounded-xl bg-uach-petrol"
                  aria-hidden
                />
              )}
              <span
                className={`relative text-[11px] font-medium capitalize transition-colors duration-150 ${
                  isSelected ? "text-white/75" : "text-uach-ink/75"
                }`}
              >
                {day.short}
              </span>
              <span
                className={`relative text-sm font-semibold tabular-nums transition-colors duration-150 ${
                  isSelected ? "text-white" : day.isToday ? "text-uach-teal" : "text-uach-ink"
                }`}
              >
                {day.day}
              </span>
              <span
                aria-hidden
                className={`relative mt-1 h-1 w-1 rounded-full ${
                  dayItems.length === 0
                    ? "bg-transparent"
                    : hasPending
                      ? isSelected
                        ? "bg-amber-200"
                        : "bg-amber-500"
                      : isSelected
                        ? "bg-white/70"
                        : "bg-uach-emerald"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[112px]" role="tabpanel" aria-label={selectedDay?.long}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="space-y-1"
          >
            {events.length === 0 ? (
              <li className="py-3 text-sm text-uach-ink/75">Nada que entregar este día</li>
            ) : (
              events.map((item) => {
                const urgency = dueUrgency(item.dueAt, now);
                const Icon = item.done ? CircleCheck : urgency === "overdue" ? CircleAlert : Clock;
                const iconColor = item.done
                  ? "text-uach-emerald"
                  : urgency === "overdue"
                    ? "text-red-700"
                    : "text-amber-700";
                return (
                  <li key={item.id} className="flex items-start gap-3 py-1.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={2} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          item.done ? "text-uach-ink/75 line-through decoration-uach-ink/30" : "text-uach-ink"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-uach-ink/75">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG[item.tone]}`} aria-hidden />
                        <span className="truncate">{item.courseName}</span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0 tabular-nums">
                          {item.done ? "Entregada" : formatDue(item.dueAt, now)}
                        </span>
                      </span>
                    </span>
                  </li>
                );
              })
            )}
          </motion.ul>
        </AnimatePresence>
      </div>
    </section>
  );
}
