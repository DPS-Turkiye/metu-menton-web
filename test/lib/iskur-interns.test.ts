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

  it("keeps only the address from a mail client's name and address form", () => {
    expect(
      internEmailsFromText(
        'Ayşe Yıldız <Ayse@example.test>, "Burak Tan" <burak@example.test>; (ceren@example.test)',
      ),
    ).toEqual([
      "ayse@example.test",
      "burak@example.test",
      "ceren@example.test",
    ]);
  });

  it("leaves a malformed address for the backend to report, and drops words without an @", () => {
    expect(internEmailsFromText("adres@degil not-an-address")).toEqual([
      "adres@degil",
    ]);
  });

  it("finds nothing in an empty paste", () => {
    expect(internEmailsFromText(" \n , ")).toEqual([]);
  });
});
