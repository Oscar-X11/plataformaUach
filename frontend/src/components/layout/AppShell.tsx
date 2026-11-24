"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { GraduationCap, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { navigationForRole, type NavItem } from "@/lib/navigation";
import { ROLE_LABELS, matchesRoute, type SessionUser } from "@/lib/session";
import { EASE_DRAWER, EASE_OUT, SLIDE_TRANSITION } from "@/lib/motion";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40";
const COLLAPSE_KEY = "uach:sidebar-collapsed";
/** Etiquetas cortas para la barra inferior (caben en 360px). */
const SHORT_LABELS: Record<string, string> = {
  "/dashboard": "Inicio",
  "/cursos": "Cursos",
  "/entregas": "Entregas",
  "/notificaciones": "Alertas",
};

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sections = navigationForRole(user.role);

  // Preferencia de colapso por navegador (comodidad, no estado crítico).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {}
      return !value;
    });

  // Cierra el menú móvil al navegar.
  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : matchesRoute(pathname, item.href);

  /**
   * El colapso no cambia el layout del menú: el panel se desplaza con transform
   * y las etiquetas se desvanecen, así los iconos quedan quietos en su sitio.
   */
  const renderNav = (mode: "desktop" | "drawer") => {
    const hide = mode === "desktop" && collapsed;
    const label = `transition-opacity duration-150 ease-[var(--ease-out)] ${
      hide ? "pointer-events-none opacity-0" : "opacity-100 delay-75"
    }`;
    return (
      <nav aria-label="Navegación principal" className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 px-[18px]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-uach-petrol text-white">
            <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className={`min-w-0 leading-tight ${label}`} aria-hidden={hide}>
            <p className="truncate text-sm font-semibold text-uach-petrol">Plataforma UACH</p>
            <p className="text-xs text-uach-ink/75">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {sections.map((section, index) => (
            <div key={section.title ?? index}>
              {section.title && (
                <p className={`mb-1.5 px-[15px] text-xs font-medium text-uach-ink/75 ${label}`} aria-hidden={hide}>
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="group/nav relative">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        aria-label={hide ? item.label : undefined}
                        className={`press pointer-events-auto relative flex min-h-[40px] items-center gap-3 rounded-xl pl-[15px] pr-3 text-sm font-medium transition-colors duration-150 ${
                          hide ? "w-12" : "w-full"
                        } ${active ? "text-uach-tealDark" : "text-uach-ink/75 hover:bg-uach-ink/[0.04] hover:text-uach-ink"} ${FOCUS}`}
                      >
                        {active && (
                          <motion.span
                            layoutId={`nav-indicator-${mode}`}
                            transition={SLIDE_TRANSITION}
                            className="absolute inset-0 rounded-xl bg-uach-teal/10"
                            aria-hidden
                          />
                        )}
                        <Icon
                          className={`relative h-[18px] w-[18px] shrink-0 ${active ? "text-uach-teal" : ""}`}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <span className={`relative truncate ${label}`}>{item.label}</span>
                      </Link>
                      {hide && (
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-[60px] top-1/2 z-50 -translate-y-1/2 scale-95 whitespace-nowrap rounded-lg bg-uach-petrol px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-uach-modal transition-[opacity,transform] duration-150 ease-[var(--ease-out)] [transform-origin:left_center] group-hover/nav:scale-100 group-hover/nav:opacity-100 group-hover/nav:delay-200 group-focus-within/nav:scale-100 group-focus-within/nav:opacity-100"
                        >
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {mode === "desktop" && (
          <div className="relative p-3">
            {/* Separador limitado a la zona visible del panel. */}
            <span
              aria-hidden
              className={`absolute inset-x-0 top-0 h-px bg-uach-ink/[0.08] transition-opacity duration-150 ${hide ? "opacity-0" : ""}`}
            />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
              aria-expanded={!collapsed}
              className={`press pointer-events-auto flex h-10 items-center gap-3 rounded-xl pl-[15px] pr-3 text-sm text-uach-ink/75 transition-colors hover:bg-uach-ink/[0.04] hover:text-uach-ink ${
                hide ? "w-12" : "w-full"
              } ${FOCUS}`}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
              )}
              <span className={label}>Colapsar</span>
            </button>
          </div>
        )}
      </nav>
    );
  };

  // Barra inferior (móvil): las entradas principales + "Más" abre el menú completo.
  const primary = sections[0]?.items.slice(0, 3) ?? [];
  const bottomItems = [...primary, ...sections.flatMap((s) => s.items).filter((i) => i.href === "/notificaciones")];

  return (
    <SessionProvider user={user}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-uach-canvas">
          {/* Sidebar escritorio */}
          <aside
            className={`fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-uach-ink/[0.08] bg-uach-surface transition-transform duration-200 ease-[var(--ease-in-out)] motion-reduce:transition-none lg:block ${
              collapsed ? "-translate-x-[184px]" : "translate-x-0"
            }`}
          >
            {/* Contra-desplazamiento: el contenido queda fijo mientras el panel se mueve. */}
            <div
              className={`h-full transition-transform duration-200 ease-[var(--ease-in-out)] motion-reduce:transition-none ${
                collapsed ? "pointer-events-none translate-x-[184px]" : "translate-x-0"
              }`}
            >
              {renderNav("desktop")}
            </div>
          </aside>

          {/* Menú completo en móvil (cajón) */}
          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
                <motion.button
                  type="button"
                  aria-label="Cerrar menú"
                  className="absolute inset-0 bg-uach-petrol/30"
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.2 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                />
                <motion.aside
                  className="relative h-full w-72 max-w-[85vw] bg-uach-surface shadow-uach-modal"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0, transition: { duration: 0.32, ease: EASE_DRAWER } }}
                  exit={{ x: "-100%", transition: { duration: 0.2, ease: EASE_OUT } }}
                >
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={() => setMobileOpen(false)}
                    className={`press absolute right-3 top-3.5 grid h-10 w-10 place-items-center rounded-xl text-uach-ink/75 hover:bg-uach-ink/[0.04] ${FOCUS}`}
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </button>
                  {renderNav("drawer")}
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          <div
            className={`transition-[padding] duration-200 ease-[var(--ease-in-out)] motion-reduce:transition-none ${
              collapsed ? "lg:pl-[72px]" : "lg:pl-64"
            }`}
          >
            <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-uach-ink/[0.08] bg-uach-canvas/95 px-4 sm:px-6">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2.5 rounded-xl lg:hidden ${FOCUS}`}
                aria-label="Ir al inicio"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-uach-petrol text-white">
                  <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-sm font-semibold text-uach-petrol">UACH</span>
              </Link>

              <div className="flex-1" />

              <GlobalSearch />
              <NotificationsMenu />
              <UserMenu />
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
              {/* Transición breve entre secciones: fade + 8px, 200ms. */}
              <div key={pathname} className="page-enter">
                {children}
              </div>
            </main>
          </div>

          {/* Barra de navegación inferior (móvil) */}
          <nav
            aria-label="Navegación rápida"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-uach-ink/[0.08] bg-uach-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
              {bottomItems.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href} className="flex-1">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`press relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150 ${
                        active ? "text-uach-tealDark" : "text-uach-ink/75"
                      } ${FOCUS} rounded-xl`}
                    >
                      {active && (
                        <motion.span
                          layoutId="bottom-indicator"
                          transition={SLIDE_TRANSITION}
                          className="absolute inset-x-3 top-1.5 h-8 rounded-full bg-uach-teal/10"
                          aria-hidden
                        />
                      )}
                      <Icon className="relative mt-1 h-5 w-5" strokeWidth={1.5} aria-hidden />
                      <span className="relative">{SHORT_LABELS[item.href] ?? item.label}</span>
                    </Link>
                  </li>
                );
              })}
              <li className="flex-1">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Abrir menú completo"
                  className={`press flex min-h-[60px] w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-uach-ink/75 ${FOCUS}`}
                >
                  <Menu className="mt-1 h-5 w-5" strokeWidth={1.5} aria-hidden />
                  Más
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </MotionConfig>
    </SessionProvider>
  );
}
