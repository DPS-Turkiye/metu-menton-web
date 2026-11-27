import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PersonSummaryView } from "@/components/people/person-summary-view";
import { IskurInternAccountState } from "@/interfaces/iskur-interns";
import { PersonProgramRelation } from "@/interfaces/person-summary";
import {
  ProgramFeature,
  ProgramStatus,
  ProgramType,
} from "@/interfaces/program";
import { UserRole, type AppSession } from "@/interfaces/session";
import { ClientApiError } from "@/lib/client/api";
import { getCoordinatorPrograms } from "@/lib/client/coordinator-programs";
import {
  addIskurInterns,
  getIskurInterns,
  removeIskurIntern,
} from "@/lib/client/iskur-interns";
import { getPersonSummary } from "@/lib/client/person-summary";
import { coordinatorProgram } from "@test/fixtures/coordinator-programs";
import {
  iskurInternEntry,
  iskurInternList,
} from "@test/fixtures/iskur-interns";
import { menteeSummary, mentorSummary } from "@test/fixtures/person-summary";
import { appSession } from "@test/fixtures/session";
import { renderWithQueryClient } from "@test/test-utils";

const navigation = vi.hoisted(() => ({
  pathname: "/admin/users/mentor-1",
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ back: navigation.back, push: navigation.push }),
}));

vi.mock("@/lib/client/person-summary", () => ({ getPersonSummary: vi.fn() }));
vi.mock("@/lib/client/team-changes", () => ({ getTeamHistory: vi.fn() }));

const session = vi.hoisted(() => ({ current: null as AppSession | null }));
vi.mock("@/components/providers/session-provider", () => ({
  useAppSession: () => session.current,
}));
vi.mock("@/lib/client/coordinator-programs", () => ({
  getCoordinatorPrograms: vi.fn(),
}));
vi.mock("@/lib/client/iskur-interns", () => ({
  getIskurInterns: vi.fn(),
  addIskurInterns: vi.fn(),
  removeIskurIntern: vi.fn(),
}));

