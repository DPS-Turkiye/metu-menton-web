import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PeerMentorPublicProfile } from "@/components/student/peer-mentor-public-profile";
import { BadgeCode, BadgeKind } from "@/interfaces/badges";
import { PeerEvidenceType } from "@/interfaces/peer-mentor-documents";
import { getPeerMentorDocuments } from "@/lib/client/peer-mentor-documents";
import { getPeerMentor } from "@/lib/client/peer-mentoring";
import {
  peerFileFixture,
  peerLinkFixture,
} from "@test/fixtures/peer-mentor-documents";
import {
  addPeerMentoringRequestFixture,
  peerMentorDetailFixture,
  peerMentoringRequestsFixture,
  resetPeerMentoringFixtures,
} from "@test/fixtures/peer-mentoring";
import { primaryButtons, renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/peer-mentoring", () => ({
  getPeerCategories: vi.fn(async () => {
    const { PEER_TOPIC_CATEGORIES } =
      await import("@/interfaces/peer-mentoring");
    return [...PEER_TOPIC_CATEGORIES];
  }),
  getPeerMentor: vi.fn(async (id: string) =>
    structuredClone(peerMentorDetailFixture(id)),
  ),
  getPeerMentoringRequests: vi.fn(async () =>
    structuredClone(peerMentoringRequestsFixture()),
  ),
  createPeerMentoringRequest: vi.fn(async (input) =>
    structuredClone(addPeerMentoringRequestFixture(input)),
  ),
}));
vi.mock("@/lib/client/peer-mentor-documents", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/client/peer-mentor-documents")
  >()),
  getPeerMentorDocuments: vi.fn(async () => []),
}));
vi.mock("@/lib/client/student-profile-completion", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/client/student-profile-completion")
  >()),
  getStudentProfileCompletion: vi.fn(async () => ({
    topics: [],
    subtopics: [],
    goal: "",
    completed: true,
    skipped: false,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  resetPeerMentoringFixtures();
});

describe("PeerMentorPublicProfile", () => {
  it("shows the mentor, their topics and help text, why they were recommended, and sends a request", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Deniz Kaya" }),
    ).toBeVisible();
    expect(
      screen.getByText("Bilgisayar Mühendisliği · 4. sınıf · Akran mentor"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Akran Mentörlüğü" }),
    ).toHaveAttribute("href", "/student/peer-mentoring");
    const topics = screen.getByRole("region", {
      name: "Yardımcı olabileceği konular",
    });
    expect(within(topics).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByText("Bu derste güçlü: CENG 242")).toBeVisible();
    // The fixture's Deniz has no Akran Mentoru badge, so no "verified" tag.
    expect(
      screen.queryByText("Mentorluk eğitimi rozeti · doğrulandı"),
    ).toBeNull();

    const request = screen.getByRole("button", {
      name: "Mentorluk talebi gönder, Deniz Kaya",
    });
    expect(primaryButtons()).toEqual([request]);
    await user.click(request);
    expect(
      screen.getByRole("dialog", { name: "Mentorluk talebi gönder" }),
    ).toBeVisible();
  });

  it("marks a mentor holding the Akran Mentoru badge as verified", async () => {
    const deniz = peerMentorDetailFixture("fixture-peer-1");
    if (!deniz) throw new Error("fixture mentor missing");
    vi.mocked(getPeerMentor).mockResolvedValueOnce({
      ...deniz,
      badges: [
        {
          code: BadgeCode.PeerMentor,
          kind: BadgeKind.Gate,
          programId: "fixture-program",
          awardedAt: "2026-10-01T10:00:00+03:00",
        },
      ],
    });
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );
    expect(
      await screen.findByText("Mentorluk eğitimi rozeti · doğrulandı"),
    ).toBeVisible();
  });

  it("asks for the one mentor rather than the whole directory", async () => {
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );
    await screen.findByRole("heading", { level: 1, name: "Deniz Kaya" });

    expect(getPeerMentor).toHaveBeenCalledWith("fixture-peer-1");
  });

  it("shows the sub-topics, experience, LinkedIn and weekly hours the wizard published", async () => {
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );

    const topics = await screen.findByRole("region", {
      name: "Yardımcı olabileceği konular",
    });
    expect(within(topics).getByText("Örnek: CV hazırlama")).toBeVisible();
    // A sub-topic the catalogue doesn't know shows as written.
    expect(within(topics).getByText("Serbest konu")).toBeVisible();

    const experience = screen.getByRole("region", { name: "İlgili deneyim" });
    expect(
      within(experience).getByText("Yaz stajyeri — ABC Lojistik"),
    ).toBeVisible();
    expect(
      within(experience).getByText(
        "Temmuz 2025 – Ağustos 2025 · Haftalık operasyon raporları hazırladım.",
      ),
    ).toBeVisible();
    expect(
      within(experience).getByText("Eylül 2024 – Devam ediyor"),
    ).toBeVisible();
    expect(within(experience).getByText("CENG 242 · CENG 315")).toBeVisible();
    expect(
      within(experience).getByText("Kampüs etkinlik uygulaması"),
    ).toBeVisible();
    expect(within(experience).getByText("TU Delft, 2025 bahar")).toBeVisible();

    const linkedin = screen.getByRole("link", {
      name: "LinkedIn profili (yeni sekmede açılır)",
    });
    expect(linkedin).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/deniz-kaya",
    );
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer nofollow");

    const hours = screen.getByRole("region", { name: "Müsaitlik" });
    const days = within(hours).getAllByRole("term");
    expect(days.map((day) => day.textContent)).toEqual(["Salı", "Cumartesi"]);
    expect(within(hours).getByText("18:00 – 20:00")).toBeVisible();
    expect(within(hours).getByText("Bu hafta boş saati var")).toBeVisible();
  });

  it("leaves out empty sections and says when there are no hours or free slots", async () => {
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-2" />,
    );
    await screen.findByRole("heading", { level: 1, name: "Elif Şahin" });

    expect(screen.queryByRole("region", { name: "İlgili deneyim" })).toBeNull();
    expect(screen.queryByRole("link", { name: /LinkedIn profili/ })).toBeNull();
    const hours = screen.getByRole("region", { name: "Müsaitlik" });
    expect(within(hours).getByText("Haftalık saat eklenmemiş.")).toBeVisible();
    expect(within(hours).getByText("Bu hafta boş saati yok")).toBeVisible();
  });

  it("never turns a LinkedIn value that isn't a web link into a link", async () => {
    const deniz = peerMentorDetailFixture("fixture-peer-1");
    if (!deniz) throw new Error("fixture mentor missing");
    vi.mocked(getPeerMentor).mockResolvedValueOnce({
      ...deniz,
      linkedinUrl: "javascript:alert(1)",
    });
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );
    await screen.findByRole("heading", { level: 1, name: "Deniz Kaya" });

    expect(screen.queryByRole("link", { name: /LinkedIn profili/ })).toBeNull();
  });

  it("reloads the mentor after a request is sent, since their places may have changed", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Mentorluk talebi gönder, Deniz Kaya",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Mentorluk talebi gönder",
    });
    expect(
      within(dialog).getByText("Akran mentor · Bilgisayar Mühendisliği"),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Kariyer ve Staj" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.type(within(dialog).getByLabelText("Kısa mesaj"), "Merhaba");
    expect(within(dialog).getByText(/7 \/ 1000$/)).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Talebi gönder" }),
    );
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Mesajın en az 20 karakter olmalı.",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Teknik ve Dijital Beceriler",
      }),
    );
    await user.type(
      within(dialog).getByLabelText("Kısa mesaj"),
      ", staj başvurusunda CV'mi birlikte gözden geçirebilir miyiz?",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Talebi gönder" }),
    );

    await waitFor(() => expect(getPeerMentor).toHaveBeenCalledTimes(2));
    const sent = screen.getByRole("dialog", { name: "Talebin iletildi" });
    expect(within(sent).getByText("Onay Bekliyor")).toBeVisible();
    expect(sent.contains(document.activeElement)).toBe(true);
    expect(within(sent).getByText("Teknik ve Dijital Beceriler")).toBeVisible();
    expect(
      within(sent).getByRole("region", { name: "Sonra ne olur?" }),
    ).toHaveTextContent("Deniz Kaya yanıt verdiğinde bildirim alırsın.");
    // "Mentorluklarım'a git" leaves the profile for the Mentorluklarım tab.
    expect(
      within(
        screen.getByRole("dialog", { name: "Talebin iletildi" }),
      ).getByRole("link", { name: "Mentorluklarım'a git" }),
    ).toHaveAttribute("href", "/student/peer-mentoring?tab=mine");
  });

  it("says why a request can't be sent to a mentor already asked", async () => {
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-2" />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Talebin yanıt bekliyor" }),
      ).toBeDisabled(),
    );
  });

  it("says so when the mentor isn't listed", async () => {
    renderWithQueryClient(<PeerMentorPublicProfile mentorId="nobody" />);
    expect(
      await screen.findByText(
        "Bu akran mentoru bulunamadı ya da artık listelenmiyor.",
      ),
    ).toBeVisible();
  });

  it("shows the files and portfolio links the mentor shares on their profile", async () => {
    vi.mocked(getPeerMentorDocuments).mockResolvedValueOnce([
      peerFileFixture({
        id: "8a0e2f4c-0000-4000-8000-000000000003",
        evidenceType: PeerEvidenceType.Cv,
        originalFilename: "CV_DenizKaya.pdf",
      }),
      peerLinkFixture(),
    ]);
    renderWithQueryClient(
      <PeerMentorPublicProfile mentorId="fixture-peer-1" />,
    );

    const shared = await screen.findByRole("region", {
      name: "Paylaşılan belgeler",
    });
    expect(within(shared).getByText("CV_DenizKaya.pdf")).toBeVisible();
    expect(within(shared).getByText("CV")).toBeVisible();
    expect(
      within(shared).getByRole("link", {
        name: "CV_DenizKaya.pdf dosyasını görüntüle",
      }),
    ).toHaveAttribute(
      "href",
      "/api/peer-mentoring/documents/8a0e2f4c-0000-4000-8000-000000000003/content",
    );
    const links = screen.getByRole("region", { name: "Bağlantılar" });
    expect(
      within(links).getByRole("link", { name: /Portfolyo/ }),
    ).toHaveAttribute("href", "https://github.com/mertdemir");
    expect(getPeerMentorDocuments).toHaveBeenCalledWith("fixture-peer-1");
  });
});
