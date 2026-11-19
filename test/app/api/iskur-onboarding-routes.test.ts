import { File as NodeFile } from "node:buffer";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as applicationDocument } from "@/app/api/coordinator/programs/[id]/iskur/applications/[userId]/documents/[slot]/route";
import { GET as applications } from "@/app/api/coordinator/programs/[id]/iskur/applications/route";
import { PUT as unitSkills } from "@/app/api/coordinator/programs/[id]/iskur/units/[unitId]/skills/route";
import { GET as me } from "@/app/api/iskur/me/route";
import {
  DELETE as removeDocument,
  POST as uploadDocument,
} from "@/app/api/iskur/onboarding/documents/[slot]/route";
import { GET as read, PUT as save } from "@/app/api/iskur/onboarding/route";
import { POST as submit } from "@/app/api/iskur/onboarding/submit/route";
import {
  IskurDocumentSlot,
  IskurSkillLevel,
  IskurTeamRolePreference,
} from "@/interfaces/iskur-onboarding";
import { Weekday } from "@/interfaces/mentor";
import { UserRole, type AppSession } from "@/interfaces/session";
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
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import { GORSEL, KREATIF, MERT } from "@test/fixtures/iskur-onboarding";
import {
  MULTIPART_CONTENT_TYPE,
  multipartBody,
} from "@test/fixtures/multipart";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-onboarding", () => ({
  fetchIskurApplicationDocument: vi.fn(),
  fetchIskurApplications: vi.fn(),
  fetchIskurOnboarding: vi.fn(),
  fetchIskurTeamReveal: vi.fn(),
  removeIskurOnboardingDocument: vi.fn(),
  replaceIskurUnitSkills: vi.fn(),
  saveIskurOnboardingDraft: vi.fn(),
  submitIskurOnboarding: vi.fn(),
  uploadIskurOnboardingDocument: vi.fn(),
}));

const calls = [
  fetchIskurApplicationDocument,
  fetchIskurApplications,
  fetchIskurOnboarding,
  fetchIskurTeamReveal,
  removeIskurOnboardingDocument,
  replaceIskurUnitSkills,
  saveIskurOnboardingDraft,
  submitIskurOnboarding,
  uploadIskurOnboardingDocument,
] as const;

const PROGRAM = "00000000-0000-4000-8000-000000000001";
const UNIT = "00000000-0000-4000-8000-000000000002";

const validForm = {
  weeklyDays: 1,
  schedule: [{ day: Weekday.Monday, start: "09:00", end: "16:30" }],
  priorIskurDays: 0,
  unitIds: [KREATIF],
  skills: [{ skillId: GORSEL, level: IskurSkillLevel.Good }],
  teamRoles: [IskurTeamRolePreference.Planner],
  leadership: {
    wants: false,
    motivation: null,
    experience: null,
    conflict: null,
  },
};

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@example.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

const json = (body: unknown, method = "POST") =>
  new Request("http://x", { method, body: JSON.stringify(body) });

const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

function pdfUpload(bytes = 64) {
  return new NextRequest("http://x", {
    method: "POST",
    headers: { "Content-Type": MULTIPART_CONTENT_TYPE },
    body: multipartBody({
      file: {
        filename: "cv.pdf",
        type: "application/pdf",
        bytes: new Uint8Array(bytes),
      },
      actorId: "forged",
    }),
  });
}

