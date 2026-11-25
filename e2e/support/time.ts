const TURKEY = "Europe/Istanbul";

/** "2026-11-18" for an instant, in Turkey, as Randevularım's ?date= reads it. */
export function turkeyDay(instant: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TURKEY }).format(
    new Date(instant),
  );
}

/** "10:00" for an instant, in Turkey. */
export function turkeyClock(instant: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TURKEY,
  }).format(new Date(instant));
}

/** "10:00–10:30", in Turkey, as the academician's calendar names a meeting. */
export function turkeyRange(startsAt: string, endsAt: string) {
  return `${turkeyClock(startsAt)}–${turkeyClock(endsAt)}`;
}

/**
 * Next week's Wednesday in Turkey ("2026-12-02"). On any day of the week it is past the four-hour booking lead and
 * in the week behind "Sonraki hafta"; its daytime hours fall on the same date in UTC, where CI's browser runs.
 */
export function nextWednesday(now = new Date()) {
  const today = new Date(`${turkeyDay(now.toISOString())}T12:00:00Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const wednesday = new Date(today);
  wednesday.setUTCDate(today.getUTCDate() - sinceMonday + 9);
  return wednesday.toISOString().slice(0, 10);
}
