import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcademicianProfileView } from "@/components/academician/profile-view";
import type { InstitutionRecord } from "@/interfaces/institution";
import { IdentityKind } from "@/interfaces/session";
import {
  getOfficeHoursProfileSettings,
  saveOfficeHoursProfileSettings,
} from "@/lib/client/academician-office-hours";
import { ClientApiError } from "@/lib/client/api";
import { fetchInstitutionRecord } from "@/lib/client/institution";
import { officeHoursProfile } from "@test/fixtures/office-hours-me";
import { InLocale, renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/institution", () => ({
  fetchInstitutionRecord: vi.fn(),
  fetchInstitutionAdvisees: vi.fn(),
}));
vi.mock("@/lib/client/academician-office-hours", () => ({
  getOfficeHoursProfileSettings: vi.fn(),
  saveOfficeHoursProfileSettings: vi.fn(),
}));

const RECORD: InstitutionRecord = {
  kinds: [IdentityKind.Academic],
  fullName: "Ayşe Yılmaz",
  email: "ayse@metu.edu.tr",
  faculty: "Mühendislik Fakültesi",
  departmentName: "Bilgisayar Mühendisliği",
  classYear: null,
  programLevel: null,
  academicTitle: "Doç. Dr.",
  iskurParticipant: false,
  advisor: null,
  syncedAt: "2026-11-08T09:00:00Z",
};

const SAVED = officeHoursProfile({
  listed: false,
  onlineLink: null,
  details: {
    about: "Yapay zekâ ve veri.",
    topics: [{ title: "Staj", body: null }],
    courses: [],
    expertise: ["ML"],
    responseDays: null,
  },
});

beforeEach(() => {
  vi.mocked(fetchInstitutionRecord).mockReset().mockResolvedValue(RECORD);
  vi.mocked(getOfficeHoursProfileSettings).mockReset().mockResolvedValue(SAVED);
  vi.mocked(saveOfficeHoursProfileSettings)
    .mockReset()
    .mockImplementation(async (profile) => profile);
});

function saveButton() {
  return screen.getByRole("button", { name: "Kaydet" });
}

