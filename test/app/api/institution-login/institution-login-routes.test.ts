import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as complete } from "@/app/api/institution-login/[provider]/complete/route";
import { POST as start } from "@/app/api/institution-login/[provider]/start/route";
import { GET as devPersonas } from "@/app/api/institution-login/dev-personas/route";
import { GET as providers } from "@/app/api/institution-login/providers/route";
import { InstitutionProvider } from "@/interfaces/institution-login";
import {
  exchangeInstitutionCode,
  fetchDevPersonas,
  fetchInstitutionProviders,
  finishInstitutionCallback,
  startInstitutionLogin,
} from "@/lib/api/institution-login";
import { institutionLoginCookieName } from "@/lib/server/institution-login-cookie";
import {
  savedLoginIn,
  startedLoginCookie,
  TEST_SESSION_PASSWORD,
} from "@test/fixtures/institution-login";
import { backendRefusal } from "@test/fixtures/route-handlers";

vi.mock("@/lib/api/institution-login", () => ({
  startInstitutionLogin: vi.fn(),
  finishInstitutionCallback: vi.fn(),
  exchangeInstitutionCode: vi.fn(),
  fetchDevPersonas: vi.fn(),
  fetchInstitutionProviders: vi.fn(),
}));

const provider = (name: string) => ({
  params: Promise.resolve({ provider: name }),
});

/** The cookie the start route left in the browser that began the login. */
function startedHere(
  state: string,
  provider = InstitutionProvider.Odtu,
  next: string | null = null,
) {
  return startedLoginCookie({ provider, state, next });
}

async function completeRequest(body: unknown, cookie?: string | null) {
  const sent = cookie === undefined ? await startedHere("s-1") : cookie;
  return new NextRequest(
    "http://localhost/api/institution-login/odtu/complete",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: sent ? { cookie: sent } : {},
    },
  );
}

function bindingCookie(response: Response) {
  return response.headers.get("set-cookie") ?? "";
}

