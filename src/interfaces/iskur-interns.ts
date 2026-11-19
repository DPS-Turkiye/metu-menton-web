/** The coordinator's İŞKUR intern list (backend `IskurInternListResponse`): only listed accounts are interns. */

/** Where a listed address stands. */
export enum IskurInternAccountState {
  /** No account uses the address yet; its owner becomes an intern on signing up to the program. */
  NotSignedUp = "NOT_SIGNED_UP",
  /** An approved student or accepted peer mentor of the program. */
  Intern = "INTERN",
  /** An account uses the address, but it is not an approved member of this program. */
  OutsideProgram = "OUTSIDE_PROGRAM",
}

export interface IskurInternEntry {
  id: string;
  email: string;
  addedAt: string;
  account: IskurInternAccountState;
  /** Set only for an intern of this program. */
  userId: string | null;
  fullName: string | null;
  /** A placed intern is removed only after leaving their team. */
  placed: boolean;
}

export interface IskurInternList {
  programId: string;
  entries: IskurInternEntry[];
  counts: {
    listed: number;
    interns: number;
    notSignedUp: number;
    outsideProgram: number;
  };
  /** The pasted entries the last add could not read as addresses; empty on every other call. */
  rejected: string[];
}
