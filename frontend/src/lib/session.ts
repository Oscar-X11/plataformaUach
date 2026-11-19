/**
 * Utilidades de sesión compartidas entre middleware (Edge), servidor y cliente.
 * No importar aquí nada específico de Node.js.
 */

export const SESSION_COOKIE = "uach_session";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

export interface SessionUser {
  id: string;
  /** Matrícula (alumnos) o número de empleado (personal). */
  username: string;
  fullName: string;
  /** Ruta relativa en storage/ (avatars/...), si subió foto. */
  avatarUrl: string | null;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED";
  /** Contraseña temporal asignada por un administrador: debe cambiarla. */
  mustChangePassword: boolean;
  facultyId: string | null;
  careerId: string | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Alumno",
  TEACHER: "Docente",
  ADMIN: "Administrador",
};

export const PUBLIC_ROUTES = [
  "/login",
  "/registro",
  "/recuperar-contrasena",
];

/** Única ruta disponible mientras la contraseña sea temporal. */
export const CHANGE_PASSWORD_ROUTE = "/cambiar-contrasena";

/** Rutas abiertas con o sin sesión. */
export const OPEN_ROUTES = ["/acceso-denegado", "/cerrar-sesion"];

const ALL_ROLES: UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

/** Reglas de acceso por prefijo de ruta. La primera coincidencia gana. */
const ROUTE_RULES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/administracion", roles: ["ADMIN"] },
  { prefix: "/dashboard", roles: ALL_ROLES },
  { prefix: "/cursos", roles: ALL_ROLES },
  { prefix: "/entregas", roles: ["STUDENT", "TEACHER"] },
  { prefix: "/grupos-estudio", roles: ALL_ROLES },
  { prefix: "/repositorio", roles: ALL_ROLES },
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
  return role === "ADMIN" ? "/administracion" : "/dashboard";
}

/** Evita redirecciones abiertas: solo rutas internas. */
export function safeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

interface TokenClaims {
  sub: string;
  role: UserRole;
  mustChangePassword: boolean;
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
    return {
      sub: json.sub,
      role: json.role,
      mustChangePassword: json.mustChangePassword === true,
      exp: json.exp,
    };
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
