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
import { UserRole } from "@/interfaces/session";
import { backendRequest } from "@/lib/server/backend-client";
import { getSessionUser } from "@/lib/session";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const ID = "00000000-0000-4000-8000-0000000000b1";
// What Next hands a route for an encoded segment: decoded, so `%2e%2e` arrives as "..".
const BAD = [
  "..",
  "../../admin/users",
  "%2e%2e",
  `${ID}\n`,
  ` ${ID}`,
  "p1",
  "",
];

const json = (body: unknown, method = "POST") =>
  new Request("http://x", { method, body: JSON.stringify(body) });
const placement = {
  teamId: ID,
  role: IskurTeamRole.Member,
  leaderId: null,
  weeklyDays: 3,
  mentoringMinutes: null,
};

type Call = (bad: string) => Promise<Response>;
const at = <T extends Record<string, string>>(params: T) => ({
  params: Promise.resolve(params),
});

// One call per route and per path parameter name, each with that parameter bad and the others valid.
const calls: [string, Call][] = [
  [
    "workspace id",
    (bad) => workspace(new Request("http://x"), at({ id: bad })),
  ],
  [
    "structure/default id",
    (bad) => createDefault(new Request("http://x"), at({ id: bad })),
  ],
  ["units id", (bad) => createUnit(json({ name: "Etki" }), at({ id: bad }))],
  [
    "units/[unitId] id",
    (bad) =>
      updateUnit(json({ name: "Etki" }, "PUT"), at({ id: bad, unitId: ID })),
  ],
  [
    "units/[unitId] unitId (PUT)",
    (bad) =>
      updateUnit(json({ name: "Etki" }, "PUT"), at({ id: ID, unitId: bad })),
  ],
  [
    "units/[unitId] unitId (DELETE)",
    (bad) => deleteUnit(new Request("http://x"), at({ id: ID, unitId: bad })),
  ],
  [
    "units/[unitId]/teams unitId",
    (bad) => createTeam(json({ name: "Ekip" }), at({ id: ID, unitId: bad })),
  ],
  [
    "teams/[teamId] teamId (PUT)",
    (bad) =>
      renameTeam(json({ name: "Ekip" }, "PUT"), at({ id: ID, teamId: bad })),
  ],
  [
    "teams/[teamId] id (DELETE)",
    (bad) => deleteTeam(new Request("http://x"), at({ id: bad, teamId: ID })),
  ],
  [
    "teams/[teamId] teamId (DELETE)",
    (bad) => deleteTeam(new Request("http://x"), at({ id: ID, teamId: bad })),
  ],
  [
    "placements/[userId] userId (PUT)",
    (bad) => place(json(placement, "PUT"), at({ id: ID, userId: bad })),
  ],
  [
    "placements/[userId] id (DELETE)",
    (bad) => unplace(new Request("http://x"), at({ id: bad, userId: ID })),
  ],
  [
    "placements/[userId] userId (DELETE)",
    (bad) => unplace(new Request("http://x"), at({ id: ID, userId: bad })),
  ],
  [
    "units/[unitId] id (DELETE)",
    (bad) => deleteUnit(new Request("http://x"), at({ id: bad, unitId: ID })),
  ],
  [
    "units/[unitId]/teams id",
    (bad) => createTeam(json({ name: "Ekip" }), at({ id: bad, unitId: ID })),
  ],
  [
    "teams/[teamId] id (PUT)",
    (bad) =>
      renameTeam(json({ name: "Ekip" }, "PUT"), at({ id: bad, teamId: ID })),
  ],
  [
    "placements/[userId] id (PUT)",
    (bad) => place(json(placement, "PUT"), at({ id: bad, userId: ID })),
  ],
  ["placements/finalize id", (bad) => finalize(json({}), at({ id: bad }))],
];

describe("İŞKUR workspace routes: path parameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "COORDINATOR-1",
      email: "someone@example.test",
      fullName: "Someone",
      jobTitle: "x",
      role: UserRole.Coordinator,
    });
    vi.mocked(backendRequest).mockResolvedValue({
      data: {},
      headers: {},
      status: 200,
    });
  });

  it.each(calls)(
    "refuses a %s that is not a uuid before any backend call",
    async (_name, call) => {
      for (const bad of BAD) {
        const response = await call(bad);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
          code: "INVALID_REQUEST",
        });
      }
      expect(backendRequest).not.toHaveBeenCalled();
    },
  );

  it("still forwards valid uuids to the backend path they name", async () => {
    await unplace(new Request("http://x"), at({ id: ID, userId: ID }));
    expect(backendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/api/coordinator/programs/${ID}/iskur/placements/${ID}`,
      }),
    );
  });
});
