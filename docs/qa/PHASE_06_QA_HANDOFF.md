# Phase 6 QA handoff — Timeline + Insights

> **STATUS: FAIL — REPAIR REQUIRED. The round-1 PASS is withdrawn.**
>
> Round 1 (below, kept unaltered) tested Phase 6 against section 51's gate as
> written and passed it. An owner-raised review afterwards exposed a finding
> that sits one level beneath that gate, and on independent investigation it
> holds and it is material. **QA-A1** is recorded in "Round 1a — owner-raised
> architecture review" immediately below. Phase 6 returns to
> **YELLOW — QA FAIL / REPAIR REQUIRED**. Do not perform the GREEN closeout.
> Do not begin Phase 7.

---

# Round 1a — owner-raised architecture review

## QA-A1 — the app asks the owner to perform the causal analysis it is supposed to be learning, and Phase 6 renders his answers as measurements

- **Severity: Blocking** — for Phase 6 GREEN, and it reaches Phase 3's
  collection model and the governing specification. Not a wording defect.
- **Class:** **DEF-0020's, one level up.** DEF-0020 was four different facts
  collapsed into one carrier. This is one fact — *who performed the causal
  inference* — collapsed out of the model entirely, so an owner opinion and a
  system finding occupy the same slot and print in the same sentence.
- **Raised by:** the owner, post-PASS, from the sentence
  *"How much did a walk do for you?"*

### What that sentence actually is

Not a wording accident. It is the `move` verb's `effect` question, generated at
`src/intelligence/outcomes.ts:459-464`:

```ts
move: {
  effect: {
    prompt: ({ object }) => `How much did ${object} do for you?`,
    answers: EFFECT_ANSWERS,
  },
},
```

`EFFECT_ANSWERS` (`outcomes.ts:307-322`) offers **A real difference / Some
difference / Not much / Backfired**.

The question asks what the walk *did* — its contribution against an unstated
counterfactual. The answer set grades that contribution. What it records is an
`outcome` record, `aspect: 'effect'`, `observation: {type:'scale', value: 0–3,
of: 3}`, provenance `owner`. **Semantically that field is an owner causal
attribution**, and nothing in the type system, the record schema, the learning
layer or the display layer says so.

This is the same shape across nine of the fifteen verbs — every one whose
profile lists `effect`. The walk is where it reads worst because the owner
genuinely cannot know the answer, but it is not the only instance.

### Evidence 1 — the learning engine has no other source

`effectFor` (`learning.ts:589`) is the only producer of the effect belief, and
it gathers exactly one thing:

```ts
const contributing = gather(verb, context, 'effect', effectValueOf, after, true)
```

`gather` (`learning.ts:569-586`) walks comparable episodes and calls `answerOf`,
which selects records by `outcome.aspect === 'effect'` and nothing else. Its own
docstring (`learning.ts:447-454`) states the design intent plainly: *"It asks
nothing about where the record came from… an outcome the app derived travels the
same path as one the owner tapped."* That was written to avoid a second outcome
path. Its consequence is that **the belief cannot distinguish a fact the system
observed from an opinion the owner supplied.** Provenance survives on the record
and reaches the QA trace; it does not survive into the quantity.

A repository-wide search for anything else writing `aspect: 'effect'` in `src/`
returns exactly one non-fixture producer: `derived.ts:199`.

### Evidence 2 — the observe-first path exists and is gated to one concept

`derived.ts` is the architecture the owner is describing — read a fact the
owner reported, close the loop, never ask him to grade it. It is scoped by three
gates at `derived.ts:169-171`:

```ts
if (profile.measures !== CONCEPT.sleepHours) continue
if (profile.outcome.when !== 'next-morning') continue
if (!profile.aspects.includes('effect')) continue
```

The walk's own profile (`moves.ts:278-289`) declares **`measures: CONCEPT.energy`**
— it already says which state dimension it speaks to — but carries
`outcome: SOON` (same-block). It fails gate 1 and gate 2. `readingAwaitedBy`
(`outcomes.ts:538-574`) has the same `next-morning` condition at line 546, so
the guide will not ask for a post-walk energy reading either.

