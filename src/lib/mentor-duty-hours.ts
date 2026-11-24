import { Weekday } from "@/interfaces/mentor";
import { minutesOfDay } from "@/lib/utils";

/** One range of an İŞKUR intern's work days, "HH:mm" to "HH:mm" (their onboarding form). */
export type DutyRange = { day: Weekday; start: string; end: string };

/** An offered mentoring range, as the availability draft keeps it. */
export type OfferedRange = {
  key: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
};

type Minutes = { from: number; to: number };

/** The chart shows at least 08:00 – 18:00 (Figma 6.8). */
const CHART_FROM = 8 * 60;
const CHART_TO = 18 * 60;
/** A new range offers up to two hours of the day's first work range. */
const NEW_RANGE_MINUTES = 120;

function dutyOf(duty: readonly DutyRange[], day: Weekday): Minutes[] {
  const ranges = duty
    .filter((range) => range.day === day)
    .map(({ start, end }) => ({
      from: minutesOfDay(start),
      to: minutesOfDay(end),
    }))
    .sort((left, right) => left.from - right.from);
  // Ranges that touch count as one, so an offered range may run across them.
  const joined: Minutes[] = [];
  for (const range of ranges) {
    const last = joined.at(-1);
    if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
    else joined.push({ ...range });
  }
  return joined;
}

/** Whether an offered range lies inside the person's work hours that day; an unfinished range is not judged. */
export function isInsideDuty(
  duty: readonly DutyRange[],
  range: Pick<OfferedRange, "dayOfWeek" | "startTime" | "endTime">,
) {
  if (!range.startTime || !range.endTime) return true;
  const from = minutesOfDay(range.startTime);
  const to = minutesOfDay(range.endTime);
  return dutyOf(duty, range.dayOfWeek).some(
    (work) => from >= work.from && to <= work.to,
  );
}

export function outsideDuty<T extends OfferedRange>(
  duty: readonly DutyRange[],
  ranges: readonly T[],
) {
  return ranges.filter((range) => !isInsideDuty(duty, range));
}

/** Weekdays always show; a weekend day only when there is work or an offer on it. */
export function isDayShown(
  duty: readonly DutyRange[],
  day: Weekday,
  offers: number,
) {
  const weekend = day === Weekday.Saturday || day === Weekday.Sunday;
  return !weekend || offers > 0 || dutyMinutes(duty, day) > 0;
}

const USUAL_LENGTHS = ["30", "45", "60"];

/** The meeting lengths offered, with the saved one when it is another. */
export function meetingLengths(saved: string): readonly string[] {
  return USUAL_LENGTHS.includes(saved)
    ? USUAL_LENGTHS
    : [...USUAL_LENGTHS, saved];
}

export function dutyMinutes(duty: readonly DutyRange[], day: Weekday) {
  return dutyOf(duty, day).reduce((sum, { from, to }) => sum + to - from, 0);
}

/** The minutes these ranges open for mentoring; an unfinished or reversed range opens none. */
export function offeredMinutes(
  ranges: readonly Pick<OfferedRange, "startTime" | "endTime">[],
) {
  return ranges.reduce(
    (sum, { startTime, endTime }) =>
      startTime && endTime
        ? sum + Math.max(0, minutesOfDay(endTime) - minutesOfDay(startTime))
        : sum,
    0,
  );
}

/** The range a new offer starts with: the day's first work range, at most two hours of it. */
export function firstOffer(duty: readonly DutyRange[], day: Weekday) {
  const first = dutyOf(duty, day)[0];
  if (!first) return null;
  return {
    startTime: timeOf(first.from),
    endTime: timeOf(Math.min(first.to, first.from + NEW_RANGE_MINUTES)),
  };
}

function timeOf(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** The hours the chart spans: 08:00 – 18:00, wider when a range falls outside them. */
export function chartSpan(
  duty: readonly DutyRange[],
  offered: readonly OfferedRange[],
) {
  const times = [
    ...duty.flatMap(({ start, end }) => [start, end]),
    ...offered.flatMap(({ startTime, endTime }) => [startTime, endTime]),
  ]
    .filter(Boolean)
    .map(minutesOfDay);
  const from = Math.min(CHART_FROM, ...times);
  const to = Math.max(CHART_TO, ...times);
  return {
    from: Math.floor(from / 60) * 60,
    to: Math.ceil(to / 60) * 60,
  };
}

/** Where a range sits on the chart, in percent of its width. */
export function chartPlace(span: Minutes, start: string, end: string) {
  const total = span.to - span.from;
  const from = minutesOfDay(start);
  const to = Math.max(from, minutesOfDay(end));
  return {
    left: ((from - span.from) / total) * 100,
    width: ((to - from) / total) * 100,
  };
}

export function spanLabel(span: Minutes) {
  return { start: timeOf(span.from), end: timeOf(span.to) };
}
