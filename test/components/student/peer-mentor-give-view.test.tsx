import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PeerMentorGiveView } from "@/components/student/peer-mentor-give-view";
import {
  BadgeCode,
  BadgeKind,
  BadgeSource,
  BadgeStatus,
  type BadgeAward,
} from "@/interfaces/badges";
import type { InstitutionRecord } from "@/interfaces/institution";
import { Weekday } from "@/interfaces/mentor";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import {
  PeerTopicCategory,
  type PeerMentoringRequest,
  type PeerMentorProfile,
} from "@/interfaces/peer-mentoring";
import { PeerReportStatus } from "@/interfaces/peer-reports";
import { IdentityKind, UserRole, type AppSession } from "@/interfaces/session";
import { TrainingState, type StudentTraining } from "@/interfaces/training";
import { ClientApiError } from "@/lib/client/api";
import { getMyBadges } from "@/lib/client/badges";
import { fetchInstitutionRecord } from "@/lib/client/institution";
import { getIskurOnboarding } from "@/lib/client/iskur-onboarding";
import { getIskurWeek } from "@/lib/client/iskur-weeks";
import {
  getAvailabilitySettings,
  updateAvailabilitySettings,
} from "@/lib/client/mentor-profile";
import { decideMentorRequest } from "@/lib/client/mentor-requests";
import {
  getPeerMentorProfile,
  getReceivedPeerRequests,
  savePeerMentorIntake,
} from "@/lib/client/peer-mentoring";
import {
  getPeerDailyReport,
  getPeerReportMeetings,
  getPeerReportWeek,
  getPeerWeeklyReport,
} from "@/lib/client/peer-reports";
import { getStudentTraining } from "@/lib/client/training";
import { completeForm, onboarding } from "@test/fixtures/iskur-onboarding";
import { createIskurWeek } from "@test/fixtures/iskur-weeks";
import { peerDailyReportFixture } from "@test/fixtures/peer-reports";
import { weeklyReport } from "@test/fixtures/peer-weekly-report";
import { freezeDate, renderWithQueryClient } from "@test/test-utils";

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/student/peer-mentoring",
  useSearchParams: () => search,
}));
vi.mock("@/lib/client/peer-reports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/peer-reports")>()),
  getPeerReportMeetings: vi.fn(),
  getPeerWeeklyReport: vi.fn(),
  getPeerReportWeek: vi.fn(),
  getPeerDailyReport: vi.fn(),
}));

let session: AppSession;
const refresh = vi.fn(async () => null);
vi.mock("@/components/providers/session-provider", () => ({
  useAppSession: () => session,
  useSession: () => ({ session, refresh }),
}));
vi.mock("@/lib/client/badges", () => ({
  getMyBadges: vi.fn(),
  getUserBadges: vi.fn(async () => []),
}));
vi.mock("@/lib/client/institution", () => ({
  fetchInstitutionRecord: vi.fn(),
  fetchInstitutionAdvisees: vi.fn(),
}));
vi.mock("@/lib/client/peer-mentoring", () => ({
  getPeerMentorProfile: vi.fn(),
  getReceivedPeerRequests: vi.fn(),
  savePeerMentorIntake: vi.fn(),
  savePeerMentorProfile: vi.fn(),
  getPeerMentors: vi.fn(),
  getPeerMentoringRequests: vi.fn(),
  createPeerMentoringRequest: vi.fn(),
}));
vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurOnboarding: vi.fn(),
}));
vi.mock("@/lib/client/iskur-weeks", () => ({ getIskurWeek: vi.fn() }));
vi.mock("@/lib/client/student-profile-completion", () => ({
  getProfileCompletionCategories: vi.fn(async () => []),
}));
vi.mock("@/lib/client/training", () => ({
  getStudentTraining: vi.fn(),
}));
vi.mock("@/lib/client/mentor-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/mentor-requests")>()),
  decideMentorRequest: vi.fn(async () => ({})),
}));
vi.mock("@/lib/client/mentor-profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/mentor-profile")>()),
  getAvailabilitySettings: vi.fn(),
  updateAvailabilitySettings: vi.fn(),
}));

function training(state: TrainingState): StudentTraining {
  return {
    state,
    programId: "program-1",
    programName: "İŞKUR Gençlik Programı",
    version: 1,
    videoId: "video-1",
    videoWatched: state === TrainingState.Quiz,
    attemptsLeft: 3,
    nextAttemptAt: null,
    lastScore: null,
    passMark: 7,
    questionCount: 10,
    prismUrl: null,
    prismCompletedAt: null,
  };
}

