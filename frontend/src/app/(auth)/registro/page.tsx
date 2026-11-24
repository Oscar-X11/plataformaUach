import Link from "next/link";
import { FormAlert } from "@/components/ui/form";

export const metadata = { title: "Primer acceso" };

/**
 * Ya no hay registro abierto: la escuela crea las cuentas de los alumnos al importar
 * su lista oficial. Esta página explica cómo entrar por primera vez.
 */
export default function PrimerAccesoPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Primer acceso</h1>
      <p className="mt-1.5 text-sm text-uach-muted">
        No necesitas registrarte: la escuela crea tu cuenta con tu matrícula al inscribirte.
      </p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-uach-ink">
        <li>Pide tu contraseña inicial en la administración escolar.</li>
        <li>Inicia sesión con tu matrícula y esa contraseña.</li>
        <li>La plataforma te pedirá elegir una contraseña nueva, solo tuya.</li>
      </ol>
      <div className="mt-6">
        <FormAlert
          tone="info"
          message="Si tu matrícula no funciona, es posible que aún no te hayan dado de alta. Acude a la administración escolar."
        />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-medium text-uach-teal hover:text-uach-tealDark">
          Ir a iniciar sesión
        </Link>
      </p>
    </>
  );
}
