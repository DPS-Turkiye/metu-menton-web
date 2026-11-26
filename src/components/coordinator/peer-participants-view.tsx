"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";

import { GateBadgeTag } from "@/components/badges/gate-badge-tag";
import { ModalDialog } from "@/components/common/modal-dialog";
import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { RowActionsMenu } from "@/components/ia/row-actions-menu";
import { StatusTone } from "@/components/ia/status-badge";
import { Tag } from "@/components/ia/tag";
import { StaffPictureLink } from "@/components/people/staff-picture-link";
import { usePeerParticipants } from "@/hooks/use-peer-participants";
import { usePrismDecisions } from "@/hooks/use-prism-decisions";
import {
  GateBadgeState,
  inTraining,
  PrismDecision,
  PrismDecisionOutcome,
  type GateBadgeProfile,
  type GateBadgeRow,
  type PrismDecisionResult,
} from "@/interfaces/badges";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { canAward, capacityOf } from "@/lib/peer-participants";
import { prismRowStatus } from "@/lib/prism-decisions";
import { errorMessage, formatLongDate } from "@/lib/utils";
import { CapacityKind } from "@/types/peer-participants";

type Participants = ReturnType<typeof usePeerParticipants>;

/**
 * Katılımcılar of a peer program (Figma 152:7963). Akran Mentorları lists the badge holders with their department,
 * categories and mentee load; the badge is taken back from a row's ⋯ menu. Öğrenciler lists everyone on the roster,
 * where the coordinator (or an admin) awards the badge.
 */
export function PeerParticipantsView({
  programId,
  tab,
}: {
  programId: string;
  tab: ProgramTab.Students | ProgramTab.PeerMentors;
}) {
  const t = useTranslations("peerParticipants");
  const participants = usePeerParticipants(programId, tab);
  const { counts } = participants;
  return (
    <ProgramDetailFrame
      programId={programId}
      tab={tab}
      tabCounts={{
        [ProgramTab.Students]: counts?.students ?? null,
        [ProgramTab.PeerMentors]: counts?.peerMentors ?? null,
      }}
      participantFilters={
        tab === ProgramTab.PeerMentors ? (
          <ChipSelect
            label={t("capacityLabel")}
            value={participants.capacityFilter}
            options={participants.capacityOptions}
            onChange={participants.setCapacityFilter}
          />
        ) : (
          <ChipSelect
            label={t("badgeFilterLabel")}
            value={participants.badgeFilter}
            options={participants.badgeOptions}
            onChange={participants.setBadgeFilter}
          />
        )
      }
    >
      {() => (
        <ParticipantsBody
          participants={participants}
          programId={programId}
          tab={tab}
        />
      )}
    </ProgramDetailFrame>
  );
}

function ParticipantsBody({
  participants,
  programId,
  tab,
}: {
  participants: Participants;
  programId: string;
  tab: ProgramTab.Students | ProgramTab.PeerMentors;
}) {
  const t = useTranslations("peerParticipants");
  const prism = usePrismDecisions(programId);

  if (participants.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (participants.loadError) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {errorMessage(participants.loadError, t("loadFailed"))}
      </p>
    );
  }

  return (
    <div className="space-y-7">
      {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={prism.openDialog}
          className="rounded-full border border-border-default px-4 py-2 type-label text-text-primary"
        >
          {t("prism.open")}
        </button>
      </div>
      {!prism.open && prism.error ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {errorMessage(prism.error, t("prism.failed"))}
        </p>
      ) : null}
      <div role="status">
        {!prism.open && prism.results ? (
          <PrismResults results={prism.results} />
        ) : null}
      </div>
      {participants.actionError ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {errorMessage(participants.actionError, t("actionFailed"))}
        </p>
      ) : null}
      {participants.rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
          {participants.tabIsEmpty
            ? tab === ProgramTab.PeerMentors
              ? t("noMentors")
              : t("noStudents")
            : t("noMatch")}
        </p>
      ) : tab === ProgramTab.PeerMentors ? (
        <MentorsTable participants={participants} />
      ) : (
        <StudentsTable
          participants={participants}
          onPrismDecision={prism.decideRow}
        />
      )}
      <Footnote icon="/ia/icons/lock-small.svg" iconSize={14}>
        {t("footnote")}
      </Footnote>
      {prism.open ? <PrismDialog prism={prism} /> : null}
      {participants.revoking ? (
        <RevokeDialog
          row={participants.revoking}
          reason={participants.reason}
          onReasonChange={participants.setReason}
          canConfirm={participants.canConfirmRevoke}
          onConfirm={participants.confirmRevoke}
          onClose={participants.cancelRevoke}
        />
      ) : null}
    </div>
  );
}

