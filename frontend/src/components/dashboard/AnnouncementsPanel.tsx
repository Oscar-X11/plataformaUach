"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCheck, X } from "lucide-react";
import { CARD, FOCUS_RING, TONE_BG } from "@/components/dashboard/tone";
import { formatRelative } from "@/lib/dashboard/format";
import type { DashboardAnnouncement } from "@/lib/dashboard/types";
import { EASE_OUT } from "@/lib/motion";

export function AnnouncementsPanel({
  items: initialItems,
  now,
  animateIn,
  className,
  style,
}: {
  items: DashboardAnnouncement[];
  now: Date;
  animateIn: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [items, setItems] = useState(initialItems);
  const unread = items.filter((item) => item.unread).length;

  const dismiss = (id: string) => setItems((list) => list.filter((item) => item.id !== id));
  const markAllRead = () => setItems((list) => list.map((item) => ({ ...item, unread: false })));

  return (
    <section aria-labelledby="avisos-titulo" style={style} className={`${CARD} p-5 ${className ?? ""}`}>
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
            onClick={markAllRead}
            aria-label="Marcar todos los avisos como leídos"
            title="Marcar como leídos"
            className={`press -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-uach-teal transition-colors hover:bg-uach-teal/10 ${FOCUS_RING}`}
          >
            <CheckCheck className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-uach-ink/75">
          Todo leído 👌 Cuando tus docentes publiquen algo, lo verás aquí primero.
        </p>
      ) : (
        <ul className="mt-3">
          <AnimatePresence initial={animateIn} mode="popLayout">
            {items.map((item, index) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT, delay: 0.25 + index * 0.05 } }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: EASE_OUT } }}
                transition={{ layout: { duration: 0.22, ease: EASE_OUT } }}
                className="group relative border-t border-uach-ink/[0.07] first:border-t-0"
              >
                <Link
                  href={`/cursos/${item.courseId}`}
                  className={`-mx-2 block rounded-xl px-2 py-3 pr-10 transition-colors duration-150 hover:bg-uach-canvas ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2 text-xs text-uach-ink/75">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG[item.tone]}`} aria-hidden />
                    <span className="truncate font-medium text-uach-ink">{item.courseName}</span>
                    <span className="shrink-0 tabular-nums">· {formatRelative(item.createdAt, now)}</span>
                    {item.unread && (
                      <span className="relative ml-auto h-2 w-2 shrink-0 rounded-full bg-uach-teal ping-once">
                        <span className="sr-only">No leído</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-1.5 line-clamp-2 block text-sm leading-relaxed ${
                      item.unread ? "text-uach-ink" : "text-uach-ink/75"
                    }`}
                  >
                    {item.content}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label={`Ocultar aviso de ${item.courseName}`}
                  className={`press absolute -right-2 bottom-1 grid h-11 w-11 place-items-center sm:bottom-2 sm:h-9 sm:w-9 rounded-lg text-uach-ink/75 transition-[opacity,color,background-color] duration-150 hover:bg-uach-canvas hover:text-uach-ink [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 ${FOCUS_RING}`}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
