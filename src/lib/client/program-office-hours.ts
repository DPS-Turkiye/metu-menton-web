import type {
  ProgramOfficeHoursAppointment,
  ProgramOfficeHoursAppointments,
  ProgramOfficeHoursQuery,
  ProgramOfficeHoursStudents,
  ProgramOfficeHoursStudentsQuery,
} from "@/interfaces/program-office-hours";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

/** The query string for the filters that are set; an empty filter is left out rather than sent blank. */
export function programOfficeHoursSearch(
  query: ProgramOfficeHoursQuery | ProgramOfficeHoursStudentsQuery,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export async function getProgramOfficeHoursAppointments(
  programId: string,
  query: ProgramOfficeHoursQuery,
) {
  return requireSuccess(
    await httpClient.get<ProgramOfficeHoursAppointments>(
      `/api/coordinator/programs/${encodeURIComponent(programId)}/office-hours/appointments?${programOfficeHoursSearch(query)}`,
    ),
  );
}

export async function getProgramOfficeHoursAppointment(
  programId: string,
  requestId: string,
) {
  return requireSuccess(
    await httpClient.get<ProgramOfficeHoursAppointment>(
      `/api/coordinator/programs/${encodeURIComponent(programId)}/office-hours/appointments/${encodeURIComponent(requestId)}`,
    ),
  );
}

export async function getProgramOfficeHoursStudents(
  programId: string,
  query: ProgramOfficeHoursStudentsQuery,
) {
  return requireSuccess(
    await httpClient.get<ProgramOfficeHoursStudents>(
      `/api/coordinator/programs/${encodeURIComponent(programId)}/office-hours/students?${programOfficeHoursSearch(query)}`,
    ),
  );
}
