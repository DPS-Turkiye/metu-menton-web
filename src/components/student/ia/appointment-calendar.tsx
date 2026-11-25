import { useLocale, useTranslations } from "next-intl";

import {
  AppointmentKind,
  AppointmentStatus,
  type Appointment,
} from "@/interfaces/appointment";
import { currentTime } from "@/lib/appointments";
import {
  isSameDay,
  shortWeekday,
  timeLabel,
  type MonthCell,
} from "@/lib/calendar";
import { titledName } from "@/lib/profile-completion";
import {
  APPOINTMENT_GRID_HOURS,
  gridPlacement,
  shortPersonName,
} from "@/lib/student-appointments";
import { isAwaitingAnswer } from "@/lib/student-home";
import { formatDayMonth } from "@/lib/utils";

const HOUR_HEIGHT = 60;

/** Office Hours in the theme's tint, peer mentoring in the info indigo (Figma 3.7). */
const KIND_FILL: Record<AppointmentKind, string> = {
  [AppointmentKind.OfficeHours]: "bg-background-selected text-text-primary",
  [AppointmentKind.PeerMentoring]: "bg-status-info-bg text-text-primary",
};
const KIND_EDGE: Record<AppointmentKind, string> = {
  [AppointmentKind.OfficeHours]: "border-l-[3px] border-action-accent",
  [AppointmentKind.PeerMentoring]: "border-l-[3px] border-status-info-icon",
};
/** Not confirmed yet. */
const AWAITING_FILL = "bg-background-surface text-status-warning-text";
const AWAITING_EDGE = "border-2 border-dashed border-status-warning-icon";
/** Refused, cancelled or lapsed: it will not happen. */
const OFF_FILL = "bg-background-muted text-text-muted line-through";
const SELECTED_EDGE = "border-2 border-action-accent shadow-raised";
/** From here on a block has room for a second line. */
const TWO_LINE_HOURS = 0.6;

/** The block's look: its kind's colours, a dashed frame while it waits, the accent frame while it is picked. */
function blockClass(item: Appointment, selected = false) {
  if (isAwaitingAnswer(item)) {
    return `${AWAITING_FILL} ${selected ? SELECTED_EDGE : AWAITING_EDGE}`;
  }
  if (item.status !== AppointmentStatus.Confirmed) {
    return `${OFF_FILL} ${selected ? SELECTED_EDGE : ""}`;
  }
  return `${KIND_FILL[item.kind]} ${selected ? SELECTED_EDGE : KIND_EDGE[item.kind]}`;
}

/** A short block keeps its second line for screen readers only. */
function secondLine(hours: number) {
  return hours < TWO_LINE_HOURS ? "sr-only" : "truncate";
}

function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

/**
 * The day grid (Figma 3.7b): one wide column with the hours, each session spelling out its time, who and its
 * status, and the "Şu an" line across the grid while today is shown.
 */
