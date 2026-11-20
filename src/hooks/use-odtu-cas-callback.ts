"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useInstitutionCallback } from "@/hooks/use-institution-callback";
import {
  InstitutionLoginProof,
  InstitutionProvider,
} from "@/interfaces/institution-login";

/**
 * Where ODTÜ's CAS sends the browser back, with the state we put in the service address and its one-time ticket.
 * The backend checks the ticket with CAS; nothing here is trusted.
 */
export function useOdtuCasCallback() {
  const copy = useTranslations("odtuCasLogin");
  const params = useSearchParams();

  // Read once: useInstitutionCallback clears the query from the URL, and the values must outlive it.
  const [{ ticket, state }] = useState(() => ({
    ticket: params.get(InstitutionLoginProof.Ticket),
    state: params.get("state"),
  }));
  // Without both, the redirect did not come from a login this browser started; nothing is sent.
  const callback =
    ticket && state
      ? { state, proofName: InstitutionLoginProof.Ticket, proof: ticket }
      : null;
  const { error } = useInstitutionCallback(
    InstitutionProvider.OdtuCas,
    callback,
  );

  return { error: callback ? error : copy("failed") };
}
