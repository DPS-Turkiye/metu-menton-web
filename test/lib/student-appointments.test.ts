import { describe, expect, it } from "vitest";

import { AppointmentStatus } from "@/interfaces/appointment";
import {
  APPOINTMENT_GRID_HOURS,
  appointmentRequestGroups,
  appointmentsInMonth,
  appointmentsOnDay,
  appointmentTabs,
  calendarSummary,
  calendarTitle,
  gridPlacement,
  nowLineOffset,
  selectedDayTitle,
  sentToParam,
  shiftAnchor,
  shortPersonName,
  visibleDays,
  wasHeld,
} from "@/lib/student-appointments";
import {
  AppointmentRequestGroup,
  AppointmentsTab,
  AppointmentsView,
} from "@/types/student-appointments";
import {
  APPOINTMENTS_NOW,
  peerAppointment,
  STUDENT_APPOINTMENTS,
} from "@test/fixtures/student-appointments";

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString();

describe("calendarSummary", () => {
  it("counts a month's confirmed sessions, those held, and open requests", () => {
    const item = (id: string, day: number, status: AppointmentStatus) =>
      peerAppointment({
        id,
        status,
        startsAt: at(day, 10),
        endsAt: at(day, 11),
      });
    const summary = calendarSummary(
      appointmentsInMonth(
        [
          item("held", 3, AppointmentStatus.Confirmed),
          item("ahead", 20, AppointmentStatus.Confirmed),
          item("waiting", 21, AppointmentStatus.Pending),
          item("lapsed", 4, AppointmentStatus.Pending),
          item("cancelled", 22, AppointmentStatus.Cancelled),
          peerAppointment({
            id: "other-month",
            status: AppointmentStatus.Confirmed,
            startsAt: new Date(2026, 11, 3, 10).toISOString(),
            endsAt: new Date(2026, 11, 3, 11).toISOString(),
          }),
        ],
        new Date(2026, 10, 1),
      ),
      new Date(2026, 10, 12),
    );
    expect(summary).toEqual({ meetings: 2, done: 1, waiting: 1 });
  });
});

describe("appointmentTabs", () => {
  it("splits confirmed sessions ahead, requests ahead and the rest", () => {
    const request = peerAppointment({
      id: "request",
      status: AppointmentStatus.AlternativeProposed,
      startsAt: "2026-11-14T08:00:00.000Z",
      endsAt: "2026-11-14T08:30:00.000Z",
    });
    const tabs = appointmentTabs(
      [...STUDENT_APPOINTMENTS, request],
      APPOINTMENTS_NOW,
    );
    expect(tabs[AppointmentsTab.Upcoming].map((item) => item.id)).toEqual([
      "meeting-2",
      "meeting-1",
    ]);
    expect(tabs[AppointmentsTab.Requests].map((item) => item.id)).toEqual([
      "request",
    ]);
    expect(tabs[AppointmentsTab.Past].map((item) => item.id)).toEqual([
      "meeting-4",
      "meeting-3",
    ]);
  });
});

describe("appointmentsOnDay", () => {
  it("keeps one day's sessions, earliest first", () => {
    const late = peerAppointment({
      id: "late",
      startsAt: at(12, 16),
      endsAt: at(12, 17),
    });
    const early = peerAppointment({
      id: "early",
      startsAt: at(12, 9),
      endsAt: at(12, 10),
    });
    const other = peerAppointment({
      id: "other",
      startsAt: at(13, 9),
      endsAt: at(13, 10),
    });
    expect(
      appointmentsOnDay([late, other, early], new Date(2026, 10, 12)).map(
        (item) => item.id,
      ),
    ).toEqual(["early", "late"]);
  });
});

describe("gridPlacement", () => {
  it("places a session by its hours from the first row", () => {
    expect(
      gridPlacement(
        peerAppointment({ startsAt: at(12, 10, 30), endsAt: at(12, 11, 30) }),
      ),
    ).toEqual({ top: 1.5, height: 1 });
  });

  it("gives a short session half an hour so it stays clickable", () => {
    expect(
      gridPlacement(
        peerAppointment({ startsAt: at(12, 10), endsAt: at(12, 10, 10) }),
      ),
    ).toEqual({ top: 1, height: 0.5 });
  });

  it("pins sessions outside the grid's hours to its first or last row", () => {
    expect(
      gridPlacement(
        peerAppointment({ startsAt: at(12, 7), endsAt: at(12, 8) }),
      ),
    ).toEqual({ top: 0, height: 0.5 });
    const late = gridPlacement(
      peerAppointment({ startsAt: at(12, 20), endsAt: at(12, 21) }),
    );
    expect(late).toEqual({
      top: APPOINTMENT_GRID_HOURS.length - 0.5,
      height: 0.5,
    });
  });
});

describe("visibleDays", () => {
  const anchor = new Date(2026, 10, 12, 15);

  it("shows the anchor day alone, or its whole week from Monday", () => {
    expect(visibleDays(AppointmentsView.Day, anchor)).toEqual([
      new Date(2026, 10, 12),
    ]);
    const week = visibleDays(AppointmentsView.Week, anchor);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual(new Date(2026, 10, 9));
  });

  it("puts nothing on the time grid for the list and month views", () => {
    expect(visibleDays(AppointmentsView.List, anchor)).toEqual([]);
    expect(visibleDays(AppointmentsView.Month, anchor)).toEqual([]);
  });
});

