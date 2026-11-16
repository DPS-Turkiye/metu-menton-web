import { describe, expect, it } from "vitest";

import { clientAddress, createRateLimiter } from "@/lib/server/rate-limit";

describe("createRateLimiter", () => {
  it("allows the limit within a window, refuses the next, and opens again when the window ends", () => {
    const take = createRateLimiter(2, 60_000);

    expect(take("a", 0)).toEqual({ allowed: true });
    expect(take("a", 1_000)).toEqual({ allowed: true });
    expect(take("a", 1_500)).toEqual({ allowed: false, retryAfterSeconds: 59 });
    expect(take("b", 1_500)).toEqual({ allowed: true });
    expect(take("a", 60_000)).toEqual({ allowed: true });
  });

  it("keeps at most its key budget, dropping ended windows first and then the oldest", () => {
    const take = createRateLimiter(1, 1_000, 2);
    take("old", 0);
    take("newer", 500);

    take("third", 600);
    expect(take("newer", 700)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(take("old", 700)).toEqual({ allowed: true });
  });
});

describe("clientAddress", () => {
  it("takes the last forwarded address, which the proxy in front wrote", () => {
    expect(
      clientAddress(
        new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.4" }),
      ),
    ).toBe("198.51.100.4");
  });

  it("counts an IPv6 caller by its /64, however the address is written", () => {
    const network = "2001:db8:abcd:12::/64";
    expect(
      clientAddress(new Headers({ "x-forwarded-for": "2001:db8:abcd:12::1" })),
    ).toBe(network);
    expect(
      clientAddress(
        new Headers({
          "x-forwarded-for": "2001:0DB8:abcd:0012:ffff:1:2:3",
        }),
      ),
    ).toBe(network);
    expect(clientAddress(new Headers({ "x-forwarded-for": "::1" }))).toBe(
      "0:0:0:0::/64",
    );
  });

  it("calls a request without one unknown", () => {
    expect(clientAddress(new Headers())).toBe("unknown");
    expect(clientAddress(new Headers({ "x-forwarded-for": " " }))).toBe(
      "unknown",
    );
  });
});
