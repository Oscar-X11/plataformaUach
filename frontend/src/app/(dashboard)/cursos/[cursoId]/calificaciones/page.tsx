import { ModulePending } from "@/components/ui/ModulePending";

export default function CalificacionesCursoPage() {
  return (
    <ModulePending
      embedded
      title="Calificaciones"
      phase={1}
      description="Calificaciones por tarea, promedio del alumno y libro de calificaciones del docente."
    />
  );
}
