# Phase 92 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 92 — Reach: what the brain can see

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 92 builder, and not any routing 91
conversation.
**Model:** Codex.
**Reasoning level:** **High** — never Max, which is Claude's level.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

---

## Read this first: one gate item is open, and it is yours to judge

The audit's Reach gate includes a **no-added-noise check** — _"making dormant
concepts live must not increase how often the app speaks, measured across the
whole scenario library."_

Both figures were measured rather than argued, by running the same count in a
git worktree at `0d55300` — the commit this phase started from — and at this
phase's head, over the twenty-seven histories that existed before routing 92, at
five hours each.

| Measurement                                            | Before | After |
| ------------------------------------------------------ | ------ | ----- |
| Times the app speaks (move, hold, insight, growth, ask) | 216    | 218   |
| Histories that open on a question                       | 11     | 13    |

**The two are one concept, on two evenings.** `three-days-since` and
`observed-evenings` now ask _"How much have you got on your mind?"_ — the app is
about to suggest a twenty-five-minute walk, the body has already been answered
for, nothing else is in the way, and one answer would turn an effortful evening
into a restful one. Before the phase it asked nothing there.

**It was not suppressed.** Making the question rarer until the counter matched
would have meant removing a question whose answer changes the recommendation in
order to satisfy a count. That is a judgement, the builder made it, and D-077
exists precisely so a builder does not sign off his own judgement. Both numbers
are pinned as exact figures in `tests/synthetic/reach-gate.test.ts` so the
exception cannot widen unobserved, and a further test asserts that no concept
this phase added takes a question slot on any of the other twenty-five
histories.

The reasoning is **D-267**. If you disagree, the finding is legitimate and the
repair is a narrower `applies` predicate on `emotional.overwhelm` in
`src/intelligence/reach.ts`.

---

## Build submitted

| Fact                    | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| Product checkpoint      | `b850dfc` — the commit every gate below was run on (D-147)                  |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/                 |
| Owner-visible behaviour | **changed** — Now, the Emotional, Health, Career, Money and Direction pages |
| Owner phone check       | **required before GREEN**                                                   |
| QA report path          | this file                                                                   |

Confirm the deployed SHA against the checkpoint before testing:

```bash
node scripts/checkpoint-equivalence.mjs b850dfc --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
```

`node scripts/release-integrity.mjs` verifies the served bytes against the
manifest (D-211, QA-84-064). Run it against the deployed Preview.

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** A
reviewer who reads the design record before opening Now already knows what a
reading is *supposed* to mean and will read the screen as confirming it.

