import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeHoursGate } from "@/components/office-hours/office-hours-gate";
import { UserRole, type AppSession } from "@/interfaces/session";
import { renderWithQueryClient } from "@test/test-utils";

const sessionState = vi.hoisted(() => ({
  isLoading: false,
  session: null as AppSession | null,
}));

vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => sessionState,
}));

function signedIn(officeHoursOpen: boolean | undefined): AppSession {
  return {
    userId: "student-1",
    email: "ogrenci@metu.edu.tr",
    fullName: "Ayşe Yılmaz",
    jobTitle: "Öğrenci",
    role: UserRole.Mentee,
    ...(officeHoursOpen === undefined ? {} : { officeHoursOpen }),
  };
}

function Screen() {
  return <p>Akademisyenler</p>;
}

beforeEach(() => {
  sessionState.isLoading = false;
  sessionState.session = null;
});

describe("OfficeHoursGate", () => {
  it("shows the screen when Office Hours is open to the person", () => {
    sessionState.session = signedIn(true);
    renderWithQueryClient(
      <OfficeHoursGate>
        <Screen />
      </OfficeHoursGate>,
    );
    expect(screen.getByText("Akademisyenler")).toBeInTheDocument();
    expect(screen.queryByText("Office Hours çok yakında")).toBeNull();
  });

  it("shows the coming-soon message in its place while Office Hours is closed", () => {
    sessionState.session = signedIn(false);
    renderWithQueryClient(
      <OfficeHoursGate>
        <Screen />
      </OfficeHoursGate>,
    );
    expect(
      screen.getByRole("heading", { name: "Office Hours çok yakında" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sana hak ettiğin en iyi deneyimi sunabilmek için gece gündüz çalışıyoruz.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Akademisyenler")).toBeNull();
  });

  it("treats a session from before the switch as closed", () => {
    sessionState.session = signedIn(undefined);
    renderWithQueryClient(
      <OfficeHoursGate>
        <Screen />
      </OfficeHoursGate>,
    );
    expect(screen.getByText("Office Hours çok yakında")).toBeInTheDocument();
  });

  it("mounts nothing while the session loads, so no Office Hours call starts", () => {
    sessionState.isLoading = true;
    renderWithQueryClient(
      <OfficeHoursGate>
        <Screen />
      </OfficeHoursGate>,
    );
    expect(screen.queryByText("Akademisyenler")).toBeNull();
    expect(screen.queryByText("Office Hours çok yakında")).toBeNull();
  });
});
