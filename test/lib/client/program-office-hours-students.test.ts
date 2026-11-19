import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProgramOfficeHoursStudents } from "@/lib/client/program-office-hours";
import { httpClient } from "@/lib/http-client";
import { programStudents } from "@test/fixtures/program-office-hours-students";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn() },
}));

describe("program office hours students browser client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads a program's students with the set filters", async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({
      status: 200,
      data: programStudents(),
    });

    await expect(
      getProgramOfficeHoursStudents("p 1", {
        search: null,
        faculty: null,
        awaitingOnly: false,
        page: 0,
        size: 25,
      }),
    ).resolves.toEqual(programStudents());
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/coordinator/programs/p%201/office-hours/students?awaitingOnly=false&page=0&size=25",
    );
  });
});
