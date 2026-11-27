"use client";

import { CalendarDays, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import {
  AppointmentStatusBadge,
  SectionHeader,
} from "@/components/student/ia/ui";
import {
  InitialsAvatar,
  RequestStatusBadge,
} from "@/components/student/iskur-ui";
import { NameSuffix } from "@/components/student/peer-mentor-directory";
import { PeerSessionBookingDialog } from "@/components/student/peer-session-booking-dialog";
import {
  useMyPeerMentorships,
  type usePeerRequestWithdrawal,
} from "@/hooks/use-peer-mentoring";
import type { Appointment } from "@/interfaces/appointment";
import type { PeerMentoringRequest } from "@/interfaces/peer-mentoring";
import { currentTime } from "@/lib/appointments";
import { mentorshipSince, peerMentorProfileHref } from "@/lib/peer-mentoring";
import { peerMentorHref } from "@/lib/peer-profile-links";
import { formatTurkishTime } from "@/lib/turkey-time";
import { formatDateTime, formatWeekdayDayMonth, initials } from "@/lib/utils";

const APPOINTMENTS_HREF = "/student/appointments";

/**
 * Mentorluk al › Mentorluklarım (Figma 4.4): the active mentorships (accepted requests, with the next meeting or a way to plan
 * one) and the student's other requests.
 */
export function PeerMentoringRequests({
  onFindAnother,
}: {
  /** "Başka mentor bul" on a closed request: back to Keşfet. */
  onFindAnother: () => void;
}) {
  const t = useTranslations("iaIskur.take.mine");
  const mine = useMyPeerMentorships();

  return (
    <div className="space-y-8">
      <QueryNotice isLoading={mine.query.isLoading} error={mine.query.error} />
      {mine.query.data && mine.count === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-default p-6 type-body text-text-secondary">
          {t("empty")}
        </p>
      ) : null}
      {mine.query.data && mine.count > 0 ? (
        <>
          <section
            aria-labelledby="peer-active-title"
            className="flex flex-col gap-5"
          >
            <SectionHeader
              id="peer-active-title"
              title={t("activeTitle")}
              hint={String(mine.active.length)}
            />
            {mine.active.length === 0 ? (
              <p className="type-body-sm text-text-secondary">
                {t("noActive")}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {mine.active.map((request) => (
                  <li key={request.id}>
                    <ActiveMentorship
                      request={request}
                      session={mine.sessionOf(request.id)}
                      sessionsLoading={mine.sessionsLoading}
                      onBook={() => mine.openBooking(request)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <RequestSection
            id="peer-pending-title"
            title={t("pendingTitle")}
            requests={mine.pending}
          >
            {(request) =>
              mine.withdrawal.canWithdraw(request) ? (
                <Button
                  variant={ButtonVariant.Ghost}
                  size={ButtonSize.Small}
                  onClick={() => mine.withdrawal.ask(request)}
                >
                  {t("withdraw")}
                  <NameSuffix name={request.mentor.fullName} />
                </Button>
              ) : null
            }
          </RequestSection>
          <RequestSection
            id="peer-closed-title"
            title={t("closedTitle")}
            requests={mine.closed}
          >
            {() => (
              <button
                type="button"
                onClick={onFindAnother}
                className="h-9 px-1 type-button-sm text-text-link hover:underline"
              >
                {t("findAnother")}
              </button>
            )}
          </RequestSection>
          <p className="flex items-center gap-2 type-body-sm text-text-muted">
            <Info aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            {t("note")}
          </p>
        </>
      ) : null}
      {mine.booking ? (
        <PeerSessionBookingDialog
          request={mine.booking}
          onClose={mine.closeBooking}
        />
      ) : null}
      {mine.withdrawal.pending ? (
        <WithdrawDialog
          request={mine.withdrawal.pending}
          withdrawal={mine.withdrawal}
        />
      ) : null}
    </div>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function WithdrawDialog({
  request,
  withdrawal,
}: {
  request: PeerMentoringRequest;
  withdrawal: ReturnType<typeof usePeerRequestWithdrawal>;
}) {
  const t = useTranslations("iaIskur.take.withdraw");
  return (
    <ModalDialog
      labelledBy="peer-withdraw-title"
      onClose={withdrawal.dismiss}
      panelClassName="w-full max-w-[480px] rounded-[28px] bg-background-surface p-7 shadow-modal outline-none"
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <h2 id="peer-withdraw-title" className="type-h3 text-text-primary">
            {t("title")}
          </h2>
          <p className="type-body-sm text-text-secondary">
            {t("body", { name: request.mentor.fullName })}
          </p>
        </div>
        {withdrawal.error ? (
          <InlineAlert tone={StatusTone.Error} title={withdrawal.error} />
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant={ButtonVariant.Secondary}
            onClick={withdrawal.dismiss}
            disabled={withdrawal.isWithdrawing}
          >
            {t("keep")}
          </Button>
          <Button
            onClick={() => void withdrawal.confirm()}
            disabled={withdrawal.isWithdrawing}
          >
            {withdrawal.isWithdrawing ? t("confirming") : t("confirm")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}

function RequestSection({
  id,
  title,
  requests,
  children,
}: {
  id: string;
  title: string;
  requests: PeerMentoringRequest[];
  children: (request: PeerMentoringRequest) => ReactNode;
}) {
  if (requests.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <SectionHeader id={id} title={title} hint={String(requests.length)} />
      <ul className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6"
          >
            <RequestSummary request={request} />
            <RequestStatusBadge status={request.status} />
            {children(request)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RequestSummary({ request }: { request: PeerMentoringRequest }) {
  const t = useTranslations("iaIskur.take.mine");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  return (
    <div className="flex min-w-0 flex-1 basis-56 items-center gap-4">
      <ProfilePictureLink
        href={peerMentorHref(request.mentor.userId)}
        name={request.mentor.fullName}
      >
        <InitialsAvatar
          personId={request.mentor.userId}
          initials={initials(request.mentor.fullName)}
        />
      </ProfilePictureLink>
      <div className="min-w-0">
        <p className="truncate type-label-lg text-text-primary">
          {request.mentor.fullName}
        </p>
        <p className="type-body-sm text-text-muted">
          {tTopic(request.category)} ·{" "}
          {t("sentAt", { date: formatDateTime(request.createdAt, locale) })}
        </p>
      </div>
    </div>
  );
}

function ActiveMentorship({
  request,
  session,
  sessionsLoading,
  onBook,
}: {
  request: PeerMentoringRequest;
  session: Appointment | null;
  sessionsLoading: boolean;
  onBook: () => void;
}) {
  const t = useTranslations("iaIskur.take.mine");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  const since = (acceptedAt: string) => {
    const start = mentorshipSince(acceptedAt);
    return start
      ? ` · ${t("since", { day: start.day, month: t(`sinceMonth.${start.month}`) })}`
      : null;
  };
  const time = session ? currentTime(session) : null;
  return (
    <article
      aria-label={request.mentor.fullName}
      className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-background-surface p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-2 sm:px-5 sm:py-4">
        <ProfilePictureLink
          href={peerMentorHref(request.mentor.userId)}
          name={request.mentor.fullName}
        >
          <InitialsAvatar
            personId={request.mentor.userId}
            initials={initials(request.mentor.fullName)}
            size="profile"
          />
        </ProfilePictureLink>
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="type-h4 text-text-primary">
            {request.mentor.fullName}
          </h3>
          <p className="type-body-sm text-text-muted">
            {tTopic(request.category)}
            {request.acceptedAt ? since(request.acceptedAt) : null}
          </p>
        </div>
        <StatusBadge
          tone={StatusTone.Success}
          icon={
            <span
              aria-hidden
              className="size-2 rounded-full bg-status-success-icon"
            />
          }
        >
          {t("active")}
        </StatusBadge>
      </div>
      {session && time ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-background-subtle px-4 py-3">
          <CalendarDays
            aria-hidden
            className="size-5 shrink-0 text-icon-default"
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1 basis-56">
            <p className="type-caption text-text-muted">{t("nextSession")}</p>
            <p className="type-label break-words text-text-primary">
              {`${formatWeekdayDayMonth(time.startsAt, locale)} · ${formatTurkishTime(time.startsAt, locale)} – ${formatTurkishTime(time.endsAt, locale)} · ${session.topic}`}
            </p>
          </div>
          <AppointmentStatusBadge status={session.status} />
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          href={peerMentorProfileHref(request.mentor.userId)}
          variant={ButtonVariant.Ghost}
        >
          {t("seeProfile")}
          <NameSuffix name={request.mentor.fullName} />
        </Button>
        {session ? (
          <Button href={APPOINTMENTS_HREF}>{t("seeAppointment")}</Button>
        ) : sessionsLoading ? null : (
          <Button onClick={onBook}>
            <CalendarDays aria-hidden className="size-5" strokeWidth={1.5} />
            {t("book")}
          </Button>
        )}
      </div>
    </article>
  );
}
