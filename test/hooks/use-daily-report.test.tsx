import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDailyReport } from "@/hooks/use-daily-report";
import {
  PeerMentorSkill,
  PeerReportStatus,
  type PeerDailyReport,
} from "@/interfaces/peer-reports";
import { ToastTone } from "@/interfaces/toast";
import { getReceivedPeerRequests } from "@/lib/client/peer-mentoring";
import {
  getPeerDailyReport,
  savePeerDailyReport,
  submitPeerDailyReport,
} from "@/lib/client/peer-reports";
import type { ToastInput } from "@/stores/toast-store";
import { peerDailyReportFixture } from "@test/fixtures/peer-reports";
import { createTestQueryClient } from "@test/test-utils";

const showToast = vi.fn<(toast: ToastInput) => void>();

vi.mock("@/stores/toast-store", () => ({
  useToast: () => ({ showToast, dismiss: vi.fn() }),
}));
vi.mock("@/lib/client/peer-mentoring", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/peer-mentoring")>()),
  getReceivedPeerRequests: vi.fn(),
}));
vi.mock("@/lib/client/peer-reports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/peer-reports")>()),
  getPeerDailyReport: vi.fn(),
  savePeerDailyReport: vi.fn(),
  submitPeerDailyReport: vi.fn(),
}));

const DAY = "2026-11-12";
const DRAFT_ANSWER = "Örnek çalışma planını hazırladım.";
const SAVED_AT = "2026-11-12T15:00:00Z";

function readyReport(overrides: Partial<PeerDailyReport> = {}) {
  return peerDailyReportFixture({
    meetings: [],
    missingMeetingReports: 0,
    didToday: "Kaynakları derledim.",
    challenge: "Kaynakları sıralamak.",
    learned: "Önce hedefi belirlemek.",
    tomorrowPlan: "Planı gözden geçirmek.",
    ...overrides,
  });
}

async function renderLoaded() {
  const queryClient = createTestQueryClient();
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const { result } = renderHook(() => useDailyReport(DAY), { wrapper });
  await waitFor(() => expect(result.current.report).toBeDefined());
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getReceivedPeerRequests).mockResolvedValue([]);
  vi.mocked(getPeerDailyReport).mockResolvedValue(readyReport());
});

describe("useDailyReport", () => {
  it("shows the save error and keeps the typed answer", async () => {
    vi.mocked(savePeerDailyReport).mockRejectedValue(
      new Error("Taslak kaydedilemedi."),
    );
    const result = await renderLoaded();

    act(() => result.current.update({ didToday: DRAFT_ANSWER }));
    act(() => result.current.saveDraft());

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: "Taslak kaydedilemedi.",
        tone: ToastTone.Error,
      }),
    );
    expect(result.current.form?.didToday).toBe(DRAFT_ANSWER);
  });

  it("shows the send error and keeps the saved answer editable", async () => {
    vi.mocked(savePeerDailyReport).mockResolvedValue(
      readyReport({ didToday: DRAFT_ANSWER, updatedAt: SAVED_AT }),
    );
    vi.mocked(submitPeerDailyReport).mockRejectedValue(
      new Error("Gönderim tamamlanamadı."),
    );
    const result = await renderLoaded();

    act(() => result.current.update({ didToday: DRAFT_ANSWER }));
    act(() => result.current.send());

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: "Gönderim tamamlanamadı.",
        tone: ToastTone.Error,
      }),
    );
    expect(submitPeerDailyReport).toHaveBeenCalledWith(DAY);
    expect(result.current.form?.didToday).toBe(DRAFT_ANSWER);
    expect(result.current.editable).toBe(true);
  });

  it("does not send the report if saving the answers first fails", async () => {
    vi.mocked(savePeerDailyReport).mockRejectedValue(
      new Error("Kayıt başarısız."),
    );
    const result = await renderLoaded();

    act(() => result.current.update({ didToday: DRAFT_ANSWER }));
    act(() => result.current.send());

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: "Kayıt başarısız.",
        tone: ToastTone.Error,
      }),
    );
    expect(savePeerDailyReport).toHaveBeenCalledOnce();
    expect(submitPeerDailyReport).not.toHaveBeenCalled();
    expect(result.current.form?.didToday).toBe(DRAFT_ANSWER);
  });

  it("does not save or send when an answer is blank", async () => {
    const result = await renderLoaded();

    act(() => result.current.update({ challenge: "   " }));
    await act(async () => result.current.send());

    expect(result.current.ready).toBe(false);
    expect(savePeerDailyReport).not.toHaveBeenCalled();
    expect(submitPeerDailyReport).not.toHaveBeenCalled();
  });

  it("does not save or send when a meeting report is missing", async () => {
    vi.mocked(getPeerDailyReport).mockResolvedValue(
      readyReport({
        meetings: peerDailyReportFixture().meetings,
        missingMeetingReports: 1,
      }),
    );
    const result = await renderLoaded();

    await act(async () => result.current.send());

    expect(result.current.blockedByMeetings).toBe(true);
    expect(savePeerDailyReport).not.toHaveBeenCalled();
    expect(submitPeerDailyReport).not.toHaveBeenCalled();
  });

  it("ignores another send while the first send is pending", async () => {
    const pendingSend = Promise.withResolvers<PeerDailyReport>();
    vi.mocked(savePeerDailyReport).mockResolvedValue(readyReport());
    vi.mocked(submitPeerDailyReport).mockReturnValue(pendingSend.promise);
    const result = await renderLoaded();

    act(() => result.current.send());
    await waitFor(() =>
      expect(submitPeerDailyReport).toHaveBeenCalledWith(DAY),
    );
    expect(result.current.busy).toBe(true);

    await act(async () => result.current.send());

    expect(savePeerDailyReport).toHaveBeenCalledOnce();
    expect(submitPeerDailyReport).toHaveBeenCalledOnce();
    act(() =>
      pendingSend.resolve(
        readyReport({ status: PeerReportStatus.InReview, editable: false }),
      ),
    );
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it("keeps text added while the earlier draft is saving", async () => {
    const pendingSave = Promise.withResolvers<PeerDailyReport>();
    vi.mocked(savePeerDailyReport).mockReturnValue(pendingSave.promise);
    const result = await renderLoaded();
    const revisedAnswer =
      "Örnek çalışma planını hazırladım ve gözden geçirdim.";

    act(() => result.current.update({ didToday: DRAFT_ANSWER }));
    act(() => result.current.saveDraft());
    await waitFor(() =>
      expect(savePeerDailyReport).toHaveBeenCalledWith(DAY, {
        didToday: DRAFT_ANSWER,
        challenge: "Kaynakları sıralamak.",
        skills: [PeerMentorSkill.ActiveListening],
        learned: "Önce hedefi belirlemek.",
        tomorrowPlan: "Planı gözden geçirmek.",
      }),
    );
    act(() => result.current.update({ didToday: revisedAnswer }));
    act(() =>
      pendingSave.resolve(
        readyReport({ didToday: DRAFT_ANSWER, updatedAt: SAVED_AT }),
      ),
    );

    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.report?.updatedAt).toBe(SAVED_AT);
    expect(result.current.form?.didToday).toBe(revisedAnswer);
  });
});