describe("PersonSummaryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.pathname = "/admin/users/mentor-1";
    session.current = appSession({ role: UserRole.Admin });
  });

  it("shows who a mentor is, what they do and their programs", async () => {
    vi.mocked(getPersonSummary).mockResolvedValue(mentorSummary());
    renderWithQueryClient(<PersonSummaryView userId="mentor-1" />);

    expect(
      await screen.findByRole("heading", { name: "Deniz Yıldız" }),
    ).toBeInTheDocument();
    expect(getPersonSummary).toHaveBeenCalledWith("mentor-1");
    expect(screen.getByText("Ürün lideri · Örnek Şirket")).toBeInTheDocument();
    expect(screen.getByText("Onaylı")).toBeInTheDocument();
    expect(
      screen.getByText("Erken aşama ekiplerle ürün keşfi üzerine çalışıyor."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ürün stratejisi")).toBeInTheDocument();
    expect(screen.getByText("Türkçe, İngilizce")).toBeInTheDocument();
    expect(
      screen.getByText("Ürün Direktörü · Örnek Şirket"),
    ).toBeInTheDocument();
    expect(screen.getByText("Örnek Üniversitesi · MBA")).toBeInTheDocument();
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "deniz@example.test" }),
    ).toHaveAttribute("href", "mailto:deniz@example.test");
    expect(
      screen.getByRole("link", { name: "LinkedIn profili" }),
    ).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Yeşil Program" })).toHaveAttribute(
      "href",
      "/admin/programs/program-1",
    );
    expect(
      screen.getByText("Katılma isteği onay bekliyor"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Girişim")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Takım geçmişi" }),
    ).not.toBeInTheDocument();
  });

  it("shows a mentee's startup and team history, with coordinator program links", async () => {
    navigation.pathname = "/coordinator/people/mentee-1";
    vi.mocked(getPersonSummary).mockResolvedValue(menteeSummary());
    renderWithQueryClient(<PersonSummaryView userId="mentee-1" />);

    expect(
      await screen.findByRole("heading", { name: "Ece Kaya" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kurucu ortak")).toBeInTheDocument();
    expect(screen.getByText("Onay bekliyor")).toBeInTheDocument();
    expect(
      screen.getByText("Yerel üreticileri alıcılarla buluşturuyor."),
    ).toBeInTheDocument();
    const card = within(screen.getByRole("region", { name: "Girişim" }));
    expect(card.getByText("Pazar Lab")).toBeInTheDocument();
    expect(
      card.getByText("Üreticiler alıcıya ulaşamıyor."),
    ).toBeInTheDocument();
    expect(card.getByText("2025")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Web sitesi" })).toHaveAttribute(
      "href",
      "https://pazarlab.example.test",
    );
    expect(screen.getByRole("link", { name: "Yeşil Program" })).toHaveAttribute(
      "href",
      "/coordinator/programs/program-1",
    );
    expect(
      screen.getByRole("button", { name: "Takım geçmişi" }),
    ).toBeInTheDocument();
  });

  it("shows the times a mentor opened, grouped by day, with days off and extra slots", async () => {
    vi.mocked(getPersonSummary).mockResolvedValue(mentorSummary());
    renderWithQueryClient(<PersonSummaryView userId="mentor-1" />);

    const card = within(
      await screen.findByRole("region", { name: "Müsait zamanlar" }),
    );
    expect(card.getByText("Pazartesi")).toBeInTheDocument();
    expect(card.getByText("09:00–10:00")).toBeInTheDocument();
    expect(card.getByText("Salı")).toBeInTheDocument();
    expect(card.getByText("14:00–15:00, 10:00–12:00")).toBeInTheDocument();
    expect(card.getByText("Yaklaşan izin günleri")).toBeInTheDocument();
    expect(card.getByText(/20.*22 Kasım/)).toBeInTheDocument();
    expect(card.getByText("Ek zamanlar")).toBeInTheDocument();
    expect(card.getByText(/12:00 \(45 dk\)$/)).toBeInTheDocument();
  });

  it("says so when a mentor has not set any times", async () => {
    const mentor = mentorSummary().mentor;
    vi.mocked(getPersonSummary).mockResolvedValue(
      mentorSummary({
        mentor: mentor && {
          ...mentor,
          availability: { weekly: [], daysOff: [], extraSlots: [] },
        },
      }),
    );
    renderWithQueryClient(<PersonSummaryView userId="mentor-1" />);

    const card = within(
      await screen.findByRole("region", { name: "Müsait zamanlar" }),
    );
    expect(
      card.getByText("Henüz müsait zaman eklenmemiş."),
    ).toBeInTheDocument();
  });

  it("shows no availability card for a mentee, who keeps none", async () => {
    vi.mocked(getPersonSummary).mockResolvedValue(menteeSummary());
    renderWithQueryClient(<PersonSummaryView userId="mentee-1" />);

    await screen.findByRole("heading", { name: "Ece Kaya" });
    expect(
      screen.queryByRole("region", { name: "Müsait zamanlar" }),
    ).toBeNull();
  });

  it("never turns a non-web LinkedIn or website value into a link", async () => {
    vi.mocked(getPersonSummary).mockResolvedValue(
      menteeSummary({
        linkedinUrl: "javascript:alert(1)",
        startup: {
          ...menteeSummary().startup!,
          website: "javascript:alert(1)",
        },
      }),
    );
    renderWithQueryClient(<PersonSummaryView userId="mentee-1" />);

    await screen.findByRole("heading", { name: "Ece Kaya" });
    expect(screen.queryByRole("link", { name: "LinkedIn profili" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Web sitesi" })).toBeNull();
  });

  it("says when the profile is missing or out of reach and offers the list", async () => {
    navigation.pathname = "/coordinator/people/someone";
    vi.mocked(getPersonSummary).mockRejectedValue(
      new ClientApiError("User not found", 404),
    );
    renderWithQueryClient(<PersonSummaryView userId="someone" />);

    expect(
      await screen.findByText("Bu profil bulunamadı ya da görme yetkin yok."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Listeye dön" })).toHaveAttribute(
      "href",
      "/coordinator/programs",
    );
    expect(getPersonSummary).toHaveBeenCalledTimes(1);
  });
});

// TEST UI block: the İŞKUR list status inside Programlar.
describe("PersonSummaryView İŞKUR list", () => {
  const EMAIL = "ogrenci@hocam-test.metu.edu.tr";
  const iskurSemester = coordinatorProgram({
    id: "program-1",
    name: "Yeşil Program",
    type: ProgramType.Semester,
    features: [ProgramFeature.PeerMentoring, ProgramFeature.Iskur],
    myFeatures: [ProgramFeature.PeerMentoring, ProgramFeature.Iskur],
  });

  async function renderStudent() {
    renderWithQueryClient(<PersonSummaryView userId="mentee-1" />);
    await screen.findByRole("heading", { name: "Ece Kaya" });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    navigation.pathname = "/coordinator/people/mentee-1";
    session.current = appSession({ role: UserRole.Coordinator });
    vi.mocked(getPersonSummary).mockResolvedValue(
      menteeSummary({ email: EMAIL }),
    );
    vi.mocked(getCoordinatorPrograms).mockResolvedValue([iskurSemester]);
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([]));
  });

  it("offers to add a student who is not on the list, and shows them as an intern after", async () => {
    vi.mocked(addIskurInterns).mockResolvedValue(
      iskurInternList([iskurInternEntry({ email: EMAIL })]),
    );
    await renderStudent();

    await userEvent.click(
      await screen.findByRole("button", {
        name: "İŞKUR listesine ekle: Yeşil Program",
      }),
    );

    expect(await screen.findByText("İŞKUR stajyeri")).toBeInTheDocument();
    expect(addIskurInterns).toHaveBeenCalledWith("program-1", [EMAIL]);
    expect(screen.queryByRole("button", { name: /listesine ekle/ })).toBeNull();
  });

  it("shows a listed address that is not yet an approved member", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([
        iskurInternEntry({
          email: EMAIL,
          account: IskurInternAccountState.OutsideProgram,
        }),
      ]),
    );
    await renderStudent();

    expect(await screen.findByText("İŞKUR listesinde")).toBeInTheDocument();
    expect(
      screen.getByText("Programa onaylandığında İŞKUR stajyeri sayılır."),
    ).toBeInTheDocument();
  });

  it("removes an intern only after the confirmation", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([iskurInternEntry({ id: "e1", email: EMAIL })]),
    );
    vi.mocked(removeIskurIntern).mockResolvedValue(iskurInternList([]));
    await renderStudent();

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Listeden çıkar: Yeşil Program",
      }),
    );
    const dialog = within(
      screen.getByRole("dialog", { name: "İŞKUR listesinden çıkarılsın mı?" }),
    );
    expect(removeIskurIntern).not.toHaveBeenCalled();
    await userEvent.click(
      dialog.getByRole("button", { name: "Listeden çıkar" }),
    );

    expect(
      await screen.findByRole("button", {
        name: "İŞKUR listesine ekle: Yeşil Program",
      }),
    ).toBeInTheDocument();
    expect(removeIskurIntern).toHaveBeenCalledWith("program-1", "e1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the intern when the coordinator cancels", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([iskurInternEntry({ email: EMAIL })]),
    );
    await renderStudent();

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Listeden çıkar: Yeşil Program",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Vazgeç" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(removeIskurIntern).not.toHaveBeenCalled();
    expect(screen.getByText("İŞKUR stajyeri")).toBeInTheDocument();
  });

  it("offers no removal for a placed intern and says why", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([iskurInternEntry({ email: EMAIL, placed: true })]),
    );
    await renderStudent();

    expect(await screen.findByText("İŞKUR stajyeri")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ekibe yerleştirildi; listeden çıkarmak için önce yerleşimden çıkarın.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Listeden çıkar/ })).toBeNull();
  });

  it.each([
    [
      "a program without İŞKUR",
      coordinatorProgram({
        id: "program-1",
        type: ProgramType.Semester,
        features: [ProgramFeature.PeerMentoring],
        myFeatures: [ProgramFeature.PeerMentoring],
      }),
    ],
    [
      "a program where İŞKUR is not assigned to me",
      { ...iskurSemester, myFeatures: [ProgramFeature.PeerMentoring] },
    ],
    [
      "a completed program",
      { ...iskurSemester, status: ProgramStatus.Completed },
    ],
    ["a program I do not coordinate", { ...iskurSemester, id: "elsewhere" }],
  ])("shows nothing for %s", async (_case, program) => {
    // A second, İŞKUR-open program shows its block, so the first row's absence is not just "not loaded yet".
    vi.mocked(getPersonSummary).mockResolvedValue(
      menteeSummary({
        email: EMAIL,
        programs: [
          ...menteeSummary().programs,
          {
            id: "program-2",
            name: "Mavi Program",
            status: ProgramStatus.Active,
            relation: PersonProgramRelation.Mentee,
            mentorStatus: null,
          },
        ],
      }),
    );
    vi.mocked(getCoordinatorPrograms).mockResolvedValue([
      program,
      { ...iskurSemester, id: "program-2", name: "Mavi Program" },
    ]);
    await renderStudent();

    expect(
      await screen.findByRole("button", {
        name: "İŞKUR listesine ekle: Mavi Program",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "İŞKUR listesine ekle: Yeşil Program",
      }),
    ).toBeNull();
    expect(getIskurInterns).toHaveBeenCalledTimes(1);
    expect(getIskurInterns).toHaveBeenCalledWith("program-2");
  });

  it.each([
    ["an admin", UserRole.Admin],
    ["a student", UserRole.Mentee],
    ["a mentor", UserRole.Mentor],
  ])("shows nothing to %s", async (_case, role) => {
    session.current = appSession({ role });
    await renderStudent();

    expect(screen.queryByText(/İŞKUR/)).toBeNull();
    expect(getCoordinatorPrograms).not.toHaveBeenCalled();
    expect(getIskurInterns).not.toHaveBeenCalled();
  });
});
