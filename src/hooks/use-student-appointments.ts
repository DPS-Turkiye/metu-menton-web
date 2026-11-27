"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useMinuteClock } from "@/hooks/use-minute-clock";
import { useOfficeHoursOpen } from "@/hooks/use-office-hours-open";
import type { Appointment } from "@/interfaces/appointment";
import { monthGridCells } from "@/lib/calendar";
import { getStudentAppointments } from "@/lib/client/student-appointments";
import {
  appointmentRequestGroups,
  appointmentsInMonth,
  appointmentsOnDay,
  appointmentTabs,
  calendarSummary,
  nowLineOffset,
  shiftAnchor,
  visibleDays,
} from "@/lib/student-appointments";
import { isAwaitingAnswer } from "@/lib/student-home";
import { startOfTurkishDay } from "@/lib/turkey-time";
import {
  AppointmentsTab,
  AppointmentsView,
} from "@/types/student-appointments";

export const STUDENT_APPOINTMENTS_QUERY_KEY = ["student-appointments"] as const;

/**
 * The student's appointments query, shared by every screen that lists them. Office Hours requests are in it only
 * while Office Hours is open to the student, and it waits for the session to say which.
 */
export function useStudentAppointmentsQuery() {
  const officeHours = useOfficeHoursOpen();
  return useQuery({
    queryKey: [...STUDENT_APPOINTMENTS_QUERY_KEY, officeHours.open],
    queryFn: () => getStudentAppointments(officeHours.open),
    enabled: officeHours.known,
  });
}

export type StudentAppointmentsOptions = {
  /**
   * Narrows every view to the appointments it keeps. An extension point: the İŞKUR edition passes its
   * "Mentor olarak / Mentee olarak" filter here instead of changing this hook.
   */
  filter?: ((appointment: Appointment) => boolean) | undefined;
  /** The tab to open on, e.g. Talepler right after a request was sent. */
  initialTab?: AppointmentsTab | undefined;
};

function today() {
  return startOfTurkishDay(new Date());
}

/**
 * Randevularım: the list tabs, the day, week and month calendars, over the same appointments.
 */
export function useStudentAppointments({
  filter,
  initialTab = AppointmentsTab.Upcoming,
}: StudentAppointmentsOptions = {}) {
  const query = useStudentAppointmentsQuery();
  const [view, setView] = useState(AppointmentsView.List);
  const [tab, setTab] = useState(initialTab);
  const [anchor, setAnchor] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(today);
  const clock = useMinuteClock();

  // As of the last load, so a render stays pure; each refetch moves it forward.
  const now = new Date(query.dataUpdatedAt);
  const all = (query.data ?? []).filter((item) => filter?.(item) ?? true);
  const tabs = appointmentTabs(all, now);
  const requestGroups = appointmentRequestGroups(
    tabs[AppointmentsTab.Requests],
  );
  const days = visibleDays(view, anchor).map((day) => ({
    day,
    items: appointmentsOnDay(all, day),
  }));
  const month =
    view === AppointmentsView.Month
      ? monthGridCells(anchor).map((cell) => ({
          ...cell,
          items: appointmentsOnDay(all, cell.date),
        }))
      : [];
  const inRange = days.flatMap((column) => column.items);
  // The detail panel opens on what was clicked, else on the first request in view, else on the first session.
  const selected =
    all.find((item) => item.id === selectedId) ??
    inRange.find(isAwaitingAnswer) ??
    inRange[0] ??
    null;

  // Paging drops the picked session and day, so the side panel follows what the grid shows.
  const move = (next: Date) => {
    setAnchor(next);
    setSelectedId(null);
    setSelectedDay(next);
  };

  const changeView = (next: AppointmentsView) => {
    setView(next);
    setSelectedId(null);
  };

  return {
    isLoading: query.isLoading,
    error: query.error,
    retry: () => {
      void query.refetch();
    },
    isRetrying: query.isFetching,
    isEmpty: query.data?.length === 0,
    now,
    view,
    setView: changeView,
    tab,
    setTab,
    tabs,
    anchor,
    today: today(),
    previous: () => move(shiftAnchor(view, anchor, -1)),
    next: () => move(shiftAnchor(view, anchor, 1)),
    goToday: () => move(today()),
    days,
    month,
    summary: calendarSummary(
      view === AppointmentsView.Month
        ? appointmentsInMonth(all, anchor)
        : inRange,
      now,
    ),
    selected,
    select: (appointment: Appointment) => setSelectedId(appointment.id),
    selectedDay,
    selectedDayItems: appointmentsOnDay(all, selectedDay),
    selectDay: setSelectedDay,
    nowLine:
      view === AppointmentsView.Day && days[0]
        ? nowLineOffset(clock, days[0].day)
        : null,
    clock,
    requestGroups,
    /** "Günü aç" on the month's picked day. */
    openSelectedDay: () => {
      setAnchor(selectedDay);
      changeView(AppointmentsView.Day);
    },
    showInList: (listTab: AppointmentsTab) => {
      changeView(AppointmentsView.List);
      setTab(listTab);
    },
  };
}

export type StudentAppointmentsModel = ReturnType<
  typeof useStudentAppointments
>;
