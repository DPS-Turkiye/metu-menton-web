import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import type {
  ProgramOfficeHoursPerson,
  ProgramOfficeHoursQuery,
} from "@/interfaces/program-office-hours";
import { startOfWeek } from "@/lib/calendar";
import { isoDay } from "@/lib/coordinator-calendar";

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

/** Monday to Sunday of the week `today` is in, as "yyyy-MM-dd" days. */
export function weekRange(today: Date) {
  const monday = startOfWeek(today);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: isoDay(monday), to: isoDay(sunday) };
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
