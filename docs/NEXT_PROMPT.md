# Next dispatch — plan phase 2: new moves

**Phase:** 95 — **New moves: the catalogue wired in, "why this", "I'm testing this", "did you do it?"**

**Next actor:** Claude Builder
**Target system:** Claude Builder
**Model:** Claude Opus 5
**Reasoning / Effort:** Max
**Conversation:** NEW
**Independent QA:** OFF. **Control:** the owner says **Green** or **Yellow** (D-300). No orchestrator.

---

## Read `PLAN.md` at the repository root first

The plan is numbered **1 to 9**. This is **plan phase 2**; the orchestrator's
integer for it is **95** (the table at the bottom of `PLAN.md` is the only place
that mapping lives). The older documents in `docs/` are history and are not
planned from. **Read `PLAN.md`, then `docs/MOVE_CATALOGUE.md`, then this file.**

**Nothing of this phase has been built.** An earlier conversation drafted a
dispatch for it and reverted it; no code landed, no QA handoff exists for it.

## The owner's decisions, and they are settled

He read the catalogue and answered its questions. **Do not reopen them, do not
re-argue them, and do not quietly widen them.**

### 1. E7 "Book the exam date" is CUT

His word was _"cut it"_. Remove the entry. **The catalogue is 26 entries** — 19
tier 1, 7 tier 2. Two consequences to carry through rather than leave dangling:
nothing left in the catalogue costs money or is irreversible, so say so where the
admission test is recorded; and the friction range now tops out at 0.70 — the
band above `hands-on-lab`'s 0.70 existed for E7 alone. **Do not leave a 0.85
ceiling in the code with nothing at it.**

### 2. E3, A6, J1 and G1 all ship — with three conditions

**E3** (45-minute timed section) keeps its marking as needing an evening that is
actually his. **A6 and J1 take something from the block they happen in** — A6
gives nothing back until tomorrow, J1 makes the evening worse — and **the app has
to say that out loud on screen.** **G1** (call instead of texting) is a
`reach-out` instance and must be resolved by decision 3, not left sitting beside
its category.

### 3. Category versus instance: you decide, and you justify it

Six of the sixteen shipped verbs are categories rather than moves: `wind-down`,
`recover`, `ease-off`, `lighten-the-day`, `move`, `reach-out`. Either the category
**retires** when its instances land, or it **stays and the instances become its
objects**. **What must not happen is that neither is chosen** — the default is a
category and one of its own instances on the same evening, and nothing in
`recent-duplication`, `ACTION_FAMILIES` or the shown ledger can see it, because
all three act on one move at a time. The QA handoff carries the argument, not
the conclusion.

### 4. Effect stays on feelings. Write the gap down; do not close it

**Do not extend the check-in in this phase.** Every entry whose plausible effect
lands on none of the thirteen readings must declare that **in its own record**;
the seven certification entries and the two training ones are the known cases.
**The app must never claim to have learned from an entry it cannot read.**
Register the gap as a named finding for the owner in the QA handoff, in one
paragraph, and do not solve it here.

### 5. "Three good things at bedtime" stays out

Refused in the research for being the entry a generic library contains first.
**That refusal stands.**

### 6. Nineteen tier-1 entries is enough variety

**Do not pad the catalogue** to make a number look better.

## Scope — `PLAN.md` phase 2, and no more

1. **The catalogue wired in as candidates.** Tier 1 offerable on an empty store —
   that is the day the catalogue exists for. Tier 2 needs a learning topic or a
   person to exist first and must not fire before one does. Research priors seed
   `now`, `tomorrow` and `friction`; the remaining profile fields are yours under
   the rules that already govern them. Where the owner's previous app measured
   the same move — `PLAN.md` phase 2 lists three — you may read those numbers
   when setting a prior; nothing is imported.
2. **"Why this"** on every move, one tap: which readings it is expected to move,
   and how sure the app is.
3. **"I'm testing this"** on any move with fewer than a handful of the owner's own
   observations.
4. **"Since last time, did you…"** — the check-in gains one-tap yes/no for moves
   that were offered. This is the action record every later phase needs.
5. **Coherence** — no two moves offered in one day that contradict or duplicate;
   decision 3 is how.
