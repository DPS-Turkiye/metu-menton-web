import { describe, expect, it } from "vitest";

import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import {
  ALL_APPOINTMENTS,
  appointmentDay,
  appointmentHours,
  APPOINTMENTS_PAGE_SIZE,
  appointmentsQuery,
  historyTime,
  personName,
  weekRange,
} from "@/lib/program-office-hours";

describe("program office hours", () => {
  it("covers Monday to Sunday of the week, a Sunday included", () => {
    expect(weekRange(new Date(2026, 10, 13, 12))).toEqual({
      from: "2026-11-09",
      to: "2026-11-15",
    });
    expect(weekRange(new Date(2026, 10, 15, 23))).toEqual({
      from: "2026-11-09",
      to: "2026-11-15",
    });
  });

  it("reads the week in Turkey time, wherever the browser is", () => {
    // Sunday 22:30 UTC is already Monday 01:30 in Turkey.
    expect(weekRange(new Date(Date.UTC(2026, 10, 15, 22, 30)))).toEqual({
      from: "2026-11-16",
      to: "2026-11-22",
    });
  });

  it("asks for this week and leaves Tümü and an empty search out", () => {
    expect(
      appointmentsQuery(
        {
          search: "  ",
          status: ALL_APPOINTMENTS,
          faculty: ALL_APPOINTMENTS,
          thisWeek: true,
          page: 1,
        },
        new Date(2026, 10, 13),
      ),
    ).toEqual({
      status: null,
      faculty: null,
      search: null,
      from: "2026-11-09",
      to: "2026-11-15",
      page: 0,
      size: APPOINTMENTS_PAGE_SIZE,
    });
  });

  it("sends the chosen filters and the zero-based page, with no dates outside this week", () => {
    expect(
      appointmentsQuery(
        {
          search: " Ayşe ",
          status: OfficeHoursRequestStatus.Pending,
          faculty: "Mühendislik Fakültesi",
          thisWeek: false,
          page: 3,
        },
        new Date(2026, 10, 13),
      ),
    ).toEqual({
      status: OfficeHoursRequestStatus.Pending,
      faculty: "Mühendislik Fakültesi",
      search: "Ayşe",
      from: null,
      to: null,
      page: 2,
      size: APPOINTMENTS_PAGE_SIZE,
    });
  });

  it("puts the academic title before the name when there is one", () => {
    expect(
      personName({ name: "Ahmet Kaya", title: "Prof. Dr.", department: null }),
    ).toBe("Prof. Dr. Ahmet Kaya");
    expect(
      personName({ name: "Ayşe Yılmaz", title: null, department: null }),
    ).toBe("Ayşe Yılmaz");
  });

  it("writes an appointment's day, hours and history times in Turkey", () => {
    expect(appointmentDay("2026-11-13T07:30:00Z", "tr")).toBe(
      "13 Kasım 2026 Cuma",
    );
    expect(
      appointmentHours("2026-11-13T07:30:00Z", "2026-11-13T08:00:00Z", "tr"),
    ).toBe("10:30 – 11:00");
    expect(appointmentHours("2026-11-13T07:30:00Z", null, "tr")).toBe("10:30");
    expect(historyTime("2026-11-10T13:20:00Z", "tr")).toBe("10 Kas · 16:20");
  });
});