1. `docs/PRODUCT_ADJUDICATION_2.md` **§6.4** (the phase contract), **§5.1** (S1a),
   **§5.2** (S2), **§13B** (owner decision #3), **§13C** (owner decision #2)
2. `docs/DECISION_LOG.md` **D-259 … D-267** — this phase's decisions
3. `docs/DEFECT_LEDGER.md` **DEF-0155 … DEF-0164** — what the phase found while
   building it, including the three the browser matrix found on its first run and
   the one the phone gate found on its own
4. `docs/WHOLE_APP_INTELLIGENCE_AUDIT.md` rows **AUD-0040, 0041, 0011, 0006,
   0012, 0013, 0045, 0047, 0050**
5. `docs/CANONICAL_REBUILD_PLAN.md` section **43A** (the routing map)

---

## What the phase claims to have built

| Package | Claim                                                                                                 | Where to attack it                                              |
| ------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 92.1    | `assembleSituation` reads the registry; two guards; the discretion renderer                           | `situation.ts`, `tests/unit/architecture-guards.test.ts`         |
| 92.2    | `materialToDecision` is measured; five declarations corrected                                          | `tests/synthetic/reach-material.test.ts`                         |
| 92.3    | S2 Tier 1 + Tier 2; D-166's six dimensions; AUD-0013 + AUD-0047                                        | `concepts.ts`, `reach.ts`, `candidates.ts`                       |
| 92.4    | C21's concept half with enforcement; AUD-0045's per-object profile and owner routines                  | `blockers.ts`, `routines.ts`, `constraints.ts`                   |
| 92.5    | S1a's horizon, with the migration rule proved by a pinned digest                                       | `moves.ts`, `outcomes.ts`, `tests/synthetic/reach-horizon.test.ts` |
| 92.6    | AUD-0012, AUD-0006's migration, correction 3.11's chokepoint                                           | `scenarios.ts`, `facts.ts`, `privacy.ts`                         |
| 92.7    | The privacy guarantee and the no-added-noise measurement                                               | `tests/synthetic/reach-gate.test.ts`                             |
| 92.8    | Research priors, option B                                                                              | `priors.ts`, `discovery.ts`                                      |
| 92.9    | The owner-use findings, each with an acceptance                                                        | `tests/synthetic/reach-owner-findings.test.ts`                   |

---

## The ordinary-owner contract — run this on the deployed app

§6.4's own list, and it is the half that matters most. Fresh store, two domains,
across simulated days.

1. **Two of six.** Record an emotional reading on **two** of the six dimensions.
   Confirm the other four read as unknown on the Emotional page and that
   **nothing anywhere aggregates them** — no wellbeing figure, no overall score,
   no combined trend.
2. **A fact list that changed.** Run the same journey before and after giving a
   previously inert concept an answer, and confirm the decision's fact list is
   **visibly different** — not merely longer.
3. **The supervision blocker.** Record a **must-stay** blocker on a walk.
   Confirm the walk is **not re-offered** while the constraint stands, and **is**
   offered again after lifting it with _"Not true any more"_. Then check the
   bounded form: _"Can't leave tonight"_ should end with the day on its own.
4. **A week.** Advance a week and confirm the app is **not asking more questions
   than it was on day one**.
5. **A movement routine other than a walk.** Author one on the Health page and
   confirm physical health can suggest it — in his words, at the size he gave,
   and with no invented duration when he gave none.

---

## Where the builder thinks this is weakest

Said plainly, because a handoff that lists only strengths is a sales document.

**The two extra questions.** Above, and D-267. It is the one gate item that did
not come out even.

**Five shipped tests were inverted.** Two held routing 84's deferral of
AUD-0045 honestly — _"this phase builds the route; Reach walks it"_ — and this
phase is Reach walking it. Two held declarations the audit found wrong. One held
a promise about Social that was false because the registry said so. **An
inverted assertion is the easiest place in a phase to hide a regression**, and
each is worth reading as a diff rather than accepted on the commit message.

**`work.strain` and `family.child-present` are exempt from the starvation
gate.** Both carry a written circumstance and a named test that proves the
circumstance can make them win (§13B's discipline). The exemptions are in
`tests/synthetic/reach-dimensions.test.ts` and are worth attacking: an exemption
is a hole in a gate unless its test really constructs the circumstance.

**The measurement in 92.2 holds three things out of its comparison** — coverage,
the flavour of no-action, and anything a null probe also moves. Each exclusion
has an argument written beside it. If one of them is wrong, the flag it excused
is wrong.

**Four of the ten defects were found by a gate rather than by the builder, and
that is worth reading as a group.** Three came from the browser matrix's first
run and one from the phone gate's. All three are AUD-0040's blast radius: the fact list
became the true one, and three things that had been counting it were counting
something that no longer meant what they thought. The most instructive is
DEF-0161 — Now saying *"the picture is current"* while the guide underneath it
asked how much energy he had left. Nothing in the unit or synthetic suites saw
any of them.

**Two new histories entered the library.** `friendship-gone-quiet` and
`money-item-due`. Both are load-bearing for gates in this phase, which means a
fixture that flatters the code would flatter the gate too.

**The `time.free-now` migration touched the fact layer.** Every history in the
library carries the old id. A backup written before the rename is the case to
attack.

---

## Two debts this phase is carrying, so they are not lost

**Routing 91's independent QA.** Round 10's brief is written and waiting in
`qa/PHASE_91_QA_HANDOFF.md`, untouched by this run. It has not run. Whenever
independent QA is turned back on for 91, that round is the first thing owed.

**The nineteen D-210 instrument-hardening findings.** Still open, still
untouched, backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`, and not part
of routing 92's scope. They have now been deferred across six phases.

---
