import { expect, type Page } from "@playwright/test";

/**
 * The dev persona login's people (metu-menton-backend `dev/odtu-personas.json`). The stub only runs with
 * INSTITUTION_LOGIN_DEV_STUB on a dev profile, so these exist in E2E_MODE=flows only.
 */
export const Persona = {
  /** Student, advisee of Ahmet Öztürk. */
  AyseYilmaz: "Ayşe Yılmaz",
  /** Academic, CENG; Ayşe's advisor. */
  AhmetOzturk: "Ahmet Öztürk",
} as const;

/** A persona, by the full name the picker shows. */
export type Persona = (typeof Persona)[keyof typeof Persona];

/** Signs in through "ODTÜ Hesabıyla Giriş Yap" and the persona picker, the way a developer does by hand. */
export async function signInAs(page: Page, persona: Persona) {
  // Each test is a fresh browser, so the first-visit product tour comes up again; skip it like a user would
  // whenever it covers the page.
  await page.addLocatorHandler(
    page.getByRole("button", { name: "Şimdilik Atla" }),
    async (skip) => {
      await skip.click();
    },
  );
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByRole("button", { name: "ODTÜ Hesabıyla Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/login\/odtu\/dev/);
  await page.getByRole("button", { name: new RegExp(persona) }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

/** The signed-in person's Menton id, as the app's own session reports it. */
export async function currentUserId(page: Page): Promise<string> {
  const response = await page.request.get("/api/session");
  expect(response.status()).toBe(200);
  const session = (await response.json()) as { userId: string };
  return session.userId;
}
