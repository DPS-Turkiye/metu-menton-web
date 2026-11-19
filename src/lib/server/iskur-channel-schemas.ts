import { z } from "zod";

import {
  ISKUR_MESSAGE_MAX,
  ISKUR_TITLE_MAX,
  MUTABLE_CHANNEL_KINDS,
} from "@/lib/iskur-channels";

// Any 8-4-4-4-12 id, like Java's UUID and readUuidParam; z.uuid() would refuse ids that are not RFC 4122 versions.
const id = z.guid();

export const iskurChannelsQuerySchema = z.object({ programId: id.optional() });

export const iskurMessagesQuerySchema = z.object({ before: id.optional() });

export const iskurProgramQuerySchema = z.object({ programId: id });

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
  important: z
    .boolean()
    .nullable()
    .default(false)
    .transform((important) => important === true),
});

export const iskurChannelPreferencesSchema = z.object({
  programId: id,
  mutedKinds: z
    .array(z.enum(MUTABLE_CHANNEL_KINDS))
    .max(MUTABLE_CHANNEL_KINDS.length)
    .refine((kinds) => new Set(kinds).size === kinds.length),
});
