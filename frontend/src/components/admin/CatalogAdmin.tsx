"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Building2, ChevronRight, GraduationCap, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { SCHEME_TEXT, schemeOf, TERM_SCHEMES, type CatalogCareer, type CatalogFaculty, type CatalogSubject, type TermScheme } from "@/lib/academic";
import { api, ApiError } from "@/lib/api";

type Kind = "faculty" | "career" | "subject";

// En la API el nivel se llama faculty; en la web nunca se dice «facultad».
const LABELS: Record<
  Kind,
  { one: string; the: string; newOne: string; endpoint: string; namePlaceholder: string; codePlaceholder: string }
> = {
  faculty: { one: "nivel", the: "el nivel", newOne: "Nuevo nivel", endpoint: "/academic/faculties", namePlaceholder: "Ingenierías", codePlaceholder: "ING" },
  career: { one: "carrera", the: "la carrera", newOne: "Nueva carrera", endpoint: "/academic/careers", namePlaceholder: "Ingeniería en Sistemas Computacionales", codePlaceholder: "ISC" },
  subject: { one: "materia", the: "la materia", newOne: "Nueva materia", endpoint: "/academic/subjects", namePlaceholder: "Bases de Datos", codePlaceholder: "ISC-301" },
};

/**
 * Formulario en línea para crear o editar un nivel, carrera o materia.
 * `parent` es el id del nivel (carrera) o de la carrera (materia).
 */
