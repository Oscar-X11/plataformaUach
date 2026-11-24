import { CourseMeetingInfo } from "@/components/courses/CourseMeetingInfo";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { InvitationCode } from "@/components/courses/InvitationCode";
import { getCourse } from "@/lib/courses-server";

export default async function CursoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { cursoId: string };
}) {
  const course = await getCourse(params.cursoId);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-uach-petrol p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-white/80">
              {course.subject.code} · {course.subject.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{course.name}</h1>
            {course.description && (
              <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/85">{course.description}</p>
            )}
            <p className="mt-2 text-sm text-white/80">
              Periodo {course.term} · {course.teacher.fullName}
            </p>
            <CourseMeetingInfo
              courseId={course.id}
              initial={course.meetingInfo ?? null}
              canEdit={course.myRole !== "student"}
            />
          </div>
          {course.invitation && (
            <div className="lg:w-80">
              <InvitationCode courseId={course.id} initialCode={course.invitation} />
            </div>
          )}
        </div>
      </header>

      <CourseTabs courseId={course.id} />
      <div>{children}</div>
    </section>
  );
}
