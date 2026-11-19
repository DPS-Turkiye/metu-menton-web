import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import {
  createDefaultIskurSupportActivities,
  createIskurSupportActivity,
  deleteIskurSupportActivity,
  fetchIskurSupportActivities,
  updateIskurSupportActivity,
} from "@/lib/api/iskur-support-activities";
import {
  createIskurTask,
  deleteIskurTask,
  fetchIskurTask,
  fetchIskurTeamTasks,
  updateIskurTask,
} from "@/lib/api/iskur-tasks";
import { backendRequest } from "@/lib/server/backend-client";
import { withForgedActor } from "@test/fixtures/forged-actor";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const task = {
  assigneeId: "m1",
  title: "Afiş",
  kind: IskurTaskKind.Event,
  estimatedMinutes: 90,
  dueDate: "2026-11-20",
  needsOutput: true,
  description: null,
};
const update = {
  status: IskurTaskStatus.Done,
  actualMinutes: 90,
  outputLink: "https://x.test",
  outputNote: null,
  handoverReason: null,
};
const activity = { title: "Açık ofis", description: null, active: null };
const POOL = "/api/coordinator/programs/p%2F1/iskur/support-activities";

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "reads this week's team tasks",
    () => fetchIskurTeamTasks("u1", null),
    { method: "GET", url: "/api/iskur/team/tasks", params: { actorId: "u1" } },
  ],
  [
    "reads another week's team tasks",
    () => fetchIskurTeamTasks("u1", "2026-11-23"),
    {
      method: "GET",
      url: "/api/iskur/team/tasks",
      params: { actorId: "u1", weekStart: "2026-11-23" },
    },
  ],
  [
    "assigns a task as the session user",
    () => createIskurTask("u1", withForgedActor(task)),
    {
      method: "POST",
      url: "/api/iskur/team/tasks",
      data: { ...task, actorId: "u1" },
    },
  ],
  [
    "reads a task",
    () => fetchIskurTask("u1", "t/1"),
    { method: "GET", url: "/api/iskur/tasks/t%2F1", params: { actorId: "u1" } },
  ],
  [
    "updates a task as the session user",
    () => updateIskurTask("u1", "t/1", withForgedActor(update)),
    {
      method: "PATCH",
      url: "/api/iskur/tasks/t%2F1",
      data: { ...update, actorId: "u1" },
    },
  ],
  [
    "deletes a task",
    () => deleteIskurTask("u1", "t/1"),
    {
      method: "DELETE",
      url: "/api/iskur/tasks/t%2F1",
      params: { actorId: "u1" },
    },
  ],
  [
    "reads the pool",
    () => fetchIskurSupportActivities("c1", "p/1"),
    { method: "GET", url: POOL, params: { actorId: "c1" } },
  ],
  [
    "seeds the default pool",
    () => createDefaultIskurSupportActivities("c1", "p/1"),
    { method: "POST", url: `${POOL}/default`, data: { actorId: "c1" } },
  ],
  [
    "adds an activity as the session user",
    () => createIskurSupportActivity("c1", "p/1", withForgedActor(activity)),
    { method: "POST", url: POOL, data: { ...activity, actorId: "c1" } },
  ],
  [
    "updates an activity",
    () => updateIskurSupportActivity("c1", "p/1", "a/1", activity),
    {
      method: "PUT",
      url: `${POOL}/a%2F1`,
      data: { ...activity, actorId: "c1" },
    },
  ],
  [
    "deletes an activity",
    () => deleteIskurSupportActivity("c1", "p/1", "a/1"),
    { method: "DELETE", url: `${POOL}/a%2F1`, params: { actorId: "c1" } },
  ],
];

describe("İŞKUR task and pool server API", () => {
  beforeEach(() => {
    vi.mocked(backendRequest).mockReset();
  });

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
