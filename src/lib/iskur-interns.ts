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
