"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, ExternalLink, LoaderCircle, Search, Trash2, Upload, X } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { PreviewButton } from "@/components/ui/PreviewButton";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { SUBMISSION_ACCEPT, fileHref, formatBytes, type SubjectOptionLite } from "@/lib/classwork";
import { formatRelative } from "@/lib/dashboard/format";
import {
  RESOURCE_TYPE_LABELS,
  type ResourceItem,
  type ResourcePage,
  type ResourceStatus,
  type ResourceType,
} from "@/lib/institutional";
import { previewFor } from "@/lib/preview";
import type { UserRole } from "@/lib/session";

type View = "explore" | "mine" | "review";
const MAX_MB = 25;

const STATUS: Record<ResourceStatus, { label: string; chip: string }> = {
  APPROVED: { label: "Publicado", chip: "bg-uach-emerald/10 text-uach-emerald" },
  PENDING: { label: "En revisión", chip: "bg-amber-50 text-amber-800" },
  REJECTED: { label: "No publicado", chip: "bg-red-50 text-red-700" },
};

function UploadForm({ subjects, role, onDone }: { subjects: SubjectOptionLite[]; role: UserRole; onDone: (uploaded: boolean) => void }) {
  const [kind, setKind] = useState<"FILE" | "LINK">("FILE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (kind === "FILE") {
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) return setError("Selecciona un archivo.");
      if (file.size > MAX_MB * 1024 * 1024) return setError(`El archivo pesa más de ${MAX_MB} MB.`);
    } else if (!String(form.get("url") ?? "").trim()) {
      return setError("Pega el enlace del archivo.");
    }
    setBusy(true);
    setError(null);
    try {
      await api("/repository", { method: "POST", body: form });
      onDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo subir el recurso.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className={`${CARD} space-y-4 p-5`}>
      <div>
        <h2 className="text-base font-semibold text-uach-ink">Compartir un recurso</h2>
        <p className="text-sm text-uach-ink/75">
          {role === "STUDENT"
            ? "Un administrador lo revisará antes de publicarlo. Comparte solo material propio o con permiso."
            : "Como docente o administrador se publica de inmediato."}
        </p>
      </div>
      {error && <FormAlert message={error} />}
      <div role="radiogroup" aria-label="Cómo compartirlo" className="flex gap-1 rounded-xl bg-uach-canvas p-1">
        {(["FILE", "LINK"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={`h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${
              kind === value ? "bg-uach-surface text-uach-tealDark shadow-sm" : "text-uach-ink/75"
            }`}
          >
            {value === "FILE" ? "Subir archivo" : "Enlace de Drive"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="res-title" className="mb-1.5 block text-sm font-medium text-uach-ink">Título</label>
          <input id="res-title" name="title" required maxLength={150} className={INPUT} autoFocus />
        </div>
        <div>
          <label htmlFor="res-subject" className="mb-1.5 block text-sm font-medium text-uach-ink">Materia</label>
          <select id="res-subject" name="subjectId" required defaultValue="" className={INPUT}>
            <option value="" disabled>Selecciona…</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="res-type" className="mb-1.5 block text-sm font-medium text-uach-ink">Tipo</label>
          <select id="res-type" name="type" required defaultValue="NOTE" className={INPUT}>
            {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {kind === "FILE" ? (
          <div className="sm:col-span-2">
            <label htmlFor="res-file" className="mb-1.5 block text-sm font-medium text-uach-ink">Archivo</label>
            <input id="res-file" name="file" type="file" accept={SUBMISSION_ACCEPT} className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-uach-subtle file:px-3 file:py-1 file:text-sm file:text-uach-tealDark`} />
            <p className="mt-1 text-xs text-uach-ink/60">PDF, Office, imágenes, ZIP o texto · hasta {MAX_MB} MB.</p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor="res-url" className="mb-1.5 block text-sm font-medium text-uach-ink">Enlace</label>
            <input id="res-url" name="url" type="url" placeholder="https://drive.google.com/…" maxLength={500} className={INPUT} />
            <p className="mt-1 text-xs text-uach-ink/60">
              Compártelo en Drive como «Cualquier persona con el enlace» para que los demás puedan verlo.
            </p>
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="res-desc" className="mb-1.5 block text-sm font-medium text-uach-ink">
            Descripción <span className="font-normal text-uach-ink/60">(opcional)</span>
          </label>
          <textarea id="res-desc" name="description" rows={2} maxLength={2000} className={`${INPUT} resize-y`} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => onDone(false)} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          Compartir
        </button>
      </div>
    </form>
  );
}

function ResourceCard({
  item,
  view,
  userId,
  isAdmin,
  now,
  onChanged,
}: {
  item: ResourceItem;
  view: View;
  userId: string;
  isAdmin: boolean;
  now: Date;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const preview = previewFor(item);
  const openHref = item.fileUrl ? fileHref(item.fileUrl) : (item.url ?? "#");
  let host = "enlace";
  try {
    host = new URL(item.url ?? "").hostname;
  } catch {
    // enlace inválido: se muestra el texto genérico
  }

  async function review(approve: boolean) {
    const note = approve ? undefined : window.prompt("¿Por qué no se publica? El autor verá este motivo.")?.trim();
    if (!approve && !note) return;
    setBusy(true);
    try {
      await api(`/repository/${item.id}/review`, { method: "PATCH", body: { approve, note } });
      onChanged();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo revisar.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`¿Borrar «${item.title}» del repositorio?`)) return;
    setBusy(true);
    try {
      await api(`/repository/${item.id}`, { method: "DELETE" });
      onChanged();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
      setBusy(false);
    }
  }

  return (
    <li className={`${CARD} flex flex-col gap-3 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-uach-teal/10 px-2.5 py-0.5 text-xs font-medium text-uach-tealDark">
          {RESOURCE_TYPE_LABELS[item.type]}
        </span>
        {view !== "explore" && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[item.status].chip}`}>
            {STATUS[item.status].label}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 font-semibold text-uach-ink">{item.title}</h3>
        <p className="mt-0.5 truncate text-sm text-uach-ink/75">{item.subject.code} · {item.subject.name}</p>
        {item.description && <p className="mt-2 line-clamp-3 text-sm text-uach-ink/75">{item.description}</p>}
        {item.status === "REJECTED" && item.reviewNote && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Motivo: {item.reviewNote}</p>
        )}
      </div>
      <p className="mt-auto text-xs text-uach-ink/75">
        {item.author.fullName} · {formatRelative(item.createdAt, now)} · {item.fileUrl ? formatBytes(item.size ?? 0) : host}
      </p>
      <div className="flex flex-wrap gap-2">
        {preview && <PreviewButton source={preview} title={item.title} openHref={openHref} />}
        <a href={openHref} target="_blank" rel="noopener noreferrer" className={BTN_SECONDARY}>
          {item.fileUrl ? (
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          ) : (
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          )}
          Abrir
        </a>
        {view === "review" && (
          <>
            <button type="button" disabled={busy} onClick={() => review(true)} className={BTN_PRIMARY}>
              <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
              Publicar
            </button>
            <button type="button" disabled={busy} onClick={() => review(false)} className={BTN_DANGER}>
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              Rechazar
            </button>
          </>
        )}
        {view !== "review" && (item.author.id === userId || isAdmin) && (
          <button type="button" disabled={busy} onClick={remove} className={BTN_DANGER} aria-label={`Borrar ${item.title}`}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

export function RepositoryBrowser({
  subjects,
  userId,
  role,
  initialView,
}: {
  subjects: SubjectOptionLite[];
  userId: string;
  role: UserRole;
  initialView: View;
}) {
  const isAdmin = role === "ADMIN";
  const [view, setView] = useState<View>(initialView === "review" && !isAdmin ? "explore" : initialView);
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState<"" | ResourceType>("");
  const [items, setItems] = useState<ResourceItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const now = new Date();

  const load = useCallback(() => {
    setItems(null);
    if (view === "explore") {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (subjectId) params.set("subjectId", subjectId);
      if (type) params.set("type", type);
      api<ResourcePage>(`/repository?${params}`)
        .then((page) => {
          setItems(page.items);
          setTotal(page.total);
        })
        .catch(() => setItems([]));
    } else {
      api<ResourceItem[]>(view === "mine" ? "/repository/mine" : "/repository/pending")
        .then((list) => {
          setItems(list);
          setTotal(list.length);
        })
        .catch(() => setItems([]));
    }
  }, [view, search, subjectId, type]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const tabs: { id: View; label: string }[] = [
    { id: "explore", label: "Explorar" },
    { id: "mine", label: "Mis aportes" },
    ...(isAdmin ? [{ id: "review" as const, label: "Por revisar" }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Vista del repositorio" className="flex gap-1 rounded-xl bg-uach-surface p-1 shadow-[0_1px_2px_rgba(8,59,70,0.04)] ring-1 ring-uach-ink/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={view === tab.id}
              onClick={() => setView(tab.id)}
              className={`h-10 rounded-lg px-4 text-sm font-medium transition-colors ${
                view === tab.id ? "bg-uach-teal/10 text-uach-tealDark" : "text-uach-ink/75 hover:text-uach-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {!uploading && (
          <button type="button" onClick={() => setUploading(true)} className={BTN_PRIMARY}>
            <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Compartir recurso
          </button>
        )}
      </div>

      {notice && <FormAlert tone="info" message={notice} />}
      {uploading && (
        <UploadForm
          subjects={subjects}
          role={role}
          onDone={(uploaded) => {
            setUploading(false);
            if (uploaded) {
              setNotice(role === "STUDENT" ? "¡Gracias! Tu recurso quedó en revisión; te avisaremos cuando se publique." : "Recurso publicado.");
              setView("mine");
              load();
            }
          }}
        />
      )}

      {view === "explore" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-uach-soft" aria-hidden />
            <label htmlFor="res-search" className="sr-only">Buscar</label>
            <input id="res-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, tema o materia" className={`${INPUT} h-11 pl-9`} />
          </div>
          <label htmlFor="res-filter-subject" className="sr-only">Materia</label>
          <select id="res-filter-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={`${INPUT} h-11`}>
            <option value="">Todas las materias</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>
            ))}
          </select>
          <label htmlFor="res-filter-type" className="sr-only">Tipo</label>
          <select id="res-filter-type" value={type} onChange={(e) => setType(e.target.value as "" | ResourceType)} className={`${INPUT} h-11`}>
            <option value="">Todos los tipos</option>
            {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {items === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-uach-ink/75">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Cargando…
        </p>
      ) : items.length === 0 ? (
        <p className={`${CARD} px-6 py-12 text-center text-sm text-uach-ink/75`}>
          {view === "explore"
            ? "No encontramos recursos con esos filtros. ¿Tienes buenos apuntes? Compártelos."
            : view === "mine"
              ? "Todavía no has compartido recursos."
              : "No hay recursos esperando revisión."}
        </p>
      ) : (
        <>
          {view === "explore" && <p className="text-sm text-uach-ink/75">{total} recursos</p>}
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ResourceCard key={item.id} item={item} view={view} userId={userId} isAdmin={isAdmin} now={now} onChanged={load} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
