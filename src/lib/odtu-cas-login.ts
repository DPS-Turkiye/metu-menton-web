import { InstitutionProvider } from "@/interfaces/institution-login";

/**
 * Where ODTÜ's CAS sends the browser back, with ?state= and ?ticket=. The backend's CAS_SERVICE_URL is this path
 * on the deployment's own address, and ODTÜ registers it, so it must not change.
 */
export const ODTU_CAS_CALLBACK_PATH = "/login/odtu/callback";

/** Whether the backend says ODTÜ's CAS login is switched on; an answer of any other shape means it is not. */
export function isOdtuCasEnabled(answer: unknown): boolean {
  return (
    typeof answer === "object" &&
    answer !== null &&
    "providers" in answer &&
    Array.isArray(answer.providers) &&
    answer.providers.includes(InstitutionProvider.OdtuCas)
  );
}

/**
 * Which login the ODTÜ button starts: the real one when it is on, else the local dev persona login, else none.
 */
export function odtuLoginProvider(
  casEnabled: boolean,
  devLoginEnabled: boolean,
): InstitutionProvider | null {
  if (casEnabled) return InstitutionProvider.OdtuCas;
  return devLoginEnabled ? InstitutionProvider.Odtu : null;
}
