"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import type { CourseSummary } from "@/lib/courses";

/** El alumno escribe el código que le dio su docente y entra al curso. */
export function JoinCourseForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    setError(null);
    setLoading(true);
    try {
      const course = await api<CourseSummary>("/courses/join", { method: "POST", body: { code } });
      router.push(`/cursos/${course.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo unir al curso.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full sm:w-auto">
      <label htmlFor="join-code" className="mb-1.5 block text-sm font-medium text-white">
        Únete con el código de tu docente
      </label>
      <div className="flex gap-2">
        <input
          id="join-code"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={10}
          placeholder="Ej. K7MP4XR"
          className="h-11 w-full min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 font-mono text-base uppercase tracking-[0.2em] text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-white/60 focus:border-white/60 focus:outline-none focus:ring-4 focus:ring-white/15 sm:w-48"
        />
        <button
          type="submit"
          disabled={loading}
          className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-uach-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-uach-teal/85 disabled:opacity-70"
        >
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Unirme
        </button>
      </div>
      {error && (
        <div className="mt-3">
          <FormAlert message={error} />
        </div>
      )}
    </form>
  );
}
