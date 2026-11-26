"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { iskurTeamChangesQueryKey } from "@/hooks/use-iskur-team-changes";
import {
  IskurTeamRole,
  type IskurFinalizeInput,
  type IskurPerson,
  type IskurTeam,
  type IskurUnit,
  type IskurWorkspace,
} from "@/interfaces/iskur-workspace";
import { ToastTone } from "@/interfaces/toast";
import {
  createDefaultIskurStructure,
  createIskurTeam,
  createIskurUnit,
  deleteIskurTeam,
  deleteIskurUnit,
  finalizeIskurPlacements,
  getIskurWorkspace,
  placeIskurIntern,
  unplaceIskurIntern,
  updateIskurTeam,
  updateIskurUnit,
} from "@/lib/client/iskur-workspace";
import {
  defaultMentoringMinutes,
  findPlacement,
  placementForm,
  placementInput,
  provisionalCount,
  teamLeaders,
} from "@/lib/iskur-workspace";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import {
  IskurDialogKind,
  type IskurDialog,
  type IskurPlacementForm,
} from "@/types/iskur-workspace";

export const iskurWorkspaceQueryKey = (programId: string) =>
  ["iskur-workspace", programId] as const;

/**
 * The coordinator's İŞKUR placement screen: one query for the whole workspace, and every change answers with the
 * new workspace, which replaces the cached one.
 */
