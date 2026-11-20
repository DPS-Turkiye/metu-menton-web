import { describe, expect, it } from "vitest";

import { TrainingState } from "@/interfaces/training";
import { prismStepOf } from "@/lib/prism-training";

describe("prismStepOf", () => {
  it("offers 'tamamladım' while the training is to do or to retake, never while waiting", () => {
    expect(prismStepOf(TrainingState.PrismTodo)).toMatchObject({
      title: "prismTodoTitle",
      canMarkDone: true,
      retake: false,
    });
    expect(prismStepOf(TrainingState.PrismRetake)).toMatchObject({
      title: "prismRetakeTitle",
      canMarkDone: true,
      retake: true,
    });
    expect(prismStepOf(TrainingState.PrismPending)).toMatchObject({
      title: "prismPendingTitle",
      canMarkDone: false,
    });
  });

  it("is null outside the Prism states", () => {
    for (const state of [
      TrainingState.Video,
      TrainingState.Quiz,
      TrainingState.BadgeActive,
      TrainingState.Blocked,
      TrainingState.NotAvailable,
      TrainingState.InternsOnly,
    ]) {
      expect(prismStepOf(state)).toBeNull();
    }
  });
});
