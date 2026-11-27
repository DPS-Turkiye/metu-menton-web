"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useInstitutionRecord } from "@/hooks/use-institution-record";
import {
  STUDENT_APPOINTMENTS_QUERY_KEY,
  useStudentAppointmentsQuery,
} from "@/hooks/use-student-appointments";
import { STUDENT_HOME_QUERY_KEY } from "@/hooks/use-student-home";
import { AppointmentKind, type Appointment } from "@/interfaces/appointment";
import type {
  OfficeHoursAcademician,
  StudentOfficeHoursSlot,
} from "@/interfaces/student-office-hours";
import { ToastTone } from "@/interfaces/toast";
import { splitAppointments } from "@/lib/appointments";
import { isSameCalendarDay, startOfWeek } from "@/lib/calendar";
import {
  answerOfficeHoursAlternative,
  cancelStudentOfficeHoursAppointment,
  getOfficeHoursAcademician,
  getOfficeHoursAcademicians,
  getOfficeHoursSlots,
  requestOfficeHours,
} from "@/lib/client/student-office-hours";
import { titledName } from "@/lib/profile-completion";
import {
  academicianName,
  ADVISOR_ACADEMICIAN_ID,
  ADVISOR_SLOT_PREVIEW,
  advisorAcademician,
  askedSlot,
  bookableDay,
  canCancelOfficeHours,
  filterAcademicians,
  firstBookableWeekDay,
  freeSlots,
  offeredTimes,
  OFFICE_HOURS_CANCEL_REASON_MAX,
  OFFICE_HOURS_DESCRIPTION_MAX,
  OFFICE_HOURS_LOOKAHEAD_DAYS,
  OFFICE_HOURS_TITLE_MAX,
  OFFICE_HOURS_WEEK_DAYS,
  officeHoursRequestErrors,
  officeHoursWeek,
  optionsOf,
  type OfficeHoursFilter,
  type OfficeHoursRequestErrors,
} from "@/lib/student-office-hours";
import { fromTurkishWallClock, startOfTurkishDay } from "@/lib/turkey-time";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export const OFFICE_HOURS_ACADEMICIANS_QUERY_KEY = [
  "student-office-hours",
  "academicians",
] as const;
const OFFICE_HOURS_SLOTS_QUERY_KEY = ["student-office-hours", "slots"] as const;
export const STUDENT_OFFICE_HOURS_HREF = "/student/office-hours";
const APPOINTMENTS_HREF = "/student/appointments";

export function officeHoursProfileHref(id: string) {
  return `${STUDENT_OFFICE_HOURS_HREF}/${encodeURIComponent(id)}`;
}

/** The booking page, with a time already picked when `slot` (its start) is given. */
export function officeHoursBookingHref(id: string, slot?: string) {
  const href = `${officeHoursProfileHref(id)}/book`;
  return slot ? `${href}?slot=${encodeURIComponent(slot)}` : href;
}

function startOfToday() {
  return startOfTurkishDay(new Date());
}

function slotsQuery(
  academician: OfficeHoursAcademician | null,
  from: Date,
  days: number,
) {
  const id = academician?.id ?? null;
  const duration = academician?.durationMinutes ?? null;
  return {
    queryKey: [
      ...OFFICE_HOURS_SLOTS_QUERY_KEY,
      id,
      duration,
      from.toISOString(),
      days,
    ],
    queryFn: (): Promise<StudentOfficeHoursSlot[]> =>
      id !== null && duration !== null
        ? getOfficeHoursSlots(id, from, days)
        : Promise.resolve([]),
    // The advisor from the institution record has no Office Hours listing of their own to ask.
    enabled: id !== null && id !== ADVISOR_ACADEMICIAN_ID,
  };
}

/** The advisor (from the institutional record) or a directory entry, by the route's id. */
function useAcademicianEntry(id: string) {
  const isAdvisor = id === ADVISOR_ACADEMICIAN_ID;
  const record = useInstitutionRecord(isAdvisor);
  const sample = useQuery({
    queryKey: [...OFFICE_HOURS_ACADEMICIANS_QUERY_KEY, id],
    queryFn: () => getOfficeHoursAcademician(id),
    enabled: !isAdvisor,
  });
  // On the "advisor" route, the advisor's own listing (times, booking, history) once they opted in.
  const listed = useQuery({
    queryKey: OFFICE_HOURS_ACADEMICIANS_QUERY_KEY,
    queryFn: getOfficeHoursAcademicians,
    enabled: isAdvisor,
  });
  const advisorAccount = record.data?.advisor?.userId ?? null;
  const listedAdvisor =
    isAdvisor && advisorAccount !== null
      ? listed.data?.find((item) => item.accountId === advisorAccount)
      : undefined;
  const source = isAdvisor ? record : sample;
  const academician = isAdvisor
    ? (listedAdvisor ?? (record.data ? advisorAcademician(record.data) : null))
    : (sample.data ?? null);
  return {
    academician,
    /** Whose appointments are "with them": the listing's id, as the requests name it. */
    counterpartId: listedAdvisor?.id ?? (isAdvisor ? advisorAccount : id),
    isLoading: source.isLoading,
    error: source.error,
    notFound: source.isSuccess && academician === null,
  };
}

