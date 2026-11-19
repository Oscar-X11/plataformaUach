import { ModulePending } from "@/components/ui/ModulePending";

export default function RecursosCursoPage() {
  return (
    <ModulePending
      embedded
      title="Recursos del curso"
      phase={2}
      description="Material de apoyo del curso organizado por tema."
    />
  );
}
