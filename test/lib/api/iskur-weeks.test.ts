import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurWeekDecision } from "@/interfaces/iskur-weeks";
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
import { backendRequest } from "@/lib/server/backend-client";
import { withForgedActor } from "@test/fixtures/forged-actor";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const decision = {
  decision: IskurWeekDecision.Approve,
  timeMatchesWork: true,
  effortDocumented: true,
  outputsSufficient: true,
  reason: null,
};
const support = { activityId: "a1", date: "2026-11-18", minutes: 60 };
const WEEK = "/api/iskur/week/2026-11-16";
const FALLBACK = "/api/coordinator/programs/p%2F1/iskur/weeks";

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads this week",
    () => fetchIskurWeek("u1", null),
    { method: "GET", url: "/api/iskur/week", params: { actorId: "u1" } },
  ],
  [
    "reads a week",
    () => fetchIskurWeek("u1", "2026-11-09"),
    {
      method: "GET",
      url: "/api/iskur/week",
      params: { actorId: "u1", weekStart: "2026-11-09" },
    },
  ],
  [
    "saves the entries",
    () => saveIskurWeekEntries("u1", "2026-11-16", []),
    {
      method: "PUT",
      url: `${WEEK}/entries`,
      data: { entries: [], actorId: "u1" },
    },
  ],
  [
    "adds a support line as the session user",
    () => addIskurSupportEntry("u1", "2026-11-16", withForgedActor(support)),
    {
      method: "POST",
      url: `${WEEK}/support-activity`,
      data: { ...support, actorId: "u1" },
    },
  ],
  [
    "submits",
    () => submitIskurWeek("u1", "2026-11-16"),
    { method: "POST", url: `${WEEK}/submit`, data: { actorId: "u1" } },
  ],
  [
    "objects",
    () => objectToIskurWeek("u1", "2026-11-16", "Katılmıyorum"),
    {
      method: "POST",
      url: `${WEEK}/objection`,
      data: { objection: "Katılmıyorum", actorId: "u1" },
    },
  ],
  [
    "reads the leader queue",
    () => fetchIskurLeaderQueue("u1", null),
    {
      method: "GET",
      url: "/api/iskur/leader/weeks",
      params: { actorId: "u1" },
    },
  ],
  [
    "reads a leader week",
    () => fetchIskurLeaderWeek("u1", "w/1"),
    {
      method: "GET",
      url: "/api/iskur/leader/weeks/w%2F1",
      params: { actorId: "u1" },
    },
  ],
  [
    "decides as the session user",
    () => decideIskurLeaderWeek("u1", "w1", withForgedActor(decision)),
    {
      method: "POST",
      url: "/api/iskur/leader/weeks/w1/decision",
      data: { ...decision, actorId: "u1" },
    },
  ],
  [
    "reads the coordinators' queue",
    () => fetchIskurFallbackQueue("c1", "p/1", "2026-11-16"),
    {
      method: "GET",
      url: FALLBACK,
      params: { actorId: "c1", weekStart: "2026-11-16" },
    },
  ],
  [
    "reads a fallback week",
    () => fetchIskurFallbackWeek("c1", "p/1", "w1"),
    { method: "GET", url: `${FALLBACK}/w1`, params: { actorId: "c1" } },
  ],
  [
    "decides a fallback week",
    () => decideIskurFallbackWeek("c1", "p/1", "w1", decision),
    {
      method: "POST",
      url: `${FALLBACK}/w1/decision`,
      data: { ...decision, actorId: "c1" },
    },
  ],
];

describe("İŞKUR week server API", () => {
  beforeEach(() => {
    vi.mocked(backendRequest).mockReset();
  });

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
