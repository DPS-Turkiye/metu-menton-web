/** Katılımcılar › Akran Mentorları' "Kapasite" filter. */
export enum CapacityFilter {
  All = "ALL",
  Open = "OPEN",
  Full = "FULL",
  NoProfile = "NO_PROFILE",
}

/** Where a peer mentor stands against their mentee capacity. */
export enum CapacityKind {
  NoProfile = "NO_PROFILE",
  Unlimited = "UNLIMITED",
  Open = "OPEN",
  Full = "FULL",
}

/** Öğrenciler's Prism note for someone without the badge. */
export enum PrismRowStatus {
  Pending = "PENDING",
  Retake = "RETAKE",
}
