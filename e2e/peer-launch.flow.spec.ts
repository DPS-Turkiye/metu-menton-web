import { expect, test, type Page } from "@playwright/test";

import { sql } from "./support/database";
import {
  currentUserId,
  Persona,
  signInAs,
  signInAsStaff,
  Staff,
} from "./support/personas";

// The weekend launch, end to end on one İŞKUR peer program: the admin opens it, a student earns the Akran Mentoru
// badge and is found and booked by another student (Akran), then the program gets its İŞKUR structure and the two
// interns work a week in it (İŞKUR). One program and one database, so the steps run in order. The file name keeps
// it after office-hours.flow.spec.ts: once the program has İŞKUR units, every student of it is an intern (main until
// the intern list lands) and Ayşe would be sent to the onboarding.
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const PROGRAM = `E2E İŞKUR Akran ${RUN}`;
const CATEGORY = "Kariyer ve Staj";
const HELP_WITH = `Staj başvurusu ve CV üzerine birlikte çalışabiliriz (${RUN}).`;
const REQUEST_MESSAGE = `Yaz stajı için CV'mi birlikte gözden geçirmek istiyorum (${RUN}).`;
const UUID = /[0-9a-f-]{36}/;

let programId = "";
const accountIds: Partial<Record<Persona, string>> = {};

/** The students a journey needs, signed in once so their accounts exist, then put into the program. */
async function joinProgram(page: Page, people: Persona[]) {
  for (const person of people) {
    await signInAs(page, person);
    accountIds[person] = await currentUserId(page);
  }
  // No screen adds a student to a peer program on main: ODTÜ sign-up (lane A) will. Until then, the row it writes.
  const ids = people.map((person) => `'${accountIds[person]}'`).join(",");
  sql(`UPDATE app_user SET program_id = '${programId}' WHERE id IN (${ids})`);
}

async function peerMentoring(
  page: Page,
  side: "Mentorluk Al" | "Mentorluk Ver",
) {
  await page.goto("/student/peer-mentoring");
  // The Al / Ver switch is only there for İŞKUR students and peer mentors.
  const toggle = page
    .getByRole("group", { name: "Akran mentörlüğü tarafı" })
    .getByRole("button", { name: side });
  if (await toggle.count()) await toggle.click();
}

async function upcomingAppointment(page: Page, counterpart: string) {
  await page.goto("/student/appointments");
  await page.getByRole("tab", { name: /^Yaklaşan/ }).click();
  return page
    .getByRole("tabpanel")
    .getByRole("listitem")
    .filter({ hasText: counterpart });
}

