import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import {
  ProgramBlockerKind,
  ProgramFeature,
  ProgramType,
  type ProgramBlocker,
} from "@/interfaces/program";
import { isEnumValue } from "@/lib/enum";

/** The order features are listed and sent in. */
export const PROGRAM_FEATURES: readonly ProgramFeature[] = [
  ProgramFeature.PeerMentoring,
  ProgramFeature.OfficeHours,
  ProgramFeature.Iskur,
];

/** Why a feature set cannot be saved; the values are keys of `programFeatures.problems`. */
export enum FeatureSetProblem {
  Empty = "EMPTY",
  IskurNeedsPeer = "ISKUR_NEEDS_PEER",
}

/** What stops a semester from having these features, or null. */
export function featureSetProblem(
  features: readonly ProgramFeature[],
): FeatureSetProblem | null {
  if (features.length === 0) return FeatureSetProblem.Empty;
  if (
    features.includes(ProgramFeature.Iskur) &&
    !features.includes(ProgramFeature.PeerMentoring)
  ) {
    return FeatureSetProblem.IskurNeedsPeer;
  }
  return null;
}

/**
 * The set with one feature switched on or off, in the listed order. İŞKUR needs Akran Mentörlüğü, so switching
 * İŞKUR on also switches Akran Mentörlüğü on, and switching Akran Mentörlüğü off also switches İŞKUR off.
 */
export function withFeature(
  features: readonly ProgramFeature[],
  feature: ProgramFeature,
  on: boolean,
): ProgramFeature[] {
  const next = new Set(features);
  if (on) {
    next.add(feature);
    if (feature === ProgramFeature.Iskur)
      next.add(ProgramFeature.PeerMentoring);
  } else {
    next.delete(feature);
    if (feature === ProgramFeature.PeerMentoring) {
      next.delete(ProgramFeature.Iskur);
    }
  }
  return PROGRAM_FEATURES.filter((item) => next.has(item));
}

/** Whether two feature sets hold the same features, whatever their order. */
export function sameFeatures(
  a: readonly ProgramFeature[],
  b: readonly ProgramFeature[],
) {
  return a.length === b.length && a.every((feature) => b.includes(feature));
}

/**
 * The features a program shows. A program still typed with an older ODTÜ type gets the features the backend derives
 * for it, so a stale answer still opens the right screens.
 */
export function programFeaturesOf(program: {
  type: ProgramType;
  features?: readonly ProgramFeature[] | null | undefined;
}): readonly ProgramFeature[] {
  switch (program.type) {
    case ProgramType.Semester:
      return program.features ?? [];
    case ProgramType.PeerMentoring:
      return [ProgramFeature.PeerMentoring, ProgramFeature.Iskur];
    case ProgramType.OfficeHours:
      return [ProgramFeature.OfficeHours];
    case ProgramType.StartupMentoring:
      return [];
  }
}

/** What a student is shown, from their semester's features. */
export type StudentFeatureView = {
  peerMentoring: boolean;
  officeHours: boolean;
  iskur: boolean;
};

/**
 * `[]` means the student is in no semester: they still see Office Hours (it belongs to the whole university, and LTI
 * students need not be in a semester) but no peer mentoring or İŞKUR. Inside a semester, each switch decides.
 */
export function studentFeatureView(
  features: readonly ProgramFeature[],
): StudentFeatureView {
  if (features.length === 0) {
    return { peerMentoring: false, officeHours: true, iskur: false };
  }
  return {
    peerMentoring: features.includes(ProgramFeature.PeerMentoring),
    officeHours: features.includes(ProgramFeature.OfficeHours),
    iskur: features.includes(ProgramFeature.Iskur),
  };
}

/** Until the student's features load, or when they cannot be read, nothing is hidden. */
export const ALL_STUDENT_FEATURES: StudentFeatureView = {
  peerMentoring: true,
  officeHours: true,
  iskur: true,
};

/** Feature codes read from untrusted JSON, in the listed order; unknown codes are dropped, and a non-list is null. */
export function featureList(value: unknown): ProgramFeature[] | null {
  if (!Array.isArray(value)) return null;
  return PROGRAM_FEATURES.filter((feature) =>
    value.some((item) => item === feature),
  );
}

function isBlocker(value: unknown): value is ProgramBlocker {
  if (!value || typeof value !== "object") return false;
  const kind: unknown = "kind" in value ? value.kind : undefined;
  const feature: unknown = "feature" in value ? value.feature : undefined;
  const count: unknown = "count" in value ? value.count : undefined;
  return (
    isEnumValue(ProgramBlockerKind, kind) &&
    isEnumValue(ProgramFeature, feature) &&
    typeof count === "number" &&
    Number.isInteger(count) &&
    count > 0
  );
}

/** The `blockers` of a refused change (409 `PROGRAM_WORK_OPEN`), read from an error body; unknown lines are dropped. */
export function blockersOf(body: unknown): ProgramBlocker[] {
  if (!body || typeof body !== "object" || !("blockers" in body)) return [];
  const blockers: unknown = body.blockers;
  return Array.isArray(blockers) ? blockers.filter(isBlocker) : [];
}

/** Whether the program has the feature, by its features (or the ones its older type implies). */
export function hasFeature(
  program: Parameters<typeof programFeaturesOf>[0],
  feature: ProgramFeature,
) {
  return programFeaturesOf(program).includes(feature);
}

/**
 * The features the caller may open on a program: a semester's `myFeatures` (an admin gets every feature, a coordinator
 * the ones assigned to them), or what an older type implies. A semester that does not say opens none.
 */
export function openFeaturesOf(program: {
  type: ProgramType;
  features?: readonly ProgramFeature[] | null | undefined;
  myFeatures?: readonly ProgramFeature[] | null | undefined;
}): readonly ProgramFeature[] {
  if (program.type !== ProgramType.Semester) return programFeaturesOf(program);
  const features = programFeaturesOf(program);
  return (program.myFeatures ?? []).filter((feature) =>
    features.includes(feature),
  );
}

/** Office Hours without Akran Mentörlüğü: open to the whole university, with no run or roster of its own. */
export function isOfficeHoursOnly(
  program: Parameters<typeof programFeaturesOf>[0],
) {
  return (
    hasFeature(program, ProgramFeature.OfficeHours) &&
    !hasFeature(program, ProgramFeature.PeerMentoring)
  );
}

export const ALL_PROGRAM_FEATURES = "ALL";

/** A list filter on what programs run: one feature, or every program. */
export type ProgramFeatureFilter = ProgramFeature | typeof ALL_PROGRAM_FEATURES;

export function matchesFeatureFilter(
  program: Parameters<typeof programFeaturesOf>[0],
  filter: ProgramFeatureFilter,
) {
  return filter === ALL_PROGRAM_FEATURES || hasFeature(program, filter);
}

/** Why a semester's features cannot be changed now; the values are keys of `programFeatures`. */
export enum FeatureLock {
  Coordinator = "lockedCoordinator",
  Completed = "lockedCompleted",
}

/**
 * Who may change a semester's features when: the admin until it is completed, its coordinators only while it is a
 * draft. Null when the caller may change them. The backend checks the same.
 */
export function featureLock(
  lifecycle: ProgramLifecycle,
  admin: boolean,
): FeatureLock | null {
  if (lifecycle === ProgramLifecycle.Completed) return FeatureLock.Completed;
  if (!admin && lifecycle !== ProgramLifecycle.Draft) {
    return FeatureLock.Coordinator;
  }
  return null;
}
