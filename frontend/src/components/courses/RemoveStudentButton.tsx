"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, UserMinus } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export function RemoveStudentButton({
  courseId,
  studentId,
  studentName,
}: {
  courseId: string;
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`¿Quitar a ${studentName} del curso? Podrá volver a unirse con el código.`)) return;
    setBusy(true);
    try {
      await api(`/courses/${courseId}/students/${studentId}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo quitar al alumno.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Quitar a ${studentName} del curso`}
      title="Quitar del curso"
      className="press grid h-11 w-11 shrink-0 place-items-center rounded-xl text-uach-ink/60 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-uach-teal/40 disabled:opacity-60"
    >
      {busy ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <UserMinus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
