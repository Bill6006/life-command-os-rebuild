# Phase status

Report format: canonical plan section 58.

**From Phase 5 onward, a builder conversation may not approve its own phase.**
An implementation that believes it is finished reaches
**YELLOW — READY FOR INDEPENDENT QA**, and a separate conversation tests the
deployed checkpoint and writes `docs/qa/PHASE_XX_QA_HANDOFF.md` before anything
becomes GREEN. Owner decision D-077; the protocol is [`qa/README.md`](qa/README.md).

Phase 4 is the argument for it, and the record below is the evidence: every
automated gate passed, and the phone found five defects afterwards.

**The canonical plan is now v1.2** (D-079) — the independent-QA gate and the
eleven-domains/ten-pages rule are now stated directly in the plan itself rather
than only in this project's decisions, and Phase 6 gains progressively
disclosed evidence/analytics. Every handoff from here also names a recommended
**Claude model**, not only an intelligence level (D-080). Neither change
reopens Phase 4 or any completed phase.

---

# Phase 6 — Timeline + Insights

**Status: GREEN — independent QA passed.**

Six rounds. Round 1 passed section 51's gate item by item and was then
**withdrawn** — QA-A1: the app was asking the owner to perform the causal
analysis it exists to learn, and rendering his answers as percentages that
read as measurements (D-089). Round 1a's repair fixed that, and an independent
Codex cold-use audit then found five further ways the same claim-wider-than-
its-evidence failure recurred one layer down: pooled under a verb rather than
scoped to an action, read across a whole record rather than the context that
disagreed with it, silence counted as absence, "nothing else happened" said
from a check of one record kind, and no way for the owner to correct a
conclusion that was the app's own (D-091). Rounds 3 through 5 each found and
closed one more sibling in the QA laboratory's storage boundary: the
laboratory sharing a database with the owner and destroying his real history
on load (DEF-0054); a correction's action identity surviving the key but not
the sentence Timeline rendered it into (DEF-0055); a store-level publish race
that could show an empty owner history after a valid return (DEF-0057); and
the laboratory's clock, zone and week start surviving that same return and
hiding owner records dated after a fixture's instant (DEF-0058). Round 6 found
nothing new.

Per D-077, this checkpoint did not self-certify at any round. Independent QA
is Codex from Round 3 onward (D-090) — cold-use first, claim-to-evidence
second, targeted acceptance third — and every FAIL routed back to this same
builder conversation for repair before the next retest. **Nineteen semantic
regressions in `observed-relationships.test.ts`, sixty-one reintroductions
across the seven rounds of repair, all sixty-one caught.**

**The last three rounds were one defect class, not three unrelated bugs.**
"Only the newest work may publish" (DEF-0057) solved the store half of what a
reader sees; "restore the whole visible context, not only the store"
(DEF-0058) solved the other half, because `buildView(snapshot, { now, zone,
weekStartsOn })` reads all three. Both were found only because Round 4's own
regression coverage seeded the owner's row one day _before_ the fixture clock
it was tested against — a hole Codex named explicitly, and one this repair
would not have found on its own. The seed is dated after every scenario clock
now, and the deterministic coverage for it lives in
`tests/unit/memory-provider-race.test.tsx`, which drives the provider with
fake stores whose reads the _test_ holds open — because a race cannot be
proven by a browser test hoping two things overlap. Round 4's own regression
failed three-for-three focused and passed three-hundred-for-three-hundred in
the full suite on identical code; that non-determinism was the finding, and
the rule that fixes it now lives outside the component, in
`src/features/memory/projection.ts`, where it is testable as a sequence rather
than as a hope.

**D-090 and D-091 are the standing outcome.** Independent QA is permanently
Codex, cold-use first (seven-step order in `qa/README.md`); nine semantic
invariants — action identity, negative exposure, context, confounding,
correctability, tracked-state meaning, historical order, the QA/owner storage
boundary, and the temporal half of a returned projection — are codified rather
than left to be rediscovered per phase. **D-092** closes the phase alongside
them: every handoff, in both directions, ends with a model, a level, a
conversation instruction and a short copyable launcher, so the owner is never
left assembling the next prompt out of a report.

**One thing disclosed rather than buried, and it is closed.** A single unit-
suite failure on `guide-resume.test.ts` — a pure, clock-free test the Round 5
repair never touched — appeared once on a loaded machine and did not recur
across four full runs and three focused runs during the repair, nor across
Round 6's own three independent focused runs (39/39). Named in `PHASE_STATUS.md`
and in every handoff since; Codex could not reproduce it either. Recorded as
resolved-unreproduced rather than silently dropped.

**Final verification, this checkpoint.** Unit / contract / synthetic /
adversarial: 780/780 across 45 files. Browser: 312/312 across three projects.
Clean-checkout `npm run verify`: pass. Lint, format, typecheck, privacy scan:
clean. CI: green on every push from Round 3 onward. Deployed Preview SHA
matches the approved checkpoint at every round, verified independently against
`build-info.json` and against the running app.

Owner approval: **independent QA (Codex), Round 6, PASS** — the gate D-077
substitutes for self-certification at this phase.

**Round 5 status, superseded by the above: YELLOW — ROUND 5 REPAIRED, AWAITING CODEX RETEST.**

Codex's Round 5 retest confirmed the Round 4 store race repaired and the two
databases holding, and returned **FAIL** on one blocker: **R5-B1**, the
laboratory's clock surviving the return. Repaired here as DEF-0058. Full report
at [`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md) under "Round 5 —
Codex retest".

**Round 4 solved half a projection.** Only the newest work may publish the
source and the snapshot — that held. But what a reader sees is
`buildView(snapshot, { now, zone, weekStartsOn })`, and a scenario sets all
three of those before it loads anything. The return gave back the store and
left the clock behind, so a February fixture followed by **Empty the
laboratory** left every raw owner record in Storage and none of them on
Timeline: they are dated after February and had not happened yet. The notice was
gone by then, so the screen was asserting that an empty history was his.

The return now publishes **one coherent context** — owner source, owner
snapshot, system clock, system zone, default week start, `travelled` false — in
a single continuation. Restored rather than remembered, because nothing outside
the laboratory can change those; if that ever changes, it becomes a stash, and
the comment and the test both say so.

**QA also named a hole in the builder's own coverage, and it was real.** Every
Round 4 return test seeded the owner's row at 1 May and loaded a fixture clocked
2 May — one day later — so no assertion could ever observe a record hidden for
being in the future. The tests proved the store boundary and were blind to the
temporal half of the same screen. The seed is now dated August, after every
scenario clock, and the guard bites. The provider tests also ran without
`IS_REACT_ACT_ENVIRONMENT`, printing an `act(...)` warning on every render;
fixed, because a warning that noisy makes the assertions around it harder to
trust.

**Nine reintroductions across Rounds 4 and 5, nine caught** — and one escaped
first time, because the test never asserted the zone came back.

**One thing left open and reported rather than buried.** During this repair the
full unit suite failed once on `guide-resume.test.ts` → "never re-asks something
already answered", a test that is pure and clock-free and that I did not touch.
It did not recur in four subsequent full runs or three focused ones, and the
failing run was on a loaded machine. I could not reproduce it, so I cannot say
it is nothing — it is named here and in the Codex handoff rather than left to be
found again.

**Every Round 5 PASS preserved**: the two databases, fixture inspectability,
fixture-scoped writes, reload and notice behaviour, R3-B2, R3-B3, the seven
semantic invariants, QA-A1, section 51, DEF-0034–DEF-0044, the exact-three-verb
decision and every explicit deferral.

---

**Round 4 status, superseded by the above: YELLOW — ROUND 4 REPAIRED, AWAITING CODEX RETEST.**

Codex's Round 4 retest confirmed R3-B2 and R3-B3 repaired and the two databases
holding — the owner's bytes survived everything — and returned **FAIL** on one
blocker: **R4-B1**, the return from the laboratory. Full report at
[`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md) under "Round 4 — Codex
retest". It is repaired here as DEF-0057.

**This was never a storage defect.** DEF-0054's separation held and nothing of
his was lost. What was wrong was the _picture_ of his history: an append still
running against the laboratory finished after **Show mine** had emptied it, and
published that empty store. Timeline said "Nothing here yet" — directly under a
notice promising nothing of his had been changed — and kept saying it until a
reload. A reload being able to fix it does not make a false empty-history claim
acceptable.

**The rule left the component.** `src/features/memory/projection.ts` now owns
which work may put a history on screen: every operation claims a job, anything
newer makes it stale, and a stale job still finishes its write — the records are
already going somewhere real — but publishes nothing at all: not a snapshot, not
`busy`, not an error, not the source.

It left the component for a reason worth writing down. **A rule about
interleaving cannot be tested by hoping two things overlap.** QA's Round 4
regression failed three-for-three in a focused run and passed
three-hundred-for-three-hundred in the full suite, on identical code — and when
the builder ran that same focused suite here, it passed first time. A test that
tells the truth only when the scheduler cooperates is worse than no test,
because it reads as evidence either way.

So the coverage is in three layers, and only the first two are deterministic:

- `tests/unit/memory-projection.test.ts` — eight sequences over the rule
  itself, including the reported one exactly. Nothing waits for anything.
- `tests/unit/memory-provider-race.test.tsx` — the provider driven with fake
  stores whose reads the **test holds open**, so the overlap is constructed
  rather than awaited, on every run.
- `tests/browser/qa-lab.spec.ts` — both entry points, with the owner's own
  content, asserted immediately and again after a delay.

**Five reintroductions, five caught** — and three of them escaped on the first
attempt, which is what sent the rule out of the component in the first place.

**Every Round 4 PASS preserved and re-verified**: the two physical databases,
fixture inspectability across normal surfaces, fixture-scoped writes, reload
behaviour and the notice, R3-B2, R3-B3, the seven semantic invariants, QA-A1,
section 51, DEF-0034–DEF-0044, the exact-three-verb decision and every explicit
deferral.

