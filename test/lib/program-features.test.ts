import { describe, expect, it } from "vitest";

import {
  ProgramBlockerKind,
  ProgramFeature,
  ProgramType,
} from "@/interfaces/program";
import {
  ALL_PROGRAM_FEATURES,
  ALL_STUDENT_FEATURES,
  blockersOf,
  coordinatorFeatureChange,
  featureList,
  FeatureSetProblem,
  featureSetProblem,
  hasFeature,
  isOfficeHoursOnly,
  matchesFeatureFilter,
  openFeaturesOf,
  programFeaturesOf,
  sameFeatures,
  studentFeatureView,
  withFeature,
} from "@/lib/program-features";

const { PeerMentoring: Peer, OfficeHours: Oh, Iskur } = ProgramFeature;

describe("featureSetProblem", () => {
  it("asks for at least one feature and for Akran Mentörlüğü under İŞKUR", () => {
    expect(featureSetProblem([])).toBe(FeatureSetProblem.Empty);
    expect(featureSetProblem([Iskur])).toBe(FeatureSetProblem.IskurNeedsPeer);
    expect(featureSetProblem([Oh, Iskur])).toBe(
      FeatureSetProblem.IskurNeedsPeer,
    );
    expect(featureSetProblem([Oh])).toBeNull();
    expect(featureSetProblem([Peer, Iskur])).toBeNull();
  });
});

describe("withFeature", () => {
  it("keeps the listed order whatever order the switches are pressed in", () => {
    expect(withFeature([Oh], Peer, true)).toEqual([Peer, Oh]);
    expect(withFeature([Peer, Oh, Iskur], Oh, false)).toEqual([Peer, Iskur]);
  });

  it("switches Akran Mentörlüğü on with İŞKUR and İŞKUR off with it", () => {
    expect(withFeature([Oh], Iskur, true)).toEqual([Peer, Oh, Iskur]);
    expect(withFeature([Peer, Oh, Iskur], Peer, false)).toEqual([Oh]);
    expect(withFeature([Peer, Iskur], Iskur, false)).toEqual([Peer]);
  });
});

describe("sameFeatures", () => {
  it("compares the sets, not the order", () => {
    expect(sameFeatures([Peer, Oh], [Oh, Peer])).toBe(true);
    expect(sameFeatures([Peer], [Peer, Oh])).toBe(false);
    expect(sameFeatures([Peer, Iskur], [Peer, Oh])).toBe(false);
  });
});

describe("programFeaturesOf and openFeaturesOf", () => {
  it("reads a semester's own features and derives the older types' ones", () => {
    expect(
      programFeaturesOf({ type: ProgramType.Semester, features: [Oh] }),
    ).toEqual([Oh]);
    expect(programFeaturesOf({ type: ProgramType.Semester })).toEqual([]);
    expect(
      programFeaturesOf({ type: ProgramType.PeerMentoring, features: [] }),
    ).toEqual([Peer, Iskur]);
    expect(programFeaturesOf({ type: ProgramType.OfficeHours })).toEqual([Oh]);
    expect(programFeaturesOf({ type: ProgramType.StartupMentoring })).toEqual(
      [],
    );
  });

  it("opens only what the caller holds, and never a feature the semester lacks", () => {
    const semester = { type: ProgramType.Semester, features: [Peer, Oh] };
    expect(openFeaturesOf({ ...semester, myFeatures: [Oh] })).toEqual([Oh]);
    expect(openFeaturesOf({ ...semester, myFeatures: [Oh, Iskur] })).toEqual([
      Oh,
    ]);
    expect(openFeaturesOf({ ...semester, myFeatures: [] })).toEqual([]);
    expect(openFeaturesOf(semester)).toEqual([]);
    expect(
      openFeaturesOf({ type: ProgramType.OfficeHours, myFeatures: [] }),
    ).toEqual([Oh]);
  });

  it("shows a semester with no features read nothing", () => {
    expect(
      programFeaturesOf({ type: ProgramType.Semester, features: null }),
    ).toEqual([]);
    expect(
      openFeaturesOf({
        type: ProgramType.Semester,
        features: null,
        myFeatures: [Oh],
      }),
    ).toEqual([]);
  });

  it("tells Office Hours alone from a semester that also mentors", () => {
    expect(
      isOfficeHoursOnly({ type: ProgramType.Semester, features: [Oh] }),
    ).toBe(true);
    expect(
      isOfficeHoursOnly({ type: ProgramType.Semester, features: [Peer, Oh] }),
    ).toBe(false);
    expect(isOfficeHoursOnly({ type: ProgramType.OfficeHours })).toBe(true);
    expect(
      hasFeature({ type: ProgramType.Semester, features: [Peer] }, Iskur),
    ).toBe(false);
  });

  it("filters by one feature or none", () => {
    const semester = { type: ProgramType.Semester, features: [Peer, Iskur] };
    expect(matchesFeatureFilter(semester, ALL_PROGRAM_FEATURES)).toBe(true);
    expect(matchesFeatureFilter(semester, Iskur)).toBe(true);
    expect(matchesFeatureFilter(semester, Oh)).toBe(false);
  });
});

