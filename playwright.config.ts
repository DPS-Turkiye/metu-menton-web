import { defineConfig, devices } from "@playwright/test";

import { e2eEnv } from "./e2e/support/env";

/**
 * Browser tests against a running stack: the backend from metu-menton-backend (e2e/stack.sh) and this app's
 * production build, started here. See docs/testing.md#end-to-end-tests.
 *
 * The repository is public, so a failed run keeps screenshots and the HTML report only: no traces or videos,
 * which would carry request headers and tokens.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eEnv.webUrl,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start --hostname 127.0.0.1 --port ${new URL(e2eEnv.webUrl).port}`,
    url: `${e2eEnv.webUrl}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
