import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamReveal } from "@/components/iskur/team-reveal";
import {
  IskurPlacementStatus,
  IskurTeamRole,
} from "@/interfaces/iskur-workspace";
import { ClientApiError } from "@/lib/client/api";
import { getIskurTeamReveal } from "@/lib/client/iskur-onboarding";
import { ISKUR_MESSAGES_HREF } from "@/lib/iskur-channels";
import { ISKUR_ONBOARDING_HREF } from "@/lib/iskur-onboarding";
import { reveal } from "@test/fixtures/iskur-onboarding";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurTeamReveal: vi.fn(),
}));
vi.mock("@/components/iskur/team-change-request", () => ({
  IskurTeamChangeRequest: () => null,
}));

function placed() {
  const base = reveal();
  const placement = base.placement;
  if (!placement) throw new Error("fixture has no placement");
  return { base, placement };
}

describe("IskurTeamReveal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the provisional team with its leaders, sub-groups and who to ask (Figma 05)", async () => {
    vi.mocked(getIskurTeamReveal).mockResolvedValue(reveal());
    renderWithQueryClient(<IskurTeamReveal />);
    expect(
      await screen.findByRole("heading", {
        name: "Ekibin belli oldu: Medya ve Kreatif Üretim",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Geçici atama · Deneme 1/4. hafta"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kreatif ve Dijital Üretim birimi"),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Lideriniz Zeynep Kaya\./)).toBeInTheDocument();
    expect(screen.getByText("Ekibin · 4 kişi")).toBeInTheDocument();
    expect(
      screen.getByText("Ekip günleri: Salı, Perşembe ortak"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ekip lideri · 1 üye")).toHaveLength(2);
    expect(screen.getByText("Mert Demir (sen)")).toBeInTheDocument();
    expect(screen.getByText("Ekip liderin · Zeynep Kaya")).toBeInTheDocument();
    expect(
      screen.getByText("Birim koordinatörün · Selin Er"),
    ).toBeInTheDocument();
    // Handbook p.04: the channels open with the provisional placement, not only once it is final.
    expect(screen.getByText("Kanalların açıldı.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mesajlara git" })).toHaveAttribute(
      "href",
      ISKUR_MESSAGES_HREF,
    );
  });

  it("speaks to a leader and to a final placement without a unit coordinator", async () => {
    const { base, placement } = placed();
    vi.mocked(getIskurTeamReveal).mockResolvedValue({
      ...base,
      placement: {
        ...placement,
        status: IskurPlacementStatus.Final,
        trialWeek: null,
        myRole: IskurTeamRole.Leader,
        myLeader: null,
        unit: { ...placement.unit, coordinator: null },
        commonDays: [],
      },
    });
    renderWithQueryClient(<IskurTeamReveal />);
    expect(await screen.findByText("Kesin atama")).toBeInTheDocument();
    expect(screen.getByText("Ekibin ve rolün kesinleşti.")).toBeInTheDocument();
    expect(
      screen.getAllByText("Liderin belli olunca burada görünür"),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Birim koordinatörü belli olunca burada görünür"),
    ).toHaveLength(2);
    expect(screen.queryByText(/Ekip günleri/)).toBeNull();
    expect(screen.getByText("Kanalların açıldı.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mesajlara git" })).toHaveAttribute(
      "href",
      ISKUR_MESSAGES_HREF,
    );
  });

  it("waits for placement, reminds an intern who has not sent the form, and stays away from others", async () => {
    vi.mocked(getIskurTeamReveal).mockResolvedValue(
      reveal({ placement: null }),
    );
    const { unmount } = renderWithQueryClient(<IskurTeamReveal />);
    expect(
      await screen.findByText("Yerleştirme bekleniyor"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Formumu görüntüle" }),
    ).toHaveAttribute("href", ISKUR_ONBOARDING_HREF);
    unmount();

    vi.mocked(getIskurTeamReveal).mockResolvedValue(
      reveal({ placement: null, onboardingSubmitted: false }),
    );
    const second = renderWithQueryClient(<IskurTeamReveal />);
    expect(
      await screen.findByRole("link", { name: "Forma devam et" }),
    ).toHaveAttribute("href", ISKUR_ONBOARDING_HREF);
    second.unmount();

    vi.mocked(getIskurTeamReveal).mockRejectedValue(
      new ClientApiError("yok", 404),
    );
    renderWithQueryClient(<IskurTeamReveal />);
    await vi.waitFor(() => expect(getIskurTeamReveal).toHaveBeenCalled());
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText(/Yerleştirme/)).toBeNull();
  });
});
