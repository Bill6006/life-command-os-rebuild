# Next dispatch — routing 94: the check-in, the readings and the score

**Phase:** 94 — **State: the readings, the score and what they are for**

**Next actor:** Claude Builder
**Target system:** Claude Builder
**Model:** Claude Opus 5
**Reasoning / Effort:** Max
**Conversation:** NEW
**Independent QA:** OFF — this file dispatches a build phase and starts no QA round.

**Written by the Claude builder conversation that finished the phase before this
one.** Independent QA is **off** for this run by owner instruction, so this file
dispatches the next build phase, is addressed to the **Claude builder**, and
starts no QA round.

---

## The hold on this phase is released — check it anyway

`docs/CAMPAIGN_HOLDS.md` carried `id=D-285 blocks_phase=94` until the owner named
the shipped default. **He did, on 2026-09-04 — D-293 — and the declaration now
reads `status=closed`.** Confirm that before you start; if it says `open`, stop.

**The other hold is not yours.** `id=D-172 blocks_phase=98` is open and governs
longitudinal inference. It does not gate this phase.

---

## Read this part first: the plan changed on 2026-09-04

**The roadmap you may have seen before this is superseded.** An owner interview
during the routing 93 closeout produced **every decision from D-285 onward** — a
routing shift, a redrawn prohibition, and the check-in this phase builds.

**Read [`STATE_ENGINE_OWNER_DECISION.md`](STATE_ENGINE_OWNER_DECISION.md) in full
before you plan.** Then **every decision from D-285 to the end of the log** —
they are contiguous and there is nothing else after them. **D-293 specifies the
check-in you are building and D-296 says what happens straight after this phase.**
Nothing else in this file makes sense without them.

### The finding that caused it

Measured on a new store, three blocks a day across three days:

| Day | Questions asked               | Candidates |
| --- | ----------------------------- | ---------- |
| 0   | **1** — _"How much energy…?"_ | 1          |
| 1   | **1** — the same question     | 1          |
| 2   | **1** — the same question     | 1          |

The guide's own reason — _"4 question(s) could be asked and none of them would
change the answer"_ — is **accurate**. All four landed every answer on the same
move, because there was one move to land on. **One candidate cannot be re-ranked,
so nothing is worth asking, so the store stays empty.** `QUESTIONS_PER_DAY = 3`
was never reached; the information-value gate is what starved it.

### What the owner is building, in one sentence

A self-experimentation engine that must also make good daily decisions: sample his
state several times a day, recommend a move, measure what it did over the window
that suits it, forecast where he is heading, and deliberately test alternatives.

**This phase is the first slice of that and nothing more.**

### Three phases are still unapproved

| Phase      | State                             | Rounds run                                 |
| ---------- | --------------------------------- | ------------------------------------------ |
| Routing 91 | BUILT / QA DEFERRED               | 9, with Round 10's brief written and unrun |
| Routing 92 | BUILT / QA DEFERRED               | **0**                                      |
| Routing 93 | YELLOW — READY FOR INDEPENDENT QA | **0**                                      |

D-077 is unchanged. **All three QA handoffs in `docs/qa/` must survive unedited.**
Do not append to them, correct them, or tidy them.

**One narrow exception, and it exists because the omission already happened
once.** Each brief opens with a machine-read routing block — `**Phase:**`,
`**Actor:**`, `**Model:**`, `**Conversation:**`, `**Reasoning level:**`. The
orchestrator reads it to record that a phase owes QA. `PHASE_93_QA_HANDOFF.md`
shipped without it, so the orchestrator could not defer routing 93 and blocked
instead, and the phase went unrecorded in the debt ledger. **Repairing a missing
or malformed routing header is allowed and expected. Everything below it — the
rounds, the findings, the judgements — is not yours.**

**Your own handoff must carry that block.** Copy its shape from
`PHASE_92_QA_HANDOFF.md`, which is the one that parses.

---

## The phase

**Routing 94 — the check-in, the readings, and the score. Nothing else.**

### Scope, and it is deliberately small

1. **A check-in ritual** at scheduled times, with a notification bringing him to
   it. Fixed set, bounded, skippable, and the same shape every time.
