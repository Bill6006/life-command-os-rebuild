# Phase status

Report format: canonical plan section 58.

---

# Phase 3 — Recommendation lifecycle + outcome learning

**Status: YELLOW — everything that can be checked passes. The owner has not
tested the loop on a phone yet, and that is the gate.**

Section 48's goal is one sentence: complete the loop. A recommendation the owner
acts on, an outcome that gets observed, and learning that changes what happens
next. All three exist and are wired to each other through canonical records —
there is no side channel anywhere in it.

Six of the gate's items are automated and pass. Three are judgements a suite
cannot make: whether the phone flow feels fast, whether the buttons are the
right buttons, and whether the app saying "clearing the kitchen has worked a few
times in situations like tonight" reads as intelligence or as a machine
flattering itself. Phase 2's gate was failed four times by the owner on a phone
and eleven of that phase's fifteen fixed defects came out of those passes. There
is no reason to expect fewer here.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | identical to `main` HEAD                                    |
| Do they match?       | Yes, by construction — D-004, and verified live by hand     |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

## Verification

| Gate                                      | Result                                         |
| ----------------------------------------- | ---------------------------------------------- |
| Privacy scan                              | Clean, 126 tracked files                       |
| Format (Prettier)                         | Pass                                           |
| Lint (ESLint)                             | Pass, 0 warnings                               |
| Typecheck (strict TS)                     | Pass, 0 errors                                 |
| Unit / contract / synthetic / adversarial | 420 passed / 420 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 138 passed / 138 — 46 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand     |

### Where the 420 sit

Phase 2 ended at 330. The 90 new ones are almost all about the loop.

| Suite                                                            | Tests |
| ---------------------------------------------------------------- | ----: |
| `synthetic/outcome-learning` — section 20, rule by rule          |    35 |
| `synthetic/adaptive-guide` — one question at a time              |    34 |
| `unit/intelligence-kernel` — readers, direction, moves, order    |    30 |
| `synthetic/lifecycle` — episodes, double taps, outcome windows   |    24 |
| `unit/time` — instants, civil dates, weeks, DST, day blocks      |    20 |
| `unit/registries` — ids, domains, concepts, privacy              |    19 |
| `synthetic/no-hidden-genericity` — sections 61 and 64            |    19 |
| `unit/knowledge` — the four states, freshness, asking            |    18 |
| `unit/architecture-guards` — the boundaries and the copy sweep   |    18 |
| `synthetic/model-guardrails` — section 18's fence                |    17 |
| `synthetic/g008` — a non-career weekly direction                 |    15 |
| `unit/store` — append semantics, supersession                    |    14 |
| `synthetic/g005` — sleep beats ambition, both ways               |    12 |
| `synthetic/g009` — unknown is unknown                            |    12 |
| `unit/buildInfo`                                                 |    11 |
| `unit/routing`                                                   |    11 |
| `contract/projections` — rebuildability, migrations              |    11 |
| `synthetic/g004` — a social opportunity                          |    10 |
| `unit/recommendation` — rendering and refusal                    |    10 |
| `synthetic/recovery-has-somewhere-to-go` — DEF-0016 and DEF-0017 |    10 |
| `synthetic/g011` — timezone and week boundary                    |     9 |
| `adversarial/malformed-history`                                  |     9 |
| `synthetic/g001` — no orphan pronoun                             |     8 |
| `synthetic/intelligence-tournament` — section 18's choice        |     8 |
| `contract/round-trip` — 20 record kinds, lossless                |     8 |
| `synthetic/g002` — durable family context                        |     7 |
| `synthetic/g014` — no action is a real answer                    |     8 |
| `adversarial/malformed-records`                                  |     7 |
| `contract/legacy-quarantine` — preserved and inert               |     6 |

## Gate checklist (section 48, and the phase brief)

| Requirement                                              | Status                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| G-001, G-002, G-005, G-008, G-009, G-011 pass, unchanged | Pass — 63 tests, and the six files are byte-identical to `79d033b`  |
| G-004 passes as an automated synthetic scenario          | Pass — 10 tests, including the no-quota sweep                       |
| G-014 passes as an automated synthetic scenario          | Pass — 8 tests, including the counterexample                        |
| A completed action demonstrably changes later reasoning  | Pass — same evening, same options, different winner                 |
| A decline is not mislabelled ineffective                 | Pass — and structurally, not by convention (D-045)                  |
| Can't-now changes the situation appropriately            | Pass — reaches follow-through and neither of the other two          |
| One event does not become proof                          | Pass — one comparable evening moves the belief a quarter of the way |
| The semantic subject survives through the follow-up      | Pass — the question is the renderer's own follow-up                 |
| A double tap creates no duplicate episode                | Pass — three separate guards, each tested (D-042, D-052)            |
| The phone flow feels fast                                | **Owner judgement — not yet made**                                  |
| CI green                                                 | Pass                                                                |
| `npm run verify` from a clean checkout                   | Pass                                                                |
| Preview deploys automatically, SHA matches               | Pass — verified live against `main` HEAD                            |
| **The owner tests the loop on a phone and accepts it**   | **Not yet — this is the gate**                                      |

