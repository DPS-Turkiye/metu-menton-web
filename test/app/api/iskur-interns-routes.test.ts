import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as remove } from "@/app/api/coordinator/programs/[id]/iskur/interns/[entryId]/route";
import {
  POST as add,
  GET as list,
} from "@/app/api/coordinator/programs/[id]/iskur/interns/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  addIskurInterns,
  fetchIskurInterns,
  removeIskurIntern,
} from "@/lib/api/iskur-interns";
import { ISKUR_INTERN_PASTE_MAX } from "@/lib/iskur-interns";
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import {
  iskurInternEntry,
  iskurInternList,
} from "@test/fixtures/iskur-interns";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-interns", () => ({
  addIskurInterns: vi.fn(),
  fetchIskurInterns: vi.fn(),
  removeIskurIntern: vi.fn(),
}));

const calls = [addIskurInterns, fetchIskurInterns, removeIskurIntern] as const;

const PROGRAM = "00000000-0000-4000-8000-0000000000a1";
const ENTRY = "00000000-0000-4000-8000-0000000000a2";
const program = { params: Promise.resolve({ id: PROGRAM }) };
const entry = { params: Promise.resolve({ id: PROGRAM, entryId: ENTRY }) };

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@example.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

const json = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

describe("İŞKUR intern list routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
  });

  it("keeps every route to coordinators and the admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await list(new Request("http://x"), program)).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    const refused = [
      await list(new Request("http://x"), program),
      await add(json({ emails: ["ayse@example.test"] }), program),
      await remove(new Request("http://x"), entry),
    ];
    expect(refused.map((response) => response.status)).toEqual([403, 403, 403]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and ignores a forged actor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Admin));
    await list(new Request("http://x"), program);
    expect(fetchIskurInterns).toHaveBeenCalledWith("ADMIN-1", PROGRAM);

    await add(
      json(withForgedActor({ emails: ["ayse@example.test"] })),
      program,
    );
    expect(addIskurInterns).toHaveBeenCalledWith("ADMIN-1", PROGRAM, [
      "ayse@example.test",
    ]);

    await remove(new Request("http://x"), entry);
    expect(removeIskurIntern).toHaveBeenCalledWith("ADMIN-1", PROGRAM, ENTRY);
  });

  it("refuses ids that are not uuids before calling the backend", async () => {
    const badProgram = { params: Promise.resolve({ id: ".." }) };
    const badEntry = {
      params: Promise.resolve({ id: PROGRAM, entryId: ".." }),
    };
    expect((await list(new Request("http://x"), badProgram)).status).toBe(400);
    expect(
      (await add(json({ emails: ["a@example.test"] }), badProgram)).status,
    ).toBe(400);
    expect((await remove(new Request("http://x"), badEntry)).status).toBe(400);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("refuses an empty, oversized or malformed paste", async () => {
    const tooMany = Array.from(
      { length: ISKUR_INTERN_PASTE_MAX + 1 },
      (_, index) => `kisi${index}@example.test`,
    );
    for (const body of [
      {},
      { emails: [] },
      { emails: tooMany },
      { emails: [42] },
      { emails: ["a".repeat(321)] },
    ]) {
      expect((await add(json(body), program)).status).toBe(400);
    }
    expect(addIskurInterns).not.toHaveBeenCalled();
  });

  it("passes the backend's answer through", async () => {
    const answer = iskurInternList([iskurInternEntry()]);
    vi.mocked(fetchIskurInterns).mockResolvedValue(backendResponse(answer));
    const response = await list(new Request("http://x"), program);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(answer);
  });
});
