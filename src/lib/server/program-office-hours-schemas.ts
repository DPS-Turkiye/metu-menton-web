import "server-only";
import { z } from "zod";

import { APPOINTMENT_STATUS_FILTERS } from "@/lib/program-office-hours";

const PAGE_SIZE_LIMIT = 100;
const wholeNumber = z.string().regex(/^\d+$/).transform(Number);

/**
 * Randevular's query. A day range needs both ends; page and size must be written as whole numbers, so an empty
 * or mistyped value is refused rather than read as 0.
 */
export const programOfficeHoursQuerySchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUS_FILTERS).optional(),
    faculty: z.string().trim().min(1).max(200).optional(),
    search: z.string().trim().max(100).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: wholeNumber.optional(),
    size: wholeNumber.pipe(z.number().min(1).max(PAGE_SIZE_LIMIT)).optional(),
  })
  .refine((query) => (query.from === undefined) === (query.to === undefined), {
    path: ["to"],
  });