## What changed

### `src/intelligence/lifecycle.ts` — episodes

An episode is one suggestion, on one day, and everything that became of it. It
is identified by what it is about rather than by the record that created it,
which is what makes a duplicate episode unrepresentable rather than prevented
(D-042). Five states, and only `completed` is terminal: saying "not tonight" and
doing it anyway is an ordinary evening, and an app that refused to record the
second half would be wrong about the owner's life in order to be tidy about its
own state machine.

Nothing is written until the owner acts (D-043).

### `src/intelligence/outcomes.ts` — windows

A result is asked for when there is one to give. A recovery night judged at
23:05 would collect an answer about intent, and an answer about intent recorded
as an outcome is worse than none: it looks exactly like evidence. So a
`protect-sleep` is judged the next morning and a kitchen reset twenty minutes
later, and the difference comes from the move rather than from a rule.

Windows close, because asking on Thursday about Tuesday is asking someone to
invent something. Section 20's "outcome unknown" is a real and acceptable state.

### `src/intelligence/learning.ts` — what actually happened

D-023 discharged. The priors in `moves.ts` are pulled toward this owner's own
outcomes by `n / (n + 3)`, weighted by how much an evening resembles tonight and
gently by how long ago it was — similarity dominating recency, which is section
20's "context similarity matters" read literally.

Three learned quantities, and the separation is the point. Outcomes reach
`effect`. Inabilities reach `follow-through`. Declines reach `appetite` and
`owner-preference`, and can reach nothing else. Section 20's first two rules are
held by the code paths not meeting.

### `src/intelligence/corrections.ts` — section 62

A `belief-correction` is a watershed: everything the owner has already seen and
disagreed with stops counting, and what happens afterwards counts normally. It
is offered beside the decision it moved, because a belief the owner cannot see
is a belief they cannot correct.

### Now

Start, done, not tonight, can't right now, something else. A started move stays
in front of the owner until they settle it (D-049). A result that is due comes
above everything, because it expires and answering it is what makes the next
decision better. And one line saying what the decision rests on, with a way to
disagree with it.

### The clock

`MemoryProvider` refreshes the moment when the tab becomes visible, and sets one
timer for the instant the engine says the next window opens (D-050). No polling,
and no clock below the UI — `nextOutcomeDueAt` computes an instant and compares
it to nothing.

### `src/features/qa/` — the inspector

Two new panels. **What it has learned** shows, per surviving move, where the
belief started, where it landed, how many comparable results there were and how
far they pulled it — with follow-through and appetite listed separately, so it
is visible on screen that a decline never became a claim about whether the move
works. **Episodes** lists every suggestion in the history, how it ended, whether
a result is due, and how much tonight resembles it.

**Product behaviour changed:** yes — the app can be acted on, and it remembers.
**Semantic behaviour changed:** yes — decisions now move on what happened.

## Phone check (this is the gate)

Open Preview. Header → **More** → **Open the QA laboratory**, load a scenario,
then tap **Now**.

1. **A month of what actually worked.** The headline should be the kitchen, and
   under it a line reading _"Reset a space has worked several times in
   situations like tonight."_ Tap **Not how it went** and the line goes, along
   with the belief behind it — the recommendation may change on the spot. That
   is section 62, end to end.
2. **The same scenario, in QA.** Open **What it has learned**. Clearing the
   kitchen should show four comparable results; the walk two, having moved its
   number the other way; the lab none at all, with its two interruptions under
   _Could it happen_ instead. That is section 20's separation, visible.
3. **A week pointed at the house.** Tap **Start it**. The kitchen should stay on
   screen with _Under way_ under it, rather than the app moving on to something
   else while you are at the sink. **Start it** greys out and does not move.
4. **The same, then Done.** Nothing is asked immediately. Go back to QA, press
   **+1 hour**, return to Now: _"Did the kitchen get cleared?"_ Answer it, and it
   goes.
5. **A Saturday with people in it.** _"Start one real conversation while you are
   at the climbing gym."_ No counter, no streak, nothing scored.
6. **A Thursday with nothing needing doing.** _"Nothing needs to move tonight."_
   — reached with sleep, energy, soreness and the evening's length all known.
   Judge whether it reads as an answer or as a shrug.
7. **Three broken nights, and a deadline**, at a quarter to six. Set the clock
   in QA to 17:45. It should say _"Start easing off now — the rest of today can
   be a light one."_ rather than "Nothing fits tonight." That is DEF-0016.
