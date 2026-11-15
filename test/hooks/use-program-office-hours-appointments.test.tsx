import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProgramOfficeHoursAppointments } from "@/hooks/use-program-office-hours-appointments";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import { getProgramOfficeHoursAppointments } from "@/lib/client/program-office-hours";
import { programAppointments } from "@test/fixtures/program-office-hours";
import { createTestQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/program-office-hours", () => ({
  getProgramOfficeHoursAppointments: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

const friday = new Date(2026, 10, 13, 12);

describe("useProgramOfficeHoursAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProgramOfficeHoursAppointments).mockResolvedValue(
      programAppointments(),
    );
  });

  it("opens on this week, with every status and faculty", async () => {
    const { result } = renderHook(
      () => useProgramOfficeHoursAppointments("p1", friday),
      {
        wrapper,
      },
    );

    await waitFor(() =>
      expect(result.current.data).toEqual(programAppointments()),
    );
    expect(getProgramOfficeHoursAppointments).toHaveBeenCalledWith("p1", {
      status: null,
      faculty: null,
      search: null,
      from: "2026-11-09",
      to: "2026-11-15",
      page: 0,
      size: 25,
    });
  });

  it("goes back to the first page when a filter changes, and leaves the week when asked", async () => {
    const { result } = renderHook(
      () => useProgramOfficeHoursAppointments("p1", friday),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => result.current.setPage(3));
    expect(result.current.filters.page).toBe(3);
    act(() => result.current.setStatus(OfficeHoursRequestStatus.Accepted));
    act(() => result.current.toggleThisWeek());
    act(() => result.current.setFaculty("Fen-Edebiyat Fakültesi"));
    act(() => result.current.setSearch("Ayşe"));

    expect(result.current.filters).toEqual({
      search: "Ayşe",
      status: OfficeHoursRequestStatus.Accepted,
      faculty: "Fen-Edebiyat Fakültesi",
      thisWeek: false,
      page: 1,
    });
    await waitFor(() =>
      expect(getProgramOfficeHoursAppointments).toHaveBeenLastCalledWith("p1", {
        status: OfficeHoursRequestStatus.Accepted,
        faculty: "Fen-Edebiyat Fakültesi",
        search: "Ayşe",
        from: null,
        to: null,
        page: 0,
        size: 25,
      }),
    );
  });
});
