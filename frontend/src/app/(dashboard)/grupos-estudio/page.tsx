import { GroupsBrowser } from "@/components/groups/GroupsBrowser";
import type { SubjectOptionLite } from "@/lib/classwork";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Grupos de estudio" };

export default async function GruposEstudioPage() {
  const subjects = await serverApi<SubjectOptionLite[]>("/academic/subjects");
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Grupos de estudio</h1>
        <p className="mt-1 text-sm text-uach-ink/75">
          Encuentra con quién repasar o arma tu propio grupo, con cupo y lugar de reunión.
        </p>
      </header>
      <GroupsBrowser subjects={subjects} />
    </section>
  );
}
