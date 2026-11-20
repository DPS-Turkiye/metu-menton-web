import { unsealData } from "iron-session";

import {
  institutionLoginCookieName,
  sealInstitutionLogin,
  type PendingInstitutionLogin,
} from "@/lib/server/institution-login-cookie";

/** Long enough for iron-session; stub it as SESSION_PASSWORD in each test (envs are reset after every test). */
export const TEST_SESSION_PASSWORD = "test-only-session-password-that-is-32+";

/** The Cookie header of a browser that started this login. */
export async function startedLoginCookie(pending: PendingInstitutionLogin) {
  return `${institutionLoginCookieName()}=${await sealInstitutionLogin(pending)}`;
}

/** What a response's Set-Cookie put in the binding cookie, unsealed. */
export async function savedLoginIn(response: Response) {
  const cookie = response.headers.get("set-cookie") ?? "";
  const [pair = ""] = cookie.split(";");
  const value = decodeURIComponent(pair.split("=").slice(1).join("="));
  return unsealData<Partial<PendingInstitutionLogin>>(value, {
    password: TEST_SESSION_PASSWORD,
  });
}
