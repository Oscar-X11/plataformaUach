/** Barra de progreso (completadas / total). Accesible como progressbar. */
export function ProgressBar({
  percent,
  label,
  tone = "teal",
  size = "md",
}: {
  percent: number;
  label: string;
  tone?: "teal" | "red";
  size?: "sm" | "md";
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-uach-ink/[0.08] ${size === "sm" ? "h-1.5" : "h-2"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${tone === "red" ? "bg-red-600" : "bg-uach-teal"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
