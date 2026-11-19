import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { CARD } from "@/components/dashboard/tone";
import { BTN_SECONDARY } from "@/components/ui/styles";
import type { ProfileView } from "@/lib/classwork";
import { serverApi } from "@/lib/server-session";
import { ROLE_LABELS } from "@/lib/session";

export const metadata = { title: "Mi perfil" };

const STATUS_LABELS: Record<ProfileView["status"], string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  GRADUATED: "Egresado",
};

const memberSince = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  month: "long",
  year: "numeric",
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <dt className="text-xs font-medium text-uach-ink/75">{label}</dt>
      <dd className="mt-0.5 text-sm text-uach-ink">{value}</dd>
    </div>
  );
}

export default async function PerfilPage() {
  const profile = await serverApi<ProfileView>("/profile");
  const student = profile.role === "STUDENT";

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Mi perfil</h1>
        <p className="mt-1 text-sm text-uach-ink/75">
          Tus datos institucionales. Si algo es incorrecto, acude a la administración de tu facultad.
        </p>
      </header>

      <div className={`${CARD} p-5 sm:p-6`}>
        <AvatarUploader profile={profile} />
      </div>

      <div className={`${CARD} p-5 sm:p-6`}>
        <h2 className="text-base font-semibold text-uach-ink">Datos de la cuenta</h2>
        <dl className="mt-2 grid grid-cols-1 divide-y divide-uach-ink/[0.06] sm:grid-cols-2 sm:divide-y-0">
          <Field label="Nombre completo" value={profile.fullName} />
          <Field label={student ? "Matrícula" : "Número de empleado"} value={profile.username} />
          <Field label="Rol" value={ROLE_LABELS[profile.role]} />
          <Field label="Estado de la cuenta" value={STATUS_LABELS[profile.status]} />
          {student && <Field label="Facultad" value={profile.faculty?.name ?? "Sin registrar"} />}
          {student && <Field label="Carrera" value={profile.career?.name ?? "Sin registrar"} />}
          <Field
            label={student ? "Cursos inscritos" : "Cursos que impartes"}
            value={String(profile.courseCount)}
          />
          <Field label="Miembro desde" value={memberSince.format(new Date(profile.createdAt))} />
        </dl>
      </div>

      <div className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
        <div>
          <h2 className="text-base font-semibold text-uach-ink">Contraseña</h2>
          <p className="text-sm text-uach-ink/75">Cámbiala si crees que alguien más la conoce.</p>
        </div>
        <Link href="/cambiar-contrasena" className={BTN_SECONDARY}>
          <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Cambiar contraseña
        </Link>
      </div>
    </section>
  );
}
