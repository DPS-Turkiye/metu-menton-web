import { describe, expect, it } from "vitest";

import {
  OfficeHoursAppointmentAction,
  OfficeHoursMessageAuthor,
  OfficeHoursRequestAction,
} from "@/interfaces/academician-office-hours";
import { AppointmentStatus } from "@/interfaces/appointment";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import {
  toAcademicianAppointment,
  toAcademicianAvailability,
  toAnswerInput,
  toOfficeHoursRequest,
} from "@/lib/academician-office-hours-me";
import { academicianAvailability } from "@test/fixtures/academician-office-hours";
import {
  academicianMeeting,
  inboxRequest,
  INSTRUCTOR_QUESTION,
  requestStudent,
} from "@test/fixtures/office-hours-me";

const TIME = {
  startsAt: "2026-11-17T14:00:00+03:00",
  endsAt: "2026-11-17T14:30:00+03:00",
};

describe("toOfficeHoursRequest", () => {
  it("keeps a pending request with the backend's own actions and times", () => {
    const request = toOfficeHoursRequest(inboxRequest());

    expect(request).toMatchObject({
      id: "request-1",
      status: AppointmentStatus.Pending,
      topic: "Staj",
      note: "CV'ye bakalım",
      courseName: null,
      requestedTimes: [TIME],
      awaitingStudentReply: false,
      allowedActions: [
        OfficeHoursRequestAction.Accept,
        OfficeHoursRequestAction.Decline,
        OfficeHoursRequestAction.ProposeTimes,
      ],
    });
  });

  it("reads a question as still pending, waiting on the student, with the academician as its author", () => {
    const request = toOfficeHoursRequest(
      inboxRequest({
        status: OfficeHoursRequestStatus.MoreInfoRequested,
        messages: [INSTRUCTOR_QUESTION],
        allowedActions: [],
      }),
    );

    expect(request?.status).toBe(AppointmentStatus.Pending);
    expect(request?.awaitingStudentReply).toBe(true);
    expect(request?.messages).toEqual([
      {
        author: OfficeHoursMessageAuthor.Academician,
        body: "Hangi şirketler?",
        sentAt: "2026-11-14T10:00:00+03:00",
      },
    ]);
  });

  it("shows other times offered as waiting on the student", () => {
    expect(
      toOfficeHoursRequest(
        inboxRequest({
          status: OfficeHoursRequestStatus.CounterProposed,
          proposedTimes: [TIME],
        }),
      ),
    ).toMatchObject({
      status: AppointmentStatus.AlternativeProposed,
      proposedTimes: [TIME],
    });
  });

  it.each([
    OfficeHoursRequestStatus.Accepted,
    OfficeHoursRequestStatus.Declined,
    OfficeHoursRequestStatus.Withdrawn,
    OfficeHoursRequestStatus.Cancelled,
    OfficeHoursRequestStatus.Expired,
  ])("leaves a %s request out of the open list", (status) => {
    expect(toOfficeHoursRequest(inboxRequest({ status }))).toBeNull();
  });

  it("links the student by their Menton account, or by their office-hours id when they came only from Moodle", () => {
    expect(toOfficeHoursRequest(inboxRequest())?.student).toEqual({
      userId: "account-student-1",
      fullName: "Ayşe Yılmaz",
      title: null,
      department: "Bilgisayar Mühendisliği",
      classYear: 3,
    });
    expect(
      toOfficeHoursRequest(
        inboxRequest({ student: requestStudent({ accountId: null }) }),
      )?.student.userId,
    ).toBe("oh-student-1");
  });
});

describe("toAcademicianAppointment", () => {
  it("turns a meeting into a confirmed Randevularım row on the academician's side that they may cancel", () => {
    expect(
      toAcademicianAppointment(academicianMeeting({ courseName: "CENG 101" })),
    ).toMatchObject({
      id: "meeting-1",
      requestId: "request-1",
      status: AppointmentStatus.Confirmed,
      topic: "Staj",
      startsAt: TIME.startsAt,
      endsAt: TIME.endsAt,
      place: "A-204",
      onlineUrl: null,
      courseName: "CENG 101",
      counterpart: { userId: "account-student-1", fullName: "Ayşe Yılmaz" },
      allowedActions: [OfficeHoursAppointmentAction.Cancel],
    });
  });

  it("gives a meeting with no topic an empty one rather than null", () => {
    expect(
      toAcademicianAppointment(academicianMeeting({ topic: null })).topic,
    ).toBe("");
  });
});

describe("toAnswerInput", () => {
  it("sends an acceptance with the chosen start", () => {
    expect(
      toAnswerInput({ action: OfficeHoursRequestAction.Accept, time: TIME }),
    ).toEqual({ action: OfficeHoursRequestAction.Accept, time: TIME.startsAt });
  });

  it("sends a decline's reason, offered times' note and a question as the message", () => {
    expect(
      toAnswerInput({
        action: OfficeHoursRequestAction.Decline,
        reason: "Bu hafta yokum",
      }),
    ).toEqual({
      action: OfficeHoursRequestAction.Decline,
      message: "Bu hafta yokum",
    });
    expect(
      toAnswerInput({
        action: OfficeHoursRequestAction.ProposeTimes,
        times: [TIME],
        note: null,
      }),
    ).toEqual({
      action: OfficeHoursRequestAction.ProposeTimes,
      times: [TIME.startsAt],
      message: null,
    });
    expect(
      toAnswerInput({
        action: OfficeHoursRequestAction.AskQuestion,
        question: "Hangi ödev?",
      }),
    ).toEqual({
      action: OfficeHoursRequestAction.AskQuestion,
      message: "Hangi ödev?",
    });
  });
});

describe("toAcademicianAvailability", () => {
  it("reads the backend's HH:mm:ss times as HH:mm and adds an empty one-off list", () => {
    const { oneOffs: _ignored, ...settings } = academicianAvailability();
    const fromBackend = {
      ...settings,
      rules: settings.rules.map((rule) => ({
        ...rule,
        startTime: `${rule.startTime}:00`,
        endTime: `${rule.endTime}:00`,
      })),
    };

    const availability = toAcademicianAvailability(fromBackend);

    expect(availability.rules).toEqual(settings.rules);
    expect(availability.oneOffs).toEqual([]);
  });
});
