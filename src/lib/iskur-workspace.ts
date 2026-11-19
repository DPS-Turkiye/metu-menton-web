import {
  IskurPlacementStatus,
  IskurTeamRole,
  type IskurFinalizeInput,
  type IskurPlacement,
  type IskurPlacementInput,
  type IskurTeam,
  type IskurWorkspace,
} from "@/interfaces/iskur-workspace";
import {
  IskurDialogKind,
  IskurFormProblem,
  type IskurDialog,
  type IskurPlacementForm,
} from "@/types/iskur-workspace";

/** The org chart's team: two leaders and seven members. */
export const ISKUR_TEAM_SIZE = 9;
export const ISKUR_WEEKLY_DAYS = [1, 2, 3] as const;
/** The dialog's role choices, member first. */
export const ISKUR_ROLES = [
  IskurTeamRole.Member,
  IskurTeamRole.Leader,
] as const;
/** The longest unit or team name the backend keeps. */
export const ISKUR_NAME_MAX = 80;
/** Whole or half hours, with a dot or a Turkish comma: "2", "1,5", "0.5". */
const HOURS_PATTERN = /^\d+([.,]\d+)?$/;
/** One work day is 7.5 hours. */
export const ISKUR_MINUTES_PER_DAY = 450;
const MENTORING_STEP_MINUTES = 30;
/** The rules frame's default mentoring share (about 27 %): 2, 4 and 6 hours for 1, 2 and 3 days. */
const DEFAULT_MENTORING_MINUTES: Record<number, number> = {
  1: 120,
  2: 240,
  3: 360,
};

export function defaultMentoringMinutes(days: number): number | null {
  return DEFAULT_MENTORING_MINUTES[days] ?? null;
}

export function minutesToHours(minutes: number) {
  return minutes / 60;
}

export function findPlacement(
  workspace: IskurWorkspace,
  userId: string,
): IskurPlacement | null {
  for (const unit of workspace.units) {
    for (const team of unit.teams) {
      const found = team.people.find((person) => person.userId === userId);
      if (found) return found;
    }
  }
  return null;
}

/** The team's leaders by id, for "Üye · lideri Ayşe" on a member's row. */
export function leaderNames(team: IskurTeam) {
  return new Map(
    team.people
      .filter((person) => person.role === IskurTeamRole.Leader)
      .map((leader) => [leader.userId, leader.fullName]),
  );
}

export function teamLeaders(workspace: IskurWorkspace, teamId: string) {
  return workspace.units
    .flatMap((unit) => unit.teams)
    .filter((team) => team.id === teamId)
    .flatMap((team) => team.people)
    .filter((person) => person.role === IskurTeamRole.Leader);
}

/** How many provisional placements "Atamayı kesinleştir" would make final in this scope. */
export function provisionalCount(
  workspace: IskurWorkspace,
  scope: IskurFinalizeInput,
) {
  return workspace.units
    .filter((unit) => scope.unitId == null || unit.id === scope.unitId)
    .flatMap((unit) => unit.teams)
    .filter((team) => scope.teamId == null || team.id === scope.teamId)
    .flatMap((team) => team.people)
    .filter((person) => person.status === IskurPlacementStatus.Provisional)
    .length;
}

/** The dialog's starting values: the person's placement, or the first team for someone new. */
export function placementForm(
  workspace: IskurWorkspace,
  placement: IskurPlacement | null,
): IskurPlacementForm {
  if (placement) {
    const split = placement.split;
    return {
      teamId: placement.teamId,
      role: placement.role,
      leaderId: placement.leaderId,
      weeklyDays: placement.weeklyDays,
      mentoringHours:
        split && !split.mentoringIsDefault
          ? String(minutesToHours(split.mentoringMinutes))
          : "",
    };
  }
  return {
    teamId: workspace.units.flatMap((unit) => unit.teams)[0]?.id ?? "",
    role: IskurTeamRole.Member,
    leaderId: null,
    weeklyDays: null,
    mentoringHours: "",
  };
}

/**
 * The request for the dialog's values, or why it cannot go yet. Blank mentoring hours keep the default share; typed
 * hours need the work days, come in half-hour steps and fit the week.
 */
export function placementInput(
  form: IskurPlacementForm,
):
  | { ok: true; input: IskurPlacementInput }
  | { ok: false; problem: IskurFormProblem } {
  if (!form.teamId) return { ok: false, problem: IskurFormProblem.NoTeam };
  const typed = form.mentoringHours.trim();
  let mentoringMinutes: number | null = null;
  if (typed) {
    if (!HOURS_PATTERN.test(typed)) {
      return { ok: false, problem: IskurFormProblem.MentoringStep };
    }
    const hours = Number(typed.replace(",", "."));
    const minutes = Math.round(hours * 60);
    if (
      Math.abs(hours * 60 - minutes) > 1e-9 ||
      minutes % MENTORING_STEP_MINUTES !== 0
    ) {
      return { ok: false, problem: IskurFormProblem.MentoringStep };
    }
    if (form.weeklyDays == null) {
      return { ok: false, problem: IskurFormProblem.MentoringNeedsDays };
    }
    if (minutes > form.weeklyDays * ISKUR_MINUTES_PER_DAY) {
      return { ok: false, problem: IskurFormProblem.MentoringTooMuch };
    }
    mentoringMinutes = minutes;
  }
  return {
    ok: true,
    input: {
      teamId: form.teamId,
      role: form.role,
      leaderId: form.role === IskurTeamRole.Leader ? null : form.leaderId,
      weeklyDays: form.weeklyDays,
      mentoringMinutes,
    },
  };
}

/** The message keys of a confirm dialog, and whether its action deletes something. */
export type IskurConfirmTitle =
  "finalizeTitle" | "finalizeAllTitle" | "deleteUnitTitle" | "deleteTeamTitle";

export function confirmCopy(dialog: IskurDialog): {
  title: IskurConfirmTitle;
  titleValues: { name: string } | undefined;
  count: number | null;
  destructive: boolean;
} | null {
  switch (dialog.kind) {
    case IskurDialogKind.Finalize:
      return dialog.name
        ? {
            title: "finalizeTitle",
            titleValues: { name: dialog.name },
            count: dialog.count,
            destructive: false,
          }
        : {
            title: "finalizeAllTitle",
            titleValues: undefined,
            count: dialog.count,
            destructive: false,
          };
    case IskurDialogKind.DeleteUnit:
      return {
        title: "deleteUnitTitle",
        titleValues: { name: dialog.unit.name },
        count: null,
        destructive: true,
      };
    case IskurDialogKind.DeleteTeam:
      return {
        title: "deleteTeamTitle",
        titleValues: { name: dialog.team.name },
        count: null,
        destructive: true,
      };
    default:
      return null;
  }
}

/** The unit/team dialog's title key, or null for any other dialog. */
export function nameDialogTitle(dialog: IskurDialog) {
  if (dialog.kind === IskurDialogKind.Unit) {
    return dialog.unit ? "editUnitTitle" : "addUnitTitle";
  }
  if (dialog.kind === IskurDialogKind.Team) {
    return dialog.team ? "renameTeamTitle" : "addTeamTitle";
  }
  return null;
}
