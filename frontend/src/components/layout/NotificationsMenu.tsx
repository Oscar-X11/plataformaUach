"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ClipboardCheck, Megaphone, Star } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import type { UserRole } from "@/lib/session";

/** DATOS DE EJEMPLO hasta que exista el modelo Notification en el backend. */
const SAMPLE = [
  { id: "n1", icon: Star, text: "Calificaron “Práctica 5: vistas y disparadores”: 9/10", time: "Hace 5 h", unread: true },
  { id: "n2", icon: Megaphone, text: "Nuevo aviso en Redes de Computadoras", time: "Hace 3 h", unread: true },
  { id: "n3", icon: ClipboardCheck, text: "Tu entrega de “Maqueta responsiva” fue recibida", time: "Hace 2 días", unread: false },
];

const FOCUS = "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40";

export function NotificationsMenu({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => (role === "STUDENT" ? SAMPLE : []));
  const containerRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => item.unread).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        onClick={() => setOpen((value) => !value)}
        className={`press relative grid h-10 w-10 place-items-center rounded-xl text-uach-ink/75 transition-colors hover:bg-uach-ink/[0.05] hover:text-uach-ink ${FOCUS}`}
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        {unread > 0 && (
          <span className="ping-once absolute right-2 top-2 h-2 w-2 rounded-full bg-uach-teal ring-2 ring-uach-canvas" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notificaciones"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: EASE_OUT } }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-uach-ink/[0.08] bg-uach-surface p-2 shadow-uach-modal"
          >
            <div className="flex items-center justify-between px-3 pb-2 pt-2">
              <p className="text-sm font-semibold text-uach-petrol">Notificaciones</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => setItems((list) => list.map((item) => ({ ...item, unread: false })))}
                  className={`rounded-md text-xs font-medium text-uach-teal hover:text-uach-tealDark ${FOCUS}`}
                >
                  Marcar como leídas
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-3 pb-4 pt-1 text-sm text-uach-ink/75">Sin novedades por ahora. Te avisaremos aquí 🔔</p>
            ) : (
              <ul>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        href="/notificaciones"
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-uach-canvas ${FOCUS}`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-uach-teal/10 text-uach-teal">
                          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm leading-snug ${item.unread ? "font-medium text-uach-ink" : "text-uach-ink/75"}`}>
                            {item.text}
                          </span>
                          <span className="mt-0.5 block text-xs text-uach-ink/75">{item.time}</span>
                        </span>
                        {item.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-uach-teal" aria-label="No leída" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/notificaciones"
              onClick={() => setOpen(false)}
              className={`mt-1 block rounded-xl px-3 py-2.5 text-center text-sm font-medium text-uach-teal hover:bg-uach-canvas ${FOCUS}`}
            >
              Ver todas
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
