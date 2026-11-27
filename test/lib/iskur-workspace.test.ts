import { describe, expect, it } from "vitest";

import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import {
  confirmCopy,
  defaultMentoringMinutes,
  findPlacement,
  leaderNames,
  minutesToHours,
  nameDialogTitle,
  placementForm,
  placementInput,
  placementPrefill,
  prefilledFields,
  provisionalCount,
  suggestedTeamId,
  teamLeaders,
} from "@/lib/iskur-workspace";
import {
  IskurDialogKind,
  IskurFormProblem,
  type IskurPlacementForm,
  type IskurPlacementPreference,
} from "@/types/iskur-workspace";
import { iskurPlacement, iskurWorkspace } from "@test/fixtures/iskur-workspace";

const workspace = iskurWorkspace();
const form: IskurPlacementForm = {
  teamId: "t1",
  role: IskurTeamRole.Member,
  leaderId: "u-leader",
  weeklyDays: 2,
  mentoringHours: "",
};

describe("İŞKUR workspace rules", () => {
  it("gives the rules frame's default mentoring share per work days", () => {
    expect([1, 2, 3].map(defaultMentoringMinutes)).toEqual([120, 240, 360]);
    expect(defaultMentoringMinutes(5)).toBeNull();
    expect(minutesToHours(990)).toBe(16.5);
  });

  it("finds a placement and a team's leaders", () => {
    expect(findPlacement(workspace, "u-member")?.fullName).toBe("Burak Tan");
    expect(findPlacement(workspace, "u-pool")).toBeNull();
    expect(teamLeaders(workspace, "t1").map((p) => p.userId)).toEqual([
      "u-leader",
    ]);
    expect(teamLeaders(workspace, "t2")).toEqual([]);
    const media = workspace.units.flatMap((unit) => unit.teams)[0];
    expect(media && leaderNames(media).get("u-leader")).toBe("Ayşe Yıldız");
  });

  it("counts the provisional placements a finalize would touch", () => {
    expect(provisionalCount(workspace, { teamId: null, unitId: null })).toBe(1);
    expect(provisionalCount(workspace, { teamId: "t2", unitId: null })).toBe(0);
    expect(provisionalCount(workspace, { teamId: null, unitId: "unit1" })).toBe(
      1,
    );
    expect(provisionalCount(workspace, { teamId: null, unitId: "other" })).toBe(
      0,
    );
  });

  it("starts the dialog from the placement, or from the first team for someone new", () => {
    expect(
      placementForm(workspace, findPlacement(workspace, "u-member")),
    ).toEqual({ ...form, mentoringHours: "0" });
    expect(
      placementForm(workspace, findPlacement(workspace, "u-leader"))
        .mentoringHours,
    ).toBe("");
    expect(placementForm(workspace, null)).toEqual({
      teamId: "t1",
      role: IskurTeamRole.Member,
      leaderId: null,
      weeklyDays: null,
      mentoringHours: "",
    });
    expect(placementForm(iskurWorkspace({ units: [] }), null).teamId).toBe("");
  });

  it("builds the request, keeping a blank mentoring time as the default", () => {
    expect(placementInput(form)).toEqual({
      ok: true,
      input: {
        teamId: "t1",
        role: IskurTeamRole.Member,
        leaderId: "u-leader",
        weeklyDays: 2,
        mentoringMinutes: null,
      },
    });
    expect(placementInput({ ...form, mentoringHours: " 1,5 " })).toMatchObject({
      ok: true,
      input: { mentoringMinutes: 90 },
    });
    expect(placementInput({ ...form, mentoringHours: "0" })).toMatchObject({
      ok: true,
      input: { mentoringMinutes: 0 },
    });
    expect(
      placementInput({ ...form, role: IskurTeamRole.Leader }),
    ).toMatchObject({ ok: true, input: { leaderId: null } });
  });

  it("refuses a dialog that cannot be saved", () => {
    const problem = (changes: Partial<IskurPlacementForm>) => {
      const result = placementInput({ ...form, ...changes });
      return result.ok ? null : result.problem;
    };
    expect(problem({ teamId: "" })).toBe(IskurFormProblem.NoTeam);
    expect(problem({ mentoringHours: "abc" })).toBe(
      IskurFormProblem.MentoringStep,
    );
    expect(problem({ mentoringHours: "0,75" })).toBe(
      IskurFormProblem.MentoringStep,
    );
    for (const typed of ["-1", "0x10", "1e1", "1,5,5", "+1"]) {
      expect(problem({ mentoringHours: typed })).toBe(
        IskurFormProblem.MentoringStep,
      );
    }
    expect(problem({ mentoringHours: "2", weeklyDays: null })).toBe(
      IskurFormProblem.MentoringNeedsDays,
    );
    expect(problem({ mentoringHours: "16" })).toBe(
      IskurFormProblem.MentoringTooMuch,
    );
  });

  it("names each dialog and says whether its action deletes", () => {
    const unit = workspace.units[0];
    const team = unit?.teams[0];
    if (!unit || !team) throw new Error("fixture has a unit and a team");
    const person = workspace.pool[0];
    if (!person) throw new Error("fixture has someone in the pool");
    expect(
      confirmCopy({
        kind: IskurDialogKind.Finalize,
        scope: { teamId: null, unitId: null },
        name: null,
        count: 2,
      }),
    ).toEqual({
      title: "finalizeAllTitle",
      titleValues: undefined,
      count: 2,
      destructive: false,
    });
    expect(
      confirmCopy({
        kind: IskurDialogKind.Finalize,
        scope: { teamId: team.id, unitId: null },
        name: team.name,
        count: 0,
      }),
    ).toMatchObject({
      title: "finalizeTitle",
      titleValues: { name: team.name },
    });
    expect(confirmCopy({ kind: IskurDialogKind.DeleteUnit, unit })).toEqual({
      title: "deleteUnitTitle",
      titleValues: { name: unit.name },
      count: null,
      destructive: true,
    });
    expect(
      confirmCopy({ kind: IskurDialogKind.DeleteTeam, team }),
    ).toMatchObject({ title: "deleteTeamTitle", destructive: true });
    expect(confirmCopy({ kind: IskurDialogKind.Unit, unit: null })).toBeNull();

    expect(nameDialogTitle({ kind: IskurDialogKind.Unit, unit: null })).toBe(
      "addUnitTitle",
    );
    expect(nameDialogTitle({ kind: IskurDialogKind.Unit, unit })).toBe(
      "editUnitTitle",
    );
    expect(
      nameDialogTitle({
        kind: IskurDialogKind.Team,
        unitId: unit.id,
        team: null,
      }),
    ).toBe("addTeamTitle");
    expect(
      nameDialogTitle({ kind: IskurDialogKind.Team, unitId: unit.id, team }),
    ).toBe("renameTeamTitle");
    expect(
      nameDialogTitle({ kind: IskurDialogKind.Place, person, placed: false }),
    ).toBeNull();
  });
});

