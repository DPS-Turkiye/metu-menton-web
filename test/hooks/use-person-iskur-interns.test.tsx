import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { iskurApplicationsQueryKey } from "@/hooks/use-iskur-applications";
import { iskurInternsQueryKey } from "@/hooks/use-iskur-interns";
import { iskurWorkspaceQueryKey } from "@/hooks/use-iskur-workspace";
import { usePersonIskurInterns } from "@/hooks/use-person-iskur-interns";
import { IskurInternAccountState } from "@/interfaces/iskur-interns";
import { ProgramFeature, ProgramType } from "@/interfaces/program";
import { UserRole, type AppSession } from "@/interfaces/session";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import { getCoordinatorPrograms } from "@/lib/client/coordinator-programs";
import {
  addIskurInterns,
  getIskurInterns,
  removeIskurIntern,
} from "@/lib/client/iskur-interns";
import { PersonIskurState } from "@/lib/iskur-interns";
import { useToastStore } from "@/stores/toast-store";
import { coordinatorProgram } from "@test/fixtures/coordinator-programs";
import {
  iskurInternEntry,
  iskurInternList,
} from "@test/fixtures/iskur-interns";
import { queryWrapper } from "@test/fixtures/query-wrapper";
import { appSession } from "@test/fixtures/session";

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

const EMAIL = "ogrenci@hocam-test.metu.edu.tr";
const ROW = { key: "s1-MENTEE", id: "s1", name: "2026 Güz" };
const PROGRAMS = [ROW, { ...ROW, key: "s1-MENTOR" }];
const semester = coordinatorProgram({
  id: "s1",
  name: "2026 Güz",
  type: ProgramType.Semester,
  features: [ProgramFeature.PeerMentoring, ProgramFeature.Iskur],
  myFeatures: [ProgramFeature.Iskur],
});
const listed = iskurInternEntry({ id: "e1", email: EMAIL });

function toasts() {
  return useToastStore
    .getState()
    .toasts.map(({ message, tone }) => ({ message, tone }));
}

function renderPersonIskur() {
  const { queryClient, wrapper } = queryWrapper();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const view = renderHook(
    () => usePersonIskurInterns({ email: EMAIL, programs: PROGRAMS }),
    { wrapper },
  );
  return { ...view, queryClient, invalidate };
}

