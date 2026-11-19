import "server-only";
import { z } from "zod";

import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import {
  ISKUR_NOTE_MAX,
  ISKUR_SUPPORT_TITLE_MAX,
  ISKUR_TASK_DESCRIPTION_MAX,
  ISKUR_TASK_MAX_MINUTES,
  ISKUR_TASK_MIN_MINUTES,
  ISKUR_TASK_STEP_MINUTES,
  ISKUR_TASK_TITLE_MAX,
} from "@/lib/iskur-tasks";

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().default(null);

/** "Görev ata" (2.1): one hour to one work day, in half-hour steps, as the backend checks too. */
export const iskurTaskSchema = z.object({
  assigneeId: z.uuid(),
  title: z.string().trim().min(1).max(ISKUR_TASK_TITLE_MAX),
  kind: z.enum(IskurTaskKind),
  estimatedMinutes: z
    .number()
    .int()
    .min(ISKUR_TASK_MIN_MINUTES)
    .max(ISKUR_TASK_MAX_MINUTES)
    .multipleOf(ISKUR_TASK_STEP_MINUTES),
  dueDate: z.iso.date(),
  needsOutput: z.boolean().default(false),
  description: optionalText(ISKUR_TASK_DESCRIPTION_MAX),
});

// The output link is checked for https by the backend as well; this stops a javascript: link before it leaves.
export const iskurTaskUpdateSchema = z.object({
  status: z.enum(IskurTaskStatus).nullable().default(null),
  actualMinutes: z.number().int().min(1).max(1350).nullable().default(null),
  outputLink: z
    .string()
    .trim()
    .max(ISKUR_NOTE_MAX)
    .regex(/^https:\/\/\S+$/)
    .nullable()
    .default(null),
  outputNote: optionalText(ISKUR_NOTE_MAX),
  handoverReason: optionalText(ISKUR_NOTE_MAX),
});

export const iskurWeekQuerySchema = z.object({
  weekStart: z.iso.date().optional(),
});

export const iskurSupportActivitySchema = z.object({
  title: z.string().trim().min(1).max(ISKUR_SUPPORT_TITLE_MAX),
  description: optionalText(ISKUR_NOTE_MAX),
  active: z.boolean().nullable().default(null),
});
