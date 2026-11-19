import { describe, expect, it } from "vitest";

import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { ProgramStatus, ProgramType } from "@/interfaces/program";
import { formatProgramRun } from "@/lib/coordinator-programs";
import {
  draftsToConfigure,
  filterOdtuPrograms,
  programDateLine,
  programStats,
  type ProgramlarimSegment,
} from "@/lib/odtu-coordinator-programs";
import { ProgramStatusFilter, statusCounts } from "@/lib/program-status-filter";
import { ALL_PROGRAM_TYPES, type ProgramTypeFilter } from "@/lib/program-types";
import { coordinatorProgram } from "@test/fixtures/coordinator-programs";
import { translatorIn } from "@test/translators";

const t = translatorIn("tr", "odtuCoordinatorPrograms");

const peer = coordinatorProgram({
  id: "peer",
  name: "Akran Mentörlüğü 2026 Güz",
  type: ProgramType.PeerMentoring,
  startDate: "2026-09-01",
  endDate: "2027-01-31",
  counts: {
    peer: {
      students: 1312,
      peerMentors: 38,
      openRequests: 14,
      activeCategories: 3,
    },
    officeHours: null,
  },
});
const officeHours = coordinatorProgram({
  id: "oh",
  name: "ODTÜ Office Hours",
  type: ProgramType.OfficeHours,
  counts: {
    peer: null,
    officeHours: {
      academicians: 2410,
      withAvailability: 1280,
      awaitingDecision: 86,
    },
  },
});
const draft = coordinatorProgram({
  id: "draft",
  name: "Kariyer Akran Mentörlüğü 2027",
  type: ProgramType.PeerMentoring,
  status: ProgramStatus.Draft,
  lifecycle: ProgramLifecycle.Draft,
  startDate: "2027-02-01",
  endDate: null,
  counts: {
    peer: {
      students: 0,
      peerMentors: 38,
      openRequests: 0,
      activeCategories: 0,
    },
    officeHours: null,
  },
});
const completed = coordinatorProgram({
  id: "done",
  type: ProgramType.PeerMentoring,
  status: ProgramStatus.Completed,
  lifecycle: ProgramLifecycle.Completed,
});
const programs = [peer, officeHours, draft, completed];

const values = (stats: ReturnType<typeof programStats>) =>
  stats.map((stat) => `${stat.value} ${stat.label}`);

describe("ODTÜ Programlarım", () => {
  it("counts each segment, the completed programs under Tümü only", () => {
    expect(statusCounts(programs)).toEqual({
      [ProgramStatusFilter.All]: 4,
      [ProgramStatusFilter.Active]: 2,
      [ProgramStatusFilter.Draft]: 1,
      [ProgramStatusFilter.Completed]: 1,
    });
  });

  it("filters by segment and type", () => {
    const ids = (
      segment: ProgramlarimSegment,
      type: ProgramTypeFilter = ALL_PROGRAM_TYPES,
    ) =>
      filterOdtuPrograms(programs, segment, type).map((program) => program.id);
    expect(ids(ProgramStatusFilter.Active)).toEqual(["peer", "oh"]);
    expect(ids(ProgramStatusFilter.Draft)).toEqual(["draft"]);
    expect(ids(ProgramStatusFilter.All, ProgramType.OfficeHours)).toEqual([
      "oh",
    ]);
  });

  it("names the drafts still to be set up", () => {
    expect(draftsToConfigure(programs).map((program) => program.id)).toEqual([
      "draft",
    ]);
  });

  it("dates a card by its run, a draft by its start and Office Hours as university-wide", () => {
    expect(programDateLine(peer, "Üniversite geneli", "tr")).toBe(
      "Eyl 2026 – Oca 2027",
    );
    expect(programDateLine(draft, "Üniversite geneli", "tr")).toBe("Şub 2027");
    expect(programDateLine(officeHours, "Üniversite geneli", "tr")).toBe(
      "Üniversite geneli",
    );
    expect(
      programDateLine(
        coordinatorProgram({ startDate: null, endDate: null }),
        "Üniversite geneli",
        "tr",
      ),
    ).toBe("—");
  });

  it("shows the numbers each program type cares about", () => {
    expect(values(programStats(peer, t, "tr"))).toEqual([
      "1.312 öğrenci",
      "38 akran mentoru",
      "14 bekleyen talep",
    ]);
    expect(values(programStats(draft, t, "tr"))).toEqual([
      "— öğrenci",
      "38 akran mentoru",
      "0 aktif kategori",
    ]);
    expect(values(programStats(officeHours, t, "tr"))).toEqual([
      "2.410 akademisyen",
      "1.280 müsaitliği olan",
      "86 onay bekliyor",
    ]);
    expect(values(programStats(coordinatorProgram(), t, "tr"))).toEqual([
      "42 takım",
      "28 mentor",
      "14 açık iş",
    ]);
  });

  it("shows a run with one date as that month", () => {
    expect(formatProgramRun("2026-02-01", null, "tr")).toBe("Şub 2026");
    expect(formatProgramRun(null, "2026-12-10", "tr")).toBe("Ara 2026");
    expect(formatProgramRun("2026-02-01", "2026-12-10", "tr")).toBe(
      "Şub – Ara 2026",
    );
    expect(formatProgramRun(null, null, "tr")).toBe("");
  });

  it("reads a count an older backend does not send as a dash", () => {
    expect(
      values(
        programStats(
          coordinatorProgram({ type: ProgramType.OfficeHours }),
          t,
          "tr",
        ),
      ),
    ).toEqual(["— akademisyen", "— müsaitliği olan", "— onay bekliyor"]);
  });
});
