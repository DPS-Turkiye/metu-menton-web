import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProgramOfficeHoursAppointments } from "@/hooks/use-program-office-hours-appointments";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import { ProgramType } from "@/interfaces/program";
import { getCoordinatorProgram } from "@/lib/client/coordinator-programs";
import { getProgramOfficeHoursAppointments } from "@/lib/client/program-office-hours";
import {
  coordinatorProgram,
  coordinatorProgramDetail,
} from "@test/fixtures/coordinator-programs";
import { programAppointments } from "@test/fixtures/program-office-hours";
import { createTestQueryClient, InLocale } from "@test/test-utils";

vi.mock("@/lib/client/program-office-hours", () => ({
  getProgramOfficeHoursAppointments: vi.fn(),
}));
vi.mock("@/lib/client/coordinator-programs", () => ({
  getCoordinatorProgram: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <InLocale locale="tr">{children}</InLocale>
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
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      coordinatorProgramDetail({
        program: coordinatorProgram({ type: ProgramType.OfficeHours }),
      }),
    );
  });

  it("asks nothing for a program that is not Office Hours", async () => {
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      coordinatorProgramDetail({
        program: coordinatorProgram({ type: ProgramType.PeerMentoring }),
      }),
    );
    renderHook(() => useProgramOfficeHoursAppointments("p1", friday), {
      wrapper,
    });

    await waitFor(() => expect(getCoordinatorProgram).toHaveBeenCalled());
    expect(getProgramOfficeHoursAppointments).not.toHaveBeenCalled();
  });

  it("offers every filterable status and the faculties the backend lists", async () => {
    const { result } = renderHook(
      () => useProgramOfficeHoursAppointments("p1", friday),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.facultyOptions).toHaveLength(3));
    expect(result.current.statusOptions.map((option) => option.label)).toEqual([
      "Durum: Tümü",
      "Durum: Onay Bekliyor",
      "Durum: Bilgi İstendi",
      "Durum: Alternatif Saat Önerildi",
      "Durum: Onaylandı",
      "Durum: Reddedildi",
      "Durum: Geri Çekildi",
    ]);
    expect(result.current.facultyOptions[1]).toEqual({
      value: "Mühendislik Fakültesi",
      label: "Mühendislik Fakültesi",
    });
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
