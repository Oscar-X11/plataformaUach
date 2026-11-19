"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";

interface Faculty {
  id: string;
  name: string;
  careers: { id: string; name: string }[];
}

export default function RegistroPage() {
  const router = useRouter();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Faculty[]>("/academic/faculties")
      .then(setFaculties)
      .catch(() => setFaculties([]));
  }, []);

  const careers = useMemo(
    () => faculties.find((faculty) => faculty.id === facultyId)?.careers ?? [],
    [faculties, facultyId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (password !== form.get("confirmPassword")) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: {
          fullName: form.get("fullName"),
          email: form.get("email"),
          enrollment: form.get("enrollment") || undefined,
          facultyId: form.get("facultyId") || undefined,
          careerId: form.get("careerId") || undefined,
          password,
        },
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo crear la cuenta.");
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-uach-petrol">Crear cuenta de alumno</h1>
      <p className="mt-1.5 text-sm text-uach-muted">
        Las cuentas de docentes las da de alta la administración.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {error && <FormAlert message={error} />}

        <TextField label="Nombre completo" name="fullName" autoComplete="name" required minLength={3} />
        <TextField
          label="Correo institucional"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@uach.mx"
          required
        />
        <TextField label="Matrícula" name="enrollment" autoComplete="off" />

        {faculties.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Facultad"
              name="facultyId"
              value={facultyId}
              onChange={(event) => setFacultyId(event.target.value)}
            >
              <option value="">Selecciona…</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Carrera" name="careerId" disabled={!careers.length} defaultValue="">
              <option value="">Selecciona…</option>
              {careers.map((career) => (
                <option key={career.id} value={career.id}>
                  {career.name}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, con letras y números."
          required
          minLength={8}
        />
        <TextField
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />

        <div className="pt-2">
          <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-uach-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-uach-teal hover:text-uach-tealDark">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
