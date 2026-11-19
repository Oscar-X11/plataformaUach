import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock } from "lucide-react";
import { CourseTile } from "@/components/dashboard/primitives";
import { CARD, FOCUS_RING, toneFor } from "@/components/dashboard/tone";
import { BTN_PRIMARY } from "@/components/ui/styles";
import type { TeacherDashboardData } from "@/lib/dashboard/api";
import { firstName, formatDateTime, formatLongDate, formatRelative, greetingFor } from "@/lib/dashboard/format";

function summary(toReview: number, upcoming: number) {
  if (toReview === 0 && upcoming === 0) return "Todo al día: no hay entregas por calificar.";
  const review = toReview === 1 ? "1 entrega por calificar" : `${toReview} entregas por calificar`;
  if (upcoming === 0) return `Tienes ${review}.`;
  const due = upcoming === 1 ? "1 tarea vence" : `${upcoming} tareas vencen`;
  return toReview === 0 ? `${due} en los próximos días.` : `Tienes ${review} y ${due} pronto.`;
}

export function TeacherDashboard({
  fullName,
  data,
  nowIso,
}: {
  fullName: string;
  data: TeacherDashboardData;
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const toReviewTotal = data.courses.reduce((sum, course) => sum + course.toReview, 0);

  return (
    <div className="space-y-6 lg:space-y-8">
      <header>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-uach-petrol sm:text-4xl">
          {greetingFor(now)}, {firstName(fullName)} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-2 text-[15px] text-uach-ink">{summary(toReviewTotal, data.upcoming.length)}</p>
        <p className="mt-1 text-sm text-uach-ink/75">{formatLongDate(now)}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="por-calificar" className="rounded-2xl bg-uach-petrol p-5 text-white sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="por-calificar" className="text-base font-semibold">Por calificar</h2>
            <Link href="/entregas" className="text-sm font-medium text-white/80 hover:text-white">Ver todas</Link>
          </div>
          {data.toReview.length === 0 ? (
            <p className="mt-5 text-2xl font-semibold tracking-tight">Nada pendiente 🎉</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {data.toReview.map((item) => (
                <li key={`${item.assignmentId}-${item.student.id}`}>
                  <Link
                    href={`/cursos/${item.courseId}/tareas/${item.assignmentId}`}
                    className={`press-soft flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.07] ${FOCUS_RING} focus-visible:ring-offset-uach-petrol`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.student.fullName}</span>
                      <span className="block truncate text-xs text-white/70">
                        {item.title} · {item.courseName}
                      </span>
                    </span>
                    <span className={`shrink-0 text-xs ${item.late ? "text-amber-100" : "text-white/70"}`}>
                      {item.late ? "Tarde · " : ""}
                      {item.submittedAt ? formatRelative(item.submittedAt, now) : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="proximas" className={`${CARD} p-5`}>
          <h2 id="proximas" className="text-base font-semibold text-uach-petrol">Próximas entregas</h2>
          {data.upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-uach-ink/75">No hay tareas que venzan en las próximas dos semanas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-uach-ink/[0.06]">
              {data.upcoming.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/cursos/${item.courseId}/tareas/${item.id}`}
                    className={`press-soft flex min-h-[52px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-uach-canvas ${FOCUS_RING}`}
                  >
                    <CalendarClock className="h-4 w-4 shrink-0 text-uach-teal" strokeWidth={1.75} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-uach-ink">{item.title}</span>
                      <span className="block truncate text-xs text-uach-ink/75">
                        {item.courseName} · {formatDateTime(item.dueAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-uach-ink/75">
                      {item.submitted}/{item.students}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="mis-clases">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="mis-clases" className="text-lg font-semibold tracking-tight text-uach-petrol">Mis clases</h2>
          <Link href="/cursos" className="text-sm font-medium text-uach-teal hover:text-uach-tealDark">Ver todas</Link>
        </div>
        {data.courses.length === 0 ? (
          <div className={`${CARD} mt-3 flex flex-col items-center px-6 py-12 text-center`}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-uach-teal/10 text-uach-teal">
              <BookOpen className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="mt-4 font-semibold text-uach-petrol">Tu primera clase empieza aquí</p>
            <p className="mt-1 max-w-sm text-sm text-uach-ink/75">Crea un curso y comparte su código con tus alumnos.</p>
            <Link href="/cursos" className={`${BTN_PRIMARY} mt-4`}>Crear curso</Link>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/cursos/${course.id}`}
                  className={`${CARD} lift group flex h-full flex-col gap-3 p-5 ${FOCUS_RING}`}
                >
                  <div className="flex items-start gap-3">
                    <CourseTile name={course.name} tone={toneFor(course.id)} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-uach-ink">{course.name}</p>
                      <p className="truncate text-sm text-uach-ink/75">{course.subjectCode} · {course.term}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-3 text-sm text-uach-ink/75">
                    <span className="tabular-nums">{course.studentCount} alumnos</span>
                    <span aria-hidden>·</span>
                    <span className={course.toReview ? "font-medium text-uach-tealDark" : ""}>
                      {course.toReview ? `${course.toReview} por calificar` : `${course.assignmentCount} tareas`}
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 text-uach-teal transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
