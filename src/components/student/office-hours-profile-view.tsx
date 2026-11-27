"use client";

import {
  AlarmClock,
  BookOpen,
  ChevronDown,
  CircleCheck,
  Clock,
  GraduationCap,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { PhotoAvatar } from "@/components/common/avatar";
import { Button, ButtonSize } from "@/components/ia/button";
import { BackButton } from "@/components/student/ia/back-button";
import { Chip } from "@/components/student/ia/ui";
import {
  officeHoursBookingHref,
  STUDENT_OFFICE_HOURS_HREF,
  useOfficeHoursProfile,
} from "@/hooks/use-student-office-hours";
import type { OfficeHoursCourse } from "@/interfaces/student-office-hours";
import { wasHeld } from "@/lib/student-appointments";
import { academicianName, slotsByDay } from "@/lib/student-office-hours";
import { formatTurkishTime } from "@/lib/turkey-time";
import { formatDayMonth, formatWeekdayDayMonth, initials } from "@/lib/utils";

/** Akademisyen Profili, tam sayfa (Figma 3.3). */
export function OfficeHoursProfileView({
  academicianId,
}: {
  academicianId: string;
}) {
  const t = useTranslations("iaStudent.officeHours.profile");
  const tStatus = useTranslations("appointments.status");
  const tHeld = useTranslations("iaStudent.appointments.requests");
  const locale = useLocale();
  const profile = useOfficeHoursProfile(academicianId);
  const { academician } = profile;

  if (!academician) {
    return (
      <div className="flex flex-col gap-8">
        <BackButton href={STUDENT_OFFICE_HOURS_HREF}>{t("back")}</BackButton>
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <QueryNotice isLoading={profile.isLoading} error={profile.error} />
        {profile.notFound ? (
          <p className="type-body-sm text-text-muted">{t("notFound")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <BackButton href={STUDENT_OFFICE_HOURS_HREF}>{t("back")}</BackButton>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex items-center gap-5">
            <PhotoAvatar
              initials={initials(academician.fullName)}
              personId={academician.accountId}
              decorative
              colors="bg-background-selected text-text-accent"
              className="size-[72px] type-h3"
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="type-h2 text-text-primary">
                {academicianName(academician)}
              </h1>
              <p className="type-body text-text-muted">
                {[academician.department, academician.faculty]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {academician.tags.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {academician.tags.map((tag) => (
                    <li key={tag}>
                      <Chip>{tag}</Chip>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </header>
          {academician.about ? (
            <section
              aria-labelledby="office-hours-about"
              className="flex flex-col gap-2"
            >
              <h2 id="office-hours-about" className="type-h4 text-text-primary">
                {t("about")}
              </h2>
              <p className="type-body text-text-secondary">
                {academician.about}
              </p>
            </section>
          ) : null}
          {academician.topics.length > 0 ? (
            <section
              aria-labelledby="office-hours-topics"
              className="flex flex-col gap-4"
            >
              <h2
                id="office-hours-topics"
                className="type-h4 text-text-primary"
              >
                {t("topics")}
              </h2>
              <ul className="flex flex-col gap-5">
                {academician.topics.map((topic) => (
                  <li key={topic.title} className="flex items-center gap-4">
                    <CircleCheck
                      aria-hidden
                      className="size-4 shrink-0 text-icon-default"
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0">
                      <p className="type-label text-text-primary">
                        {topic.title}
                      </p>
                      {topic.body ? (
                        <p className="type-body-sm text-text-muted">
                          {topic.body}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {academician.courses.length > 0 ? (
            <Courses courses={academician.courses} />
          ) : null}
          {profile.past.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {profile.past.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 type-body-sm text-text-muted"
                >
                  <Clock
                    aria-hidden
                    className="size-4 shrink-0"
                    strokeWidth={1.5}
                  />
                  {t("past", {
                    topic: item.topic,
                    day: formatDayMonth(item.startsAt, locale),
                    status: wasHeld(item)
                      ? tHeld("held")
                      : tStatus(item.status),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <section
          aria-labelledby="office-hours-info"
          className="flex flex-col gap-5 rounded-2xl border border-border-strong bg-background-surface p-6"
        >
          <h2 id="office-hours-info" className="type-h4 text-text-primary">
            {t("info.title")}
          </h2>
          <ul className="flex flex-col gap-3">
            {academician.place ? (
              <InfoRow icon={GraduationCap}>{academician.place}</InfoRow>
            ) : null}
            <InfoRow icon={AlarmClock}>
              {t("info.minutes", { count: academician.durationMinutes })}
            </InfoRow>
            {academician.responseDays ? (
              <InfoRow icon={Mail}>
                {t("info.responseDays", { count: academician.responseDays })}
              </InfoRow>
            ) : null}
          </ul>
          <section
            aria-labelledby="office-hours-week"
            className="flex flex-col gap-4 border-t border-border-default pt-5"
          >
            <h3 id="office-hours-week" className="type-label text-text-primary">
              {t("thisWeek")}
            </h3>
            {profile.thisWeek.length === 0 ? (
              <p className="type-body-sm text-text-muted">
                {profile.nearest
                  ? t("nearest", {
                      day: formatWeekdayDayMonth(
                        profile.nearest.startsAt,
                        locale,
                      ),
                      time: formatTurkishTime(profile.nearest.startsAt, locale),
                    })
                  : t("noSlotsThisWeek")}
              </p>
            ) : (
              slotsByDay(profile.thisWeek).map(({ day, slots }) => (
                <div key={day.toISOString()} className="flex flex-col gap-2">
                  <p className="type-body-sm text-text-muted">
                    {formatWeekdayDayMonth(day, locale)}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <li key={slot.startsAt}>
                        <Link
                          href={officeHoursBookingHref(
                            academician.id,
                            slot.startsAt,
                          )}
                          className="grid h-11 w-24 place-items-center rounded-full border border-border-default type-label text-text-primary hover:bg-background-subtle"
                        >
                          {formatTurkishTime(slot.startsAt, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
          <Button
            href={officeHoursBookingHref(academician.id)}
            size={ButtonSize.Large}
            fullWidth
          >
            {t("request")}
          </Button>
          <p className="type-caption text-text-muted">{t("footnote")}</p>
        </section>
      </div>
    </div>
  );
}

function Courses({ courses }: { courses: OfficeHoursCourse[] }) {
  const t = useTranslations("iaStudent.officeHours.profile");
  return (
    <details className="group rounded-2xl border border-border-default bg-background-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 type-label text-text-primary [&::-webkit-details-marker]:hidden">
        <BookOpen
          aria-hidden
          className="size-4 shrink-0 text-icon-default"
          strokeWidth={1.5}
        />
        <span className="min-w-0 flex-1">
          {t("courses", {
            codes: courses.map((course) => course.code).join(", "),
          })}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-icon-default transition group-open:rotate-180"
          strokeWidth={1.5}
        />
      </summary>
      <ul className="divide-y divide-border-subtle border-t border-border-subtle px-5">
        {courses.map((course) => (
          <li key={course.code} className="flex gap-9 py-3">
            <span className="w-20 shrink-0 type-label text-text-primary">
              {course.code}
            </span>
            <span className="type-body-sm text-text-secondary">
              {course.name}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 type-body text-text-secondary">
      <Icon
        aria-hidden
        className="size-4 shrink-0 text-icon-default"
        strokeWidth={1.5}
      />
      {children}
    </li>
  );
}
