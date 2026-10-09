# Quote API – QA study case

A small Quote API with known defects on purpose (`api/`) and the BDD acceptance suite that specifies
it and finds them. README.md explains the case; docs/acceptance-criteria.md lists the 30 criteria.

## Commands

- `npm test`: the blocking suite, 100 scenarios, must be green. Starts the API by itself.
- `npm run test:all`: all 121 scenarios; 21 fail on purpose (`@known-bug`).
- `npm run test:self-check`: the suite against broken and drifted stubs; must exit 0.
- `npm run typecheck`
- `npm run docs:screenshots`: runs everything and refreshes `docs/images/`.
- `npm run contract:update`: writes the contract of the code to `api/openapi.json`.
- `npm run api`: only the API, on http://localhost:3000.

## Rules of this project

- The contract (`api/openapi.json`, defined in `api/src/openapi.ts`) is right; the implementation
  breaks it on purpose. Defects are marked `KNOWN DEFECT (AC-xx)` in `api/src`. Do not fix one
  unless asked: the failing scenarios are the point of the case.
- Every scenario carries its criterion tag (`@AC-01` … `@AC-30`) and an execution tag. A scenario
  of a criterion the API does not meet also carries `@known-bug`; it runs in the `known-bugs`
  project and is never skipped.
- Expected values come from the acceptance criteria, written by hand in the feature tables, never
  computed by the test code. Money is compared with `decimal.js`.
- No sleeps, no `try/catch` around assertions, no raised timeouts, retries only in CI (1).
- When scenarios are added or removed, update the counts in README.md and in
  docs/acceptance-criteria.md (summary and traceability table), then run `npm run test:all`,
  `npm run test:self-check` and `npm run docs:screenshots`.
- README, criteria, features and code comments are in English.
