import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/server-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN"]);
  return <AppShell user={user}>{children}</AppShell>;
}
