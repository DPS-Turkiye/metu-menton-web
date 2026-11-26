"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";

import type {
  AcademicianAvailability,
  UpdateAcademicianAvailabilityPayload,
} from "@/interfaces/academician-office-hours";
import { Weekday } from "@/interfaces/mentor";
import type {
  OfficeHoursAffectedItem,
  OfficeHoursAffectedRequest,
  OfficeHoursAvailabilityImpact,
  OfficeHoursTimeRange,
} from "@/interfaces/office-hours-me";
import { ToastTone } from "@/interfaces/toast";
import {
  availabilitySummary,
  dayOffError,
  EDITABLE_AVAILABILITY_KINDS,
  oneOffError,
  ruleError,
  withDayOff,
  withOneOff,
  withoutDayOff,
  withoutOneOff,
  withoutRule,
  withRule,
  type AvailabilityItem,
  type DayOffInput,
  type OneOffInput,
  type RuleInput,
} from "@/lib/academician-availability";
import {
  ACADEMICIAN_AVAILABILITY_QUERY_KEY,
  ACADEMICIAN_OFFICE_HOURS_QUERY_KEY,
} from "@/lib/academician-office-hours";
import { ACADEMICIAN_ROUTES } from "@/lib/academician-routes";
import { affectedItems } from "@/lib/availability-impact";
import {
  getAcademicianAvailability,
  saveAcademicianAvailability,
} from "@/lib/client/academician-office-hours";
import { formatDateRange } from "@/lib/format";
import {
  toTurkishDate,
  toTurkishWallClock,
  TURKEY_TIME_ZONE,
} from "@/lib/turkey-time";
import { calendarDay } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import {
  AvailabilityItemKind,
  AvailabilitySaveResult,
} from "@/types/academician-office-hours";

export type EditableRow = {
  id: string;
  kind: AvailabilityItemKind;
  title: string;
  hint: string;
};

/** One meeting or request a change would leave outside the hours, as the review lists it. */
export type AffectedRow = {
  id: string;
  title: string;
  lines: string[];
};

/** A change held back until the academician has seen what it touches (FR-OH-29). */
type ReviewState = {
  payload: UpdateAcademicianAvailabilityPayload;
  done: string;
  impact: OfficeHoursAvailabilityImpact;
  changed: boolean;
};

type SaveInput = {
  payload: UpdateAcademicianAvailabilityPayload;
  done: string;
  /** What the academician confirmed in the review; null on the first try. */
  confirmed: OfficeHoursAffectedItem[] | null;
};

type Fields = {
  rule: RuleInput;
  oneOff: OneOffInput;
  dayOff: DayOffInput;
};

const EMPTY_FIELDS: Fields = {
  rule: { dayOfWeek: Weekday.Monday, startTime: "", endTime: "" },
  oneOff: { date: "", startTime: "", endTime: "", place: "" },
  dayOff: { startsOn: "", endsOn: "", reason: "" },
};

type DialogState = {
  kind: AvailabilityItemKind;
  /** The item being edited; null while adding. */
  editing: string | null;
  /** Opened from the page's "Müsaitlik Ekle", so the kind is still a choice. */
  chooseKind: boolean;
  fields: Fields;
  error: string | null;
};

function idOf(item: AvailabilityItem) {
  switch (item.kind) {
    case AvailabilityItemKind.Recurring:
      return item.rule.id;
    case AvailabilityItemKind.OneOff:
      return item.oneOff.id ?? item.oneOff.startsAt;
    case AvailabilityItemKind.Unavailable:
      return item.exception.id ?? item.exception.startsOn;
  }
}

