import { expect, test, type APIRequestContext } from "@playwright/test";
import { sealData } from "iron-session";

import { UserRole, type SessionData } from "@/interfaces/session";
import { SESSION_COOKIE } from "@/lib/public-paths";

import { e2eEnv } from "./support/env";

const CLOSED_PAGES = ["/m/login", "/assistant", "/invite", "/auth/otg/start"];
const MISSING_PAGE = "/no-such-page";

/**
 * A signed-in visitor's cookie, sealed with the stack's own SESSION_PASSWORD exactly as the app seals one. The
 * account is fake and the backend never sees it: these requests only go through the proxy's routing.
 */
async function signedInCookie(): Promise<string> {
  const password = process.env.SESSION_PASSWORD;
  if (!password)
    throw new Error(
      "SESSION_PASSWORD is not set: source e2e/.stack/web.env first.",
    );
  const data: SessionData = {
    user: {
      userId: "00000000-0000-4000-8000-0000000000e2",
      email: "e2e.student@example.invalid",
      fullName: "E2E Öğrenci",
      jobTitle: "",
      role: UserRole.Mentee,
    },
    issuedAt: Date.now(),
  };
  return `${SESSION_COOKIE}=${await sealData(data, { password })}`;
}

async function answer(
  request: APIRequestContext,
  path: string,
  cookie?: string,
) {
  const response = await request.get(path, {
    maxRedirects: 0,
    headers: cookie ? { Cookie: cookie } : {},
  });
  return {
    status: response.status(),
    location: response.headers().location ?? null,
  };
}

// The stack runs APP_EDITION=ODTU: Teknokent's screens and endpoints must look missing, ODTÜ's must be there.

test.describe("ODTU edition: pages", () => {
  // A closed page must look exactly like a page that doesn't exist. Signed out, both send the visitor to sign in
  // (the proxy runs again on its rewrite, which isn't public) without naming the closed page; signed in, both are 404.
  for (const path of CLOSED_PAGES) {
    test(`Teknokent page ${path} looks missing to a signed-out visitor`, async ({
      request,
    }) => {
      const closed = await answer(request, path);
      const missing = await answer(request, MISSING_PAGE);

      expect(closed.status).toBe(missing.status);
      expect(closed.location).toMatch(/^\/login\?next=/);
      expect(closed.location).not.toContain(encodeURIComponent(path));
    });

    test(`Teknokent page ${path} answers 404 to a signed-in visitor`, async ({
      request,
    }) => {
      const cookie = await signedInCookie();

      expect((await answer(request, path, cookie)).status).toBe(404);
      expect((await answer(request, MISSING_PAGE, cookie)).status).toBe(404);
    });
  }

  test("the sign-in page is open, with e-mail sign-in", async ({ page }) => {
    const response = await page.goto("/login");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
  });

  test("sign-up is open in ODTU: the student form with an ODTÜ e-mail address", async ({
    page,
  }) => {
    const response = await page.goto("/signup");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "ODTÜ öğrenci kaydı" }),
    ).toBeVisible();
    await expect(page.getByLabel(/^Bölüm/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Kayıt ol" })).toBeDisabled();
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
