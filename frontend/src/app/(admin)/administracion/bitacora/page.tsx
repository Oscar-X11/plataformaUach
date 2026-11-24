import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { CARD } from "@/components/dashboard/tone";

export const metadata = { title: "Bitácora" };

export default function AdministracionBitacoraPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Bitácora</h1>
        <p className="mt-1 max-w-2xl text-sm text-uach-ink/75">
          Quién hizo qué y cuándo: inicios de sesión, cuentas, importaciones, clases, entregas, calificaciones y
          publicaciones. Los registros de más de 180 días se borran solos.
        </p>
      </header>
      <div className={`${CARD} p-3 sm:p-4`}>
        <ActivityFeed />
      </div>
    </section>
  );
}
