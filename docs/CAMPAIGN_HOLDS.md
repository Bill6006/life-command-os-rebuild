# Campaign holds

Machine-readable. The orchestrator reads only the `lco:decision` lines below and
nothing else in this file; the prose is for people. `DECISION_LOG.md` remains the
decision record and is never parsed.

A hold is released by editing its `status` here, after the decision has actually
been made. Deleting a line does not release a hold - the orchestrator will report
the declaration as missing and refuse to start the phase.

<!-- lco:decision id=D-285 status=closed blocks_phase=94 -->

**D-285 onward — the state engine. RELEASED 2026-09-04 by D-293.**

Routing 94 is the state engine's first slice — the check-in, the readings stored,
and the score. It was held until the owner chose the shipped **default depth and
frequency** of the check-in. **He has: D-293 sets it at roughly 14 readings in the
morning and 5 at midday and evening, and adds three concepts.** The phase may
start.

**Why this is a hold and not a note.** D-285 turns `QUESTIONS_PER_DAY = 3` from a
ceiling into a preference, and D-285 itself records why the default is the real
decision: _"most people never open settings, and the owner will live with the
shipped default on exactly the days he is too tired to change it."_ A builder who
picks it to be safe re-creates the starvation the decision exists to end —
**measured 2026-09-03 at one question a day on a new store**.

**Released.** The owner named the default on 2026-09-04 and the `status` above is
`closed`. **D-285's control still governs** — the default is where the app starts,
not where it stays.

**Everything else about the state engine is decided.** D-285 (depth and frequency
are the owner's), D-286 (two budgets, two rules), D-287 (the 0–100 state reading
with learned weights), D-288 (the forecast, scored, as a no-intervention baseline),
D-289 (research proposes, his data ranks), D-290 (catalogue coherence and the chain
bar), D-291 (C19 redrawn at his own record) and D-292 (the map) are all **Active**.
Read [`STATE_ENGINE_OWNER_DECISION.md`](STATE_ENGINE_OWNER_DECISION.md) in full
before building anything that asks the owner a question, scores his state, or
recommends a move.

**Routings 95 through 98 are not gated by this hold** — but 97 and 98 may not be
dispatched against their current §6.x contracts at all, per D-292.

<!-- lco:decision id=D-298 status=resolved blocks_phase=96 -->

**D-298 — RESOLVED 2026-09-04. The owner read the catalogue and decided.**

This held the catalogue's wiring until the owner had read `docs/MOVE_CATALOGUE.md`
and answered its questions. **He has**, and his answers are recorded at the top of
`docs/NEXT_PROMPT.md` (the phase-2 / integer-95 dispatch): booking the exam date
is cut, so the catalogue is 26 entries; the timed section, no-caffeine-today, the
avoided balance and call-instead-of-text ship with the app required to say when a
move takes something from the evening; "three good things at bedtime" stays out;
nineteen tier-1 entries is enough variety. The one question he has not answered —
whether a feeling-only effect is enough for moves that get something done — is
written down in `PLAN.md` phase 1 rather than blocked on.

The `blocks_phase` above was written when the plan's integers were one step
higher; under `PLAN.md`'s table the wiring is integer 95 and it is already
building. Nothing is blocked by this line.

<!-- lco:decision id=D-172 status=open blocks_phase=100 -->

**D-172 / Q6 — unresolved.** Under `PLAN.md` (2026-09-04) this is **plan phase 7 — testing smarter,
orchestrator integer 100**, where move chains and the exploration policy land; the hold
followed it there. Historically: routing 97 (longitudinal inference — how the system
discovers hypotheses, combinations, sequences and potentially important variables
that were not hardcoded in advance) must not start until this is adjudicated.

**Routings 90 through 96 are not gated by this hold** — 90 canonical Phase 9, 91
semantic capture, 92 Reach, 93 Validity, 94 domains and progression, 95
advancement and revision, 96 expectation and reconciliation.

**Retargeted from 91 to 97 on 2026-08-31 by owner decision D-215.** The
declaration said `blocks_phase=91` when routing 91 meant "later intelligence —
Reach, then Validity." Under the approved roadmap (D-212) routing 91 is semantic
capture, which `ROUTING_91_BRIEF.md` establishes is a different capability that
D-172 may not close and may not absorb. The hold now points at the work it
actually governs. **D-172 itself is unchanged and is not resolved.**

**Part one of D-172's own answer is scheduled ahead of the hold.** D-172 refuses
to leave the finite concept vocabulary as a permanent ceiling, and widening it is
routing 92's Reach work — which runs long before 97, so the mechanism question is
decided over a space that has something in it.