describe("usePersonIskurInterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    session.current = appSession({ role: UserRole.Coordinator });
    vi.mocked(getCoordinatorPrograms).mockResolvedValue([semester]);
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([]));
  });

  it("shows nothing to an admin and asks the backend for nothing", () => {
    session.current = appSession({ role: UserRole.Admin });
    const { result } = renderPersonIskur();

    expect(result.current.rowFor(ROW)).toBeNull();
    expect(getCoordinatorPrograms).not.toHaveBeenCalled();
    expect(getIskurInterns).not.toHaveBeenCalled();
  });

  it("reads the list of an İŞKUR program open to the coordinator", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([listed]));
    const { result } = renderPersonIskur();

    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).toBe(PersonIskurState.Intern),
    );
    expect(getIskurInterns).toHaveBeenCalledWith("s1");
    expect(result.current.rowFor(ROW)).toEqual({
      programId: "s1",
      programName: "2026 Güz",
      loadFailed: false,
      state: PersonIskurState.Intern,
      placed: false,
      canRemove: true,
    });
  });

  it("adds the person's address, stores the answer and refreshes the İŞKUR screens", async () => {
    vi.mocked(addIskurInterns).mockResolvedValue(iskurInternList([listed]));
    const { result, queryClient, invalidate } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).toBe(
        PersonIskurState.NotListed,
      ),
    );

    act(() => result.current.addTo("s1"));

    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).toBe(PersonIskurState.Intern),
    );
    expect(addIskurInterns).toHaveBeenCalledWith("s1", [EMAIL]);
    expect(queryClient.getQueryData(iskurInternsQueryKey("s1"))).toEqual(
      iskurInternList([listed]),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: iskurWorkspaceQueryKey("s1"),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: iskurApplicationsQueryKey("s1"),
    });
    expect(toasts()).toEqual([
      {
        message: "Öğrenci İŞKUR listesine eklendi.",
        tone: ToastTone.Success,
      },
    ]);
  });

  it("says the add failed when the backend could not read the address", async () => {
    vi.mocked(addIskurInterns).mockResolvedValue(iskurInternList([], [EMAIL]));
    const { result } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).not.toBeNull(),
    );

    act(() => result.current.addTo("s1"));

    await waitFor(() =>
      expect(toasts()).toEqual([
        {
          message: "Öğrenci İŞKUR listesine eklenemedi.",
          tone: ToastTone.Error,
        },
      ]),
    );
  });

  it("shows the backend's reason when adding is refused", async () => {
    vi.mocked(addIskurInterns).mockRejectedValue(
      new ClientApiError("Bu program arşivlendi.", 400),
    );
    const { result } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).not.toBeNull(),
    );

    act(() => result.current.addTo("s1"));

    await waitFor(() =>
      expect(toasts()).toEqual([
        { message: "Bu program arşivlendi.", tone: ToastTone.Error },
      ]),
    );
  });

  it("removes the entry only after the coordinator confirms", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([listed]));
    vi.mocked(removeIskurIntern).mockResolvedValue(iskurInternList([]));
    const { result } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.canRemove).toBe(true),
    );

    act(() => result.current.startRemove("s1"));
    expect(result.current.confirming?.programName).toBe("2026 Güz");
    expect(removeIskurIntern).not.toHaveBeenCalled();

    act(() => result.current.confirmRemove());

    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).toBe(
        PersonIskurState.NotListed,
      ),
    );
    expect(removeIskurIntern).toHaveBeenCalledWith("s1", "e1");
    expect(result.current.confirming).toBeNull();
    expect(toasts()).toEqual([
      {
        message: "Öğrenci İŞKUR listesinden çıkarıldı.",
        tone: ToastTone.Success,
      },
    ]);
  });

  it("offers no removal for a placed intern", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([{ ...listed, placed: true }]),
    );
    const { result } = renderPersonIskur();
    await waitFor(() => expect(result.current.rowFor(ROW)?.placed).toBe(true));

    expect(result.current.rowFor(ROW)?.canRemove).toBe(false);
  });

  it("reloads the list and shows the reason when removing is refused", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([
        { ...listed, account: IskurInternAccountState.OutsideProgram },
      ]),
    );
    vi.mocked(removeIskurIntern).mockRejectedValue(
      new ClientApiError("Önce yerleşimden çıkar.", 409),
    );
    const { result, invalidate } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).toBe(PersonIskurState.Listed),
    );

    act(() => result.current.startRemove("s1"));
    act(() => result.current.confirmRemove());

    await waitFor(() =>
      expect(toasts()).toEqual([
        { message: "Önce yerleşimden çıkar.", tone: ToastTone.Error },
      ]),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: iskurInternsQueryKey("s1"),
    });
    expect(result.current.confirming).toBeNull();
  });

  it("marks a list that could not be loaded", async () => {
    vi.mocked(getIskurInterns).mockRejectedValue(new Error("down"));
    const { result } = renderPersonIskur();

    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.loadFailed).toBe(true),
    );
    expect(result.current.rowFor(ROW)?.state).toBeNull();
  });

  it("gives a program's status to the person's first row in it only", async () => {
    const { result } = renderPersonIskur();

    await waitFor(() => expect(result.current.rowFor(ROW)).not.toBeNull());
    expect(result.current.rowFor({ ...ROW, key: "s1-MENTOR" })).toBeNull();
    expect(getIskurInterns).toHaveBeenCalledTimes(1);
  });

  it("keeps showing the last list when a refetch fails", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([listed]));
    const { result, queryClient } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.state).toBe(PersonIskurState.Intern),
    );

    vi.mocked(getIskurInterns).mockRejectedValue(new Error("down"));
    await act(() =>
      queryClient.refetchQueries({ queryKey: iskurInternsQueryKey("s1") }),
    );

    expect(result.current.rowFor(ROW)?.loadFailed).toBe(false);
    expect(result.current.rowFor(ROW)?.state).toBe(PersonIskurState.Intern);
  });

  it("closes the confirmation when the entry is placed meanwhile", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([listed]));
    const { result, queryClient } = renderPersonIskur();
    await waitFor(() =>
      expect(result.current.rowFor(ROW)?.canRemove).toBe(true),
    );
    act(() => result.current.startRemove("s1"));
    expect(result.current.confirming).not.toBeNull();

    act(() => {
      queryClient.setQueryData(
        iskurInternsQueryKey("s1"),
        iskurInternList([{ ...listed, placed: true }]),
      );
    });

    await waitFor(() => expect(result.current.confirming).toBeNull());
    act(() => result.current.confirmRemove());
    expect(removeIskurIntern).not.toHaveBeenCalled();
  });
});
