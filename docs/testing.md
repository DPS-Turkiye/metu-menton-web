# Testing

Tests run on [Vitest](https://vitest.dev) with jsdom and Testing Library. They are type-checked (`tsc -p test`) and
linted like production code, and CI enforces coverage floors.

## What to test

| Code                        | Test                                                                                                | Location                              |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Pure logic in `src/lib`     | Unit tests: inputs, edge cases, every branch.                                                       | `test/lib/…`                          |
| Hooks                       | `renderHook` with a query client: state transitions, what is sent, invalidation, errors.            | `test/hooks/…`                        |
| Components and pages        | Render, interact with `userEvent`, assert what the user sees and what was called.                   | `test/components/…`, `test/app/…`     |
| Route handlers              | Auth refusals, the exact backend call (actor from the session), 400s for bad bodies, error mapping. | `test/app/api/…`                      |
| Browser and backend clients | URL, method, payload, and how failures surface.                                                     | `test/lib/client/…`, `test/lib/api/…` |

The test file mirrors the source path: `src/lib/meeting-context.ts` → `test/lib/meeting-context.test.ts`. When a
module's test file grows large, add a second file with a descriptive suffix (`meeting-context-branches.test.ts`).

A bug fix comes with a test that fails without the fix.

## Writing good tests

- **Test behavior, not implementation.** Query by role and accessible name (`getByRole("button", { name: "Kaydet" })`),
  not by class or test id. Assert outcomes: text on screen, the payload sent, the query invalidated.
- **The title says what is verified:** `"refuses a plan with a week number given as text"`, not `"works"`.
- **Unconditional assertions.** No `expect` inside `if` or `catch` (`vitest/no-conditional-expect`); use
  `await expect(promise).rejects.toThrow(…)`.
- **Exact payloads.** Check what reaches an API with `toHaveBeenCalledWith` or `toEqual`. `toMatchObject` ignores
  extra fields, so it would not catch a leaked field (such as a React row key).
- **No snapshots.** They hide what matters and get updated without reading.
- **Time.** Pin the clock with `vi.useFakeTimers()` / `vi.setSystemTime(…)` when a result depends on today. The suite
  runs with `TZ=Europe/Istanbul` (`vitest.config.mts`) so clock times match on every machine.
- **No real network.** Mock at the module boundary (`vi.mock("@/lib/client/meetings", …)`). jsdom's URL points at
  `http://localhost:9`, where nothing listens, so an unmocked request fails loudly.

## Typed mocks, no casts

`as unknown as T` and `as never` are lint errors in tests too. Build complete, typed values:

| Need                                          | Use                                                                                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `useQuery` result                           | `successQuery(data)`, `loadingQuery()`, `failedQuery(error)`, `idleQuery()` from `test/mocks/query-results.ts`. TanStack builds them, so every field is real.                                                         |
| A `useMutation` result                        | `idleMutation({ mutateAsync })`, `pendingMutation(variables)` from the same file.                                                                                                                                     |
| A view-model hook (`useMentorDashboard`…)     | A factory that returns the complete `ReturnType<typeof useX>` with defaults and takes `Partial<…>` overrides. Shared ones go to `test/fixtures` (for example `signupWizardStub` in `test/fixtures/signup-wizard.ts`). |
| Domain objects                                | The fixtures in `test/fixtures/` (`mentorshipRequest()`, `program()`, `mentorProfile`, `memberFixture()`…). Search before writing a new one.                                                                          |
| Backend and axios responses                   | `createAxiosResponse` (`test/fixtures/health.ts`); `backendResponse`, `backendRefusal`, `guardRefusal` (`test/fixtures/route-handlers.ts`).                                                                           |
| Sessions                                      | `appSession()`, `backendUser()` (`test/fixtures/session.ts`).                                                                                                                                                         |
| A typed callback                              | `vi.fn<Type["callback"]>()`.                                                                                                                                                                                          |
| Index access under `noUncheckedIndexedAccess` | `expectLength(items, n)` and `itemAt(items, i)` from `test/fixtures/list-assertions.ts`.                                                                                                                              |
| A forged actor id                             | `withForgedActor(input)` (`test/fixtures/forged-actor.ts`).                                                                                                                                                           |

If a mock is hard to type, that usually means the test stubs more than it should, or the source type is wrong. Fix
the cause rather than casting.

## Rendering helpers

`test/test-utils.tsx`:

- `renderWithQueryClient(ui)` renders with a fresh `QueryClient` (no retries).
- `createTestQueryClient()` for `renderHook` wrappers.
- `<InLocale locale="tr">` wraps a tree in the real messages for that locale.

`test/setup.ts` adds what jsdom lacks (Web Crypto and streams in the vm pool, `matchMedia`, `scrollIntoView`, a
`getComputedStyle` fallback) and the jest-dom matchers. Add a missing browser API there, once, rather than guarding
for it in `src`.

## Route handler tests

`test/app/api/body-validation.ts` is a table-driven harness. A route's validation cases are one table: a valid body
with the exact backend call it must produce, and named invalid bodies that must answer 400 without calling the
backend. Add a row when you add a field.

## Running tests

| Command                               | Use                                                             |
| ------------------------------------- | --------------------------------------------------------------- |
| `npx vitest run test/lib/foo.test.ts` | One file while you work.                                        |
| `npm run test:watch`                  | Watch mode.                                                     |
| `npm test`                            | The whole suite in the fast `vmForks` pool (about 30 s).        |
| `npm run test:coverage`               | What CI runs: the `forks` pool, V8 coverage and the thresholds. |

## Coverage

`vitest.config.mts` sets floors for statements, branches, functions and lines just under the measured coverage. CI
fails when a change drops below them. Raise them when coverage grows; never lower them to get a change through.

## End-to-end tests

Playwright tests in `e2e/` drive a real stack: the backend from `metu-menton-backend` (its own `compose.yml`, run as
the project `metu-e2e`) and this app's production build. Unit tests stay the place for logic; an end-to-end test
covers a whole journey or a deployment rule.

There are two kinds, each with its own build of the stack (`E2E_MODE`):

| Project | `E2E_MODE`        | Built like                                                                                 | Specs                                            |
| ------- | ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `gates` | `gates` (default) | a server: no `dev` profile, no persona login, no Firebase                                  | `edition-gates.spec.ts`, `dev-login-off.spec.ts` |
| `flows` | `flows`           | a developer's machine: the persona login on, signed in through a Firebase **test** project | `*.flow.spec.ts`                                 |

```bash
E2E_BACKEND_DIR=../metu-menton-backend e2e/stack.sh up   # backend on :8097 (Postgres :5447, Redis :6387)
set -a; . e2e/.stack/web.env; set +a                       # the web values the stack expects
npm run build && npm run e2e -- --project=gates            # starts the app on :3300 and runs the tests
E2E_BACKEND_DIR=../metu-menton-backend e2e/stack.sh down  # removes containers, volumes and the image
```

For the journeys, start the stack with `E2E_MODE=flows` and the test project's service account and web config
(`E2E_FIREBASE_CREDENTIALS_FILE` and `E2E_FIREBASE_WEB_ENV`, or the `E2E_FIREBASE_*` values CI uses; see the top of
`e2e/stack.sh`), then run `--project=flows`.

- Every run gets fresh random secrets in `e2e/.stack/` (git-ignored, owner-only, removed by `down`). The service
  account only ever goes there; never print it, commit it or point the stack at a real project.
- A journey sets its scene through the backend (`e2e/support/backend.ts`: the service credential and the acting
  person's id) and checks what matters through the screens. `e2e/support/database.ts` moves a row's clock where
  waiting is not possible, such as an Office Hours request that should be four days old.
- Chromium only: `npx playwright install chromium` once.
- Tests use fake data only (personas, `.invalid` and `@example.test` addresses) and never real accounts.
- The repository is public: a failed CI run keeps screenshots and the HTML report, never traces or videos, which
  would carry request headers and tokens.
- CI: `.github/workflows/e2e.yml` runs on pushes to `main`, nightly, by hand, and on every pull request except
  docs-only ones (one run per branch; a new push cancels the old one). The `e2e` job runs the gates; `e2e-flows` runs
  the journeys with the test project's secrets, and skips with a notice for a fork's pull request or when they are
  not set. Neither is a required check yet.
  - The stack is always **backend `main`**, so a web PR whose backend half is not merged yet can fail for that reason.
    To test against that branch first, run the workflow by hand ("Run workflow") with `backend_ref` set to it.
  - The service-account secret is an environment variable of only the two steps that need it (not `npm ci`, the
    build or the tests). While the stack runs it is also on disk in the owner-only `e2e/.stack/backend.env`, which the
    later steps could read: anyone who can push a branch here can reach it, so treat it as a test-project key only.
  - In flows mode `stack.sh` also makes the E2E staff logins (`e2e/support/staff-logins.mjs`): `e2e-admin` and
    `e2e-coordinator` (`@example.test`) in the test project only, bootstrapped as ADMIN and COORDINATOR.
    `signInAsStaff` signs them in with e-mail and password, without `fill`, whose value the HTML report would show.
  - A journey builds on its earlier steps in one database: run it on a fresh stack (`down`, then `up`), and it is not
    retried (`retries: 0` for flows).