So the observe-first machinery reaches **three verbs of fifteen**
(`protect-sleep`, `recover`, `wind-down`) and no state dimension except hours
slept. Every other move's effect belief is, and can only be, a tally of the
owner's own judgments.

### Evidence 3 — deployed, on the scenario built for section 51

Every card on "Nine months of evenings" was opened on the deployed Preview and
its evidence-mix line read off. `describeEvidenceMix` reports how many answers
the owner gave versus how many the app worked out:

| Card | Percentages shown | Answers behind them |
| --- | --- | --- |
| `emerging-change` (walks) | 100%, 70% | **10 you answered** |
| `context-effect` (kitchen) | 100%, 67%, 67% | **24 you answered** |
| `repeated-friction` (lab) | 33% | **2 you answered** |
| `move-effectiveness` (sister) | 100%, 40%, 20% | **10 you answered** |
| `trajectory` (hours slept) | none | none |
| `life-season` (custody) | none | none |

**Forty-six owner-supplied judgments; zero worked out from any reading**, across
every figure Insights prints on the history purpose-built to demonstrate
section 51. The two cards carrying no percentage are the only two that are not
built from his attributions — and the `trajectory` card, the one place Phase 6
reads observed state over time, is not connected to any action at all.

So the flagship figure —

> *How often clearing the kitchen made a difference afterwards — 67% — 8 of 12*

— is a count of how often he **said** it made a difference. The label asserts an
observed downstream fact about the world. The denominator is a tally of
opinions. Both halves are individually honest and the sentence they form is not.

### Evidence 4 — the two halves are in the same file and never meet

`insights.ts` holds both. `trajectoryCards` (from `insights.ts:1416`) reads
observed state over time. `tallyFor`/`patternCard` read action outcomes. There
is no code path joining them, and no co-occurrence, comparison-group or
temporal-association computation anywhere in `src/intelligence/`. The only
"before/after" in the file (`insights.ts:835, 1133, 1468`) is *calendar* earlier-
versus-later of the same ratings, not state-before-action versus state-after.

A secondary gate compounds it: `trajectoryCards` requires `standing === true`
(`insights.ts:1426`), and of the state concepts only `sleepHours` is standing.
`energy`, `emotionalState`, `soreness`, `socialEnergy` and `sleepQuality` are
all `standing: false`, so **no subjective state dimension the owner says he can
reliably report can produce a trajectory, or feed any belief.** They are
collected, used as similarity features for context matching, and never learned
from.

---

## The ten questions, answered

**1. What does "How much did a walk do for you?" record?**
An `outcome` record, `aspect: 'effect'`, a 0–3 scale step, provenance `owner`,
carrying a `sentiment`. Semantically an owner causal attribution; structurally
indistinguishable from a system-derived effect.

**2. Does the learning engine depend on owner-supplied downstream-effect
judgments?** Yes, for twelve of the fifteen verbs, completely. For the three
sleep verbs it can substitute one derived reading. There is no third source.

**3. If the owner stops answering causal-effect questions, can it still learn
action↔state relationships?** No — except for those three sleep verbs. For every
other move the effect belief stays pinned at the profile prior (`samples: 0`,
`moved: 'neither'`), and Insights degrades to a "Still gathering" line. Verified
live: "A month of what actually worked" shows exactly that for the walk and the
lab.

**4. Is current state represented independently enough to compare before/after?**
At the **record** layer, yes — observations carry a concept, a value and
`occurredAt`; episodes carry `shownAt`/`settledAt`/`context`. The raw material
for the join is present, so **this is not a Phase 1 schema break.** What is
missing is (a) any code performing the join, (b) collection — nothing asks for a
state reading after a non-sleep move, and (c) `standing: false` on every
subjective dimension, which locks them out of the one surface that reads state
over time.

**5. Does the architecture distinguish the nine things?** Five cleanly, four not:

