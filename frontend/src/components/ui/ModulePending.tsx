import { Construction } from "lucide-react";

/** Marcador temporal para ventanas cuya funcionalidad se implementa en fases posteriores. */
export function ModulePending({
  title,
  description,
  phase,
  embedded = false,
}: {
  title: string;
  description: string;
  phase: 1 | 2 | 3;
  /** Dentro de una página que ya tiene su propio <h1> (p. ej. el curso). */
  embedded?: boolean;
}) {
  const Heading = embedded ? "h2" : "h1";
  return (
    <section>
      <Heading
        className={
          embedded
            ? "text-lg font-semibold text-uach-ink"
            : "text-2xl font-semibold tracking-tight text-uach-petrol"
        }
      >
        {title}
      </Heading>
      <div className="mt-6 flex flex-col items-center rounded-2xl bg-uach-surface px-6 py-14 text-center shadow-uach-card">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
          <Construction className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 max-w-md text-sm text-uach-muted">{description}</p>
        <p className="mt-3 rounded-full bg-uach-canvas px-3 py-1 text-xs font-medium text-uach-soft">
          Disponible en la fase {phase}
        </p>
      </div>
    </section>
  );
}
