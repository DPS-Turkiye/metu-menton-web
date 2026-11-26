import { describe, expect, it, vi } from "vitest";

import { ProgramFeature } from "@/interfaces/program";
import { getMyProgramFeatures } from "@/lib/client/program-features";
import { httpClient } from "@/lib/http-client";
import { createAxiosResponse } from "@test/fixtures/health";

vi.mock("@/lib/http-client", () => ({ httpClient: { get: vi.fn() } }));

describe("getMyProgramFeatures", () => {
  it("reads the signed-in person's features", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createAxiosResponse(
        { programFeatures: [ProgramFeature.OfficeHours] },
        200,
      ),
    );
    await expect(getMyProgramFeatures()).resolves.toEqual([
      ProgramFeature.OfficeHours,
    ]);
    expect(httpClient.get).toHaveBeenCalledWith("/api/me/program-features");
  });

  it("throws the route's refusal", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      createAxiosResponse({ message: "Oturum gerekli." }, 401),
    );
    await expect(getMyProgramFeatures()).rejects.toThrow();
  });
});
