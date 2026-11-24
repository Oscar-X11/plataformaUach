"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { api, ApiError } from "@/lib/api";

/**
 * Descripción de la clase en el encabezado. El docente (o un admin) la edita
 * en línea; los alumnos solo la ven si existe.
 */
export function CourseDescription({
  courseId,
  initial,
  canEdit,
}: {
  courseId: string;
  initial: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = String(new FormData(event.currentTarget).get("description") ?? "");
    setBusy(true);
    setError(null);
    try {
      const course = await api<{ description: string | null }>(`/courses/${courseId}/description`, {
        method: "PATCH",
        body: { description },
      });
      setValue(course.description);
      setEditing(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mt-3 max-w-2xl space-y-2">
        <label htmlFor={`description-${courseId}`} className="block text-xs font-medium text-white/80">
          Descripción de la clase
        </label>
        <textarea
          id={`description-${courseId}`}
          name="description"
          defaultValue={value ?? ""}
          rows={3}
          maxLength={2000}
          autoFocus
          placeholder="De qué trata la clase, horario de asesorías, reglas…"
          className="block w-full resize-y rounded-xl bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/20 placeholder:text-white/50 focus:outline-none focus:ring-[3px] focus:ring-white/40"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="press inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-uach-petrol disabled:opacity-60"
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="press-soft h-11 rounded-xl px-4 text-sm font-medium text-white/80 hover:bg-white/10"
          >
            Cancelar
          </button>
          <span className="text-xs text-white/60">Déjala vacía para quitarla.</span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-white">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (!value && !canEdit) return null;

  return (
    <div className="mt-2 flex max-w-2xl items-start gap-2">
      {value ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/85">{value}</p>
      ) : (
        <p className="text-sm text-white/60">Sin descripción</p>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="press-soft -my-1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={value ? "Editar descripción" : "Agregar descripción"}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {value ? "Editar" : "Agregar"}
        </button>
      )}
    </div>
  );
}
