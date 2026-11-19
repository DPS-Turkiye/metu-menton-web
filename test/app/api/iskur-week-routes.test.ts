import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as fallbackDecide } from "@/app/api/coordinator/programs/[id]/iskur/weeks/[weekId]/decision/route";
import { GET as fallbackWeek } from "@/app/api/coordinator/programs/[id]/iskur/weeks/[weekId]/route";
import { GET as fallbackQueue } from "@/app/api/coordinator/programs/[id]/iskur/weeks/route";
import { POST as leaderDecide } from "@/app/api/iskur/leader/weeks/[weekId]/decision/route";
import { GET as leaderWeek } from "@/app/api/iskur/leader/weeks/[weekId]/route";
import { GET as leaderQueue } from "@/app/api/iskur/leader/weeks/route";
import { PUT as saveEntries } from "@/app/api/iskur/week/[weekStart]/entries/route";
import { POST as object } from "@/app/api/iskur/week/[weekStart]/objection/route";
import { POST as submit } from "@/app/api/iskur/week/[weekStart]/submit/route";
import { POST as addSupport } from "@/app/api/iskur/week/[weekStart]/support-activity/route";
import { GET as week } from "@/app/api/iskur/week/route";
import {
  IskurWeekDecision,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  addIskurSupportEntry,
  decideIskurFallbackWeek,
  decideIskurLeaderWeek,
  fetchIskurFallbackQueue,
  fetchIskurFallbackWeek,
  fetchIskurLeaderQueue,
  fetchIskurLeaderWeek,
  fetchIskurWeek,
  objectToIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
} from "@/lib/api/iskur-weeks";
import { getSessionUser } from "@/lib/session";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-weeks", () => ({
  addIskurSupportEntry: vi.fn(),
  decideIskurFallbackWeek: vi.fn(),
  decideIskurLeaderWeek: vi.fn(),
  fetchIskurFallbackQueue: vi.fn(),
  fetchIskurFallbackWeek: vi.fn(),
  fetchIskurLeaderQueue: vi.fn(),
  fetchIskurLeaderWeek: vi.fn(),
  fetchIskurWeek: vi.fn(),
  objectToIskurWeek: vi.fn(),
  saveIskurWeekEntries: vi.fn(),
  submitIskurWeek: vi.fn(),
}));

const calls = [
  addIskurSupportEntry,
  decideIskurFallbackWeek,
  decideIskurLeaderWeek,
  fetchIskurFallbackQueue,
  fetchIskurFallbackWeek,
  fetchIskurLeaderQueue,
  fetchIskurLeaderWeek,
  fetchIskurWeek,
  objectToIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
] as const;

const WEEK_ID = "00000000-0000-4000-8000-0000000000e1";
const PROGRAM = "00000000-0000-4000-8000-0000000000c1";
const ACTIVITY = "00000000-0000-4000-8000-0000000000f1";
const monday = { params: Promise.resolve({ weekStart: "2026-11-16" }) };
const weekParam = { params: Promise.resolve({ weekId: WEEK_ID }) };
const fallback = { params: Promise.resolve({ id: PROGRAM, weekId: WEEK_ID }) };
const program = { params: Promise.resolve({ id: PROGRAM }) };
const approve = { decision: IskurWeekDecision.Approve };

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "x@example.test",
    fullName: "X",
    jobTitle: "x",
    role,
  };
}
const json = (body: unknown, method = "POST") =>
  new Request("http://x", { method, body: JSON.stringify(body) });

