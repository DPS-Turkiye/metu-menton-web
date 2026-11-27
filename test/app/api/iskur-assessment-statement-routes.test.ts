import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as mine,
  POST as send,
} from "@/app/api/iskur/assessment-statement/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  fetchMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
} from "@/lib/api/iskur-assessment-statement";
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-assessment-statement", () => ({
  fetchMyIskurAssessmentStatement: vi.fn(),
  sendIskurAssessmentStatement: vi.fn(),
}));

const calls = [
  fetchMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
] as const;

const json = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

const intern: AppSession = {
  userId: "MENTEE-1",
  email: "someone@example.test",
  fullName: "Someone",
  jobTitle: "x",
  role: UserRole.Mentee,
};

describe("İŞKUR assessment statement routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
  });

  it("refuses both routes without a session and calls nothing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const answers = [
      await mine(),
      await send(json({ reason: "FAILED", text: "Geçemedim" })),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([401, 401]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("reads and sends as the session user, ignoring a forged actor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(intern);
    await mine();
    expect(fetchMyIskurAssessmentStatement).toHaveBeenCalledWith("MENTEE-1");
    await send(
      json(withForgedActor({ reason: "FAILED", text: "  Geçemedim  " })),
    );
    expect(sendIskurAssessmentStatement).toHaveBeenCalledWith(
      "MENTEE-1",
      "FAILED",
      "Geçemedim",
    );
  });

  it("refuses an unknown reason, a blank text or one over the limit", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(intern);
    const answers = [
      await send(json({ reason: "SICK", text: "x" })),
      await send(json({ reason: "FAILED", text: "   " })),
      await send(json({ reason: "FAILED", text: "a".repeat(1001) })),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([400, 400, 400]);
    expect(sendIskurAssessmentStatement).not.toHaveBeenCalled();
  });
});
