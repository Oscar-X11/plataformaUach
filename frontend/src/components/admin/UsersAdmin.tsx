"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { AdminUserPage, AdminUserRow } from "@/lib/classwork";
import { ROLE_LABELS, type UserRole } from "@/lib/session";

const STATUS: Record<AdminUserRow["status"], { label: string; chip: string }> = {
  ACTIVE: { label: "Activa", chip: "bg-uach-emerald/10 text-uach-emerald" },
  INACTIVE: { label: "Inactiva", chip: "bg-red-50 text-red-700" },
  GRADUATED: { label: "Egresado", chip: "bg-uach-canvas text-uach-ink/75" },
};

/** Contraseña temporal recién generada: se muestra una sola vez. */
function TemporaryPassword({
  user,
  password,
  onClose,
}: {
  user: { fullName: string; username: string };
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-2xl bg-uach-petrol p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/80">
            Contraseña temporal de <strong className="text-white">{user.fullName}</strong> ({user.username})
          </p>
          <p className="mt-2 select-all font-mono text-2xl font-semibold tracking-wider">{password}</p>
          <p className="mt-2 text-xs text-white/75">
            Entrégala en persona. No se volverá a mostrar; al entrar, la plataforma le pedirá cambiarla.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/80 hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(password).then(() => setCopied(true)).catch(() => undefined)}
        className="press mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium hover:bg-white/15"
      >
        <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {copied ? "Copiada" : "Copiar"}
      </button>
    </div>
  );
}

function CreateStaffForm({ onCreated, onCancel }: { onCreated: (row: AdminUserRow, password: string) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ user: AdminUserRow; temporaryPassword: string }>("/users", {
        method: "POST",
        body: { username: form.get("username"), fullName: form.get("fullName"), role: form.get("role") },
      });
      onCreated(result.user, result.temporaryPassword);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo crear la cuenta.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className={`${CARD} space-y-4 p-5`}>
      <h2 className="text-base font-semibold text-uach-ink">Alta de personal</h2>
      <p className="text-sm text-uach-ink/75">Los alumnos se registran solos con su matrícula.</p>
      {error && <FormAlert message={error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="st-user" className="mb-1.5 block text-sm font-medium text-uach-ink">Número de empleado</label>
          <input id="st-user" name="username" required autoCapitalize="characters" spellCheck={false} className={INPUT} />
        </div>
        <div>
          <label htmlFor="st-name" className="mb-1.5 block text-sm font-medium text-uach-ink">Nombre completo</label>
          <input id="st-name" name="fullName" required minLength={3} className={INPUT} />
        </div>
        <div>
          <label htmlFor="st-role" className="mb-1.5 block text-sm font-medium text-uach-ink">Rol</label>
          <select id="st-role" name="role" defaultValue="TEACHER" className={INPUT}>
            <option value="TEACHER">Docente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={BTN_GHOST}>Cancelar</button>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Crear cuenta
        </button>
      </div>
    </form>
  );
}

export function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | UserRole>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUserPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ user: { fullName: string; username: string }; password: string } | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    api<AdminUserPage>(`/users?${params}`)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "No se pudo cargar la lista."));
  }, [page, role, search]);

  // Búsqueda con una pequeña espera para no consultar en cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function resetPassword(row: AdminUserRow) {
    if (!window.confirm(`¿Generar una contraseña temporal para ${row.fullName}? La actual dejará de funcionar.`)) return;
    setBusyId(row.id);
    try {
      const result = await api<{ user: { fullName: string; username: string }; temporaryPassword: string }>(
        `/users/${row.id}/reset-password`,
        { method: "POST" },
      );
      setSecret({ user: result.user, password: result.temporaryPassword });
      load();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo restablecer.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(row: AdminUserRow) {
    const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (next === "INACTIVE" && !window.confirm(`¿Desactivar la cuenta de ${row.fullName}? Ya no podrá iniciar sesión.`)) return;
    setBusyId(row.id);
    try {
      await api(`/users/${row.id}/status`, { method: "PATCH", body: { status: next } });
      load();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo cambiar el estado.");
    } finally {
      setBusyId(null);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      {secret && <TemporaryPassword user={secret.user} password={secret.password} onClose={() => setSecret(null)} />}

      {creating ? (
        <CreateStaffForm
          onCancel={() => setCreating(false)}
          onCreated={(user, password) => {
            setCreating(false);
            setSecret({ user, password });
            load();
          }}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-uach-soft" aria-hidden />
            <label htmlFor="user-search" className="sr-only">Buscar por nombre, matrícula o número de empleado</label>
            <input
              id="user-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, matrícula o número de empleado"
              className={`${INPUT} h-11 pl-9`}
            />
          </div>
          <label htmlFor="user-role" className="sr-only">Filtrar por rol</label>
          <select
            id="user-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as "" | UserRole);
              setPage(1);
            }}
            className={`${INPUT} h-11 sm:w-48`}
          >
            <option value="">Todos los roles</option>
            <option value="STUDENT">Alumnos</option>
            <option value="TEACHER">Docentes</option>
            <option value="ADMIN">Administradores</option>
          </select>
          <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>
            <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Alta de personal
          </button>
        </div>
      )}

      {error && <FormAlert message={error} />}

      <section className={`${CARD} p-2 sm:p-3`}>
        {!data ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-uach-ink/75">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Cargando…
          </p>
        ) : data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-uach-ink/75">No hay usuarios con esos filtros.</p>
        ) : (
          <ul className="divide-y divide-uach-ink/[0.06]">
            {data.items.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-uach-ink">{row.fullName}</p>
                  <p className="truncate text-xs tabular-nums text-uach-ink/75">
                    {row.username} · {ROLE_LABELS[row.role]}
                    {row.career ? ` · ${row.career.code}` : ""}
                    {row.mustChangePassword ? " · contraseña temporal" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[row.status].chip}`}>
                    {STATUS[row.status].label}
                  </span>
                  <button type="button" disabled={busyId === row.id} onClick={() => resetPassword(row)} className={BTN_GHOST}>
                    <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    Restablecer
                  </button>
                  {row.id !== currentUserId && (
                    <button type="button" disabled={busyId === row.id} onClick={() => toggleStatus(row)} className={BTN_SECONDARY}>
                      {row.status === "ACTIVE" ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && pages > 1 && (
          <div className="flex items-center justify-between border-t border-uach-ink/[0.06] px-2 pt-3">
            <span className="text-xs tabular-nums text-uach-ink/75">
              {data.total} usuarios · página {data.page} de {pages}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={BTN_SECONDARY}>
                Anterior
              </button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={BTN_SECONDARY}>
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
