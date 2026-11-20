import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MentonWordmark } from "@/components/common/menton-wordmark";
import { InLocale } from "@test/test-utils";

describe("MentonWordmark", () => {
  it("reads hocam by menton and links home", () => {
    render(<MentonWordmark href="/student" />);

    const link = screen.getByRole("link", { name: "hocam ana sayfa" });
    expect(link).toHaveAttribute("href", "/student");
    expect(link).toHaveTextContent(/^hocamby menton$/);
    expect(screen.getByText("by")).toHaveClass("font-light");
  });

  it("keeps the brand and translates only the label in English", () => {
    render(
      <InLocale locale="en">
        <MentonWordmark />
      </InLocale>,
    );

    const link = screen.getByRole("link", { name: "hocam home" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveTextContent(/^hocamby menton$/);
  });
});
