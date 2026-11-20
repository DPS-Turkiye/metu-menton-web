import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingSubmitted } from "@/components/iskur/onboarding-submitted";
import { IskurNextStep } from "@/types/iskur-onboarding";

function steps() {
  return within(screen.getByRole("region", { name: "Sırada ne var?" }))
    .getAllByRole("listitem")
    .map((item) => ({
      title: within(item).getByText(/incelemesi|görüşmesi|ataması/),
      when: within(item).getByText(/Bu hafta|Görüşme daveti gelir|~1 hafta/),
    }));
}

describe("OnboardingSubmitted", () => {
  it("names the student, lists the next steps in order and focuses the heading", () => {
    render(
      <OnboardingSubmitted
        firstName="Mert"
        nextSteps={[
          IskurNextStep.Review,
          IskurNextStep.LeadershipInterview,
          IskurNextStep.TeamAssignment,
        ]}
      />,
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Formun gönderildi, Mert",
    });
    expect(heading).toHaveFocus();
    const [review, interview, team] = steps();
    expect(review?.title).toHaveTextContent("Koordinatör incelemesi");
    expect(review?.when).toHaveTextContent("Bu hafta");
    expect(interview?.title).toHaveTextContent("Liderlik görüşmesi");
    expect(interview?.when).toHaveTextContent("Görüşme daveti gelir");
    expect(team?.title).toHaveTextContent("Ekip ataması");
    expect(team?.when).toHaveTextContent("~1 hafta içinde");
    expect(
      screen.getByRole("link", { name: "Ana Sayfa’ya git" }),
    ).toHaveAttribute("href", "/student");
  });

  it("falls back to the plain title without a first name", () => {
    render(
      <OnboardingSubmitted
        firstName=""
        nextSteps={[IskurNextStep.Review, IskurNextStep.TeamAssignment]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Formun gönderildi" }),
    ).toBeInTheDocument();
    expect(steps()).toHaveLength(2);
  });
});
