"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import {
  WEEKDAY_ORDER,
  type MentorAvailabilitySettings,
  type UpdateMentorAvailabilitySettingsPayload,
  type Weekday,
} from "@/interfaces/mentor";
import { ToastTone } from "@/interfaces/toast";
import {
  AVAILABILITY_NUMBER_FIELDS,
  availabilityDraftError,
  DEFAULT_RANGE,
  EMPTY_EXCEPTION_INPUT,
  exceptionError,
  nextRangeAfter,
  rangesForDay,
  stepNumberValue,
  toAvailabilityDraft,
  toAvailabilityPayload,
  type AvailabilityDraft,
  type AvailabilityNumberField,
  type AvailabilityRange,
  type ExceptionInput,
} from "@/lib/mentor-availability";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

const ALL_NUMBER_FIELDS = AVAILABILITY_NUMBER_FIELDS.map((item) => item.field);

/**
 * Where an owner's availability settings come from and how a save reaches them. An owner
 * without a capacity or buffer lists only the number fields it uses: the others are neither
 * shown nor checked, and their saved values go back unchanged.
 */
export type WeeklyAvailabilitySource = {
  settings: MentorAvailabilitySettings | undefined;
  loadFailed: boolean;
  save: (payload: UpdateMentorAvailabilitySettingsPayload) => Promise<unknown>;
  isSaving: boolean;
  numberFields?: readonly AvailabilityNumberField[];
  /** An owner whose number fields mean something else (a student limit, say) names them itself. */
  numberFieldLabels?: Partial<Record<AvailabilityNumberField, string>>;
  /** One more rule of the owner's, checked before a save: what is wrong, in the words the owner reads, or null. */
  check?: (draft: AvailabilityDraft) => string | null;
  /** A step that only keeps a draft (the peer-mentor wizard) says nothing on save; the owner confirms later. */
  quiet?: boolean;
  /** Ranges to start from when the owner has saved none; saved ranges always win. */
  suggestion?: readonly Pick<
    AvailabilityRange,
    "dayOfWeek" | "startTime" | "endTime"
  >[];
};

function withSavedNumbers(
  edits: AvailabilityDraft,
  saved: AvailabilityDraft,
  touched: readonly AvailabilityNumberField[],
): AvailabilityDraft {
  const kept = { ...edits };
  for (const field of ALL_NUMBER_FIELDS) {
    if (!touched.includes(field)) kept[field] = saved[field];
  }
  return kept;
}

/**
 * Edits one owner's weekly availability: time ranges per weekday, the number fields and
 * unavailable dates. The owner (a mentor today; a peer mentor or an academician later) only
 * supplies where the settings come from and how they are saved.
 */
