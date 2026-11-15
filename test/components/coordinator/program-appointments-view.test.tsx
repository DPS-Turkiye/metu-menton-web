import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramAppointmentsView } from "@/components/coordinator/program-appointments-view";
import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import { ProgramType } from "@/interfaces/program";
import {
  getCoordinatorProgram,
  getCoordinatorPrograms,
} from "@/lib/client/coordinator-programs";
import {
  getProgramOfficeHoursAppointment,
  getProgramOfficeHoursAppointments,
} from "@/lib/client/program-office-hours";
import {
  coordinatorProgram,
  coordinatorProgramDetail,
} from "@test/fixtures/coordinator-programs";
import {
  appointmentDetail,
  appointmentRow,
  programAppointments,
} from "@test/fixtures/program-office-hours";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/coordinator/programs/oh-1/appointments",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Odtu };
});
vi.mock("@/lib/client/coordinator-programs", () => ({
  getCoordinatorProgram: vi.fn(),
  getCoordinatorPrograms: vi.fn(async () => []),
  getProgramTeams: vi.fn(async () => []),
  launchCoordinatorProgram: vi.fn(),
}));
vi.mock("@/lib/client/program-office-hours", () => ({
  getProgramOfficeHoursAppointments: vi.fn(),
  getProgramOfficeHoursAppointment: vi.fn(),
}));

describe("Office Hours Randevular", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      coordinatorProgramDetail({
        program: coordinatorProgram({
          id: "oh-1",
          name: "ODTÜ Office Hours",
          type: ProgramType.OfficeHours,
          lifecycle: ProgramLifecycle.Active,
        }),
      }),
    );
    vi.mocked(getCoordinatorPrograms).mockResolvedValue([]);
    vi.mocked(getProgramOfficeHoursAppointments).mockResolvedValue(
      programAppointments([
        appointmentRow(),
        appointmentRow({
          id: "req-2",
          status: OfficeHoursRequestStatus.Declined,
          topic: "Araştırma projesine katılım",
          startsAt: null,
          student: { name: "Berk Özkan", title: null, department: null },
          academic: { name: "Zeynep Aydın", title: null, department: null },
        }),
      ]),
    );
  });

  it("shows the cards, the open count on the tab and each appointment's people, time and status", async () => {
    renderWithQueryClient(<ProgramAppointmentsView programId="oh-1" />);

    const table = await screen.findByRole("table", { name: "Randevular" });
    const [first, second] = within(table).getAllByRole("row").slice(1);
    expect(first).toHaveTextContent("Ayşe Yılmaz");
    expect(first).toHaveTextContent("Prof. Dr. Ahmet Kaya");
    expect(first).toHaveTextContent("13 Kas · 10:30");
    expect(first).toHaveTextContent("Alternatif Saat Önerildi");
    expect(first).toHaveTextContent("CV ve yüksek lisans seçenekleri");
    expect(second).toHaveTextContent("Zeynep Aydın");
    expect(second).toHaveTextContent("—");
    expect(second).toHaveTextContent("Reddedildi");

    expect(screen.getByText("Onaylandı · bu hafta")).toBeInTheDocument();
    expect(screen.getByText("214")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Randevular/ })).toHaveTextContent(
      "86",
    );
    expect(
      screen.getByText(/açıklama öğrenci ile akademisyen arasındadır/),
    ).toBeInTheDocument();
  });

  it("filters by status and faculty and leaves this week", async () => {
    renderWithQueryClient(<ProgramAppointmentsView programId="oh-1" />);
    await screen.findByRole("table", { name: "Randevular" });

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Durum" }),
      "PENDING",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Fakülte" }),
      "Fen-Edebiyat Fakültesi",
    );
    await userEvent.click(screen.getByRole("button", { name: "Bu hafta" }));

    expect(screen.getByRole("button", { name: "Bu hafta" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(getProgramOfficeHoursAppointments).toHaveBeenLastCalledWith(
      "oh-1",
      expect.objectContaining({
        status: OfficeHoursRequestStatus.Pending,
        faculty: "Fen-Edebiyat Fakültesi",
        from: null,
        to: null,
      }),
    );
  });

  it("says so when a later load fails", async () => {
    renderWithQueryClient(<ProgramAppointmentsView programId="oh-1" />);
    await screen.findByRole("table", { name: "Randevular" });
    vi.mocked(getProgramOfficeHoursAppointments).mockRejectedValue(
      new Error("Randevular yüklenemedi."),
    );

    await userEvent.click(screen.getByRole("button", { name: "Bu hafta" }));

    expect(
      await screen.findByText("Randevular yüklenemedi."),
    ).toBeInTheDocument();
  });

  it("opens a row's details in the drawer and closes it again", async () => {
    vi.mocked(getProgramOfficeHoursAppointment).mockResolvedValue(
      appointmentDetail(),
    );
    renderWithQueryClient(<ProgramAppointmentsView programId="oh-1" />);
    await screen.findByRole("table", { name: "Randevular" });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Ayşe Yılmaz: CV ve yüksek lisans seçenekleri randevusunun ayrıntıları",
      }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Randevu detayı" }),
    ).toBeInTheDocument();
    expect(getProgramOfficeHoursAppointment).toHaveBeenCalledWith(
      "oh-1",
      "req-1",
    );
    await userEvent.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Randevu detayı" }),
    ).not.toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    vi.mocked(getProgramOfficeHoursAppointments).mockResolvedValue(
      programAppointments([]),
    );
    renderWithQueryClient(<ProgramAppointmentsView programId="oh-1" />);

    expect(
      await screen.findByText("Bu filtrelere uyan randevu yok."),
    ).toBeInTheDocument();
  });

  it("pages through a long list", async () => {
    vi.mocked(getProgramOfficeHoursAppointments).mockResolvedValue(
      programAppointments([appointmentRow()], 3),
    );
    renderWithQueryClient(<ProgramAppointmentsView programId="oh-1" />);
    await screen.findByRole("table", { name: "Randevular" });

    await userEvent.click(screen.getByRole("button", { name: /Sonraki/ }));

    expect(getProgramOfficeHoursAppointments).toHaveBeenLastCalledWith(
      "oh-1",
      expect.objectContaining({ page: 1 }),
    );
  });
});
