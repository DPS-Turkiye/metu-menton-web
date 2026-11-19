import { z } from "zod";

import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { ISKUR_NAME_MAX } from "@/lib/iskur-workspace";

const name = z.string().trim().min(1).max(ISKUR_NAME_MAX);
const idOrNull = z.uuid().nullable().default(null);

export const iskurUnitSchema = z.object({ name, coordinatorId: idOrNull });

export const iskurTeamSchema = z.object({ name });

// Mentoring time needs the work days and comes in half-hour steps, as the backend checks too.
export const iskurPlacementSchema = z
  .object({
    teamId: z.uuid(),
    role: z.enum(IskurTeamRole),
    leaderId: idOrNull,
    weeklyDays: z.number().int().min(1).max(3).nullable().default(null),
    mentoringMinutes: z
      .number()
      .int()
      .min(0)
      .max(1350)
      .multipleOf(30)
      .nullable()
      .default(null),
  })
  .refine((body) => body.mentoringMinutes == null || body.weeklyDays != null, {
    path: ["weeklyDays"],
  });

// No body finalizes the whole program.
export const iskurFinalizeSchema = z
  .object({ teamId: idOrNull, unitId: idOrNull })
  .default({ teamId: null, unitId: null });
