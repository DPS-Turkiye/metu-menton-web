import type {
  IskurWeekDecision,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import type { PeerTopicCategory } from "@/interfaces/peer-mentoring";
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
  Request = "request",
  MissingDay = "missingDay",
  Revision = "revision",
  Submit = "submit",
}

/** A line of the İŞKUR home's "Bugün yapman gerekenler". */
export type IskurTodo =
  | {
      kind: IskurTodoKind.Task;
      taskId: string;
      title: string;
      dueDate: string;
      needsOutput: boolean;
    }
  | { kind: IskurTodoKind.Reports; count: number }
  | { kind: IskurTodoKind.Support }
  | {
      kind: IskurTodoKind.Request;
      requestId: string;
      menteeName: string;
      category: PeerTopicCategory;
      createdAt: string;
    }
  /** A past work day of this week with nothing logged; `plannedMinutes` comes from the intern's schedule. */
  | {
      kind: IskurTodoKind.MissingDay;
      weekStart: string;
      date: string;
      plannedMinutes: number;
    }
  /** A week sent back by the leader; `previous` when it is last week's. */
  | {
      kind: IskurTodoKind.Revision;
      weekStart: string;
      previous: boolean;
      reason: string | null;
    }
  /** A week ready to send that is not sent yet. */
  | { kind: IskurTodoKind.Submit; weekStart: string; previous: boolean };

export interface IskurDecisionForm {
  decision: IskurWeekDecision | null;
  timeMatchesWork: boolean;
  effortDocumented: boolean;
  outputsSufficient: boolean;
  reason: string;
}
