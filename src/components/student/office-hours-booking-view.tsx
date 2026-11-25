"use client";

import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { QueryNotice } from "@/components/admin/admin-ui";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { BackButton } from "@/components/student/ia/back-button";
import { InitialsAvatar } from "@/components/student/ia/ui";
import {
  officeHoursProfileHref,
  STUDENT_OFFICE_HOURS_HREF,
  useOfficeHoursBooking,
} from "@/hooks/use-student-office-hours";
import type {
  OfficeHoursAcademician,
  StudentOfficeHoursSlot,
} from "@/interfaces/student-office-hours";
import {
  isSameDay,
  shortWeekday,
  timeLabel,
  weekdayName,
  weekRangeLabel,
} from "@/lib/calendar";
import { academicianName } from "@/lib/student-office-hours";
import { formatDayMonthLong, formatWeekdayDayMonth } from "@/lib/utils";

type Booking = ReturnType<typeof useOfficeHoursBooking>;

/** Gün ve saat seç (Figma 3.4), then Randevu talebi (3.5) once a time is picked. `slot` arrives picked. */
export function OfficeHoursBookingView({
  academicianId,
  slot = null,
}: {
  academicianId: string;
  slot?: string | null;
}) {
  const t = useTranslations("iaStudent.officeHours.booking");
  const booking = useOfficeHoursBooking(academicianId, slot);
  const { academician, selected } = booking;

  if (!academician) {
    return (
      <div className="flex flex-col gap-8">
        <BackButton href={STUDENT_OFFICE_HOURS_HREF}>{t("back")}</BackButton>
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <QueryNotice isLoading={booking.isLoading} error={booking.error} />
        {booking.notFound ? (
          <p className="type-body-sm text-text-muted">{t("notFound")}</p>
        ) : null}
      </div>
    );
  }

  return booking.formOpen && selected ? (
    <RequestForm
      booking={booking}
      academician={academician}
      selected={selected}
    />
  ) : (
    <SlotStep booking={booking} academician={academician} />
  );
}

/** "Per 12 Kas · 14:00 – 14:30" */
function whenLine(slot: StudentOfficeHoursSlot, locale: string) {
  return `${formatWeekdayDayMonth(new Date(slot.startsAt), locale)} · ${timeLabel(slot.startsAt, locale)} – ${timeLabel(slot.endsAt, locale)}`;
}