/** "HH:mm" of a moment on Turkey's clock, for a time input. */
function clockOf(value: string) {
  const date = toTurkishWallClock(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The form filled in with an item, for editing it. */
function fieldsFor(item: AvailabilityItem): Fields {
  switch (item.kind) {
    case AvailabilityItemKind.Recurring:
      return {
        ...EMPTY_FIELDS,
        rule: {
          dayOfWeek: item.rule.dayOfWeek,
          startTime: item.rule.startTime,
          endTime: item.rule.endTime,
        },
      };
    case AvailabilityItemKind.OneOff:
      return {
        ...EMPTY_FIELDS,
        oneOff: {
          date: toTurkishDate(item.oneOff.startsAt),
          startTime: clockOf(item.oneOff.startsAt),
          endTime: clockOf(item.oneOff.endsAt),
          place: item.oneOff.place ?? "",
        },
      };
    case AvailabilityItemKind.Unavailable:
      return {
        ...EMPTY_FIELDS,
        dayOff: {
          startsOn: item.exception.startsOn,
          endsOn: item.exception.endsOn,
          reason: item.exception.reason ?? "",
        },
      };
  }
}

/** "Müsaitliği düzenle": the three lists, adding and editing through one dialog, removing from a row's menu. */
export function useAcademicianAvailabilityEditor() {
  const t = useTranslations("iaAcademician.availability");
  const tWeekday = useTranslations("options.weekday");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const query = useQuery({
    queryKey: ACADEMICIAN_AVAILABILITY_QUERY_KEY,
    queryFn: getAcademicianAvailability,
  });
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const save = useMutation({
    mutationFn: ({ payload, confirmed }: SaveInput) =>
      saveAcademicianAvailability(payload, confirmed),
    onSuccess: (outcome, { payload, done }) => {
      switch (outcome.result) {
        case AvailabilitySaveResult.Review:
          setReview({
            payload,
            done,
            impact: outcome.impact,
            changed: outcome.changed,
          });
          return;
        case AvailabilitySaveResult.Saved:
          queryClient.setQueryData(
            ACADEMICIAN_AVAILABILITY_QUERY_KEY,
            outcome.availability,
          );
          showToast({ message: done, tone: ToastTone.Success });
          setReview(null);
          setDialog(null);
      }
    },
    onError: () => {
      showToast({ message: t("failed"), tone: ToastTone.Error });
    },
    // The calendar, the rail and Ana Sayfa all read the hours.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ACADEMICIAN_OFFICE_HOURS_QUERY_KEY,
      }),
  });

  const shared = {
    isLoading: query.isLoading,
    error: query.error,
    retry: () => void query.refetch(),
    isRetrying: query.isRefetching,
  };
  const availability = query.data;
  if (!availability) return { ...shared, editor: null };

  const now = new Date(query.dataUpdatedAt);
  const items = availabilitySummary(availability, now);
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TURKEY_TIME_ZONE,
  });
  const longDayOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  // Moments are shown in Turkey time; day strings ("YYYY-MM-DD") are already days and stay as they are.
  const longMoment = new Intl.DateTimeFormat(locale, {
    ...longDayOptions,
    timeZone: TURKEY_TIME_ZONE,
  });
  const longDay = new Intl.DateTimeFormat(locale, longDayOptions);

  const toRow = (item: AvailabilityItem): EditableRow => {
    switch (item.kind) {
      case AvailabilityItemKind.Recurring:
        return {
          id: idOf(item),
          kind: item.kind,
          title: t("recurringRow", {
            weekday: tWeekday(item.rule.dayOfWeek),
            hours: `${item.rule.startTime} – ${item.rule.endTime}`,
          }),
          hint: t("cards.recurring.rowHint"),
        };
      case AvailabilityItemKind.OneOff:
        return {
          id: idOf(item),
          kind: item.kind,
          title: t("dateRow", {
            date: longMoment.format(new Date(item.oneOff.startsAt)),
            hours: formatDateRange(
              clock,
              new Date(item.oneOff.startsAt),
              new Date(item.oneOff.endsAt),
            ),
          }),
          hint:
            item.oneOff.place === null
              ? t("cards.oneOff.rowHint")
              : t("cards.oneOff.rowHintPlace", { place: item.oneOff.place }),
        };
      case AvailabilityItemKind.Unavailable:
        return {
          id: idOf(item),
          kind: item.kind,
          title: t("dateRow", {
            date: formatDateRange(
              longDay,
              calendarDay(item.exception.startsOn),
              calendarDay(item.exception.endsOn),
            ),
            hours: t("allDay"),
          }),
          hint:
            item.exception.reason === null
              ? t("cards.unavailable.rowHint")
              : t("cards.unavailable.rowHintReason", {
                  reason: item.exception.reason,
                }),
        };
    }
  };

  const rowsOf = (kind: AvailabilityItemKind) =>
    items.filter((item) => item.kind === kind).map(toRow);

  const timeOf = (time: OfficeHoursTimeRange) =>
    t("dateRow", {
      date: longMoment.format(new Date(time.startsAt)),
      hours: formatDateRange(
        clock,
        new Date(time.startsAt),
        new Date(time.endsAt),
      ),
    });
  const studentOf = (name: string | null) => name ?? t("impact.someone");
  const timesOf = (times: OfficeHoursTimeRange[]) =>
    times.map(timeOf).join(", ");
  const requestLines = (request: OfficeHoursAffectedRequest) => {
    const lines = [
      request.topic,
      t("impact.lost", { times: timesOf(request.lostTimes) }),
    ];
    if (request.keptTimes.length > 0) {
      lines.push(t("impact.kept", { times: timesOf(request.keptTimes) }));
    }
    return lines;
  };
  const reviewRows = review && {
    changed: review.changed,
    meetings: review.impact.meetings.map((meeting): AffectedRow => ({
      id: meeting.requestId,
      title: studentOf(meeting.studentName),
      lines: [timeOf(meeting.time), meeting.topic, meeting.courseName].filter(
        (line) => line !== null,
      ),
    })),
    requests: review.impact.requests.map((request): AffectedRow => ({
      id: request.requestId,
      title: studentOf(request.studentName),
      lines: requestLines(request),
    })),
  };

  const saveHours = (
    payload: UpdateAcademicianAvailabilityPayload,
    done: string,
  ) => {
    save.mutate({ payload, done, confirmed: null });
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!dialog) return;
    const result = payloadFor(availability, dialog, now);
    if (typeof result === "string") {
      setDialog({ ...dialog, error: t(`errors.${result}`) });
      return;
    }
    saveHours(result, t("saved"));
  };

  const remove = (kind: AvailabilityItemKind, id: string) => {
    saveHours(removal(availability, kind, id), t("removed"));
  };

  return {
    ...shared,
    editor: {
      kinds: EDITABLE_AVAILABILITY_KINDS,
      recurring: rowsOf(AvailabilityItemKind.Recurring),
      oneOff: rowsOf(AvailabilityItemKind.OneOff),
      unavailable: rowsOf(AvailabilityItemKind.Unavailable),
      // The review takes the dialog's place; closing it brings the dialog back as it was.
      dialog: review ? null : dialog,
      review: reviewRows,
      manageHref: ACADEMICIAN_ROUTES.appointments,
      confirmReview: () => {
        if (!review) return;
        save.mutate({
          payload: review.payload,
          done: review.done,
          confirmed: affectedItems(review.impact),
        });
      },
      closeReview: () => {
        // A save already sent goes through whatever the dialog does, so it stays open until the answer comes.
        if (save.isPending) return;
        setReview(null);
      },
      openAdd: (kind: AvailabilityItemKind | null) => {
        setDialog({
          kind: kind ?? AvailabilityItemKind.Recurring,
          editing: null,
          chooseKind: kind === null,
          fields: EMPTY_FIELDS,
          error: null,
        });
      },
      openEdit: (kind: AvailabilityItemKind, id: string) => {
        const item = items.find(
          (candidate) => candidate.kind === kind && idOf(candidate) === id,
        );
        if (!item) return;
        setDialog({
          kind,
          editing: id,
          chooseKind: false,
          fields: fieldsFor(item),
          error: null,
        });
      },
      setKind: (kind: AvailabilityItemKind) => {
        if (dialog) setDialog({ ...dialog, kind, error: null });
      },
      setRule: (change: Partial<RuleInput>) => {
        if (!dialog) return;
        setDialog({
          ...dialog,
          error: null,
          fields: {
            ...dialog.fields,
            rule: { ...dialog.fields.rule, ...change },
          },
        });
      },
      setOneOff: (change: Partial<OneOffInput>) => {
        if (!dialog) return;
        setDialog({
          ...dialog,
          error: null,
          fields: {
            ...dialog.fields,
            oneOff: { ...dialog.fields.oneOff, ...change },
          },
        });
      },
      setDayOff: (change: Partial<DayOffInput>) => {
        if (!dialog) return;
        setDialog({
          ...dialog,
          error: null,
          fields: {
            ...dialog.fields,
            dayOff: { ...dialog.fields.dayOff, ...change },
          },
        });
      },
      closeDialog: () => {
        setDialog(null);
      },
      submit,
      remove,
      isSaving: save.isPending,
    },
  };
}

