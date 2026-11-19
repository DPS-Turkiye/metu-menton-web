import { z } from "zod";

import { IskurChannelKind } from "@/interfaces/iskur-channels";
import {
  ISKUR_MESSAGE_MAX,
  ISKUR_TITLE_MAX,
  isMutableKind,
  MUTABLE_CHANNEL_KINDS,
} from "@/lib/iskur-channels";

const optionalUuid = z.uuid().optional();

export const iskurChannelsQuerySchema = z.object({ programId: optionalUuid });

export const iskurMessagesQuerySchema = z.object({ before: optionalUuid });

export const iskurProgramQuerySchema = z.object({ programId: z.uuid() });

// The backend allows a title and the important mark only to coordinators in Genel Duyurular; it decides that.
export const iskurMessageSchema = z.object({
  body: z.string().trim().min(1).max(ISKUR_MESSAGE_MAX),
  title: z
    .string()
    .trim()
    .max(ISKUR_TITLE_MAX)
    .nullable()
    .default(null)
    .transform((title) => (title ? title : null)),
  important: z.boolean().default(false),
});

export const iskurChannelPreferencesSchema = z.object({
  programId: z.uuid(),
  mutedKinds: z
    .array(z.enum(IskurChannelKind))
    .max(MUTABLE_CHANNEL_KINDS.length)
    .refine((kinds) => kinds.every(isMutableKind)),
});
