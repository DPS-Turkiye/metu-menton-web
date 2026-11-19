import { z } from "zod";

import {
  IskurSkillLevel,
  IskurTeamRolePreference,
} from "@/interfaces/iskur-onboarding";
import { Weekday } from "@/interfaces/mentor";
import {
  ISKUR_ANSWER_MAX,
  ISKUR_SKILL_NAME_MAX,
  ISKUR_TEAM_ROLES_MAX,
  ISKUR_TIME_PATTERN,
  ISKUR_UNIT_SKILLS_MAX,
} from "@/lib/iskur-onboarding";

const time = z.string().regex(ISKUR_TIME_PATTERN);
const answer = z.string().max(ISKUR_ANSWER_MAX).nullable();

// The same limits the backend checks. Every key is required: the screen always sends the whole form, and a body
// missing one would save blanks over the draft. Answers may still be empty: a draft is judged only on submit.
export const iskurOnboardingSchema = z.object({
  weeklyDays: z.number().int().min(1).max(3).nullable(),
  schedule: z
    .array(z.object({ day: z.enum(Weekday), start: time, end: time }))
    .max(28),
  priorIskurDays: z.number().int().min(0).max(140).nullable(),
  unitIds: z.array(z.uuid()).max(20),
  skills: z
    .array(z.object({ skillId: z.uuid(), level: z.enum(IskurSkillLevel) }))
    .max(200),
  teamRoles: z.array(z.enum(IskurTeamRolePreference)).max(ISKUR_TEAM_ROLES_MAX),
  leadership: z.object({
    wants: z.boolean(),
    motivation: answer,
    experience: answer,
    conflict: answer,
  }),
});

export const iskurUnitSkillsSchema = z.object({
  names: z
    .array(z.string().trim().min(1).max(ISKUR_SKILL_NAME_MAX))
    .max(ISKUR_UNIT_SKILLS_MAX),
});
