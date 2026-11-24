"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CopyPlus, LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { schemeOf, type AcademicTerm, type TermScheme } from "@/lib/academic";
import type { CourseSummary } from "@/lib/courses";

const MAX_GRADE: Record<TermScheme, number> = { CUATRIMESTRAL: 12, SEMESTRAL: 6 };

/**
 * «Reutilizar clase»: copia temas, material, tareas (sin fecha) con su rúbrica
 * y cuestionarios (como borrador) en un periodo nuevo. No copia alumnos.
 */
export function CopyCourseButton({ course }: { course: CourseSummary }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [terms, setTerms] = useState<AcademicTerm[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scheme = course.career.faculty.scheme;
  const unit = scheme === "SEMESTRAL" ? "Semestre" : "Cuatrimestre";

  function open() {
    setError(null);
    dialogRef.current?.showModal();
    if (!terms) {
      api<AcademicTerm[]>("/academic/terms")
        .then((list) => setTerms(list.filter((term) => !term.closed && schemeOf(term) === scheme)))
        .catch(() => setTerms([]));
    }
  }

  // Cerrar con clic fuera del cuadro.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const copy = await api<CourseSummary>(`/courses/${course.id}/copy`, {
        method: "POST",
        body: { name: form.get("name"), term: form.get("term"), grade: Number(form.get("grade")) },
      });
      dialogRef.current?.close();
      router.push(`/cursos/${copy.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo reutilizar la clase.");
      setBusy(false);
    }
  }

  const current = terms?.find((term) => term.isCurrent && term.code !== course.term) ?? terms?.find((term) => term.code !== course.term);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="press-soft mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
      >
        <CopyPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Reutilizar clase
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="copy-title"
        className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-uach-surface p-0 text-uach-ink shadow-xl backdrop:bg-uach-ink/40"
      >
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 id="copy-title" className="text-lg font-semibold">Reutilizar clase</h2>
            <p className="mt-1 text-sm text-uach-ink/75">
              Se copian temas, material, tareas con su rúbrica y cuestionarios. Las tareas quedan sin fecha y los
              cuestionarios como borrador. No se copian alumnos ni entregas.
            </p>
          </div>
          {error && <FormAlert message={error} />}
          <div>
            <label htmlFor="copy-name" className="mb-1.5 block text-sm font-medium">Nombre de la nueva clase</label>
            <input id="copy-name" name="name" required minLength={3} maxLength={120} defaultValue={course.name} className={INPUT} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor="copy-term" className="mb-1.5 block text-sm font-medium">Periodo</label>
              {terms === null ? (
                <p className="flex h-[42px] items-center gap-2 text-sm text-uach-ink/75">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  Cargando periodos…
                </p>
              ) : terms.length === 0 ? (
                <p className="text-sm text-red-700">No hay periodos abiertos de este tipo.</p>
              ) : (
                <select id="copy-term" name="term" required defaultValue={current?.code} className={INPUT}>
                  {terms.map((term) => (
                    <option key={term.code} value={term.code}>
                      {term.code} · {term.name}
                      {term.isCurrent ? " (actual)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="copy-grade" className="mb-1.5 block text-sm font-medium">{unit}</label>
              <input
                id="copy-grade"
                name="grade"
                type="number"
                min={1}
                max={MAX_GRADE[scheme]}
                required
                defaultValue={course.grade}
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} className={BTN_GHOST}>Cancelar</button>
            <button type="submit" disabled={busy || !terms?.length} className={BTN_PRIMARY}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              {busy ? "Copiando…" : "Crear copia"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
