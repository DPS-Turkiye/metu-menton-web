import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurFormCard } from "@/components/iskur/iskur-form-card";
import { ClientApiError } from "@/lib/client/api";
import { getIskurTeamReveal } from "@/lib/client/iskur-onboarding";
import { ISKUR_ONBOARDING_HREF } from "@/lib/iskur-onboarding";
import { reveal } from "@test/fixtures/iskur-onboarding";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurTeamReveal: vi.fn(),
}));

describe("IskurFormCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("leads an intern waiting for a team back to their form", async () => {
    vi.mocked(getIskurTeamReveal).mockResolvedValue(
      reveal({ placement: null }),
    );
    renderWithQueryClient(<IskurFormCard />);
    expect(
      await screen.findByRole("link", { name: "Formumu görüntüle" }),
    ).toHaveAttribute("href", ISKUR_ONBOARDING_HREF);
  });

  it.each([
    ["a placed intern", () => Promise.resolve(reveal())],
    [
      "an intern who has not sent the form",
      () =>
        Promise.resolve(
          reveal({ placement: null, onboardingSubmitted: false }),
        ),
    ],
    [
      "someone who is not an intern",
      () => Promise.reject(new ClientApiError("yok", 404)),
    ],
  ])("shows nothing to %s", async (_, answer) => {
    vi.mocked(getIskurTeamReveal).mockImplementation(answer);
    renderWithQueryClient(<IskurFormCard />);
    await vi.waitFor(() => expect(getIskurTeamReveal).toHaveBeenCalled());
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
