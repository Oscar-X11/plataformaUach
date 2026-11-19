import { requireUserForPasswordChange } from "@/lib/server-session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Cambiar contraseña" };

export default async function CambiarContrasenaPage() {
  const user = await requireUserForPasswordChange();
  return <ChangePasswordForm user={user} />;
}
