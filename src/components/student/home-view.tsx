"use client";

import {
  AlarmClock,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  GraduationCap,
  Hourglass,
  Lightbulb,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import {
  AppointmentStatusBadge,
  InitialsAvatar,
  SectionHeader,
} from "@/components/student/ia/ui";
import { useOfficeHoursOpen } from "@/hooks/use-office-hours-open";
import { useStudentFeatures } from "@/hooks/use-student-features";
import {
  useStudentHome,
  type StudentHomeModel,
} from "@/hooks/use-student-home";
import type { Appointment } from "@/interfaces/appointment";
import type {
  PeerMentorCard,
  PeerMentoringRequest,
} from "@/interfaces/peer-mentoring";
import { currentTime } from "@/lib/appointments";
import { weekdayName } from "@/lib/calendar";
import {
  appointmentProfileHref,
  peerMentorHref,
} from "@/lib/peer-profile-links";
import {
  STUDENT_OFFICE_HOURS_HREF,
  STUDENT_PEER_MENTORING_HREF,
} from "@/lib/student-features";
import { formatTurkishTime } from "@/lib/turkey-time";
import { formatDayMonthLong, formatWeekdayDayMonth } from "@/lib/utils";

const APPOINTMENTS_HREF = "/student/appointments";
const QUICK_IMAGE_DIR = "/ia/student";

/**
 * Ana Sayfa (Figma 3.1). `top`, `main` and `aside` are extension points: another student edition (İŞKUR) adds its
 * own blocks above both columns, below the main column or in the side column without changing this screen.
 */
export function StudentHomeView({
  top,
  main,
  aside,
}: {
  top?: ReactNode;
  main?: ReactNode;
  aside?: ReactNode;
}) {
  const t = useTranslations("iaStudent.home");
  const locale = useLocale();
  const home = useStudentHome();
  const features = useStudentFeatures();

  return (
    <div className="flex flex-col gap-8">
      {home.greeting ? (
        <header className="flex flex-col gap-1">
          {home.today ? (
            <p className="type-body text-text-muted">
              {`${weekdayName(home.today, locale)}, ${formatDayMonthLong(home.today, locale)}`}
            </p>
          ) : null}
          <h1 className="type-h1 text-text-primary">
            {home.name
              ? t("greeting", { greeting: home.greeting, name: home.name })
              : home.greeting}
          </h1>
        </header>
      ) : null}
      <QueryNotice isLoading={home.isLoading} error={home.error} />
      {home.ready ? (
        <>
          {home.next || home.reply ? (
            <div
              className={`grid items-start gap-6 ${home.next && home.reply ? COLUMNS : ""}`}
            >
              {home.next ? (
                <NextAppointment appointment={home.next} day={home.nextDay} />
              ) : null}
              {home.reply ? <ReplyNeeded appointment={home.reply} /> : null}
            </div>
          ) : null}
          <QuickActions home={home} />
          {top}
          <div className={`grid items-start gap-6 ${COLUMNS}`}>
            <div className="flex min-w-0 flex-col gap-8">
              {home.mentors.length > 0 ? (
                <section
                  aria-labelledby="student-mentors"
                  className="flex flex-col gap-4"
                >
                  <SectionHeader
                    id="student-mentors"
                    title={t("mentors.title")}
                    hint={t("mentors.hint")}
                    action={
                      features.shows(STUDENT_PEER_MENTORING_HREF)
                        ? {
                            href: STUDENT_PEER_MENTORING_HREF,
                            label: t("seeAll"),
                          }
                        : undefined
                    }
                  />
                  <ul className={LIST}>
                    {home.mentors.map((mentor) => (
                      <MentorRow key={mentor.mentorId} mentor={mentor} />
                    ))}
                  </ul>
                </section>
              ) : null}
              {main}
            </div>
            <div className="flex flex-col gap-8">
              <PendingRequests home={home} />
              {home.advisor ? (
                <AdvisorCard
                  advisor={home.advisor}
                  officeHours={features.shows(STUDENT_OFFICE_HOURS_HREF)}
                />
              ) : null}
              {aside}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_380px]";
const LIST =
  "divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface";

/** "Sal 10 Kas · 14:00 – 14:30" */
function whenLine(appointment: Appointment, locale: string) {
  const time = currentTime(appointment);
  return `${formatWeekdayDayMonth(time.startsAt, locale)} · ${formatTurkishTime(time.startsAt, locale)} – ${formatTurkishTime(time.endsAt, locale)}`;
}

function counterpartName({ counterpart }: Appointment) {
  return [counterpart.title, counterpart.fullName].filter(Boolean).join(" ");
}

function NextAppointment({
  appointment,
  day,
}: {
  appointment: Appointment;
  day: StudentHomeModel["nextDay"];
}) {
  const t = useTranslations("iaStudent.home.next");
  const tKind = useTranslations("iaStudent.common.kind");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  const { counterpart } = appointment;

  return (
    <section
      aria-labelledby="student-next"
      className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-background-surface p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays
          aria-hidden
          className="size-4 text-icon-default"
          strokeWidth={1.5}
        />
        <p
          id="student-next"
          className="min-w-0 flex-1 type-overline text-text-accent uppercase"
        >
          {day ? t(`labelDay.${day}`) : t("label")}
        </p>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <div className="flex min-w-0 items-center gap-4 sm:px-5 sm:py-4">
        <ProfilePictureLink
          href={appointmentProfileHref(appointment)}
          name={counterpart.fullName}
        >
          <InitialsAvatar
            personId={counterpart.userId}
            name={counterpart.fullName}
            size="lg"
          />
        </ProfilePictureLink>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="type-h4 break-words text-text-primary">
            {appointment.category
              ? tTopic(appointment.category)
              : appointment.topic}
          </p>
          <p className="type-body-sm text-text-muted">
            {[counterpartName(appointment), counterpart.department]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="flex items-center gap-1.5 type-label text-text-secondary">
          <AlarmClock aria-hidden className="size-4" strokeWidth={1.5} />
          {whenLine(appointment, locale)}
        </p>
        <p className="flex items-center gap-1.5 type-label text-text-secondary">
          <GraduationCap aria-hidden className="size-4" strokeWidth={1.5} />
          {[tKind(appointment.kind), appointment.place]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <Button
          href={APPOINTMENTS_HREF}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Small}
          className="ml-auto"
        >
          {t("view")}
        </Button>
      </div>
    </section>
  );
}

/** "Yanıtın gerekiyor": another time was offered, and only the student can settle it. */
function ReplyNeeded({ appointment }: { appointment: Appointment }) {
  const t = useTranslations("iaStudent.home.reply");
  const locale = useLocale();
  const short = (startsAt: string) =>
    `${formatWeekdayDayMonth(startsAt, locale)} ${formatTurkishTime(startsAt, locale)}`;
  return (
    <section
      aria-labelledby="student-reply"
      className="flex flex-col gap-3 rounded-2xl border border-status-warning-border bg-status-warning-bg p-6"
    >
      <p
        id="student-reply"
        className="flex items-center gap-2 type-overline text-status-warning-text uppercase"
      >
        <Hourglass
          aria-hidden
          className="size-4 text-icon-default"
          strokeWidth={1.5}
        />
        {t("label")}
      </p>
      <p className="type-label-lg text-text-primary">
        {t("title", { name: counterpartName(appointment) })}
      </p>
      <p className="type-body-sm text-text-secondary">
        {appointment.alternative
          ? t("change", {
              from: short(appointment.startsAt),
              to: short(appointment.alternative.startsAt),
            })
          : whenLine(appointment, locale)}
      </p>
      <Button href={APPOINTMENTS_HREF} fullWidth className="justify-start">
        {t("action")}
      </Button>
    </section>
  );
}

function QuickActions({ home }: { home: StudentHomeModel }) {
  const t = useTranslations("iaStudent.home.quick");
  const tSoon = useTranslations("officeHoursComingSoon");
  const features = useStudentFeatures();
  const officeHours = useOfficeHoursOpen();
  const cards = [
    {
      key: "officeHours",
      href: STUDENT_OFFICE_HOURS_HREF,
      image: `${QUICK_IMAGE_DIR}/quick-office-hours.png`,
      // TEST UI: placeholder until the design team's screen; replace when it arrives.
      body: officeHours.open ? t("officeHours.body") : tSoon("short"),
    },
    {
      key: "peerMentor",
      href: STUDENT_PEER_MENTORING_HREF,
      image: `${QUICK_IMAGE_DIR}/quick-peer-mentor.png`,
      body: t("peerMentor.body"),
    },
    {
      key: "appointments",
      href: APPOINTMENTS_HREF,
      image: `${QUICK_IMAGE_DIR}/quick-appointments.png`,
      body: t("appointments.body", {
        upcoming: home.confirmedCount,
        requests: home.requestCount,
      }),
    },
    {
      key: "profile",
      href: home.profileHref,
      image: `${QUICK_IMAGE_DIR}/quick-profile.png`,
      body: t("profile.body"),
    },
  ] as const;

  return (
    <nav aria-label={t("label")}>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.visible(cards).map((card) => (
          <li key={card.key}>
            <Link
              href={card.href}
              className="flex h-full items-center gap-4 rounded-2xl border border-border-default bg-background-surface px-5 py-4 transition hover:shadow-hover"
            >
              <Image
                src={card.image}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0 object-contain"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-label-lg text-text-primary">
                  {t(`${card.key}.title`)}
                </span>
                <span className="truncate type-body-sm text-text-muted">
                  {card.body}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-icon-default"
                strokeWidth={1.5}
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MentorRow({ mentor }: { mentor: PeerMentorCard }) {
  const t = useTranslations("iaStudent.home.mentors");
  const reasons = mentor.recommendationReasons.slice(0, 2);
  return (
    <li className="flex flex-wrap items-center gap-4 px-6 py-5">
      <ProfilePictureLink
        href={peerMentorHref(mentor.mentorId)}
        name={mentor.fullName}
      >
        <InitialsAvatar
          personId={mentor.mentorId}
          name={mentor.fullName}
          size="lg"
        />
      </ProfilePictureLink>
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        <h3 className="type-label-lg text-text-primary">{mentor.fullName}</h3>
        <p className="type-body-sm text-text-muted">
          {[
            mentor.department,
            mentor.classYear
              ? t("classYear", { year: mentor.classYear })
              : null,
            mentor.availableThisWeek ? t("available") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {reasons.length > 0 ? (
          <p className="flex items-start gap-1.5 type-body-sm text-text-secondary">
            <Lightbulb
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={1.5}
            />
            {t("why", { reasons: reasons.join(" · ") })}
          </p>
        ) : null}
      </div>
      <Button
        href={peerMentorHref(mentor.mentorId)}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Small}
        aria-label={t("profileOf", { name: mentor.fullName })}
      >
        {t("profile")}
      </Button>
    </li>
  );
}

function AdvisorCard({
  advisor,
  officeHours,
}: {
  advisor: NonNullable<StudentHomeModel["advisor"]>;
  /** Whether the student's semester shows Office Hours, where the advisor is asked for a meeting. */
  officeHours: boolean;
}) {
  const t = useTranslations("iaStudent.home.advisor");
  const name = [advisor.academicTitle, advisor.fullName]
    .filter(Boolean)
    .join(" ");
  return (
    <section aria-labelledby="student-advisor" className="flex flex-col gap-4">
      <SectionHeader id="student-advisor" title={t("label")} />
      <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-background-surface p-5">
        <div className="flex items-center gap-4 sm:px-5 sm:py-4">
          <InitialsAvatar personId={advisor.userId} name={advisor.fullName} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="type-label text-text-primary">{name}</p>
            <p className="type-body-sm text-text-muted">{t("source")}</p>
          </div>
        </div>
        {officeHours ? (
          <Button
            variant={ButtonVariant.Secondary}
            href={STUDENT_OFFICE_HOURS_HREF}
            fullWidth
            className="justify-start"
          >
            <CalendarPlus aria-hidden className="size-5" strokeWidth={1.5} />
            {t("request")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function PendingRequests({ home }: { home: StudentHomeModel }) {
  const t = useTranslations("iaStudent.home.requests");
  return (
    <section aria-labelledby="student-requests" className="flex flex-col gap-4">
      <SectionHeader
        id="student-requests"
        title={t("title")}
        hint={home.requestCount > 0 ? String(home.requestCount) : undefined}
        action={
          home.requestCount > 0
            ? { href: APPOINTMENTS_HREF, label: t("all") }
            : undefined
        }
      />
      {home.requestCount === 0 ? (
        <p className="rounded-2xl border border-border-default p-5 type-body-sm text-text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className={LIST}>
          {home.awaiting.map((appointment) => (
            <AwaitingAppointment
              key={appointment.id}
              appointment={appointment}
            />
          ))}
          {home.peerRequests.map((request) => (
            <AwaitingPeerRequest key={request.id} request={request} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AwaitingRow({
  picture,
  name,
  detail,
  status,
}: {
  picture: ReactNode;
  name: string;
  detail: string;
  status: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
      {picture}
      <div className="flex min-w-0 flex-1 basis-32 flex-col gap-1">
        <p className="type-label text-text-primary">{name}</p>
        <p className="type-body-sm text-text-muted">{detail}</p>
      </div>
      {status}
    </li>
  );
}

function AwaitingAppointment({ appointment }: { appointment: Appointment }) {
  const tKind = useTranslations("iaStudent.common.kind");
  const locale = useLocale();
  const { counterpart } = appointment;
  const { startsAt } = currentTime(appointment);
  return (
    <AwaitingRow
      picture={
        <ProfilePictureLink
          href={appointmentProfileHref(appointment)}
          name={counterpart.fullName}
        >
          <InitialsAvatar
            personId={counterpart.userId}
            name={counterpart.fullName}
            size="sm"
          />
        </ProfilePictureLink>
      }
      name={counterpartName(appointment)}
      detail={`${tKind(appointment.kind)} · ${formatWeekdayDayMonth(startsAt, locale)} ${formatTurkishTime(startsAt, locale)}`}
      status={<AppointmentStatusBadge status={appointment.status} />}
    />
  );
}

function AwaitingPeerRequest({ request }: { request: PeerMentoringRequest }) {
  const t = useTranslations("iaStudent.home.requests");
  const tTopic = useTranslations("peerTopics");
  return (
    <AwaitingRow
      picture={
        <ProfilePictureLink
          href={peerMentorHref(request.mentor.userId)}
          name={request.mentor.fullName}
        >
          <InitialsAvatar
            personId={request.mentor.userId}
            name={request.mentor.fullName}
            size="sm"
          />
        </ProfilePictureLink>
      }
      name={request.mentor.fullName}
      detail={t("peer", { topic: tTopic(request.category) })}
      status={
        <StatusBadge
          tone={StatusTone.Warning}
          icon={<Hourglass aria-hidden className="size-4" strokeWidth={1.5} />}
        >
          {t("waiting")}
        </StatusBadge>
      }
    />
  );
}
