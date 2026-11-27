import { describe, expect, it } from "vitest";

import { Weekday } from "@/interfaces/mentor";
import {
  chartPlace,
  chartSpan,
  dutyMinutes,
  firstOffer,
  isInsideDuty,
  offeredMinutes,
  spanLabel,
  suggestedOffers,
} from "@/lib/mentor-duty-hours";

const duty = [
  { day: Weekday.Monday, start: "10:00", end: "14:00" },
  { day: Weekday.Wednesday, start: "14:00", end: "17:30" },
  { day: Weekday.Wednesday, start: "09:00", end: "13:00" },
  { day: Weekday.Thursday, start: "13:00", end: "16:30" },
  { day: Weekday.Thursday, start: "09:00", end: "13:00" },
];
const offer = (dayOfWeek: Weekday, startTime: string, endTime: string) => ({
  key: `${dayOfWeek}-${startTime}`,
  dayOfWeek,
  startTime,
  endTime,
});

describe("mentor duty hours", () => {
  it("keeps mentoring inside one day's work hours, across ranges that touch", () => {
    const inside = (day: Weekday, start: string, end: string) =>
      isInsideDuty(duty, offer(day, start, end));
    expect(inside(Weekday.Monday, "12:00", "14:00")).toBe(true);
    expect(inside(Weekday.Monday, "13:00", "14:30")).toBe(false);
    expect(inside(Weekday.Wednesday, "12:00", "15:00")).toBe(false);
    expect(inside(Weekday.Thursday, "12:00", "15:00")).toBe(true);
    expect(inside(Weekday.Friday, "10:00", "11:00")).toBe(false);
    expect(inside(Weekday.Friday, "", "11:00")).toBe(true);
  });

  it("adds up the work and offered time", () => {
    expect(dutyMinutes(duty, Weekday.Wednesday)).toBe(450);
    expect(dutyMinutes(duty, Weekday.Friday)).toBe(0);
    expect(
      offeredMinutes([
        offer(Weekday.Monday, "12:00", "14:00"),
        offer(Weekday.Monday, "15:00", "14:00"),
        offer(Weekday.Monday, "", "14:00"),
      ]),
    ).toBe(120);
  });

  it("starts a new offer at the day's first work range, two hours at most", () => {
    expect(firstOffer(duty, Weekday.Wednesday)).toEqual({
      startTime: "09:00",
      endTime: "11:00",
    });
    expect(
      firstOffer(
        [{ day: Weekday.Monday, start: "10:00", end: "11:30" }],
        Weekday.Monday,
      ),
    ).toEqual({ startTime: "10:00", endTime: "11:30" });
    expect(firstOffer(duty, Weekday.Friday)).toBeNull();
  });

  it("spans 08:00 – 18:00, wider for an earlier or later range", () => {
    expect(spanLabel(chartSpan(duty, []))).toEqual({
      start: "08:00",
      end: "18:00",
    });
    expect(
      spanLabel(chartSpan(duty, [offer(Weekday.Monday, "07:30", "19:15")])),
    ).toEqual({ start: "07:00", end: "20:00" });
    expect(chartPlace(chartSpan(duty, []), "13:00", "14:00")).toEqual({
      left: 50,
      width: 10,
    });
    expect(chartPlace(chartSpan(duty, []), "14:00", "13:00").width).toBe(0);
  });

  describe("suggested mentoring hours", () => {
    const threeDays = [
      { day: Weekday.Wednesday, start: "09:00", end: "16:30" },
      { day: Weekday.Monday, start: "09:00", end: "16:30" },
      { day: Weekday.Friday, start: "10:00", end: "17:30" },
    ];
    const offered = (day: Weekday, startTime: string, endTime: string) => ({
      dayOfWeek: day,
      startTime,
      endTime,
    });

    it("shares the weekly target evenly over the work days, from where each day's work starts", () => {
      expect(suggestedOffers(threeDays, 180)).toEqual([
        offered(Weekday.Monday, "09:00", "10:00"),
        offered(Weekday.Wednesday, "09:00", "10:00"),
        offered(Weekday.Friday, "10:00", "11:00"),
      ]);
    });

    it("gives the leftover half hours to the earlier days and adds up to the target", () => {
      const offers = suggestedOffers(threeDays, 240);
      expect(offers).toEqual([
        offered(Weekday.Monday, "09:00", "10:30"),
        offered(Weekday.Wednesday, "09:00", "10:30"),
        offered(Weekday.Friday, "10:00", "11:00"),
      ]);
      expect(offeredMinutes(offers)).toBe(240);
    });

    it("moves a share a day cannot hold to the days with room, across a day's work ranges", () => {
      const short = [
        { day: Weekday.Monday, start: "10:00", end: "11:00" },
        { day: Weekday.Tuesday, start: "09:00", end: "10:00" },
        { day: Weekday.Tuesday, start: "13:00", end: "17:00" },
      ];
      const offers = suggestedOffers(short, 240);
      expect(offers).toEqual([
        offered(Weekday.Monday, "10:00", "11:00"),
        offered(Weekday.Tuesday, "09:00", "10:00"),
        offered(Weekday.Tuesday, "13:00", "15:00"),
      ]);
      expect(offers.every((range) => isInsideDuty(short, range))).toBe(true);
      expect(offeredMinutes(offers)).toBe(240);
    });

    it("suggests nothing without a target, with a zero target, or without work days", () => {
      expect(suggestedOffers(threeDays, null)).toEqual([]);
      expect(suggestedOffers(threeDays, 0)).toEqual([]);
      expect(suggestedOffers([], 180)).toEqual([]);
    });
  });
});
