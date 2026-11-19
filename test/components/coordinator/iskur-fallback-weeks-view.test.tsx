import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IskurFallbackWeeksView,
  IskurFallbackWeekView,
} from "@/components/coordinator/iskur-fallback-weeks-view";
import {
  getIskurFallbackQueue,
  getIskurFallbackWeek,
} from "@/lib/client/iskur-weeks";
import { createIskurLeaderWeek, WEEK_ID } from "@test/fixtures/iskur-weeks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/components/coordinator/program-detail-frame", () => ({
  ProgramDetailFrame: ({
    children,
  }: {
    children: (detail: unknown) => ReactNode;
  }) => <>{children({})}</>,
}));
vi.mock("@/lib/client/iskur-weeks", () => ({
  decideIskurFallbackWeek: vi.fn(),
  getIskurFallbackQueue: vi.fn(),
  getIskurFallbackWeek: vi.fn(),
}));

describe("IskurFallbackWeeksView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the weeks no leader can review, with a link to each sent one", async () => {
    vi.mocked(getIskurFallbackQueue).mockResolvedValue({
      weekStart: "2026-11-16",
      people: createIskurLeaderWeek().queue,
    });
    renderWithQueryClient(<IskurFallbackWeeksView programId="p1" />);
    expect(await screen.findByText("Mert Demir")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aç" })).toHaveAttribute(
      "href",
      `/coordinator/programs/p1/iskur/weeks/${WEEK_ID}`,
    );
    expect(screen.getByText("Başlamadı")).toBeInTheDocument();
  });

  it("says when nothing falls to the coordinators", async () => {
    vi.mocked(getIskurFallbackQueue).mockResolvedValue({
      weekStart: "2026-11-16",
      people: [],
    });
    renderWithQueryClient(<IskurFallbackWeeksView programId="p1" />);
    expect(
      await screen.findByText("Bu hafta koordinatöre düşen bir kayıt yok."),
    ).toBeInTheDocument();
  });

  it("opens one week in the review screen, back to the coordinators' list", async () => {
    vi.mocked(getIskurFallbackWeek).mockResolvedValue(createIskurLeaderWeek());
    renderWithQueryClient(
      <IskurFallbackWeekView programId="p1" weekId={WEEK_ID} />,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: /Mert Demir/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "← Haftalık kayıtlar" })[0],
    ).toHaveAttribute("href", "/coordinator/programs/p1/iskur/weeks");
  });
});