function SlotStep({
  booking,
  academician,
}: {
  booking: Booking;
  academician: OfficeHoursAcademician;
}) {
  const t = useTranslations("iaStudent.officeHours.booking");
  const locale = useLocale();
  const name = academicianName(academician);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-3">
        <BackButton href={officeHoursProfileHref(academician.id)}>
          {t("back")}
        </BackButton>
        <InitialsAvatar name={academician.fullName} size="sm" />
        <div className="min-w-0">
          <p className="type-label-lg text-text-primary">{name}</p>
          <p className="type-body-sm text-text-muted">
            {[
              t("program"),
              t("minutes", { count: academician.durationMinutes }),
              academician.place,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SlotPicker booking={booking} academician={academician} />
        <section
          aria-labelledby="booking-selected"
          className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-background-surface p-6"
        >
          <h2
            id="booking-selected"
            className="type-overline text-text-secondary"
          >
            {t("selected")}
          </h2>
          <p className="type-h3 text-text-primary" aria-live="polite">
            {booking.selected
              ? whenLine(booking.selected, locale)
              : t("nothingSelected")}
          </p>
          <p className="border-b border-border-default pb-4 type-body text-text-secondary">
            {`${name} · ${t("program")}`}
          </p>
          <p className="type-body-sm text-text-muted">{t("nextStep")}</p>
          <span data-tour="office-hours-continue">
            <Button
              size={ButtonSize.Large}
              fullWidth
              disabled={!booking.selected}
              onClick={booking.openForm}
            >
              {t("continue")}
            </Button>
          </span>
        </section>
      </div>
    </div>
  );
}

function SlotPicker({
  booking,
  academician,
}: {
  booking: Booking;
  academician: OfficeHoursAcademician;
}) {
  const t = useTranslations("iaStudent.officeHours.booking");
  const locale = useLocale();
  const range = `${weekRangeLabel(booking.weekStart, booking.weekEnd, locale)} ${booking.weekEnd.getFullYear()}`;
  return (
    <section
      aria-labelledby="booking-slots"
      className="flex min-w-0 flex-col gap-6"
    >
      <h1 id="booking-slots" className="type-h2 text-text-primary">
        {t("title")}
      </h1>
      <div className="flex items-center gap-2">
        <WeekButton
          label={t("previousWeek")}
          disabled={!booking.canGoBack}
          onClick={booking.previousWeek}
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
        </WeekButton>
        <p className="type-label-lg text-text-primary">{range}</p>
        <WeekButton label={t("nextWeek")} onClick={booking.nextWeek}>
          <ChevronRight aria-hidden className="size-4" strokeWidth={1.5} />
        </WeekButton>
      </div>
      <div
        role="group"
        aria-label={t("days")}
        className="grid grid-cols-3 gap-3 sm:grid-cols-5"
      >
        {booking.week.map((column) => (
          <DayButton
            key={column.day.toISOString()}
            day={column.day}
            freeCount={column.freeCount}
            active={
              booking.day !== null &&
              isSameDay(column.day.toISOString(), booking.day.day)
            }
            onPick={booking.pickDay}
          />
        ))}
      </div>
      {booking.day ? (
        <>
          <p className="type-label text-text-primary">
            {t("daySlots", {
              weekday: weekdayName(booking.day.day, locale),
              day: formatDayMonthLong(booking.day.day, locale),
              count: academician.durationMinutes,
            })}
          </p>
          <div
            role="group"
            aria-label={t("times")}
            className="flex flex-wrap gap-3"
          >
            {booking.day.slots.map((slot) => {
              const active = booking.selected?.startsAt === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  aria-pressed={active}
                  disabled={!slot.available}
                  onClick={() => booking.select(slot)}
                  className={`h-11 w-24 rounded-full border type-label ${
                    active
                      ? "border-action-primary-bg bg-action-primary-bg text-action-primary-fg"
                      : slot.available
                        ? "border-border-default bg-background-surface text-text-primary hover:bg-background-subtle"
                        : "border-transparent bg-background-muted text-text-disabled"
                  }`}
                >
                  {timeLabel(slot.startsAt, locale)}
                </button>
              );
            })}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 type-body-sm text-text-secondary">
            <LegendItem className="border-border-strong bg-background-surface">
              {t("legend.free")}
            </LegendItem>
            <LegendItem className="border-action-accent bg-background-selected">
              {t("legend.picked")}
            </LegendItem>
            <LegendItem className="border-border-strong bg-background-muted">
              {t("legend.taken")}
            </LegendItem>
          </ul>
        </>
      ) : booking.isLoadingSlots ? null : (
        <p className="type-body-sm text-text-muted">{t("noneThisWeek")}</p>
      )}
    </section>
  );
}

function WeekButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={ButtonVariant.Ghost}
      size={ButtonSize.Small}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-[46px]"
    >
      {children}
    </Button>
  );
}

function DayButton({
  day,
  freeCount,
  active,
  onPick,
}: {
  day: Date;
  freeCount: number;
  active: boolean;
  onPick: (day: Date) => void;
}) {
  const t = useTranslations("iaStudent.officeHours.booking");
  const locale = useLocale();
  const empty = freeCount === 0;
  const look = active
    ? "border-2 border-action-accent bg-background-selected text-text-primary"
    : empty
      ? "border border-border-default bg-background-subtle text-text-muted"
      : "border border-border-default bg-background-surface text-text-primary hover:bg-background-subtle";
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={empty}
      onClick={() => onPick(day)}
      className={`flex h-[98px] flex-col items-center justify-center gap-0.5 rounded-xl ${look}`}
    >
      <span className="type-body-sm text-text-muted">
        {shortWeekday(day, locale)}
      </span>
      <span className="type-h3">{day.getDate()}</span>
      <span
        className={`type-caption ${
          active
            ? "text-text-accent"
            : empty
              ? "text-text-muted"
              : "text-status-success-text"
        }`}
      >
        {empty ? t("noneThatDay") : t("slotCount", { count: freeCount })}
      </span>
    </button>
  );
}

