import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudentSignupFlow } from "@/components/signup/student-signup-flow";
import { StudentYear } from "@/interfaces/student-signup";
import { ClientApiError } from "@/lib/client/api";
import { registerStudent } from "@/lib/client/auth";
import {
  ACCOUNT_ALREADY_REGISTERED,
  EMAIL_ALREADY_REGISTERED,
} from "@/lib/const";
import {
  createFirebaseAccount,
  currentFirebaseAccount,
  currentIdToken,
  reloadAndCheckEmailVerified,
} from "@/lib/firebase/auth";
import { backendUser } from "@test/fixtures/session";

const push = vi.fn();
const login = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => ({ login }),
}));

vi.mock("@/lib/client/auth", () => ({
  registerStudent: vi.fn(),
}));

vi.mock("@/lib/firebase/auth", () => ({
  createFirebaseAccount: vi.fn(),
  currentFirebaseAccount: vi.fn(),
  currentIdToken: vi.fn(),
  reloadAndCheckEmailVerified: vi.fn(),
  resendVerificationEmail: vi.fn(),
  describeAuthError: (error: unknown) =>
    error instanceof Error ? error.message : "Kimlik doğrulama tamamlanamadı.",
}));

const PASSWORD = "Guclu-Sifre1";

async function fillProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Ad/), "Deniz");
  await user.type(screen.getByLabelText(/^Soyad/), "Kaya");
  await user.type(screen.getByLabelText(/^Bölüm/), "Fizik");
  await user.selectOptions(screen.getByLabelText(/^Sınıf/), "3. sınıf");
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  email = "deniz@metu.edu.tr",
) {
  await fillProfile(user);
  await user.type(screen.getByLabelText(/^E-posta/), email);
  await user.type(screen.getByLabelText(/^Şifre \*/), PASSWORD);
  await user.type(screen.getByLabelText(/^Şifre tekrar/), PASSWORD);
}

async function verifyAndContinue(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: "Maili doğruladım, devam et" }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  vi.mocked(createFirebaseAccount).mockResolvedValue("new-token");
  vi.mocked(currentIdToken).mockResolvedValue("verified-token");
  vi.mocked(reloadAndCheckEmailVerified).mockResolvedValue(true);
  vi.mocked(registerStudent).mockResolvedValue(backendUser());
  login.mockResolvedValue({});
});

