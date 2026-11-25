/**
 * Every time on the screens is a Turkey time, wherever the browser is: the backend stores moments, ODTÜ and its
 * people are in Turkey, and a student abroad must see the hour the academician sees. Turkey has kept one offset
 * all year since 2016, so a fixed offset is exact.
 */
export const TURKEY_TIME_ZONE = "Europe/Istanbul";

export const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * A moment as a Date whose local fields read Turkey's wall clock. Calendar grids do their day and hour math on
 * local fields, so feeding them these keeps every block in Turkey time; in a browser in Turkey nothing changes.
 * A wall-clock Date is for showing and grouping only: it is not the moment itself and never goes back to the API.
 */
export function toTurkishWallClock(at: Date | string) {
  const time = typeof at === "string" ? Date.parse(at) : at.getTime();
  const turkey = new Date(time + TURKEY_OFFSET_MS);
  return new Date(
    turkey.getUTCFullYear(),
    turkey.getUTCMonth(),
    turkey.getUTCDate(),
    turkey.getUTCHours(),
    turkey.getUTCMinutes(),
    turkey.getUTCSeconds(),
  );
}

/**
 * The moment a wall-clock Date stands for in Turkey: the way back from `toTurkishWallClock`, before a calendar day
 * is compared with real times or sent to the API.
 */
export function fromTurkishWallClock(wall: Date) {
  return new Date(
    Date.UTC(
      wall.getFullYear(),
      wall.getMonth(),
      wall.getDate(),
      wall.getHours(),
      wall.getMinutes(),
      wall.getSeconds(),
    ) - TURKEY_OFFSET_MS,
  );
}

/** Midnight of the Turkey day a moment falls on, as a wall-clock Date: "today" for a calendar. */
export function startOfTurkishDay(at: Date | string) {
  const day = toTurkishWallClock(at);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** The moment of a day ("YYYY-MM-DD") and clock time ("HH:mm") typed in Turkey, as an ISO string for the API. */
export function parseTurkishDateTime(day: string, time: string) {
  return new Date(`${day}T${time}:00+03:00`).toISOString();
}

/** The Turkey calendar day ("YYYY-MM-DD") a moment falls on. */
export function toTurkishDate(at: Date | string) {
  const time = typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(time + TURKEY_OFFSET_MS).toISOString().slice(0, 10);
}

/** "10:00" of a moment in Turkey time. */
export function formatTurkishTime(at: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TURKEY_TIME_ZONE,
  }).format(typeof at === "string" ? new Date(at) : at);
}
