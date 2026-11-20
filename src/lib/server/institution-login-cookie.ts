import { timingSafeEqual } from "node:crypto";
import { sealData, unsealData } from "iron-session";
import type { NextRequest, NextResponse } from "next/server";
import "server-only";

import type { InstitutionProvider } from "@/interfaces/institution-login";
import { safeNextPath, SESSION_COOKIE } from "@/lib/public-paths";
import { sessionPassword } from "@/lib/server/session-password";

/**
 * Binds an institution login to the browser that started it. The backend's state proves the callback belongs
 * to a login it started, but not to this browser: without the cookie, a callback link from someone else's
 * login would sign the visitor into that person's account (login CSRF).
 *
 * The cookie is sealed, so its provider, state and landing page are only ever what this server wrote. Over https it
 * is also a __Host- cookie: the browser takes it only from this exact host, so no other host under a shared parent
 * domain (ODTÜ's metu.edu.tr) can plant one with the state of its own login. Plain http, on a developer's machine,
 * cannot carry the prefix.
 */
const COOKIE = "menton_institution_login";

// As long as the backend keeps the state.
const MAX_AGE_SECONDS = 10 * 60;

export type PendingInstitutionLogin = {
  provider: InstitutionProvider;
  state: string;
  next: string | null;
};

function secureCookies() {
  return process.env.NODE_ENV === "production";
}

export function institutionLoginCookieName() {
  return secureCookies() ? `__Host-${COOKIE}` : COOKIE;
}

/** The sealed value the binding cookie holds; exported so tests can play a browser that started a login. */
export function sealInstitutionLogin(pending: PendingInstitutionLogin) {
  return sealData(pending, {
    password: sessionPassword(),
    ttl: MAX_AGE_SECONDS,
  });
}

export async function rememberInstitutionLogin(
  response: NextResponse,
  pending: PendingInstitutionLogin,
) {
  response.cookies.set(
    institutionLoginCookieName(),
    await sealInstitutionLogin(pending),
    {
      httpOnly: true,
      secure: secureCookies(),
      // Lax: the browser comes back from the institution with a top-level GET.
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  );
  return response;
}

export function forgetInstitutionLogin(response: NextResponse) {
  // A __Host- cookie is only replaced by one set the same way: Secure, for the whole path.
  response.cookies.set(institutionLoginCookieName(), "", {
    httpOnly: true,
    secure: secureCookies(),
    path: "/",
    maxAge: 0,
  });
  return response;
}

/** Drops the Menton session cookie, so the sign-in that follows starts from nobody. */
export function endSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The login this browser started for {@code provider} with {@code state}; null when it started none. A seal that
 * was tampered with, made with another key or is older than the state unseals to nothing.
 */
export async function pendingInstitutionLogin(
  request: NextRequest,
  provider: InstitutionProvider,
  state: string,
): Promise<PendingInstitutionLogin | null> {
  const raw = request.cookies.get(institutionLoginCookieName())?.value;
  if (!raw) return null;
  const saved = await unsealData<Partial<PendingInstitutionLogin>>(raw, {
    password: sessionPassword(),
    ttl: MAX_AGE_SECONDS,
  });
  if (
    saved.provider !== provider ||
    typeof saved.state !== "string" ||
    !sameText(saved.state, state)
  ) {
    return null;
  }
  return {
    provider,
    state: saved.state,
    next: safeNextPath(typeof saved.next === "string" ? saved.next : null),
  };
}
