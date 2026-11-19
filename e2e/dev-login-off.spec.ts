import { expect, test } from "@playwright/test";

import { e2eEnv, serviceAuthorization } from "./support/env";

// The stack is built like a server: NEXT_PUBLIC_ODTU_DEV_LOGIN unset on the web, INSTITUTION_LOGIN_DEV_STUB unset
// on the backend. The persona login must not be reachable anywhere.

test("the persona page does not exist", async ({ page }) => {
  const response = await page.goto("/login/odtu/dev");

  expect(response?.status()).toBe(404);
});

test("the sign-in page offers no ODTÜ button while no real ODTÜ login exists", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
  await expect(page.getByText("ODTÜ Hesabıyla Giriş Yap")).toHaveCount(0);
});

test("the web app's persona route answers 404", async ({ request }) => {
  const response = await request.get("/api/institution-login/dev-personas");

  expect(response.status()).toBe(404);
});

test("the backend's persona list answers 404 even to the frontend's service credential", async ({
  request,
}) => {
  const response = await request.get(
    `${e2eEnv.apiUrl}/api/auth/institution/odtu/dev-personas`,
    {
      headers: { Authorization: serviceAuthorization() },
    },
  );

  expect(response.status()).toBe(404);
});
