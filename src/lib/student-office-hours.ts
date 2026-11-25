import {
  AppointmentKind,
  AppointmentStatus,
  type Appointment,
  type AppointmentTime,
} from "@/interfaces/appointment";
import type { InstitutionRecord } from "@/interfaces/institution";
import type {
  OfficeHoursAcademician,
  StudentOfficeHoursSlot,
} from "@/interfaces/student-office-hours";
import { isSameDay, startOfWeek, weekDays } from "@/lib/calendar";

/** The student's own advisor is not in the directory: the screens build the entry from the institutional record. */
export const ADVISOR_ACADEMICIAN_ID = "advisor";
/** Office Hours weeks run Monday to Friday. */
export const OFFICE_HOURS_WEEK_DAYS = 5;
/** The list looks this far ahead for each academician's nearest free slot. */
export const OFFICE_HOURS_LOOKAHEAD_DAYS = 14;
export const OFFICE_HOURS_TITLE_MAX = 120;
export const OFFICE_HOURS_DESCRIPTION_MAX = 500;
/** The advisor card on the list shows this many of the advisor's nearest slots. */
export const ADVISOR_SLOT_PREVIEW = 3;

export type OfficeHoursFilter = {
  query: string;
  faculty: string | null;
  department: string | null;
  availableOnly: boolean;
};

export function academicianName(academician: {
  academicTitle: string | null;
  fullName: string;
}) {
  return [academician.academicTitle, academician.fullName]
    .filter(Boolean)
    .join(" ");
}

/** The student's advisor from the institutional record, as an Office Hours entry. */
export function advisorAcademician(
  record: InstitutionRecord,
): OfficeHoursAcademician | null {
  if (!record.advisor) return null;
  return {
    id: ADVISOR_ACADEMICIAN_ID,
    accountId: record.advisor.userId,
    fullName: record.advisor.fullName,
    academicTitle: record.advisor.academicTitle,
    department: record.departmentName,
    faculty: record.faculty,
    tags: [],
    about: null,
    topics: [],
    courses: [],
    place: null,
    durationMinutes: 30,
    responseTime: null,
  };
}

/** Search by name, department or topic (Turkish case rules), faculty and department, and "Müsait saati olanlar". */
export function filterAcademicians(
  academicians: OfficeHoursAcademician[],
  filter: OfficeHoursFilter,
  hasFreeSlot: (id: string) => boolean,
) {
  const needle = filter.query.trim().toLocaleLowerCase("tr");
  return academicians.filter(
    (item) =>
      (!needle ||
        [academicianName(item), item.department ?? "", ...item.tags].some(
          (text) => text.toLocaleLowerCase("tr").includes(needle),
        )) &&
      (filter.faculty === null || item.faculty === filter.faculty) &&
      (filter.department === null || item.department === filter.department) &&
      (!filter.availableOnly || hasFreeSlot(item.id)),
  );
}

/** The distinct values of one field, sorted in Turkish order. */
export function optionsOf(
  academicians: OfficeHoursAcademician[],
  field: "faculty" | "department",
) {
  return [
    ...new Set(
      academicians.flatMap((item) => (item[field] ? [item[field]] : [])),
    ),
  ].toSorted((a, b) => a.localeCompare(b, "tr"));
}

export function freeSlots(slots: StudentOfficeHoursSlot[]) {
  return slots
    .filter((slot) => slot.available)
    .toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** Slots under the day they fall on, in the order given. */
export function slotsByDay(slots: StudentOfficeHoursSlot[]) {
  const days: { day: Date; slots: StudentOfficeHoursSlot[] }[] = [];
  for (const slot of slots) {
    const last = days.at(-1);
    if (last && isSameDay(slot.startsAt, last.day)) last.slots.push(slot);
    else days.push({ day: new Date(slot.startsAt), slots: [slot] });
  }
  return days;
}

/** The Monday-to-Friday columns of the week holding `anchor`, each with its slots and free count. */
export function officeHoursWeek(slots: StudentOfficeHoursSlot[], anchor: Date) {
  return weekDays(startOfWeek(anchor), OFFICE_HOURS_WEEK_DAYS).map((day) => {
    const daySlots = slots
      .filter((slot) => isSameDay(slot.startsAt, day))
      .toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    return {
      day,
      slots: daySlots,
      freeCount: daySlots.filter((slot) => slot.available).length,
    };
  });
}

export type OfficeHoursRequestErrors = {
  title: boolean;
};

/** Only the title is required; the description is optional (Figma 3.5 / 3.5b, "Kısa açıklama (isteğe bağlı)"). */
export function officeHoursRequestErrors(
  title: string,
): OfficeHoursRequestErrors | null {
  return title.trim() === "" ? { title: true } : null;
}

/**
 * Only an Office Hours request with other times offered waits on the student's answer: what the backend allows, or
 * the status where it sent no such list.
 */
export function canAnswerAlternative(appointment: Appointment) {
  return (
    appointment.kind === AppointmentKind.OfficeHours &&
    offeredTimes(appointment).length > 0 &&
    (appointment.canAcceptAlternative ??
      appointment.status === AppointmentStatus.AlternativeProposed)
  );
}

/** The backend's limit on a cancel reason (`@Size(max = 2000)`), so the field stops there instead of a 400. */
export const OFFICE_HOURS_CANCEL_REASON_MAX = 2000;

/**
 * A booked Office Hours meeting the backend lets the student call off, while it is still ahead: the list is as of the
 * last load, so a meeting that has started since stops offering it (the backend refuses it with 409 either way).
 */
export function canCancelOfficeHours(appointment: Appointment, now: Date) {
  return (
    appointment.kind === AppointmentKind.OfficeHours &&
    appointment.canCancel === true &&
    Date.parse(appointment.startsAt) > now.getTime()
  );
}

/** Every time the academician offered; the sample data carries only the one. */
export function offeredTimes(appointment: Appointment): AppointmentTime[] {
  if (appointment.alternatives) return appointment.alternatives;
  return appointment.alternative ? [appointment.alternative] : [];
}

const SUNDAY = 0;
const SATURDAY = 6;

/** The day the booking week opens on: today, or the coming Monday when today is a weekend. */
export function firstBookableWeekDay(today: Date) {
  const day = new Date(today);
  day.setHours(0, 0, 0, 0);
  const weekday = day.getDay();
  if (weekday === SATURDAY) day.setDate(day.getDate() + 2);
  if (weekday === SUNDAY) day.setDate(day.getDate() + 1);
  return day;
}

/** The day of a time named in a link, when it is one to book: a real time, not before the first bookable day. */
export function bookableDay(startsAt: string | null, firstDay: Date) {
  const day = startsAt === null ? null : new Date(startsAt);
  return day !== null && day.getTime() >= firstDay.getTime() ? day : null;
}

/** The still-free slot that starts at the time a link names. */
export function askedSlot(
  slots: StudentOfficeHoursSlot[],
  startsAt: string | null,
) {
  if (startsAt === null) return null;
  const at = Date.parse(startsAt);
  return (
    slots.find((slot) => slot.available && Date.parse(slot.startsAt) === at) ??
    null
  );
}
