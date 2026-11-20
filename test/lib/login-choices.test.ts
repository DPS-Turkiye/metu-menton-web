import { describe, expect, it } from "vitest";

import { Edition } from "@/interfaces/edition";
import { loginChoices } from "@/lib/login-choices";

describe("loginChoices", () => {
  it("gives Teknokent OTG, sign-up and invite codes, never ODTÜ's sign-in", () => {
    expect(loginChoices(Edition.Teknokent, true)).toEqual({
      odtu: false,
      odtuStudents: false,
      otg: true,
      signUp: true,
      invite: true,
    });
  });

  it("gives ODTÜ the student e-mail page, its own sign-in once one is wired, sign-up and no OTG or invites", () => {
    expect(loginChoices(Edition.Odtu, true)).toEqual({
      odtu: true,
      odtuStudents: true,
      otg: false,
      signUp: true,
      invite: false,
    });
    expect(loginChoices(Edition.Odtu, false)).toMatchObject({
      odtu: false,
      odtuStudents: true,
    });
  });
});
