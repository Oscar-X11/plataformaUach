"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";

const MIN = 10;
const MAX = 2000;

/**
 * «Reportar un problema»: el usuario describe qué pasó y el administrador lo ve en
 * Administración › Errores, con la pantalla en la que estaba. Se le avisa cuando se atiende.
 */
export function ReportProblemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // La pantalla en la que estaba al abrir el cuadro (no cambia mientras escribe).
  const [path, setPath] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setPath(window.location.pathname + window.location.search);
      setError(null);
      setSent(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Cerrar con clic fuera del cuadro o con Escape (el evento close lo dispara el navegador).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("click", onClick);
      dialog.removeEventListener("close", onClose);
    };
  }, [onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < MIN) {
      setError(`Cuéntanos un poco más (al menos ${MIN} caracteres).`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/errors/report", { method: "POST", body: { message: message.trim(), path: path.slice(0, 300) } });
      setSent(true);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo enviar el reporte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-title"
      className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-uach-surface p-0 text-uach-ink shadow-xl backdrop:bg-uach-ink/40"
    >
      {sent ? (
        <div className="space-y-4 p-5 sm:p-6">
          <h2 id="report-title" className="text-lg font-semibold">Gracias por avisarnos</h2>
          <p className="text-sm text-uach-ink/75">
            Un administrador revisará el problema. Te llegará una notificación cuando lo atienda.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} className={BTN_PRIMARY}>Cerrar</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 id="report-title" className="text-lg font-semibold">Reportar un problema</h2>
            <p className="mt-1 text-sm text-uach-ink/75">
              Cuéntanos qué intentabas hacer y qué pasó. Se envía junto con la pantalla en la que estás.
            </p>
          </div>
          {error && <FormAlert message={error} />}
          <div>
            <label htmlFor="report-message" className="mb-1.5 block text-sm font-medium">Qué pasó</label>
            <textarea
              id="report-message"
              rows={5}
              maxLength={MAX}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ej.: al subir mi tarea en PDF aparece «No se pudo subir» y el archivo no se guarda."
              className={`${INPUT} resize-y`}
            />
            <p className="mt-1 text-xs text-uach-ink/60">
              Pantalla: <span className="font-mono">{path || "/"}</span> · No escribas contraseñas.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} className={BTN_GHOST}>Cancelar</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              Enviar reporte
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
