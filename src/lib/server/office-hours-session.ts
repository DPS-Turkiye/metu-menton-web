import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import "server-only";

import type {
  OfficeHoursSessionData,
  OfficeHoursSessionUser,
} from "@/interfaces/office-hours";
import { SessionRequiredError } from "@/lib/server/session-error";

export const OFFICE_HOURS_COOKIE = "menton_office_hours";
const OFFICE_HOURS_MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * Office hours are signed into by the LTI launch from Moodle, not Firebase, so they keep their own cookie,
 * apart from the Menton session: it opens the office-hours pages and nothing else. Moodle opens the tool in a new
 * window (the app refuses to be framed), so the cookie only has to travel on our own requests and on the launch's
 * redirect, a top-level GET: SameSite=Lax covers both and keeps other sites' requests from carrying it. The launch
 * POST itself needs no cookie; its state and nonce are checked by the backend.
 */
function officeHoursSessionOptions(): SessionOptions {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error("SESSION_PASSWORD must contain at least 32 characters.");
  }
  const production = process.env.NODE_ENV === "production";
  return {
    cookieName: OFFICE_HOURS_COOKIE,
    password,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: OFFICE_HOURS_MAX_AGE_SECONDS,
    },
  };
}

async function officeHoursSession() {
  return getIronSession<OfficeHoursSessionData>(
    await cookies(),
    officeHoursSessionOptions(),
  );
}

export async function saveOfficeHoursUser(user: OfficeHoursSessionUser) {
  const session = await officeHoursSession();
  session.user = user;
  session.issuedAt = Date.now();
  await session.save();
}

/** For routes: no office-hours session throws, so apiErrorResponse answers 401 the way Menton routes do. */
export async function requireOfficeHoursUser() {
  const user = await getOfficeHoursUser();
  if (!user) throw new SessionRequiredError();
  return user;
}

export async function getOfficeHoursUser(
  now = Date.now(),
): Promise<OfficeHoursSessionUser | null> {
  const session = await officeHoursSession();
  if (!session.user || typeof session.issuedAt !== "number") return null;
  const age = now - session.issuedAt;
  return age > -60_000 && age < OFFICE_HOURS_MAX_AGE_SECONDS * 1000
    ? session.user
    : null;
}
