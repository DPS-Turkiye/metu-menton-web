"use client";

import { useEffect, useState } from "react";

import { fetchInstitutionProviders } from "@/lib/client/institution-login";
import { isOdtuDevLoginEnabled } from "@/lib/const";
import { isOdtuCasEnabled, odtuLoginProvider } from "@/lib/odtu-cas-login";

/**
 * The login behind the ODTÜ button, or null when there is none. ODTÜ's CAS is on only when the backend says so, so
 * the button stays hidden until it answers, and when it cannot be reached.
 */
export function useOdtuLoginProvider() {
  const [casEnabled, setCasEnabled] = useState(false);

  useEffect(() => {
    let current = true;
    fetchInstitutionProviders()
      .then((answer) => {
        if (current) setCasEnabled(isOdtuCasEnabled(answer));
      })
      // Not knowing is the same as off: e-mail sign-in is still on the page.
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  return odtuLoginProvider(casEnabled, isOdtuDevLoginEnabled());
}
