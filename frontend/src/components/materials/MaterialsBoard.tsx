"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, FileText, FolderPlus, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { PreviewButton } from "@/components/ui/PreviewButton";
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { SUBMISSION_ACCEPT, fileHref, formatBytes } from "@/lib/classwork";
import { formatRelative } from "@/lib/dashboard/format";
import type { Material, MaterialsView, Topic } from "@/lib/institutional";
import { previewFor } from "@/lib/preview";

const MAX_MB = 25;

function MaterialForm({ courseId, topics, onDone }: { courseId: string; topics: Topic[]; onDone: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<"FILE" | "LINK">("FILE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const source = new FormData(event.currentTarget);
    const body = new FormData();
    for (const field of ["title", "description", "topicId"]) body.append(field, String(source.get(field) ?? ""));
    if (kind === "FILE") {
      const file = source.get("file");
      if (!(file instanceof File) || file.size === 0) return setError("Selecciona un archivo.");
      if (file.size > MAX_MB * 1024 * 1024) return setError(`El archivo pesa más de ${MAX_MB} MB.`);
      body.append("file", file);
    } else {
      body.append("url", String(source.get("url") ?? ""));
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/courses/${courseId}/materials`, { method: "POST", body });
      onDone();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo publicar el material.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className={`${CARD} space-y-4 p-5`}>
      <h2 className="text-base font-semibold text-uach-ink">Nuevo material</h2>
      {error && <FormAlert message={error} />}
      <div role="radiogroup" aria-label="Tipo de material" className="flex gap-1 rounded-xl bg-uach-canvas p-1">
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
            {value === "FILE" ? "Archivo" : "Enlace"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="mat-title" className="mb-1.5 block text-sm font-medium text-uach-ink">Título</label>
          <input id="mat-title" name="title" required maxLength={150} className={INPUT} autoFocus />
        </div>
        <div>
          <label htmlFor="mat-topic" className="mb-1.5 block text-sm font-medium text-uach-ink">Tema</label>
          <select id="mat-topic" name="topicId" defaultValue="" className={INPUT}>
            <option value="">Sin tema</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.title}</option>
            ))}
          </select>
        </div>
      </div>
      {kind === "FILE" ? (
        <div>
          <label htmlFor="mat-file" className="mb-1.5 block text-sm font-medium text-uach-ink">Archivo</label>
          <input id="mat-file" name="file" type="file" accept={SUBMISSION_ACCEPT} className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-uach-subtle file:px-3 file:py-1 file:text-sm file:text-uach-tealDark`} />
          <p className="mt-1 text-xs text-uach-ink/60">PDF, Office, imágenes, ZIP o texto · hasta {MAX_MB} MB.</p>
        </div>
      ) : (
        <div>
          <label htmlFor="mat-url" className="mb-1.5 block text-sm font-medium text-uach-ink">Enlace</label>
          <input id="mat-url" name="url" type="url" placeholder="https://drive.google.com/…" maxLength={500} className={INPUT} />
          <p className="mt-1 text-xs text-uach-ink/60">
            Si es de Google Drive, compártelo como «Cualquier persona con el enlace» para que se vea la vista previa.
          </p>
        </div>
      )}
      <div>
        <label htmlFor="mat-desc" className="mb-1.5 block text-sm font-medium text-uach-ink">
          Descripción <span className="font-normal text-uach-ink/60">(opcional)</span>
        </label>
        <textarea id="mat-desc" name="description" rows={2} maxLength={2000} className={`${INPUT} resize-y`} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Publicar
        </button>
      </div>
    </form>
  );
}

