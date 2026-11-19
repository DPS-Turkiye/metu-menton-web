import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurWorkspaceView } from "@/components/coordinator/iskur-workspace-view";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import {
  getIskurApplications,
  replaceIskurUnitSkills,
} from "@/lib/client/iskur-onboarding";
import {
  createDefaultIskurStructure,
  createIskurTeam,
  createIskurUnit,
  deleteIskurTeam,
  deleteIskurUnit,
  finalizeIskurPlacements,
  getIskurWorkspace,
  placeIskurIntern,
  unplaceIskurIntern,
  updateIskurTeam,
  updateIskurUnit,
} from "@/lib/client/iskur-workspace";
import { applications, KREATIF } from "@test/fixtures/iskur-onboarding";
import { iskurWorkspace } from "@test/fixtures/iskur-workspace";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/components/coordinator/program-detail-frame", () => ({
  ProgramDetailFrame: ({
    children,
  }: {
    children: (detail: unknown) => ReactNode;
  }) => <>{children({})}</>,
}));
vi.mock("@/lib/client/iskur-workspace", () => ({
  createDefaultIskurStructure: vi.fn(),
  createIskurTeam: vi.fn(),
  createIskurUnit: vi.fn(),
  deleteIskurTeam: vi.fn(),
  deleteIskurUnit: vi.fn(),
  finalizeIskurPlacements: vi.fn(),
  getIskurWorkspace: vi.fn(),
  placeIskurIntern: vi.fn(),
  unplaceIskurIntern: vi.fn(),
  updateIskurTeam: vi.fn(),
  updateIskurUnit: vi.fn(),
}));

vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurApplications: vi.fn(),
  replaceIskurUnitSkills: vi.fn(),
  iskurApplicationDocumentHref: (
    programId: string,
    userId: string,
    slot: string,
  ) => `/files/${programId}/${userId}/${slot}`,
}));

const workspace = iskurWorkspace();
const noForms = { ...applications(), applications: [], drafts: 0 };

/** Deniz from the pool has sent the onboarding form. */
function denizSent() {
  const base = applications();
  const [form] = base.applications;
  if (!form) throw new Error("fixture has no application");
  return {
    ...base,
    applications: [{ ...form, userId: "u-pool", fullName: "Deniz Arslan" }],
  };
}

async function renderView() {
  renderWithQueryClient(<IskurWorkspaceView programId="p1" />);
  await screen.findByRole("heading", { name: "Kreatif ve Dijital Üretim" });
}

