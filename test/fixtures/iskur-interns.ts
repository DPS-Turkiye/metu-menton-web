import {
  IskurInternAccountState,
  type IskurInternEntry,
  type IskurInternList,
} from "@/interfaces/iskur-interns";

export function iskurInternEntry(
  overrides: Partial<IskurInternEntry> = {},
): IskurInternEntry {
  return {
    id: "e-ayse",
    email: "ayse@example.test",
    addedAt: "2026-11-19T18:00:00Z",
    account: IskurInternAccountState.Intern,
    userId: "u-ayse",
    fullName: "Ayşe Yıldız",
    placed: false,
    ...overrides,
  };
}

/** A list with its counts worked out from the entries, as the backend sends it. */
export function iskurInternList(
  entries: IskurInternEntry[],
  rejected: string[] = [],
): IskurInternList {
  const count = (state: IskurInternAccountState) =>
    entries.filter((entry) => entry.account === state).length;
  return {
    programId: "p1",
    entries,
    counts: {
      listed: entries.length,
      interns: count(IskurInternAccountState.Intern),
      notSignedUp: count(IskurInternAccountState.NotSignedUp),
      outsideProgram: count(IskurInternAccountState.OutsideProgram),
    },
    rejected,
  };
}
