import { useLocale, useTranslations } from "next-intl";

import { AppointmentKind, type Appointment } from "@/interfaces/appointment";
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

const HOUR_HEIGHT = 46;
/** The day view has one wide column, so each hour gets more room (Figma 258:4290). */
const DAY_HOUR_HEIGHT = 60;

/** Office Hours in the info indigo, peer mentoring in the theme accent; a dashed frame while not confirmed. */
const KIND_SOLID: Record<AppointmentKind, string> = {
  [AppointmentKind.OfficeHours]: "bg-status-info-icon text-text-inverse",
  [AppointmentKind.PeerMentoring]: "bg-action-primary-bg text-text-inverse",
};
const KIND_DASHED: Record<AppointmentKind, string> = {
  [AppointmentKind.OfficeHours]:
    "border border-dashed border-status-info-icon bg-background-surface text-status-info-text",
  [AppointmentKind.PeerMentoring]:
    "border border-dashed border-action-primary-bg bg-background-surface text-text-accent",
};

export function kindSwatch(kind: AppointmentKind, dashed: boolean) {
  return dashed ? KIND_DASHED[kind] : KIND_SOLID[kind];
}

function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

/**
 * The day grid (Figma 258:4290): one wide column with the hours, each session spelling out its time, who and its
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
  const height = APPOINTMENT_GRID_HOURS.length * DAY_HOUR_HEIGHT;
  return (
    <div className="grid grid-cols-[60px_minmax(0,1fr)] pt-2">
      <div className="relative" style={{ height }}>
        {APPOINTMENT_GRID_HOURS.map((hour, index) => (
          <span
            key={hour}
            className="absolute left-0 -translate-y-1/2 type-caption text-text-muted"
            style={{ top: index * DAY_HOUR_HEIGHT }}
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
            backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border-subtle) 0 1px, transparent 1px ${DAY_HOUR_HEIGHT}px)`,
          }}
        >
          {items.map((item) => {
            const place = gridPlacement(item);
            const time = currentTime(item);
            const dashed = isAwaitingAnswer(item);
            const isSelected = selectedId === item.id;
            return (
              <li
                key={item.id}
                className="absolute inset-x-2"
                style={{
                  top: place.top * DAY_HOUR_HEIGHT + 1,
                  height: place.height * DAY_HOUR_HEIGHT - 2,
                }}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(item)}
                  className={`flex size-full flex-col gap-0.5 overflow-hidden rounded-lg px-3 pt-2 pb-1.5 text-left type-caption ${kindSwatch(item.kind, dashed)} ${
                    isSelected
                      ? "ring-2 ring-border-selected ring-offset-1"
                      : ""
                  }`}
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
                  <span className="truncate">{item.topic}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {nowLine === null ? null : (
          <div
            className="pointer-events-none absolute inset-x-0 h-0.5 bg-status-error-icon"
            style={{ top: nowLine * DAY_HOUR_HEIGHT }}
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

/** The week time grid (Figma 99:228 / 258:3993): one column per day, sessions placed by their hours. */
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
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px]"
        style={{
          gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {days.map(({ day }) => (
          <p
            key={dayKey(day)}
            className={`px-1.5 pb-2 type-caption ${
              isSameDay(day.toISOString(), today)
                ? "text-text-accent"
                : "text-text-secondary"
            }`}
          >
            {`${shortWeekday(day, locale)} ${day.getDate()}`}
          </p>
        ))}
        <div className="relative" style={{ height }}>
          {APPOINTMENT_GRID_HOURS.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-2 type-caption text-text-muted"
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
            className="relative border-l border-border-subtle bg-[repeating-linear-gradient(to_bottom,var(--color-border-subtle)_0_1px,transparent_1px_46px)]"
            style={{ height }}
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
                    className={`flex size-full flex-col overflow-hidden rounded-lg px-2 py-1 text-left type-caption ${kindSwatch(item.kind, dashed)} ${
                      isSelected
                        ? "ring-2 ring-border-selected ring-offset-1"
                        : ""
                    }`}
                  >
                    <span className="truncate">
                      {`${timeLabel(currentTime(item).startsAt, locale)} ${shortPersonName(item.counterpart.fullName)}`}
                    </span>
                    <span className="truncate opacity-90">
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

/** The month grid (Figma 99:390): a chip per session; picking a day lists it beside the grid. */
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
      <div className="grid min-w-[560px] grid-cols-7">
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
              className={`flex min-h-24 flex-col gap-1 border border-border-subtle p-2 text-left ${
                isSelected ? "bg-background-selected" : "bg-background-surface"
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
                  className={`truncate rounded-md px-1.5 py-0.5 type-caption ${kindSwatch(item.kind, isAwaitingAnswer(item))}`}
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