describe("IskurWorkspaceView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurWorkspace).mockResolvedValue(workspace);
    vi.mocked(getIskurApplications).mockResolvedValue(noForms);
    for (const change of [
      createDefaultIskurStructure,
      createIskurTeam,
      createIskurUnit,
      deleteIskurTeam,
      deleteIskurUnit,
      finalizeIskurPlacements,
      placeIskurIntern,
      unplaceIskurIntern,
      updateIskurTeam,
      updateIskurUnit,
    ]) {
      vi.mocked(change).mockResolvedValue(workspace);
    }
  });

  it("shows units, teams with leaders and sub-groups, warnings and the unplaced pool", async () => {
    await renderView();

    expect(
      screen.getByText("3 stajyer · 2 yerleştirildi · 1 kesinleşti · 1 lider"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Birim koordinatörü: Selin Er"),
    ).toBeInTheDocument();
    const media = screen.getByRole("region", {
      name: /^Medya ve Kreatif Üretim/,
    });
    expect(
      within(media).getByText("Medya ve Kreatif Üretim · 2/9 kişi"),
    ).toBeInTheDocument();
    expect(within(media).getByText("Ekip 9 kişi değil")).toBeInTheDocument();
    expect(within(media).getByText("Ekip lideri")).toBeInTheDocument();
    expect(
      within(media).getByText("Üye · lideri Ayşe Yıldız"),
    ).toBeInTheDocument();
    expect(within(media).getByText("Geçici")).toBeInTheDocument();
    expect(within(media).getByText("Kesin")).toBeInTheDocument();
    expect(
      within(media).getByText("3 gün · 6 sa mentörlük · 16,5 sa ekip"),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: /^Dijital Dönüşüm ve Teknoloji/ }),
      ).getByText("Bu ekipte henüz kimse yok."),
    ).toBeInTheDocument();
    expect(screen.getByText("Yerleştirilmemiş (1)")).toBeInTheDocument();
    expect(
      screen.getByText("Endüstri Mühendisliği · İŞKUR"),
    ).toBeInTheDocument();
  });

  it("places someone from the pool as a leader with their own mentoring time", async () => {
    const user = userEvent.setup();
    await renderView();

    await user.click(
      screen.getByRole("button", { name: "Deniz Arslan kişisini yerleştir" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(
      within(dialog).getByLabelText("Ekip"),
      "Dijital Dönüşüm ve Teknoloji",
    );
    await user.click(within(dialog).getByLabelText("Ekip lideri"));
    expect(within(dialog).queryByLabelText("Bağlı olduğu lider")).toBeNull();
    await user.type(
      within(dialog).getByLabelText("Haftalık mentörlük süresi (saat)"),
      "1,5",
    );
    expect(
      within(dialog).getByText(
        "Mentörlük süresi için önce görev günü sayısını seç.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Kaydet" }),
    ).toBeDisabled();
    await user.selectOptions(
      within(dialog).getByLabelText("Haftalık görev günü"),
      "3 gün",
    );
    expect(
      within(dialog).getByPlaceholderText("Varsayılan: 6 sa"),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));

    expect(placeIskurIntern).toHaveBeenCalledWith("p1", "u-pool", {
      teamId: "t2",
      role: IskurTeamRole.Leader,
      leaderId: null,
      weeklyDays: 3,
      mentoringMinutes: 90,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("edits a member under another leader choice, or takes them out", async () => {
    const user = userEvent.setup();
    await renderView();

    await user.click(
      screen.getByRole("button", { name: "Burak Tan yerleşimini düzenle" }),
    );
    let dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByLabelText("Haftalık mentörlük süresi (saat)"),
    ).toHaveValue("0");
    await user.selectOptions(
      within(dialog).getByLabelText("Bağlı olduğu lider"),
      "Lider seçilmedi",
    );
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(placeIskurIntern).toHaveBeenCalledWith("p1", "u-member", {
      teamId: "t1",
      role: IskurTeamRole.Member,
      leaderId: null,
      weeklyDays: 2,
      mentoringMinutes: 0,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(
      screen.getByRole("button", { name: "Burak Tan yerleşimini düzenle" }),
    );
    dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Yerleştirmeyi kaldır" }),
    );
    expect(unplaceIskurIntern).toHaveBeenCalledWith("p1", "u-member");
  });

  it("adds and edits units and teams", async () => {
    const user = userEvent.setup();
    await renderView();

    await user.click(screen.getByRole("button", { name: "Birim ekle" }));
    let dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "Kaydet" }),
    ).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText("Ad"),
      "Etki ve Organizasyon",
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Birim koordinatörü"),
      "Kaan Yurt",
    );
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(createIskurUnit).toHaveBeenCalledWith("p1", {
      name: "Etki ve Organizasyon",
      coordinatorId: "c2",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByLabelText("Ad"));
    await user.type(within(dialog).getByLabelText("Ad"), "Kreatif");
    await user.selectOptions(
      within(dialog).getByLabelText("Birim koordinatörü"),
      "Birim koordinatörü yok",
    );
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(updateIskurUnit).toHaveBeenCalledWith("p1", "unit1", {
      name: "Kreatif",
      coordinatorId: null,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Ekip ekle" }));
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Ad"), "Yeni Ekip");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(createIskurTeam).toHaveBeenCalledWith("p1", "unit1", {
      name: "Yeni Ekip",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const media = screen.getByRole("region", {
      name: /^Medya ve Kreatif Üretim/,
    });
    await user.click(
      within(media).getByRole("button", { name: "Yeniden adlandır" }),
    );
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Ad")).toHaveValue(
      "Medya ve Kreatif Üretim",
    );
    await user.type(within(dialog).getByLabelText("Ad"), " 2");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(updateIskurTeam).toHaveBeenCalledWith("p1", "t1", {
      name: "Medya ve Kreatif Üretim 2",
    });
  });

  it("finalizes and deletes after a confirmation", async () => {
    const user = userEvent.setup();
    await renderView();

    await user.click(
      screen.getByRole("button", { name: "Tümünü kesinleştir" }),
    );
    let dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: "Tüm atamaları kesinleştir",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/1 geçici atama kesinleşecek/),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Kesinleştir" }),
    );
    expect(finalizeIskurPlacements).toHaveBeenLastCalledWith("p1", {
      teamId: null,
      unitId: null,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(
      screen.getByRole("button", { name: "Birimi kesinleştir" }),
    );
    dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Kesinleştir" }),
    );
    expect(finalizeIskurPlacements).toHaveBeenLastCalledWith("p1", {
      teamId: null,
      unitId: "unit1",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const digital = screen.getByRole("region", {
      name: /^Dijital Dönüşüm ve Teknoloji/,
    });
    await user.click(
      within(digital).getByRole("button", { name: "Kesinleştir" }),
    );
    dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Kesinleştirilecek geçici atama yok."),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(within(digital).getByRole("button", { name: "Sil" }));
    dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Sil" }));
    expect(deleteIskurTeam).toHaveBeenCalledWith("p1", "t2");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Birimi sil" }));
    dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: "Kreatif ve Dijital Üretim birimini sil",
      }),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Sil" }));
    expect(deleteIskurUnit).toHaveBeenCalledWith("p1", "unit1");
  });

  it("offers the default structure to a program without units", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurWorkspace).mockResolvedValue(
      iskurWorkspace({ units: [], pool: [] }),
    );
    renderWithQueryClient(<IskurWorkspaceView programId="p1" />);

    const create = await screen.findByRole("button", {
      name: "Varsayılan yapıyı oluştur",
    });
    expect(
      screen.getByText("Programdaki herkes bir ekibe yerleştirildi."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tümünü kesinleştir" }),
    ).toBeNull();
    await user.click(create);
    expect(createDefaultIskurStructure).toHaveBeenCalledWith("p1");
    expect(
      await screen.findByRole("heading", { name: "Kreatif ve Dijital Üretim" }),
    ).toBeInTheDocument();
  });

  it("shows a load failure and a refused change", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurWorkspace).mockRejectedValueOnce(
      new Error("İŞKUR ekipleri yüklenemedi."),
    );
    const first = renderWithQueryClient(<IskurWorkspaceView programId="p1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "İŞKUR ekipleri yüklenemedi.",
    );
    first.unmount();

    vi.mocked(placeIskurIntern).mockRejectedValue(
      new Error("Bu ekibin zaten iki lideri var."),
    );
    await renderView();
    await user.click(
      screen.getByRole("button", { name: "Deniz Arslan kişisini yerleştir" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByLabelText("Ekip lideri"));
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(
      await within(dialog).findByText("Bu ekibin zaten iki lideri var."),
    ).toBeInTheDocument();
  });

  it("pre-fills a new placement with the intern's work days and shows their preferences", async () => {
    vi.mocked(getIskurApplications).mockResolvedValue(denizSent());
    const user = userEvent.setup();
    await renderView();
    await screen.findByText("Yerleştirme formları: 1 gönderildi · 2 taslak");

    await user.click(
      screen.getByRole("button", { name: "Deniz Arslan kişisini yerleştir" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByLabelText("Haftalık görev günü"),
    ).toHaveDisplayValue("3 gün");
    const panel = within(dialog).getByRole("region", { name: "Tercihler" });
    expect(
      within(panel).getByText(/Kreatif ve Dijital Üretim/),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/Fikir üreten · Uygulayan/),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/Görsel tasarım: İyi/)).toBeInTheDocument();
    expect(within(panel).getByText("Lider olmak istiyor")).toBeInTheDocument();
    expect(within(panel).getByText("Çatışma")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "CV aç" })).toHaveAttribute(
      "href",
      "/files/p1/u-pool/CV",
    );
    expect(within(panel).getByText("Transkript yok")).toBeInTheDocument();
  });

  it("says when someone has not sent the form yet", async () => {
    const user = userEvent.setup();
    await renderView();
    await user.click(
      screen.getByRole("button", { name: "Deniz Arslan kişisini yerleştir" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Bu kişi yerleştirme formunu henüz göndermedi."),
    ).toBeInTheDocument();
  });

  it("edits a unit's skills one per line", async () => {
    vi.mocked(replaceIskurUnitSkills).mockResolvedValue(noForms);
    const user = userEvent.setup();
    await renderView();
    const card =
      (
        await screen.findByRole("heading", { name: "Birim yetkinlikleri" })
      ).closest("section") ?? document.body;
    const editButtons = within(card).getAllByRole("button", {
      name: "Yetkinlikleri düzenle",
    });
    const first = editButtons[0];
    if (!first) throw new Error("no editor");
    await user.click(first);
    const editor = within(card).getByLabelText(
      "Kreatif ve Dijital Üretim yetkinlikleri",
    );
    expect(editor).toHaveValue("Görsel tasarım\nVideo ve fotoğraf");
    await user.clear(editor);
    await user.type(
      editor,
      "Görsel tasarım{Enter}{Enter}görsel tasarım{Enter}Web ve UX",
    );
    await user.click(within(card).getByRole("button", { name: "Kaydet" }));
    expect(replaceIskurUnitSkills).toHaveBeenCalledWith("p1", KREATIF, [
      "Görsel tasarım",
      "Web ve UX",
    ]);
  });
});
