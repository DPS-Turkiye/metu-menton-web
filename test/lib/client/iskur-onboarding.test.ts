import { describe, expect, it, vi } from "vitest";

import { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";
import {
  getIskurApplications,
  getIskurOnboarding,
  getIskurTeamReveal,
  iskurApplicationDocumentHref,
  removeIskurOnboardingDocument,
  replaceIskurUnitSkills,
  saveIskurOnboardingDraft,
  submitIskurOnboarding,
  uploadIskurOnboardingDocument,
} from "@/lib/client/iskur-onboarding";
import { UPLOAD_TIMEOUT_MS } from "@/lib/http-client";
import {
  itSendsEachClientCall,
  type ClientCall,
} from "@test/fixtures/client-calls";

vi.mock("@/lib/http-client", async (original) => ({
  ...(await original<typeof import("@/lib/http-client")>()),
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const COORDINATOR = "/api/coordinator/programs/p%2F1/iskur";
const input = {
  weeklyDays: 1,
  schedule: [],
  priorIskurDays: 0,
  unitIds: [],
  skills: [],
  teamRoles: [],
  leadership: {
    wants: false,
    motivation: null,
    experience: null,
    conflict: null,
  },
};
const file = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });

const calls: ClientCall[] = [
  {
    title: "getIskurOnboarding reads the form",
    call: getIskurOnboarding,
    method: "get",
    args: ["/api/iskur/onboarding"],
  },
  {
    title: "saveIskurOnboardingDraft saves the whole form",
    call: () => saveIskurOnboardingDraft(input),
    method: "put",
    args: ["/api/iskur/onboarding", input],
  },
  {
    title: "submitIskurOnboarding sends it",
    call: () => submitIskurOnboarding(input),
    method: "post",
    args: ["/api/iskur/onboarding/submit", input],
  },
  {
    title: "uploadIskurOnboardingDocument sends the file to its slot",
    call: () => uploadIskurOnboardingDocument(IskurDocumentSlot.Cv, file),
    method: "post",
    args: [
      "/api/iskur/onboarding/documents/CV",
      expect.any(FormData),
      { timeout: UPLOAD_TIMEOUT_MS },
    ],
  },
  {
    title: "removeIskurOnboardingDocument empties a slot",
    call: () => removeIskurOnboardingDocument(IskurDocumentSlot.Transcript),
    method: "delete",
    args: ["/api/iskur/onboarding/documents/TRANSCRIPT"],
  },
  {
    title: "getIskurTeamReveal reads the team",
    call: getIskurTeamReveal,
    method: "get",
    args: ["/api/iskur/me"],
  },
  {
    title: "getIskurApplications lists the program's forms",
    call: () => getIskurApplications("p/1"),
    method: "get",
    args: [`${COORDINATOR}/applications`],
  },
  {
    title: "replaceIskurUnitSkills replaces a unit's skills",
    call: () => replaceIskurUnitSkills("p/1", "u/1", ["Web ve UX"]),
    method: "put",
    args: [`${COORDINATOR}/units/u%2F1/skills`, { names: ["Web ve UX"] }],
  },
];

describe("İŞKUR onboarding client", () => {
  itSendsEachClientCall(calls);

  it("links an intern's document under the program", () => {
    expect(
      iskurApplicationDocumentHref("p/1", "u/1", IskurDocumentSlot.Cv),
    ).toBe(`${COORDINATOR}/applications/u%2F1/documents/CV`);
  });
});
