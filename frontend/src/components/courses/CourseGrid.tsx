import Link from "next/link";
import { courseLabel } from "@/lib/courses";
import { ArrowRight, UsersRound } from "lucide-react";
import { CourseTile } from "@/components/dashboard/primitives";
import { CARD, FOCUS_RING, toneFor } from "@/components/dashboard/tone";
import type { CourseSummary } from "@/lib/courses";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function CourseGrid({ courses }: { courses: CourseSummary[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <li key={course.id}>
          <Link
            href={`/cursos/${course.id}`}
            className={`${CARD} lift group flex h-full flex-col gap-4 p-5 ${FOCUS_RING}`}
          >
            <div className="flex items-start gap-3">
              <CourseTile name={course.name} tone={toneFor(course.id)} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-uach-ink">{course.name}</h2>
                <p className="truncate text-sm text-uach-ink/75">
                  {courseLabel(course)} · {course.term}
                </p>
              </div>
            </div>
            <div className="mt-auto flex items-center gap-3 text-sm text-uach-ink/75">
              <span className="min-w-0 truncate">
                {course.myRole === "student" ? course.teacher.fullName : course.career.name}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5 tabular-nums">
                <UsersRound className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {plural(course.studentCount, "alumno", "alumnos")}
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-uach-teal transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
