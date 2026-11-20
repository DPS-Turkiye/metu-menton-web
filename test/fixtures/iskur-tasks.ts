import type {
  IskurSupportActivities,
  IskurSupportActivity,
} from "@/interfaces/iskur-support-activities";
import {
  IskurTaskKind,
  IskurTaskStatus,
  type IskurTask,
  type IskurTaskOutputFile,
  type IskurTaskOutputs,
  type IskurTeamTasks,
  type IskurTeamTasksMember,
} from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";

export const LEADER_ID = "00000000-0000-4000-8000-0000000000a1";
export const MEMBER_ID = "00000000-0000-4000-8000-0000000000a2";
export const OTHER_LEADER_ID = "00000000-0000-4000-8000-0000000000a3";
export const TASK_ID = "00000000-0000-4000-8000-0000000000b1";

export function createIskurTask(overrides: Partial<IskurTask> = {}): IskurTask {
  return {
    id: TASK_ID,
    teamId: "team-1",
    teamName: "Medya ve Kreatif Üretim",
    assignee: { userId: MEMBER_ID, fullName: "Mert Demir" },
    assignedBy: { userId: LEADER_ID, fullName: "Zeynep Kaya" },
    title: "Sponsor listesi: 10 firma",
    kind: IskurTaskKind.Event,
    estimatedMinutes: 120,
    dueDate: "2026-11-20",
    needsOutput: false,
    description: null,
    status: IskurTaskStatus.Open,
    actualMinutes: null,
    outputLink: null,
    outputNote: null,
    handoverReason: null,
    completedAt: null,
    createdAt: "2026-11-17T09:00:00Z",
    canWork: true,
    canManage: false,
    outputFiles: [],
    outputFilesEnabled: true,
    canAttach: true,
    ...overrides,
  };
}

export const OUTPUT_ID = "00000000-0000-4000-8000-0000000000e1";

export function createIskurTaskOutputFile(
  overrides: Partial<IskurTaskOutputFile> = {},
): IskurTaskOutputFile {
  return {
    id: OUTPUT_ID,
    fileName: "afis-oneri.pdf",
    contentType: "application/pdf",
    sizeBytes: 2 * 1024 * 1024,
    uploadedAt: "2026-11-19T10:30:00Z",
    canRemove: true,
    ...overrides,
  };
}

export function createIskurTaskOutputs(
  overrides: Partial<IskurTaskOutputs> = {},
): IskurTaskOutputs {
  return {
    programId: "p1",
    enabled: true,
    tasks: [
      {
        taskId: TASK_ID,
        title: "Sponsor listesi: 10 firma",
        teamName: "Medya ve Kreatif Üretim",
        assignee: { userId: MEMBER_ID, fullName: "Mert Demir" },
        status: IskurTaskStatus.Open,
        dueDate: "2026-11-20",
        files: [
          {
            id: OUTPUT_ID,
            fileName: "afis-oneri.pdf",
            contentType: "application/pdf",
            sizeBytes: 2 * 1024 * 1024,
            uploadedAt: "2026-11-19T10:30:00Z",
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function createIskurTeamMember(
  overrides: Partial<IskurTeamTasksMember> = {},
): IskurTeamTasksMember {
  return {
    userId: MEMBER_ID,
    fullName: "Mert Demir",
    role: IskurTeamRole.Member,
    weeklyDays: 3,
    teamMinutes: 990,
    plannedMinutes: 720,
    overTarget: false,
    assignable: true,
    workDays: [],
    tasks: [createIskurTask()],
    ...overrides,
  };
}

/** Zeynep's view as a leader: herself, Mert in her sub-group, and Kaan leading the other one. */
export function createIskurTeamTasks(
  overrides: Partial<IskurTeamTasks> = {},
): IskurTeamTasks {
  return {
    weekStart: "2026-11-16",
    team: {
      id: "team-1",
      name: "Medya ve Kreatif Üretim",
      unitName: "Kreatif ve Dijital Üretim",
    },
    viewerRole: IskurTeamRole.Leader,
    canAssign: true,
    members: [
      createIskurTeamMember({
        userId: LEADER_ID,
        fullName: "Zeynep Kaya",
        role: IskurTeamRole.Leader,
        plannedMinutes: 0,
        tasks: [],
      }),
      createIskurTeamMember(),
      createIskurTeamMember({
        userId: OTHER_LEADER_ID,
        fullName: "Kaan Yurt",
        role: IskurTeamRole.Leader,
        weeklyDays: null,
        teamMinutes: null,
        plannedMinutes: 0,
        assignable: false,
        tasks: [],
      }),
    ],
    roster: [
      {
        userId: LEADER_ID,
        fullName: "Zeynep Kaya",
        role: IskurTeamRole.Leader,
        leaderId: null,
      },
      {
        userId: MEMBER_ID,
        fullName: "Mert Demir",
        role: IskurTeamRole.Member,
        leaderId: LEADER_ID,
      },
      {
        userId: OTHER_LEADER_ID,
        fullName: "Kaan Yurt",
        role: IskurTeamRole.Leader,
        leaderId: null,
      },
    ],
    ...overrides,
  };
}

export function createIskurSupportActivity(
  overrides: Partial<IskurSupportActivity> = {},
): IskurSupportActivity {
  return {
    id: "act-1",
    title: "Açık ofis saati",
    description: null,
    active: true,
    sortOrder: 0,
    ...overrides,
  };
}

export function createIskurSupportActivities(
  activities: IskurSupportActivity[] = [createIskurSupportActivity()],
): IskurSupportActivities {
  return { programId: "p1", activities };
}
