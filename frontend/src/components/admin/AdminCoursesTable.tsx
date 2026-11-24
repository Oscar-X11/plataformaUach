"use client";

import Link from "next/link";
import { courseLabel } from "@/lib/courses";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, UserCog, X } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { AdminUserPage, AdminUserRow } from "@/lib/classwork";
import type { CourseSummary } from "@/lib/courses";

/** Buscador de docentes activos para reasignar un curso. */
function TeacherPicker({
  course,
  onPicked,
  onCancel,
}: {
  course: CourseSummary;
  onPicked: (course: CourseSummary) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [teachers, setTeachers] = useState<AdminUserRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ role: "TEACHER", status: "ACTIVE" });
      if (search.trim()) params.set("search", search.trim());
      api<AdminUserPage>(`/users?${params}`)
        .then((page) => setTeachers(page.items))
        .catch(() => setTeachers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function pick(teacher: AdminUserRow) {
    if (!window.confirm(`¿Asignar «${course.name}» a ${teacher.fullName}? Se le avisará en la plataforma.`)) return;
    setBusyId(teacher.id);
    setError(null);
    try {
      onPicked(await api<CourseSummary>(`/courses/${course.id}/teacher`, { method: "PATCH", body: { teacherId: teacher.id } }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo cambiar el docente.");
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-uach-canvas p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-uach-soft" aria-hidden />
          <label htmlFor={`teacher-search-${course.id}`} className="sr-only">Buscar docente</label>
          <input
            id={`teacher-search-${course.id}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar docente por nombre o número de empleado"
            autoFocus
            className={`${INPUT} h-11 pl-9`}
          />
        </div>
        <button type="button" onClick={onCancel} className={`${BTN_GHOST} px-2.5`} aria-label="Cancelar">
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {error && <FormAlert message={error} />}
      {teachers === null ? (
        <p className="flex items-center gap-2 px-1 text-sm text-uach-ink/75">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Buscando…
        </p>
      ) : teachers.length === 0 ? (
        <p className="px-1 text-sm text-uach-ink/75">No hay docentes activos con ese nombre.</p>
      ) : (
        <ul className="max-h-64 divide-y divide-uach-ink/[0.06] overflow-y-auto rounded-lg bg-uach-surface">
          {teachers.map((teacher) => {
            const current = teacher.id === course.teacher.id;
            return (
              <li key={teacher.id}>
                <button
                  type="button"
                  disabled={current || busyId !== null}
                  onClick={() => pick(teacher)}
                  className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-uach-canvas disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="min-w-0 flex-1 truncate text-uach-ink">{teacher.fullName}</span>
                  <span className="shrink-0 text-xs tabular-nums text-uach-ink/60">
                    {current ? "Docente actual" : teacher.username}
                  </span>
                  {busyId === teacher.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminCoursesTable({ initialCourses }: { initialCourses: CourseSummary[] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const terms = useMemo(() => Array.from(new Set(courses.map((course) => course.term))).sort().reverse(), [courses]);
  const query = search.trim().toLowerCase();
  const visible = courses.filter(
    (course) =>
      (!term || course.term === term) &&
      (!query ||
        [course.name, course.career.name, course.career.code, course.subject?.name ?? "", course.teacher.fullName].some((text) =>
          text.toLowerCase().includes(query),
        )),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-uach-soft" aria-hidden />
          <label htmlFor="course-search" className="sr-only">Buscar curso</label>
          <input
            id="course-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por curso, materia o docente"
            className={`${INPUT} h-11 pl-9`}
          />
        </div>
        <label htmlFor="course-term" className="sr-only">Periodo</label>
        <select id="course-term" value={term} onChange={(event) => setTerm(event.target.value)} className={`${INPUT} h-11`}>
          <option value="">Todos los periodos</option>
          {terms.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      {notice && <FormAlert tone="info" message={notice} />}

      {visible.length === 0 ? (
        <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>
          {courses.length === 0 ? "Todavía no hay cursos. Aparecerán cuando los docentes los creen." : "Ningún curso coincide con la búsqueda."}
        </p>
      ) : (
        <ul className={`${CARD} divide-y divide-uach-ink/[0.06] p-0`}>
          {visible.map((course) => (
            <li key={course.id} className="px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/cursos/${course.id}`} className="block truncate font-medium text-uach-ink hover:text-uach-tealDark hover:underline">
                    {course.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs tabular-nums text-uach-ink/75">
                    {courseLabel(course)} · {course.career.name} · {course.term} · {course.studentCount}{" "}
                    {course.studentCount === 1 ? "alumno" : "alumnos"}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-uach-ink/75">Docente: {course.teacher.fullName}</p>
                </div>
                {picking !== course.id && (
                  <button type="button" onClick={() => setPicking(course.id)} className={BTN_SECONDARY}>
                    <UserCog className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    Cambiar docente
                  </button>
                )}
              </div>
              {picking === course.id && (
                <TeacherPicker
                  course={course}
                  onCancel={() => setPicking(null)}
                  onPicked={(updated) => {
                    setCourses((list) => list.map((item) => (item.id === updated.id ? { ...item, teacher: updated.teacher } : item)));
                    setPicking(null);
                    setNotice(`«${updated.name}» ahora lo imparte ${updated.teacher.fullName}.`);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