function MentorsTable({ participants }: { participants: Participants }) {
  const t = useTranslations("peerParticipants");
  const tTopic = useTranslations("peerTopics");
  return (
    <DataTable
      caption={t("mentorsCaption")}
      columns={[
        { key: "name", label: t("columns.mentor"), className: "w-[260px]" },
        {
          key: "department",
          label: t("columns.department"),
          className: "w-[220px]",
        },
        {
          key: "categories",
          label: t("columns.categories"),
          className: "w-[280px]",
        },
        { key: "badge", label: t("columns.badge"), className: "w-[180px]" },
        { key: "capacity", label: t("columns.capacity") },
        {
          key: "actions",
          label: <span className="sr-only">{t("actions")}</span>,
        },
      ]}
    >
      {participants.rows.map((row) => (
        <tr key={row.userId}>
          <DataCell>
            <PersonCell userId={row.userId} name={row.fullName} />
          </DataCell>
          <DataCell>
            <DepartmentLine profile={row.profile} />
          </DataCell>
          <DataCell>
            {row.profile?.mentorProfile ? (
              <span className="flex flex-wrap gap-1.5">
                {row.profile.categories.map((category) => (
                  <Tag key={category} tone={StatusTone.Neutral}>
                    {tTopic(category)}
                  </Tag>
                ))}
              </span>
            ) : (
              <span className="text-text-muted">{t("noProfile")}</span>
            )}
          </DataCell>
          <DataCell>
            <GateBadgeTag row={row} />
          </DataCell>
          <DataCell>
            <CapacityText profile={row.profile} />
          </DataCell>
          <DataCell className="text-right">
            <RowActionsMenu
              label={t("rowActions", { name: row.fullName })}
              actions={[
                {
                  id: "revoke",
                  label: t("revoke"),
                  destructive: true,
                  onSelect: () => participants.startRevoke(row),
                },
              ]}
            />
          </DataCell>
        </tr>
      ))}
    </DataTable>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function StudentsTable({
  participants,
  onPrismDecision,
}: {
  participants: Participants;
  onPrismDecision: (row: GateBadgeRow, decision: PrismDecision) => void;
}) {
  const t = useTranslations("peerParticipants");
  const locale = useLocale();
  return (
    <DataTable
      caption={t("studentsCaption")}
      columns={[
        { key: "name", label: t("columns.student"), className: "w-[260px]" },
        {
          key: "department",
          label: t("columns.department"),
          className: "w-[220px]",
        },
        { key: "badge", label: t("columns.badge"), className: "w-[200px]" },
        { key: "since", label: t("since"), className: "w-[180px]" },
        {
          key: "actions",
          label: <span className="sr-only">{t("actions")}</span>,
        },
      ]}
    >
      {participants.rows.map((row) => (
        <tr key={row.userId}>
          <DataCell>
            <PersonCell userId={row.userId} name={row.fullName} />
          </DataCell>
          <DataCell>
            <DepartmentLine profile={row.profile} />
          </DataCell>
          <DataCell>
            <GateBadgeTag row={row} />
            {inTraining(row) ? (
              <p className="mt-1 type-caption text-text-muted">
                {row.training.attempts > 0
                  ? t("trainingAttempts", {
                      count: row.training.attempts,
                      best: row.training.bestScore ?? 0,
                    })
                  : t("trainingWatched")}
              </p>
            ) : null}
            <PrismNote row={row} />
            {row.state === GateBadgeState.Revoked && row.reason ? (
              <p className="mt-1 type-caption text-status-warning-text">
                {t("revokedBecause", { reason: row.reason })}
              </p>
            ) : null}
          </DataCell>
          <DataCell className="text-text-secondary">
            {row.awardedAt ? formatLongDate(row.awardedAt, locale) : t("none")}
          </DataCell>
          <DataCell className="text-right">
            {canAward(row) ? (
              <span className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={participants.awardingUserId === row.userId}
                  onClick={() => participants.award(row.userId)}
                  className="rounded-full bg-action-primary-bg px-3 py-1.5 type-label-sm text-action-primary-fg disabled:opacity-60"
                >
                  {t("award")}
                </button>
                <RowActionsMenu
                  label={t("rowActions", { name: row.fullName })}
                  actions={[
                    {
                      id: "prism-approve",
                      label: t("prism.rowApprove"),
                      onSelect: () =>
                        onPrismDecision(row, PrismDecision.Approved),
                    },
                    {
                      id: "prism-retake",
                      label: t("prism.rowRetake"),
                      onSelect: () =>
                        onPrismDecision(row, PrismDecision.Retake),
                    },
                  ]}
                />
              </span>
            ) : null}
          </DataCell>
        </tr>
      ))}
    </DataTable>
  );
}

function PersonCell({ userId, name }: { userId: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <StaffPictureLink userId={userId} name={name}>
        <InitialsAvatar name={name} />
      </StaffPictureLink>
      {name}
    </span>
  );
}

function DepartmentLine({ profile }: { profile: GateBadgeProfile | null }) {
  const t = useTranslations("peerParticipants");
  if (!profile?.department)
    return <span className="text-text-muted">{t("none")}</span>;
  return profile.classYear !== null ? (
    <>
      {t("departmentYear", {
        department: profile.department,
        year: profile.classYear,
      })}
    </>
  ) : (
    <>{profile.department}</>
  );
}

function CapacityText({ profile }: { profile: GateBadgeProfile | null }) {
  const t = useTranslations("peerParticipants");
  const capacity = capacityOf(profile);
  switch (capacity.kind) {
    case CapacityKind.NoProfile:
      return <>{t("none")}</>;
    case CapacityKind.Unlimited:
      return <>{t("capacityUnlimited", { active: capacity.active })}</>;
    case CapacityKind.Open:
      return <>{t("capacityOpen", capacity)}</>;
    case CapacityKind.Full:
      return <>{t("capacityFull", capacity)}</>;
  }
}

function RevokeDialog({
  row,
  reason,
  onReasonChange,
  canConfirm,
  onConfirm,
  onClose,
}: {
  row: GateBadgeRow;
  reason: string;
  onReasonChange: (value: string) => void;
  canConfirm: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("peerParticipants");
  const titleId = useId();
  const reasonId = useId();
  return (
    <ModalDialog labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t("revokeTitle", { name: row.fullName })}
      </h2>
      <p className="type-body-sm text-text-secondary">{t("revokeIntro")}</p>
      <label htmlFor={reasonId} className="block type-label text-text-primary">
        {t("reason")}
      </label>
      <textarea
        id={reasonId}
        value={reason}
        maxLength={500}
        onChange={(event) => onReasonChange(event.target.value)}
        className="h-24 w-full rounded-input border border-border-control p-3 type-body-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border-default px-4 py-2 type-label"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={onConfirm}
          className="rounded-full bg-action-destructive-bg px-4 py-2 type-label text-text-inverse disabled:opacity-60"
        >
          {t("confirmRevoke")}
        </button>
      </div>
    </ModalDialog>
  );
}

/** Öğrenciler's Prism line under the badge: waiting for a decision or retaking, and the score (staff only). */
function PrismNote({ row }: { row: GateBadgeRow }) {
  const t = useTranslations("peerParticipants");
  const status = prismRowStatus(row);
  const score = row.prism?.score;
  if (!status && !score) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-x-2 type-caption text-text-muted">
      {status ? <span>{t(`prism.status.${status}`)}</span> : null}
      {score ? <span>{t("prism.score", { score })}</span> : null}
    </p>
  );
}

const OUTCOME_TONES: Record<PrismDecisionOutcome, StatusTone> = {
  [PrismDecisionOutcome.Approved]: StatusTone.Success,
  [PrismDecisionOutcome.Retake]: StatusTone.Warning,
  [PrismDecisionOutcome.AlreadyMentor]: StatusTone.Neutral,
  [PrismDecisionOutcome.NotFound]: StatusTone.Warning,
  [PrismDecisionOutcome.NotEligible]: StatusTone.Warning,
};

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function PrismResults({ results }: { results: PrismDecisionResult[] }) {
  const t = useTranslations("peerParticipants");
  return (
    <section className="space-y-2 rounded-card border border-border-default p-4">
      <h3 className="type-label text-text-primary">
        {t("prism.resultsTitle")}
      </h3>
      <ul className="space-y-1.5">
        {results.map((result) => (
          <li
            key={result.email}
            className="flex flex-wrap items-center gap-2 type-body-sm"
          >
            {result.fullName ? (
              <span className="text-text-primary">{result.fullName}</span>
            ) : null}
            <span className="text-text-secondary">{result.email}</span>
            <Tag tone={OUTCOME_TONES[result.outcome]}>
              {t(`prism.outcomes.${result.outcome}`)}
            </Tag>
          </li>
        ))}
      </ul>
    </section>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function PrismDialog({
  prism,
}: {
  prism: ReturnType<typeof usePrismDecisions>;
}) {
  const t = useTranslations("peerParticipants");
  const titleId = useId();
  const listId = useId();
  return (
    <ModalDialog labelledBy={titleId} onClose={prism.closeDialog}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t("prism.title")}
      </h2>
      <p className="type-body-sm text-text-secondary">{t("prism.intro")}</p>
      <label htmlFor={listId} className="block type-label text-text-primary">
        {t("prism.listLabel")}
      </label>
      <textarea
        id={listId}
        aria-describedby={`${listId}-count`}
        value={prism.text}
        onChange={(event) => prism.setText(event.target.value)}
        className="h-40 w-full rounded-input border border-border-control p-3 font-mono type-body-sm"
      />
      <p id={`${listId}-count`} className="type-caption text-text-muted">
        {t("prism.parsed", { count: prism.entryCount })}
      </p>
      {prism.rejectedLines.length > 0 ? (
        <p className="type-caption text-status-warning-text">
          {t("prism.rejected", { lines: prism.rejectedLines.join(" | ") })}
        </p>
      ) : null}
      {prism.tooMany ? (
        <p className="type-caption text-status-error-text">
          {t("prism.tooMany", { max: prism.maxEntries })}
        </p>
      ) : null}
      <fieldset className="space-y-1.5">
        <legend className="type-label text-text-primary">
          {t("prism.decisionLegend")}
        </legend>
        {Object.values(PrismDecision).map((value) => (
          <label key={value} className="flex items-center gap-2 type-body-sm">
            <input
              type="radio"
              name={`${titleId}-decision`}
              checked={prism.decision === value}
              onChange={() => prism.setDecision(value)}
            />
            {t(`prism.decisions.${value}`)}
          </label>
        ))}
      </fieldset>
      {prism.error ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {errorMessage(prism.error, t("prism.failed"))}
        </p>
      ) : null}
      <div role="status">
        {prism.results ? <PrismResults results={prism.results} /> : null}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={prism.closeDialog}
          className="rounded-full border border-border-default px-4 py-2 type-label"
        >
          {t("prism.close")}
        </button>
        <button
          type="button"
          disabled={!prism.canSend}
          onClick={prism.send}
          className="rounded-full bg-action-primary-bg px-4 py-2 type-label text-action-primary-fg disabled:opacity-60"
        >
          {prism.isSending ? t("prism.sending") : t("prism.send")}
        </button>
      </div>
    </ModalDialog>
  );
}
