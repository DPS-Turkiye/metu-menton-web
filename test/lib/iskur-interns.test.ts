import { describe, expect, it } from "vitest";

import { internEmailsFromText } from "@/lib/iskur-interns";

describe("internEmailsFromText", () => {
  it("reads one address per line, or separated by commas, semicolons and spaces", () => {
    expect(
      internEmailsFromText(
        "ayse@example.test\nburak@example.test, ceren@example.test;deniz@example.test  efe@example.test",
      ),
    ).toEqual([
      "ayse@example.test",
      "burak@example.test",
      "ceren@example.test",
      "deniz@example.test",
      "efe@example.test",
    ]);
  });

  it("lowercases, trims and drops blanks and repeats", () => {
    expect(
      internEmailsFromText(
        "  Ayse@Example.TEST \r\n\n,ayse@example.test,, \tBURAK@example.test\n",
      ),
    ).toEqual(["ayse@example.test", "burak@example.test"]);
  });

  it("keeps entries that are not addresses for the backend to report", () => {
    expect(internEmailsFromText("adres-degil")).toEqual(["adres-degil"]);
  });

  it("finds nothing in an empty paste", () => {
    expect(internEmailsFromText(" \n , ")).toEqual([]);
  });
});
