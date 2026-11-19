import { RemoveStudentButton } from "@/components/courses/RemoveStudentButton";
import { CARD } from "@/components/dashboard/tone";
import { canManage, type CoursePeople } from "@/lib/courses";
import { getCourse } from "@/lib/courses-server";
import { serverApi } from "@/lib/server-session";
import { initials } from "@/lib/session";

export const metadata = { title: "Personas del curso" };

const joinedFormat = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
});

function Avatar({ name, tone = "teal" }: { name: string; tone?: "teal" | "petrol" }) {
  return (
    <span
      aria-hidden
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ${
        tone === "petrol" ? "bg-uach-petrol" : "bg-uach-tealDark"
      }`}
    >
      {initials(name)}
    </span>
  );
}

export default async function PersonasPage({ params }: { params: { cursoId: string } }) {
  const [course, people] = await Promise.all([
    getCourse(params.cursoId),
    serverApi<CoursePeople>(`/courses/${encodeURIComponent(params.cursoId)}/people`),
  ]);
  const manager = canManage(course);
  const count = people.students.length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
      <section className={`${CARD} p-5`}>
        <h2 className="text-base font-semibold text-uach-ink">Docente</h2>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={people.teacher.fullName} tone="petrol" />
          <p className="min-w-0 truncate text-sm font-medium text-uach-ink">{people.teacher.fullName}</p>
        </div>
      </section>

      <section className={`${CARD} p-5`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-uach-ink">Alumnos</h2>
          <span className="text-sm tabular-nums text-uach-ink/75">
            {count} {count === 1 ? "inscrito" : "inscritos"}
          </span>
        </div>

        {count === 0 ? (
          <p className="mt-4 rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">
            {manager && course.invitation ? (
              <>
                Todavía no se une nadie. Comparte el código{" "}
                <span className="font-mono font-semibold tracking-wider text-uach-ink">{course.invitation}</span>{" "}
                con tu grupo.
              </>
            ) : (
              "Todavía no hay más alumnos en este curso."
            )}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-uach-ink/[0.06]">
            {people.students.map((student) => (
              <li key={student.id} className="flex min-h-[56px] items-center gap-3 py-2">
                <Avatar name={student.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-uach-ink">{student.fullName}</p>
                  {student.username && (
                    <p className="truncate text-xs tabular-nums text-uach-ink/75">
                      {student.username} · se unió el {joinedFormat.format(new Date(student.joinedAt)).replace(".", "")}
                    </p>
                  )}
                </div>
                {manager && (
                  <RemoveStudentButton
                    courseId={course.id}
                    studentId={student.id}
                    studentName={student.fullName}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
