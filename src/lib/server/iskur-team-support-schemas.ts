import { z } from "zod";

import { ISKUR_TEAM_SUPPORT_TEXT_MAX } from "@/lib/iskur-team-support";

export const iskurTeamSupportOpenSchema = z.object({
  toTeamId: z.uuid(),
  taskId: z.uuid().nullable().default(null),
  need: z.string().trim().min(1).max(ISKUR_TEAM_SUPPORT_TEXT_MAX),
});

// The note is optional; a blank one goes as null.
export const iskurTeamSupportAnswerSchema = z.object({
  note: z
    .string()
    .trim()
    .max(ISKUR_TEAM_SUPPORT_TEXT_MAX)
    .nullable()
    .default(null)
    .transform((note) => (note ? note : null)),
});
