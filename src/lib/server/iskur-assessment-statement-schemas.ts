import { z } from "zod";

import {
  IskurAssessmentReason,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import {
  ISKUR_ASSESSMENT_NOTE_MAX,
  ISKUR_ASSESSMENT_TEXT_MAX,
} from "@/lib/iskur-assessment-statement";
import { ISKUR_MINUTES_PER_DAY } from "@/lib/iskur-workspace";

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
    .max(3 * ISKUR_MINUTES_PER_DAY)
    .nullable(),
  openRetake: z.boolean(),
  note: z.string().trim().max(ISKUR_ASSESSMENT_NOTE_MAX).nullable(),
});
