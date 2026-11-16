import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchProgramOfficeHoursStudents } from "@/lib/api/program-office-hours";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({
  backendRequest: vi.fn(),
}));

describe("program office hours students backend client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for an encoded program's students with only the filters that are set", async () => {
    await fetchProgramOfficeHoursStudents("coordinator-1", "prog/1", {
      search: undefined,
      awaitingOnly: true,
      page: 0,
    });

    expect(backendRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/coordinator/programs/prog%2F1/office-hours/students",
      params: { actorId: "coordinator-1", awaitingOnly: true, page: 0 },
    });
  });
});