describe("studentFeatureView", () => {
  it("keeps Office Hours for a student in no semester and nothing else", () => {
    expect(studentFeatureView([])).toEqual({
      peerMentoring: false,
      officeHours: true,
      iskur: false,
    });
  });

  it("follows each switch inside a semester", () => {
    expect(studentFeatureView([Peer, Iskur])).toEqual({
      peerMentoring: true,
      officeHours: false,
      iskur: true,
    });
    expect(studentFeatureView([Oh])).toEqual({
      peerMentoring: false,
      officeHours: true,
      iskur: false,
    });
    expect(ALL_STUDENT_FEATURES).toEqual({
      peerMentoring: true,
      officeHours: true,
      iskur: true,
    });
  });
});

describe("featureList", () => {
  it("keeps only known codes, once each, in the listed order", () => {
    expect(
      featureList(["ISKUR", "PEER_MENTORING", "PEER_MENTORING", "TEAMS", 3]),
    ).toEqual([Peer, Iskur]);
    expect(featureList([])).toEqual([]);
  });

  it("answers null for anything that is not a list, so a backend that does not say hides nothing", () => {
    expect(featureList("PEER_MENTORING")).toBeNull();
    expect(featureList(null)).toBeNull();
    expect(featureList(undefined)).toBeNull();
  });
});

describe("blockersOf", () => {
  it("reads the blockers of a refusal and drops lines it cannot trust", () => {
    expect(
      blockersOf({
        code: "PROGRAM_WORK_OPEN",
        blockers: [
          { kind: "ACTIVE_MENTORSHIP", feature: "PEER_MENTORING", count: 2 },
          { kind: "SOMETHING_NEW", feature: "PEER_MENTORING", count: 1 },
          { kind: "OPEN_REQUEST", feature: "TEAMS", count: 1 },
          { kind: "OPEN_REQUEST", feature: "PEER_MENTORING", count: 0 },
          { kind: "OPEN_REQUEST", feature: "PEER_MENTORING", count: 1.5 },
          { kind: "UNSENT_REPORT", feature: "PEER_MENTORING", count: "4" },
          null,
        ],
      }),
    ).toEqual([
      {
        kind: ProgramBlockerKind.ActiveMentorship,
        feature: Peer,
        count: 2,
      },
    ]);
  });

  it("finds none in other bodies", () => {
    expect(blockersOf(undefined)).toEqual([]);
    expect(blockersOf("conflict")).toEqual([]);
    expect(blockersOf({ message: "x" })).toEqual([]);
    expect(blockersOf({ blockers: "x" })).toEqual([]);
  });
});

describe("coordinatorFeatureChange", () => {
  it("switches one feature in the listed order and never leaves none", () => {
    expect(coordinatorFeatureChange([Oh], Peer, true)).toEqual([Peer, Oh]);
    expect(coordinatorFeatureChange([Peer, Oh], Peer, false)).toEqual([Oh]);
    expect(coordinatorFeatureChange([Iskur], Iskur, false)).toBeNull();
    expect(coordinatorFeatureChange([Iskur], Iskur, true)).toEqual([Iskur]);
  });
});
