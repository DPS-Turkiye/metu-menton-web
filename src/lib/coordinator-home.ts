import type { useTranslations } from "next-intl";

import type {
  CoordinatorAgendaItem,
  CoordinatorNextMeeting,
} from "@/interfaces/coordinator-overview";
import { isSameCalendarDay } from "@/lib/calendar";
import { formatDateRange } from "@/lib/format";
import { toTurkishWallClock } from "@/lib/turkey-time";
import { relativeDayLabel } from "@/lib/utils";

export enum AgendaWindow {
  Today = "TODAY",
  Week = "WEEK",
}

export type CoordinatorHomeTexts = {
  t: ReturnType<typeof useTranslations<"coordinatorHome">>;
  locale: string;
};

export function agendaForToday(
  agenda: CoordinatorAgendaItem[],
  now = new Date(),
) {
  const today = toTurkishWallClock(now);
  return agenda.filter((item) =>
    isSameCalendarDay(toTurkishWallClock(item.at), today),
  );
}

function dayMonth(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function clock(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Bugün" or "17 Eyl", and the time unless the item is a due date. */
export function agendaWhen(
  item: CoordinatorAgendaItem,
  { t, locale }: CoordinatorHomeTexts,
  now = new Date(),
) {
  // Days and times are read on Turkey's clock; the formatters below then show the wall-clock fields as they are.
  const at = toTurkishWallClock(item.at);
  return {
    day: isSameCalendarDay(at, toTurkishWallClock(now))
      ? relativeDayLabel(0, locale)
      : dayMonth(at, locale),
    time: item.allDay ? t("allDay") : clock(locale).format(at),
  };
}

/** "Yarın · 14:00–15:00" for the next-meeting chip. */
export function meetingSlotLabel(
  meeting: CoordinatorNextMeeting,
  locale: string,
  now = new Date(),
) {
  const start = toTurkishWallClock(meeting.scheduledAt);
  const today = toTurkishWallClock(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const day = isSameCalendarDay(start, today)
    ? relativeDayLabel(0, locale)
    : isSameCalendarDay(start, tomorrow)
      ? relativeDayLabel(1, locale)
      : dayMonth(start, locale);
  const end = new Date(
    start.getTime() + (meeting.durationMinutes ?? 60) * 60_000,
  );
  return `${day} · ${formatDateRange(clock(locale), start, end)}`;
}

export function hasOpenActions(actions: {
  pendingMentors: unknown[];
  awaitingTeams: unknown[];
  missingNotes: unknown[];
}) {
  return (
    actions.pendingMentors.length +
      actions.awaitingTeams.length +
      actions.missingNotes.length >
    0
  );
}
