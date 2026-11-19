import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurSupportActivitiesView } from "@/components/coordinator/iskur-support-activities-view";
import {
  createDefaultIskurSupportActivities,
  createIskurSupportActivity,
  deleteIskurSupportActivity,
  getIskurSupportActivities,
  updateIskurSupportActivity,
} from "@/lib/client/iskur-support-activities";
import {
  createIskurSupportActivity as activityFixture,
  createIskurSupportActivities,
} from "@test/fixtures/iskur-tasks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/components/coordinator/program-detail-frame", () => ({
  ProgramDetailFrame: ({
    children,
  }: {
    children: (detail: unknown) => ReactNode;
  }) => <>{children({})}</>,
}));
vi.mock("@/lib/client/iskur-support-activities", () => ({
  createDefaultIskurSupportActivities: vi.fn(),
  createIskurSupportActivity: vi.fn(),
  deleteIskurSupportActivity: vi.fn(),
  getIskurSupportActivities: vi.fn(),
  updateIskurSupportActivity: vi.fn(),
}));

const pool = createIskurSupportActivities([
  activityFixture(),
  activityFixture({
    id: "act-2",
    title: "Vaka çalışması",
    active: false,
    description: "Salı",
  }),
]);

describe("IskurSupportActivitiesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurSupportActivities).mockResolvedValue(pool);
    for (const call of [
      createDefaultIskurSupportActivities,
      createIskurSupportActivity,
      deleteIskurSupportActivity,
      updateIskurSupportActivity,
    ]) {
      vi.mocked(call).mockResolvedValue(pool);
    }
  });

  it("lists the pool, marks a retired activity, and links back to the teams", async () => {
    renderWithQueryClient(<IskurSupportActivitiesView programId="p1" />);
    expect(await screen.findByText("Açık ofis saati")).toBeInTheDocument();
    expect(screen.getByText("Kullanımdan kalktı")).toBeInTheDocument();
    expect(screen.getByText("Salı")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "İŞKUR ekipleri" }),
    ).toHaveAttribute("href", "/coordinator/programs/p1/iskur");
    expect(
      screen.queryByRole("button", { name: "Varsayılan havuzu oluştur" }),
    ).not.toBeInTheDocument();
  });

  it("adds an activity through the form", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<IskurSupportActivitiesView programId="p1" />);
    await user.click(
      await screen.findByRole("button", { name: "Faaliyet ekle" }),
    );
    const save = screen.getByRole("button", { name: "Kaydet" });
    expect(save).toBeDisabled();
    // Enter in the name field submits the form.
    await user.type(
      screen.getByRole("textbox", { name: "Ad" }),
      "Mentee ihtiyaç anketi{Enter}",
    );
    await waitFor(() =>
      expect(createIskurSupportActivity).toHaveBeenCalledWith("p1", {
        title: "Mentee ihtiyaç anketi",
        description: null,
        active: true,
      }),
    );
  });

  it("retires, edits and deletes an activity", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<IskurSupportActivitiesView programId="p1" />);
    await user.click(
      await screen.findByRole("button", { name: "Kullanımdan kaldır" }),
    );
    await waitFor(() =>
      expect(updateIskurSupportActivity).toHaveBeenCalledTimes(1),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Açık ofis saati faaliyetini düzenle",
      }),
    );
    expect(screen.getByRole("textbox", { name: "Ad" })).toHaveValue(
      "Açık ofis saati",
    );
    await user.click(screen.getByRole("button", { name: "Vazgeç" }));
    await user.click(
      screen.getByRole("button", { name: "Vaka çalışması faaliyetini sil" }),
    );
    expect(deleteIskurSupportActivity).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: "Vaka çalışması faaliyetini silmeyi onayla",
      }),
    );
    await waitFor(() =>
      expect(deleteIskurSupportActivity).toHaveBeenCalledWith("p1", "act-2"),
    );
  });

  it("offers the default pool when it is empty", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurSupportActivities).mockResolvedValue(
      createIskurSupportActivities([]),
    );
    renderWithQueryClient(<IskurSupportActivitiesView programId="p1" />);
    await user.click(
      await screen.findByRole("button", { name: "Varsayılan havuzu oluştur" }),
    );
    await waitFor(() =>
      expect(createDefaultIskurSupportActivities).toHaveBeenCalledWith("p1"),
    );
  });
});
