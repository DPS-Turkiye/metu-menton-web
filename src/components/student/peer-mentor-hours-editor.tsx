"use client";

import { ChevronLeft, ChevronRight, Lock, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import { ISKUR_FIELD_CLASS, Segmented } from "@/components/student/iskur-ui";
import type { MentorDutyHours } from "@/hooks/use-mentor-duty-hours";
import { useReportDuration } from "@/hooks/use-report-format";
import type { WeeklyAvailabilityForm } from "@/hooks/use-weekly-availability-form";
import { Weekday } from "@/interfaces/mentor";
import { exceptionLabel } from "@/lib/mentor-availability";
import {
  chartPlace,
  chartSpan,
  dutyMinutes,
  firstOffer,
  isInsideDuty,
  offeredMinutes,
  spanLabel,
} from "@/lib/mentor-duty-hours";
import { PEER_CAPACITY_MAX, PEER_CAPACITY_MIN } from "@/lib/peer-mentoring";

const WEEKEND: readonly Weekday[] = [Weekday.Saturday, Weekday.Sunday];
const MEETING_LENGTHS = ["30", "45", "60"];

type Editor = WeeklyAvailabilityForm;

/**
 * An intern's mentoring hours inside their İŞKUR work hours (Figma 6.8): each day's work hours with the hours open for
 * mentoring on top, the week's summary, the meeting length, the mentee limit and the closed days.
 */
export function PeerMentorHoursEditor({
  editor,
  hours,
}: {
  editor: Editor;
  hours: MentorDutyHours;
}) {
  const t = useTranslations("iaIskur.hours");
  const { draft } = editor;
  if (editor.loadError) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {editor.loadError}
      </p>
    );
  }
  if (!draft) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  const span = chartSpan(hours.duty, draft.ranges);
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 type-body-sm text-text-secondary">
          <Legend className="bg-background-muted" label={t("legend.duty")} />
          <Legend
            className="border border-status-info-icon bg-status-info-bg"
            label={t("legend.open")}
          />
          <Legend
            className="border border-dashed border-status-error-icon bg-status-error-bg"
            label={t("legend.conflict")}
          />
          <span className="type-caption text-text-muted">
            {t("span", spanLabel(span))}
          </span>
        </div>
        <ul className="divide-y divide-border-default rounded-card border border-border-default bg-background-surface px-5 py-1">
          {editor.days
            // Work days can be Saturdays; an empty weekend day is left out, as drawn.
            .filter(
              ({ day, ranges }) =>
                !WEEKEND.includes(day) ||
                ranges.length > 0 ||
                dutyMinutes(hours.duty, day) > 0,
            )
            .map((row) => (
              <DayRow
                key={row.day}
                editor={editor}
                hours={hours}
                row={row}
                span={span}
              />
            ))}
        </ul>
        <p className="type-body-sm text-text-muted">{t("protected")}</p>
        <ClosedDays editor={editor} />
        {editor.error ? (
          <InlineAlert tone={StatusTone.Error} title={editor.error} />
        ) : null}
      </div>
      <Summary editor={editor} hours={hours} />
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-3.5 rounded-[3px] ${className}`} />
      {label}
    </span>
  );
}

function DayRow({
  editor,
  hours,
  row,
  span,
}: {
  editor: Editor;
  hours: MentorDutyHours;
  row: Editor["days"][number];
  span: { from: number; to: number };
}) {
  const t = useTranslations("iaIskur.hours");
  const tShort = useTranslations("iskurOnboarding.days.short");
  const duration = useReportDuration();
  const [editing, setEditing] = useState(false);
  const { day, label, ranges } = row;
  const duty = hours.duty.filter((range) => range.day === day);
  const work = dutyMinutes(hours.duty, day);
  const outside = ranges.filter((range) => !isInsideDuty(hours.duty, range));
  const open = editing && ranges.length > 0;

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="w-9 type-label text-text-primary">
          <span aria-hidden>{tShort(day)}</span>
          <span className="sr-only">{label}</span>
        </span>
        <div
          aria-hidden
          className="relative h-7 min-w-[200px] flex-[2] overflow-hidden rounded-lg bg-background-subtle"
        >
          {duty.map((range) => {
            const place = chartPlace(span, range.start, range.end);
            return (
              <span
                key={`${range.start}-${range.end}`}
                className="absolute inset-y-0 rounded-md bg-background-muted"
                style={{
                  left: `${String(place.left)}%`,
                  width: `${String(place.width)}%`,
                }}
              />
            );
          })}
          {ranges.map((range) => {
            if (!range.startTime || !range.endTime) return null;
            const place = chartPlace(span, range.startTime, range.endTime);
            const inside = isInsideDuty(hours.duty, range);
            return (
              <span
                key={range.key}
                className={`absolute inset-y-1 grid place-items-center overflow-hidden rounded-md border type-label-sm whitespace-nowrap ${
                  inside
                    ? "border-status-info-icon bg-status-info-bg text-status-info-text"
                    : "border-dashed border-status-error-icon bg-status-error-bg text-status-error-text"
                }`}
                style={{
                  left: `${String(place.left)}%`,
                  width: `${String(place.width)}%`,
                }}
              >
                {inside ? `${range.startTime}–${range.endTime}` : null}
              </span>
            );
          })}
        </div>
        <div className="min-w-[160px] flex-1 type-body-sm text-text-secondary">
          <p>
            {work === 0
              ? t("notDuty")
              : ranges.length === 0
                ? t("dutyOnly", { work: duration(work) })
                : t("dutyAndOpen", {
                    work: duration(work),
                    open: duration(offeredMinutes(ranges)),
                  })}
          </p>
          {outside.map((range) => (
            <p key={range.key} className="type-caption text-status-error-text">
              {t("outside", { start: range.startTime, end: range.endTime })}
            </p>
          ))}
        </div>
        {ranges.length > 0 ? (
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            aria-label={t("editDay", { day: label })}
            aria-expanded={open}
            onClick={() => setEditing((current) => !current)}
          >
            <Image alt="" src="/ia/icons/edit.svg" width={16} height={16} />
          </Button>
        ) : work > 0 ? (
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Small}
            className="text-text-accent!"
            aria-label={t("addDay", { day: label })}
            onClick={() => {
              editor.addRange(day, firstOffer(hours.duty, day));
              setEditing(true);
            }}
          >
            <Plus aria-hidden className="size-4" />
            {t("add")}
          </Button>
        ) : (
          <span className="grid h-9 w-10 place-items-center rounded-button-sm border border-border-default text-icon-default">
            <Lock aria-hidden className="size-4" />
          </span>
        )}
      </div>
      {open ? (
        <div className="flex flex-col gap-2 pl-[52px]">
          {ranges.map((range, index) => (
            <RangeInputs
              key={range.key}
              editor={editor}
              range={range}
              name={t("range", { day: label, number: index + 1 })}
            />
          ))}
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Small}
            className="w-fit text-text-accent!"
            onClick={() => editor.addRange(day)}
          >
            <Plus aria-hidden className="size-4" />
            {t("addRange")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function RangeInputs({
  editor,
  range,
  name,
}: {
  editor: Editor;
  range: Editor["days"][number]["ranges"][number];
  name: string;
}) {
  const t = useTranslations("iaIskur.hours");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="time"
        aria-label={t("rangeStart", { range: name })}
        value={range.startTime}
        onChange={(event) =>
          editor.updateRange(range.key, "startTime", event.target.value)
        }
        className={`${ISKUR_FIELD_CLASS} w-32!`}
      />
      <span aria-hidden>–</span>
      <input
        type="time"
        aria-label={t("rangeEnd", { range: name })}
        value={range.endTime}
        onChange={(event) =>
          editor.updateRange(range.key, "endTime", event.target.value)
        }
        className={`${ISKUR_FIELD_CLASS} w-32!`}
      />
      <Button
        variant={ButtonVariant.Ghost}
        size={ButtonSize.Small}
        aria-label={t("removeRange", { range: name })}
        onClick={() => editor.removeRange(range.key)}
      >
        <X aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

function ClosedDays({ editor }: { editor: Editor }) {
  const t = useTranslations("iaIskur.hours.closed");
  const tEditor = useTranslations("availabilityEditor");
  const locale = useLocale();
  const { draft } = editor;
  if (!draft) return null;
  return (
    <section
      aria-labelledby="peer-closed-days"
      className="flex flex-col items-start gap-3"
    >
      <h3 id="peer-closed-days" className="type-h4 text-text-primary">
        {t("title")}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {draft.exceptions.map((item, index) => {
          const label = exceptionLabel(item, locale);
          return (
            <span
              key={`${item.startsOn}-${item.endsOn}`}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border-selected bg-background-selected pr-2 pl-3 type-label text-text-accent"
            >
              {label}
              <button
                type="button"
                aria-label={tEditor("removeDate", { date: label })}
                onClick={() => editor.removeException(index)}
                className="grid size-6 place-items-center rounded-full hover:bg-background-surface focus-visible:outline-2 focus-visible:outline-border-selected"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </span>
          );
        })}
        {editor.isAddingException ? null : (
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Small}
            className="text-text-accent!"
            onClick={editor.openExceptionForm}
          >
            <Plus aria-hidden className="size-4" />
            {t("add")}
          </Button>
        )}
      </div>
      {editor.isAddingException ? (
        <div className="grid w-full gap-2 sm:grid-cols-3">
          <input
            type="date"
            aria-label={tEditor("startDate")}
            value={editor.exception.startsOn}
            onChange={(event) =>
              editor.setExceptionField("startsOn", event.target.value)
            }
            className={ISKUR_FIELD_CLASS}
          />
          <input
            type="date"
            aria-label={tEditor("endDate")}
            value={editor.exception.endsOn}
            onChange={(event) =>
              editor.setExceptionField("endsOn", event.target.value)
            }
            className={ISKUR_FIELD_CLASS}
          />
          <input
            aria-label={tEditor("reason")}
            placeholder={tEditor("reasonPlaceholder")}
            value={editor.exception.reason}
            onChange={(event) =>
              editor.setExceptionField("reason", event.target.value)
            }
            className={ISKUR_FIELD_CLASS}
          />
          <div className="flex gap-2 sm:col-span-3">
            <Button
              variant={ButtonVariant.Ghost}
              size={ButtonSize.Small}
              onClick={editor.closeExceptionForm}
            >
              {tEditor("cancelDate")}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Small}
              onClick={editor.addException}
            >
              {tEditor("confirmDate")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const STEP_BUTTON =
  "grid h-9 w-10 place-items-center rounded-button-sm bg-action-secondary-bg text-action-secondary-fg hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected disabled:bg-background-disabled disabled:text-text-disabled";

function Summary({
  editor,
  hours,
}: {
  editor: Editor;
  hours: MentorDutyHours;
}) {
  const t = useTranslations("iaIskur.hours.summary");
  const duration = useReportDuration();
  const { draft } = editor;
  if (!draft) return null;
  const length = draft.defaultMeetingDurationMinutes;
  const lengths = MEETING_LENGTHS.includes(length)
    ? MEETING_LENGTHS
    : [...MEETING_LENGTHS, length];
  const limit = Number(draft.menteeCapacity);
  return (
    <section
      aria-labelledby="peer-hours-summary"
      className="flex w-full flex-col gap-4 rounded-card border border-border-control bg-background-surface p-6 lg:w-[360px] lg:shrink-0"
    >
      <h3
        id="peer-hours-summary"
        className="type-overline text-text-secondary uppercase"
      >
        {t("title")}
      </h3>
      <p className="flex items-end gap-2">
        <span className="type-metric text-text-primary">
          {duration(
            offeredMinutes(
              draft.ranges.filter((range) => isInsideDuty(hours.duty, range)),
            ),
          )}
        </span>
        <span className="type-body text-text-secondary">{t("open")}</span>
      </p>
      {hours.mentoringMinutes === null ? null : (
        <p className="type-body-sm text-text-muted">
          {t("target", { target: duration(hours.mentoringMinutes) })}
        </p>
      )}
      <hr className="border-border-default" />
      <p className="type-label text-text-primary">{t("length")}</p>
      <Segmented
        label={t("length")}
        selected={length}
        onSelect={(value) =>
          editor.setNumber("defaultMeetingDurationMinutes", value)
        }
        options={lengths.map((minutes) => ({
          id: minutes,
          label: t("minutes", { minutes }),
        }))}
      />
      <p className="type-label text-text-primary">{t("limit")}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("decrease")}
          disabled={limit <= PEER_CAPACITY_MIN}
          onClick={() => editor.stepNumber("menteeCapacity", -1)}
          className={STEP_BUTTON}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <span aria-live="polite" className="type-metric-sm text-text-primary">
          {draft.menteeCapacity || t("noLimit")}
        </span>
        <button
          type="button"
          aria-label={t("increase")}
          disabled={limit >= PEER_CAPACITY_MAX}
          onClick={() => editor.stepNumber("menteeCapacity", 1)}
          className={STEP_BUTTON}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
        <span className="type-body-sm text-text-muted">{t("suggested")}</span>
      </div>
      <p className="type-caption text-text-muted">{t("limitHint")}</p>
    </section>
  );
}
