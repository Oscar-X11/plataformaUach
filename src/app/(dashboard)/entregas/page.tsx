import { ModulePending } from "@/components/ui/ModulePending";

export default function EntregasPage() {
  return (
    <ModulePending
      title="Entregas"
      phase={1}
      description="Tareas pendientes, entregadas, atrasadas y calificadas de todos tus cursos."
    />
  );
}
