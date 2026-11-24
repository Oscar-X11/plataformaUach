"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { SCHEME_TEXT, schemeOf, type AcademicTerm, type TermScheme } from "@/lib/academic";
import type { CourseSummary, SubjectOption } from "@/lib/courses";

interface LevelOption {
  id: string;
  name: string;
  scheme?: TermScheme;
}

/**
 * Docente: crea una clase, con los datos de «Crear clase» de Classroom (nombre,
 * descripción, nivel, materia y aula). El periodo se elige solo: el actual del
 * nivel (cuatrimestre o semestre), y se puede cambiar.
 */
export function CreateCourseForm({ startOpen = false }: { startOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [levels, setLevels] = useState<LevelOption[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[] | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!open || subjects) return;
    Promise.all([
      api<LevelOption[]>("/academic/faculties"),
      api<SubjectOption[]>("/academic/subjects"),
      api<AcademicTerm[]>("/academic/terms"),
    ])
      .then(([levelList, subjectList, termList]) => {
        setLevels(levelList);
        setSubjects(subjectList);
        setTerms(termList.filter((item) => !item.closed));
      })
      .catch(() => {
        setLevels([]);
        setSubjects([]);
        setTerms([]);
        setError("No se pudieron cargar los niveles, materias y periodos.");
      });
  }, [open, subjects]);

  const level = levels?.find((item) => item.id === levelId);
  const scheme = schemeOf(level);
  const unit = SCHEME_TEXT[scheme].unit;

  // Materias del nivel elegido, agrupadas por carrera.
  const byCareer = useMemo(() => {
    const groups = new Map<string, SubjectOption[]>();
    for (const subject of subjects ?? []) {
      if (subject.career.faculty?.id !== levelId) continue;
      const list = groups.get(subject.career.name) ?? [];
      list.push(subject);
      groups.set(subject.career.name, list);
    }
    return Array.from(groups.entries());
  }, [subjects, levelId]);

  // Periodos del tipo del nivel; se propone el actual.
  const termOptions = level ? (terms ?? []).filter((item) => schemeOf(item) === scheme) : [];

  function chooseLevel(id: string) {
    setLevelId(id);
    setSubjectId("");
    const chosen = levels?.find((item) => item.id === id);
    const options = (terms ?? []).filter((item) => schemeOf(item) === schemeOf(chosen));
    setTerm(options.find((item) => item.isCurrent)?.code ?? options[0]?.code ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    if (!levelId) return setError("Elige el nivel.");
    if (!subjectId) return setError("Elige la materia.");
    if (!term) return setError(`No hay ningún ${unit} abierto para este nivel. Pide a la administración que lo dé de alta.`);
    setLoading(true);
    try {
      const course = await api<CourseSummary>("/courses", {
        method: "POST",
        body: {
          name: form.get("name"),
          description: form.get("description"),
          subjectId,
          term,
          meetingInfo: form.get("meetingInfo"),
        },
      });
      router.push(`/cursos/${course.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo crear la clase.");
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
        Crear clase
      </button>
    );
  }

  const loadingCatalog = subjects === null;

  return (
    <form onSubmit={handleSubmit} noValidate className={`${CARD} w-full space-y-4 p-5 text-uach-ink sm:p-6`}>
      <h2 className="text-base font-semibold">Crear clase</h2>
      {error && <FormAlert message={error} />}

      <TextField
        label="Nombre de la clase *"
        name="name"
        placeholder="Ej. Bases de Datos — Grupo A"
        required
        minLength={3}
        maxLength={120}
        autoFocus
      />

      <div>
        <label htmlFor="course-description" className="mb-1.5 block text-sm font-medium text-uach-ink">
          Descripción
        </label>
        <textarea
          id="course-description"
          name="description"
          rows={2}
          maxLength={2000}
          placeholder="De qué trata la clase, horario de asesorías, reglas…"
          className={`${INPUT} resize-y`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Nivel *"
          name="level"
          required
          value={levelId}
          onChange={(event) => chooseLevel(event.target.value)}
          disabled={loadingCatalog}
        >
          <option value="" disabled>
            {loadingCatalog ? "Cargando…" : "Selecciona el nivel"}
          </option>
          {levels?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Materia *"
          name="subjectId"
          required
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          disabled={!levelId || byCareer.length === 0}
        >
          <option value="" disabled>
            {!levelId ? "Elige primero el nivel" : byCareer.length === 0 ? "Este nivel aún no tiene materias" : "Selecciona la materia"}
          </option>
          {byCareer.map(([career, list]) => (
            <optgroup key={career} label={career}>
              {list.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} · {subject.semester}.º {unit}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
      </div>

      {levelId && byCareer.length === 0 && (
        <FormAlert
          tone="info"
          message="Este nivel todavía no tiene materias dadas de alta. Pide a la administración que las agregue en Carreras."
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Aula"
          name="meetingInfo"
          placeholder="Salón 12, lun y mié 8:00 · o enlace de Meet"
          maxLength={200}
          hint="Lo ven tus alumnos. Los enlaces se abren con un clic."
        />
        <SelectField
          label={unit.replace(/^./, (c) => c.toUpperCase())}
          name="term"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          disabled={!levelId || termOptions.length === 0}
        >
          {!levelId && <option value="">Se elige según el nivel</option>}
          {levelId && termOptions.length === 0 && <option value="">No hay periodos abiertos</option>}
          {termOptions.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name !== item.code ? `${item.name} (${item.code})` : item.code}
              {item.isCurrent ? " · actual" : ""}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="press-soft h-11 rounded-xl px-5 text-sm font-medium text-uach-ink/75 hover:bg-uach-canvas"
        >
          Cancelar
        </button>
        <div className="sm:w-40">
          <SubmitButton loading={loading}>Crear</SubmitButton>
        </div>
      </div>
    </form>
  );
}