describe("İŞKUR week routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
  });

  it("needs a session for the intern and leader routes", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const answers = [
      await week(new NextRequest("http://x/api/iskur/week")),
      await submit(new Request("http://x"), monday),
      await leaderQueue(new NextRequest("http://x/api/iskur/leader/weeks")),
      await leaderWeek(new Request("http://x"), weekParam),
      await leaderDecide(json(approve), weekParam),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([
      401, 401, 401, 401, 401,
    ]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and strips free text from what it does not take", async () => {
    await week(new NextRequest("http://x/api/iskur/week?weekStart=2026-11-09"));
    expect(fetchIskurWeek).toHaveBeenCalledWith("MENTEE-1", "2026-11-09");
    await saveEntries(
      json(
        {
          actorId: "x",
          entries: [
            {
              date: "2026-11-17",
              kind: IskurWorkEntryKind.Team,
              title: " Plan ",
              minutes: 60,
              note: " ",
            },
          ],
        },
        "PUT",
      ),
      monday,
    );
    expect(saveIskurWeekEntries).toHaveBeenCalledWith(
      "MENTEE-1",
      "2026-11-16",
      [
        {
          date: "2026-11-17",
          kind: IskurWorkEntryKind.Team,
          taskId: null,
          supportActivityId: null,
          title: "Plan",
          minutes: 60,
          output: null,
          note: null,
        },
      ],
    );
    await addSupport(
      json({ activityId: ACTIVITY, date: "2026-11-18", minutes: 60 }),
      monday,
    );
    expect(addIskurSupportEntry).toHaveBeenCalledWith(
      "MENTEE-1",
      "2026-11-16",
      {
        activityId: ACTIVITY,
        date: "2026-11-18",
        minutes: 60,
      },
    );
    await submit(new Request("http://x"), monday);
    expect(submitIskurWeek).toHaveBeenCalledWith("MENTEE-1", "2026-11-16");
    await object(json({ objection: " Katılmıyorum " }), monday);
    expect(objectToIskurWeek).toHaveBeenCalledWith(
      "MENTEE-1",
      "2026-11-16",
      "Katılmıyorum",
    );
    await leaderQueue(new NextRequest("http://x/api/iskur/leader/weeks"));
    expect(fetchIskurLeaderQueue).toHaveBeenCalledWith("MENTEE-1", null);
    await leaderWeek(new Request("http://x"), weekParam);
    expect(fetchIskurLeaderWeek).toHaveBeenCalledWith("MENTEE-1", WEEK_ID);
    await leaderDecide(json({ ...approve, actorId: "x" }), weekParam);
    expect(decideIskurLeaderWeek).toHaveBeenCalledWith("MENTEE-1", WEEK_ID, {
      decision: IskurWeekDecision.Approve,
      timeMatchesWork: false,
      effortDocumented: false,
      outputsSufficient: false,
      reason: null,
    });
  });

  it("refuses bad days, ids and bodies before the backend", async () => {
    const answers = [
      await week(
        new NextRequest("http://x/api/iskur/week?weekStart=2026-02-30"),
      ),
      await submit(new Request("http://x"), {
        params: Promise.resolve({ weekStart: "../x" }),
      }),
      await saveEntries(
        json(
          {
            entries: [
              {
                date: "2026-11-17",
                kind: IskurWorkEntryKind.Team,
                minutes: 451,
              },
            ],
          },
          "PUT",
        ),
        monday,
      ),
      await saveEntries(
        json(
          { entries: [{ date: "2026-11-17", kind: "OTHER", minutes: 60 }] },
          "PUT",
        ),
        monday,
      ),
      await object(json({ objection: "  " }), monday),
      await object(json({ objection: "x".repeat(501) }), monday),
      await leaderWeek(new Request("http://x"), {
        params: Promise.resolve({ weekId: ".." }),
      }),
      await leaderDecide(
        json({ decision: IskurWeekDecision.Reject }),
        weekParam,
      ),
      await leaderDecide(
        json({ decision: IskurWeekDecision.Revision, reason: " " }),
        weekParam,
      ),
    ];
    expect(answers.map((answer) => answer.status)).toEqual(
      answers.map(() => 400),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });
});

describe("İŞKUR coordinator week routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
  });

  it("keeps the fallback review to coordinators and the admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    const refused = [
      await fallbackQueue(new NextRequest("http://x/x"), program),
      await fallbackWeek(new Request("http://x"), fallback),
      await fallbackDecide(json(approve), fallback),
    ];
    expect(refused.map((answer) => answer.status)).toEqual([403, 403, 403]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("passes the coordinator's calls through as the session user", async () => {
    await fallbackQueue(
      new NextRequest("http://x/x?weekStart=2026-11-16"),
      program,
    );
    expect(fetchIskurFallbackQueue).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      "2026-11-16",
    );
    await fallbackWeek(new Request("http://x"), fallback);
    expect(fetchIskurFallbackWeek).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      WEEK_ID,
    );
    await fallbackDecide(
      json({ decision: IskurWeekDecision.Revision, reason: "Eksik" }),
      fallback,
    );
    expect(decideIskurFallbackWeek).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      WEEK_ID,
      {
        decision: IskurWeekDecision.Revision,
        timeMatchesWork: false,
        effortDocumented: false,
        outputsSufficient: false,
        reason: "Eksik",
      },
    );
  });

  it("refuses ids that are not uuids", async () => {
    const answers = [
      await fallbackQueue(new NextRequest("http://x/x"), {
        params: Promise.resolve({ id: ".." }),
      }),
      await fallbackWeek(new Request("http://x"), {
        params: Promise.resolve({ id: PROGRAM, weekId: "../x" }),
      }),
      await fallbackDecide(json(approve), {
        params: Promise.resolve({ id: "..", weekId: WEEK_ID }),
      }),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([400, 400, 400]);
  });
});
