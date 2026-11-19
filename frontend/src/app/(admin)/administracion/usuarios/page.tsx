import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { requireUser } from "@/lib/server-session";

export const metadata = { title: "Usuarios" };

export default async function AdministracionUsuariosPage() {
  const user = await requireUser(["ADMIN"]);
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Usuarios</h1>
        <p className="mt-1 text-sm text-uach-ink/75">
          Da de alta al personal, restablece contraseñas olvidadas y activa o desactiva cuentas.
        </p>
      </header>
      <UsersAdmin currentUserId={user.id} />
    </section>
  );
}
