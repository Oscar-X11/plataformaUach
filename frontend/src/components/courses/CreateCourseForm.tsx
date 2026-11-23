"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { SCHEME_TEXT, schemeOf, type AcademicTerm } from "@/lib/academic";
import type { CourseSummary, SubjectOption } from "@/lib/courses";

/** Docente: crea un curso ligado a una materia del catálogo. */
export function CreateCourseForm({ startOpen = false }: { startOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [subjects, setSubjects] = useState<SubjectOption[] | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subjectId, setSubjectId] = useState("");

  useEffect(() => {
    if (!open || subjects) return;
    Promise.all([api<SubjectOption[]>("/academic/subjects"), api<AcademicTerm[]>("/academic/terms")])
      .then(([subjectList, termList]) => {
        setSubjects(subjectList);
        setTerms(termList.filter((term) => !term.closed));
      })
      .catch(() => {
        setSubjects([]);
        setTerms([]);
        setError("No se pudo cargar el catálogo de materias y periodos.");
      });
  }, [open, subjects]);

  // Solo los periodos del tipo de la materia: cuatrimestres (licenciatura) o semestres (bachillerato).
  const subject = subjects?.find((item) => item.id === subjectId);
  const scheme = schemeOf(subject?.career.faculty);
  const termOptions = subject ? (terms ?? []).filter((term) => schemeOf(term) === scheme) : null;
  const currentTerm = termOptions?.find((term) => term.isCurrent)?.code ?? termOptions?.[0]?.code ?? "";

  // Agrupa las materias por carrera para el <select>.
  const byCareer = useMemo(() => {
    const groups = new Map<string, SubjectOption[]>();
    for (const subject of subjects ?? []) {
      const list = groups.get(subject.career.name) ?? [];
      list.push(subject);
      groups.set(subject.career.name, list);
    }
    return Array.from(groups.entries());
  }, [subjects]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setLoading(true);
    try {
      const course = await api<CourseSummary>("/courses", {
        method: "POST",
        body: {
          name: form.get("name"),
          term: form.get("term"),
          subjectId: form.get("subjectId"),
          meetingInfo: form.get("meetingInfo"),
        },
      });
      router.push(`/cursos/${course.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo crear el curso.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press inline-flex h-11 items-center gap-2 rounded-xl bg-uach-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-uach-teal/85"
      >
        <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
        Crear curso
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={`${CARD} w-full space-y-4 p-5 text-uach-ink sm:p-6`}>
      <h2 className="text-base font-semibold">Nuevo curso</h2>
      {error && <FormAlert message={error} />}
      {termOptions?.length === 0 && (
        <FormAlert
          tone="info"
          message={`La administración todavía no abre ningún ${SCHEME_TEXT[scheme].unit}. Pídele que lo dé de alta.`}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField
          label="Nombre del curso"
          name="name"
          placeholder="Ej. Bases de Datos — Grupo A"
          required
          minLength={3}
          maxLength={120}
          autoFocus
        />
        <SelectField
          key={`${scheme}-${currentTerm}`}
          label={subject ? SCHEME_TEXT[scheme].unit.replace(/^./, (c) => c.toUpperCase()) : "Periodo"}
          name="term"
          required
          defaultValue={currentTerm}
          disabled={!termOptions?.length}
        >
          {terms === null && <option value="">Cargando…</option>}
          {terms !== null && !subject && <option value="">Elige primero la materia</option>}
          {termOptions?.length === 0 && <option value="">No hay periodos abiertos</option>}
          {termOptions?.map((term) => (
            <option key={term.id} value={term.code}>
              {term.code}
              {term.name !== term.code ? ` · ${term.name}` : ""}
            </option>
          ))}
        </SelectField>
      </div>

      <SelectField
        label="Materia"
        name="subjectId"
        required
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        disabled={!subjects?.length}
      >
        <option value="" disabled>
          {subjects === null ? "Cargando materias…" : "Selecciona una materia"}
        </option>
        {byCareer.map(([career, list]) => (
          <optgroup key={career} label={career}>
            {list.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} · {subject.name} ({subject.semester}.º {SCHEME_TEXT[schemeOf(subject.career.faculty)].unit})
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>

      <TextField
        label="Lugar y horario (opcional)"
        name="meetingInfo"
        placeholder="Lun y mié 8:00, salón 12 · o enlace de Meet"
        maxLength={200}
        hint="Lo ven tus alumnos en el curso. Los enlaces se pueden abrir con un clic."
      />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="press-soft h-11 rounded-xl px-5 text-sm font-medium text-uach-ink/75 hover:bg-uach-canvas"
        >
          Cancelar
        </button>
        <div className="sm:w-40">
          <SubmitButton loading={loading}>Crear curso</SubmitButton>
        </div>
      </div>
    </form>
  );
}
