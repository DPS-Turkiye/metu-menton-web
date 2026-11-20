import type { Edition } from "@/interfaces/edition";
import { offersLogin } from "@/lib/edition-screens";
import { LoginOption } from "@/types/edition-screens";

export type LoginChoices = {
  /** ODTÜ's institutional login button (until ODTÜ's real login exists, only the local dev persona login). */
  odtu: boolean;
  /** The ODTÜ page: students sign in with their @metu.edu.tr address and password, the form always open. */
  odtuStudents: boolean;
  otg: boolean;
  signUp: boolean;
  invite: boolean;
};

/**
 * Which ways in /login shows. The ODTÜ button also needs a working institution login behind it: ODTÜ's CAS once
 * the backend has it on, or the local dev persona login; without either the page falls back to e-mail only.
 */
export function loginChoices(
  edition: Edition,
  odtuLoginReady: boolean,
): LoginChoices {
  return {
    odtu: odtuLoginReady && offersLogin(edition, LoginOption.Odtu),
    odtuStudents: offersLogin(edition, LoginOption.Odtu),
    otg: offersLogin(edition, LoginOption.Otg),
    signUp: offersLogin(edition, LoginOption.SignUp),
    invite: offersLogin(edition, LoginOption.Invite),
  };
}