function LegendItem({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={`size-3 rounded-[3px] border ${className}`}
      />
      {children}
    </li>
  );
}

/** The step replaces the page, so the title takes focus as a page change would. */
function focusTitle(title: HTMLHeadingElement | null) {
  title?.focus();
}

function RequestForm({
  booking,
  academician,
  selected,
}: {
  booking: Booking;
  academician: OfficeHoursAcademician;
  selected: StudentOfficeHoursSlot;
}) {
  const t = useTranslations("iaStudent.officeHours.request");
  const locale = useLocale();
  return (
    <form
      noValidate
      aria-labelledby="office-hours-request-title"
      className="mx-auto flex w-full max-w-[640px] flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void booking.submit();
      }}
    >
      <BackButton onClick={booking.changeTime}>{t("back")}</BackButton>
      <header className="flex flex-col gap-1">
        <h1
          id="office-hours-request-title"
          ref={focusTitle}
          tabIndex={-1}
          className="type-h1 text-text-primary outline-none"
        >
          {t("title")}
        </h1>
        <p className="type-body-lg text-text-secondary">{t("intro")}</p>
      </header>
      <div className="flex items-center gap-4 rounded-xl bg-background-subtle px-5 py-4">
        <InitialsAvatar name={academician.fullName} />
        <div className="min-w-0 flex-1">
          <p className="type-label-lg text-text-primary">
            {academicianName(academician)}
          </p>
          <p className="type-body-sm text-text-muted">
            {`${whenLine(selected, locale)} · ${t("program", { count: academician.durationMinutes })}`}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("changeTime")}
          onClick={booking.changeTime}
          className="h-9 px-1 type-button-sm text-text-link hover:underline"
        >
          {t("change")}
        </button>
      </div>
      <Field
        id="office-hours-request-subject"
        label={t("subject")}
        hint={t("subjectHint", {
          count: booking.title.length,
          max: booking.titleMax,
        })}
        required
        error={booking.errors?.title ? t("subjectRequired") : null}
      >
        <input
          id="office-hours-request-subject"
          value={booking.title}
          maxLength={booking.titleMax}
          aria-required="true"
          aria-invalid={booking.errors?.title === true}
          aria-describedby="office-hours-request-subject-note"
          onChange={(event) => booking.setTitle(event.target.value)}
          placeholder={t("subjectPlaceholder")}
          className={`h-12 w-full rounded-input border px-4 type-body text-text-primary ${
            booking.errors?.title
              ? "border-status-error-icon"
              : "border-border-control"
          }`}
        />
      </Field>
      <Field
        id="office-hours-request-description"
        label={t("description")}
        hint={t("descriptionHint", {
          count: booking.description.length,
          max: booking.descriptionMax,
        })}
      >
        <textarea
          id="office-hours-request-description"
          value={booking.description}
          maxLength={booking.descriptionMax}
          rows={5}
          aria-describedby="office-hours-request-description-note"
          onChange={(event) => booking.setDescription(event.target.value)}
          className="w-full rounded-input border border-border-control px-4 py-3 type-body text-text-primary"
        />
      </Field>
      {booking.failure ? (
        <InlineAlert tone={StatusTone.Error}>{booking.failure}</InlineAlert>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant={ButtonVariant.Ghost} onClick={booking.closeForm}>
          {t("cancel")}
        </Button>
        <span data-tour="appointment-request-submit">
          <Button
            type="submit"
            size={ButtonSize.Large}
            disabled={booking.isSending}
          >
            {t("submit")}
          </Button>
        </span>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  required = false,
  error = null,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  const t = useTranslations("iaStudent.officeHours.request");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="type-label text-text-primary">
        {label}
        {required ? (
          <>
            {" "}
            <span className="text-text-accent">*</span>
            <span className="sr-only">{t("required")}</span>
          </>
        ) : null}
      </label>
      {children}
      <p
        id={`${id}-note`}
        className={`flex items-center gap-1.5 type-caption ${error ? "text-status-error-text" : "text-text-muted"}`}
      >
        <Info aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
        {/* Only the error is announced; a live count would read out on every key. */}
        <span role={error ? "alert" : undefined}>{error ?? hint}</span>
      </p>
    </div>
  );
}
