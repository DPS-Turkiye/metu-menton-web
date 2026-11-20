"use client";

import { useOdtuLoginProvider } from "@/hooks/use-odtu-login-provider";
import type { Edition } from "@/interfaces/edition";
import { loginChoices } from "@/lib/login-choices";

/** The sign-in choices of this deployment's /login. */
export function useLoginChoices(edition: Edition) {
  return loginChoices(edition, useOdtuLoginProvider() !== null);
}
