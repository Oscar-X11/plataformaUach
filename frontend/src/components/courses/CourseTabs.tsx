"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCUS_RING } from "@/components/dashboard/tone";

const TABS = [
  { label: "Tablón", segment: "" },
  { label: "Trabajo de clase", segment: "/tareas" },
  { label: "Cuestionarios", segment: "/cuestionarios" },
  { label: "Personas", segment: "/personas" },
  { label: "Calificaciones", segment: "/calificaciones" },
  { label: "Recursos", segment: "/recursos" },
  { label: "Seguimiento", segment: "/seguimiento", managerOnly: true },
];

export function CourseTabs({ courseId, manager = false }: { courseId: string; manager?: boolean }) {
  const pathname = usePathname();
  const base = `/cursos/${courseId}`;

  return (
    <nav aria-label="Secciones del curso" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-uach-ink/10">
        {TABS.filter((tab) => manager || !tab.managerOnly).map(({ label, segment }) => {
          const href = `${base}${segment}`;
          const active = segment
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === base;
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-11 items-center rounded-t-lg px-3 text-sm font-medium transition-colors ${FOCUS_RING} ${
                  active ? "text-uach-tealDark" : "text-uach-ink/75 hover:text-uach-ink"
                }`}
              >
                {label}
                {active && (
                  <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-uach-teal" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
