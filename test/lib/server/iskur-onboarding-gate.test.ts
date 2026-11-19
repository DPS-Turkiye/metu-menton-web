import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/interfaces/session";
import { fetchIskurOnboarding } from "@/lib/api/iskur-onboarding";
import {
  ISKUR_ONBOARDING_HREF,
  ISKUR_ONBOARDING_LATER_COOKIE,
} from "@/lib/iskur-onboarding";
import { iskurOnboardingRedirect } from "@/lib/server/iskur-onboarding-gate";
import { getSessionUser } from "@/lib/session";
import {
  completeForm,
  emptyForm,
  onboarding,
} from "@test/fixtures/iskur-onboarding";
import { backendRefusal, backendResponse } from "@test/fixtures/route-handlers";

const cookieNames = new Set<string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({ has: (name: string) => cookieNames.has(name) }),
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-onboarding", () => ({
  fetchIskurOnboarding: vi.fn(),
}));

describe("iskurOnboardingRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieNames.clear();
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "s1",
      email: "mert@example.test",
      fullName: "Mert Demir",
      jobTitle: "",
      role: UserRole.Mentee,
    });
  });

  it("sends an intern with an unsent form to onboarding", async () => {
    vi.mocked(fetchIskurOnboarding).mockResolvedValue(
      backendResponse(onboarding(emptyForm())),
    );
    await expect(iskurOnboardingRedirect()).resolves.toBe(
      ISKUR_ONBOARDING_HREF,
    );
    expect(fetchIskurOnboarding).toHaveBeenCalledWith("s1");
  });

  it("lets an intern who sent the form through", async () => {
    vi.mocked(fetchIskurOnboarding).mockResolvedValue(
      backendResponse(
        onboarding(completeForm({ submittedAt: "2026-11-19T10:00:00Z" })),
      ),
    );
    await expect(iskurOnboardingRedirect()).resolves.toBeNull();
  });

  it("asks nothing of someone who is not an intern, or when the backend fails", async () => {
    vi.mocked(fetchIskurOnboarding).mockResolvedValue(backendRefusal(404));
    await expect(iskurOnboardingRedirect()).resolves.toBeNull();
    vi.mocked(fetchIskurOnboarding).mockRejectedValue(new Error("down"));
    await expect(iskurOnboardingRedirect()).resolves.toBeNull();
  });

  it('waits until the browser closes after "Sonra hatırlat", and needs a session', async () => {
    cookieNames.add(ISKUR_ONBOARDING_LATER_COOKIE);
    await expect(iskurOnboardingRedirect()).resolves.toBeNull();
    cookieNames.clear();
    vi.mocked(getSessionUser).mockResolvedValue(null);
    await expect(iskurOnboardingRedirect()).resolves.toBeNull();
    expect(fetchIskurOnboarding).not.toHaveBeenCalled();
  });
});