6. **Two evening additions, optional, one tap each** (`PLAN.md` phase 2): a
   one-line _"tomorrow's minimum win"_, and two chips — _caffeine after midday_,
   _late or heavy dinner_. Stored as ordinary observations. **Not** the daily
   review the owner's previous app had; that is dropped on purpose.

**Two rules from the owner's previous app, now `PLAN.md` rules 11 and 12, that
bind everything here:** every question has to earn its place — no near-duplicate
readings, no question the brain does not use; and **silence is not evidence** —
a reading not taken never raises or lowers anything. If a candidate's ranking
would change because something was _not logged_, that is a defect.

**The check-in must feel instant.** Measure a tap-to-paint on a mid-range phone
and record it.

**Also yours:** the day-one rule for choosing among unmeasured moves; whether the
ten-minute walk and the shipped twenty-five-minute one share a family — a
deliberate act with a name on it, or an explicit refusal; and showing the
low-`now` entries (A1, A6, E6, F1, J1) differently, since two of them take
something from the evening.

**Not in this phase:** measuring what a move did (plan phase 5). Learned weights.
The forecast. Anything about Adaya. **If a seventh item appears, stop and say so.**

**Every phase ships looking finished.** Plan phase 4 is the visual system;
nothing you ship here may look unfinished.

## Bounds that do not move

Unknown stays unknown; nothing is back-filled. The score is a reading and never
acquires a quality adjective. Nothing grades the owner as a person. Moves offered
must not contradict or duplicate within a day.

## Gates, then closeout

Run `npm run verify`, the full 360/430/1280 browser matrix at one worker on a
clean port, the privacy, copy and adaptation scans, checkpoint equivalence, CI,
release integrity from that CI run's own manifest artifact, and the Android-style
deployed gate. **Read the summary line and its count, never a pipeline's exit
code.** Commit in working increments. Deploy and prove the deployed checkpoint is
what Preview serves. Then the owner opens it on his phone.

Update `docs/DECISION_LOG.md`, `docs/DEFECT_LEDGER.md`, `docs/PHASE_STATUS.md`.
Write **`docs/qa/PHASE_95_QA_HANDOFF.md`** with the routing block copied from
`PHASE_92_QA_HANDOFF.md`'s shape — Phase, Round, Actor, Conversation, Model,
Reasoning level — or the orchestrator cannot record its debt. Do not edit the
handoffs for 91–94.

## Then stop and hand it to the owner — this is the whole protocol (D-300)

When the gates are green and the deploy is proven, **tell the owner, in a few
lines: what to open on his phone, what to look at, and what is new.** Then stop.

- **"Green — next phase"** → write this file as the dispatch for **plan phase 3
  (see yourself)** with `Phase: 96` on its own line near the top, and **start
  phase 3 in this same conversation** if context allows. If it does not, say so
  and stop; the next conversation picks up from this file.
- **"Yellow — …"** followed by what is wrong → fix it in place, re-run the gates
  that cover the fix, re-deploy, and come back the same way.

**You may not approve your own phase.** Only the owner's Green does that. Record
the phase in `docs/PHASE_STATUS.md` as **YELLOW — awaiting the owner** until he
says it, then as **GREEN — owner-accepted**. Independent QA is still owed and is
not waived; the per-phase handoff is where that debt is visible.

---

```text
Continue the Life Command OS rebuild. You are the builder and the orchestrator.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read PLAN.md at the repository root, then docs/NEXT_PROMPT.md, and execute the
phase it dispatches exactly as written. Do not ask me to paste file contents.

I control this with two words. When a phase's gates are green and the deploy is
proven, tell me what to open on my phone and what to look at, then stop and
wait. I will say "Green - next phase" or "Yellow - " with what is wrong. Green
means write the next phase's dispatch into docs/NEXT_PROMPT.md and keep going in
this conversation while context allows. Yellow means fix it in place and come
back. Never approve a phase yourself; never start a QA round; never edit the
handoffs for routing 91-94.

When a phase is finished, make the LAST meaningful line of docs/NEXT_PROMPT.md
exactly:
<!-- LCO_COMPLETE -->
```

<!-- LCO_COMPLETE -->
