"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LifeBuoy, LoaderCircle, LogOut, ShieldCheck, User } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/lib/session";

export function UserMenu() {
  const { user, logout, loggingOut } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="press flex h-10 items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-uach-ink/[0.05] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40"
      >
        <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" />
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-uach-ink sm:block">
          {user.fullName}
        </span>
        <ChevronDown className={`h-4 w-4 text-uach-ink/60 transition-transform duration-200 ease-[var(--ease-out)] ${open ? "rotate-180" : ""}`} strokeWidth={1.5} aria-hidden />
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: EASE_OUT } }}
          style={{ transformOrigin: "top right" }}
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-uach-ink/[0.08] bg-uach-surface p-1.5 shadow-uach-modal"
        >
          <div className="border-b border-uach-ink/10 px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-uach-ink">{user.fullName}</p>
            <p className="truncate text-xs text-uach-muted">{user.username}</p>
            <p className="mt-1.5 inline-block rounded-full bg-uach-subtle px-2 py-0.5 text-[11px] font-medium text-uach-tealDark">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <Link
            href="/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-uach-ink hover:bg-uach-canvas"
          >
            <User className="h-4 w-4 text-uach-soft" aria-hidden />
            Mi perfil
          </Link>
          <Link
            href="/ayuda"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-uach-ink hover:bg-uach-canvas"
          >
            <LifeBuoy className="h-4 w-4 text-uach-soft" aria-hidden />
            Centro de ayuda
          </Link>
          <Link
            href="/privacidad"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-uach-ink hover:bg-uach-canvas"
          >
            <ShieldCheck className="h-4 w-4 text-uach-soft" aria-hidden />
            Aviso de privacidad
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-uach-ink hover:bg-uach-canvas disabled:opacity-60"
          >
            {loggingOut ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-uach-soft" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4 text-uach-soft" aria-hidden />
            )}
            Cerrar sesión
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
