import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfilePictureLink } from "@/components/people/profile-picture-link";
import { StaffPictureLink } from "@/components/people/staff-picture-link";

let pathname = "/coordinator/programs/p1/students";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("ProfilePictureLink", () => {
  it("opens the person's profile and says whose it is", () => {
    render(
      <ProfilePictureLink href="/student/x" name="Zeynep Koç">
        <span>ZK</span>
      </ProfilePictureLink>,
    );
    expect(
      screen.getByRole("link", { name: "Zeynep Koç profilini aç" }),
    ).toHaveAttribute("href", "/student/x");
  });

  it("is only the picture when there is no profile to open", () => {
    render(
      <ProfilePictureLink href={null} name="Zeynep Koç">
        <span>ZK</span>
      </ProfilePictureLink>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("ZK")).toBeInTheDocument();
  });
});

describe("StaffPictureLink", () => {
  it.each([
    ["/coordinator/programs/p1/students", "/coordinator/people/u1"],
    ["/admin/programs/p1", "/admin/users/u1"],
  ])("stays in the frame of %s", (path, href) => {
    pathname = path;
    render(
      <StaffPictureLink userId="u1" name="Zeynep Koç">
        <span>ZK</span>
      </StaffPictureLink>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", href);
  });
});
