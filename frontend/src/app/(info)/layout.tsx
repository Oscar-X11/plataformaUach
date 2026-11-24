import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

/** Páginas informativas (ayuda y privacidad): se ven con o sin sesión. */
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-uach-canvas">
      <header className="border-b border-uach-ink/[0.08] bg-uach-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-uach-petrol text-white">
              <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-sm font-semibold text-uach-petrol">Plataforma UACH</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-uach-teal hover:text-uach-tealDark">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-uach-ink/60 sm:px-6">
        <nav aria-label="Información" className="flex gap-4">
          <Link href="/ayuda" className="hover:text-uach-ink">Centro de ayuda</Link>
          <Link href="/privacidad" className="hover:text-uach-ink">Aviso de privacidad</Link>
        </nav>
        <p className="mt-2">Universidad de los Altos de Chiapas · «Educación es progreso»</p>
      </footer>
    </div>
  );
}
