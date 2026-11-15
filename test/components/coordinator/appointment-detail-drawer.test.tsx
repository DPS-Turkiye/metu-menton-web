import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppointmentDetailDrawer } from "@/components/coordinator/appointment-detail-drawer";
import { OfficeHoursHistoryStep } from "@/interfaces/program-office-hours";
import { getProgramOfficeHoursAppointment } from "@/lib/client/program-office-hours";
import { appointmentDetail } from "@test/fixtures/program-office-hours";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/program-office-hours", () => ({
  getProgramOfficeHoursAppointment: vi.fn(),
}));

describe("Randevu detayı drawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProgramOfficeHoursAppointment).mockResolvedValue(
      appointmentDetail(),
    );
  });

  it("shows the title, the time, the two people, the history and that the description is private", async () => {
    renderWithQueryClient(
      <AppointmentDetailDrawer
        programId="oh-1"
        requestId="req-1"
        onClose={vi.fn()}
      />,
    );

    const drawer = await screen.findByRole("dialog", {
      name: "Randevu detayı",
    });
    expect(
      await within(drawer).findByText("CV ve yüksek lisans seçenekleri"),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByText("Alternatif Saat Önerildi"),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("13 Kasım 2026 Cuma")).toBeInTheDocument();
    expect(within(drawer).getByText("10:30 – 11:00")).toBeInTheDocument();
    expect(
      within(drawer).getByText("Öğrenci · Endüstri Mühendisliği"),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByText("Prof. Dr. Ahmet Kaya"),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByText("Akademisyen · Bilgisayar Mühendisliği"),
    ).toBeInTheDocument();
    const history = within(drawer).getAllByRole("listitem");
    expect(history.map((item) => item.textContent)).toEqual([
      "Talep gönderildi10 Kas · 16:20",
      "Alternatif saat önerildi11 Kas · 09:05",
    ]);
    expect(within(drawer).getByText("Açıklama gizli")).toBeInTheDocument();
    expect(getProgramOfficeHoursAppointment).toHaveBeenCalledWith(
      "oh-1",
      "req-1",
    );
  });

  it("names a participant by role alone without a department, and a step without a time", async () => {
    vi.mocked(getProgramOfficeHoursAppointment).mockResolvedValue(
      appointmentDetail({
        startsAt: null,
        endsAt: null,
        student: { name: "Berk Özkan", title: null, department: null },
        history: [
          { step: OfficeHoursHistoryStep.AlternativeProposed, at: null },
        ],
      }),
    );
    renderWithQueryClient(
      <AppointmentDetailDrawer
        programId="oh-1"
        requestId="req-1"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Berk Özkan")).toBeInTheDocument();
    expect(screen.getByText("Öğrenci")).toBeInTheDocument();
    expect(screen.queryByText("Tarih")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(
      /^Alternatif saat önerildi$/,
    );
  });

  it("closes from its button and says so when the appointment cannot be loaded", async () => {
    const onClose = vi.fn();
    vi.mocked(getProgramOfficeHoursAppointment).mockRejectedValue(
      new Error("Randevu yüklenemedi."),
    );
    renderWithQueryClient(
      <AppointmentDetailDrawer
        programId="oh-1"
        requestId="req-1"
        onClose={onClose}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Randevu yüklenemedi.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
