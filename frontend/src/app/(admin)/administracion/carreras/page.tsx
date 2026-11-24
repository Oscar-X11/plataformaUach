import { CatalogAdmin } from "@/components/admin/CatalogAdmin";
import type { CatalogFaculty } from "@/lib/academic";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Carreras" };

export default async function AdministracionCarrerasPage() {
  const catalog = await serverApi<CatalogFaculty[]>("/academic/catalog");
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Carreras</h1>
        <p className="mt-1 max-w-2xl text-sm text-uach-ink/75">
          Carreras por nivel y las materias de cada una. Los docentes eligen el nivel y la materia al crear una clase.
          Licenciaturas e ingenierías van por cuatrimestres; el bachillerato, por semestres. Solo se puede borrar lo
          que no se usa todavía.
        </p>
      </header>
      <CatalogAdmin catalog={catalog} />
    </section>
  );
}
