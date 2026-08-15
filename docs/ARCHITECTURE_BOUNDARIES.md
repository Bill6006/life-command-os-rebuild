# Architecture boundaries

Canonical plan section 34: "Exact folder names can vary; ownership boundaries
cannot."

Folders are created when there is real code to put in them, not in advance. What
follows is the ownership contract each module takes on when it appears.

## `src/domain/` — meaning

Record meanings, semantic entities, validation, time semantics.

Knows nothing about storage, React or the DOM. Pure and directly unit-testable.
`tests/unit/architecture-guards.test.ts` fails the build if that stops being
true, if a stray `Date.now()` appears here, or if `localStorage` is mentioned.

_Exists. Phase 1: branded time semantics, four-state knowledge, nineteen record
kinds, fifteen entity kinds, privacy classes, the concept registry, the
recommendation renderer and the JSON boundary._

## `src/memory/` — canonical storage

Canonical record store, derived projections, migrations.

Canonical records are the source of truth. Derived state must always be
rebuildable from them, and a corrupted cache must never corrupt lifetime history
(section 14) — projections are pure folds, the cache is read-through only, and
an entry whose fingerprint does not match is discarded rather than trusted.

Depends on `src/domain/` and never the other way round.

_Exists. Phase 1: the canonical store interface, an IndexedDB adapter and an
in-memory one, supersession, fact resolution, projections, the snapshot document
and the migration runner._

## `src/intelligence/` — the one brain

Fact resolution, context assembly, coverage, candidate generation, evaluation,
arbitration, learning, explanation.

There is exactly one arbitration path (section 17.2). Domain modules contribute
facts, interpretation, constraints and candidates; no domain module may present
a competing final recommendation.

_Created in Phase 2._

## `src/features/` — owner surfaces

Now, Life, Timeline, Insights, Data/Exports, QA.

Features read from intelligence and memory. They never own decision logic, and a
recommendation's subject arrives as a structured reference — never as free text
the UI has to guess a subject from (section 13.4).

_Now, Life, Timeline, Insights and More exist as shells from Phase 0. The QA
laboratory arrived in Phase 1: it lives behind More, loads as its own chunk, and
resolves to Now in a production build._

## `src/synthetic/` — invented histories

The scenario library. No React, no DOM. Scenarios emit JSON documents rather
than object graphs, so loading one goes through the same parser a pasted file
uses — section 60's warning that fixtures must not make hardcoded logic look
correct.

Shared by the QA laboratory and by `tests/synthetic/`, which is why it is not
inside either.

Everything here is invented. Real owner data never enters this repository
(section 39).

_Created in Phase 1._

## `src/platform/` — the app as a deployed thing

PWA, deployment, build identity, update handling, routing.

_Exists._

## `tests/`

- `tests/unit/` — pure domain semantics, time logic, coverage, ranking
- `tests/contract/` — record schemas, entity references, import/export, migration, privacy
- `tests/synthetic/` — golden intelligence scenarios (G-001 … G-014)
- `tests/browser/` — real owner flows at phone and desktop widths
- `tests/adversarial/` — malformed data, races, double taps, timezone, DST, long histories

Fixtures are synthetic only. Real owner data never enters this repository
(section 39).

## `docs/`

- `CANONICAL_REBUILD_PLAN.md` — the governing authority, copied verbatim
- `DECISION_LOG.md` — decisions and their reasons
- `PHASE_STATUS.md` — current phase acceptance report
- `DEFECT_LEDGER.md` — verified defects and regressions
- `NEXT_PROMPT.md` — the next intelligence level, conversation instruction and copy/paste prompt
- `ARCHITECTURE_BOUNDARIES.md` — this file
