import Link from "next/link";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@/components/dashboard/primitives";
import { StreamBoard } from "@/components/stream/StreamBoard";
import { CARD } from "@/components/dashboard/tone";
import type { AssignmentView, MyProgress, StreamView } from "@/lib/classwork";
import { getCourse } from "@/lib/courses-server";
import { formatDateTime, formatGrade } from "@/lib/dashboard/format";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Tablón del curso" };

export default async function CursoTablonPage({ params }: { params: { cursoId: string } }) {
  const id = encodeURIComponent(params.cursoId);
  const [user, course, stream, assignments] = await Promise.all([
    requireUser(),
    getCourse(params.cursoId),
    serverApi<StreamView>(`/courses/${id}/posts`),
    serverApi<AssignmentView[]>(`/courses/${id}/assignments`),
  ]);
  const progress =
    course.myRole === "student" ? await serverApi<MyProgress>(`/courses/${id}/progress`).catch(() => null) : null;
  const now = new Date();
  const upcoming = assignments
    .filter((item) => item.availability.available)
    .filter((item) => item.dueAt && new Date(item.dueAt) >= now)
    .filter((item) => !item.mySubmission || item.mySubmission.state === "pending")
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <StreamBoard
        courseId={params.cursoId}
        userId={user.id}
        canPost={stream.canPost}
        initialPosts={stream.posts}
        nowIso={now.toISOString()}
      />
      <aside className={`${CARD} p-5 lg:col-start-2 lg:row-start-1`}>
        {progress && (
          <section aria-labelledby="mi-progreso" className="mb-5 border-b border-uach-ink/[0.06] pb-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="mi-progreso" className="text-sm font-semibold text-uach-ink">Tu progreso</h2>
              <span className="text-sm font-semibold tabular-nums text-uach-ink">{progress.percent} %</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={progress.percent / 100} label="Progreso en la clase" />
            </div>
            <p className="mt-2 text-xs text-uach-ink/75">
              {progress.completed} de {progress.total} actividades completadas
              {progress.overdue > 0 && <span className="text-red-700"> · {progress.overdue} vencidas</span>}
            </p>
            {progress.final !== null && (
              <p className="mt-1 text-xs text-uach-ink/75">
                Calificación actual:{" "}
                <span className="font-semibold tabular-nums text-uach-ink">{formatGrade(progress.final)}</span> (aprueba
                con {progress.passingGrade})
              </p>
            )}
          </section>
        )}
        <h2 className="text-sm font-semibold text-uach-ink">Próximas entregas</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-uach-ink/75">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-uach-emerald" strokeWidth={1.75} aria-hidden />
            Nada por entregar pronto
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {upcoming.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/cursos/${params.cursoId}/tareas/${item.id}`}
                  className="press-soft flex min-h-[44px] flex-col justify-center rounded-xl px-2 py-1.5 hover:bg-uach-canvas"
                >
                  <span className="truncate text-sm font-medium text-uach-ink">{item.title}</span>
                  <span className="flex items-center gap-1 text-xs text-uach-ink/75">
                    <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    {formatDateTime(item.dueAt!)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/cursos/${params.cursoId}/tareas`}
          className="mt-3 inline-block text-sm font-medium text-uach-teal hover:text-uach-tealDark"
        >
          Ver todo el trabajo
        </Link>
      </aside>
    </div>
  );
}
