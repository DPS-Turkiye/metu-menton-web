import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as prismDecisions } from "@/app/api/coordinator/programs/[id]/badges/prism-decisions/route";
import {
  GET as prismLink,
  PUT as savePrismLinkRoute,
} from "@/app/api/coordinator/programs/[id]/training/prism/route";
import { POST as prismCompleted } from "@/app/api/training/peer/prism-completed/route";
import { PrismDecision } from "@/interfaces/badges";
import { UserRole, type AppSession } from "@/interfaces/session";
import { decidePrismResults } from "@/lib/api/badges";
import {
  fetchPrismLink,
  reportPrismCompleted,
  savePrismLink,
} from "@/lib/api/training";
import { getSessionUser } from "@/lib/session";
import { answerEachWith } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/badges", () => ({ decidePrismResults: vi.fn() }));
vi.mock("@/lib/api/training", () => ({
  fetchPrismLink: vi.fn(),
  reportPrismCompleted: vi.fn(),
  savePrismLink: vi.fn(),
}));

const program = { params: Promise.resolve({ id: "p1" }) };
const as = (role: UserRole): AppSession => ({
  userId: `${role}-1`,
  email: "x@example.test",
  fullName: "X",
  jobTitle: "x",
  role,
});

function request(method: string, body: unknown) {
  return new NextRequest("http://localhost/x", {
    method,
    body: JSON.stringify(body),
  });
}

describe("Prism routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith([
      decidePrismResults,
      fetchPrismLink,
      reportPrismCompleted,
      savePrismLink,
    ]);
  });

  it("keeps the Prism link to coordinators and admins, acting as themselves", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    expect(
      (await prismLink(new NextRequest("http://localhost/x"), program)).status,
    ).toBe(403);
    expect(
      (
        await savePrismLinkRoute(
          request("PUT", { url: "https://prism.example.test" }),
          program,
        )
      ).status,
    ).toBe(403);
    expect(fetchPrismLink).not.toHaveBeenCalled();
    expect(savePrismLink).not.toHaveBeenCalled();

    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    await prismLink(new NextRequest("http://localhost/x"), program);
    expect(fetchPrismLink).toHaveBeenCalledWith("COORDINATOR-1", "p1");
    await savePrismLinkRoute(
      request("PUT", {
        actorId: "someone-else",
        url: " https://prism.example.test ",
      }),
      program,
    );
    expect(savePrismLink).toHaveBeenCalledWith(
      "COORDINATOR-1",
      "p1",
      "https://prism.example.test",
    );
  });

  it("refuses an empty Prism link before the backend", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    expect(
      (await savePrismLinkRoute(request("PUT", { url: "  " }), program)).status,
    ).toBe(400);
    expect(savePrismLink).not.toHaveBeenCalled();
  });

  it("sends Prism decisions for coordinators and admins only, as themselves", async () => {
    const body = {
      actorId: "someone-else",
      decision: PrismDecision.Approved,
      entries: [
        { email: " a@example.test " },
        { email: "b@example.test", score: "86" },
      ],
    };
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    expect((await prismDecisions(request("POST", body), program)).status).toBe(
      403,
    );
    expect(decidePrismResults).not.toHaveBeenCalled();

    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Admin));
    await prismDecisions(request("POST", body), program);
    expect(decidePrismResults).toHaveBeenCalledWith("ADMIN-1", "p1", {
      decision: PrismDecision.Approved,
      entries: [
        { email: "a@example.test", score: null },
        { email: "b@example.test", score: "86" },
      ],
    });
  });

  it("refuses a decision without addresses, an unknown decision or a long score", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    for (const body of [
      { decision: PrismDecision.Retake, entries: [] },
      { decision: "MAYBE", entries: [{ email: "a@example.test" }] },
      {
        decision: PrismDecision.Retake,
        entries: [{ email: "a@example.test", score: "x".repeat(33) }],
      },
    ]) {
      expect(
        (await prismDecisions(request("POST", body), program)).status,
      ).toBe(400);
    }
    expect(decidePrismResults).not.toHaveBeenCalled();
  });

  it("lets a signed-in student say they finished Prism, as themselves", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await prismCompleted()).status).toBe(401);
    expect(reportPrismCompleted).not.toHaveBeenCalled();

    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    await prismCompleted();
    expect(reportPrismCompleted).toHaveBeenCalledWith("MENTEE-1");
  });
});
