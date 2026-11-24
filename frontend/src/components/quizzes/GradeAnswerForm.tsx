"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";

/** Docente: puntos de una respuesta (los párrafos y las cortas sin clave, o para corregir lo automático). */
export function GradeAnswerForm({ answerId, max, current }: { answerId: string; max: number; current: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const points = Number(new FormData(event.currentTarget).get("points"));
    setBusy(true);
    setError(null);
    try {
      await api(`/quiz-answers/${answerId}`, { method: "PATCH", body: { points } });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2 border-t border-uach-ink/[0.06] pt-3">
      <label htmlFor={`grade-${answerId}`} className="text-sm text-uach-ink">
        Puntos
      </label>
      <input
        id={`grade-${answerId}`}
        name="points"
        type="number"
        min={0}
        max={max}
        step={0.5}
        inputMode="decimal"
        defaultValue={current ?? ""}
        required
        className={`${INPUT} w-24`}
      />
      <span className="text-sm text-uach-ink/75">de {max}</span>
      <button type="submit" disabled={busy} className={`${BTN_SECONDARY} ml-auto`}>
        {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        {current === null ? "Calificar" : "Actualizar"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
