"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert, SubmitButton, TextField } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { homeForRole, type SessionUser } from "@/lib/session";

export function ChangePasswordForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const forced = user.mustChangePassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");

    if (newPassword !== form.get("confirmPassword")) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: form.get("currentPassword"), newPassword },
      });
      router.replace(homeForRole(user.role));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo cambiar la contraseña.");
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">
        {forced ? "Elige una contraseña nueva" : "Cambiar contraseña"}
      </h1>
      <p className="mt-1.5 text-sm text-uach-muted">
        {forced
          ? "Entraste con una contraseña temporal. Cámbiala para continuar."
          : `Cuenta ${user.username}.`}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {error && <FormAlert message={error} />}

        <TextField
          label={forced ? "Contraseña temporal" : "Contraseña actual"}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
        <TextField
          label="Contraseña nueva"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, con letras y números."
          required
          minLength={8}
        />
        <TextField
          label="Confirmar contraseña nueva"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />

        <div className="pt-2">
          <SubmitButton loading={loading}>Guardar contraseña</SubmitButton>
        </div>
      </form>

      <p className="mt-8 text-center text-sm">
        {forced ? (
          <Link href="/cerrar-sesion" prefetch={false} className="font-medium text-uach-teal hover:text-uach-tealDark">
            Cerrar sesión
          </Link>
        ) : (
          <Link href={homeForRole(user.role)} className="font-medium text-uach-teal hover:text-uach-tealDark">
            Volver
          </Link>
        )}
      </p>
    </>
  );
}
