# Architecture boundaries

Canonical plan section 34: "Exact folder names can vary; ownership boundaries
cannot."

Folders are created when there is real code to put in them, not in advance. What
follows is the ownership contract each module takes on when it appears.

## `src/domain/` — meaning

Record meanings, semantic entities, validation, time semantics.

Knows nothing about storage, React or the DOM. Pure and directly unit-testable.

_Created in Phase 1._

## `src/memory/` — canonical storage

Canonical record store, derived projections, migrations.

Canonical records are the source of truth. Derived state must always be
rebuildable from them, and a corrupted cache must never corrupt lifetime history
(section 14).

_Created in Phase 1._

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

_Now, Life, Timeline, Insights and More exist as shells from Phase 0._

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
