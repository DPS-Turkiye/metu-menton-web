"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCoordinatorProgram } from "@/hooks/use-coordinator-program";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PROGRAM_OFFICE_HOURS_QUERY_KEY } from "@/hooks/use-program-office-hours-appointments";
import { getProgramOfficeHoursStudents } from "@/lib/client/program-office-hours";
import { studentsAreOfficeHours } from "@/lib/coordinator-program-detail";
import {
  ALL_APPOINTMENTS,
  APPOINTMENT_SEARCH_DELAY_MS,
  studentsQuery,
  type StudentFilters,
} from "@/lib/program-office-hours";

const FIRST_VIEW: StudentFilters = {
  search: "",
  faculty: ALL_APPOINTMENTS,
  awaitingOnly: false,
  page: 1,
};

/**
 * Office Hours Öğrenciler: who asked for office hours lately and how their requests stand, with the same search,
 * faculty chip and paging as Randevular. Nothing is asked until the program is known to be Office Hours.
 */
export function useProgramOfficeHoursStudents(programId: string) {
  const t = useTranslations("programOhStudents");
  const [filters, setFilters] = useState(FIRST_VIEW);
  const search = useDebouncedValue(filters.search, APPOINTMENT_SEARCH_DELAY_MS);
  const program = useCoordinatorProgram(programId);
  const query = studentsQuery({ ...filters, search });
  const result = useQuery({
    queryKey: [...PROGRAM_OFFICE_HOURS_QUERY_KEY, programId, "students", query],
    queryFn: () => getProgramOfficeHoursStudents(programId, query),
    enabled: program.data ? studentsAreOfficeHours(program.data) : false,
    placeholderData: keepPreviousData,
  });

  const update = (change: Partial<Omit<StudentFilters, "page">>) => {
    setFilters((current) => ({ ...current, ...change, page: 1 }));
  };

  return {
    filters,
    facultyOptions: [
      { value: ALL_APPOINTMENTS, label: t("faculty") },
      ...(result.data?.faculties ?? []).map((faculty) => ({
        value: faculty,
        label: faculty,
      })),
    ],
    setSearch: (value: string) => update({ search: value }),
    setFaculty: (value: string) => update({ faculty: value }),
    toggleAwaitingOnly: () =>
      setFilters((current) => ({
        ...current,
        awaitingOnly: !current.awaitingOnly,
        page: 1,
      })),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    data: result.data,
    isLoading: result.isLoading,
    isUpdating: result.isPlaceholderData,
    error: result.error,
  };
}
