"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, ExternalLink, X } from "lucide-react";
import { BTN_GHOST, BTN_SECONDARY } from "@/components/ui/styles";
import type { PreviewSource } from "@/lib/preview";

/**
 * Botón «Vista previa» que abre el PDF, la imagen o el archivo de Drive en un
 * diálogo, sin salir de la plataforma. El contenido solo se carga al abrirlo.
 */
export function PreviewButton({
  source,
  title,
  openHref,
  compact = false,
}: {
  source: PreviewSource;
  title: string;
  /** Enlace para abrir en otra pestaña (el archivo o el enlace original). */
  openHref: string;
  compact?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? `${BTN_GHOST} h-10 px-2.5` : BTN_SECONDARY}
        aria-label={compact ? `Vista previa de ${title}` : undefined}
      >
        <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {!compact && "Vista previa"}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clic fuera del panel (en el fondo) cierra.
          if (event.target === event.currentTarget) setOpen(false);
        }}
        aria-label={`Vista previa: ${title}`}
        className="m-auto h-[min(90dvh,60rem)] w-[min(96vw,64rem)] overflow-hidden rounded-2xl bg-uach-surface p-0 shadow-xl backdrop:bg-uach-ink/50"
      >
        {open && (
          <div className="flex h-full flex-col">
            <header className="flex items-center gap-2 border-b border-uach-ink/10 px-4 py-2">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-uach-ink">{title}</h2>
              <a href={openHref} target="_blank" rel="noopener noreferrer" className={`${BTN_GHOST} h-10`}>
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline">Abrir en otra pestaña</span>
              </a>
              <button type="button" onClick={() => setOpen(false)} className={`${BTN_GHOST} h-10 px-2.5`} aria-label="Cerrar vista previa">
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 bg-uach-canvas">
              {source.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={source.src} alt={title} className="h-full w-full object-contain" />
              ) : (
                <iframe
                  src={source.src}
                  title={title}
                  className="h-full w-full border-0"
                  allow="fullscreen"
                  referrerPolicy={source.external ? "no-referrer" : undefined}
                />
              )}
            </div>
            {source.kind === "frame" && source.external && (
              <p className="border-t border-uach-ink/10 px-4 py-2 text-xs text-uach-ink/70">
                ¿No se ve? El archivo debe estar compartido en Drive como «Cualquier persona con el enlace».
              </p>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
