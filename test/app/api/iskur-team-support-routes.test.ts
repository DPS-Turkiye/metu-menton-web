import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as forTask } from "@/app/api/iskur/tasks/[taskId]/team-support/route";
import { POST as accept } from "@/app/api/iskur/team-support/[requestId]/accept/route";
import { POST as decline } from "@/app/api/iskur/team-support/[requestId]/decline/route";
import { GET as mine, POST as open } from "@/app/api/iskur/team-support/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  answerIskurTeamSupport,
  fetchIskurTaskSupports,
  fetchIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/api/iskur-team-support";
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-team-support", () => ({
  answerIskurTeamSupport: vi.fn(),
  fetchIskurTaskSupports: vi.fn(),
  fetchIskurTeamSupports: vi.fn(),
  openIskurTeamSupport: vi.fn(),
}));

const calls = [
  answerIskurTeamSupport,
  fetchIskurTaskSupports,
  fetchIskurTeamSupports,
  openIskurTeamSupport,
] as const;

const TEAM = "00000000-0000-4000-8000-0000000000b2";
const TASK = "00000000-0000-4000-8000-0000000000c1";
const REQUEST = "00000000-0000-4000-8000-0000000000f1";
const request = { params: Promise.resolve({ requestId: REQUEST }) };
const task = { params: Promise.resolve({ taskId: TASK }) };
const json = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

const leader: AppSession = {
  userId: "leader-1",
  email: "leader@example.test",
  fullName: "Zeynep Kaya",
  jobTitle: "x",
  role: UserRole.Mentee,
};

describe("İŞKUR team support routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(leader);
  });

  it("refuses every route without a session and calls nothing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const answers = [
      await mine(),
      await open(json({ toTeamId: TEAM, need: "Görsel" })),
      await accept(json({}), request),
      await decline(json({}), request),
      await forTask(new Request("http://x"), task),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([
      401, 401, 401, 401, 401,
    ]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and ignores a forged actor", async () => {
    await mine();
    expect(fetchIskurTeamSupports).toHaveBeenCalledWith("leader-1");
    await open(json(withForgedActor({ toTeamId: TEAM, need: "  Görsel  " })));
    expect(openIskurTeamSupport).toHaveBeenCalledWith("leader-1", {
      toTeamId: TEAM,
      taskId: null,
      need: "Görsel",
    });
    await accept(json(withForgedActor({ note: " Perşembe " })), request);
    expect(answerIskurTeamSupport).toHaveBeenCalledWith(
      "leader-1",
      REQUEST,
      true,
      "Perşembe",
    );
    await decline(json({ note: "   " }), request);
    expect(answerIskurTeamSupport).toHaveBeenLastCalledWith(
      "leader-1",
      REQUEST,
      false,
      null,
    );
    await forTask(new Request("http://x"), task);
    expect(fetchIskurTaskSupports).toHaveBeenCalledWith("leader-1", TASK);
  });

  it("refuses a bad body or id before calling the backend", async () => {
    const refused = [
      await open(json({ toTeamId: "not-a-uuid", need: "Görsel" })),
      await open(json({ toTeamId: TEAM, need: "   " })),
      await open(json({ toTeamId: TEAM, need: "a".repeat(501) })),
      await accept(json({ note: "a".repeat(501) }), request),
      await accept(json({}), {
        params: Promise.resolve({ requestId: "not-a-uuid" }),
      }),
      await forTask(new Request("http://x"), {
        params: Promise.resolve({ taskId: "not-a-uuid" }),
      }),
    ];
    expect(refused.map((answer) => answer.status)).toEqual(
      refused.map(() => 400),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });
});
