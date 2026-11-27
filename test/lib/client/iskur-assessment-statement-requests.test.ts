import { beforeEach, describe, vi } from "vitest";

import {
  IskurAssessmentReason,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import {
  decideIskurAssessmentStatement,
  getIskurAssessmentStatements,
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
  {
    title: "getIskurAssessmentStatements lists a program's statements",
    call: () => getIskurAssessmentStatements("p/1"),
    method: "get",
    args: ["/api/coordinator/programs/p%2F1/iskur/assessment-statements"],
  },
  {
    title: "decideIskurAssessmentStatement sends the decision",
    call: () =>
      decideIskurAssessmentStatement("p1", "s/1", {
        mentoring: IskurMentoringDecision.Default,
        mentoringMinutes: null,
        openRetake: true,
        note: "Tamam",
      }),
    method: "post",
    args: [
      "/api/coordinator/programs/p1/iskur/assessment-statements/s%2F1/decide",
      {
        mentoring: "DEFAULT",
        mentoringMinutes: null,
        openRetake: true,
        note: "Tamam",
      },
    ],
  },
];

describe("İŞKUR assessment statement client", () => {
  beforeEach(() => vi.clearAllMocks());

  itSendsEachClientCall(calls);
});
