import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamChangesCard } from "@/components/coordinator/iskur-team-changes-card";
import { IskurTeamChangeStatus } from "@/interfaces/iskur-team-change";
import {
  declineIskurTeamChange,
  getIskurTeamChanges,
} from "@/lib/client/iskur-team-change";
import {
  iskurTeamChange,
  TEAM_CHANGE_ID,
} from "@test/fixtures/iskur-team-change";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-team-change", () => ({
  getIskurTeamChanges: vi.fn(),
  declineIskurTeamChange: vi.fn(),
}));

const answered = iskurTeamChange({
  id: "answered",
  fullName: "Ceren Su",
  status: IskurTeamChangeStatus.Moved,
  currentTeamName: "Dijital Dönüşüm ve Teknoloji",
});

describe("IskurTeamChangesCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists waiting requests to move or decline with a note, and keeps the answered ones folded", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    vi.mocked(getIskurTeamChanges).mockResolvedValue({
      programId: "p1",
      requests: [iskurTeamChange(), answered],
    });
    vi.mocked(declineIskurTeamChange).mockResolvedValue({
      programId: "p1",
      requests: [
        iskurTeamChange({
          status: IskurTeamChangeStatus.Declined,
          decisionNote: "Kalsın",
        }),
        answered,
      ],
    });
    renderWithQueryClient(
      <IskurTeamChangesCard programId="p1" onMove={onMove} />,
    );

    const card = await screen.findByRole("region", {
      name: "Ekip değişikliği talepleri",
    });
    expect(
      within(card).getByText(/^Medya ve Kreatif Üretim ekibinden ·/),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Yanıtlanan talepler (1)"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/Taşındı · Dijital Dönüşüm ve Teknoloji/),
    ).toBeInTheDocument();

    await user.click(
      within(card).getByRole("button", { name: "Ayşe Yıldız kişisini taşı" }),
    );
    expect(onMove).toHaveBeenCalledWith("u-ayse");

    await user.click(
      within(card).getByRole("button", {
        name: "Ayşe Yıldız kişisinin talebini reddet",
      }),
    );
    const confirm = within(card).getByRole("button", {
      name: "Reddet ve bildir",
    });
    expect(confirm).toBeDisabled();
    await user.type(within(card).getByLabelText("Öğrenciye not"), " Kalsın ");
    await user.click(confirm);
    expect(declineIskurTeamChange).toHaveBeenCalledWith(
      "p1",
      TEAM_CHANGE_ID,
      "Kalsın",
    );
    expect(
      await within(card).findByText("Yanıt bekleyen talep yok."),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Yanıtlanan talepler (2)"),
    ).toBeInTheDocument();
  });

  it("says when the requests cannot be loaded", async () => {
    vi.mocked(getIskurTeamChanges).mockRejectedValue(new Error("down"));
    renderWithQueryClient(
      <IskurTeamChangesCard programId="p1" onMove={vi.fn()} />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ekip değişikliği talepleri yüklenemedi.",
    );
  });
});
