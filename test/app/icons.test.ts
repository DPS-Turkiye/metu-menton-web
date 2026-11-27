import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");
const HOCAM_RED = "#D0112B";

function file(relative: string) {
  return readFileSync(path.join(ROOT, relative));
}

/** A PNG's width and height, from its IHDR chunk. */
function pngSize(png: Buffer) {
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

describe("app icons", () => {
  it("draws the tab icon as hocam's red square with a white h", () => {
    const svg = file("src/app/icon.svg").toString("utf8");
    expect(svg).toContain(`fill="${HOCAM_RED}"`);
    expect(svg).toContain('aria-label="hocam"');
    expect(svg).not.toContain("menton");
  });

  it("packs the favicon at 16, 32 and 48 pixels", () => {
    const ico = file("src/app/favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, index) => {
      const entry = 6 + 16 * index;
      const image = ico.subarray(
        ico.readUInt32LE(entry + 12),
        ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8),
      );
      return pngSize(image)[0];
    });
    expect(sizes).toEqual([16, 32, 48]);
  });

  it("gives iOS a 180 px icon and the manifest 192 and 512 px ones", () => {
    expect(pngSize(file("src/app/apple-icon.png"))).toEqual([180, 180]);
    expect(pngSize(file("public/icons/icon-192.png"))).toEqual([192, 192]);
    expect(pngSize(file("public/icons/icon-512.png"))).toEqual([512, 512]);
  });
});
