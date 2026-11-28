"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";

import { useInstitutionRecord } from "@/hooks/use-institution-record";
import {
  OFFICE_HOURS_PROFILE_LIMITS,
  type OfficeHoursProfile,
  type OfficeHoursProfileEmails,
} from "@/interfaces/office-hours-me";
import { ToastTone } from "@/interfaces/toast";
import { ACADEMICIAN_OFFICE_HOURS_QUERY_KEY } from "@/lib/academician-office-hours";
import {
  emptyCourseRow,
  emptyTopicRow,
  hasProfileErrors,
  tagError,
  toProfileForm,
  toProfilePayload,
  validateProfileForm,
} from "@/lib/academician-profile";
import {
  getOfficeHoursProfileSettings,
  saveOfficeHoursProfileSettings,
} from "@/lib/client/academician-office-hours";
import { ClientApiError } from "@/lib/client/api";
import { useToast } from "@/stores/toast-store";
import type {
  AcademicianProfileErrors,
  AcademicianProfileForm,
  ProfileCourseRow,
  ProfileTagError,
  ProfileTextField,
  ProfileTopicRow,
} from "@/types/academician-profile";

export const OFFICE_HOURS_PROFILE_QUERY_KEY = [
  ...ACADEMICIAN_OFFICE_HOURS_QUERY_KEY,
  "profile",
] as const;

const NO_ERRORS: AcademicianProfileErrors = { topics: {}, courses: {} };

function updateRow<R extends { key: string }>(
  rows: R[],
  key: string,
  patch: Partial<Omit<R, "key">>,
) {
  return rows.map((row) => (row.key === key ? { ...row, ...patch } : row));
}

function withoutRowError<V>(errors: Record<string, V>, key: string) {
  const { [key]: _removed, ...rest } = errors;
  return rest;
}

/** ODTÜ's record for the read-only panel; a 404 means no institution vouches for the account, not an error. */
function useAcademicianRecord() {
  const query = useInstitutionRecord();
  const missing =
    query.error instanceof ClientApiError && query.error.status === 404;
  return {
    record: query.data ?? null,
    isLoading: query.isLoading,
    missing,
    error: missing ? null : query.error,
    isFetching: query.isFetching,
    retry: () => void query.refetch(),
  };
}

/** Profilim: ODTÜ's record (read-only) next to everything students see about the academician's office hours. */
export function useAcademicianProfile() {
  const t = useTranslations("iaAcademician.profile");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const institution = useAcademicianRecord();
  const settings = useQuery({
    queryKey: OFFICE_HOURS_PROFILE_QUERY_KEY,
    queryFn: getOfficeHoursProfileSettings,
  });
  const [edits, setEdits] = useState<AcademicianProfileForm | null>(null);
  const [errors, setErrors] = useState<AcademicianProfileErrors>(NO_ERRORS);
  const [tagDraft, setTagDraft] = useState("");
  const [tagProblem, setTagProblem] = useState<ProfileTagError | null>(null);
  const form = edits ?? (settings.data ? toProfileForm(settings.data) : null);

  const save = useMutation({
    mutationFn: (profile: OfficeHoursProfile) =>
      saveOfficeHoursProfileSettings(profile),
    onSuccess: (saved) => {
      queryClient.setQueryData(OFFICE_HOURS_PROFILE_QUERY_KEY, saved);
      setEdits(null);
      showToast({ message: t("saved"), tone: ToastTone.Success });
    },
    onError: () =>
      showToast({ message: t("saveFailed"), tone: ToastTone.Error }),
  });

  const edit = (
    next: (current: AcademicianProfileForm) => AcademicianProfileForm,
  ) => {
    if (form) setEdits(next(form));
  };

  const setField = (field: ProfileTextField, value: string) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    edit((current) => ({ ...current, [field]: value }));
  };

  const setListed = (listed: boolean) =>
    edit((current) => ({ ...current, listed }));

  const setEmail = (field: keyof OfficeHoursProfileEmails, on: boolean) =>
    edit((current) => ({
      ...current,
      emails: { ...current.emails, [field]: on },
    }));

  const changeTopic = (
    key: string,
    patch: Partial<Omit<ProfileTopicRow, "key">>,
  ) => {
    setErrors((current) => ({
      ...current,
      topics: withoutRowError(current.topics, key),
    }));
    edit((current) => ({
      ...current,
      topics: updateRow(current.topics, key, patch),
    }));
  };

  const changeCourse = (
    key: string,
    patch: Partial<Omit<ProfileCourseRow, "key">>,
  ) => {
    setErrors((current) => ({
      ...current,
      courses: withoutRowError(current.courses, key),
    }));
    edit((current) => ({
      ...current,
      courses: updateRow(current.courses, key, patch),
    }));
  };

  const addTag = () => {
    if (!form) return;
    const problem = tagError(form.expertise, tagDraft);
    setTagProblem(problem);
    if (problem) return;
    edit((current) => ({
      ...current,
      expertise: [...current.expertise, tagDraft.trim()],
    }));
    setTagDraft("");
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!form) return;
    const next = validateProfileForm(form);
    setErrors(next);
    if (hasProfileErrors(next)) {
      showToast({ message: t("fixErrors"), tone: ToastTone.Error });
      return;
    }
    save.mutate(toProfilePayload(form));
  };

  const limits = OFFICE_HOURS_PROFILE_LIMITS;
  return {
    institution,
    form,
    errors,
    setField,
    setListed,
    setEmail,
    topics: {
      canAdd: Boolean(form && form.topics.length < limits.topics),
      add: () =>
        edit((current) => ({
          ...current,
          topics: [...current.topics, emptyTopicRow()],
        })),
      remove: (key: string) =>
        edit((current) => ({
          ...current,
          topics: current.topics.filter((row) => row.key !== key),
        })),
      change: changeTopic,
    },
    courses: {
      canAdd: Boolean(form && form.courses.length < limits.courses),
      add: () =>
        edit((current) => ({
          ...current,
          courses: [...current.courses, emptyCourseRow()],
        })),
      remove: (key: string) =>
        edit((current) => ({
          ...current,
          courses: current.courses.filter((row) => row.key !== key),
        })),
      change: changeCourse,
    },
    tags: {
      draft: tagDraft,
      problem: tagProblem,
      setDraft: (value: string) => {
        setTagProblem(null);
        setTagDraft(value);
      },
      add: addTag,
      remove: (tag: string) =>
        edit((current) => ({
          ...current,
          expertise: current.expertise.filter((item) => item !== tag),
        })),
    },
    submit,
    discard: () => {
      setEdits(null);
      setErrors(NO_ERRORS);
    },
    isSaving: save.isPending,
    isDirty: edits !== null,
    settingsLoading: settings.isLoading,
    settingsError: settings.error,
    retrySettings: () => void settings.refetch(),
  };
}
