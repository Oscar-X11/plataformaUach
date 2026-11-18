"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FormAlert, SubmitButton, TextField } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { homeForRole, safeRedirectPath, type SessionUser } from "@/lib/session";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const expired = searchParams.get("motivo") === "expirada";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setLoading(true);

    try {
      const { user } = await api<{ user: SessionUser }>("/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      const next = safeRedirectPath(searchParams.get("next"));
      router.replace(next ?? homeForRole(user.role));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Iniciar sesión</h1>
      <p className="mt-1.5 text-sm text-uach-muted">Accede con tu correo institucional.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {expired && !error && (
          <FormAlert tone="info" message="Tu sesión expiró. Vuelve a iniciar sesión." />
        )}
        {error && <FormAlert message={error} />}

        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@uach.mx"
          required
          autoFocus
        />
        <div>
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <div className="mt-2 text-right">
            <Link
              href="/recuperar-contrasena"
              className="text-xs font-medium text-uach-teal hover:text-uach-tealDark"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <SubmitButton loading={loading}>Entrar</SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-uach-muted">
        ¿Eres alumno y no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-uach-teal hover:text-uach-tealDark">
          Regístrate
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
