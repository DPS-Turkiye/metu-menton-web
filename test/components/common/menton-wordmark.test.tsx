import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MentonWordmark } from "@/components/common/menton-wordmark";
import { InLocale } from "@test/test-utils";

describe("MentonWordmark", () => {
  it("reads hocam by menton and links home", () => {
    render(<MentonWordmark href="/student" />);

    const link = screen.getByRole("link", {
      name: "hocam by menton ana sayfa",
    });
    expect(link).toHaveAttribute("href", "/student");
    expect(within(link).getByText("hocam")).toBeInTheDocument();
    expect(
      within(link).getByText("menton", { exact: false }),
    ).toBeInTheDocument();
  });

  it("keeps the brand and translates only the label in English", () => {
    render(
      <InLocale locale="en">
        <MentonWordmark />
      </InLocale>,
    );

    const link = screen.getByRole("link", { name: "hocam by menton home" });
    expect(link).toHaveAttribute("href", "/");
    expect(within(link).getByText("hocam")).toBeInTheDocument();
  });
});
