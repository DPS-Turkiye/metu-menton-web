#!/usr/bin/env node
// The E2E admin and coordinator: e-mail/password logins in the Firebase *test* project, made (or reset) through the
// Identity Toolkit admin API with the test project's service account. e2e/stack.sh runs this in E2E_MODE=flows only.
//
//   node e2e/support/staff-logins.mjs <service-account.json | ->     (- reads the JSON from stdin)
//
// Prints KEY=VALUE lines for e2e/.stack/backend.env (APP_BOOTSTRAP_STAFF) and e2e/.stack/web.env (the logins).
// The uids are fixed and each password is derived from the service account's key, so two runs at once agree on
// both and nothing is left behind between runs. The addresses are @example.test; nobody can receive mail there.
import { createHmac, createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const STAFF = [
  {
    role: "ADMIN",
    uid: "e2e-admin",
    email: "e2e-admin@example.test",
    name: "E2E Admin",
  },
  {
    role: "COORDINATOR",
    uid: "e2e-coordinator",
    email: "e2e-coordinator@example.test",
    name: "E2E Koordinatör",
  },
];

// Only ever the test project: these logins must never exist in a real one (odtu-menton or anything else).
const TEST_PROJECT = "metu-menton";

const account = JSON.parse(
  readFileSync(process.argv[2] === "-" ? 0 : process.argv[2], "utf8"),
);
if (account.project_id !== TEST_PROJECT) {
  throw new Error(
    `staff-logins: refusing project "${account.project_id}"; only the ${TEST_PROJECT} test project`,
  );
}
const base = `https://identitytoolkit.googleapis.com/v1/projects/${account.project_id}`;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/identitytoolkit",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 600,
  };
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok)
    throw new Error(`service account token: HTTP ${response.status}`);
  return (await response.json()).access_token;
}

/** A Google error's code only (e.g. USER_NOT_FOUND); the body is never printed. */
async function call(token, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const error = await response.json().catch(() => ({}));
  return error?.error?.message ?? `HTTP ${response.status}`;
}

const token = await accessToken();
const lines = [];
for (const person of STAFF) {
  const password = createHmac("sha256", account.private_key)
    .update(`menton-e2e:${person.uid}`)
    .digest("base64url");
  const fields = {
    email: person.email,
    password,
    emailVerified: true,
    displayName: person.name,
  };
  let problem = await call(token, "/accounts:update", {
    localId: person.uid,
    ...fields,
  });
  if (problem?.startsWith("USER_NOT_FOUND")) {
    problem = await call(token, "/accounts", {
      localId: person.uid,
      ...fields,
    });
  }
  if (problem) throw new Error(`${person.uid}: ${problem}`);
  const key = person.role === "ADMIN" ? "E2E_ADMIN" : "E2E_COORDINATOR";
  lines.push(`${key}_EMAIL=${person.email}`, `${key}_PASSWORD=${password}`);
}
lines.push(
  `APP_BOOTSTRAP_STAFF=${STAFF.map((p) => `${p.role}:${p.email}:${p.uid}`).join(",")}`,
);
process.stdout.write(`${lines.join("\n")}\n`);
