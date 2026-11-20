import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OdtuLoginButton } from "@/components/login/odtu-login-button";
import { assignLocation } from "@/lib/assign-location";
import {
  fetchInstitutionProviders,
  startInstitutionLogin,
} from "@/lib/client/institution-login";
import { InLocale } from "@test/test-utils";

vi.mock("@/lib/assign-location", () => ({
  assignLocation: vi.fn(),
}));

vi.mock("@/lib/client/institution-login", () => ({
  fetchInstitutionProviders: vi.fn(),
  startInstitutionLogin: vi.fn(),
}));

const LABEL = "ODTÜ Hesabıyla Giriş Yap";

function renderButton() {
  return render(
    <InLocale locale="tr">
      <OdtuLoginButton />
    </InLocale>,
  );
}

/** Lets the backend's answer (or its failure) reach the hook before the page is looked at. */
async function answered() {
  await act(async () => {
    await Promise.resolve();
  });
  expect(fetchInstitutionProviders).toHaveBeenCalledTimes(1);
}

describe("ODTÜ login button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchInstitutionProviders).mockResolvedValue({ providers: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Until ODTÜ's CAS is switched on at the backend, nobody outside local development sees the button.
  it("stays hidden while the backend has no ODTÜ login on and the dev login is off", async () => {
    renderButton();

    await answered();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("stays hidden when the backend cannot say which logins are on", async () => {
    vi.mocked(fetchInstitutionProviders).mockRejectedValue(new Error("down"));
    renderButton();

    await answered();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("appears once the backend says CAS is on, and sends the browser to ODTÜ's CAS", async () => {
    vi.mocked(fetchInstitutionProviders).mockResolvedValue({
      providers: ["odtu-cas"],
    });
    vi.mocked(startInstitutionLogin).mockResolvedValue({
      redirectUrl:
        "https://cas.example.test/cas/login?service=https%3A%2F%2Fmenton.example.test%2Flogin%2Fodtu%2Fcallback%3Fstate%3Ds-1",
      state: "s-1",
    });
    const user = userEvent.setup();
    renderButton();

    await user.click(await screen.findByRole("button", { name: LABEL }));

    expect(startInstitutionLogin).toHaveBeenCalledWith("odtu-cas");
    expect(assignLocation).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/cas\.example\.test\/cas\/login\?/),
    );
  });

  it("starts the dev persona login while that stands in for ODTÜ's", async () => {
    vi.stubEnv("NEXT_PUBLIC_ODTU_DEV_LOGIN", "true");
    vi.mocked(startInstitutionLogin).mockResolvedValue({
      redirectUrl: "/login/odtu/dev?state=s-1",
      state: "s-1",
    });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: LABEL }));

    expect(startInstitutionLogin).toHaveBeenCalledWith("odtu");
    expect(assignLocation).toHaveBeenCalledWith("/login/odtu/dev?state=s-1");
  });

  it("says so when the login cannot be started, and can be tried again", async () => {
    vi.stubEnv("NEXT_PUBLIC_ODTU_DEV_LOGIN", "true");
    vi.mocked(startInstitutionLogin).mockRejectedValue(
      new Error("ODTÜ ile giriş şu an tamamlanamadı."),
    );
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: LABEL }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ODTÜ ile giriş şu an tamamlanamadı.",
    );
    expect(screen.getByRole("button", { name: LABEL })).toBeEnabled();
    expect(assignLocation).not.toHaveBeenCalled();
  });
});
