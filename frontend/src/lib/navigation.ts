import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Library,
  School,
  ShieldCheck,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/session";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Si es true, solo se marca activo en coincidencia exacta. */
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const ACCOUNT: NavSection = {
  title: "Cuenta",
  items: [
    { label: "Notificaciones", href: "/notificaciones", icon: Bell },
    { label: "Mi perfil", href: "/perfil", icon: User },
  ],
};

export function navigationForRole(role: UserRole): NavSection[] {
  switch (role) {
    case "STUDENT":
      return [
        {
          items: [
            { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
            { label: "Mis cursos", href: "/cursos", icon: BookOpen },
            { label: "Mis entregas", href: "/entregas", icon: ClipboardCheck },
          ],
        },
        {
          title: "Comunidad",
          items: [
            { label: "Repositorio", href: "/repositorio", icon: Library },
            { label: "Grupos de estudio", href: "/grupos-estudio", icon: UsersRound },
          ],
        },
        ACCOUNT,
      ];

    case "TEACHER":
      return [
        {
          items: [
            { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
            { label: "Mis clases", href: "/cursos", icon: BookOpen },
            { label: "Entregas", href: "/entregas", icon: ClipboardCheck },
          ],
        },
        {
          title: "Comunidad",
          items: [
            { label: "Repositorio", href: "/repositorio", icon: Library },
            { label: "Grupos de estudio", href: "/grupos-estudio", icon: UsersRound },
          ],
        },
        ACCOUNT,
      ];

    case "ADMIN":
      return [
        {
          title: "Administración",
          items: [
            { label: "Panel", href: "/administracion", icon: LayoutDashboard, exact: true },
            { label: "Usuarios", href: "/administracion/usuarios", icon: Users },
            { label: "Cursos", href: "/administracion/cursos", icon: School },
            { label: "Reportes", href: "/administracion/reportes", icon: BarChart3 },
          ],
        },
        {
          title: "Plataforma",
          items: [
            { label: "Cursos", href: "/cursos", icon: BookOpen },
            { label: "Repositorio", href: "/repositorio", icon: Library },
            { label: "Control de accesos", href: "/seguridad", icon: ShieldCheck },
          ],
        },
        ACCOUNT,
      ];

    case "SECURITY":
      return [
        {
          items: [{ label: "Control de accesos", href: "/seguridad", icon: ShieldCheck }],
        },
        ACCOUNT,
      ];
  }
}
