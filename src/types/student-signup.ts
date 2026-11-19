/** Where ODTÜ's student sign-up stands. */
export enum StudentSignupStep {
  /** Checking for a Firebase login left from an earlier, unfinished sign-up. */
  Loading = "loading",
  /** Name, department, year, e-mail and password. */
  Form = "form",
  /** The Firebase login exists; its address is not verified yet. */
  Verify = "verify",
  /** Verified, but the profile is missing (a resumed sign-up) or registering failed; asks only the profile. */
  Profile = "profile",
  Registering = "registering",
}
