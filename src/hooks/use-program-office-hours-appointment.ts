"use client";

import { useQuery } from "@tanstack/react-query";

import { PROGRAM_OFFICE_HOURS_QUERY_KEY } from "@/hooks/use-program-office-hours-appointments";
import { getProgramOfficeHoursAppointment } from "@/lib/client/program-office-hours";

/** One appointment for the Randevu detayı drawer; nothing is asked while no row is open. */
export function useProgramOfficeHoursAppointment(
  programId: string,
  requestId: string | null,
) {
  return useQuery({
    queryKey: [
      ...PROGRAM_OFFICE_HOURS_QUERY_KEY,
      programId,
      "detail",
      requestId,
    ],
    queryFn: () => getProgramOfficeHoursAppointment(programId, requestId ?? ""),
    enabled: requestId !== null,
  });
}
