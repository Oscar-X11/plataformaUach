"use client";

import { useRef, useState } from "react";
import { FileText, LoaderCircle, Paperclip, Undo2, Upload, X } from "lucide-react";
import { StateChip } from "@/components/classwork/StateChip";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import {
  MAX_SUBMISSION_FILE_MB,
  SUBMISSION_ACCEPT,
  fileHref,
  formatBytes,
  type SubmissionView,
} from "@/lib/classwork";
import { formatDateTime } from "@/lib/dashboard/format";

/** "Tu trabajo": adjuntar archivos, entregar, anular y ver la calificación. */
export function SubmissionPanel({
  assignmentId,
  points,
  initial,
}: {
  assignmentId: string;
  points: number;
  initial: SubmissionView;
}) {
  const [submission, setSubmission] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = submission.status === "ASSIGNED";
  const base = `/assignments/${assignmentId}/submission`;

  async function run(label: string, action: () => Promise<SubmissionView>) {
    setBusy(label);
    setError(null);
    try {
      setSubmission(await action());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo completar la acción.");
    } finally {
      setBusy(null);
    }
  }

  function upload(files: FileList | null) {
    if (!files?.length) return;
    const tooBig = Array.from(files).find((file) => file.size > MAX_SUBMISSION_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError(`«${tooBig.name}» pesa más de ${MAX_SUBMISSION_FILE_MB} MB.`);
      return;
    }
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    void run("upload", () => api<SubmissionView>(`${base}/files`, { method: "POST", body: form }));
    if (inputRef.current) inputRef.current.value = "";
  }

  const turnInLabel = submission.files.length ? "Entregar" : "Marcar como hecha";

  return (
    <section aria-labelledby="tu-trabajo" className={`${CARD} space-y-4 p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="tu-trabajo" className="text-base font-semibold text-uach-ink">Tu trabajo</h2>
        <StateChip state={submission.state} />
      </div>

      {submission.status === "RETURNED" && (
        <div className="rounded-xl bg-uach-teal/10 px-4 py-3">
          <p className="text-sm text-uach-tealDark">Calificación</p>
          <p className="text-2xl font-semibold tabular-nums text-uach-ink">
            {submission.grade ?? "—"}
            <span className="text-base font-normal text-uach-ink/75">/{points}</span>
          </p>
          {submission.feedback && (
            <p className="mt-2 whitespace-pre-line text-sm text-uach-ink">{submission.feedback}</p>
          )}
        </div>
      )}

      {error && <FormAlert message={error} />}

      {submission.files.length > 0 ? (
        <ul className="space-y-2">
          {submission.files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 rounded-xl border border-uach-ink/10 px-3 py-2">
              <FileText className="h-5 w-5 shrink-0 text-uach-teal" strokeWidth={1.5} aria-hidden />
              <a
                href={fileHref(file.fileUrl)}
                target="_blank"
                rel="noopener"
                className="min-w-0 flex-1 truncate text-sm font-medium text-uach-ink hover:text-uach-tealDark hover:underline"
              >
                {file.originalName}
              </a>
              <span className="shrink-0 text-xs tabular-nums text-uach-ink/75">{formatBytes(file.size)}</span>
              {editable && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`rm-${file.id}`, () => api<SubmissionView>(`${base}/files/${file.id}`, { method: "DELETE" }))
                  }
                  aria-label={`Quitar ${file.originalName}`}
                  className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-uach-ink/60 hover:bg-red-50 hover:text-red-700"
                >
                  {busy === `rm-${file.id}` ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <X className="h-4 w-4" aria-hidden />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        editable && <p className="text-sm text-uach-ink/75">Adjunta tus archivos o márcala como hecha si no lleva entregable.</p>
      )}

      {submission.submittedAt && submission.status !== "ASSIGNED" && (
        <p className="text-xs text-uach-ink/75">Entregada el {formatDateTime(submission.submittedAt)}</p>
      )}

      <div className="flex flex-col gap-2" aria-live="polite">
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={SUBMISSION_ACCEPT}
              className="sr-only"
              id={`upload-${assignmentId}`}
              onChange={(event) => upload(event.target.files)}
            />
            <label
              htmlFor={`upload-${assignmentId}`}
              className={`${BTN_SECONDARY} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              {busy === "upload" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Paperclip className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              )}
              {busy === "upload" ? "Subiendo…" : "Adjuntar archivos"}
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("turn-in", () => api<SubmissionView>(`${base}/turn-in`, { method: "POST" }))}
              className={BTN_PRIMARY}
            >
              {busy === "turn-in" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
              )}
              {turnInLabel}
            </button>
            <p className="text-xs text-uach-ink/60">
              PDF, Office, imágenes, ZIP o texto · hasta {MAX_SUBMISSION_FILE_MB} MB por archivo.
            </p>
          </>
        )}
        {submission.status === "SUBMITTED" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("unsubmit", () => api<SubmissionView>(`${base}/unsubmit`, { method: "POST" }))}
            className={BTN_GHOST}
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Anular entrega
          </button>
        )}
      </div>
    </section>
  );
}
