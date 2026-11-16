import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import type {
  ProgramOfficeHoursAppointments,
  ProgramOfficeHoursRow,
} from "@/interfaces/program-office-hours";

export function appointmentRow(
  overrides: Partial<ProgramOfficeHoursRow> = {},
): ProgramOfficeHoursRow {
  return {
    id: "req-1",
    status: OfficeHoursRequestStatus.CounterProposed,
    topic: "CV ve yüksek lisans seçenekleri",
    startsAt: "2026-11-13T10:30:00+03:00",
    student: {
      name: "Ayşe Yılmaz",
      title: null,
      department: "Endüstri Mühendisliği",
    },
    academic: {
      name: "Ahmet Kaya",
      title: "Prof. Dr.",
      department: "Bilgisayar Mühendisliği",
    },
    ...overrides,
  };
}

export function programAppointments(
  rows: ProgramOfficeHoursRow[] = [appointmentRow()],
  totalPages = 1,
): ProgramOfficeHoursAppointments {
  return {
    counts: {
      awaitingDecision: 86,
      alternativeProposed: 12,
      acceptedThisWeek: 214,
      declinedThisWeek: 9,
    },
    faculties: ["Mühendislik Fakültesi", "Fen-Edebiyat Fakültesi"],
    appointments: {
      content: rows,
      page: 0,
      size: 25,
      totalElements: rows.length,
      totalPages,
    },
  };
}
