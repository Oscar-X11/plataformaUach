import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  CHANGE_PASSWORD_ROUTE,
  SESSION_COOKIE,
  type SessionUser,
  type UserRole,
} from "@/lib/session";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * GET a la API desde el servidor con el token de la cookie. Si la sesión no
 * es válida la cierra y envía al login; un 404 (o un 400 por id inválido) muestra
 * la página "no encontrado".
 */
export async function serverApi<T>(path: string): Promise<T> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  let response: Response;
  try {
    response = await fetch(`${API_INTERNAL_URL}${path}`, {
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
  // 400 en una consulta GET = identificador mal formado en la URL (p. ej. /cursos/abc):
  // para quien navega es lo mismo que una página que no existe.
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) {
    throw new Error(`Error al consultar ${path} (${response.status}).`);
  }

  return (await response.json()) as T;
}

/**
 * Usuario actual validado por el backend (firma, expiración y estado de la
 * cuenta). Memorizada por petición: layout y página comparten una consulta.
 */
const fetchCurrentUser = cache(() => serverApi<SessionUser>("/auth/me"));

export async function requireUser(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await fetchCurrentUser();

  if (user.mustChangePassword) redirect(CHANGE_PASSWORD_ROUTE);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/acceso-denegado");
  }

  return user;
}

/** Para la página de cambio de contraseña: no redirige por contraseña temporal. */
export function requireUserForPasswordChange(): Promise<SessionUser> {
  return fetchCurrentUser();
}
