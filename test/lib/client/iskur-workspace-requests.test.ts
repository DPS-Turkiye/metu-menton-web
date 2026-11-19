import { beforeEach, describe, vi } from "vitest";

import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import {
  createDefaultIskurStructure,
  createIskurTeam,
  createIskurUnit,
  deleteIskurTeam,
  deleteIskurUnit,
  finalizeIskurPlacements,
  getIskurWorkspace,
  placeIskurIntern,
  unplaceIskurIntern,
  updateIskurTeam,
  updateIskurUnit,
} from "@/lib/client/iskur-workspace";
import {
  itSendsEachClientCall,
  type ClientCall,
} from "@test/fixtures/client-calls";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const BASE = "/api/coordinator/programs/p%2F1/iskur";
const unit = { name: "Etki", coordinatorId: null };
const placement = {
  teamId: "t1",
  role: IskurTeamRole.Leader,
  leaderId: null,
  weeklyDays: 3,
  mentoringMinutes: 0,
};

const calls: ClientCall[] = [
  {
    title: "getIskurWorkspace reads the program's workspace",
    call: () => getIskurWorkspace("p/1"),
    method: "get",
    args: [`${BASE}/workspace`],
  },
  {
    title: "createDefaultIskurStructure creates the org chart's units",
    call: () => createDefaultIskurStructure("p/1"),
    method: "post",
    args: [`${BASE}/structure/default`],
  },
  {
    title: "createIskurUnit adds a unit",
    call: () => createIskurUnit("p/1", unit),
    method: "post",
    args: [`${BASE}/units`, unit],
  },
  {
    title: "updateIskurUnit edits a unit",
    call: () => updateIskurUnit("p/1", "u/1", unit),
    method: "put",
    args: [`${BASE}/units/u%2F1`, unit],
  },
  {
    title: "deleteIskurUnit deletes a unit",
    call: () => deleteIskurUnit("p/1", "u/1"),
    method: "delete",
    args: [`${BASE}/units/u%2F1`],
  },
  {
    title: "createIskurTeam adds a team to a unit",
    call: () => createIskurTeam("p/1", "u/1", { name: "Etkinlik" }),
    method: "post",
    args: [`${BASE}/units/u%2F1/teams`, { name: "Etkinlik" }],
  },
  {
    title: "updateIskurTeam renames a team",
    call: () => updateIskurTeam("p/1", "t/1", { name: "Etkinlik" }),
    method: "put",
    args: [`${BASE}/teams/t%2F1`, { name: "Etkinlik" }],
  },
  {
    title: "deleteIskurTeam deletes a team",
    call: () => deleteIskurTeam("p/1", "t/1"),
    method: "delete",
    args: [`${BASE}/teams/t%2F1`],
  },
  {
    title: "placeIskurIntern places an intern",
    call: () => placeIskurIntern("p/1", "s/1", placement),
    method: "put",
    args: [`${BASE}/placements/s%2F1`, placement],
  },
  {
    title: "unplaceIskurIntern takes an intern out",
    call: () => unplaceIskurIntern("p/1", "s/1"),
    method: "delete",
    args: [`${BASE}/placements/s%2F1`],
  },
  {
    title: "finalizeIskurPlacements finalizes a scope",
    call: () => finalizeIskurPlacements("p/1", { teamId: null, unitId: "u1" }),
    method: "post",
    args: [`${BASE}/placements/finalize`, { teamId: null, unitId: "u1" }],
  },
];

describe("İŞKUR workspace client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  itSendsEachClientCall(calls);
});
