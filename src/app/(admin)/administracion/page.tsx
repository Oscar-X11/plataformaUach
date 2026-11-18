import { ModulePending } from "@/components/ui/ModulePending";

export default function AdministracionPage() {
  return (
    <ModulePending
      title="Panel de administración"
      phase={2}
      description="Métricas generales: usuarios, cursos activos, entregas y almacenamiento."
    />
  );
}
