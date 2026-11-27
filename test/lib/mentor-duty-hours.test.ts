import { describe, expect, it } from "vitest";

import { AppointmentStatus } from "@/interfaces/appointment";
import { Weekday } from "@/interfaces/mentor";
import {
  busyRanges,
  chartPlace,
  chartSpan,
  dutyMinutes,
  firstOffer,
  isInsideDuty,
  offeredMinutes,
  spanLabel,
  suggestedOffers,
} from "@/lib/mentor-duty-hours";
import { peerAppointment } from "@test/fixtures/student-appointments";

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

  it("keeps the Turkey clock hours of meetings still to come, at the time on the table", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(
      busyRanges(
        [
          // Monday 7 Jan 2030, 10:00–11:00 in Turkey.
          peerAppointment({
            startsAt: "2030-01-07T07:00:00Z",
            endsAt: "2030-01-07T08:00:00Z",
          }),
          // Moved to Wednesday 13:30–14:15 by the other side's proposal.
          peerAppointment({
            status: AppointmentStatus.AlternativeProposed,
            startsAt: "2030-01-08T07:00:00Z",
            endsAt: "2030-01-08T08:00:00Z",
            alternative: {
              startsAt: "2030-01-09T10:30:00Z",
              endsAt: "2030-01-09T11:15:00Z",
            },
          }),
          peerAppointment({
            status: AppointmentStatus.Cancelled,
            startsAt: "2030-01-10T07:00:00Z",
            endsAt: "2030-01-10T08:00:00Z",
          }),
          peerAppointment({
            startsAt: "2029-12-31T07:00:00Z",
            endsAt: "2029-12-31T08:00:00Z",
          }),
        ],
        now,
      ),
    ).toEqual([
      { day: Weekday.Monday, start: "10:00", end: "11:00" },
      { day: Weekday.Wednesday, start: "13:30", end: "14:15" },
    ]);
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

    it("never suggests the hours of a meeting already booked, and moves that share on", () => {
      const offers = suggestedOffers(
        [
          { day: Weekday.Monday, start: "10:00", end: "14:00" },
          { day: Weekday.Wednesday, start: "09:00", end: "11:00" },
        ],
        150,
        [
          { day: Weekday.Monday, start: "10:00", end: "10:45" },
          { day: Weekday.Monday, start: "12:00", end: "12:30" },
          { day: Weekday.Wednesday, start: "09:00", end: "11:00" },
        ],
      );
      // Wednesday is fully booked, so Monday's free time (10:45–12:00, 12:30–14:00) takes the whole target.
      expect(offers).toEqual([
        offered(Weekday.Monday, "10:45", "11:45"),
        offered(Weekday.Monday, "12:30", "14:00"),
      ]);
    });

    it("suggests nothing without a target, with a zero target, or without work days", () => {
      expect(suggestedOffers(threeDays, null)).toEqual([]);
      expect(suggestedOffers(threeDays, 0)).toEqual([]);
      expect(suggestedOffers([], 180)).toEqual([]);
    });
  });
});
