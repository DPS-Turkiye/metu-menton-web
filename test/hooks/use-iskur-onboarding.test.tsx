import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import {
  IskurDocumentSlot,
  IskurSkillLevel,
  IskurTeamRolePreference,
} from "@/interfaces/iskur-onboarding";
import { Weekday } from "@/interfaces/mentor";
import { ClientApiError } from "@/lib/client/api";
import {
  getIskurOnboarding,
  saveIskurOnboardingDraft,
  submitIskurOnboarding,
  uploadIskurOnboardingDocument,
} from "@/lib/client/iskur-onboarding";
import { ISKUR_ONBOARDING_LATER_COOKIE } from "@/lib/iskur-onboarding";
import { IskurOnboardingStep, IskurStepState } from "@/types/iskur-onboarding";
import {
  completeForm,
  emptyForm,
  ETKI,
  ETKINLIK,
  GORSEL,
  KREATIF,
  onboarding,
  VIDEO,
} from "@test/fixtures/iskur-onboarding";
import { queryWrapper } from "@test/fixtures/query-wrapper";

const push = vi.fn();
const logout = vi.fn(async () => undefined);

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => ({ session: { fullName: "Mert Demir" }, logout }),
}));
vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurOnboarding: vi.fn(),
  removeIskurOnboardingDocument: vi.fn(),
  saveIskurOnboardingDraft: vi.fn(),
  submitIskurOnboarding: vi.fn(),
  uploadIskurOnboardingDocument: vi.fn(),
}));

async function renderLoaded() {
  const { wrapper } = queryWrapper();
  const view = renderHook(() => useIskurOnboarding(), { wrapper });
  await waitFor(() => expect(view.result.current.form).not.toBeNull());
  return view;
}

