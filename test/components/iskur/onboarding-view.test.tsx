import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurOnboardingView } from "@/components/iskur/onboarding-view";
import { ClientApiError } from "@/lib/client/api";
import {
  getIskurOnboarding,
  removeIskurOnboardingDocument,
  saveIskurOnboardingDraft,
  submitIskurOnboarding,
  uploadIskurOnboardingDocument,
} from "@/lib/client/iskur-onboarding";
import {
  completeForm,
  emptyForm,
  onboarding,
} from "@test/fixtures/iskur-onboarding";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => ({
    session: { fullName: "Mert Demir" },
    logout: vi.fn(async () => undefined),
  }),
}));
vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurOnboarding: vi.fn(),
  removeIskurOnboardingDocument: vi.fn(),
  saveIskurOnboardingDraft: vi.fn(),
  submitIskurOnboarding: vi.fn(),
  uploadIskurOnboardingDocument: vi.fn(),
}));

describe("IskurOnboardingView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding());
    vi.mocked(saveIskurOnboardingDraft).mockImplementation(async (input) =>
      onboarding(
        emptyForm({ ...input, documents: { cv: null, transcript: null } }),
      ),
    );
  });

  it("welcomes the intern (Figma 01) and starts the form", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<IskurOnboardingView />);
    expect(
      await screen.findByRole("heading", {
        name: "Hoş geldin Mert, seni ekibine yerleştirelim",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 birim ve 4 tematik ekipte/)).toBeInTheDocument();
    expect(screen.getByText("Kesinleşme")).toBeInTheDocument();
    await user.click(
      screen.getByLabelText("Güncel CV’n (PDF, en fazla 10 MB)"),
    );
    expect(
      screen.getByLabelText("Güncel CV’n (PDF, en fazla 10 MB)"),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Sonra hatırlat" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Forma başla" }));
    expect(
      screen.getByRole("heading", { name: "Haftada kaç gün gelebilirsin?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yardım" })).toHaveAttribute(
      "href",
      "mailto:info@menton.com.tr",
    );
  });

  it("walks the work days step (Figma 02) until the hours match", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<IskurOnboardingView />);
    await user.click(
      await screen.findByRole("button", { name: "Forma başla" }),
    );
    const next = screen.getByRole("button", { name: "Devam et" });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /1 gün/ }));
    await user.click(screen.getByRole("button", { name: "Pazartesi" }));
    expect(screen.getByText("Toplam 7,5 sa = 1 tam gün ✓")).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Haftalık özet" });
    expect(within(summary).getByText("2 sa")).toBeInTheDocument();
    expect(within(summary).getByText("5,5 sa")).toBeInTheDocument();
    expect(
      within(summary).getByText(
        "Toplam tutuyor · 1 gün eşdeğeri, 1 takvim gününe dağıtıldı",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Pazartesi başlangıç saati")).toHaveValue(
      "09:00",
    );
    await user.type(
      screen.getByLabelText(
        "Daha önce İŞKUR programlarında kullandığın gün sayısı",
      ),
      "100",
    );
    expect(screen.getByText("Kalan hakkın: 40 gün")).toBeInTheDocument();
    expect(
      screen.getByText("Bu dönem için yeterli (yaklaşık 24 gün gerekir)"),
    ).toBeInTheDocument();
    expect(next).toBeEnabled();

    await user.click(next);
    expect(
      await screen.findByRole("heading", {
        name: "Hangi birimde, hangi becerilerle?",
      }),
    ).toBeInTheDocument();
    expect(saveIskurOnboardingDraft).toHaveBeenCalled();
  });

  it("asks the chosen units' skills and team roles (Figma 03)", async () => {
    vi.mocked(getIskurOnboarding).mockResolvedValue(
      onboarding(completeForm({ unitIds: [], skills: [], teamRoles: [] })),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<IskurOnboardingView />);
    await user.click(
      await screen.findByRole("button", { name: "Forma başla" }),
    );
    await user.click(screen.getByRole("button", { name: "Devam et" }));
    await screen.findByRole("heading", {
      name: "Hangi birimde, hangi becerilerle?",
    });

    expect(screen.getByText("Endüstri Mühendisliği")).toBeInTheDocument();
    expect(screen.getByText("3. sınıf")).toBeInTheDocument();
    expect(screen.getAllByText("Seçilmedi · sorular gizli")).toHaveLength(2);
    await user.click(
      screen.getByRole("checkbox", { name: /Kreatif ve Dijital Üretim/ }),
    );
    expect(screen.getByText("1 / 2 seçildi")).toBeInTheDocument();
    expect(
      screen.getByText(/^Teknokent'in görsel iletişimi/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Video ve podcast üretimi")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Örnek işleri gör" }));
    expect(screen.getByText("Video ve podcast üretimi")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Kreatif ve Dijital Üretim/ }),
    ).toBeChecked();
    const visual = screen.getByRole("group", {
      name: "Görsel tasarım düzeyi",
    });
    await user.click(within(visual).getByRole("button", { name: "İyi" }));
    await user.click(
      within(
        screen.getByRole("group", { name: "Video ve fotoğraf düzeyi" }),
      ).getByRole("button", { name: "Yok" }),
    );
    await user.click(screen.getByRole("button", { name: "Planlayan" }));
    await user.click(screen.getByRole("button", { name: "Uygulayan" }));
    expect(
      screen.getByRole("button", { name: "Bağlantı kuran" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Devam et" })).toBeEnabled();
  });

  it("closes the documents step while uploads are off, and asks for a CV when they are on", async () => {
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding(completeForm()));
    const user = userEvent.setup();
    const { unmount } = renderWithQueryClient(<IskurOnboardingView />);
    await user.click(
      await screen.findByRole("button", { name: "Forma başla" }),
    );
    await user.click(screen.getByRole("button", { name: /Belgeler/ }));
    expect(screen.getByText("Belge yükleme şu an kapalı")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devam et" })).toBeEnabled();
    unmount();

    vi.mocked(getIskurOnboarding).mockResolvedValue(
      onboarding(completeForm(), true),
    );
    vi.mocked(uploadIskurOnboardingDocument).mockResolvedValue(
      onboarding(
        completeForm({
          documents: {
            cv: { fileName: "cv.pdf", sizeBytes: 2048, uploadedAt: "x" },
            transcript: null,
          },
        }),
        true,
      ),
    );
    vi.mocked(removeIskurOnboardingDocument).mockResolvedValue(
      onboarding(completeForm(), true),
    );
    renderWithQueryClient(<IskurOnboardingView />);
    await user.click(
      await screen.findByRole("button", { name: "Forma başla" }),
    );
    await user.click(screen.getByRole("button", { name: /Belgeler/ }));
    expect(screen.getByRole("button", { name: "Devam et" })).toBeDisabled();
    await user.upload(
      screen.getByLabelText("CV"),
      new File(["%PDF"], "cv.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByText("cv.pdf · 2 KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devam et" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Kaldır" }));
    expect(await screen.findAllByText("Henüz yüklenmedi")).toHaveLength(2);
  });

  it("checks the leadership application (Figma 04) and sends the form from the preview", async () => {
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding(completeForm()));
    vi.mocked(submitIskurOnboarding).mockResolvedValue(
      onboarding(
        completeForm({
          submittedAt: "2026-11-19T10:00:00Z",
          leadership: {
            wants: true,
            motivation: "Planlamayı severim.",
            experience: "Tanıtım ekibi",
            conflict: "Konuşurum",
          },
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<IskurOnboardingView />);
    await user.click(
      await screen.findByRole("button", { name: "Forma başla" }),
    );
    await user.click(screen.getByRole("button", { name: /Liderlik/ }));
    await user.click(
      screen.getByRole("switch", { name: "Ekip lideri olmak istiyorum" }),
    );
    expect(screen.getByText("3 gün seçtin")).toBeInTheDocument();
    expect(screen.getByText("Belge yükleme kapalı")).toBeInTheDocument();
    expect(screen.getAllByText("0 / 500")).toHaveLength(3);
    await user.type(
      screen.getByLabelText(/Neden ekip lideri olmak istiyorsun/),
      "Planlamayı severim.",
    );
    expect(screen.getByText("19 / 500")).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/Daha önce bir ekibi/),
      "Tanıtım ekibi",
    );
    await user.type(screen.getByLabelText(/aksattığında/), "Konuşurum");

    await user.click(screen.getByRole("button", { name: "Devam et" }));
    expect(
      await screen.findByRole("heading", { name: "Formunu gözden geçir" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Başvuruyorum")).toBeInTheDocument();
    expect(screen.getByText("Fikir üreten · Uygulayan")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Formu gönder" }));
    expect(
      await screen.findByRole("heading", { name: "Formun gönderildi, Mert" }),
    ).toBeInTheDocument();
    // Figma 5.6: an applicant to lead also gets the leadership interview between review and team assignment.
    const region = screen.getByRole("region", { name: "Sırada ne var?" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
    expect(within(region).getByText("Liderlik görüşmesi")).toBeInTheDocument();
  });

  it("shows a submitted form without the leadership interview when they did not apply to lead", async () => {
    vi.mocked(getIskurOnboarding).mockResolvedValue(
      onboarding(completeForm({ submittedAt: "2026-11-19T10:00:00Z" })),
    );
    renderWithQueryClient(<IskurOnboardingView />);

    const region = await screen.findByRole("region", {
      name: "Sırada ne var?",
    });
    expect(within(region).getAllByRole("listitem")).toHaveLength(2);
    expect(within(region).getByText("Ekip ataması")).toBeInTheDocument();
    expect(screen.queryByText("Liderlik görüşmesi")).toBeNull();
  });

  it("tells someone who is not an intern, and offers a retry when loading fails", async () => {
    vi.mocked(getIskurOnboarding).mockRejectedValue(
      new ClientApiError("yok", 404),
    );
    const { unmount } = renderWithQueryClient(<IskurOnboardingView />);
    expect(
      await screen.findByText("Yerleştirme formu sana açık değil"),
    ).toBeInTheDocument();
    unmount();

    vi.mocked(getIskurOnboarding).mockRejectedValue(
      new ClientApiError("Sunucu hatası", 500),
    );
    renderWithQueryClient(<IskurOnboardingView />);
    expect(
      await screen.findByRole("button", { name: "Yeniden dene" }),
    ).toBeInTheDocument();
  });
});
