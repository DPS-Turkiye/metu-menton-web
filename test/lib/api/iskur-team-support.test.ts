import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  answerIskurTeamSupport,
  fetchIskurTaskSupports,
  fetchIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/api/iskur-team-support";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const input = { toTeamId: "t2", taskId: null, need: "Görsel" };

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads the leader's requests",
    () => fetchIskurTeamSupports("u1"),
    {
      method: "GET",
      url: "/api/iskur/team-support",
      params: { actorId: "u1" },
    },
  ],
  [
    "opens a request",
    () => openIskurTeamSupport("u1", input),
    {
      method: "POST",
      url: "/api/iskur/team-support",
      data: { ...input, actorId: "u1" },
    },
  ],
  [
    "accepts a request",
    () => answerIskurTeamSupport("u1", "r/1", true, "Perşembe"),
    {
      method: "POST",
      url: "/api/iskur/team-support/r%2F1/accept",
      data: { actorId: "u1", note: "Perşembe" },
    },
  ],
  [
    "declines a request",
    () => answerIskurTeamSupport("u1", "r1", false, null),
    {
      method: "POST",
      url: "/api/iskur/team-support/r1/decline",
      data: { actorId: "u1", note: null },
    },
  ],
  [
    "reads a task's requests",
    () => fetchIskurTaskSupports("u1", "t/1"),
    {
      method: "GET",
      url: "/api/iskur/tasks/t%2F1/team-support",
      params: { actorId: "u1" },
    },
  ],
];

describe("İŞKUR team support server API", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
