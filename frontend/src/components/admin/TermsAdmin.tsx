"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, LoaderCircle, Lock, LockOpen, Pencil, Star, Trash2 } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { formatTermDate, type AcademicTerm } from "@/lib/academic";
import { api, ApiError } from "@/lib/api";

function TermForm({ term, onDone }: { term?: AcademicTerm; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      ...(term ? {} : { code: form.get("code") }),
      name: form.get("name"),
      startsAt: form.get("startsAt") || null,
      endsAt: form.get("endsAt") || null,
    };
    setBusy(true);
    setError(null);
    try {
      await api(term ? `/academic/terms/${term.id}` : "/academic/terms", { method: term ? "PATCH" : "POST", body });
      onDone();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar el periodo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className={`${CARD} space-y-4 p-5`}>
      <h2 className="text-base font-semibold text-uach-ink">{term ? `Editar ${term.code}` : "Nuevo periodo"}</h2>
      {error && <FormAlert message={error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <label htmlFor="term-code" className="mb-1.5 block text-sm font-medium text-uach-ink">Clave</label>
          <input
            id="term-code"
            name="code"
            required
            maxLength={30}
            placeholder="2027-1"
            defaultValue={term?.code}
            disabled={Boolean(term)}
            autoFocus={!term}
            className={INPUT}
          />
          {!term && <p className="mt-1 text-xs text-uach-ink/60">La ven docentes y alumnos. No se puede cambiar después.</p>}
        </div>
        <div>
          <label htmlFor="term-name" className="mb-1.5 block text-sm font-medium text-uach-ink">Nombre</label>
          <input
            id="term-name"
            name="name"
            required
            maxLength={80}
            placeholder="Enero – Junio 2027"
            defaultValue={term?.name}
            autoFocus={Boolean(term)}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="term-start" className="mb-1.5 block text-sm font-medium text-uach-ink">Inicio</label>
          <input id="term-start" name="startsAt" type="date" defaultValue={term?.startsAt?.slice(0, 10)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="term-end" className="mb-1.5 block text-sm font-medium text-uach-ink">Fin</label>
          <input id="term-end" name="endsAt" type="date" defaultValue={term?.endsAt?.slice(0, 10)} className={`${INPUT} sm:max-w-xs`} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Guardar
        </button>
      </div>
    </form>
  );
}

function TermRow({ term, onEdit }: { term: AcademicTerm; onEdit: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const courses = term._count.courses;
  const start = formatTermDate(term.startsAt);
  const end = formatTermDate(term.endsAt);

  async function update(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await api(`/academic/terms/${term.id}`, { method: "PATCH", body });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo actualizar el periodo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`¿Borrar el periodo ${term.code}?`)) return;
    setBusy(true);
    try {
      await api(`/academic/terms/${term.id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold tabular-nums text-uach-ink">{term.code}</span>
          {term.name !== term.code && <span className="text-sm text-uach-ink/75">{term.name}</span>}
          {term.isCurrent && (
            <span className="rounded-full bg-uach-teal/10 px-2.5 py-0.5 text-xs font-medium text-uach-tealDark">Actual</span>
          )}
          {term.closed && (
            <span className="rounded-full bg-uach-canvas px-2.5 py-0.5 text-xs font-medium text-uach-ink/75">Cerrado</span>
          )}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-uach-ink/75">
          {start && end ? `${start} – ${end}` : start ? `Desde ${start}` : "Sin fechas"}
          {" · "}
          {courses} {courses === 1 ? "curso" : "cursos"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!term.isCurrent && !term.closed && (
          <button type="button" disabled={busy} onClick={() => update({ isCurrent: true })} className={BTN_SECONDARY}>
            <Star className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Hacer actual
          </button>
        )}
        {term.closed ? (
          <button type="button" disabled={busy} onClick={() => update({ closed: false })} className={BTN_GHOST}>
            <LockOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Reabrir
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              update(
                { closed: true },
                `¿Cerrar ${term.code}? Ya no se podrán crear cursos en este periodo. Los cursos existentes no cambian.`,
              )
            }
            className={BTN_GHOST}
          >
            <Lock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Cerrar
          </button>
        )}
        <button type="button" disabled={busy} onClick={onEdit} className={`${BTN_GHOST} px-2.5`} aria-label={`Editar ${term.code}`}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
        {courses === 0 && (
          <button type="button" disabled={busy} onClick={remove} className={BTN_DANGER} aria-label={`Borrar ${term.code}`}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

export function TermsAdmin({ terms }: { terms: AcademicTerm[] }) {
  const [editing, setEditing] = useState<AcademicTerm | "new" | null>(terms.length === 0 ? "new" : null);

  return (
    <div className="space-y-4">
      {editing ? (
        <TermForm key={editing === "new" ? "new" : editing.id} term={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={BTN_PRIMARY}>
          <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Nuevo periodo
        </button>
      )}

      {terms.length > 0 && (
        <ul className={`${CARD} divide-y divide-uach-ink/[0.06] p-0`}>
          {terms.map((term) => (
            <TermRow key={term.id} term={term} onEdit={() => setEditing(term)} />
          ))}
        </ul>
      )}
    </div>
  );
}
