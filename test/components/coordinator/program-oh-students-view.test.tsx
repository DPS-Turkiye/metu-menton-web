import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramStudentsView } from "@/components/coordinator/program-students-view";
import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { ProgramType } from "@/interfaces/program";
import {
  getCoordinatorProgram,
  getCoordinatorPrograms,
} from "@/lib/client/coordinator-programs";
import { getProgramOfficeHoursStudents } from "@/lib/client/program-office-hours";
import {
  coordinatorProgram,
  coordinatorProgramDetail,
} from "@test/fixtures/coordinator-programs";
import {
  programStudents,
  studentRow,
} from "@test/fixtures/program-office-hours";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/coordinator/programs/oh-1/students",
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
  getProgramOfficeHoursStudents: vi.fn(),
}));
vi.mock("@/components/coordinator/peer-participants-view", () => ({
  PeerParticipantsView: () => <p>Akran programı öğrencileri</p>,
}));

function program(type: ProgramType) {
  return coordinatorProgramDetail({
    program: coordinatorProgram({
      id: "oh-1",
      name: "ODTÜ Office Hours",
      type,
      lifecycle: ProgramLifecycle.Active,
    }),
  });
}

describe("Katılımcılar › Öğrenciler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      program(ProgramType.OfficeHours),
    );
    vi.mocked(getCoordinatorPrograms).mockResolvedValue([]);
    vi.mocked(getProgramOfficeHoursStudents).mockResolvedValue(
      programStudents([
        studentRow(),
        studentRow({
          id: "ohu-2",
          student: { name: "Berk Özkan", title: null, department: null },
          classYear: null,
          requests: {
            awaitingDecision: 0,
            alternativeProposed: 0,
            accepted: 0,
            declined: 1,
            withdrawn: 0,
          },
          academicians: 1,
        }),
      ]),
    );
  });

  it("lists who asked an Office Hours program's academicians and how their requests stand", async () => {
    renderWithQueryClient(<ProgramStudentsView programId="oh-1" />);

    const table = await screen.findByRole("table", { name: "Öğrenciler" });
    const [ayse, berk] = within(table).getAllByRole("row").slice(1);
    expect(ayse).toHaveTextContent("Ayşe Yılmaz");
    expect(ayse).toHaveTextContent("Endüstri Mühendisliği · 4");
    expect(within(ayse!).getByText("2 onay bekliyor")).toBeInTheDocument();
    expect(within(ayse!).getByText("1 alternatif saat")).toBeInTheDocument();
    expect(within(ayse!).getByText("3 onaylandı")).toBeInTheDocument();
    expect(within(ayse!).queryByText(/reddedildi/)).not.toBeInTheDocument();
    expect(ayse).toHaveTextContent("10 Kas");
    expect(berk).toHaveTextContent("—");
    expect(within(berk!).getByText("1 reddedildi")).toBeInTheDocument();
    expect(
      screen.getByText(/Talep başlıkları ve açıklamaları burada görünmez/),
    ).toBeInTheDocument();
  });

  it("narrows to students with a request awaiting a decision and by faculty", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ProgramStudentsView programId="oh-1" />);
    await screen.findByRole("table", { name: "Öğrenciler" });

    await user.click(
      screen.getByRole("button", { name: "Onay bekleyen talebi var" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Fakülte" }),
      "Mühendislik Fakültesi",
    );

    expect(getProgramOfficeHoursStudents).toHaveBeenLastCalledWith("oh-1", {
      search: null,
      faculty: "Mühendislik Fakültesi",
      awaitingOnly: true,
      page: 0,
      size: 25,
    });
  });

  it("says so when nobody matches", async () => {
    vi.mocked(getProgramOfficeHoursStudents).mockResolvedValue(
      programStudents([]),
    );
    renderWithQueryClient(<ProgramStudentsView programId="oh-1" />);

    expect(
      await screen.findByText("Son altı ayda bu filtrelere uyan öğrenci yok."),
    ).toBeInTheDocument();
  });

  it("keeps a peer program's Öğrenciler on its roster", async () => {
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      program(ProgramType.PeerMentoring),
    );
    renderWithQueryClient(<ProgramStudentsView programId="oh-1" />);

    expect(
      await screen.findByText("Akran programı öğrencileri"),
    ).toBeInTheDocument();
    expect(getProgramOfficeHoursStudents).not.toHaveBeenCalled();
  });
});