/** The save for the dialog, or the reason it can't be saved. */
function payloadFor(
  availability: AcademicianAvailability,
  dialog: DialogState,
  now: Date,
) {
  const { fields, editing } = dialog;
  switch (dialog.kind) {
    case AvailabilityItemKind.Recurring:
      return (
        ruleError(fields.rule, availability.rules, editing) ??
        withRule(availability, fields.rule, editing)
      );
    case AvailabilityItemKind.OneOff:
      return (
        oneOffError(fields.oneOff, availability, editing, now) ??
        withOneOff(availability, fields.oneOff, editing)
      );
    case AvailabilityItemKind.Unavailable:
      return (
        dayOffError(fields.dayOff, availability, editing, now) ??
        withDayOff(availability, fields.dayOff, editing)
      );
  }
}

function removal(
  availability: AcademicianAvailability,
  kind: AvailabilityItemKind,
  id: string,
) {
  switch (kind) {
    case AvailabilityItemKind.Recurring:
      return withoutRule(availability, id);
    case AvailabilityItemKind.OneOff:
      return withoutOneOff(availability, id);
    case AvailabilityItemKind.Unavailable:
      return withoutDayOff(availability, id);
  }
}

export type AcademicianAvailabilityEditor = NonNullable<
  ReturnType<typeof useAcademicianAvailabilityEditor>["editor"]
>;
