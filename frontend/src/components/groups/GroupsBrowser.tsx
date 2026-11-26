"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, MapPin, Plus, Search, UsersRound } from "lucide-react";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { SubjectOptionLite } from "@/lib/classwork";
import type { StudyGroup, StudyGroupDetail } from "@/lib/institutional";

function CreateGroupForm({ subjects, onCancel }: { subjects: SubjectOptionLite[]; onCancel: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const group = await api<StudyGroupDetail>("/study-groups", {
        method: "POST",
        body: {
          title: form.get("title"),
          description: form.get("description"),
          capacity: Number(form.get("capacity")),
          meetingInfo: form.get("meetingInfo"),
          subjectId: form.get("subjectId"),
        },
      });
      router.push(`/grupos-estudio/${group.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo crear el grupo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className={`${CARD} space-y-4 p-5`}>
      <h2 className="text-base font-semibold text-uach-ink">Nuevo grupo de estudio</h2>
      {error && <FormAlert message={error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="grp-title" className="mb-1.5 block text-sm font-medium text-uach-ink">Nombre</label>
          <input id="grp-title" name="title" required maxLength={120} placeholder="Ej. Repaso de SQL para el parcial" className={INPUT} autoFocus />
        </div>
        <div>
          <label htmlFor="grp-capacity" className="mb-1.5 block text-sm font-medium text-uach-ink">Cupo</label>
          <input id="grp-capacity" name="capacity" type="number" min={2} max={50} defaultValue={6} className={INPUT} />
        </div>
        <div>
          <label htmlFor="grp-subject" className="mb-1.5 block text-sm font-medium text-uach-ink">
            Materia <span className="font-normal text-uach-ink/60">(opcional)</span>
          </label>
          <select id="grp-subject" name="subjectId" defaultValue="" className={INPUT}>
            <option value="">Sin materia</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grp-meeting" className="mb-1.5 block text-sm font-medium text-uach-ink">
            Cuándo y dónde <span className="font-normal text-uach-ink/60">(opcional)</span>
          </label>
          <input id="grp-meeting" name="meetingInfo" maxLength={200} placeholder="Martes 16:00, biblioteca" className={INPUT} />
        </div>
      </div>
      <div>
        <label htmlFor="grp-desc" className="mb-1.5 block text-sm font-medium text-uach-ink">Descripción</label>
        <textarea id="grp-desc" name="description" required rows={3} maxLength={2000} placeholder="¿Qué van a estudiar y cómo se organizan?" className={`${INPUT} resize-y`} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Crear grupo
        </button>
      </div>
    </form>
  );
}

/** `canCreate` es falso para el administrador: ve y modera los grupos, pero no participa. */
export function GroupsBrowser({ subjects, canCreate }: { subjects: SubjectOptionLite[]; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [mine, setMine] = useState(false);
  const [groups, setGroups] = useState<StudyGroup[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (subjectId) params.set("subjectId", subjectId);
    if (mine) params.set("mine", "true");
    api<StudyGroup[]>(`/study-groups?${params}`).then(setGroups).catch(() => setGroups([]));
  }, [search, subjectId, mine]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      {creating && canCreate ? (
        <CreateGroupForm subjects={subjects} onCancel={() => setCreating(false)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-uach-soft" aria-hidden />
            <label htmlFor="grp-search" className="sr-only">Buscar grupos</label>
            <input id="grp-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar grupos" className={`${INPUT} h-11 pl-9`} />
          </div>
          <label htmlFor="grp-filter" className="sr-only">Materia</label>
          <select id="grp-filter" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={`${INPUT} h-11`}>
            <option value="">Todas las materias</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>
            ))}
          </select>
          {canCreate && (
            <>
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm text-uach-ink">
                <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-uach-teal" />
                Solo mis grupos
              </label>
              <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                Crear grupo
              </button>
            </>
          )}
        </div>
      )}

      {groups === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-uach-ink/75">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Cargando…
        </p>
      ) : groups.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
            <UsersRound className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-uach-ink">
            {mine ? "Aún no estás en ningún grupo" : "No hay grupos con esos filtros"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-uach-ink/75">Estudiar acompañado rinde más. Crea uno e invita a tus compañeros.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const full = group.memberCount >= group.capacity;
            return (
              <li key={group.id}>
                <Link href={`/grupos-estudio/${group.id}`} className={`${CARD} lift flex h-full flex-col gap-3 p-5 ${FOCUS_RING}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate text-xs font-medium text-uach-tealDark">
                      {group.subject ? `${group.subject.code} · ${group.subject.name}` : "General"}
                    </span>
                    {group.isMember ? (
                      <span className="shrink-0 rounded-full bg-uach-teal/10 px-2.5 py-0.5 text-xs font-medium text-uach-tealDark">Participas</span>
                    ) : full ? (
                      <span className="shrink-0 rounded-full bg-uach-canvas px-2.5 py-0.5 text-xs font-medium text-uach-ink/75">Lleno</span>
                    ) : null}
                  </div>
                  <h2 className="line-clamp-2 font-semibold text-uach-ink">{group.title}</h2>
                  <p className="line-clamp-3 text-sm text-uach-ink/75">{group.description}</p>
                  <div className="mt-auto space-y-1 text-xs text-uach-ink/75">
                    {group.meetingInfo && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                        <span className="truncate">{group.meetingInfo}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <UsersRound className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      {group.memberCount}/{group.capacity} integrantes · organiza {group.creator.fullName}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
