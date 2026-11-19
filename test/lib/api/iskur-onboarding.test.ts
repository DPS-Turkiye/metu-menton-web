import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";
import {
  fetchIskurApplicationDocument,
  fetchIskurApplications,
  fetchIskurOnboarding,
  fetchIskurTeamReveal,
  removeIskurOnboardingDocument,
  replaceIskurUnitSkills,
  saveIskurOnboardingDraft,
  submitIskurOnboarding,
  uploadIskurOnboardingDocument,
} from "@/lib/api/iskur-onboarding";
import { UPLOAD_TIMEOUT_MS } from "@/lib/http-client";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

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
const form = new FormData();

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads the form",
    () => fetchIskurOnboarding("s1"),
    { method: "GET", url: "/api/iskur/onboarding", params: { actorId: "s1" } },
  ],
  [
    "saves a draft",
    () => saveIskurOnboardingDraft("s1", input),
    {
      method: "PUT",
      url: "/api/iskur/onboarding",
      data: { ...input, actorId: "s1" },
    },
  ],
  [
    "submits the form",
    () => submitIskurOnboarding("s1", input),
    {
      method: "POST",
      url: "/api/iskur/onboarding/submit",
      data: { ...input, actorId: "s1" },
    },
  ],
  [
    "uploads a document",
    () => uploadIskurOnboardingDocument("s1", IskurDocumentSlot.Cv, form),
    {
      method: "POST",
      url: "/api/iskur/onboarding/documents/CV",
      params: { actorId: "s1" },
      data: form,
      timeout: UPLOAD_TIMEOUT_MS,
    },
  ],
  [
    "removes a document",
    () => removeIskurOnboardingDocument("s1", IskurDocumentSlot.Transcript),
    {
      method: "DELETE",
      url: "/api/iskur/onboarding/documents/TRANSCRIPT",
      params: { actorId: "s1" },
    },
  ],
  [
    "reads the team",
    () => fetchIskurTeamReveal("s1"),
    { method: "GET", url: "/api/iskur/me", params: { actorId: "s1" } },
  ],
  [
    "lists the applications",
    () => fetchIskurApplications("c1", "p/1"),
    {
      method: "GET",
      url: `${COORDINATOR}/applications`,
      params: { actorId: "c1" },
    },
  ],
  [
    "reads an encoded intern's document as bytes",
    () =>
      fetchIskurApplicationDocument("c1", "p/1", "u/1", IskurDocumentSlot.Cv),
    {
      method: "GET",
      url: `${COORDINATOR}/applications/u%2F1/documents/CV`,
      params: { actorId: "c1" },
      responseType: "arraybuffer",
      headers: { Accept: "*/*" },
    },
  ],
  [
    "replaces a unit's skills",
    () => replaceIskurUnitSkills("c1", "p/1", "u/1", ["Görsel tasarım"]),
    {
      method: "PUT",
      url: `${COORDINATOR}/units/u%2F1/skills`,
      data: { actorId: "c1", names: ["Görsel tasarım"] },
    },
  ],
];

describe("İŞKUR onboarding server API", () => {
  beforeEach(() => {
    vi.mocked(backendRequest).mockReset();
  });

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
