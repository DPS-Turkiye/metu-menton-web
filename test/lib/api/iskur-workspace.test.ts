import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamRole } from "@/interfaces/iskur-workspace";
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
import { backendRequest } from "@/lib/server/backend-client";
import { withForgedActor } from "@test/fixtures/forged-actor";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const BASE = "/api/coordinator/programs/p%2F1/iskur";
const placement = {
  teamId: "t1",
  role: IskurTeamRole.Member,
  leaderId: "l1",
  weeklyDays: 2,
  mentoringMinutes: null,
};

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads the workspace",
    () => fetchIskurWorkspace("c1", "p/1"),
    { method: "GET", url: `${BASE}/workspace`, params: { actorId: "c1" } },
  ],
  [
    "creates the default structure",
    () => createDefaultIskurStructure("c1", "p/1"),
    {
      method: "POST",
      url: `${BASE}/structure/default`,
      data: { actorId: "c1" },
    },
  ],
  [
    "creates a unit",
    () => createIskurUnit("c1", "p/1", { name: "Etki", coordinatorId: null }),
    {
      method: "POST",
      url: `${BASE}/units`,
      data: { actorId: "c1", name: "Etki", coordinatorId: null },
    },
  ],
  [
    "updates an encoded unit",
    () =>
      updateIskurUnit("c1", "p/1", "u/1", {
        name: "Etki",
        coordinatorId: "c2",
      }),
    {
      method: "PUT",
      url: `${BASE}/units/u%2F1`,
      data: { actorId: "c1", name: "Etki", coordinatorId: "c2" },
    },
  ],
  [
    "deletes a unit",
    () => deleteIskurUnit("c1", "p/1", "u/1"),
    { method: "DELETE", url: `${BASE}/units/u%2F1`, params: { actorId: "c1" } },
  ],
  [
    "creates a team in a unit",
    () => createIskurTeam("c1", "p/1", "u/1", { name: "Etkinlik" }),
    {
      method: "POST",
      url: `${BASE}/units/u%2F1/teams`,
      data: { actorId: "c1", name: "Etkinlik" },
    },
  ],
  [
    "renames a team",
    () => updateIskurTeam("c1", "p/1", "t/1", { name: "Etkinlik" }),
    {
      method: "PUT",
      url: `${BASE}/teams/t%2F1`,
      data: { actorId: "c1", name: "Etkinlik" },
    },
  ],
  [
    "deletes a team",
    () => deleteIskurTeam("c1", "p/1", "t/1"),
    { method: "DELETE", url: `${BASE}/teams/t%2F1`, params: { actorId: "c1" } },
  ],
  [
    "places an intern",
    () => placeIskurIntern("c1", "p/1", "s/1", placement),
    {
      method: "PUT",
      url: `${BASE}/placements/s%2F1`,
      data: { actorId: "c1", ...placement },
    },
  ],
  [
    "keeps the session actor over one hidden in the input",
    () => placeIskurIntern("c1", "p/1", "s/1", withForgedActor(placement)),
    {
      method: "PUT",
      url: `${BASE}/placements/s%2F1`,
      data: { ...placement, actorId: "c1" },
    },
  ],
  [
    "unplaces an intern",
    () => unplaceIskurIntern("c1", "p/1", "s/1"),
    {
      method: "DELETE",
      url: `${BASE}/placements/s%2F1`,
      params: { actorId: "c1" },
    },
  ],
  [
    "finalizes a scope",
    () => finalizeIskurPlacements("c1", "p/1", { teamId: "t1", unitId: null }),
    {
      method: "POST",
      url: `${BASE}/placements/finalize`,
      data: { actorId: "c1", teamId: "t1", unitId: null },
    },
  ],
];

describe("İŞKUR workspace server API", () => {
  beforeEach(() => {
    vi.mocked(backendRequest).mockReset();
  });

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
