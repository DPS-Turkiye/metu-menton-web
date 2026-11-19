import { APP_URL } from "@/lib/const";
import { Locale } from "@/lib/i18n";

/**
 * Off unless this build sets it, like the backend's OFFICE_HOURS_CALENDAR_FEED_ENABLED: a deployment that has not
 * turned the links on neither offers them nor answers on their routes.
 */
export function isCalendarFeedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OFFICE_HOURS_CALENDAR_FEED_ENABLED === "true";
}

/** Where Moodle fetches a calendar feed from; open to anyone, since the token in the link is the key (FR-OH-23). */
export const CALENDAR_FEED_PATH = "/api/office-hours/calendar";

/** 32 random bytes in URL-safe Base64 with no padding, as the backend makes them. */
const CALENDAR_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const ICS_SUFFIX = /\.ics$/;

/**
 * The link to paste into Moodle's calendar. It ends in ".ics" for calendars that look at the extension, and carries
 * the owner's language, because Moodle sends none when it fetches.
 */
export function calendarFeedUrl(token: string, locale: Locale) {
  const url = new URL(`${CALENDAR_FEED_PATH}/${token}.ics`, APP_URL);
  url.searchParams.set("lang", locale);
  return url.toString();
}

/** The token in a feed link's last segment, or null for anything a backend token can't be. */
export function feedToken(segment: string) {
  const token = segment.replace(ICS_SUFFIX, "");
  if (!CALENDAR_TOKEN.test(token)) return null;
  return token;
}

/** The feed's language: English when the link asks for it, otherwise Turkish. */
export function feedLocale(value: string | null) {
  if (value === Locale.En) return Locale.En;
  return Locale.Tr;
}
