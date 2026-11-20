import "server-only";

/** The key every sealed cookie of this app is sealed with: the session, the office-hours session, an institution login. */
export function sessionPassword(): string {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error("SESSION_PASSWORD must contain at least 32 characters.");
  }
  return password;
}