| Distinction | Present? |
| --- | --- |
| completion | **Yes** — `action-completion` |
| direct result | **Yes** — `aspect: 'result'` |
| current state | **Yes as a record** — but consumed only as decision context, never as evidence about a move |
| later observed state | **No** — nothing marks an observation as falling after a given action |
| temporal association | **No** — no such computation exists |
| inferred relationship | **No** — the sleep matcher infers a *value*, not a relationship (see below) |
| explicit owner causal attribution | **Conflated** — shares the `effect` slot with derived records, by explicit design |
| comfort / friction | **Yes** — `aspect: 'comfort'` |
| follow-through | **Yes** — learned from `unable-now` |

**6. Did DEF-0020 separate result/effect/comfort without solving the deeper
problem?** Yes — precisely. DEF-0020 split one carrier into four well-formed
aspects. It never asked *who supplies the effect*. The repair made the question
coherent instead of removing the demand, and D-054 records the split without
raising the question either.

**7. Is Phase 6 discovering patterns from observed history, or summarizing
effect ratings?** Overwhelmingly the latter — 46 of 46 figures on the flagship
scenario. The single card built on observed state carries no rate and no link to
any action.

**8. Could Phase 6 produce intelligent-looking percentages that reflect his own
causal judgments?** Yes, and it demonstrably does. Note carefully: this is **not**
a section 51 percentage violation as that gate is written — the denominators are
real, the samples clear the threshold, and every rate names its aspect. That is
exactly why round 1 passed it. The gate requires a figure to declare *which
quantity* it measures. It does not require it to declare *who performed the
inference*, and that is the gap.

**9. Does the clarification conflict with or supersede an existing decision?**

- **D-066 — no conflict; the clarification generalizes it.** D-066 forbids
  inference concluding harm. The owner now forbids inference concluding
  causation in either direction. D-066 becomes a special case of a broader rule.
- **D-054 — no contradiction, but incomplete.** Its three aspects are all
  judgments *about an action*. Needed: a class that is not about an action, and
  a distinction between an owner attribution and a system inference.
- **D-064 needs revisiting.** `effectStepForSleep` (`derived.ts:89-93`) maps an
  absolute reading against a fixed `SLEEP_BASELINE_HOURS` — eight hours becomes
  "a real difference" with no comparison to nights *without* the wind-down. That
  is itself an attribution, currently acknowledged only as a 0.8 reliability
  discount. Under the new principle the reading and the attribution must be
  separate objects rather than one discounted number. D-064's four conditions
  all still hold and none of this reopens them.
- **D-056** (effect as absolute worth, four levels including harm) is the
  decision that makes the effect question causal, and must be read alongside.

**10. Phase 3, Phase 6, the specification, or a combination?** **A combination,
rooted in Phase 3 and the governing specification, surfacing in Phase 6.**

- **Phase 3** built the collection model — the effect question and `effectFor`.
  That is where the owner became the causal analyst. **Yes: Phase 3's foundation
  needs correction.** Not its record schema, which is sound — its collection
  path and its learned quantity.
- **The specification never asked otherwise.** Section 20 says the app learns
  from "observed outcomes" without saying who judges them. Section 51 constrains
  how a percentage is worded, not who inferred it. **The builder implemented the
  plan as written.** This is a specification gap before it is an implementation
  defect, and the governing documents have to move first.
- **Phase 6** is where it becomes visible and consequential, by rendering those
  judgments as percentages that read as measurements.
- **Phase 1's canonical record layer is sound** and should not be broken.

---

## Why the PASS is withdrawn, and where round 1 fell short

Round 1 checked section 51's gate item by item and every one of those checks was
correct as stated. Nothing in the round-1 record is retracted.

But I read the sentence *"How often clearing the kitchen made a difference
afterwards — 67% — 8 of 12"*, confirmed the denominator was real and the aspect
was named, and **did not ask where the eight came from.** The evidence-mix line
naming them as the owner's own answers was on the same panel, and I recorded it
as provenance transparency rather than reading it as the finding it was. The
gate as written did not direct me to ask; I should have asked anyway. That is a
genuine QA miss and not only a specification gap.