/** Office Hours (Figma 3.2): the advisor on top, then every academician with their nearest free slot. */
export function useStudentOfficeHours() {
  const academicians = useQuery({
    queryKey: OFFICE_HOURS_ACADEMICIANS_QUERY_KEY,
    queryFn: getOfficeHoursAcademicians,
  });
  const record = useInstitutionRecord();
  // The advisor's own listing when they opted in, otherwise their name from the record, with no times to ask.
  const advisorAccount = record.data?.advisor?.userId ?? null;
  const listedAdvisor =
    advisorAccount === null
      ? undefined
      : academicians.data?.find((item) => item.accountId === advisorAccount);
  const advisor =
    listedAdvisor ?? (record.data ? advisorAcademician(record.data) : null);
  const [from] = useState(startOfToday);
  const [filter, setFilter] = useState<OfficeHoursFilter>({
    query: "",
    faculty: null,
    department: null,
    availableOnly: true,
  });
  const directory = (academicians.data ?? []).filter(
    (item) => item.id !== listedAdvisor?.id,
  );
  const everyone = [...(advisor ? [advisor] : []), ...directory];
  const slots = useQueries({
    queries: everyone.map((item) =>
      slotsQuery(item, from, OFFICE_HOURS_LOOKAHEAD_DAYS),
    ),
  });
  const free = new Map(
    everyone.map((item, index) => [
      item.id,
      freeSlots(slots[index]?.data ?? []),
    ]),
  );
  const freeOf = (id: string) => free.get(id) ?? [];

  return {
    isLoading: academicians.isLoading,
    // "Müsait saati olanlar" decides on the slots, so the list waits for them before it can say "none".
    // isLoading, not isPending: an advisor without a listing has no slots to load, and a disabled query stays pending.
    isLoadingSlots: slots.some((query) => query.isLoading),
    error: academicians.error,
    advisor: advisor
      ? {
          academician: advisor,
          slots: freeOf(advisor.id).slice(0, ADVISOR_SLOT_PREVIEW),
        }
      : null,
    cards: filterAcademicians(
      directory,
      filter,
      (id) => freeOf(id).length > 0,
    ).map((academician) => ({
      academician,
      nearest: freeOf(academician.id)[0] ?? null,
    })),
    total: directory.length,
    filter,
    faculties: optionsOf(directory, "faculty"),
    departments: optionsOf(
      directory.filter(
        (item) => filter.faculty === null || item.faculty === filter.faculty,
      ),
      "department",
    ),
    setQuery: (query: string) =>
      setFilter((current) => ({ ...current, query })),
    setFaculty: (faculty: string | null) =>
      setFilter((current) => ({ ...current, faculty, department: null })),
    setDepartment: (department: string | null) =>
      setFilter((current) => ({ ...current, department })),
    toggleAvailableOnly: () =>
      setFilter((current) => ({
        ...current,
        availableOnly: !current.availableOnly,
      })),
  };
}

/** Akademisyen Profili (Figma 3.3): who they are, this week's free slots and past sessions with them. */
export function useOfficeHoursProfile(id: string) {
  const entry = useAcademicianEntry(id);
  const [from] = useState(startOfToday);
  const lookahead = useQuery(
    slotsQuery(entry.academician, from, OFFICE_HOURS_LOOKAHEAD_DAYS),
  );
  const appointments = useStudentAppointmentsQuery();
  const free = freeSlots(lookahead.data ?? []);
  const weekEnd = startOfWeek(from);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const withThem = (appointments.data ?? []).filter(
    (item) =>
      item.kind === AppointmentKind.OfficeHours &&
      // A request sent from this screen names the route's id ("advisor"); one from the backend names the account.
      (item.counterpart.userId === id ||
        item.counterpart.userId === entry.counterpartId),
  );
  return {
    ...entry,
    nearest: free[0] ?? null,
    thisWeek: free.filter(
      (slot) =>
        Date.parse(slot.startsAt) < fromTurkishWallClock(weekEnd).getTime(),
    ),
    past: splitAppointments(withThem, new Date(appointments.dataUpdatedAt))
      .past,
  };
}

