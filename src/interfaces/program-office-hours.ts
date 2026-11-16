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
