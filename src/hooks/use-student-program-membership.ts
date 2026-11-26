"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ADMIN_OVERVIEW_QUERY_KEY } from "@/hooks/use-admin-overview";
import type { AdminStudentRow } from "@/interfaces/admin-membership";
import { ToastTone } from "@/interfaces/toast";
import {
  MembershipAction,
  membershipActions,
  membershipBlockers,
} from "@/lib/admin-membership";
import {
  addStudentToProgram,
  getProgramMembership,
  removeStudentFromProgram,
} from "@/lib/client/admin-membership";
import { ClientApiError } from "@/lib/client/api";
import { currentIdToken } from "@/lib/firebase/auth";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

const ADMIN_STUDENTS_QUERY_KEY = ["admin", "students"] as const;
const MEMBERSHIP_QUERY_ROOT = ["admin", "student-membership"] as const;

type Target = { row: AdminStudentRow; action: MembershipAction };

/**
 * Kullanıcılar › Öğrenciler's "Programa ekle" (a move when the student is in a semester) and "Programdan çıkar". The
 * dialog reads the student's semester, the semesters they may go to and the open work that keeps them, fresh each
 * time; the change itself goes with the admin's own sign-in, which the backend requires.
 */
export function useStudentProgramMembership() {
  const t = useTranslations("adminStudents.membership");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [target, setTarget] = useState<Target | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);

  const membership = useQuery({
    queryKey: [...MEMBERSHIP_QUERY_ROOT, target?.row.userId],
    queryFn: () => getProgramMembership(target?.row.userId ?? ""),
    enabled: target !== null,
    staleTime: 0,
    // Each opening reads the student's semesters afresh, never a cached answer.
    gcTime: 0,
  });

  const change = useMutation({
    mutationFn: async ({
      row,
      action,
      programId,
    }: Target & { programId: string | null }) => {
      const idToken = await currentIdToken();
      if (!idToken) throw new Error(t("signInAgain"));
      if (action === MembershipAction.Remove) {
        return removeStudentFromProgram(row.userId, idToken);
      }
      if (programId === null) throw new Error(t("saveFailed"));
      return addStudentToProgram(row.userId, programId, idToken);
    },
    onSuccess: (_result, { row, action, programId }) => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_STUDENTS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_OVERVIEW_QUERY_KEY,
      });
      const program = membership.data?.targets.find(
        (item) => item.id === programId,
      );
      showToast({
        message:
          action === MembershipAction.Remove
            ? t("removed", { name: row.fullName })
            : t("added", { name: row.fullName, program: program?.name ?? "" }),
        tone: ToastTone.Success,
      });
      setTarget(null);
      queryClient.removeQueries({ queryKey: MEMBERSHIP_QUERY_ROOT });
    },
  });

  const data = membership.data ?? null;
  const targets = data?.targets ?? [];
  const selectedId =
    chosenId !== null && targets.some((item) => item.id === chosenId)
      ? chosenId
      : (targets[0]?.id ?? null);
  const refused =
    change.error instanceof ClientApiError ? change.error.blockers : [];
  const blockers = target
    ? membershipBlockers(target.action, data, refused)
    : [];

  return {
    /** The actions a row's menu offers. */
    actionsFor: membershipActions,
    target,
    open: (row: AdminStudentRow, action: MembershipAction) => {
      change.reset();
      setChosenId(null);
      setTarget({ row, action });
    },
    close: () => {
      if (change.isPending) return;
      setTarget(null);
      queryClient.removeQueries({ queryKey: MEMBERSHIP_QUERY_ROOT });
    },
    membership: data,
    loading: membership.isLoading,
    loadError: membership.error
      ? errorMessage(membership.error, t("loadFailed"))
      : null,
    targets,
    selectedId,
    select: (programId: string) => {
      change.reset();
      setChosenId(programId);
    },
    blockers,
    error:
      change.error && refused.length === 0
        ? errorMessage(change.error, t("saveFailed"))
        : null,
    saving: change.isPending,
    canConfirm:
      target !== null &&
      data !== null &&
      !membership.isFetching &&
      blockers.length === 0 &&
      (target.action === MembershipAction.Remove
        ? data.current !== null
        : selectedId !== null),
    confirm: () => {
      if (!target || change.isPending) return;
      change.mutate({
        ...target,
        programId:
          target.action === MembershipAction.Remove ? null : selectedId,
      });
    },
  };
}
