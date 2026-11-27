import { z } from "zod";

import { IskurAssessmentReason } from "@/interfaces/iskur-assessment-statement";
import { ISKUR_ASSESSMENT_TEXT_MAX } from "@/lib/iskur-assessment-statement";

export const iskurAssessmentStatementSchema = z.object({
  reason: z.enum(IskurAssessmentReason),
  text: z.string().trim().min(1).max(ISKUR_ASSESSMENT_TEXT_MAX),
});
