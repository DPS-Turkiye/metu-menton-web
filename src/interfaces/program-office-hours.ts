import type { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import type { PageResponse } from "@/interfaces/page-response";

/** A participant as a coordinator sees them: no e-mail, no contact details. */
export type ProgramOfficeHoursPerson = {
  name: string;
  /** The academic title ("Prof. Dr."); null for a student or when the records have none. */
  title: string | null;
  department: string | null;
};

/**
 * The Randevular cards. Open requests are counted whatever their date; accepted ones by the meeting's day this
 * week, declined ones by the day they were declined this week.
 */
export type ProgramOfficeHoursCounts = {
  awaitingDecision: number;
  alternativeProposed: number;
  acceptedThisWeek: number;
  declinedThisWeek: number;
};

/** A Randevular row: the title, the shown time and the two people. The description never reaches the coordinator. */
export type ProgramOfficeHoursRow = {
  id: string;
  status: OfficeHoursRequestStatus;
  topic: string;
  startsAt: string | null;
  student: ProgramOfficeHoursPerson;
  academic: ProgramOfficeHoursPerson;
};

export type ProgramOfficeHoursAppointments = {
  counts: ProgramOfficeHoursCounts;
  faculties: string[];
  appointments: PageResponse<ProgramOfficeHoursRow>;
};

/** The Randevular filters; `from` and `to` are "yyyy-MM-dd" days, both given or both null. */
export type ProgramOfficeHoursQuery = {
  status: OfficeHoursRequestStatus | null;
  faculty: string | null;
  search: string | null;
  from: string | null;
  to: string | null;
  page: number;
  size: number;
};

/** A step of an appointment's history, read from the times the request keeps. */
export enum OfficeHoursHistoryStep {
  Submitted = "SUBMITTED",
  InfoRequested = "INFO_REQUESTED",
  StudentReplied = "STUDENT_REPLIED",
  AlternativeProposed = "ALTERNATIVE_PROPOSED",
  Accepted = "ACCEPTED",
  Declined = "DECLINED",
  Withdrawn = "WITHDRAWN",
}

export type ProgramOfficeHoursHistoryEntry = {
  step: OfficeHoursHistoryStep;
  /** Null when the step happened but its time was not kept (an alternative later accepted). */
  at: string | null;
};

/** The Randevu detayı drawer: the row's fields, the end time and the history. Still no description or messages. */
export type ProgramOfficeHoursAppointment = {
  id: string;
  status: OfficeHoursRequestStatus;
  topic: string;
  startsAt: string | null;
  endsAt: string | null;
  student: ProgramOfficeHoursPerson;
  academic: ProgramOfficeHoursPerson;
  history: ProgramOfficeHoursHistoryEntry[];
};

/** A student's office-hours requests in the window, by status; awaiting = PENDING plus MORE_INFO_REQUESTED. */
export type ProgramOfficeHoursStudentRequests = {
  awaitingDecision: number;
  alternativeProposed: number;
  accepted: number;
  declined: number;
  withdrawn: number;
};

/** An Öğrenciler row: who asked and how their requests stand. No topics, descriptions or contact details. */
export type ProgramOfficeHoursStudentRow = {
  id: string;
  student: ProgramOfficeHoursPerson;
  classYear: number | null;
  requests: ProgramOfficeHoursStudentRequests;
  academicians: number;
  lastRequestedAt: string;
};

export type ProgramOfficeHoursStudents = {
  faculties: string[];
  students: PageResponse<ProgramOfficeHoursStudentRow>;
};

export type ProgramOfficeHoursStudentsQuery = {
  search: string | null;
  faculty: string | null;
  awaitingOnly: boolean;
  page: number;
  size: number;
};