/** Gün ve saat seç, then Randevu talebi (Figma 3.4, 3.5); `slot` is the start of a time picked on the profile. */
export function useOfficeHoursBooking(id: string, slot: string | null = null) {
  const t = useTranslations("iaStudent.officeHours.request");
  const entry = useAcademicianEntry(id);
  const { academician } = entry;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [firstDay] = useState(() => firstBookableWeekDay(new Date()));
  const [asked] = useState(() => bookableDay(slot, firstDay));
  const [anchor, setAnchor] = useState(asked ?? firstDay);
  const [pickedDay, setPickedDay] = useState<Date | null>(asked);
  // undefined until the student picks for themselves: the time the link names stands until then, if it is still free.
  const [chosen, setChosen] = useState<
    StudentOfficeHoursSlot | null | undefined
  >(undefined);
  const [formOpen, setFormOpen] = useState(false);
  // How often the student came back from the form: the times take focus then, not on first load.
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<OfficeHoursRequestErrors | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const weekStart = startOfWeek(anchor);
  const slots = useQuery(
    slotsQuery(academician, weekStart, OFFICE_HOURS_WEEK_DAYS),
  );
  const selected =
    chosen === undefined
      ? askedSlot(slots.data ?? [], asked === null ? null : slot)
      : chosen;
  const week = officeHoursWeek(slots.data ?? [], anchor);
  const day =
    week.find(
      (column) => pickedDay && isSameCalendarDay(column.day, pickedDay),
    ) ??
    week.find((column) => column.freeCount > 0) ??
    null;

  const send = useMutation({
    mutationFn: (input: {
      academician: OfficeHoursAcademician;
      slot: StudentOfficeHoursSlot;
    }) =>
      requestOfficeHours({
        academicianId: input.academician.id,
        slot: { startsAt: input.slot.startsAt, endsAt: input.slot.endsAt },
        title: title.trim(),
        description: description.trim(),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: STUDENT_APPOINTMENTS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({ queryKey: STUDENT_HOME_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: OFFICE_HOURS_SLOTS_QUERY_KEY,
        }),
      ]),
  });

  const resetForm = () => {
    setFormOpen(false);
    setStep((current) => current + 1);
    setTitle("");
    setDescription("");
    setErrors(null);
    setFailure(null);
  };

  const moveWeek = (step: 1 | -1) => {
    setAnchor((current) => {
      const next = startOfWeek(current);
      next.setDate(next.getDate() + 7 * step);
      return next;
    });
    setPickedDay(null);
    setChosen(null);
  };

  const submit = async () => {
    if (!academician || !selected || send.isPending || send.isSuccess) return;
    const found = officeHoursRequestErrors(title);
    setErrors(found);
    setFailure(null);
    if (found) return;
    try {
      await send.mutateAsync({ academician, slot: selected });
      showToast({ message: t("sent"), tone: ToastTone.Success });
      const name = academicianName(academician);
      router.push(`${APPOINTMENTS_HREF}?sent=${encodeURIComponent(name)}`);
    } catch (error) {
      setFailure(errorMessage(error, t("failed")));
    }
  };

  return {
    ...entry,
    week,
    weekStart,
    weekEnd: week.at(-1)?.day ?? weekStart,
    isLoadingSlots: slots.isLoading,
    /** Weeks before the first bookable one have nothing left to ask for. */
    canGoBack: weekStart > startOfWeek(firstDay),
    previousWeek: () => {
      if (weekStart > startOfWeek(firstDay)) moveWeek(-1);
    },
    nextWeek: () => moveWeek(1),
    day,
    pickDay: (next: Date) => {
      setPickedDay(next);
      setChosen(null);
    },
    selected,
    select: setChosen,
    freeThisWeek: week.reduce((total, column) => total + column.freeCount, 0),
    formOpen,
    backFromForm: step > 0,
    openForm: () => {
      if (!selected) return;
      // Fixed from here on, so a reload of the slots cannot take the time away from under the form.
      setChosen(selected);
      setFormOpen(true);
    },
    /** Back to the times with what is written kept; "Vazgeç" drops it. */
    changeTime: () => {
      setFormOpen(false);
      setStep((current) => current + 1);
      // The time may have gone to someone else meanwhile.
      setChosen((current) =>
        askedSlot(slots.data ?? [], current?.startsAt ?? null),
      );
    },
    closeForm: resetForm,
    title,
    setTitle: (value: string) => {
      setTitle(value);
      setErrors(null);
    },
    description,
    setDescription,
    titleMax: OFFICE_HOURS_TITLE_MAX,
    descriptionMax: OFFICE_HOURS_DESCRIPTION_MAX,
    errors,
    failure,
    // Stays on while Randevularım opens, so a second press cannot send it again.
    isSending: send.isPending || send.isSuccess,
    submit,
  };
}

