import { describe, expect, it } from "vitest";

import { badgePending, GateBadgeState } from "@/interfaces/badges";

const noTraining = { videoWatched: false, attempts: 0, bestScore: null };

describe("badgePending", () => {
  it("is an İŞKUR intern with no badge who has not started the training", () => {
    expect(
      badgePending({
        state: GateBadgeState.None,
        training: noTraining,
        iskurIntern: true,
      }),
    ).toBe(true);
  });

  it("is not someone with the badge, in training, or off the list", () => {
    expect(
      badgePending({
        state: GateBadgeState.Active,
        training: noTraining,
        iskurIntern: true,
      }),
    ).toBe(false);
    expect(
      badgePending({
        state: GateBadgeState.None,
        training: { videoWatched: true, attempts: 0, bestScore: null },
        iskurIntern: true,
      }),
    ).toBe(false);
    expect(
      badgePending({
        state: GateBadgeState.None,
        training: noTraining,
        iskurIntern: false,
      }),
    ).toBe(false);
  });
});
