import { describe, expect, it } from "vitest";

import {
  iskurSupportActivitiesHref,
  iskurWorkspaceHref,
  supportActivityInput,
} from "@/lib/iskur-support-activities";

describe("İŞKUR support-activity helpers", () => {
  it("sends a trimmed title and an empty description as null", () => {
    expect(
      supportActivityInput({
        id: null,
        title: "  Açık ofis  ",
        description: " ",
        active: true,
      }),
    ).toEqual({ title: "Açık ofis", description: null, active: true });
    expect(
      supportActivityInput({
        id: "a",
        title: "Vaka",
        description: " Salı ",
        active: false,
      }),
    ).toEqual({ title: "Vaka", description: "Salı", active: false });
    expect(
      supportActivityInput({
        id: null,
        title: " ",
        description: "",
        active: true,
      }),
    ).toBeNull();
  });

  it("links the placement and pool screens", () => {
    expect(iskurWorkspaceHref("p/1")).toBe("/coordinator/programs/p%2F1/iskur");
    expect(iskurSupportActivitiesHref("p/1")).toBe(
      "/coordinator/programs/p%2F1/iskur/support-activities",
    );
  });
});