function EntityForm({
  kind,
  item,
  parent,
  faculties,
  scheme = "CUATRIMESTRAL",
  onDone,
}: {
  kind: Kind;
  item?: { id: string; name: string; code: string; semester?: number; scheme?: TermScheme };
  parent?: string;
  faculties?: CatalogFaculty[];
  /** Tipo de periodo del nivel: nombra el campo «Cuatrimestre» o «Semestre». */
  scheme?: TermScheme;
  onDone: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = LABELS[kind];
  const prefix = `${kind}-${item?.id ?? "new"}`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { name: form.get("name"), code: form.get("code") };
    if (kind === "faculty") body.scheme = form.get("scheme");
    if (kind === "career") body.facultyId = form.get("facultyId") ?? parent;
    if (kind === "subject") {
      body.careerId = parent;
      body.semester = Number(form.get("semester"));
    }
    setBusy(true);
    setError(null);
    try {
      await api(item ? `${meta.endpoint}/${item.id}` : meta.endpoint, { method: item ? "PUT" : "POST", body });
      onDone();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : `No se pudo guardar ${meta.the}.`);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl bg-uach-canvas p-4">
      <p className="text-sm font-semibold text-uach-ink">{item ? `Editar ${meta.one}` : meta.newOne}</p>
      {error && <FormAlert message={error} />}
      <div className={`grid grid-cols-1 gap-3 ${kind === "subject" ? "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem]" : "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}`}>
        <div>
          <label htmlFor={`${prefix}-name`} className="mb-1 block text-xs font-medium text-uach-ink/75">Nombre</label>
          <input id={`${prefix}-name`} name="name" required maxLength={150} defaultValue={item?.name} placeholder={meta.namePlaceholder} autoFocus className={INPUT} />
        </div>
        <div>
          <label htmlFor={`${prefix}-code`} className="mb-1 block text-xs font-medium text-uach-ink/75">Clave</label>
          <input
            id={`${prefix}-code`}
            name="code"
            required
            maxLength={20}
            defaultValue={item?.code}
            placeholder={meta.codePlaceholder}
            autoCapitalize="characters"
            spellCheck={false}
            className={`${INPUT} uppercase`}
          />
        </div>
        {kind === "subject" && (
          <div>
            <label htmlFor={`${prefix}-semester`} className="mb-1 block text-xs font-medium text-uach-ink/75">{scheme === "SEMESTRAL" ? "Semestre" : "Cuatrimestre"}</label>
            <input id={`${prefix}-semester`} name="semester" type="number" min={1} max={12} required defaultValue={item?.semester ?? 1} className={INPUT} />
          </div>
        )}
        {kind === "faculty" && (
          <div>
            <label htmlFor={`${prefix}-scheme`} className="mb-1 block text-xs font-medium text-uach-ink/75">Periodos</label>
            <select id={`${prefix}-scheme`} name="scheme" defaultValue={schemeOf(item)} className={INPUT}>
              {TERM_SCHEMES.map((value) => (
                <option key={value} value={value}>
                  {SCHEME_TEXT[value].label}
                </option>
              ))}
            </select>
          </div>
        )}
        {kind === "career" && item && faculties && (
          <div className="sm:col-span-2">
            <label htmlFor={`${prefix}-faculty`} className="mb-1 block text-xs font-medium text-uach-ink/75">Nivel</label>
            <select id={`${prefix}-faculty`} name="facultyId" defaultValue={parent} className={INPUT}>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.code} · {faculty.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Guardar
        </button>
      </div>
    </form>
  );
}

/** Botones de editar y borrar de una fila. Borrar solo aparece si no hay nada que dependa de ella. */
function RowActions({
  kind,
  item,
  canDelete,
  blockedReason,
  onEdit,
}: {
  kind: Kind;
  item: { id: string; name: string };
  canDelete: boolean;
  blockedReason: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const meta = LABELS[kind];

  async function remove() {
    if (!window.confirm(`¿Borrar ${meta.the} «${item.name}»?`)) return;
    setBusy(true);
    try {
      await api(`${meta.endpoint}/${item.id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={onEdit} className={`${BTN_GHOST} h-10 px-2.5`} aria-label={`Editar ${item.name}`}>
        <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        disabled={busy || !canDelete}
        onClick={remove}
        title={canDelete ? undefined : blockedReason}
        aria-label={canDelete ? `Borrar ${item.name}` : `No se puede borrar ${item.name}: ${blockedReason}`}
        className={`${BTN_DANGER} h-10 px-2.5 disabled:cursor-not-allowed disabled:text-uach-ink/25 disabled:hover:bg-transparent`}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

function SubjectRow({ subject, careerId, scheme }: { subject: CatalogSubject; careerId: string; scheme: TermScheme }) {
  const [editing, setEditing] = useState(false);
  const { courses, resources } = subject._count;
  if (editing) {
    return (
      <li className="py-2">
        <EntityForm kind="subject" item={subject} parent={careerId} scheme={scheme} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-14 shrink-0 text-xs tabular-nums text-uach-ink/60">{subject.semester}.º {SCHEME_TEXT[scheme].short}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-uach-ink">{subject.name}</p>
        <p className="text-xs tabular-nums text-uach-ink/60">
          {subject.code} · {courses} {courses === 1 ? "curso" : "cursos"}
          {resources > 0 ? ` · ${resources} en repositorio` : ""}
        </p>
      </div>
      <RowActions
        kind="subject"
        item={subject}
        canDelete={courses === 0 && resources === 0}
        blockedReason="tiene cursos o recursos"
        onEdit={() => setEditing(true)}
      />
    </li>
  );
}

function CareerBlock({
  career,
  facultyId,
  faculties,
  scheme,
}: {
  career: CatalogCareer;
  facultyId: string;
  faculties: CatalogFaculty[];
  scheme: TermScheme;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const students = career._count.users;

  if (editing) {
    return (
      <li className="py-2">
        <EntityForm kind="career" item={career} parent={facultyId} faculties={faculties} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="py-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="press-soft flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left hover:bg-uach-canvas"
        >
          <ChevronRight className={`h-4 w-4 shrink-0 text-uach-ink/60 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
          <GraduationCap className="h-4 w-4 shrink-0 text-uach-teal" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-uach-ink">{career.name}</span>
            <span className="block text-xs tabular-nums text-uach-ink/60">
              {career.code} · {career.subjects.length} {career.subjects.length === 1 ? "materia" : "materias"} · {students}{" "}
              {students === 1 ? "alumno" : "alumnos"}
            </span>
          </span>
        </button>
        <RowActions
          kind="career"
          item={career}
          canDelete={career.subjects.length === 0 && students === 0}
          blockedReason="tiene materias o alumnos"
          onEdit={() => setEditing(true)}
        />
      </div>
      {open && (
        <div className="mb-2 ml-8 border-l border-uach-ink/10 pl-4">
          {career.subjects.length > 0 ? (
            <ul className="divide-y divide-uach-ink/[0.06]">
              {career.subjects.map((subject) => (
                <SubjectRow key={subject.id} subject={subject} careerId={career.id} scheme={scheme} />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-uach-ink/60">Sin materias todavía.</p>
          )}
          {adding ? (
            <div className="pt-2">
              <EntityForm kind="subject" parent={career.id} scheme={scheme} onDone={() => setAdding(false)} />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className={`${BTN_GHOST} mt-1`}>
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Agregar materia
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function FacultyCard({ faculty, faculties }: { faculty: CatalogFaculty; faculties: CatalogFaculty[] }) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <section className={`${CARD} p-5`}>
      {editing ? (
        <EntityForm kind="faculty" item={faculty} onDone={() => setEditing(false)} />
      ) : (
        <header className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
            <Building2 className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-uach-ink">{faculty.name}</h2>
            <p className="text-xs tabular-nums text-uach-ink/60">
              {faculty.code} · {SCHEME_TEXT[schemeOf(faculty)].label} · {faculty.careers.length}{" "}
              {faculty.careers.length === 1 ? "carrera" : "carreras"}
            </p>
          </div>
          <RowActions
            kind="faculty"
            item={faculty}
            canDelete={faculty.careers.length === 0}
            blockedReason="tiene carreras"
            onEdit={() => setEditing(true)}
          />
        </header>
      )}

      <ul className="mt-3 divide-y divide-uach-ink/[0.06]">
        {faculty.careers.map((career) => (
          <CareerBlock key={career.id} career={career} facultyId={faculty.id} faculties={faculties} scheme={schemeOf(faculty)} />
        ))}
      </ul>
      {adding ? (
        <div className="mt-2">
          <EntityForm kind="career" parent={faculty.id} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${BTN_SECONDARY} mt-3`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Agregar carrera
        </button>
      )}
    </section>
  );
}

export function CatalogAdmin({ catalog }: { catalog: CatalogFaculty[] }) {
  const [adding, setAdding] = useState(catalog.length === 0);
  const careers = catalog.reduce((sum, faculty) => sum + faculty.careers.length, 0);
  const subjects = catalog.reduce(
    (sum, faculty) => sum + faculty.careers.reduce((inner, career) => inner + career.subjects.length, 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-uach-ink/75">
          <BookOpen className="h-4 w-4 text-uach-teal" strokeWidth={1.75} aria-hidden />
          {catalog.length} {catalog.length === 1 ? "nivel" : "niveles"} · {careers} carreras · {subjects} materias
        </p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Nuevo nivel
          </button>
        )}
      </div>
      {adding && (
        <div className={`${CARD} p-2`}>
          <EntityForm kind="faculty" onDone={() => setAdding(false)} />
        </div>
      )}
      {catalog.map((faculty) => (
        <FacultyCard key={faculty.id} faculty={faculty} faculties={catalog} />
      ))}
    </div>
  );
}
