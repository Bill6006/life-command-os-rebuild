# Next dispatch — routing 94: the check-in, the readings and the score

**Phase:** 94 — **State: the readings, the score and what they are for**

**Written by the Claude builder conversation that finished the phase before this
one.** Independent QA is **off** for this run by owner instruction, so this file
dispatches the next build phase, is addressed to the **Claude builder**, and
starts no QA round.

---

## STOP — routing 94 is under a machine-enforced hold

`docs/CAMPAIGN_HOLDS.md` carries
`<!-- lco:decision id=D-285 status=open blocks_phase=94 -->`.

**The owner must name the shipped default depth and frequency of the check-in
before this phase starts.** D-285 records why it is a hold rather than a note: the
default is the real decision, because most people never open settings and the
owner will live with whatever ships on exactly the days he is too tired to change
it. **A builder who picks it to be safe re-creates the starvation this phase
exists to end.**

If the hold is still `status=open`, stop and say so.

---

## Read this part first: the plan changed on 2026-09-04

**The roadmap you may have seen before this is superseded.** An owner interview
during the routing 93 closeout produced eight decisions, a routing shift, and one
redrawn prohibition.

**Read [`STATE_ENGINE_OWNER_DECISION.md`](STATE_ENGINE_OWNER_DECISION.md) in full
before you plan.** Then **D-285 … D-292**. Nothing else in this file makes sense
without them.

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

---

## The phase

**Routing 94 — the check-in, the readings, and the score. Nothing else.**

### Scope, and it is deliberately small

1. **A check-in ritual** at scheduled times, with a notification bringing him to
   it. Fixed set, bounded, skippable, and the same shape every time.
2. **The readings.** Feeling (mood, irritation, stress, overwhelm), drive
   (motivation, confidence, focus), connection (loneliness, social energy), and
   energy. **Plus a morning-only reading:** sleep hours and sleep quality.
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
Causal chains (D-290). Learned weights.** They are routings 96, 97 and 98 and they
all need data this phase is what produces.

**Nor is Fatherhood.** It moved to routing 95 (D-292) and its scope is unchanged
apart from D-291: progress rollups ship as counts, never as percentages or bars.

### Do not repeat routing 93's mistake

Routing 93 went to fourteen packages against a five-package split rule and D-283
concludes it should have been two phases. **Six items are listed above. If you find
a seventh, stop and say so** rather than absorbing it.

---

## Two things that are genuinely unresolved, and are yours to raise not to decide

**1. Two of the readings do not exist as concepts.** D-166's six emotional
dimensions are mood, stress, motivation, confidence, loneliness/social-connection
and overwhelm. The owner's check-in also names **irritation** and **focus**, and
neither is in that list — D-166 is explicit that its six are owner-stated and that
energy and tiredness are deliberately not among them. **Adding two dimensions is an
amendment to D-166 and is the owner's to make.** Raise it before you build the
check-in; do not silently map irritation onto stress, and do not silently add them.

**2. The default depth and frequency** are the hold above. They are not yours.

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

FIRST: check docs/CAMPAIGN_HOLDS.md. Routing 94 is blocked by
lco:decision id=D-285 until the owner names the shipped default depth and
frequency of the check-in. If it still says status=open, stop and say so.

Read docs/NEXT_PROMPT.md in full, then docs/STATE_ENGINE_OWNER_DECISION.md in
full, then D-285 through D-292 in docs/DECISION_LOG.md. The roadmap changed on
2026-09-04 and those documents are the change.

Build six things and no more: a scheduled check-in ritual with a notification;
the readings (mood, irritation, stress, overwhelm, motivation, confidence,
focus, loneliness, social energy, energy, plus morning-only sleep hours and
quality); storage as ordinary observation records; a 0-100 state score at equal
weights stated as equal weights; a settings control for depth and frequency
separately; and a second question budget for the ritual, exempt from the swing
rule and counted separately from decision-relevant asks.

Not in this phase: the move catalogue, effect measurement, the forecast,
exploration, causal chains, learned weights, or Fatherhood. Routing 93 went to
fourteen packages against a five-package rule (D-283). Six items are listed. If
you find a seventh, stop and say so.

Raise before building: irritation and focus are not among D-166's six emotional
dimensions. Adding them amends D-166 and is the owner's decision, not yours. Do
not silently map irritation onto stress and do not silently add concepts.

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

Check docs/CAMPAIGN_HOLDS.md first — routing 94 is held by D-285. Then read
docs/NEXT_PROMPT.md and docs/STATE_ENGINE_OWNER_DECISION.md in full and execute
the routing 94 dispatch exactly as written. Keep the Phase field exactly 94,
leave the three QA handoffs in docs/qa/ unedited, reach YELLOW rather than
GREEN, and do not ask me to paste the file contents.
```

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
