import { expect, test, type Page } from "@playwright/test";

import { sql } from "./support/database";
import {
  currentUserId,
  Persona,
  signInAs,
  signInAsStaff,
  Staff,
} from "./support/personas";

// The weekend launch, end to end on one İŞKUR peer program: the admin opens it, the coordinator lists two students
// as İŞKUR interns, one earns the Akran Mentoru badge and is found and booked by a plain student (Akran), then the
// program gets its İŞKUR structure and the two interns work a week in it (İŞKUR), while the plain student never sees
// an İŞKUR screen. One program and one database, so the steps run in order.
test.describe.configure({ mode: "serial" });
// ODTÜ's day: a task is due "today" in the browser, and the backend's work days are in Istanbul.
// The journey needs a fresh stack (e2e/stack.sh down, then up): the personas keep what an earlier run gave them.
test.use({ timezoneId: "Europe/Istanbul" });

const RUN = Date.now().toString(36);
const PROGRAM = `E2E İŞKUR Akran ${RUN}`;
const CATEGORY = "Kariyer ve Staj";
const PRISM_LINK = "https://prism.example.test/akran-mentoru";
const HELP_WITH = `Staj başvurusu ve CV üzerine birlikte çalışabiliriz (${RUN}).`;
const REQUEST_MESSAGE = `Yaz stajı için CV'mi birlikte gözden geçirmek istiyorum (${RUN}).`;
const UUID = /[0-9a-f-]{36}/;
const TASK = `Etkinlik afişi için 2 görsel öneri (${RUN})`;
const WORK_NOTE = `Afiş taslakları hazırlandı (${RUN})`;
const CHANNEL_MESSAGE = `Merhaba ekip, bu haftanın görevleri paylaşıldı (${RUN}).`;
/** Today in Istanbul, as the onboarding names a work day ("Cuma"). A run that crosses Istanbul midnight fails. */
function today() {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}

/** The persona login's addresses (metu-menton-backend dev/odtu-personas.json); Ayşe stays off the list. */
const INTERN_EMAILS = [
  "mehmet.kaya@odtu-dev.invalid",
  "zeynep.demir@odtu-dev.invalid",
];

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
  await expect(
    page.getByRole("heading", { name: "Akran Mentörlüğü", level: 1 }),
  ).toBeVisible();
  // Mentorluk Al is the default; the Al / Ver switch is there only for İŞKUR students and peer mentors.
  if (side === "Mentorluk Ver") {
    await page
      .getByRole("group", { name: "Akran mentörlüğü tarafı" })
      .getByRole("button", { name: side })
      .click();
  }
}

