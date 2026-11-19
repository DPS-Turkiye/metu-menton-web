import { describe, expect, it } from "vitest";

import { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";
import {
  readEnumParam,
  readIsoDayParam,
  readUuidParam,
} from "@/lib/server/path-params";

describe("readUuidParam", () => {
  it("passes a uuid through unchanged", async () => {
    await expect(
      readUuidParam("00000000-0000-0000-0000-0000000000ab", "personIdInvalid"),
    ).resolves.toEqual({
      ok: true,
      id: "00000000-0000-0000-0000-0000000000ab",
    });
  });

  it("answers 400 INVALID_REQUEST with the given text for anything else", async () => {
    const result = await readUuidParam("..", "personIdInvalid");

    expect(result.ok).toBe(false);
    const response = result.ok ? null : result.response;
    expect(response?.status).toBe(400);
    expect(await response?.json()).toEqual({
      code: "INVALID_REQUEST",
      message: "Geçerli bir kişi seçin.",
      fields: [],
    });
  });
});

describe("readIsoDayParam", () => {
  it("passes a calendar day through unchanged", async () => {
    await expect(readIsoDayParam("2026-11-12")).resolves.toEqual({
      ok: true,
      day: "2026-11-12",
    });
  });

  it.each(["2026-02-30", "2026-13-01", "12.11.2026", "..", ""])(
    "answers 400 for %j, a day that cannot be",
    async (value) => {
      const result = await readIsoDayParam(value);

      expect(result.ok).toBe(false);
      const response = result.ok ? null : result.response;
      expect(response?.status).toBe(400);
      expect(await response?.json()).toEqual({
        code: "INVALID_REQUEST",
        message: "Geçerli bir tarih seçin.",
        fields: [],
      });
    },
  );
});

describe("readEnumParam", () => {
  it("passes a known value through as the enum member", async () => {
    expect(
      await readEnumParam("CV", IskurDocumentSlot, "invalidRequestFields"),
    ).toEqual({
      ok: true,
      value: IskurDocumentSlot.Cv,
    });
  });

  it("answers 400 for anything else, so it never reaches a backend path", async () => {
    for (const value of ["cv", "..", "CV/../x", ""]) {
      const result = await readEnumParam(
        value,
        IskurDocumentSlot,
        "invalidRequestFields",
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({
        code: "INVALID_REQUEST",
      });
    }
  });
});