The verdict changes because Phase 6's stated purpose is *making memory and
learning visible*, and what it currently makes visible is mislabelled at the
root. Marking it GREEN would codify those labels.

---

## Required acceptance criteria for the repair

Stated as expectations the repair must meet, not as an implementation design —
`qa/README.md` §3a leaves root-cause repair to the builder.

**A. The governing documents move first.** This is a specification gap. A new
owner decision must record the principle — *observe first, infer cautiously, ask
for a concrete fact, ask for current subjective state when that state matters,
never ask the owner for the causal relationship the system exists to learn* —
and section 20 and section 51 must state it, before code changes.

**B. Owner attribution and system inference become separately legible.** A
figure derived from observed state and a figure tallied from the owner's
opinions may not render as the same kind of claim. Whatever mechanism achieves
it, no owner surface may present an aggregate of attributions in language that
asserts an observed fact.

**C. Association is never written as causation, in either direction.** A
learned relationship must read as *"on evenings like this, walks have often been
followed by better energy an hour later"* and never as *"walks improve your
energy"*. A worse state after an action must not read as harm — D-066
generalized.

**D. State becomes learnable in its own right.** Separate dimensions, not one
wellness score. `emotionalState` is currently a single generic "Current
emotional state" and is closer to the score the owner rules out than to the
dimensions he named. The `standing: false` flag on every subjective dimension
must be revisited, since it is what currently locks them out of trajectories.

**E. A comparison group is required before a relationship is claimed.**
Comparable situations where the action did **not** occur must be identifiable
and counted. Without them the figure is a description of evenings that happened
to include a walk, not evidence about walks. This is reachable with no new
sensors: `energy` is already `materialToDecision: true, askWhenStale: true`, so
readings on non-action evenings are already being collected.

**F. Absence of evidence stays a first-class answer.** Missing before- or
after-observations must produce an honest "not enough to say", not a figure
computed over whichever evenings happen to have both.

**G. Historical records keep their original meaning.** Existing
`aspect: 'effect'` records are owner attributions and must remain exactly that —
not silently reinterpreted as observations, not retroactively relabelled, not
deleted. This is the owner's explicit instruction and it likely forces the new
quantity to be additive rather than a redefinition of `effect`.

**H. The owner may still volunteer an attribution.** The goal is not to stop
asking how he feels. Asking for current state is wanted; asking him to grade a
causal contribution as the primary evidence path is not. If an explicit
attribution is retained it must be optional, clearly his opinion, and not the
only thing the engine can learn from.

**I. Do not invent sensors or integrations.** Owner-reported state, lifecycle
events and time are the whole budget.

## Required synthetic / adversarial coverage

The repair is not complete until tests prove each of these, each failing when
its behaviour is reintroduced (plan section 42, step 4):

- state improves after an action;
- state improves **without** that action — the comparison group is real;
- state worsens, and this does not become a harm claim;
- state is unchanged;
- before- or after-observations are missing entirely;
- multiple state dimensions move in different directions on the same evening;
- an unrelated event falls between the action and the later observation;
- context changes the relationship;
- an early pattern later weakens or reverses;
- selective self-reporting — the owner reports state more often after good
  evenings — does not silently become a finding;
- historical owner-attributed effects remain semantically distinct from
  observed-state findings, in the store, in the learning trace and on screen;
- **the engine still learns something useful when the owner answers no causal
  question at all.** This is the test whose absence allowed the gap.

## Which automated tests gave false confidence

Round 1 reported none. That was wrong, and the specific case is sharp.

`tests/synthetic/inferred-evidence.test.ts:656-668` asserts:

```ts
expect(eligible).toEqual(['protect-sleep', 'recover', 'wind-down'])
```

and line 680 adds *"derives nothing about a move judged in the same block."*

These **pin the limitation in place as intended behaviour.** They do not merely
fail to catch the gap — they would fail if a builder extended observe-first
derivation to the walk. Any repair must revise them deliberately rather than
work around them.

More broadly: 700 tests, 29 of them in `insights.test.ts`, sweep every figure
for a defensible denominator and a named aspect. Not one asks what the
denominator is a count *of*. The suite verifies the arithmetic and the wording
of a claim whose semantics nothing checks.

