import { ErrorsAdmin } from "@/components/admin/ErrorsAdmin";
import { CARD } from "@/components/dashboard/tone";

export const metadata = { title: "Errores" };

export default function AdministracionErroresPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Errores</h1>
        <p className="mt-1 max-w-2xl text-sm text-uach-ink/75">
          Problemas que reportan docentes y alumnos, y errores que el sistema registra solo: fallas del servidor y
          pantallas que no cargaron. Los errores iguales se agrupan y se cuentan. Se borran a los 90 días.
        </p>
      </header>
      <div className={`${CARD} p-0`}>
        <div className="p-3 sm:p-4">
          <ErrorsAdmin />
        </div>
      </div>
    </section>
  );
}
