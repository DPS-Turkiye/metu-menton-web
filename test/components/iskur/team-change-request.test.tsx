import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamChangeRequest } from "@/components/iskur/team-change-request";
import { IskurTeamChangeStatus } from "@/interfaces/iskur-team-change";
import { ClientApiError } from "@/lib/client/api";
import {
  askIskurTeamChange,
  getMyIskurTeamChange,
} from "@/lib/client/iskur-team-change";
import { iskurTeamChange } from "@test/fixtures/iskur-team-change";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-team-change", () => ({
  getMyIskurTeamChange: vi.fn(),
  askIskurTeamChange: vi.fn(),
}));

const PROGRAM = "p1";

describe("IskurTeamChangeRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets an intern in the trial send a short reason (handbook p.18)", async () => {
    const user = userEvent.setup();
    vi.mocked(getMyIskurTeamChange).mockResolvedValue({
      programId: PROGRAM,
      canAsk: true,
      latest: null,
    });
    vi.mocked(askIskurTeamChange).mockResolvedValue({
      programId: PROGRAM,
      canAsk: false,
      latest: iskurTeamChange(),
    });
    renderWithQueryClient(<IskurTeamChangeRequest />);

    expect(
      await screen.findByText(/Ekip değiştirmek istersen 4\. haftada belirt/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ekip değişikliği iste" }),
    );
    const send = screen.getByRole("button", { name: "Talebi gönder" });
    expect(send).toBeDisabled();
    await user.type(
      screen.getByLabelText("Neden ekip değiştirmek istiyorsun?"),
      "  Dijital ekip bana daha uygun.  ",
    );
    await user.click(send);

    expect(askIskurTeamChange).toHaveBeenCalledWith(
      "Dijital ekip bana daha uygun.",
    );
    expect(
      await screen.findByText(/^Talebin koordinatörüne iletildi ·/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ekip değişikliği iste" }),
    ).toBeNull();
  });

  it("shows the coordinator's answer: a decline with its note, or the new team", async () => {
    vi.mocked(getMyIskurTeamChange).mockResolvedValue({
      programId: PROGRAM,
      canAsk: true,
      latest: iskurTeamChange({
        status: IskurTeamChangeStatus.Declined,
        decisionNote: "Medya ekibinin sana ihtiyacı var.",
      }),
    });
    const { unmount } = renderWithQueryClient(<IskurTeamChangeRequest />);
    expect(
      await screen.findByText("Koordinatörün ekibini değiştirmedi"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Koordinatörünün notu: Medya ekibinin sana ihtiyacı var.",
      ),
    ).toBeInTheDocument();
    unmount();

    vi.mocked(getMyIskurTeamChange).mockResolvedValue({
      programId: PROGRAM,
      canAsk: false,
      latest: iskurTeamChange({
        status: IskurTeamChangeStatus.Moved,
        currentTeamName: "Dijital Dönüşüm ve Teknoloji",
      }),
    });
    renderWithQueryClient(<IskurTeamChangeRequest />);
    expect(
      await screen.findByText(
        "Koordinatörün talebini kabul etti; yeni ekibin Dijital Dönüşüm ve Teknoloji.",
      ),
    ).toBeInTheDocument();
  });

  it("stays away once the team is final with nothing asked, and for someone who is not an intern", async () => {
    vi.mocked(getMyIskurTeamChange).mockResolvedValue({
      programId: PROGRAM,
      canAsk: false,
      latest: null,
    });
    const { unmount } = renderWithQueryClient(<IskurTeamChangeRequest />);
    await vi.waitFor(() => expect(getMyIskurTeamChange).toHaveBeenCalled());
    expect(
      screen.queryByRole("region", { name: "Ekip değişikliği" }),
    ).toBeNull();
    unmount();

    vi.mocked(getMyIskurTeamChange).mockRejectedValue(
      new ClientApiError("x", 404),
    );
    renderWithQueryClient(<IskurTeamChangeRequest />);
    await vi.waitFor(() =>
      expect(getMyIskurTeamChange).toHaveBeenCalledTimes(2),
    );
    expect(
      screen.queryByRole("region", { name: "Ekip değişikliği" }),
    ).toBeNull();
  });
});
