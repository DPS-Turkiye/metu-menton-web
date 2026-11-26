import { z } from "zod";

import { ISKUR_TEAM_CHANGE_TEXT_MAX } from "@/lib/iskur-team-change";

const text = z.string().trim().min(1).max(ISKUR_TEAM_CHANGE_TEXT_MAX);

export const iskurTeamChangeAskSchema = z.object({ reason: text });

export const iskurTeamChangeDeclineSchema = z.object({ note: text });
