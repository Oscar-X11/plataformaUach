"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FormAlert } from "@/components/ui/form";
import { BTN_DANGER, BTN_SECONDARY } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { ProfileView } from "@/lib/classwork";

const MAX_MB = 2;

export function AvatarUploader({ profile }: { profile: ProfileView }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(kind: "upload" | "remove", action: () => Promise<ProfileView>) {
    setBusy(kind);
    setError(null);
    try {
      const updated = await action();
      setAvatarUrl(updated.avatarUrl);
      router.refresh(); // actualiza la foto del menú de usuario
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo actualizar la foto.");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen pesa más de ${MAX_MB} MB.`);
      return;
    }
    const form = new FormData();
    form.append("file", file);
    void run("upload", () => api<ProfileView>("/profile/avatar", { method: "POST", body: form }));
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      <Avatar name={profile.fullName} avatarUrl={avatarUrl} size="lg" />
      <div className="space-y-2">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <input
            ref={inputRef}
            id="avatar-input"
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(event) => upload(event.target.files?.[0])}
          />
          <label htmlFor="avatar-input" className={`${BTN_SECONDARY} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy === "upload" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            )}
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </label>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("remove", () => api<ProfileView>("/profile/avatar", { method: "DELETE" }))}
              className={BTN_DANGER}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Quitar
            </button>
          )}
        </div>
        <p className="text-xs text-uach-ink/60">PNG, JPG o WebP de hasta {MAX_MB} MB.</p>
        {error && <FormAlert message={error} />}
      </div>
    </div>
  );
}
