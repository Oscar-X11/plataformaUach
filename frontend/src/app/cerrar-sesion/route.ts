import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Borra la cookie de sesión y redirige al login (usado cuando la sesión expira). */
export function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const motivo = request.nextUrl.searchParams.get("motivo");
  if (motivo === "expirada") loginUrl.searchParams.set("motivo", "expirada");

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
