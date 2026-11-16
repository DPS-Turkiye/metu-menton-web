import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getProgramOfficeHoursAppointments,
  programOfficeHoursSearch,
} from "@/lib/client/program-office-hours";
import { httpClient } from "@/lib/http-client";
import { programAppointments } from "@test/fixtures/program-office-hours";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn() },
}));

const query = {
  status: null,
  faculty: "Fen-Edebiyat Fakültesi",
  search: null,
  from: "2026-11-09",
  to: "2026-11-15",
  page: 0,
  size: 25,
};

describe("program office hours browser client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes only the filters that are set into the query string", () => {
    expect(programOfficeHoursSearch(query)).toBe(
      "faculty=Fen-Edebiyat+Fak%C3%BCltesi&from=2026-11-09&to=2026-11-15&page=0&size=25",
    );
  });

  it("loads a program's appointments and surfaces a failure", async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({
      status: 200,
      data: programAppointments(),
    });
    await expect(
      getProgramOfficeHoursAppointments("p 1", query),
    ).resolves.toEqual(programAppointments());
    expect(httpClient.get).toHaveBeenCalledWith(
      `/api/coordinator/programs/p%201/office-hours/appointments?${programOfficeHoursSearch(query)}`,
    );

    vi.mocked(httpClient.get).mockResolvedValueOnce({
      status: 502,
      data: { message: "Randevular yüklenemedi." },
    });
    await expect(getProgramOfficeHoursAppointments("p", query)).rejects.toThrow(
      "Randevular yüklenemedi.",
    );
  });
});
