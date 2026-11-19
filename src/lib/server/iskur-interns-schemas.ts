import { z } from "zod";

import {
  ISKUR_INTERN_EMAIL_MAX,
  ISKUR_INTERN_PASTE_MAX,
} from "@/lib/iskur-interns";

// The format of each address is the backend's to check: it answers with the entries it could not read.
export const iskurInternEmailsSchema = z.object({
  emails: z
    .array(z.string().max(ISKUR_INTERN_EMAIL_MAX))
    .min(1)
    .max(ISKUR_INTERN_PASTE_MAX),
});
