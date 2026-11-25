// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";

import { ModalDialog } from "@/components/common/modal-dialog";
import { IskurInternsCard } from "@/components/coordinator/iskur-interns-card";
import { IskurPreferencesPanel } from "@/components/coordinator/iskur-preferences-panel";
import { IskurTaskOutputsCard } from "@/components/coordinator/iskur-task-outputs-card";
import { IskurUnitSkillsCard } from "@/components/coordinator/iskur-unit-skills-card";
import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { StaffPictureLink } from "@/components/people/staff-picture-link";
import {
  useIskurApplications,
  type IskurApplicationsState,
} from "@/hooks/use-iskur-applications";
import {
  useIskurWorkspace,
  type IskurWorkspaceState,
} from "@/hooks/use-iskur-workspace";
import {
  IskurPlacementStatus,
  IskurTeamRole,
  type IskurPerson,
  type IskurPlacement,
  type IskurTeam,
  type IskurUnit,
  type IskurWorkspace,
} from "@/interfaces/iskur-workspace";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { iskurSupportActivitiesHref } from "@/lib/iskur-support-activities";
import {
  confirmCopy,
  ISKUR_NAME_MAX,
  ISKUR_ROLES,
  ISKUR_TEAM_SIZE,
  ISKUR_WEEKLY_DAYS,
  leaderNames,
  minutesToHours,
  nameDialogTitle,
} from "@/lib/iskur-workspace";
import { errorMessage } from "@/lib/utils";
import { IskurDialogKind } from "@/types/iskur-workspace";

/** Katılımcılar › İŞKUR Ekipleri: units, thematic teams, leaders with their sub-groups, and who is not placed yet. */
export function IskurWorkspaceView({ programId }: { programId: string }) {
  const applications = useIskurApplications(programId);
  const state = useIskurWorkspace(programId, applications.weeklyDaysOf);
  return (
    <ProgramDetailFrame programId={programId} tab={ProgramTab.IskurTeams}>
      {() => (
        <WorkspaceBody
          state={state}
          applications={applications}
          programId={programId}
        />
      )}
    </ProgramDetailFrame>
  );
}

function WorkspaceBody({
  state,
  applications,
  programId,
}: {
  state: IskurWorkspaceState;
  applications: IskurApplicationsState;
  programId: string;
}) {
  const t = useTranslations("iskurWorkspace");
  if (state.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  const workspace = state.workspace;
  if (state.loadError || !workspace) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {errorMessage(state.loadError, t("loadFailed"))}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <Summary state={state} workspace={workspace} />
      <IskurInternsCard programId={programId} />
      <IskurUnitSkillsCard applications={applications} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Pool state={state} pool={workspace.pool} />
        <div className="space-y-6">
          {workspace.units.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
              {t("noUnits")}
            </p>
          ) : (
            workspace.units.map((unit) => (
              <UnitCard key={unit.id} state={state} unit={unit} />
            ))
          )}
        </div>
      </div>
      <IskurTaskOutputsCard programId={programId} />
      <Dialogs
        state={state}
        workspace={workspace}
        applications={applications}
        programId={programId}
      />
    </div>
  );
}

