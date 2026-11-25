import { expect, test } from "@playwright/test";

import { asPerson } from "./support/backend";
import { sql } from "./support/database";
import {
  openOfficeHours,
  studentAppointment,
  UUID,
} from "./support/office-hours";
import { currentUserId, Persona, signInAs } from "./support/personas";
import { turkeyDay } from "./support/time";

// Office Hours from Menton itself: a student asks an academician for a slot, the academician accepts and later
// cancels it, and a request nobody answers expires. One journey on one database, so the steps run in order.
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const BOOKED_TOPIC = `E2E görüşme ${RUN}`;
const EXPIRING_TOPIC = `E2E cevapsız talep ${RUN}`;

type Academician = { id: string; fullName: string };
type Slot = { startsAt: string };
type Meeting = { id: string; topic: string | null; startsAt: string };
type StudentRequest = { id: string };

let academicianAccountId = "";
let studentAccountId = "";
let academicianId = "";

test("the academician opens Office Hours: listed, with weekly hours", async ({
  page,
}) => {
  await signInAs(page, Persona.AhmetOzturk);
  academicianAccountId = await currentUserId(page);

  await openOfficeHours(page.request, academicianAccountId);
});

test("the student finds the academician and asks for a slot", async ({
  page,
}) => {
  await signInAs(page, Persona.AyseYilmaz);
  studentAccountId = await currentUserId(page);
  const academicians = await asPerson<Academician[]>(
    page.request,
    "GET",
    "/api/office-hours/me/academicians",
    studentAccountId,
  );
  academicianId =
    academicians.find((one) => one.fullName === Persona.AhmetOzturk)?.id ?? "";
  expect(academicianId).toMatch(UUID);

  await page.goto("/student/office-hours");
  await expect(page.getByText(Persona.AhmetOzturk).first()).toBeVisible();

  await page.goto(`/student/office-hours/${academicianId}/book`);
  // Next week: every slot there is past the four-hour booking lead.
  await page.getByRole("button", { name: "Sonraki hafta" }).click();
  await page
    .getByRole("group", { name: "Günler" })
    .getByRole("button")
    .filter({ hasNotText: "Müsait değil" })
    .first()
    .click();
  await page
    .getByRole("group", { name: "Saatler" })
    .getByRole("button")
    .and(page.locator(":enabled"))
    .first()
    .click();
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByLabel("Görüşme konusu").fill(BOOKED_TOPIC);
  await page
    .getByLabel("Kısa açıklama (isteğe bağlı)")
    .fill("Uçtan uca test: yüksek lisans seçeneklerini konuşmak istiyorum.");
  await page.getByRole("button", { name: "Talebi gönder" }).click();

  await expect(page).toHaveURL(/\/student\/appointments/);
  await expect(
    await studentAppointment(page, "Talepler", BOOKED_TOPIC),
  ).toContainText("Onay Bekliyor");
});

test("the academician accepts it from Ana Sayfa", async ({ page }) => {
  await signInAs(page, Persona.AhmetOzturk);
  await page.goto("/academician");

  await page
    .getByRole("listitem")
    .filter({ hasText: BOOKED_TOPIC })
    .getByRole("button", { name: "Kabul et" })
    .click();

  await expect(
    page.getByText("Talep kabul edildi, randevu oluşturuldu."),
  ).toBeVisible();
});

test("the student sees the meeting confirmed", async ({ page }) => {
  await signInAs(page, Persona.AyseYilmaz);

  await expect(
    await studentAppointment(page, "Yaklaşan", BOOKED_TOPIC),
  ).toContainText("Onaylandı");
});

test("the academician cancels it from Randevularım, with a reason", async ({
  page,
}) => {
  await signInAs(page, Persona.AhmetOzturk);
  const meetings = await asPerson<Meeting[]>(
    page.request,
    "GET",
    "/api/office-hours/me/meetings",
    academicianAccountId,
  );
  const meeting = meetings.find((one) => one.topic === BOOKED_TOPIC);
  expect(meeting?.id).toMatch(UUID);

  await page.goto(
    `/academician/appointments?date=${turkeyDay(meeting!.startsAt)}&appointment=${meeting!.id}`,
  );
  await page.getByRole("button", { name: "Randevuyu iptal et" }).click();
  await page
    .getByLabel(/Öğrenciye gerekçe/)
    .fill("Bölüm toplantısı çakıştı; uçtan uca test.");
  await page.getByRole("button", { name: "İptal et", exact: true }).click();

  await expect(page.getByText("Randevu iptal edildi.")).toBeVisible();
});

test("the student sees the meeting cancelled", async ({ page }) => {
  await signInAs(page, Persona.AyseYilmaz);

  await expect(
    await studentAppointment(page, "Geçmiş", BOOKED_TOPIC),
  ).toContainText("İptal Edildi");
});

test("a request nobody answers expires and the student sees it", async ({
  page,
}) => {
  await signInAs(page, Persona.AyseYilmaz);
  const slots = await asPerson<Slot[]>(
    page.request,
    "GET",
    `/api/office-hours/me/academicians/${academicianId}/slots`,
    studentAccountId,
  );
  const late = slots.at(-1);
  expect(late).toBeDefined();
  const request = await asPerson<StudentRequest>(
    page.request,
    "POST",
    "/api/office-hours/me/requests",
    studentAccountId,
    {
      academicianId,
      startsAt: new Date(late!.startsAt).toISOString(),
      title: EXPIRING_TOPIC,
      description: "Uçtan uca test: kimse yanıtlamazsa süresi dolmalı.",
    },
  );
  expect(request.id).toMatch(UUID);

  // Waiting 72 hours is not an option: the request is made to have been sent four days ago, and the stack's
  // expiry job (every three seconds in E2E_MODE=flows) does the rest, as it would on a server.
  sql(
    `update office_hours_request set updated_at = now() - interval '4 days' where id = '${request.id}'`,
  );

  await expect(async () => {
    await expect(
      await studentAppointment(page, "Geçmiş", EXPIRING_TOPIC),
    ).toContainText("Süresi Doldu", {
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
});
