import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { CATEGORY_ART } from "@/components/student/iskur-ui";
import { PEER_TOPIC_CATEGORIES } from "@/interfaces/peer-mentoring";

const PUBLIC = path.resolve(import.meta.dirname, "../../../public");
const SHOWN = 63;

/** A PNG's width and height, from its IHDR chunk. */
function pngSize(file: string) {
  const png = readFileSync(path.join(PUBLIC, file));
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("CATEGORY_ART", () => {
  it.each(PEER_TOPIC_CATEGORIES)(
    "gives %s a 192 px sticker shown 63 px on its long side, in proportion",
    (category) => {
      const art = CATEGORY_ART[category];
      const file = pngSize(art.src);
      expect(Math.max(file.width, file.height)).toBe(192);
      expect(Math.max(art.width, art.height)).toBe(SHOWN);
      const shownShort = Math.min(art.width, art.height);
      const expected =
        (SHOWN * Math.min(file.width, file.height)) /
        Math.max(file.width, file.height);
      expect(Math.abs(shownShort - expected)).toBeLessThanOrEqual(1);
      expect(art.width >= art.height).toBe(file.width >= file.height);
    },
  );
});
