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
const answer = z.string().max(ISKUR_ANSWER_MAX).nullable().default(null);

// The same limits the backend checks; completeness is the backend's to judge on submit, so a draft may be partial.
export const iskurOnboardingSchema = z.object({
  weeklyDays: z.number().int().min(1).max(3).nullable().default(null),
  schedule: z
    .array(z.object({ day: z.enum(Weekday), start: time, end: time }))
    .max(28)
    .default([]),
  priorIskurDays: z.number().int().min(0).max(140).nullable().default(null),
  unitIds: z.array(z.uuid()).max(20).default([]),
  skills: z
    .array(z.object({ skillId: z.uuid(), level: z.enum(IskurSkillLevel) }))
    .max(200)
    .default([]),
  teamRoles: z
    .array(z.enum(IskurTeamRolePreference))
    .max(ISKUR_TEAM_ROLES_MAX)
    .default([]),
  leadership: z
    .object({
      wants: z.boolean(),
      motivation: answer,
      experience: answer,
      conflict: answer,
    })
    .default({
      wants: false,
      motivation: null,
      experience: null,
      conflict: null,
    }),
});

export const iskurUnitSkillsSchema = z.object({
  names: z
    .array(z.string().trim().min(1).max(ISKUR_SKILL_NAME_MAX))
    .max(ISKUR_UNIT_SKILLS_MAX),
});
