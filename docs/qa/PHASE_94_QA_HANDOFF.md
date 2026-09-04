# Phase 94 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 94 — State: the readings, the score and what they are for

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 94 builder, and not any routing 91,
92 or 93 conversation.
**Model:** Codex.
**Reasoning level:** **High** — never Max, which is Claude's level.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

---

## Read this first: the whole phase is reachable from an empty store

Routing 93's handoff had to say that almost nothing it built could be reached
from a shipped history, and that the builder had chosen the conditions under
which his own code speaks. **This phase is the opposite and it is the strongest
thing about the submission.**

Open the deployed Preview with no records at all, at any time between 08:00 and
midnight in your own timezone, and the check-in is on the first screen. Answer one
reading and a figure appears with its denominator under it. Nothing needs seeding,
no scenario has to be loaded, and the QA laboratory is not involved.

**So the most valuable thing Round 1 can do is use it as the owner would**, for a
whole day if you can: morning, midday and evening, on a phone, answering some and
skipping others. Everything below is an aid to that, not a substitute.

---

## What was built, and the six things it was allowed to build

The dispatch listed six and said to stop and say so at a seventh. Nothing was
absorbed; the count is stated here so you can check it rather than take it.

| #   | What                                              | Where                                                                    |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | A scheduled, skippable check-in with a reminder    | `domain/checkIn.ts`, `intelligence/checkIn.ts`, `platform/reminders.ts`  |
| 2   | The readings at D-293's default, with 65 anchors   | `intelligence/readings.ts`, three new concepts in `domain/concepts.ts`   |
| 3   | Stored as ordinary observation records             | `checkInRecord` — no schema invention                                    |
| 4   | A 0–100 state reading at equal weights             | `intelligence/state.ts`                                                  |
| 5   | Depth and frequency, separately                    | `features/more/CheckInSettingsPanel.tsx`, a `check-in-setting` record    |
| 6   | A second question budget                           | `CHECK_IN_PROVENANCE` and `answeredInCheckIns`                           |

---

## The four things this brief most wants a second pair of eyes on

### 1. The sixty-five anchors are drafted and not approved

The owner reviews them. The rule they were written against is his:

> _"For mood, **good** is not helpful enough for me. I don't really know what
> good means."_

**The mechanical test he set:** could he pick between two adjacent anchors
_without_ knowing which one is higher? If the only thing separating them is
intensity of the same vague word, they are not anchors.

`tests/synthetic/check-in.test.ts` holds a version of this as a guard — a closed
list of _degree words_, with an anchor failing only when it is made of nothing
else — and the guard is calibrated against the two sets the owner turned down so
it cannot have been tuned until the shipped copy passed. **A guard is not a
judgement.** Read all sixty-five and say which ones you would not have written.
Two are the owner's own worked examples (mood and focus) and should be left alone;
four more are close to his own words (irritation, hunger).

**The pairs the builder is least sure of**, offered so you do not have to find
them: energy 4 and 5 (_Plenty — the day is covered_ / _Buzzing — I need to burn
some off_), and social energy 4 and 5 (_Happy to see people_ / _Actively want
people around_). Both are surplus-versus-more-surplus, which is the shape the rule
is about.

### 2. What the score is over is a builder decision inside an owner one

D-287 approves a 0–100 figure where _100 is every dimension at its best_ and does
**not** say which dimensions. D-300 draws it mechanically — every check-in reading
about how he is now that the registry reads as a scale with a direction — which
leaves three out:

| Left out          | Because                                                   |
| ----------------- | --------------------------------------------------------- |
| Loneliness        | the registry declares `sense: 'neither'` — no better end   |
| Hours slept       | a quantity; a best number of hours would be a target       |
| How the night went | a reading about last night rather than about now          |

The first is mechanical and follows the registry. **The third is the builder's
argument and is the one to attack**: sleep quality is a scale with a direction and
is excluded because putting a probable *cause* of a good day inside the number
that good day is measured by is circular. That is a real argument and it is also
a phase early — D-290's bar does not exist yet, and nothing yet measures anything
against this score.

**A second reader might reasonably say sleep quality belongs in it.** The owner
has not been asked.

### 3. A standing guard was narrowed, and the trade is D-299

D-166's rule was **nothing anywhere composites the six emotional dimensions**,
held by a shape guard over every file in `src/`. D-287 approves a composite, so
the guard now reads _here and nowhere else_, and the exemption is
`src/intelligence/state.ts`.

Two checks were added on the exempt file (one reduction, in one function; and it
names none of the six in its own code, because it walks the catalogue and asks the
registry) and one new guard was added that the old one never needed: **a quality
word on any surface that renders the score fails the build.**

**Check the narrowing rather than the tests.** The question is whether
`state.ts` is genuinely a state reading or `emotional.score` wearing a different
name, and D-287 says the distinction survives only while the number stays a
reading.

