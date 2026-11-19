import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminProgramsPage from "@/app/admin/programs/page";
import { useEdition } from "@/hooks/use-edition";
import { Edition } from "@/interfaces/edition";

vi.mock("@/hooks/use-edition", () => ({ useEdition: vi.fn() }));
vi.mock("@/components/admin/odtu-programs-view", () => ({
  OdtuProgramsView: () => <p>ODTÜ programları</p>,
}));
vi.mock("@/components/admin/programs-view", () => ({
  ProgramsView: () => <p>Teknokent programları</p>,
}));

describe("admin Programlar page", () => {
  it("shows the ODTÜ screen in the ODTÜ edition", () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Odtu);
    render(<AdminProgramsPage />);
    expect(screen.getByText("ODTÜ programları")).toBeInTheDocument();
  });

  it("keeps Teknokent's screen as it is", () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Teknokent);
    render(<AdminProgramsPage />);
    expect(screen.getByText("Teknokent programları")).toBeInTheDocument();
  });
});
