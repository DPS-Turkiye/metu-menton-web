import { describe, expect, it } from "vitest";

import {
  CoordinatorAgendaKind,
  type CoordinatorAgendaItem,
  type CoordinatorNextMeeting,
} from "@/interfaces/coordinator-overview";
import {
  agendaForToday,
  agendaWhen,
  hasOpenActions,
  meetingSlotLabel,
  type CoordinatorHomeTexts,
} from "@/lib/coordinator-home";
import { BROWSER_TIME_ZONES, inTimeZone } from "@test/time-zone";
import { translatorIn } from "@test/translators";

function texts(locale: "tr" | "en"): CoordinatorHomeTexts {
  return {
    t: translatorIn(locale, "coordinatorHome"),
    locale,
  };
}

const now = new Date(2026, 8, 24, 10, 0);

function item(at: Date, allDay = false): CoordinatorAgendaItem {
  return {
    kind: CoordinatorAgendaKind.Event,
    title: "Atölye",
    subtitle: null,
    at: at.toISOString(),
    allDay,
  };
}

describe("coordinator home helpers", () => {
  it("keeps only today's agenda items", () => {
    const today = item(new Date(2026, 8, 24, 16, 0));
    const later = item(new Date(2026, 8, 26, 9, 0));
    expect(agendaForToday([today, later], now)).toEqual([today]);
  });

  it("labels today and other days, and hides the time of a due date", () => {
    expect(
      agendaWhen(item(new Date(2026, 8, 24, 16, 0)), texts("tr"), now),
    ).toEqual({ day: "Bugün", time: "16:00" });
    expect(
      agendaWhen(item(new Date(2026, 8, 26, 0, 0), true), texts("tr"), now),
    ).toEqual({ day: "26 Eyl", time: "Gün içinde" });
    expect(
      agendaWhen(item(new Date(2026, 8, 26, 0, 0), true), texts("en"), now),
    ).toEqual({ day: "Sep 26", time: "During the day" });
  });

  it("describes the next meeting's slot", () => {
    const meeting: CoordinatorNextMeeting = {
      meetingId: "meeting-1",
      title: "Finansal model",
      scheduledAt: new Date(2026, 8, 25, 14, 0).toISOString(),
      durationMinutes: 60,
      meetLink: null,
      sequence: 1,
      mentorId: "mentor-1",
      mentorName: "Ahmet Can",
      mentorTitle: null,
      organizationId: "org-1",
      organizationName: "Nova Robotics",
      founderName: null,
    };
    expect(meetingSlotLabel(meeting, "tr", now)).toBe("Yarın · 14:00–15:00");
    expect(meetingSlotLabel(meeting, "en", now)).toMatch(
      /^Tomorrow · 2:00\s–\s3:00\sPM$/,
    );
  });

  it("knows whether anything needs a decision", () => {
    expect(
      hasOpenActions({
        pendingMentors: [],
        awaitingTeams: [],
        missingNotes: [],
      }),
    ).toBe(false);
    expect(
      hasOpenActions({
        pendingMentors: [],
        awaitingTeams: [{}],
        missingNotes: [],
      }),
    ).toBe(true);
  });
});

describe.each(BROWSER_TIME_ZONES)(
  "coordinator home in a browser in %s",
  (zone) => {
    it("calls a meeting just after midnight in Turkey today's, at its Turkey time", () => {
      inTimeZone(zone, () => {
        // 00:30 on the 25th in Istanbul is still the 24th in UTC and London.
        const now = new Date("2026-09-24T22:00:00Z");
        const meeting: CoordinatorNextMeeting = {
          meetingId: "meeting-1",
          title: "Finansal model",
          scheduledAt: "2026-09-24T21:30:00Z",
          durationMinutes: 30,
          meetLink: null,
          sequence: 1,
          mentorId: "mentor-1",
          mentorName: "Ahmet Can",
          mentorTitle: null,
          organizationId: "org-1",
          organizationName: "Nova Robotics",
          founderName: null,
        };
        expect(meetingSlotLabel(meeting, "tr", now)).toBe(
          "Bugün · 00:30–01:00",
        );
      });
    });
  },
);
