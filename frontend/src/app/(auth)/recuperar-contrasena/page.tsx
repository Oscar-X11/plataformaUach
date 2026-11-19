import Link from "next/link";
import { FormAlert } from "@/components/ui/form";

export default function RecuperarContrasenaPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Recuperar contraseña</h1>
      <p className="mt-1.5 text-sm text-uach-muted">
        La plataforma no usa correo electrónico, así que el restablecimiento es en persona.
      </p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-uach-ink">
        <li>
          Acude con la administración de tu facultad con tu credencial y tu matrícula (o número de
          empleado).
        </li>
        <li>Te entregarán una contraseña temporal.</li>
        <li>Inicia sesión con ella: la plataforma te pedirá elegir una contraseña nueva.</li>
      </ol>
      <div className="mt-6">
        <FormAlert
          tone="info"
          message="Nadie de la universidad te pedirá tu contraseña. La temporal solo sirve para entrar una vez."
        />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-medium text-uach-teal hover:text-uach-tealDark">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
