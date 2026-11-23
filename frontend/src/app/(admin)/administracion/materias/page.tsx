import { CatalogAdmin } from "@/components/admin/CatalogAdmin";
import type { CatalogFaculty } from "@/lib/academic";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Materias" };

export default async function AdministracionMateriasPage() {
  const catalog = await serverApi<CatalogFaculty[]>("/academic/catalog");
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Materias</h1>
        <p className="mt-1 max-w-2xl text-sm text-uach-ink/75">
          Materias de cada carrera, agrupadas por facultad. Los docentes eligen la materia al crear un curso.
          Licenciaturas e ingenierías van por cuatrimestres; el bachillerato, por semestres. Solo se puede borrar lo
          que no se usa todavía.
        </p>
      </header>
      <CatalogAdmin catalog={catalog} />
    </section>
  );
}
