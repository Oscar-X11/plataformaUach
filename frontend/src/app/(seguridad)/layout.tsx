import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/server-session";

export default async function SeguridadLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["SECURITY", "ADMIN"]);
  return <AppShell user={user}>{children}</AppShell>;
}