**And a workflow decision the owner made in the same breath:** D-092 — every
handoff, in both directions, ends with the model, the level, the conversation,
and a short copyable launcher naming the exact MD file to read. The detail stays
in the repository; the owner never hunts through a report for it.

---

**Round 3 status, superseded by the above: YELLOW — ROUND 3 REPAIRED, AWAITING CODEX RETEST.**

Codex's Round 3 retest confirmed all seven of the previous round's blockers
repaired, and QA-A1 still repaired — and returned **FAIL** on three siblings the
seven had not reached. Full report at
[`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md) under "Round 3 — Codex
retest". The three are repaired here.

| Finding | What it was                                                                                                                                      | Repaired as |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| R3-B1   | Loading a QA scenario called `replaceAll` on a store the laboratory shared with the owner, destroying his real history. **The owner lost data.** | DEF-0054    |
| R3-B2   | A correction scoped to a walk, described on Timeline as "follows move" — a sentence that fits the bike ride he never disputed                    | DEF-0055    |
| R3-B3   | `emotionalState` declared `tracked` and said to participate, while `numericValue` discarded its free-text readings before anything used them     | DEF-0056    |

**The first one is the one that matters.** It is the owner's "Plenty" answer
that vanished — the concern carried into the Round 3 handoff with the
instruction not to assume user error. It was not user error. `MemoryProvider`
kept one database for every surface, and `loadDocument` clears all four object
stores before writing a fixture.

The class is the one this phase keeps producing: **a rule applied on the axis
somebody was looking at, and not on the axis it exists to protect.**
`indexedDbStore.ts` already carried the rule in its own comment — synthetic data
must not land where real history lives — and it had been applied between Preview
and production, never between the laboratory and the owner.

So the laboratory has its own database now, and nothing it does can reach his.
Which one is active is derived from whether the laboratory holds anything rather
than remembered in a flag, so nothing can drift out of step. A fixture stays
inspectable from every normal surface, because that is what the laboratory is
for — and every normal surface now **says whose evening it is**, with one press
back to his own, which costs nothing because his history was never written over.

**QA named the test that gave false confidence, and it is worth repeating.**
`qa-lab.spec.ts` already proved a loaded scenario survives a reload and a
reopen, and exercised clearing. It had never once put an owner record in front
of the laboratory. Every assertion passed while the defect destroyed real data.

**R3-B2 is DEF-0046's invariant surviving in the key and dying on the way to the
screen.** The scope, the key and the card's own control were all correct; the
stored record is read back by a different renderer, and that path had never been
part of the identity work. It now names the object, and the regression goes
through `assembleTimeline` rather than around it.

**R3-B3 was an unverifiable declaration.** `tracked` asserted that a concept
could be learned from and nothing checked that the machinery could read what the
concept holds. It now names _how_ a reading becomes a number, which is a claim
that can be — and is — checked against `numericValue` itself.

**And no scale was invented for how he feels.** Mood, stress, confidence and
motivation are four things; one number for all four is the wellness score the
owner rules out. `emotionalState` keeps everything else and is simply no longer
claimed to be a trackable dimension. Which dimensions exist is his to say, and
it stays an open question (D-091 invariant 6). QA accepted the reasoning and
rejected only the claim, which is exactly the distinction this repair makes.

**Every Round 3 PASS was preserved and re-verified**: the seven semantic
invariants, QA-A1's observe-first owner flow, the exact-three-verb
`inferred-evidence` decision QA accepted, section 51's already-passing gate
items, DEF-0034–DEF-0044, and every explicit deferral.

**Four defects reintroduced one at a time; four caught** — the shared database,
the verb-named correction, the renderer dropping the entity index, and a concept
tracked on a shape the path cannot read.

---

**Round 2 status, superseded by the above: YELLOW — REPAIRED, AWAITING CODEX RETEST.**

Round 2's repair was deployed and then read by an **independent Codex cold-use
and semantic audit**, which reproduced **seven blocking defects** in it. The
phase carried 22 purpose-written regressions over the repaired code, all green,
and not one of them asked the questions the audit asked.

**The through-line of all three rounds is one failure.** DEF-0020: four
different facts sharing one carrier. QA-A1: one fact — _who performed the
inference_ — missing from the model entirely. And now: the inference performed
correctly and then **stated wider than the evidence underneath it**, in five
separate ways, plus two owner-facing surfaces saying more than they knew.

## What the audit found, and what was done

| #   | The defect                                                                                                                  | Repaired as                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Four walks and four bike rides pooled under the `move` verb, cancelled to "no different", printed as a finding about a walk | DEF-0046 — scope on the semantic action, verb **and** object                     |
| 2   | Walks that helped every weekday and no weekend collapsed to 4-of-8, and that figure ranked a Tuesday                        | DEF-0047 — per-context bands; the collapsed figure is not printed                |
| 3   | An evening nobody was asked about, counted as an evening without the walk                                                   | DEF-0048 — present / absent / **unknown**, and abstention                        |
| 4   | Four recorded relationship events between a walk and the later reading confounded nothing, and the card said so out loud    | DEF-0049 — named confounding classes, and copy that claims only the check it ran |
| 5   | The app's own conclusion could rank a recommendation and could not be disagreed with                                        | DEF-0052 — an `association` belief key scoped to the action                      |
| 6   | Life's "Recently" printed a same-moment correction below the reading it replaced                                            | DEF-0050 — canonical order, `occurredAt` → `recordedAt` → id                     |
| 7   | "Fresh — up to date on what matters", above a belief the app had marked out of date                                         | DEF-0051 — freshness says which question it answers                              |

Two more were found by the repair itself and are in the ledger: the card
borrowing the **verb's** phrase when an object had no name (DEF-0046's sibling —
two findings would have printed as one sentence), and Life silently dropping
three of eleven areas because the group word and the group order lived in two
files (DEF-0053).

## What this is now governed by

- **D-091** states the seven invariants as rules rather than as repairs: action
  identity, negative exposure, context, confounding, correctability, tracked
  state meaning, historical order — plus the freshness-language rule. Plan
  section 51 carries them in the pattern-quality rules and in the gate.
- **D-090** moves independent QA permanently from Claude to **Codex**, and sets
  the order it works in: sealed cold owner-use first, then a claim-to-evidence
  audit, then semantics, then the phase gate, then targeted regression, with
  full-suite duplication only on a concrete trigger. Green builder tests are
  evidence; re-running them to watch them pass again is not QA.

## What was preserved

Everything QA-A1's repair established, verified rather than assumed: no causal
grading where state is observable; the owner still reports his own state; the
app learns the relationship; association is never causation in either direction;
historical `aspect: 'effect'` records still mean what they meant and still
count; an attribution and a system finding are still visibly different on
screen; missing observations still stay missing; weak evidence still abstains;
the four state dimensions stay separate; contradictory evidence still reverses a
finding; the finding still reaches the ranking and the evidence panel.

`emotionalState` is still **not** split into named dimensions — D-091 invariant
6 records why, and it remains an open question for the owner. The two decisions
round 2 handed to QA (keeping `inferred-evidence.test.ts`'s three-verb
assertions, and not inventing an emotional taxonomy) are unchanged and still
QA's to accept or reject.

---

**Round 2 status, superseded by the above: YELLOW — QA FAIL, REPAIRED, AWAITING RETEST.**

Independent QA passed round 1 against section 51's gate item by item, and then
**withdrew the PASS**. The owner read one sentence on Now — _"How much did a
walk do for you?"_, answered _A real difference / Some difference / Not much /
Backfired_ — and asked who was doing the causal analysis. QA investigated,
confirmed it, and recorded **QA-A1**: the app asks the owner to perform the
inference the system exists to make, and Phase 6 renders his answers as
percentages that read as measurements. Full report at
[`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md).

## QA-A1 — repaired

Every line of QA's diagnosis checks out in the code. `effectFor` has exactly
one source and cannot tell an observation from an opinion — by an explicit
design note, written to avoid a second outcome path. The observe-first path is
gated to three verbs and one concept and is itself an attribution.
`MoveProfile.measures` already declared that the walk speaks to `energy`, and
nothing read it for collection. On the history built to demonstrate section 51,
**all forty-six figures Insights printed were tallies of the owner's judgments
and none was worked out from a reading**.

**This is a specification gap before it is an implementation defect**, which is
why the governing documents moved first. Section 20 said the app learns from
"observed outcomes" without saying who judges them; section 51 required a
percentage to name the quantity it measures without requiring it to name who
inferred it. That is exactly why round 1 checked every gate item correctly and
passed a screen that was not honest.

- **D-089** records the principle: observe first, infer cautiously, ask for a
  concrete fact, ask for current subjective state when that state itself
  matters, and never ask the owner for the causal relationship the system exists
  to learn. Plan sections 20 and 51 now state it directly. D-054, D-064, D-066
  and D-069 are annotated as incomplete, revisited or generalized — none
  overturned.
- **`MoveProfile.affects`** names the observable dimension a move is expected to
  move, on five verbs where that is defensible and deliberately nowhere else. A
  learning topic is an entity; home friction is free text; nothing in the
  registry honestly says what unhurried time with a daughter moves.
- **The grading question is off every verb declaring it**, keyed on the profile
  in one place, and the app asks for the reading instead. One question still —
  what changed is which one, and who does the thinking.
- **`association.ts`** compares two readings close enough together to be about
  the same stretch of day, sorted by what happened between them: this move
  alone, nothing at all, or something else — the third discarded and counted as
  discarded. Nothing is stated unless each side clears four pairs on its own,
  and it never says cause in either direction.
- **`observed-change`** carries the finding into the ranking, abstaining at zero
  weight where there is nothing to say (D-048) — which is why no golden scenario
  moved.
- **`ConceptDefinition.tracked`** separates "worth a trend" from `standing`. The
  trajectory card gated on the latter, which is false for every dimension the
  owner reports about himself, so energy, mood and soreness were collected,
  spent on similarity matching, and never read as evidence.
