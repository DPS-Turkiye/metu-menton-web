import { describe, expect, it } from "vitest";

import {
  ALL_APPOINTMENTS,
  APPOINTMENTS_PAGE_SIZE,
  studentRequestCounts,
  studentsQuery,
} from "@/lib/program-office-hours";

describe("program office hours students", () => {
  it("asks for students with the set filters and a zero-based page", () => {
    expect(
      studentsQuery({
        search: " Ay ",
        faculty: ALL_APPOINTMENTS,
        awaitingOnly: true,
        page: 2,
      }),
    ).toEqual({
      search: "Ay",
      faculty: null,
      awaitingOnly: true,
      page: 1,
      size: APPOINTMENTS_PAGE_SIZE,
    });
  });

  it("lists a student's request counts in the order a request moves, leaving zeros out", () => {
    expect(
      studentRequestCounts({
        awaitingDecision: 0,
        alternativeProposed: 1,
        accepted: 3,
        declined: 0,
        withdrawn: 2,
      }),
    ).toEqual([
      { kind: "alternativeProposed", count: 1 },
      { kind: "accepted", count: 3 },
      { kind: "withdrawn", count: 2 },
    ]);
  });
});
