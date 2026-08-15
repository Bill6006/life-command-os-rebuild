# Phase status

Report format: canonical plan section 58.

---

# Phase 1 — Canonical records + semantic model + QA lab

**Status: GREEN.**

Section 46's gate is entirely automated. Every item passes. No owner approval
gates this phase — unlike Phase 0, and unlike Phase 2, where the owner's
judgement of the recommendation is the gate. A phone check is still worth
making, and what to look at is below.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | identical to `main` HEAD                                    |
| Do they match?       | Yes, by construction — D-004                                |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

Preview redeploys on every push to `main` that passes the gate, and the deploy
job fails if the live `build-info.json` does not serve the pushed SHA.

## Verification

| Gate                                      | Result                                       |
| ----------------------------------------- | -------------------------------------------- |
| Privacy scan                              | Clean                                        |
| Format (Prettier)                         | Pass                                         |
| Lint (ESLint)                             | Pass, 0 warnings                             |
| Typecheck (strict TS)                     | Pass, 0 errors                               |
| Unit / contract / synthetic / adversarial | 188 passed / 188 (in plain Node, no DOM)     |
| Browser tests (Playwright)                | 75 passed / 75 — 25 tests × 360, 430, 1280px |
| Production build                          | Pass                                         |
| `npm run verify` from a clean checkout    | Pass                                         |
| Deployed SHA matches checkpoint           | Asserted live in CI                          |

### Where the 188 sit

| Suite                                                 | Tests |
| ----------------------------------------------------- | ----: |
| `unit/time` — instants, civil dates, weeks, DST       |    20 |
| `unit/registries` — ids, domains, concepts, privacy   |    19 |
| `unit/knowledge` — the four states, freshness, asking |    18 |
| `unit/store` — append semantics, supersession         |    14 |
| `unit/buildInfo`                                      |    11 |
| `unit/recommendation` — rendering and refusal         |    10 |
| `unit/routing`                                        |    10 |
| `unit/architecture-guards` — the boundaries           |     9 |
| `contract/projections` — rebuildability, migrations   |    11 |
| `contract/round-trip` — 19 record kinds, lossless     |     8 |
| `contract/legacy-quarantine` — preserved and inert    |     6 |
| `synthetic/g009` — unknown is unknown                 |    12 |
| `synthetic/g011` — timezone and week boundary         |     9 |
| `synthetic/g001` — no orphan pronoun                  |     8 |
| `synthetic/g002` — durable family context             |     7 |
| `adversarial/malformed-history`                       |     9 |
| `adversarial/malformed-records`                       |     7 |

### The gate held once, on purpose

`c1a827d` was pushed after typecheck, lint and the unit suite but without
`format:check`. Prettier failed it in CI, the deploy job never ran, and Preview
stayed on the previous green commit. That is D-004 working as intended: a red
build does not reach the phone. Fixed in `ba74ad5`.

## Gate checklist (section 46)

| Requirement                                 | Status                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| G-001 no orphan pronoun                     | Pass — the case, and a sweep of every verb and reason                                           |
| G-002 durable family context                | Pass — four moments, exception overrides, nothing rewritten                                     |
| G-009 unknown is unknown                    | Pass — no false zero, average or default; questions only when material                          |
| G-011 timezone and week boundary            | Pass — five zones, both clock changes, 23- and 25-hour days                                     |
| Malformed synthetic inputs are inspectable  | Pass — reason, path and raw payload kept for every bad row                                      |
| One malformed record cannot blank a surface | Pass — in the parser, in the store, and on the QA screen                                        |
| Canonical data round-trips without loss     | Pass — 19 kinds, plus fields this version has never seen                                        |
| No full UI dependency                       | Pass — every suite below the UI runs in plain Node with no DOM in scope, and a guard asserts it |
| Preview deploys automatically               | Pass — D-004                                                                                    |

## What changed

### `src/domain/` — meaning

- **Time** (`time.ts`, `windows.ts`): instants, owner-local days, local times and
  local week identifiers as separate branded types. Civil-date arithmetic, so a
  DST day really is 23 or 25 hours long. A generalised week rule that reduces
  exactly to ISO-8601 on a Monday start. Wall-clock times that do not exist, or
  happen twice, resolve and say which. Observation, due and freshness windows
  are three different types.
- **Knowledge** (`knowledge.ts`): explicit, inferred, stale, unknown — and no way
  to ask for a default.
- **Concepts** (`concepts.ts`): fifteen concepts across all eleven domains, each
  with its own freshness horizon, privacy class and question policy.
- **Records** (`records.ts`, `build.ts`): nineteen kinds behind one versioned
  envelope, append-first, with provenance and privacy.