function Summary({
  state,
  workspace,
}: {
  state: IskurWorkspaceState;
  workspace: IskurWorkspace;
}) {
  const t = useTranslations("iskurWorkspace");
  const { counts } = workspace;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="type-body-sm text-text-secondary">
        {t("counts", {
          interns: counts.interns,
          placed: counts.placed,
          finalized: counts.finalized,
          leaders: counts.leaders,
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        {workspace.units.length === 0 ? (
          <Button
            size={ButtonSize.Small}
            disabled={state.saving}
            onClick={state.createDefaultStructure}
          >
            {t("createDefault")}
          </Button>
        ) : null}
        <Button
          size={ButtonSize.Small}
          variant={ButtonVariant.Ghost}
          onClick={() => state.openUnit(null)}
        >
          {t("addUnit")}
        </Button>
        <Button
          size={ButtonSize.Small}
          variant={ButtonVariant.Ghost}
          href={iskurSupportActivitiesHref(workspace.programId)}
        >
          {t("supportPool")}
        </Button>
        {workspace.units.length > 0 ? (
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Secondary}
            onClick={() =>
              state.openFinalize({ teamId: null, unitId: null }, null)
            }
          >
            {t("finalizeAll")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Pool({
  state,
  pool,
}: {
  state: IskurWorkspaceState;
  pool: IskurPerson[];
}) {
  const t = useTranslations("iskurWorkspace");
  const titleId = useId();
  return (
    <Card labelledBy={titleId} compact className="h-fit space-y-3">
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t("poolTitle", { count: pool.length })}
      </h2>
      {pool.length === 0 ? (
        <p className="type-body-sm text-text-secondary">{t("poolEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {pool.map((person) => (
            <li
              key={person.userId}
              className="flex items-center justify-between gap-2"
            >
              <PersonLine person={person} />
              <Button
                size={ButtonSize.Small}
                variant={ButtonVariant.Ghost}
                aria-label={t("placeNamed", { name: person.fullName })}
                onClick={() => state.openPlacement(person)}
              >
                {t("place")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PersonLine({ person }: { person: IskurPerson }) {
  const t = useTranslations("iskurWorkspace");
  return (
    <div className="flex min-w-0 items-center gap-2">
      <StaffPictureLink userId={person.userId} name={person.fullName}>
        <InitialsAvatar name={person.fullName} />
      </StaffPictureLink>
      <div className="min-w-0">
        <p className="truncate type-label text-text-primary">
          {person.fullName}
        </p>
        <p className="truncate type-caption text-text-secondary">
          {[
            person.department,
            person.iskurParticipant ? t("iskurFlag") : null,
            person.peerMentor ? t("peerMentorFlag") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

function UnitCard({
  state,
  unit,
}: {
  state: IskurWorkspaceState;
  unit: IskurUnit;
}) {
  const t = useTranslations("iskurWorkspace");
  const titleId = useId();
  return (
    <Card labelledBy={titleId} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="type-h4 text-text-primary">
            {unit.name}
          </h2>
          <p className="type-caption text-text-secondary">
            {unit.coordinator
              ? t("unitCoordinator", { name: unit.coordinator.fullName })
              : t("noUnitCoordinator")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Ghost}
            onClick={() => state.openUnit(unit)}
          >
            {t("editUnit")}
          </Button>
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Ghost}
            onClick={() => state.openTeam(unit.id, null)}
          >
            {t("addTeam")}
          </Button>
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Secondary}
            onClick={() =>
              state.openFinalize({ teamId: null, unitId: unit.id }, unit.name)
            }
          >
            {t("finalizeUnit")}
          </Button>
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Tertiary}
            onClick={() => state.openDeleteUnit(unit)}
          >
            {t("deleteUnit")}
          </Button>
        </div>
      </div>
      {unit.teams.length === 0 ? (
        <p className="type-body-sm text-text-secondary">{t("noTeams")}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {unit.teams.map((team) => (
            <TeamBlock
              key={team.id}
              state={state}
              unitId={unit.id}
              team={team}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function TeamBlock({
  state,
  unitId,
  team,
}: {
  state: IskurWorkspaceState;
  unitId: string;
  team: IskurTeam;
}) {
  const t = useTranslations("iskurWorkspace");
  const headingId = useId();
  const leaders = leaderNames(team);
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-2xl border border-border-default p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="type-label text-text-primary">
          {t("teamTitle", {
            name: team.name,
            count: team.people.length,
            size: ISKUR_TEAM_SIZE,
          })}
        </h3>
        <div className="flex flex-wrap gap-1">
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Tertiary}
            onClick={() => state.openTeam(unitId, team)}
          >
            {t("renameTeam")}
          </Button>
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Tertiary}
            onClick={() =>
              state.openFinalize({ teamId: team.id, unitId: null }, team.name)
            }
          >
            {t("finalizeTeam")}
          </Button>
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Tertiary}
            onClick={() => state.openDeleteTeam(team)}
          >
            {t("deleteTeam")}
          </Button>
        </div>
      </div>
      {team.warnings.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {team.warnings.map((warning) => (
            <li key={warning}>
              <StatusBadge tone={StatusTone.Warning}>
                {t(`warnings.${warning}`)}
              </StatusBadge>
            </li>
          ))}
        </ul>
      ) : null}
      {team.people.length === 0 ? (
        <p className="type-caption text-text-secondary">{t("teamEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {team.people.map((person) => (
            <PlacementRow
              key={person.userId}
              state={state}
              person={person}
              leaderName={
                person.leaderId ? (leaders.get(person.leaderId) ?? null) : null
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlacementRow({
  state,
  person,
  leaderName,
}: {
  state: IskurWorkspaceState;
  person: IskurPlacement;
  leaderName: string | null;
}) {
  const t = useTranslations("iskurWorkspace");
  const leader = person.role === IskurTeamRole.Leader;
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 ${leader ? "" : "pl-6"}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StaffPictureLink userId={person.userId} name={person.fullName}>
            <InitialsAvatar name={person.fullName} />
          </StaffPictureLink>
          <span className="type-label text-text-primary">
            {person.fullName}
          </span>
          <StatusBadge tone={leader ? StatusTone.Info : StatusTone.Neutral}>
            {leader
              ? t("roleLeader")
              : leaderName
                ? t("roleMemberOf", { name: leaderName })
                : t("roleMember")}
          </StatusBadge>
          <StatusBadge
            tone={
              person.status === IskurPlacementStatus.Final
                ? StatusTone.Success
                : StatusTone.Warning
            }
          >
            {t(`status.${person.status}`)}
          </StatusBadge>
        </div>
        <p className="type-caption text-text-secondary">
          {person.split && person.weeklyDays != null
            ? t("split", {
                days: person.weeklyDays,
                mentoring: minutesToHours(person.split.mentoringMinutes),
                team: minutesToHours(person.split.teamMinutes),
              })
            : t("noDays")}
          {person.warnings
            .map((warning) => ` · ${t(`warnings.${warning}`)}`)
            .join("")}
        </p>
      </div>
      <Button
        size={ButtonSize.Small}
        variant={ButtonVariant.Ghost}
        aria-label={t("editNamed", { name: person.fullName })}
        onClick={() => state.openPlacement(person)}
      >
        {t("edit")}
      </Button>
    </li>
  );
}

function Dialogs({
  state,
  workspace,
  applications,
  programId,
}: {
  state: IskurWorkspaceState;
  workspace: IskurWorkspace;
  applications: IskurApplicationsState;
  programId: string;
}) {
  const dialog = state.dialog;
  if (!dialog) return null;
  switch (dialog.kind) {
    case IskurDialogKind.Place:
      return (
        <PlacementDialog
          state={state}
          workspace={workspace}
          person={dialog.person}
          placed={dialog.placed}
          preferences={
            <IskurPreferencesPanel
              application={applications.applicationOf(dialog.person.userId)}
              applications={applications}
              programId={programId}
            />
          }
        />
      );
    case IskurDialogKind.Unit:
    case IskurDialogKind.Team:
      return <NameDialog state={state} workspace={workspace} />;
    default:
      return <ConfirmDialog state={state} />;
  }
}

function PlacementDialog({
  state,
  workspace,
  person,
  placed,
  preferences,
}: {
  state: IskurWorkspaceState;
  workspace: IskurWorkspace;
  person: IskurPerson;
  placed: boolean;
  preferences: ReactNode;
}) {
  const t = useTranslations("iskurWorkspace");
  const titleId = useId();
  const teamId = useId();
  const leaderId = useId();
  const daysId = useId();
  const hoursId = useId();
  const roleName = useId();
  const form = state.form;
  if (!form) return null;
  return (
    <ModalDialog labelledBy={titleId} onClose={state.close}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t(placed ? "editTitle" : "placeTitle", { name: person.fullName })}
      </h2>
      {preferences}
      <label htmlFor={teamId} className="block type-label text-text-primary">
        {t("team")}
      </label>
      <select
        id={teamId}
        value={form.teamId}
        onChange={(event) => state.setTeam(event.target.value)}
        className="h-11 w-full rounded-input border border-border-control px-3 type-body-sm"
      >
        {workspace.units.map((unit) => (
          <optgroup key={unit.id} label={unit.name}>
            {unit.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <fieldset className="space-y-2">
        <legend className="type-label text-text-primary">{t("role")}</legend>
        <div className="flex gap-4">
          {ISKUR_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 type-body-sm">
              <input
                type="radio"
                name={roleName}
                checked={form.role === role}
                onChange={() => state.setRole(role)}
              />
              {t(role === IskurTeamRole.Leader ? "roleLeader" : "roleMember")}
            </label>
          ))}
        </div>
      </fieldset>
      {form.role === IskurTeamRole.Member ? (
        <>
          <label
            htmlFor={leaderId}
            className="block type-label text-text-primary"
          >
            {t("leader")}
          </label>
          <select
            id={leaderId}
            value={form.leaderId ?? ""}
            onChange={(event) => state.setLeader(event.target.value || null)}
            className="h-11 w-full rounded-input border border-border-control px-3 type-body-sm"
          >
            <option value="">{t("noLeaderOption")}</option>
            {state.leaderOptions.map((leader) => (
              <option key={leader.userId} value={leader.userId}>
                {leader.fullName}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <label htmlFor={daysId} className="block type-label text-text-primary">
        {t("weeklyDays")}
      </label>
      <select
        id={daysId}
        value={form.weeklyDays ?? ""}
        onChange={(event) =>
          state.setDays(event.target.value ? Number(event.target.value) : null)
        }
        className="h-11 w-full rounded-input border border-border-control px-3 type-body-sm"
      >
        <option value="">{t("daysUnknown")}</option>
        {ISKUR_WEEKLY_DAYS.map((days) => (
          <option key={days} value={days}>
            {t("daysOption", { days })}
          </option>
        ))}
      </select>
      <label htmlFor={hoursId} className="block type-label text-text-primary">
        {t("mentoringHours")}
      </label>
      <input
        id={hoursId}
        inputMode="decimal"
        value={form.mentoringHours}
        placeholder={
          state.defaultMentoringMinutes != null
            ? t("mentoringDefault", {
                hours: minutesToHours(state.defaultMentoringMinutes),
              })
            : ""
        }
        onChange={(event) => state.setMentoringHours(event.target.value)}
        className="h-11 w-full rounded-input border border-border-control px-3 type-body-sm"
      />
      <p className="type-caption text-text-secondary">{t("mentoringHint")}</p>
      {state.formProblem ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {t(`problems.${state.formProblem}`)}
        </p>
      ) : null}
      <ActionError state={state} />
      <div className="flex flex-wrap justify-between gap-2">
        {placed ? (
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Tertiary}
            disabled={state.saving}
            onClick={state.unplace}
          >
            {t("unplace")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Ghost}
            disabled={state.saving}
            onClick={state.close}
          >
            {t("cancel")}
          </Button>
          <Button
            size={ButtonSize.Small}
            disabled={state.saving || state.formProblem != null}
            onClick={state.savePlacement}
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}

function NameDialog({
  state,
  workspace,
}: {
  state: IskurWorkspaceState;
  workspace: IskurWorkspace;
}) {
  const t = useTranslations("iskurWorkspace");
  const titleId = useId();
  const nameId = useId();
  const coordinatorId = useId();
  const dialog = state.dialog;
  const title = dialog ? nameDialogTitle(dialog) : null;
  if (!dialog || !title) return null;
  const unitDialog = dialog.kind === IskurDialogKind.Unit;
  return (
    <ModalDialog labelledBy={titleId} onClose={state.close}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t(title)}
      </h2>
      <label htmlFor={nameId} className="block type-label text-text-primary">
        {t("name")}
      </label>
      <input
        id={nameId}
        value={state.name}
        maxLength={ISKUR_NAME_MAX}
        onChange={(event) => state.setName(event.target.value)}
        className="h-11 w-full rounded-input border border-border-control px-3 type-body-sm"
      />
      {unitDialog ? (
        <>
          <label
            htmlFor={coordinatorId}
            className="block type-label text-text-primary"
          >
            {t("unitCoordinatorLabel")}
          </label>
          <select
            id={coordinatorId}
            value={state.coordinatorId ?? ""}
            onChange={(event) =>
              state.setCoordinatorId(event.target.value || null)
            }
            className="h-11 w-full rounded-input border border-border-control px-3 type-body-sm"
          >
            <option value="">{t("noUnitCoordinator")}</option>
            {workspace.coordinators.map((coordinator) => (
              <option key={coordinator.userId} value={coordinator.userId}>
                {coordinator.fullName}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <ActionError state={state} />
      <div className="flex justify-end gap-2">
        <Button
          size={ButtonSize.Small}
          variant={ButtonVariant.Ghost}
          disabled={state.saving}
          onClick={state.close}
        >
          {t("cancel")}
        </Button>
        <Button
          size={ButtonSize.Small}
          disabled={state.saving || !state.canSaveName}
          onClick={state.saveName}
        >
          {t("save")}
        </Button>
      </div>
    </ModalDialog>
  );
}

function ConfirmDialog({ state }: { state: IskurWorkspaceState }) {
  const t = useTranslations("iskurWorkspace");
  const titleId = useId();
  const copy = state.dialog ? confirmCopy(state.dialog) : null;
  if (!copy) return null;
  return (
    <ModalDialog labelledBy={titleId} onClose={state.close}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t(copy.title, copy.titleValues)}
      </h2>
      <p className="type-body-sm text-text-secondary">
        {copy.count != null
          ? t("finalizeBody", { count: copy.count })
          : t("deleteBody")}
      </p>
      <ActionError state={state} />
      <div className="flex justify-end gap-2">
        <Button
          size={ButtonSize.Small}
          variant={ButtonVariant.Ghost}
          disabled={state.saving}
          onClick={state.close}
        >
          {t("cancel")}
        </Button>
        <Button
          size={ButtonSize.Small}
          variant={
            copy.destructive ? ButtonVariant.Destructive : ButtonVariant.Primary
          }
          disabled={state.saving}
          onClick={state.confirm}
        >
          {t(copy.destructive ? "confirmDelete" : "confirmFinalize")}
        </Button>
      </div>
    </ModalDialog>
  );
}

function ActionError({ state }: { state: IskurWorkspaceState }) {
  const t = useTranslations("iskurWorkspace");
  return state.actionError ? (
    <p role="alert" className="type-body-sm text-status-error-text">
      {errorMessage(state.actionError, t("saveFailed"))}
    </p>
  ) : null;
}
