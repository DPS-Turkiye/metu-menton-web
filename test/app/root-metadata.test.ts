import { describe, expect, it, vi } from "vitest";

import { generateMetadata } from "@/app/layout";

vi.mock("next/font/local", () => ({
  default: () => ({ className: "font", variable: "--font" }),
}));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => `metadata.${key}`),
}));
vi.mock("@/lib/server/account-type", () => ({ getAccountType: vi.fn() }));

describe("root metadata", () => {
  it("names the installed app hocam, for iOS home screens too", async () => {
    const metadata = await generateMetadata();
    expect(metadata.applicationName).toBe("hocam");
    expect(metadata.appleWebApp).toEqual({ title: "hocam" });
  });

  it("keeps the page titles from the message catalog", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toEqual({
      default: "metadata.defaultTitle",
      template: "metadata.titleTemplate",
    });
  });
});
