# Phase status

Report format: canonical plan section 58.

---

# Phase 2 — Intelligence tournament + first real Now

**Status: YELLOW — repaired three times after three phone passes, waiting on the next.**

Section 47's gate is not automated. It ends with a person opening the app on a
real phone and judging whether the recommendation is any good, and it fails if
the honest answer is generic, dumb, vague, too many questions, doesn't
understand what it is talking about, looks lifeless, or technically valid but
not useful.

**Three phone passes have found eleven defects between them, and been right
about every one.** DEF-0005 to DEF-0016 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).

The first pass found the sharpest, DEF-0006: a walk explained by a sleep figure
that had contributed nothing to the decision. The owner's phrase — "rationalizing
the winner afterward" — was exactly right, and no automated check here would
have caught it, because every sentence involved was individually true.

The second pass was a diagnosis rather than a bug report, and it found two
things the first repair had introduced. DEF-0009: requiring two of a question's
answers to move the outcome made every two-option question unaskable, so "Is she
with you tonight?" was never asked — while answering yes turned a solo walk into
an afternoon with his daughter. DEF-0010: guide answers all claimed to have been
written down at the same instant, leaving "the answer you gave last"
unanswerable and a stopping rule removing an arbitrary one.

It also found that one of the repair's own regressions was vacuous — the copy
sweeps only inspected decisions made before any answer, and the branch they were
meant to guard is only reachable after one. They now run a second time with each
possible first answer given, which is what the owner was doing when they found
it.

The third pass asked two questions rather than reporting two bugs, and the
answers went opposite ways. The guide asking "Is Adaya with you tonight?" was
correct behaviour on a fixture that had left out the owner's custody arrangement
— DEF-0015, a scenario defect with no engine change. "Saturday afternoon" at a
quarter to six was a word rather than a boundary: 18:00 stays the evening for
every decision the engine makes, and only the display moved (D-040). Inspecting
the second of those turned up DEF-0016, which is open and deferred.

Everything below has been re-run since the repairs. What is below is everything
that _can_ be checked, and it all holds; the phone test is still the gate.

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

| Gate                                      | Result                                         |
| ----------------------------------------- | ---------------------------------------------- |
| Privacy scan                              | Clean, 120 tracked files                       |
| Format (Prettier)                         | Pass                                           |
| Lint (ESLint)                             | Pass, 0 warnings                               |
| Typecheck (strict TS)                     | Pass, 0 errors                                 |
| Unit / contract / synthetic / adversarial | 330 passed / 330 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 120 passed / 120 — 40 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI                            |

### Where the 330 sit

| Suite                                                          | Tests |
| -------------------------------------------------------------- | ----: |
| `unit/intelligence-kernel` — readers, direction, moves, order  |    30 |
| `unit/time` — instants, civil dates, weeks, DST                |    20 |
| `unit/registries` — ids, domains, concepts, privacy            |    19 |
| `unit/knowledge` — the four states, freshness, asking          |    18 |
| `unit/architecture-guards` — the boundaries and the copy sweep |    18 |
| `unit/store` — append semantics, supersession                  |    14 |
| `unit/buildInfo`                                               |    11 |
| `unit/routing`                                                 |    11 |
| `unit/recommendation` — rendering and refusal                  |    10 |
| `contract/projections` — rebuildability, migrations            |    11 |
| `contract/round-trip` — 19 record kinds, lossless              |     8 |
| `contract/legacy-quarantine` — preserved and inert             |     6 |
| `synthetic/model-guardrails` — section 18's fence              |    17 |
| `synthetic/g008` — a non-career weekly direction               |    15 |
| `synthetic/no-hidden-genericity` — sections 61 and 64          |    19 |
| `synthetic/g005` — sleep beats ambition, both ways             |    12 |
| `synthetic/g009` — unknown is unknown                          |    12 |
| `synthetic/adaptive-guide` — one question at a time            |    32 |
| `synthetic/g011` — timezone and week boundary                  |     9 |
| `synthetic/g001` — no orphan pronoun                           |     8 |
| `synthetic/intelligence-tournament` — section 18's choice      |     8 |
| `synthetic/g002` — durable family context                      |     7 |
| `adversarial/malformed-history`                                |     9 |
| `adversarial/malformed-records`                                |     7 |

## Gate checklist (section 47, and the phase brief)

