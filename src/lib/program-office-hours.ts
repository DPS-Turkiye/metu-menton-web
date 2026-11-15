import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import type {
  ProgramOfficeHoursPerson,
  ProgramOfficeHoursQuery,
} from "@/interfaces/program-office-hours";
import { TURKEY_TIME_ZONE } from "@/lib/academician-office-hours";

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
