import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminProgramApprovalsPage from "@/app/admin/programs/[id]/approvals/page";

// The program header is edition-aware; these screens are checked in the Teknokent edition.
vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Teknokent };
});

vi.mock("@/components/coordinator/program-approvals-view", () => ({
  ProgramApprovalsView: ({ programId }: { programId: string }) => (
    <p>ProgramApprovalsView {programId}</p>
  ),
}));

describe("admin Onaylar route", () => {
  it("opens the shared Onaylar screen for the program in the URL", async () => {
    render(
      await AdminProgramApprovalsPage({
        params: Promise.resolve({ id: "program-1" }),
      }),
    );
    expect(
      screen.getByText("ProgramApprovalsView program-1"),
    ).toBeInTheDocument();
  });
});
