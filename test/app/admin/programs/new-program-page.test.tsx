import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminNewProgramPage from "@/app/admin/programs/new/page";
import { useEdition } from "@/hooks/use-edition";
import { Edition } from "@/interfaces/edition";

vi.mock("@/hooks/use-edition", () => ({ useEdition: vi.fn() }));
vi.mock("@/components/admin/odtu-program-wizard-view", () => ({
  OdtuProgramWizardView: () => <p>ODTÜ sihirbazı</p>,
}));
vi.mock("@/components/admin/program-wizard-view", () => ({
  ProgramWizardView: () => <p>Teknokent sihirbazı</p>,
}));

describe("admin Yeni Program page", () => {
  it("shows the ODTÜ wizard in the ODTÜ edition", () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Odtu);
    render(<AdminNewProgramPage />);
    expect(screen.getByText("ODTÜ sihirbazı")).toBeInTheDocument();
  });

  it("keeps Teknokent's wizard as it is", () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Teknokent);
    render(<AdminNewProgramPage />);
    expect(screen.getByText("Teknokent sihirbazı")).toBeInTheDocument();
  });
});
