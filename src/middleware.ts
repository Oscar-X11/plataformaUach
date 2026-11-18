import { NextResponse, type NextRequest } from "next/server";
import {
  OPEN_ROUTES,
  PUBLIC_ROUTES,
  SESSION_COOKIE,
  canAccess,
  homeForRole,
  matchesRoute,
  readTokenClaims,
} from "@/lib/session";

/**
 * Protección de rutas en el frontend (experiencia de usuario).
 * La seguridad real la aplica el backend en cada petición a la API.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (OPEN_ROUTES.some((route) => matchesRoute(pathname, route))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = readTokenClaims(token);
  const isPublic = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));

  if (!claims) {
    if (isPublic) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (isPublic || pathname === "/") {
    return NextResponse.redirect(new URL(homeForRole(claims.role), request.url));
  }

  if (!canAccess(pathname, claims.role)) {
    return NextResponse.redirect(new URL("/acceso-denegado", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excluye la API, recursos de Next.js y archivos estáticos.
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.[\\w]+$).*)"],
};
