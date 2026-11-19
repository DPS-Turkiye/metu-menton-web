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

/**
 * Reads the list the Prism admin sent, pasted as text or from a spreadsheet: one person per line, cells split by
 * tabs, commas or semicolons. The cell with an address is the person; the last other cell, when there is one, is the
 * score (free text). A name column before the address is therefore ignored. Each address counts once.
 */
export function parsePrismList(text: string): ParsedPrismList {
  const entries = new Map<string, PrismDecisionEntry>();
  const rejectedLines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line
      .split(/[\t,;]+/)
      .flatMap((cell) =>
        cell.includes("@") ? cell.trim().split(/\s+/) : [cell.trim()],
      )
      .filter(Boolean);
    const emails = cells.filter((cell) => cell.includes("@"));
    const others = cells.filter((cell) => !cell.includes("@"));
    const score = emails.length === 1 ? (others.at(-1) ?? null) : null;
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
      if (!entries.has(key)) entries.set(key, { email: key, score });
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
