import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import {
  fetchProgramOfficeHoursAppointment,
  fetchProgramOfficeHoursAppointments,
} from "@/lib/api/program-office-hours";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({
  backendRequest: vi.fn(),
}));

describe("program office hours backend client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for an encoded program's appointments with only the filters that are set", async () => {
    await fetchProgramOfficeHoursAppointments("coordinator-1", "prog/1", {
      status: OfficeHoursRequestStatus.Pending,
      faculty: undefined,
      search: "",
      from: "2026-11-09",
      to: "2026-11-15",
      page: 0,
    });

    expect(backendRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/coordinator/programs/prog%2F1/office-hours/appointments",
      params: {
        actorId: "coordinator-1",
        status: "PENDING",
        from: "2026-11-09",
        to: "2026-11-15",
        page: 0,
      },
    });
  });

  it("asks for one appointment of an encoded program as the actor", async () => {
    await fetchProgramOfficeHoursAppointment(
      "coordinator-1",
      "prog/1",
      "req/1",
    );

    expect(backendRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/coordinator/programs/prog%2F1/office-hours/appointments/req%2F1",
      params: { actorId: "coordinator-1" },
    });
  });
});
