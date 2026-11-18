"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, GraduationCap, Menu, X } from "lucide-react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { navigationForRole, type NavItem } from "@/lib/navigation";
import { ROLE_LABELS, matchesRoute, type SessionUser } from "@/lib/session";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = navigationForRole(user.role);

  // Cierra el menú móvil al navegar.
  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : matchesRoute(pathname, item.href);

  const sidebar = (
    <nav aria-label="Navegación principal" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-uach-teal text-white">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-uach-petrol">Plataforma UACH</p>
          <p className="text-xs text-uach-soft">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.title ?? index}>
            {section.title && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-uach-soft">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        active
                          ? "bg-uach-subtle text-uach-tealDark"
                          : "text-uach-muted hover:bg-uach-canvas hover:text-uach-ink"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] ${active ? "text-uach-teal" : "text-uach-soft"}`}
                        aria-hidden
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <SessionProvider user={user}>
      <div className="min-h-screen bg-uach-canvas">
        {/* Sidebar escritorio */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-uach-ink/10 bg-uach-surface lg:block">
          {sidebar}
        </aside>

        {/* Sidebar móvil */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-uach-petrol/30 backdrop-blur-[1px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative h-full w-72 max-w-[85vw] bg-uach-surface shadow-uach-modal">
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-uach-muted hover:bg-uach-subtle"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-uach-ink/10 bg-uach-surface/90 px-4 backdrop-blur sm:px-6">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-uach-muted hover:bg-uach-subtle lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="flex-1" />

            <Link
              href="/notificaciones"
              aria-label="Notificaciones"
              className="rounded-lg p-2 text-uach-muted transition-colors hover:bg-uach-subtle hover:text-uach-ink"
            >
              <Bell className="h-5 w-5" aria-hidden />
            </Link>
            <UserMenu />
          </header>

          <main className="mx-auto w-full max-w-7xl animate-view-enter px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
