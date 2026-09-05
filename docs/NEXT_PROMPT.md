# Next dispatch — phase 96: new moves

**Phase:** 96 — **New moves: the catalogue wired in, "why this", "I'm testing this", "did you do it?"**

**Next actor:** Claude Builder
**Target system:** Claude Builder
**Model:** Claude Opus 5
**Reasoning / Effort:** Max
**Conversation:** NEW
**Independent QA:** OFF — this file dispatches a build phase and starts no QA round.

---

## This phase is held until the owner has read the catalogue

`docs/CAMPAIGN_HOLDS.md` carries `id=D-298 status=open blocks_phase=96`. **It
releases when the owner has read `docs/MOVE_CATALOGUE.md` and answered the three
questions in `PLAN.md` phase 95.** If it still says `open`, stop and say so. His
answers are recorded on the hold when it is resolved — **read them before you
plan; they change what you wire.**

## Read `PLAN.md` at the repository root first

The plan was rewritten on 2026-09-04 from what the owner actually described. It is
the whole plan. The older documents in `docs/` are history and are not planned
from. **Read `PLAN.md`, then `docs/MOVE_CATALOGUE.md`, then this file.**

## Scope — `PLAN.md` phase 96, and no more

1. **The catalogue wired in as candidates**, ranked by the fit the app already
   measures — time, capacity, strain, context — with the research priors seeding
   `now`, `tomorrow` and `friction`, which learning later moves.
2. **"Why this"** on every move, one tap: which readings it is expected to move,
   and how sure the app is.
3. **"I'm testing this"** on any move with fewer than a handful of the owner's own
   observations. Exploration's cheapest form.
4. **"Since last time, did you…"** — the check-in gains one-tap yes/no for moves
   that were offered. This is the action record every later phase needs.
5. **Coherence** — no two moves offered in one day that contradict or duplicate.

**Six decisions the catalogue left to this phase**, each in its _What routing 95
has to decide_ section: category verbs versus their instances — **both on screen
is the failure**; whether the ten-minute walk and the shipped twenty-five-minute
one share a family; the day-one rule for choosing among unmeasured moves; how the
certification and training entries are measured when the check-in cannot see
their effect; the eight profile fields the research did not supply; and whether
the six entries that take something from the evening are shown differently.
**Make each one, record each one, do not skip one silently.**

**Not in this phase:** measuring what a move did. Learned weights. The forecast.
Anything about Adaya. **If a sixth item appears, stop and say so.**

**Every phase ships looking finished** — `PLAN.md` phase 98 is where the visual
system lands, but nothing you ship here may look unfinished.

## Bounds that do not move

Every reading stays bound by G-009: unknown stays unknown, nothing is back-filled.
The score is a reading and never acquires a quality adjective. Nothing grades the
owner as a person. Moves offered must not contradict or duplicate within a day —
that is the owner's rule 4 and it is why coherence is in scope.

## Gates, then closeout

Run `npm run verify`, the full 360/430/1280 browser matrix at one worker on a
clean port, the privacy, copy and adaptation scans, checkpoint equivalence, CI,
release integrity from that CI run's own manifest artifact, and the Android-style
deployed gate. **Read the summary line and its count, never a pipeline's exit
code.** Commit, push, deploy, prove the deployed checkpoint is what Preview
serves. Then the owner opens it on his phone.

Update `docs/DECISION_LOG.md`, `docs/DEFECT_LEDGER.md`, `docs/PHASE_STATUS.md`.
Write `docs/qa/PHASE_96_QA_HANDOFF.md` **with the routing block copied from
`PHASE_92_QA_HANDOFF.md`'s shape** — Phase, Round, Actor, Conversation, Model,
Reasoning level — or the orchestrator cannot record its debt. Do not edit the
handoffs for 91–94.

Rewrite this file as the phase 97 dispatch from `PLAN.md`, `Phase: 97` on its own
line near the top, same actor fields, completion marker last.

You may not approve your own phase. Reach **YELLOW — READY FOR INDEPENDENT QA**
and stop.

---

```text
Continue the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Check docs/CAMPAIGN_HOLDS.md first: phase 96 is held by D-298 until the owner has
read docs/MOVE_CATALOGUE.md. If it says open, stop. If resolved, read the owner's
answers on it.

Read PLAN.md at the repository root, then docs/MOVE_CATALOGUE.md, then
docs/NEXT_PROMPT.md, and execute phase 96 exactly as written. Keep the Phase
field exactly 96. Write docs/qa/PHASE_96_QA_HANDOFF.md with the routing block in
PHASE_92_QA_HANDOFF.md's shape. Leave the 91-94 handoffs unedited. Reach YELLOW,
not GREEN. Do not ask me to paste the file contents.

When finished, make the LAST meaningful line of docs/NEXT_PROMPT.md exactly:
<!-- LCO_COMPLETE -->

Do not put this completion marker in a different handoff file.
```

<!-- LCO_COMPLETE -->
