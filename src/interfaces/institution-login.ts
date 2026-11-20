import type { IdentityKind } from "@/interfaces/session";

/** Institutions Menton can sign people in through; the value is the backend's provider id. */
export enum InstitutionProvider {
  Odtu = "odtu",
  /** ODTÜ's own CAS; `Odtu` is the dev persona login that stands in for it locally. */
  OdtuCas = "odtu-cas",
  Otg = "otg",
}

/** The callback parameter that proves a sign-in to the backend: OTG's authorization code, CAS's service ticket. */
export enum InstitutionLoginProof {
  Code = "code",
  Ticket = "ticket",
}

/** The institution logins the backend has switched on, by provider id. */
export type InstitutionLoginProviders = {
  providers: string[];
};

export type InstitutionLoginStart = {
  /** Where the browser goes next: the institution's login, or the dev persona page. */
  redirectUrl: string;
  state: string;
};

export type InstitutionLoginCompletion = {
  customToken: string;
  /** The in-app path the login was started for, if any. */
  next?: string | null;
};

/** A test person of the backend's dev stub. */
export type DevPersona = {
  id: string;
  label: string;
  fullName: string;
  kinds: IdentityKind[];
};
