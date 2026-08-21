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

Context assembly, direction, candidate generation, constraints, evaluation,
arbitration, explanation, the decision trace, the adaptive guide, and — from
Phase 3 — the recommendation lifecycle, outcome windows and outcome learning.
Fact resolution lives one layer down, in `src/memory/` (D-011).

Pure and clock-free, like the layers below it: the moment is an argument, so
time travel reaches the engine rather than stopping at the screen that offers
it. The same guards that hold `domain/` and `memory/` to no wall clock, no
`localStorage` and no React now cover this folder too.

There is exactly one arbitration path (section 17.2), and it is structural
rather than promised. `arbitrate.ts` is the only place a move is chosen, and
`tests/unit/architecture-guards.test.ts` fails the build if anything under
`src/features/` imports the generator, the filter, the evaluator, the arbiter,
the advisor or the learner. A surface can ask the engine; it cannot do the
deciding.

**The line inside the folder is between deciding and recording.** Phase 3 opened
three modules to surfaces — `lifecycle`, `outcomes` and `corrections` — because
none of them chooses anything. They turn a tap into canonical records and work
out when a result is due, which is the surface's own job: a button has to be
able to write down what the owner did. `learning` stays closed even though it
also chooses nothing, because it is part of how a move is ranked, and a surface
reading it directly could put a number on screen that the arbitration never saw.

Phase 4 added two on the same side of that line. `derived` turns history the app
already holds into outcome records; `growth` turns the owner's answer to a
suggestion into one. Note which half of `growth` a surface actually touches —
the suggestion arrives on the `Decision`, through the engine like everything
else, and what Now imports is the function that writes the answer down.

`coverage` is deliberately **not** open, and it is the more interesting case
because a surface genuinely needs it: the Life overview is a report on it. It is
reached through `situation`, which every surface already has, so the status Life
shows is the object the decision on Now was made from rather than a second
computation over the same history. Two of those would eventually disagree, and
the owner would have no way to tell which screen was lying.

Phase 6 added `insights`, and it is the sharpest test of that line yet: it reads
what has been _learned_, which is exactly why `learning` is closed. It is open
anyway, because it does not have the property the closure exists to prevent. A
surface reading `learning` directly could put a number on screen the arbitration
never saw; `insights` cannot, because it never builds an index — it is handed
`situation.learning`, the one the decision was made from, and takes its raw
counts over the episode set that same index selects (`comparableEpisodes`, now
exported from `learning.ts` for that purpose). Three imports are forbidden to it
and the guard fails the build on each: the deciding pipeline, so it has nowhere
to obtain a recommendation; `renderRecommendation`, so a card physically cannot
print an instruction; and `buildLearning`, so it cannot compute a belief of its
own (D-085).

Three further boundaries hold inside the folder:

- the evaluator and the arbiter know no life area by name (D-030) — they judge
  what a move demands, costs and pays back, and the domain flows through as
  data;
- the engine may name its own routines and never the owner's life (D-021);
- declines, inabilities and outcomes reach three different learned quantities
  and cannot reach each other's (D-045). Section 20's first two rules are held
  by the code paths not meeting rather than by anyone remembering them.

_Created in Phase 2. Phase 3 added `lifecycle.ts`, `outcomes.ts`, `learning.ts`
and `corrections.ts`. Phase 4 added `coverage.ts`, `derived.ts` and `growth.ts`.
Phase 6 added `insights.ts`._

## `src/features/` — owner surfaces

Now, Life, Timeline, Insights, Data/Exports, QA.

Features read from intelligence and memory. They never own decision logic, and a
recommendation's subject arrives as a structured reference — never as free text
the UI has to guess a subject from (section 13.4).

The canonical store and the moment being asked about live in one provider above
the shell (D-027), so every surface reads one history at one moment.

Only `src/features/qa/` may import `src/synthetic/`. The QA screen is a separate
chunk a production build never downloads, and one import from elsewhere would
put ten invented lives into the main bundle with no symptom but a larger file —
so a guard fails the build on it.

_Now, Life, Timeline, Insights and More exist as shells from Phase 0. The QA
laboratory arrived in Phase 1: it lives behind More, loads as its own chunk, and
resolves to Now in a production build. Phase 2 gave Now a real engine and the
adaptive guide, and took More out of the bottom bar (D-028)._

**One rule about numbers is enforced here rather than remembered.** Exactly one
component may render a percentage — `src/features/evidence/EvidencePieces.tsx` —
and it takes the whole `MeasuredRate`, so the figure, the sentence naming what
it measures, and the count it is over cannot be separated on the way to a
screen. Every other owner surface fails the build on a per-cent sign or on
multiplying by a hundred; the QA laboratory is exempt because its job is the
machinery (D-084, section 51).

_Phase 6 added `src/features/timeline/`, `src/features/insights/`,
`src/features/evidence/` (the shared deeper-evidence components) and
`src/features/history/` (`describe.ts` — one canonical record as one line,
shared by Timeline and a domain page's "Recently" panel, which differ only in
which record kinds they ask for and what discretion they owe, D-088). Timeline
is the only primary destination with no action on it at all, which is how
section 26's "never create a phantom actionable item from corrupt data" is held
— there is nothing on the surface for a corrupt row to produce (D-087)._

_Phase 5 added the ten domain pages under `src/features/life/`. `domainPages.ts`
is a plain feature-local module, not part of `src/intelligence/` — it decides
nothing, only groups a `Situation` (already assembled by the engine) by domain
into what a page reads: coverage from `situation.coverage`, goals from
`situation.direction.goals`, concept readings from `situation.view.facts`, and
recent changes from `situation.view.history.effective`. A domain page's
correction controls write through `corrections.ts`, already open to surfaces._

## `src/synthetic/` — invented histories

The scenario library. No React, no DOM. Scenarios emit JSON documents rather
than object graphs, so loading one goes through the same parser a pasted file
uses — section 60's warning that fixtures must not make hardcoded logic look
correct.

Shared by the QA laboratory and by `tests/synthetic/`, which is why it is not
inside either.

It imports `src/intelligence/lifecycle.ts`, and only for the shape of a written
episode — the derived recommendation id and the decline reason the app itself
writes. That dependency looks backwards and is deliberate: a fixture the engine
learns from must be one the running app could actually have produced, and
duplicating the id rule here is precisely the failure section 60 warns about.
Nothing in this folder asks the engine anything.

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
- `qa/README.md` — the independent QA protocol (D-077), which governs how a
  phase reaches GREEN from Phase 5 onward
- `qa/PHASE_XX_QA_HANDOFF.md` — one report per phase, written by the QA
  conversation and read by the builder. Only QA writes these.