- **Entities** (`entities.ts`): fifteen kinds with stable deterministic ids, and
  relationships as edges.
- **Recommendation** (`recommendation.ts`): structured semantics and a renderer
  that composes the sentence from them, or refuses.
- **The JSON boundary** (`validation.ts`, `wire.ts`): nothing throws; bad rows
  become inspectable rows.

### `src/memory/` — storage and projections

Canonical store interface; IndexedDB adapter; in-memory adapter; supersession
and retraction; fact resolution; the projection mechanism with a fingerprinted
read-through cache; the snapshot document and a migration runner.

### `src/synthetic/` — invented histories

Seven scenarios, each a JSON document loaded through the same parser a pasted
file uses.

### `src/features/qa/` — the laboratory

Scenario buttons, a JSON editor, date and time travel, and an inspector over
canonical facts, inferred facts, stale facts, questions, recommendations,
entities, relationships, unreadable rows and history. Behind More, its own
chunk, absent from production.

**Product behaviour changed:** yes — there is a memory now, and a way to look at
it.
**Semantic behaviour changed:** yes — this phase is the semantics.

## Phone check (not gating)

Open Preview, then More → Open the QA laboratory.

- Tap **A topic that keeps slipping**, open Recommendations. The sentence should
  name subnetting, and so should the follow-up.
- Tap **A file with damage in it**. Five entries read; six rows did not, each
  with a reason and the row itself. Nothing else on the screen is blank.
- Tap **A settled arrangement, and one week away**, then travel forward a week.
  "Child with the owner" changes for the trip and changes back afterwards, and
  is never in the list of questions.
- Tap **Two ordinary weeks** and turn on **Show private detail**. The private row
  says "Private entry" until you ask for it.
- Load anything, then pull to refresh. The history is still there.

The QA screen is dense on purpose — it is the one surface the plan allows
technical language (section 35). Judging the product's look is Phase 2's job.

## Deliberately not built

The intelligence kernel — candidate generation, constraints, evaluation,
arbitration, explanation, learning. That is Phase 2, and section 47 requires it
to prove itself before the app grows around it. Also not built: the coverage
engine (Phase 4), domain pages (Phase 5), Timeline and Insights content
(Phase 6), exports and backup (Phase 7), the legacy importer (Phase 8), the
service worker (Phase 10).

## Open defects

None. One was found and closed during the phase — DEF-0001, in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).

## Deferred, with reasons

- **Persisted projection caches.** The mechanism is fingerprinted and
  storage-agnostic, but nothing writes it to disk yet. Performance is section 40
  and Phase 10; persisting a cache before there is a performance problem would
  add a corruption surface for no gain.
- **Nested unknown fields.** Preserved at the top of a record, refused inside a
  nested structure (D-017). If a legacy import turns out to need nested
  preservation, the `imported-legacy-record` kind already keeps whole payloads
  verbatim.
- **Confidence.** `confidenceFromSampleCount` is a deliberately coarse ladder
  with nothing depending on it. Phase 2's evaluator replaces it with something
  earned from outcomes.
- **A second inference source.** Only `observation` with `method: 'derived'`
  produces inferred knowledge today. Real inference is Phase 2.

## Decisions made

D-011 … D-020 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 2 — the intelligence tournament and the first real Now.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 0 — New repo foundation + phone preview

**Status: GREEN, owner-approved.**

## Build identity

|                       |                                                             |
| --------------------- | ----------------------------------------------------------- |
| First verified deploy | `cc6624b`                                                   |
| Stable Preview URL    | https://bill6006.github.io/life-command-os-rebuild/preview/ |

The live `build-info.json` served exactly that SHA while the production root
simultaneously served its placeholder, confirming that a preview deploy does not
move production.

## Verification

| Gate                            | Result                                       |
| ------------------------------- | -------------------------------------------- |
| Privacy scan                    | Clean                                        |
| Format, lint, typecheck         | Pass                                         |
| Unit tests                      | 19 passed / 19                               |
| Browser tests                   | 33 passed / 33 — 11 tests × 360, 430, 1280px |
| Production build                | Pass                                         |
| Deployed SHA matches checkpoint | Asserted live in CI, and confirmed by hand   |

## What it delivered

Vite + React + TypeScript on strict settings; design tokens implementing the
section 24 visual contract; the app shell with hash routing; build identity
compiled in and published as `build-info.json`; stale-build detection; CI;
Preview and production separated on two paths of the `gh-pages` branch; the
required docs, including the canonical plan copied verbatim.

**Product behaviour changed:** yes — there was an app shell to look at.
**Semantic behaviour changed:** no.

## Decisions made

D-001 … D-010 in [`DECISION_LOG.md`](DECISION_LOG.md).
