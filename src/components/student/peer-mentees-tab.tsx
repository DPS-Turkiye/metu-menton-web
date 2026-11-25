"use client";

import { Hourglass } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Button } from "@/components/ia/button";
import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import { SectionHeader } from "@/components/student/ia/ui";
import {
  InitialsAvatar,
  RequestStatusBadge,
} from "@/components/student/iskur-ui";
import { PeerCapacitySummary } from "@/components/student/peer-capacity-card";
import { ReportDayPill } from "@/components/student/reports/report-day-pill";
import { usePeerMenteesTab } from "@/hooks/use-peer-mentees-tab";
import type { PeerGivePublished } from "@/hooks/use-peer-mentor-give";
import type { Appointment } from "@/interfaces/appointment";
import type { PeerMentoringRequest } from "@/interfaces/peer-mentoring";
import { currentTime } from "@/lib/appointments";
import { timeLabel } from "@/lib/calendar";
import { mentorshipSince } from "@/lib/peer-mentoring";
import { requestMenteeHref } from "@/lib/peer-profile-links";
import { formatWeekdayDayMonth, initials } from "@/lib/utils";
import { PeerGiveTab } from "@/types/iskur-student";

/** Menteelerim (Figma 7.3): a meeting report due, the active mentees, the capacity and this week's report. */
export function PeerMenteesTab({ view }: { view: PeerGivePublished }) {
  const t = useTranslations("iaIskur.give");
  const tReports = useTranslations("iaIskurReports.give");
  const cards = usePeerMenteesTab();
  const { received, loaded } = view;

  return (
    <div className="flex flex-col gap-6">
      {cards.dueMeeting ? (
        <section
          aria-labelledby="peer-meeting-report-due"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-status-warning-border bg-status-warning-bg px-6 py-5 sm:px-10 sm:py-8"
        >
          <Hourglass
            aria-hidden
            className="size-5 shrink-0 text-icon-default"
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1 basis-56">
            <h2
              id="peer-meeting-report-due"
              className="type-label-lg text-text-primary"
            >
              {tReports("dueTitle", { name: cards.dueMeeting.menteeName })}
            </h2>
            <p className="type-body-sm text-text-muted">
              {tReports("dueBody")}
            </p>
          </div>
          <Button href={cards.dueMeeting.href}>{tReports("dueAction")}</Button>
        </section>
      ) : null}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <QueryNotice
            isLoading={received.query.isLoading}
            error={received.query.error}
          />
          <QueryNotice isLoading={false} error={cards.error} />
          {loaded ? (
            <section
              aria-labelledby="peer-active-mentees"
              className="flex flex-col gap-5"
            >
              <SectionHeader
                id="peer-active-mentees"
                title={tReports("activeMentees")}
                hint={String(received.mentees.length)}
              />
              {received.mentees.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border-default p-6 type-body text-text-secondary">
                  {t("mentees.empty")}
                </p>
              ) : (
                <ul className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface">
                  {received.mentees.map((request) => (
                    <li key={request.id}>
                      <MenteeRow
                        request={request}
                        session={cards.sessionOf(request.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
        <aside className="flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0">
          {view.capacity ? (
            <PeerCapacitySummary
              capacity={view.capacity}
              waiting={loaded ? received.waiting.length : null}
              onOpenRequests={() => view.setTab(PeerGiveTab.Requests)}
            />
          ) : null}
          {cards.week ? (
            <section
              aria-labelledby="peer-week-report"
              className="flex flex-col gap-2.5 rounded-2xl bg-background-subtle p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="peer-week-report"
                  className="type-label-lg text-text-primary"
                >
                  {tReports("weekTitle")}
                </h2>
                <ReportDayPill badge={cards.week.badge} />
              </div>
              <p className="type-h3 text-text-primary">{cards.week.label}</p>
              <ul className="flex flex-col gap-1 type-body-sm text-text-secondary">
                <li>{tReports("weekAdded", { count: cards.week.added })}</li>
                {cards.week.waitingForAnswers ? (
                  <li>{tReports("weekWaiting")}</li>
                ) : null}
                <li>{tReports("weekDue", { time: cards.week.deadline })}</li>
              </ul>
              <Button href={cards.week.href} fullWidth>
                {tReports("weekAction")}
              </Button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function MenteeRow({
  request,
  session,
}: {
  request: PeerMentoringRequest;
  session: Appointment | null;
}) {
  const t = useTranslations("iaIskur.give.mentees");
  const tMine = useTranslations("iaIskur.take.mine");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  const { mentee } = request;
  const start = request.acceptedAt ? mentorshipSince(request.acceptedAt) : null;
  const time = session ? currentTime(session) : null;
  return (
    <article
      aria-label={mentee.fullName}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
    >
      <ProfilePictureLink
        href={requestMenteeHref(request)}
        name={mentee.fullName}
      >
        <InitialsAvatar initials={initials(mentee.fullName)} />
      </ProfilePictureLink>
      <div className="min-w-0 flex-1 basis-56">
        <h3 className="type-label-lg text-text-primary">{mentee.fullName}</h3>
        <p className="type-body-sm text-text-muted">
          {[
            mentee.department,
            tTopic(request.category),
            start
              ? tMine("since", {
                  day: start.day,
                  month: tMine(`sinceMonth.${start.month}`),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {time ? (
          <p className="type-body-sm text-status-success-text">
            {t("nextSession", {
              day: formatWeekdayDayMonth(new Date(time.startsAt), locale),
              time: timeLabel(time.startsAt, locale),
            })}
          </p>
        ) : null}
      </div>
      <RequestStatusBadge status={request.status} />
    </article>
  );
}
