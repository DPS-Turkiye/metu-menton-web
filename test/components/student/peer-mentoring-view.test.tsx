import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PeerMentoringView } from "@/components/student/peer-mentoring-view";
import { BadgeCode, BadgeKind } from "@/interfaces/badges";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import {
  PeerMentorGateState,
  PeerTopicCategory,
} from "@/interfaces/peer-mentoring";
import {
  addPeerMentoringRequestFixture,
  peerMentorCountsFixture,
  peerMentoringRequestsFixture,
  peerMentorsFixture,
  resetPeerMentoringFixtures,
} from "@test/fixtures/peer-mentoring";
import {
  InLocale,
  primaryButtons,
  renderWithQueryClient,
} from "@test/test-utils";

const gate = { state: PeerMentorGateState.Hidden };
vi.mock(
  "@/hooks/use-office-hours-open",
  () => import("@test/mocks/office-hours-open"),
);
vi.mock("@/hooks/use-peer-mentor-give", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-peer-mentor-give")>()),
  usePeerMentorGate: () => ({
    state: gate.state,
    gateAward: null,
    isLoading: false,
    sessionBehind: false,
  }),
}));

vi.mock("@/lib/client/peer-mentoring", () => ({
  getPeerCategories: vi.fn(async () => {
    const { PEER_TOPIC_CATEGORIES } =
      await import("@/interfaces/peer-mentoring");
    return [...PEER_TOPIC_CATEGORIES];
  }),
  getPeerMentors: vi.fn(async (filter) =>
    structuredClone(peerMentorsFixture(filter)),
  ),
  getPeerMentorCounts: vi.fn(async () => {
    const { PEER_TOPIC_CATEGORIES } =
      await import("@/interfaces/peer-mentoring");
    return peerMentorCountsFixture(PEER_TOPIC_CATEGORIES);
  }),
  getPeerMentoringRequests: vi.fn(async () =>
    structuredClone(peerMentoringRequestsFixture()),
  ),
  createPeerMentoringRequest: vi.fn(async (input) =>
    structuredClone(addPeerMentoringRequestFixture(input)),
  ),
}));

let interests: string[] = [];
vi.mock("@/lib/client/student-profile-completion", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/client/student-profile-completion")
  >()),
  getStudentProfileCompletion: vi.fn(async () => ({
    topics: interests,
    subtopics: [],
    goal: "",
    completed: true,
    skipped: false,
  })),
}));

const replace = vi.fn();
let search = "";
vi.mock("@/lib/client/training", async () => {
  const { TrainingState } = await import("@/interfaces/training");
  return {
    getStudentTraining: vi.fn(async () => ({
      state: TrainingState.NotAvailable,
    })),
  };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/student/peer-mentoring",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  interests = [];
  gate.state = PeerMentorGateState.Hidden;
  search = "";
  replace.mockClear();
  resetPeerMentoringFixtures();
});

async function mentorCard(name: string) {
  const recommended = await screen.findByRole("region", {
    name: /Sana önerilenler/,
  });
  return within(recommended).findByRole("article", { name });
}

