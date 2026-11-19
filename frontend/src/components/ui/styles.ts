import type { SubmissionState } from "@/lib/classwork";

/** Botones (ver DESIGN.md › Components). Áreas táctiles de 44px. */
export const BTN_PRIMARY =
  "press inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-uach-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-uach-tealDark disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40 focus-visible:ring-offset-2";
export const BTN_SECONDARY =
  "press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-uach-ink/15 bg-uach-surface px-4 text-sm font-medium text-uach-ink transition-colors hover:bg-uach-canvas disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40";
export const BTN_GHOST =
  "press-soft inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-uach-ink/75 transition-colors hover:bg-uach-canvas hover:text-uach-ink disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40";
export const BTN_DANGER =
  "press inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-red-300";

export const INPUT =
  "block w-full rounded-lg border border-uach-ink/15 bg-uach-surface px-3 py-2.5 text-sm text-uach-ink placeholder:text-uach-soft transition-shadow focus:border-uach-teal focus:outline-none focus:ring-4 focus:ring-uach-teal/15 disabled:opacity-60";

/** Estado de una entrega: etiqueta y chip (colores de estado del DESIGN.md). */
export const STATE_META: Record<SubmissionState, { label: string; chip: string }> = {
  pending: { label: "Pendiente", chip: "bg-uach-canvas text-uach-ink/75" },
  missing: { label: "Sin entregar", chip: "bg-red-50 text-red-700" },
  submitted: { label: "Entregada", chip: "bg-uach-emerald/10 text-uach-emerald" },
  late: { label: "Entregada tarde", chip: "bg-amber-50 text-amber-800" },
  returned: { label: "Calificada", chip: "bg-uach-teal/10 text-uach-tealDark" },
};
