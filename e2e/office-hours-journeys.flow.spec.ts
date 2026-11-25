import { expect, test, type Page } from "@playwright/test";

import { asPerson } from "./support/backend";
import {
  openOfficeHours,
  requestNextWednesday,
  studentAppointment,
  UUID,
  type TimeRange,
} from "./support/office-hours";
import { currentUserId, Persona, signInAs } from "./support/personas";
import { turkeyDay, turkeyRange } from "./support/time";

// The Office Hours journeys office-hours.flow.spec.ts leaves out (FR-OH-09, FR-OH-14). Each test sends its own
// request through the backend and walks the rest through both sides' screens, so any one of them runs alone and
// again. Asking a question and answering it is not here: a Menton request has no question step, only a Moodle
// course's request does.

const RUN = Date.now().toString(36);

type Academician = { id: string; fullName: string };
type InboxRequest = { id: string; proposedTimes: TimeRange[] };

let academicianAccount = "";
let studentAccount = "";
let academicianId = "";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signInAs(page, Persona.AhmetOzturk);
  academicianAccount = await currentUserId(page);
  await openOfficeHours(page.request, academicianAccount);

  await signInAs(page, Persona.AyseYilmaz);
  studentAccount = await currentUserId(page);
  const academicians = await asPerson<Academician[]>(
    page.request,
    "GET",
    "/api/office-hours/me/academicians",
    studentAccount,
  );
  academicianId =
    academicians.find((one) => one.fullName === Persona.AhmetOzturk)?.id ?? "";
  expect(academicianId).toMatch(UUID);
  await page.close();
});

function sendRequest(page: Page, topic: string) {
  return requestNextWednesday(
    page.request,
    studentAccount,
    academicianId,
    topic,
  );
}

/** Opens the academician's drawer for a request, on the day of its time. */
async function openRequestDrawer(
  page: Page,
  request: TimeRange & { id: string },
) {
  await page.goto(
    `/academician/appointments?date=${turkeyDay(request.startsAt)}&request=${request.id}`,
  );
}

/**
 * The academician's calendar entry for a request or a meeting, named by the student, the time and the status, once
 * Randevularım has loaded both lists: an entry that is gone is only gone after they have arrived.
 */
async function academicianEntry(
  page: Page,
  time: TimeRange,
  status: "Onay Bekliyor" | "Onaylandı",
) {
  const loaded = [
    "/api/office-hours/me/inbox",
    "/api/office-hours/me/meetings",
  ].map((path) =>
    page.waitForResponse(
      (response) => response.url().includes(path) && response.ok(),
    ),
  );
  await page.goto(`/academician/appointments?date=${turkeyDay(time.startsAt)}`);
  await Promise.all(loaded);
  return page.getByRole("button", {
    name: `${Persona.AyseYilmaz}, ${turkeyRange(time.startsAt, time.endsAt)}, ${status}`,
  });
}

test("the academician offers another time and the student takes it", async ({
  page,
}) => {
  const topic = `E2E alternatif saat ${RUN}`;
  const sent = await sendRequest(page, topic);

  await signInAs(page, Persona.AhmetOzturk);
  await openRequestDrawer(page, sent);
  await page.getByRole("button", { name: "Alternatif Saat Öner" }).click();
  await page
    .getByRole("group", { name: "Gün seç" })
    .getByRole("button")
    .and(page.locator(":enabled"))
    .last()
    .click();
  await page
    .getByRole("group", { name: /müsait saatlerin/ })
    .getByRole("button")
    .and(page.locator(":enabled"))
    .last()
    .click();
  await page.getByRole("button", { name: "Öneriyi Gönder" }).click();
  await expect(
    page.getByText("Önerdiğin saatler öğrenciye gönderildi."),
  ).toBeVisible();
  const inbox = await asPerson<InboxRequest[]>(
    page.request,
    "GET",
    "/api/office-hours/me/inbox",
    academicianAccount,
  );
  const offered = inbox.find((one) => one.id === sent.id)?.proposedTimes[0];
  expect(offered, "the time the academician offered").toBeDefined();

  await signInAs(page, Persona.AyseYilmaz);
  await (
    await studentAppointment(page, "Talepler", topic)
  )
    .getByRole("button", { name: "Önerilen saati kabul et" })
    .click();
  await expect(
    page.getByText("Önerilen saati kabul ettin; randevun onaylandı."),
  ).toBeVisible();
  await expect(await studentAppointment(page, "Yaklaşan", topic)).toContainText(
    "Onaylandı",
  );

  await signInAs(page, Persona.AhmetOzturk);
  await expect(
    await academicianEntry(page, offered ?? sent, "Onaylandı"),
  ).toBeVisible();
});