2. **The readings, at the default D-293 sets.** **Morning (13):** mood,
   irritation, stress, overwhelm, motivation, confidence, focus, loneliness,
   social energy, energy, hunger, plus sleep hours and sleep quality. **Midday and
   evening (5 each):** mood, irritation, energy, hunger, stress. **23 a day** against
   the **one** a new store is asked now.

   **Three of them are new concepts** — `emotional.irritation`, `emotional.focus`
   and `health.hunger`. D-293 amends D-166's six to eight and adds hunger outside
   that list. **Irritation is not a variant of stress and must not be mapped onto
   it.**

3. **Stored as ordinary observation records.** No schema invention — the record
   layer already does this.
4. **A 0–100 state score.** 100 is every dimension at its best — a fixed ceiling.
   Per-dimension readings visible always; the overall figure visible too. **Equal
   weights, stated on screen as equal weights.** D-287's learned weights are
   **not** in this phase and need D-290's bar first.
5. **A settings control: depth and frequency, separately** (D-285), with the trade
   stated on the control — fewer readings will not produce the best results.
6. **A second question budget** (D-286): the ritual is exempt from the swing rule
   and counted separately from decision-relevant asks. **Never one pooled count.**

### Explicitly not in this phase

**The move catalogue (D-289). Effect measurement. The forecast (D-288). Exploration.
Causal chains (D-290). Learned weights.** They are routings **95, 97 and 98**, and
they all need what this phase produces.

**Nor is Fatherhood.** It is routing **96** (D-295) and its scope is unchanged
apart from D-291: progress rollups ship as counts, never as percentages or bars.

### Do not repeat routing 93's mistake

Routing 93 went to fourteen packages against a five-package split rule and D-283
concludes it should have been two phases. **Six items are listed above. If you find
a seventh, stop and say so** rather than absorbing it.

---

## One thing worth knowing about the eight dimensions

**Focus was not the owner's word.** It arrived through the previous conversation's
own grouping, which he then selected as a block, and he asked for it knowing that.
D-293 records why it matters: **focus is the dimension most likely to prove an
effect of energy and mood rather than a cause.** Build it, and when D-287's learned
weights arrive in a later phase, do not treat all eight as peers without checking.

**Irritation and hunger were his own words**, named unprompted in his first
description of the loop.

### How a reading is taken — decided, and it is not a slider

**Tap-to-pick labelled options, which is what the app already does.** The energy
question ships four: _Running on empty · Low · Enough · Plenty_. The owner asked
for exactly this and gave the shape himself — _"snappy | irritation = 2"_.

**Five anchors per reading**, and the same count for every one of them so the score
averages cleanly. Two consequences worth knowing before you start:

1. **This settles the scale.** `FactValue`'s `scale` carries its own `of`, so
   0–10 was representable — but **nobody can write eleven distinct meaningful words
   for irritation, or tell 6/10 from 7/10.** A labelled anchor is also repeatable:
   _"A bit snappy"_ means the same thing on Tuesday and Friday, where a bare 7
   drifts with how the owner feels about the number. That drift is noise in the
   exact series the forecast is built on.
2. **`CONCEPT.energy` currently ships four options, not five.** Extend it, or the
   score carries a mixed denominator. **Extending an existing owner-facing question
   is a change to a shipped surface** — say so in your record rather than treating
   it as tidying.

**You draft the anchors; the owner reviews them.** Thirteen readings at five
anchors is about sixty-five phrases of owner-facing copy, subject to the copy
discipline this repository already enforces — G-001's orphan pronouns, the
adaptation-claim scan, the rendered-copy scan.

### The rule the anchors have to meet, and the owner set it

> _"For mood, **good** is not helpful enough for me. I don't really know what good
> means."_

**An anchor describes a state the owner can recognise in himself. It does not name
a point on a scale.** _"Good"_, _"Moderate"_, _"High"_ and _"4 out of 5"_ are all
the same failure: they tell him where he is on a line without telling him what
being there feels like, so he has to invent the meaning fresh each time — and the
meaning he invents drifts with his mood about the number. **That drift is noise in
the exact series the forecast is built on**, which makes this a data-quality
requirement rather than a copy preference.

