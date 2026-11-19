/** How many addresses one paste may add; the backend refuses more. */
export const ISKUR_INTERN_PASTE_MAX = 500;
/** The longest address the list stores. */
export const ISKUR_INTERN_EMAIL_MAX = 320;

/**
 * The addresses in what the coordinator pasted: one per line, or separated by commas, semicolons or spaces. Each is
 * trimmed and lowercased, and blanks and repeats are dropped. The backend checks the format and answers with the
 * entries it could not read.
 */
export function internEmailsFromText(text: string): string[] {
  const emails = text
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  return [...new Set(emails)];
}
