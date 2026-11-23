import Link from "next/link";
import { BookOpen, ClipboardCheck, GraduationCap, UserCog, Users } from "lucide-react";
import { CARD, FOCUS_RING } from "@/components/dashboard/tone";
import { formatRelative } from "@/lib/dashboard/format";
import { serverApi } from "@/lib/server-session";
import { ROLE_LABELS, type UserRole } from "@/lib/session";

export const metadata = { title: "Administración" };

interface AdminDashboard {
  users: { students: number; teachers: number; admins: number; inactive: number };
  courses: number;
  assignments: number;
  submissions: number;
  recentUsers: { id: string; fullName: string; username: string; role: UserRole; createdAt: string }[];
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className={`${CARD} flex items-center gap-4 p-5`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-uach-teal/10 text-uach-teal">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-uach-ink">{value}</p>
        <p className="text-sm text-uach-ink/75">{label}</p>
      </div>
    </div>
  );
}

export default async function AdministracionPage() {
  const data = await serverApi<AdminDashboard>("/dashboard/admin");
  const now = new Date();

  return (
    <section className="space-y-6 lg:space-y-8">
      <header className="rounded-2xl bg-uach-petrol p-5 text-white sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Panel de administración</h1>
        <p className="mt-1.5 text-sm text-white/80">
          {data.users.students} alumnos y {data.users.teachers} docentes en {data.courses} cursos.
          {data.users.inactive > 0 ? ` ${data.users.inactive} cuentas inactivas.` : ""}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={GraduationCap} label="Alumnos" value={data.users.students} />
        <Stat icon={UserCog} label="Docentes" value={data.users.teachers} />
        <Stat icon={BookOpen} label="Cursos" value={data.courses} />
        <Stat icon={ClipboardCheck} label="Entregas realizadas" value={data.submissions} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <section className={`${CARD} p-5`}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-uach-ink">Cuentas recientes</h2>
            <Link href="/administracion/usuarios" className="text-sm font-medium text-uach-teal hover:text-uach-tealDark">
              Ver usuarios
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-uach-ink/[0.06]">
            {data.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-uach-ink">{user.fullName}</span>
                  <span className="block truncate text-xs tabular-nums text-uach-ink/75">
                    {user.username} · {ROLE_LABELS[user.role]}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-uach-ink/75">{formatRelative(user.createdAt, now)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${CARD} p-5`}>
          <h2 className="text-base font-semibold text-uach-ink">Accesos rápidos</h2>
          <ul className="mt-2 space-y-1">
            {[
              { href: "/administracion/usuarios", label: "Alta de docentes y restablecer contraseñas" },
              { href: "/administracion/periodos", label: "Abrir o cerrar periodos" },
              { href: "/administracion/catalogos", label: "Facultades, carreras y materias" },
              { href: "/administracion/cursos", label: "Revisar cursos y cambiar docentes" },
              { href: "/cursos", label: "Entrar a un curso como administrador" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`press-soft flex min-h-[44px] items-center rounded-xl px-2 text-sm text-uach-ink hover:bg-uach-canvas ${FOCUS_RING}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