function student(permissions: UserRole[]): AppSession {
  return {
    userId: "zeynep",
    fullName: "Zeynep Demir",
    email: "zeynep.demir@odtu-dev.invalid",
    jobTitle: "",
    role: UserRole.Mentee,
    permissions,
    institutionKinds: [IdentityKind.Student],
  };
}

function gateAward(
  status: BadgeStatus,
  reason: string | null = null,
): BadgeAward {
  return {
    id: "award-1",
    code: BadgeCode.PeerMentor,
    kind: BadgeKind.Gate,
    programId: "program-1",
    programName: "İŞKUR Akran Mentörlüğü",
    status,
    source: BadgeSource.Coordinator,
    awardedAt: "2026-11-08T10:00:00Z",
    expiresAt: null,
    revokedAt: status === BadgeStatus.Revoked ? "2026-11-09T10:00:00Z" : null,
    reason,
  };
}

function received(
  id: string,
  status: MentorshipRequestStatus,
): PeerMentoringRequest {
  return {
    id,
    mentor: { userId: "zeynep", fullName: "Zeynep Demir", department: null },
    mentee: {
      userId: `student-${id}`,
      fullName: id === "r1" ? "Ayşe Yılmaz" : "Mehmet Kaya",
      department: "Bilgisayar Mühendisliği",
    },
    category: PeerTopicCategory.CareerInternship,
    message: "Staj başvurusu için CV'me bakar mısın?",
    status,
    createdAt: "2026-11-08T17:52:00Z",
    acceptedAt:
      status === MentorshipRequestStatus.Accepted
        ? "2026-11-09T09:00:00Z"
        : null,
  };
}

function publishedProfile(): PeerMentorProfile {
  return {
    categories: [PeerTopicCategory.CareerInternship],
    subTopics: [],
    strongCourses: [],
    projects: [],
    erasmus: null,
    helpWith: "Staj ve CV konusunda yardımcı olurum.",
    linkedinUrl: null,
    department: "Endüstri Mühendisliği",
    classYear: 4,
    menteeCapacity: 3,
    acceptingRequests: true,
    levels: {},
    experiences: [],
  };
}

afterEach(() => {
  vi.useRealTimers();
});

function record(iskurParticipant: boolean): InstitutionRecord {
  return {
    kinds: [IdentityKind.Student],
    fullName: "Zeynep Demir",
    email: null,
    faculty: null,
    departmentName: "Endüstri Mühendisliği",
    classYear: 4,
    programLevel: null,
    academicTitle: null,
    iskurParticipant,
    advisor: null,
    syncedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  freezeDate("2026-11-12T13:00:00Z");
  search = new URLSearchParams();
  vi.mocked(getPeerReportMeetings).mockResolvedValue([]);
  vi.mocked(getPeerWeeklyReport).mockResolvedValue(weeklyReport());
  vi.mocked(getPeerDailyReport).mockResolvedValue(peerDailyReportFixture());
  vi.mocked(getPeerReportWeek).mockResolvedValue({
    weekStart: "2026-11-09",
    days: [],
    dailySent: 0,
  });
  session = student([UserRole.Mentee, UserRole.Mentor]);
  vi.mocked(getMyBadges).mockResolvedValue([gateAward(BadgeStatus.Active)]);
  vi.mocked(fetchInstitutionRecord).mockResolvedValue(record(true));
  vi.mocked(getIskurOnboarding).mockRejectedValue(
    new ClientApiError("Not found", 404),
  );
  vi.mocked(getPeerMentorProfile).mockResolvedValue(null);
  vi.mocked(getStudentTraining).mockResolvedValue(
    training(TrainingState.NotAvailable),
  );
  vi.mocked(getReceivedPeerRequests).mockResolvedValue([]);
  vi.mocked(getAvailabilitySettings).mockResolvedValue({
    rules: [],
    exceptions: [],
    menteeCapacity: 3,
    defaultMeetingDurationMinutes: 30,
    meetingBufferMinutes: 0,
  });
});

