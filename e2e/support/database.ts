import { execFileSync } from "node:child_process";

/**
 * One SQL statement in the stack's own Postgres container (metu-e2e), over its local socket. For moving a row's
 * clock where waiting for real time is not possible; never for anything a screen can do.
 */
export function sql(statement: string): string {
  const container = process.env.E2E_PG_CONTAINER ?? "metu-e2e-postgres-1";
  return execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      process.env.E2E_DB_USER ?? "menton",
      "-d",
      process.env.E2E_DB_NAME ?? "menton",
      "-tAc",
      statement,
    ],
    { encoding: "utf8" },
  ).trim();
}