| Requirement                                                | Status                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| G-001, G-002, G-009, G-011 still pass, unchanged           | Pass — 36 tests, none of them edited this phase                     |
| G-005 passes as an automated synthetic scenario            | Pass — and its counterexample passes with it                        |
| G-008 passes as an automated synthetic scenario            | Pass — four directions, one uncategorised, one expired              |
| The decision trace shows the facts and how each is known   | Pass — concept, state, reading, what it was used for, source rows   |
| …the candidates                                            | Pass — every move proposed, by which generator, and why             |
| …which were filtered and why                               | Pass — reason and a plain-language explanation per rejection        |
| …the ranking                                               | Pass — fifteen dimensions per move, each with its value and a note  |
| …the chosen move                                           | Pass — opened by default in the inspector                           |
| …what would change the answer                              | Pass — measured by re-running the decision under each answer        |
| Two different profiles get different wording and reasoning | Pass — enforced across every scenario, not a sample                 |
| A deterministic baseline architecture                      | Pass                                                                |
| A model-assisted or hybrid architecture, if feasible       | Pass, with a caveat — see D-025                                     |
| The tournament is written down                             | Pass — D-024, and the table is printed by the test that produced it |
| A Now surface with the move, its reason and its state      | Pass                                                                |
| One adaptive guide flow                                    | Pass — one question, recompute, stop when it knows enough           |
| CI green                                                   | Pass                                                                |
| `npm run verify` from a clean checkout                     | Pass                                                                |
| Preview deploys automatically, SHA matches                 | Pass                                                                |
| **The owner tests the slice on a phone and accepts it**    | **Outstanding — three passes, eleven defects, ten repaired**        |

## What changed

### `src/intelligence/` — the kernel

Ten modules and one entry point. `decide(view, moment)` assembles the situation
from resolved facts, generates candidates from what is actually in the owner's
history, filters what does not fit and records why, scores what is left across
fifteen dimensions, chooses one move or a valid non-action, and explains it in
the owner's own particulars. Pure and clock-free: the moment is an argument.

Two boundaries inside it are enforced rather than described. The evaluator and
the arbiter contain no life area by name (D-030), which is what makes G-005 and
G-008 pass for the right reason. And nothing under `src/features/` can reach the
parts that decide — a surface asks the engine or it gets nothing.

### The tournament

Deterministic baseline against a hybrid with a semantic advisor between ranking
and choosing. Both scored 60 of 60 and chose identically on all ten profiles, so
the simpler one is selected (D-024). The advisor demonstrably fired rather than
sitting silent, which is what makes "they agreed" mean something. Section 18's
guardrails are tested by an advisor that tries to break every one of them: it
names moves nobody proposed, asks for adjustments a thousand times the cap,
speaks with certainty it has not earned, and throws. The decision does not move.

### `src/features/now/` — Now

The premise, one move, why it in the owner's own numbers, the time it takes,
what it was chosen over, what is still unknown, and where the move stands. Under
it, the guide: one question, and only when the answer would land somewhere
different.

### `src/features/qa/` — the inspector

Section 35's list, filled. Plus an architecture selector, so the tournament's two
candidates can be compared by hand on any scenario.

### Navigation

More leaves the bottom bar (D-028). Four primary destinations, as section 5 says.

**Product behaviour changed:** yes — the app makes a decision and explains it,
and asks a question when one would help.
**Semantic behaviour changed:** yes — this phase is the reasoning.

## Phone check (this is the gate)

Open Preview. Header → **More** → **Open the QA laboratory**, load a scenario,
then tap **Now**.

1. **Three broken nights, and a deadline.** Now should say _"Take tonight as
   recovery — no subnetting session."_ with a reason in hours, _Chosen over_ the
   career rep it declined, and _Why this one_ — "Answers what is actually in the
   way." The week is deliberately pointed at career and the CCNA goal is live:
   if career had won, G-005 would have failed.
2. **The same week, properly slept.** Same goal, same bad session yesterday,
   three good nights instead of three bad. The career move should win.
3. **A week pointed at the house.** Four live options — a room, a daughter who
   is here, a topic that is behind, capacity for a walk. It should pick the
   kitchen and say the week is about a calmer house.
4. **Two ordinary weeks.** A fortnight of sleep and nothing about how you feel,
   so Now should say there is nothing to suggest _yet_ — and say plainly that
   the history is not the problem. Answer _Plenty_ and it becomes a walk,
   explained by the thing it just asked rather than by whatever number was
   nearest. That is DEF-0006 fixed, end to end.
5. **A settled arrangement, and one week away.** It should never ask whether
   Adaya is with you — and there should be no "Time" row, no "Still unknown",
   and no "Where this stands".
   5b. **A month of history, three weeks ago.** Every reading in it has expired and
   the custody arrangement has not, so it should act on the arrangement and
   never ask about it. Between 17:00 and 18:00 the premise should read "late
   afternoon" while the moves on offer stay exactly what they are at four.