describe("PeerMentoringView › Keşfet", () => {
  it("recommends the mentors with a reason and lists the rest under Tüm mentorlar", async () => {
    renderWithQueryClient(<PeerMentoringView />);

    const deniz = await mentorCard("Deniz Kaya");
    expect(
      within(deniz).getByText("Bilgisayar Mühendisliği · 4. sınıf"),
    ).toBeVisible();
    expect(within(deniz).getByText("Neden önerildi")).toBeVisible();
    expect(within(deniz).getByText("Bu derste güçlü: CENG 242")).toBeVisible();
    expect(
      within(deniz).getByRole("link", {
        name: "Profili gör ve talep gönder, Deniz Kaya",
      }),
    ).toHaveAttribute("href", "/student/peer-mentoring/mentors/fixture-peer-1");

    const all = screen.getByRole("region", { name: "Tüm mentorlar" });
    expect(
      within(all).getByRole("heading", { name: "Zeynep Arslan" }),
    ).toBeVisible();
    expect(within(all).getByText("Psikoloji · 3. sınıf")).toBeVisible();
    expect(
      within(all).getByRole("link", { name: "Profili gör, Zeynep Arslan" }),
    ).toHaveAttribute("href", "/student/peer-mentoring/mentors/fixture-peer-4");
  });

  it("marks a recommended mentor who holds the training badge", async () => {
    const { getPeerMentors } = await import("@/lib/client/peer-mentoring");
    const mentors = await getPeerMentors({ category: null, query: "" });
    vi.mocked(getPeerMentors).mockResolvedValueOnce(
      mentors.map((mentor) =>
        mentor.fullName === "Deniz Kaya"
          ? {
              ...mentor,
              badges: [
                {
                  code: BadgeCode.PeerMentor,
                  kind: BadgeKind.Gate,
                  programId: null,
                  awardedAt: "2026-10-01T10:00:00+03:00",
                },
              ],
            }
          : mentor,
      ),
    );
    renderWithQueryClient(<PeerMentoringView />);
    expect(
      within(await mentorCard("Deniz Kaya")).getByText("Eğitim rozeti"),
    ).toBeVisible();
    expect(
      within(await mentorCard("Elif Şahin")).queryByText("Eğitim rozeti"),
    ).toBeNull();
  });

  it("has no red Primary on the mentor cards or rows", async () => {
    renderWithQueryClient(<PeerMentoringView />);
    await mentorCard("Deniz Kaya");
    expect(primaryButtons()).toHaveLength(0);
  });

  it("adds the student's matching interests to Neden önerildi", async () => {
    interests = [
      PeerTopicCategory.TechnicalDigital,
      PeerTopicCategory.CampusLife,
    ];
    renderWithQueryClient(<PeerMentoringView />);

    const card = await mentorCard("Deniz Kaya");
    expect(
      await within(card).findByText(
        "İlgi alanlarınla eşleşiyor: Teknik ve Dijital Beceriler",
      ),
    ).toBeVisible();
    expect(within(card).getByText("Aynı bölüm")).toBeVisible();
    const elif = await mentorCard("Elif Şahin");
    expect(within(elif).queryByText(/İlgi alanlarınla eşleşiyor/)).toBeNull();
  });

  it("says why a request can't be sent to a mentor already asked or with no places", async () => {
    renderWithQueryClient(<PeerMentoringView />);

    const elif = await mentorCard("Elif Şahin");
    expect(
      await within(elif).findByText("Talebin yanıt bekliyor"),
    ).toBeVisible();
    expect(
      within(elif).getByRole("link", { name: "Profili gör, Elif Şahin" }),
    ).toBeVisible();
    const mert = await mentorCard("Mert Aydın");
    expect(
      within(mert).getByText("Kapasitesi dolu · yeni talep almıyor"),
    ).toBeVisible();
  });

  it("doesn't offer a request to the student's current mentor", async () => {
    const { getPeerMentoringRequests } =
      await import("@/lib/client/peer-mentoring");
    const [elif] = peerMentoringRequestsFixture();
    if (!elif) throw new Error("fixture request missing");
    vi.mocked(getPeerMentoringRequests).mockResolvedValueOnce([
      {
        ...elif,
        mentor: {
          userId: "fixture-peer-1",
          fullName: "Deniz Kaya",
          department: "Bilgisayar Mühendisliği",
        },
        status: MentorshipRequestStatus.Accepted,
      },
    ]);
    renderWithQueryClient(<PeerMentoringView />);

    const deniz = await mentorCard("Deniz Kaya");
    expect(await within(deniz).findByText("Zaten mentorun")).toBeVisible();
    expect(
      within(deniz).getByRole("link", { name: "Profili gör, Deniz Kaya" }),
    ).toBeVisible();
  });

  it("filters by a category chip and by text", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentoringView />);
    await mentorCard("Deniz Kaya");

    const international = screen.getByRole("button", {
      name: /^Uluslararası Fırsatlar/,
    });
    await user.click(international);
    expect(international).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Deniz Kaya" })).toBeNull(),
    );
    // While filtering, every match is a search result.
    expect(
      screen.queryByRole("region", { name: /Sana önerilenler/ }),
    ).toBeNull();
    expect(screen.getByRole("heading", { name: "Elif Şahin" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Tümü" }));
    expect(international).toHaveAttribute("aria-pressed", "false");
    await user.type(
      screen.getByPlaceholderText("Mentor veya konu ara"),
      "psikoloji",
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Deniz Kaya" })).toBeNull(),
    );
    expect(
      screen.getByRole("heading", { name: "Zeynep Arslan" }),
    ).toBeVisible();

    await user.type(screen.getByPlaceholderText("Mentor veya konu ara"), "xyz");
    expect(
      await screen.findByText("Bu filtrelere uyan akran mentoru yok."),
    ).toBeVisible();
  });

  it("shows how many of the program's mentors offer each category", async () => {
    renderWithQueryClient(<PeerMentoringView />);

    expect(
      await screen.findByRole("button", { name: "Kariyer ve Staj, 1 mentor" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Uluslararası Fırsatlar, 1 mentor" }),
    ).toBeVisible();
  });

  it("leaves the counts off the category chips when they can't be read", async () => {
    const { getPeerMentorCounts } = await import("@/lib/client/peer-mentoring");
    vi.mocked(getPeerMentorCounts).mockRejectedValueOnce(new Error("down"));
    renderWithQueryClient(<PeerMentoringView />);
    await mentorCard("Deniz Kaya");

    expect(
      screen.getByRole("button", { name: "Kariyer ve Staj" }),
    ).toBeVisible();
    expect(screen.queryByText("1 mentor")).toBeNull();
  });

  it("filters by a sub-topic and by a free slot this week", async () => {
    const user = userEvent.setup();
    const { getPeerMentors } = await import("@/lib/client/peer-mentoring");
    renderWithQueryClient(<PeerMentoringView />);
    await mentorCard("Deniz Kaya");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Alt konu" }),
      "Değişim Programları",
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Deniz Kaya" })).toBeNull(),
    );
    expect(screen.getByRole("heading", { name: "Elif Şahin" })).toBeVisible();
    expect(vi.mocked(getPeerMentors)).toHaveBeenLastCalledWith(
      expect.objectContaining({ subTopic: "fixture-exchange" }),
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Alt konu" }),
      "Alt konu",
    );
    const thisWeek = screen.getByRole("button", {
      name: "Bu hafta boş saati olanlar",
    });
    await user.click(thisWeek);
    expect(thisWeek).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Elif Şahin" })).toBeNull(),
    );
    const all = screen.getByRole("region", { name: "Tüm mentorlar" });
    expect(
      within(all).getByRole("heading", { name: "Deniz Kaya" }),
    ).toBeVisible();
    expect(within(all).getAllByText("Bu hafta boş saati var")).toHaveLength(2);
  });

  it("offers only the chosen category's sub-topics and drops one that no longer applies", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentoringView />);
    await mentorCard("Deniz Kaya");
    const subTopic = screen.getByRole("combobox", { name: "Alt konu" });
    await user.selectOptions(subTopic, "CV Hazırlama");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Kategori" }),
      "Uluslararası Fırsatlar",
    );

    expect(subTopic).toHaveValue("");
    expect(
      within(subTopic)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Alt konu",
      "Değişim Programları",
      "Yurt Dışında Staj",
      "Yurt Dışında Yüksek Lisans",
      "Dil Sınavları",
      "Uluslararası Burslar",
    ]);
  });
});

