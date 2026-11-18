import Link from "next/link";
import { FormAlert } from "@/components/ui/form";

export default function RecuperarContrasenaPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Recuperar contraseña</h1>
      <div className="mt-6">
        <FormAlert
          tone="info"
          message="La recuperación por correo llegará en la fase 1. Mientras tanto, solicita el restablecimiento a la administración de tu facultad."
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
