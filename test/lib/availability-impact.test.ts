import { describe, expect, it } from "vitest";

import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import { affectedItems, isUnaffected } from "@/lib/availability-impact";

const TIME = {
  startsAt: "2026-11-17T14:00:00+03:00",
  endsAt: "2026-11-17T14:30:00+03:00",
};

const impact = {
  meetings: [
    {
      requestId: "booked",
      status: OfficeHoursRequestStatus.Accepted,
      time: TIME,
      studentName: "Ali Kaya",
      topic: "Staj",
      courseName: null,
    },
  ],
  requests: [
    {
      requestId: "offered",
      status: OfficeHoursRequestStatus.CounterProposed,
      studentName: null,
      topic: "Proje",
      courseName: "CENG 111",
      lostTimes: [TIME],
      keptTimes: [],
    },
  ],
};

describe("availability impact", () => {
  it("needs no review when nothing is left outside the hours", () => {
    expect(isUnaffected({ meetings: [], requests: [] })).toBe(true);
    expect(isUnaffected(impact)).toBe(false);
    expect(isUnaffected({ meetings: [], requests: impact.requests })).toBe(
      false,
    );
  });

  it("sends back each item the academician saw with the status it had", () => {
    expect(affectedItems(impact)).toEqual([
      { requestId: "booked", status: OfficeHoursRequestStatus.Accepted },
      {
        requestId: "offered",
        status: OfficeHoursRequestStatus.CounterProposed,
      },
    ]);
  });
});
