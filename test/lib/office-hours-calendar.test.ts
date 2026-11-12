import { describe, expect, it } from "vitest";

import { APP_URL } from "@/lib/const";
import { Locale } from "@/lib/i18n";
import {
  calendarFeedUrl,
  feedLocale,
  feedToken,
} from "@/lib/office-hours-calendar";

const TOKEN = "Ab3_-".repeat(8) + "xyz";

describe("office hours calendar links", () => {
  it("builds a link on this site's own address that ends in .ics and carries the language", () => {
    expect(calendarFeedUrl(TOKEN, Locale.En)).toBe(
      `${APP_URL}/api/office-hours/calendar/${TOKEN}.ics?lang=en`,
    );
  });

  it("reads the token from the last segment, with or without .ics", () => {
    expect(feedToken(`${TOKEN}.ics`)).toBe(TOKEN);
    expect(feedToken(TOKEN)).toBe(TOKEN);
  });

  it("turns away anything a backend token can't be", () => {
    expect(feedToken("short")).toBeNull();
    expect(feedToken(`${TOKEN}a`)).toBeNull();
    expect(feedToken(`${TOKEN.slice(1)}/`)).toBeNull();
    expect(feedToken(`${TOKEN.slice(2)}..`)).toBeNull();
  });

  it("is Turkish unless the link asks for English", () => {
    expect(feedLocale("en")).toBe(Locale.En);
    expect(feedLocale("de")).toBe(Locale.Tr);
    expect(feedLocale(null)).toBe(Locale.Tr);
  });
});
