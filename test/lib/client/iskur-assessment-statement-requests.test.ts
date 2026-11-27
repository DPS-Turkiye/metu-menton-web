import { beforeEach, describe, vi } from "vitest";

import { IskurAssessmentReason } from "@/interfaces/iskur-assessment-statement";
import {
  getMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
} from "@/lib/client/iskur-assessment-statement";
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
    title: "getMyIskurAssessmentStatement reads the intern's statement",
    call: () => getMyIskurAssessmentStatement(),
    method: "get",
    args: ["/api/iskur/assessment-statement"],
  },
  {
    title: "sendIskurAssessmentStatement sends the reason and text",
    call: () =>
      sendIskurAssessmentStatement(IskurAssessmentReason.NoMentoring, "Ekip"),
    method: "post",
    args: [
      "/api/iskur/assessment-statement",
      { reason: "NO_MENTORING", text: "Ekip" },
    ],
  },
];

describe("İŞKUR assessment statement client", () => {
  beforeEach(() => vi.clearAllMocks());

  itSendsEachClientCall(calls);
});
