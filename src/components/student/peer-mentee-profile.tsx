"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { QueryNotice } from "@/components/admin/admin-ui";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { StudentInterests } from "@/components/people/student-interests";
import { BackButton } from "@/components/student/ia/back-button";
import { SectionHeader } from "@/components/student/ia/ui";
import { InitialsAvatar, Tag, TagTone } from "@/components/student/iskur-ui";
import { PeerRequestCard } from "@/components/student/peer-request-card";
import { usePeerMentee } from "@/hooks/use-peer-mentee";
import { PEER_MENTOR_GIVE_HREF } from "@/lib/peer-mentoring";
import { initials } from "@/lib/utils";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
/**
 * A mentee's page for the peer mentor they asked: what Profilim tells students it shares (name, department, interests
 * and goal) and the requests they sent this mentor, laid out like the academician's student page (Figma 10.8).
 */
export function PeerMenteeProfileView({ menteeId }: { menteeId: string }) {
  const t = useTranslations("iaIskur.give.menteeProfile");
  const tInterests = useTranslations("iaAcademician.student.interests");
  const view = usePeerMentee(menteeId);
  const { mentee, interests } = view;

  return (
    <div className="space-y-8">
      <BackButton href={PEER_MENTOR_GIVE_HREF}>{t("back")}</BackButton>
      <QueryNotice isLoading={view.isLoading} error={view.error} />
      {!view.isLoading && !view.error && !mentee ? (
        <InlineAlert tone={StatusTone.Neutral}>{t("notFound")}</InlineAlert>
      ) : null}
      {mentee && interests ? (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <header className="flex flex-wrap items-center gap-5">
              <InitialsAvatar
                personId={mentee.userId}
                initials={initials(mentee.fullName)}
                size="lg"
              />
              <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
                <h1 className="type-h2 text-text-primary">{mentee.fullName}</h1>
                {mentee.department ? (
                  <p className="type-body text-text-muted">
                    {mentee.department}
                  </p>
                ) : null}
                <div>
                  <Tag tone={TagTone.Accent}>{t("role")}</Tag>
                </div>
              </div>
            </header>
            <section
              aria-labelledby="mentee-requests"
              className="flex flex-col gap-4"
            >
              <SectionHeader
                id="mentee-requests"
                title={t("requests")}
                hint={String(view.requests.length)}
              />
              {view.requests.map((request) => (
                <PeerRequestCard
                  key={request.id}
                  request={request}
                  linked={false}
                />
              ))}
            </section>
          </div>
          <aside className="flex flex-col gap-5">
            <section
              aria-labelledby="mentee-interests"
              className="flex flex-col gap-4 rounded-2xl bg-background-subtle p-5"
            >
              <h2
                id="mentee-interests"
                className="border-b border-border-default pb-3 type-label-lg text-text-primary"
              >
                {tInterests("title")}
              </h2>
              <StudentInterests interests={interests} />
            </section>
            <p className="flex items-start gap-2 type-body-sm text-text-muted">
              <Lock
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={1.5}
              />
              {t("privacy")}
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
