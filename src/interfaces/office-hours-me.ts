import type { OfficeHoursRequestAction } from "@/interfaces/academician-office-hours";
import type {
  OfficeHoursRequestStatus,
  OfficeHoursRole,
} from "@/interfaces/office-hours";

/**
 * Office hours for a Menton account signed in through ODTÜ (backend `/api/office-hours/me`), with no Moodle launch.
 * These are the backend's shapes; the screens' own types are filled from them in `lib/client`.
 */

/** A time range; both ends are ISO times with Turkey's offset ("2026-11-24T14:00:00+03:00"). */
export type OfficeHoursTimeRange = {
  startsAt: string;
  endsAt: string;
};

/** What the student may still do with their request; the academician's answers are `OfficeHoursRequestAction`. */
export enum OfficeHoursStudentAction {
  AcceptProposed = "ACCEPT_PROPOSED",
  Withdraw = "WITHDRAW",
  Reply = "REPLY",
  /** Call off the booked meeting before it starts; the student never owes a reason. */
  Cancel = "CANCEL",
}

/**
 * The student behind a request, as only the academician it was sent to sees them: `id` is always their
 * office-hours id; `accountId` their Menton account, or null for a student who came in only through Moodle.
 */
export type OfficeHoursRequestStudent = {
  id: string;
  accountId: string | null;
  fullName: string;
  department: string | null;
  classYear: number | null;
};

export type OfficeHoursInboxMessage = {
  author: OfficeHoursRole;
  body: string;
  sentAt: string;
};

/** Which side called a meeting off, why, when, and whether it was close to its start (FR-OH-14). */
export type OfficeHoursCancellation = {
  cancelledBy: OfficeHoursRole;
  reason: string | null;
  cancelledAt: string;
  late: boolean;
};

/** A request in the academician's inbox, from Menton (`courseName` null) or from a Moodle course. */
export type OfficeHoursInboxRequest = {
  id: string;
  status: OfficeHoursRequestStatus;
  student: OfficeHoursRequestStudent;
  topic: string;
  note: string | null;
  courseName: string | null;
  requestedTimes: OfficeHoursTimeRange[];
  proposedTimes: OfficeHoursTimeRange[];
  messages: OfficeHoursInboxMessage[];
  meeting: OfficeHoursTimeRange | null;
  rejectionReason: string | null;
  requestedAt: string;
  allowedActions: OfficeHoursRequestAction[];
  /** Set only on a cancelled request. */
  cancellation: OfficeHoursCancellation | null;
};

/** The academician's answer; `message` is the reason, the note with the offered times, or the question. */
export type OfficeHoursAnswerInput = {
  action: OfficeHoursRequestAction;
  time?: string | undefined;
  times?: string[] | undefined;
  message?: string | null | undefined;
};

export type OfficeHoursAcademicianMeeting = {
  id: string;
  requestId: string;
  startsAt: string;
  endsAt: string;
  student: OfficeHoursRequestStudent;
  topic: string | null;
  courseName: string | null;
  place: string | null;
  onlineLink: string | null;
};

/** The backend's limits for the academician's page (V137); the BFF schema and the editor both follow them. */
export const OFFICE_HOURS_PROFILE_LIMITS = {
  about: 1000,
  topics: 6,
  topicTitle: 80,
  topicBody: 300,
  courses: 10,
  courseCode: 20,
  courseName: 120,
  tags: 5,
  tag: 40,
  responseDays: 14,
} as const;

export type OfficeHoursTopic = { title: string; body: string | null };

export type OfficeHoursCourse = { code: string; name: string };

/** What students read on the academician's page (FR-OH-28); plain text, lists in the academician's order. */
export type OfficeHoursProfileDetails = {
  about: string | null;
  topics: OfficeHoursTopic[];
  courses: OfficeHoursCourse[];
  expertise: string[];
  /** How many days they usually take to answer a request. */
  responseDays: number | null;
};

