import { api } from "@/lib/api";
import type { NotificationType } from "@/lib/classwork";

/** Evento del navegador: la campana vuelve a contar las notificaciones sin leer. */
export const NOTIFICATIONS_CHANGED = "uach:notifications-changed";

const announce = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

/**
 * Marca una notificación como leída. `keepalive` hace que la petición llegue
 * aunque el clic navegue a otra página en ese mismo momento.
 */
export async function markNotificationRead(id: string) {
  await api(`/notifications/${id}/read`, { method: "POST", keepalive: true }).catch(() => undefined);
  announce();
}

/** Marca todas como leídas (o solo las de ciertos tipos). */
export async function markAllNotificationsRead(types?: NotificationType[]) {
  const requests = types?.length
    ? types.map((type) => api(`/notifications/read-all?type=${type}`, { method: "POST", keepalive: true }))
    : [api("/notifications/read-all", { method: "POST", keepalive: true })];
  await Promise.all(requests.map((request) => request.catch(() => undefined)));
  announce();
}
