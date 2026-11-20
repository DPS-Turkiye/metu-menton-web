"use client";

import { useState } from "react";

import { useOdtuLoginProvider } from "@/hooks/use-odtu-login-provider";
import { assignLocation } from "@/lib/assign-location";
import { startInstitutionLogin } from "@/lib/client/institution-login";
import { describeAuthError } from "@/lib/firebase/auth";

/**
 * The "ODTÜ Hesabıyla Giriş Yap" button: ODTÜ's CAS when the backend has it on, the dev persona login when that
 * stands in for it locally, and no button otherwise.
 */
export function useInstitutionLogin() {
  const provider = useOdtuLoginProvider();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function startOdtuLogin() {
    if (!provider) return;
    setError("");
    setStarting(true);
    try {
      const { redirectUrl } = await startInstitutionLogin(provider);
      assignLocation(redirectUrl);
    } catch (caught) {
      setError(describeAuthError(caught));
      setStarting(false);
    }
  }

  return {
    available: provider !== null,
    starting,
    error,
    startOdtuLogin,
  };
}
