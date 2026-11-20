import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OdtuCasCallbackView } from "@/components/login/odtu-cas-callback-view";
import { ClientApiError } from "@/lib/client/api";
import { completeInstitutionLogin } from "@/lib/client/institution-login";
import { fetchOnboardingDraft } from "@/lib/client/onboarding-draft";
import { REGISTRATION_REQUIRED } from "@/lib/const";
import {
  signInWithInstitutionToken,
  signOutOfFirebase,
} from "@/lib/firebase/auth";
import { InLocale } from "@test/test-utils";

const replace = vi.fn();
const login = vi.fn();
let searchParams = new URLSearchParams("state=s-1&ticket=ST-1-cas");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => ({ login }),
}));
vi.mock("@/lib/client/institution-login", () => ({
  completeInstitutionLogin: vi.fn(),
}));
vi.mock("@/lib/client/onboarding-draft", () => ({
  fetchOnboardingDraft: vi.fn(),
}));
vi.mock("@/lib/firebase/auth", () => ({
  signInWithInstitutionToken: vi.fn(),
  signOutOfFirebase: vi.fn(),
  describeAuthError: (error: unknown) =>
    error instanceof Error ? error.message : "Kimlik doğrulama tamamlanamadı.",
}));

function renderCallback() {
  return render(
    <InLocale locale="tr">
      <OdtuCasCallbackView />
    </InLocale>,
  );
}

describe("ODTÜ CAS callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("state=s-1&ticket=ST-1-cas");
    vi.mocked(completeInstitutionLogin).mockResolvedValue({
      customToken: "custom-1",
      next: null,
    });
    vi.mocked(signInWithInstitutionToken).mockResolvedValue("id-token-1");
    vi.mocked(fetchOnboardingDraft).mockResolvedValue(null);
    vi.mocked(signOutOfFirebase).mockResolvedValue();
    login.mockResolvedValue({});
  });

  // StrictMode runs the effect twice; the ticket and the state are good once.
  it("hands the ticket to the server once and opens the session", async () => {
    render(
      <StrictMode>
        <InLocale locale="tr">
          <OdtuCasCallbackView />
        </InLocale>
      </StrictMode>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "ODTÜ hesabınla giriş yapılıyor…",
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace"));
    expect(completeInstitutionLogin).toHaveBeenCalledTimes(1);
    expect(completeInstitutionLogin).toHaveBeenCalledWith("odtu-cas", "s-1", {
      ticket: "ST-1-cas",
    });
    expect(signInWithInstitutionToken).toHaveBeenCalledWith("custom-1");
    expect(login).toHaveBeenCalledWith("id-token-1");
  });

  // The spent ticket must not stay in the address bar or the history, on success or failure alike.
  it("clears the ticket from the URL on arrival and still hands it to the server", async () => {
    window.history.replaceState(
      null,
      "",
      "/login/odtu/callback?state=s-1&ticket=ST-1-cas",
    );
    vi.mocked(completeInstitutionLogin).mockRejectedValue(
      new Error("ODTÜ girişi doğrulanamadı. Lütfen yeniden giriş yap."),
    );
    renderCallback();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ODTÜ girişi doğrulanamadı.",
    );
    expect(window.location.pathname).toBe("/login/odtu/callback");
    expect(window.location.search).toBe("");
    expect(completeInstitutionLogin).toHaveBeenCalledWith("odtu-cas", "s-1", {
      ticket: "ST-1-cas",
    });
  });

  it("goes on to the in-app page the login was started for", async () => {
    vi.mocked(completeInstitutionLogin).mockResolvedValue({
      customToken: "custom-1",
      next: "/student/mentors",
    });
    renderCallback();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/student/mentors"),
    );
  });

  it.each(["ticket=ST-1-cas", "state=s-1", ""])(
    "asks nothing of the server when the redirect is incomplete (%s)",
    (query) => {
      searchParams = new URLSearchParams(query);
      renderCallback();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "ODTÜ ile giriş tamamlanamadı. Lütfen yeniden dene.",
      );
      expect(
        screen.getByRole("link", { name: "Giriş sayfasına dön" }),
      ).toHaveAttribute("href", "/login");
      expect(completeInstitutionLogin).not.toHaveBeenCalled();
    },
  );

  it("shows the server's refusal and signs nobody in", async () => {
    vi.mocked(completeInstitutionLogin).mockRejectedValue(
      new Error("ODTÜ girişi doğrulanamadı. Lütfen yeniden giriş yap."),
    );
    renderCallback();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ODTÜ girişi doğrulanamadı. Lütfen yeniden giriş yap.",
    );
    expect(signInWithInstitutionToken).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  // Someone CAS knows who is neither a student nor an academic: signed in to Firebase, no Menton account yet.
  it("sends someone without a Menton account on to the ordinary sign-up", async () => {
    login.mockRejectedValue(
      new ClientApiError("Kayıt gerekli.", 401, REGISTRATION_REQUIRED),
    );
    renderCallback();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/signup?resume=1"),
    );
    expect(signOutOfFirebase).not.toHaveBeenCalled();
  });

  it("signs out of Firebase when the session cannot be opened", async () => {
    login.mockRejectedValue(new Error("Oturum açılamadı."));
    renderCallback();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Oturum açılamadı.",
    );
    expect(signOutOfFirebase).toHaveBeenCalled();
  });
});
