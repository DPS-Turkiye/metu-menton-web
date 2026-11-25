"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type CSSProperties } from "react";

import { ViewSwitch } from "@/components/academician/view-switch";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import type {
  AcademicianAppointmentsCalendar,
  CalendarBlock,
  PlacedBlock,
} from "@/hooks/use-academician-appointments-calendar";
import {
  AppointmentsCalendarView,
  CalendarEntryKind,
} from "@/types/academician-calendar";

/** One grid hour; tall enough that the shortest block (30 min) still shows a time and a name. */
const HOUR_PX = 52;
/** From here on a block has room for its status too. */
const TWO_LINE_HOURS = 0.75;

const CONFIRMED_STYLE =
  "border-l-[3px] border-action-accent bg-background-selected text-text-primary";
const PENDING_STYLE =
  "border-2 border-dashed border-status-warning-icon bg-background-surface text-status-warning-text";
const AWAITING_STYLE =
  "border-2 border-dashed border-status-info-icon bg-background-surface text-status-info-text";
const RECURRING_STYLE = "bg-status-success-bg text-status-success-text";
const ONE_OFF_STYLE =
  "border border-dashed border-status-success-icon bg-status-success-bg text-status-success-text";
const UNAVAILABLE_STYLE = "bg-background-muted text-text-muted";

const ENTRY_STYLE: Record<CalendarEntryKind, string> = {
  [CalendarEntryKind.Confirmed]: CONFIRMED_STYLE,
  [CalendarEntryKind.PendingRequest]: PENDING_STYLE,
  [CalendarEntryKind.AwaitingStudent]: AWAITING_STYLE,
  [CalendarEntryKind.Recurring]: RECURRING_STYLE,
  [CalendarEntryKind.OneOff]: ONE_OFF_STYLE,
  [CalendarEntryKind.Unavailable]: UNAVAILABLE_STYLE,
};

const LEGEND: { kind: CalendarEntryKind; swatch: string }[] = [
  { kind: CalendarEntryKind.Recurring, swatch: "bg-status-success-bg" },
  {
    kind: CalendarEntryKind.OneOff,
    swatch:
      "border border-dashed border-status-success-icon bg-status-success-bg",
  },
  {
    kind: CalendarEntryKind.Confirmed,
    swatch: "border border-action-accent bg-background-selected",
  },
  {
    kind: CalendarEntryKind.PendingRequest,
    swatch: "border border-dashed border-status-warning-icon",
  },
  {
    kind: CalendarEntryKind.AwaitingStudent,
    swatch: "border border-dashed border-status-info-icon",
  },
  { kind: CalendarEntryKind.Unavailable, swatch: "bg-background-muted" },
];

