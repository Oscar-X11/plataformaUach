import { ModulePending } from "@/components/ui/ModulePending";

export default function AdministracionUsuariosPage() {
  return (
    <ModulePending
      title="Usuarios"
      phase={2}
      description="Alta de docentes, asignación de roles, estado de cuentas e importación masiva."
    />
  );
}
