"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CourseTile } from "@/components/dashboard/primitives";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { formatDue, formatGrade, formatRelative } from "@/lib/dashboard/format";
import type { DashboardAssignment, DashboardGrade } from "@/lib/dashboard/types";
import { EASE_OUT } from "@/lib/motion";

function Panel({
  id,
  title,
  action,
  className,
  style,
  children,
}: {
  id: string;
  title: string;
  action?: { href: string; label: string };
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} style={style} className={`${CARD} p-5 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-base font-semibold text-uach-petrol">
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className={`rounded-md text-sm font-medium text-uach-teal transition-colors hover:text-uach-tealDark ${FOCUS_RING}`}
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Entrada escalonada de filas, solo en la primera carga. */
function rowMotion(index: number, animateIn: boolean) {
  return animateIn
    ? {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: EASE_OUT, delay: 0.35 + index * 0.05 },
      }
    : {};
}

export function UpcomingList({
  items,
  now,
  animateIn,
  className,
  style,
}: {
  items: DashboardAssignment[];
  now: Date;
  animateIn: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Panel
      id="proximas-titulo"
      title="Más adelante"
      action={{ href: "/entregas", label: "Ver todo" }}
      className={className}
      style={style}
    >
      {items.length === 0 ? (
        <p className="text-sm leading-relaxed text-uach-ink/75">
          Nada más en el horizonte. Buen momento para repasar o adelantar lecturas.
        </p>
      ) : (
        <ul className="-mx-2">
          {items.map((item, index) => (
            <motion.li key={item.id} {...rowMotion(index, animateIn)}>
              <Link
                href={`/cursos/${item.courseId}/tareas/${item.id}`}
                className={`press-soft flex min-h-[44px] items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-uach-canvas ${FOCUS_RING}`}
              >
                <CourseTile name={item.courseName} tone={item.tone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-uach-ink">{item.title}</span>
                  <span className="block truncate text-xs tabular-nums text-uach-ink/75">
                    {formatDue(item.dueAt, now)} · {item.courseName}
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function GradesList({
  items,
  now,
  animateIn,
  className,
  style,
}: {
  items: DashboardGrade[];
  now: Date;
  animateIn: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Panel id="calificaciones-titulo" title="Calificaciones recientes" className={className} style={style}>
      {items.length === 0 ? (
        <p className="text-sm leading-relaxed text-uach-ink/75">
          Cuando tus docentes califiquen tus trabajos, tus notas aparecerán aquí. ¡Tú tranquilo!
        </p>
      ) : (
        <ul className="-mx-2">
          {items.map((item, index) => {
            const ratio = item.grade / item.points;
            const tint =
              ratio >= 0.9
                ? "bg-uach-emerald/10 text-uach-emerald"
                : ratio >= 0.7
                  ? "bg-uach-teal/10 text-uach-tealDark"
                  : "bg-amber-50 text-amber-800";
            return (
              <motion.li key={item.id} {...rowMotion(index, animateIn)}>
                <Link
                  href={`/cursos/${item.courseId}/calificaciones`}
                  className={`press-soft flex min-h-[44px] items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-uach-canvas ${FOCUS_RING}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-uach-ink">{item.assignmentTitle}</span>
                    <span className="block truncate text-xs text-uach-ink/75">
                      {item.courseName} · {formatRelative(item.gradedAt, now)}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-sm tabular-nums ${tint}`}>
                    <span className="font-semibold">{formatGrade(item.grade)}</span>
                    <span className="opacity-75">/{item.points}</span>
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
