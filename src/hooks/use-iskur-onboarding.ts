"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useSession } from "@/components/providers/session-provider";
import { useOnboardingExit } from "@/hooks/use-onboarding-exit";
import type {
  IskurDocumentSlot,
  IskurLeadership,
  IskurOnboarding,
  IskurOnboardingForm,
  IskurSkillLevel,
  IskurTeamRolePreference,
} from "@/interfaces/iskur-onboarding";
import type { Weekday } from "@/interfaces/mentor";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  getIskurOnboarding,
  removeIskurOnboardingDocument,
  saveIskurOnboardingDraft,
  submitIskurOnboarding,
  uploadIskurOnboardingDocument,
} from "@/lib/client/iskur-onboarding";
import {
  askedSkillGroups,
  dayMinutes,
  hasOverlap,
  ISKUR_FORM_STEPS,
  ISKUR_ONBOARDING_LATER_COOKIE,
  ISKUR_RANGES_PER_DAY_MAX,
  ISKUR_TEAM_ROLES_MAX,
  iskurDocumentProblem,
  leadershipEligibility,
  neededIskurDays,
  nextStepsAfterSubmit,
  onboardingInput,
  rangeMinutes,
  remainingIskurDays,
  scheduledDays,
  scheduleMatches,
  scheduleMinutes,
  stepComplete,
  targetMinutes,
} from "@/lib/iskur-onboarding";
import { withKey, withKeys } from "@/lib/keyed-list";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import {
  IskurOnboardingStep,
  IskurStepState,
  type IskurRangeRow,
} from "@/types/iskur-onboarding";

export const iskurOnboardingQueryKey = ["iskur-onboarding"] as const;

/** A new day starts as one full work day; the intern splits or trims it. */
const NEW_DAY_RANGE = { start: "09:00", end: "16:30" } as const;
const NOT_FOUND = 404;
const CONFLICT = 409;

type Draft = { form: IskurOnboardingForm; rows: IskurRangeRow[] };

function draftOf(onboarding: IskurOnboarding): Draft {
  return {
    form: onboarding.form,
    rows: withKeys(onboarding.form.schedule),
  };
}

/**
 * The İŞKUR onboarding wizard (Figma 01–04 and the Belgeler / Önizle steps): the form as the intern edits it, the
 * step they are on, and saving, uploading and sending it. The server's form shows until the first edit.
 */
