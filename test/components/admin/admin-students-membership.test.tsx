import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminStudentsTable } from "@/components/admin/admin-students-table";
import type { AdminStudentRow } from "@/interfaces/admin-membership";
import { GateBadgeState } from "@/interfaces/badges";
import {
  ProgramBlockerKind,
  ProgramFeature,
  ProgramStatus,
} from "@/interfaces/program";
import {
  addStudentToProgram,
  getProgramMembership,
  removeStudentFromProgram,
} from "@/lib/client/admin-membership";
import { ClientApiError } from "@/lib/client/api";
import { getAdminStudents } from "@/lib/client/badges";
import { currentIdToken } from "@/lib/firebase/auth";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/badges", () => ({ getAdminStudents: vi.fn() }));
vi.mock("@/lib/client/admin-membership", () => ({
  getProgramMembership: vi.fn(),
  addStudentToProgram: vi.fn(),
  removeStudentFromProgram: vi.fn(),
}));
vi.mock("@/lib/firebase/auth", () => ({ currentIdToken: vi.fn() }));

function student(overrides: Partial<AdminStudentRow>): AdminStudentRow {
  return {
    userId: "u1",
    fullName: "Zeynep Öğrenci",
    email: "zeynep@odtu-dev.invalid",
    programId: "p1",
    programName: "2026 Güz",
    state: GateBadgeState.None,
    awardId: null,
    source: null,
    awardedAt: null,
    revokedAt: null,
    reason: null,
    training: { videoWatched: false, attempts: 0, bestScore: null },
    profile: null,
    prism: null,
    student: true,
    ...overrides,
  };
}

const fall = { id: "p1", name: "2026 Güz", status: ProgramStatus.Active };
const spring = { id: "p2", name: "2027 Bahar", status: ProgramStatus.Draft };
const open = {
  kind: ProgramBlockerKind.ActiveMentorship,
  feature: ProgramFeature.PeerMentoring,
  count: 2,
};

async function openAction(name: string, action: string) {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: `${name} için işlemler` }),
  );
  await user.click(screen.getByRole("button", { name: action }));
  return { user, dialog: await screen.findByRole("dialog") };
}