describe("placement dialog pre-filled from the onboarding form", () => {
  const people = (count: number, role = IskurTeamRole.Member) =>
    Array.from({ length: count }, (_, index) =>
      iskurPlacement({ userId: `${role}-${index}`, role }),
    );
  const team = (id: string, members: ReturnType<typeof people> = []) => ({
    id,
    name: id,
    sortOrder: 0,
    people: members,
    warnings: [],
  });
  /** Unit A: a, b; unit B: c; unit C has no team yet. */
  const twoUnits = (a = people(0), b = people(0)) =>
    iskurWorkspace({
      units: [
        {
          id: "A",
          name: "A",
          sortOrder: 0,
          coordinator: null,
          teams: [team("a", a), team("b", b)],
        },
        {
          id: "B",
          name: "B",
          sortOrder: 1,
          coordinator: null,
          teams: [team("c")],
        },
        { id: "C", name: "C", sortOrder: 2, coordinator: null, teams: [] },
      ],
    });
  const preference = (
    unitScores: Record<string, number>,
    wantsLeadership = false,
  ): IskurPlacementPreference => ({
    weeklyDays: 2,
    wantsLeadership,
    unitScores,
  });

  it("suggests a team in the best-rated chosen unit, ties in screen order", () => {
    expect(suggestedTeamId(twoUnits(), preference({ B: 0 }))).toBe("c");
    expect(suggestedTeamId(twoUnits(), preference({ A: 1, B: 4 }))).toBe("c");
    expect(suggestedTeamId(twoUnits(), preference({ B: 2, A: 2 }))).toBe("a");
    expect(suggestedTeamId(twoUnits(), preference({ C: 9, A: 0 }))).toBe("a");
  });

  it("skips full teams, and teams with two leaders for a would-be leader", () => {
    expect(suggestedTeamId(twoUnits(people(9)), preference({ A: 1 }))).toBe(
      "b",
    );
    expect(
      suggestedTeamId(twoUnits(people(9), people(9)), preference({ A: 1 })),
    ).toBe("a");
    const twoLeaders = people(2, IskurTeamRole.Leader);
    expect(suggestedTeamId(twoUnits(twoLeaders), preference({ A: 1 }))).toBe(
      "a",
    );
    expect(
      suggestedTeamId(twoUnits(twoLeaders), preference({ A: 1 }, true)),
    ).toBe("b");
    expect(
      suggestedTeamId(
        twoUnits(twoLeaders, people(9)),
        preference({ A: 1 }, true),
      ),
    ).toBe("a");
  });

  it("suggests nothing when no chosen unit has a team", () => {
    expect(suggestedTeamId(twoUnits(), preference({ C: 3 }))).toBeNull();
    expect(suggestedTeamId(twoUnits(), preference({ gone: 3 }))).toBeNull();
    expect(suggestedTeamId(twoUnits(), preference({}))).toBeNull();
  });

  it("starts a new placement from the form: leader wish, days and the suggested team", () => {
    const workspace = twoUnits();
    const prefill = placementPrefill(workspace, preference({ B: 1 }, true));
    expect(prefill).toEqual({
      teamId: "c",
      role: IskurTeamRole.Leader,
      weeklyDays: 2,
    });
    expect(placementForm(workspace, null, prefill)).toEqual({
      teamId: "c",
      role: IskurTeamRole.Leader,
      leaderId: null,
      weeklyDays: 2,
      mentoringHours: "",
    });
    const noTeam = placementPrefill(workspace, preference({ C: 1 }));
    expect(noTeam).toMatchObject({ teamId: null, role: IskurTeamRole.Member });
    expect(placementForm(workspace, null, noTeam).teamId).toBe("a");
    expect(placementPrefill(workspace, null)).toBeNull();
  });

  it("keeps a saved placement's values over the form's", () => {
    const prefill = placementPrefill(workspace, preference({ unit1: 1 }, true));
    expect(
      placementForm(workspace, findPlacement(workspace, "u-member"), prefill),
    ).toEqual({ ...form, mentoringHours: "0" });
  });

  it("marks the fields that still hold the form's values", () => {
    const prefill = {
      teamId: "t1",
      role: IskurTeamRole.Member,
      weeklyDays: 2,
    };
    expect(prefilledFields(form, prefill)).toEqual({
      team: true,
      role: true,
      weeklyDays: true,
    });
    expect(
      prefilledFields(
        {
          ...form,
          teamId: "t2",
          role: IskurTeamRole.Leader,
          weeklyDays: 3,
        },
        prefill,
      ),
    ).toEqual({ team: false, role: false, weeklyDays: false });
    expect(
      prefilledFields(form, {
        teamId: null,
        role: form.role,
        weeklyDays: null,
      }),
    ).toEqual({ team: false, role: true, weeklyDays: false });
    expect(prefilledFields(form, null)).toEqual({
      team: false,
      role: false,
      weeklyDays: false,
    });
  });
});