describe("ODTÜ student sign-up", () => {
  it("creates the login, waits for the verified address, then registers and signs the student in", async () => {
    const user = userEvent.setup();
    render(<StudentSignupFlow />);

    expect(
      screen.getByRole("heading", { name: "ODTÜ öğrenci kaydı" }),
    ).toBeInTheDocument();
    await fillForm(user, " deniz@metu.edu.tr ");
    await user.click(screen.getByRole("button", { name: "Kayıt ol" }));

    expect(createFirebaseAccount).toHaveBeenCalledWith(
      " deniz@metu.edu.tr ",
      PASSWORD,
    );
    expect(
      await screen.findByRole("heading", { name: "E-postanı doğrula" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/deniz@metu.edu.tr/)).toBeInTheDocument();
    expect(registerStudent).not.toHaveBeenCalled();

    await verifyAndContinue(user);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/workspace"));
    expect(registerStudent).toHaveBeenCalledWith(
      {
        firstName: "Deniz",
        lastName: "Kaya",
        department: "Fizik",
        year: StudentYear.Year3,
      },
      "verified-token",
    );
    expect(login).toHaveBeenCalledWith("verified-token");
  });

  it("asks for an ODTÜ address before anything is sent", async () => {
    const user = userEvent.setup();
    render(<StudentSignupFlow />);

    await fillForm(user, "deniz@example.test");

    expect(screen.getByRole("alert")).toHaveTextContent("@metu.edu.tr");
    expect(screen.getByRole("button", { name: "Kayıt ol" })).toBeDisabled();
    expect(createFirebaseAccount).not.toHaveBeenCalled();
  });

  it("shows Firebase's refusal and stays on the form", async () => {
    vi.mocked(createFirebaseAccount).mockRejectedValue(
      new Error("Bu e-posta adresi zaten kullanılıyor."),
    );
    const user = userEvent.setup();
    render(<StudentSignupFlow />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Kayıt ol" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bu e-posta adresi zaten kullanılıyor.",
    );
    expect(screen.getByLabelText(/^E-posta/)).toBeInTheDocument();
  });

  it.each([ACCOUNT_ALREADY_REGISTERED, EMAIL_ALREADY_REGISTERED])(
    "signs in when the backend already has the account (%s)",
    async (code) => {
      vi.mocked(registerStudent).mockRejectedValue(
        new ClientApiError("Zaten kayıtlı.", 400, code),
      );
      const user = userEvent.setup();
      render(<StudentSignupFlow />);

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: "Kayıt ol" }));
      await verifyAndContinue(user);

      await waitFor(() => expect(push).toHaveBeenCalledWith("/workspace"));
      expect(login).toHaveBeenCalledWith("verified-token");
    },
  );

  it("shows why sign-up is closed and lets the student try again without retyping", async () => {
    vi.mocked(registerStudent).mockRejectedValueOnce(
      new ClientApiError(
        "Kayıt şu an açık değil. Koordinatörle iletişime geç.",
        409,
        "NO_STUDENT_PROGRAM",
      ),
    );
    const user = userEvent.setup();
    render(<StudentSignupFlow />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Kayıt ol" }));
    await verifyAndContinue(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kayıt şu an açık değil.",
    );
    expect(screen.queryByLabelText(/^E-posta/)).toBeNull();
    expect(screen.getByLabelText(/^Bölüm/)).toHaveValue("Fizik");
    expect(login).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Kaydı tamamla" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/workspace"));
    expect(registerStudent).toHaveBeenCalledTimes(2);
  });

  describe("resumed from /login", () => {
    beforeEach(() => {
      searchParams = new URLSearchParams({ resume: "1" });
    });

    it("asks a verified login without an account only for its profile", async () => {
      vi.mocked(currentFirebaseAccount).mockResolvedValue({
        email: "deniz@metu.edu.tr",
        fullName: "",
        verified: true,
      });
      const user = userEvent.setup();
      render(<StudentSignupFlow />);

      expect(
        await screen.findByRole("heading", { name: "Kaydını tamamla" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/deniz@metu.edu.tr/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Şifre/)).toBeNull();
      const finish = screen.getByRole("button", { name: "Kaydı tamamla" });
      expect(finish).toBeDisabled();

      await fillProfile(user);
      await user.click(finish);

      await waitFor(() => expect(push).toHaveBeenCalledWith("/workspace"));
      expect(registerStudent).toHaveBeenCalledWith(
        expect.objectContaining({ department: "Fizik" }),
        "verified-token",
      );
    });

    it("sends an unverified login to verify first, then to its profile", async () => {
      vi.mocked(currentFirebaseAccount).mockResolvedValue({
        email: "deniz@metu.edu.tr",
        fullName: "",
        verified: false,
      });
      const user = userEvent.setup();
      render(<StudentSignupFlow />);

      await verifyAndContinue(user);

      expect(
        await screen.findByRole("heading", { name: "Kaydını tamamla" }),
      ).toBeInTheDocument();
      expect(registerStudent).not.toHaveBeenCalled();
    });

    it("starts over when no login is left", async () => {
      vi.mocked(currentFirebaseAccount).mockResolvedValue(null);
      render(<StudentSignupFlow />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Oturum kontrol ediliyor",
      );
      expect(
        await screen.findByRole("heading", { name: "ODTÜ öğrenci kaydı" }),
      ).toBeInTheDocument();
    });

    it("falls back to the form when the saved login cannot be read", async () => {
      vi.mocked(currentFirebaseAccount).mockRejectedValue(new Error("offline"));
      render(<StudentSignupFlow />);

      expect(
        await screen.findByRole("heading", { name: "ODTÜ öğrenci kaydı" }),
      ).toBeInTheDocument();
    });

    it("tells the student when the session has run out", async () => {
      vi.mocked(currentFirebaseAccount).mockResolvedValue({
        email: "deniz@metu.edu.tr",
        fullName: "",
        verified: true,
      });
      vi.mocked(currentIdToken).mockResolvedValue(null);
      const user = userEvent.setup();
      render(<StudentSignupFlow />);

      await screen.findByRole("heading", { name: "Kaydını tamamla" });
      await fillProfile(user);
      await user.click(screen.getByRole("button", { name: "Kaydı tamamla" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Oturumunuz sona erdi",
      );
      expect(registerStudent).not.toHaveBeenCalled();
    });
  });
});