---

# Builder repair handoff

**Phase 6 is YELLOW — QA FAIL / REPAIR REQUIRED.** Return to the original
Phase 6 builder conversation.

Preserve everything round 1 passed — all eleven DEF-0034–DEF-0044 fixes were
independently verified closed and none are reopened by this — and every deferred
item listed below. Do not begin Phase 7.

Repair sequence, per plan section 42 and `qa/README.md` §4:

1. **Governing documents first.** This is a specification gap (question 10). A
   new decision recording the observe-first principle, plus the amendments to
   sections 20 and 51 and to D-054/D-064, before implementation. D-056 and D-066
   to be read alongside; D-066 is generalized, not overturned.
2. Reproduce QA-A1 from the evidence above — the four independent lines are the
   `move` profile's dead `measures`, `effectFor`'s single source, `derived.ts`'s
   three gates, and the 46-of-46 owner-answered figures on the deployed Preview.
3. Identify the whole class: **every verb whose profile lists `effect`**, not
   the walk alone, and every surface that renders an effect-derived figure —
   Insights cards, the Now evidence panel, and the learning trace.
4. Write the regressions listed under "Required synthetic / adversarial
   coverage" and prove each fails when its behaviour is reintroduced.
5. Fix the root cause, honouring acceptance criteria A–I. In particular G:
   existing `aspect: 'effect'` records must keep their original meaning.
6. Revise `inferred-evidence.test.ts:656-668` and `:680` deliberately, with the
   reasoning recorded — they currently assert the defect as correct.
7. Rerun the full gate, redeploy, stay YELLOW, and return a retest prompt to
   **this same QA conversation**.

Root-cause repair is the builder's. The reproductions, the defect class, the
evidence and the acceptance expectations above are QA's, and the architectural
direction in criteria D–F is offered as direction rather than prescription.

### Ready-to-paste next prompt

```text
Independent QA has WITHDRAWN the Phase 6 PASS. Phase 6 is YELLOW — QA FAIL /
REPAIR REQUIRED.

Report: docs/qa/PHASE_06_QA_HANDOFF.md
QA-tested SHA: a6a9e67
Finding: QA-A1 — the app asks the owner to perform the causal analysis it is
supposed to be learning, and Phase 6 renders his answers as measurements.

Read docs/qa/PHASE_06_QA_HANDOFF.md in full, starting at "Round 1a — owner-
raised architecture review". The round-1 record below it is unretracted and
every DEF-0034–DEF-0044 fix remains verified closed.

Do not perform the GREEN closeout. Do not begin Phase 7. Keep Phase 6 YELLOW.

This is a specification gap before it is an implementation defect — the plan
never said who supplies the causal judgment, so the governing documents move
first:

1. Record a new owner decision for the principle: observe first, infer
   cautiously, ask for a concrete fact if needed, ask for current subjective
   state when that state itself matters, and never ask the owner for the causal
   relationship the system exists to learn. Amend canonical plan sections 20
   and 51, and D-054 and D-064, to state it. D-066 is generalized by this, not
   overturned; read D-056 alongside.
2. Then repair under plan section 42 against acceptance criteria A–I in the
   report, addressing the whole class — every verb whose profile lists
   'effect', and every surface rendering an effect-derived figure — not the
   walk alone.
3. Write the synthetic/adversarial coverage the report lists, including the one
   whose absence allowed this: the engine still learns something useful when
   the owner answers no causal question at all. Prove each regression fails
   when its behaviour is reintroduced.
4. Revise tests/synthetic/inferred-evidence.test.ts:656-668 and :680
   deliberately and record why — they currently assert the limitation as
   correct behaviour and would fail on a correct fix.
5. Preserve every deferred item and everything round 1 passed. Historical
   aspect:'effect' records must keep their original meaning — owner
   attributions — and must not be relabelled, reinterpreted or deleted.
6. Do not invent sensors or integrations the app does not have. Owner-reported
   state, lifecycle events and time are the whole budget.
7. Deploy a repaired checkpoint, stay YELLOW, and return a retest prompt
   addressed to the SAME independent QA conversation.

Do not ask the owner to paste the report's contents — you have the path.
```

