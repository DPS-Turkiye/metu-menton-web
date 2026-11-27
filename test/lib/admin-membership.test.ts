import { describe, expect, it } from "vitest";

import {
  ProgramBlockerKind,
  ProgramFeature,
  ProgramStatus,
} from "@/interfaces/program";
import {
  leavesCurrent,
  MembershipAction,
  membershipActions,
  membershipBlockers,
} from "@/lib/admin-membership";

const current = { id: "p1", name: "2026 Güz", status: ProgramStatus.Active };
const open = [
  {
    kind: ProgramBlockerKind.ActiveMentorship,
    feature: ProgramFeature.PeerMentoring,
    count: 2,
  },
];

describe("membershipActions", () => {
  it("offers removal only to a student who is in a semester", () => {
    expect(membershipActions({ programId: null, student: true })).toEqual([
      MembershipAction.Add,
    ]);
    expect(membershipActions({ programId: "p1", student: false })).toEqual([]);
    expect(membershipActions({ programId: "p1", student: true })).toEqual([
      MembershipAction.Add,
      MembershipAction.Remove,
    ]);
  });
});

describe("leavesCurrent", () => {
  it("is a removal, or an addition that moves a student out of their semester", () => {
    expect(leavesCurrent(MembershipAction.Remove, { current })).toBe(true);
    expect(leavesCurrent(MembershipAction.Add, { current })).toBe(true);
    expect(leavesCurrent(MembershipAction.Add, { current: null })).toBe(false);
  });
});

describe("membershipBlockers", () => {
  const membership = { current, targets: [], blockers: open };

  it("shows the open work of the semester being left", () => {
    expect(membershipBlockers(MembershipAction.Remove, membership, [])).toBe(
      open,
    );
    expect(membershipBlockers(MembershipAction.Add, membership, [])).toBe(open);
  });

  it("has nothing to stop a student in no semester, or before the details load", () => {
    expect(
      membershipBlockers(
        MembershipAction.Add,
        { current: null, targets: [], blockers: open },
        [],
      ),
    ).toEqual([]);
    expect(membershipBlockers(MembershipAction.Add, null, [])).toEqual([]);
  });

  it("prefers the refusal's own list", () => {
    const refused = [
      {
        kind: ProgramBlockerKind.UnsentReport,
        feature: ProgramFeature.PeerMentoring,
        count: 1,
      },
    ];
    expect(
      membershipBlockers(
        MembershipAction.Remove,
        { ...membership, blockers: [] },
        refused,
      ),
    ).toBe(refused);
  });
});
