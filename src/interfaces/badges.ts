import type { PeerTopicCategory } from "@/interfaces/peer-mentoring";

/** Menton's badge catalogue; names and descriptions are in the messages under `badges`. */
export enum BadgeCode {
  PeerMentor = "PEER_MENTOR",
  FirstSession = "FIRST_SESSION",
  Sessions10 = "SESSIONS_10",
  Hours25 = "HOURS_25",
  WellRated = "WELL_RATED",
  ActiveMentee = "ACTIVE_MENTEE",
}

/** A gate badge opens a permission (Akran Mentoru → mentoring); an achievement is shown on the profile. */
export enum BadgeKind {
  Gate = "GATE",
  Achievement = "ACHIEVEMENT",
}

export enum BadgeStatus {
  Active = "ACTIVE",
  Expired = "EXPIRED",
  Revoked = "REVOKED",
}

export enum BadgeSource {
  Rule = "RULE",
  Admin = "ADMIN",
  Coordinator = "COORDINATOR",
}

/** Where a person stands with a program's gate badge: never awarded, or the latest award's status. */
export enum GateBadgeState {
  None = "NONE",
  Active = "ACTIVE",
  Expired = "EXPIRED",
  Revoked = "REVOKED",
}

/** One of the signed-in person's own awards (`GET /api/me/badges`); only here and for staff is `reason` shown. */
export type BadgeAward = {
  id: string;
  code: BadgeCode;
  kind: BadgeKind;
  programId: string | null;
  programName: string | null;
  status: BadgeStatus;
  source: BadgeSource;
  awardedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  reason: string | null;
};

/** The badges earned by rules from sessions and feedback; every code but the gate badge. */
export type AchievementCode = Exclude<BadgeCode, BadgeCode.PeerMentor>;

/**
 * One achievement badge as its holder sees it (`GET /api/me/badges/achievements`): earned, or how far along.
 * `current`/`target` count sessions (FIRST_SESSION, SESSIONS_10), minutes (HOURS_25), rated feedbacks
 * (WELL_RATED, which also needs `average` ≥ `averageTarget`) or sessions with feedback given (ACTIVE_MENTEE).
 */
export type AchievementProgress = {
  code: AchievementCode;
  earned: boolean;
  awardedAt: string | null;
  current: number;
  target: number;
  average: number | null;
  averageTarget: number | null;
};

/** An active badge as anyone who can see the person sees it (`GET /api/users/{id}/badges`). */
export type PublicBadge = {
  code: BadgeCode;
  kind: BadgeKind;
  programId: string | null;
  awardedAt: string;
};

/** A person and their gate badge in a program, for Katılımcılar and the admin's Öğrenciler. */
export type GateBadgeRow = {
  userId: string;
  fullName: string;
  email: string;
  programId: string;
  programName: string;
  state: GateBadgeState;
  /** The latest award, the one to take back while it is active. */
  awardId: string | null;
  source: BadgeSource | null;
  awardedAt: string | null;
  revokedAt: string | null;
  reason: string | null;
  /** Progress on the program's current training version; "Eğitimde" when started without the badge. */
  training: {
    videoWatched: boolean;
    attempts: number;
    bestScore: number | null;
  };
  /** Katılımcılar's columns on a program roster; null on the admin's student list. */
  profile: GateBadgeProfile | null;
  /** The person's Prism training in the program, for staff only; null when nothing was recorded. */
  prism: GateBadgePrism | null;
};

/** A coordinator's decision on a Prism result: the Akran Mentoru badge, or "take the test again". */
export enum PrismDecision {
  Approved = "APPROVED",
  Retake = "RETAKE",
}

/** What a bulk Prism decision did for one address; NOT_FOUND also covers an account outside the program. */
export enum PrismDecisionOutcome {
  Approved = "APPROVED",
  Retake = "RETAKE",
  AlreadyMentor = "ALREADY_MENTOR",
  NotFound = "NOT_FOUND",
  NotEligible = "NOT_ELIGIBLE",
}

/** When the person said they finished Prism, the latest decision and the score the Prism admin reported. */
export type GateBadgePrism = {
  completedAt: string | null;
  decision: PrismDecision | null;
  decidedAt: string | null;
  score: string | null;
};

/** One address of a bulk decision (`POST …/badges/prism-decisions`); `score` is free text, at most 32. */
export type PrismDecisionEntry = { email: string; score: string | null };

export type PrismDecisionInput = {
  decision: PrismDecision;
  entries: PrismDecisionEntry[];
};

export type PrismDecisionResult = {
  email: string;
  outcome: PrismDecisionOutcome;
  /** Only for someone of the program. */
  fullName: string | null;
};

export const PRISM_SCORE_MAX = 32;
export const PRISM_DECISION_MAX_ENTRIES = 500;

/**
 * Bölüm · sınıf from the institution's records and, for a peer mentor, the profile's categories and mentee load.
 * `mentorProfile` is false (and `categories` empty) until the person sets up a peer mentor profile.
 */
export type GateBadgeProfile = {
  department: string | null;
  classYear: number | null;
  mentorProfile: boolean;
  categories: PeerTopicCategory[];
  activeMentees: number;
  menteeCapacity: number | null;
};

/** Started the training but holds no badge yet ("Eğitimde"). */
export function inTraining(row: Pick<GateBadgeRow, "state" | "training">) {
  return (
    row.state === GateBadgeState.None &&
    (row.training.videoWatched || row.training.attempts > 0)
  );
}

/** The admin's Öğrenciler filter. "Eğitimde" is a view of "Rozet yok"; badges do not expire (D3), so there is no "Süresi doldu". */
export enum StudentFilter {
  All = "ALL",
  None = "NONE",
  InTraining = "IN_TRAINING",
  Active = "ACTIVE",
  Revoked = "REVOKED",
}
