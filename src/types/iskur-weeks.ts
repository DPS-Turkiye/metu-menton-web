import type {
  IskurWeekDecision,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import type { Keyed } from "@/lib/keyed-list";

/** UI-only shapes for Bu Haftam, Çalışma kaydı and the leader's review; none of these cross the API. */

/** One log line while it is edited; minutes stay a string while typed. */
export type IskurEntryDraft = Keyed<{
  date: string;
  kind: IskurWorkEntryKind;
  taskId: string | null;
  supportActivityId: string | null;
  title: string;
  minutes: string;
  output: string;
  note: string;
}>;

/** Why a log line cannot be saved yet. */
export enum IskurLineProblem {
  Minutes = "minutes",
  Title = "title",
  Activity = "activity",
}

export enum IskurLineKind {
  Support = "support",
  Task = "task",
  Team = "team",
}

export enum IskurTodoKind {
  Task = "task",
  Reports = "reports",
  Support = "support",
}

/** A line of Bu Haftam's "Yapılacaklar". */
export type IskurTodo =
  | {
      kind: IskurTodoKind.Task;
      taskId: string;
      title: string;
      dueDate: string;
      needsOutput: boolean;
    }
  | { kind: IskurTodoKind.Reports; count: number }
  | { kind: IskurTodoKind.Support };

export interface IskurDecisionForm {
  decision: IskurWeekDecision | null;
  timeMatchesWork: boolean;
  effortDocumented: boolean;
  outputsSufficient: boolean;
  reason: string;
}
