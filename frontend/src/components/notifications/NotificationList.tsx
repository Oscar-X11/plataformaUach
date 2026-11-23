"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { notificationIcon } from "@/components/notifications/notification-meta";
import { CARD } from "@/components/dashboard/tone";
import { BTN_GHOST } from "@/components/ui/styles";
import { api } from "@/lib/api";
import type { NotificationList as Data, NotificationView } from "@/lib/classwork";
import { formatRelative } from "@/lib/dashboard/format";

export function NotificationList({ initial, nowIso }: { initial: Data; nowIso: string }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const now = new Date(nowIso);
  const unread = items.filter((item) => !item.readAt).length;

  async function markAll() {
    setItems((list) => list.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })));
    await api("/notifications/read-all", { method: "POST" }).catch(() => undefined);
    router.refresh();
  }

  function markRead(item: NotificationView) {
    if (item.readAt) return;
    setItems((list) => list.map((n) => (n.id === item.id ? { ...n, readAt: nowIso } : n)));
    void api(`/notifications/${item.id}/read`, { method: "POST" }).catch(() => undefined);
  }

  if (items.length === 0) {
    return (
      <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
          <Bell className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-4 text-base font-semibold text-uach-ink">Sin novedades</h2>
        <p className="mt-1 max-w-sm text-sm text-uach-ink/75">
          Aquí te avisaremos de tareas nuevas, calificaciones y avisos de tus cursos.
        </p>
      </div>
    );
  }

  return (
    <section className={`${CARD} p-2 sm:p-3`}>
      <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
        <p className="text-sm text-uach-ink/75">{unread === 0 ? "Todo leído 👌" : `${unread} sin leer`}</p>
        {unread > 0 && (
          <button type="button" onClick={markAll} className={BTN_GHOST}>
            <CheckCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Marcar todo como leído
          </button>
        )}
      </div>
      <ul className="divide-y divide-uach-ink/[0.06]">
        {items.map((item) => {
          const Icon = notificationIcon(item.type);
          const body = (
            <>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${item.readAt ? "text-uach-ink/75" : "font-medium text-uach-ink"}`}>
                  {item.title}
                </span>
                <span className="block text-xs text-uach-ink/75">{formatRelative(item.createdAt, now)}</span>
              </span>
              {!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-uach-teal" aria-label="Sin leer" />}
            </>
          );
          const className = "press-soft flex min-h-[60px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-uach-canvas";
          return (
            <li key={item.id}>
              {item.link ? (
                <Link href={item.link} onClick={() => markRead(item)} className={className}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={() => markRead(item)} className={`${className} w-full text-left`}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
