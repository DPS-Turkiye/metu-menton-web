import { describe, expect, it } from "vitest";

import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import {
  assignableMembers,
  assignInput,
  completeBlock,
  emptyAssignForm,
  isHttpsLink,
  iskurTaskHref,
  isPlanFull,
  linkSavable,
  minutesSavable,
  orderedTasks,
  parseMinutes,
  planPreview,
  stepEstimate,
  taskCount,
  taskForm,
  taskUpdateInput,
} from "@/lib/iskur-tasks";
import { IskurCompleteBlock, type IskurTaskForm } from "@/types/iskur-tasks";
import {
  createIskurTask,
  createIskurTeamMember,
  createIskurTeamTasks,
  LEADER_ID,
  MEMBER_ID,
} from "@test/fixtures/iskur-tasks";

const form = (overrides: Partial<IskurTaskForm> = {}): IskurTaskForm => ({
  actualMinutes: "",
  outputLink: "",
  outputNote: "",
  handoverReason: "",
  ...overrides,
});

describe("İŞKUR task helpers", () => {
  it("steps the estimate by half an hour between one hour and one work day", () => {
    expect(stepEstimate(120, 1)).toBe(150);
    expect(stepEstimate(120, -1)).toBe(90);
    expect(stepEstimate(60, -1)).toBe(60);
    expect(stepEstimate(450, 1)).toBe(450);
  });

  it("offers the leader and their sub-group, and starts the form on the first member", () => {
    const team = createIskurTeamTasks();
    expect(assignableMembers(team).map((member) => member.userId)).toEqual([
      LEADER_ID,
      MEMBER_ID,
    ]);
    expect(assignableMembers(null)).toEqual([]);
    expect(emptyAssignForm(team, "2026-11-19")).toEqual({
      title: "",
      kind: IskurTaskKind.TeamTask,
      assigneeId: MEMBER_ID,
      estimatedMinutes: 120,
      dueDate: "2026-11-19",
      needsOutput: false,
      description: "",
    });
    const onlyLeader = createIskurTeamTasks({
      members: [
        createIskurTeamMember({
          userId: LEADER_ID,
          role: IskurTeamRole.Leader,
        }),
      ],
    });
    expect(emptyAssignForm(onlyLeader, "2026-11-19").assigneeId).toBe(
      LEADER_ID,
    );
    expect(emptyAssignForm(null, "2026-11-19").assigneeId).toBeNull();
  });

  it("builds the task input only with a title and an assignee", () => {
    const base = emptyAssignForm(createIskurTeamTasks(), "2026-11-19");
    expect(assignInput({ ...base, title: "  " })).toBeNull();
    expect(
      assignInput({ ...base, title: "Afiş", assigneeId: null }),
    ).toBeNull();
    expect(
      assignInput({ ...base, title: "  Afiş  ", description: "  A3  " }),
    ).toEqual({
      assigneeId: MEMBER_ID,
      title: "Afiş",
      kind: IskurTaskKind.TeamTask,
      estimatedMinutes: 120,
      dueDate: "2026-11-19",
      needsOutput: false,
      description: "A3",
    });
    expect(assignInput({ ...base, title: "Afiş" })?.description).toBeNull();
  });

  it("previews the assignee's plan against their target", () => {
    const member = createIskurTeamMember({ plannedMinutes: 900 });
    expect(planPreview(member, 60)).toEqual({
      fullName: "Mert Demir",
      before: 900,
      after: 960,
      target: 990,
      over: false,
    });
    expect(planPreview(member, 120)?.over).toBe(true);
    expect(
      planPreview(createIskurTeamMember({ teamMinutes: null }), 600)?.over,
    ).toBe(false);
    expect(planPreview(null, 60)).toBeNull();
    expect(isPlanFull(createIskurTeamMember({ plannedMinutes: 990 }))).toBe(
      true,
    );
    expect(isPlanFull(createIskurTeamMember({ teamMinutes: null }))).toBe(
      false,
    );
  });

  it("reads minutes and https links strictly", () => {
    expect(parseMinutes(" 105 ")).toBe(105);
    expect(parseMinutes("0")).toBeNull();
    expect(parseMinutes("1,5")).toBeNull();
    expect(parseMinutes("")).toBeNull();
    expect(parseMinutes("1350")).toBe(1350);
    expect(parseMinutes("1351")).toBeNull();
    expect(parseMinutes("99999")).toBeNull();
    expect(parseMinutes("007")).toBe(7);
    expect(minutesSavable(form())).toBe(true);
    expect(minutesSavable(form({ actualMinutes: "abc" }))).toBe(false);
    expect(isHttpsLink("https://drive.example.test/a")).toBe(true);
    expect(isHttpsLink("http://drive.example.test/a")).toBe(false);
    expect(isHttpsLink("javascript:alert(1)")).toBe(false);
    expect(linkSavable(form())).toBe(true);
    expect(linkSavable(form({ outputLink: "ftp://x" }))).toBe(false);
  });

  it("fills the detail form from the task and sends a reason only with a handover", () => {
    expect(
      taskForm(
        createIskurTask({ actualMinutes: 90, outputLink: "https://x.test" }),
      ),
    ).toEqual(form({ actualMinutes: "90", outputLink: "https://x.test" }));
    expect(taskForm(createIskurTask())).toEqual(form());
    const filled = form({
      actualMinutes: "90",
      outputLink: " https://x.test ",
      outputNote: " Not ",
      handoverReason: " Veri bekleniyor ",
    });
    expect(taskUpdateInput(filled, IskurTaskStatus.HandedOver)).toEqual({
      status: IskurTaskStatus.HandedOver,
      actualMinutes: 90,
      outputLink: "https://x.test",
      outputNote: "Not",
      handoverReason: "Veri bekleniyor",
    });
    expect(taskUpdateInput(filled, null).handoverReason).toBeNull();
    expect(taskUpdateInput(form(), IskurTaskStatus.Done)).toEqual({
      status: IskurTaskStatus.Done,
      actualMinutes: null,
      outputLink: null,
      outputNote: null,
      handoverReason: null,
    });
  });

  it("says what still stops completing a task", () => {
    const needsOutput = createIskurTask({ needsOutput: true });
    expect(completeBlock(needsOutput, form())).toBe(
      IskurCompleteBlock.ActualMissing,
    );
    expect(
      completeBlock(
        needsOutput,
        form({ actualMinutes: "60", outputLink: "x" }),
      ),
    ).toBe(IskurCompleteBlock.LinkInvalid);
    expect(completeBlock(needsOutput, form({ actualMinutes: "60" }))).toBe(
      IskurCompleteBlock.OutputMissing,
    );
    expect(
      completeBlock(
        needsOutput,
        form({ actualMinutes: "60", outputNote: "ok" }),
      ),
    ).toBeNull();
    expect(
      completeBlock(createIskurTask(), form({ actualMinutes: "60" })),
    ).toBeNull();
    expect(
      completeBlock(
        needsOutput,
        form({ actualMinutes: "60", outputNote: "  " }),
      ),
    ).toBe(IskurCompleteBlock.OutputMissing);
  });

  it("lists open tasks first, then handed over, then done, by due date", () => {
    const tasks = [
      createIskurTask({ id: "done", status: IskurTaskStatus.Done }),
      createIskurTask({ id: "late", dueDate: "2026-11-21" }),
      createIskurTask({ id: "over", status: IskurTaskStatus.HandedOver }),
      createIskurTask({ id: "early", dueDate: "2026-11-18" }),
      createIskurTask({
        id: "early-later",
        dueDate: "2026-11-18",
        createdAt: "2026-11-18T10:00:00Z",
      }),
    ];
    expect(orderedTasks(tasks).map((task) => task.id)).toEqual([
      "early",
      "early-later",
      "late",
      "over",
      "done",
    ]);
  });

  it("counts the week's tasks and links a task", () => {
    expect(taskCount(createIskurTeamTasks())).toBe(1);
    expect(taskCount(null)).toBe(0);
    expect(iskurTaskHref("a/b")).toBe("/student/team/tasks/a%2Fb");
  });
});
