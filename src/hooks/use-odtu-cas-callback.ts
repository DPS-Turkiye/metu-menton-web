"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { useInstitutionCallback } from "@/hooks/use-institution-callback";
import { InstitutionProvider } from "@/interfaces/institution-login";

/**
 * Where ODTÜ's CAS sends the browser back, with the state we put in the service address and its one-time ticket.
 * The backend checks the ticket with CAS; nothing here is trusted.
 */
export function useOdtuCasCallback() {
  const copy = useTranslations("odtuCasLogin");
  const params = useSearchParams();

  const ticket = params.get("ticket");
  const state = params.get("state");
  const callbackError = !ticket || !state ? copy("failed") : "";
  const { error } = useInstitutionCallback(
    InstitutionProvider.OdtuCas,
    !ticket || !state ? null : { state, proofName: "ticket", proof: ticket },
  );

  return { error: callbackError || error };
}
