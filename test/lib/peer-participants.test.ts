import { describe, expect, it } from "vitest";

import {
  GateBadgeState,
  StudentFilter,
  type GateBadgeProfile,
  type GateBadgeRow,
} from "@/interfaces/badges";
import {
  canAward,
  capacityOf,
  matchesBadgeFilter,
  matchesCapacityFilter,
  participantCounts,
  peerMentorRows,
} from "@/lib/peer-participants";
import { CapacityFilter, CapacityKind } from "@/types/peer-participants";

function profile(overrides: Partial<GateBadgeProfile> = {}): GateBadgeProfile {
  return {
    department: "Endüstri Mühendisliği",
    classYear: 4,
    mentorProfile: true,
    categories: [],
    activeMentees: 3,
    menteeCapacity: 4,
    ...overrides,
  };
}

function row(overrides: Partial<GateBadgeRow> = {}): GateBadgeRow {
  return {
    userId: "u1",
    fullName: "Mert Demir",
    email: "mert@odtu-dev.invalid",
    programId: "p1",
    programName: "Akran Mentörlüğü",
    state: GateBadgeState.Active,
    awardId: "a1",
    source: null,
    awardedAt: null,
    revokedAt: null,
    reason: null,
    training: { videoWatched: false, attempts: 0, bestScore: null },
    profile: profile(),
    prism: null,
    iskurIntern: false,
    ...overrides,
  };
}

describe("peer participants", () => {
  it("tells room left, full, no limit and no profile apart", () => {
    expect(capacityOf(profile())).toEqual({
      kind: CapacityKind.Open,
      active: 3,
      capacity: 4,
    });
    expect(capacityOf(profile({ activeMentees: 4 })).kind).toBe(
      CapacityKind.Full,
    );
    expect(capacityOf(profile({ menteeCapacity: null })).kind).toBe(
      CapacityKind.Unlimited,
    );
    expect(capacityOf(profile({ mentorProfile: false })).kind).toBe(
      CapacityKind.NoProfile,
    );
    expect(capacityOf(null)).toEqual({ kind: CapacityKind.NoProfile });
  });

  it("filters by capacity, counting no limit as room left", () => {
    const open = row({ profile: profile({ menteeCapacity: null }) });
    const full = row({ profile: profile({ activeMentees: 4 }) });
    const none = row({ profile: null });
    const rows = [open, full, none];

    expect(
      rows.filter((r) => matchesCapacityFilter(r, CapacityFilter.Open)),
    ).toEqual([open]);
    expect(
      rows.filter((r) => matchesCapacityFilter(r, CapacityFilter.Full)),
    ).toEqual([full]);
    expect(
      rows.filter((r) => matchesCapacityFilter(r, CapacityFilter.NoProfile)),
    ).toEqual([none]);
    expect(
      rows.filter((r) => matchesCapacityFilter(r, CapacityFilter.All)),
    ).toEqual(rows);
  });

  it("filters by badge state, with Eğitimde as the part of Rozet yok that started training", () => {
    const fresh = row({ state: GateBadgeState.None });
    const training = row({
      state: GateBadgeState.None,
      training: { videoWatched: true, attempts: 0, bestScore: null },
    });
    const holder = row();
    const revoked = row({ state: GateBadgeState.Revoked });
    const rows = [fresh, training, holder, revoked];

    expect(
      rows.filter((r) => matchesBadgeFilter(r, StudentFilter.None)),
    ).toEqual([fresh]);
    expect(
      rows.filter((r) => matchesBadgeFilter(r, StudentFilter.InTraining)),
    ).toEqual([training]);
    expect(
      rows.filter((r) => matchesBadgeFilter(r, StudentFilter.Active)),
    ).toEqual([holder]);
    expect(
      rows.filter((r) => matchesBadgeFilter(r, StudentFilter.Revoked)),
    ).toEqual([revoked]);
    expect(
      rows.filter((r) => matchesBadgeFilter(r, StudentFilter.All)),
    ).toEqual(rows);
  });

  it("counts everyone as students and badge holders as peer mentors, and offers the badge to the rest", () => {
    const rows = [row(), row({ userId: "u2", state: GateBadgeState.None })];

    expect(participantCounts(rows)).toEqual({ students: 2, peerMentors: 1 });
    expect(peerMentorRows(rows)).toEqual([rows[0]]);
    expect(canAward(row())).toBe(false);
    expect(canAward(row({ state: GateBadgeState.Revoked }))).toBe(true);
  });
});
