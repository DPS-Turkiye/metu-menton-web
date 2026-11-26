import { describe, expect, it } from "vitest";

import { IskurTeamChangeStatus } from "@/interfaces/iskur-team-change";
import {
  ISKUR_TEAM_CHANGE_TEXT_MAX,
  isPending,
  isSendableText,
  splitTeamChanges,
} from "@/lib/iskur-team-change";
import { iskurTeamChange } from "@test/fixtures/iskur-team-change";

describe("İŞKUR team change requests", () => {
  it("sends a reason or note only when it has words and fits the backend's limit", () => {
    expect(isSendableText("  Dijital ekibe geçmek istiyorum  ")).toBe(true);
    expect(isSendableText("   ")).toBe(false);
    expect(isSendableText("a".repeat(ISKUR_TEAM_CHANGE_TEXT_MAX))).toBe(true);
    expect(isSendableText("a".repeat(ISKUR_TEAM_CHANGE_TEXT_MAX + 1))).toBe(
      false,
    );
  });

  it("splits the coordinator's list into waiting and answered requests", () => {
    const waiting = iskurTeamChange({ id: "w" });
    const moved = iskurTeamChange({
      id: "m",
      status: IskurTeamChangeStatus.Moved,
    });
    const declined = iskurTeamChange({
      id: "d",
      status: IskurTeamChangeStatus.Declined,
    });
    expect(splitTeamChanges([moved, waiting, declined])).toEqual({
      waiting: [waiting],
      answered: [moved, declined],
    });
    expect(isPending(waiting)).toBe(true);
    expect(isPending(moved)).toBe(false);
  });
});
