import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import {
  IskurWeekStatus,
  IskurWorkEntryKind,
  type IskurLeaderWeek,
  type IskurWeek,
  type IskurWorkEntry,
} from "@/interfaces/iskur-weeks";

export const WEEK_ID = "00000000-0000-4000-8000-0000000000e1";
export const ACTIVITY_ID = "00000000-0000-4000-8000-0000000000f1";

export function createIskurWorkEntry(
  overrides: Partial<IskurWorkEntry> = {},
): IskurWorkEntry {
  return {
    id: "entry-1",
    date: "2026-11-17",
    kind: IskurWorkEntryKind.Team,
    taskId: "task-1",
    supportActivityId: null,
    title: "Sponsor listesi: 10 firma",
    minutes: 180,
    output: "sponsor-listesi.xlsx",
    note: null,
    ...overrides,
  };
}

export function createIskurWeek(overrides: Partial<IskurWeek> = {}): IskurWeek {
  return {
    weekStart: "2026-11-16",
    weekId: WEEK_ID,
    status: IskurWeekStatus.Draft,
    editable: true,
    canSubmit: true,
    submittedAt: null,
    decision: null,
    objection: null,
    reviewer: { userId: "leader-1", fullName: "Zeynep Kaya" },
    split: { totalMinutes: 1350, mentoringMinutes: 360, teamMinutes: 990 },
    totals: { teamMinutes: 180, mentoringMinutes: 160 },
    mentoring: {
      meetingCount: 2,
      meetingMinutes: 65,
      activityMinutes: 95,
      supportMinutes: 0,
      reportsSubmitted: 1,
      reportsDue: 2,
      meetingsAhead: false,
    },
    needsSupportActivity: false,
    entries: [createIskurWorkEntry()],
    tasks: [
      {
        id: "task-1",
        title: "Sponsor listesi: 10 firma",
        kind: IskurTaskKind.Event,
        estimatedMinutes: 120,
        dueDate: "2026-11-20",
        status: IskurTaskStatus.Open,
        needsOutput: true,
        actualMinutes: null,
      },
    ],
    supportActivities: [
      { id: ACTIVITY_ID, title: "Açık ofis saati", description: null },
    ],
    ...overrides,
  };
}

export function createIskurLeaderWeek(
  overrides: Partial<IskurLeaderWeek> = {},
): IskurLeaderWeek {
  return {
    weekId: WEEK_ID,
    weekStart: "2026-11-16",
    person: { userId: "member-1", fullName: "Mert Demir", weeklyDays: 3 },
    status: IskurWeekStatus.Submitted,
    submittedAt: "2026-11-20T15:40:00Z",
    split: { totalMinutes: 1350, mentoringMinutes: 360, teamMinutes: 990 },
    totals: { teamMinutes: 180, mentoringMinutes: 105 },
    team: [
      {
        date: "2026-11-17",
        title: "Sponsor listesi: 10 firma",
        minutes: 180,
        output: "sponsor-listesi.xlsx",
        note: "İlk 6 firma",
        taskStatus: IskurTaskStatus.Open,
        handoverReason: null,
      },
    ],
    mentoring: {
      minutes: 105,
      meetingCount: 2,
      reportsSubmitted: 1,
      reportsDue: 2,
      days: [
        {
          date: "2026-11-17",
          meetingCount: 2,
          reportsSubmitted: 1,
          reportsDue: 2,
          minutes: 75,
          supportActivityTitles: [],
        },
        {
          date: "2026-11-18",
          meetingCount: 0,
          reportsSubmitted: 0,
          reportsDue: 0,
          minutes: 30,
          supportActivityTitles: ["Açık ofis saati"],
        },
      ],
    },
    decision: null,
    objection: null,
    canDecide: true,
    queue: [
      {
        userId: "member-1",
        fullName: "Mert Demir",
        weekId: WEEK_ID,
        status: IskurWeekStatus.Submitted,
        submittedAt: "2026-11-20T15:40:00Z",
        teamMinutes: 180,
        mentoringMinutes: 105,
      },
      {
        userId: "member-2",
        fullName: "Ayşe Yıldız",
        weekId: null,
        status: null,
        submittedAt: null,
        teamMinutes: 0,
        mentoringMinutes: 0,
      },
    ],
    ...overrides,
  };
}
