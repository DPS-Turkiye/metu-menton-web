import { AppointmentStatus, type Appointment } from "@/interfaces/appointment";
import { currentTime, splitAppointments } from "@/lib/appointments";
import {
  isSameDay,
  monthLabel,
  startOfWeek,
  weekdayName,
  weekDays,
  weekRangeLabel,
} from "@/lib/calendar";
import { startOfDay } from "@/lib/mobile-calendar";
import { isAwaitingAnswer } from "@/lib/student-home";
import { splitFullName } from "@/lib/utils";
import {
  AppointmentRequestGroup,
  AppointmentsTab,
  AppointmentsView,
} from "@/types/student-appointments";

/** The calendar grid runs 09:00–19:00 (the last row is 18:00). */
export const APPOINTMENT_GRID_HOURS = Array.from(
  { length: 10 },
  (_, index) => 9 + index,
);

/** The list tabs: confirmed sessions ahead, requests ahead, then everything already over or called off. */
export function appointmentTabs(
  appointments: Appointment[],
  now: Date,
): Record<AppointmentsTab, Appointment[]> {
  const { upcoming, past } = splitAppointments(appointments, now);
  return {
    [AppointmentsTab.Upcoming]: upcoming.filter(
      (item) => item.status === AppointmentStatus.Confirmed,
    ),
    [AppointmentsTab.Requests]: upcoming.filter(isAwaitingAnswer),
    [AppointmentsTab.Past]: past,
  };
}

/**
 * A day's appointments, earliest first. A request with another time on the table sits at that offered time, the one
 * it would become (Figma 258:3993 shows it on the proposed day).
 */
export function appointmentsOnDay(appointments: Appointment[], day: Date) {
  const startOf = (item: Appointment) => currentTime(item).startsAt;
  return appointments
    .filter((item) => isSameDay(startOf(item), day))
    .toSorted((a, b) => Date.parse(startOf(a)) - Date.parse(startOf(b)));
}

/** The appointments that stand in `month` ("Kasım özeti"). */
export function appointmentsInMonth(
  appointments: readonly Appointment[],
  month: Date,
) {
  return appointments.filter((item) => {
    const start = new Date(currentTime(item).startsAt);
    return (
      start.getFullYear() === month.getFullYear() &&
      start.getMonth() === month.getMonth()
    );
  });
}

/** The line under the calendar (Figma 3.7): the confirmed sessions in view, those held, and open requests. */
export function calendarSummary(shown: readonly Appointment[], now: Date) {
  const confirmed = shown.filter(
    (item) => item.status === AppointmentStatus.Confirmed,
  );
  return {
    meetings: confirmed.length,
    done: confirmed.filter((item) => Date.parse(item.endsAt) <= now.getTime())
      .length,
    waiting: shown.filter(isAwaitingAnswer).length,
  };
}

/** Talepler's two sections: who answers next. */
export function appointmentRequestGroups(
  requests: readonly Appointment[],
): Record<AppointmentRequestGroup, Appointment[]> {
  return {
    [AppointmentRequestGroup.AwaitingYou]: requests.filter(
      (item) => item.status === AppointmentStatus.AlternativeProposed,
    ),
    [AppointmentRequestGroup.AwaitingThem]: requests.filter(
      (item) => item.status === AppointmentStatus.Pending,
    ),
  };
}

/** In Geçmiş a confirmed session is one that was held ("Tamamlandı"); every other status says its own outcome. */
export function wasHeld({ status }: Pick<Appointment, "status">) {
  return status === AppointmentStatus.Confirmed;
}

/** Where the "Şu an" line crosses the day grid, in hours from its first row; null on another day or off the grid. */
export function nowLineOffset(
  now: Date,
  day: Date,
  hours: readonly number[] = APPOINTMENT_GRID_HOURS,
) {
  if (hours.length === 0 || now.toDateString() !== day.toDateString()) {
    return null;
  }
  const offset = now.getHours() + now.getMinutes() / 60 - (hours[0] ?? 0);
  return offset >= 0 && offset <= hours.length ? offset : null;
}

