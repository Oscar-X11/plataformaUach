/**
 * Avisa al administrador que una pantalla falló (lo llaman error.tsx y global-error.tsx).
 * Nunca lanza: si no hay sesión o no hay red, simplemente no se registra.
 */
const sent = new Set<string>();

export function reportClientError(error: Error & { digest?: string }) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname.slice(0, 300);
  const message = `${error.name && error.name !== "Error" ? `${error.name}: ` : ""}${error.message || "Error sin mensaje"}`.slice(0, 500);
  // El mismo error en la misma pantalla se envía una sola vez por visita.
  const key = `${message}|${path}`;
  if (sent.has(key)) return;
  sent.add(key);
  void fetch("/api/errors/client", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      message,
      path,
      ...(error.stack ? { stack: error.stack.slice(0, 4000) } : {}),
      ...(error.digest ? { digest: error.digest.slice(0, 64) } : {}),
    }),
  }).catch(() => undefined);
}
