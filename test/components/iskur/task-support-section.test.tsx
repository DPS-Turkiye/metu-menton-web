import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTaskSupportSection } from "@/components/iskur/task-support-section";
import { ClientApiError } from "@/lib/client/api";
import {
  getIskurTaskSupports,
  getIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/client/iskur-team-support";
import {
  DIGITAL,
  iskurTeamSupport,
  iskurTeamSupports,
} from "@test/fixtures/iskur-team-support";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-team-support", () => ({
  getIskurTeamSupports: vi.fn(),
  getIskurTaskSupports: vi.fn(),
  openIskurTeamSupport: vi.fn(),
  answerIskurTeamSupport: vi.fn(),
}));

describe("IskurTaskSupportSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the task's support requests in the handbook's words (p.14)", async () => {
    vi.mocked(getIskurTaskSupports).mockResolvedValue([iskurTeamSupport()]);
    renderWithQueryClient(
      <IskurTaskSupportSection taskId="task-1" canAsk={false} />,
    );
    expect(
      await screen.findByText(
        "Dijital Dönüşüm ekibinden destek talebi açıldı.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Destek talebi aç" }),
    ).toBeNull();
    expect(getIskurTeamSupports).not.toHaveBeenCalled();
  });

  it("stays away for someone the backend does not let read the task's requests", async () => {
    vi.mocked(getIskurTaskSupports).mockRejectedValue(
      new ClientApiError("x", 404),
    );
    renderWithQueryClient(
      <IskurTaskSupportSection taskId="task-1" canAsk={false} />,
    );
    await vi.waitFor(() => expect(getIskurTaskSupports).toHaveBeenCalled());
    expect(
      screen.queryByRole("region", { name: "Başka ekipten destek" }),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells a leader when the request form cannot be loaded", async () => {
    vi.mocked(getIskurTaskSupports).mockResolvedValue([]);
    vi.mocked(getIskurTeamSupports).mockRejectedValue(new Error("down"));
    renderWithQueryClient(<IskurTaskSupportSection taskId="task-1" canAsk />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Destek talepleri yüklenemedi.",
    );
  });

  it("lets the team's leader open a request for this task", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTaskSupports).mockResolvedValue([]);
    vi.mocked(getIskurTeamSupports).mockResolvedValue(iskurTeamSupports());
    vi.mocked(openIskurTeamSupport).mockResolvedValue(iskurTeamSupports());
    renderWithQueryClient(<IskurTaskSupportSection taskId="task-1" canAsk />);
    expect(
      await screen.findByText("Bu görev için destek talebi açılmadı."),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Destek talebi aç" }),
    );
    await user.selectOptions(screen.getByLabelText("Hangi ekipten?"), DIGITAL);
    await user.type(screen.getByLabelText("Ne lazım?"), "A3 afiş");
    await user.click(screen.getByRole("button", { name: "Talebi aç" }));
    expect(openIskurTeamSupport).toHaveBeenCalledWith({
      toTeamId: DIGITAL,
      taskId: "task-1",
      need: "A3 afiş",
    });
    expect(getIskurTaskSupports).toHaveBeenCalledTimes(2);
  });
});
