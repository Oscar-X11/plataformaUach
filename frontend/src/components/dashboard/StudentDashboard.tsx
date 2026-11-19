"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BookOpen, Info } from "lucide-react";
import { AnnouncementsPanel } from "@/components/dashboard/AnnouncementsPanel";
import { ContinueCard, CourseCard } from "@/components/dashboard/CourseCard";
import { NextUp } from "@/components/dashboard/NextUp";
import { GradesList, UpcomingList } from "@/components/dashboard/SideLists";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { WeekPanel } from "@/components/dashboard/WeekPanel";
import {
  calendarDayDiff,
  dueUrgency,
  firstName,
  formatLongDate,
  greetingFor,
} from "@/lib/dashboard/format";
import type { StudentDashboardData } from "@/lib/dashboard/types";
import { useFirstLoad } from "@/lib/motion";

/** Índice de la entrada escalonada (50ms entre bloques). */
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

function summary(overdue: number, thisWeek: number) {
  if (overdue === 0 && thisWeek === 0) return "Estás al día 🎉 No tienes entregas pendientes esta semana.";
  const week = thisWeek === 1 ? "1 entrega esta semana" : `${thisWeek} entregas esta semana`;
  if (overdue === 0) return `Tienes ${week}. ¡Tú puedes!`;
  const late = overdue === 1 ? "1 atrasada" : `${overdue} atrasadas`;
  return thisWeek > 0 ? `Tienes ${week} y ${late}. Empecemos por lo urgente.` : `Tienes ${late}. Empecemos por ahí.`;
}

export function StudentDashboard({
  fullName,
  data,
  nowIso,
}: {
  fullName: string;
  data: StudentDashboardData;
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const animateIn = useFirstLoad();
  const pending = data.pending;
  const urgent = pending.filter((item) => dueUrgency(item.dueAt, now) !== "later");
  const later = pending.filter((item) => dueUrgency(item.dueAt, now) === "later");
  const overdue = urgent.filter((item) => dueUrgency(item.dueAt, now) === "overdue").length;
  const dueThisWeek = pending.filter((item) => {
    const diff = calendarDayDiff(new Date(item.dueAt), now);
    return dueUrgency(item.dueAt, now) !== "overdue" && diff < 7;
  }).length;

  const [featured, ...otherCourses] = useMemo(() => {
    const index = data.courses.findIndex((course) => course.lastActivity);
    if (index <= 0) return data.courses;
    return [data.courses[index], ...data.courses.filter((_, i) => i !== index)];
  }, [data.courses]);

  return (
    <div data-enter={animateIn ? "" : undefined} className="space-y-6 lg:space-y-8">
      <header className="enter flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-uach-petrol sm:text-4xl">
            {greetingFor(now)}, {firstName(fullName)} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-[15px] text-uach-ink">{summary(overdue, dueThisWeek)}</p>
          <p className="mt-1 text-sm text-uach-ink/75">
            {formatLongDate(now)} · {data.term}
          </p>
        </div>
        {data.isSample && (
          <p
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-uach-ink/[0.08] bg-uach-surface px-3 py-1 text-xs font-medium text-uach-ink/75 sm:self-auto"
            title="La información es ilustrativa."
          >
            <Info className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Datos de ejemplo
          </p>
        )}
      </header>

      {/* Bento superior: lo urgente, la semana y los avisos al mismo nivel. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <NextUp
          items={urgent}
          upcomingTitle={later[0]?.title ?? null}
          now={now}
          className="enter md:col-span-2 xl:col-span-1"
          style={stagger(1)}
        />
        <WeekPanel
          pending={pending}
          submitted={data.recentlySubmitted}
          now={now}
          className="enter"
          style={stagger(2)}
        />
        <AnnouncementsPanel
          items={data.announcements}
          now={now}
          animateIn={animateIn}
          className="enter"
          style={stagger(3)}
        />
      </div>

      {/* Cursos + listas laterales. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section aria-labelledby="cursos-titulo" className="enter xl:col-span-8" style={stagger(4)}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="cursos-titulo" className="text-lg font-semibold tracking-tight text-uach-petrol">
              Mis cursos
            </h2>
            <Link
              href="/cursos"
              className={`rounded-md text-sm font-medium text-uach-teal transition-colors hover:text-uach-tealDark ${FOCUS_RING}`}
            >
              Ver todos
            </Link>
          </div>

          {data.courses.length === 0 ? (
            <div className={`mt-3 flex flex-col items-center px-6 py-12 text-center ${CARD}`}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-uach-teal/10 text-uach-teal">
                <BookOpen className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
              <p className="mt-4 font-semibold text-uach-petrol">Tu semestre empieza aquí</p>
              <p className="mt-1 max-w-sm text-sm text-uach-ink/75">
                Pide a tu docente el código de invitación y únete a tu primer curso.
              </p>
              <Link
                href="/cursos"
                className={`press mt-5 inline-flex h-11 items-center rounded-xl bg-uach-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-uach-tealDark ${FOCUS_RING}`}
              >
                Unirme con código
              </Link>
            </div>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {featured && (
                <li className="sm:col-span-2">
                  <ContinueCard course={featured} now={now} />
                </li>
              )}
              {otherCourses.map((course) => (
                <li key={course.id}>
                  <CourseCard course={course} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-1 content-start gap-4 md:grid-cols-2 xl:col-span-4 xl:grid-cols-1 xl:pt-10">
          <UpcomingList items={later} now={now} animateIn={animateIn} className="enter" style={stagger(5)} />
          <GradesList items={data.recentGrades} now={now} animateIn={animateIn} className="enter" style={stagger(6)} />
        </div>
      </div>
    </div>
  );
}
