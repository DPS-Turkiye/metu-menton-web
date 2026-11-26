import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  askIskurTeamChange,
  declineIskurTeamChange,
  fetchIskurTeamChanges,
  fetchMyIskurTeamChange,
} from "@/lib/api/iskur-team-change";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads the intern's latest request",
    () => fetchMyIskurTeamChange("u1"),
    { method: "GET", url: "/api/iskur/team-change", params: { actorId: "u1" } },
  ],
  [
    "sends the intern's reason",
    () => askIskurTeamChange("u1", "Dijital ekip"),
    {
      method: "POST",
      url: "/api/iskur/team-change",
      data: { actorId: "u1", reason: "Dijital ekip" },
    },
  ],
  [
    "lists a program's requests",
    () => fetchIskurTeamChanges("u1", "p/1"),
    {
      method: "GET",
      url: "/api/coordinator/programs/p%2F1/iskur/team-changes",
      params: { actorId: "u1" },
    },
  ],
  [
    "declines a request with a note",
    () => declineIskurTeamChange("u1", "p1", "r/1", "Kalsın"),
    {
      method: "POST",
      url: "/api/coordinator/programs/p1/iskur/team-changes/r%2F1/decline",
      data: { actorId: "u1", note: "Kalsın" },
    },
  ],
];

describe("İŞKUR team change server API", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
