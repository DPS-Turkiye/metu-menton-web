import { describe, expect, it } from "vitest";

import { AppointmentStatus } from "@/interfaces/appointment";
import {
  APPOINTMENT_GRID_HOURS,
  appointmentRequestGroups,
  appointmentsOnDay,
  appointmentTabs,
  calendarTitle,
  defaultOpenGroups,
  gridPlacement,
  nowLineOffset,
  REQUEST_GROUP_PREVIEW,
  requestGroupListTab,
  requestRowTime,
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

  it("splits the requests by who answers next and keeps the tabs' other lists", () => {
    const groups = appointmentRequestGroups(tabs);
    const ids = (group: AppointmentRequestGroup) =>
      groups[group].map((item) => item.id);
    expect(ids(AppointmentRequestGroup.AwaitingYou)).toEqual(["offered"]);
    expect(ids(AppointmentRequestGroup.AwaitingThem)).toEqual(["asked"]);
    expect(ids(AppointmentRequestGroup.Confirmed)).toEqual([
      "meeting-2",
      "meeting-1",
    ]);
    expect(ids(AppointmentRequestGroup.Past)).toEqual([
      "meeting-4",
      "meeting-3",
    ]);
  });

  it("opens what waits for an answer, else the confirmed sessions, else nothing", () => {
    expect(defaultOpenGroups(appointmentRequestGroups(tabs))).toEqual([
      AppointmentRequestGroup.AwaitingYou,
      AppointmentRequestGroup.AwaitingThem,
    ]);
    const settled = appointmentRequestGroups(
      appointmentTabs(STUDENT_APPOINTMENTS, APPOINTMENTS_NOW),
    );
    expect(defaultOpenGroups(settled)).toEqual([
      AppointmentRequestGroup.Confirmed,
    ]);
    expect(
      defaultOpenGroups(
        appointmentRequestGroups(appointmentTabs([], APPOINTMENTS_NOW)),
      ),
    ).toEqual([]);
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

describe("requestRowTime", () => {
  const session = peerAppointment({
    startsAt: at(12, 11),
    endsAt: at(12, 11, 30),
  });

  it("gives the date tile and the weekday with the hours", () => {
    expect(
      requestRowTime(session, AppointmentRequestGroup.Confirmed, "tr"),
    ).toEqual({ tile: { day: "12", month: "KAS" }, when: "Per 11:00 – 11:30" });
  });

  it("gives a past row its start only", () => {
    expect(
      requestRowTime(session, AppointmentRequestGroup.Past, "tr").when,
    ).toBe("Per 11:00");
  });

  it("reads a proposal at the offered time", () => {
    const proposed = peerAppointment({
      status: AppointmentStatus.AlternativeProposed,
      startsAt: at(12, 11),
      endsAt: at(12, 11, 30),
      alternative: { startsAt: at(13, 10, 30), endsAt: at(13, 11) },
    });
    expect(
      requestRowTime(proposed, AppointmentRequestGroup.AwaitingYou, "tr"),
    ).toEqual({ tile: { day: "13", month: "KAS" }, when: "Cum 10:30 – 11:00" });
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

describe("requestGroupListTab", () => {
  it("always links Onaylanan and Geçmiş to their tabs once they hold a row", () => {
    expect(requestGroupListTab(AppointmentRequestGroup.Confirmed, 1)).toBe(
      AppointmentsTab.Upcoming,
    );
    expect(requestGroupListTab(AppointmentRequestGroup.Past, 3)).toBe(
      AppointmentsTab.Past,
    );
    expect(requestGroupListTab(AppointmentRequestGroup.Past, 0)).toBeNull();
  });

  it("links a request group to Talepler only when it overflows the panel", () => {
    expect(
      requestGroupListTab(
        AppointmentRequestGroup.AwaitingThem,
        REQUEST_GROUP_PREVIEW,
      ),
    ).toBeNull();
    expect(
      requestGroupListTab(
        AppointmentRequestGroup.AwaitingYou,
        REQUEST_GROUP_PREVIEW + 1,
      ),
    ).toBe(AppointmentsTab.Requests);
  });
});