**The test, and it is mechanical.** Could the owner pick between two adjacent
anchors _without_ knowing which is higher? If the only thing separating them is
intensity of the same vague word, they are not anchors. Rewrite them until each
names something recognisable.

|       | **Fails**                                     | **Passes**                                                                                                                                                          |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mood  | Low · Flat · Alright · **Good** · Really good | Heavy — everything is effort · Flat — nothing wrong, nothing good · Level — getting on with it · Lifted — things feel easier · Bright — actively enjoying it        |
| Focus | Very low · Low · Medium · High · Very high    | Scattered — cannot hold a thought · Drifting — keep losing the thread · Patchy — fine in bursts · Working — getting there with effort · Locked in — time disappears |

**The owner's own two are the register to match**, and they pass because each names
something rather than grading it: _Fine · A bit snappy · Short-tempered · Snapping
at everything_ for irritation, and _Not hungry · Peckish · Hungry · Starving_ for
hunger.

**Where a short word genuinely is recognisable, keep it short.** _"Starving"_ needs
no gloss. The dash-clause form above is for the abstract dimensions — mood, focus,
motivation, confidence — where a bare adjective says nothing. **Do not apply one
shape to all thirteen.**

---

## The bounds that did not move

**Every reading stays bound by G-009.** Unknown stays unknown; a skipped check-in
produces no inferred value; nothing is back-filled. The owner's own rule governs:
**questions are for facts, and the forecast — which is not in this phase — is the
only place the app may assume.**

**Nothing grades him as a person.** _"You are at 62%"_ is a reading and is
permitted. _"You are falling behind"_, _"a bad week"_, any quality adjective on the
score — **that is the thing D-166 refused**, and D-287 says the distinction
survives only while the number stays a reading.

**The check-in must visibly earn itself.** The owner's previous app _"asked but
never learned"_ — 7–19 questions a block, data piling up, nothing coming back.
**Dense sampling alone reproduces that failure with better typography.** This phase
cannot deliver the learning, but it must not make the asking feel free either: what
he can see today for what he answered today is the minimum.

---

## How to run it

**Model:** strongest current Claude Opus-equivalent.
**Intelligence level:** **Max.**
**Conversation:** **NEW.**