export function useWeeklyAvailabilityForm(
  source: WeeklyAvailabilitySource,
  onSaved: () => void,
) {
  const t = useTranslations("availabilityEditor");
  const tOptions = useTranslations("options");
  const { showToast } = useToast();
  const { settings, numberFields = ALL_NUMBER_FIELDS, suggestion } = source;
  const suggested =
    settings?.rules.length === 0 && (suggestion?.length ?? 0) > 0;
  const loaded = useMemo(() => {
    if (!settings) return null;
    const saved = toAvailabilityDraft(settings);
    if (!suggested || !suggestion) return saved;
    return {
      ...saved,
      ranges: suggestion.map((range, index) => ({
        ...range,
        key: `suggested-${String(index)}`,
        slotMinutes: null,
      })),
    };
  }, [settings, suggested, suggestion]);
  const [edits, setEdits] = useState<AvailabilityDraft | null>(null);
  const [exception, setException] = useState<ExceptionInput>(
    EMPTY_EXCEPTION_INPUT,
  );
  const [error, setError] = useState<string | null>(null);
  const [isAddingException, setIsAddingException] = useState(false);
  const nextKey = useRef(0);
  // A number the owner left alone here follows what is saved, so a limit changed elsewhere is not undone by this form.
  const [touched, setTouched] = useState<readonly AvailabilityNumberField[]>(
    [],
  );
  const draft =
    edits && loaded ? withSavedNumbers(edits, loaded, touched) : loaded;

  const change = (
    update: (current: AvailabilityDraft) => AvailabilityDraft,
  ) => {
    setError(null);
    setEdits((current) => {
      const base =
        current && loaded ? withSavedNumbers(current, loaded, touched) : loaded;
      return base ? update(base) : current;
    });
  };
  // Keys are taken in the handler, not inside the state updater, so the updater stays pure.
  const newKey = () => `new-${(nextKey.current += 1)}`;

  const toggleDay = (day: Weekday) => {
    const key = newKey();
    change((current) =>
      current.ranges.some((range) => range.dayOfWeek === day)
        ? {
            ...current,
            ranges: current.ranges.filter((range) => range.dayOfWeek !== day),
          }
        : {
            ...current,
            ranges: [
              ...current.ranges,
              { key, dayOfWeek: day, ...DEFAULT_RANGE, slotMinutes: null },
            ],
          },
    );
  };

  const addRange = (
    day: Weekday,
    first: Pick<AvailabilityRange, "startTime" | "endTime"> | null = null,
  ) => {
    const key = newKey();
    change((current) => ({
      ...current,
      ranges: [
        ...current.ranges,
        {
          key,
          dayOfWeek: day,
          ...(first ?? nextRangeAfter(rangesForDay(current, day))),
          slotMinutes: null,
        },
      ],
    }));
  };

  const removeRange = (key: string) =>
    change((current) => ({
      ...current,
      ranges: current.ranges.filter((range) => range.key !== key),
    }));

  const updateRange = (
    key: string,
    field: "startTime" | "endTime",
    value: string,
  ) =>
    change((current) => ({
      ...current,
      ranges: current.ranges.map((range) =>
        range.key === key ? { ...range, [field]: value } : range,
      ),
    }));

  const touch = (field: AvailabilityNumberField) =>
    setTouched((current) => [...current, field]);

  const setNumber = (field: AvailabilityNumberField, value: string) => {
    touch(field);
    change((current) => ({ ...current, [field]: value }));
  };

  const stepNumber = (field: AvailabilityNumberField, direction: 1 | -1) => {
    const bounds = AVAILABILITY_NUMBER_FIELDS.find(
      (item) => item.field === field,
    );
    if (!bounds) return;
    touch(field);
    change((current) => ({
      ...current,
      [field]: stepNumberValue(current[field], bounds, direction),
    }));
  };

  const openExceptionForm = () => setIsAddingException(true);

  const closeExceptionForm = () => {
    setIsAddingException(false);
    setException(EMPTY_EXCEPTION_INPUT);
    setError(null);
  };

  const setExceptionField = (field: keyof ExceptionInput, value: string) => {
    setError(null);
    setException((current) => ({ ...current, [field]: value }));
  };

  const addException = () => {
    if (!draft) return;
    const candidate = {
      startsOn: exception.startsOn,
      endsOn: exception.endsOn || exception.startsOn,
      reason: exception.reason.trim() || null,
    };
    const problem = exceptionError(candidate, draft.exceptions);
    if (problem) {
      setError(problem);
      return;
    }
    change((current) => ({
      ...current,
      exceptions: [...current.exceptions, candidate],
    }));
    setException(EMPTY_EXCEPTION_INPUT);
    setIsAddingException(false);
  };

  const removeException = (index: number) =>
    change((current) => ({
      ...current,
      exceptions: current.exceptions.filter(
        (_, position) => position !== index,
      ),
    }));

  const save = async () => {
    if (!draft) return;
    const problem =
      availabilityDraftError(draft, {
        capacityRequired: settings?.menteeCapacity != null,
        fields: numberFields,
      }) ??
      source.check?.(draft) ??
      null;
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await source.save(toAvailabilityPayload(draft));
      setEdits(null);
      setTouched([]);
      if (!source.quiet)
        showToast({ message: t("saved"), tone: ToastTone.Success });
      onSaved();
    } catch (saveError) {
      const message = errorMessage(saveError, t("saveFailed"));
      setError(message);
      showToast({ message, tone: ToastTone.Error });
    }
  };

  return {
    addException,
    addRange,
    closeExceptionForm,
    days: draft
      ? WEEKDAY_ORDER.map((day) => ({
          day,
          label: tOptions(`weekday.${day}`),
          ranges: rangesForDay(draft, day),
        }))
      : [],
    draft,
    error,
    exception,
    isAddingException,
    isSaving: source.isSaving,
    loadError: source.loadFailed ? t("loadFailed") : null,
    numberFields,
    numberFieldLabels: source.numberFieldLabels ?? {},
    openExceptionForm,
    removeException,
    removeRange,
    save,
    /** The ranges shown were proposed, not saved: the owner still has to save them. */
    suggested,
    setExceptionField,
    setNumber,
    stepNumber,
    toggleDay,
    updateRange,
  };
}

export type WeeklyAvailabilityForm = ReturnType<
  typeof useWeeklyAvailabilityForm
>;
