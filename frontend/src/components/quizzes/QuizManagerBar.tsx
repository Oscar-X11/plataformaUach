"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, Trash2 } from "lucide-react";
import { FOCUS_RING } from "@/components/dashboard/tone";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import { KIND_LABEL, type QuizManagerView } from "@/lib/quizzes";

/** Docente: estado, publicar u ocultar, borrar y pestañas Preguntas / Respuestas. */
export function QuizManagerBar({ quiz }: { quiz: QuizManagerView }) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const base = `/cursos/${quiz.courseId}/cuestionarios/${quiz.id}`;
  const label = KIND_LABEL[quiz.kind].one;

  async function publish(published: boolean) {
    setBusy(true);
    try {
      await api(`/quizzes/${quiz.id}/publish`, { method: "POST", body: { published } });
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const warning = quiz.responses
      ? `Se borrarán también las ${quiz.responses} respuestas. ¿Borrar «${quiz.title}»?`
      : `¿Borrar «${quiz.title}»?`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    try {
      await api(`/quizzes/${quiz.id}`, { method: "DELETE" });
      router.push(`/cursos/${quiz.courseId}/cuestionarios`);
      router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
      setBusy(false);
    }
  }

  const tabs = [
    { href: base, label: "Preguntas" },
    { href: `${base}/respuestas`, label: `Respuestas (${quiz.responses})` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-uach-ink/75">
          {quiz.published ? (
            <>
              Publicado · lo ven {quiz.students} {quiz.students === 1 ? "alumno" : "alumnos"}
              {quiz.needsReview > 0 && <span className="text-amber-800"> · {quiz.needsReview} por revisar</span>}
            </>
          ) : (
            `Borrador: los alumnos todavía no ven este ${label}.`
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {quiz.published ? (
            quiz.responses === 0 && (
              <button type="button" onClick={() => publish(false)} disabled={busy} className={BTN_SECONDARY}>
                <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Ocultar
              </button>
            )
          ) : (
            <button type="button" onClick={() => publish(true)} disabled={busy} className={BTN_PRIMARY}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
              Publicar
            </button>
          )}
          <button type="button" onClick={remove} disabled={busy} className={BTN_DANGER} aria-label={`Borrar ${label}`}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
      <nav aria-label={`Secciones del ${label}`}>
        <ul className="flex gap-1 border-b border-uach-ink/10">
          {tabs.map((tab) => {
            const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-11 items-center rounded-t-lg px-3 text-sm font-medium transition-colors ${FOCUS_RING} ${
                    active ? "text-uach-tealDark" : "text-uach-ink/75 hover:text-uach-ink"
                  }`}
                >
                  {tab.label}
                  {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-uach-teal" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
