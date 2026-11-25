import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudentHomeView } from "@/components/student/home-view";
import { useStudentHome } from "@/hooks/use-student-home";
import { AppointmentKind, AppointmentStatus } from "@/interfaces/appointment";
import { itemAt } from "@test/fixtures/list-assertions";
import {
  PEER_MENTORS_FIXTURE,
  peerMentoringRequestsFixture,
} from "@test/fixtures/peer-mentoring";
import { peerAppointment } from "@test/fixtures/student-appointments";
import { studentHomeModel } from "@test/fixtures/student-home";
import { primaryButtons, renderWithQueryClient } from "@test/test-utils";

vi.mock("@/hooks/use-student-home", () => ({ useStudentHome: vi.fn() }));

const officeHours = peerAppointment({
  id: "oh-1",
  requestId: null,
  kind: AppointmentKind.OfficeHours,
  category: null,
  topic: "Ders seçimi ve staj planı",
  counterpart: {
    userId: "academician-1",
    fullName: "Elif Şahin",
    title: "Doç. Dr.",
    department: "Endüstri Mühendisliği",
  },
});
const alternative = peerAppointment({
  id: "oh-2",
  requestId: null,
  kind: AppointmentKind.OfficeHours,
  category: null,
  status: AppointmentStatus.AlternativeProposed,
  counterpart: {
    userId: "academician-2",
    fullName: "Ahmet Kaya",
    title: "Prof. Dr.",
    department: null,
  },
});

function homeReturns(overrides: Parameters<typeof studentHomeModel>[0] = {}) {
  vi.mocked(useStudentHome).mockReturnValue(studentHomeModel(overrides));
}

