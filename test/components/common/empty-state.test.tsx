import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/common/empty-state";

describe("EmptyState", () => {
  it("shows the title, and the line and action only when given", () => {
    const { rerender } = render(<EmptyState title="Henüz randevun yok" />);
    expect(
      screen.getByRole("heading", { name: "Henüz randevun yok" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <EmptyState
        title="Henüz randevun yok"
        body="Bir mentor seçip talep gönderebilirsin."
        action={<button type="button">Mentor bul</button>}
      />,
    );
    expect(
      screen.getByText("Bir mentor seçip talep gönderebilirsin."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mentor bul" }),
    ).toBeInTheDocument();
  });

  it("shows the sparkle icon when there is no picture", () => {
    const { container } = render(<EmptyState title="Henüz randevun yok" />);
    expect(container.querySelector("svg.lucide-sparkles")).not.toBeNull();
  });

  it("shows a picture under the title in the icon's place", () => {
    const { container } = render(
      <EmptyState
        title="Office Hours çok yakında"
        media={<span role="img" aria-label="Bakım" />}
      />,
    );
    expect(container.querySelector("svg.lucide-sparkles")).toBeNull();
    const heading = screen.getByRole("heading", {
      name: "Office Hours çok yakında",
    });
    const picture = screen.getByRole("img", { name: "Bakım" });
    expect(
      heading.compareDocumentPosition(picture) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
