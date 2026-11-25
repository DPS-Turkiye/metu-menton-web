import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as deleteActivity,
  PUT as updateActivity,
} from "@/app/api/coordinator/programs/[id]/iskur/support-activities/[activityId]/route";
import { POST as seedPool } from "@/app/api/coordinator/programs/[id]/iskur/support-activities/default/route";
import {
  POST as addActivity,
  GET as listPool,
} from "@/app/api/coordinator/programs/[id]/iskur/support-activities/route";
import {
  DELETE as deleteTask,
  PATCH as patchTask,
  PUT as putTask,
  GET as readTask,
} from "@/app/api/iskur/tasks/[taskId]/route";
import {
  POST as assign,
  GET as teamTasks,
} from "@/app/api/iskur/team/tasks/route";
import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { UserRole, type AppSession } from "@/interfaces/session";
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
  editIskurTask,
  fetchIskurTask,
  fetchIskurTeamTasks,
  updateIskurTask,
} from "@/lib/api/iskur-tasks";
import { getSessionUser } from "@/lib/session";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-tasks", () => ({
  createIskurTask: vi.fn(),
  deleteIskurTask: vi.fn(),
  editIskurTask: vi.fn(),
  fetchIskurTask: vi.fn(),
  fetchIskurTeamTasks: vi.fn(),
  updateIskurTask: vi.fn(),
}));
vi.mock("@/lib/api/iskur-support-activities", () => ({
  createDefaultIskurSupportActivities: vi.fn(),
  createIskurSupportActivity: vi.fn(),
  deleteIskurSupportActivity: vi.fn(),
  fetchIskurSupportActivities: vi.fn(),
  updateIskurSupportActivity: vi.fn(),
}));

const taskCalls = [
  createIskurTask,
  deleteIskurTask,
  editIskurTask,
  fetchIskurTask,
  fetchIskurTeamTasks,
  updateIskurTask,
] as const;
const poolCalls = [
  createDefaultIskurSupportActivities,
  createIskurSupportActivity,
  deleteIskurSupportActivity,
  fetchIskurSupportActivities,
  updateIskurSupportActivity,
] as const;

const TASK = "00000000-0000-4000-8000-0000000000b1";
const PROGRAM = "00000000-0000-4000-8000-0000000000c1";
const ACTIVITY = "00000000-0000-4000-8000-0000000000d1";
const MEMBER = "00000000-0000-4000-8000-0000000000a2";
const task = { params: Promise.resolve({ taskId: TASK }) };
const program = { params: Promise.resolve({ id: PROGRAM }) };
const activity = {
  params: Promise.resolve({ id: PROGRAM, activityId: ACTIVITY }),
};
const validTask = {
  assigneeId: MEMBER,
  title: "Afiş",
  kind: IskurTaskKind.Event,
  estimatedMinutes: 90,
  dueDate: "2026-11-20",
  needsOutput: true,
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

describe("İŞKUR task routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(taskCalls, backendResponse({}));
    answerEachWith(poolCalls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
  });

  it("needs a session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const refused = [
      await teamTasks(new NextRequest("http://x/api/iskur/team/tasks")),
      await assign(json(validTask)),
      await readTask(new Request("http://x"), task),
      await patchTask(json({}, "PATCH"), task),
      await putTask(json(validTask, "PUT"), task),
      await deleteTask(new Request("http://x"), task),
    ];
    expect(refused.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401,
    ]);
    for (const call of taskCalls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and ignores a forged actor", async () => {
    await teamTasks(
      new NextRequest("http://x/api/iskur/team/tasks?weekStart=2026-11-23"),
    );
    expect(fetchIskurTeamTasks).toHaveBeenCalledWith("MENTEE-1", "2026-11-23");
    await teamTasks(new NextRequest("http://x/api/iskur/team/tasks"));
    expect(fetchIskurTeamTasks).toHaveBeenLastCalledWith("MENTEE-1", null);

    await assign(json({ ...validTask, actorId: "someone-else" }));
    expect(createIskurTask).toHaveBeenCalledWith("MENTEE-1", {
      ...validTask,
      title: "Afiş",
      description: null,
    });

    await patchTask(
      json(
        { status: IskurTaskStatus.Done, actualMinutes: 90, actorId: "x" },
        "PATCH",
      ),
      task,
    );
    expect(updateIskurTask).toHaveBeenCalledWith("MENTEE-1", TASK, {
      status: IskurTaskStatus.Done,
      actualMinutes: 90,
      outputLink: null,
      outputNote: null,
      handoverReason: null,
    });
    await putTask(json({ ...validTask, actorId: "x" }, "PUT"), task);
    expect(editIskurTask).toHaveBeenCalledWith("MENTEE-1", TASK, {
      ...validTask,
      description: null,
    });
    await readTask(new Request("http://x"), task);
    expect(fetchIskurTask).toHaveBeenCalledWith("MENTEE-1", TASK);
    await deleteTask(new Request("http://x"), task);
    expect(deleteIskurTask).toHaveBeenCalledWith("MENTEE-1", TASK);
  });

  it("takes the limits the backend takes, and blank text as null", async () => {
    await assign(
      json({ ...validTask, estimatedMinutes: 60, description: "  " }),
    );
    await assign(
      json({ ...validTask, estimatedMinutes: 450, title: "x".repeat(200) }),
    );
    expect(createIskurTask).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(createIskurTask).mock.calls[0]?.[1].description,
    ).toBeNull();
    await patchTask(
      json({ actualMinutes: 1350, outputNote: " " }, "PATCH"),
      task,
    );
    expect(vi.mocked(updateIskurTask).mock.calls[0]?.[2]).toMatchObject({
      actualMinutes: 1350,
      outputNote: null,
    });
  });

  // The task routes take any signed-in role: the backend decides from the caller's İŞKUR placement.
  it("refuses a bad week, a bad task id and an invalid body before the backend", async () => {
    const answers = [
      await teamTasks(
        new NextRequest("http://x/api/iskur/team/tasks?weekStart=2026-02-30"),
      ),
      await readTask(new Request("http://x"), {
        params: Promise.resolve({ taskId: ".." }),
      }),
      await putTask(json({ ...validTask, estimatedMinutes: 75 }, "PUT"), task),
      await putTask(json(validTask, "PUT"), {
        params: Promise.resolve({ taskId: ".." }),
      }),
      await assign(json({ ...validTask, estimatedMinutes: 75 })),
      await assign(json({ ...validTask, estimatedMinutes: 30 })),
      await assign(json({ ...validTask, title: "  " })),
      await assign(json({ ...validTask, estimatedMinutes: 480 })),
      await assign(json({ ...validTask, title: "x".repeat(201) })),
      await assign(json({ ...validTask, description: "x".repeat(1001) })),
      await patchTask(json({ actualMinutes: 0 }, "PATCH"), task),
      await patchTask(json({ actualMinutes: 1351 }, "PATCH"), task),
      await patchTask(json({ handoverReason: "x".repeat(501) }, "PATCH"), task),
      await patchTask(
        json({ outputLink: "javascript:alert(1)" }, "PATCH"),
        task,
      ),
      await patchTask(json({ outputLink: "http://x.test" }, "PATCH"), task),
      await deleteTask(new Request("http://x"), {
        params: Promise.resolve({ taskId: "../x" }),
      }),
    ];
    expect(answers.map((response) => response.status)).toEqual(
      answers.map(() => 400),
    );
    for (const call of taskCalls) expect(call).not.toHaveBeenCalled();
  });
});

