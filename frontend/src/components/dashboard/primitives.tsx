"use client";

import { formatGrade } from "@/lib/dashboard/format";
import type { CourseTone } from "@/lib/dashboard/types";
import { useCountUp } from "@/lib/motion";
import { TONE_BG, TONE_TILE, courseInitials } from "@/components/dashboard/tone";

/** Barra que se llena desde 0 al montar (transform: scaleX), sin tocar el layout. */
export function ProgressBar({
  value,
  tone = "teal",
  track = "bg-uach-ink/[0.07]",
  label,
}: {
  value: number;
  tone?: CourseTone;
  track?: string;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={`h-1.5 overflow-hidden rounded-full ${track}`}
    >
      <div
        className={`bar-fill h-full w-full rounded-full ${TONE_BG[tone]}`}
        style={{ "--p": clamped } as React.CSSProperties}
      />
    </div>
  );
}

/** Número que cuenta hacia arriba (~600ms) con cifras tabulares. */
export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const current = useCountUp(value);
  const shown = decimals > 0 ? formatGrade(Number(current.toFixed(decimals))) : Math.round(current);
  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {/* El valor final es el que leen los lectores de pantalla. */}
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{decimals > 0 ? formatGrade(value) : value}</span>
    </span>
  );
}

/** Ficha con las iniciales del curso en un tinte de su tono. */
export function CourseTile({
  name,
  tone,
  size = "md",
}: {
  name: string;
  tone: CourseTone;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 rounded-lg text-[11px]",
    md: "h-10 w-10 rounded-xl text-xs",
    lg: "h-12 w-12 rounded-xl text-sm",
  };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-semibold tracking-wide ${sizes[size]} ${TONE_TILE[tone]}`}
    >
      {courseInitials(name)}
    </span>
  );
}

/** Check que se dibuja con stroke-dashoffset. */
export function DrawnCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`check-draw ${className ?? ""}`}>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
