import { GroupsBrowser } from "@/components/groups/GroupsBrowser";
import type { SubjectOptionLite } from "@/lib/classwork";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Grupos de estudio" };

export default async function GruposEstudioPage() {
  const [user, subjects] = await Promise.all([
    requireUser(),
    serverApi<SubjectOptionLite[]>("/academic/subjects"),
  ]);
  const admin = user.role === "ADMIN";
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Grupos de estudio</h1>
        <p className="mt-1 text-sm text-uach-ink/75">
          {admin
            ? "Consulta los grupos que arman alumnos y docentes. Puedes borrar los que no cumplan las normas."
            : "Encuentra con quién repasar o arma tu propio grupo, con cupo y lugar de reunión."}
        </p>
      </header>
      <GroupsBrowser subjects={subjects} canCreate={!admin} />
    </section>
  );
}
