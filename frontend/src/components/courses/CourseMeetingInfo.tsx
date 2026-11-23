"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, MapPin, Pencil } from "lucide-react";
import { MeetingInfo } from "@/components/ui/MeetingInfo";
import { api, ApiError } from "@/lib/api";

/**
 * Lugar y horario del curso en el encabezado. El docente (o un admin) lo edita
 * en línea; los alumnos solo lo ven si existe.
 */
export function CourseMeetingInfo({
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
    const meetingInfo = String(new FormData(event.currentTarget).get("meetingInfo") ?? "");
    setBusy(true);
    setError(null);
    try {
      const course = await api<{ meetingInfo: string | null }>(`/courses/${courseId}/meeting`, {
        method: "PATCH",
        body: { meetingInfo },
      });
      setValue(course.meetingInfo);
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
      <form onSubmit={save} className="mt-3 max-w-xl space-y-2">
        <label htmlFor={`meeting-${courseId}`} className="block text-xs font-medium text-white/80">
          Lugar y horario, o enlace de la reunión
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`meeting-${courseId}`}
            name="meetingInfo"
            defaultValue={value ?? ""}
            maxLength={200}
            autoFocus
            placeholder="Lun y mié 8:00, salón 12 · o enlace de Meet"
            className="h-11 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white ring-1 ring-white/20 placeholder:text-white/50 focus:outline-none focus:ring-[3px] focus:ring-white/40"
          />
          <div className="flex gap-2">
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
          </div>
        </div>
        <p className="text-xs text-white/60">Déjalo vacío para quitarlo.</p>
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
    <div className="mt-2 flex items-start gap-2 text-sm text-white/80">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {value ? (
        <MeetingInfo text={value} linkClassName="text-white hover:text-white/80" />
      ) : (
        <span className="text-white/60">Sin lugar ni horario</span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="press-soft -my-1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={value ? "Editar lugar y horario" : "Agregar lugar y horario"}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {value ? "Editar" : "Agregar"}
        </button>
      )}
    </div>
  );
}
