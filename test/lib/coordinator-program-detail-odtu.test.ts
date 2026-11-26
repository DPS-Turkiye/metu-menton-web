import { describe, expect, it } from "vitest";

import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { ProgramType } from "@/interfaces/program";
import {
  odtuProgramHeaderLine,
  odtuProgramTabs,
  programSwitcherOptions,
  ProgramTab,
} from "@/lib/coordinator-program-detail";
import {
  coordinatorProgram,
  coordinatorProgramDetail,
} from "@test/fixtures/coordinator-programs";
import { translatorIn } from "@test/translators";

const t = translatorIn("tr", "coordinatorPrograms");

function detail(type: ProgramType) {
  return coordinatorProgramDetail({
    program: coordinatorProgram({
      type,
      lifecycle: ProgramLifecycle.Active,
      startDate: "2026-09-01",
      endDate: "2027-01-31",
    }),
    coordinators: [
      { id: "c-1", fullName: "Elif Demir", owner: true, features: [] },
    ],
  });
}

describe("ODTÜ program header", () => {
  it("puts Raporlar as a tab right before Program Ayarları", () => {
    expect(
      odtuProgramTabs(detail(ProgramType.OfficeHours), "p 1").map((tab) => [
        tab.id,
        tab.href,
      ]),
    ).toEqual([
      [ProgramTab.Overview, "/coordinator/programs/p%201"],
      [ProgramTab.Participants, "/coordinator/programs/p%201/academics"],
      [ProgramTab.Appointments, "/coordinator/programs/p%201/appointments"],
      [ProgramTab.Reports, "/coordinator/programs/p%201/report"],
      [ProgramTab.Settings, "/coordinator/programs/p%201/settings"],
    ]);
    expect(
      odtuProgramTabs(detail(ProgramType.PeerMentoring), "p").map(
        (tab) => tab.id,
      ),
    ).toEqual([
      ProgramTab.Overview,
      ProgramTab.Participants,
      ProgramTab.Matching,
      ProgramTab.Approvals,
      ProgramTab.Reports,
      ProgramTab.Settings,
    ]);
  });

  it("says Office Hours runs university-wide and gives a peer program its months", () => {
    expect(
      odtuProgramHeaderLine(detail(ProgramType.OfficeHours), t, "tr"),
    ).toBe("Üniversite geneli · Koordinatör: Elif Demir");
    expect(
      odtuProgramHeaderLine(detail(ProgramType.PeerMentoring), t, "tr"),
    ).toBe("Eyl 2026 – Oca 2027 · Koordinatör: Elif Demir");
  });

  it("leaves the coordinators out when nobody is assigned yet", () => {
    const draft = detail(ProgramType.PeerMentoring);
    draft.coordinators = [];
    draft.program.startDate = null;
    draft.program.endDate = null;
    expect(odtuProgramHeaderLine(draft, t, "tr")).toBe("");
  });

  it("offers the coordinator's programs by name and always the current one", () => {
    const programs = [
      coordinatorProgram({ id: "b", name: "Şeker" }),
      coordinatorProgram({ id: "a", name: "Çay" }),
    ];
    expect(programSwitcherOptions(programs, "a")).toEqual([
      { value: "a", label: "Çay" },
      { value: "b", label: "Şeker" },
    ]);
    expect(programSwitcherOptions([], "x", "ODTÜ Office Hours")).toEqual([
      { value: "x", label: "ODTÜ Office Hours" },
    ]);
  });
});
