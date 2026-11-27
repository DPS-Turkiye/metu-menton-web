import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurBadgePendingCard } from "@/components/iskur/iskur-badge-pending-card";
import { PeerMentorGateState } from "@/interfaces/peer-mentoring";
import { ClientApiError } from "@/lib/client/api";
import { getIskurTeamReveal } from "@/lib/client/iskur-onboarding";
import { PEER_MENTOR_GIVE_HREF } from "@/lib/peer-mentoring";
import { reveal } from "@test/fixtures/iskur-onboarding";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurTeamReveal: vi.fn(),
}));
const gate = { state: PeerMentorGateState.NoBadge, isLoading: false };
vi.mock("@/hooks/use-peer-mentor-give", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-peer-mentor-give")>()),
  usePeerMentorGate: () => ({
    state: gate.state,
    gateAward: null,
    expired: false,
    isLoading: gate.isLoading,
    sessionBehind: false,
  }),
}));

async function settle() {
  await vi.waitFor(() => expect(getIskurTeamReveal).toHaveBeenCalled());
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("IskurBadgePendingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gate.state = PeerMentorGateState.NoBadge;
    gate.isLoading = false;
    vi.mocked(getIskurTeamReveal).mockResolvedValue(reveal());
  });

  it("tells an İŞKUR intern without the badge it is optional, any time, with a way to Mentorluk Ver", async () => {
    renderWithQueryClient(<IskurBadgePendingCard />);

    expect(
      await screen.findByRole("heading", { name: "Akran mentoru rozeti" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rozet bekleniyor")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mentorluk Ver'e git" }),
    ).toHaveAttribute("href", PEER_MENTOR_GIVE_HREF);
  });

  it.each([
    ["a badge holder", PeerMentorGateState.Earned],
    ["someone whose badge was taken back", PeerMentorGateState.Revoked],
  ])("shows nothing to %s", async (_, state) => {
    gate.state = state;
    renderWithQueryClient(<IskurBadgePendingCard />);
    await settle();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows nothing to someone who is not an intern, or while the badge is loading", async () => {
    vi.mocked(getIskurTeamReveal).mockRejectedValue(
      new ClientApiError("yok", 404),
    );
    const first = renderWithQueryClient(<IskurBadgePendingCard />);
    await settle();
    expect(screen.queryByRole("heading")).toBeNull();
    first.unmount();

    vi.mocked(getIskurTeamReveal).mockResolvedValue(reveal());
    gate.isLoading = true;
    renderWithQueryClient(<IskurBadgePendingCard />);
    await settle();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
