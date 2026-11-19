/**
 * Utilidades de sesión compartidas entre middleware (Edge), servidor y cliente.
 * No importar aquí nada específico de Node.js.
 */

export const SESSION_COOKIE = "uach_session";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN" | "SECURITY";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED";
  enrollment: string | null;
  facultyId: string | null;
  careerId: string | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Alumno",
  TEACHER: "Docente",
  ADMIN: "Administrador",
  SECURITY: "Seguridad",
};

export const PUBLIC_ROUTES = [
  "/login",
  "/registro",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
];

/** Rutas abiertas con o sin sesión. */
export const OPEN_ROUTES = ["/acceso-denegado", "/cerrar-sesion"];

const ALL_ROLES: UserRole[] = ["STUDENT", "TEACHER", "ADMIN", "SECURITY"];
const ACADEMIC_ROLES: UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

/** Reglas de acceso por prefijo de ruta. La primera coincidencia gana. */
const ROUTE_RULES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/administracion", roles: ["ADMIN"] },
  { prefix: "/seguridad", roles: ["SECURITY", "ADMIN"] },
  { prefix: "/dashboard", roles: ACADEMIC_ROLES },
  { prefix: "/cursos", roles: ACADEMIC_ROLES },
  { prefix: "/entregas", roles: ["STUDENT", "TEACHER"] },
  { prefix: "/grupos-estudio", roles: ACADEMIC_ROLES },
  { prefix: "/repositorio", roles: ACADEMIC_ROLES },
  { prefix: "/notificaciones", roles: ALL_ROLES },
  { prefix: "/perfil", roles: ALL_ROLES },
];

export function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function canAccess(pathname: string, role: UserRole) {
  const rule = ROUTE_RULES.find(({ prefix }) => matchesRoute(pathname, prefix));
  // Rutas sin regla explícita: cualquier usuario autenticado.
  return rule ? rule.roles.includes(role) : true;
}

export function homeForRole(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "/administracion";
    case "SECURITY":
      return "/seguridad";
    default:
      return "/dashboard";
  }
}

/** Evita redirecciones abiertas: solo rutas internas. */
export function safeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

interface TokenClaims {
  sub: string;
  role: UserRole;
  exp: number;
}

/**
 * Lee los datos del token SIN verificar la firma. Solo se usa para decidir
 * redirecciones en el middleware; la autorización real la hace el backend.
 */
export function readTokenClaims(token: string | undefined): TokenClaims | null {
  if (!token) return null;
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    if (
      typeof json.sub !== "string" ||
      typeof json.exp !== "number" ||
      !ALL_ROLES.includes(json.role)
    ) {
      return null;
    }
    if (json.exp * 1000 <= Date.now()) return null;
    return { sub: json.sub, role: json.role, exp: json.exp };
  } catch {
    return null;
  }
}

export function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