### 4. The reminder is the thinnest thing in the phase

It works **only while a tab or window is open** — no service worker ships, and
the control says so in those words. There is **no test that a notification ever
appeared**: jsdom has no `Notification` and the browser matrix does not grant the
permission.

What is proved is narrower and is the part that matters: `useCheckInReminder.ts`
can name **no registered concept and no concept label**, at any depth, on any
slot, and never reaches the anchors or the score. A notification lands on a lock
screen in front of whoever is there.

**Worth doing by hand:** grant the permission in a real browser, stand just before
08:00 with the app open, and see whether one arrives and whether pressing it lands
on the check-in.

---

## What this phase measured, and what it did not re-baseline

**Routing 92's 216 / 218 and routing 93's 15 are untouched**, and
`reach-gate.test.ts` still asserts each at exactly the figure it shipped with.
That is worth checking rather than taking: **extending `energy.current` from four
answers to five could have moved the guide's share rule** — `worthATap` measures
overturns against the option count — and the claim is that it measurably did not.

**Routing 94's own delta is 95, over 78 distinct check-ins**, over the same
twenty-seven pre-92 histories at five hours each. The two figures together are the
honest reading: roughly one card per open check-in, rather than one card standing
all day counted five times, which is how routing 93's fifteen is made.

**It is the worst case by construction.** No synthetic history contains a check-in
answer, so every check-in in the library is unanswered and the card is showing.
A finished check-in shows nothing. **What a real store produces is bounded by how
many check-ins go unanswered** — which is exactly the signal D-294 says to watch
after this phase ships.

---

## Two defects, and one of them says something about the gates

**DEF-0170 — the check-in was unreachable from the one store it was built for.**
`NowScreen` returns `EmptyNow` before it reaches anything this phase added, so the
card was on every history's Now screen **except the empty one**. Found by the
browser matrix on its first run. Below that layer nothing could see it: nothing
under `tests/` renders `NowScreen`, and `dueCheckIn` answered correctly the whole
time. **The reading was right and the owner was never told.**

**DEF-0169 — the suite was red before the phase started.** `npm run test` failed
twice out of two at `61bb033` with 30-second timeouts on two library sweeps, both
green in isolation, CI green on the same commit. The ceiling is now 120 seconds
(D-303) and **the cause is open**: a dozen library-wide sweeps run concurrently
and each is single-threaded. It is an instrument item and belongs beside the
nineteen D-210 findings.

---

## Where the builder thinks this is weakest

Stated rather than left to be found.

**The check-in has never been used for a day.** Every proof of it is a
constructed store or a driven browser session inside one window. Nobody has
answered a morning, come back at midday, skipped the evening, and looked at what
the app made of that.

**The score has never been looked at over time.** It is recomputed from whatever
is fresh, and nothing in this phase draws it as a series, compares two days, or
notices that a dimension has drifted. That is the next phase's work and it means
the number's usefulness is untested.

**Depth and frequency have three levels each and no evidence behind the middle
one.** `full` is D-293's and `fewest` is a quotation from the owner. **`shorter`
is a builder's judgement** — everything that moves within a day, plus the night —
and nothing but the argument stands behind it.

**The `check-in-setting` record has one consumer.** It is the right shape and it
is claimed to matter because reading density is a covariate of the series the
forecast will use; that claim is about a phase that does not exist yet.

**And the ritual could still become the thing it exists to avoid.** The owner's
previous app _"asked but never learned"_ — 7 to 19 questions a block, nothing
coming back. Twenty-three readings a day is more than that. What this phase
returns for them is one figure and a list of his own words, immediately. **That is
the minimum and it is deliberately all that is claimed**, and whether it is enough
is a judgement about a product rather than about a test.

---

## Running it

```text
npm ci
npm run verify
npx playwright test --workers=1
node scripts/privacy-scan.mjs
node scripts/android-gate.mjs
node scripts/checkpoint-equivalence.mjs
node scripts/release-integrity.mjs
```

Read the summary line and its count, never a pipeline's exit code (D-284).

The deployed Preview is
`https://bill6006.github.io/life-command-os-rebuild/preview/`, and the checkpoint
it must serve is named in `docs/PHASE_STATUS.md` under routing 94.

---

## What is not yours to change

`docs/qa/PHASE_91_QA_HANDOFF.md`, `docs/qa/PHASE_92_QA_HANDOFF.md` and
`docs/qa/PHASE_93_QA_HANDOFF.md` are three unapproved phases' briefs and are not
edited by this round or any other. Routing 91 is BUILT / QA DEFERRED with Round
10's brief written and unrun; routing 92 is BUILT / QA DEFERRED with zero rounds;
routing 93 is YELLOW with zero rounds.

**Nothing in this file approves any part of any of them.**
