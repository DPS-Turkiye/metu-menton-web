import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IskurWeekHistory } from "@/components/student/iskur/week-history";
import { createIskurWeekHistory } from "@test/fixtures/iskur-weeks";

describe("IskurWeekHistory", () => {
  it("lists every step in order with who did it and what they wrote", () => {
    render(<IskurWeekHistory events={createIskurWeekHistory()} />);

    const card = screen.getByRole("region", { name: "Hafta geçmişi" });
    const steps = within(card).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringContaining("Gönderildi"),
      expect.stringContaining("Revizyon istendi"),
      expect.stringContaining("İtiraz edildi"),
      expect.stringContaining("Gönderildi"),
      expect.stringContaining("Onaylandı"),
    ]);
    expect(within(steps[1]!).getByText("Zeynep Kaya")).toBeInTheDocument();
    expect(
      within(steps[1]!).getByText("Çıktı bağlantısı eksik"),
    ).toBeInTheDocument();
    expect(within(steps[2]!).getByText("Mert Demir")).toBeInTheDocument();
    expect(
      within(steps[2]!).getByText("Bağlantıyı notta paylaştım"),
    ).toBeInTheDocument();
    // The approver's account is gone: the step still shows, without a name.
    expect(
      within(steps[4]!).queryByText("Zeynep Kaya"),
    ).not.toBeInTheDocument();
    expect(card.querySelectorAll("time")).toHaveLength(5);
  });

  it("shows nothing for a week that was never sent", () => {
    const { container } = render(<IskurWeekHistory events={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
