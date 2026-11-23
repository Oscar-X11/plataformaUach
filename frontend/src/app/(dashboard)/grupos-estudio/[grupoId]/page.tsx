import Link from "next/link";
import { MeetingInfo } from "@/components/ui/MeetingInfo";
import { ArrowLeft, MapPin, UsersRound } from "lucide-react";
import { GroupActions } from "@/components/groups/GroupActions";
import { CARD } from "@/components/dashboard/tone";
import { Avatar } from "@/components/ui/Avatar";
import type { StudyGroupDetail } from "@/lib/institutional";
import { serverApi } from "@/lib/server-session";
import { ROLE_LABELS } from "@/lib/session";

export const metadata = { title: "Grupo de estudio" };

export default async function GrupoPage({ params }: { params: { grupoId: string } }) {
  const group = await serverApi<StudyGroupDetail>(`/study-groups/${encodeURIComponent(params.grupoId)}`);

  return (
    <section className="space-y-6">
      <Link href="/grupos-estudio" className="inline-flex items-center gap-1.5 text-sm font-medium text-uach-teal hover:text-uach-tealDark">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Grupos de estudio
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <article className="rounded-2xl bg-uach-petrol p-5 text-white sm:p-6">
          <p className="text-sm text-white/80">
            {group.subject ? `${group.subject.code} · ${group.subject.name}` : "Grupo general"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{group.title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/90">{group.description}</p>
          <div className="mt-4 space-y-1.5 text-sm text-white/80">
            {group.meetingInfo && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <MeetingInfo text={group.meetingInfo} linkClassName="text-white hover:text-white/80" />
              </p>
            )}
            <p className="flex items-center gap-2 tabular-nums">
              <UsersRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {group.memberCount}/{group.capacity} integrantes · organiza {group.creator.fullName}
            </p>
          </div>
        </article>

        <aside className={`${CARD} space-y-4 p-5`}>
          <GroupActions group={group} />
          <h2 className="border-t border-uach-ink/[0.06] pt-4 text-base font-semibold text-uach-ink">Integrantes</h2>
          {group.members.length === 0 ? (
            <p className="text-sm text-uach-ink/75">Únete para ver quiénes participan.</p>
          ) : (
            <ul className="space-y-3">
              {group.members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar name={member.fullName} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-uach-ink">{member.fullName}</span>
                    <span className="block text-xs text-uach-ink/75">
                      {member.id === group.creator.id ? "Organiza" : ROLE_LABELS[member.role]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
