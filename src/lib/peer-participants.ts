import {
  GateBadgeState,
  inTraining,
  StudentFilter,
  type GateBadgeProfile,
  type GateBadgeRow,
} from "@/interfaces/badges";
import { CapacityFilter, CapacityKind } from "@/types/peer-participants";

/** Whether a row passes "Rozet durumu"; "Eğitimde" is the part of "Rozet yok" that started the training. */
export function matchesBadgeFilter(row: GateBadgeRow, filter: StudentFilter) {
  switch (filter) {
    case StudentFilter.All:
      return true;
    case StudentFilter.None:
      return row.state === GateBadgeState.None && !inTraining(row);
    case StudentFilter.InTraining:
      return inTraining(row);
    case StudentFilter.Active:
      return row.state === GateBadgeState.Active;
    case StudentFilter.Revoked:
      return row.state === GateBadgeState.Revoked;
  }
}

export type Capacity =
  | { kind: CapacityKind.NoProfile }
  | { kind: CapacityKind.Unlimited; active: number }
  | {
      kind: CapacityKind.Open | CapacityKind.Full;
      active: number;
      capacity: number;
    };

/** A peer mentor's load: no profile yet, no limit set, room left, or full. */
export function capacityOf(profile: GateBadgeProfile | null): Capacity {
  if (!profile?.mentorProfile) return { kind: CapacityKind.NoProfile };
  const { activeMentees: active, menteeCapacity: capacity } = profile;
  if (capacity === null) return { kind: CapacityKind.Unlimited, active };
  return {
    kind: active >= capacity ? CapacityKind.Full : CapacityKind.Open,
    active,
    capacity,
  };
}

export function matchesCapacityFilter(
  row: GateBadgeRow,
  filter: CapacityFilter,
) {
  const kind = capacityOf(row.profile).kind;
  switch (filter) {
    case CapacityFilter.All:
      return true;
    case CapacityFilter.Open:
      return kind === CapacityKind.Open || kind === CapacityKind.Unlimited;
    case CapacityFilter.Full:
      return kind === CapacityKind.Full;
    case CapacityFilter.NoProfile:
      return kind === CapacityKind.NoProfile;
  }
}

/** The badge holders: Akran Mentorları are the people whose gate badge is active. */
export function peerMentorRows(rows: readonly GateBadgeRow[]) {
  return rows.filter((row) => row.state === GateBadgeState.Active);
}

/** The counts on Katılımcılar's segmented control. */
export function participantCounts(rows: readonly GateBadgeRow[]) {
  return { students: rows.length, peerMentors: peerMentorRows(rows).length };
}

/** "Rozet ver" is offered to everyone on the roster who does not hold the badge now. */
export function canAward(row: Pick<GateBadgeRow, "state">) {
  return row.state !== GateBadgeState.Active;
}
