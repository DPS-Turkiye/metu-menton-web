import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/me/program-features/route";
import { ProgramFeature } from "@/interfaces/program";
import {
  UserRole,
  type AppSession,
  type BackendUser,
} from "@/interfaces/session";
import { fetchUser } from "@/lib/api/accounts";
import { getSessionUser } from "@/lib/session";
import { backendRefusal, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/accounts", () => ({ fetchUser: vi.fn() }));

const student: AppSession = {
  userId: "student-1",
  email: "ogrenci@example.test",
  fullName: "Öğrenci",
  jobTitle: "",
  role: UserRole.Mentee,
};

function account(programFeatures: unknown): BackendUser {
  return {
    id: "student-1",
    email: "ogrenci@example.test",
    fullName: "Öğrenci",
    role: UserRole.Mentee,
    programFeatures,
  };
}

describe("GET /api/me/program-features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue(student);
  });

  it("asks for a session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(fetchUser).not.toHaveBeenCalled();
  });

  it("reads the session's own account and answers only its known features", async () => {
    vi.mocked(fetchUser).mockResolvedValue(
      backendResponse(
        account(["OFFICE_HOURS", "SOMETHING_NEW", "PEER_MENTORING"]),
      ),
    );
    const response = await GET();
    expect(fetchUser).toHaveBeenCalledWith("student-1", "student-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      programFeatures: [
        ProgramFeature.PeerMentoring,
        ProgramFeature.OfficeHours,
      ],
    });
  });

  it("answers null when the backend does not send the field, and no features for codes it does not know", async () => {
    vi.mocked(fetchUser).mockResolvedValue(backendResponse(account(undefined)));
    expect(await (await GET()).json()).toEqual({ programFeatures: null });
    vi.mocked(fetchUser).mockResolvedValue(
      backendResponse(account(["SOMETHING_NEW"])),
    );
    expect(await (await GET()).json()).toEqual({ programFeatures: [] });
  });

  it("passes a refusal through and maps a failure", async () => {
    vi.mocked(fetchUser).mockResolvedValue(backendRefusal(404));
    expect((await GET()).status).toBe(404);
    vi.mocked(fetchUser).mockRejectedValue(new Error("down"));
    const failed = await GET();
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({
      message: "programFeaturesLoadFailed",
    });
  });
});
