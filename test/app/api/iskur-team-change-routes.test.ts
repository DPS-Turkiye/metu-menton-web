import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as decline } from "@/app/api/coordinator/programs/[id]/iskur/team-changes/[requestId]/decline/route";
import { GET as list } from "@/app/api/coordinator/programs/[id]/iskur/team-changes/route";
import { POST as ask, GET as mine } from "@/app/api/iskur/team-change/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  askIskurTeamChange,
  declineIskurTeamChange,
  fetchIskurTeamChanges,
  fetchMyIskurTeamChange,
} from "@/lib/api/iskur-team-change";
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-team-change", () => ({
  askIskurTeamChange: vi.fn(),
  declineIskurTeamChange: vi.fn(),
  fetchIskurTeamChanges: vi.fn(),
  fetchMyIskurTeamChange: vi.fn(),
}));

const calls = [
  askIskurTeamChange,
  declineIskurTeamChange,
  fetchIskurTeamChanges,
  fetchMyIskurTeamChange,
] as const;

const PROGRAM = "00000000-0000-4000-8000-0000000000a1";
const REQUEST = "00000000-0000-4000-8000-0000000000e1";
const program = { params: Promise.resolve({ id: PROGRAM }) };
const request = {
  params: Promise.resolve({ id: PROGRAM, requestId: REQUEST }),
};
const json = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@example.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

describe("İŞKUR team change routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
  });

  it("refuses every route without a session and calls nothing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const answers = [
      await mine(),
      await ask(json({ reason: "Dijital ekip" })),
      await list(new Request("http://x"), program),
      await decline(json({ note: "Kalsın" }), request),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([
      401, 401, 401, 401,
    ]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("lets the intern ask as the session user, with a trimmed reason", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    await mine();
    expect(fetchMyIskurTeamChange).toHaveBeenCalledWith("MENTEE-1");
    await ask(json(withForgedActor({ reason: "  Dijital ekip  " })));
    expect(askIskurTeamChange).toHaveBeenCalledWith("MENTEE-1", "Dijital ekip");
    expect((await ask(json({ reason: "   " }))).status).toBe(400);
    expect((await ask(json({ reason: "a".repeat(501) }))).status).toBe(400);
  });

  it("keeps the coordinator's list and decline to coordinators, as the session user", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    expect((await list(new Request("http://x"), program)).status).toBe(403);
    expect((await decline(json({ note: "Kalsın" }), request)).status).toBe(403);
    expect(fetchIskurTeamChanges).not.toHaveBeenCalled();

    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    await list(new Request("http://x"), program);
    expect(fetchIskurTeamChanges).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );
    await decline(json(withForgedActor({ note: " Kalsın " })), request);
    expect(declineIskurTeamChange).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      REQUEST,
      "Kalsın",
    );
    expect((await decline(json({ note: "" }), request)).status).toBe(400);
    expect(
      (
        await decline(json({ note: "Kalsın" }), {
          params: Promise.resolve({ id: PROGRAM, requestId: "not-a-uuid" }),
        })
      ).status,
    ).toBe(400);
  });
});
