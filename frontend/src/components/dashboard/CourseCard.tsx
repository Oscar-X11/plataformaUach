"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { CourseTile, ProgressBar } from "@/components/dashboard/primitives";
import { CARD, FOCUS_RING, URGENCY_TEXT } from "@/components/dashboard/tone";
import { dueUrgency, formatGrade, formatRelative, formatTimeLeft } from "@/lib/dashboard/format";
import type { DashboardCourse } from "@/lib/dashboard/types";

function Progress({ course }: { course: DashboardCourse }) {
  const ratio = course.assignmentCount > 0 ? course.submittedCount / course.assignmentCount : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-uach-ink/75">
          <span className="font-medium tabular-nums text-uach-ink">
            {course.submittedCount}/{course.assignmentCount}
          </span>{" "}
          entregadas
        </span>
        <span className="tabular-nums text-uach-ink/75">
          {course.average === null ? (
            "Sin calificar"
          ) : (
            <>
              Promedio <span className="font-semibold text-uach-ink">{formatGrade(course.average)}</span>
            </>
          )}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={ratio}
          tone={course.tone}
          label={`${course.name}: ${course.submittedCount} de ${course.assignmentCount} tareas entregadas`}
        />
      </div>
    </div>
  );
}

function NextDue({ course, now }: { course: DashboardCourse; now: Date }) {
  if (!course.nextDue) {
    return <p className="text-xs text-uach-emerald">Al corriente ✓</p>;
  }
  const urgency = dueUrgency(course.nextDue.dueAt, now);
  return (
    <p className="flex min-w-0 items-center gap-2 text-xs">
      <Clock className={`h-3.5 w-3.5 shrink-0 ${URGENCY_TEXT[urgency]}`} strokeWidth={2} aria-hidden />
      <span className="truncate text-uach-ink/75">{course.nextDue.title}</span>
      <span className={`ml-auto shrink-0 font-medium tabular-nums ${URGENCY_TEXT[urgency]}`}>
        {formatTimeLeft(course.nextDue.dueAt, now)}
      </span>
    </p>
  );
}

/** Tarjeta destacada: el curso donde el alumno se quedó. */
export function ContinueCard({ course, now }: { course: DashboardCourse; now: Date }) {
  return (
    <Link
      href={`/cursos/${course.id}`}
      className={`lift group flex h-full flex-col p-5 sm:p-6 ${CARD} ${FOCUS_RING}`}
    >
      <div className="flex items-center gap-4">
        <CourseTile name={course.name} tone={course.tone} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold tracking-tight text-uach-petrol">{course.name}</h3>
          <p className="truncate text-sm text-uach-ink/75">
            {course.subjectCode} · {course.teacherName}
          </p>
        </div>
      </div>
      {course.lastActivity && (
        <p className="mt-4 rounded-xl bg-uach-teal/[0.07] px-3.5 py-3 text-sm leading-relaxed text-uach-ink">
          <span className="font-semibold text-uach-tealDark">Continúa donde te quedaste: </span>
          {course.lastActivity.label.charAt(0).toLowerCase() + course.lastActivity.label.slice(1)}
          <span className="text-uach-ink/75"> · {formatRelative(course.lastActivity.at, now).toLowerCase()}</span>
        </p>
      )}
      <div className="mt-5">
        <Progress course={course} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <div className="min-w-0 flex-1">
          <NextDue course={course} now={now} />
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-uach-teal">
          Continuar
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}

export function CourseCard({ course, now }: { course: DashboardCourse; now: Date }) {
  return (
    <Link href={`/cursos/${course.id}`} className={`lift flex h-full flex-col p-5 ${CARD} ${FOCUS_RING}`}>
      <div className="flex items-start gap-3">
        <CourseTile name={course.name} tone={course.tone} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-semibold leading-snug text-uach-petrol [text-wrap:balance]">
            {course.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-uach-ink/75">{course.teacherName}</p>
        </div>
      </div>
      <div className="mb-4 mt-5">
        <Progress course={course} />
      </div>
      <div className="mt-auto border-t border-uach-ink/[0.07] pt-3">
        <NextDue course={course} now={now} />
      </div>
    </Link>
  );
}