test.describe("Akran", () => {
  test("the admin creates the peer program with its coordinator and launches it", async ({
    page,
  }) => {
    await signInAsStaff(page, Staff.Admin);
    await page.goto("/admin/programs/new");

    await page
      .getByRole("radio", { name: /Akran Mentörlüğü/ })
      .check({ force: true });
    await page.getByRole("button", { name: "Devam Et" }).click();
    await page.getByLabel("Program adı").fill(PROGRAM);
    await page.getByRole("button", { name: "Devam Et" }).click();
    await page
      .getByRole("button", { name: /Program Koordinatörü/ })
      .first()
      .click();
    await expect(
      page.getByRole("region", { name: "Seçilen koordinatör" }),
    ).toContainText("Program Koordinatörü");
    await page.getByRole("button", { name: "Devam Et" }).click();
    await page.getByRole("button", { name: "Kaydet" }).click();

    await expect(page).toHaveURL(/\/admin\/programs\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    programId = UUID.exec(page.url())?.[0] ?? "";
    await page.getByRole("button", { name: "Programı Başlat" }).click();
    await expect(
      page.getByRole("button", { name: "Programı Başlat" }),
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test("two students are in the program, and the coordinator turns a category on", async ({
    page,
  }) => {
    await joinProgram(page, [Persona.MehmetKaya, Persona.AyseYilmaz]);

    await signInAsStaff(page, Staff.Coordinator);
    await page.goto(`/coordinator/programs/${programId}/settings`);
    await page.getByRole("checkbox", { name: CATEGORY }).check();
    await page.getByRole("button", { name: "Kategorileri kaydet" }).click();
    await expect(page.getByText("Kategoriler kaydedildi.")).toBeVisible();
  });

  test("the coordinator gives Mehmet the Akran Mentoru badge", async ({
    page,
  }) => {
    await signInAsStaff(page, Staff.Coordinator);
    await page.goto(`/coordinator/programs/${programId}/students`);
    const row = page.getByRole("row").filter({ hasText: Persona.MehmetKaya });
    await row.getByRole("button", { name: "Rozet ver" }).click();
    await expect(row).toContainText("Rozet Doğrulandı");
  });

  test("Mehmet fills in and publishes his mentor profile", async ({ page }) => {
    await signInAs(page, Persona.MehmetKaya);
    await peerMentoring(page, "Mentorluk Ver");
    await page
      .getByRole("link", { name: "Mentor profilini oluştur" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Mentor profilini oluştur" }),
    ).toBeVisible();

    const next = page.getByRole("button", { name: "Devam Et" });
    await page.getByRole("checkbox", { name: new RegExp(CATEGORY) }).check();
    await next.click(); // Kategoriler
    await next.click(); // Alt konular
    await next.click(); // Deneyim
    await page.getByLabel("Açıklaman").fill(HELP_WITH);
    await next.click(); // Neye yardım edebilirsin?
    await next.click(); // Bağlantılar
    for (const day of [
      "Pazartesi",
      "Salı",
      "Çarşamba",
      "Perşembe",
      "Cuma",
      "Cumartesi",
      "Pazar",
    ]) {
      const open = page.getByRole("switch", { name: `${day} uygun` });
      if ((await open.getAttribute("aria-checked")) !== "true") {
        await open.click();
      }
    }
    await next.click(); // Haftalık müsaitlik: saved by the editor
    await page.getByRole("button", { name: "Profili Yayınla" }).click();
    await expect(page.getByText("Mentor profilin yayında.")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Ayşe finds Mehmet in the mentor list and sends a request", async ({
    page,
  }) => {
    await signInAs(page, Persona.AyseYilmaz);
    await peerMentoring(page, "Mentorluk Al");
    const card = page.getByRole("article", { name: Persona.MehmetKaya });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole("button", { name: "Mentorluk Talebi Gönder" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Konu").selectOption({ label: CATEGORY });
    await dialog.getByLabel("Kısa mesaj").fill(REQUEST_MESSAGE);
    await dialog
      .getByRole("button", { name: "Mentorluk Talebi Gönder" })
      .click();
    await expect(page.getByText("Talebin gönderildi.")).toBeVisible();
  });

  test("Mehmet accepts it", async ({ page }) => {
    await signInAs(page, Persona.MehmetKaya);
    await peerMentoring(page, "Mentorluk Ver");
    const request = page.getByRole("article", { name: Persona.AyseYilmaz });
    await expect(request).toContainText(REQUEST_MESSAGE);
    await request.getByRole("button", { name: "Kabul Et" }).click();
    await expect(page.getByText("Talebi kabul ettin.")).toBeVisible();
  });

  test("Ayşe books one of Mehmet's hours, and the meeting is in both Randevularım", async ({
    page,
  }) => {
    await signInAs(page, Persona.AyseYilmaz);
    await peerMentoring(page, "Mentorluk Al");
    await page.getByRole("tab", { name: /^Mentorluklarım/ }).click();
    await page.getByRole("button", { name: "Görüşme Planla" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`${Persona.MehmetKaya} ile randevu al`);
    await dialog
      .getByRole("group", { name: /saatleri$/ })
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByText("Randevun oluşturuldu.")).toBeVisible();

    await expect(
      await upcomingAppointment(page, Persona.MehmetKaya),
    ).toHaveCount(1);

    await signInAs(page, Persona.MehmetKaya);
    await expect(
      await upcomingAppointment(page, Persona.AyseYilmaz),
    ).toHaveCount(1);
  });
});
