import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-uach-petrol lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-uach-teal/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-uach-emerald/40 blur-3xl"
        />
        <div className="relative flex items-center gap-3 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-wide">Plataforma UACH</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Tus clases, tareas y materiales en un solo lugar.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Universidad de los Altos de Chiapas — espacio académico para docentes y alumnos.
          </p>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} UACH</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-view-enter">{children}</div>
      </main>
    </div>
  );
}