describe("StudentHomeView", () => {
  beforeEach(() => homeReturns());

  it("greets the student by name", () => {
    renderWithQueryClient(<StudentHomeView />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Günaydın, Ayşe" }),
    ).toBeVisible();
  });

  it("greets without a name when the record has none", () => {
    homeReturns({ name: null });
    renderWithQueryClient(<StudentHomeView />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Günaydın" }),
    ).toBeVisible();
  });

  it("dates the day above the greeting", () => {
    renderWithQueryClient(<StudentHomeView />);
    expect(screen.getByText("Pazartesi, 9 Kasım")).toBeVisible();
  });

  it("puts the next session on its card with its status, place and a link to Randevularım", () => {
    homeReturns({
      next: { ...officeHours, place: "A-204" },
      nextDay: "tomorrow",
    });
    renderWithQueryClient(<StudentHomeView />);

    const card = screen.getByRole("region", {
      name: "Sıradaki randevun · yarın",
    });
    expect(within(card).getByText("Ders seçimi ve staj planı")).toBeVisible();
    expect(within(card).getByText("Onaylandı")).toBeVisible();
    expect(within(card).getByText("Office Hours · A-204")).toBeVisible();
    expect(
      within(card).getByRole("link", { name: "Ayrıntılar" }),
    ).toHaveAttribute("href", "/student/appointments");
  });

  it("asks for an answer to another offered time, old and new side by side", () => {
    homeReturns({
      reply: {
        ...alternative,
        startsAt: "2026-11-12T08:00:00.000Z",
        alternative: {
          startsAt: "2026-11-13T07:30:00.000Z",
          endsAt: "2026-11-13T08:00:00.000Z",
        },
      },
    });
    renderWithQueryClient(<StudentHomeView />);

    const card = screen.getByRole("region", { name: "Yanıtın gerekiyor" });
    expect(
      within(card).getByText("Prof. Dr. Ahmet Kaya yeni bir saat önerdi"),
    ).toBeVisible();
    expect(
      within(card).getByText("Per 12 Kas 11:00 yerine → Cum 13 Kas 10:30"),
    ).toBeVisible();
    expect(
      within(card).getByRole("link", { name: "Öneriyi yanıtla" }),
    ).toHaveAttribute("href", "/student/appointments");
  });

  it("leaves both cards out when nothing is ahead", () => {
    renderWithQueryClient(<StudentHomeView />);
    expect(screen.queryByText(/Sıradaki randevun/)).toBeNull();
    expect(screen.queryByText("Yanıtın gerekiyor")).toBeNull();
    expect(screen.getByText("Yanıt bekleyen talebin yok.")).toBeVisible();
  });

  it("offers the four quick actions with the appointment counts", () => {
    homeReturns({ confirmedCount: 2, requestCount: 1 });
    renderWithQueryClient(<StudentHomeView />);

    const quick = screen.getByRole("navigation", { name: "Hızlı işlemler" });
    expect(
      within(quick)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/student/office-hours",
      "/student/peer-mentoring",
      "/student/appointments",
      "/student/profile",
    ]);
    expect(within(quick).getByText("2 yaklaşan · 1 talep")).toBeVisible();
  });

  it("shows the advisor with a way to ask for Office Hours", () => {
    renderWithQueryClient(<StudentHomeView />);
    const advisor = screen.getByRole("region", { name: "Akademik danışmanın" });
    expect(
      within(advisor).getByRole("link", { name: "Randevu talep et" }),
    ).toHaveAttribute("href", "/student/office-hours");
  });

  it("hides the advisor card without an advisor", () => {
    homeReturns({ advisor: null });
    renderWithQueryClient(<StudentHomeView />);
    expect(screen.queryByText("Akademik danışmanın")).not.toBeInTheDocument();
  });

  it("lists waiting requests with their state", () => {
    const request = itemAt(peerMentoringRequestsFixture(), 0);
    homeReturns({
      awaiting: [alternative],
      peerRequests: [request],
      requestCount: 2,
    });
    renderWithQueryClient(<StudentHomeView />);

    const pending = screen.getByRole("region", { name: "Bekleyen taleplerim" });
    expect(within(pending).getByText("2")).toBeVisible();
    expect(within(pending).getByRole("link", { name: "Tümü" })).toBeVisible();
    expect(within(pending).getByText("Alternatif Önerildi")).toBeVisible();
    expect(within(pending).getByText(request.mentor.fullName)).toBeVisible();
    expect(within(pending).getByText("Onay Bekliyor")).toBeVisible();
  });

  it("recommends mentors as rows with the first reasons, each leading to the mentor's page", () => {
    const mentor = itemAt(PEER_MENTORS_FIXTURE, 0);
    homeReturns({ mentors: [mentor] });
    renderWithQueryClient(<StudentHomeView />);

    const section = screen.getByRole("region", {
      name: "Sana önerilen mentorlar",
    });
    expect(
      within(section).getByText(
        `Neden önerildi: ${mentor.recommendationReasons.slice(0, 2).join(" · ")}`,
      ),
    ).toBeVisible();
    expect(
      within(section).getByRole("link", {
        name: `Profili gör: ${mentor.fullName}`,
      }),
    ).toHaveAttribute(
      "href",
      `/student/peer-mentoring/mentors/${mentor.mentorId}`,
    );
  });

  it("keeps the red Primary for the answer that waits on the student", () => {
    homeReturns({
      next: officeHours,
      awaiting: [alternative],
      mentors: PEER_MENTORS_FIXTURE.slice(0, 2),
    });
    const { unmount } = renderWithQueryClient(<StudentHomeView />);
    expect(primaryButtons()).toHaveLength(0);
    unmount();

    homeReturns({ reply: alternative });
    renderWithQueryClient(<StudentHomeView />);
    expect(primaryButtons()).toHaveLength(1);
  });

  it("renders the extra blocks another edition adds", () => {
    renderWithQueryClient(
      <StudentHomeView main={<p>Ana blok</p>} aside={<p>Yan blok</p>} />,
    );
    expect(screen.getByText("Ana blok")).toBeVisible();
    expect(screen.getByText("Yan blok")).toBeVisible();
  });

  it("shows only the loading note until the data is in", () => {
    homeReturns({ ready: false, isLoading: true, greeting: null });
    renderWithQueryClient(<StudentHomeView />);
    expect(screen.getByText("Yükleniyor…")).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Hızlı işlemler" }),
    ).not.toBeInTheDocument();
  });
});
