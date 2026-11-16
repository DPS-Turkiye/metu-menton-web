import { afterEach, describe, expect, it, vi } from "vitest";

import { APP_URL } from "@/lib/const";
import { appOrigins, refuseCrossSite } from "@/lib/server/same-origin";

const APP_ORIGIN = new URL(APP_URL).origin;

function write(headers: Record<string, string>) {
  return new Request(`${APP_URL}/api/office-hours/availability`, {
    method: "PUT",
    headers,
  });
}

describe("refuseCrossSite", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lets a write from the app's own origin through", () => {
    expect(refuseCrossSite(write({ origin: APP_ORIGIN }))).toBeNull();
  });

  it("lets our page's call through when Moodle shows it in a frame, since the page is still our origin", () => {
    expect(
      refuseCrossSite(
        write({
          origin: APP_ORIGIN,
          "sec-fetch-site": "same-origin",
          "sec-fetch-dest": "empty",
          cookie: "menton_office_hours=sealed",
        }),
      ),
    ).toBeNull();
  });

  it("refuses another site's write, one with no origin and one with a null origin", async () => {
    for (const headers of [
      { origin: "https://attacker.example" },
      { origin: "https://odtuclass.metu.edu.tr" },
      {},
      { origin: "null" },
    ]) {
      const refused = refuseCrossSite(write(headers));
      expect(refused?.status).toBe(403);
      expect(await refused?.json()).toEqual({ code: "CROSS_SITE_REFUSED" });
    }
  });

  it("also accepts the origins a deployment lists in APP_ALLOWED_ORIGINS", () => {
    vi.stubEnv(
      "APP_ALLOWED_ORIGINS",
      " https://www.menton.example/ , https://menton.example",
    );

    expect([...appOrigins()]).toEqual([
      APP_ORIGIN,
      "https://www.menton.example",
      "https://menton.example",
    ]);
    expect(
      refuseCrossSite(write({ origin: "https://www.menton.example" })),
    ).toBeNull();
  });

  it("fails loudly on a malformed listed origin instead of guessing", () => {
    vi.stubEnv("APP_ALLOWED_ORIGINS", "not a url");

    expect(() => appOrigins()).toThrow();
  });
});
