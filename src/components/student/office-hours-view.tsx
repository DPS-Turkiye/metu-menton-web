"use client";

import { AlarmClock, Check, ChevronDown, Info, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { PageHeader } from "@/components/ia/page-header";
import { Chip, InitialsAvatar } from "@/components/student/ia/ui";
import {
  officeHoursBookingHref,
  officeHoursProfileHref,
  useStudentOfficeHours,
} from "@/hooks/use-student-office-hours";
import type {
  OfficeHoursAcademician,
  StudentOfficeHoursSlot,
} from "@/interfaces/student-office-hours";
import { shortWeekday, timeLabel } from "@/lib/calendar";
import { academicianName } from "@/lib/student-office-hours";
import { formatWeekdayDayMonth } from "@/lib/utils";

/** Office Hours (Figma 3.2): the advisor first, then every ODTÜ academician with their nearest free time. */
export function StudentOfficeHoursView() {
  const t = useTranslations("iaStudent.officeHours.list");
  const office = useStudentOfficeHours();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")}>
        <p className="type-body-lg text-text-secondary">{t("intro")}</p>
      </PageHeader>
      {office.advisor ? (
        <AdvisorStrip
          academician={office.advisor.academician}
          slots={office.advisor.slots}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-64 flex-1 sm:max-w-[420px]">
          <span className="sr-only">{t("search")}</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-icon-muted"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={office.filter.query}
            onChange={(event) => office.setQuery(event.target.value)}
            placeholder={t("search")}
            className="h-12 w-full rounded-input border border-border-control bg-background-surface pr-4 pl-11 type-body text-text-primary placeholder:text-text-placeholder"
          />
        </label>
        <FilterSelect
          label={t("faculty")}
          value={office.filter.faculty}
          options={office.faculties}
          onChange={office.setFaculty}
        />
        <FilterSelect
          label={t("department")}
          value={office.filter.department}
          options={office.departments}
          onChange={office.setDepartment}
        />
        <button
          type="button"
          aria-pressed={office.filter.availableOnly}
          onClick={office.toggleAvailableOnly}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 type-label ${
            office.filter.availableOnly
              ? "border-action-accent bg-background-selected text-text-accent"
              : "border-border-default text-text-primary"
          }`}
        >
          {office.filter.availableOnly ? (
            <Check aria-hidden className="size-4" strokeWidth={1.5} />
          ) : null}
          {t("availableOnly")}
        </button>
        <p className="ml-auto type-body-sm text-text-muted">
          {t("count", { count: office.total })}
        </p>
      </div>
      <QueryNotice
        isLoading={office.isLoading || office.isLoadingSlots}
        error={office.error}
      />
      {office.isLoading || office.isLoadingSlots || office.error ? null : office
          .cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-default p-6 type-body-sm text-text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-background-surface">
          {office.cards.map(({ academician, nearest }, index) => (
            <AcademicianRow
              key={academician.id}
              academician={academician}
              nearest={nearest}
              tourAnchor={
                !office.advisor && index === 0
                  ? "office-hours-academician"
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 type-body-sm text-text-muted">
        <Info aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        {t("footnote")}
      </p>
    </div>
  );
}

function AdvisorStrip({
  academician,
  slots,
}: {
  academician: OfficeHoursAcademician;
  slots: StudentOfficeHoursSlot[];
}) {
  const t = useTranslations("iaStudent.officeHours.advisor");
  const locale = useLocale();
  const name = academicianName(academician);
  return (
    <section
      aria-labelledby="office-hours-advisor"
      data-tour="office-hours-academician"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-background-subtle px-5 py-4"
    >
      <div className="flex min-w-0 items-center gap-4">
        <InitialsAvatar name={academician.fullName} />
        <div className="min-w-0">
          <p className="type-overline text-text-accent">{t("label")}</p>
          <p className="type-label text-text-primary">
            <Link
              id="office-hours-advisor"
              href={officeHoursProfileHref(academician.id)}
              className="hover:underline"
            >
              {name}
            </Link>
            {academician.department ? ` · ${academician.department}` : null}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {slots.length === 0 ? (
          <p className="type-body-sm text-text-muted">{t("noSlots")}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-body-sm text-text-muted">{t("nearest")}</p>
            <ul className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <li key={slot.startsAt}>
                  <Chip>
                    {`${shortWeekday(new Date(slot.startsAt), locale)} ${timeLabel(slot.startsAt, locale)}`}
                  </Chip>
                </li>
              ))}
            </ul>
          </div>
        )}
        <TimesButton academician={academician} free={slots.length > 0} />
      </div>
    </section>
  );
}

function AcademicianRow({
  academician,
  nearest,
  tourAnchor,
}: {
  academician: OfficeHoursAcademician;
  nearest: StudentOfficeHoursSlot | null;
  tourAnchor: string | undefined;
}) {
  const t = useTranslations("iaStudent.officeHours.list");
  const locale = useLocale();
  return (
    <li
      data-tour={tourAnchor}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6"
    >
      <InitialsAvatar name={academician.fullName} />
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="type-label-lg text-text-primary">
          <Link
            href={officeHoursProfileHref(academician.id)}
            className="hover:underline"
          >
            {academicianName(academician)}
          </Link>
        </h2>
        <p className="type-body-sm text-text-muted">{academician.department}</p>
      </div>
      {academician.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {academician.tags.map((tag) => (
            <li key={tag}>
              <Chip>{tag}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
      <p
        className={`flex items-center gap-1.5 type-body-sm lg:w-52 ${nearest ? "text-status-success-text" : "text-text-muted"}`}
      >
        {nearest ? (
          <AlarmClock
            aria-hidden
            className="size-4 shrink-0"
            strokeWidth={1.5}
          />
        ) : (
          <X aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        )}
        {nearest
          ? t("nearest", {
              day: formatWeekdayDayMonth(new Date(nearest.startsAt), locale),
              time: timeLabel(nearest.startsAt, locale),
            })
          : t("noSlots")}
      </p>
      <div className="flex justify-end lg:w-24">
        <TimesButton academician={academician} free={nearest !== null} />
      </div>
    </li>
  );
}

/** "Saat seç", or the profile while there is nothing to pick. */
function TimesButton({
  academician,
  free,
}: {
  academician: OfficeHoursAcademician;
  free: boolean;
}) {
  const t = useTranslations("iaStudent.officeHours.list");
  const name = academicianName(academician);
  return free ? (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Small}
      href={officeHoursBookingHref(academician.id)}
      aria-label={t("pickTimeOf", { name })}
    >
      {t("pickTime")}
    </Button>
  ) : (
    <Button
      variant={ButtonVariant.Ghost}
      size={ButtonSize.Small}
      href={officeHoursProfileHref(academician.id)}
      aria-label={t("profileOf", { name })}
    >
      {t("profile")}
    </Button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="relative inline-flex max-w-60">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="field-sizing-content h-9 max-w-full appearance-none truncate rounded-full border border-border-default bg-background-surface pr-8 pl-3 type-label text-text-primary"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-icon-muted"
        strokeWidth={1.5}
      />
    </label>
  );
}