/**
 * Where an appointment sits on the hour grid, in hours from the first row: `top` from the grid's start and
 * `height` its length (at least half an hour, so a short slot stays clickable). A session outside the grid's
 * hours is pinned to its first or last row instead of drawn off the grid; its chip still says the real time.
 */
export function gridPlacement(
  appointment: Appointment,
  hours: readonly number[] = APPOINTMENT_GRID_HOURS,
) {
  const first = hours[0] ?? 0;
  const span = hours.length;
  const time = currentTime(appointment);
  const start = new Date(time.startsAt);
  const end = new Date(time.endsAt);
  const minimum = 0.5;
  const top = Math.min(
    Math.max(start.getHours() + start.getMinutes() / 60 - first, 0),
    span - minimum,
  );
  const bottom = Math.min(
    Math.max(end.getHours() + end.getMinutes() / 60 - first, top + minimum),
    span,
  );
  return { top, height: bottom - top };
}

/** The days a calendar view shows around `anchor` (the list and month views show none on the time grid). */
export function visibleDays(view: AppointmentsView, anchor: Date) {
  switch (view) {
    case AppointmentsView.Day:
      return [startOfDay(anchor)];
    case AppointmentsView.Week:
      return weekDays(startOfWeek(anchor), 7);
    case AppointmentsView.List:
    case AppointmentsView.Month:
      return [];
  }
}

/** The previous or next day, week or month from `anchor`. */
export function shiftAnchor(
  view: AppointmentsView,
  anchor: Date,
  step: 1 | -1,
) {
  const next = startOfDay(anchor);
  switch (view) {
    case AppointmentsView.Day:
      next.setDate(next.getDate() + step);
      return next;
    case AppointmentsView.Week:
      next.setDate(next.getDate() + 7 * step);
      return next;
    case AppointmentsView.Month:
      next.setDate(1);
      next.setMonth(next.getMonth() + step);
      return next;
    case AppointmentsView.List:
      return next;
  }
}

/** The calendar header: "13 Kasım 2026, Cuma", "9–15 Kasım 2026" or "Kasım 2026". */
export function calendarTitle(
  view: AppointmentsView,
  anchor: Date,
  locale: string,
) {
  switch (view) {
    case AppointmentsView.Day:
      return withWeekday(anchor, locale, { year: "numeric" });
    case AppointmentsView.Week: {
      const days = weekDays(startOfWeek(anchor), 7);
      const first = days[0] ?? anchor;
      const last = days.at(-1) ?? anchor;
      return `${weekRangeLabel(first, last, locale)} ${last.getFullYear()}`;
    }
    case AppointmentsView.Month:
    case AppointmentsView.List:
      return monthLabel(anchor, locale);
  }
}

/** "13 Kasım, Cuma" (or with the year): the frames put the weekday after the date, unlike `formatWeekdayDate`. */
function withWeekday(
  date: Date,
  locale: string,
  extra: Intl.DateTimeFormatOptions = {},
) {
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    ...extra,
  }).format(date);
  return `${day}, ${weekdayName(date, locale)}`;
}

/** "13 Kasım, Cuma": the "Seçili gün" panel's heading. */
export function selectedDayTitle(day: Date, locale: string) {
  return withWeekday(day, locale);
}

/** "Elif Karaca" → "E. Karaca", as a calendar chip names the other side; one word stays as it is. */
export function shortPersonName(fullName: string) {
  const { firstName, lastName } = splitFullName(fullName);
  return lastName ? `${firstName.charAt(0)}. ${lastName}` : firstName;
}

/** `?sent=` as the page receives it: absent, once, or repeated. The first non-blank value names who was asked. */
export function sentToParam(value: string | string[] | undefined) {
  const values = typeof value === "string" ? [value] : (value ?? []);
  return values.map((item) => item.trim()).find((item) => item !== "") ?? null;
}
