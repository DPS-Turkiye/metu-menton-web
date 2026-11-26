import { describe, expect, it } from "vitest";

import { AppointmentKind, AppointmentStatus } from "@/interfaces/appointment";
import type { StudentOfficeHoursSlot } from "@/interfaces/student-office-hours";
import { OFFICE_HOURS_ACADEMICIANS_SAMPLE } from "@/lib/client/fixtures/student-office-hours";
import {
  academicianName,
  ADVISOR_ACADEMICIAN_ID,
  advisorAcademician,
  askedSlot,
  bookableDay,
  canAnswerAlternative,
  canCancelOfficeHours,
  filterAcademicians,
  firstBookableWeekDay,
  freeSlots,
  offeredTimes,
  officeHoursRequestErrors,
  officeHoursWeek,
  optionsOf,
  slotsByDay,
  type OfficeHoursFilter,
} from "@/lib/student-office-hours";
import { peerAppointment } from "@test/fixtures/student-appointments";
import { STUDENT_RECORD } from "@test/fixtures/student-home";
import { BROWSER_TIME_ZONES, inTimeZone } from "@test/time-zone";

const ALL: OfficeHoursFilter = {
  query: "",
  faculty: null,
  department: null,
  availableOnly: false,
};

function slot(
  day: number,
  hour: number,
  available = true,
): StudentOfficeHoursSlot {
  return {
    startsAt: new Date(2026, 10, day, hour).toISOString(),
    endsAt: new Date(2026, 10, day, hour, 30).toISOString(),
    available,
  };
}

describe("academicianName", () => {
  it("puts the title before the name", () => {
    expect(
      academicianName({ academicTitle: "Prof. Dr.", fullName: "Ahmet Kaya" }),
    ).toBe("Prof. Dr. Ahmet Kaya");
    expect(
      academicianName({ academicTitle: null, fullName: "Ahmet Kaya" }),
    ).toBe("Ahmet Kaya");
  });
});

describe("advisorAcademician", () => {
  it("makes an Office Hours entry of the record's advisor", () => {
    expect(advisorAcademician(STUDENT_RECORD)).toMatchObject({
      id: ADVISOR_ACADEMICIAN_ID,
      fullName: "Elif Şahin",
      academicTitle: "Doç. Dr.",
      department: "Endüstri Mühendisliği",
    });
  });

  it("has none without an advisor", () => {
    expect(advisorAcademician({ ...STUDENT_RECORD, advisor: null })).toBeNull();
  });
});

describe("filterAcademicians", () => {
  const none = () => false;

  it("finds by name with Turkish case rules", () => {
    expect(
      filterAcademicians(
        OFFICE_HOURS_ACADEMICIANS_SAMPLE,
        { ...ALL, query: "ÖZTÜRK" },
        none,
      ).map((item) => item.fullName),
    ).toEqual(["Can Öztürk"]);
  });

  it("narrows by faculty and department", () => {
    const engineering = filterAcademicians(
      OFFICE_HOURS_ACADEMICIANS_SAMPLE,
      { ...ALL, faculty: "Mühendislik Fakültesi" },
      none,
    );
    expect(engineering).toHaveLength(2);
    expect(
      filterAcademicians(
        OFFICE_HOURS_ACADEMICIANS_SAMPLE,
        { ...ALL, department: "Fizik" },
        none,
      ).map((item) => item.fullName),
    ).toEqual(["Murat Koç"]);
  });

  it("keeps only those with a free slot when asked", () => {
    expect(
      filterAcademicians(
        OFFICE_HOURS_ACADEMICIANS_SAMPLE,
        { ...ALL, availableOnly: true },
        (id) => id === "sample-academician-kaya",
      ).map((item) => item.id),
    ).toEqual(["sample-academician-kaya"]);
  });
});

