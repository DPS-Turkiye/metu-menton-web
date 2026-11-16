import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminProgramSettingsPage from "@/app/admin/programs/[id]/settings/page";

// The program header is edition-aware; these screens are checked in the Teknokent edition.
vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Teknokent };
});

vi.mock("@/components/coordinator/program-settings-view", () => ({
  ProgramSettingsView: ({ programId }: { programId: string }) => (
    <p>ProgramSettingsView {programId}</p>
  ),
}));

describe("admin Program Ayarları route", () => {
  it("opens the shared Program Ayarları screen for the program in the URL", async () => {
    render(
      await AdminProgramSettingsPage({
        params: Promise.resolve({ id: "program-1" }),
      }),
    );
    expect(
      screen.getByText("ProgramSettingsView program-1"),
    ).toBeInTheDocument();
  });
});