describe("institution login routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("SESSION_PASSWORD", TEST_SESSION_PASSWORD);
  });

  it("starts an ODTÜ login and refuses institutions it does not know", async () => {
    vi.mocked(startInstitutionLogin).mockResolvedValue({
      status: 200,
      data: { redirectUrl: "/login/odtu/dev?state=s-1", state: "s-1" },
      headers: {},
    });

    const response = await start(
      new Request("http://localhost"),
      provider("odtu"),
    );
    expect(await response.json()).toEqual({
      redirectUrl: "/login/odtu/dev?state=s-1",
      state: "s-1",
    });
    expect(startInstitutionLogin).toHaveBeenCalledWith(
      InstitutionProvider.Odtu,
    );
    const cookie = bindingCookie(response);
    expect(cookie).toContain(`${institutionLoginCookieName()}=`);
    expect(await savedLoginIn(response)).toEqual({
      provider: "odtu",
      state: "s-1",
      next: null,
    });
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");

    expect(
      (await start(new Request("http://localhost"), provider("boun"))).status,
    ).toBe(404);
  });

  // The one-time code is traded on the server, so the browser only ever sees the custom token.
  it("trades the callback's one-time code for the custom token in one call", async () => {
    vi.mocked(finishInstitutionCallback).mockResolvedValue({
      status: 200,
      data: { code: "code-1" },
      headers: {},
    });
    vi.mocked(exchangeInstitutionCode).mockResolvedValue({
      status: 200,
      data: { customToken: "custom-1" },
      headers: {},
    });

    const response = await complete(
      await completeRequest({
        state: "s-1",
        params: { persona: "dev-ogrenci-1" },
      }),
      provider("odtu"),
    );

    expect(await response.json()).toEqual({
      customToken: "custom-1",
      next: null,
    });
    expect(bindingCookie(response)).toContain(
      `${institutionLoginCookieName()}=;`,
    );
    // Whoever was signed in on this browser before is signed out first.
    expect(bindingCookie(response)).toContain("teknokent_session=;");
    expect(finishInstitutionCallback).toHaveBeenCalledWith(
      InstitutionProvider.Odtu,
      "s-1",
      { persona: "dev-ogrenci-1" },
    );
    expect(exchangeInstitutionCode).toHaveBeenCalledWith("code-1");
  });

  it("passes the backend's refusal through without asking for a token", async () => {
    vi.mocked(finishInstitutionCallback).mockResolvedValue(
      backendRefusal(403, {
        message: "Bu hesap için menton erişimi bulunamadı.",
      }),
    );

    const response = await complete(
      await completeRequest({
        state: "s-1",
        params: { persona: "dev-personel-1" },
      }),
      provider("odtu"),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).message).toBe(
      "Bu hesap için menton erişimi bulunamadı.",
    );
    expect(exchangeInstitutionCode).not.toHaveBeenCalled();
  });

  it("refuses a completion without a state or with non-text parameters", async () => {
    expect(
      (await complete(await completeRequest({ params: {} }), provider("odtu")))
        .status,
    ).toBe(400);
    expect(
      (
        await complete(
          await completeRequest({ state: "s-1", params: { persona: 1 } }),
          provider("odtu"),
        )
      ).status,
    ).toBe(400);
    expect(finishInstitutionCallback).not.toHaveBeenCalled();
  });

  // Login CSRF: a callback link from someone else's login carries a valid state, but this browser never started it.
  it("refuses a completion this browser did not start", async () => {
    for (const cookie of [
      null,
      await startedHere("someone-elses-state"),
      await startedHere("s-1", InstitutionProvider.Otg),
      `${institutionLoginCookieName()}=not-json`,
    ]) {
      const response = await complete(
        await completeRequest(
          { state: "s-1", params: { persona: "p" } },
          cookie,
        ),
        provider("odtu"),
      );
      expect(response.status).toBe(400);
      expect(bindingCookie(response)).toContain(
        `${institutionLoginCookieName()}=;`,
      );
    }
    expect(finishInstitutionCallback).not.toHaveBeenCalled();
  });

  it("forgets the login when the backend cannot be reached", async () => {
    vi.mocked(finishInstitutionCallback).mockRejectedValue(new Error("down"));

    const response = await complete(
      await completeRequest({ state: "s-1", params: { persona: "p" } }),
      provider("odtu"),
    );

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(bindingCookie(response)).toContain(
      `${institutionLoginCookieName()}=;`,
    );
    expect(bindingCookie(response)).not.toContain("teknokent_session");
  });

  it("hands back the in-app path the login was started for, never another site", async () => {
    vi.mocked(finishInstitutionCallback).mockResolvedValue({
      status: 200,
      data: { code: "code-1" },
      headers: {},
    });
    vi.mocked(exchangeInstitutionCode).mockResolvedValue({
      status: 200,
      data: { customToken: "custom-1" },
      headers: {},
    });

    const toProgram = await complete(
      await completeRequest(
        { state: "s-1", params: { code: "c" } },
        await startedHere("s-1", InstitutionProvider.Otg, "/programs/42"),
      ),
      provider("otg"),
    );
    expect((await toProgram.json()).next).toBe("/programs/42");

    const elsewhere = await complete(
      await completeRequest(
        { state: "s-1", params: { code: "c" } },
        await startedHere("s-1", InstitutionProvider.Otg, "/\\evil.example"),
      ),
      provider("otg"),
    );
    expect((await elsewhere.json()).next).toBeNull();
  });

  // Only this server can write the binding: a cookie someone made up, or one edited after sealing, is no login.
  it("refuses a binding cookie this server did not seal", async () => {
    const sealed = await startedHere("s-1");
    const [name, seal = ""] = sealed.split(/=(.*)/s);
    const edited = `${name}=${seal.slice(0, -2)}${seal.endsWith("A") ? "B" : "A"}${seal.slice(-1)}`;
    for (const cookie of [
      `${institutionLoginCookieName()}=${encodeURIComponent(
        JSON.stringify({ provider: "odtu", state: "s-1", next: null }),
      )}`,
      edited,
    ]) {
      const response = await complete(
        await completeRequest(
          { state: "s-1", params: { persona: "p" } },
          cookie,
        ),
        provider("odtu"),
      );
      expect(response.status).toBe(400);
    }
    expect(finishInstitutionCallback).not.toHaveBeenCalled();
  });

  // Over https no other host under a shared parent domain may set it: the __Host- prefix, Secure, the whole path.
  it("binds the login with a __Host- cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(startInstitutionLogin).mockResolvedValue({
      status: 200,
      data: { redirectUrl: "https://cas.example.test/cas/login", state: "s-1" },
      headers: {},
    });

    const response = await start(
      new Request("http://localhost"),
      provider("odtu-cas"),
    );

    const cookie = bindingCookie(response);
    expect(cookie).toMatch(/^__Host-menton_institution_login=/);
    expect(cookie.toLowerCase()).toContain("secure");
    expect(cookie.toLowerCase()).toContain("path=/");
    expect(cookie.toLowerCase()).not.toContain("domain=");
  });

  it("limits how often one address may start a login", async () => {
    vi.mocked(startInstitutionLogin).mockResolvedValue({
      status: 200,
      data: { redirectUrl: "/login/odtu/dev?state=s-1", state: "s-1" },
      headers: {},
    });
    const from = (address: string) =>
      new Request("http://localhost", {
        headers: { "x-forwarded-for": address },
      });
    for (let turn = 0; turn < 120; turn += 1) {
      expect((await start(from("203.0.113.7"), provider("odtu"))).status).toBe(
        200,
      );
    }

    const refused = await start(from("203.0.113.7"), provider("odtu"));
    expect(refused.status).toBe(429);
    expect(
      Number(refused.headers.get("x-rate-limit-retry-after-seconds")),
    ).toBeGreaterThan(0);
    expect(startInstitutionLogin).toHaveBeenCalledTimes(120);
    // Another address keeps its own budget.
    expect((await start(from("203.0.113.8"), provider("odtu"))).status).toBe(
      200,
    );
  });

  it("starts an ODTÜ CAS login and binds it to this browser", async () => {
    vi.mocked(startInstitutionLogin).mockResolvedValue({
      status: 200,
      data: {
        redirectUrl: "https://cas.example.test/cas/login?service=x",
        state: "s-9",
      },
      headers: {},
    });

    const response = await start(
      new Request("http://localhost"),
      provider("odtu-cas"),
    );

    expect(response.status).toBe(200);
    expect(startInstitutionLogin).toHaveBeenCalledWith(
      InstitutionProvider.OdtuCas,
    );
    expect((await savedLoginIn(response)).provider).toBe("odtu-cas");
  });

  // The login page asks this signed out, before it shows the ODTÜ button.
  it("tells a signed-out visitor which institution logins are on", async () => {
    vi.mocked(fetchInstitutionProviders).mockResolvedValue({
      status: 200,
      data: { providers: ["odtu-cas"] },
      headers: {},
    });

    const response = await providers();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ providers: ["odtu-cas"] });
  });

  it("answers with an error, not a guess, when the backend cannot be asked", async () => {
    vi.mocked(fetchInstitutionProviders).mockRejectedValue(new Error("down"));

    const response = await providers();

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await response.json()).not.toHaveProperty("providers");
  });

  it("lists the dev personas only while the dev login is switched on", async () => {
    vi.mocked(fetchDevPersonas).mockResolvedValue({
      status: 200,
      data: [],
      headers: {},
    });

    expect((await devPersonas()).status).toBe(404);
    expect(fetchDevPersonas).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_ODTU_DEV_LOGIN", "true");
    expect((await devPersonas()).status).toBe(200);
  });
});
