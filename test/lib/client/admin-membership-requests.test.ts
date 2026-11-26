import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addStudentToProgram,
  getProgramMembership,
  removeStudentFromProgram,
} from "@/lib/client/admin-membership";
import { httpClient } from "@/lib/http-client";
import { createAxiosResponse } from "@test/fixtures/health";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const URL = "/api/admin/users/user%2F1/program";
const BEARER = { headers: { Authorization: "Bearer admin-token" } };

describe("admin program membership client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const ok = createAxiosResponse({}, 200);
    vi.mocked(httpClient.get).mockResolvedValue(ok);
    vi.mocked(httpClient.put).mockResolvedValue(ok);
    vi.mocked(httpClient.delete).mockResolvedValue(ok);
  });

  it("reads a student's semesters", async () => {
    await getProgramMembership("user/1");
    expect(httpClient.get).toHaveBeenCalledWith(URL);
  });

  it("adds with the admin's own token and only the program id", async () => {
    await addStudentToProgram("user/1", "p1", "admin-token");
    expect(httpClient.put).toHaveBeenCalledWith(
      URL,
      { programId: "p1" },
      BEARER,
    );
  });

  it("removes with the admin's own token", async () => {
    await removeStudentFromProgram("user/1", "admin-token");
    expect(httpClient.delete).toHaveBeenCalledWith(URL, BEARER);
  });

  it("throws the route's refusal", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(
      createAxiosResponse({ message: "Açık işler var." }, 409),
    );
    await expect(
      removeStudentFromProgram("user/1", "admin-token"),
    ).rejects.toThrow();
  });
});
