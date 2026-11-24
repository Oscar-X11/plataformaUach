"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { CheckCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { notificationIcon } from "@/components/notifications/notification-meta";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { formatRelative } from "@/lib/dashboard/format";
import type { DashboardNotices } from "@/lib/dashboard/types";
import { EASE_OUT } from "@/lib/motion";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

/**
 * Inicio del alumno: los 3 avisos y cuestionarios más recientes. El resto se
 * consulta en la pestaña Notificaciones. Al abrir uno se marca como leído.
 */
export function AnnouncementsPanel({
  notices,
  now,
  animateIn,
  className,
  style,
}: {
  notices: DashboardNotices;
  now: Date;
  animateIn: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const [items, setItems] = useState(notices.items);
  const [unread, setUnread] = useState(notices.unread);

  function open(id: string, wasUnread: boolean) {
    if (!wasUnread) return;
    setItems((list) => list.map((item) => (item.id === id ? { ...item, unread: false } : item)));
    setUnread((count) => Math.max(0, count - 1));
    void markNotificationRead(id);
  }

  async function markAll() {
    setItems((list) => list.map((item) => ({ ...item, unread: false })));
    setUnread(0);
    await markAllNotificationsRead(["POST_CREATED", "QUIZ_PUBLISHED"]);
    router.refresh();
  }

  return (
    <section aria-labelledby="avisos-titulo" style={style} className={`${CARD} flex flex-col p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="avisos-titulo" className="flex items-center gap-2 text-base font-semibold text-uach-petrol">
          Avisos recientes
          {unread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-uach-teal px-1.5 text-[11px] font-semibold tabular-nums text-white">
              {unread}
              <span className="sr-only"> sin leer</span>
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            aria-label="Marcar avisos y cuestionarios como leídos"
            title="Marcar como leídos"
            className={`press -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-uach-teal transition-colors hover:bg-uach-teal/10 ${FOCUS_RING}`}
          >
            <CheckCheck className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-uach-ink/75">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-uach-emerald" strokeWidth={1.75} aria-hidden />
          Todo leído. Cuando tus docentes publiquen avisos o cuestionarios, los verás aquí primero.
        </p>
      ) : (
        <ul className="mt-2">
          {items.map((item, index) => {
            const Icon = notificationIcon(item.type);
            const body = (
              <>
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`line-clamp-2 block text-sm leading-snug ${
                      item.unread ? "font-medium text-uach-ink" : "text-uach-ink/75"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs tabular-nums text-uach-ink/75">
                    {formatRelative(item.createdAt, now)}
                  </span>
                </span>
                {item.unread && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-uach-teal" aria-label="Sin leer" />
                )}
              </>
            );
            const rowClass = `-mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-uach-canvas ${FOCUS_RING}`;
            return (
              <motion.li
                key={item.id}
                initial={animateIn ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT, delay: 0.25 + index * 0.05 } }}
                className="border-t border-uach-ink/[0.07] first:border-t-0"
              >
                {item.link ? (
                  <Link href={item.link} onClick={() => open(item.id, item.unread)} className={rowClass}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => open(item.id, item.unread)} className={`${rowClass} w-full text-left`}>
                    {body}
                  </button>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      <Link
        href="/notificaciones"
        className={`mt-auto flex items-center justify-end gap-1 pt-3 text-sm font-medium text-uach-teal hover:text-uach-tealDark ${FOCUS_RING} rounded-lg`}
      >
        Ver todas las notificaciones
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </Link>
    </section>
  );
}
