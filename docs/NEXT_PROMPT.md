# Owner review gate — the move catalogue

**Phase:** none. **This file is a gate, not a dispatch, and it routes nothing.**
The research exercise D-296 separated out of routing 95 has run and produced a
document. **Nobody is dispatched by this file. The owner reads next.**

**Next actor:** the owner — a person, not a conversation.
**Independent QA:** OFF. This file opens no QA round and closes none.

---

## What to read

> **[`docs/MOVE_CATALOGUE.md`](MOVE_CATALOGUE.md)**

27 candidate moves, each carrying `demand`, `now`, `tomorrow`, `friction` and
`size`, with every prior sourced. **Nineteen of them can be offered on a store
with nothing in it** — against the candidate set of one measured 2026-09-03,
which is the whole of the _"walk for 25 minutes"_ complaint.

**Read the section titled _What the owner should look for_ if you read nothing
else.** It names five entries that need a decision and one that was left out and
may be wanted back.

---

## Why nothing is dispatched here

**D-296 makes the owner's review the gate**, and it is the whole reason the
research was separated from routing 95 in the first place: _"Not trusting himself
to generate is not the same as declining to veto"_ — he is still the only person
who can say _"I would never do that."_ **Routing 95's build dispatch is written
after he has read the catalogue, not before.** A file that routed onward from here
would remove the review this exercise exists to create.

### What has NOT happened, and it is deliberate

- **No `docs/qa/PHASE_95_QA_HANDOFF.md` exists.** It must not be created before
  routing 95's build has actually run. A sweep records any `PHASE_N_QA_HANDOFF.md`
  at or above the ledger floor **on sight**, so a brief written now would have
  phase 95 recorded as finished when only the research half has run — after which
  the build never happens and the catalogue is never wired to anything.
- **Nothing under `src/` was touched.** No commit to product code, no test, no
  gate, no routing integer. The exercise follows the `PRODUCT_ADJUDICATION.md`
  precedent — _"not a build phase; it produced a decision, not a diff."_
- **Routing 95's build half is untouched.** Candidates are not wired,
  `ACTION_FAMILIES` is not extended, no dimension is added, and effect measurement
  is not designed.
- **Nothing about Adaya.** D-291 governs anything measured about a child and the
  catalogue is silent on the subject by instruction. That silence is recorded in
  the document as its largest deliberate gap.

---

## The three things the review has to settle

Each is written up in the catalogue with the evidence behind it. They are repeated
here because they change what routing 95 builds, not merely what it offers.

1. **The five flagged entries, and the one left out.** Booking the exam date is
   the entry most likely to be absurd on a bad evening — it costs money and is the
   only irreversible thing in the catalogue.
2. **Every effect this catalogue can measure is a feeling.** Routing 94's thirteen
   readings are all about how he is; none of them reads whether anything got done.
   Half the catalogue exists to get something done. Acceptable, or does the
   check-in need something the certification can show up in?
3. **Six of the sixteen shipped verbs are categories, not moves**, and several
   catalogue entries are instances of them. _"Wind down before bed"_ beside
   _"screens down and the lights low for the last twenty minutes"_ is D-290's first
   example exactly, and **the default outcome is both on screen**. Routing 95 must
   choose whether the category retires or keeps the instance as its object.

---

## After the review

**Routing 95's build dispatch is written then, and not before.** It is the second
half of the phase — the catalogue wired as candidates, and the effect measurement
beside it — and it carries the routing integer 95 that this exercise deliberately
did not.

---

## The state of the campaign, so it is not lost

**Routing 94 is YELLOW — READY FOR INDEPENDENT QA**, at the checkpoint named in
[`PHASE_STATUS.md`](PHASE_STATUS.md). It is not GREEN, no round has run, and D-077
is unchanged.

### Five debts

**Routing 91's independent QA.** Round 10's brief is written and waiting. Unrun.

**Routing 92's independent QA.** Round 0 written, **zero rounds**, widest blast
radius of anything in the campaign.

**Routing 93's independent QA.** Round 0 written, **zero rounds**, and it opens
with D-283 — fourteen packages carrying one phase's worth of scrutiny.

**Routing 94's independent QA.** Round 0 written, **zero rounds.** It touched the
concept registry, added a record kind, narrowed a standing guard that has held
since D-166, and put a number about the owner on a screen for the first time in
the campaign.

**The nineteen D-210 instrument-hardening findings**, plus **DEF-0169** as a
twentieth: the test suite is red under parallel load on a fourteen-core machine
and the symptom is patched while the cause — a dozen concurrent single-threaded
library sweeps — is untouched. Backlog blob
`58d5af071355d252c4a254fc685fcc9e8e88f417`.

### The roadmap

| #              | Phase                                  | State                                |
| -------------- | -------------------------------------- | ------------------------------------ |
| 94             | the check-in, the readings, the score  | **YELLOW — awaiting QA**             |
| _(no integer)_ | the move catalogue research            | **DONE — awaiting the owner's read** |
| 95             | the move catalogue and measured effect | **blocked on the review above**      |
| 96             | domains and progression (Fatherhood)   | ready; D-291 changes rollups         |
| 97             | the forecast                           | needs 95                             |
| 98             | exploration and causal chains          | needs 97, and **D-172 is open**      |
| 99             | advancement and revision               | —                                    |
| 100            | _(reserved headroom)_                  | —                                    |

**D-172 blocks phase 98 and nothing before it.**
[`CAMPAIGN_HOLDS.md`](CAMPAIGN_HOLDS.md) carries the declaration and it is still
`open`.

**Four phases are unapproved and none of their handoffs may be edited for any
reason:** `docs/qa/PHASE_91_QA_HANDOFF.md`, `docs/qa/PHASE_92_QA_HANDOFF.md`,
`docs/qa/PHASE_93_QA_HANDOFF.md` and `docs/qa/PHASE_94_QA_HANDOFF.md`.

<!-- LCO_COMPLETE -->