```text
Build routing Phase 94 of the Life Command OS rebuild — the check-in, the
readings and the score. Keep the Phase field exactly 94.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

FIRST: check docs/CAMPAIGN_HOLDS.md. The D-285 hold on routing 94 was released
on 2026-09-04 and should read status=closed. If it says open, stop and say so.
The D-172 hold on phase 98 is open and does not gate this phase.

Read docs/NEXT_PROMPT.md in full, then docs/STATE_ENGINE_OWNER_DECISION.md in
full, then every decision from D-285 to the end of docs/DECISION_LOG.md -- they
are contiguous and nothing follows them. The roadmap changed on
2026-09-04 and those documents are the change.

Build six things and no more: a scheduled check-in ritual with a notification;
the readings at D-293's default (morning 13 — mood, irritation, stress,
overwhelm, motivation, confidence, focus, loneliness, social energy, energy,
hunger, sleep hours, sleep quality; midday and evening 5 — mood, irritation,
energy, hunger, stress); storage as ordinary observation records; a 0-100 state
score at equal weights stated as equal weights; a settings control for depth and
frequency separately; and a second question budget for the ritual, exempt from
the swing rule and counted separately from decision-relevant asks.

A reading is taken by tapping one of five labelled options, not with a slider --
the app already does this and the energy question ships four (Running on empty,
Low, Enough, Plenty). Five anchors for every reading so the score averages
cleanly, which means CONCEPT.energy has to be extended from four; that is a
change to a shipped owner-facing question, so record it rather than tidying it.
You draft the roughly sixty-five anchor phrases and the owner reviews them; they
are subject to G-001 and the copy scans like any other shipped string. Each anchor
must describe a state he can recognise, not name a point on a scale -- his words:
"for mood, good is not helpful enough for me, I don't really know what good means".
The test is whether he could pick between two adjacent anchors without knowing
which is higher. "Flat -- nothing wrong, nothing good" passes; "Good" does not.
Keep a short word where it is already recognisable ("Starving" needs no gloss) and
use the longer form for the abstract dimensions where a bare adjective says
nothing.

Three concepts are new: emotional.irritation, emotional.focus and health.hunger.
D-293 amends D-166's six emotional dimensions to eight and adds hunger outside
that list. Irritation is not a variant of stress and must not be mapped onto it.

Not in this phase: the move catalogue, effect measurement, the forecast,
exploration, causal chains, learned weights, or Fatherhood. Routing 93 went to
fourteen packages against a five-package rule (D-283). Six items are listed. If
you find a seventh, stop and say so.

Every reading stays bound by G-009 — unknown stays unknown, a skipped check-in
infers nothing, nothing is back-filled. The score is a reading and never
acquires a quality adjective; nothing grades the owner as a person.

Three phases are unapproved — routing 91 and 92 are BUILT / QA DEFERRED and
routing 93 is YELLOW. Do not edit docs/qa/PHASE_91_QA_HANDOFF.md,
docs/qa/PHASE_92_QA_HANDOFF.md or docs/qa/PHASE_93_QA_HANDOFF.md for any
reason.

Measure your own addition to how often the app speaks separately, and do not
re-baseline routing 92's 216/218 or routing 93's pinned 15. This phase will
raise it by design; say by how much and why.

Write class tests and biting reintroduction proofs, not fixtures that memorise
phrases. Run npm run verify, one full 360/430/1280 browser matrix at one worker
on a clean port, the privacy, copy and adaptation scans, the Android-style
deployed gate, checkpoint equivalence, CI and release integrity from that CI
run's own manifest artifact. Read the summary line and its count, never a
pipeline's exit code (D-284). Commit, push, deploy and prove the deployed
checkpoint is what Preview serves.

Update docs/DECISION_LOG.md, docs/DEFECT_LEDGER.md and docs/PHASE_STATUS.md, and
write docs/qa/PHASE_94_QA_HANDOFF.md as the brief for independent QA.

You may not approve your own phase (D-077). Reach YELLOW — READY FOR
INDEPENDENT QA and stop there. Do not mark anything GREEN, and do not start a
QA round yourself.
```

### Short launcher

**Model:** strongest current Claude Opus-equivalent. **Intelligence level:** Max.
**Conversation:** NEW.

```text
Build routing Phase 94 of the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Check docs/CAMPAIGN_HOLDS.md first — the D-285 hold on routing 94 was released
on 2026-09-04 and should read status=closed. Then read
docs/NEXT_PROMPT.md and docs/STATE_ENGINE_OWNER_DECISION.md in full and execute
the routing 94 dispatch exactly as written. Keep the Phase field exactly 94,
leave the three QA handoffs in docs/qa/ unedited, reach YELLOW rather than
GREEN, and do not ask me to paste the file contents.
```

---

## What happens immediately after this phase — D-296

**The catalogue research is not part of routing 95 and does not start until this
phase ships.** It is a separate exercise on the adjudication precedent — _"not a
build phase; it produced a decision, not a diff"_ — producing
`docs/MOVE_CATALOGUE.md`, carrying no routing integer, and meeting no build gate.
Routing 95 imports that document; nothing else does.

**Do not start it, scope it, or draft any part of it in this phase.** If you find
yourself writing candidate moves, stop — that is the seventh item.

**One thing this phase owes it.** The research has to supply `MoveProfile`'s `now`,
`tomorrow` and `friction` as **0–1 priors with citations**, and those are the
numbers the owner's measured effects will later move. **If anything you build here
changes what those fields mean, say so in your record**, because a research
exercise is about to be briefed against them.

---

## Four debts this dispatch is carrying, so they are not lost

**Routing 91's independent QA.** Round 10's brief is written and waiting. Unrun.

**Routing 92's independent QA.** Round 0 written, **zero rounds**, widest blast
radius of anything in the campaign.

**Routing 93's independent QA.** Round 0 written, **zero rounds**, and it opens
with D-283 — fourteen packages carrying one phase's worth of scrutiny.

**The nineteen D-210 instrument-hardening findings.** Still open, still untouched,
backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`. Deferred across seven
phases now.

<!-- LCO_COMPLETE -->
