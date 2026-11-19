import type { IskurTaskKind } from "@/interfaces/iskur-tasks";

/** UI-only shapes for Ekibim and "Görev detayı"; none of these cross the API. */

export enum IskurTeamTab {
  Tasks = "tasks",
  Members = "members",
}

export interface IskurAssignForm {
  title: string;
  kind: IskurTaskKind;
  assigneeId: string | null;
  estimatedMinutes: number;
  /** "yyyy-mm-dd". */
  dueDate: string;
  needsOutput: boolean;
  description: string;
}

export interface IskurPlanPreview {
  fullName: string;
  before: number;
  after: number;
  target: number | null;
  over: boolean;
}

/** Text inputs of "Görev detayı"; minutes stay a string while typed. */
export interface IskurTaskForm {
  actualMinutes: string;
  outputLink: string;
  outputNote: string;
  handoverReason: string;
}

export interface IskurSupportForm {
  /** null adds a new activity. */
  id: string | null;
  title: string;
  description: string;
  active: boolean;
}

/** What still stops "Görevi tamamla". */
export enum IskurCompleteBlock {
  ActualMissing = "actualMissing",
  LinkInvalid = "linkInvalid",
  OutputMissing = "outputMissing",
}
