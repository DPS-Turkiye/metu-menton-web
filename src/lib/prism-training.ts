import { TrainingState } from "@/interfaces/training";

/** What the student's training page shows in one Prism state: its message keys and whether "tamamladım" is offered. */
export type PrismStep = {
  title: "prismTodoTitle" | "prismPendingTitle" | "prismRetakeTitle";
  body: "prismTodoBody" | "prismPendingBody" | "prismRetakeBody";
  canMarkDone: boolean;
  retake: boolean;
};

const PRISM_STEPS: Partial<Record<TrainingState, PrismStep>> = {
  [TrainingState.PrismTodo]: {
    title: "prismTodoTitle",
    body: "prismTodoBody",
    canMarkDone: true,
    retake: false,
  },
  [TrainingState.PrismPending]: {
    title: "prismPendingTitle",
    body: "prismPendingBody",
    canMarkDone: false,
    retake: false,
  },
  [TrainingState.PrismRetake]: {
    title: "prismRetakeTitle",
    body: "prismRetakeBody",
    canMarkDone: true,
    retake: true,
  },
};

/** The Prism step for a training state; null outside the Prism states. */
export function prismStepOf(state: TrainingState): PrismStep | null {
  return PRISM_STEPS[state] ?? null;
}