/**
 * "Önerilen Saati Kabul Et" / "Reddet" on an Office Hours request with other times offered: take one of them, or
 * withdraw the request.
 */
export function useOfficeHoursAlternativeAnswer(appointment: Appointment) {
  const t = useTranslations("iaStudent.officeHours.answer");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const answer = useMutation({
    mutationFn: (time: string | null) =>
      answerOfficeHoursAlternative(appointment.id, time !== null, time),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: STUDENT_APPOINTMENTS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({ queryKey: STUDENT_HOME_QUERY_KEY }),
        // Withdrawing frees the time; taking another one books it.
        queryClient.invalidateQueries({
          queryKey: OFFICE_HOURS_SLOTS_QUERY_KEY,
        }),
      ]),
  });
  const respond = async (
    time: string | null,
    done: "accepted" | "declined" | "withdrawn",
  ) => {
    try {
      await answer.mutateAsync(time);
      showToast({
        message: t(done),
        tone: ToastTone.Success,
      });
    } catch (error) {
      showToast({
        message: errorMessage(error, t("failed")),
        tone: ToastTone.Error,
      });
    }
  };
  return {
    times: offeredTimes(appointment),
    canDecline: appointment.canWithdraw ?? true,
    accept: (time: string) => respond(time, "accepted"),
    decline: () => respond(null, "declined"),
    /** The same withdrawal, on a request nobody has answered yet. */
    withdraw: () => respond(null, "withdrawn"),
    isAnswering: answer.isPending,
  };
}

/** "Talebi geri çek": asked first, as the academician is told and the time is free for others again. */
export function useOfficeHoursWithdraw(appointment: Appointment) {
  const answer = useOfficeHoursAlternativeAnswer(appointment);
  const [isOpen, setIsOpen] = useState(false);
  return {
    counterpartName: titledName(
      appointment.counterpart.title,
      appointment.counterpart.fullName,
    ),
    isOpen,
    open: () => setIsOpen(true),
    close: () => {
      if (!answer.isAnswering) setIsOpen(false);
    },
    confirm: async () => {
      await answer.withdraw();
      setIsOpen(false);
    },
    isWithdrawing: answer.isAnswering,
  };
}

/**
 * "Randevuyu İptal Et" on a booked Office Hours meeting and its confirmation (Figma 235:3694): the student may add a
 * reason but never has to, and the academician is e-mailed.
 */
export function useOfficeHoursCancel(appointment: Appointment) {
  const t = useTranslations("iaStudent.officeHours.cancel");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  // Read when the card renders and again when the dialog opens; the backend refuses a started meeting either way.
  const [now, setNow] = useState(() => new Date());
  const cancel = useMutation({
    mutationFn: (why: string | null) =>
      cancelStudentOfficeHoursAppointment(appointment.id, why),
    // Settled, not only on success: a refused cancel (the meeting started, or the academician called it off first)
    // still brings the card up to date.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: STUDENT_APPOINTMENTS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({ queryKey: STUDENT_HOME_QUERY_KEY }),
        // The time is free again for everyone booking this academician.
        queryClient.invalidateQueries({
          queryKey: OFFICE_HOURS_SLOTS_QUERY_KEY,
        }),
      ]),
  });

  const confirm = async () => {
    const why = reason.trim();
    try {
      await cancel.mutateAsync(why || null);
      setIsOpen(false);
      setReason("");
      showToast({ message: t("done"), tone: ToastTone.Success });
    } catch (error) {
      showToast({
        message: errorMessage(error, t("failed")),
        tone: ToastTone.Error,
      });
    }
  };

  return {
    canCancel: canCancelOfficeHours(appointment, now),
    counterpartName: [
      appointment.counterpart.title,
      appointment.counterpart.fullName,
    ]
      .filter(Boolean)
      .join(" "),
    isOpen,
    open: () => {
      const at = new Date();
      setNow(at);
      if (!canCancelOfficeHours(appointment, at)) {
        showToast({ message: t("started"), tone: ToastTone.Error });
        return;
      }
      setIsOpen(true);
    },
    // Not while the cancel is on its way: "Vazgeç" would read as keeping the meeting while it is being called off.
    close: () => {
      if (cancel.isPending) return;
      setIsOpen(false);
      setReason("");
    },
    reason,
    setReason,
    reasonMax: OFFICE_HOURS_CANCEL_REASON_MAX,
    confirm,
    isCancelling: cancel.isPending,
  };
}