describe("İŞKUR onboarding routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // undici builds the parsed file with the global File, which jsdom replaces.
    vi.stubGlobal("File", NodeFile);
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
  });

  it("needs a session for the intern's routes", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const refused = [
      await read(),
      await save(json(validForm, "PUT")),
      await submit(json(validForm)),
      await me(),
      await uploadDocument(pdfUpload(), params({ slot: IskurDocumentSlot.Cv })),
      await removeDocument(
        new Request("http://x"),
        params({ slot: IskurDocumentSlot.Cv }),
      ),
    ];
    expect(refused.map((response) => response.status)).toEqual(
      refused.map(() => 401),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and ignores a forged actor", async () => {
    await read();
    expect(fetchIskurOnboarding).toHaveBeenCalledWith("MENTEE-1");
    await me();
    expect(fetchIskurTeamReveal).toHaveBeenCalledWith("MENTEE-1");

    await save(json(withForgedActor(validForm), "PUT"));
    expect(saveIskurOnboardingDraft).toHaveBeenCalledWith(
      "MENTEE-1",
      validForm,
    );
    await submit(json(withForgedActor(validForm)));
    expect(submitIskurOnboarding).toHaveBeenCalledWith("MENTEE-1", validForm);

    await removeDocument(
      new Request("http://x"),
      params({ slot: IskurDocumentSlot.Transcript }),
    );
    expect(removeIskurOnboardingDocument).toHaveBeenCalledWith(
      "MENTEE-1",
      IskurDocumentSlot.Transcript,
    );
  });

  it("fills in a partial draft and refuses one of the wrong shape", async () => {
    await save(json({ weeklyDays: 2 }, "PUT"));
    expect(saveIskurOnboardingDraft).toHaveBeenCalledWith("MENTEE-1", {
      weeklyDays: 2,
      schedule: [],
      priorIskurDays: null,
      unitIds: [],
      skills: [],
      teamRoles: [],
      leadership: {
        wants: false,
        motivation: null,
        experience: null,
        conflict: null,
      },
    });
    vi.mocked(saveIskurOnboardingDraft).mockClear();

    const invalid = [
      { ...validForm, weeklyDays: 4 },
      {
        ...validForm,
        schedule: [{ day: Weekday.Monday, start: "9:00", end: "16:30" }],
      },
      {
        ...validForm,
        schedule: [{ day: "MON", start: "09:00", end: "16:30" }],
      },
      { ...validForm, priorIskurDays: 141 },
      { ...validForm, unitIds: ["../admin"] },
      { ...validForm, skills: [{ skillId: GORSEL, level: "MASTER" }] },
      { ...validForm, teamRoles: ["PLANNER", "EXECUTOR", "CONNECTOR"] },
      {
        ...validForm,
        leadership: {
          wants: true,
          motivation: "a".repeat(501),
          experience: null,
          conflict: null,
        },
      },
    ];
    for (const body of invalid) {
      expect((await save(json(body, "PUT"))).status).toBe(400);
      expect((await submit(json(body))).status).toBe(400);
    }
    expect(
      (await save(new Request("http://x", { method: "PUT", body: "{" })))
        .status,
    ).toBe(400);
    expect(saveIskurOnboardingDraft).not.toHaveBeenCalled();
    expect(submitIskurOnboarding).not.toHaveBeenCalled();
  });

  it("passes on only the checked PDF, under the session user", async () => {
    await uploadDocument(pdfUpload(), params({ slot: IskurDocumentSlot.Cv }));
    expect(uploadIskurOnboardingDocument).toHaveBeenCalledTimes(1);
    const [actor, slot, form] =
      vi.mocked(uploadIskurOnboardingDocument).mock.calls[0] ?? [];
    expect(actor).toBe("MENTEE-1");
    expect(slot).toBe(IskurDocumentSlot.Cv);
    expect([...(form?.keys() ?? [])]).toEqual(["file"]);
  });

  it("refuses an empty upload and one too large to be a 10 MB PDF", async () => {
    expect(
      (
        await uploadDocument(
          pdfUpload(0),
          params({ slot: IskurDocumentSlot.Cv }),
        )
      ).status,
    ).toBe(400);
    const tooLarge = new NextRequest("http://x", {
      method: "POST",
      headers: { "content-length": String(11 * 1024 * 1024) },
      body: "x",
    });
    expect(
      (await uploadDocument(tooLarge, params({ slot: IskurDocumentSlot.Cv })))
        .status,
    ).toBe(400);
    expect(uploadIskurOnboardingDocument).not.toHaveBeenCalled();
  });

  it("never builds a backend path from a slot or id that is not one", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    const slots = ["..", "..%2F..%2Fadmin", "cv", "PHOTO"];
    for (const slot of slots) {
      expect((await uploadDocument(pdfUpload(), params({ slot }))).status).toBe(
        400,
      );
      expect(
        (await removeDocument(new Request("http://x"), params({ slot })))
          .status,
      ).toBe(400);
      expect(
        (
          await applicationDocument(
            new Request("http://x"),
            params({ id: PROGRAM, userId: MERT, slot }),
          )
        ).status,
      ).toBe(400);
    }
    for (const id of ["..", "p1", "../../admin"]) {
      expect(
        (await applications(new Request("http://x"), params({ id }))).status,
      ).toBe(400);
      expect(
        (
          await applicationDocument(
            new Request("http://x"),
            params({ id, userId: MERT, slot: IskurDocumentSlot.Cv }),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await applicationDocument(
            new Request("http://x"),
            params({ id: PROGRAM, userId: id, slot: IskurDocumentSlot.Cv }),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await unitSkills(
            json({ names: [] }, "PUT"),
            params({ id, unitId: UNIT }),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await unitSkills(
            json({ names: [] }, "PUT"),
            params({ id: PROGRAM, unitId: id }),
          )
        ).status,
      ).toBe(400);
    }
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("keeps the coordinator routes to coordinators and the admin", async () => {
    const refused = [
      await applications(new Request("http://x"), params({ id: PROGRAM })),
      await applicationDocument(
        new Request("http://x"),
        params({ id: PROGRAM, userId: MERT, slot: IskurDocumentSlot.Cv }),
      ),
      await unitSkills(
        json({ names: ["Yeni"] }, "PUT"),
        params({ id: PROGRAM, unitId: UNIT }),
      ),
    ];
    expect(refused.map((response) => response.status)).toEqual([403, 403, 403]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("forwards the coordinator's calls as the session user", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    await applications(new Request("http://x"), params({ id: PROGRAM }));
    expect(fetchIskurApplications).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );

    await unitSkills(
      json(withForgedActor({ names: [" Görsel tasarım ", "Web"] }), "PUT"),
      params({ id: PROGRAM, unitId: UNIT }),
    );
    expect(replaceIskurUnitSkills).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      UNIT,
      ["Görsel tasarım", "Web"],
    );
    expect(
      (
        await unitSkills(
          json({ names: [""] }, "PUT"),
          params({ id: PROGRAM, unitId: UNIT }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await unitSkills(
          json({ names: Array.from({ length: 31 }, (_, i) => `S${i}`) }, "PUT"),
          params({ id: PROGRAM, unitId: UNIT }),
        )
      ).status,
    ).toBe(400);
  });

  it("streams a document as an attachment and keeps the backend's refusal", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    vi.mocked(fetchIskurApplicationDocument).mockResolvedValue({
      ...backendResponse(new TextEncoder().encode("%PDF-1.4").buffer),
      headers: { "content-type": "text/html", "content-disposition": "inline" },
    });
    const file = await applicationDocument(
      new Request("http://x"),
      params({ id: PROGRAM, userId: MERT, slot: IskurDocumentSlot.Transcript }),
    );
    expect(fetchIskurApplicationDocument).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      MERT,
      IskurDocumentSlot.Transcript,
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("application/octet-stream");
    expect(file.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(file.headers.get("content-security-policy")).toContain("sandbox");

    vi.mocked(fetchIskurApplicationDocument).mockResolvedValue({
      ...backendResponse(new ArrayBuffer(0), 404),
      headers: {},
    });
    expect(
      (
        await applicationDocument(
          new Request("http://x"),
          params({ id: PROGRAM, userId: MERT, slot: IskurDocumentSlot.Cv }),
        )
      ).status,
    ).toBe(404);
  });

  it("answers 502 when the backend cannot be reached", async () => {
    vi.mocked(fetchIskurOnboarding).mockRejectedValue(new Error("down"));
    expect((await read()).status).toBe(502);
  });
});
