import { MaterialsBoard } from "@/components/materials/MaterialsBoard";
import type { MaterialsView } from "@/lib/institutional";
import { serverApi } from "@/lib/server-session";

export const metadata = { title: "Recursos del curso" };

export default async function RecursosCursoPage({ params }: { params: { cursoId: string } }) {
  const data = await serverApi<MaterialsView>(`/courses/${encodeURIComponent(params.cursoId)}/materials`);
  return <MaterialsBoard courseId={params.cursoId} data={data} nowIso={new Date().toISOString()} />;
}