describe("optionsOf", () => {
  it("lists each faculty once, in Turkish order", () => {
    expect(optionsOf(OFFICE_HOURS_ACADEMICIANS_SAMPLE, "faculty")).toEqual([
      "Fen Fakültesi",
      "İktisadi ve İdari Bilimler Fakültesi",
      "Mimarlık Fakültesi",
      "Mühendislik Fakültesi",
    ]);
  });
});

describe("freeSlots", () => {
  it("keeps the free slots, earliest first", () => {
    expect(
      freeSlots([slot(12, 14), slot(10, 9, false), slot(11, 10)]).map(
        (item) => item.startsAt,
      ),
    ).toEqual([slot(11, 10).startsAt, slot(12, 14).startsAt]);
  });
});

describe("slotsByDay", () => {
  it("puts the slots under their day, in order", () => {
    const days = slotsByDay([slot(12, 14), slot(12, 15), slot(13, 11)]);
    expect(days.map(({ day }) => day.getDate())).toEqual([12, 13]);
    expect(days.map(({ slots }) => slots.length)).toEqual([2, 1]);
  });
});

describe("a time named in a link", () => {
  const firstDay = new Date(2026, 10, 9);

  it("counts only from the first bookable day on", () => {
    expect(bookableDay(slot(12, 14).startsAt, firstDay)?.getDate()).toBe(12);
    expect(bookableDay(slot(6, 14).startsAt, firstDay)).toBeNull();
    expect(bookableDay("yarın", firstDay)).toBeNull();
    expect(bookableDay(null, firstDay)).toBeNull();
  });

  it("is picked only while it is free", () => {
    const slots = [slot(12, 14), slot(12, 15, false)];
    expect(askedSlot(slots, slot(12, 14).startsAt)).toBe(slots[0]);
    expect(askedSlot(slots, slot(12, 15).startsAt)).toBeNull();
    expect(askedSlot(slots, null)).toBeNull();
  });
});

describe("officeHoursWeek", () => {
  it("lays the slots out Monday to Friday with their free counts", () => {
    const week = officeHoursWeek(
      [slot(12, 14), slot(12, 10, false), slot(10, 10)],
      new Date(2026, 10, 12),
    );
    expect(week.map((column) => column.day.getDate())).toEqual([
      9, 10, 11, 12, 13,
    ]);
    expect(week.map((column) => column.freeCount)).toEqual([0, 1, 0, 1, 0]);
    expect(week[3]?.slots.map((item) => item.available)).toEqual([false, true]);
  });
});

describe("officeHoursRequestErrors", () => {
  it("asks only for the title; the description is optional", () => {
    expect(officeHoursRequestErrors(" ")).toEqual({ title: true });
    expect(officeHoursRequestErrors("Başlık")).toBeNull();
  });
});

describe("canAnswerAlternative", () => {
  it("is only for an Office Hours request with another time proposed", () => {
    const officeHours = peerAppointment({
      kind: AppointmentKind.OfficeHours,
      status: AppointmentStatus.AlternativeProposed,
      alternative: {
        startsAt: "2026-11-25T10:00:00+03:00",
        endsAt: "2026-11-25T10:30:00+03:00",
      },
    });
    expect(canAnswerAlternative(officeHours)).toBe(true);
    expect(
      canAnswerAlternative({
        ...officeHours,
        status: AppointmentStatus.Pending,
      }),
    ).toBe(false);
    expect(
      canAnswerAlternative({
        ...officeHours,
        kind: AppointmentKind.PeerMentoring,
      }),
    ).toBe(false);
  });

  it("goes by what the backend allows once it says", () => {
    const officeHours = peerAppointment({
      kind: AppointmentKind.OfficeHours,
      status: AppointmentStatus.AlternativeProposed,
      alternative: {
        startsAt: "2026-11-25T10:00:00+03:00",
        endsAt: "2026-11-25T10:30:00+03:00",
      },
    });
    expect(
      canAnswerAlternative({ ...officeHours, canAcceptAlternative: false }),
    ).toBe(false);
    expect(
      canAnswerAlternative({
        ...officeHours,
        alternative: null,
        alternatives: [],
        canAcceptAlternative: true,
      }),
    ).toBe(false);
    expect(
      canAnswerAlternative({
        ...officeHours,
        status: AppointmentStatus.Pending,
        canAcceptAlternative: true,
      }),
    ).toBe(true);
  });
});

