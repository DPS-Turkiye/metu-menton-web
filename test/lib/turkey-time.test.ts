import { describe, expect, it } from "vitest";

import {
  formatTurkishTime,
  fromTurkishWallClock,
  startOfTurkishDay,
  toCalendarDate,
  toTurkishDate,
  toTurkishWallClock,
} from "@/lib/turkey-time";
import { BROWSER_TIME_ZONES, inTimeZone } from "@test/time-zone";

describe.each(BROWSER_TIME_ZONES)("Turkey time in a browser in %s", (zone) => {
  it("shows 10:00 in Istanbul as 10:00", () => {
    inTimeZone(zone, () => {
      expect(formatTurkishTime("2026-11-10T07:00:00Z", "tr")).toBe("10:00");
    });
  });

  it("counts a moment near midnight on its Turkey day", () => {
    inTimeZone(zone, () => {
      // 23:30 in Istanbul on the 10th is 20:30 UTC; 21:30 UTC is already 00:30 on the 11th there.
      expect(toTurkishDate("2026-11-10T20:30:00Z")).toBe("2026-11-10");
      expect(toTurkishDate(new Date("2026-11-10T21:30:00Z"))).toBe(
        "2026-11-11",
      );
    });
  });

  it("reads Turkey's wall clock in the local fields and goes back to the same moment", () => {
    inTimeZone(zone, () => {
      const wall = toTurkishWallClock("2026-11-10T21:30:00Z");
      expect([wall.getDate(), wall.getHours(), wall.getMinutes()]).toEqual([
        11, 0, 30,
      ]);
      expect(fromTurkishWallClock(wall).toISOString()).toBe(
        "2026-11-10T21:30:00.000Z",
      );
    });
  });

  it("keeps Turkey time through London's summer time", () => {
    inTimeZone(zone, () => {
      // July: London is UTC+1, Istanbul UTC+3.
      expect(formatTurkishTime("2026-07-15T07:00:00Z", "tr")).toBe("10:00");
      expect(toTurkishDate("2026-07-15T21:30:00Z")).toBe("2026-07-16");
      const wall = toTurkishWallClock("2026-07-15T21:30:00Z");
      expect([wall.getDate(), wall.getHours()]).toEqual([16, 0]);
      expect(fromTurkishWallClock(wall).toISOString()).toBe(
        "2026-07-15T21:30:00.000Z",
      );
    });
  });

  it("reads a moment as its Turkey day and keeps a calendar day as it is", () => {
    inTimeZone(zone, () => {
      expect(toCalendarDate("2026-11-10T21:30:00Z").getDate()).toBe(11);
      const day = new Date(2026, 10, 10);
      expect(toCalendarDate(day)).toBe(day);
    });
  });

  it("starts today at Turkey's midnight", () => {
    inTimeZone(zone, () => {
      const today = startOfTurkishDay(new Date("2026-11-10T21:30:00Z"));
      expect([today.getDate(), today.getHours(), today.getMinutes()]).toEqual([
        11, 0, 0,
      ]);
      expect(fromTurkishWallClock(today).toISOString()).toBe(
        "2026-11-10T21:00:00.000Z",
      );
    });
  });
});
