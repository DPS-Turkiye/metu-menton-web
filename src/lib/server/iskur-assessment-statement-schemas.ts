import { z } from "zod";

import {
  IskurAssessmentReason,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import {
  ISKUR_ASSESSMENT_NOTE_MAX,
  ISKUR_ASSESSMENT_TEXT_MAX,
} from "@/lib/iskur-assessment-statement";
import {
  ISKUR_MINUTES_PER_DAY,
  ISKUR_WEEKLY_DAYS,
} from "@/lib/iskur-workspace";

export const iskurAssessmentStatementSchema = z.object({
  reason: z.enum(IskurAssessmentReason),
  text: z.string().trim().min(1).max(ISKUR_ASSESSMENT_TEXT_MAX),
});

/** The backend checks the step and the week; this only keeps the shape and the bounds. */
export const iskurAssessmentDecisionSchema = z.object({
  mentoring: z.enum(IskurMentoringDecision),
  mentoringMinutes: z
    .number()
    .int()
    .min(0)
    .max(Math.max(...ISKUR_WEEKLY_DAYS) * ISKUR_MINUTES_PER_DAY)
    .nullable(),
  openRetake: z.boolean(),
  // A blank note is no note.
  note: z
    .string()
    .trim()
    .max(ISKUR_ASSESSMENT_NOTE_MAX)
    .nullable()
    .transform((note) => note || null),
});
