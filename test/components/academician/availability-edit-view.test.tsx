import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AcademicianAvailabilityEditView } from "@/components/academician/availability-edit-view";
import { OfficeHoursRequestStatus } from "@/interfaces/office-hours";
import { fetchInstitutionAdvisees } from "@/lib/client/institution";
import {
  resetAcademicianSample,
  sampleState,
  setSampleImpact,
} from "@test/fixtures/academician-office-hours-sample-store";
import { APP_ROUTER_ENTRY } from "@test/mocks/search-params";
import { renderWithQueryClient } from "@test/test-utils";

// The screens walk through the in-memory sample; the real /me mapping is tested in test/lib.
vi.mock(
  "@/lib/client/academician-office-hours",
  () => import("@test/mocks/academician-office-hours-client"),
);

vi.mock("next/navigation", async (importOriginal) => {
  const { useLocationSearchParams } = await import("@test/mocks/search-params");
  return {
    ...(await importOriginal<typeof import("next/navigation")>()),
    useSearchParams: useLocationSearchParams,
  };
});

vi.mock("@/lib/client/institution", () => ({
  fetchInstitutionRecord: vi.fn(),
  fetchInstitutionAdvisees: vi.fn(),
}));

// Tuesday 10 November 2026, 10:00 in Istanbul, before the sample data is placed around "now".
const MORNING = vi.hoisted(() => {
  const morning = new Date("2026-11-10T07:00:00Z");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(morning);
  return morning;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MORNING);
  resetAcademicianSample();
  window.history.replaceState(
    APP_ROUTER_ENTRY,
    "",
    "/academician/appointments/availability",
  );
  vi.mocked(fetchInstitutionAdvisees).mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderView() {
  return renderWithQueryClient(<AcademicianAvailabilityEditView />);
}

async function list(name: string) {
  return screen.findByRole("region", { name });
}

function setField(dialog: HTMLElement, label: string, value: string) {
  fireEvent.change(within(dialog).getByLabelText(label), {
    target: { value },
  });
}

describe("AcademicianAvailabilityEditView", () => {
  it("shows the calendar and the lists that make the hours", async () => {
    renderView();

    const weekly = await list("Tekrarlanan haftalık müsaitlik");
    expect(weekly).toHaveTextContent("Her Salı · 14:00 – 16:00");
    expect(weekly).toHaveTextContent("Her Perşembe · 10:00 – 12:00");
    expect(weekly.closest("[data-tour]")).toHaveAttribute(
      "data-tour",
      "availability-weekly",
    );
    expect(await list("Tek seferlik müsaitlik")).toHaveTextContent("B-110");
    expect(await list("Müsait olmadığım günler")).toHaveTextContent(
      "20–22 Kasım 2026 · Tüm günMüsait değilim (Konferans)",
    );
    expect(screen.getByRole("link", { name: "Randevularım" })).toHaveAttribute(
      "href",
      "/academician/appointments",
    );
    expect(
      await screen.findByRole("heading", { name: "9–15 Kasım 2026" }),
    ).toBeVisible();
    expect(screen.getByText("Nasıl hesaplanır?")).toBeVisible();
  });

  it("adds a weekly range and refuses one that clashes", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(
      await screen.findByRole("button", {
        name: "Tekrarlanan haftalık müsaitlik listesine ekle",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Müsaitlik ekle" });
    await user.selectOptions(within(dialog).getByLabelText("Gün"), "Salı");
    setField(dialog, "Başlangıç", "15:00");
    setField(dialog, "Bitiş", "17:00");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Bu saatler mevcut bir kayıtla çakışıyor.",
    );

    await user.selectOptions(within(dialog).getByLabelText("Gün"), "Cuma");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));

    expect(await screen.findByText("Müsaitlik kaydedildi.")).toBeVisible();
    expect(await list("Tekrarlanan haftalık müsaitlik")).toHaveTextContent(
      "Her Cuma · 15:00 – 17:00",
    );
  });

  it("edits a range from its menu", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(
      await screen.findByRole("button", {
        name: "Her Salı · 14:00 – 16:00 için seçenekler",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Düzenle" }));

    const dialog = screen.getByRole("dialog", { name: "Müsaitliği düzenle" });
    expect(within(dialog).getByLabelText("Başlangıç")).toHaveValue("14:00");
    setField(dialog, "Bitiş", "17:00");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));

    expect(await list("Tekrarlanan haftalık müsaitlik")).toHaveTextContent(
      "Her Salı · 14:00 – 17:00",
    );
  });

  it("deletes only after the menu's confirmation, and Escape closes the menu", async () => {
    const user = userEvent.setup();
    renderView();
    const menuButton = await screen.findByRole("button", {
      name: "Her Perşembe · 10:00 – 12:00 için seçenekler",
    });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();

    await user.click(menuButton);
    await user.click(screen.getByRole("button", { name: "Sil" }));
    expect(screen.getByText("Silinsin mi?")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Evet, sil" }));

    expect(await screen.findByText("Silindi.")).toBeVisible();
    await waitFor(() => {
      expect(sampleState().availability.rules).toHaveLength(1);
    });
  });

  it("adds a day off from the page's button, choosing the kind first", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(
      await screen.findByRole("button", { name: "Müsaitlik Ekle" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Müsaitlik ekle" });
    await user.click(
      within(dialog).getByRole("radio", { name: /Müsait olmadığım günler/ }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Tarih ve saatleri doldur.",
    );
    setField(dialog, "İlk gün", "2026-11-25");
    await user.type(within(dialog).getByLabelText("Neden (opsiyonel)"), "Jüri");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));

    expect(await list("Müsait olmadığım günler")).toHaveTextContent(
      "25 Kasım 2026 · Tüm günMüsait değilim (Jüri)",
    );
  });

  it("adds one-off hours and refuses ones shorter than 15 minutes", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(
      await screen.findByRole("button", { name: "Müsaitlik Ekle" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Müsaitlik ekle" });
    await user.click(
      within(dialog).getByRole("radio", { name: /Tek seferlik müsaitlik/ }),
    );
    setField(dialog, "Tarih", "2026-11-26");
    setField(dialog, "Başlangıç", "15:00");
    setField(dialog, "Bitiş", "15:10");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Tek seferlik saat en az 15 dakika olmalı.",
    );

    setField(dialog, "Bitiş", "16:00");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));

    expect(await screen.findByText("Müsaitlik kaydedildi.")).toBeVisible();
    expect(await list("Tek seferlik müsaitlik")).toHaveTextContent("26 Kasım");
  });

  it("offers weekly hours, one-off hours and days off in the add dialog", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(
      await screen.findByRole("button", { name: "Müsaitlik Ekle" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Müsaitlik ekle" });
    expect(
      within(dialog)
        .getAllByRole("radio")
        .map((radio) => radio.closest("label")?.textContent ?? ""),
    ).toEqual([
      expect.stringContaining("Tekrarlanan haftalık müsaitlik"),
      expect.stringContaining("Tek seferlik müsaitlik"),
      expect.stringContaining("Müsait olmadığım günler"),
    ]);
  });

  describe("a change that leaves meetings or requests outside the hours", () => {
    const THURSDAY = {
      startsAt: "2026-11-12T10:00:00+03:00",
      endsAt: "2026-11-12T10:30:00+03:00",
    };
    const IMPACT = {
      meetings: [
        {
          requestId: "booked",
          status: OfficeHoursRequestStatus.Accepted,
          time: THURSDAY,
          studentName: "Ali Kaya",
          topic: "Staj",
          courseName: null,
        },
      ],
      requests: [
        {
          requestId: "waiting",
          status: OfficeHoursRequestStatus.Pending,
          studentName: null,
          topic: "Proje",
          courseName: "CENG 111",
          lostTimes: [THURSDAY],
          keptTimes: [
            {
              startsAt: "2026-11-17T14:00:00+03:00",
              endsAt: "2026-11-17T14:30:00+03:00",
            },
          ],
        },
      ],
    };

    async function removeThursday(user: ReturnType<typeof userEvent.setup>) {
      await user.click(
        await screen.findByRole("button", {
          name: "Her Perşembe · 10:00 – 12:00 için seçenekler",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Sil" }));
      await user.click(screen.getByRole("button", { name: "Evet, sil" }));
      return screen.findByRole("dialog", {
        name: "Bu değişiklik bazı randevu ve talepleri etkiliyor",
      });
    }

    it("lists them first and saves only once the academician confirms", async () => {
      setSampleImpact(IMPACT);
      const user = userEvent.setup();
      renderView();

      const review = await removeThursday(user);

      // The safe choice takes the focus, not the link that leaves the page.
      expect(
        within(review).getByRole("button", { name: "Vazgeç" }),
      ).toHaveFocus();
      const meetings = within(review).getByRole("region", {
        name: "Onaylı randevular",
      });
      expect(meetings).toHaveTextContent("Ali Kaya");
      expect(meetings).toHaveTextContent("12 Kasım 2026 · 10:00–10:30");
      expect(meetings).toHaveTextContent("Staj");
      const requests = within(review).getByRole("region", {
        name: "Bekleyen talepler",
      });
      expect(requests).toHaveTextContent("Öğrenci");
      expect(requests).toHaveTextContent(
        "Kalkan saatler: 12 Kasım 2026 · 10:00–10:30",
      );
      expect(requests).toHaveTextContent(
        "Kalan saatler: 17 Kasım 2026 · 14:00–14:30",
      );
      expect(
        within(review).getByRole("link", { name: "Randevularıma git" }),
      ).toHaveAttribute("href", "/academician/appointments");
      expect(sampleState().availability.rules).toHaveLength(2);

      await user.click(
        within(review).getByRole("button", { name: "Yine de kaydet" }),
      );

      expect(await screen.findByText("Silindi.")).toBeVisible();
      expect(review).not.toBeInTheDocument();
      expect(sampleState().availability.rules).toHaveLength(1);
    });

    it("goes back to the edit as it was when the academician steps back", async () => {
      setSampleImpact(IMPACT);
      const user = userEvent.setup();
      renderView();
      await user.click(
        await screen.findByRole("button", {
          name: "Her Salı · 14:00 – 16:00 için seçenekler",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Düzenle" }));
      setField(
        screen.getByRole("dialog", { name: "Müsaitliği düzenle" }),
        "Bitiş",
        "15:00",
      );
      await user.click(screen.getByRole("button", { name: "Kaydet" }));

      const review = await screen.findByRole("dialog", {
        name: "Bu değişiklik bazı randevu ve talepleri etkiliyor",
      });
      await user.click(within(review).getByRole("button", { name: "Vazgeç" }));

      const dialog = screen.getByRole("dialog", { name: "Müsaitliği düzenle" });
      expect(within(dialog).getByLabelText("Bitiş")).toHaveValue("15:00");
      expect(sampleState().availability.rules[0]?.endTime).toBe("16:00");
    });

    it("says the list changed and shows it again when a save is refused for it", async () => {
      setSampleImpact(IMPACT, { changesOnConfirm: true });
      const user = userEvent.setup();
      renderView();
      const review = await removeThursday(user);
      expect(
        within(review).queryByText(/Sen bakarken liste değişti/),
      ).not.toBeInTheDocument();

      await user.click(
        within(review).getByRole("button", { name: "Yine de kaydet" }),
      );

      expect(
        await within(review).findByText(/Sen bakarken liste değişti/),
      ).toBeVisible();
      expect(sampleState().availability.rules).toHaveLength(2);
      await user.click(
        within(review).getByRole("button", { name: "Yine de kaydet" }),
      );
      expect(await screen.findByText("Silindi.")).toBeVisible();
    });

    it("stays open while the save it sent is still running", async () => {
      setSampleImpact(IMPACT, { holdsConfirm: true });
      const user = userEvent.setup();
      renderView();
      const review = await removeThursday(user);

      await user.click(
        within(review).getByRole("button", { name: "Yine de kaydet" }),
      );

      expect(
        within(review).getByRole("button", { name: "Vazgeç" }),
      ).toBeDisabled();
      await user.keyboard("{Escape}");
      expect(review).toBeInTheDocument();
    });
  });
});
