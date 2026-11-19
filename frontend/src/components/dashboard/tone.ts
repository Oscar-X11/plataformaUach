import type { CourseTone } from "@/lib/dashboard/types";
import type { DueUrgency } from "@/lib/dashboard/format";

/** Clases literales para que Tailwind las detecte al compilar. */
export const TONE_BG: Record<CourseTone, string> = {
  teal: "bg-uach-teal",
  petrol: "bg-uach-petrol",
  emerald: "bg-uach-emerald",
  tealDark: "bg-uach-tealDark",
  ink: "bg-uach-ink",
};

/** Ficha con la inicial del curso: tinte suave del mismo tono. */
export const TONE_TILE: Record<CourseTone, string> = {
  teal: "bg-uach-teal/10 text-uach-teal",
  petrol: "bg-uach-petrol/10 text-uach-petrol",
  emerald: "bg-uach-emerald/10 text-uach-emerald",
  tealDark: "bg-uach-tealDark/10 text-uach-tealDark",
  ink: "bg-uach-ink/10 text-uach-ink",
};

/** Estados suaves: rojo desaturado vencido, ámbar por vencer, verde entregado. */
export const URGENCY_TEXT: Record<DueUrgency, string> = {
  overdue: "text-red-700",
  today: "text-amber-700",
  soon: "text-amber-700",
  later: "text-uach-ink/75",
};

export const URGENCY_CHIP: Record<DueUrgency, string> = {
  overdue: "bg-red-50 text-red-700",
  today: "bg-amber-50 text-amber-800",
  soon: "bg-amber-50 text-amber-800",
  later: "bg-uach-canvas text-uach-ink/75",
};

/** Superficie base: borde 1px ink 8%, radio 16px, sombra casi imperceptible. */
export const CARD =
  "rounded-2xl border border-uach-ink/[0.08] bg-uach-surface shadow-[0_1px_2px_rgba(8,59,70,0.04)]";

/** Anillo de foco visible con teclado. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-uach-surface";

export function courseInitials(name: string) {
  const words = name
    .replace(/[:,.]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !/^(y|de|del|la|las|los|el|en)$/i.test(word));
  const letters = (words.length > 1 ? words.slice(0, 2) : [name, name.slice(1)]).map((word) => word[0]);
  return letters.join("").toUpperCase();
}
