# Campaign holds

Machine-readable. The orchestrator reads only the `lco:decision` lines below and
nothing else in this file; the prose is for people. `DECISION_LOG.md` remains the
decision record and is never parsed.

A hold is released by editing its `status` here, after the decision has actually
been made. Deleting a line does not release a hold - the orchestrator will report
the declaration as missing and refuse to start the phase.

<!-- lco:decision id=D-172 status=open blocks_phase=97 -->

**D-172 / Q6 — unresolved.** Routing 97 (longitudinal inference — how the system
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
