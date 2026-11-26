import { describe, expect, it } from "vitest";

import type { AdminUser } from "@/interfaces/admin-overview";
import {
  ProgramFeature,
  ProgramStatus,
  ProgramType,
} from "@/interfaces/program";
import { UserAccountStatus, UserRole } from "@/interfaces/session";
import {
  ALL_COORDINATORS,
  coordinatorChoices,
  coordinatorLabel,
  filterAdminPrograms,
  participantsLabel,
  programCoordinators,
  programDateLabel,
} from "@/lib/admin-programs";
import { formatMonthRange } from "@/lib/coordinator-programs";
import { ALL_PROGRAM_FEATURES } from "@/lib/program-features";
import { ProgramStatusFilter, statusCounts } from "@/lib/program-status-filter";
import { adminProgram } from "@test/fixtures/admin-programs";
import { translatorIn } from "@test/translators";

const t = translatorIn("tr", "odtuAdminPrograms");

function user(id: string, fullName: string): AdminUser {
  return {
    id,
    email: `${id}@metu.test`,
    fullName,
    role: UserRole.Coordinator,
    status: UserAccountStatus.Approved,
    organizationId: null,
    organizationName: null,
    jobTitle: null,
  };
}

const users = new Map([
  ["elif", user("elif", "Elif Demir")],
  ["selin", user("selin", "Selin Er")],
]);

const peer = adminProgram({
  id: "peer",
  name: "Akran Mentörlüğü 2026 Güz",
  type: ProgramType.PeerMentoring,
  startDate: "2026-09-01",
  endDate: "2027-01-31",
  coordinatorIds: ["selin"],
  counts: {
    peer: {
      students: 1312,
      peerMentors: 38,
      openRequests: 14,
      activeCategories: 2,
    },
    officeHours: null,
  },
});
const officeHours = adminProgram({
  id: "oh",
  name: "ODTÜ Office Hours",
  type: ProgramType.OfficeHours,
  coordinatorIds: ["elif", "selin"],
});
const draft = adminProgram({
  id: "draft",
  name: "Kariyer Akran Mentörlüğü 2027",
  type: ProgramType.PeerMentoring,
  status: ProgramStatus.Draft,
  startDate: "2027-02-01",
  coordinatorIds: [],
});
const completed = adminProgram({
  id: "done",
  name: "Akran Mentörlüğü 2025",
  type: ProgramType.PeerMentoring,
  status: ProgramStatus.Completed,
  startDate: "2025-02-01",
  endDate: "2025-12-15",
  coordinatorIds: ["elif"],
});
const programs = [peer, officeHours, draft, completed];

describe("admin Programlar (ODTÜ)", () => {
  it("counts the programs of each segment", () => {
    expect(statusCounts(programs)).toEqual({
      [ProgramStatusFilter.All]: 4,
      [ProgramStatusFilter.Active]: 2,
      [ProgramStatusFilter.Draft]: 1,
      [ProgramStatusFilter.Completed]: 1,
    });
  });

  it("filters by status, type, any of the coordinators and name", () => {
    const all = {
      status: ProgramStatusFilter.All,
      feature: ALL_PROGRAM_FEATURES,
      coordinatorId: ALL_COORDINATORS,
      search: "",
    } as const;
    const names = (filters: Parameters<typeof filterAdminPrograms>[1]) =>
      filterAdminPrograms(programs, filters).map((program) => program.id);

    expect(names(all)).toEqual(["peer", "oh", "draft", "done"]);
    expect(names({ ...all, status: ProgramStatusFilter.Draft })).toEqual([
      "draft",
    ]);
    expect(names({ ...all, feature: ProgramFeature.OfficeHours })).toEqual([
      "oh",
    ]);
    expect(names({ ...all, coordinatorId: "selin" })).toEqual(["peer", "oh"]);
    expect(names({ ...all, search: "  OFFİCE " })).toEqual(["oh"]);
  });

  it("names the first coordinator and how many more there are", () => {
    expect(coordinatorLabel(programCoordinators(officeHours, users), t)).toBe(
      "Elif Demir +1",
    );
    expect(coordinatorLabel(programCoordinators(peer, users), t)).toBe(
      "Selin Er",
    );
    expect(coordinatorLabel(programCoordinators(draft, users), t)).toBeNull();
  });

  it("reads the names from the label when an older backend sends no ids", () => {
    const older = adminProgram({ coordinatorName: "Elif Demir, Selin Er" });
    expect(programCoordinators(older, users)).toEqual([
      { id: "", name: "Elif Demir" },
      { id: "", name: "Selin Er" },
    ]);
  });

  it("names a coordinator the user list lacks from the label, in order", () => {
    const program = adminProgram({
      coordinatorIds: ["elif", "ghost"],
      coordinatorName: "Elif Demir, Ayşe Kaya",
    });
    expect(programCoordinators(program, users)).toEqual([
      { id: "elif", name: "Elif Demir" },
      { id: "ghost", name: "Ayşe Kaya" },
    ]);
  });

  it("offers each coordinator once, in Turkish alphabetical order", () => {
    expect(coordinatorChoices(programs, users)).toEqual([
      { id: "elif", name: "Elif Demir" },
      { id: "selin", name: "Selin Er" },
    ]);
  });

  it("dates a program by its run, a draft by its start and Office Hours as university-wide", () => {
    expect(programDateLabel(peer, t, "tr")).toBe("Eyl 2026 – Oca 2027");
    expect(programDateLabel(completed, t, "tr")).toBe("Şub – Ara 2025");
    expect(programDateLabel(draft, t, "tr")).toBe("Şub 2027 · taslak");
    expect(programDateLabel(officeHours, t, "tr")).toBe("Üniversite geneli");
    expect(
      programDateLabel(adminProgram({ startDate: "2026-02-01" }), t, "tr"),
    ).toBe("Şub 2026");
    expect(
      programDateLabel(
        adminProgram({ status: ProgramStatus.Draft, startDate: null }),
        t,
        "tr",
      ),
    ).toBe("—");
  });

  it("counts a peer program's students, a startup program's teams and mentors, and nobody in a draft", () => {
    expect(participantsLabel(peer, t, "tr")).toBe("1.312");
    expect(participantsLabel(officeHours, t, "tr")).toBe("Tümü");
    expect(participantsLabel(draft, t, "tr")).toBe("—");
    expect(
      participantsLabel(
        adminProgram({ startupCount: 42, acceptedMentorCount: 28 }),
        t,
        "tr",
      ),
    ).toBe("70");
    expect(
      participantsLabel(
        adminProgram({ type: ProgramType.PeerMentoring }),
        t,
        "tr",
      ),
    ).toBe("—");
  });

  it("names a one-year range's year once only when asked", () => {
    expect(
      formatMonthRange("2026-02-01", "2026-12-10", "tr", { shareYear: true }),
    ).toBe("Şub – Ara 2026");
    expect(formatMonthRange("2026-02-01", "2026-12-10", "tr")).toBe(
      "Şub 2026 – Ara 2026",
    );
    expect(
      formatMonthRange("2026-02-01", "2026-02-20", "tr", { shareYear: true }),
    ).toBe("Şub 2026");
    expect(
      formatMonthRange("2026-02-01", null, "tr", { shareYear: true }),
    ).toBe("Şub 2026 –");
  });
});
