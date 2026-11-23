"use client";

import { INPUT } from "@/components/ui/styles";
import type { CareerOption } from "@/lib/academic";

/** <select> de carreras agrupadas por nivel. */
export function CareerSelect({
  id,
  careers,
  value,
  onChange,
  placeholder = "Sin carrera",
  className = "",
  extraOptions,
}: {
  id: string;
  careers: CareerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Opciones antes de las carreras, p. ej. filtros especiales. */
  extraOptions?: { value: string; label: string }[];
}) {
  const faculties = Array.from(new Set(careers.map((career) => career.faculty)));
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${INPUT} ${className}`}>
      <option value="">{placeholder}</option>
      {extraOptions?.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
      {faculties.map((faculty) => (
        <optgroup key={faculty} label={faculty}>
          {careers
            .filter((career) => career.faculty === faculty)
            .map((career) => (
              <option key={career.id} value={career.id}>
                {career.code} · {career.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
