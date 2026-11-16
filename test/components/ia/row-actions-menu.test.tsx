import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RowActionsMenu } from "@/components/ia/row-actions-menu";
import { SegmentedControl } from "@/components/ia/segmented-tabs";

function menu(onSelect = vi.fn()) {
  render(
    <>
      <RowActionsMenu
        label="Program için diğer işlemler"
        actions={[
          { id: "assign", label: "Koordinatör ekle", onSelect },
          {
            id: "revoke",
            label: "Rozeti geri al",
            destructive: true,
            onSelect: vi.fn(),
          },
        ]}
      />
      <p>Dışarısı</p>
      <button type="button">Sonraki</button>
    </>,
  );
  return {
    onSelect,
    trigger: screen.getByRole("button", {
      name: "Program için diğer işlemler",
    }),
  };
}

describe("RowActionsMenu", () => {
  it("runs a chosen action, closes and gives focus back to the trigger", async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = menu();

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Koordinatör ekle" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Koordinatör ekle" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape, on a click outside and on a second click of the trigger", async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = menu();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByText("Dışarısı"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(trigger);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("RowActionsMenu, leaving it", () => {
  it("closes when focus moves elsewhere, on a scroll and on a resize", async () => {
    const user = userEvent.setup();
    const { trigger } = menu();

    await user.click(trigger);
    act(() => screen.getByRole("button", { name: "Sonraki" }).focus());
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(trigger);
    fireEvent.scroll(window);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(trigger);
    fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows a taking-away action in the error tone", async () => {
    const user = userEvent.setup();
    const { trigger } = menu();

    await user.click(trigger);

    expect(screen.getByRole("button", { name: "Rozeti geri al" })).toHaveClass(
      "text-status-error-text",
    );
    expect(
      screen.getByRole("button", { name: "Koordinatör ekle" }),
    ).not.toHaveClass("text-status-error-text");
  });
});

describe("SegmentedControl", () => {
  it("marks the active segment and reports the one chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SegmentedControl
        label="Program durumu"
        segments={[
          { id: "ALL", label: "Tümü 6", active: true },
          { id: "DRAFT", label: "Taslak 2", active: false },
        ]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("button", { name: "Tümü 6" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Taslak 2" }));
    expect(onSelect).toHaveBeenCalledWith("DRAFT");
  });
});
