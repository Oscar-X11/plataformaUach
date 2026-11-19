import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, type SessionUser, type UserRole } from "@/lib/session";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * Obtiene el usuario actual desde el backend (verifica firma, expiración y
 * estado de la cuenta). Si la sesión no es válida, la cierra y envía al login.
 * Memorizada por petición: layout y página comparten una sola consulta.
 */
const fetchCurrentUser = cache(async (): Promise<SessionUser> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  let response: Response;
  try {
    response = await fetch(`${API_INTERNAL_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("No se pudo conectar con el backend de la plataforma.");
  }

  if (response.status === 401) {
    // Un route handler borra la cookie; desde un layout no se puede.
    redirect("/cerrar-sesion?motivo=expirada");
  }
  if (!response.ok) {
    throw new Error(`Error al validar la sesión (${response.status}).`);
  }

  return (await response.json()) as SessionUser;
});

export async function requireUser(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await fetchCurrentUser();

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/acceso-denegado");
  }

  return user;
}