describe("PeerMentorGiveView", () => {
  it.each([
    TrainingState.Video,
    TrainingState.Quiz,
    TrainingState.PrismTodo,
    TrainingState.PrismPending,
    TrainingState.PrismRetake,
  ])(
    "links a student without the badge to the training while it is takeable (%s)",
    async (state) => {
      session = student([UserRole.Mentee]);
      vi.mocked(getMyBadges).mockResolvedValue([]);
      vi.mocked(getStudentTraining).mockResolvedValue(training(state));
      renderWithQueryClient(<PeerMentorGiveView />);

      expect(
        await screen.findByRole("heading", {
          name: "Mentor olmak için önce eğitimi tamamla",
        }),
      ).toBeVisible();
      expect(
        await screen.findByRole("link", { name: "Eğitime Git" }),
      ).toHaveAttribute("href", "/student/peer-mentoring/training");
      const steps = screen.getByRole("list", {
        name: "Mentor olma adımları",
      });
      expect(
        within(steps)
          .getByText(
            state === TrainingState.PrismPending
              ? "Rozet onayı"
              : "Eğitimi tamamla",
          )
          .closest("li"),
      ).toHaveAttribute("aria-current", "step");
      const status = screen.getByRole("region", { name: "Rozet durumun" });
      expect(
        within(status).getByText("mevcut durum").closest("li"),
      ).toHaveTextContent(
        state === TrainingState.PrismPending
          ? "Onay bekliyor"
          : state === TrainingState.PrismRetake
            ? /Testi tekrar alman gerekiyor/
            : "Eğitim tamamlanmadı",
      );
      expect(screen.getByText(/ayrı bir hesap açılmaz/)).toBeVisible();
    },
  );

  it.each([
    [
      "the program has no published training",
      () => Promise.resolve(training(TrainingState.NotAvailable)),
      "Programının eğitimi henüz yayında değil.",
    ],
    [
      "peer mentoring is for the program's İŞKUR interns",
      () => Promise.resolve(training(TrainingState.InternsOnly)),
      "Akran mentorluğu İŞKUR stajyerlerine açıktır.",
    ],
    [
      "the training endpoint is absent",
      () => Promise.reject(new ClientApiError("Not found", 404)),
      "Eğitim şu an açılamıyor.",
    ],
  ])(
    "keeps the training button disabled with a reason when %s",
    async (_case, answer, reason) => {
      session = student([UserRole.Mentee]);
      vi.mocked(getMyBadges).mockResolvedValue([]);
      vi.mocked(getStudentTraining).mockImplementation(answer);
      renderWithQueryClient(<PeerMentorGiveView />);

      expect(await screen.findByText(reason)).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Eğitime Git" }),
      ).toBeDisabled();
      expect(
        screen.queryByRole("link", { name: "Eğitime Git" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    TrainingState.PrismTodo,
    TrainingState.PrismPending,
    TrainingState.PrismRetake,
  ])(
    "offers the training to a student who is not in İŞKUR (%s)",
    async (state) => {
      session = student([UserRole.Mentee]);
      vi.mocked(getMyBadges).mockResolvedValue([]);
      vi.mocked(fetchInstitutionRecord).mockResolvedValue(record(false));
      vi.mocked(getStudentTraining).mockResolvedValue(training(state));
      renderWithQueryClient(<PeerMentorGiveView />);

      expect(
        await screen.findByRole("link", { name: "Eğitime Git" }),
      ).toHaveAttribute("href", "/student/peer-mentoring/training");
    },
  );

  it.each([
    [
      "the program has no training to take",
      () => Promise.resolve(training(TrainingState.NotAvailable)),
    ],
    [
      "the program takes only its İŞKUR interns",
      () => Promise.resolve(training(TrainingState.InternsOnly)),
    ],
    [
      "the training cannot be read",
      () => Promise.reject(new ClientApiError("Not found", 404)),
    ],
  ])(
    "shows nothing to a student who is not in İŞKUR when %s",
    async (_case, answer) => {
      session = student([UserRole.Mentee]);
      vi.mocked(getMyBadges).mockResolvedValue([]);
      vi.mocked(fetchInstitutionRecord).mockResolvedValue(record(false));
      vi.mocked(getStudentTraining).mockImplementation(answer);
      renderWithQueryClient(<PeerMentorGiveView />);

      await waitFor(() => expect(getStudentTraining).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
      expect(screen.queryByRole("heading")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
    },
  );

  it("does not ask for the training of a student the badge already opens", async () => {
    vi.mocked(fetchInstitutionRecord).mockResolvedValue(record(false));
    renderWithQueryClient(<PeerMentorGiveView />);

    await waitFor(() => expect(getPeerMentorProfile).toHaveBeenCalled());
    expect(getStudentTraining).not.toHaveBeenCalled();
  });

  // D4 seam: a revoked badge takes MENTOR away and closes the mentor side.
  it("explains a revoked badge with its reason and offers no mentor actions", async () => {
    session = student([UserRole.Mentee]);
    vi.mocked(getMyBadges).mockResolvedValue([
      gateAward(BadgeStatus.Revoked, "Görüşmelere katılmadı"),
    ]);
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(await screen.findByText("Rozetin geri alındı")).toBeVisible();
    expect(screen.getByText("Neden: Görüşmelere katılmadı")).toBeVisible();
    expect(getReceivedPeerRequests).not.toHaveBeenCalled();
  });

  it("invites a new badge holder to create their profile", async () => {
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(await screen.findByText("Rozetin doğrulandı")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Mentor profilini oluştur" }),
    ).toHaveAttribute("href", "/student/peer-mentoring/profile");
    expect(
      within(screen.getByRole("list"))
        .getByText("Mentor Profilini Oluştur")
        .closest("li"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("re-reads the session once when the badge is newer than it, and asks for a sign-in only if that can't help", async () => {
    session = student([UserRole.Mentee]);
    refresh.mockClear();
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(
      await screen.findByText(/çıkış yapıp yeniden giriş yap/),
    ).toBeVisible();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getPeerMentorProfile).not.toHaveBeenCalled();
  });

  it("leaves the session alone when it already carries the badge's permission", async () => {
    session = student([UserRole.Mentee, UserRole.Mentor]);
    refresh.mockClear();
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(await screen.findByText("Rozetin doğrulandı")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("opens on Talepler: accepts a waiting request, with the capacity and the profile beside it", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      received("r1", MentorshipRequestStatus.Pending),
      received("r2", MentorshipRequestStatus.Accepted),
    ]);
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentorGiveView />);

    const panel = await screen.findByRole("tabpanel", { name: /Talepler/ });
    const card = await within(panel).findByRole("article", {
      name: "Ayşe Yılmaz",
    });
    expect(within(card).getByText("Kariyer ve Staj")).toBeVisible();
    expect(within(panel).getByText("1 · en yeniden eskiye")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Talepler · 1" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("tab", { name: "Menteelerim · 1" }),
    ).toBeInTheDocument();
    const capacity = within(panel).getByRole("region", { name: "Kapasiten" });
    expect(within(capacity).getByText("/ 3 aktif mentee")).toBeVisible();
    expect(within(capacity).getByText(/2 yer boş/)).toBeVisible();
    expect(within(capacity).getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "1 / 3 mentee",
    );
    const summary = within(panel).getByRole("region", {
      name: "Mentor profilin",
    });
    expect(within(summary).getByText("Aktif")).toBeVisible();

    expect(
      within(card)
        .getByRole("button", { name: "Kabul et" })
        .closest("[data-tour]"),
    ).toHaveAttribute("data-tour", "peer-request-accept");
    await user.click(within(card).getByRole("button", { name: "Kabul et" }));
    await waitFor(() =>
      expect(vi.mocked(decideMentorRequest).mock.calls[0]?.[0]).toEqual({
        id: "r1",
        status: MentorshipRequestStatus.Accepted,
        message: "Talebini kabul ettim, görüşmek üzere!",
      }),
    );
    expect(await screen.findByText("Talebi kabul ettin.")).toBeVisible();
  });

  it("declines with a reason that goes to the student, or lets the mentor change their mind", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      received("r1", MentorshipRequestStatus.Pending),
    ]);
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentorGiveView />);

    const card = await screen.findByRole("article", { name: "Ayşe Yılmaz" });
    await user.click(within(card).getByRole("button", { name: "Reddet" }));
    const reasons = within(card).getByRole("group", {
      name: "Reddetme nedeni (öğrenciye iletilir)",
    });
    expect(
      within(reasons).getByRole("button", { name: "Saatlerimiz uymuyor" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(within(reasons).getByRole("button", { name: "Vazgeç" }));
    expect(
      within(card).getByRole("button", { name: "Kabul et" }),
    ).toBeVisible();
    expect(decideMentorRequest).not.toHaveBeenCalled();

    await user.click(within(card).getByRole("button", { name: "Reddet" }));
    await user.click(
      within(card).getByRole("button", { name: "Konu uzmanlığım dışında" }),
    );
    await user.click(
      within(card).getByRole("button", { name: "Reddet ve bildir" }),
    );
    await waitFor(() =>
      expect(vi.mocked(decideMentorRequest).mock.calls[0]?.[0]).toEqual({
        id: "r1",
        status: MentorshipRequestStatus.Declined,
        message: "Konu uzmanlığım dışında",
      }),
    );
  });

  it("warns when accepting would fill the capacity", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getAvailabilitySettings).mockResolvedValue({
      rules: [],
      exceptions: [],
      menteeCapacity: 2,
      defaultMeetingDurationMinutes: 30,
      meetingBufferMinutes: 0,
    });
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      received("r1", MentorshipRequestStatus.Pending),
      received("r2", MentorshipRequestStatus.Accepted),
    ]);
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(
      await screen.findByText(
        "Kabul edersen kapasiten 2/2 olur; yeni talepler duraklatılır.",
      ),
    ).toBeVisible();
  });

  it("lists the active mentees on tab=mentees", async () => {
    search = new URLSearchParams("tab=mentees");
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      received("r2", MentorshipRequestStatus.Accepted),
    ]);
    renderWithQueryClient(<PeerMentorGiveView />);

    const panel = await screen.findByRole("tabpanel", { name: /Menteelerim/ });
    const active = await within(panel).findByRole("region", {
      name: /Aktif menteelerim/,
    });
    expect(
      within(active).getByRole("article", { name: "Mehmet Kaya" }),
    ).toBeVisible();
    expect(within(active).getByText("Kabul edildi")).toBeVisible();
    expect(
      within(active).queryByRole("button", { name: "Kabul et" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the open tab in the URL, and opens the availability from the capacity card", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    search = new URLSearchParams("as=MENTOR");
    const user = userEvent.setup();
    renderWithQueryClient(<PeerMentorGiveView />);

    const requests = await screen.findByRole("tab", { name: /Talepler/ });
    expect(requests).toHaveAttribute("aria-selected", "true");
    requests.focus();
    await user.keyboard("{ArrowRight}");
    expect(replace).toHaveBeenLastCalledWith(
      "/student/peer-mentoring?as=MENTOR&tab=mentees",
      { scroll: false },
    );
    await user.click(
      await screen.findByRole("button", { name: "Kapasiteyi düzenle" }),
    );
    expect(replace).toHaveBeenLastCalledWith(
      "/student/peer-mentoring?as=MENTOR&tab=availability",
      { scroll: false },
    );
  });

  it("shows the activity report on tab=report", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    search = new URLSearchParams("as=MENTOR&tab=report");
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(
      await screen.findByRole("tab", { name: "Faaliyet Raporum" }),
    ).toHaveAttribute("aria-selected", "true");
    const report = screen.getByRole("tabpanel", { name: "Faaliyet Raporum" });
    expect(
      await within(report).findByRole("button", { name: "Haftalık Özet" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("tabpanel", { name: /Menteelerim/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the weekly hours editor on tab=availability", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    search = new URLSearchParams("tab=availability");
    renderWithQueryClient(<PeerMentorGiveView />);

    const panel = await screen.findByRole("tabpanel", {
      name: "Müsaitlik ve kapasite",
    });
    expect(
      await within(panel).findByRole("button", { name: "Kaydet" }),
    ).toBeVisible();
  });

  describe("Müsaitlik ve kapasite for an intern", () => {
    beforeEach(() => {
      search = new URLSearchParams("tab=availability");
      vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
      vi.mocked(getIskurOnboarding).mockResolvedValue(
        onboarding(
          completeForm({
            submittedAt: "2026-11-01T10:00:00Z",
            schedule: [
              { day: Weekday.Monday, start: "10:00", end: "14:00" },
              { day: Weekday.Wednesday, start: "09:00", end: "13:00" },
            ],
          }),
        ),
      );
      vi.mocked(getIskurWeek).mockResolvedValue(createIskurWeek());
      vi.mocked(getAvailabilitySettings).mockResolvedValue({
        rules: [
          {
            id: "rule-1",
            dayOfWeek: Weekday.Monday,
            startTime: "12:00",
            endTime: "14:00",
            slotMinutes: 45,
          },
        ],
        exceptions: [],
        menteeCapacity: 3,
        defaultMeetingDurationMinutes: 45,
        meetingBufferMinutes: 0,
      });
      vi.mocked(updateAvailabilitySettings).mockImplementation(
        async (payload) => ({ ...payload, rules: [] }),
      );
    });

    it("fills in the work hours, sums up the week and saves hours inside them", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PeerMentorGiveView />);

      expect(
        await screen.findByText("Görev 4 sa · mentorluk 2 sa"),
      ).toBeVisible();
      expect(screen.getAllByText("Görev günü değil")).toHaveLength(3);
      const summary = screen.getByRole("region", { name: "Haftalık özet" });
      expect(within(summary).getByText("2 sa")).toBeVisible();
      expect(
        await within(summary).findByText(/Mentorluk hedefin/),
      ).toBeVisible();

      await user.click(
        screen.getByRole("button", { name: "Çarşamba için saat ekle" }),
      );
      expect(within(summary).getByText("4 sa")).toBeVisible();
      await user.click(within(summary).getByRole("button", { name: "60 dk" }));
      await user.click(
        within(summary).getByRole("button", { name: "Üst sınırı azalt" }),
      );
      await user.click(screen.getByRole("button", { name: "Kaydet" }));
      await waitFor(() =>
        expect(
          vi.mocked(updateAvailabilitySettings).mock.calls[0]?.[0],
        ).toMatchObject({
          menteeCapacity: 2,
          defaultMeetingDurationMinutes: 60,
          rules: [
            { dayOfWeek: Weekday.Monday, startTime: "12:00", endTime: "14:00" },
            {
              dayOfWeek: Weekday.Wednesday,
              startTime: "09:00",
              endTime: "11:00",
            },
          ],
        }),
      );
    });

    it("keeps a limit changed on Mentor profilim while these hours are being edited", async () => {
      vi.mocked(savePeerMentorIntake).mockResolvedValue(publishedProfile());
      const user = userEvent.setup();
      renderWithQueryClient(<PeerMentorGiveView />);
      await user.click(
        await screen.findByRole("button", { name: "Çarşamba için saat ekle" }),
      );
      const settings = await getAvailabilitySettings();
      vi.mocked(getAvailabilitySettings).mockResolvedValue({
        ...settings,
        menteeCapacity: 5,
      });
      const profile = screen
        .getAllByRole("button", { name: "Üst sınırı artır", hidden: true })
        .at(-1);
      if (!profile) throw new Error("profile tab stepper missing");
      await user.click(profile);
      await waitFor(() => expect(savePeerMentorIntake).toHaveBeenCalled());
      const summary = screen.getByRole("region", { name: "Haftalık özet" });
      expect(await within(summary).findByText("5")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Kaydet" }));
      await waitFor(() =>
        expect(
          vi.mocked(updateAvailabilitySettings).mock.calls[0]?.[0]
            .menteeCapacity,
        ).toBe(5),
      );
    });

    it("refuses hours outside the work hours", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PeerMentorGiveView />);

      await user.click(
        await screen.findByRole("button", {
          name: "Pazartesi saatlerini düzenle",
        }),
      );
      const end = screen.getByLabelText("Pazartesi 1. aralık bitiş");
      await user.clear(end);
      await user.type(end, "15:00");
      expect(
        screen.getByText("12:00–15:00 görev saatlerinin dışında."),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Kaydet" }));
      expect(
        await screen.findByText(
          "Mentorluk saatlerin görev saatlerinin içinde olmalı: Pazartesi.",
        ),
      ).toBeVisible();
      expect(updateAvailabilitySettings).not.toHaveBeenCalled();
    });
  });

  it("falls back to Talepler for an unknown tab", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    search = new URLSearchParams("tab=unknown");
    renderWithQueryClient(<PeerMentorGiveView />);
    expect(
      await screen.findByRole("tab", { name: /Talepler/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  describe("Mentor profilim", () => {
    beforeEach(() => {
      search = new URLSearchParams("tab=profile");
      vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
      vi.mocked(getAvailabilitySettings).mockResolvedValue({
        rules: [
          {
            id: "rule-1",
            dayOfWeek: Weekday.Monday,
            startTime: "12:00",
            endTime: "14:00",
            slotMinutes: 45,
          },
        ],
        exceptions: [
          {
            startsOn: "2026-11-27",
            endsOn: "2026-11-27",
            reason: "sınav haftası",
          },
        ],
        menteeCapacity: 3,
        defaultMeetingDurationMinutes: 45,
        meetingBufferMinutes: 0,
      });
    });

    it("shows the profile, the hours and the capacity, and leads to the wizard", async () => {
      renderWithQueryClient(<PeerMentorGiveView />);

      const panel = await screen.findByRole("tabpanel", {
        name: "Mentor profilim",
      });
      const profile = within(panel).getByRole("region", {
        name: "Zeynep Demir",
      });
      expect(within(profile).getByText("Aktif")).toBeVisible();
      expect(within(profile).getByText("Kariyer ve Staj")).toBeVisible();
      expect(
        within(profile).getByRole("link", { name: "Profili düzenle" }),
      ).toHaveAttribute("href", "/student/peer-mentoring/profile");
      const hours = within(panel).getByRole("region", { name: "Müsaitliğim" });
      expect(await within(hours).findByText("12:00 – 14:00")).toBeVisible();
      expect(within(hours).getByText("27 Kasım · sınav haftası")).toBeVisible();
      expect(within(hours).getByText("45 dk")).toBeVisible();
      const capacity = within(panel).getByRole("region", { name: "Kapasitem" });
      expect(
        await within(capacity).findByText("/ 3 aktif mentee · 3 yer boş"),
      ).toBeVisible();
      expect(
        within(panel).getByText("Onaylı görüşmelerin korunur"),
      ).toBeVisible();
    });

    it("previews the profile as a student sees it", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PeerMentorGiveView />);

      await user.click(
        await screen.findByRole("button", { name: "Öğrenci gözünden önizle" }),
      );
      const dialog = screen.getByRole("dialog", {
        name: "Profilin öğrencilere böyle görünüyor",
      });
      expect(
        within(dialog).getByText("Staj ve CV konusunda yardımcı olurum."),
      ).toBeVisible();
      expect(within(dialog).queryByText(/@/)).toBeNull();
      await user.click(within(dialog).getByRole("button", { name: "Kapat" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("saves the limit and the new-requests switch at once", async () => {
      vi.mocked(savePeerMentorIntake).mockImplementation(
        async ({ acceptingRequests }) => ({
          ...publishedProfile(),
          acceptingRequests,
        }),
      );
      const user = userEvent.setup();
      renderWithQueryClient(<PeerMentorGiveView />);

      await user.click(
        await screen.findByRole("button", { name: "Üst sınırı artır" }),
      );
      await waitFor(() =>
        expect(vi.mocked(savePeerMentorIntake).mock.calls[0]?.[0]).toEqual({
          menteeCapacity: 4,
          acceptingRequests: true,
        }),
      );
      const accepting = screen.getByRole("switch", {
        name: "Yeni talep almaya açığım",
      });
      expect(accepting).toHaveAttribute("aria-checked", "true");
      await user.click(accepting);
      await waitFor(() =>
        expect(vi.mocked(savePeerMentorIntake).mock.calls[1]?.[0]).toEqual({
          menteeCapacity: null,
          acceptingRequests: false,
        }),
      );
      await waitFor(() =>
        expect(accepting).toHaveAttribute("aria-checked", "false"),
      );
      const panel = screen.getByRole("tabpanel", { name: "Mentor profilim" });
      expect(within(panel).getByText("Yeni talep almıyor")).toBeVisible();
    });

    it("keeps the old setting and says so when a save fails", async () => {
      vi.mocked(savePeerMentorIntake).mockRejectedValue(
        new ClientApiError("Olmadı.", 500),
      );
      const user = userEvent.setup();
      renderWithQueryClient(<PeerMentorGiveView />);

      const accepting = await screen.findByRole("switch", {
        name: "Yeni talep almaya açığım",
      });
      await user.click(accepting);
      expect(await screen.findByText("Olmadı.")).toBeVisible();
      expect(accepting).toHaveAttribute("aria-checked", "true");
    });
  });

  it("disables Kabul et once the capacity is full", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getAvailabilitySettings).mockResolvedValue({
      rules: [],
      exceptions: [],
      menteeCapacity: 1,
      defaultMeetingDurationMinutes: 30,
      meetingBufferMinutes: 0,
    });
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      received("r1", MentorshipRequestStatus.Pending),
      received("r2", MentorshipRequestStatus.Accepted),
    ]);
    renderWithQueryClient(<PeerMentorGiveView />);

    const card = await screen.findByRole("article", { name: "Ayşe Yılmaz" });
    await waitFor(() =>
      expect(
        within(card).getByRole("button", { name: "Kabul et" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByText(/Kapasiten dolu; yeni talep kabul etmek için/),
    ).toBeVisible();
    expect(within(card).getByRole("button", { name: "Reddet" })).toBeEnabled();
  });

  it("asks for the latest held meeting's report and shows this week's report", async () => {
    search = new URLSearchParams("tab=mentees");
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    const [meeting] = peerDailyReportFixture().meetings;
    if (!meeting) throw new Error("fixture meeting missing");
    vi.mocked(getPeerReportMeetings).mockResolvedValue([
      {
        ...meeting,
        meetingId: "m-sent",
        menteeName: "Emre Kaya",
        reportStatus: PeerReportStatus.InReview,
      },
      {
        ...meeting,
        meetingId: "m-due",
        menteeName: "Ayşe Yıldız",
        reportStatus: null,
      },
    ]);
    renderWithQueryClient(<PeerMentorGiveView />);

    const banner = await screen.findByRole("region", {
      name: /Ayşe Yıldız ile görüşmen tamamlandı/,
    });
    expect(
      within(banner).getByRole("link", { name: "Görüşme Raporunu Doldur" }),
    ).toHaveAttribute("href", "/student/peer-mentoring/reports/meetings/m-due");
    expect(getPeerReportMeetings).toHaveBeenCalledWith(
      "2026-11-06",
      "2026-11-12",
    );

    const week = await screen.findByRole("region", {
      name: "Bu haftanın raporu",
    });
    expect(getPeerWeeklyReport).toHaveBeenCalledWith("2026-11-09");
    expect(within(week).getByText("Taslak")).toBeVisible();
    expect(
      within(week).getByText("11 faaliyet otomatik eklendi"),
    ).toBeVisible();
    expect(
      within(week).getByText("Haftalık değerlendirmen bekleniyor"),
    ).toBeVisible();
    expect(within(week).getByText("Teslim: 16 Kasım, 23:59")).toBeVisible();
    expect(
      within(week).getByRole("link", { name: "Raporu Tamamla" }),
    ).toHaveAttribute(
      "href",
      "/student/peer-mentoring?as=MENTOR&tab=report&view=weekly&week=2026-11-09",
    );
  });

  it("says so when the report cards can't be read, instead of hiding them", async () => {
    search = new URLSearchParams("tab=mentees");
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getPeerReportMeetings).mockRejectedValue(
      new ClientApiError("Görüşmeler okunamadı.", 500),
    );
    renderWithQueryClient(<PeerMentorGiveView />);

    const mentees = await screen.findByRole("tabpanel", {
      name: /Menteelerim/,
    });
    expect(
      await within(mentees).findByText(/Görüşmeler okunamadı/),
    ).toBeVisible();
  });

  it("drops the evaluation line once the week is sent", async () => {
    search = new URLSearchParams("tab=mentees");
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    vi.mocked(getPeerWeeklyReport).mockResolvedValue(
      weeklyReport({ status: PeerReportStatus.InReview, editable: false }),
    );
    renderWithQueryClient(<PeerMentorGiveView />);

    const week = await screen.findByRole("region", {
      name: "Bu haftanın raporu",
    });
    expect(
      within(week).getByText("11 faaliyet otomatik eklendi"),
    ).toBeVisible();
    expect(
      within(week).queryByText("Haftalık değerlendirmen bekleniyor"),
    ).not.toBeInTheDocument();
  });

  it("shows no banner when every held meeting has its report", async () => {
    search = new URLSearchParams("tab=mentees");
    vi.mocked(getPeerMentorProfile).mockResolvedValue(publishedProfile());
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(
      await screen.findByRole("region", { name: "Bu haftanın raporu" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Görüşme Raporunu Doldur" }),
    ).not.toBeInTheDocument();
  });

  it("reads the capacity from the saved availability settings, so the card follows a save", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue({
      categories: [PeerTopicCategory.CareerInternship],
      subTopics: [],
      strongCourses: [],
      projects: [],
      erasmus: null,
      helpWith: "Staj ve CV konusunda yardımcı olurum.",
      linkedinUrl: null,
      department: null,
      classYear: null,
      menteeCapacity: 3,
      acceptingRequests: true,
      levels: {},
      experiences: [],
    });
    vi.mocked(getAvailabilitySettings).mockResolvedValue({
      rules: [],
      exceptions: [],
      menteeCapacity: 5,
      defaultMeetingDurationMinutes: 30,
      meetingBufferMinutes: 0,
    });
    renderWithQueryClient(<PeerMentorGiveView />);

    const capacity = await screen.findByRole("region", { name: "Kapasiten" });
    expect(await within(capacity).findByText("/ 5 aktif mentee")).toBeVisible();
  });

  it("tells the mentor on Menteelerim when the requests can't be read", async () => {
    search = new URLSearchParams("tab=mentees");
    vi.mocked(getPeerMentorProfile).mockResolvedValue({
      categories: [PeerTopicCategory.CareerInternship],
      subTopics: [],
      strongCourses: [],
      projects: [],
      erasmus: null,
      helpWith: "Staj ve CV konusunda yardımcı olurum.",
      linkedinUrl: null,
      department: null,
      classYear: null,
      menteeCapacity: 3,
      acceptingRequests: true,
      levels: {},
      experiences: [],
    });
    vi.mocked(getReceivedPeerRequests).mockRejectedValue(
      new ClientApiError("Talepler okunamadı.", 500),
    );
    renderWithQueryClient(<PeerMentorGiveView />);

    const mentees = await screen.findByRole("tabpanel", {
      name: /Menteelerim/,
    });
    expect(
      await within(mentees).findByText(/Talepler okunamadı/),
    ).toBeVisible();
  });

  it("says when there is nothing to answer yet", async () => {
    vi.mocked(getPeerMentorProfile).mockResolvedValue({
      categories: [PeerTopicCategory.CareerInternship],
      subTopics: [],
      strongCourses: [],
      projects: [],
      erasmus: null,
      helpWith: "Staj ve CV konusunda yardımcı olurum.",
      linkedinUrl: null,
      department: null,
      classYear: null,
      menteeCapacity: null,
      acceptingRequests: true,
      levels: {},
      experiences: [],
    });
    vi.mocked(getAvailabilitySettings).mockResolvedValue({
      rules: [],
      exceptions: [],
      menteeCapacity: null,
      defaultMeetingDurationMinutes: 30,
      meetingBufferMinutes: 0,
    });
    renderWithQueryClient(<PeerMentorGiveView />);

    expect(await screen.findByText("Yanıt bekleyen talep yok.")).toBeVisible();
    const panel = screen.getByRole("tabpanel", { name: /Talepler/ });
    expect(
      await within(panel).findByText(/Kapasite belirlemedin/),
    ).toBeVisible();
    expect(within(panel).queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
