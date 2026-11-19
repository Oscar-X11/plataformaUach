import Link from "next/link";
import { Lock } from "lucide-react";

export const metadata = { title: "Acceso denegado · Plataforma UACH" };

export default function AccesoDenegadoPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md animate-view-enter rounded-2xl bg-uach-surface p-8 text-center shadow-uach-card">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
          <Lock className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-uach-petrol">Acceso denegado</h1>
        <p className="mt-2 text-sm text-uach-muted">
          Tu cuenta no tiene permisos para ver esta sección. Si crees que es un error, contacta a la
          administración.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-uach-teal px-4 py-2 text-sm font-semibold text-white hover:bg-uach-tealDark"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
