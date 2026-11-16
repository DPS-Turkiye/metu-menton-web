import "server-only";
import { z } from "zod";

import { APPOINTMENT_STATUS_FILTERS } from "@/lib/program-office-hours";

const PAGE_SIZE_LIMIT = 100;
const PAGE_LIMIT = 10_000;
/** The backend accepts a range of at most 62 days, both ends included. */
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;
const wholeNumber = z.string().regex(/^\d+$/).transform(Number);

/**
 * Randevular's query. A day range needs both ends, in order, at most 62 days apart; page and size must be written as whole numbers, so an empty
 * or mistyped value is refused rather than read as 0.
 */
export const programOfficeHoursQuerySchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUS_FILTERS).optional(),
    faculty: z.string().trim().min(1).max(200).optional(),
    search: z.string().trim().max(100).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: wholeNumber.pipe(z.number().max(PAGE_LIMIT)).optional(),
    size: wholeNumber.pipe(z.number().min(1).max(PAGE_SIZE_LIMIT)).optional(),
  })
  .refine((query) => (query.from === undefined) === (query.to === undefined), {
    path: ["to"],
  })
  .refine(
    (query) => {
      if (query.from === undefined || query.to === undefined) return true;
      const days = (Date.parse(query.to) - Date.parse(query.from)) / DAY_MS;
      return days >= 0 && days < MAX_RANGE_DAYS;
    },
    { path: ["to"] },
  );
