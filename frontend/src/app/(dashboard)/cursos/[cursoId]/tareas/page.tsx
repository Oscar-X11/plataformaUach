import { ModulePending } from "@/components/ui/ModulePending";

export default function TareasCursoPage() {
  return (
    <ModulePending
      embedded
      title="Trabajo de clase"
      phase={1}
      description="Tareas del curso agrupadas por tema, con fechas de entrega y estado."
    />
  );
}
