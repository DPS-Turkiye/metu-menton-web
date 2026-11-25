import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeHoursBookingView } from "@/components/student/office-hours-booking-view";
import { AppointmentStatus } from "@/interfaces/appointment";
import { resetStudentOfficeHoursSample } from "@/lib/client/fixtures/student-office-hours-store";
import { fetchInstitutionRecord } from "@/lib/client/institution";
import {
  getOfficeHoursSlots,
  getStudentOfficeHoursAppointments,
} from "@/lib/client/student-office-hours";
import { STUDENT_RECORD } from "@test/fixtures/student-home";
import { renderWithQueryClient } from "@test/test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock(
  "@/lib/client/student-office-hours",
  async () => await import("@test/fixtures/student-office-hours-client"),
);
vi.mock("@/lib/client/institution", () => ({
  fetchInstitutionRecord: vi.fn(),
  fetchInstitutionAdvisees: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Monday 9 November 2026, 08:00: the sample week is all ahead.
  vi.setSystemTime(new Date(2026, 10, 9, 8));
  vi.mocked(fetchInstitutionRecord)
    .mockReset()
    .mockResolvedValue(STUDENT_RECORD);
  push.mockReset();
  resetStudentOfficeHoursSample();
});

afterEach(() => {
  vi.useRealTimers();
});

async function pickFirstFreeTime() {
  const times = await screen.findByRole("group", { name: "Saatler" });
  const free = within(times)
    .getAllByRole("button")
    .find((button) => !button.hasAttribute("disabled"));
  expect(free).toBeDefined();
  if (free) await userEvent.click(free);
}

describe("OfficeHoursBookingView", () => {
  it("shows the academician and the week's days with their free counts", async () => {
    renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Gün ve saat seç" }),
    ).toBeVisible();
    expect(await screen.findByText("Prof. Dr. Ahmet Kaya")).toBeVisible();
    const days = await screen.findByRole("group", { name: "Günler" });
    expect(within(days).getAllByRole("button")).toHaveLength(5);
    expect(within(days).getByRole("button", { name: /Pzt/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Devam et" })).toBeDisabled();
  });

  it("asks only for the title before sending (Konu boş); the description is optional", async () => {
    const { container } = renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    await pickFirstFreeTime();
    expect(
      container.querySelector('[data-tour="office-hours-continue"]'),
    ).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));

    const form = screen.getByRole("form");
    expect(
      within(form).getByRole("heading", { name: "Randevu talebi" }),
    ).toHaveFocus();
    expect(
      form.querySelector('[data-tour="appointment-request-submit"]'),
    ).not.toBeNull();
    await userEvent.click(
      within(form).getByRole("button", { name: "Talebi gönder" }),
    );
    expect(within(form).getByText("Görüşme konusunu yaz.")).toBeVisible();
    const description = within(form).getByLabelText(
      "Kısa açıklama (isteğe bağlı)",
    );
    expect(description).not.toHaveAttribute("aria-required");
    expect(description).not.toHaveAttribute("aria-invalid");
    expect(push).not.toHaveBeenCalled();
  });

  it("sends a request without a description", async () => {
    renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    await pickFirstFreeTime();
    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));
    const form = screen.getByRole("form");
    await userEvent.type(
      within(form).getByLabelText(/Görüşme konusu/),
      "Yüksek lisans",
    );
    await userEvent.click(
      within(form).getByRole("button", { name: "Talebi gönder" }),
    );

    await waitFor(() => expect(push).toHaveBeenCalled());
    const sent = (await getStudentOfficeHoursAppointments()).filter(
      (item) => item.status === AppointmentStatus.Pending,
    );
    expect(sent.map((item) => item.topic)).toEqual(["Yüksek lisans"]);
  });

  it("sends the request and opens Randevularım with the sent banner", async () => {
    renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    await pickFirstFreeTime();
    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));
    const form = screen.getByRole("form");
    await userEvent.type(
      within(form).getByLabelText(/Görüşme konusu/),
      "CV ve yüksek lisans seçenekleri",
    );
    await userEvent.type(
      within(form).getByLabelText(/Kısa açıklama/),
      "Staj başvurusu için CV'mi değerlendirmek istiyorum.",
    );
    await userEvent.click(
      within(form).getByRole("button", { name: "Talebi gönder" }),
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/student/appointments?sent=${encodeURIComponent("Prof. Dr. Ahmet Kaya")}`,
      ),
    );
    const sent = (await getStudentOfficeHoursAppointments()).filter(
      (item) => item.status === AppointmentStatus.Pending,
    );
    expect(sent.map((item) => item.topic)).toEqual([
      "CV ve yüksek lisans seçenekleri",
    ]);
  });

  it("pages to the next week and drops the request with Vazgeç", async () => {
    renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    expect(await screen.findByText("9 – 13 Kasım 2026")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Sonraki hafta" }),
    );
    expect(screen.getByText("16 – 20 Kasım 2026")).toBeVisible();

    await pickFirstFreeTime();
    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));
    await userEvent.type(screen.getByLabelText(/Görüşme konusu/), "Yarım");
    await userEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByRole("form")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));
    expect(screen.getByLabelText(/Görüşme konusu/)).toHaveValue("");
  });

  it("keeps what is written when the time is changed", async () => {
    renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    await pickFirstFreeTime();
    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));
    await userEvent.type(screen.getByLabelText(/Görüşme konusu/), "Yarım");
    await userEvent.click(
      screen.getByRole("button", { name: "Saati değiştir" }),
    );
    expect(screen.queryByRole("form")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Gün ve saat seç" }),
    ).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Devam et" }));
    expect(screen.getByLabelText(/Görüşme konusu/)).toHaveValue("Yarım");
  });

  it("opens on the time picked on the profile", async () => {
    const [free] = (
      await getOfficeHoursSlots(
        "sample-academician-kaya",
        new Date(2026, 10, 16),
        5,
      )
    ).filter((slot) => slot.available);
    renderWithQueryClient(
      <OfficeHoursBookingView
        academicianId="sample-academician-kaya"
        slot={free?.startsAt ?? null}
      />,
    );
    expect(await screen.findByText("16 – 20 Kasım 2026")).toBeVisible();
    const times = await screen.findByRole("group", { name: "Saatler" });
    expect(within(times).getByRole("button", { pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Devam et" })).toBeEnabled();
  });

  it("ignores a time in the link that is past or not a time", async () => {
    const { unmount } = renderWithQueryClient(
      <OfficeHoursBookingView
        academicianId="sample-academician-kaya"
        slot="2026-11-02T07:00:00.000Z"
      />,
    );
    expect(await screen.findByText("9 – 13 Kasım 2026")).toBeVisible();
    expect(screen.getByRole("button", { name: "Devam et" })).toBeDisabled();
    unmount();

    renderWithQueryClient(
      <OfficeHoursBookingView
        academicianId="sample-academician-kaya"
        slot="yarın"
      />,
    );
    expect(await screen.findByText("9 – 13 Kasım 2026")).toBeVisible();
  });

  it("cannot go back before the first bookable week, and opens on Monday at the weekend", async () => {
    vi.setSystemTime(new Date(2026, 10, 14, 10));
    renderWithQueryClient(
      <OfficeHoursBookingView academicianId="sample-academician-kaya" />,
    );
    expect(await screen.findByText("16 – 20 Kasım 2026")).toBeVisible();
    expect(screen.getByRole("button", { name: "Önceki hafta" })).toBeDisabled();
  });

  it("books the advisor from the institutional record", async () => {
    renderWithQueryClient(<OfficeHoursBookingView academicianId="advisor" />);
    expect(await screen.findByText("Doç. Dr. Elif Şahin")).toBeVisible();
  });

  it("says so for an unknown academician", async () => {
    renderWithQueryClient(<OfficeHoursBookingView academicianId="nobody" />);
    expect(await screen.findByText("Bu akademisyen bulunamadı.")).toBeVisible();
  });
});