8. **Something else**, on any scenario, should produce a different suggestion
   rather than the same one again.

What to judge is section 47's list applied to the loop: are these the right
buttons, is it fast, does the learning line read as something the app actually
knows, and does answering a follow-up feel worth the tap.

## Deliberately not built

- **The coverage engine** — Phase 4. Nothing yet notices that a life area has
  gone quiet for a month, so `stale-evidence` remains barely reachable and the
  limiter set is still three.
- **Pause and continue.** Section 48 lists them "if needed". They are not: a
  started move already stays in front of the owner until it is settled, which is
  what pause would have been for, and a control that records an event nothing
  reads is D-029's mistake with a different label.
- **A started move that is never settled.** It stays `started` and no result is
  ever asked for. Asking "did that happen?" in a second shape when the buttons
  are already on screen would be nagging; letting it lapse silently loses the
  evidence. It needs a decision about how long is too long, which wants real use
  to answer.
- **Correcting anything but a learned effect.** Section 62 lists eight kinds of
  correction. Facts, goals, direction and domain status all belong to surfaces
  that do not exist yet (Phases 4 and 5), and inventing a screen for them here
  would be building the Life page badly and early.
- **Live model inference** — D-025, unchanged. Owner decision.
- Domain pages (Phase 5), Timeline and Insights content (Phase 6), exports and
  backup (Phase 7), the legacy importer (Phase 8), the service worker (Phase 10).

## Open defects

None. Four were found and closed during the phase.

- **DEF-0016** — the strained late afternoon, deferred by the owner at the end
  of Phase 2 and the natural first thing to build here.
- **DEF-0017** — found by sweeping DEF-0016's siblings across every hour rather
  than the one that was reported. Worse than the defect that found it: nine
  hours of sleep debt printed above the decision, and "none of it says how
  tonight is going" printed underneath.
- **DEF-0018** — found because a browser test hung rather than failed. Tapping
  **Start it** slid **Done** into the space under the finger.
- **DEF-0019** — found by printing the copy the owner would actually read rather
  than only asserting on parts of it. A move with four completions was beating
  one with no history at all, and the app was calling the difference "more
  likely to actually happen". Fixing it showed that two of this phase's own
  demonstrations had been riding on the same bonus; both fixtures now carry
  real evidence on both sides and are more honest for it.

Each regression was proved to fail with its defect reintroduced. So were all six
of section 20's rules, individually: a decline counted as ineffectiveness, an
inability counted as ineffectiveness, `PATIENCE` set to zero, the similarity
floor removed, the correction watershed disabled, and the same-block and
next-day effects collapsed into one. All six were caught.

## Deferred, with reasons

- **The older dimensions still cost weight when they know nothing.** D-048
  applies the rule to `follow-through` only. Fixing the rest means re-cutting
  the weights, which means re-running section 18's tournament.
- **`hold` is still never generated.** A non-action is an arbitration outcome
  rather than a candidate. Unchanged from Phase 2.
- **Free-text constraints are still shown, not enforced.** Unchanged from
  Phase 2.
- **Comfort is recorded and not yet used.** G-004 asks for it to be captured and
  it is, as an outcome with no sentiment. Nothing reads it yet — section 10's
  "which contexts make connection easier" is an Insights question, and inventing
  a use for it now would be inventing a finding.

## Decisions made

D-042 … D-052 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 4 — the coverage engine and adaptive guides.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 2 — Intelligence tournament + first real Now

**Status: GREEN — owner-approved on the phone.**

Section 47's gate is not automated. It ends with a person opening the app on a
real phone and judging whether the recommendation is any good, and it fails if
the honest answer is generic, dumb, vague, too many questions, doesn't
understand what it is talking about, looks lifeless, or technically valid but
not useful.

**The owner approved it on `bd2b5fa`.** They returned to Preview after 18:00
local, Now recalculated to "Saturday evening", and the recommendation and its
explanation moved to the evening context with no stale state. That is the gate,
and it is the only thing that could close this phase.

**Four phone passes found twelve defects between them, and were right about
every one.** DEF-0005 to DEF-0016 in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).
The fourth pass approved it.

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
| **The owner tests the slice on a phone and accepts it**    | **Pass — approved on `bd2b5fa` after four passes**                  |

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
- **The clock advances on load, not continuously.** `MemoryProvider` captures
  the moment once at mount, which is why returning to the app after 18:00
  recalculated correctly during the owner's approval pass. A tab left open
  across a block boundary will not notice on its own. Nothing in Phase 2 needs
  it to — every decision is a pure function of the moment it was given — but
  Phase 3's outcome windows are the first thing that will care, so it is written
  down here rather than discovered there.

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
