import { beforeEach, describe, vi } from "vitest";

import {
  answerIskurTeamSupport,
  getIskurTaskSupports,
  getIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/client/iskur-team-support";
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

const input = { toTeamId: "t2", taskId: "task-1", need: "Görsel" };

const calls: ClientCall[] = [
  {
    title: "getIskurTeamSupports reads the leader's requests",
    call: () => getIskurTeamSupports(),
    method: "get",
    args: ["/api/iskur/team-support"],
  },
  {
    title: "openIskurTeamSupport opens one",
    call: () => openIskurTeamSupport(input),
    method: "post",
    args: ["/api/iskur/team-support", input],
  },
  {
    title: "answerIskurTeamSupport accepts with a note",
    call: () => answerIskurTeamSupport("r/1", true, "Perşembe"),
    method: "post",
    args: ["/api/iskur/team-support/r%2F1/accept", { note: "Perşembe" }],
  },
  {
    title: "answerIskurTeamSupport declines",
    call: () => answerIskurTeamSupport("r1", false, null),
    method: "post",
    args: ["/api/iskur/team-support/r1/decline", { note: null }],
  },
  {
    title: "getIskurTaskSupports reads a task's requests",
    call: () => getIskurTaskSupports("t/1"),
    method: "get",
    args: ["/api/iskur/tasks/t%2F1/team-support"],
  },
];

describe("İŞKUR team support client", () => {
  beforeEach(() => vi.clearAllMocks());

  itSendsEachClientCall(calls);
});
