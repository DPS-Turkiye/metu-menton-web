import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IskurAssessmentReason,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import {
  decideIskurAssessmentStatement,
  fetchIskurAssessmentStatements,
  fetchMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
} from "@/lib/api/iskur-assessment-statement";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads the intern's latest statement",
    () => fetchMyIskurAssessmentStatement("u1"),
    {
      method: "GET",
      url: "/api/iskur/assessment-statement",
      params: { actorId: "u1" },
    },
  ],
  [
    "sends the intern's reason and text",
    () =>
      sendIskurAssessmentStatement(
        "u1",
        IskurAssessmentReason.Failed,
        "Geçemedim",
      ),
    {
      method: "POST",
      url: "/api/iskur/assessment-statement",
      data: { actorId: "u1", reason: "FAILED", text: "Geçemedim" },
    },
  ],
  [
    "lists a program's statements",
    () => fetchIskurAssessmentStatements("u1", "p/1"),
    {
      method: "GET",
      url: "/api/coordinator/programs/p%2F1/iskur/assessment-statements",
      params: { actorId: "u1" },
    },
  ],
  [
    "sends a decision",
    () =>
      decideIskurAssessmentStatement("u1", "p1", "s/1", {
        mentoring: IskurMentoringDecision.Set,
        mentoringMinutes: 0,
        openRetake: false,
        note: null,
      }),
    {
      method: "POST",
      url: "/api/coordinator/programs/p1/iskur/assessment-statements/s%2F1/decide",
      data: {
        actorId: "u1",
        mentoring: "SET",
        mentoringMinutes: 0,
        openRetake: false,
        note: null,
      },
    },
  ],
];

describe("İŞKUR assessment statement server API", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