/** One batch of "Prism sonuçları": the pasted lines, one decision for all, and the outcome each line got. */
async function prismDecision(
  page: Page,
  lines: string,
  decision: "Akran mentoru olarak onayla" | "Testi tekrar alsın",
  outcome: string,
) {
  await page.getByRole("button", { name: "Prism sonuçları" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("E-postalar ve puanlar").fill(lines);
  await dialog.getByRole("radio", { name: decision }).check();
  await dialog.getByRole("button", { name: "Uygula" }).click();
  await expect(dialog.getByRole("listitem")).toContainText(outcome);
  await dialog.getByRole("button", { name: "Kapat" }).click();
}

/** A mentor's row in Keşfet's "Mentor ara" list. */
function mentorRow(page: Page, mentor: Persona) {
  return page
    .getByRole("listitem")
    .filter({ hasText: mentor })
    .filter({ hasText: "Profili Gör" });
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
      .getByRole("checkbox", { name: /Program Koordinatörü/ })
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

  test("three students are in the program; the coordinator lists two as İŞKUR interns, turns a category on and sets the Prism link", async ({
    page,
  }) => {
    await joinProgram(page, [
      Persona.MehmetKaya,
      Persona.ZeynepDemir,
      Persona.AyseYilmaz,
    ]);

    await signInAsStaff(page, Staff.Coordinator);
    await page.goto(`/coordinator/programs/${programId}/iskur`);
    await page
      .getByLabel("Eklenecek e-posta adresleri")
      .fill(`${INTERN_EMAILS.join("\n")}\n`);
    await page.getByRole("button", { name: "Listeye ekle" }).click();
    const listed = page.getByRole("list", { name: "Listedeki adresler" });
    for (const email of INTERN_EMAILS) {
      await expect(
        listed.getByRole("listitem").filter({ hasText: email }),
      ).toContainText("Kayıtlı");
    }

    await page.goto(`/coordinator/programs/${programId}/settings`);
    await page.getByRole("checkbox", { name: CATEGORY }).check();
    await page.getByRole("button", { name: "Kategorileri kaydet" }).click();
    await expect(page.getByText("Kategoriler kaydedildi.")).toBeVisible();

    // The training lives on Prism: the link students open from their training page.
    await page.getByLabel("Prism bağlantısı").fill(PRISM_LINK);
    await page.getByRole("button", { name: "Bağlantıyı kaydet" }).click();
    await expect(page.getByText("Bağlantı kaydedildi.")).toBeVisible();
  });

  test("the coordinator applies the Prism results: Mehmet approved (badge), Zeynep to retake", async ({
    page,
  }) => {
    await signInAsStaff(page, Staff.Coordinator);
    await page.goto(`/coordinator/programs/${programId}/students`);
    await prismDecision(
      page,
      `${INTERN_EMAILS[0]}, 85`,
      "Akran mentoru olarak onayla",
      "Onaylandı, rozet verildi",
    );
    await prismDecision(
      page,
      `${INTERN_EMAILS[1]}, 40`,
      "Testi tekrar alsın",
      "Testi tekrar alacak, bildirim gönderildi",
    );

    await page.reload();
    await expect(
      page.getByRole("row").filter({ hasText: Persona.MehmetKaya }),
    ).toContainText("Rozet Doğrulandı");
    await expect(
      page.getByRole("row").filter({ hasText: Persona.ZeynepDemir }),
    ).toContainText("Prism: testi tekrar alacak");
  });

  test("Zeynep's training page asks her to retake the test", async ({
    page,
  }) => {
    await signInAs(page, Persona.ZeynepDemir);
    await page.goto("/student/peer-mentoring/training");
    await expect(page.getByText("Testi tekrar alman gerekiyor")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Prism'de aç" }),
    ).toHaveAttribute("href", PRISM_LINK);
  });

  test("Mehmet fills in and publishes his mentor profile", async ({ page }) => {
    await signInAs(page, Persona.MehmetKaya);
    await peerMentoring(page, "Mentorluk Ver");
    await page
      .getByRole("link", { name: "Mentor profilini oluştur" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Hangi konularda mentorluk verebilirsin?",
      }),
    ).toBeVisible();

    const next = page.getByRole("button", { name: "Devam Et" });
    // The category cards are labels over visually hidden checkboxes.
    await page
      .getByRole("checkbox", { name: new RegExp(CATEGORY) })
      .check({ force: true });
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
    // Keşfet lists the mentor; the request starts from their profile (a card offers it only when recommended).
    await mentorRow(page, Persona.MehmetKaya).getByText("Profili Gör").click();
    await page
      .getByRole("button", { name: /^Mentorluk Talebi Gönder/ })
      .click();

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

/** The 5-step İŞKUR form, one work day (today, 09:00–16:30), as the gate sends a new intern to it. */
async function onboard(page: Page) {
  await page.goto("/iskur/onboarding");
  await page.getByRole("button", { name: "Forma başla" }).click();
  const next = page.getByRole("button", { name: "Devam et" });

  await page
    .getByRole("group", { name: "Haftalık gün sayısı" })
    .getByRole("button", { name: /^1 gün/ })
    .click();
  await page.getByRole("button", { name: today(), exact: true }).click();
  await page
    .getByLabel("Daha önce İŞKUR programlarında kullandığın gün sayısı")
    .fill("0");
  await next.click(); // Görev günleri

  await page.getByRole("checkbox").first().check();
  for (const skill of await page
    .getByRole("group", { name: / düzeyi$/ })
    .all()) {
    await skill.getByRole("button", { name: "İyi" }).click();
  }
  await page.getByRole("button", { name: "Planlayan" }).click();
  await next.click(); // Birimler ve yetkinlikler

  await expect(page.getByText("Belge yükleme şu an kapalı")).toBeVisible();
  await next.click(); // Belgeler: storage is off on this stack
  await next.click(); // Liderlik: no application
  await page.getByRole("button", { name: "Formu gönder" }).click();
  await expect(page.getByText("Formun gönderildi")).toBeVisible({
    timeout: 15_000,
  });
}

/** Ekip lideri / Üye in the coordinator's "Yerleştir" dialog, all in the first team of the default structure. */
async function place(
  page: Page,
  person: Persona,
  role: "Ekip lideri" | "Üye",
  leader?: Persona,
) {
  await page
    .getByRole("button", { name: `${person} kişisini yerleştir` })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const team = dialog.getByLabel("Ekip", { exact: true });
  await team.selectOption({ index: 0 });
  await dialog.getByRole("radio", { name: role }).check();
  if (leader) {
    await dialog
      .getByLabel("Bağlı olduğu lider")
      .selectOption({ label: leader });
  }
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(
    page.getByRole("button", { name: `${person} yerleşimini düzenle` }),
  ).toBeVisible();
}

let teamName = "";

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("İŞKUR", () => {
  test("the coordinator builds the default units and teams and places a leader and a member", async ({
    page,
  }) => {
    await signInAsStaff(page, Staff.Coordinator);
    await page.goto(`/coordinator/programs/${programId}/iskur`);
    await page
      .getByRole("button", { name: "Varsayılan yapıyı oluştur" })
      .click();
    // The pool shows before the structure exists; place people once the units and teams are there.
    await expect(
      page.getByRole("button", { name: "Birimi kesinleştir" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("button", {
        name: `${Persona.ZeynepDemir} kişisini yerleştir`,
      })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    teamName =
      (await page
        .getByRole("dialog")
        .getByLabel("Ekip", { exact: true })
        .locator("option")
        .first()
        .textContent()) ?? "";
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Vazgeç" })
      .click();
    expect(teamName).not.toBe("");

    await place(page, Persona.ZeynepDemir, "Ekip lideri");
    await place(page, Persona.MehmetKaya, "Üye", Persona.ZeynepDemir);

    await page.getByRole("button", { name: "Tümünü kesinleştir" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Kesinleştir" })
      .click();
    await expect(page.getByText(/2 kesinleşti/)).toBeVisible();
  });

  test("both interns go through the onboarding and see their team", async ({
    page,
  }) => {
    await signInAs(page, Persona.MehmetKaya);
    await onboard(page);
    await page.goto("/student");
    await expect(
      page.getByRole("heading", { name: `Ekibin belli oldu: ${teamName}` }),
    ).toBeVisible();
    // Finalized before the onboarding, so the reveal says "Kesin atama" and names the leader under "Kime sorarım?".
    await expect(page.getByText("Kesin atama")).toBeVisible();
    await expect(
      page.getByText(`Ekip liderin · ${Persona.ZeynepDemir}`),
    ).toBeVisible();

    await signInAs(page, Persona.ZeynepDemir);
    await onboard(page);
    await page.goto("/student");
    await expect(
      page.getByRole("heading", { name: `Ekibin belli oldu: ${teamName}` }),
    ).toBeVisible();
    await expect(page.getByText("Ekip lideri · 1 üye")).toBeVisible();
  });

  test("the leader assigns Mehmet a task", async ({ page }) => {
    await signInAs(page, Persona.ZeynepDemir);
    await page.goto("/student/team");
    await page.getByLabel("Görev", { exact: true }).fill(TASK);
    await page
      .getByRole("button", { name: Persona.MehmetKaya, exact: true })
      .click();
    await page.getByRole("button", { name: "Görevi ata" }).click();
    await expect(page.getByText("Görev atandı.")).toBeVisible();
  });

  test("Mehmet logs his hours on it and sends the week", async ({ page }) => {
    await signInAs(page, Persona.MehmetKaya);
    await page.goto("/student/work-log");
    await page.getByRole("button", { name: /Bugün/ }).click();
    await page
      // The label wraps the select, so its name also carries the chosen option ("Görevsiz satır").
      .getByRole("combobox", { name: /^Ekip çalışması/ })
      .selectOption({ label: TASK });
    await page.getByRole("button", { name: "Ekle", exact: true }).click();
    await page.getByLabel("Süre (dk)").fill("120");
    await page.getByLabel("Not", { exact: true }).fill(WORK_NOTE);
    await page.getByRole("button", { name: "Taslak olarak kaydet" }).click();
    await expect(page.getByText("Kaydedildi.")).toBeVisible();

    await page
      .getByRole("group", { name: "Görünüm" })
      .getByRole("button", { name: "Haftalık özet" })
      .click();
    await page
      .getByRole("button", { name: "Haftalık kaydı ekip liderine gönder" })
      .click();
    await expect(
      page.getByText("Ekip liderinin değerlendirmesi bekleniyor."),
    ).toBeVisible();
  });

  test("the leader approves the week and never sees Mehmet's mentee or notes", async ({
    page,
  }) => {
    await signInAs(page, Persona.ZeynepDemir);
    // Everything the leader's screens load, to check the mentee is in none of it, not only in what is drawn.
    // It starts after the sign-in, whose persona picker lists every persona.
    const responses: Promise<{ path: string; body: string }>[] = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith("/api/") && response.ok()) {
        responses.push(
          response.text().then((body) => ({ path: url.pathname, body })),
        );
      }
    });
    await page.goto("/student/team");
    await page.getByRole("tab", { name: "Haftalık kayıtlar" }).click();
    await page
      .getByRole("listitem")
      .filter({ hasText: Persona.MehmetKaya })
      .getByRole("link", { name: "İncele" })
      .click();

    await expect(page.getByText(TASK)).toBeVisible();
    await expect(page.getByText("İçerik gizli")).toBeVisible();
    // Every body read in full, and the watch saw the leader's data at all (the week's task), before the check.
    const loaded = await Promise.all(responses);
    expect(loaded.some((response) => response.body.includes(TASK))).toBe(true);
    for (const secret of [Persona.AyseYilmaz, REQUEST_MESSAGE]) {
      await expect(page.getByText(secret)).toHaveCount(0);
      // Only the paths go into the report, never what they answered.
      expect(
        loaded
          .filter((response) => response.body.includes(secret))
          .map((response) => response.path),
        `the leader's screens loaded "${secret}"`,
      ).toEqual([]);
    }

    for (const check of [
      "Kaydedilen süre yapılan işle tutarlı",
      "Emek belgelenmiş (çıktı, not, bağlantı)",
      "Raporlar ve çıktılar yeterli",
    ]) {
      await page.getByRole("checkbox", { name: check }).check();
    }
    // The decision cards are labels over visually hidden radios.
    await page.getByRole("radio", { name: "Onayla" }).check({ force: true });
    await page.getByRole("button", { name: "Kararı gönder" }).click();
    await expect(page.getByText("Karar gönderildi.")).toBeVisible();

    await signInAs(page, Persona.MehmetKaya);
    await page.goto("/student/work-log");
    await page
      .getByRole("group", { name: "Görünüm" })
      .getByRole("button", { name: "Haftalık özet" })
      .click();
    await expect(
      page.getByText("Hafta onaylandı: mesai tamamlandı."),
    ).toBeVisible();
  });

  test("the leader writes in the team channel and Mehmet reads it", async ({
    page,
  }) => {
    await signInAs(page, Persona.ZeynepDemir);
    await page.goto("/student/messages");
    await page
      .getByRole("region", { name: "Tematik ekip" })
      .getByRole("button", { name: new RegExp(escapeRegExp(teamName)) })
      .click();
    await page.getByLabel("Mesaj", { exact: true }).fill(CHANNEL_MESSAGE);
    await page.getByRole("button", { name: "Gönder", exact: true }).click();
    await expect(page.getByText(CHANNEL_MESSAGE)).toBeVisible();

    await signInAs(page, Persona.MehmetKaya);
    await page.goto("/student/messages");
    await page
      .getByRole("region", { name: "Tematik ekip" })
      .getByRole("button", { name: new RegExp(escapeRegExp(teamName)) })
      .click();
    await expect(page.getByText(CHANNEL_MESSAGE)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Ayşe, not on the intern list, sees no İŞKUR screen but keeps the mentor list, Office Hours and Randevularım", async ({
    page,
  }) => {
    await signInAs(page, Persona.AyseYilmaz);
    await page.goto("/student");
    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByText(/^Bu Haftam/)).toHaveCount(0);
    await expect(page.getByText(/^Ekibin belli oldu/)).toHaveCount(0);

    await page.goto("/iskur/onboarding");
    await expect(
      page.getByText("Yerleştirme formu sana açık değil"),
    ).toBeVisible();

    await peerMentoring(page, "Mentorluk Al");
    await expect(mentorRow(page, Persona.MehmetKaya)).toBeVisible();
    await page.goto("/student/office-hours");
    await expect(
      page.getByRole("heading", { name: "Office Hours", level: 1 }),
    ).toBeVisible();
    await expect(
      await upcomingAppointment(page, Persona.MehmetKaya),
    ).toHaveCount(1);
  });
});
