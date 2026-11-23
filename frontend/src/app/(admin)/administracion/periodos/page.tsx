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
          Licenciaturas e ingenierías usan cuatrimestres; el bachillerato, semestres. Cada tipo tiene su propio periodo
          actual, que se propone por omisión al crear cursos. Cierra un periodo cuando termine: sus cursos se
          conservan.
        </p>
      </header>
      <TermsAdmin terms={terms} />
    </section>
  );
}
