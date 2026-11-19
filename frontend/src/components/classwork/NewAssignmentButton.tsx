"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { BTN_PRIMARY } from "@/components/ui/styles";
import { AssignmentForm } from "@/components/classwork/AssignmentForm";

export function NewAssignmentButton({ courseId, startOpen = false }: { courseId: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  if (open) return <AssignmentForm courseId={courseId} onDone={() => setOpen(false)} />;
  return (
    <button type="button" onClick={() => setOpen(true)} className={BTN_PRIMARY}>
      <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
      Nueva tarea
    </button>
  );
}
