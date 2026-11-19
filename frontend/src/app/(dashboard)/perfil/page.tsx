import { ModulePending } from "@/components/ui/ModulePending";

export default function PerfilPage() {
  return (
    <ModulePending
      title="Mi perfil"
      phase={1}
      description="Datos personales, foto de perfil y cambio de contraseña."
    />
  );
}
