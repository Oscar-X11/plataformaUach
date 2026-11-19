import { STATE_META } from "@/components/ui/styles";
import type { SubmissionState } from "@/lib/classwork";

export function StateChip({ state }: { state: SubmissionState }) {
  const meta = STATE_META[state];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}>
      {meta.label}
    </span>
  );
}