---
---

# Round 1 — the original test record (unretracted)

> Everything below is the round-1 record exactly as written. Its individual
> findings stand; only the overall verdict is superseded by Round 1a above.

**Round 1 verdict (superseded): PASS.** A fresh conversation, per D-077, that
had not seen how this phase was built. Every scenario the phone-check list names
was exercised against the deployed Preview, all eleven defects the builder's own
gate recorded (DEF-0034–DEF-0044) were independently re-reproduced from their
own repro steps rather than taken on the builder's word, and all eleven no
longer reproduce. No new blocking or non-blocking finding *within the gate as
written*. The full automated suite was independently rerun from the checked-out
repository rather than trusted from `PHASE_STATUS.md`, and it matches the
builder's counts exactly.

## Identity

|                          |                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase                    | 6 — Timeline + Insights                                                                                                                                                             |
| Checkpoint SHA tested    | `e681a66` — the product checkpoint named in `docs/PHASE_STATUS.md` and `docs/NEXT_PROMPT.md`                                                                                       |
| `main` HEAD at test time | `a6a9e67` — confirmed documentation-only past `e681a66`: `git diff e681a66..HEAD --stat` touches only `docs/NEXT_PROMPT.md` and `docs/PHASE_STATUS.md`, no `src/` or `tests/`      |
| Deployed Preview SHA     | `a6a9e67`, read live from `preview/build-info.json` (`commitSha a6a9e6716f1182bab75b798c70028812b721eeaa`, built `2026-08-21T22:09:50.243Z`) |
| Match                    | Yes — deployed Preview equals `main` HEAD, and `main` HEAD is `e681a66` plus docs only |
| Preview URL tested       | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                          |

## Mobile configuration

Claude Browser pane, 360×780 viewport, Android Chrome UA
(`Mozilla/5.0 (Linux; Android 14; Pixel 8) ... Chrome/148 Mobile Safari/537.36`),
`devicePixelRatio` ≈ 2, `navigator.maxTouchPoints` 5 — confirmed live via
script before testing began, not assumed from the resize call.

**Disclosed limitation.** `computer` tool click actions timed out after 30s on
every target tried, while the page stayed responsive throughout. Screenshots
worked once the tab was fronted, so visual verification is by real rendered
screenshots. Real interaction was driven by dispatching `.click()` on the actual
DOM element through the page's own JS context, exercising the same React
handlers a touch would, plus `getBoundingClientRect()` for touch-target sizing.
It does **not** reproduce genuine multi-touch gesture timing. Nothing in this
phase's diff touches double-tap protection, and Timeline structurally cannot
receive a double-tap-created duplicate (D-087), so the gap was judged low-risk
for this phase. It is not physical-phone validation, which section 37 keeps as a
separate, still-required check.

## Governing acceptance criteria used

`docs/CANONICAL_REBUILD_PLAN.md` v1.2 in full (section 51 as the phase's gate;
sections 4.6, 11, 26, 27, 36, 37, 60, 61, 63, 64); `docs/qa/README.md` including
§3a/D-082/D-083; `docs/PHASE_STATUS.md`'s Phase 6, 5 and 4 entries read as the
builder's account and independently checked; `docs/DECISION_LOG.md` D-059–D-079
and D-084–D-088; `docs/DEFECT_LEDGER.md` DEF-0020 and DEF-0028–DEF-0044;
`docs/ARCHITECTURE_BOUNDARIES.md` with the `OPEN_TO_SURFACES` boundary confirmed
against the actual guard. Implementation read fresh: `insights.ts` in full,
`timelineEntries.ts`, `TimelineScreen.tsx`, `InsightsScreen.tsx`,
`EvidencePieces.tsx`, `describe.ts`, and the diffs to `NowScreen.tsx`,
`learning.ts`, `outcomes.ts` and `buildInfo.ts`.

## Scenarios and flows tested

