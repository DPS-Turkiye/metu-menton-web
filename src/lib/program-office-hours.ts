import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import type {
  ProgramOfficeHoursPerson,
  ProgramOfficeHoursQuery,
  ProgramOfficeHoursStudentRequests,
  ProgramOfficeHoursStudentsQuery,
} from "@/interfaces/program-office-hours";
import { formatTurkishTime, TURKEY_TIME_ZONE } from "@/lib/turkey-time";

/** The statuses Randevular can filter by; the backend has no others yet (İptal Edildi arrives with the cancel PR). */
export const APPOINTMENT_STATUS_FILTERS = [
  OfficeHoursRequestStatus.Pending,
  OfficeHoursRequestStatus.MoreInfoRequested,
  OfficeHoursRequestStatus.CounterProposed,
  OfficeHoursRequestStatus.Accepted,
  OfficeHoursRequestStatus.Declined,
  OfficeHoursRequestStatus.Withdrawn,
] as const;

export type AppointmentStatusFilter =
  (typeof APPOINTMENT_STATUS_FILTERS)[number];

export const ALL_APPOINTMENTS = "ALL";

export const APPOINTMENTS_PAGE_SIZE = 25;

/** How long the search waits after the last key before it asks again. */
export const APPOINTMENT_SEARCH_DELAY_MS = 300;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Monday to Sunday of the week `today` is in, as "yyyy-MM-dd" days in Turkey: the backend reads the days in Turkey
 * time, so a coordinator's browser elsewhere must not shift the week.
 */
export function weekRange(today: Date) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: TURKEY_TIME_ZONE,
  }).format(today);
  const noon = new Date(`${day}T12:00:00Z`);
  const monday = new Date(
    noon.getTime() - ((noon.getUTCDay() + 6) % 7) * DAY_MS,
  );
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

export type AppointmentFilters = {
  search: string;
  status: AppointmentStatusFilter | typeof ALL_APPOINTMENTS;
  faculty: string;
  thisWeek: boolean;
  /** 1-based, as the pagination shows it. */
  page: number;
};

/** The request the filters make; "Tümü" and an empty search are left out. */
export function appointmentsQuery(
  filters: AppointmentFilters,
  today: Date,
): ProgramOfficeHoursQuery {
  const week = filters.thisWeek ? weekRange(today) : null;
  const search = filters.search.trim();
  return {
    status: filters.status === ALL_APPOINTMENTS ? null : filters.status,
    faculty: filters.faculty === ALL_APPOINTMENTS ? null : filters.faculty,
    search: search === "" ? null : search,
    from: week?.from ?? null,
    to: week?.to ?? null,
    page: filters.page - 1,
    size: APPOINTMENTS_PAGE_SIZE,
  };
}

/** "Prof. Dr. Ahmet Kaya": the academic title, when the records have one, before the name. */
export function personName(person: ProgramOfficeHoursPerson) {
  return person.title ? `${person.title} ${person.name}` : person.name;
}

/** "13 Kasım 2026 Cuma": an appointment's day in Turkey. */
export function appointmentDay(startsAt: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
    timeZone: TURKEY_TIME_ZONE,
  }).format(new Date(startsAt));
}

/** "10:30 – 11:00" in Turkey; just the start when the end is not known. */
export function appointmentHours(
  startsAt: string,
  endsAt: string | null,
  locale: string,
) {
  const start = formatTurkishTime(startsAt, locale);
  return endsAt ? `${start} – ${formatTurkishTime(endsAt, locale)}` : start;
}

/** "10 Kas · 16:20": when a history step happened, in Turkey. */
export function historyTime(at: string, locale: string) {
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: TURKEY_TIME_ZONE,
  }).format(new Date(at));
  return `${day} · ${formatTurkishTime(at, locale)}`;
}

export type StudentFilters = {
  search: string;
  faculty: string;
  awaitingOnly: boolean;
  /** 1-based, as the pagination shows it. */
  page: number;
};

/** The request Öğrenciler's filters make; "Tümü" and an empty search are left out. */
export function studentsQuery(
  filters: StudentFilters,
): ProgramOfficeHoursStudentsQuery {
  const search = filters.search.trim();
  return {
    search: search === "" ? null : search,
    faculty: filters.faculty === ALL_APPOINTMENTS ? null : filters.faculty,
    awaitingOnly: filters.awaitingOnly,
    page: filters.page - 1,
    size: APPOINTMENTS_PAGE_SIZE,
  };
}

/** The order a request moves through; Öğrenciler shows the statuses a student has requests in, in this order. */
export const STUDENT_REQUEST_ORDER = [
  "awaitingDecision",
  "alternativeProposed",
  "accepted",
  "declined",
  "withdrawn",
] as const satisfies readonly (keyof ProgramOfficeHoursStudentRequests)[];

export type StudentRequestKind = (typeof STUDENT_REQUEST_ORDER)[number];

/** The statuses a student has at least one request in, with how many. */
export function studentRequestCounts(
  requests: ProgramOfficeHoursStudentRequests,
) {
  return STUDENT_REQUEST_ORDER.map((kind) => ({
    kind,
    count: requests[kind],
  })).filter((entry) => entry.count > 0);
}