describe("Kullanıcılar › Öğrenciler: Programa ekle / Programdan çıkar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(currentIdToken).mockResolvedValue("admin-token");
    vi.mocked(getAdminStudents).mockResolvedValue([
      student({}),
      student({
        userId: "u3",
        fullName: "Doç. Mentor",
        email: "mentor@odtu-dev.invalid",
        programId: "p1",
        programName: "2026 Güz",
        student: false,
      }),
      student({
        userId: "u2",
        fullName: "Ali Dönemsiz",
        email: "ali@odtu-dev.invalid",
        programId: null,
        programName: null,
      }),
    ]);
  });

  it("lists a student in no semester and offers only to add them", async () => {
    vi.mocked(getProgramMembership).mockResolvedValue({
      current: null,
      targets: [fall, spring],
      blockers: [],
    });
    vi.mocked(addStudentToProgram).mockResolvedValue({
      userId: "u2",
      fromProgramId: null,
      toProgramId: "p2",
      movedMentorRow: false,
    });
    renderWithQueryClient(<AdminStudentsTable />);

    const ali = await screen.findByRole("row", { name: /Ali Dönemsiz/ });
    expect(within(ali).getByText("Dönemde değil")).toBeInTheDocument();
    const { user, dialog } = await openAction("Ali Dönemsiz", "Programa ekle");
    expect(
      screen.queryByRole("button", { name: "Programdan çıkar" }),
    ).not.toBeInTheDocument();
    expect(
      await within(dialog).findByText("Şu an hiçbir dönemde değil."),
    ).toBeInTheDocument();
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Dönem" }),
      "2027 Bahar (Taslak)",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Programa ekle" }),
    );

    expect(addStudentToProgram).toHaveBeenCalledWith("u2", "p2", "admin-token");
    expect(
      await screen.findByText("Ali Dönemsiz, 2027 Bahar dönemine eklendi."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("shows the open work that keeps a student in their semester and keeps the removal closed", async () => {
    vi.mocked(getProgramMembership).mockResolvedValue({
      current: fall,
      targets: [spring],
      blockers: [open],
    });
    renderWithQueryClient(<AdminStudentsTable />);

    const { dialog } = await openAction("Zeynep Öğrenci", "Programdan çıkar");
    expect(
      await within(dialog).findByText(
        "Açık işler bitmeden 2026 Güz döneminden ayrılamaz:",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Akran Mentörlüğü: 2 süren mentorluk"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Programdan çıkar" }),
    ).toBeDisabled();
    expect(removeStudentFromProgram).not.toHaveBeenCalled();
  });

  it("lists the open work the backend refuses a removal for", async () => {
    vi.mocked(getProgramMembership).mockResolvedValue({
      current: fall,
      targets: [],
      blockers: [],
    });
    vi.mocked(removeStudentFromProgram).mockRejectedValue(
      new ClientApiError("Açık işler var.", 409, "PROGRAM_WORK_OPEN", {}, [
        open,
      ]),
    );
    renderWithQueryClient(<AdminStudentsTable />);

    const { user, dialog } = await openAction(
      "Zeynep Öğrenci",
      "Programdan çıkar",
    );
    const remove = await within(dialog).findByRole("button", {
      name: "Programdan çıkar",
    });
    await waitFor(() => expect(remove).toBeEnabled());
    await user.click(remove);

    expect(removeStudentFromProgram).toHaveBeenCalledWith("u1", "admin-token");
    expect(
      await within(dialog).findByText("Akran Mentörlüğü: 2 süren mentorluk"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("asks the admin to sign in again when there is no sign-in to send", async () => {
    vi.mocked(currentIdToken).mockResolvedValue(null);
    vi.mocked(getProgramMembership).mockResolvedValue({
      current: fall,
      targets: [],
      blockers: [],
    });
    renderWithQueryClient(<AdminStudentsTable />);

    const { user, dialog } = await openAction(
      "Zeynep Öğrenci",
      "Programdan çıkar",
    );
    const remove = await within(dialog).findByRole("button", {
      name: "Programdan çıkar",
    });
    await waitFor(() => expect(remove).toBeEnabled());
    await user.click(remove);

    expect(
      await within(dialog).findByText(
        "Bu işlem için yeniden giriş yapman gerekiyor.",
      ),
    ).toBeInTheDocument();
    expect(removeStudentFromProgram).not.toHaveBeenCalled();
  });

  it("removes a student, reloads the list and reads the dialog afresh next time", async () => {
    vi.mocked(getProgramMembership).mockResolvedValue({
      current: fall,
      targets: [spring],
      blockers: [],
    });
    vi.mocked(removeStudentFromProgram).mockResolvedValue({
      userId: "u1",
      fromProgramId: "p1",
      toProgramId: null,
      movedMentorRow: true,
    });
    renderWithQueryClient(<AdminStudentsTable />);

    const { user, dialog } = await openAction(
      "Zeynep Öğrenci",
      "Programdan çıkar",
    );
    expect(
      await within(dialog).findByText(/2026 Güz döneminden çıkar/),
    ).toBeInTheDocument();
    const remove = within(dialog).getByRole("button", {
      name: "Programdan çıkar",
    });
    await waitFor(() => expect(remove).toBeEnabled());
    await user.click(remove);

    expect(removeStudentFromProgram).toHaveBeenCalledWith("u1", "admin-token");
    expect(
      await screen.findByText("Zeynep Öğrenci programdan çıkarıldı."),
    ).toBeInTheDocument();
    await waitFor(() => expect(getAdminStudents).toHaveBeenCalledTimes(2));

    await openAction("Zeynep Öğrenci", "Programa ekle");
    await waitFor(() => expect(getProgramMembership).toHaveBeenCalledTimes(2));
  });

  it("offers no membership actions to a badge holder who is not a student", async () => {
    renderWithQueryClient(<AdminStudentsTable />);
    await screen.findByText("Doç. Mentor");
    expect(
      screen.queryByRole("button", { name: "Doç. Mentor için işlemler" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Zeynep Öğrenci için işlemler" }),
    ).toBeInTheDocument();
  });
});
