import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PUT as place,
  DELETE as unplace,
} from "@/app/api/coordinator/programs/[id]/iskur/placements/[userId]/route";
import { POST as finalize } from "@/app/api/coordinator/programs/[id]/iskur/placements/finalize/route";
import { POST as createDefault } from "@/app/api/coordinator/programs/[id]/iskur/structure/default/route";
import {
  DELETE as deleteTeam,
  PUT as renameTeam,
} from "@/app/api/coordinator/programs/[id]/iskur/teams/[teamId]/route";
import {
  DELETE as deleteUnit,
  PUT as updateUnit,
} from "@/app/api/coordinator/programs/[id]/iskur/units/[unitId]/route";
import { POST as createTeam } from "@/app/api/coordinator/programs/[id]/iskur/units/[unitId]/teams/route";
import { POST as createUnit } from "@/app/api/coordinator/programs/[id]/iskur/units/route";
import { GET as workspace } from "@/app/api/coordinator/programs/[id]/iskur/workspace/route";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  createDefaultIskurStructure,
  createIskurTeam,
  createIskurUnit,
  deleteIskurTeam,
  deleteIskurUnit,
  fetchIskurWorkspace,
  finalizeIskurPlacements,
  placeIskurIntern,
  unplaceIskurIntern,
  updateIskurTeam,
  updateIskurUnit,
} from "@/lib/api/iskur-workspace";
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-workspace", () => ({
  createDefaultIskurStructure: vi.fn(),
  createIskurTeam: vi.fn(),
  createIskurUnit: vi.fn(),
  deleteIskurTeam: vi.fn(),
  deleteIskurUnit: vi.fn(),
  fetchIskurWorkspace: vi.fn(),
  finalizeIskurPlacements: vi.fn(),
  placeIskurIntern: vi.fn(),
  unplaceIskurIntern: vi.fn(),
  updateIskurTeam: vi.fn(),
  updateIskurUnit: vi.fn(),
}));

const calls = [
  createDefaultIskurStructure,
  createIskurTeam,
  createIskurUnit,
  deleteIskurTeam,
  deleteIskurUnit,
  fetchIskurWorkspace,
  finalizeIskurPlacements,
  placeIskurIntern,
  unplaceIskurIntern,
  updateIskurTeam,
  updateIskurUnit,
] as const;

const PROGRAM = "00000000-0000-4000-8000-0000000000a1";
const UNIT = "00000000-0000-4000-8000-0000000000a2";
const PATH_TEAM = "00000000-0000-4000-8000-0000000000a3";
const INTERN = "00000000-0000-4000-8000-0000000000a4";
const program = { params: Promise.resolve({ id: PROGRAM }) };
const unit = { params: Promise.resolve({ id: PROGRAM, unitId: UNIT }) };
const team = { params: Promise.resolve({ id: PROGRAM, teamId: PATH_TEAM }) };
const intern = { params: Promise.resolve({ id: PROGRAM, userId: INTERN }) };
const TEAM = "00000000-0000-4000-8000-000000000001";
const LEADER = "00000000-0000-4000-8000-000000000002";
const COORDINATOR = "00000000-0000-4000-8000-000000000003";
const validPlacement = {
  teamId: TEAM,
  role: IskurTeamRole.Member,
  leaderId: LEADER,
  weeklyDays: 2,
  mentoringMinutes: 0,
};

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@example.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

const json = (body: unknown, method = "POST") =>
  new Request("http://x", { method, body: JSON.stringify(body) });

