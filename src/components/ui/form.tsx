"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";

const inputClass =
  "block w-full rounded-lg border border-uach-ink/15 bg-uach-surface px-3 py-2.5 text-sm text-uach-ink placeholder:text-uach-soft transition-shadow focus:border-uach-teal focus:outline-none focus:ring-4 focus:ring-uach-teal/15 disabled:opacity-60";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, hint, id, type = "text", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-uach-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? "text" : type}
          className={`${inputClass} ${isPassword ? "pr-10" : ""}`}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-uach-soft hover:text-uach-ink"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-uach-soft">
          {hint}
        </p>
      )}
    </div>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SelectField({ label, id, children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-uach-ink">
        {label}
      </label>
      <select id={selectId} className={inputClass} {...props}>
        {children}
      </select>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-uach-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-uach-tealDark focus:outline-none focus:ring-4 focus:ring-uach-teal/25 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function FormAlert({ message, tone = "error" }: { message: string; tone?: "error" | "info" }) {
  const styles =
    tone === "error"
      ? "bg-red-50 text-red-800 ring-red-200"
      : "bg-uach-subtle text-uach-tealDark ring-uach-teal/20";
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ring-1 ${styles}`}>
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