| # | Scenario / flow | What it checks | Result |
|---|---|---|---|
| 1 | Deployed `build-info.json` vs. checkpoint | Preview SHA matches | **PASS** |
| 2 | `#/qa` header eyebrow | Phase identity claim (DEF-0031's class) | **PASS** — reads "PHASE 6" |
| 3 | "Nine months of evenings" → Insights, closed | Six cards, no percentage, ordinary language | **PASS** |
| 4 | Same → kitchen card, opened | Evidence panel figures | **PASS** |
| 5 | Same → Now, **See evidence** | DEF-0039: conclusion vs. tally | **PASS** |
| 6 | Same → Timeline, one page | Reads as a life; day order consistent | **PASS** |
| 7 | "A file with damage in it" → Timeline | Malformed rows isolated (DEF-0043) | **PASS** |
| 8 | Same → Insights, Now | Malformed history breaks no surface | **PASS** |
| 9 | "Two ordinary weeks" → Timeline | Private-domain discretion (section 11) | **PASS** |
| 10 | "One answer, and a lot of silence" → Insights | Honest empty state | **PASS** |
| 11 | "A month of what actually worked" → Insights | Withheld-rate state and threshold | **PASS** |
| 12 | Correct a belief on "Nine months of evenings" | Section 62: correction preserved | **PASS** |
| 13 | "Everything current except the studying" → Insights | Coverage card, DEF-0044 | **PASS** |
| 14 | "A settled arrangement, and one week away" → Timeline | DEF-0042 temporary vs. standing | **PASS** |
| 15 | Career & Learning → "Recently" | D-088 shared wording without a tag | **PASS** |
| 16 | Touch-target sweep, Insights + Timeline | No new sub-44px control | **PASS** — only "More" (80.6×36, P4-7) |
| 17 | Overflow / sticky sweep | DEF-0036's class; D-087 | **PASS** |
| 18 | `npm run test` full suite | Confirm the 700-test claim | **PASS** — 42 files, 700/700 |
| 19 | `npm run verify` | Confirm the clean-checkout gate | **PASS** |
| 20 | "A Thursday with nothing needing doing" → Now | P4-6 deferral, live | **Confirmed unchanged (deferred)** |

## Round-1 findings

None within section 51's gate as written. All eleven of DEF-0034–DEF-0044 were
re-reproduced from their own recorded repro steps against the deployed Preview
and none reproduce (mapping: #4/#5 → DEF-0039; #7 → DEF-0043; #13 → DEF-0044;
#14 → DEF-0042; #6 → DEF-0034/0035/0037; #17 → DEF-0036).

## Deferred items — confirmed unchanged

- **P4-6 — the no-action eyebrow** renders a whole sentence in the uppercase
  micro-label slot. **Reconfirmed live** (scenario 20).
- **P4-7 — the More button is 80.6×36**, below 44px. **Reconfirmed live** by
  direct measurement (scenario 16).
- **A started move that is never settled** stays "Under way" indefinitely.
  Carried forward by code-diff inspection — nothing in `f50137d..e681a66`
  touches `lifecycle.ts` or any started-move path.
- **The four Phase 5 deferrals** (inline Life-area link under 44px; no new-goal
  creation; no dated situational-exception control; domain-scoped "Recent
  changes") — carried forward by diff scope; nothing in the diff touches
  `src/features/life/`.
- **Older deferrals** (ranking dimensions costing weight on ignorance; `hold`
  never generated; free-text constraints shown not enforced; Emotional Health
  with no standing concept) — carried forward by diff scope. **Note:** the last
  of these is now directly relevant to QA-A1 and should be reconsidered as part
  of that repair rather than carried forward again.

No new deferral is introduced by this QA pass.

## The one thing worth a second look that is not a defect

`PHASE_STATUS.md` records that `now.spec.ts`'s "creates one episode from a
double tap" failed once in a full desktop Playwright run during the repair gate,
then passed on every rerun. This session had no Playwright against the deployed
Preview and could not attempt to reproduce it, so it is neither confirmed nor
cleared here — repeated only so a reader need not cross-reference to know it
exists.
