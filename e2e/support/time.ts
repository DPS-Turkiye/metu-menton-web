const TURKEY_TIMEZONE = "Europe/Istanbul";

/** "2026-11-18" for an instant, in Turkey, as Randevularım's ?date= reads it. */
export function toTurkishDate(instant: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TURKEY_TIMEZONE }).format(
    new Date(instant),
  );
}

/** "10:00" for an instant, in Turkey. */
export function toTurkishTime(instant: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TURKEY_TIMEZONE,
  }).format(new Date(instant));
}

/** "10:00–10:30", in Turkey, as the academician's calendar names a meeting. */
export function toTurkishTimeRange(startsAt: string, endsAt: string) {
  return `${toTurkishTime(startsAt)}–${toTurkishTime(endsAt)}`;
}

/**
 * Next week's Wednesday in Turkey ("2026-12-02"). On any day of the week it is past the four-hour booking lead, and
 * its daytime hours fall on the same date in UTC, where CI's browser runs.
 */
export function getNextWednesday(now = new Date()) {
  const today = new Date(`${toTurkishDate(now.toISOString())}T12:00:00Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const wednesday = new Date(today);
  wednesday.setUTCDate(today.getUTCDate() - sinceMonday + 9);
  return wednesday.toISOString().slice(0, 10);
}
