import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { asPerson } from "./backend";
import { nextWednesday, turkeyClock, turkeyDay } from "./time";

export const UUID = /^[0-9a-f-]{36}$/;

export type TimeRange = { startsAt: string; endsAt: string };

const EVERY_DAY = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/** The academician listed, with 30-minute slots from 09:00 to 17:00 every day, so any day of a run finds slots. */
export async function openOfficeHours(
  request: APIRequestContext,
  academicianAccount: string,
) {
  await asPerson(
    request,
    "PUT",
    "/api/office-hours/me/profile",
    academicianAccount,
    {
      listed: true,
      defaultPlace: "MM-206",
      onlineLink: null,
      contactEmail: null,
    },
  );
  await asPerson(
    request,
    "PUT",
    "/api/office-hours/me/availability",
    academicianAccount,
    {
      rules: EVERY_DAY.map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        slotMinutes: 30,
      })),
      exceptions: [],
      studentCapacity: null,
      defaultMeetingDurationMinutes: 30,
      meetingBufferMinutes: 0,
    },
  );
}

/**
 * A request the student sends for next Wednesday's first free time from 10:00, as the precondition of a journey.
 * Slots other requests hold are not offered, so each journey gets a time of its own.
 */
export async function requestNextWednesday(
  request: APIRequestContext,
  studentAccount: string,
  academicianId: string,
  topic: string,
): Promise<TimeRange & { id: string }> {
  const slots = await asPerson<TimeRange[]>(
    request,
    "GET",
    `/api/office-hours/me/academicians/${academicianId}/slots`,
    studentAccount,
  );
  const day = nextWednesday();
  const slot = slots.find(
    (one) =>
      turkeyDay(one.startsAt) === day && turkeyClock(one.startsAt) >= "10:00",
  );
  expect(slot, `a free time on ${day} from 10:00`).toBeDefined();
  const startsAt = slot?.startsAt ?? "";
  const sent = await asPerson<{ id: string }>(
    request,
    "POST",
    "/api/office-hours/me/requests",
    studentAccount,
    {
      academicianId,
      startsAt: new Date(startsAt).toISOString(),
      title: topic,
      description: "Uçtan uca test.",
    },
  );
  expect(sent.id).toMatch(UUID);
  return { id: sent.id, startsAt, endsAt: slot?.endsAt ?? "" };
}

/** The student's row for a topic on one tab of Randevularım. */
export async function studentAppointment(
  page: Page,
  tab: "Yaklaşan" | "Talepler" | "Geçmiş",
  topic: string,
) {
  await page.goto("/student/appointments");
  await page.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
  return page
    .getByRole("tabpanel")
    .getByRole("listitem")
    .filter({ hasText: topic });
}
