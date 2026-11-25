"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Card } from "@/components/ia/card";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { StudentInterests } from "@/components/people/student-interests";
import { InitialsAvatar, Tag } from "@/components/student/iskur-ui";
import { PeerRequestCard } from "@/components/student/peer-request-card";
import { usePeerMentee } from "@/hooks/use-peer-mentee";
import { PEER_MENTOR_GIVE_HREF } from "@/lib/peer-mentoring";
import { initials } from "@/lib/utils";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
/**
 * A mentee's page for the peer mentor they asked: what Profilim tells students it shares (name, department, interests
 * and goal) and the requests they sent this mentor.
 */
export function PeerMenteeProfileView({ menteeId }: { menteeId: string }) {
  const t = useTranslations("iaIskur.give.menteeProfile");
  const tInterests = useTranslations("iaAcademician.student.interests");
  const view = usePeerMentee(menteeId);
  const { mentee, interests } = view;

  return (
    <div className="space-y-8">
      <Link
        href={PEER_MENTOR_GIVE_HREF}
        className="inline-flex items-center gap-1.5 type-label text-text-secondary hover:text-text-primary"
      >
        <Image alt="" src="/ia/icons/arrow-left.svg" width={16} height={16} />
        {t("back")}
      </Link>
      <QueryNotice isLoading={view.isLoading} error={view.error} />
      {!view.isLoading && !view.error && !mentee ? (
        <InlineAlert tone={StatusTone.Neutral}>{t("notFound")}</InlineAlert>
      ) : null}
      {mentee && interests ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <Card className="space-y-6 self-start">
            <div className="flex flex-wrap items-center gap-5">
              <InitialsAvatar initials={initials(mentee.fullName)} size="lg" />
              <div className="space-y-2">
                <h1 className="type-h2 text-text-primary">{mentee.fullName}</h1>
                {mentee.department ? (
                  <p className="type-body text-text-secondary">
                    {mentee.department}
                  </p>
                ) : null}
                <Tag>{t("role")}</Tag>
              </div>
            </div>
            <hr className="border-border-subtle" />
            <section aria-labelledby="mentee-interests" className="space-y-4">
              <h2
                id="mentee-interests"
                className="type-label text-text-primary"
              >
                {tInterests("title")}
              </h2>
              <StudentInterests interests={interests} />
            </section>
          </Card>
          <section aria-labelledby="mentee-requests" className="space-y-4">
            <h2 id="mentee-requests" className="type-h4 text-text-primary">
              {t("requests")}
            </h2>
            {view.requests.map((request) => (
              <PeerRequestCard
                key={request.id}
                request={request}
                linked={false}
              />
            ))}
          </section>
        </div>
      ) : null}
    </div>
  );
}
