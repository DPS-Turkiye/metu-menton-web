import { describe, expect, it } from "vitest";

import {
  GateBadgeState,
  PRISM_DECISION_MAX_ENTRIES,
  PrismDecision,
} from "@/interfaces/badges";
import {
  canSendPrismList,
  parsePrismList,
  prismRowStatus,
} from "@/lib/prism-decisions";
import { PrismRowStatus } from "@/types/peer-participants";

describe("parsePrismList", () => {
  it("reads one person per line with an optional score, from text or a spreadsheet", () => {
    const parsed = parsePrismList(
      [
        "ali@example.test",
        "Ayşe Yılmaz\tayse@example.test\t86",
        "  veli@example.test, 8/10 ",
        "can@example.test 92",
        "",
        "ad soyad; eposta; puan",
      ].join("\n"),
    );

    expect(parsed.entries).toEqual([
      { email: "ali@example.test", score: null },
      { email: "ayse@example.test", score: "86" },
      { email: "veli@example.test", score: "8/10" },
      { email: "can@example.test", score: "92" },
    ]);
    expect(parsed.rejectedLines).toEqual(["ad soyad; eposta; puan"]);
  });

  it("counts each address once, ignoring case, and keeps the first score", () => {
    expect(
      parsePrismList("Ali@Example.test, 40\r\nali@example.test, 90").entries,
    ).toEqual([{ email: "ali@example.test", score: "40" }]);
  });

  it("takes several addresses on one line without a score", () => {
    expect(
      parsePrismList("a@example.test, b@example.test, 70").entries,
    ).toEqual([
      { email: "a@example.test", score: null },
      { email: "b@example.test", score: null },
    ]);
  });

  it("rejects a line with a broken address or a score longer than the backend keeps", () => {
    const parsed = parsePrismList(
      `kırık@adres\nali@example.test, ${"9".repeat(33)}`,
    );
    expect(parsed.entries).toEqual([]);
    expect(parsed.rejectedLines).toHaveLength(2);
  });
});

describe("canSendPrismList", () => {
  it("needs at least one address and no more than the backend takes at once", () => {
    expect(canSendPrismList(parsePrismList(""))).toBe(false);
    expect(canSendPrismList(parsePrismList("a@example.test"))).toBe(true);
    const many = Array.from(
      { length: PRISM_DECISION_MAX_ENTRIES + 1 },
      (_, index) => `kisi${index}@example.test`,
    ).join("\n");
    expect(canSendPrismList(parsePrismList(many))).toBe(false);
  });
});

describe("prismRowStatus", () => {
  const prism = {
    completedAt: null,
    decision: null,
    decidedAt: null,
    score: null,
  };

  it("is waiting once the student says they finished after the last decision", () => {
    expect(
      prismRowStatus({
        state: GateBadgeState.None,
        prism: { ...prism, completedAt: "2026-11-20T09:00:00Z" },
      }),
    ).toBe(PrismRowStatus.Pending);
    expect(
      prismRowStatus({
        state: GateBadgeState.None,
        prism: {
          ...prism,
          completedAt: "2026-11-20T10:00:00Z",
          decision: PrismDecision.Retake,
          decidedAt: "2026-11-20T09:00:00Z",
        },
      }),
    ).toBe(PrismRowStatus.Pending);
  });

  it("is retaking after a retake decision, and nothing for a holder or without a record", () => {
    const retake = {
      ...prism,
      completedAt: "2026-11-20T08:00:00Z",
      decision: PrismDecision.Retake,
      decidedAt: "2026-11-20T09:00:00Z",
    };
    expect(prismRowStatus({ state: GateBadgeState.None, prism: retake })).toBe(
      PrismRowStatus.Retake,
    );
    expect(
      prismRowStatus({ state: GateBadgeState.Active, prism: retake }),
    ).toBeNull();
    expect(
      prismRowStatus({ state: GateBadgeState.None, prism: null }),
    ).toBeNull();
    expect(
      prismRowStatus({
        state: GateBadgeState.Revoked,
        prism: {
          ...prism,
          decision: PrismDecision.Approved,
          decidedAt: "2026-11-20T09:00:00Z",
        },
      }),
    ).toBeNull();
  });
});
