import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CoordinatorProgramsPage from "@/app/coordinator/programs/page";
import { useEdition } from "@/hooks/use-edition";
import { Edition } from "@/interfaces/edition";

vi.mock("@/hooks/use-edition", () => ({ useEdition: vi.fn() }));
vi.mock("@/components/coordinator/odtu-programs-list-view", () => ({
  OdtuProgramsListView: () => <p>ODTÜ Programlarım</p>,
}));
vi.mock("@/components/coordinator/programs-list-view", () => ({
  ProgramsListView: () => <p>Teknokent Programlarım</p>,
}));

describe("coordinator Programlarım page", () => {
  it("shows the ODTÜ screen in the ODTÜ edition", () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Odtu);
    render(<CoordinatorProgramsPage />);
    expect(screen.getByText("ODTÜ Programlarım")).toBeInTheDocument();
  });

  it("keeps Teknokent's screen as it is", () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Teknokent);
    render(<CoordinatorProgramsPage />);
    expect(screen.getByText("Teknokent Programlarım")).toBeInTheDocument();
  });
});