export function useIskurWorkspace(
  programId: string,
  preferredDays: (userId: string) => number | null = () => null,
) {
  const t = useTranslations("iskurWorkspace");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: iskurWorkspaceQueryKey(programId),
    queryFn: () => getIskurWorkspace(programId),
  });
  const workspace = query.data ?? null;
  const [dialog, setDialog] = useState<IskurDialog | null>(null);
  const [form, setForm] = useState<IskurPlacementForm | null>(null);
  const [name, setName] = useState("");
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: (call: () => Promise<IskurWorkspace>) => call(),
    onSuccess: (data) => {
      queryClient.setQueryData(iskurWorkspaceQueryKey(programId), data);
      // A move or an unplacing answers the intern's team change request on the backend.
      void queryClient.invalidateQueries({
        queryKey: iskurTeamChangesQueryKey(programId),
      });
      setDialog(null);
      showToast({ message: t("saved"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("saveFailed")),
        tone: ToastTone.Error,
      }),
  });
  // One change at a time: a second click while one is saving would race it for the cache and the dialog.
  const run = (call: () => Promise<IskurWorkspace>) => {
    if (change.isPending) return;
    change.reset();
    change.mutate(call);
  };

  const placed =
    workspace && dialog?.kind === IskurDialogKind.Place
      ? findPlacement(workspace, dialog.person.userId)
      : null;
  const checked = form ? placementInput(form) : null;

  function openPlacement(person: IskurPerson) {
    if (!workspace) return;
    const placement = findPlacement(workspace, person.userId);
    setForm(placementForm(workspace, placement, preferredDays(person.userId)));
    setDialog({
      kind: IskurDialogKind.Place,
      person,
      placed: placement != null,
    });
    change.reset();
  }

  return {
    isLoading: query.isLoading,
    loadError: query.error,
    workspace,
    dialog,
    saving: change.isPending,
    actionError: change.error,

    openPlacement,
    /** The placement dialog for someone already placed, as a team change request asks. */
    openPlacementOf: (userId: string) => {
      const placement = workspace ? findPlacement(workspace, userId) : null;
      if (placement) openPlacement(placement);
    },
    openUnit: (unit: IskurUnit | null) => {
      setName(unit?.name ?? "");
      setCoordinatorId(unit?.coordinator?.userId ?? null);
      setDialog({ kind: IskurDialogKind.Unit, unit });
      change.reset();
    },
    openTeam: (unitId: string, team: IskurTeam | null) => {
      setName(team?.name ?? "");
      setDialog({ kind: IskurDialogKind.Team, unitId, team });
      change.reset();
    },
    openFinalize: (scope: IskurFinalizeInput, scopeName: string | null) => {
      if (!workspace) return;
      setDialog({
        kind: IskurDialogKind.Finalize,
        scope,
        name: scopeName,
        count: provisionalCount(workspace, scope),
      });
      change.reset();
    },
    openDeleteUnit: (unit: IskurUnit) => {
      setDialog({ kind: IskurDialogKind.DeleteUnit, unit });
      change.reset();
    },
    openDeleteTeam: (team: IskurTeam) => {
      setDialog({ kind: IskurDialogKind.DeleteTeam, team });
      change.reset();
    },
    /** Closing waits for a running save, so its answer cannot land in another dialog. */
    close: () => {
      if (!change.isPending) setDialog(null);
    },

    /** The placement dialog. */
    form,
    formProblem: checked && !checked.ok ? checked.problem : null,
    leaderOptions:
      workspace && form
        ? teamLeaders(workspace, form.teamId).filter(
            (leader) => leader.userId !== placed?.userId,
          )
        : [],
    defaultMentoringMinutes:
      form?.weeklyDays != null
        ? defaultMentoringMinutes(form.weeklyDays)
        : null,
    setTeam: (teamId: string) =>
      setForm((current) =>
        current ? { ...current, teamId, leaderId: null } : current,
      ),
    setRole: (role: IskurTeamRole) =>
      setForm((current) =>
        current
          ? {
              ...current,
              role,
              leaderId: role === IskurTeamRole.Leader ? null : current.leaderId,
            }
          : current,
      ),
    setLeader: (leaderId: string | null) =>
      setForm((current) => (current ? { ...current, leaderId } : current)),
    setDays: (weeklyDays: number | null) =>
      setForm((current) => (current ? { ...current, weeklyDays } : current)),
    setMentoringHours: (mentoringHours: string) =>
      setForm((current) =>
        current ? { ...current, mentoringHours } : current,
      ),
    savePlacement: () => {
      if (dialog?.kind !== IskurDialogKind.Place || !checked?.ok) return;
      const { userId } = dialog.person;
      const input = checked.input;
      run(() => placeIskurIntern(programId, userId, input));
    },
    unplace: () => {
      if (dialog?.kind !== IskurDialogKind.Place) return;
      const { userId } = dialog.person;
      run(() => unplaceIskurIntern(programId, userId));
    },

    /** The unit and team dialogs. */
    name,
    setName,
    coordinatorId,
    setCoordinatorId,
    canSaveName: name.trim().length > 0,
    saveName: () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (dialog?.kind === IskurDialogKind.Unit) {
        const input = { name: trimmed, coordinatorId };
        const unit = dialog.unit;
        run(() =>
          unit
            ? updateIskurUnit(programId, unit.id, input)
            : createIskurUnit(programId, input),
        );
      } else if (dialog?.kind === IskurDialogKind.Team) {
        const { unitId, team } = dialog;
        run(() =>
          team
            ? updateIskurTeam(programId, team.id, { name: trimmed })
            : createIskurTeam(programId, unitId, { name: trimmed }),
        );
      }
    },

    /** The confirm dialogs. */
    confirm: () => {
      if (dialog?.kind === IskurDialogKind.Finalize) {
        const scope = dialog.scope;
        run(() => finalizeIskurPlacements(programId, scope));
      } else if (dialog?.kind === IskurDialogKind.DeleteUnit) {
        const unitId = dialog.unit.id;
        run(() => deleteIskurUnit(programId, unitId));
      } else if (dialog?.kind === IskurDialogKind.DeleteTeam) {
        const teamId = dialog.team.id;
        run(() => deleteIskurTeam(programId, teamId));
      }
    },
    createDefaultStructure: () =>
      run(() => createDefaultIskurStructure(programId)),
  };
}

export type IskurWorkspaceState = ReturnType<typeof useIskurWorkspace>;
