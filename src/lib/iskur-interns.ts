import type { CoordinatorProgram } from "@/interfaces/coordinator-program";
import {
  IskurInternAccountState,
  type IskurInternEntry,
  type IskurInternList,
} from "@/interfaces/iskur-interns";
import { ProgramFeature, ProgramStatus } from "@/interfaces/program";
import { openFeaturesOf } from "@/lib/program-features";

/** How many addresses one paste may add; the backend refuses more. */
export const ISKUR_INTERN_PASTE_MAX = 500;
/** The longest address the list stores. */
export const ISKUR_INTERN_EMAIL_MAX = 320;

/**
 * The addresses in what the coordinator pasted: one per line, or separated by commas, semicolons or spaces. A mail
 * client's "Ad Soyad <adres>" form keeps just the address: words without an @ are names and are dropped, and angle
 * brackets and quotes around an address are stripped. Each is lowercased; repeats are dropped. The backend checks the
 * format and answers with the entries it could not read.
 */
export function internEmailsFromText(text: string): string[] {
  const emails = text
    .split(/[\s,;]+/)
    .map((part) => part.replace(/^[<"'(]+|[>"')]+$/g, "").toLowerCase())
    .filter((part) => part.includes("@"));
  return [...new Set(emails)];
}

/** Where one person stands on a program's İŞKUR intern list. */
export enum PersonIskurState {
  /** Listed, and an approved member of the program: they see the İŞKUR screens. */
  Intern = "intern",
  /** Listed, but not (yet) an approved member, so not an intern yet. */
  Listed = "listed",
  NotListed = "notListed",
}

/**
 * The programs on a person's profile whose İŞKUR intern list the viewer may change: İŞKUR is open to the viewer
 * there (assigned to this coordinator) and the program is not completed, the two things the backend checks.
 */
export function iskurListProgramIds(
  personProgramIds: readonly string[],
  myPrograms: readonly CoordinatorProgram[],
): string[] {
  const editable = new Set(
    myPrograms
      .filter(
        (program) =>
          program.status !== ProgramStatus.Completed &&
          openFeaturesOf(program).includes(ProgramFeature.Iskur),
      )
      .map((program) => program.id),
  );
  return [...new Set(personProgramIds)].filter((id) => editable.has(id));
}

/** The list entry for an address, matched the way the backend stores it (trimmed, lowercased). */
export function internEntryFor(
  list: IskurInternList,
  email: string,
): IskurInternEntry | null {
  const wanted = email.trim().toLowerCase();
  return list.entries.find((entry) => entry.email === wanted) ?? null;
}

export function personIskurState(
  entry: IskurInternEntry | null,
): PersonIskurState {
  if (!entry) return PersonIskurState.NotListed;
  return entry.account === IskurInternAccountState.Intern
    ? PersonIskurState.Intern
    : PersonIskurState.Listed;
}
