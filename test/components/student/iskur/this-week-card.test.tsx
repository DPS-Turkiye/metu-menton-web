import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurThisWeekCard } from "@/components/student/iskur/this-week-card";
import { ClientApiError } from "@/lib/client/api";
import { addIskurSupportEntry, getIskurWeek } from "@/lib/client/iskur-weeks";
import { createIskurWeek } from "@test/fixtures/iskur-weeks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-weeks", () => ({
  addIskurSupportEntry: vi.fn(),
  getIskurWeek: vi.fn(),
}));

describe("IskurThisWeekCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the hours on each side against the targets and the to-dos", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurWeek).mockResolvedValue(
      createIskurWeek({ needsSupportActivity: true }),
    );
    vi.mocked(addIskurSupportEntry).mockResolvedValue(createIskurWeek());
    renderWithQueryClient(<IskurThisWeekCard />);

    expect(
      await screen.findByRole("heading", { name: /Bu Haftam/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 sa 40 dk / 6 sa")).toBeInTheDocument();
    expect(screen.getByText("3 sa / 16 sa 30 dk")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Akran Mentörlüğü" }),
    ).toHaveAttribute("aria-valuenow", "44");
    expect(
      screen.getByRole("link", { name: /1 görüşme raporu bekliyor/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Sponsor listesi: 10 firma/ }),
    ).toHaveAttribute("href", "/student/team/tasks/task-1");
    expect(
      screen.getByRole("link", { name: "Çalışma kaydını aç" }),
    ).toHaveAttribute("href", "/student/work-log?view=daily&week=2026-11-16");

    await user.click(screen.getByRole("button", { name: "Çalışma saati" }));
    expect(
      screen.queryByRole("progressbar", { name: "Akran Mentörlüğü" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Faaliyet seç" }));
    await user.click(
      screen.getByRole("button", { name: "Bugüne 1 saat ekle" }),
    );
    await waitFor(() => expect(addIskurSupportEntry).toHaveBeenCalledTimes(1));
  });

  it("is not shown to someone who is not placed", async () => {
    vi.mocked(getIskurWeek).mockRejectedValue(new ClientApiError("x", 404));
    const { container } = renderWithQueryClient(<IskurThisWeekCard />);
    await waitFor(() => expect(getIskurWeek).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
  });
});