describe("PeerMentoringView › program categories", () => {
  it("says the program has no active category yet instead of 'no mentors'", async () => {
    const { getPeerCategories } = await import("@/lib/client/peer-mentoring");
    const { getPeerMentors } = await import("@/lib/client/peer-mentoring");
    vi.mocked(getPeerCategories).mockResolvedValueOnce([]);
    vi.mocked(getPeerMentors).mockResolvedValueOnce([]);
    renderWithQueryClient(<PeerMentoringView />);

    expect(
      await screen.findByText(
        "Programında henüz etkin akran mentörlüğü kategorisi yok.",
      ),
    ).toBeInTheDocument();
  });

  it("offers only the program's active categories as filters", async () => {
    const { PeerTopicCategory } = await import("@/interfaces/peer-mentoring");
    const { getPeerCategories } = await import("@/lib/client/peer-mentoring");
    vi.mocked(getPeerCategories).mockResolvedValueOnce([
      PeerTopicCategory.CareerInternship,
    ]);
    renderWithQueryClient(<PeerMentoringView />);

    expect(
      await screen.findByRole("button", { name: /^Kariyer ve Staj/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Uluslararası Fırsatlar/ }),
    ).not.toBeInTheDocument();
  });
});

describe("PeerMentoringView › switch", () => {
  it("shows only Mentorluk Al to a student who is neither in İŞKUR nor a peer mentor", async () => {
    renderWithQueryClient(<PeerMentoringView />);
    expect(screen.getByRole("tab", { name: "Keşfet" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Mentorluk Ver" })).toBeNull();
  });

  it("opens Mentorluklarım from a ?tab=mine link, and Keşfet drops the parameter again", async () => {
    search = "tab=mine";
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentoringView />);
    expect(screen.getByRole("tab", { name: /Mentorluklarım/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "Keşfet" }));
    expect(replace).toHaveBeenCalledWith("/student/peer-mentoring", {
      scroll: false,
    });
  });

  it("answers a Mentorluk Ver link from such a student with Mentorluk Al", async () => {
    search = "as=MENTOR";
    renderWithQueryClient(<PeerMentoringView />);
    expect(await mentorCard("Deniz Kaya")).toBeVisible();
  });

  it("offers Mentorluk Ver to an İŞKUR student without the badge, with the tour anchor on it", async () => {
    gate.state = PeerMentorGateState.NoBadge;
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentoringView />);

    const give = screen.getByRole("button", { name: "Mentorluk Ver" });
    expect(give).toHaveAttribute("data-tour", "peer-mentoring-give-toggle");
    await user.click(give);
    expect(replace).toHaveBeenCalledWith("/student/peer-mentoring?as=MENTOR", {
      scroll: false,
    });

    search = "as=MENTOR";
    renderWithQueryClient(<PeerMentoringView />);
    expect(
      screen.getByRole("heading", {
        name: "Mentor olmak için önce eğitimi tamamla",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Eğitime Git" })).toBeDisabled();
  });

  it("reads in English", async () => {
    renderWithQueryClient(
      <InLocale locale="en">
        <PeerMentoringView />
      </InLocale>,
    );
    expect(screen.getByRole("tab", { name: "Discover" })).toBeVisible();
    expect(
      await screen.findByRole("link", {
        name: "View profile and send a request, Deniz Kaya",
      }),
    ).toBeVisible();
    expect(
      screen.getAllByText("Careers and internships").length,
    ).toBeGreaterThan(0);
  });
});
