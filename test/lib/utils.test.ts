import { describe, expect, it } from "vitest";

import {
  calendarDay,
  dayPart,
  distinctBy,
  errorMessage,
  formatFileSize,
  formatLongDate,
  formatLongDateRange,
  formatShortDate,
  formatTime,
  httpUrlOrNull,
  isAdminArea,
  isUuid,
  minutesOfDay,
  splitFullName,
  typedUrlOrNull,
} from "@/lib/utils";
import { BROWSER_TIME_ZONES, inTimeZone } from "@test/time-zone";

describe("dayPart", () => {
  it("follows the time of day", () => {
    expect(dayPart(new Date(2026, 8, 14, 9))).toBe("morning");
    expect(dayPart(new Date(2026, 8, 14, 14))).toBe("afternoon");
    expect(dayPart(new Date(2026, 8, 14, 21))).toBe("evening");
    expect(dayPart(new Date(2026, 8, 14, 3))).toBe("evening");
  });
});

describe("formatLongDate", () => {
  it("writes the day, the Turkish month name and the year", () => {
    expect(formatLongDate("2026-09-02T12:00:00Z")).toBe("2 Eylül 2026");
  });

  it("writes the English month name in English", () => {
    expect(formatLongDate("2026-09-02T12:00:00Z", "en")).toBe(
      "September 2, 2026",
    );
  });
});

describe("formatShortDate", () => {
  it("writes the day, the short Turkish month and the year", () => {
    expect(formatShortDate("2026-09-12T12:00:00Z")).toBe("12 Eyl 2026");
  });
});

describe("calendarDay", () => {
  it("keeps a calendar day on the same day in any time zone", () => {
    const day = calendarDay("2026-09-15");
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([
      2026, 8, 15,
    ]);
  });
});

describe("errorMessage", () => {
  it("returns the thrown message when there is one", () => {
    expect(errorMessage(new Error("Kota doldu."), "fallback")).toBe(
      "Kota doldu.",
    );
  });

  it("falls back when what was thrown is not an Error", () => {
    expect(errorMessage("boom", "Kaydedilemedi.")).toBe("Kaydedilemedi.");
  });
});

describe("formatFileSize", () => {
  it("shows files under a megabyte in kilobytes, never as 0.00 MB", () => {
    expect(formatFileSize(3_300)).toBe("3 KB");
    expect(formatFileSize(200)).toBe("1 KB");
    expect(formatFileSize(300 * 1024)).toBe("300 KB");
  });

  it("shows larger files in megabytes with one decimal", () => {
    expect(formatFileSize(2.34 * 1024 * 1024)).toBe("2.3 MB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB");
  });
});

describe("typedUrlOrNull", () => {
  it.each([
    ["linkedin.com/in/ada-lovelace", "https://linkedin.com/in/ada-lovelace"],
    [" www.linkedin.com/in/ada ", "https://www.linkedin.com/in/ada"],
    ["tr.linkedin.com/in/ada/?x=1", "https://tr.linkedin.com/in/ada/?x=1"],
    ["behance.net", "https://behance.net"],
    ["https://github.com/ada", "https://github.com/ada"],
    ["http://example.com", "http://example.com"],
  ])("reads %s as %s", (typed, url) => {
    expect(typedUrlOrNull(typed)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "ada@example.com",
    "linkedin",
    "ada lovelace.com",
    "//example.com",
    "/in/ada",
    "",
    null,
  ])("refuses %s", (typed) => {
    expect(typedUrlOrNull(typed)).toBeNull();
  });
});

describe("httpUrlOrNull", () => {
  it("keeps http and https links and refuses anything else", () => {
    expect(httpUrlOrNull(" https://www.linkedin.com/in/ada ")).toBe(
      "https://www.linkedin.com/in/ada",
    );
    expect(httpUrlOrNull("http://example.com")).toBe("http://example.com");
    expect(httpUrlOrNull("javascript:alert(1)")).toBeNull();
    expect(httpUrlOrNull("linkedin.com/in/ada")).toBeNull();
    expect(httpUrlOrNull("")).toBeNull();
    expect(httpUrlOrNull(null)).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts backend ids and nothing that could change a URL path", () => {
    expect(isUuid("00000000-0000-0000-0000-0000000000AB")).toBe(true);
    expect(isUuid("..")).toBe(false);
    expect(isUuid("00000000-0000-0000-0000-000000000001/../x")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("isAdminArea", () => {
  it("is true only inside the admin frame", () => {
    expect(isAdminArea("/admin/users/u1")).toBe(true);
    expect(isAdminArea("/coordinator/people/u1")).toBe(false);
    expect(isAdminArea("/administration")).toBe(false);
    expect(isAdminArea(null)).toBe(false);
  });
});

describe("distinctBy", () => {
  it("keeps the first of each key, in order, with the key alongside", () => {
    expect(distinctBy(["b", "a", "b"], (item) => item)).toEqual([
      { key: "b", item: "b" },
      { key: "a", item: "a" },
    ]);
  });
});

describe("splitFullName", () => {
  it("keeps the last word as the surname", () => {
    expect(splitFullName("  Ayşe Nur   Yılmaz ")).toEqual({
      firstName: "Ayşe Nur",
      lastName: "Yılmaz",
    });
  });

  it("takes a single word as the first name", () => {
    expect(splitFullName("Ayşe")).toEqual({ firstName: "Ayşe", lastName: "" });
    expect(splitFullName("")).toEqual({ firstName: "", lastName: "" });
  });
});

describe("formatTime", () => {
  it("gives the short time of an instant", () => {
    expect(formatTime("2026-11-12T11:05:00Z", "tr")).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("minutesOfDay", () => {
  it("counts minutes since midnight of an HH:mm time", () => {
    expect(minutesOfDay("00:00")).toBe(0);
    expect(minutesOfDay("09:30")).toBe(570);
    expect(minutesOfDay("23:59")).toBe(1439);
  });
});

describe("formatLongDateRange", () => {
  it("names a shared year once, one day alone, and nothing without dates", () => {
    expect(formatLongDateRange("2027-02-01", "2027-06-30")).toBe(
      "1 Şubat – 30 Haziran 2027",
    );
    expect(formatLongDateRange("2026-09-01", "2027-01-31")).toBe(
      "1 Eylül 2026 – 31 Ocak 2027",
    );
    expect(formatLongDateRange("", "2027-06-30")).toBe("30 Haziran 2027");
    expect(formatLongDateRange("", "")).toBe("");
    expect(formatLongDateRange("20270-01-01", "2027-06-30")).toBe("");
  });
});

describe.each(BROWSER_TIME_ZONES)(
  "date formatters in a browser in %s",
  (zone) => {
    it("show a moment's Turkey time and day", () => {
      inTimeZone(zone, () => {
        expect(formatTime("2026-11-10T07:00:00Z", "tr")).toBe("10:00");
        // 21:30 UTC on the 10th is the 11th in Istanbul.
        expect(formatLongDate("2026-11-10T21:30:00Z", "tr")).toBe(
          "11 Kasım 2026",
        );
        expect(formatShortDate("2026-11-10T21:30:00Z", "tr")).toBe(
          "11 Kas 2026",
        );
        expect(dayPart(new Date("2026-11-10T06:00:00Z"))).toBe("morning");
      });
    });
  },
);