describe("AcademicianProfileView", () => {
  it("shows ODTÜ's record read-only next to the saved profile, with no TEST UI text", async () => {
    renderWithQueryClient(<AcademicianProfileView />);
    const panel = await screen.findByRole("region", {
      name: "Kurumsal Bilgiler",
    });
    expect(await within(panel).findByText("Ayşe Yılmaz")).toBeVisible();
    expect(panel).toHaveTextContent("Doç. Dr.");
    expect(panel).toHaveTextContent("Bilgisayar Mühendisliği");
    expect(panel).toHaveTextContent("ODTÜ'den, salt okunur");
    expect(within(panel).queryByRole("textbox")).toBeNull();

    expect(await screen.findByDisplayValue("A-204")).toBeVisible();
    expect(screen.getByDisplayValue("Yapay zekâ ve veri.")).toBeVisible();
    expect(screen.getByDisplayValue("Staj")).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "Eklenen etiketler" })).getByText(
        "ML",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("switch", { name: "Ofis saati listesinde görün" }),
    ).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText(/TEST UI/i)).toBeNull();
  });

  it("refuses a link that is not a web address and a bad e-mail, then saves", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AcademicianProfileView />);
    const link = await screen.findByLabelText(
      "Çevrim içi görüşme bağlantısı (isteğe bağlı)",
    );
    await user.type(link, "javascript:alert(1)");
    await user.type(
      screen.getByLabelText("Öğrencilere gösterilecek e-posta (isteğe bağlı)"),
      "ayse@",
    );
    await user.click(saveButton());
    expect(
      screen.getByText("Bağlantı https:// ile başlayan bir web adresi olmalı."),
    ).toBeVisible();
    expect(screen.getByText("Geçerli bir e-posta adresi yaz.")).toBeVisible();
    expect(link).toHaveAttribute("aria-invalid", "true");
    expect(saveOfficeHoursProfileSettings).not.toHaveBeenCalled();

    await user.clear(link);
    await user.type(link, "meet.example.org/ayse");
    await user.type(
      screen.getByLabelText("Öğrencilere gösterilecek e-posta (isteğe bağlı)"),
      "metu.edu.tr",
    );
    await user.click(saveButton());
    expect(saveOfficeHoursProfileSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        onlineLink: "https://meet.example.org/ayse",
        contactEmail: "ayse@metu.edu.tr",
      }),
    );
    expect(
      await screen.findByText("Profil bilgilerin kaydedildi."),
    ).toBeVisible();
  });

  it("saves the opt-in, topics, courses, tags, response time and e-mail choices together", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AcademicianProfileView />);
    await user.click(
      await screen.findByRole("switch", {
        name: "Ofis saati listesinde görün",
      }),
    );
    expect(
      screen.getByText(
        "Açık: Menton'daki öğrenciler seni listede görür ve randevu talep edebilir.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Konu ekle" }));
    const topic = screen.getByRole("listitem", { name: "Konu 2" });
    await user.type(within(topic).getByLabelText("Konu başlığı"), "Tez");
    await user.type(
      within(topic).getByLabelText("Kısa açıklama (isteğe bağlı)"),
      "Yüksek lisans tezi",
    );

    await user.click(screen.getByRole("button", { name: "Ders ekle" }));
    const course = screen.getByRole("listitem", { name: "Ders 1" });
    await user.type(within(course).getByLabelText("Ders kodu"), "CENG 140");
    await user.type(within(course).getByLabelText("Ders adı"), "C Programlama");
    // A row added and left empty is dropped, not an error.
    await user.click(screen.getByRole("button", { name: "Ders ekle" }));

    await user.type(
      screen.getByLabelText("Uzmanlık etiketleri"),
      "Veri{Enter}",
    );
    await user.selectOptions(
      screen.getByLabelText(
        "Taleplere genellikle ne kadar sürede yanıt verirsin?",
      ),
      "3",
    );
    await user.click(
      screen.getByRole("switch", {
        name: "Yeni randevu talebi gelince e-posta gönder",
      }),
    );

    // Enter in the tag box adds the tag; it must not have saved the form.
    expect(saveOfficeHoursProfileSettings).not.toHaveBeenCalled();
    expect(
      screen.getByText("Kaydedilmemiş değişikliklerin var."),
    ).toBeVisible();
    await user.click(saveButton());

    expect(saveOfficeHoursProfileSettings).toHaveBeenCalledWith({
      listed: true,
      defaultPlace: "A-204",
      onlineLink: null,
      contactEmail: null,
      details: {
        about: "Yapay zekâ ve veri.",
        topics: [
          { title: "Staj", body: null },
          { title: "Tez", body: "Yüksek lisans tezi" },
        ],
        courses: [{ code: "CENG 140", name: "C Programlama" }],
        expertise: ["ML", "Veri"],
        responseDays: 3,
      },
      emails: { newRequest: false, cancellation: true },
    });
  });

  it("marks a topic without a title, a half course and markup, and saves nothing", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AcademicianProfileView />);
    const about = await screen.findByLabelText("Kısa tanıtım");
    await user.clear(about);
    await user.type(about, "<b>merhaba</b>");
    const topic = screen.getByRole("listitem", { name: "Konu 1" });
    await user.clear(within(topic).getByLabelText("Konu başlığı"));
    await user.type(
      within(topic).getByLabelText("Kısa açıklama (isteğe bağlı)"),
      "Açıklama",
    );
    await user.click(screen.getByRole("button", { name: "Ders ekle" }));
    await user.type(
      within(screen.getByRole("listitem", { name: "Ders 1" })).getByLabelText(
        "Ders kodu",
      ),
      "CENG 140",
    );
    await user.click(saveButton());

    expect(
      screen.getByText(
        "Yalnızca düz metin yazabilirsin; HTML etiketi kullanılamaz.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Konu başlığını yaz ya da satırı kaldır."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Ders kodunu ve adını birlikte yaz ya da satırı kaldır.",
      ),
    ).toBeVisible();
    expect(saveOfficeHoursProfileSettings).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Konu 1 kaldır" }));
    expect(
      screen.queryByText("Konu başlığını yaz ya da satırı kaldır."),
    ).toBeNull();
  });

  it("refuses a duplicate tag and a sixth one", async () => {
    vi.mocked(getOfficeHoursProfileSettings).mockResolvedValue(
      officeHoursProfile({
        details: { ...SAVED.details, expertise: ["A", "B", "C", "D"] },
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<AcademicianProfileView />);
    const input = await screen.findByLabelText("Uzmanlık etiketleri");
    await user.type(input, "a{Enter}");
    expect(screen.getByText("Bu etiket zaten ekli.")).toBeVisible();
    await user.clear(input);
    await user.type(input, "E{Enter}");
    await user.type(input, "F{Enter}");
    expect(screen.getByText("En fazla 5 etiket ekleyebilirsin.")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "A etiketini kaldır" }),
    );
    expect(
      within(
        screen.getByRole("list", { name: "Eklenen etiketler" }),
      ).queryByText("A"),
    ).toBeNull();
  });

  it("works from the keyboard and discards unsaved changes", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AcademicianProfileView />);
    const listed = await screen.findByRole("switch", {
      name: "Ofis saati listesinde görün",
    });
    listed.focus();
    await user.keyboard(" ");
    expect(listed).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(listed).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it("shows a failed save and keeps the edits", async () => {
    vi.mocked(saveOfficeHoursProfileSettings).mockRejectedValue(
      new ClientApiError("Bad request", 400),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<AcademicianProfileView />);
    const place = await screen.findByLabelText("Varsayılan görüşme yeri");
    await user.clear(place);
    await user.type(place, "B-101");
    await user.click(saveButton());
    expect(
      await screen.findByText("Kaydedilemedi. Tekrar dene."),
    ).toBeVisible();
    expect(place).toHaveValue("B-101");
  });

  it("treats a 404 as no ODTÜ record, not an error, and reads in English", async () => {
    vi.mocked(fetchInstitutionRecord).mockRejectedValue(
      new ClientApiError("Not found", 404),
    );
    renderWithQueryClient(
      <InLocale locale="en">
        <AcademicianProfileView />
      </InLocale>,
    );
    expect(
      await screen.findByText("There is no ODTÜ record for this account."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "My profile" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("switch", {
        name: "Show me in the office hours list",
      }),
    ).toBeVisible();
  });

  it("offers a retry when the profile can't be loaded", async () => {
    vi.mocked(getOfficeHoursProfileSettings).mockRejectedValue(
      new ClientApiError("Down", 500),
    );
    renderWithQueryClient(<AcademicianProfileView />);
    expect(
      await screen.findByRole("button", { name: "Tekrar dene" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Kaydet" })).toBeNull();
  });
});