describe("useIskurOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding());
    vi.mocked(saveIskurOnboardingDraft).mockImplementation(async (input) =>
      onboarding(
        emptyForm({ ...input, documents: { cv: null, transcript: null } }),
      ),
    );
  });

  it("opens on the welcome screen with the intern's name and the structure's size", async () => {
    const { result } = await renderLoaded();
    expect(result.current.step).toBe(IskurOnboardingStep.Welcome);
    expect(result.current.firstName).toBe("Mert");
    expect(result.current.unitCount).toBe(2);
    expect(result.current.teamCount).toBe(4);
    act(() => result.current.togglePrepared(1));
    expect(result.current.prepared.has(1)).toBe(true);
    act(() => result.current.togglePrepared(1));
    expect(result.current.prepared.has(1)).toBe(false);
    act(() => result.current.start());
    expect(result.current.step).toBe(IskurOnboardingStep.Days);
    expect(result.current.steps[0]?.state).toBe(IskurStepState.Current);
  });

  it("adds up the hours, waits for them to match, then saves and moves on", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.start());
    act(() => result.current.setWeeklyDays(1));
    act(() => result.current.toggleDay(Weekday.Monday));
    expect(result.current.scheduleMatches).toBe(true);
    expect(result.current.canContinue).toBe(false);
    act(() => result.current.setPriorDays("abc"));
    expect(result.current.form?.priorIskurDays).toBeNull();
    act(() => result.current.setPriorDays("200"));
    expect(result.current.form?.priorIskurDays).toBe(140);
    act(() => result.current.setPriorDays("0"));
    expect(result.current.canContinue).toBe(true);
    expect(result.current.remainingDays).toBe(140);
    expect(result.current.neededDays).toBe(24);

    act(() => result.current.next());
    await waitFor(() =>
      expect(result.current.step).toBe(IskurOnboardingStep.Units),
    );
    expect(saveIskurOnboardingDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyDays: 1,
        priorIskurDays: 0,
        schedule: [{ day: Weekday.Monday, start: "09:00", end: "16:30" }],
      }),
    );
    expect(result.current.steps[0]?.state).toBe(IskurStepState.Done);
  });

  it("keeps the rows' keys across renders and lands two changes made in one event", async () => {
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding(completeForm()));
    const { result, rerender } = await renderLoaded();
    const keys = result.current.rows.map((row) => row.key);
    rerender();
    expect(result.current.rows.map((row) => row.key)).toEqual(keys);

    act(() => {
      result.current.setWeeklyDays(2);
      result.current.toggleTeamRole(IskurTeamRolePreference.Executor);
    });
    expect(result.current.form?.weeklyDays).toBe(2);
    expect(result.current.form?.teamRoles).toEqual([
      IskurTeamRolePreference.IdeaGenerator,
    ]);
    expect(result.current.rows.map((row) => row.key)).toEqual(keys);
  });

  it("edits a day's ranges, at most four of them, and notices overlaps", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.toggleDay(Weekday.Tuesday));
    for (let index = 0; index < 4; index += 1)
      act(() => result.current.addRange(Weekday.Tuesday));
    expect(result.current.rowsOf(Weekday.Tuesday)).toHaveLength(4);
    expect(result.current.canAddRange(Weekday.Tuesday)).toBe(false);
    const [, second, third] = result.current.rowsOf(Weekday.Tuesday);
    if (!second || !third) throw new Error("rows missing");
    act(() =>
      result.current.updateRange(second.key, { start: "12:00", end: "13:00" }),
    );
    expect(result.current.scheduleOverlaps).toBe(true);
    act(() => result.current.removeRange(second.key));
    act(() => result.current.removeRange(third.key));
    expect(result.current.scheduleOverlaps).toBe(false);
    expect(result.current.dayMinutes(Weekday.Tuesday)).toBe(450);
    act(() => result.current.toggleDay(Weekday.Tuesday));
    expect(result.current.scheduledDays).toEqual([]);
  });

  it("asks the skills of the chosen units once and keeps at most two roles", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.toggleUnit(KREATIF));
    act(() => result.current.toggleUnit(ETKI));
    expect(
      result.current.skillGroups.map((group) =>
        group.skills.map((skill) => skill.id),
      ),
    ).toEqual([[GORSEL, VIDEO], [ETKINLIK]]);
    act(() => result.current.setSkillLevel(GORSEL, IskurSkillLevel.Good));
    act(() => result.current.setSkillLevel(GORSEL, IskurSkillLevel.Expert));
    expect(result.current.levelOf(GORSEL)).toBe(IskurSkillLevel.Expert);
    expect(result.current.levelOf(VIDEO)).toBeNull();

    act(() => result.current.toggleTeamRole(IskurTeamRolePreference.Planner));
    act(() => result.current.toggleTeamRole(IskurTeamRolePreference.Executor));
    act(() => result.current.toggleTeamRole(IskurTeamRolePreference.Connector));
    expect(result.current.form?.teamRoles).toEqual([
      IskurTeamRolePreference.Planner,
      IskurTeamRolePreference.Executor,
    ]);
    expect(result.current.teamRolesFull).toBe(true);
    act(() => result.current.toggleTeamRole(IskurTeamRolePreference.Planner));
    act(() => result.current.toggleUnit(ETKI));
    expect(result.current.form?.teamRoles).toEqual([
      IskurTeamRolePreference.Executor,
    ]);
    expect(result.current.form?.unitIds).toEqual([KREATIF]);
  });

  it("checks a file before uploading it and keeps what the intern typed", async () => {
    const withCv = onboarding(
      emptyForm({
        documents: {
          cv: { fileName: "cv.pdf", sizeBytes: 10, uploadedAt: "x" },
          transcript: null,
        },
      }),
      true,
    );
    vi.mocked(getIskurOnboarding).mockResolvedValue(
      onboarding(emptyForm(), true),
    );
    vi.mocked(uploadIskurOnboardingDocument).mockResolvedValue(withCv);
    const { result } = await renderLoaded();
    act(() => result.current.setWeeklyDays(2));
    act(() =>
      result.current.upload(
        IskurDocumentSlot.Cv,
        new File(["x"], "cv.docx", { type: "application/msword" }),
      ),
    );
    expect(uploadIskurOnboardingDocument).not.toHaveBeenCalled();

    const pdf = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });
    act(() => result.current.upload(IskurDocumentSlot.Cv, pdf));
    await waitFor(() =>
      expect(result.current.form?.documents.cv?.fileName).toBe("cv.pdf"),
    );
    expect(uploadIskurOnboardingDocument).toHaveBeenCalledWith(
      IskurDocumentSlot.Cv,
      pdf,
    );
    expect(result.current.form?.weeklyDays).toBe(2);
  });

  it("judges the leadership application and sends the form", async () => {
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding(completeForm()));
    vi.mocked(submitIskurOnboarding).mockResolvedValue(
      onboarding(completeForm({ submittedAt: "2026-11-19T10:00:00Z" })),
    );
    const { result } = await renderLoaded();
    act(() => result.current.goTo(IskurOnboardingStep.Leadership));
    act(() => result.current.setWantsLeadership(true));
    expect(result.current.eligibility.eligible).toBe(true);
    expect(result.current.canContinue).toBe(false);
    act(() => result.current.setAnswer("motivation", "Planlamayı severim."));
    act(() => result.current.setAnswer("experience", "Tanıtım ekibi"));
    act(() => result.current.setAnswer("conflict", "Konuşurum"));
    expect(result.current.canContinue).toBe(true);

    act(() => result.current.submit());
    await waitFor(() => expect(result.current.submitted).toBe(true));
    expect(submitIskurOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        leadership: {
          wants: true,
          motivation: "Planlamayı severim.",
          experience: "Tanıtım ekibi",
          conflict: "Konuşurum",
        },
      }),
    );
  });

  it("only jumps ahead over answered steps, and goes back step by step", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.start());
    act(() => result.current.goTo(IskurOnboardingStep.Preview));
    expect(result.current.step).toBe(IskurOnboardingStep.Days);
    act(() => result.current.back());
    expect(result.current.step).toBe(IskurOnboardingStep.Welcome);
  });

  it("lets the intern come back later, and saves a draft before signing out", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.remindLater());
    expect(document.cookie).toContain(`${ISKUR_ONBOARDING_LATER_COOKIE}=1`);
    expect(push).toHaveBeenCalledWith("/student");

    act(() => result.current.setWeeklyDays(3));
    act(() => result.current.saveDraft());
    await waitFor(() =>
      expect(saveIskurOnboardingDraft).toHaveBeenCalledTimes(1),
    );
    act(() => result.current.logout());
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(saveIskurOnboardingDraft).toHaveBeenCalledTimes(2);
  });

  it("knows when the caller is not an intern", async () => {
    vi.mocked(getIskurOnboarding).mockRejectedValue(
      new ClientApiError("yok", 404),
    );
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notIntern).toBe(true);
    expect(result.current.loadError).toBeNull();
  });
});
