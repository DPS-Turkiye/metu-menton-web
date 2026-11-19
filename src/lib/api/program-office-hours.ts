import "server-only";

import type {
  ProgramOfficeHoursAppointment,
  ProgramOfficeHoursAppointments,
  ProgramOfficeHoursQuery,
  ProgramOfficeHoursStudents,
  ProgramOfficeHoursStudentsQuery,
} from "@/interfaces/program-office-hours";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

function base(programId: string) {
  return `/api/coordinator/programs/${encodeURIComponent(programId)}/office-hours/appointments`;
}

/** Only the filters that are set travel, so the backend's defaults apply to the rest. */
export function fetchProgramOfficeHoursAppointments(
  actorId: string,
  programId: string,
  query: {
    [K in keyof ProgramOfficeHoursQuery]?:
      ProgramOfficeHoursQuery[K] | undefined;
  },
) {
  const params: Record<string, string | number> = { actorId };
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params[key] = value;
    }
  }
  return backendRequest<ProgramOfficeHoursAppointments>({
    method: HttpMethod.Get,
    url: base(programId),
    params,
  });
}

export function fetchProgramOfficeHoursAppointment(
  actorId: string,
  programId: string,
  requestId: string,
) {
  return backendRequest<ProgramOfficeHoursAppointment>({
    method: HttpMethod.Get,
    url: `${base(programId)}/${encodeURIComponent(requestId)}`,
    params: { actorId },
  });
}

/** Only the filters that are set travel, as for Randevular. */
export function fetchProgramOfficeHoursStudents(
  actorId: string,
  programId: string,
  query: {
    [K in keyof ProgramOfficeHoursStudentsQuery]?:
      ProgramOfficeHoursStudentsQuery[K] | undefined;
  },
) {
  const params: Record<string, string | number | boolean> = { actorId };
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params[key] = value;
    }
  }
  return backendRequest<ProgramOfficeHoursStudents>({
    method: HttpMethod.Get,
    url: `/api/coordinator/programs/${encodeURIComponent(programId)}/office-hours/students`,
    params,
  });
}
