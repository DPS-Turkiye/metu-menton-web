"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useInstitutionAdvisees } from "@/hooks/use-institution-record";
import { AppointmentStatus } from "@/interfaces/appointment";
import {
  ACADEMICIAN_APPOINTMENTS_QUERY_KEY,
  ACADEMICIAN_REQUESTS_QUERY_KEY,
  turkeyShortDay,
} from "@/lib/academician-office-hours";
import { studentProfileHref } from "@/lib/academician-routes";
import { adviseeRows, filterAdvisees } from "@/lib/academician-students";
import {
  getAcademicianAppointments,
  getAcademicianRequests,
} from "@/lib/client/academician-office-hours";
import {
  formatTurkishTime,
  toTurkishDate,
  TURKEY_TIME_ZONE,
} from "@/lib/turkey-time";
import {
  AdviseeNextKind,
  StudentProfileOrigin,
} from "@/types/academician-office-hours";

/** A waiting request reads as one; a booked meeting as confirmed. */
const NEXT_STATUS: Record<AdviseeNextKind, AppointmentStatus> = {
  [AdviseeNextKind.PendingRequest]: AppointmentStatus.Pending,
  [AdviseeNextKind.Appointment]: AppointmentStatus.Confirmed,
};

export type AdviseeTableRow = {
  key: string;
  name: string;
  detail: string;
  last: string | null;
  next: { label: string; status: AppointmentStatus } | null;
  /** The student's profile; null for someone who never signed in to Menton, who has no profile there. */
  href: string | null;
};

/**
 * Danışan Öğrencilerim: ODTÜ's advisee list, searchable, with each student's last and next meeting. The meeting
 * columns come from Office Hours and stay empty while it isn't loaded; the list itself doesn't wait for it, and a
 * failed load is reported (`meetings`) so empty columns don't pass for students without meetings.
 */
export function useAcademicianAdvisees() {
  const t = useTranslations("iaAcademician.advisees");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [classYear, setClassYear] = useState<number | null>(null);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const advisees = useInstitutionAdvisees();
  const requests = useQuery({
    queryKey: ACADEMICIAN_REQUESTS_QUERY_KEY,
    queryFn: getAcademicianRequests,
  });
  const appointments = useQuery({
    queryKey: ACADEMICIAN_APPOINTMENTS_QUERY_KEY,
    queryFn: getAcademicianAppointments,
  });

  const meetingQueries = [requests, appointments];
  const meetings = {
    failed: meetingQueries.some((query) => query.isError),
    retry: () => {
      for (const query of meetingQueries) {
        if (query.error) void query.refetch();
      }
    },
    isRetrying: meetingQueries.some((query) => query.isRefetching),
  };
  const shared = {
    isLoading: advisees.isLoading,
    error: advisees.error,
    retry: () => void advisees.refetch(),
    isRetrying: advisees.isRefetching,
  };
  if (!advisees.data) return { ...shared, list: null };

  const now = new Date(
    Math.max(
      advisees.dataUpdatedAt,
      requests.dataUpdatedAt,
      appointments.dataUpdatedAt,
    ),
  );
  const today = toTurkishDate(now);
  const shortDay = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: TURKEY_TIME_ZONE,
  });

  const nextLabel = (kind: AdviseeNextKind, startsAt: string) => ({
    label:
      toTurkishDate(startsAt) === today
        ? t("today", { time: formatTurkishTime(startsAt, locale) })
        : `${turkeyShortDay(startsAt, locale)} ${formatTurkishTime(startsAt, locale)}`,
    status: NEXT_STATUS[kind],
  });

  const classYears = [
    ...new Set(
      advisees.data.flatMap(({ classYear: year }) =>
        year === null ? [] : [year],
      ),
    ),
  ].toSorted((a, b) => a - b);
  const rows = adviseeRows(
    filterAdvisees(advisees.data, search),
    {
      requests: requests.data ?? [],
      appointments: appointments.data ?? [],
    },
    now,
  ).filter(
    ({ person, next }) =>
      (classYear === null || person.classYear === classYear) &&
      (!upcomingOnly || next !== null),
  );

  return {
    ...shared,
    list: {
      total: advisees.data.length,
      meetings,
      search,
      setSearch,
      classYear,
      setClassYear,
      classYears: classYears.map((year) => ({
        year,
        label: t("classYear", { year }),
      })),
      upcomingOnly,
      toggleUpcomingOnly: () => setUpcomingOnly((current) => !current),
      rows: rows.map(
        ({ person, lastAppointmentAt, next }): AdviseeTableRow => ({
          key: `${person.userId ?? "none"}-${person.fullName}`,
          name: person.fullName,
          detail: [
            person.departmentName,
            person.classYear === null ? null : String(person.classYear),
          ]
            .filter((part) => part !== null)
            .join(" · "),
          last:
            lastAppointmentAt === null
              ? null
              : shortDay.format(new Date(lastAppointmentAt)),
          next: next === null ? null : nextLabel(next.kind, next.startsAt),
          href:
            person.userId === null
              ? null
              : studentProfileHref(
                  person.userId,
                  StudentProfileOrigin.Advisees,
                ),
        }),
      ),
    },
  };
}

export type AcademicianAdvisees = NonNullable<
  ReturnType<typeof useAcademicianAdvisees>["list"]
>;