- **Every attribution-derived figure says whose judgment it is.** "How often
  **you said** clearing the kitchen made a difference afterwards." Follow-through
  is the deliberate exception and is asserted as one.
- **History keeps its meaning.** Existing `aspect: 'effect'` records are still
  his, still counted by `effectFor`, not relabelled and not deleted. The new
  quantity is additive and `association.ts` writes no record at all.

Recorded as **DEF-0045** in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).

**Twelve behaviours QA required, twenty-two tests**, including the one whose
absence allowed this — the engine learning something real from a history with no
causal answer in it, on a new scenario containing not one `effect` outcome.
**Twelve defects reintroduced one at a time; twelve caught** — four only after
the first pass showed the guard did not bite.

**One thing deliberately not done.** QA is right that `emotionalState` is one
generic dimension and closer to the wellness score the owner rules out than to
separate dimensions. Which dimensions is his to say, and inventing a taxonomy is
the mistake this whole finding is about. It is now `tracked`, so it
participates; the split is an open question for the owner.

**Two of QA's named tests kept, with the reasoning written into the file.**
`inferred-evidence.test.ts`'s assertions that `deriveOutcomes` fires for exactly
three verbs do pin a limitation in place, as QA said. Extending that mechanism
would have produced more attributions wearing the app's name instead of the
owner's; the repair was to stop needing them.

**One thing CI found that no test could.** `prettier --check .` covered
`docs/qa/PHASE_06_QA_HANDOFF.md`, which QA writes and D-077 forbids the builder
to edit — a gate only the one person forbidden to satisfy it could satisfy. QA
handoffs join the canonical plan in `.prettierignore`, for the same reason it is
already there.

---

**Round 1 status, superseded by the above: YELLOW — READY FOR INDEPENDENT QA.**

Section 51's goal is one sentence: make memory and learning visible without
turning the normal experience into a statistics dashboard. Three surfaces
carry it — Timeline, Insights, and a compact **See evidence** on Now — and
the hard part was never the wiring. It is what is honest to show.

Per D-077 this checkpoint does not self-certify. Everything below is the
builder's own gate — unit, contract, synthetic, adversarial, browser, a
clean-checkout `npm run verify`, a privacy scan, CI, the deployed Preview
SHA matching this checkpoint, and the builder's own Android-style pass
against that deployed Preview. Independent QA has not run.

## The problem this phase actually had to solve

DEF-0020 was four different facts collapsing into one carrier, because
nothing stopped them. Section 51 exists because that defect has an obvious
second form:

> Any percentage must identify the quantity it measures. Do not merge direct
> result, downstream effect, comfort/friction, or follow-through into one
> generic success statistic.

So there is no success rate in this phase and no type that could hold one. A
`MeasuredRate` carries the aspect it measures, a sentence naming that
quantity in ordinary words, and its own numerator and denominator — and
exactly one component in the whole app can render one, taking the whole rate
(D-084). Printing a figure without the sentence beside it is not something a
caller is able to do, and a guard fails the build if a second place learns
how.

Below four comparable occasions the figure is withheld with the reason and
the count. That threshold is defensible rather than round: `PATIENCE` in
`learning.ts` is 3, the point where observation starts outweighing the
starting belief, so a figure the app is willing to _print_ should rest on
more than it takes to move a belief a quarter of the way. A test asserts the
relationship rather than the number.

## What the builder's own gate found — eleven defects, none from an assertion

**DEF-0034 to DEF-0044**, all found by reading the assembled screens or by
measuring them, none reported by a failing test. Eight came from reading a
local build before the first push; three more came from the Android-style
pass against the **deployed** Preview, on lines the local read had gone
past — a situational context tagged "Standing" while its own sentence said
"for now", the validator's own words handed to the owner on Timeline's
damaged-row report, and a fixed "Everything counted" heading over a list of
what is overdue. Three are worth naming here.

**DEF-0039** is the one that matters. Now said _"Reset a space has made
little difference in situations like tonight"_ directly above a panel
reporting _"How often clearing the kitchen made a difference afterwards —
67% — 8 of 12."_ Neither is wrong. The line on Now is the belief, weighted
by how much each evening resembles tonight, and tonight is a weekend; the
figure is the plain proportion across every comparable evening. They measure
different things and the screen said nothing about that. The fix suppresses
neither: the panel carries the same sentence Now uses, and the split line
now names which side tonight falls on — _"6 of 6 on a weekday, 2 of 6 at the
weekend. Tonight is at the weekend."_ — which is what the difference between
the two numbers actually was.

**DEF-0041 is the reason the reintroduction step is not a formality.** The
sweep written for DEF-0037 passed with DEF-0037 still in place: its regex
had been corrupted into a pair of literal backspace characters and could
never match anything. It read correctly, exercised the right strings, and
was decoration. A repository-wide sweep for stray control characters found
one other, in `src/domain/ids.ts`, which is a deliberate hash separator and
correct.

**Nineteen defects were reintroduced one at a time. All nineteen were
caught.**

**And one correction to DEF-0041's own account.** ESLint's `no-control-regex`
would have caught the corrupted sweep. It was simply never given the chance:
the corruption was written, found by the reintroduction pass and repaired
between two full gates. The rule proved it a few hours later by catching the
identical mistake the moment lint ran over it. The narrower lesson is the
useful one — the reintroduction step and the lint gate cover the same
failure, and lint is the cheaper half.

## Build identity

