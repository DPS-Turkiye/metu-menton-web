import {
  IskurPlacementStatus,
  IskurTeamRole,
  IskurWarning,
  type IskurPerson,
  type IskurPlacement,
  type IskurWorkspace,
} from "@/interfaces/iskur-workspace";

export function iskurPerson(overrides: Partial<IskurPerson> = {}): IskurPerson {
  return {
    userId: "u-pool",
    fullName: "Deniz Arslan",
    email: "deniz@example.test",
    department: "Endüstri Mühendisliği",
    iskurParticipant: true,
    peerMentor: false,
    ...overrides,
  };
}

export function iskurPlacement(
  overrides: Partial<IskurPlacement> = {},
): IskurPlacement {
  return {
    ...iskurPerson({ userId: "u-leader", fullName: "Ayşe Yıldız" }),
    teamId: "t1",
    role: IskurTeamRole.Leader,
    leaderId: null,
    status: IskurPlacementStatus.Provisional,
    weeklyDays: 3,
    split: {
      totalMinutes: 1350,
      mentoringMinutes: 360,
      teamMinutes: 990,
      mentoringIsDefault: true,
    },
    warnings: [],
    finalizedAt: null,
    ...overrides,
  };
}

/** One unit with two teams: Medya (a leader and her member) and an empty Dijital; Deniz waits in the pool. */
export function iskurWorkspace(
  overrides: Partial<IskurWorkspace> = {},
): IskurWorkspace {
  return {
    programId: "p1",
    units: [
      {
        id: "unit1",
        name: "Kreatif ve Dijital Üretim",
        sortOrder: 0,
        coordinator: { userId: "c1", fullName: "Selin Er" },
        teams: [
          {
            id: "t1",
            name: "Medya ve Kreatif Üretim",
            sortOrder: 0,
            people: [
              iskurPlacement(),
              iskurPlacement({
                userId: "u-member",
                fullName: "Burak Tan",
                role: IskurTeamRole.Member,
                leaderId: "u-leader",
                status: IskurPlacementStatus.Final,
                weeklyDays: 2,
                split: {
                  totalMinutes: 900,
                  mentoringMinutes: 0,
                  teamMinutes: 900,
                  mentoringIsDefault: false,
                },
                finalizedAt: "2026-11-19T10:00:00Z",
              }),
            ],
            warnings: [IskurWarning.TeamSize],
          },
          {
            id: "t2",
            name: "Dijital Dönüşüm ve Teknoloji",
            sortOrder: 1,
            people: [],
            warnings: [IskurWarning.TeamSize, IskurWarning.NoLeader],
          },
        ],
      },
    ],
    pool: [iskurPerson()],
    coordinators: [
      { userId: "c1", fullName: "Selin Er" },
      { userId: "c2", fullName: "Kaan Yurt" },
    ],
    counts: { interns: 3, placed: 2, finalized: 1, leaders: 1 },
    ...overrides,
  };
}
