"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, LogOut, Trash2, UserPlus } from "lucide-react";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { StudyGroupDetail } from "@/lib/institutional";

export function GroupActions({ group }: { group: StudyGroupDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const full = group.memberCount >= group.capacity;

  async function run(label: string, action: () => Promise<unknown>, after?: () => void) {
    setBusy(label);
    try {
      await action();
      if (after) after();
      else router.refresh();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo completar la acción.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!group.isMember && (
        <button
          type="button"
          disabled={busy !== null || full}
          onClick={() => run("join", () => api(`/study-groups/${group.id}/join`, { method: "POST" }))}
          className={BTN_PRIMARY}
        >
          {busy === "join" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          {full ? "Grupo lleno" : "Unirme"}
        </button>
      )}
      {group.isMember && !group.isCreator && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("leave", () => api(`/study-groups/${group.id}/leave`, { method: "POST" }))}
          className={BTN_SECONDARY}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Salir del grupo
        </button>
      )}
      {group.canDelete && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm(`¿Borrar el grupo «${group.title}»?`)) return;
            void run("delete", () => api(`/study-groups/${group.id}`, { method: "DELETE" }), () => router.replace("/grupos-estudio"));
          }}
          className={BTN_DANGER}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Borrar grupo
        </button>
      )}
    </div>
  );
}
