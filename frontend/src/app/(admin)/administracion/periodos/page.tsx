import { TermsAdmin } from "@/components/admin/TermsAdmin";
import type { AcademicTerm } from "@/lib/academic";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Periodos" };

export default async function AdministracionPeriodosPage() {
  const terms = await serverApi<AcademicTerm[]>("/academic/terms");
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Periodos</h1>
        <p className="mt-1 max-w-2xl text-sm text-uach-ink/75">
          Los docentes solo pueden crear cursos en periodos abiertos, y el periodo actual es el que se propone por
          omisión. Cierra un semestre cuando termine: sus cursos se conservan.
        </p>
      </header>
      <TermsAdmin terms={terms} />
    </section>
  );
}
