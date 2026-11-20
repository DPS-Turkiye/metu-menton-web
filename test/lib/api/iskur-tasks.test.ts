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
  fetchIskurProgramTaskOutputContent,
  fetchIskurTask,
  fetchIskurTaskOutputContent,
  fetchIskurTaskOutputs,
  fetchIskurTeamTasks,
  removeIskurTaskOutput,
  updateIskurTask,
  uploadIskurTaskOutput,
} from "@/lib/api/iskur-tasks";
import { UPLOAD_TIMEOUT_MS } from "@/lib/http-client";
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

const upload = new FormData();
const OUTPUTS = "/api/coordinator/programs/p%2F1/iskur/task-outputs";
const fileRequest = {
  method: "GET",
  responseType: "arraybuffer",
  headers: { Accept: "*/*" },
  timeout: UPLOAD_TIMEOUT_MS,
} as const;

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "hands in a file under the session user",
    () => uploadIskurTaskOutput("u1", "t/1", upload),
    {
      method: "POST",
      url: "/api/iskur/tasks/t%2F1/outputs",
      params: { actorId: "u1" },
      data: upload,
      timeout: UPLOAD_TIMEOUT_MS,
    },
  ],
  [
    "takes a handed-in file back",
    () => removeIskurTaskOutput("u1", "t/1", "o/1"),
    {
      method: "DELETE",
      url: "/api/iskur/tasks/t%2F1/outputs/o%2F1",
      params: { actorId: "u1" },
    },
  ],
  [
    "reads a handed-in file as bytes",
    () => fetchIskurTaskOutputContent("u1", "t/1", "o/1"),
    {
      ...fileRequest,
      url: "/api/iskur/tasks/t%2F1/outputs/o%2F1",
      params: { actorId: "u1" },
    },
  ],
  [
    "lists a program's handed-in files",
    () => fetchIskurTaskOutputs("c1", "p/1"),
    { method: "GET", url: OUTPUTS, params: { actorId: "c1" } },
  ],
  [
    "reads a program's handed-in file as bytes",
    () => fetchIskurProgramTaskOutputContent("c1", "p/1", "t/1", "o/1"),
    {
      ...fileRequest,
      url: `${OUTPUTS}/t%2F1/o%2F1`,
      params: { actorId: "c1" },
    },
  ],
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
