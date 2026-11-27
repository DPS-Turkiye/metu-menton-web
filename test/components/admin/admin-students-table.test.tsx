import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminStudentsTable } from "@/components/admin/admin-students-table";
import { GateBadgeState } from "@/interfaces/badges";
import { getAdminStudents } from "@/lib/client/badges";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/badges", () => ({ getAdminStudents: vi.fn() }));

describe("AdminStudentsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminStudents).mockResolvedValue([
      {
        userId: "u1",
        fullName: "Zeynep Öğrenci",
        email: "zeynep@odtu-dev.invalid",
        programId: "p1",
        programName: "İŞKUR 2026 Bahar",
        state: GateBadgeState.Active,
        awardId: "a1",
        source: null,
        awardedAt: "2026-11-08T10:00:00Z",
        revokedAt: null,
        reason: null,
        training: { videoWatched: false, attempts: 0, bestScore: null },
        profile: null,
        prism: null,
        iskurIntern: false,
        student: true,
      },
      {
        userId: "u2",
        fullName: "Mehmet Eğitimde",
        email: "mehmet@odtu-dev.invalid",
        programId: "p1",
        programName: "İŞKUR 2026 Bahar",
        state: GateBadgeState.None,
        awardId: null,
        source: null,
        awardedAt: null,
        revokedAt: null,
        reason: null,
        training: { videoWatched: true, attempts: 1, bestScore: 5 },
        profile: null,
        prism: null,
        iskurIntern: false,
        student: true,
      },
    ]);
  });

  it("filters by badge state and links each student to their program's list", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AdminStudentsTable />);

    expect(await screen.findByText("Zeynep Öğrenci")).toBeInTheDocument();
    expect(getAdminStudents).toHaveBeenCalledWith(null);
    expect(
      screen.getAllByRole("link", { name: "İŞKUR 2026 Bahar" })[0],
    ).toHaveAttribute("href", "/admin/programs/p1/students");

    const badge = screen.getByRole("combobox", { name: "Rozet durumu" });
    expect(badge).toHaveDisplayValue("Rozet durumu: Tümü");
    await user.selectOptions(badge, "Akran mentoru");
    await waitFor(() =>
      expect(getAdminStudents).toHaveBeenCalledWith(GateBadgeState.Active),
    );
    expect(badge).toHaveDisplayValue("Akran mentoru");
  });

  it("shows the badge as the design's tag and the e-mail under the name", async () => {
    renderWithQueryClient(<AdminStudentsTable />);

    const zeynep = await screen.findByRole("row", { name: /Zeynep Öğrenci/ });
    expect(within(zeynep).getByText("Rozet Doğrulandı")).toBeInTheDocument();
    expect(
      within(zeynep).getByText("zeynep@odtu-dev.invalid"),
    ).toBeInTheDocument();
    const mehmet = screen.getByRole("row", { name: /Mehmet Eğitimde/ });
    expect(within(mehmet).getByText("Eğitimde")).toBeInTheDocument();
  });

  it("searches by name, e-mail or program and says when nothing matches", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AdminStudentsTable />);
    await screen.findByText("Zeynep Öğrenci");

    const search = screen.getByRole("searchbox", { name: "Öğrenci ara" });
    await user.type(search, "MEHMET@");
    expect(screen.queryByText("Zeynep Öğrenci")).not.toBeInTheDocument();
    expect(screen.getByText("Mehmet Eğitimde")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "bahar");
    expect(screen.getByText("Zeynep Öğrenci")).toBeInTheDocument();
    expect(screen.getByText("Mehmet Eğitimde")).toBeInTheDocument();

    await user.type(search, "zzz");
    expect(screen.getByText("Bu filtrede öğrenci yok.")).toBeInTheDocument();
  });

  it("shows its own error text when the list cannot load", async () => {
    vi.mocked(getAdminStudents).mockRejectedValue("network down");
    renderWithQueryClient(<AdminStudentsTable />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Öğrenciler yüklenemedi.",
    );
  });

  it("narrows Rozet yok to those in training", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AdminStudentsTable />);
    await screen.findByText("Mehmet Eğitimde");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Rozet durumu" }),
      "Eğitimde",
    );

    await waitFor(() =>
      expect(getAdminStudents).toHaveBeenLastCalledWith(GateBadgeState.None),
    );
    await waitFor(() =>
      expect(screen.queryByText("Zeynep Öğrenci")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Mehmet Eğitimde")).toBeInTheDocument();
  });
});