|                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product checkpoint   | `ce4087a` — the Round 5 repair every result below was measured against, and the one Codex should retest                                                                                                                                                                                                                                                                                                                                                                                  |
| Earlier checkpoints  | `28d2efc` — the Round 4 repair Codex Round 5 tested; `8680642` — Round 3; `481c3a7` — the seven-blocker repair                                                                                                                                                                                                                                                                                                                                                                           |
| Closing SHA          | current `main` HEAD — documentation only past `ce4087a`, no product code                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Deployed Preview SHA | the closing SHA. Every push redeploys, so this is a rule rather than a frozen number: `git diff ce4087a..HEAD --name-only` shows only `docs/`. Both of QA's Round 5 reproductions were driven by hand on `ce4087a`: a February fixture then Empty the laboratory, and a June fixture answered then Show mine. The clock came back to real time in both, his August record was on Timeline immediately and still there after two and a half seconds, and nothing of the fixture remained. |
| Do they match?       | Yes, by construction — D-004, and asserted live in CI                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Live proof           | `preview/build-info.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Verification

| Gate                                      | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy scan                              | Clean, 163 tracked files                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Format (Prettier)                         | Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Lint (ESLint)                             | Pass, 0 warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Typecheck (strict TS)                     | Pass, 0 errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Unit / contract / synthetic / adversarial | 780 passed / 780, 45 files (in plain Node, no DOM)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Browser tests (Playwright)                | 312 passed / 312 — 104 tests × 360, 430, 1280px                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Production build                          | Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `npm run verify` from a clean checkout    | Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Reintroduction pass                       | 19 for the phase, 12 for QA-A1, 17 for the audit's seven, 4 for Codex Round 3, 5 for Codex Round 4, **9 across Rounds 4 and 5**; all 61 caught                                                                                                                                                                                                                                                                                                                                  |
| Builder's own Android-style gate          | Pass — against the deployed checkpoint; no findings                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Independent QA                            | **Round 1 PASS withdrawn on QA-A1; round 2 repaired; seven blockers found by Codex cold-use audit, repaired here. Codex Round 3 confirmed those seven and returned FAIL on three siblings, repaired here. Codex Round 4 confirmed R3-B2/R3-B3 and the storage split, and failed on the return projection, repaired here. Codex Round 5 confirmed the store race repaired and failed on the temporal half of the return, repaired here. Awaiting Codex Round 6 retest (D-090).** |

### Where the 700 sit

Phase 5 ended at 610. The 90 new ones are four new suites plus growth in the
library-wide sweeps, and the second half is worth noting: several existing
suites grew without being edited, because they walk every scenario and the
library gained one.

| Suite                                                                                                 | Tests |
| ----------------------------------------------------------------------------------------------------- | ----: |
| `synthetic/insights.test.ts` — the rate rules, and the gate claims                                    |    29 |
| `synthetic/timeline.test.ts` — section 26, rule by rule                                               |    31 |
| `synthetic/decision-evidence.test.ts` — Now's panel reads the decision                                |    15 |
| `unit/insights-copy.test.ts` — the copy tables, swept                                                 |    10 |
| `synthetic/observed-relationships.test.ts` — QA-A1's twelve behaviours, then D-091's seven invariants |    43 |
| `unit/architecture-guards.test.ts` — five phase guards, four for D-089, three for `ACTION_FAMILIES`   |   +12 |
| `unit/registries.test.ts` — what a tracked dimension may not become                                   |    +4 |
| `unit/life-pages.test.ts` — what a status word may not claim                                          |    +3 |
| `synthetic/domain-page-data.test.ts` — canonical order, honest freshness                              |    +2 |
| existing sweeps, over the two new histories                                                           |   +11 |

Browser: `tests/browser/timeline-insights.spec.ts`, 25 tests × 3 viewports =
75 new, on top of the 216 already in `shell.spec.ts`, `now.spec.ts`,
`qa-lab.spec.ts` and `life-domain.spec.ts` — all unchanged, all still green.

## Gate checklist (section 51, and the phase brief)

| Requirement                                                                | Status                                                                                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| The fourteen existing golden scenarios still pass, unchanged               | Pass — none of their files changed this phase                                                                                       |
| Timeline renders real canonical history for the kinds that matter          | Pass — all twenty record kinds have a line and a word; swept across every history in the library                                    |
| Malformed rows isolated rather than breaking the surface                   | Pass — reported apart from the record, undated, and every rendered entry traces to a record the store accepted                      |
| At least one Insight card from real synthetic learning history             | Pass — six cards on "Nine months of evenings", one on "A month of what actually worked"                                             |
| …and it demonstrably changes when a counterexample is added                | Pass — `insights.test.ts` "one counterexample, and what it changes": the kind, the headline, the figure and the confidence all move |
| "See evidence" opens real evidence for the actual current recommendation   | Pass — every field read off the decision's own explanation, evaluation and trace; asserted across the whole library                 |
| No percentage without a defensible sample and a named measured aspect      | Pass — structurally (one renderer, taking the whole rate) and by sweep over every figure the library can produce                    |
| At least one synthetic scenario proves the "not enough evidence yet" state | Pass — two: the withheld figure on a lab with two results, and "Still gathering" on a move with two occasions                       |
| Private-domain discretion holds on Timeline                                | Pass — the row stays, the detail is withheld, and there is no control anywhere that could reveal it                                 |
| CI green: privacy scan, format, lint, typecheck, unit, browser, build      | Pass                                                                                                                                |
| `npm run verify` passes from a clean checkout                              | Pass                                                                                                                                |
| Preview deploys automatically, deployed SHA equals checkpoint SHA          | Pass                                                                                                                                |
| Builder's own Android-style mobile pass against the deployed Preview       | Pass — 360×780, touch, Android UA, device pixel ratio 3, run twice: three findings, all repaired, clean on the re-run               |
| Independent QA (required from Phase 5 on, D-077)                           | **Outstanding — this phase is YELLOW until it passes**                                                                              |

## What changed

### `src/intelligence/insights.ts` — the rules that decide when a number is honest

Reads what has been learned and turns it into cards. It builds no learning
index: the beliefs come off `situation.learning`, the object the decision on
Now was made from, and the raw counts are taken over the episode set that
index itself selects. Two definitions of "a situation like this one" would
eventually disagree, and the owner would have no way to tell which screen
was lying — D-071's argument for coverage, applied to a second reader
(D-085).

Ten kinds of card, covering section 27's list. Two orderings turned out to
be load-bearing and are asserted rather than commented. A card leads with
the aspect that _means_ most, not the one with the most evidence: with
follow-through first, one card read "has worked every time it has come up"
over a figure that said only that it could be done. And a context split
leads over the counterexample it explains (D-086).

`evidenceForDecision` is the same discipline pointed at Now: every field
comes from the decision the surface already has, so there is nothing on that
panel to disagree with.

### `src/features/timeline/` — the record, with nothing to press

Days, newest first, in the canonical order reversed. Timeline is the only
primary destination with no action on it at all, which is how section 26's
"never create a phantom actionable item from corrupt data" is held: there is
nothing for a corrupt row to produce (D-087). Unreadable rows are reported
apart from the record, undated and unsorted, because they have no date and
no meaning. No filter — section 51's own "if actually needed, not by
default".

### `src/features/history/describe.ts` — one line per record, written once

Shared by Timeline and a domain page's "Recently" panel, which differ only
in which record kinds they ask for and what discretion they owe (D-088).
Every line reads correctly with no tag beside it, because a domain page
shows none.

### `src/features/evidence/` — the only place a figure is rendered

One component, taking the whole `MeasuredRate`. Used by both Insights and
Now, so the two surfaces cannot drift apart on how a number is worded.

### `src/synthetic/scenarios.ts` — "Nine months of evenings"

The history section 51's gate needs and the library did not have: twelve
evenings clearing the kitchen that split cleanly on the kind of evening, ten
walks that reverse across the year, six labs that mostly never happened, and
a result and a comfort that disagree about the same five episodes.

**Product behaviour changed:** yes — two shells became real surfaces, and
Now gained one closed link.
**Semantic behaviour changed:** no. Nothing here decides anything, no
ranking moved, and no golden scenario's outcome changed.

## Phone check (what to look at)

Open Preview — the build should read `e681a66`. Header → **More** → **Open
the QA laboratory**, load "Nine months of evenings".

1. **Insights, closed.** Six cards, six sentences, no figure anywhere on the
   screen. Judge whether each one is something you would want to be told.
2. **One card, opened.** Tap "See the evidence" under _Clearing the kitchen
   goes better on a weekday than at the weekend._ Every figure should say
   what it measures and how many it is over.
3. **Now, and the thing under it.** Tap **See evidence**. Read the whole
   panel against the sentence directly above it — the app's conclusion, the
   plain counts, and the line saying which side of the split tonight is on.
   That relationship is DEF-0039 and it is the thing most worth a second
   opinion.
4. **Timeline.** Scroll a full page. Does it read as a record of a life or
   as a log?
5. **"A file with damage in it"**, then Timeline. The readable history, and
   the broken rows reported separately with nothing to press.
6. **"Two ordinary weeks"**, then Timeline. One row reads _Private entry_.
   The thing it is about should be nowhere on the screen.
7. **"One answer, and a lot of silence"**, then Insights. It should say it
   has nothing worth saying, and mean it.

## Deliberately not built

- **Filters on Timeline.** Section 51 asks for them "if actually needed, not
  by default", and on every history in the library the day headings and a
  growing page do the work one would (D-087).
- **A reveal control for private detail on Timeline.** `privacy.ts` supports
  it and no surface offers it. Section 11 keeps explicit private detail off
  primary surfaces; the domain page is where the owner goes for it.
- **A peak-state likelihood.** Section 51 lists it as something the deeper
  view "may eventually include". Nothing in the current model defines that
  quantity well enough to put a number on, and inventing one to fill the
  slot is what the rest of this phase is arranged against.
- **Correcting an insight in any way other than rejecting the belief.** The
  existing `belief-correction` watershed is offered on every card that
  concludes something. A card cannot yet be edited, scoped or annotated.
- **Rebuilding a domain page's "Recently" panel** to match Timeline. The
  owner deferred it; what is shared is the wording of a line, not the panel
  (D-088).
- Exports, backup and restore (Phase 7), the legacy importer (Phase 8), the
  service worker (Phase 10).

## Open defects

None. **Twelve** were found and closed. DEF-0045 is QA-A1, and it is the only
one found by anybody other than the builder: the owner raised it after
independent QA had already passed the phase, and QA confirmed it and withdrew
the PASS.

The other eleven — DEF-0034 to DEF-0044 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md) — and not one came from a failing
assertion. Nine came from reading the assembled screens, one from measuring
them, and one from the reintroduction pass discovering that a guard could
not fail.

**One observation, offered rather than hidden.** During the repair gate,
`now.spec.ts`'s "creates one episode from a double tap" — a Phase 3 test,
untouched this phase — failed once in a full desktop run, then passed on a
full re-run and on three consecutive runs of that file on its own. Nothing
in this phase touches Now's lifecycle buttons. It is recorded because a
single unexplained failure is worth a reader knowing about even when it
does not reproduce.

## Deferred, with reasons

Unchanged and reconfirmed. Nothing in this phase touched the guide, the
lifecycle or the ranking.

From Phase 4:

- **P4-6 — the no-action eyebrow** renders a whole sentence in an uppercase
  micro-label slot.
- **P4-7 — the More button is 81×36** (re-measured this phase at 80.6×36),
  below the 44px minimum. It remains the only sub-44px control on any
  surface: a geometry pass over Timeline, Insights and Now's evidence panel
  at 375×812 found no others.
- **A started move that is never settled** stays "Under way" indefinitely.

From Phase 5:

- **An inline Life-area link** is below a 44px touch target, deliberately.
- **Creating a brand-new goal from a domain page** is not supported.
- **No domain page offers a dated situational-exception control.**
- **"Recent changes" on a domain page is domain-scoped, not chronological.**

And the older ones, also unchanged: the older ranking dimensions still cost
weight when they know nothing; `hold` is still never generated; free-text
constraints are still shown rather than enforced; Emotional Health still has
no standing concept.

## Decisions made

D-084 to D-088 in [`DECISION_LOG.md`](DECISION_LOG.md), and **D-089** for the
QA-A1 repair — the observe-first principle, which also amends canonical plan
sections 20 and 51 as owner-approved amendments under section 1.

## Next

Phase 6 is closed. See [`NEXT_PROMPT.md`](NEXT_PROMPT.md) for the Phase 7
handoff, and the closeout block at the top of this entry for the full record —
this "Independent QA, new conversation" pointer belongs to Round 1a and is kept
as history rather than edited to look as if it always said what happened later.

---

# Phase 5 — the Life domain experience

**Status: GREEN — independent QA passed.**

Section 50's goal is one sentence: give the owner optional deep inspection
without fragmenting the brain. Ten pages, reachable from Life and nowhere
else in the primary navigation, each answering the five things section 50
asks a domain page to answer — what the app believes, why, what changed,
whether it is fresh, and how to correct it — without becoming the static
questionnaire dump section 59 excludes by name.

Per D-077, this checkpoint does not self-certify. Everything below is the
builder's own gate — unit, contract, synthetic, browser, a clean-checkout
`npm run verify`, a privacy scan, CI, the deployed Preview SHA matching this
checkpoint, and the builder's own Android-style pass against that deployed
Preview — not the owner's phone approval and not independent QA. Both remain
required before GREEN.

**The builder's own gate found three defects, all on the deployed Preview,
none from a failing assertion** — DEF-0028 to DEF-0030 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md). All three are the same shape Phase
4's phone gate kept finding: individually reasonable code that reads wrong
once a whole screen is read as a person would rather than asserted on in
parts. A "recently" line naming its subject as "a suggestion here" four times
running on a history about one place; a bare "60 min" on the Direction page
with nothing saying it measured usable time tonight, reachable because a
record's own domain tag can legitimately differ from its concept's registered
one; and a correction control offered on an area Life's own grouping already
treats as calm. A fourth suspected finding — an inline Life-area link too
short for a 44px touch target — was investigated and reverted rather than
fixed: padding the hit area with the usual negative-margin trick made
adjacent wrapped names overlap, which is worse than the small target it
tried to fix, and the small target itself is WCAG 2.5.5's own exception for
a link inside a sentence. Documented in `LifeScreen.css` rather than silently
dropped.

## Independent QA — round 1: FAIL, repaired

Independent QA (D-077) tested checkpoint `34e03b6` fresh, in a new
conversation, against the deployed Preview — full report in
[`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md). **Overall: FAIL.**
Two blocking defects, one major, all three the same shape as Phase 4's phone
gate: individually reasonable code that reads wrong once a whole screen is
read as a person would.

