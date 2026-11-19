import "server-only";
import { z } from "zod";

import {
  IskurWeekDecision,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import { ISKUR_NOTE_MAX } from "@/lib/iskur-tasks";
import {
  ISKUR_DAY_MINUTES,
  ISKUR_ENTRY_TITLE_MAX,
  ISKUR_WEEK_ENTRIES_MAX,
} from "@/lib/iskur-weeks";

const blankAsNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .default(null)
    .transform((value) => value || null);
const minutes = z.number().int().min(1).max(ISKUR_DAY_MINUTES);
// Any 8-4-4-4-12 id, as the path guard takes: seeded ids are not always version-4 uuids.
const id = z.guid();

/** The whole draft of a week; the backend checks the dates, tasks and the pool. */
export const iskurWeekEntriesSchema = z.object({
  entries: z
    .array(
      z
        .object({
          date: z.iso.date(),
          kind: z.enum(IskurWorkEntryKind),
          taskId: id.nullable().default(null),
          supportActivityId: id.nullable().default(null),
          title: blankAsNull(ISKUR_ENTRY_TITLE_MAX),
          minutes,
          output: blankAsNull(ISKUR_NOTE_MAX),
          note: blankAsNull(ISKUR_NOTE_MAX),
        })
        // A support line is the pool's activity and its minutes, never free text (the leader sees it); a team line
        // has no activity.
        .transform((line) =>
          line.kind === IskurWorkEntryKind.SupportActivity
            ? { ...line, taskId: null, title: null, output: null, note: null }
            : { ...line, supportActivityId: null },
        )
        .refine(
          (line) =>
            line.kind !== IskurWorkEntryKind.SupportActivity ||
            line.supportActivityId != null,
          { path: ["supportActivityId"] },
        ),
    )
    .max(ISKUR_WEEK_ENTRIES_MAX),
});

export const iskurSupportEntrySchema = z.object({
  activityId: id,
  date: z.iso.date(),
  minutes,
});

export const iskurObjectionSchema = z.object({
  objection: z.string().trim().min(1).max(ISKUR_NOTE_MAX),
});

export const iskurWeekDecisionSchema = z
  .object({
    decision: z.enum(IskurWeekDecision),
    timeMatchesWork: z.boolean().default(false),
    effortDocumented: z.boolean().default(false),
    outputsSufficient: z.boolean().default(false),
    reason: blankAsNull(ISKUR_NOTE_MAX),
  })
  .refine(
    (body) =>
      body.decision === IskurWeekDecision.Approve || body.reason != null,
    { path: ["reason"] },
  );
