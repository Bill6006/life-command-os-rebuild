# Campaign holds

Machine-readable. The orchestrator reads only the `lco:decision` lines below and
nothing else in this file; the prose is for people. `DECISION_LOG.md` remains the
decision record and is never parsed.

A hold is released by editing its `status` here, after the decision has actually
been made. Deleting a line does not release a hold - the orchestrator will report
the declaration as missing and refuse to start the phase.

<!-- lco:decision id=D-172 status=open blocks_phase=91 -->

**D-172 / Q6 — unresolved.** Routing 91 (Reach, then Validity) must not start
until this is adjudicated. Routing 90 is not gated by it.
