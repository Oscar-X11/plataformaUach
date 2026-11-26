import { RepositoryBrowser } from "@/components/repository/RepositoryBrowser";
import type { SubjectOptionLite } from "@/lib/classwork";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Repositorio" };

const VIEWS = { mios: "mine", revisar: "review" } as const;

export default async function RepositorioPage({ searchParams }: { searchParams: { vista?: string } }) {
  const [user, subjects] = await Promise.all([
    requireUser(),
    serverApi<SubjectOptionLite[]>("/academic/subjects"),
  ]);
  const initialView = VIEWS[searchParams.vista as keyof typeof VIEWS] ?? "explore";

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-uach-petrol p-5 text-white sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Repositorio institucional</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/80">
          Apuntes, guías de estudio y lecturas de la comunidad UACH, organizados por materia.
          {user.role === "STUDENT" ? " Lo que compartas se revisa antes de publicarse." : ""}
        </p>
      </header>
      <RepositoryBrowser subjects={subjects} userId={user.id} role={user.role} initialView={initialView} />
    </section>
  );
}
