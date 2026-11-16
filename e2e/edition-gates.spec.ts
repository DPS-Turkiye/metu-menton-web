import { expect, test } from "@playwright/test";

import { e2eEnv } from "./support/env";

// The stack runs APP_EDITION=ODTU: Teknokent's screens and endpoints must look missing, ODTÜ's must be there.

test.describe("ODTU edition: pages", () => {
  for (const path of ["/m/login", "/assistant", "/invite", "/auth/otg/start"]) {
    test(`Teknokent page ${path} answers 404`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
    });
  }

  test("the sign-in page is open, with e-mail sign-in", async ({ page }) => {
    const response = await page.goto("/login");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
  });

  test("sign-up is open in ODTU (founder flow, approved by a coordinator)", async ({
    page,
  }) => {
    const response = await page.goto("/signup");

    expect(response?.status()).toBe(200);
  });

  for (const path of ["/student", "/academician"]) {
    test(`ODTÜ workspace ${path} exists and asks a visitor to sign in`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login\?next=/);
    });
  }
});

test.describe("ODTU edition: backend", () => {
  test("is healthy", async ({ request }) => {
    const response = await request.get(`${e2eEnv.apiUrl}/api/health`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: "UP" });
  });

  test("closes Teknokent's endpoints before any sign-in check", async ({
    request,
  }) => {
    expect(
      (await request.get(`${e2eEnv.apiUrl}/api/assistant/bots`)).status(),
    ).toBe(404);
    expect(
      (
        await request.post(`${e2eEnv.apiUrl}/api/auth/register/mentor`, {
          data: {},
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await request.post(`${e2eEnv.apiUrl}/api/auth/register/member`, {
          data: {},
        })
      ).status(),
    ).toBe(404);
  });

  test("serves ODTÜ's endpoints: the LTI key set publicly, the rest only to signed-in callers", async ({
    request,
  }) => {
    const keySet = await request.get(`${e2eEnv.apiUrl}/api/lti/jwks`);
    expect(keySet.status()).toBe(200);
    expect((await keySet.json()) as { keys: unknown[] }).toHaveProperty("keys");

    expect(
      (
        await request.get(`${e2eEnv.apiUrl}/api/peer-mentoring/categories`)
      ).status(),
    ).toBe(401);
  });
});
