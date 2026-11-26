import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamSupportPanel } from "@/components/iskur/team-support-panel";
import { IskurTeamSupportStatus } from "@/interfaces/iskur-team-support";
import { ClientApiError } from "@/lib/client/api";
import {
  answerIskurTeamSupport,
  getIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/client/iskur-team-support";
import {
  DIGITAL,
  iskurTeamSupport,
  iskurTeamSupports,
  SUPPORT_ID,
} from "@test/fixtures/iskur-team-support";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-team-support", () => ({
  getIskurTeamSupports: vi.fn(),
  getIskurTaskSupports: vi.fn(),
  openIskurTeamSupport: vi.fn(),
  answerIskurTeamSupport: vi.fn(),
}));

describe("IskurTeamSupportPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a leader ask another team for help (handbook p.18)", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTeamSupports).mockResolvedValue(iskurTeamSupports());
    vi.mocked(openIskurTeamSupport).mockResolvedValue(
      iskurTeamSupports({
        outgoing: [iskurTeamSupport({ taskId: null, taskTitle: null })],
      }),
    );
    renderWithQueryClient(<IskurTeamSupportPanel />);

    await user.click(
      await screen.findByRole("button", { name: "Destek talebi aç" }),
    );
    const send = screen.getByRole("button", { name: "Talebi aç" });
    expect(send).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Hangi ekipten?"), DIGITAL);
    await user.type(
      screen.getByLabelText("Ne lazım?"),
      " Etkinlik günü iki kişi ",
    );
    await user.click(send);

    expect(openIskurTeamSupport).toHaveBeenCalledWith({
      toTeamId: DIGITAL,
      taskId: null,
      need: "Etkinlik günü iki kişi",
    });
    const outgoing = screen.getByRole("region", {
      name: "Başka ekipten destek",
    });
    expect(
      await within(outgoing).findByText(/^Dijital Dönüşüm ekibine ·/),
    ).toBeInTheDocument();
    expect(within(outgoing).getByText("Yanıt bekliyor")).toBeInTheDocument();
  });

  it("answers what another team asked, with an optional note", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTeamSupports).mockResolvedValue(
      iskurTeamSupports({ incoming: [iskurTeamSupport({ canAnswer: true })] }),
    );
    vi.mocked(answerIskurTeamSupport).mockResolvedValue(
      iskurTeamSupports({
        incoming: [
          iskurTeamSupport({
            status: IskurTeamSupportStatus.Accepted,
            answerNote: "Perşembe",
          }),
        ],
      }),
    );
    renderWithQueryClient(<IskurTeamSupportPanel />);

    const incoming = await screen.findByRole("region", {
      name: "Ekibinden istenen destek",
    });
    expect(
      within(incoming).getByText("Görev: Afiş için 2 görsel öneri"),
    ).toBeInTheDocument();
    await user.click(
      within(incoming).getByRole("button", {
        name: "Medya ve Kreatif Üretim ekibinin talebini yanıtla",
      }),
    );
    await user.type(
      within(incoming).getByLabelText("Not (isteğe bağlı)"),
      "Perşembe",
    );
    await user.click(
      within(incoming).getByRole("button", { name: "Kabul et" }),
    );

    expect(answerIskurTeamSupport).toHaveBeenCalledWith(
      SUPPORT_ID,
      true,
      "Perşembe",
    );
    expect(
      await within(incoming).findByText("Kabul edildi"),
    ).toBeInTheDocument();
    expect(within(incoming).getByText("Not: Perşembe")).toBeInTheDocument();
  });

  it("says when the requests cannot be loaded, and shows nothing to a member", async () => {
    vi.mocked(getIskurTeamSupports).mockRejectedValue(new Error("down"));
    const { unmount } = renderWithQueryClient(<IskurTeamSupportPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Destek talepleri yüklenemedi.",
    );
    unmount();

    vi.mocked(getIskurTeamSupports).mockRejectedValue(
      new ClientApiError("x", 403),
    );
    renderWithQueryClient(<IskurTeamSupportPanel />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
