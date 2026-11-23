/**
 * Esqueletos de carga. Aparecen al instante al cambiar de pestaña mientras el
 * servidor prepara la página, para que la navegación no parezca congelada.
 */
const LINE = "shimmer rounded-md";
const CARD = "rounded-2xl border border-uach-ink/[0.08] bg-uach-surface p-5";

function Rows({ count }: { count: number }) {
  return (
    <div className={`${CARD} divide-y divide-uach-ink/[0.06] p-0`}>
      {Array.from({ length: count }, (_, key) => (
        <div key={key} className="flex items-center gap-3 px-5 py-4">
          <div className={`${LINE} h-9 w-9 shrink-0 rounded-full`} />
          <div className="flex-1 space-y-2">
            <div className={`${LINE} h-4 w-2/3`} />
            <div className={`${LINE} h-3 w-1/3`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Página completa: título y lista. */
export function PageSkeleton({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="space-y-3">
        <div className={`${LINE} h-8 w-56 max-w-full`} />
        <div className={`${LINE} h-4 w-80 max-w-full`} />
      </div>
      <Rows count={5} />
    </div>
  );
}

/** Contenido de una pestaña del curso: el encabezado y las pestañas ya están visibles. */
export function TabSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando sección del curso">
      <Rows count={4} />
    </div>
  );
}
