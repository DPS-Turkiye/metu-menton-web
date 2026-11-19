"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useMinuteClock } from "@/hooks/use-minute-clock";
import type { Appointment } from "@/interfaces/appointment";
import { currentTime } from "@/lib/appointments";
import { monthGridCells } from "@/lib/calendar";
import { getStudentAppointments } from "@/lib/client/student-appointments";
import { startOfDay } from "@/lib/mobile-calendar";
import {
  appointmentRequestGroups,
  appointmentsOnDay,
  appointmentTabs,
  defaultOpenGroups,
  nowLineOffset,
  shiftAnchor,
  visibleDays,
} from "@/lib/student-appointments";
import { isAwaitingAnswer } from "@/lib/student-home";
import {
  AppointmentsTab,
  AppointmentsView,
  type AppointmentRequestGroup,
} from "@/types/student-appointments";

export const STUDENT_APPOINTMENTS_QUERY_KEY = ["student-appointments"] as const;

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
  return startOfDay(new Date());
}

/**
 * Randevularım: the list tabs, the day, week and month calendars, and the Taleplerim groups beside them, over the
 * same appointments.
 */
export function useStudentAppointments({
  filter,
  initialTab = AppointmentsTab.Upcoming,
}: StudentAppointmentsOptions = {}) {
  const query = useQuery({
    queryKey: STUDENT_APPOINTMENTS_QUERY_KEY,
    queryFn: getStudentAppointments,
  });
  const [view, setView] = useState(AppointmentsView.List);
  const [tab, setTab] = useState(initialTab);
  const [anchor, setAnchor] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(today);
  // Null until the student opens or closes a group; until then the groups follow what waits for an answer.
  const [openGroups, setOpenGroups] =
    useState<ReadonlySet<AppointmentRequestGroup> | null>(null);
  const clock = useMinuteClock();

  // As of the last load, so a render stays pure; each refetch moves it forward.
  const now = new Date(query.dataUpdatedAt);
  const all = (query.data ?? []).filter((item) => filter?.(item) ?? true);
  const tabs = appointmentTabs(all, now);
  const requestGroups = appointmentRequestGroups(tabs);
  const open = openGroups ?? new Set(defaultOpenGroups(requestGroups));
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

  const toggleGroup = (group: AppointmentRequestGroup) => {
    const next = new Set(open);
    if (!next.delete(group)) next.add(group);
    setOpenGroups(next);
  };

  // A Taleplerim row: the calendar moves to the day the session sits on and the side panel opens it.
  const focus = (appointment: Appointment) => {
    const day = startOfDay(new Date(currentTime(appointment).startsAt));
    setAnchor(day);
    setSelectedDay(day);
    setSelectedId(appointment.id);
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
    isGroupOpen: (group: AppointmentRequestGroup) => open.has(group),
    toggleGroup,
    focus,
    showInList: (listTab: AppointmentsTab) => {
      changeView(AppointmentsView.List);
      setTab(listTab);
    },
  };
}

export type StudentAppointmentsModel = ReturnType<
  typeof useStudentAppointments
>;