describe("İŞKUR support-activity routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(poolCalls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
  });

  it("keeps the pool to coordinators and the admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
    const refused = [
      await listPool(new Request("http://x"), program),
      await seedPool(new Request("http://x"), program),
      await addActivity(json({ title: "Açık ofis" }), program),
      await updateActivity(json({ title: "Açık ofis" }, "PUT"), activity),
      await deleteActivity(new Request("http://x"), activity),
    ];
    expect(refused.map((response) => response.status)).toEqual(
      refused.map(() => 403),
    );
    for (const call of poolCalls) expect(call).not.toHaveBeenCalled();
  });

  it("passes the coordinator's changes through as the session user", async () => {
    await listPool(new Request("http://x"), program);
    expect(fetchIskurSupportActivities).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );
    await seedPool(new Request("http://x"), program);
    expect(createDefaultIskurSupportActivities).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );
    await addActivity(json({ title: " Açık ofis ", actorId: "x" }), program);
    expect(createIskurSupportActivity).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      {
        title: "Açık ofis",
        description: null,
        active: null,
      },
    );
    await updateActivity(
      json({ title: "Vaka", active: false }, "PUT"),
      activity,
    );
    expect(updateIskurSupportActivity).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      ACTIVITY,
      {
        title: "Vaka",
        description: null,
        active: false,
      },
    );
    await deleteActivity(new Request("http://x"), activity);
    expect(deleteIskurSupportActivity).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      ACTIVITY,
    );
  });

  it("refuses ids that are not uuids and an empty title", async () => {
    const dots = {
      params: Promise.resolve({ id: "..", activityId: ACTIVITY }),
    };
    const answers = [
      await listPool(new Request("http://x"), {
        params: Promise.resolve({ id: ".." }),
      }),
      await seedPool(new Request("http://x"), {
        params: Promise.resolve({ id: "../x" }),
      }),
      await updateActivity(json({ title: "Vaka" }, "PUT"), dots),
      await deleteActivity(new Request("http://x"), {
        params: Promise.resolve({ id: PROGRAM, activityId: ".." }),
      }),
      await addActivity(json({ title: " " }), program),
    ];
    expect(answers.map((response) => response.status)).toEqual(
      answers.map(() => 400),
    );
    for (const call of poolCalls) expect(call).not.toHaveBeenCalled();
  });
});