export function AppointmentsCalendarCard({
  calendar,
  withViews = true,
}: {
  calendar: AcademicianAppointmentsCalendar;
  /** Off where the page puts "Gün | Hafta | Ay" beside its title. */
  withViews?: boolean;
}) {
  const t = useTranslations("iaAcademician.appointments");
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            aria-label={t("previous")}
            onClick={calendar.previous}
            className="w-11"
          >
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Small}
            aria-label={t("next")}
            onClick={calendar.next}
            className="w-11"
          >
            <ChevronRight aria-hidden className="size-4" strokeWidth={1.5} />
          </Button>
          <h2
            id={titleId}
            aria-live="polite"
            className="type-h4 text-text-primary"
          >
            {calendar.title}
          </h2>
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            onClick={calendar.goToToday}
          >
            {t("today")}
          </Button>
        </div>
        {withViews ? (
          <ViewSwitch value={calendar.view} onChange={calendar.setView} />
        ) : null}
      </div>
      <CalendarBody calendar={calendar} />
      <ul
        aria-label={t("legendLabel")}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {LEGEND.map(({ kind, swatch }) => (
          <li
            key={kind}
            className="flex items-center gap-1.5 type-caption text-text-secondary"
          >
            <span aria-hidden className={`size-3.5 rounded-[3px] ${swatch}`} />
            {t(`legend.${kind}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CalendarBody({
  calendar,
}: {
  calendar: AcademicianAppointmentsCalendar;
}) {
  switch (calendar.view) {
    case AppointmentsCalendarView.Day:
      return <TimeGrid calendar={calendar} inline />;
    case AppointmentsCalendarView.Week:
      return <TimeGrid calendar={calendar} inline={false} />;
    case AppointmentsCalendarView.Month:
      return <MonthGrid calendar={calendar} />;
  }
}

/**
 * The hourly grid of the day and week views. The week shows a header per day and stacks a block's name over its
 * status; the day view has one wide column and writes a block on one line, as the frames do.
 */
function TimeGrid({
  calendar,
  inline,
}: {
  calendar: AcademicianAppointmentsCalendar;
  inline: boolean;
}) {
  const t = useTranslations("iaAcademician.appointments");
  const height = calendar.gridHours * HOUR_PX;
  const gridTemplateColumns = `56px repeat(${String(calendar.columns.length)}, minmax(0, 1fr))`;
  return (
    <div className="overflow-x-auto">
      {inline ? null : (
        <div
          className="mb-5 grid min-w-[640px]"
          style={{ gridTemplateColumns }}
        >
          <span />
          {calendar.columns.map((column) => (
            <span
              key={column.key}
              className={`grid h-9 place-items-center rounded-lg type-body-sm ${
                column.isToday
                  ? "bg-background-selected text-text-accent"
                  : "text-text-secondary"
              }`}
            >
              {column.isToday
                ? t("todayColumn", { day: column.label })
                : column.label}
            </span>
          ))}
        </div>
      )}
      <div
        className="grid min-w-[640px] overflow-hidden rounded-2xl border border-border-default bg-background-surface"
        style={{ gridTemplateColumns }}
      >
        <ol aria-hidden className="relative" style={{ height }}>
          {calendar.hourLabels.map((label, index) => (
            <li
              key={label}
              className="absolute left-2 pt-1 type-caption text-text-muted"
              style={{ top: index * HOUR_PX }}
            >
              {label}
            </li>
          ))}
        </ol>
        {calendar.columns.map((column) => (
          <section
            key={column.key}
            aria-label={column.longLabel}
            className="relative border-l border-border-subtle"
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border-subtle) 0 1px, transparent 1px ${String(HOUR_PX)}px)`,
            }}
          >
            {column.unavailable ? (
              <div className={`absolute inset-0 p-2 ${UNAVAILABLE_STYLE}`}>
                <p className="type-label-sm">{column.unavailable.title}</p>
                {column.unavailable.detail === null ? null : (
                  <p className="type-caption">{column.unavailable.detail}</p>
                )}
              </div>
            ) : null}
            {column.background.map((block) => (
              <Band key={block.key} block={block} inline={inline} />
            ))}
            <ol className="contents">
              {column.foreground.map((block) => (
                <li key={block.key}>
                  <Block block={block} inline={inline} />
                </li>
              ))}
            </ol>
            {column.nowOffset === null ? null : (
              <span
                aria-hidden
                className="absolute inset-x-0 z-20 border-t-2 border-action-accent"
                style={{ top: column.nowOffset * HOUR_PX }}
              >
                <span className="absolute -top-[5px] -left-1 size-2 rounded-full bg-action-accent" />
              </span>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function boxStyle(block: PlacedBlock): CSSProperties {
  return {
    top: block.top * HOUR_PX + 1,
    height: block.height * HOUR_PX - 2,
  };
}

/** Availability behind the appointments: not a control. */
function Band({ block, inline }: { block: PlacedBlock; inline: boolean }) {
  return (
    <div
      className={`absolute inset-x-0 overflow-hidden px-2 py-1 ${ENTRY_STYLE[block.kind]}`}
      style={boxStyle(block)}
    >
      {inline ? (
        <>
          <p className="type-label-sm">{`${block.title} · ${block.hours}`}</p>
          <p className="type-caption">{block.detail}</p>
        </>
      ) : (
        <>
          {/* The colour says it (the legend names it); the words are for screen readers. */}
          <p className="sr-only">{`${block.title} ${block.hours}`}</p>
        </>
      )}
    </div>
  );
}

function Block({ block, inline }: { block: PlacedBlock; inline: boolean }) {
  // The day view leaves the left third to the availability band's label, as in the frame.
  const start = inline ? 30 : 0;
  const width = (100 - start) / block.lanes;
  return (
    <button
      type="button"
      aria-label={block.ariaLabel}
      data-tour={block.tourAnchor ? "calendar-pending-request" : undefined}
      onClick={block.open ?? undefined}
      className={`absolute z-10 overflow-hidden rounded-md px-2 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-selected ${ENTRY_STYLE[block.kind]}`}
      style={{
        ...boxStyle(block),
        left: `calc(${String(start + block.lane * width)}% + 4px)`,
        width: `calc(${String(width)}% - 8px)`,
      }}
    >
      {inline ? (
        <span className="block truncate type-label-sm">
          {`${block.hours} · ${block.title} · ${block.detail}`}
        </span>
      ) : (
        <>
          <span className="block truncate type-label-sm">
            {`${block.startTime} ${block.title}`}
          </span>
          {block.height < TWO_LINE_HOURS ? null : (
            <span className="block truncate type-caption">{block.detail}</span>
          )}
        </>
      )}
    </button>
  );
}

function MonthGrid({
  calendar,
}: {
  calendar: AcademicianAppointmentsCalendar;
}) {
  const t = useTranslations("iaAcademician.appointments");
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7">
        {calendar.monthHeaders.map((label) => (
          <span
            key={label}
            className="px-2 pb-2 type-caption text-text-secondary"
          >
            {label}
          </span>
        ))}
        {calendar.monthCells.map((cell) => (
          <div
            key={cell.key}
            className={`min-h-24 space-y-1 border-t border-l border-border-subtle p-1.5 [&:nth-child(7n)]:border-r ${
              cell.unavailable ? "bg-background-muted" : ""
            }`}
          >
            <button
              type="button"
              aria-label={t("openDay", { day: cell.dayLabel })}
              onClick={cell.openDay}
              className={`grid size-6 place-items-center rounded-full type-label-sm focus-visible:outline-2 focus-visible:outline-border-selected ${dayNumberClass(cell)}`}
            >
              {cell.dayNumber}
            </button>
            {cell.unavailable ? (
              <p className="px-1 type-caption text-text-muted">
                {t("entry.unavailable")}
              </p>
            ) : null}
            {cell.chips.map((chip) => (
              <MonthChip key={chip.key} chip={chip} />
            ))}
            {cell.overflow > 0 ? (
              <p className="px-1 type-caption text-text-muted">
                {t("more", { count: cell.overflow })}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function dayNumberClass(cell: { isToday: boolean; inMonth: boolean }) {
  if (cell.isToday) return "bg-action-accent text-text-inverse";
  return cell.inMonth ? "text-text-primary" : "text-text-disabled";
}

function MonthChip({ chip }: { chip: CalendarBlock }) {
  const className = `block w-full truncate rounded px-1.5 py-0.5 text-left type-caption ${ENTRY_STYLE[chip.kind]}`;
  if (chip.open === null) {
    return <p className={className}>{chip.title}</p>;
  }
  return (
    <button
      type="button"
      aria-label={chip.ariaLabel}
      data-tour={chip.tourAnchor ? "calendar-pending-request" : undefined}
      onClick={chip.open}
      className={`${className} focus-visible:outline-2 focus-visible:outline-border-selected`}
    >
      {chip.title}
    </button>
  );
}
