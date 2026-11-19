"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/components/providers/session-provider";
import type { InstitutionProvider } from "@/interfaces/institution-login";
import { accountNotReadyHref } from "@/lib/account-not-ready";
import { completeInstitutionLogin } from "@/lib/client/institution-login";
import {
  describeAuthError,
  signInWithInstitutionToken,
  signOutOfFirebase,
} from "@/lib/firebase/auth";
import { safeNextPath } from "@/lib/public-paths";

/** What the institution sent back: the state, and the one value that proves the sign-in (a code, a ticket). */
export type InstitutionCallback = {
  state: string;
  proofName: string;
  proof: string;
};

/**
 * Finishes an institution sign-in on its callback page. The proof is traded on the server (which also checks this
 * browser started the login); the browser signs in to Firebase with the custom token, then opens the session.
 * Someone the institution knows but Menton doesn't yet lands in the ordinary sign-up, already signed in. A null
 * callback means the redirect itself was unusable, and nothing is sent.
 */
export function useInstitutionCallback(
  provider: InstitutionProvider,
  callback: InstitutionCallback | null,
) {
  const router = useRouter();
  const { login } = useSession();
  const [error, setError] = useState("");
  // The state and the proof are single use; a second run (StrictMode, a re-render) would only fail.
  const started = useRef(false);
  const state = callback?.state;
  const proofName = callback?.proofName;
  const proof = callback?.proof;

  useEffect(() => {
    if (started.current || !state || !proofName || !proof) return;
    started.current = true;
    void (async () => {
      let idToken: string | null = null;
      // From here the old Menton session is gone, so no earlier Firebase login may linger either.
      let exchanged = false;
      try {
        const { customToken, next } = await completeInstitutionLogin(
          provider,
          state,
          { [proofName]: proof },
        );
        exchanged = true;
        idToken = await signInWithInstitutionToken(customToken);
        await login(idToken);
        router.replace(safeNextPath(next ?? null) ?? "/workspace");
      } catch (caught) {
        const href = await accountNotReadyHref(caught, idToken);
        if (href) {
          router.replace(href);
          return;
        }
        // Otherwise a refused login would stay signed in to Firebase, and /signup would pick it up.
        if (exchanged) await signOutOfFirebase().catch(() => undefined);
        setError(describeAuthError(caught));
      }
    })();
  }, [login, proof, proofName, provider, router, state]);

  return { error };
}
