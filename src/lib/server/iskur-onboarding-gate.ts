import { cookies } from "next/headers";
import "server-only";

import { fetchIskurOnboarding } from "@/lib/api/iskur-onboarding";
import {
  ISKUR_ONBOARDING_HREF,
  ISKUR_ONBOARDING_LATER_COOKIE,
} from "@/lib/iskur-onboarding";
import { getSessionUser } from "@/lib/session";

const OK = 200;

/**
 * Where a student page sends a new İŞKUR intern instead: the onboarding form, until they submit it. Only interns of a
 * program whose İŞKUR units exist are asked (the backend answers 404 for anyone else). "Sonra hatırlat" lets them in
 * for the rest of the browser session. A backend that cannot answer never locks anyone out of their pages.
 */
export async function iskurOnboardingRedirect(): Promise<string | null> {
  const session = await getSessionUser();
  if (!session) return null;
  if ((await cookies()).has(ISKUR_ONBOARDING_LATER_COOKIE)) return null;
  const response = await fetchIskurOnboarding(session.userId).catch(() => null);
  if (response?.status !== OK) return null;
  return response.data.form.submittedAt === null ? ISKUR_ONBOARDING_HREF : null;
}