describe("shiftAnchor", () => {
  const anchor = new Date(2026, 10, 30, 15);

  it("steps a day, a week or a month", () => {
    expect(shiftAnchor(AppointmentsView.Day, anchor, 1)).toEqual(
      new Date(2026, 11, 1),
    );
    expect(shiftAnchor(AppointmentsView.Week, anchor, -1)).toEqual(
      new Date(2026, 10, 23),
    );
    expect(shiftAnchor(AppointmentsView.Month, anchor, 1)).toEqual(
      new Date(2026, 11, 1),
    );
    expect(shiftAnchor(AppointmentsView.List, anchor, 1)).toEqual(
      new Date(2026, 10, 30),
    );
  });
});

describe("calendarTitle", () => {
  const anchor = new Date(2026, 10, 13);

  it("names the day, the week or the month", () => {
    expect(calendarTitle(AppointmentsView.Day, anchor, "tr")).toBe(
      "13 Kasım 2026, Cuma",
    );
    expect(calendarTitle(AppointmentsView.Week, anchor, "tr")).toBe(
      "9 – 15 Kasım 2026",
    );
    expect(calendarTitle(AppointmentsView.Month, anchor, "tr")).toBe(
      "Kasım 2026",
    );
  });
});

describe("shortPersonName", () => {
  it("shortens the first name to an initial", () => {
    expect(shortPersonName("Elif Karaca")).toBe("E. Karaca");
    expect(shortPersonName("Ayşe Nur Yılmaz")).toBe("A. Yılmaz");
    expect(shortPersonName("Cher")).toBe("Cher");
  });
});

describe("sentToParam", () => {
  it("reads ?sent= once, repeated or missing", () => {
    expect(sentToParam("  Prof. Dr. Ahmet Kaya ")).toBe("Prof. Dr. Ahmet Kaya");
    expect(sentToParam(["", " ", "Doç. Dr. Elif Şahin", "x"])).toBe(
      "Doç. Dr. Elif Şahin",
    );
    expect(sentToParam("   ")).toBeNull();
    expect(sentToParam([])).toBeNull();
    expect(sentToParam(undefined)).toBeNull();
  });
});

describe("an alternative time on the calendar", () => {
  const proposed = peerAppointment({
    id: "proposed",
    status: AppointmentStatus.AlternativeProposed,
    startsAt: at(12, 11),
    endsAt: at(12, 11, 30),
    alternative: { startsAt: at(13, 10, 30), endsAt: at(13, 11) },
  });

  it("sits on the offered day and hours, not the requested ones", () => {
    expect(appointmentsOnDay([proposed], new Date(2026, 10, 12))).toEqual([]);
    expect(appointmentsOnDay([proposed], new Date(2026, 10, 13))).toEqual([
      proposed,
    ]);
    expect(gridPlacement(proposed)).toEqual({ top: 1.5, height: 0.5 });
  });
});

describe("appointmentRequestGroups", () => {
  const tabs = appointmentTabs(
    [
      ...STUDENT_APPOINTMENTS,
      peerAppointment({
        id: "offered",
        status: AppointmentStatus.AlternativeProposed,
        startsAt: at(13, 10),
        endsAt: at(13, 11),
      }),
      peerAppointment({
        id: "asked",
        status: AppointmentStatus.Pending,
        startsAt: at(14, 10),
        endsAt: at(14, 11),
      }),
    ],
    APPOINTMENTS_NOW,
  );

  it("splits the requests by who answers next", () => {
    const groups = appointmentRequestGroups(tabs[AppointmentsTab.Requests]);
    const ids = (group: AppointmentRequestGroup) =>
      groups[group].map((item) => item.id);
    expect(ids(AppointmentRequestGroup.AwaitingYou)).toEqual(["offered"]);
    expect(ids(AppointmentRequestGroup.AwaitingThem)).toEqual(["asked"]);
  });
});

describe("nowLineOffset", () => {
  const day = new Date(2026, 10, 13);

  it("places the line by the hours since the grid's first row", () => {
    expect(nowLineOffset(new Date(2026, 10, 13, 12, 18), day)).toBeCloseTo(3.3);
    expect(nowLineOffset(new Date(2026, 10, 13, 9), day)).toBe(0);
  });

  it("leaves the line out on another day or off the grid's hours", () => {
    expect(nowLineOffset(new Date(2026, 10, 12, 12), day)).toBeNull();
    expect(nowLineOffset(new Date(2026, 10, 13, 8, 59), day)).toBeNull();
    expect(nowLineOffset(new Date(2026, 10, 13, 19, 1), day)).toBeNull();
    expect(nowLineOffset(new Date(2026, 10, 13, 12), day, [])).toBeNull();
  });
});

describe("selectedDayTitle", () => {
  it("names the day with its weekday", () => {
    expect(selectedDayTitle(new Date(2026, 10, 13), "tr")).toBe(
      "13 Kasım, Cuma",
    );
  });
});

describe("wasHeld", () => {
  it("counts a confirmed past session as held and nothing else", () => {
    expect(wasHeld(peerAppointment())).toBe(true);
    expect(
      wasHeld(peerAppointment({ status: AppointmentStatus.Cancelled })),
    ).toBe(false);
  });
});
