import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md animate-view-enter text-center">
        <p className="text-sm font-semibold text-uach-teal">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-uach-petrol">Página no encontrada</h1>
        <p className="mt-2 text-sm text-uach-muted">
          La dirección no existe o fue movida.
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
