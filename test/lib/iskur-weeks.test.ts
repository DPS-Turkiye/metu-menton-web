import { describe, expect, it } from "vitest";

import { IskurTaskStatus } from "@/interfaces/iskur-tasks";
import {
  IskurWeekDecision,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import {
  dayMinutes,
  decisionInput,
  emptyDecisionForm,
  entriesInput,
  entryDrafts,
  iskurFallbackQueueHref,
  iskurFallbackWeekHref,
  iskurLeaderWeekHref,
  iskurWeekDays,
  iskurWeekLabel,
  iskurWorkLogHref,
  overflowingDays,
  percentOf,
  teamDraft,
  todoKey,
  weekTodos,
} from "@/lib/iskur-weeks";
import { IskurTodoKind } from "@/types/iskur-weeks";
import {
  ACTIVITY_ID,
  createIskurWeek,
  createIskurWorkEntry,
} from "@test/fixtures/iskur-weeks";

describe("İŞKUR week helpers", () => {
  it("runs a week from Monday to Sunday, across a month too", () => {
    expect(iskurWeekDays("2026-11-30")).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
    expect(iskurWeekLabel("2026-11-23", "tr")).toBe("23–29 Kasım 2026");
  });

  it("links the work log, the review and the coordinators' queue", () => {
    expect(iskurWorkLogHref("2026-11-16")).toBe(
      "/student/work-log?view=daily&week=2026-11-16",
    );
    expect(iskurWorkLogHref("2026-11-16", true)).toContain("view=weekly");
    expect(iskurWorkLogHref("2026-11-16", false, "2026-11-18")).toBe(
      "/student/work-log?view=daily&week=2026-11-16&day=2026-11-18",
    );
    expect(iskurLeaderWeekHref("w/1")).toBe("/student/team/weeks/w%2F1");
    expect(iskurFallbackWeekHref("p/1", "w/1")).toBe(
      "/coordinator/programs/p%2F1/iskur/weeks/w%2F1",
    );
    expect(iskurFallbackQueueHref("p1")).toBe(
      "/coordinator/programs/p1/iskur/weeks",
    );
  });

  it("measures logged time against a target", () => {
    expect(percentOf(180, 360)).toBe(50);
    expect(percentOf(500, 360)).toBe(100);
    expect(percentOf(100, null)).toBeNull();
    expect(percentOf(100, 0)).toBeNull();
  });

  it("turns entries into drafts and back, dropping free text from support lines", () => {
    const drafts = entryDrafts([
      createIskurWorkEntry(),
      createIskurWorkEntry({
        id: "e2",
        kind: IskurWorkEntryKind.SupportActivity,
        taskId: null,
        supportActivityId: ACTIVITY_ID,
        title: "Açık ofis saati",
        minutes: 60,
        output: null,
      }),
    ]);
    expect(drafts[0]?.minutes).toBe("180");
    expect(drafts[1]?.output).toBe("");
    expect(new Set(drafts.map((draft) => draft.key)).size).toBe(2);
    const withNote = drafts.map((draft) => ({ ...draft, note: "Mentee adı" }));
    expect(entriesInput(withNote)).toEqual([
      {
        date: "2026-11-17",
        kind: IskurWorkEntryKind.Team,
        taskId: "task-1",
        supportActivityId: null,
        title: "Sponsor listesi: 10 firma",
        minutes: 180,
        output: "sponsor-listesi.xlsx",
        note: "Mentee adı",
      },
      {
        date: "2026-11-17",
        kind: IskurWorkEntryKind.SupportActivity,
        taskId: null,
        supportActivityId: ACTIVITY_ID,
        title: null,
        minutes: 60,
        output: null,
        note: null,
      },
    ]);
  });

  it("refuses a line without a title or minutes, and a day over 7.5 hours", () => {
    const blank = teamDraft("2026-11-17", null);
    expect(entriesInput([{ ...blank, minutes: "60" }])).toBeNull();
    expect(entriesInput([{ ...blank, title: "Plan", minutes: "" }])).toBeNull();
    const onTask = teamDraft("2026-11-17", {
      id: "task-1",
      title: "Afiş",
      estimatedMinutes: 120,
    });
    expect(onTask.minutes).toBe("120");
    expect(entriesInput([{ ...onTask, title: "" }])?.[0]?.title).toBeNull();
    const long = [
      { ...onTask, minutes: "300" },
      { ...teamDraft("2026-11-17", null), title: "Toplantı", minutes: "200" },
    ];
    expect(dayMinutes(long, "2026-11-17")).toBe(500);
    expect(overflowingDays(long)).toEqual(["2026-11-17"]);
    expect(entriesInput(long)).toBeNull();
  });

  it("lists the week's to-dos: reports first, then open tasks, then the support prompt", () => {
    const week = createIskurWeek({ needsSupportActivity: true });
    expect(weekTodos(week)).toEqual([
      { kind: IskurTodoKind.Reports, count: 1 },
      {
        kind: IskurTodoKind.Task,
        taskId: "task-1",
        title: "Sponsor listesi: 10 firma",
        dueDate: "2026-11-20",
        needsOutput: true,
      },
      { kind: IskurTodoKind.Support },
    ]);
    const done = createIskurWeek({
      mentoring: { ...week.mentoring, reportsSubmitted: 2 },
      tasks: week.tasks.map((task) => ({
        ...task,
        status: IskurTaskStatus.Done,
      })),
    });
    expect(weekTodos(done)).toEqual([]);
  });

  it("keys each to-do by what it is about", () => {
    expect(todoKey({ kind: IskurTodoKind.Reports, count: 2 })).toBe("reports");
    expect(todoKey({ kind: IskurTodoKind.Support })).toBe("support");
    expect(
      todoKey({
        kind: IskurTodoKind.Task,
        taskId: "t1",
        title: "Sponsor listesi",
        dueDate: "2026-11-20",
        needsOutput: false,
      }),
    ).toBe("task-t1");
    expect(
      todoKey({
        kind: IskurTodoKind.Request,
        requestId: "r1",
        menteeName: "Zeynep Koç",
        category: PeerTopicCategory.CareerInternship,
        createdAt: "2026-11-18T09:30:00Z",
      }),
    ).toBe("request-r1");
    expect(
      todoKey({
        kind: IskurTodoKind.MissingDay,
        weekStart: "2026-11-16",
        date: "2026-11-18",
        plannedMinutes: 450,
      }),
    ).toBe("missingDay-2026-11-18");
    expect(
      todoKey({
        kind: IskurTodoKind.Submit,
        weekStart: "2026-11-09",
        previous: true,
      }),
    ).toBe("submit-2026-11-09");
    expect(
      todoKey({ kind: IskurTodoKind.FridaySubmit, weekStart: "2026-11-16" }),
    ).toBe("fridaySubmit-2026-11-16");
  });

  it("needs a decision, and a reason unless approving", () => {
    expect(decisionInput(emptyDecisionForm())).toBeNull();
    const revision = {
      ...emptyDecisionForm(),
      decision: IskurWeekDecision.Revision,
    };
    expect(decisionInput(revision)).toBeNull();
    expect(decisionInput({ ...revision, reason: " Eksik " })?.reason).toBe(
      "Eksik",
    );
    expect(
      decisionInput({
        ...emptyDecisionForm(),
        decision: IskurWeekDecision.Approve,
        timeMatchesWork: true,
      }),
    ).toEqual({
      decision: IskurWeekDecision.Approve,
      timeMatchesWork: true,
      effortDocumented: false,
      outputsSufficient: false,
      reason: null,
    });
  });
});
