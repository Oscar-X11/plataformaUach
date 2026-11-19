"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Upload } from "lucide-react";
import { FOCUS_RING, TONE_BG } from "@/components/dashboard/tone";
import { dueUrgency, formatTimeLeft, type DueUrgency } from "@/lib/dashboard/format";
import type { DashboardAssignment } from "@/lib/dashboard/types";
import { EASE_OUT } from "@/lib/motion";

/** Sobre fondo petróleo los estados usan tonos claros para mantener contraste AA. */
const ON_DARK: Record<DueUrgency, { chip: string; text: string; label: string }> = {
  overdue: { chip: "bg-red-300/15 text-red-200", text: "text-red-200", label: "Atrasada" },
  today: { chip: "bg-amber-200/15 text-amber-100", text: "text-amber-100", label: "Vence hoy" },
  soon: { chip: "bg-amber-200/15 text-amber-100", text: "text-amber-100", label: "Vence mañana" },
  later: { chip: "bg-white/10 text-white/85", text: "text-white/85", label: "Próxima" },
};

export function NextUp({
  items,
  upcomingTitle,
  now,
  className,
  style,
}: {
  items: DashboardAssignment[];
  upcomingTitle: string | null;
  now: Date;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [hero, ...rest] = items;

  const urgency = hero ? dueUrgency(hero.dueAt, now) : "later";

  return (
    <section
      aria-labelledby="sigue-titulo"
      style={style}
      className={`relative flex flex-col overflow-hidden rounded-2xl bg-uach-petrol p-5 text-white sm:p-6 ${className ?? ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sigue-titulo" className="text-base font-semibold">
          Lo que sigue
        </h2>
        {items.length > 1 && (
          <span className="text-sm tabular-nums text-white/70">{items.length} urgentes</span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {hero ? (
          <motion.div
            key={hero.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.16, ease: EASE_OUT } }}
            className="mt-5"
          >
            <p className="flex items-center gap-2 text-sm text-white/80">
              <span className={`h-2 w-2 rounded-full ring-2 ring-white/30 ${TONE_BG[hero.tone]}`} aria-hidden />
              {hero.courseName}
            </p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight [text-wrap:balance]">
              {hero.title}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ON_DARK[urgency].chip}`}>
                {ON_DARK[urgency].label}
              </span>
              <span className="text-sm tabular-nums text-white/85">{formatTimeLeft(hero.dueAt, now)}</span>
              <span className="text-sm text-white/60" aria-hidden>
                ·
              </span>
              <span className="text-sm tabular-nums text-white/70">{hero.points} pts</span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/cursos/${hero.courseId}/tareas/${hero.id}`}
                className={`press inline-flex h-11 items-center gap-2 rounded-xl bg-uach-teal px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-uach-teal/85 ${FOCUS_RING} focus-visible:ring-offset-uach-petrol`}
              >
                <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
                Abrir y entregar
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="al-dia"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } }}
            className="mt-5"
          >
            <p className="text-2xl font-semibold tracking-tight sm:text-[28px]">Estás al día 🎉</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              No tienes nada atrasado ni por vencer en las próximas horas.
              {upcomingTitle ? ` Si quieres adelantar, lo siguiente es “${upcomingTitle}”.` : " Disfruta el respiro."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {rest.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4 xl:mt-auto">
          <h3 className="text-xs font-medium text-white/70">Después</h3>
          <ul className="mt-2 space-y-1.5">
            <AnimatePresence initial={false}>
              {rest.slice(0, 3).map((item) => {
                const itemUrgency = dueUrgency(item.dueAt, now);
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.14 } }}
                    transition={{ duration: 0.24, ease: EASE_OUT }}
                  >
                    <Link
                      href={`/cursos/${item.courseId}/tareas/${item.id}`}
                      className={`press-soft group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.07] ${FOCUS_RING} focus-visible:ring-offset-uach-petrol`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_BG[item.tone]} ring-2 ring-white/25`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-white/70">
                          {item.courseName} ·{" "}
                          <span className={`font-medium tabular-nums ${ON_DARK[itemUrgency].text}`}>
                            {formatTimeLeft(item.dueAt, now)}
                          </span>
                        </span>
                      </span>
                      <ArrowRight
                        className="hidden h-4 w-4 shrink-0 text-white/50 transition-transform duration-150 group-hover:translate-x-0.5 sm:block"
                        aria-hidden
                      />
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </section>
  );
}