6. **Life, Timeline, Insights.** No phase numbers anywhere, and nothing claiming
   a part of the app is missing that is not.
7. Back in QA, open **Ranking** and **What would change the answer** on any
   scenario.

What to judge is section 47's list: is it specific, does it understand what it
is talking about, is it useful, does it ask too much, does it look alive.

## Deliberately not built

- **The recommendation lifecycle** — accept, decline, can't-now, outcome capture
  and learning. Phase 3, and D-029 says why a button that records an event
  nothing learns from would be worse than no button.
- **The coverage engine** — Phase 4. Nothing yet notices that a life area has
  gone quiet for a month, so the `stale-evidence` trigger exists but is barely
  reachable.
- **Live model inference** — D-025. The hybrid path is complete and validated;
  what is missing needs an owner decision about a hosted endpoint.
- **G-004 and G-014** — Phase 3 by the brief. The engine can already produce a
  valid non-action and does so on two scenarios, and the social generator
  exists; neither is gated here.
- Domain pages (Phase 5), Timeline and Insights content (Phase 6), exports and
  backup (Phase 7), the legacy importer (Phase 8), the service worker (Phase 10).

## What the phone test changed

| The owner said                                    | What it turned out to be                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Do not ask for what the app already knows         | DEF-0005 — a row labelled "Time" carrying the move's own length, beside a guide asking for the owner's                |
| The walk's reasoning is not credible              | DEF-0006 — the explanation could cite any fact, and the walk should not have been proposed without a capacity reading |
| Tell me why this beats the realistic alternatives | Now shows what it was chosen over and the dimension that decided it, taken from the ranking (D-035)                   |
| Stale placeholder copy on owner surfaces          | DEF-0007 — five phase strings across four screens, one of them false                                                  |
| Do phase numbers belong on owner screens at all   | No. One constant, two surfaces, a guard (D-034)                                                                       |
| Ask only what could actually change the answer    | DEF-0008 — the guide asked in list order and kept going after answers stopped moving anything                         |
| "Where this stands: New tonight" and similar      | Removed, along with "Still unknown" — both were the app talking about itself                                          |

Nothing in the "do not weaken" list moved: four primary tabs, More secondary, QA
reachable, unknown still unknown, one question at a time, the semantic subject
intact, and every Phase 1 guarantee still asserted.

## Open defects

None. Six were found and closed during the phase — DEF-0003 to DEF-0008, in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md). Four of the six came from the phone
test, which is the argument for the gate being a person rather than a suite.

## Deferred, with reasons

- **Outcome-earned move profiles.** `moves.ts` holds priors, and says so
  (D-023). Phase 3 replaces them with what actually happens to this owner.
- **A richer limiter set.** Three today: recovery, capacity, time. Stale
  coverage is the obvious fourth and belongs with the engine that can see it.
- **Free-text constraints are shown, not enforced.** A constraint the owner
  wrote — "no gym until the shoulder settles" — is attached to any move that
  leans on the same concept and displayed, because guessing which moves it
  forbids would be inventing a rule they did not state.
- **`hold` is never generated.** A non-action is an arbitration outcome rather
  than a candidate, so the verb is only exercised by G-001's sweep.

## Decisions made

D-021 … D-041 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 3 — the recommendation lifecycle and outcome learning.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

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
| Checkpoint SHA       | `1c8dd08`                                                   |
| Deployed Preview SHA | identical                                                   |
| Do they match?       | Yes, by construction — D-004                                |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

## Verification

| Gate                                      | Result                                       |
| ----------------------------------------- | -------------------------------------------- |
| Privacy scan                              | Clean                                        |
| Format (Prettier)                         | Pass                                         |
| Lint (ESLint)                             | Pass, 0 warnings                             |
| Typecheck (strict TS)                     | Pass, 0 errors                               |
| Unit / contract / synthetic / adversarial | 188 passed / 188 (in plain Node, no DOM)     |
| Browser tests (Playwright)                | 78 passed / 78 — 26 tests × 360, 430, 1280px |
| Production build                          | Pass                                         |
| `npm run verify` from a clean checkout    | Pass                                         |
| Deployed SHA matches checkpoint           | Asserted live in CI                          |

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
entities, relationships, unreadable rows and history.

**Product behaviour changed:** yes — there is a memory now, and a way to look at
it.
**Semantic behaviour changed:** yes — this phase is the semantics.

## Open defects

None. Two were found and closed during the phase — DEF-0001 and DEF-0002.

## Decisions made

D-011 … D-020 in [`DECISION_LOG.md`](DECISION_LOG.md).

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
