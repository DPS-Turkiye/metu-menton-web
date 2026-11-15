"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { getProgramOfficeHoursAppointments } from "@/lib/client/program-office-hours";
import {
  ALL_APPOINTMENTS,
  appointmentsQuery,
  type AppointmentFilters,
} from "@/lib/program-office-hours";

export const PROGRAM_OFFICE_HOURS_QUERY_KEY = [
  "program-office-hours-appointments",
] as const;

const FIRST_VIEW: AppointmentFilters = {
  search: "",
  status: ALL_APPOINTMENTS,
  faculty: ALL_APPOINTMENTS,
  thisWeek: true,
  page: 1,
};

/**
 * Randevular: the filters (this week first, as the frame opens), the page, and the list they ask for. A filter
 * change goes back to page 1; the previous rows stay on screen while the next ones load.
 */
export function useProgramOfficeHoursAppointments(
  programId: string,
  today: Date = new Date(),
) {
  const [filters, setFilters] = useState(FIRST_VIEW);
  const search = useDeferredValue(filters.search);
  const query = appointmentsQuery({ ...filters, search }, today);
  const result = useQuery({
    queryKey: [...PROGRAM_OFFICE_HOURS_QUERY_KEY, programId, query],
    queryFn: () => getProgramOfficeHoursAppointments(programId, query),
    placeholderData: keepPreviousData,
  });

  const update = (change: Partial<Omit<AppointmentFilters, "page">>) => {
    setFilters((current) => ({ ...current, ...change, page: 1 }));
  };

  return {
    filters,
    setSearch: (value: string) => update({ search: value }),
    setStatus: (value: AppointmentFilters["status"]) =>
      update({ status: value }),
    setFaculty: (value: string) => update({ faculty: value }),
    toggleThisWeek: () => update({ thisWeek: !filters.thisWeek }),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
  };
}
