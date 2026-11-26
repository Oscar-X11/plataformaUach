"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { SCHEME_TEXT, schemeOf, type AcademicTerm, type TermScheme } from "@/lib/academic";
import type { CourseSummary } from "@/lib/courses";

/** Nivel (Licenciaturas, Ingenierías, Preparatoria) con las carreras que ofrece. */
interface LevelOption {
  id: string;
  name: string;
  scheme?: TermScheme;
  careers: { id: string; name: string; code: string }[];
}

/** Cuatrimestres o semestres que se pueden elegir (igual que el backend). */
const MAX_GRADE: Record<TermScheme, number> = { CUATRIMESTRAL: 9, SEMESTRAL: 6 };
const capitalize = (text: string) => text.replace(/^./, (c) => c.toUpperCase());

/**
 * Docente: crea una clase con los datos de «Crear clase» de Classroom: nombre,
 * descripción, nivel, carrera, cuatrimestre o semestre y aula. El periodo se
 * propone solo (el actual del nivel) y se puede cambiar.
 */
export function CreateCourseForm({ startOpen = false }: { startOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [levels, setLevels] = useState<LevelOption[] | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [levelId, setLevelId] = useState("");
  const [careerId, setCareerId] = useState("");
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!open || levels) return;
    Promise.all([api<LevelOption[]>("/academic/faculties"), api<AcademicTerm[]>("/academic/terms")])
      .then(([levelList, termList]) => {
        setLevels(levelList);
        setTerms(termList.filter((item) => !item.closed));
      })
      .catch(() => {
        setLevels([]);
        setTerms([]);
        setError("No se pudieron cargar los niveles, carreras y periodos.");
      });
  }, [open, levels]);

  const level = levels?.find((item) => item.id === levelId);
  const scheme = schemeOf(level);
  const unit = SCHEME_TEXT[scheme].unit;
  const termOptions = level ? (terms ?? []).filter((item) => schemeOf(item) === scheme) : [];

  function chooseLevel(id: string) {
    setLevelId(id);
    setCareerId("");
    setGrade("");
    const chosen = levels?.find((item) => item.id === id);
    const options = (terms ?? []).filter((item) => schemeOf(item) === schemeOf(chosen));
    setTerm(options.find((item) => item.isCurrent)?.code ?? options[0]?.code ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    if (!levelId) return setError("Elige el nivel.");
    if (!careerId) return setError("Elige la carrera.");
    if (!grade) return setError(`Elige el ${unit}.`);
    if (!term) return setError(`No hay ningún periodo abierto para este nivel. Pide a la administración que lo dé de alta.`);
    setLoading(true);
    try {
      const course = await api<CourseSummary>("/courses", {
        method: "POST",
        body: {
          name: form.get("name"),
          description: form.get("description"),
          careerId,
          grade: Number(grade),
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

  const loadingCatalog = levels === null;

  return (
    <form onSubmit={handleSubmit} noValidate className={`${CARD} w-full space-y-4 p-5 text-uach-ink sm:p-6`}>
      <h2 className="text-base font-semibold">Crear clase</h2>
      {error && <FormAlert message={error} />}

      <TextField
        label="Nombre de la clase *"
        name="name"
        placeholder="Ej. Redes 2 — Grupo A"
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
          label="Carrera *"
          name="careerId"
          required
          value={careerId}
          onChange={(event) => setCareerId(event.target.value)}
          disabled={!level}
        >
          <option value="" disabled>
            {!level ? "Elige primero el nivel" : "Selecciona la carrera"}
          </option>
          {level?.careers.map((career) => (
            <option key={career.id} value={career.id}>
              {career.name} ({career.code})
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label={level ? `${capitalize(unit)} *` : "Cuatrimestre o semestre *"}
          name="grade"
          required
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          disabled={!level}
        >
          <option value="" disabled>
            {!level ? "Elige primero el nivel" : `Selecciona el ${unit}`}
          </option>
          {level &&
            Array.from({ length: MAX_GRADE[scheme] }, (_, index) => index + 1).map((number) => (
              <option key={number} value={number}>
                {number}.º {unit}
              </option>
            ))}
        </SelectField>

        <SelectField
          label="Periodo"
          name="term"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          disabled={!level || termOptions.length === 0}
        >
          {!level && <option value="">Se elige según el nivel</option>}
          {level && termOptions.length === 0 && <option value="">No hay periodos abiertos</option>}
          {termOptions.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name !== item.code ? `${item.name} (${item.code})` : item.code}
              {item.isCurrent ? " · actual" : ""}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField
        label="Aula"
        name="meetingInfo"
        placeholder="Salón 12, lun y mié 8:00 · o enlace de Meet"
        maxLength={200}
        hint="Lo ven tus alumnos. Los enlaces se abren con un clic."
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
          <SubmitButton loading={loading}>Crear</SubmitButton>
        </div>
      </div>
    </form>
  );
}
