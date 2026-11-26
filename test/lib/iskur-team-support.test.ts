import { describe, expect, it } from "vitest";

import {
  answerNote,
  ISKUR_TEAM_SUPPORT_TEXT_MAX,
  teamSupportInput,
} from "@/lib/iskur-team-support";

describe("İŞKUR team support requests", () => {
  it("sends the open form only with a team and a need that fits", () => {
    expect(
      teamSupportInput(
        { toTeamId: "t2", need: "  Görsel desteği  " },
        "task-1",
      ),
    ).toEqual({ toTeamId: "t2", taskId: "task-1", need: "Görsel desteği" });
    expect(teamSupportInput({ toTeamId: "t2", need: "x" }, null)).toEqual({
      toTeamId: "t2",
      taskId: null,
      need: "x",
    });
    expect(teamSupportInput({ toTeamId: "", need: "x" }, null)).toBeNull();
    expect(teamSupportInput({ toTeamId: "t2", need: "   " }, null)).toBeNull();
    expect(
      teamSupportInput(
        { toTeamId: "t2", need: "a".repeat(ISKUR_TEAM_SUPPORT_TEXT_MAX + 1) },
        null,
      ),
    ).toBeNull();
  });

  it("sends a blank answer note as none, and refuses a note that is too long", () => {
    expect(answerNote("  Perşembe  ")).toBe("Perşembe");
    expect(answerNote("   ")).toBeNull();
    expect(answerNote("a".repeat(ISKUR_TEAM_SUPPORT_TEXT_MAX + 1))).toBe(
      undefined,
    );
  });
});
