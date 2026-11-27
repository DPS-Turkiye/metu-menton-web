import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { StudentAvatar } from "@/components/academician/student-avatar";
import { Avatar as AdminAvatar } from "@/components/admin/admin-ui";
import { Avatar, PhotoAvatar } from "@/components/common/avatar";
import { PersonPhotoAvatar } from "@/components/common/person-photo-avatar";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { InitialsAvatar as StudentInitialsAvatar } from "@/components/student/ia/ui";

const PERSON_ID = "00000000-0000-4000-8000-000000000805";
const PHOTO = `/api/users/${PERSON_ID}/photo`;

function photo(container: HTMLElement) {
  return container.querySelector("img");
}

// next/image writes the address out in full.
function photoPath(container: HTMLElement) {
  const src = photo(container)?.getAttribute("src");
  return src ? new URL(src, "http://localhost").pathname : null;
}

describe("PersonPhotoAvatar", () => {
  it("asks for the person's photo and keeps the initials until it has loaded", () => {
    const { container } = render(
      <PersonPhotoAvatar
        personId={PERSON_ID}
        initials="AY"
        className="size-8"
      />,
    );

    expect(photoPath(container)).toBe(PHOTO);
    expect(photo(container)).toHaveClass("opacity-0");
    expect(screen.getByText("AY")).not.toHaveClass("invisible");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows and names the photo once it has loaded", async () => {
    const { container } = render(
      <PersonPhotoAvatar
        personId={PERSON_ID}
        initials="AY"
        className="size-8"
        label="Ayşe Yılmaz profil fotoğrafı"
      />,
    );

    fireEvent.load(photo(container) ?? container);

    expect(
      await screen.findByRole("img", { name: "Ayşe Yılmaz profil fotoğrafı" }),
    ).toBeInTheDocument();
    expect(photo(container)).not.toHaveClass("opacity-0");
    expect(screen.getByText("AY")).toHaveClass("invisible");
  });

  it("falls back to the default label", async () => {
    const { container } = render(
      <PersonPhotoAvatar personId={PERSON_ID} initials="AY" className="" />,
    );

    fireEvent.load(photo(container) ?? container);

    expect(
      await screen.findByRole("img", { name: "Profil fotoğrafı" }),
    ).toBeInTheDocument();
  });

  it("does not announce a decorative photo beside a visible name", async () => {
    const { container } = render(
      <PersonPhotoAvatar
        personId={PERSON_ID}
        initials="AY"
        className=""
        decorative
      />,
    );

    fireEvent.load(photo(container) ?? container);

    await waitFor(() =>
      expect(screen.getByText("AY")).toHaveClass("invisible"),
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps the initials when there is no photo to show", () => {
    const { container } = render(
      <PersonPhotoAvatar personId={PERSON_ID} initials="AY" className="" />,
    );

    fireEvent.error(photo(container) ?? container);

    expect(photo(container)).toBeNull();
    expect(screen.getByText("AY")).not.toHaveClass("invisible");
  });
});

describe("PersonPhotoAvatar for another person", () => {
  it("starts over for the next person instead of keeping the last one's photo", async () => {
    const other = "00000000-0000-4000-8000-000000000806";
    const { container, rerender } = render(
      <PersonPhotoAvatar personId={PERSON_ID} initials="AY" className="" />,
    );
    fireEvent.load(photo(container) ?? container);
    await waitFor(() =>
      expect(screen.getByText("AY")).toHaveClass("invisible"),
    );

    rerender(<PersonPhotoAvatar personId={other} initials="BK" className="" />);

    expect(photoPath(container)).toBe(`/api/users/${other}/photo`);
    expect(screen.getByText("BK")).not.toHaveClass("invisible");
  });
});

describe("avatars with a person id", () => {
  const withPerson: [string, ReactElement][] = [
    [
      "PhotoAvatar",
      <PhotoAvatar
        key="photo"
        initials="AY"
        personId={PERSON_ID}
        className="size-8"
      />,
    ],
    ["Avatar", <Avatar key="common" initials="AY" personId={PERSON_ID} />],
    [
      "admin Avatar",
      <AdminAvatar key="admin" initials="AY" personId={PERSON_ID} />,
    ],
    [
      "ia InitialsAvatar",
      <InitialsAvatar key="ia" name="Ayşe Yılmaz" personId={PERSON_ID} />,
    ],
    [
      "student InitialsAvatar",
      <StudentInitialsAvatar
        key="student"
        name="Ayşe Yılmaz"
        personId={PERSON_ID}
      />,
    ],
    [
      "StudentAvatar",
      <StudentAvatar key="academic" name="Ayşe Yılmaz" personId={PERSON_ID} />,
    ],
  ];

  it.each(withPerson)(
    "%s asks for the photo over the initials",
    (_, avatar) => {
      const { container } = render(avatar);

      expect(photoPath(container)).toBe(PHOTO);
      expect(screen.getByText("AY")).toBeInTheDocument();
    },
  );

  const withoutPerson: [string, ReactElement][] = [
    ["PhotoAvatar", <PhotoAvatar key="photo" initials="AY" className="" />],
    ["Avatar", <Avatar key="common" initials="AY" />],
    ["admin Avatar", <AdminAvatar key="admin" initials="AY" />],
    ["ia InitialsAvatar", <InitialsAvatar key="ia" name="Ayşe Yılmaz" />],
    [
      "student InitialsAvatar",
      <StudentInitialsAvatar key="student" name="Ayşe Yılmaz" />,
    ],
    ["StudentAvatar", <StudentAvatar key="academic" name="Ayşe Yılmaz" />],
  ];

  it.each(withoutPerson)("%s stays initials without one", (_, avatar) => {
    const { container } = render(avatar);

    expect(photo(container)).toBeNull();
    expect(screen.getByText("AY")).toBeInTheDocument();
  });
});
