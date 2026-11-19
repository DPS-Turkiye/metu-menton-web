import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OdtuProgramWizardView } from "@/components/admin/odtu-program-wizard-view";
import { useAdminOverview } from "@/hooks/use-admin-overview";
import type { AdminOverview, AdminUser } from "@/interfaces/admin-overview";
import { ProgramStatus, ProgramType } from "@/interfaces/program";
import { UserAccountStatus, UserRole } from "@/interfaces/session";
import { createCoordinatorProgram } from "@/lib/client/coordinator-programs";
import { adminProgram } from "@test/fixtures/admin-programs";
import { coordinatorProgramDetail } from "@test/fixtures/coordinator-programs";
import { renderWithQueryClient } from "@test/test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin/programs/new",
}));
vi.mock("@/lib/client/coordinator-programs", () => ({
  createCoordinatorProgram: vi.fn(),
}));
vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Odtu };
});
vi.mock("@/hooks/use-admin-overview", async (actual) => ({
  ...(await actual<typeof import("@/hooks/use-admin-overview")>()),
  useAdminOverview: vi.fn(),
}));

function coordinator(
  id: string,
  fullName: string,
  status = UserAccountStatus.Approved,
): AdminUser {
  return {
    id,
    email: `${id}@metu.test`,
    fullName,
    role: UserRole.Coordinator,
    status,
    organizationId: null,
    organizationName: null,
    jobTitle: null,
  };
}

const overview: AdminOverview = {
  programs: [
    adminProgram({
      id: "p1",
      name: "Akran 2026 Güz",
      coordinatorIds: ["selin", "sevgi"],
    }),
    adminProgram({
      id: "p2",
      name: "NATO DIANA 2026",
      coordinatorIds: ["selin", "sevgi"],
    }),
    adminProgram({ id: "p3", name: "Office Hours", coordinatorIds: ["sevgi"] }),
    adminProgram({
      id: "p4",
      name: "Akran 2025",
      status: ProgramStatus.Completed,
      coordinatorIds: ["selin"],
    }),
  ],
  users: [
    coordinator("selin", "Selin Er"),
    coordinator("sevgi", "Sevgi Öztürk"),
    coordinator("serkan", "Serkan Kaya"),
    coordinator("bekleyen", "Bekleyen Kişi", UserAccountStatus.Pending),
  ],
  mentorships: [],
  requests: [],
  bottlenecks: [],
  meetingsLast8Weeks: 0,
};

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: /Akran Mentörlüğü/ }));
  await user.click(screen.getByRole("button", { name: "Devam Et" }));
  await user.type(
    screen.getByRole("textbox", { name: /Program adı/ }),
    "Kariyer Akran Mentörlüğü 2027",
  );
}

