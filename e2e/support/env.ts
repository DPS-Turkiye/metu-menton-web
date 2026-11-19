/** Where the stack under test runs; e2e/stack.sh writes the matching values into e2e/.stack/web.env. */
export const e2eEnv = {
  webUrl: process.env.E2E_WEB_URL ?? "http://127.0.0.1:3300",
  apiUrl: process.env.E2E_API_URL ?? "http://127.0.0.1:8097",
};

/** The frontend's service credential, for backend paths that only answer it (never a person's login). */
export function serviceAuthorization(): string {
  const user = process.env.BACKEND_USERNAME ?? "";
  const password = process.env.BACKEND_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}
