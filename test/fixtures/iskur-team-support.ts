import {
  IskurTeamSupportStatus,
  type IskurTeamSupport,
  type IskurTeamSupports,
} from "@/interfaces/iskur-team-support";

export const SUPPORT_ID = "00000000-0000-4000-8000-0000000000f1";
export const MEDIA = "00000000-0000-4000-8000-0000000000b1";
export const DIGITAL = "00000000-0000-4000-8000-0000000000b2";

export function iskurTeamSupport(
  overrides: Partial<IskurTeamSupport> = {},
): IskurTeamSupport {
  return {
    id: SUPPORT_ID,
    fromTeamId: MEDIA,
    fromTeamName: "Medya ve Kreatif Üretim",
    toTeamId: DIGITAL,
    toTeamName: "Dijital Dönüşüm",
    taskId: "task-1",
    taskTitle: "Afiş için 2 görsel öneri",
    openedByName: "Zeynep Kaya",
    need: "Bilim ve Teknoloji Sohbetleri için A3 afiş.",
    status: IskurTeamSupportStatus.Open,
    answerNote: null,
    answeredByName: null,
    createdAt: "2026-11-19T06:15:00Z",
    answeredAt: null,
    canAnswer: false,
    ...overrides,
  };
}

export function iskurTeamSupports(
  overrides: Partial<IskurTeamSupports> = {},
): IskurTeamSupports {
  return {
    programId: "p1",
    teamId: MEDIA,
    teamName: "Medya ve Kreatif Üretim",
    teams: [{ id: DIGITAL, name: "Dijital Dönüşüm", unitName: "Kreatif" }],
    incoming: [],
    outgoing: [],
    ...overrides,
  };
}
