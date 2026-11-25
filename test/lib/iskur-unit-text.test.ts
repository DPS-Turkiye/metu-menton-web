import { describe, expect, it } from "vitest";

import { iskurUnitText, IskurUnitText } from "@/lib/iskur-onboarding";

describe("iskurUnitText", () => {
  it("knows the default structure's units, and nothing about a renamed one", () => {
    expect(iskurUnitText("Kreatif ve Dijital Üretim")).toBe(
      IskurUnitText.Creative,
    );
    expect(iskurUnitText(" Etki ve Organizasyon ")).toBe(IskurUnitText.Impact);
    expect(iskurUnitText("Yeni birim")).toBeNull();
  });
});