describe("İŞKUR workspace routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
  });

  it("keeps every route to coordinators and the admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await workspace(new Request("http://x"), program)).status).toBe(
      401,
    );
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    const refused = [
      await workspace(new Request("http://x"), program),
      await createDefault(new Request("http://x"), program),
      await createUnit(json({ name: "Etki" }), program),
      await updateUnit(json({ name: "Etki" }, "PUT"), unit),
      await deleteUnit(new Request("http://x"), unit),
      await createTeam(json({ name: "Etkinlik" }), unit),
      await renameTeam(json({ name: "Etkinlik" }, "PUT"), team),
      await deleteTeam(new Request("http://x"), team),
      await place(json(validPlacement, "PUT"), intern),
      await unplace(new Request("http://x"), intern),
      await finalize(json({}), program),
    ];
    expect(refused.map((response) => response.status)).toEqual(
      refused.map(() => 403),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and ignores a forged actor", async () => {
    await workspace(new Request("http://x"), program);
    expect(fetchIskurWorkspace).toHaveBeenCalledWith("COORDINATOR-1", PROGRAM);

    await createDefault(new Request("http://x"), program);
    expect(createDefaultIskurStructure).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );

    await createUnit(json(withForgedActor({ name: " Etki " })), program);
    expect(createIskurUnit).toHaveBeenCalledWith("COORDINATOR-1", PROGRAM, {
      name: "Etki",
      coordinatorId: null,
    });

    await updateUnit(
      json({ name: "Etki", coordinatorId: COORDINATOR }, "PUT"),
      unit,
    );
    expect(updateIskurUnit).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      UNIT,
      {
        name: "Etki",
        coordinatorId: COORDINATOR,
      },
    );

    await deleteUnit(new Request("http://x"), unit);
    expect(deleteIskurUnit).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      UNIT,
    );

    await createTeam(json({ name: "Etkinlik" }), unit);
    expect(createIskurTeam).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      UNIT,
      {
        name: "Etkinlik",
      },
    );

    await renameTeam(json({ name: "Sosyal Etki" }, "PUT"), team);
    expect(updateIskurTeam).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      PATH_TEAM,
      {
        name: "Sosyal Etki",
      },
    );

    await deleteTeam(new Request("http://x"), team);
    expect(deleteIskurTeam).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      PATH_TEAM,
    );

    await place(json(withForgedActor(validPlacement), "PUT"), intern);
    expect(placeIskurIntern).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      INTERN,
      validPlacement,
    );

    await unplace(new Request("http://x"), intern);
    expect(unplaceIskurIntern).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      INTERN,
    );
  });

  it("finalizes the whole program when no scope is sent", async () => {
    await finalize(new Request("http://x", { method: "POST" }), program);
    expect(finalizeIskurPlacements).toHaveBeenLastCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      { teamId: null, unitId: null },
    );
    await finalize(json({ teamId: TEAM }), program);
    expect(finalizeIskurPlacements).toHaveBeenLastCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      { teamId: TEAM, unitId: null },
    );
  });

  it("refuses malformed bodies before the backend", async () => {
    const statuses = [
      await createUnit(json({ name: "  " }), program),
      await createUnit(json({ name: "x".repeat(81) }), program),
      await updateUnit(json({}, "PUT"), unit),
      await createTeam(json({ name: 3 }), unit),
      await renameTeam(json(null, "PUT"), team),
      await place(json({ ...validPlacement, role: "BOSS" }, "PUT"), intern),
      await place(json({ ...validPlacement, weeklyDays: 4 }, "PUT"), intern),
      await place(
        json({ ...validPlacement, mentoringMinutes: 1.5 }, "PUT"),
        intern,
      ),
      await place(json({ ...validPlacement, teamId: "" }, "PUT"), intern),
      await place(json({ ...validPlacement, teamId: "t1" }, "PUT"), intern),
      await place(
        json({ ...validPlacement, mentoringMinutes: 45 }, "PUT"),
        intern,
      ),
      await place(
        json(
          { ...validPlacement, weeklyDays: null, mentoringMinutes: 60 },
          "PUT",
        ),
        intern,
      ),
      await createUnit(json({ name: "Etki", coordinatorId: "c2" }), program),
      await finalize(json({ teamId: 5 }), program),
    ].map((response) => response.status);
    expect(statuses).toEqual(statuses.map(() => 400));
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("maps a backend failure to a translated 502", async () => {
    const down = new Error("socket hang up");
    for (const call of calls) vi.mocked(call).mockRejectedValue(down);
    const responses = [
      await workspace(new Request("http://x"), program),
      await createDefault(new Request("http://x"), program),
      await createUnit(json({ name: "Etki" }), program),
      await updateUnit(json({ name: "Etki" }, "PUT"), unit),
      await deleteUnit(new Request("http://x"), unit),
      await createTeam(json({ name: "Etkinlik" }), unit),
      await renameTeam(json({ name: "Etkinlik" }, "PUT"), team),
      await deleteTeam(new Request("http://x"), team),
      await place(json(validPlacement, "PUT"), intern),
      await unplace(new Request("http://x"), intern),
      await finalize(json({}), program),
    ];
    expect(responses.map((response) => response.status)).toEqual(
      responses.map(() => 502),
    );
    await expect(responses[0]?.json()).resolves.toMatchObject({
      message: "iskurWorkspaceLoadFailed",
    });
  });
});