describe("offeredTimes", () => {
  const first = {
    startsAt: "2026-11-25T10:00:00+03:00",
    endsAt: "2026-11-25T10:30:00+03:00",
  };
  const second = {
    startsAt: "2026-11-26T11:00:00+03:00",
    endsAt: "2026-11-26T11:30:00+03:00",
  };

  it("lists every offered time, or the one the sample data carries", () => {
    expect(
      offeredTimes(
        peerAppointment({ alternative: first, alternatives: [first, second] }),
      ),
    ).toEqual([first, second]);
    expect(offeredTimes(peerAppointment({ alternative: first }))).toEqual([
      first,
    ]);
    expect(offeredTimes(peerAppointment({ alternative: null }))).toEqual([]);
  });
});

describe("firstBookableWeekDay", () => {
  it("opens on today during the week and on the coming Monday at the weekend", () => {
    expect(firstBookableWeekDay(new Date(2026, 10, 12, 15))).toEqual(
      new Date(2026, 10, 12),
    );
    expect(firstBookableWeekDay(new Date(2026, 10, 14, 9))).toEqual(
      new Date(2026, 10, 16),
    );
    expect(firstBookableWeekDay(new Date(2026, 10, 15, 9))).toEqual(
      new Date(2026, 10, 16),
    );
  });
});

describe("canCancelOfficeHours", () => {
  const now = new Date("2026-11-24T09:00:00+03:00");
  const booked = peerAppointment({
    kind: AppointmentKind.OfficeHours,
    status: AppointmentStatus.Confirmed,
    startsAt: "2026-11-24T14:00:00+03:00",
    endsAt: "2026-11-24T14:30:00+03:00",
    canCancel: true,
  });

  it("is for an Office Hours meeting the backend lets the student call off, while it is ahead", () => {
    expect(canCancelOfficeHours(booked, now)).toBe(true);
    expect(
      canCancelOfficeHours(booked, new Date("2026-11-24T14:00:00+03:00")),
    ).toBe(false);
  });

  it("is never offered without the backend's say, nor for a peer session", () => {
    expect(canCancelOfficeHours({ ...booked, canCancel: false }, now)).toBe(
      false,
    );
    const { canCancel: _unused, ...unsaid } = booked;
    expect(canCancelOfficeHours(unsaid, now)).toBe(false);
    expect(
      canCancelOfficeHours(
        { ...booked, kind: AppointmentKind.PeerMentoring },
        now,
      ),
    ).toBe(false);
  });
});

describe.each(BROWSER_TIME_ZONES)("booking days in a browser in %s", (zone) => {
  // 00:30 in Istanbul on Friday the 13th is still Thursday the 12th in UTC and London.
  const afterMidnight: StudentOfficeHoursSlot = {
    startsAt: "2026-11-13T00:30:00+03:00",
    endsAt: "2026-11-13T01:00:00+03:00",
    available: true,
  };

  it("puts a slot under its Turkey day", () => {
    inTimeZone(zone, () => {
      expect(
        slotsByDay([afterMidnight]).map(({ day }) => day.getDate()),
      ).toEqual([13]);
      const week = officeHoursWeek([afterMidnight], new Date(2026, 10, 12));
      expect(week.map((column) => column.freeCount)).toEqual([0, 0, 0, 0, 1]);
    });
  });

  it("opens the week on Turkey's today", () => {
    inTimeZone(zone, () => {
      // Friday 22:30 UTC is already Saturday in Istanbul, so booking opens on Monday the 16th.
      const first = firstBookableWeekDay(new Date("2026-11-13T22:30:00Z"));
      expect([first.getDate(), first.getHours()]).toEqual([16, 0]);
    });
  });
});