test("the student cancels a booked meeting and the time is free again", async ({
  page,
}) => {
  const topic = `E2E öğrenci iptali ${RUN}`;
  const sent = await sendRequest(page, topic);
  await asPerson(
    page.request,
    "POST",
    `/api/office-hours/me/requests/${sent.id}/decision`,
    academicianAccount,
    { action: "ACCEPT", time: sent.startsAt },
  );

  await signInAs(page, Persona.AyseYilmaz);
  await (
    await studentAppointment(page, "Yaklaşan", topic)
  )
    .getByRole("button", { name: "Randevuyu iptal et" })
    .click();
  await page
    .getByLabel("İptal nedeni (opsiyonel)")
    .fill("Sınav tarihim değişti; uçtan uca test.");
  await page.getByRole("button", { name: "Randevuyu İptal Et" }).click();
  await expect(page.getByText("Randevu iptal edildi.")).toBeVisible();
  await expect(await studentAppointment(page, "Geçmiş", topic)).toContainText(
    "İptal Edildi",
  );

  // The booking page draws days and times in the browser's own zone, so the labels are read the same way.
  await page.goto(`/student/office-hours/${academicianId}/book`);
  const { day, time } = await page.evaluate((startsAt) => {
    const at = new Date(startsAt);
    return {
      day: String(at.getDate()),
      time: at.toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" }),
    };
  }, sent.startsAt);
  await page.getByRole("button", { name: "Sonraki hafta" }).click();
  await page
    .getByRole("group", { name: "Günler" })
    .getByRole("button")
    .filter({ has: page.getByText(day, { exact: true }) })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Saatler" })
      .getByRole("button", { name: time, exact: true }),
  ).toBeEnabled();

  await signInAs(page, Persona.AhmetOzturk);
  await expect(await academicianEntry(page, sent, "Onaylandı")).toHaveCount(0);
});

test("the academician declines a request and the student sees why", async ({
  page,
}) => {
  const topic = `E2E reddedilen talep ${RUN}`;
  const sent = await sendRequest(page, topic);

  await signInAs(page, Persona.AhmetOzturk);
  await openRequestDrawer(page, sent);
  await page.getByRole("button", { name: "Reddet" }).click();
  await page
    .getByLabel("Öğrenciye not (opsiyonel)")
    .fill("Bu hafta dolu; uçtan uca test.");
  await page.getByRole("button", { name: "Talebi Reddet" }).click();
  await expect(page.getByText("Talep reddedildi.")).toBeVisible();
  await expect(await academicianEntry(page, sent, "Onay Bekliyor")).toHaveCount(
    0,
  );

  await signInAs(page, Persona.AyseYilmaz);
  const row = await studentAppointment(page, "Geçmiş", topic);
  await expect(row).toContainText("Reddedildi");
  await expect(row).toContainText("Bu hafta dolu");
});

test("the student withdraws a request before it is answered", async ({
  page,
}) => {
  const topic = `E2E geri çekilen talep ${RUN}`;
  const sent = await sendRequest(page, topic);

  await signInAs(page, Persona.AhmetOzturk);
  await expect(
    await academicianEntry(page, sent, "Onay Bekliyor"),
  ).toBeVisible();

  await signInAs(page, Persona.AyseYilmaz);
  await (
    await studentAppointment(page, "Talepler", topic)
  )
    .getByRole("button", { name: "Talebi geri çek" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Talebi geri çek" })
    .click();
  await expect(await studentAppointment(page, "Geçmiş", topic)).toContainText(
    "Geri Çekildi",
  );

  await signInAs(page, Persona.AhmetOzturk);
  await expect(await academicianEntry(page, sent, "Onay Bekliyor")).toHaveCount(
    0,
  );
});
