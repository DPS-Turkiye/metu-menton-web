import { describe, vi } from "vitest";

import { IskurWeekDecision } from "@/interfaces/iskur-weeks";
import {
  addIskurSupportEntry,
  decideIskurFallbackWeek,
  decideIskurLeaderWeek,
  getIskurFallbackQueue,
  getIskurFallbackWeek,
  getIskurLeaderQueue,
  getIskurLeaderWeek,
  getIskurWeek,
  objectToIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
} from "@/lib/client/iskur-weeks";
import {
  itSendsEachClientCall,
  type ClientCall,
} from "@test/fixtures/client-calls";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const decision = {
  decision: IskurWeekDecision.Reject,
  timeMatchesWork: false,
  effortDocumented: false,
  outputsSufficient: false,
  reason: "Eksik",
};
const support = { activityId: "a1", date: "2026-11-18", minutes: 60 };
const WEEK = "/api/iskur/week/2026-11-16";
const FALLBACK = "/api/coordinator/programs/p%2F1/iskur/weeks";

const calls: ClientCall[] = [
  {
    title: "getIskurWeek reads this week",
    call: () => getIskurWeek(null),
    method: "get",
    args: ["/api/iskur/week"],
  },
  {
    title: "getIskurWeek reads a week",
    call: () => getIskurWeek("2026-11-09"),
    method: "get",
    args: ["/api/iskur/week?weekStart=2026-11-09"],
  },
  {
    title: "saveIskurWeekEntries saves the lines",
    call: () => saveIskurWeekEntries("2026-11-16", []),
    method: "put",
    args: [`${WEEK}/entries`, { entries: [] }],
  },
  {
    title: "addIskurSupportEntry adds a support line",
    call: () => addIskurSupportEntry("2026-11-16", support),
    method: "post",
    args: [`${WEEK}/support-activity`, support],
  },
  {
    title: "submitIskurWeek sends the week",
    call: () => submitIskurWeek("2026-11-16"),
    method: "post",
    args: [`${WEEK}/submit`],
  },
  {
    title: "objectToIskurWeek objects",
    call: () => objectToIskurWeek("2026-11-16", "Katılmıyorum"),
    method: "post",
    args: [`${WEEK}/objection`, { objection: "Katılmıyorum" }],
  },
  {
    title: "getIskurLeaderQueue reads the queue",
    call: () => getIskurLeaderQueue(null),
    method: "get",
    args: ["/api/iskur/leader/weeks"],
  },
  {
    title: "getIskurLeaderWeek reads a week",
    call: () => getIskurLeaderWeek("w/1"),
    method: "get",
    args: ["/api/iskur/leader/weeks/w%2F1"],
  },
  {
    title: "decideIskurLeaderWeek decides",
    call: () => decideIskurLeaderWeek("w1", decision),
    method: "post",
    args: ["/api/iskur/leader/weeks/w1/decision", decision],
  },
  {
    title: "getIskurFallbackQueue reads the coordinators' queue",
    call: () => getIskurFallbackQueue("p/1", "2026-11-16"),
    method: "get",
    args: [`${FALLBACK}?weekStart=2026-11-16`],
  },
  {
    title: "getIskurFallbackWeek reads a fallback week",
    call: () => getIskurFallbackWeek("p/1", "w1"),
    method: "get",
    args: [`${FALLBACK}/w1`],
  },
  {
    title: "decideIskurFallbackWeek decides a fallback week",
    call: () => decideIskurFallbackWeek("p/1", "w1", decision),
    method: "post",
    args: [`${FALLBACK}/w1/decision`, decision],
  },
];

describe("İŞKUR week client calls", () => {
  itSendsEachClientCall(calls);
});
