import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PeerMenteeProfileView } from "@/components/student/peer-mentee-profile";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import {
  PeerTopicCategory,
  type PeerMentoringRequest,
} from "@/interfaces/peer-mentoring";
import { ClientApiError } from "@/lib/client/api";
import {
  getPeerMentee,
  getReceivedPeerRequests,
} from "@/lib/client/peer-mentoring";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/peer-mentoring", () => ({
  getPeerMentee: vi.fn(),
  getReceivedPeerRequests: vi.fn(),
}));
vi.mock("@/components/providers/session-provider", () => ({
  useAppSession: () => null,
  useSession: () => ({ session: null, isLoading: false }),
}));

const mentee = {
  userId: "mentee-1",
  fullName: "Zeynep Koç",
  department: "Psikoloji",
};

function request(
  id: string,
  menteeId: string,
  status: MentorshipRequestStatus,
  message: string,
): PeerMentoringRequest {
  return {
    id,
    mentor: { userId: "mentor-1", fullName: "Mert Demir", department: null },
    mentee: { ...mentee, userId: menteeId },
    category: PeerTopicCategory.CareerInternship,
    message,
    status,
    createdAt: "2026-11-24T10:00:00Z",
    acceptedAt: null,
  };
}

describe("PeerMenteeProfileView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      request("r1", "mentee-1", MentorshipRequestStatus.Accepted, "CV yardımı"),
      request("r2", "someone", MentorshipRequestStatus.Pending, "Başkası"),
      request("r3", "mentee-1", MentorshipRequestStatus.Declined, "Eski istek"),
    ]);
  });

  it("shows what the student shares and their requests to this mentor", async () => {
    vi.mocked(getPeerMentee).mockResolvedValue({
      mentee,
      interests: {
        topics: [PeerTopicCategory.CareerInternship],
        subtopics: [],
      },
      goal: "Yaz stajı bulmak",
    });
    renderWithQueryClient(<PeerMenteeProfileView menteeId="mentee-1" />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Zeynep Koç" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Psikoloji/).length).toBeGreaterThan(0);
    expect(screen.getByText("Yaz stajı bulmak")).toBeInTheDocument();
    const requests = screen.getByRole("region", {
      name: "Sana gönderdiği talepler",
    });
    expect(await within(requests).findByText(/CV yardımı/)).toBeInTheDocument();
    expect(within(requests).queryByText(/Başkası|Eski istek/)).toBeNull();
    // Their own page does not link to itself.
    expect(screen.queryByRole("link", { name: /profilini aç/ })).toBeNull();
  });

  it("says so when the student is not their mentee", async () => {
    vi.mocked(getPeerMentee).mockResolvedValue(null);
    renderWithQueryClient(<PeerMenteeProfileView menteeId="mentee-1" />);
    expect(
      await screen.findByText(/Bu öğrenci menteen değil/),
    ).toBeInTheDocument();
  });

  it("shows a failure as an error", async () => {
    vi.mocked(getPeerMentee).mockRejectedValue(
      new ClientApiError("Yüklenemedi.", 500),
    );
    renderWithQueryClient(<PeerMenteeProfileView menteeId="mentee-1" />);
    expect(await screen.findByText("Yüklenemedi.")).toBeInTheDocument();
  });
});
