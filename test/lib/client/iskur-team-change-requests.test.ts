import { beforeEach, describe, vi } from "vitest";

import {
  askIskurTeamChange,
  declineIskurTeamChange,
  getIskurTeamChanges,
  getMyIskurTeamChange,
} from "@/lib/client/iskur-team-change";
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

const calls: ClientCall[] = [
  {
    title: "getMyIskurTeamChange reads the intern's request",
    call: () => getMyIskurTeamChange(),
    method: "get",
    args: ["/api/iskur/team-change"],
  },
  {
    title: "askIskurTeamChange sends the reason",
    call: () => askIskurTeamChange("Dijital ekip"),
    method: "post",
    args: ["/api/iskur/team-change", { reason: "Dijital ekip" }],
  },
  {
    title: "getIskurTeamChanges lists a program's requests",
    call: () => getIskurTeamChanges("p/1"),
    method: "get",
    args: ["/api/coordinator/programs/p%2F1/iskur/team-changes"],
  },
  {
    title: "declineIskurTeamChange sends the note",
    call: () => declineIskurTeamChange("p1", "r/1", "Kalsın"),
    method: "post",
    args: [
      "/api/coordinator/programs/p1/iskur/team-changes/r%2F1/decline",
      { note: "Kalsın" },
    ],
  },
];

describe("İŞKUR team change client", () => {
  beforeEach(() => vi.clearAllMocks());

  itSendsEachClientCall(calls);
});
