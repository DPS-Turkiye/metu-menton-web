import type {
  ProgramOfficeHoursStudentRow,
  ProgramOfficeHoursStudents,
} from "@/interfaces/program-office-hours";

export function studentRow(
  overrides: Partial<ProgramOfficeHoursStudentRow> = {},
): ProgramOfficeHoursStudentRow {
  return {
    id: "ohu-1",
    student: {
      name: "Ayşe Yılmaz",
      title: null,
      department: "Endüstri Mühendisliği",
    },
    classYear: 4,
    requests: {
      awaitingDecision: 2,
      alternativeProposed: 1,
      accepted: 3,
      declined: 0,
      withdrawn: 0,
    },
    academicians: 2,
    lastRequestedAt: "2026-11-10T08:00:00Z",
    ...overrides,
  };
}

export function programStudents(
  rows: ProgramOfficeHoursStudentRow[] = [studentRow()],
  totalPages = 1,
): ProgramOfficeHoursStudents {
  return {
    faculties: ["Mühendislik Fakültesi"],
    students: {
      content: rows,
      page: 0,
      size: 25,
      totalElements: rows.length,
      totalPages,
    },
  };
}