- **QA-B1** — `#/more` still said Phase 4 and called the ten shipped domain
  pages "next," on the exact checkpoint that shipped them.
- **QA-B2** — coverage interpretation and domain status wrote a real record
  and then visibly did nothing: on any of seven pages whose staleness comes
  from a neglected standing concept, "How this stands" never moved and both
  buttons stayed offered under the unchanged sentence.
- **QA-M1** — a domain page could say "nothing here has gone out of date"
  two lines above a concept row tagged "out of date."

All three are fixed — DEF-0031 to DEF-0033 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md) — each with a regression proved to
fail when the defect is reintroduced before being restored. QA-B2 in
particular was a real semantic question, not a UI patch: `coverage.ts`'s
staleness computation was already honest (it correctly refuses to invent a
concept's current value from a record that says nothing about it), so the
fix is `CoveragePanel` pointing at the actual overdue concept instead of
offering two buttons that could never move it. Repaired checkpoint:
`8d06dae`. Phase 5 **remains YELLOW**, per D-077 — repair returns to the
same independent QA conversation for retest, not to GREEN here.

Round 1's own FAIL report gave a recommended next action but no ready-to-paste
prompt — the owner had to return and ask for one before the repair above could
start. That gap predates D-082, recorded the same day: from here on, every QA
run or retest carries its own complete next prompt automatically, on both PASS
and FAIL ([`qa/README.md`](qa/README.md) section 3a).

## Independent QA — round 2 (retest): PASS

The same QA conversation retested repaired checkpoint `8d06dae` (deployed at
`72c6d9f`, documentation-only past the repair) against each finding's exact
original repro steps rather than against the builder's account of the fix —
full retest record in [`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md),
"Round 2 — retest". All three findings verified fixed:

- **QA-B1** — `#/more` reads Phase 5, correct "Next," and a summary sentence
  QA confirmed accurate against what both rounds actually exercised. The QA
  lab's own eyebrow reads "PHASE 5."
- **QA-B2** — verified in substance, not merely in wording: on Career (a
  standing-concept domain), the pointer sentence replaces the two generic
  buttons, and correcting the named concept still closes the loop
  immediately. On a constructed Social case (no standing concept), the
  original two buttons are still present and still work exactly as before —
  confirming the fix did not regress the case it was never broken for. QA
  also read the `coverage.ts` diff directly and confirmed the repair
  changed nothing about the staleness computation itself, only which
  control `DomainPage.tsx` offers.
- **QA-M1** — the domain-level sentence no longer claims "nothing has gone
  out of date"; the concept-level tag is unchanged and still visible
  immediately below it. The contradiction is gone without the freshness
  signal being hidden.

One scope correction QA made to its own round-1 report: QA-B2 affects
**seven** of the ten pages, not eight — Fatherhood's only standing concept
(`custodyArrangement`) is durable and, per D-061, can never be neglected, so
it was never actually reachable by this defect. `DEF-0032` already recorded
seven; round 1's narrative text said eight. Corrected for the record; the
verdict is unaffected.

Nothing in round 1's PASS list regressed (spot-checked, not redone at full
depth, per the retest prompt). No new findings. Every deferred item —
P4-6, P4-7 (re-measured at 80.575×36), the never-settled started move, and
the inline Life-area link (re-measured at 115.9×20.8) — reconfirmed
unchanged, and none newly introduced by this phase.

**Recommendation: PASS.** Per [`qa/README.md`](qa/README.md) §6, this
closeout follows in the same response.

## Formal GREEN closeout

- **Final status:** GREEN.
- **Approved checkpoint SHA:** `8d06dae` — the repaired product checkpoint
  independent QA retested and passed.
- **Closing SHA:** current `main` HEAD — documentation only past `8d06dae`
  (this closeout included); no product code changes.
- **Deployed Preview SHA:** identical to `main` HEAD, asserted live in CI and
  confirmed by hand against `preview/build-info.json`.
- **Verification:** 610/610 unit·contract·synthetic·adversarial, 216/216
  browser (3 viewports), clean privacy scan, clean `npm run verify` from a
  checkout, green CI — all unchanged since the repaired checkpoint, since
  nothing after it touched `src/` or `tests/`.
- **QA report path:** [`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md).
  **SHA QA tested:** `72c6d9f` (at/after `8d06dae`). **Result:** PASS.
- **Deferred and open items:** P4-6, P4-7, the never-settled started move,
  and the sub-44px inline Life-area link all remain, all reconfirmed
  unchanged by both QA rounds. No new deferrals from this phase. Zero open
  defects — DEF-0028 through DEF-0033 are all Fixed in
  [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).
- **Decisions made:** D-081, D-082.

## Build identity

|                      |                                                                          |
| -------------------- | ------------------------------------------------------------------------ |
| Approved checkpoint  | `8d06dae` — the repaired build QA's retest passed                        |
| Round 1 tested SHA   | `34e03b6` — FAIL (QA-B1, QA-B2, QA-M1)                                   |
| Round 2 (retest) SHA | `72c6d9f` — PASS, at/after `8d06dae`                                     |
| Checkpoint SHA       | current `main` HEAD — documentation only past `8d06dae`, no product code |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`                      |
| Do they match?       | Yes, by construction — D-004, and asserted live in CI                    |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/              |
| Live proof           | `preview/build-info.json`                                                |

`8d06dae` is pinned above because it is the exact repaired SHA every
verification result below was measured against, including the Android-style
pass and both QA rounds; nothing observable has changed since.

## Verification

| Gate                                      | Result                                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy scan                              | Clean, 147 tracked files                                                                                                                                                   |
| Format (Prettier)                         | Pass                                                                                                                                                                       |
| Lint (ESLint)                             | Pass, 0 warnings                                                                                                                                                           |
| Typecheck (strict TS)                     | Pass, 0 errors                                                                                                                                                             |
| Unit / contract / synthetic / adversarial | 610 passed / 610, 38 files (in plain Node, no DOM)                                                                                                                         |
| Browser tests (Playwright)                | 216 passed / 216 — 72 tests × 360, 430, 1280px                                                                                                                             |
| Production build                          | Pass                                                                                                                                                                       |
| `npm run verify` from a clean checkout    | Pass                                                                                                                                                                       |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand                                                                                                                                 |
| Builder's own Android-style gate          | Pass — three findings pre-QA (DEF-0028–0030) and three from independent QA (DEF-0031–0033), all fixed and redeployed before this checkpoint; re-confirmed live post-repair |

### Where the 610 sit

Phase 4 ended at 574. The 36 new ones:

| Suite                                                                                                      | Tests |
| ---------------------------------------------------------------------------------------------------------- | ----: |
| `synthetic/domain-corrections.test.ts` — section 62's other six kinds, plus QA-B2's standing-concept sweep |    15 |
| `synthetic/domain-page-data.test.ts` — a domain page against real histories, plus QA-M1                    |     6 |
| `unit/life-pages.test.ts` — D-078, asserted rather than inspected                                          |     8 |
| `unit/routing.test.ts` — `lifePageSlugFromHash` additions                                                  |     6 |
| `unit/architecture-guards.test.ts` — QA-B1's phase-identity assertion                                      |     1 |

Browser: `tests/browser/life-domain.spec.ts`, 12 tests × 3 viewports = 36 new
(11 pre-QA + QA-B2's pointer-message test), on top of the 180 already in
`shell.spec.ts`, `now.spec.ts` and `qa-lab.spec.ts`, all unchanged and all
still green.

## Gate checklist (section 50, and the phase brief)

| Requirement                                                           | Status                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The fourteen existing golden scenarios still pass, unchanged          | Pass — none of their files changed this phase                                                                                                                                                             |
| Every registry domain reachable from exactly one page                 | Pass — `unit/life-pages.test.ts`, D-078 asserted directly                                                                                                                                                 |
| A correction on a domain page demonstrably changes later reasoning    | Pass — proved for all six new kinds in `synthetic/domain-corrections.test.ts`, and live: correcting a stale learning topic on Career turns the area current and removes the coverage-driven move from Now |
| The private domain is manual-entry-first and discreet elsewhere       | Pass — `life-domain.spec.ts`: the reading appears only on its own page, never on Life, Now or Timeline; "Not known yet" reads as an invitation ("Add this"), not a gap                                    |
| No domain page looks like a static questionnaire dump                 | Pass — every correction control closed until tapped, asserted structurally (`input.domain-input` has zero matches before a tap)                                                                           |
| CI green: privacy scan, format, lint, typecheck, unit, browser, build | Pass                                                                                                                                                                                                      |
| `npm run verify` passes from a clean checkout                         | Pass                                                                                                                                                                                                      |
| Preview deploys automatically, deployed SHA equals checkpoint SHA     | Pass                                                                                                                                                                                                      |
| Builder's own Android-style mobile pass against the deployed Preview  | Pass — 360×780, touch, mobile UA; six findings across two rounds, all fixed (DEF-0028–0033) — see "Independent QA — round 1" above                                                                        |
| Independent QA (required from Phase 5 on, D-077)                      | **PASS** — round 2 retest, checkpoint `8d06dae` deployed at `72c6d9f`; report at `qa/PHASE_05_QA_HANDOFF.md`                                                                                              |

## What changed

### `src/intelligence/corrections.ts` — the other six of section 62

Phase 4 could honestly offer two of section 62's eight correctable kinds — a
learned effect and a learned preference, both through `beliefCorrectionRecord`
— because Now was the only surface that could see a decision to disagree
with. This phase adds the other six, and every one of them writes a record
kind that already existed: `factCorrectionRecord` and
`contextCorrectionRecord` for facts, context and direction (the weekly focus
is simply a fact about `CONCEPT.weeklyFocus`); `goalCorrectionRecord`,
superseding rather than appending, because there is no "latest wins" for a
goal; `coverageInterpretationRecord` and `domainStatusCorrectionRecord`,
writing the same `coverage-update` and `domain-update` kinds `growth.ts`
already writes for a growth answer. No new record kinds, no changes to
`facts.ts`, `direction.ts` or `coverage.ts` — a domain-page correction changes
what the app reports next through the read paths that already governed these
records (D-081 records the one real judgment call: a durable concept has to
go through `contextCorrectionRecord`, never `factCorrectionRecord`, or it
would outrank every context record for that concept forever regardless of
date).

### `src/features/life/domainPages.ts` — the ten-page registry, and what a page reads

`LIFE_PAGES` is D-078 in code. `assembleDomainPageData` reads a domain page's
four sections from the same `Situation` Now and Life already read — nothing
decides anything and nothing is a second computation: coverage from
`situation.coverage`, goals from `situation.direction.goals`, concept
readings from `situation.view.facts`, recent changes from the records
`coverage.ts` already treats as meaningful evidence about the area, each
described in one line with its subject resolved where one exists (DEF-0028,
DEF-0029).

### `src/features/life/DomainPage.tsx` and `LifeScreen.tsx` — the pages, and the links to them

A domain page offers exactly one thing beyond what Life already shows: a
correction, closed until tapped, for each of the four things section 50 asks
it to answer. A concept reading reuses its `QuestionSpec`'s options where one
exists — the same control the guide already offers — and a plain text field
otherwise. Coverage gets "I've been keeping on top of this" and a free-text
"Something's changed", offered only when the area is actually stale
(DEF-0030). Goals get Done / No longer this. Every Life area name now links
to its page.

### `src/platform/routing.ts` — a domain page is a second hash segment under Life

`#/life/health-recovery`, not a fifth destination — section 5's four stay
fixed. `lifePageSlugFromHash` stays syntactic, so `src/platform` does not
have to depend on the page list in `src/features`.

**Product behaviour changed:** yes — ten new pages, reachable from Life, each
with a working correction path.
**Semantic behaviour changed:** no new decision logic — every correction
changes what the existing fact layer, direction and coverage engine already
read, through paths that predate this phase.

## Phone check (what to look at)

Open Preview. Header → **More** → **Open the QA laboratory**, load
"Everything current except the studying", then **Life** → **Career &
Learning**.

1. **The stale reading, corrected.** "Current learning topic" reads
   _subnetting_, flagged out of date, with a "Not right?" link. Tap it, type a
   new topic, **Save**. "How this stands" should read _"Career & Learning is
   current"_ rather than the seven-week-silence sentence, and "Recently"
   should show the new topic at the top, dated today.
2. **The same correction, on Now.** Back out to Now: the coverage-driven
   refresh move should be gone, because the app is no longer reading the area
   as quiet.
3. **A closed set of answers.** Load "A settled arrangement, and one week
   away", open **Fatherhood / Adaya**, tap "Not right?" under "Child with the
   owner". It should offer _Yes_ / _Not tonight_ — the same options the guide
   would — not a text field.
4. **The private page.** Open **Private / Sexual Health** on a history where
   nothing has been entered: "Not known yet" with an **Add this** button, not
   a gap. Enter something, then check Now, Life and Timeline — it should
   appear nowhere but here.
5. **A goal, settled.** On Career, tap **Done** under "Pass the CCNA" — it
   should leave the goals list.
6. **The wall, still absent.** Life itself should read exactly as it did at
   Phase 4's close — grouped, dull where it should be dull — with every area
   name now a link.

What to judge is section 50's own list, read as a person: does each page say
what the app believes, why, what changed, whether it is fresh, and how to
fix it — and does the "Recently" list read as a sentence you would recognise
having lived, not a log grep.

## Deliberately not built

- **Creating a new goal.** Section 50's build list says "goals"; what this
  phase offers is correcting the standing of an existing one (`Done` /
  `No longer this`), not authoring one. A new goal needs an entity-creation
  flow this phase did not need to build for the correction gate to hold.
- **A dedicated "state a situational exception" control**, beyond what the
  guide's own `childPresent` question already offers through the same
  correction path. `contextCorrectionRecord` supports a situational, dated
  exception on any concept; no domain page offers a control to set one with
  its own end date. `tests/synthetic/domain-corrections.test.ts` proves the
  mechanism works; nothing in the UI reaches it yet for concepts other than
  the ones with a `QuestionSpec`.
- **The full chronological Timeline.** "Recent changes" is domain-scoped and
  reads the same records `coverage.ts` already treats as meaningful evidence
  — Phase 6 builds the whole-life surface.
- **Progressively disclosed evidence/analytics** — D-079, explicitly Phase 6.
- Exports, backup and restore (Phase 7), the legacy importer (Phase 8), the
  service worker (Phase 10).

## Open defects

None. Six were found and closed across two rounds: DEF-0028 to DEF-0030 by
the builder's own Android-style gate before the first QA handoff, and
DEF-0031 to DEF-0033 by independent QA's round 1 (FAIL) against checkpoint
`34e03b6` — all six in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md), none from a
failing assertion.

## Deferred, with reasons

Unchanged from Phase 4, confirmed still true — none of this phase's work
touched Now, the guide, or the lifecycle:

- **P4-6 — the no-action eyebrow.**
- **P4-7 — the More button is 81×36.**
- **A started move that is never settled.**

And the older ones, also unchanged:

- **The older ranking dimensions still cost weight when they know nothing**
  outside `follow-through`, `direct-result` and the coverage branch of
  `bottleneck-fit`.
- **`hold` is still never generated.**
- **Free-text constraints are still shown, not enforced.**
- **Emotional Health has no standing concept** in the registry, so it can
  only go stale through the domain-level backstop — unchanged, and now also
  the reason its domain page's "current understanding" panel is thin: there
  is exactly one concept (`emotionalState`) to show.

## Decisions made

D-081 and D-082 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 6 — Timeline + Insights (canonical plan section 51). Built; the entry
above carries its acceptance report.

---

# Phase 4 — Coverage Engine + adaptive guides

**Status: GREEN — owner-approved on `1d52de4`.**

Section 49's gate ends, like every gate since Phase 2, with a person judging the
product rather than a suite judging itself. **The owner approved it on
`1d52de4`**, accepting the Galaxy S24 gate run against the deployed Preview as
his phone acceptance (D-076).

**The first gate failed, and that pass is the phase.** Everything automatable
was green, the checkpoint was pushed, and an Android context at 360×780 found
five defects in an afternoon. Three were blocking. Not one came from a failing
assertion.

The sharpest was DEF-0023, and it is the kind of thing only a person reading a
whole screen finds: the coverage generator proposed a move _because_ an area had
gone quiet, and `uncertainty` marked that same move down _because_ the area had
gone quiet. Both halves were individually correct, every test passed, and the
penalty came to twice the margin that decided the evening. What reached the
phone was circular — _nothing has come in about your studying, so here is a
walk, because it is better supported by what is known._ Section 8's third
refresh route was reliably cancelling itself, and the phase's headline feature
was quietly undoing its own work.

Section 49's goal is one sentence: make the system trustworthy without manual
tab maintenance. The failure it exists to prevent is section 63's, and section
63 states it as a rule rather than a feature — a domain may be quiet, stable or
low priority, and must not silently remain based on months-old assumptions while
the interface implies the app is current.

Two things had to become true. The app has to **notice**, which meant building
the coverage engine and making the `stale-evidence` trigger reachable after two
phases of being written down as barely reachable. And it has to notice **without
turning the guide into a questionnaire**, which is the risk the brief names
directly: DEF-0008 is the worked example, and section 47 fails a phase outright
on "too many questions".

The number of questions the guide asks did not go up. On the library it is still
at most two on any history, and on the evening built around a seven-week silence
it is zero.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Approved checkpoint  | `1d52de4` — the build the owner accepted                    |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`         |
| Do they match?       | Yes, by construction — D-004, and asserted live in CI       |
| Since the approval   | documentation only; no product code changed after `1d52de4` |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

## Verification

| Gate                                      | Result                                         |
| ----------------------------------------- | ---------------------------------------------- |
| Privacy scan                              | Clean                                          |
| Format (Prettier)                         | Pass                                           |
| Lint (ESLint)                             | Pass, 0 warnings                               |
| Typecheck (strict TS)                     | Pass, 0 errors                                 |
| Unit / contract / synthetic / adversarial | 574 passed / 574 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 180 passed / 180 — 60 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI                            |

### Where the 574 sit

Phase 3 ended at 448. The 108 new ones are the coverage engine, the two golden
scenarios, and the owner's four conditions on inferred evidence.

| Suite                                                            | Tests |
| ---------------------------------------------------------------- | ----: |
| `synthetic/outcome-learning` — section 20, rule by rule          |    44 |
| `synthetic/inferred-evidence` — the four owner conditions        |    41 |
| `synthetic/adaptive-guide` — one question at a time              |    36 |
| `unit/intelligence-kernel` — readers, direction, moves, order    |    30 |
| `synthetic/g007-coverage-freshness` — a quiet domain, noticed    |    29 |
| `synthetic/lifecycle` — episodes, double taps, outcome windows   |    26 |
| `synthetic/g003-growth-evidence` — three occasions, not one      |    23 |
| `unit/time` — instants, civil dates, weeks, DST, day blocks      |    20 |
| `synthetic/no-hidden-genericity` — sections 61 and 64            |    19 |
| `unit/registries` — ids, domains, concepts, privacy              |    19 |
| `unit/architecture-guards` — the boundaries and the copy sweep   |    18 |
| `unit/knowledge` — the four states, freshness, asking            |    18 |
| `synthetic/model-guardrails` — section 18's fence                |    17 |
| `synthetic/outcome-questions` — DEF-0020, every verb × aspect    |    17 |
| `synthetic/g008` — a non-career weekly direction                 |    15 |
| `unit/store` — append semantics, supersession                    |    14 |
| `synthetic/guide-resume` — interruption, and asking nothing      |    13 |
| `synthetic/g005` — sleep beats ambition, both ways               |    12 |
| `synthetic/g009` — unknown is unknown                            |    12 |
| `contract/projections` — rebuildability, migrations              |    11 |
| `unit/buildInfo`                                                 |    11 |
| `unit/routing`                                                   |    11 |
| `synthetic/g004` — a social opportunity                          |    10 |
| `synthetic/recovery-has-somewhere-to-go` — DEF-0016 and DEF-0017 |    10 |
| `unit/recommendation` — rendering and refusal                    |    10 |
| `adversarial/malformed-history`                                  |     9 |
| `synthetic/g011` — timezone and week boundary                    |     9 |
| `contract/round-trip` — 20 record kinds, lossless                |     8 |
| `synthetic/g001` — no orphan pronoun                             |     8 |
| `synthetic/g014` — no action is a real answer                    |     8 |
| `synthetic/intelligence-tournament` — section 18's choice        |     8 |
| `adversarial/malformed-records`                                  |     7 |
| `synthetic/g002` — durable family context                        |     7 |
| `contract/legacy-quarantine` — preserved and inert               |     6 |

## Gate checklist (section 49, and the phase brief)

| Requirement                                                              | Status                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| G-003 passes as an automated synthetic scenario                          | Pass — 23 tests, including one and two occasions producing nothing             |
| G-007 passes as an automated synthetic scenario                          | Pass — 27 tests, including the whole library swept for hidden staleness        |
| The eight existing golden scenarios still pass, unchanged                | Pass — G-001, G-002, G-004, G-005, G-008, G-009, G-011, G-014, files untouched |
| The owner can ignore Life for a realistic period without a silent freeze | Pass — the same history read at 14, 30, 60 and 90 days                         |
| Stale important areas eventually surface naturally                       | Pass — as a candidate, as the alternative, and as the limiter line             |
| No fixed "ask every domain" questionnaire                                | Pass — asserted structurally and behaviourally                                 |
| The guide can still ask nothing                                          | Pass — on two scenarios, one of them the quiet-domain one                      |
| Reliability is read per concept rather than per source                   | Pass — two concepts, the same two sources, opposite winners                    |
| Inferred evidence cannot be read as explicit                             | Pass — `inferred` at a reliability of one                                      |
| The completion gate holds — inference never opens a loop                 | Pass — started, shown, declined and unable-now all produce nothing             |
| The outcome architecture stays source-agnostic                           | Pass — a history whose only evidence is derived still learns                   |
| Learning traces expose evidence provenance                               | Pass — per reference, and summarised on the QA screen                          |
| G-005, G-008 and G-014 re-checked after the new limiter                  | Pass — and G-008 caught the first version of it                                |
| D-048's rule holds for the new dimension work                            | Pass — the coverage limiter scores zero at the same weight as no limiter       |
| CI green                                                                 | Pass                                                                           |
| `npm run verify` from a clean checkout                                   | Pass                                                                           |
| Preview deploys automatically, SHA matches                               | Pass                                                                           |
| A repaired Android gate re-run against the deployed Preview              | Pass — six confirmation points, all six met                                    |
| **The owner tests it on a phone and accepts it**                         | **Pass — approved on `1d52de4`**                                               |

## What changed

### `src/intelligence/coverage.ts` — noticing

Per domain and per sub-area: the last meaningful evidence, how it was known, how
far past its own mark it is, whether the current beliefs are still supported,
and which of section 8's five routes would bring it back.

Three things it adds over per-concept freshness, which is the question the brief
asks directly. **How far past**, derived from the concept's own horizon rather
than a number in the file — twenty-one days for home friction, ninety for a cash
buffer. **The area rather than the reading**, because clearing the kitchen is
evidence about the house and no concept records it. And **whether anything is
being done about it**, which is the difference between a signal and a chore.

Two rules keep it honest. It never contradicts the fact layer: a concept that
resolves to a usable value is covered whatever the age of the record behind it.
And importance is read off the owner's own commitments rather than a ranking
written here — an area he has never mentioned reads "nothing here yet" and is
left alone.

### `src/intelligence/derived.ts` — the morning reading

The clearest case section 8 defers to this phase. The morning after an early
night, the sleep reading the guide already collects _is_ the answer to "how much
did that do for your sleep?", so it becomes the outcome instead of being asked
for a second time.

The owner set four conditions before any of it shipped and each has a
regression that was proved to fail when the rule was removed. It closes a loop
and never opens one. It never reads as something he said. It is worth what a
derived reading of _sleep hours_ is worth, which is 0.8 against his own 1.0 —
the reading is excellent and the attribution is the assumption. And it writes
the ordinary outcome record, so learning reads it through the path that never
asks where a record came from.

It also may never conclude harm. Four hours after a wind-down is a short night,
not evidence that winding down backfired.

### `src/domain/concepts.ts` — D-059 in code

`reliability` sits beside `freshness` and answers the same shape of question
about a different property. A watch outranks the owner on hours slept and is
outranked by him on how the night felt — same device, same domain. A financial
record outranks his estimate of a balance. A model's guess at how he feels sits
below him saying so, everywhere.

`standing` sits beside them and says whether a gap in this concept is a gap in
understanding. Eight concepts set it; "how much time have you got tonight" does
not, and that is what stops every domain reading permanently red.

### `src/intelligence/growth.ts` — section 9's last step

Three completed occasions at one skill, each answered "all the way", produce a
question beside the decision rather than a change to the model. Both answers are
records and both are read: agreeing writes what changed, "not yet" writes that
the person who would know has looked.

### The guide

Coverage reaches question selection as a tiebreak below the two measurements
that already decide whether to ask, and above catalogue order, which carried no
information at all. It can never make a question askable.

And DEF-0021's repair: when a due result could be settled by a reading the guide
is entitled to ask for, the effect question is held back and the guide asks for
the reading. One card swapped for a better one.

### Life

Eleven areas, one ordinary word each, one line of plain English. No record
counts, no confidence, no "stale", no phase — swept for by a browser test. The
private area reports how it stands and never what it is about. Most of it should
read dull.

**Product behaviour changed:** yes — the app notices a quiet area, says so, and
writes down a result the owner never typed.
**Semantic behaviour changed:** yes — a fourth limiter, a third term in the
learning weight, and evidence that knows where it came from.

## What the sweeps changed

Three separate reintroduction passes, twenty-one defects reintroduced one at a
time. **The first pass of each caught most and missed the ones that mattered.**

| Sweep               | First pass | After  |
| ------------------- | ---------- | ------ |
| Inferred evidence   | 8 of 8     | 8 of 8 |
| Coverage and growth | 6 of 9     | 9 of 9 |
| The guide           | 2 of 4     | 4 of 4 |

The five escapes were all the same shape, and it is DEF-0020's shape: a claim
asserted somewhere that could not reach it.

- "Coverage never contradicts the fact layer" was proved on `durable-custody`,
  which is protected three ways over — so it proved the behaviour and not the
  rule. It now has a history where the two can actually disagree.
- "An area he never mentioned is left alone" was asserted against a filtered
  list rather than against a status, so removing the guard changed nothing the
  test looked at.
- "A coverage move may not claim to answer what is in the way" was riding on the
  tournament, which stopped catching it once the coverage engine changed which
  area was quiet.
- Two guide rules — the daily floor and the fallback when the better question
  will not be asked — had no history that reached them at all.

## Phone check (what to look at)

Open Preview. Header → **More** → **Open the QA laboratory**, load a scenario,
then tap **Now** or **Life**.

1. **Everything current except the studying.** Now should now recommend
   _"Spend 10 minutes recalling subnetting before you reopen your notes."_ —
   the refresh itself, chosen over the walk. The line claiming the gap was
   "in the way" is gone, and so is the gap line entirely, because the app is
   doing something about it rather than mentioning it.
2. **The same scenario, on Life.** Six lines rather than forty-four: _Going
   quiet_ with career on its own and the reason under it, then _Fresh_ and
   _Nothing here yet_ as rows of names. The question is whether this is a report
   you would glance at or a list of chores.
3. **Three times running, and the app noticed.** Under the move: _"Adaya has
   managed ordering her own food on her own 3 times running. Worth calling that
   settled?"_ Answer either way and it goes. Judge the sentence — this is the
   app making a claim about your daughter.
4. **Three broken nights, and a deadline.** Tap **Done**, then in QA press
   **+1 day** and come back. It should ask _"How much sleep did you actually
   get?"_ and, once answered, ask nothing else — no second card asking what the
   early night was worth. That is the whole of the inferred-evidence work.
5. **The same, in QA afterwards.** Open **Episodes**: the recovery episode
   should read _1 answer(s) given_ against a question you were never asked.
6. **A month of what actually worked**, in QA → **What it has learned**. A row
   reading _Who said so_ should separate what you answered from what was worked
   out.
7. **A Thursday with nothing needing doing**, and **A settled arrangement, and
   one week away.** Both should be exactly as they were — no new lines, no new
   questions. This phase is judged as much on what it left alone.

What to judge is section 47's list applied to coverage: is the quiet-area signal
useful or is it nagging, does Life read as a report or as homework, and does the
app ask you less than it did.

## Deliberately not built

- **Domain pages.** Phase 5. The Life overview is the coverage status section 49
  asks for; the pages behind it are section 50's.
- **Correcting a coverage interpretation or a domain status.** Section 62 lists
  both, and both belong on a domain page that does not exist yet. What is
  correctable now is a learned belief (Phase 3) and a growth suggestion.
- **Inferring anything but a sleep effect.** The machinery is per-concept and
  the profile table drives it, so a second matcher is a table entry and a number
  somebody has to defend. Nothing else has a reading the app already collects.
- **A model-assisted coverage read.** D-025 unchanged; still an owner decision.
- **Comfort is still recorded and not yet read for patterns.** Unchanged from
  Phase 3 — an Insights question.
- Timeline and Insights content (Phase 6), exports and backup (Phase 7), the
  legacy importer (Phase 8), the service worker (Phase 10).

## What the Android phone gate changed

The gate ran at 360×780 with touch, a device pixel ratio of 3 and an Android
Chrome user agent — a real mobile context rather than a narrow desktop.

| The owner found                                         | What it turned out to be                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The refresh move loses to the walk on its own scenario  | DEF-0023 — the silence created the move and then sank it, by twice the margin that decided the evening        |
| "What is in the way — Nothing has come in about career" | DEF-0024 — a coverage gap is the app's blind spot, and the label said obstacle while the ranking said nothing |
| Insights says the app is "not yet asking" for outcomes  | DEF-0025 — false since Phase 3, and the guard written for exactly this held four remembered sentences         |
| Life is two and a half screens of one repeated sentence | DEF-0026 — `Row` is built for `Commit / bdb1e18`, not for eleven wrapped paragraphs                           |
| "ordering her own food on her own"                      | DEF-0027 — the skill label already carries it                                                                 |

**Nine reintroductions across the repair, all caught.** Two of them are the ones
worth naming: a brand new deferral claim nobody had acknowledged, and a denial
of a capability in fresh wording. The old guard would have missed both, which is
the difference between a rule and a list.

## Open defects

None. Seven were found and closed during the phase. Not one came from a failing
assertion — two from tests that could not be made to pass, one from printing the
copy after everything was green, and four from the owner on a phone.

- **DEF-0021** — the app asking for a verdict when it could ask for the fact.
  Found by a browser test written to demonstrate the derived-evidence fix, which
  could not be made to pass: the outcome card takes the slot above the guide, so
  the question that would have produced the reading was never asked, and the
  matcher had nothing to read. The complaint that started the whole line of work
  had survived inside the repair for it.
- **DEF-0023 … DEF-0027** — the Android phone gate, above.
- **DEF-0022** — found by **printing every line the owner would read, on every
  scenario, after the suite was green and the checkpoint was already pushed.**
  "A week pointed at the house" said _Adaya is here_ in the premise and
  _nothing has come in about fatherhood / family for 6 months_ directly above
  the decision. Both from the same run. Coverage was measuring the age of the
  record carrying a durable context instead of asking whether the context was in
  force — which D-012 already settles, and which section 8 uses as its own
  example of something that never needs re-asking. DEF-0017's class, on the one
  fact the plan singles out.

## Deferred, with reasons

Three of these the owner deferred explicitly at the closeout and named as not to
be fixed in Phase 4. They are written down here so the next phase inherits them
as decisions rather than as oversights.

- **P4-6 — the no-action eyebrow.** On an evening with nothing worth doing, the
  limiter summary fills a slot styled for a short label, so it reads as
  `ONLY ABOUT 15 MINUTES LEFT TONIGHT.` — uppercase, letter-spaced, with a
  trailing full stop, where `MOVE` or `RECOVER` normally sit. Owner-deferred.
- **P4-7 — the More button is 81×36.** Below the 44px minimum, and the only
  target on any surface that is. It predates Phase 4 and is not a coverage
  concern. Owner-deferred.
- **A started move that is never settled.** Unchanged from Phase 3, and the
  Android gate confirmed it bites in practice: a move started yesterday still
  reads _Under way_ the next evening with **Start it** disabled. It needs a
  decision about how long is too long, which wants real use to answer.
  Owner-deferred.

- **The older dimensions still cost weight when they know nothing.** Unchanged
  from Phase 3. D-048 applies to `follow-through`, `direct-result` and now the
  coverage branch of `bottleneck-fit`; the rest still score zero at full weight.
  Re-cutting them means re-running section 18's tournament.
- **`hold` is still never generated.** Unchanged from Phase 2.
- **Free-text constraints are still shown, not enforced.** Unchanged.
- **Emotional Health has no standing concept**, so it can only go stale through
  the domain-level backstop. Nothing in the registry yet tracks a standing
  understanding of it, and inventing one to fill the gap would be collecting
  data because a field exists.

## Decisions made

D-060 … D-076 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 5 — the Life domain experience.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 3 — Recommendation lifecycle + outcome learning

**Status: GREEN — owner-approved on the phone.**

Section 48's goal is one sentence: complete the loop. A recommendation the owner
acts on, an outcome that gets observed, and learning that changes what happens
next. All three exist and are wired to each other through canonical records —
there is no side channel anywhere in it.

**The owner approved it on `0e416d4`**, after one phone pass that found
DEF-0020 and a repair that took four exchanges to get right.

**That pass is the phase.** The card said "Did the kitchen get cleared?" and
offered _Better than usual · About the same · Worse_ — a question its own
answers could not answer. No automated check here would have caught it: every
sweep the suite had was about pronouns, internal vocabulary and finished
sentences, and that sentence passes all three. It took a person reading a screen.

**And the first diagnosis of it was wrong.** It said the question was redundant
because tapping Done already records that the kitchen was cleared. The owner
said no: Done is the attempt, and fifteen minutes clearing a kitchen can be done
in full and leave it half clear. He was right, `action-completion` had no
definition anywhere in the codebase to settle it, and that correction is what
turned a copy fix into the semantic repair the phase actually needed —
completion, direct result, downstream effect and comfort separated into four
kinds of evidence that had been sharing one answer.

Two further rounds pushed back on the repair itself: whether direct result could
be folded into follow-through without losing a distinction (it could not), and
whether a delta-based effect scale behaved sensibly under repeated observations
(it did not — a move that consistently does nothing would keep its prior
forever). Both were caught by asking for the arithmetic rather than accepting
the shape.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`         |
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
| Unit / contract / synthetic / adversarial | 448 passed / 448 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 141 passed / 141 — 47 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand     |

### Where the 448 sit

Phase 2 ended at 330. The 118 new ones are almost all about the loop and what it
learns from.

| Suite                                                            | Tests |
| ---------------------------------------------------------------- | ----: |
| `synthetic/outcome-learning` — section 20, rule by rule          |    50 |
| `synthetic/adaptive-guide` — one question at a time              |    34 |
| `unit/intelligence-kernel` — readers, direction, moves, order    |    30 |
| `synthetic/lifecycle` — episodes, double taps, outcome windows   |    26 |
| `synthetic/outcome-questions` — DEF-0020, every verb × aspect    |    17 |
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
| Outcome questions are answerable by their own answers    | Pass — 17 class-wide checks, every verb × every aspect (DEF-0020)   |
| G-014 passes as an automated synthetic scenario          | Pass — 8 tests, including the counterexample                        |
| A completed action demonstrably changes later reasoning  | Pass — same evening, same options, different winner                 |
| A decline is not mislabelled ineffective                 | Pass — and structurally, not by convention (D-045)                  |
| Can't-now changes the situation appropriately            | Pass — reaches follow-through and neither of the other two          |
| One event does not become proof                          | Pass — one comparable evening moves the belief a quarter of the way |
| The semantic subject survives through the follow-up      | Pass — the question is the renderer's own follow-up                 |
| A double tap creates no duplicate episode                | Pass — three separate guards, each tested (D-042, D-052)            |
| The phone flow feels fast                                | Pass — owner-approved                                               |
| CI green                                                 | Pass                                                                |
| `npm run verify` from a clean checkout                   | Pass                                                                |
| Preview deploys automatically, SHA matches               | Pass — verified live against `main` HEAD                            |
| **The owner tests the loop on a phone and accepts it**   | **Pass — approved on `0e416d4`**                                    |

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

## What the phone test changed

| The owner said                                         | What it turned out to be                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| The answers do not answer the question                 | DEF-0020 — and eight of fifteen follow-ups were unanswerable, not one                                                     |
| Done is the attempt, not the result                    | Correct. `action-completion` had no definition at all, and the first diagnosis was wrong because of it (D-053)            |
| Do not fold direct result into follow-through          | Correct — perfect follow-through with a poor result is an ordinary evening, and folding them makes the app misdescribe it |
| Show me the delta arithmetic before I approve it       | It fails: a move that consistently does nothing keeps its prior forever. Withdrawn (D-056)                                |
| Comfort should matter if you are going to ask about it | Wired to learned friction (D-057)                                                                                         |
| Harm is not the same evidence as no help               | A fourth effect level, and the record keeps them apart even though ranking floors both                                    |

## Phone check (this is what was tested)

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

None. Five were found and closed during the phase, and the fifth came from the
owner.

- **DEF-0016** — the strained late afternoon, deferred by the owner at the end
  of Phase 2 and the natural first thing to build here.
- **DEF-0017** — found by sweeping DEF-0016's siblings across every hour rather
  than the one that was reported. Worse than the defect that found it: nine
  hours of sleep debt printed above the decision, and "none of it says how
  tonight is going" printed underneath.
- **DEF-0018** — found because a browser test hung rather than failed. Tapping
  **Start it** slid **Done** into the space under the finger.
- **DEF-0020** — **the owner's first phone pass.** "Did the kitchen get cleared?"
  offered against _Better than usual · About the same · Worse_. The visible edge
  of a semantic collapse: completion, direct result, downstream effect and
  comfort are four facts and one judgement was standing in for all of them. The
  first diagnosis was wrong about the central point — it said Done already
  records the result — and the owner corrected it, which is what turned a copy
  fix into a semantic one.
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

D-042 … D-058 in [`DECISION_LOG.md`](DECISION_LOG.md).

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
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`         |
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

## What the phone test changed

| The owner said                                         | What it turned out to be                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| The answers do not answer the question                 | DEF-0020 — and eight of fifteen follow-ups were unanswerable, not one                                                     |
| Done is the attempt, not the result                    | Correct. `action-completion` had no definition at all, and the first diagnosis was wrong because of it (D-053)            |
| Do not fold direct result into follow-through          | Correct — perfect follow-through with a poor result is an ordinary evening, and folding them makes the app misdescribe it |
| Show me the delta arithmetic before I approve it       | It fails: a move that consistently does nothing keeps its prior forever. Withdrawn (D-056)                                |
| Comfort should matter if you are going to ask about it | Wired to learned friction (D-057)                                                                                         |
| Harm is not the same evidence as no help               | A fourth effect level, and the record keeps them apart even though ranking floors both                                    |

## Phone check (this is what was tested)

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
