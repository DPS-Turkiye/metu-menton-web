import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as decide } from "@/app/api/coordinator/programs/[id]/iskur/assessment-statements/[statementId]/decide/route";
import { GET as list } from "@/app/api/coordinator/programs/[id]/iskur/assessment-statements/route";
import {
  GET as mine,
  POST as send,
} from "@/app/api/iskur/assessment-statement/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  decideIskurAssessmentStatement,
  fetchIskurAssessmentStatements,
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
  decideIskurAssessmentStatement: vi.fn(),
  fetchIskurAssessmentStatements: vi.fn(),
  fetchMyIskurAssessmentStatement: vi.fn(),
  sendIskurAssessmentStatement: vi.fn(),
}));

const calls = [
  decideIskurAssessmentStatement,
  fetchIskurAssessmentStatements,
  fetchMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
] as const;

const PROGRAM = "00000000-0000-4000-8000-0000000000a1";
const STATEMENT = "00000000-0000-4000-8000-0000000000f1";
const program = { params: Promise.resolve({ id: PROGRAM }) };
const statement = {
  params: Promise.resolve({ id: PROGRAM, statementId: STATEMENT }),
};
const decision = {
  mentoring: "SET",
  mentoringMinutes: 0,
  openRetake: false,
  note: null,
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
const intern = as(UserRole.Mentee);

describe("İŞKUR assessment statement routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
  });

  it("refuses every route without a session and calls nothing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const answers = [
      await mine(),
      await send(json({ reason: "FAILED", text: "Geçemedim" })),
      await list(new Request("http://x"), program),
      await decide(json(decision), statement),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([
      401, 401, 401, 401,
    ]);
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
  it("keeps the list and the decision to coordinators, as the session user", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(intern);
    expect((await list(new Request("http://x"), program)).status).toBe(403);
    expect((await decide(json(decision), statement)).status).toBe(403);
    expect(fetchIskurAssessmentStatements).not.toHaveBeenCalled();
    expect(decideIskurAssessmentStatement).not.toHaveBeenCalled();

    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    await list(new Request("http://x"), program);
    expect(fetchIskurAssessmentStatements).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );
    await decide(
      json(withForgedActor({ ...decision, note: "  Tamam  " })),
      statement,
    );
    expect(decideIskurAssessmentStatement).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      STATEMENT,
      { ...decision, note: "Tamam" },
    );
    await decide(json({ ...decision, note: "   " }), statement);
    expect(decideIskurAssessmentStatement).toHaveBeenLastCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      STATEMENT,
      decision,
    );
  });

  it("refuses a bad decision body or path", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    const answers = [
      await decide(json({ ...decision, mentoring: "LATER" }), statement),
      await decide(json({ ...decision, mentoringMinutes: -30 }), statement),
      await decide(json({ ...decision, note: "a".repeat(501) }), statement),
      await decide(json(decision), {
        params: Promise.resolve({ id: PROGRAM, statementId: "not-a-uuid" }),
      }),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([
      400, 400, 400, 400,
    ]);
    expect(decideIskurAssessmentStatement).not.toHaveBeenCalled();
  });
});
