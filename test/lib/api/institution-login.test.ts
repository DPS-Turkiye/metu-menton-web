import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InstitutionProvider } from "@/interfaces/institution-login";
import {
  exchangeInstitutionCode,
  fetchDevPersonas,
  fetchInstitutionProviders,
  finishInstitutionCallback,
  startInstitutionLogin,
} from "@/lib/api/institution-login";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({
  backendRequest: vi.fn(),
}));

type RequestCase = [
  description: string,
  call: () => Promise<unknown>,
  request: AxiosRequestConfig,
];

const cases: RequestCase[] = [
  [
    "starts the login under the provider's path",
    () => startInstitutionLogin(InstitutionProvider.Odtu),
    { method: "POST", url: "/api/auth/institution/odtu/start" },
  ],
  [
    "hands the provider's callback state and parameters on",
    () =>
      finishInstitutionCallback(InstitutionProvider.Odtu, "state-1", {
        code: "abc",
      }),
    {
      method: "POST",
      url: "/api/auth/institution/odtu/callback",
      data: { state: "state-1", params: { code: "abc" } },
    },
  ],
  [
    "exchanges the one-time code",
    () => exchangeInstitutionCode("code-1"),
    {
      method: "POST",
      url: "/api/auth/institution/exchange",
      data: { code: "code-1" },
    },
  ],
  [
    "lists the provider's dev personas",
    () => fetchDevPersonas(InstitutionProvider.Odtu),
    { method: "GET", url: "/api/auth/institution/odtu/dev-personas" },
  ],
  [
    "asks which institution logins are on",
    () => fetchInstitutionProviders(),
    { method: "GET", url: "/api/auth/institution/providers" },
  ],
  [
    "starts ODTÜ's CAS under its own provider path",
    () => startInstitutionLogin(InstitutionProvider.OdtuCas),
    { method: "POST", url: "/api/auth/institution/odtu-cas/start" },
  ],
];

describe("institution login server API", () => {
  beforeEach(() => {
    vi.mocked(backendRequest).mockReset();
  });

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
