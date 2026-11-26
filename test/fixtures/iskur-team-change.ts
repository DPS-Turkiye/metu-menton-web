import {
  IskurTeamChangeStatus,
  type IskurTeamChange,
} from "@/interfaces/iskur-team-change";

export const TEAM_CHANGE_ID = "00000000-0000-4000-8000-0000000000e1";

export function iskurTeamChange(
  overrides: Partial<IskurTeamChange> = {},
): IskurTeamChange {
  return {
    id: TEAM_CHANGE_ID,
    userId: "u-ayse",
    fullName: "Ayşe Yıldız",
    fromTeamName: "Medya ve Kreatif Üretim",
    currentTeamName: "Medya ve Kreatif Üretim",
    reason: "Dijital Dönüşüm ekibindeki işler bana daha uygun.",
    status: IskurTeamChangeStatus.Pending,
    decisionNote: null,
    decidedByName: null,
    createdAt: "2026-11-19T06:15:00Z",
    decidedAt: null,
    ...overrides,
  };
}
