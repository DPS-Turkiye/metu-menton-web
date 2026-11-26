import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/admin/users/[id]/program/route";
import { UserRole } from "@/interfaces/session";
import {
  deleteProgramMembership,
  fetchProgramMembership,
  putProgramMembership,
} from "@/lib/api/admin-membership";
import { requireAdminSession } from "@/lib/server/require-admin";
import {
  backendRefusal,
  backendResponse,
  guardRefusal,
  tokenRequest,
} from "@test/fixtures/route-handlers";
import { appSession } from "@test/fixtures/session";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/api/admin-membership", () => ({
  fetchProgramMembership: vi.fn(),
  putProgramMembership: vi.fn(),
  deleteProgramMembership: vi.fn(),
}));
vi.mock("@/lib/server/require-admin", () => ({
  requireAdminSession: vi.fn(),
}));

const PROGRAM_ID = "5d0c1e6a-0f43-4c4b-9a54-6f2d6c1b7e21";
const context = { params: Promise.resolve({ id: "user/1" }) };
const change = {
  userId: "user/1",
  fromProgramId: null,
  toProgramId: PROGRAM_ID,
  movedMentorRow: false,
};
const url = "http://localhost/api/admin/users/user%2F1/program";

describe("/api/admin/users/[id]/program", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({
      ok: true,
      session: appSession({ userId: "admin-1", role: UserRole.Admin }),
    });
    vi.mocked(fetchProgramMembership).mockResolvedValue(
      backendResponse({ current: null, targets: [], blockers: [] }),
    );
    vi.mocked(putProgramMembership).mockResolvedValue(backendResponse(change));
    vi.mocked(deleteProgramMembership).mockResolvedValue(
      backendResponse({ ...change, toProgramId: null }),
    );
  });

  it.each([401, 403] as const)(
    "answers %i to anyone but an admin, without asking the backend",
    async (status) => {
      vi.mocked(requireAdminSession).mockResolvedValue(guardRefusal(status));
      expect((await GET(new NextRequest(url), context)).status).toBe(status);
      expect(
        (
          await PUT(
            tokenRequest(url, {
              method: "PUT",
              token: "t",
              body: { programId: PROGRAM_ID },
            }),
            context,
          )
        ).status,
      ).toBe(status);
      expect(
        (
          await DELETE(
            tokenRequest(url, { method: "DELETE", token: "t" }),
            context,
          )
        ).status,
      ).toBe(status);
      expect(fetchProgramMembership).not.toHaveBeenCalled();
      expect(putProgramMembership).not.toHaveBeenCalled();
      expect(deleteProgramMembership).not.toHaveBeenCalled();
    },
  );

  it("reads the student's semesters as the signed-in admin", async () => {
    const response = await GET(new NextRequest(url), context);
    expect(response.status).toBe(200);
    expect(fetchProgramMembership).toHaveBeenCalledWith("admin-1", "user/1");
  });

  it("moves the student with the admin's own token and only the program id", async () => {
    const response = await PUT(
      tokenRequest(url, {
        method: "PUT",
        token: "admin-token",
        body: { programId: PROGRAM_ID, actorId: "someone-else" },
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(change);
    expect(putProgramMembership).toHaveBeenCalledWith(
      "user/1",
      PROGRAM_ID,
      "admin-token",
    );
  });

  it("removes the student with the admin's own token", async () => {
    const response = await DELETE(
      tokenRequest(url, { method: "DELETE", token: "admin-token" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(deleteProgramMembership).toHaveBeenCalledWith(
      "user/1",
      "admin-token",
    );
  });

  it("refuses a change without the admin's own sign-in", async () => {
    expect(
      (
        await PUT(
          tokenRequest(url, { method: "PUT", body: { programId: PROGRAM_ID } }),
          context,
        )
      ).status,
    ).toBe(401);
    expect(
      (await DELETE(tokenRequest(url, { method: "DELETE" }), context)).status,
    ).toBe(401);
    expect(putProgramMembership).not.toHaveBeenCalled();
    expect(deleteProgramMembership).not.toHaveBeenCalled();
  });

  it.each([
    ["no program", {}],
    ["a program id that is not one", { programId: "p-1" }],
    ["a program id of the wrong type", { programId: 7 }],
  ])("answers 400 for %s", async (_name, body) => {
    const response = await PUT(
      tokenRequest(url, { method: "PUT", token: "t", body }),
      context,
    );
    expect(response.status).toBe(400);
    expect(putProgramMembership).not.toHaveBeenCalled();
  });

  it("passes the backend's refusal with its open work through", async () => {
    const refusal = {
      code: "PROGRAM_WORK_OPEN",
      message: "Açık işler var.",
    };
    vi.mocked(deleteProgramMembership).mockResolvedValue(
      backendRefusal(409, refusal),
    );
    const response = await DELETE(
      tokenRequest(url, { method: "DELETE", token: "t" }),
      context,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(refusal);
  });

  it("maps a failure to its message", async () => {
    vi.mocked(putProgramMembership).mockRejectedValue(new Error("down"));
    const response = await PUT(
      tokenRequest(url, {
        method: "PUT",
        token: "t",
        body: { programId: PROGRAM_ID },
      }),
      context,
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: "programMembershipSaveFailed",
    });
  });
});
