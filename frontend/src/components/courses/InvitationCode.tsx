"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";

/** Código de invitación con copiar y regenerar (solo docente o admin). */
export function InvitationCode({ courseId, initialCode }: { courseId: string; initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("No se pudo copiar; selecciona el código manualmente.");
    }
  }

  async function regenerate() {
    if (!window.confirm("El código actual dejará de funcionar. ¿Generar uno nuevo?")) return;
    setBusy(true);
    setError(null);
    try {
      const { invitation } = await api<{ invitation: string }>(`/courses/${courseId}/invitation`, {
        method: "POST",
      });
      setCode(invitation);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo generar el código.");
    } finally {
      setBusy(false);
    }
  }

  const iconButton =
    "press grid h-11 w-11 place-items-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40 disabled:opacity-60";

  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
      <p className="text-xs font-medium text-white/80">Código de invitación</p>
      <div className="mt-1 flex items-center gap-1">
        <span className="select-all font-mono text-2xl font-semibold tracking-[0.2em]" aria-live="polite">
          {code}
        </span>
        <button type="button" onClick={copy} className={`${iconButton} ml-auto`} aria-label="Copiar código">
          {copied ? (
            <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={busy}
          className={iconButton}
          aria-label="Generar un código nuevo"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-white">{error}</p>}
    </div>
  );
}