/** The academician's own Office Hours e-mails; reminders always go. */
export type OfficeHoursProfileEmails = {
  newRequest: boolean;
  cancellation: boolean;
};

/** Whether students see the academician (`listed`, off by default), where and how to meet them, and their page. */
export type OfficeHoursProfile = {
  listed: boolean;
  defaultPlace: string | null;
  onlineLink: string | null;
  contactEmail: string | null;
  details: OfficeHoursProfileDetails;
  emails: OfficeHoursProfileEmails;
};

/** A profile save; a group left out is kept as saved on the backend, so older callers can't wipe it. */
export type UpdateOfficeHoursProfilePayload = Omit<
  OfficeHoursProfile,
  "details" | "emails"
> & {
  details?: OfficeHoursProfileDetails | undefined;
  emails?: OfficeHoursProfileEmails | undefined;
};

/**
 * A listed academician as a student browses them; `accountId` tells the student's advisor apart. Where to meet and
 * the online link come only on the student's own request, once it is a meeting.
 */
export type OfficeHoursListedAcademician = {
  id: string;
  accountId: string;
  fullName: string;
  academicTitle: string | null;
  department: string | null;
  faculty: string | null;
  contactEmail: string | null;
  meetingMinutes: number;
  /** What they wrote for students (FR-OH-28); plain text, empty until they fill it in. */
  about: string | null;
  topics: OfficeHoursTopic[];
  courses: OfficeHoursCourse[];
  expertise: string[];
  /** How many days they usually take to answer a request. */
  responseDays: number | null;
};

export type OfficeHoursRequestInput = {
  academicianId: string;
  startsAt: string;
  title: string;
  description: string | null;
};

/** One of the student's own requests; place and online link only once it is a meeting. */
export type OfficeHoursStudentRequest = {
  id: string;
  status: OfficeHoursRequestStatus;
  academician: {
    id: string;
    fullName: string | null;
    academicTitle: string | null;
    department: string | null;
  };
  topic: string;
  description: string | null;
  courseName: string | null;
  time: OfficeHoursTimeRange | null;
  proposedTimes: OfficeHoursTimeRange[];
  academicianMessage: string | null;
  rejectionReason: string | null;
  place: string | null;
  onlineLink: string | null;
  requestedAt: string;
  allowedActions: OfficeHoursStudentAction[];
  /** Set only on a cancelled request. */
  cancellation: OfficeHoursCancellation | null;
};

/** Why a booked meeting is called off; the backend requires it when the meeting is less than a day away. */
export type OfficeHoursCancelInput = {
  reason: string | null;
};

/** Take one of the academician's offered times (`accept` with `time`), or withdraw the request. */
export type OfficeHoursAlternativeInput = {
  accept: boolean;
  time?: string | undefined;
};

/** A booked meeting the new hours would no longer cover; it stays booked unless the academician cancels it. */
export type OfficeHoursAffectedMeeting = {
  requestId: string;
  status: OfficeHoursRequestStatus;
  time: OfficeHoursTimeRange;
  studentName: string | null;
  topic: string | null;
  courseName: string | null;
};

/** An open request some of whose times the new hours would no longer have. */
export type OfficeHoursAffectedRequest = {
  requestId: string;
  status: OfficeHoursRequestStatus;
  studentName: string | null;
  topic: string;
  courseName: string | null;
  lostTimes: OfficeHoursTimeRange[];
  keptTimes: OfficeHoursTimeRange[];
};

/** What a change to the hours would leave outside them (FR-OH-29), before it is saved. */
export type OfficeHoursAvailabilityImpact = {
  meetings: OfficeHoursAffectedMeeting[];
  requests: OfficeHoursAffectedRequest[];
};

/** An item the academician was shown, sent back with the save so anything new stops it. */
export type OfficeHoursAffectedItem = {
  requestId: string;
  status: OfficeHoursRequestStatus;
};
