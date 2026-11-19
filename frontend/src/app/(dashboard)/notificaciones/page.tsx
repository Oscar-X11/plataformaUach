import { NotificationList } from "@/components/notifications/NotificationList";
import type { NotificationList as Data } from "@/lib/classwork";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  const data = await serverApi<Data>("/notifications");
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Notificaciones</h1>
        <p className="mt-1 text-sm text-uach-ink/75">Los avisos de la plataforma llegan aquí (no usamos correo).</p>
      </header>
      <NotificationList initial={data} nowIso={new Date().toISOString()} />
    </section>
  );
}
