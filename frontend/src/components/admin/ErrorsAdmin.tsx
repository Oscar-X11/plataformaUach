"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/dashboard/format";

type ErrorSource = "SERVER" | "CLIENT" | "USER";

interface ErrorReportView {
  id: string;
  source: ErrorSource;
  message: string;
  detail: string | null;
  path: string | null;
  count: number;
  userAgent: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  lastSeenAt: string;
  user: { id: string; fullName: string; username: string; role: string } | null;
}

interface ErrorsPage {
  items: ErrorReportView[];
  total: number;
  open: number;
  page: number;
  pageSize: number;
}

const SOURCE: Record<ErrorSource, { label: string; chip: string }> = {
  USER: { label: "Reporte de usuario", chip: "bg-uach-teal/10 text-uach-tealDark" },
  SERVER: { label: "Servidor", chip: "bg-red-50 text-red-700" },
  CLIENT: { label: "Pantalla", chip: "bg-amber-50 text-amber-800" },
};

const ROLE_TEXT: Record<string, string> = { STUDENT: "Alumno", TEACHER: "Docente", ADMIN: "Admin" };

function ErrorRow({ item, onChanged }: { item: ErrorReportView; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUser = item.source === "USER";

  async function resolve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/errors/${item.id}/resolve`, { method: "PATCH", body: note.trim() ? { note: note.trim() } : {} });
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo marcar como atendido.");
      setBusy(false);
    }
  }

  return (
    <li className="space-y-2 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SOURCE[item.source].chip}`}>
              {SOURCE[item.source].label}
            </span>
            {item.count > 1 && (
              <span className="rounded-full bg-uach-canvas px-2.5 py-0.5 text-xs font-medium tabular-nums text-uach-ink/75">
                {item.count} veces
              </span>
            )}
          </p>
          <p className="mt-1.5 break-words text-sm font-medium text-uach-ink">{item.message}</p>
          <p className="mt-0.5 text-xs text-uach-ink/75">
            {item.user ? (
              <>
                {item.user.fullName} ({item.user.username}, {ROLE_TEXT[item.user.role] ?? item.user.role})
              </>
            ) : (
              "Sin usuario"
            )}
            {item.path && (
              <>
                {" · "}
                <span className="font-mono">{item.path}</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-uach-ink/60">
            {item.count > 1 ? `Primera vez ${formatDateTime(item.createdAt)} · última ${formatDateTime(item.lastSeenAt)}` : formatDateTime(item.createdAt)}
            {item.resolvedAt && ` · atendido ${formatDateTime(item.resolvedAt)}`}
          </p>
          {item.resolutionNote && <p className="mt-1 text-sm text-uach-ink/80">Nota: {item.resolutionNote}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(item.detail || item.userAgent) && (
            <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className={BTN_GHOST}>
              {expanded ? "Ocultar detalle" : "Ver detalle"}
            </button>
          )}
          {!item.resolvedAt && !resolving && (
            <button type="button" onClick={() => setResolving(true)} className={BTN_GHOST}>
              <CircleCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Marcar como atendido
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 rounded-xl bg-uach-canvas p-3">
          {item.detail && (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-uach-ink/85">{item.detail}</pre>
          )}
          {item.userAgent && <p className="break-words text-xs text-uach-ink/60">Navegador: {item.userAgent}</p>}
        </div>
      )}

      {resolving && (
        <form onSubmit={resolve} className="space-y-2 rounded-xl bg-uach-canvas p-3">
          {error && <FormAlert message={error} />}
          {isUser ? (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-uach-ink">Nota para {item.user?.fullName ?? "el usuario"} (opcional)</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                placeholder="Ej.: ya quedó corregido; vuelve a intentarlo."
                className={INPUT}
              />
              <span className="mt-1 block text-xs text-uach-ink/60">Le llega como notificación.</span>
            </label>
          ) : (
            <p className="text-sm text-uach-ink/75">
              Si el error vuelve a ocurrir después, aparecerá de nuevo como abierto.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setResolving(false)} className={BTN_GHOST}>Cancelar</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              Marcar como atendido
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

/** Errores automáticos y reportes de usuarios: abiertos y atendidos, con filtro por origen. */
export function ErrorsAdmin() {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [source, setSource] = useState<"" | ErrorSource>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ErrorsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ status, page: String(page) });
    if (source) params.set("source", source);
    try {
      setData(await api<ErrorsPage>(`/errors?${params.toString()}`));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudieron cargar los errores.");
    } finally {
      setLoading(false);
    }
  }, [status, source, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tabs = [
    { id: "open" as const, label: data ? `Abiertos (${data.open})` : "Abiertos" },
    { id: "resolved" as const, label: "Atendidos" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Estado" className="flex gap-1 rounded-xl bg-uach-surface p-1 shadow-[0_1px_2px_rgba(8,59,70,0.04)] ring-1 ring-uach-ink/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={status === tab.id}
              onClick={() => {
                setPage(1);
                setStatus(tab.id);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                status === tab.id ? "bg-uach-teal text-white" : "text-uach-ink/75 hover:bg-uach-canvas"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="sm:w-56">
          <span className="sr-only">Origen</span>
          <select
            value={source}
            onChange={(event) => {
              setPage(1);
              setSource(event.target.value as "" | ErrorSource);
            }}
            className={INPUT}
          >
            <option value="">Todos los orígenes</option>
            {(Object.keys(SOURCE) as ErrorSource[]).map((value) => (
              <option key={value} value={value}>{SOURCE[value].label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <FormAlert message={error} />}

      {loading && !data ? (
        <p className="flex items-center gap-2 px-2 py-6 text-sm text-uach-ink/75">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Cargando…
        </p>
      ) : data && data.items.length === 0 ? (
        <p className="rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">
          {status === "open" ? "No hay errores ni reportes pendientes." : "Todavía no hay nada atendido."}
        </p>
      ) : (
        data && (
          <ul className={`divide-y divide-uach-ink/[0.06] transition-opacity ${loading ? "opacity-60" : ""}`}>
            {data.items.map((item) => (
              <ErrorRow key={item.id} item={item} onChanged={load} />
            ))}
          </ul>
        )
      )}

      {data && data.total > data.pageSize && (
        <nav aria-label="Páginas de errores" className="flex items-center justify-between gap-2 px-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className={BTN_GHOST}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Anterior
          </button>
          <span className="text-xs tabular-nums text-uach-ink/75">
            Página {page} de {pages} · {data.total} registros
          </span>
          <button type="button" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)} className={BTN_GHOST}>
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
