import { describe, expect, it } from "vitest";

import { IskurInternAccountState } from "@/interfaces/iskur-interns";
import {
  ProgramFeature,
  ProgramStatus,
  ProgramType,
} from "@/interfaces/program";
import {
  internEmailsFromText,
  internEntryFor,
  iskurListProgramIds,
  PersonIskurState,
  personIskurState,
} from "@/lib/iskur-interns";
import { coordinatorProgram } from "@test/fixtures/coordinator-programs";
import {
  iskurInternEntry,
  iskurInternList,
} from "@test/fixtures/iskur-interns";

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

describe("iskurListProgramIds", () => {
  const semester = (
    id: string,
    overrides: Parameters<typeof coordinatorProgram>[0] = {},
  ) =>
    coordinatorProgram({
      id,
      type: ProgramType.Semester,
      features: [ProgramFeature.PeerMentoring, ProgramFeature.Iskur],
      myFeatures: [ProgramFeature.PeerMentoring, ProgramFeature.Iskur],
      ...overrides,
    });

  it("keeps the person's programs where İŞKUR is open to the coordinator", () => {
    expect(
      iskurListProgramIds(["s1", "other"], [semester("s1"), semester("s2")]),
    ).toEqual(["s1"]);
  });

  it("leaves out a program without İŞKUR, one where İŞKUR is not assigned to me, and a completed one", () => {
    const programs = [
      semester("no-iskur", {
        features: [ProgramFeature.PeerMentoring],
        myFeatures: [ProgramFeature.PeerMentoring],
      }),
      semester("not-mine", { myFeatures: [ProgramFeature.PeerMentoring] }),
      semester("done", { status: ProgramStatus.Completed }),
      coordinatorProgram({ id: "startup" }),
    ];

    expect(
      iskurListProgramIds(
        ["no-iskur", "not-mine", "done", "startup"],
        programs,
      ),
    ).toEqual([]);
  });

  it("lists a program once when the person has two rows in it", () => {
    expect(iskurListProgramIds(["s1", "s1"], [semester("s1")])).toEqual(["s1"]);
  });
});

describe("internEntryFor and personIskurState", () => {
  const list = iskurInternList([
    iskurInternEntry({ id: "e1", email: "ogrenci@hocam-test.metu.edu.tr" }),
    iskurInternEntry({
      id: "e2",
      email: "bekleyen@hocam-test.metu.edu.tr",
      account: IskurInternAccountState.OutsideProgram,
    }),
  ]);

  it("matches the address the way the list stores it", () => {
    expect(internEntryFor(list, "  Ogrenci@HOCAM-test.metu.edu.tr ")?.id).toBe(
      "e1",
    );
    expect(internEntryFor(list, "baska@hocam-test.metu.edu.tr")).toBeNull();
  });

  it("tells an intern from a listed address and an unlisted one", () => {
    expect(
      personIskurState(internEntryFor(list, "ogrenci@hocam-test.metu.edu.tr")),
    ).toBe(PersonIskurState.Intern);
    expect(
      personIskurState(internEntryFor(list, "bekleyen@hocam-test.metu.edu.tr")),
    ).toBe(PersonIskurState.Listed);
    expect(personIskurState(null)).toBe(PersonIskurState.NotListed);
  });
});
