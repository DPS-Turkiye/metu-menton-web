import { describe, expect, it } from "vitest";

import type { IskurOnboardingForm } from "@/interfaces/iskur-onboarding";
import {
  IskurWeekDecision,
  IskurWeekStatus,
  type IskurWeek,
} from "@/interfaces/iskur-weeks";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import {
  missingLogDays,
  plannedDays,
  todayTodos,
  todoHref,
} from "@/lib/iskur-today";
import { IskurTodoKind } from "@/types/iskur-weeks";
import { completeForm } from "@test/fixtures/iskur-onboarding";
import { createIskurWeek } from "@test/fixtures/iskur-weeks";
import { receivedPeerRequest } from "@test/fixtures/peer-mentoring";

/** Mert works Mon 4 h, Tue 3.5 h, Wed and Thu 7.5 h; the form went in before the week began. */
const FORM = completeForm({ submittedAt: "2026-11-13T12:00:00Z" });
const FRIDAY = "2026-11-20";

function sentBack(overrides: Partial<IskurWeek> = {}): IskurWeek {
  return createIskurWeek({
    weekStart: "2026-11-09",
    status: IskurWeekStatus.RevisionRequested,
    decision: {
      decision: IskurWeekDecision.Revision,
      reason: "Salı'nın çıktısını ekle.",
      timeMatchesWork: true,
      effortDocumented: false,
      outputsSufficient: false,
      decidedAt: "2026-11-16T08:00:00Z",
      decidedBy: { userId: "leader-1", fullName: "Zeynep Kaya" },
    },
    ...overrides,
  });
}

describe("plannedDays", () => {
  it("reads the work days and their minutes from the sent form", () => {
    expect(plannedDays("2026-11-16", FORM)).toEqual([
      { date: "2026-11-16", minutes: 240 },
      { date: "2026-11-17", minutes: 210 },
      { date: "2026-11-18", minutes: 450 },
      { date: "2026-11-19", minutes: 450 },
    ]);
  });

  it("has no days while the form is a draft or missing", () => {
    expect(
      plannedDays("2026-11-16", completeForm({ submittedAt: null })),
    ).toEqual([]);
    expect(plannedDays("2026-11-16", null)).toEqual([]);
  });
});

describe("missingLogDays", () => {
  it("lists the past work days with no line, not the logged day or today", () => {
    // The fixture week has a line on Tuesday the 17th.
    expect(
      missingLogDays(createIskurWeek(), FORM, "2026-11-19").map(
        (day) => day.date,
      ),
    ).toEqual(["2026-11-16", "2026-11-18"]);
  });

  it("leaves out the days before the form was sent", () => {
    const lateForm = completeForm({ submittedAt: "2026-11-18T06:00:00Z" });
    expect(missingLogDays(createIskurWeek(), lateForm, FRIDAY)).toEqual([
      { date: "2026-11-18", minutes: 450 },
      { date: "2026-11-19", minutes: 450 },
    ]);
  });

  it("asks for nothing once the week cannot change, or without a sent form", () => {
    const sent = createIskurWeek({
      status: IskurWeekStatus.Submitted,
      editable: false,
    });
    expect(missingLogDays(sent, FORM, FRIDAY)).toEqual([]);
    expect(missingLogDays(createIskurWeek(), null, FRIDAY)).toEqual([]);
  });
});

