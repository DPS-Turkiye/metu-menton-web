import { OfficeHoursRequestAction } from "@/interfaces/academician-office-hours";
import {
  OfficeHoursRequestStatus,
  OfficeHoursRole,
} from "@/interfaces/office-hours";
import type {
  OfficeHoursAcademicianMeeting,
  OfficeHoursInboxRequest,
  OfficeHoursProfile,
  OfficeHoursRequestStudent,
} from "@/interfaces/office-hours-me";

/** A Menton student with an account, as the academician's inbox names them. */
export function requestStudent(
  overrides: Partial<OfficeHoursRequestStudent> = {},
): OfficeHoursRequestStudent {
  return {
    id: "oh-student-1",
    accountId: "account-student-1",
    fullName: "Ayşe Yılmaz",
    department: "Bilgisayar Mühendisliği",
    classYear: 3,
    ...overrides,
  };
}

/** A request from Menton waiting on the academician, at Tuesday 17 November 2026, 14:00 in Turkey. */
export function inboxRequest(
  overrides: Partial<OfficeHoursInboxRequest> = {},
): OfficeHoursInboxRequest {
  return {
    id: "request-1",
    status: OfficeHoursRequestStatus.Pending,
    student: requestStudent(),
    topic: "Staj",
    note: "CV'ye bakalım",
    courseName: null,
    requestedTimes: [
      {
        startsAt: "2026-11-17T14:00:00+03:00",
        endsAt: "2026-11-17T14:30:00+03:00",
      },
    ],
    proposedTimes: [],
    messages: [],
    meeting: null,
    rejectionReason: null,
    requestedAt: "2026-11-14T09:00:00+03:00",
    allowedActions: [
      OfficeHoursRequestAction.Accept,
      OfficeHoursRequestAction.Decline,
      OfficeHoursRequestAction.ProposeTimes,
    ],
    cancellation: null,
    ...overrides,
  };
}

/** A booked meeting on the academician's calendar. */
export function academicianMeeting(
  overrides: Partial<OfficeHoursAcademicianMeeting> = {},
): OfficeHoursAcademicianMeeting {
  return {
    id: "meeting-1",
    requestId: "request-1",
    startsAt: "2026-11-17T14:00:00+03:00",
    endsAt: "2026-11-17T14:30:00+03:00",
    student: requestStudent(),
    topic: "Staj",
    courseName: null,
    place: "A-204",
    onlineLink: null,
    ...overrides,
  };
}

export function officeHoursProfile(
  overrides: Partial<OfficeHoursProfile> = {},
): OfficeHoursProfile {
  return {
    listed: true,
    defaultPlace: "A-204",
    onlineLink: "https://meet.example.com/abc",
    contactEmail: null,
    details: {
      about: null,
      topics: [],
      courses: [],
      expertise: [],
      responseDays: null,
    },
    emails: { newRequest: true, cancellation: true },
    ...overrides,
  };
}

export const INSTRUCTOR_QUESTION = {
  author: OfficeHoursRole.Instructor,
  body: "Hangi şirketler?",
  sentAt: "2026-11-14T10:00:00+03:00",
};
