import {
  GateBadgeState,
  PRISM_DECISION_MAX_ENTRIES,
  PRISM_SCORE_MAX,
  PrismDecision,
  type GateBadgeRow,
  type PrismDecisionEntry,
} from "@/interfaces/badges";
import { isEmailAddress } from "@/lib/utils";
import { PrismRowStatus } from "@/types/peer-participants";

export type ParsedPrismList = {
  entries: PrismDecisionEntry[];
  /** Lines with something on them but no usable address, or a score longer than the backend keeps. */
  rejectedLines: string[];
};

/** Quotes, angle brackets and trailing punctuation that pasted CSV or "Name <address>" leave around an address. */
function cleanToken(token: string) {
  return token
    .trim()
    .replace(/^["'<(]+/, "")
    .replace(/[">)'.,;:]+$/, "");
}

/** Spreadsheets paste with tabs, CSV exports with semicolons; only a plain list separates with commas. */
function cellsOf(line: string) {
  const separator = /[\t;]/.test(line) ? /[\t;]+/ : /,+/;
  return line
    .split(separator)
    .flatMap((cell) =>
      cell.includes("@") ? cell.trim().split(/\s+/) : [cell.trim()],
    )
    .map(cleanToken)
    .filter(Boolean);
}

/**
 * Reads the list the Prism admin sent, pasted as text or from a spreadsheet: one person per line. The cell with an
 * address is the person; the first cell after it with a digit in it is the score (free text, so "85", "85,5" and
 * "8/10" all stay as written). Names before or after the address are not scores. Each address counts once; a later
 * line can still add a score the first one lacked.
 */
export function parsePrismList(text: string): ParsedPrismList {
  const entries = new Map<string, PrismDecisionEntry>();
  const rejectedLines: string[] = [];
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = cellsOf(line);
    const emails = cells.filter((cell) => cell.includes("@"));
    const after = cells.slice(
      cells.findIndex((cell) => cell.includes("@")) + 1,
    );
    const score =
      emails.length === 1
        ? (after.find((cell) => !cell.includes("@") && /\d/.test(cell)) ?? null)
        : null;
    if (
      emails.length === 0 ||
      !emails.every(isEmailAddress) ||
      (score !== null && score.length > PRISM_SCORE_MAX)
    ) {
      rejectedLines.push(line);
      continue;
    }
    for (const email of emails) {
      const key = email.toLowerCase();
      const known = entries.get(key);
      if (!known) entries.set(key, { email: key, score });
      else if (known.score === null && score !== null) known.score = score;
    }
  }
  return { entries: [...entries.values()], rejectedLines };
}

/** Whether a parsed list can be sent: at least one address, and not more than the backend takes at once. */
export function canSendPrismList(parsed: ParsedPrismList) {
  return (
    parsed.entries.length > 0 &&
    parsed.entries.length <= PRISM_DECISION_MAX_ENTRIES
  );
}

/**
 * Where a student without the badge stands with Prism, for Öğrenciler: waiting for a decision (they said they
 * finished after the last one), or asked to take the test again.
 */
export function prismRowStatus(
  row: Pick<GateBadgeRow, "state" | "prism">,
): PrismRowStatus | null {
  if (row.state === GateBadgeState.Active || !row.prism) return null;
  const { completedAt, decidedAt, decision } = row.prism;
  if (
    completedAt &&
    (!decidedAt || Date.parse(completedAt) > Date.parse(decidedAt))
  ) {
    return PrismRowStatus.Pending;
  }
  return decision === PrismDecision.Retake ? PrismRowStatus.Retake : null;
}
