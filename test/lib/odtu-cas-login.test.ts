import { describe, expect, it } from "vitest";

import { InstitutionProvider } from "@/interfaces/institution-login";
import { isOdtuCasEnabled, odtuLoginProvider } from "@/lib/odtu-cas-login";

describe("isOdtuCasEnabled", () => {
  it("is on only when the backend names odtu-cas among its logins", () => {
    expect(isOdtuCasEnabled({ providers: ["odtu-cas"] })).toBe(true);
    expect(isOdtuCasEnabled({ providers: ["otg", "odtu-cas"] })).toBe(true);
    expect(isOdtuCasEnabled({ providers: ["odtu", "otg"] })).toBe(false);
    expect(isOdtuCasEnabled({ providers: [] })).toBe(false);
  });

  // An error page, an old backend without the endpoint, a proxy's HTML: none of them switches the button on.
  it("treats an answer of any other shape as off", () => {
    expect(isOdtuCasEnabled(null)).toBe(false);
    expect(isOdtuCasEnabled(undefined)).toBe(false);
    expect(isOdtuCasEnabled("odtu-cas")).toBe(false);
    expect(isOdtuCasEnabled({})).toBe(false);
    expect(isOdtuCasEnabled({ providers: "odtu-cas" })).toBe(false);
    expect(isOdtuCasEnabled({ code: "NOT_FOUND" })).toBe(false);
  });
});

describe("odtuLoginProvider", () => {
  it("starts ODTÜ's CAS when it is on, even next to the dev login", () => {
    expect(odtuLoginProvider(true, false)).toBe(InstitutionProvider.OdtuCas);
    expect(odtuLoginProvider(true, true)).toBe(InstitutionProvider.OdtuCas);
  });

  it("falls back to the dev persona login, and to nothing without either", () => {
    expect(odtuLoginProvider(false, true)).toBe(InstitutionProvider.Odtu);
    expect(odtuLoginProvider(false, false)).toBeNull();
  });
});
