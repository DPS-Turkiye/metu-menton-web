import { describe, expect, it, vi } from "vitest";

import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import {
  createDefaultIskurSupportActivities,
  createIskurSupportActivity,
  deleteIskurSupportActivity,
  getIskurSupportActivities,
  updateIskurSupportActivity,
} from "@/lib/client/iskur-support-activities";
import {
  createIskurTask,
  deleteIskurTask,
  getIskurTask,
  getIskurTaskOutputs,
  getIskurTeamTasks,
  iskurProgramTaskOutputHref,
  iskurTaskOutputHref,
  removeIskurTaskOutput,
  updateIskurTask,
  uploadIskurTaskOutput,
} from "@/lib/client/iskur-tasks";
import { UPLOAD_TIMEOUT_MS } from "@/lib/http-client";
import {
  itSendsEachClientCall,
  type ClientCall,
} from "@test/fixtures/client-calls";

vi.mock("@/lib/http-client", async (original) => ({
  ...(await original<typeof import("@/lib/http-client")>()),
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const task = {
  assigneeId: "m1",
  title: "Afiş",
  kind: IskurTaskKind.Event,
  estimatedMinutes: 90,
  dueDate: "2026-11-20",
  needsOutput: false,
  description: null,
};
const update = {
  status: IskurTaskStatus.Open,
  actualMinutes: null,
  outputLink: null,
  outputNote: null,
  handoverReason: null,
};
const activity = { title: "Açık ofis", description: null, active: true };
const POOL = "/api/coordinator/programs/p%2F1/iskur/support-activities";

const OUTPUTS = "/api/coordinator/programs/p%2F1/iskur/task-outputs";
const file = new File(["%PDF-1.4"], "rapor.pdf", { type: "application/pdf" });

const calls: ClientCall[] = [
  {
    title: "uploadIskurTaskOutput sends the file to its task",
    call: () => uploadIskurTaskOutput("t/1", file),
    method: "post",
    args: [
      "/api/iskur/tasks/t%2F1/outputs",
      expect.any(FormData),
      { timeout: UPLOAD_TIMEOUT_MS },
    ],
  },
  {
    title: "removeIskurTaskOutput takes a file back",
    call: () => removeIskurTaskOutput("t/1", "o/1"),
    method: "delete",
    args: ["/api/iskur/tasks/t%2F1/outputs/o%2F1"],
  },
  {
    title: "getIskurTaskOutputs lists a program's files",
    call: () => getIskurTaskOutputs("p/1"),
    method: "get",
    args: [OUTPUTS],
  },
  {
    title: "getIskurTeamTasks reads this week",
    call: () => getIskurTeamTasks(null),
    method: "get",
    args: ["/api/iskur/team/tasks"],
  },
  {
    title: "getIskurTeamTasks reads another week",
    call: () => getIskurTeamTasks("2026-11-23"),
    method: "get",
    args: ["/api/iskur/team/tasks?weekStart=2026-11-23"],
  },
  {
    title: "createIskurTask assigns a task",
    call: () => createIskurTask(task),
    method: "post",
    args: ["/api/iskur/team/tasks", task],
  },
  {
    title: "getIskurTask reads a task",
    call: () => getIskurTask("t/1"),
    method: "get",
    args: ["/api/iskur/tasks/t%2F1"],
  },
  {
    title: "updateIskurTask saves a task",
    call: () => updateIskurTask("t/1", update),
    method: "patch",
    args: ["/api/iskur/tasks/t%2F1", update],
  },
  {
    title: "deleteIskurTask deletes a task",
    call: () => deleteIskurTask("t/1"),
    method: "delete",
    args: ["/api/iskur/tasks/t%2F1"],
  },
  {
    title: "getIskurSupportActivities reads the pool",
    call: () => getIskurSupportActivities("p/1"),
    method: "get",
    args: [POOL],
  },
  {
    title: "createDefaultIskurSupportActivities seeds the pool",
    call: () => createDefaultIskurSupportActivities("p/1"),
    method: "post",
    args: [`${POOL}/default`],
  },
  {
    title: "createIskurSupportActivity adds an activity",
    call: () => createIskurSupportActivity("p/1", activity),
    method: "post",
    args: [POOL, activity],
  },
  {
    title: "updateIskurSupportActivity changes an activity",
    call: () => updateIskurSupportActivity("p/1", "a/1", activity),
    method: "put",
    args: [`${POOL}/a%2F1`, activity],
  },
  {
    title: "deleteIskurSupportActivity removes an activity",
    call: () => deleteIskurSupportActivity("p/1", "a/1"),
    method: "delete",
    args: [`${POOL}/a%2F1`],
  },
];

describe("İŞKUR task and pool client calls", () => {
  itSendsEachClientCall(calls);
});

describe("İŞKUR task output links", () => {
  it("point at this app's own routes, never at storage", () => {
    expect(iskurTaskOutputHref("t/1", "o/1")).toBe(
      "/api/iskur/tasks/t%2F1/outputs/o%2F1",
    );
    expect(iskurProgramTaskOutputHref("p/1", "t/1", "o/1")).toBe(
      `${OUTPUTS}/t%2F1/o%2F1`,
    );
  });
});