export function useIskurOnboarding() {
  const t = useTranslations("iskurOnboarding");
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: iskurOnboardingQueryKey,
    queryFn: getIskurOnboarding,
    retry: false,
  });
  const [edits, setEdits] = useState<Draft | null>(null);
  const [step, setStep] = useState(IskurOnboardingStep.Welcome);
  // A sent form opened again ("Gönderdiğim formu görüntüle"), to read or to change until the intern is placed.
  const [reopened, setReopened] = useState(false);
  const [prepared, setPrepared] = useState<ReadonlySet<number>>(new Set());
  const { session } = useSession();

  const onboarding = query.data ?? null;
  // Keyed once per server answer, so the rows keep their keys (and inputs their focus) across renders.
  const base = useMemo(
    () => (onboarding ? draftOf(onboarding) : null),
    [onboarding],
  );
  const draft = edits ?? base;
  const context = onboarding?.context ?? null;

  const replaceFromServer = (next: IskurOnboarding) => {
    queryClient.setQueryData(iskurOnboardingQueryKey, next);
    // Files change only the documents; the rest of what the intern typed stays.
    setEdits((current) =>
      current
        ? {
            ...current,
            form: { ...current.form, documents: next.form.documents },
          }
        : null,
    );
  };

  const failed = (fallback: string) => (failure: Error) =>
    showToast({
      message: errorMessage(failure, fallback),
      tone: ToastTone.Error,
    });

  const closeReopened = () => {
    setEdits(null);
    setReopened(false);
  };

  const save = useMutation({
    mutationFn: (current: Draft) =>
      saveIskurOnboardingDraft(onboardingInput(current.form, current.rows)),
    onSuccess: (next) =>
      queryClient.setQueryData(iskurOnboardingQueryKey, next),
    onError: failed(t("saveFailed")),
  });
  const submit = useMutation({
    mutationFn: (current: Draft) =>
      submitIskurOnboarding(onboardingInput(current.form, current.rows)),
    onSuccess: (next) => {
      queryClient.setQueryData(iskurOnboardingQueryKey, next);
      setEdits(null);
      if (reopened) {
        setReopened(false);
        showToast({ message: t("changesSent"), tone: ToastTone.Success });
      }
    },
    onError: (failure) => {
      failed(t("submitFailed"))(failure);
      // Placed in the meantime: the form is closed now, so the sent one shows again.
      if (
        failure instanceof ClientApiError &&
        failure.status === CONFLICT &&
        reopened
      ) {
        closeReopened();
        void query.refetch();
      }
    },
  });
  const upload = useMutation({
    mutationFn: ({ slot, file }: { slot: IskurDocumentSlot; file: File }) =>
      uploadIskurOnboardingDocument(slot, file),
    onSuccess: replaceFromServer,
    onError: failed(t("documents.uploadFailed")),
  });
  const remove = useMutation({
    mutationFn: removeIskurOnboardingDocument,
    onSuccess: replaceFromServer,
    onError: failed(t("documents.removeFailed")),
  });
  const busy =
    save.isPending || submit.isPending || upload.isPending || remove.isPending;

  // From the latest edits, so two changes in one event both land.
  const edit = (update: (current: Draft) => Draft) =>
    setEdits((current) => {
      const from = current ?? base;
      return from ? update(from) : current;
    });
  const editForm = (
    update: (form: IskurOnboardingForm) => IskurOnboardingForm,
  ) => edit((current) => ({ ...current, form: update(current.form) }));

  const form = draft?.form ?? null;
  const rows = draft?.rows ?? [];
  const eligibility = leadershipEligibility({
    weeklyDays: form?.weeklyDays ?? null,
    priorIskurDays: form?.priorIskurDays ?? null,
    hasCv: form?.documents.cv != null,
    documentsEnabled: context?.documentsEnabled ?? false,
    termWeeks: context?.termWeeks ?? 0,
    minimumLeaderDays: context?.minimumLeaderDays ?? 0,
    maxIskurDays: context?.maxIskurDays ?? 0,
  });
  const complete = (which: IskurOnboardingStep) =>
    form !== null &&
    context !== null &&
    stepComplete(
      which,
      form,
      rows,
      context.units,
      context.documentsEnabled,
      eligibility,
    );
  const stepIndex = ISKUR_FORM_STEPS.findIndex((item) => item === step);
  const steps = ISKUR_FORM_STEPS.map((item, index) => ({
    step: item,
    state:
      item === step
        ? IskurStepState.Current
        : index < stepIndex || (complete(item) && index <= stepIndex)
          ? IskurStepState.Done
          : IskurStepState.Upcoming,
  }));

  const go = (next: IskurOnboardingStep) => {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const saveAndGo = (next: IskurOnboardingStep) => {
    if (!draft || busy) return;
    // A sent form's changes are sent together from the preview, not saved step by step.
    if (reopened) {
      go(next);
      return;
    }
    save.mutate(draft, { onSuccess: () => go(next) });
  };

  // "Çıkış yap" keeps what the intern typed as a draft before signing out.
  const { exit, exiting } = useOnboardingExit(
    draft && !draft.form.submittedAt
      ? () => save.mutateAsync(draft)
      : undefined,
  );

  const notIntern =
    query.error instanceof ClientApiError && query.error.status === NOT_FOUND;

  return {
    isLoading: query.isLoading,
    loadError: notIntern ? null : query.error,
    notIntern,
    retry: () => void query.refetch(),
    firstName: session?.fullName.trim().split(/\s+/)[0] ?? "",
    unitCount: context?.units.length ?? 0,
    teamCount:
      context?.units.reduce(
        (total, unit) => total + unit.teamNames.length,
        0,
      ) ?? 0,
    logout: () => void exit(),
    exiting,
    context,
    form,
    rows,
    step,
    steps,
    busy,
    submitted: form?.submittedAt != null && !reopened,
    editable: context?.editable ?? false,
    reopened,
    reopen: () => {
      setReopened(true);
      go(IskurOnboardingStep.Preview);
    },
    closeReopened,
    nextSteps: form ? nextStepsAfterSubmit(form) : [],

    // 01 Hoş geldin
    prepared,
    togglePrepared: (item: number) =>
      setPrepared((current) => {
        const next = new Set(current);
        if (next.has(item)) next.delete(item);
        else next.add(item);
        return next;
      }),
    start: () => go(IskurOnboardingStep.Days),
    remindLater: () => {
      // A session cookie: the gate lets the intern in until the browser closes, then asks again.
      document.cookie = `${ISKUR_ONBOARDING_LATER_COOKIE}=1; path=/; samesite=lax`;
      router.push("/student");
    },

    // 02 Görev günleri
    totalMinutes: scheduleMinutes(rows),
    targetMinutes: targetMinutes(form?.weeklyDays ?? null),
    scheduleMatches: scheduleMatches(form?.weeklyDays ?? null, rows),
    scheduleOverlaps: hasOverlap(rows),
    scheduledDays: scheduledDays(rows),
    dayMinutes: (day: Weekday) => dayMinutes(rows, day),
    rangeMinutesOf: rangeMinutes,
    rowsOf: (day: Weekday) => rows.filter((row) => row.day === day),
    canAddRange: (day: Weekday) =>
      rows.filter((row) => row.day === day).length < ISKUR_RANGES_PER_DAY_MAX,
    setWeeklyDays: (weeklyDays: number) =>
      editForm((current) => ({ ...current, weeklyDays })),
    toggleDay: (day: Weekday) =>
      edit((current) => ({
        ...current,
        rows: current.rows.some((row) => row.day === day)
          ? current.rows.filter((row) => row.day !== day)
          : [...current.rows, withKey({ day, ...NEW_DAY_RANGE })],
      })),
    addRange: (day: Weekday) =>
      edit((current) =>
        current.rows.filter((row) => row.day === day).length >=
        ISKUR_RANGES_PER_DAY_MAX
          ? current
          : {
              ...current,
              rows: [...current.rows, withKey({ day, start: "", end: "" })],
            },
      ),
    updateRange: (key: string, patch: { start?: string; end?: string }) =>
      edit((current) => ({
        ...current,
        rows: current.rows.map((row) =>
          row.key === key ? { ...row, ...patch } : row,
        ),
      })),
    removeRange: (key: string) =>
      edit((current) => ({
        ...current,
        rows: current.rows.filter((row) => row.key !== key),
      })),
    remainingDays: remainingIskurDays(
      form?.priorIskurDays ?? null,
      context?.maxIskurDays ?? 0,
    ),
    neededDays: neededIskurDays(
      form?.weeklyDays ?? null,
      context?.termWeeks ?? 0,
    ),
    setPriorDays: (value: string) => {
      const days = value.trim() === "" ? null : Number(value);
      if (days !== null && (!Number.isInteger(days) || days < 0)) return;
      editForm((current) => ({
        ...current,
        priorIskurDays:
          days === null ? null : Math.min(days, context?.maxIskurDays ?? days),
      }));
    },

    // 03 Tercihler ve yetkinlikler
    skillGroups:
      context && form ? askedSkillGroups(context.units, form.unitIds) : [],
    levelOf: (skillId: string) =>
      form?.skills.find((answer) => answer.skillId === skillId)?.level ?? null,
    toggleUnit: (unitId: string) =>
      editForm((current) => ({
        ...current,
        unitIds: current.unitIds.includes(unitId)
          ? current.unitIds.filter((id) => id !== unitId)
          : [...current.unitIds, unitId],
      })),
    setSkillLevel: (skillId: string, level: IskurSkillLevel) =>
      editForm((current) => ({
        ...current,
        skills: [
          ...current.skills.filter((answer) => answer.skillId !== skillId),
          { skillId, level },
        ],
      })),
    toggleTeamRole: (role: IskurTeamRolePreference) =>
      editForm((current) => {
        if (current.teamRoles.includes(role)) {
          return {
            ...current,
            teamRoles: current.teamRoles.filter((item) => item !== role),
          };
        }
        if (current.teamRoles.length >= ISKUR_TEAM_ROLES_MAX) return current;
        return { ...current, teamRoles: [...current.teamRoles, role] };
      }),
    teamRolesFull: (form?.teamRoles.length ?? 0) >= ISKUR_TEAM_ROLES_MAX,

    // Belgeler
    upload: (slot: IskurDocumentSlot, file: File) => {
      if (busy) return;
      const problem = iskurDocumentProblem(file);
      if (problem) {
        showToast({
          message: t(`documents.${problem}`),
          tone: ToastTone.Error,
        });
        return;
      }
      upload.mutate({ slot, file });
    },
    removeDocument: (slot: IskurDocumentSlot) => {
      if (busy) return;
      remove.mutate(slot);
    },

    // 04 Liderlik başvurusu
    eligibility,
    setWantsLeadership: (wants: boolean) =>
      editForm((current) => ({
        ...current,
        leadership: { ...current.leadership, wants },
      })),
    setAnswer: (field: keyof Omit<IskurLeadership, "wants">, value: string) =>
      editForm((current) => ({
        ...current,
        leadership: { ...current.leadership, [field]: value },
      })),

    // The action bar
    // A reopened form is sent again only once something in it changed.
    canContinue:
      complete(step) &&
      (!reopened || step !== IskurOnboardingStep.Preview || edits !== null),
    back: () => {
      if (busy) return;
      const previous = ISKUR_FORM_STEPS[stepIndex - 1];
      go(
        previous ??
          (reopened
            ? IskurOnboardingStep.Preview
            : IskurOnboardingStep.Welcome),
      );
    },
    goTo: (target: IskurOnboardingStep) => {
      if (busy) return;
      const index = ISKUR_FORM_STEPS.findIndex((item) => item === target);
      // Back to any earlier step, or forward over steps that are already answered.
      const reachable = ISKUR_FORM_STEPS.slice(0, index).every((item) =>
        complete(item),
      );
      if (index >= 0 && (index <= stepIndex || reachable)) go(target);
    },
    saveDraft: () => {
      if (!draft || busy) return;
      save.mutate(draft, {
        onSuccess: () =>
          showToast({ message: t("saved"), tone: ToastTone.Success }),
      });
    },
    next: () => {
      const following = ISKUR_FORM_STEPS[stepIndex + 1];
      if (following && complete(step)) saveAndGo(following);
    },
    submit: () => {
      if (!draft || busy || !ISKUR_FORM_STEPS.every((item) => complete(item)))
        return;
      submit.mutate(draft);
    },
  };
}
