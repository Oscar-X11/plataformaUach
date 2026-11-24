"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Search } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { ACTIVITY_LABEL, type ActivityPage } from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";

const ROLE_TEXT: Record<string, string> = { STUDENT: "Alumno", TEACHER: "Docente", ADMIN: "Admin" };

/**
 * Bitácora de actividad paginada. Con `courseId`, la de una clase; sin él, la
 * completa (administración) con filtros por acción y búsqueda.
 */
export function ActivityFeed({ courseId }: { courseId?: string }) {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ActivityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (!courseId && action) params.set("action", action);
    if (!courseId && query) params.set("search", query);
    try {
      const path = courseId ? `/courses/${courseId}/activity` : "/activity";
      setData(await api<ActivityPage>(`${path}?${params.toString()}`));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo cargar la bitácora.");
    } finally {
      setLoading(false);
    }
  }, [courseId, page, action, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-3">
      {!courseId && (
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label className="relative flex-1">
            <span className="sr-only">Buscar en la bitácora</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-uach-ink/50" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={100}
              placeholder="Nombre, matrícula o texto"
              className={`${INPUT} pl-9`}
            />
          </label>
          <label className="sm:w-56">
            <span className="sr-only">Tipo de acción</span>
            <select
              value={action}
              onChange={(event) => {
                setPage(1);
                setAction(event.target.value);
              }}
              className={INPUT}
            >
              <option value="">Todas las acciones</option>
              {Object.entries(ACTIVITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </form>
      )}

      {error && <FormAlert message={error} />}

      {loading && !data ? (
        <p className="flex items-center gap-2 px-2 py-6 text-sm text-uach-ink/75">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Cargando…
        </p>
      ) : data && data.items.length === 0 ? (
        <p className="rounded-xl bg-uach-canvas px-4 py-6 text-center text-sm text-uach-ink/75">Sin actividad registrada.</p>
      ) : (
        data && (
          <ul className={`divide-y divide-uach-ink/[0.06] transition-opacity ${loading ? "opacity-60" : ""}`}>
            {data.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-2 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                <time dateTime={entry.createdAt} className="shrink-0 text-xs tabular-nums text-uach-ink/60 sm:w-36">
                  {formatDateTime(entry.createdAt)}
                </time>
                <span className="min-w-0 flex-1 text-sm text-uach-ink">
                  {entry.user ? (
                    <span className="font-medium">{entry.user.fullName}</span>
                  ) : (
                    <span className="font-medium text-uach-ink/60">Usuario eliminado</span>
                  )}
                  {entry.user && (
                    <span className="text-xs text-uach-ink/60"> · {ROLE_TEXT[entry.user.role] ?? entry.user.role}</span>
                  )}
                  <span className="block text-uach-ink/80">{entry.summary}</span>
                </span>
                <span className="shrink-0 self-start rounded-full bg-uach-canvas px-2 py-0.5 text-xs text-uach-ink/75">
                  {ACTIVITY_LABEL[entry.action] ?? entry.action}
                </span>
              </li>
            ))}
          </ul>
        )
      )}

      {data && data.total > data.pageSize && (
        <nav aria-label="Páginas de la bitácora" className="flex items-center justify-between gap-2 px-2">
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
