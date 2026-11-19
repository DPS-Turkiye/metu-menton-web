import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramTrainingEditor } from "@/components/coordinator/program-training-editor";
import type { PrismLink, TrainingModuleForEditor } from "@/interfaces/training";
import {
  getPrismLink,
  getTrainingForEditor,
  putPrismLink,
  putTraining,
} from "@/lib/client/training";
import { itemAt } from "@test/fixtures/list-assertions";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/training", () => ({
  getPrismLink: vi.fn(),
  getTrainingForEditor: vi.fn(),
  putPrismLink: vi.fn(),
  putTraining: vi.fn(),
}));

const PRISM = "https://prism.example.test/akran-mentor";

function prismLink(overrides: Partial<PrismLink> = {}): PrismLink {
  return { url: null, updatedAt: null, inAppQuiz: true, ...overrides };
}

const example: TrainingModuleForEditor = {
  published: false,
  version: null,
  videoId: "M7lc1UVf-VE",
  updatedAt: null,
  placeholder: true,
  questions: Array.from({ length: 10 }, (_, index) => ({
    text: `[ÖRNEK] Soru ${index + 1}`,
    options: ["A", "B", "C", "D"],
    correctOption: 0,
  })),
};

describe("ProgramTrainingEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTrainingForEditor).mockResolvedValue(example);
    vi.mocked(getPrismLink).mockResolvedValue(prismLink());
  });

  it("on ODTÜ saves the Prism link and leaves the in-app quiz out", async () => {
    vi.mocked(getPrismLink).mockResolvedValue(prismLink({ inAppQuiz: false }));
    vi.mocked(putPrismLink).mockResolvedValue(
      prismLink({
        url: PRISM,
        updatedAt: "2026-11-20T08:00:00Z",
        inAppQuiz: false,
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <ProgramTrainingEditor programId="p1" archived={false} />,
    );

    const field = await screen.findByLabelText("Prism bağlantısı");
    expect(
      screen.getByText(/Uygulama içi sınav bu sistemde kapalı/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("YouTube video bağlantısı"),
    ).not.toBeInTheDocument();
    expect(getTrainingForEditor).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Bağlantıyı kaydet" }),
    ).toBeDisabled();

    await user.type(field, ` ${PRISM} `);
    await user.click(screen.getByRole("button", { name: "Bağlantıyı kaydet" }));

    await waitFor(() => expect(putPrismLink).toHaveBeenCalledWith("p1", PRISM));
    expect(await screen.findByText("Bağlantı kaydedildi.")).toBeInTheDocument();
    expect(field).toHaveValue(PRISM);
  });

  it("shows why the Prism link was refused, and keeps it read-only when archived", async () => {
    vi.mocked(getPrismLink).mockResolvedValue(prismLink({ inAppQuiz: false }));
    vi.mocked(putPrismLink).mockRejectedValue(
      new Error("Geçerli bir https bağlantısı gir."),
    );
    const user = userEvent.setup();
    const first = renderWithQueryClient(
      <ProgramTrainingEditor programId="p1" archived={false} />,
    );
    await user.type(
      await screen.findByLabelText("Prism bağlantısı"),
      "http://prism.example.test",
    );
    await user.click(screen.getByRole("button", { name: "Bağlantıyı kaydet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Geçerli bir https bağlantısı gir.",
    );
    first.unmount();

    vi.mocked(getPrismLink).mockResolvedValue(
      prismLink({ url: PRISM, inAppQuiz: false }),
    );
    renderWithQueryClient(<ProgramTrainingEditor programId="p1" archived />);
    expect(await screen.findByLabelText("Prism bağlantısı")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Bağlantıyı kaydet" }),
    ).not.toBeInTheDocument();
  });

  it("says when the Prism link cannot be loaded", async () => {
    vi.mocked(getPrismLink).mockRejectedValue(new Error("Eğitim yüklenemedi."));
    renderWithQueryClient(
      <ProgramTrainingEditor programId="p1" archived={false} />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Eğitim yüklenemedi.",
    );
  });

  it("starts from the marked example and publishes what the coordinator wrote", async () => {
    vi.mocked(putTraining).mockResolvedValue({
      ...example,
      placeholder: false,
      published: true,
      version: 1,
    });
    const user = userEvent.setup();
    renderWithQueryClient(
      <ProgramTrainingEditor programId="p1" archived={false} />,
    );

    expect(await screen.findByText(/ÖRNEK İÇERİK/)).toBeInTheDocument();
    const link = screen.getByLabelText("YouTube video bağlantısı");
    expect(link).toHaveValue("https://youtu.be/M7lc1UVf-VE");

    await user.clear(link);
    await user.type(link, "https://youtu.be/abcdefghijk");
    await user.clear(screen.getByLabelText("Soru 1"));
    await user.type(screen.getByLabelText("Soru 1"), "Gerçek soru");
    await user.click(screen.getByLabelText("Soru 1, seçenek 3 doğru"));
    await user.click(screen.getByRole("button", { name: "Kaydet ve yayınla" }));

    await waitFor(() => expect(putTraining).toHaveBeenCalledOnce());
    const [programId, input] = itemAt(vi.mocked(putTraining).mock.calls, 0);
    expect(programId).toBe("p1");
    expect(input.videoUrl).toBe("https://youtu.be/abcdefghijk");
    expect(input.questions).toHaveLength(10);
    expect(input.questions[0]).toEqual({
      text: "Gerçek soru",
      options: ["A", "B", "C", "D"],
      correctOption: 2,
    });
    expect(await screen.findByText("Eğitim yayında.")).toBeInTheDocument();
  });

  it("shows the backend's refusal, e.g. a link that is not YouTube", async () => {
    vi.mocked(putTraining).mockRejectedValue(
      new Error("Geçerli bir YouTube video bağlantısı gir."),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <ProgramTrainingEditor programId="p1" archived={false} />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Kaydet ve yayınla" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Geçerli bir YouTube video bağlantısı gir.",
    );
  });

  it("is read-only for an archived program", async () => {
    renderWithQueryClient(<ProgramTrainingEditor programId="p1" archived />);
    expect(
      await screen.findByLabelText("YouTube video bağlantısı"),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Kaydet ve yayınla" }),
    ).not.toBeInTheDocument();
  });
});