export function AppointmentDayGrid({
  day,
  items,
  nowLine,
  clock,
  selectedId,
  onSelect,
}: {
  day: Date;
  items: Appointment[];
  /** Hours from the grid's first row; null when the line is not on this day's grid. */
  nowLine: number | null;
  clock: Date;
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
}) {
  const t = useTranslations("appointments.status");
  const tCalendar = useTranslations("iaStudent.appointments.calendar");
  const locale = useLocale();
  const height = APPOINTMENT_GRID_HOURS.length * HOUR_HEIGHT;
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border-default bg-background-surface">
      <div className="relative" style={{ height }}>
        {APPOINTMENT_GRID_HOURS.map((hour, index) => (
          <span
            key={hour}
            className="absolute left-3 pt-1 type-caption text-text-muted"
            style={{ top: index * HOUR_HEIGHT }}
          >
            {`${String(hour).padStart(2, "0")}:00`}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height }}>
        <ul
          aria-label={formatDayMonth(day, locale)}
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border-subtle) 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
          }}
        >
          {items.map((item) => {
            const place = gridPlacement(item);
            const time = currentTime(item);
            const isSelected = selectedId === item.id;
            return (
              <li
                key={item.id}
                className="absolute inset-x-2"
                style={{
                  top: place.top * HOUR_HEIGHT + 1,
                  height: place.height * HOUR_HEIGHT - 2,
                }}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(item)}
                  className={`flex size-full flex-col justify-center gap-0.5 overflow-hidden rounded-lg px-3 py-0.5 text-left type-caption ${blockClass(item, isSelected)}`}
                >
                  <span className="truncate type-label-sm">
                    {[
                      `${timeLabel(time.startsAt, locale)} – ${timeLabel(time.endsAt, locale)}`,
                      titledName(
                        item.counterpart.title,
                        item.counterpart.fullName,
                      ),
                      t(item.status),
                    ].join(" · ")}
                  </span>
                  <span className={secondLine(place.height)}>{item.topic}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {nowLine === null ? null : (
          <div
            className="pointer-events-none absolute inset-x-0 h-0.5 bg-status-error-icon"
            style={{ top: nowLine * HOUR_HEIGHT }}
          >
            <span className="sr-only">
              {tCalendar("now", {
                time: timeLabel(clock.toISOString(), locale),
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** The week time grid (Figma 3.7): one column per day, sessions placed by their hours. */
export function AppointmentTimeGrid({
  days,
  today,
  selectedId,
  onSelect,
}: {
  days: { day: Date; items: Appointment[] }[];
  today: Date;
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
}) {
  const t = useTranslations("appointments.status");
  const locale = useLocale();
  const height = APPOINTMENT_GRID_HOURS.length * HOUR_HEIGHT;
  const gridTemplateColumns = `56px repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div className="overflow-x-auto">
      <div className="mb-5 grid min-w-[640px]" style={{ gridTemplateColumns }}>
        <span />
        {days.map(({ day }) => (
          <p
            key={dayKey(day)}
            className={`grid h-9 place-items-center rounded-lg type-body-sm ${
              isSameDay(day.toISOString(), today)
                ? "bg-background-selected text-text-accent"
                : "text-text-secondary"
            }`}
          >
            {`${shortWeekday(day, locale)} ${day.getDate()}`}
          </p>
        ))}
      </div>
      <div
        className="grid min-w-[640px] overflow-hidden rounded-2xl border border-border-default bg-background-surface"
        style={{ gridTemplateColumns }}
      >
        <div className="relative" style={{ height }}>
          {APPOINTMENT_GRID_HOURS.map((hour, index) => (
            <span
              key={hour}
              className="absolute left-2 pt-1 type-caption text-text-muted"
              style={{ top: index * HOUR_HEIGHT }}
            >
              {`${String(hour).padStart(2, "0")}:00`}
            </span>
          ))}
        </div>
        {days.map(({ day, items }) => (
          <ul
            key={dayKey(day)}
            aria-label={formatDayMonth(day, locale)}
            className="relative border-l border-border-subtle"
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border-subtle) 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
            }}
          >
            {items.map((item) => {
              const place = gridPlacement(item);
              const dashed = isAwaitingAnswer(item);
              const isSelected = selectedId === item.id;
              return (
                <li
                  key={item.id}
                  className="absolute inset-x-1"
                  style={{
                    top: place.top * HOUR_HEIGHT + 1,
                    height: place.height * HOUR_HEIGHT - 2,
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(item)}
                    className={`flex size-full flex-col justify-center overflow-hidden rounded-md px-2 py-0.5 text-left type-caption ${blockClass(item, isSelected)}`}
                  >
                    <span className="truncate">
                      {`${timeLabel(currentTime(item).startsAt, locale)} ${shortPersonName(item.counterpart.fullName)}`}
                    </span>
                    <span className={secondLine(place.height)}>
                      {dashed ? t(item.status) : item.topic}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** The month grid (Figma 3.7c): a chip per session; picking a day lists it beside the grid. */
export function AppointmentMonthGrid({
  cells,
  today,
  selectedDay,
  onSelectDay,
}: {
  cells: (MonthCell & { items: Appointment[] })[];
  today: Date;
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("iaStudent.appointments.calendar");
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7">
        {cells.slice(0, 7).map((cell) => (
          <p
            key={cell.date.getDay()}
            className="px-2 pb-2 type-caption text-text-secondary"
          >
            {shortWeekday(cell.date, locale)}
          </p>
        ))}
        {cells.map((cell) => {
          const iso = cell.date.toISOString();
          const isToday = isSameDay(iso, today);
          const isSelected = isSameDay(iso, selectedDay);
          return (
            <button
              key={dayKey(cell.date)}
              type="button"
              aria-pressed={isSelected}
              aria-label={t("day", {
                date: formatDayMonth(cell.date, locale),
                count: cell.items.length,
              })}
              onClick={() => onSelectDay(cell.date)}
              className={`flex min-h-24 flex-col gap-1 p-2 text-left ${
                isSelected
                  ? "border-2 border-action-accent bg-background-selected"
                  : `border border-border-subtle ${cell.inCurrentMonth ? "bg-background-surface" : "bg-background-subtle"}`
              }`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full type-caption ${
                  isToday
                    ? "bg-action-primary-bg text-text-inverse"
                    : cell.inCurrentMonth
                      ? "text-text-primary"
                      : "text-text-disabled"
                }`}
              >
                {cell.date.getDate()}
              </span>
              {cell.items.map((item) => (
                <span
                  key={item.id}
                  aria-hidden
                  className={`truncate rounded-md px-1.5 py-0.5 type-caption ${blockClass(item)}`}
                >
                  {`${timeLabel(currentTime(item).startsAt, locale)} ${shortPersonName(item.counterpart.fullName)}`}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
