import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import type { ClassworkOverview, SubmissionState } from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Entregas" };

interface Row {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  state: SubmissionState;
  trailing?: string;
}

function Group({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return (
    <section aria-label={title} className={`${CARD} p-2 sm:p-3`}>
      <h2 className="flex items-baseline justify-between px-2 pb-2 pt-1 text-base font-semibold text-uach-ink">
        {title}
        <span className="text-sm font-normal tabular-nums text-uach-ink/75">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-uach-canvas px-4 py-5 text-sm text-uach-ink/75">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-uach-emerald" strokeWidth={1.75} aria-hidden />
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-uach-ink/[0.06]">
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className={`press-soft group flex min-h-[56px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-uach-canvas ${FOCUS_RING}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-uach-ink">{row.title}</span>
                  <span className="block truncate text-xs text-uach-ink/75">{row.subtitle}</span>
                </span>
                {row.trailing && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-uach-ink">{row.trailing}</span>
                )}
                <StateChip state={row.state} />
                <ChevronRight className="h-4 w-4 shrink-0 text-uach-ink/40" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const due = (dueAt: string | null) => (dueAt ? `vence ${formatDateTime(dueAt)}` : "sin fecha");

export default async function EntregasPage() {
  await requireUser(["STUDENT", "TEACHER"]);
  const data = await serverApi<ClassworkOverview>("/classwork/overview");

  if (data.role === "teacher") {
    const rows: Row[] = data.items.map((item) => ({
      key: `${item.id}-${item.student.id}`,
      href: `/cursos/${item.course.id}/tareas/${item.id}`,
      title: `${item.student.fullName} · ${item.title}`,
      subtitle: item.submittedAt
        ? `${item.course.name} · entregada ${formatDateTime(item.submittedAt)}`
        : item.course.name,
      state: item.state,
    }));
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Entregas por calificar</h1>
          <p className="mt-1 text-sm text-uach-ink/75">Las más antiguas primero, de todos tus cursos.</p>
        </header>
        <Group title="Por calificar" rows={rows} empty="No tienes entregas pendientes de revisar" />
      </section>
    );
  }

  const toRow = (item: (typeof data.items)[number]): Row => ({
    key: item.id,
    href: `/cursos/${item.course.id}/tareas/${item.id}`,
    title: item.title,
    subtitle: `${item.course.name} · ${due(item.dueAt)}`,
    state: item.submission.state,
    trailing: item.submission.grade !== null ? `${item.submission.grade}/${item.points}` : undefined,
  });
  const todo = data.items.filter((i) => i.submission.state === "missing" || i.submission.state === "pending");
  // Primero lo atrasado; dentro de cada grupo se conserva el orden por fecha.
  todo.sort((a, b) => Number(b.submission.state === "missing") - Number(a.submission.state === "missing"));
  const done = data.items.filter((i) => i.submission.state === "submitted" || i.submission.state === "late");
  const graded = data.items.filter((i) => i.submission.state === "returned");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Mis entregas</h1>
        <p className="mt-1 text-sm text-uach-ink/75">Todas tus tareas, de todos tus cursos.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
        <Group title="Por entregar" rows={todo.map(toRow)} empty="Estás al día" />
        <div className="space-y-4">
          <Group title="Entregadas" rows={done.map(toRow)} empty="Nada esperando calificación." />
          <Group title="Calificadas" rows={graded.map(toRow)} empty="Aún no te devuelven tareas." />
        </div>
      </div>
    </section>
  );
}