function MaterialRow({ material, canManage, now }: { material: Material; canManage: boolean; now: Date }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const href = material.kind === "FILE" && material.fileUrl ? fileHref(material.fileUrl) : (material.url ?? "#");
  const Icon = material.kind === "FILE" ? FileText : ExternalLink;
  const preview = previewFor(material);

  async function remove() {
    if (!window.confirm(`¿Borrar «${material.title}»?`)) return;
    setBusy(true);
    try {
      await api(`/materials/${material.id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
      setBusy(false);
    }
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-uach-ink hover:text-uach-tealDark hover:underline"
        >
          {material.title}
        </a>
        {material.description && <p className="mt-0.5 line-clamp-2 text-sm text-uach-ink/75">{material.description}</p>}
        <p className="mt-0.5 text-xs text-uach-ink/75">
          {material.kind === "FILE"
            ? `${material.originalName} · ${formatBytes(material.size ?? 0)}`
            : new URL(material.url ?? "https://x").hostname}
          {" · "}
          {formatRelative(material.createdAt, now)}
        </p>
      </div>
      {preview && <PreviewButton source={preview} title={material.title} openHref={href} compact />}
      {canManage && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={`Borrar ${material.title}`}
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-uach-ink/50 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </li>
  );
}

function TopicHeader({ topic, canManage }: { topic: Topic; canManage: boolean }) {
  const router = useRouter();

  async function rename() {
    const title = window.prompt("Nuevo nombre del tema", topic.title)?.trim();
    if (!title || title === topic.title) return;
    try {
      await api(`/topics/${topic.id}`, { method: "PATCH", body: { title } });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo renombrar.");
    }
  }

  async function remove() {
    if (!window.confirm(`¿Borrar el tema «${topic.title}»? Su material quedará sin tema.`)) return;
    try {
      await api(`/topics/${topic.id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-uach-ink/[0.08] pb-2">
      <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-uach-petrol">{topic.title}</h2>
      {canManage && (
        <>
          <button type="button" onClick={rename} aria-label={`Renombrar ${topic.title}`} className="press grid h-10 w-10 place-items-center rounded-xl text-uach-ink/50 hover:bg-uach-canvas hover:text-uach-ink">
            <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" onClick={remove} aria-label={`Borrar tema ${topic.title}`} className="press grid h-10 w-10 place-items-center rounded-xl text-uach-ink/50 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

export function MaterialsBoard({ courseId, data, nowIso }: { courseId: string; data: MaterialsView; nowIso: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const now = new Date(nowIso);

  async function addTopic() {
    const title = window.prompt("Nombre del tema o unidad (p. ej. «Unidad 1: SQL básico»)")?.trim();
    if (!title) return;
    try {
      await api(`/courses/${courseId}/topics`, { method: "POST", body: { title } });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo crear el tema.");
    }
  }

  const sections = [
    ...data.topics.map((topic) => ({ topic, items: data.materials.filter((m) => m.topicId === topic.id) })),
    { topic: null, items: data.materials.filter((m) => !m.topicId || !data.topics.some((t) => t.id === m.topicId)) },
  ].filter((section) => section.topic || section.items.length > 0);

  return (
    <div className="space-y-4">
      {data.canManage &&
        (adding ? (
          <MaterialForm courseId={courseId} topics={data.topics} onDone={() => setAdding(false)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdding(true)} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Nuevo material
            </button>
            <button type="button" onClick={addTopic} className={BTN_SECONDARY}>
              <FolderPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Nuevo tema
            </button>
          </div>
        ))}

      {sections.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
            <FileText className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-uach-ink">Aún no hay material</h2>
          <p className="mt-1 max-w-sm text-sm text-uach-ink/75">
            {data.canManage
              ? "Organiza tus presentaciones, lecturas y enlaces por tema o unidad."
              : "Aquí encontrarás las presentaciones, lecturas y enlaces que comparta tu docente."}
          </p>
        </div>
      ) : (
        sections.map(({ topic, items }) => (
          <section key={topic?.id ?? "sin-tema"} className={`${CARD} p-4 sm:p-5`}>
            {topic ? (
              <TopicHeader topic={topic} canManage={data.canManage} />
            ) : (
              <h2 className="border-b border-uach-ink/[0.08] pb-2 text-lg font-semibold text-uach-petrol">
                {data.topics.length ? "Sin tema" : "Material del curso"}
              </h2>
            )}
            {items.length === 0 ? (
              <p className="py-4 text-sm text-uach-ink/75">Este tema todavía no tiene material.</p>
            ) : (
              <ul className="divide-y divide-uach-ink/[0.06]">
                {items.map((material) => (
                  <MaterialRow key={material.id} material={material} canManage={data.canManage} now={now} />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
