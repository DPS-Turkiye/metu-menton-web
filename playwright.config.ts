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
  // The journeys share one database and the same personas, so a flows run takes them one at a time.
  ...(process.env.E2E_MODE === "flows" ? { workers: 1 } : {}),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eEnv.webUrl,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      // Built like a server (E2E_MODE=gates): what the edition closes and that the persona login is off.
      name: "gates",
      testMatch: ["edition-gates.spec.ts", "dev-login-off.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Built with the persona login and a Firebase test project (E2E_MODE=flows): whole journeys, one at a time,
      // because they share one database and the same personas.
      name: "flows",
      testMatch: "**/*.flow.spec.ts",
      fullyParallel: false,
      // A journey builds on its own earlier steps in one database, so a retry starts from a used state and can
      // only fail for the wrong reason, hiding the real one.
      retries: 0,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next start --hostname 127.0.0.1 --port ${new URL(e2eEnv.webUrl).port}`,
    url: `${e2eEnv.webUrl}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
