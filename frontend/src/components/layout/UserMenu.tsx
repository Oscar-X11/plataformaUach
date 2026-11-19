"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, LogOut, User } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { ROLE_LABELS, initials } from "@/lib/session";

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
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-uach-subtle"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-uach-tealDark text-xs font-semibold text-white">
          {initials(user.fullName)}
        </span>
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-uach-ink sm:block">
          {user.fullName}
        </span>
        <ChevronDown className="h-4 w-4 text-uach-soft" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right animate-modal-spring rounded-xl bg-uach-surface p-1.5 shadow-uach-modal"
        >
          <div className="border-b border-uach-ink/10 px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-uach-ink">{user.fullName}</p>
            <p className="truncate text-xs text-uach-muted">{user.email}</p>
            <p className="mt-1.5 inline-block rounded-full bg-uach-subtle px-2 py-0.5 text-[11px] font-medium text-uach-tealDark">
              {ROLE_LABELS[user.role]}
              {user.enrollment ? ` · ${user.enrollment}` : ""}
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
        </div>
      )}
    </div>
  );
}
