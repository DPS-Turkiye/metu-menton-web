import {
  OfficeHoursMessageAuthor,
  OfficeHoursRequestAction,
  type AcademicianAppointment,
  type AcademicianAvailability,
  type OfficeHoursAnswer,
  type OfficeHoursMessage,
  type OfficeHoursRequest,
  type OfficeHoursStudent,
} from "@/interfaces/academician-office-hours";
import {
  AppointmentKind,
  AppointmentSide,
  AppointmentStatus,
} from "@/interfaces/appointment";
import type { MentorAvailabilitySettings } from "@/interfaces/mentor";
import {
  OfficeHoursRequestStatus,
  OfficeHoursRole,
} from "@/interfaces/office-hours";
import type {
  OfficeHoursAcademicianMeeting,
  OfficeHoursAnswerInput,
  OfficeHoursInboxMessage,
  OfficeHoursInboxRequest,
  OfficeHoursRequestStudent,
} from "@/interfaces/office-hours-me";

// How the academician's screens read the backend's /api/office-hours/me shapes, and how their answers go back.

/** The requests still waiting on someone; an answered one leaves the list and shows up as a meeting instead. */
const OPEN_STATUS: Partial<
  Record<OfficeHoursRequestStatus, AppointmentStatus>
> = {
  [OfficeHoursRequestStatus.Pending]: AppointmentStatus.Pending,
  [OfficeHoursRequestStatus.MoreInfoRequested]: AppointmentStatus.Pending,
  [OfficeHoursRequestStatus.CounterProposed]:
    AppointmentStatus.AlternativeProposed,
};

const MESSAGE_AUTHOR: Record<OfficeHoursRole, OfficeHoursMessageAuthor> = {
  [OfficeHoursRole.Instructor]: OfficeHoursMessageAuthor.Academician,
  [OfficeHoursRole.Student]: OfficeHoursMessageAuthor.Student,
};

/**
 * The student as the screens link them: by their Menton account when they have one (the student profile and the
 * advisee list use it), otherwise by their office-hours id for someone who came in only through Moodle.
 */
export function toStudent(
  student: OfficeHoursRequestStudent,
): OfficeHoursStudent {
  return {
    userId: student.accountId ?? student.id,
    fullName: student.fullName,
    title: null,
    department: student.department,
    classYear: student.classYear,
  };
}

export function toMessage(
  message: OfficeHoursInboxMessage,
): OfficeHoursMessage {
  return {
    author: MESSAGE_AUTHOR[message.author],
    body: message.body,
    sentAt: message.sentAt,
  };
}

/** An open request in the screens' shape; null once it is answered, declined, withdrawn or expired. */
export function toOfficeHoursRequest(
  request: OfficeHoursInboxRequest,
): OfficeHoursRequest | null {
  const status = OPEN_STATUS[request.status];
  if (status === undefined) return null;
  return {
    id: request.id,
    status,
    student: toStudent(request.student),
    topic: request.topic,
    note: request.note,
    courseName: request.courseName,
    requestedTimes: request.requestedTimes,
    proposedTimes: request.proposedTimes,
    messages: request.messages.map(toMessage),
    awaitingStudentReply:
      request.status === OfficeHoursRequestStatus.MoreInfoRequested,
    requestedAt: request.requestedAt,
    allowedActions: request.allowedActions,
  };
}

/** A booked meeting as a row of Randevularım; it offers no cancel until cancelling has its backend (G2). */
export function toAcademicianAppointment(
  meeting: OfficeHoursAcademicianMeeting,
): AcademicianAppointment {
  return {
    id: meeting.id,
    requestId: null,
    kind: AppointmentKind.OfficeHours,
    side: AppointmentSide.Mentor,
    status: AppointmentStatus.Confirmed,
    category: null,
    topic: meeting.topic ?? "",
    counterpart: toStudent(meeting.student),
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    place: meeting.place,
    onlineUrl: meeting.onlineLink,
    alternative: null,
    rejectReason: null,
    courseName: meeting.courseName,
    lateCancel: false,
    allowedActions: [],
  };
}

/** The screens' answer in the backend's words; `message` carries the reason, the note or the question. */
export function toAnswerInput(
  answer: OfficeHoursAnswer,
): OfficeHoursAnswerInput {
  switch (answer.action) {
    case OfficeHoursRequestAction.Accept:
      return { action: answer.action, time: answer.time.startsAt };
    case OfficeHoursRequestAction.Decline:
      return { action: answer.action, message: answer.reason };
    case OfficeHoursRequestAction.ProposeTimes:
      return {
        action: answer.action,
        times: answer.times.map((time) => time.startsAt),
        message: answer.note,
      };
    case OfficeHoursRequestAction.AskQuestion:
      return { action: answer.action, message: answer.question };
  }
}

export function withNoOneOffs(
  settings: MentorAvailabilitySettings,
): AcademicianAvailability {
  return { ...settings, oneOffs: [] };
}
