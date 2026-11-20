"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useInstitutionCallback } from "@/hooks/use-institution-callback";
import {
  InstitutionLoginProof,
  InstitutionProvider,
} from "@/interfaces/institution-login";

const ACCESS_DENIED = "access_denied";

/**
 * Where OTG sends the browser back. Someone OTG knows but Menton doesn't yet lands in the ordinary signup, already
 * signed in, so onboarding, invite codes and coordinator approval run as for everyone else.
 */
export function useOtgCallback() {
  const copy = useTranslations("otgLogin");
  const params = useSearchParams();

  // Read once: useInstitutionCallback clears the query from the URL, and the values must outlive it.
  const [{ code, state, otgError }] = useState(() => ({
    code: params.get(InstitutionLoginProof.Code),
    state: params.get("state"),
    otgError: params.get("error"),
  }));
  // What OTG's redirect alone says went wrong ("Vazgeç" on its consent screen is access_denied).
  const callbackError = otgError
    ? copy(otgError === ACCESS_DENIED ? "cancelled" : "failed")
    : !code || !state
      ? copy("failed")
      : "";
  const { error } = useInstitutionCallback(
    InstitutionProvider.Otg,
    callbackError || !code || !state
      ? null
      : { state, proofName: InstitutionLoginProof.Code, proof: code },
  );

  return { error: callbackError || error };
}
