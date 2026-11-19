import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { ModulePending } from "@/components/ui/ModulePending";
import { getStudentDashboard } from "@/lib/dashboard/sample-data";
import { requireUser } from "@/lib/server-session";

export default async function UachDashboardPage() {
  const user = await requireUser();

  if (user.role !== "STUDENT") {
    return (
      <ModulePending
        title="Inicio"
        phase={1}
        description="Aquí verás tus clases, las entregas por calificar y los avisos más recientes."
      />
    );
  }

  const data = await getStudentDashboard();
  // La hora se fija en el servidor para que servidor y cliente muestren lo mismo.
  return <StudentDashboard fullName={user.fullName} data={data} nowIso={new Date().toISOString()} />;
}
