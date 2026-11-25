"use client";

import { ArrowLeft, Briefcase } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Chip } from "@/components/student/ia/ui";
import { InitialsAvatar, Tag, TagTone } from "@/components/student/iskur-ui";
import {
  AvailabilityLine,
  RequestButton,
  WhyRecommended,
} from "@/components/student/peer-mentor-directory";
import { PeerMentorRequestDialog } from "@/components/student/peer-mentor-request-dialog";
import { PeerMentorSharedEvidence } from "@/components/student/peer-mentor-shared-evidence";
import { usePeerMentor } from "@/hooks/use-peer-mentoring";
import { formatYearMonth } from "@/lib/peer-mentoring";
import { httpUrlOrNull, initials } from "@/lib/utils";

const BACK_HREF = "/student/peer-mentoring";

/**
 * A peer mentor's profile as students see it (Figma 4.2): who they are, the topics and sub-topics they help with, their
 * experience and links, why they were recommended, their weekly hours and the request button.
 */
export function PeerMentorPublicProfile({ mentorId }: { mentorId: string }) {
  const t = useTranslations("iaIskur.take.profile");
  const tDiscover = useTranslations("iaIskur.take.discover");
  const tTopic = useTranslations("peerTopics");
  const tSubTopic = useTranslations("studentProfileCompletion.subtopics");
  const tDay = useTranslations("options.weekday");
  const locale = useLocale();
  const view = usePeerMentor(mentorId);
  const { mentor } = view;
  const linkedinUrl = httpUrlOrNull(mentor?.linkedinUrl);

  return (
    <div className="space-y-8">
      <Link
        href={BACK_HREF}
        className="inline-flex h-9 items-center gap-1.5 px-3 type-button-sm text-text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
        {t("back")}
      </Link>
      <QueryNotice isLoading={view.isLoading} error={view.error} />
      {!view.isLoading && !view.error && !mentor ? (
        <p className="rounded-card border border-border-subtle bg-background-surface p-6 type-body text-text-secondary">
          {t("notFound")}
        </p>
      ) : null}
      {mentor && view.availability ? (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-7">
            <header className="flex flex-wrap items-center gap-5">
              <InitialsAvatar initials={initials(mentor.fullName)} size="lg" />
              <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
                <h1 className="type-h2 text-text-primary">{mentor.fullName}</h1>
                <p className="type-body text-text-muted">
                  {[
                    mentor.department,
                    mentor.classYear
                      ? tDiscover("classYear", { year: mentor.classYear })
                      : null,
                    t("peer"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {view.badgeVerified ? (
                  <div>
                    <Tag tone={TagTone.Success}>{t("badgeVerified")}</Tag>
                  </div>
                ) : null}
              </div>
            </header>
            <section
              aria-labelledby="mentor-topics"
              className="flex flex-col gap-3"
            >
              <h2 id="mentor-topics" className="type-h4 text-text-primary">
                {t("topics")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {mentor.categories.map((category) => (
                  <li key={category}>
                    <Chip>{tTopic(category)}</Chip>
                  </li>
                ))}
                {view.subTopics.map(({ id, entry }) => (
                  <li key={id}>
                    <Chip>{entry ? tSubTopic(entry.labelKey) : id}</Chip>
                  </li>
                ))}
              </ul>
            </section>
            <section
              aria-labelledby="mentor-help"
              className="flex flex-col gap-2"
            >
              <h2 id="mentor-help" className="type-h4 text-text-primary">
                {t("helpWith")}
              </h2>
              <p className="type-body whitespace-pre-line text-text-secondary">
                {mentor.helpWith}
              </p>
            </section>
            {mentor.experiences.length > 0 ||
            mentor.strongCourses.length > 0 ||
            mentor.projects.length > 0 ||
            mentor.erasmus ? (
              <section
                aria-labelledby="mentor-experience"
                className="flex flex-col gap-3"
              >
                <h2
                  id="mentor-experience"
                  className="type-h4 text-text-primary"
                >
                  {t("experience")}
                </h2>
                {mentor.experiences.length > 0 ? (
                  <ul className="divide-y divide-border-default">
                    {mentor.experiences.map((card, index) => (
                      <li
                        key={`${card.title}-${card.startedOn ?? ""}-${String(index)}`}
                        className="flex items-center gap-4 py-3 first:pt-0"
                      >
                        <Briefcase
                          aria-hidden
                          className="size-5 shrink-0 text-icon-default"
                          strokeWidth={1.5}
                        />
                        <div className="min-w-0">
                          <p className="type-label text-text-primary">
                            {card.organization
                              ? `${card.title} — ${card.organization}`
                              : card.title}
                          </p>
                          <p className="type-body-sm text-text-muted">
                            {card.startedOn
                              ? t("experienceRange", {
                                  start: formatYearMonth(
                                    card.startedOn,
                                    locale,
                                  ),
                                  end: card.endedOn
                                    ? formatYearMonth(card.endedOn, locale)
                                    : t("ongoing"),
                                })
                              : null}
                            {card.startedOn && card.summary ? " · " : null}
                            {card.summary}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <dl className="flex flex-col gap-3">
                  <ExperienceLine
                    label={t("strongCourses")}
                    items={mentor.strongCourses}
                  />
                  <ExperienceLine
                    label={t("projects")}
                    items={mentor.projects}
                  />
                  <ExperienceLine
                    label={t("erasmus")}
                    items={mentor.erasmus ? [mentor.erasmus] : []}
                  />
                </dl>
              </section>
            ) : null}
            <PeerMentorSharedEvidence
              mentorId={mentorId}
              linkedinUrl={linkedinUrl}
            />
          </div>
          <aside className="flex flex-col gap-5 rounded-2xl border border-border-strong bg-background-surface p-6">
            <WhyRecommended reasons={view.reasons} />
            <section
              aria-labelledby="mentor-availability"
              className="flex flex-col gap-4"
            >
              <h2
                id="mentor-availability"
                className="type-label text-text-primary"
              >
                {t("availability")}
              </h2>
              {view.weeklyHours.length === 0 ? (
                <p className="type-body-sm text-text-secondary">
                  {t("noHours")}
                </p>
              ) : (
                <dl className="flex flex-col gap-4">
                  {view.weeklyHours.map((range) => (
                    <div
                      key={`${range.dayOfWeek}-${range.start}-${range.end}`}
                      className="flex items-center justify-between gap-4"
                    >
                      <dt className="type-body text-text-secondary">
                        {tDay(range.dayOfWeek)}
                      </dt>
                      <dd className="type-label text-text-primary">
                        {t("hoursRange", {
                          start: range.start,
                          end: range.end,
                        })}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <AvailabilityLine
                mentor={mentor}
                availability={view.closedReason}
              />
            </section>
            <div className="flex flex-col gap-4 border-t border-border-default pt-5">
              <RequestButton
                mentor={mentor}
                availability={view.availability}
                onRequest={view.openRequest}
              />
              <p className="type-caption text-text-muted">
                {t("requestNote", { name: mentor.fullName })}
              </p>
            </div>
          </aside>
          {view.requesting ? (
            <PeerMentorRequestDialog
              mentor={mentor}
              onClose={view.closeRequest}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ExperienceLine({
  label,
  items,
}: {
  label: string;
  items: readonly string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className="type-body-sm text-text-secondary">{items.join(" · ")}</dd>
    </div>
  );
}
