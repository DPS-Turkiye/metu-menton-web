"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCoordinatorProgram } from "@/hooks/use-coordinator-program";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ProgramType } from "@/interfaces/program";
import { getProgramOfficeHoursAppointments } from "@/lib/client/program-office-hours";
import {
  ALL_APPOINTMENTS,
  APPOINTMENT_SEARCH_DELAY_MS,
  APPOINTMENT_STATUS_FILTERS,
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
 * change goes back to page 1; the previous rows stay on screen, marked busy, while the next ones load. Nothing is
 * asked until the program is known to be an Office Hours program.
 */
export function useProgramOfficeHoursAppointments(
  programId: string,
  now: Date = new Date(),
) {
  const t = useTranslations("programAppointments");
  const [today] = useState(now);
  const [filters, setFilters] = useState(FIRST_VIEW);
  const [openId, setOpenId] = useState<string | null>(null);
  const search = useDebouncedValue(filters.search, APPOINTMENT_SEARCH_DELAY_MS);
  const program = useCoordinatorProgram(programId);
  const query = appointmentsQuery({ ...filters, search }, today);
  const result = useQuery({
    queryKey: [...PROGRAM_OFFICE_HOURS_QUERY_KEY, programId, query],
    queryFn: () => getProgramOfficeHoursAppointments(programId, query),
    enabled: program.data?.program.type === ProgramType.OfficeHours,
    placeholderData: keepPreviousData,
  });

  const update = (change: Partial<Omit<AppointmentFilters, "page">>) => {
    setFilters((current) => ({ ...current, ...change, page: 1 }));
  };

  return {
    filters,
    statusOptions: [
      { value: ALL_APPOINTMENTS, label: t("statusAll") },
      ...APPOINTMENT_STATUS_FILTERS.map((status) => ({
        value: status,
        label: t("statusFilter", { status: t(`status.${status}`) }),
      })),
    ] satisfies { value: AppointmentFilters["status"]; label: string }[],
    facultyOptions: [
      { value: ALL_APPOINTMENTS, label: t("faculty") },
      ...(result.data?.faculties ?? []).map((faculty) => ({
        value: faculty,
        label: faculty,
      })),
    ],
    setSearch: (value: string) => update({ search: value }),
    setStatus: (value: AppointmentFilters["status"]) =>
      update({ status: value }),
    setFaculty: (value: string) => update({ faculty: value }),
    toggleThisWeek: () =>
      setFilters((current) => ({
        ...current,
        thisWeek: !current.thisWeek,
        page: 1,
      })),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    /** The appointment shown in the Randevu detayı drawer, or null. */
    openId,
    openAppointment: (requestId: string) => setOpenId(requestId),
    closeAppointment: () => setOpenId(null),
    data: result.data,
    isLoading: result.isLoading,
    /** Older rows are on screen while a new filter or page loads. */
    isUpdating: result.isPlaceholderData,
    error: result.error,
  };
}