describe("todayTodos", () => {
  it("orders reports, a sent-back week, new requests, missing days, the week to send, tasks and support", () => {
    const todos = todayTodos({
      week: createIskurWeek({ needsSupportActivity: true }),
      previousWeek: sentBack(),
      form: FORM,
      requests: [
        receivedPeerRequest("r1", "Zeynep Koç"),
        receivedPeerRequest(
          "r2",
          "Can Tekin",
          MentorshipRequestStatus.MoreInfoRequested,
        ),
        receivedPeerRequest(
          "r3",
          "Ayşe Yılmaz",
          MentorshipRequestStatus.Accepted,
        ),
      ],
      today: FRIDAY,
    });
    expect(todos).toEqual([
      { kind: IskurTodoKind.Reports, count: 1 },
      {
        kind: IskurTodoKind.Revision,
        weekStart: "2026-11-09",
        previous: true,
        reason: "Salı'nın çıktısını ekle.",
      },
      {
        kind: IskurTodoKind.Request,
        requestId: "r1",
        menteeName: "Zeynep Koç",
        category: PeerTopicCategory.CareerInternship,
        createdAt: "2026-11-18T09:30:00Z",
      },
      {
        kind: IskurTodoKind.MissingDay,
        weekStart: "2026-11-16",
        date: "2026-11-16",
        plannedMinutes: 240,
      },
      {
        kind: IskurTodoKind.MissingDay,
        weekStart: "2026-11-16",
        date: "2026-11-18",
        plannedMinutes: 450,
      },
      {
        kind: IskurTodoKind.MissingDay,
        weekStart: "2026-11-16",
        date: "2026-11-19",
        plannedMinutes: 450,
      },
      { kind: IskurTodoKind.Submit, weekStart: "2026-11-16", previous: false },
      {
        kind: IskurTodoKind.Task,
        taskId: "task-1",
        title: "Sponsor listesi: 10 firma",
        dueDate: "2026-11-20",
        needsOutput: true,
      },
      { kind: IskurTodoKind.Support },
    ]);
  });

  it("asks to send this week only from the last work day, Friday without a schedule", () => {
    const kinds = (today: string, form: IskurOnboardingForm | null = FORM) =>
      todayTodos({
        week: createIskurWeek(),
        previousWeek: null,
        form,
        requests: [],
        today,
      }).map((todo) => todo.kind);
    expect(kinds("2026-11-18")).not.toContain(IskurTodoKind.Submit);
    expect(kinds("2026-11-19")).toContain(IskurTodoKind.Submit);
    expect(kinds("2026-11-19", null)).not.toContain(IskurTodoKind.Submit);
    expect(kinds(FRIDAY, null)).toContain(IskurTodoKind.Submit);
  });

  it("asks to send last week at once, and says nothing about a week already sent", () => {
    const unsent = createIskurWeek({ weekStart: "2026-11-09" });
    const sent = createIskurWeek({
      weekStart: "2026-11-09",
      status: IskurWeekStatus.Submitted,
      editable: false,
      canSubmit: false,
    });
    const empty = createIskurWeek({
      weekStart: "2026-11-09",
      canSubmit: false,
    });
    const weekTodos = (previousWeek: IskurWeek) =>
      todayTodos({
        week: createIskurWeek(),
        previousWeek,
        form: FORM,
        requests: [],
        today: "2026-11-16",
      }).filter(
        (todo) =>
          todo.kind === IskurTodoKind.Submit ||
          todo.kind === IskurTodoKind.Revision,
      );
    expect(weekTodos(unsent)).toEqual([
      { kind: IskurTodoKind.Submit, weekStart: "2026-11-09", previous: true },
    ]);
    expect(weekTodos(sent)).toEqual([]);
    expect(weekTodos(empty)).toEqual([]);
  });

  it("flags this week when the leader sent it back, with no reason when none was given", () => {
    const week = sentBack({ weekStart: "2026-11-16", decision: null });
    expect(
      todayTodos({
        week,
        previousWeek: null,
        form: FORM,
        requests: [],
        today: "2026-11-17",
      }).find((todo) => todo.kind === IskurTodoKind.Revision),
    ).toEqual({
      kind: IskurTodoKind.Revision,
      weekStart: "2026-11-16",
      previous: false,
      reason: null,
    });
  });
});

describe("todoHref", () => {
  it("leads each to-do to where it is done", () => {
    expect(todoHref({ kind: IskurTodoKind.Reports, count: 1 })).toBe(
      "/student/peer-mentoring?as=MENTOR&tab=report",
    );
    expect(
      todoHref({
        kind: IskurTodoKind.Request,
        requestId: "r1",
        menteeName: "Zeynep Koç",
        category: PeerTopicCategory.CareerInternship,
        createdAt: "2026-11-18T09:30:00Z",
      }),
    ).toBe("/student/peer-mentoring?as=MENTOR");
    expect(
      todoHref({
        kind: IskurTodoKind.MissingDay,
        weekStart: "2026-11-16",
        date: "2026-11-18",
        plannedMinutes: 450,
      }),
    ).toBe("/student/work-log?view=daily&week=2026-11-16&day=2026-11-18");
    expect(
      todoHref({
        kind: IskurTodoKind.Revision,
        weekStart: "2026-11-09",
        previous: true,
        reason: null,
      }),
    ).toBe("/student/work-log?view=weekly&week=2026-11-09");
    expect(
      todoHref({
        kind: IskurTodoKind.Submit,
        weekStart: "2026-11-16",
        previous: false,
      }),
    ).toBe("/student/work-log?view=weekly&week=2026-11-16");
    expect(
      todoHref({
        kind: IskurTodoKind.Task,
        taskId: "task-1",
        title: "Sponsor listesi",
        dueDate: FRIDAY,
        needsOutput: false,
      }),
    ).toBe("/student/team/tasks/task-1");
    expect(todoHref({ kind: IskurTodoKind.Support })).toBeNull();
  });
});
