/**
 * Cliente HTTP del navegador. Todas las peticiones van a /api/* (Nginx en
 * producción, proxy de Next.js en desarrollo) e incluyen la cookie de sesión.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Json = Record<string, unknown> | unknown[];

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: Json | FormData;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;
  const isFormData = body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiError(response.status, data);
  }

  return data as T;
}

function toApiError(status: number, data: unknown) {
  const raw = (data as { message?: unknown } | null)?.message;
  const details = Array.isArray(raw) ? raw.map(String) : [];

  let message: string;
  if (status === 429) {
    message = "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
  } else if (details.length) {
    message = details[0];
  } else if (typeof raw === "string") {
    message = raw;
  } else if (status >= 500) {
    message = "Ocurrió un error en el servidor. Inténtalo más tarde.";
  } else {
    message = "No se pudo completar la solicitud.";
  }

  return new ApiError(message, status, details);
}
