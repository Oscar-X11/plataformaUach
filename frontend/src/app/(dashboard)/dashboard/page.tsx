import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { withTones, type StudentDashboardResponse, type TeacherDashboardData } from "@/lib/dashboard/api";
import { requireUser, serverApi } from "@/lib/server-session";

export const metadata = { title: "Inicio" };

export default async function UachDashboardPage() {
  const user = await requireUser();
  // La hora se fija en el servidor para que servidor y cliente muestren lo mismo.
  const nowIso = new Date().toISOString();

  if (user.role === "ADMIN") redirect("/administracion");

  if (user.role === "TEACHER") {
    const data = await serverApi<TeacherDashboardData>("/dashboard/teacher");
    return <TeacherDashboard fullName={user.fullName} data={data} nowIso={nowIso} />;
  }

  const data = await serverApi<StudentDashboardResponse>("/dashboard/student");
  return <StudentDashboard fullName={user.fullName} data={withTones(data)} nowIso={nowIso} />;
}
