"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { ModalDialog } from "@/components/common/modal-dialog";
import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { StatusTone } from "@/components/ia/status-badge";
import { Tag } from "@/components/ia/tag";
import { usePeerParticipants } from "@/hooks/use-peer-participants";
import {
  GateBadgeState,
  inTraining,
  type GateBadgeProfile,
  type GateBadgeRow,
} from "@/interfaces/badges";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { canAward, capacityOf } from "@/lib/peer-participants";
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
      {() => <ParticipantsBody participants={participants} tab={tab} />}
    </ProgramDetailFrame>
  );
}

function ParticipantsBody({
  participants,
  tab,
}: {
  participants: Participants;
  tab: ProgramTab.Students | ProgramTab.PeerMentors;
}) {
  const t = useTranslations("peerParticipants");

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
        <StudentsTable participants={participants} />
      )}
      <Footnote icon="/ia/icons/lock-small.svg" iconSize={14}>
        {t("footnote")}
      </Footnote>
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
            <PersonCell name={row.fullName} />
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
            <BadgeTag row={row} />
          </DataCell>
          <DataCell>
            <CapacityText profile={row.profile} />
          </DataCell>
          <DataCell className="text-right">
            <RowMenu row={row} participants={participants} />
          </DataCell>
        </tr>
      ))}
    </DataTable>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function StudentsTable({ participants }: { participants: Participants }) {
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
            <PersonCell name={row.fullName} />
          </DataCell>
          <DataCell>
            <DepartmentLine profile={row.profile} />
          </DataCell>
          <DataCell>
            <BadgeTag row={row} />
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
              <button
                type="button"
                disabled={participants.awardingUserId === row.userId}
                onClick={() => participants.award(row.userId)}
                className="rounded-full bg-action-primary-bg px-3 py-1.5 type-label-sm text-action-primary-fg disabled:opacity-60"
              >
                {t("award")}
              </button>
            ) : null}
          </DataCell>
        </tr>
      ))}
    </DataTable>
  );
}

function PersonCell({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <InitialsAvatar name={name} />
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

const BADGE_TONES: Record<GateBadgeState, StatusTone> = {
  [GateBadgeState.None]: StatusTone.Neutral,
  [GateBadgeState.Active]: StatusTone.Success,
  [GateBadgeState.Expired]: StatusTone.Warning,
  [GateBadgeState.Revoked]: StatusTone.Warning,
};

function BadgeTag({ row }: { row: GateBadgeRow }) {
  const t = useTranslations("peerParticipants");
  if (inTraining(row)) {
    return <Tag tone={StatusTone.Warning}>{t("badgeStates.IN_TRAINING")}</Tag>;
  }
  return (
    <Tag tone={BADGE_TONES[row.state]}>{t(`badgeStates.${row.state}`)}</Tag>
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

/**
 * The ⋯ menu of an Akran Mentorları row, a disclosure with one action. It sits fixed under its button so the table's
 * scroll box cannot clip it; Escape or a click elsewhere closes it, and focus goes back to the button, which the
 * revoke dialog then returns to as well.
 */
function RowMenu({
  row,
  participants,
}: {
  row: GateBadgeRow;
  participants: Participants;
}) {
  const t = useTranslations("peerParticipants");
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [place, setPlace] = useState<{ top: number; right: number } | null>(
    null,
  );
  const open = participants.menuFor === row.userId;
  const { closeMenu } = participants;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeMenu();
      trigger.current?.focus();
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target))
        closeMenu();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [open, closeMenu]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={t("rowActions", { name: row.fullName })}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          const box = trigger.current?.getBoundingClientRect();
          if (box)
            setPlace({
              top: box.bottom + 4,
              right: window.innerWidth - box.right,
            });
          participants.toggleMenu(row.userId);
        }}
        className="rounded-full px-2 py-1 type-label text-text-secondary hover:bg-background-subtle"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open ? (
        <ul
          ref={menu}
          id={menuId}
          style={place ?? undefined}
          className="fixed z-30 w-48 rounded-2xl border border-border-subtle bg-background-surface p-1 text-left shadow-hover"
        >
          <li>
            <button
              type="button"
              onClick={() => {
                trigger.current?.focus();
                participants.closeMenu();
                participants.startRevoke(row);
              }}
              className="w-full rounded-xl px-3 py-2 text-left type-body-sm text-status-error-text hover:bg-background-subtle"
            >
              {t("revoke")}
            </button>
          </li>
        </ul>
      ) : null}
    </>
  );
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
