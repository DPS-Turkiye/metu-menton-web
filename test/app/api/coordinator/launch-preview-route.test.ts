import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/coordinator/programs/[id]/launch-preview/route";
import { UserRole } from "@/interfaces/session";
import { fetchLaunchPreview } from "@/lib/api/coordinator-programs";
import { requireAdminSession } from "@/lib/server/require-admin";
import {
  backendRefusal,
  backendResponse,
  guardRefusal,
} from "@test/fixtures/route-handlers";
import { appSession } from "@test/fixtures/session";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/server/require-admin", () => ({
  requireAdminSession: vi.fn(),
}));
vi.mock("@/lib/api/coordinator-programs", () => ({
  fetchLaunchPreview: vi.fn(),
}));

const request = new NextRequest("http://localhost/api");
const program = { params: Promise.resolve({ id: "semester/1" }) };
const preview = {
  previous: { id: "old-1", name: "2026 Bahar" },
  students: 13,
  peerMentors: 2,
};

describe("GET /api/coordinator/programs/[id]/launch-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({
      ok: true,
      session: appSession({ userId: "admin-1", role: UserRole.Admin }),
    });
  });

  it.each([401, 403] as const)(
    "answers %i without asking the backend when the caller is not an admin",
    async (status) => {
      vi.mocked(requireAdminSession).mockResolvedValue(guardRefusal(status));
      expect((await GET(request, program)).status).toBe(status);
      expect(fetchLaunchPreview).not.toHaveBeenCalled();
    },
  );

  it("asks for the program as the signed-in admin and forwards the answer", async () => {
    vi.mocked(fetchLaunchPreview).mockResolvedValue(backendResponse(preview));
    const response = await GET(request, program);
    expect(fetchLaunchPreview).toHaveBeenCalledWith("admin-1", "semester/1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(preview);
  });

  it("forwards the backend's refusal of a program that is not a draft, and maps a failure", async () => {
    vi.mocked(fetchLaunchPreview).mockResolvedValue(backendRefusal(400));
    expect((await GET(request, program)).status).toBe(400);
    vi.mocked(fetchLaunchPreview).mockRejectedValue(new Error("down"));
    const failed = await GET(request, program);
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({
      message: "launchPreviewLoadFailed",
    });
  });
});