describe("ODTÜ Yeni Program Oluştur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminOverview).mockReturnValue({
      data: overview,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAdminOverview>);
  });

  it("offers only the ODTÜ program types, each with what it includes", () => {
    renderWithQueryClient(<OdtuProgramWizardView />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(screen.queryByText("Girişim Mentörlüğü")).not.toBeInTheDocument();
    const peer = screen.getByRole("radio", { name: /Akran Mentörlüğü/ });
    expect(peer).not.toBeChecked();
    const card = peer.closest("label");
    if (!card) throw new Error("the radio sits in its card");
    expect(
      within(card).getByText("Aktif mentorluk kategorileri"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vazgeç" })).toHaveAttribute(
      "href",
      "/admin/programs",
    );
  });

  it("asks for a type, then a name, before moving on", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramWizardView />);

    await user.click(screen.getByRole("button", { name: "Devam Et" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bir program türü seç.",
    );

    await user.click(screen.getByRole("radio", { name: /Office Hours/ }));
    expect(screen.getByRole("radio", { name: /Office Hours/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Devam Et" }));
    expect(
      screen.getByRole("heading", { name: "Program bilgileri" }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Devam Et" }));
    const name = screen.getByRole("textbox", { name: /Program adı/ });
    expect(name).toBeInvalid();
    expect(name).toHaveAccessibleDescription("Program adını yaz.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("moves between the types with the arrow keys", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramWizardView />);

    await user.click(screen.getByRole("radio", { name: /Akran Mentörlüğü/ }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: /Office Hours/ })).toBeChecked();
  });

  it("points the end date at its problem when it comes before the start", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramWizardView />);
    await fillDetails(user);

    fireEvent.change(screen.getByLabelText("Başlangıç"), {
      target: { value: "2027-06-30" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş"), {
      target: { value: "2027-02-01" },
    });
    await user.click(screen.getByRole("button", { name: "Devam Et" }));

    expect(screen.getByLabelText("Bitiş")).toHaveAccessibleDescription(
      "Bitiş tarihi başlangıçtan önce olamaz.",
    );
  });

  it("counts the description against the limit and explains who sets the terms", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramWizardView />);
    await fillDetails(user);

    await user.type(
      screen.getByRole("textbox", { name: "Kısa açıklama" }),
      "Staj",
    );

    expect(screen.getByText(/4 \/ 500/)).toBeInTheDocument();
    expect(
      screen.getByText("Koşulları koordinatör belirler"),
    ).toBeInTheDocument();
  });

  it("lists approved coordinators with their running programs and load, and picks by name", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramWizardView />);
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "Devam Et" }));

    expect(
      screen.getByText("3 sonuç · Onaylı koordinatörler"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Bekleyen Kişi")).not.toBeInTheDocument();
    const sevgi = screen.getByRole("checkbox", { name: /Sevgi Öztürk/ });
    expect(within(sevgi).getByText("Yoğun")).toBeInTheDocument();
    const selin = screen.getByRole("checkbox", { name: /Selin Er/ });
    expect(
      within(selin).getByText("2 program · Akran 2026 Güz, NATO DIANA 2026"),
    ).toBeInTheDocument();
    expect(within(selin).getByText("Yük uygun")).toBeInTheDocument();
    expect(
      within(screen.getByRole("checkbox", { name: /Serkan Kaya/ })).getByText(
        "Şu an programı yok",
      ),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Koordinatör ara" }),
      "SEL",
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);

    await user.click(screen.getByRole("checkbox", { name: /Selin Er/ }));
    expect(screen.getByRole("checkbox", { name: /Selin Er/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const chosen = screen.getByRole("region", { name: "Seçilen koordinatör" });
    expect(within(chosen).getByText("Selin Er")).toBeInTheDocument();

    await user.click(
      within(chosen).getByRole("button", { name: "Selin Er seçimini kaldır" }),
    );
    expect(
      within(chosen).getByText("Henüz koordinatör seçilmedi."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Devam Et" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "En az bir koordinatör ekle.",
    );
  });

  it("sums up the draft and saves it", async () => {
    const user = userEvent.setup();
    vi.mocked(createCoordinatorProgram).mockResolvedValue(
      coordinatorProgramDetail(),
    );
    renderWithQueryClient(<OdtuProgramWizardView />);
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "Devam Et" }));
    await user.click(screen.getByRole("checkbox", { name: /Serkan Kaya/ }));
    await user.click(screen.getByRole("button", { name: "Devam Et" }));

    expect(
      screen.getByText("Kariyer Akran Mentörlüğü 2027"),
    ).toBeInTheDocument();
    expect(screen.getByText("Kaydedildiğinde: Taslak")).toBeInTheDocument();
    expect(screen.getByText("Belirtilmedi")).toBeInTheDocument();
    expect(
      screen.getByText(/koordinatörün \(Serkan Kaya\) Programlarım listesinde/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(createCoordinatorProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ProgramType.PeerMentoring,
        name: "Kariyer Akran Mentörlüğü 2027",
        coordinatorIds: ["serkan"],
      }),
    );
  });

  it("says so while the coordinators load", async () => {
    const user = userEvent.setup();
    vi.mocked(useAdminOverview).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useAdminOverview>);
    renderWithQueryClient(<OdtuProgramWizardView />);
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "Devam Et" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Koordinatörler yükleniyor…",
    );
  });
});
