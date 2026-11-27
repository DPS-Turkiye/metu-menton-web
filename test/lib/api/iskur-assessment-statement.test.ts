import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurAssessmentReason } from "@/interfaces/iskur-assessment-statement";
import {
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
];

describe("İŞKUR assessment statement server API", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
