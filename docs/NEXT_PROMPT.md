# Next dispatch — routing 93, Validity: what it concludes from what it sees

**Phase:** 93 — **Validity: what it concludes from what it sees**

**Written by the Claude builder conversation that finished the phase before
this one.**
Independent QA is **off** for this run by owner instruction, so this file
dispatches the next build phase, is addressed to the **Claude builder**, and
starts no QA round.

---

## Read this part first: what you are inheriting

**Two phases are BUILT / QA DEFERRED. Neither is GREEN, and neither has been
read by anyone outside the conversation that wrote it.**

- **The phase immediately before this** — **zero rounds.** No independent eye
  has seen it at all.
- **The one before that** — nine rounds of independent Codex QA read it, a
  tenth was written and has not run.

D-077 is unchanged: **only independent QA may pass a phase.** Nothing about
either has been approved by anything but its own mechanical gates. D-268 records
that deferral and why it is the riskiest one so far.

Three things to hold while you build 93:

1. **Do not treat either phase's behaviour as settled.** The one immediately
   before this touched the layer every decision reads: `assembleSituation` walks the concept registry,
   five registry declarations were corrected, the fact layer resolves a renamed
   concept through an alias, the registry grew by ten concepts, and five shipped
   assertions were inverted. **Four of its ten defects were found by a gate
   rather than by the builder.** If something in 93 makes you doubt a reading
   either phase produces, the doubt is probably right — say so in your record
   rather than building on top of it quietly.
2. **Both deferred QA handoffs in `docs/qa/` must survive unedited.** They are the briefs two deferred rounds start from.
   Do not append to them, correct them, or tidy them — including the second
   one's header, which still says YELLOW because that is what it said when it
   was written.
   Anything you need to record about either phase goes in `PHASE_STATUS.md` or
   the decision log.
3. **One gate item is open and unchecked.** The audit's no-added-noise rule came
   out at **218 against 216** across the histories that predate it — two
   questions, both
   `emotional.overwhelm`, on `three-days-since` and `observed-evenings`. The
   builder judged them worth keeping (D-267) and deferring QA means nobody has
   checked that judgement. **If you disagree while building 93, that is a
   finding, not a nuisance**, and the repair is a narrower `applies` predicate in
   `src/intelligence/reach.ts`.

**What is actually true about it**, so you are not guessing: every mechanical
gate passed at its checkpoint — `npm run verify`, 2,150 unit, contract,
synthetic and adversarial tests, the whole 360/430/1280 browser matrix at one
worker, the privacy and copy scans, checkpoint equivalence, CI, release
integrity from CI's own manifest artifact, and the Android-style deployed gate.

---

## The phase

**Routing 93 — Validity: what it concludes from what it sees.**

The scope is fixed by the plan and the adjudication and is not yours to widen:

- plan section 43A for the routing map;
- `PRODUCT_ADJUDICATION_2.md` **§6.5** is the phase contract — builder scope, the
  ordinary-owner QA contract, the synthetic QA contract, the completion condition
  and the explicit _not in this phase_ list. Read it in full before you plan.
- `PRODUCT_ADJUDICATION_2.md` **§11** gives this phase an explicit split rule.
  **Read it before you plan, not after you are behind.**

**Purpose, in one sentence.** The app cannot widen what it learns over a concept
it cannot read — the phase before this made it readable, and this is what it may
honestly conclude.

### Two things the phase before this left pointing directly at you

**The widened outcome horizon has no consumer yet, and AUD-0009 is it.**
`multi-day` and `weekly` exist, are readable by every consumer, and no profile
declares one — deliberately, because judging recovery over several nights is a
conclusion drawn from evidence rather than a horizon to draw it over. §5.1 names
C8 as the horizon's acceptance case. **The pinned digest in
`tests/synthetic/reach-horizon.test.ts` will fail when you land it, and that is
correct** — read what moved and say so, rather than updating the number.

**`sleep.quality-last-night` is declared non-decisional** because nothing reads
it (DEF-0156). AUD-0009's recovery work is where its reader belongs, and the
measurement in `tests/synthetic/reach-material.test.ts` will require the flag to
move back the moment one exists.

### This phase is the largest in the roadmap and the most likely to run long

§11's split rule exists for it. Reaching for the minimum-release path is an
owner decision rather than a consequence of a phase running long (D-214).

---

## How to run it

**Model:** strongest current Claude Opus-equivalent.
**Intelligence level:** **Max.**
**Conversation:** **NEW** — the previous builder conversation belongs to a phase
that is now closed to you.

```text
Build routing Phase 93 of the Life Command OS rebuild — Validity: what it
concludes from what it sees. Keep the Phase field exactly 93.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full, then PRODUCT_ADJUDICATION_2.md §6.5 as the
phase contract and §11 for the split rule this phase is most likely to need.
Read docs/PHASE_STATUS.md for what is GREEN and what is not.

The two phases before this are BUILT / QA DEFERRED. Neither is GREEN and
neither has passed independent QA; the most recent has had zero rounds. Do not
treat their readings as settled, and do not edit docs/qa/PHASE_91_QA_HANDOFF.md or
docs/qa/PHASE_92_QA_HANDOFF.md for any reason: both are briefs deferred QA
rounds start from and must survive unedited.

Build §6.5's scope: AUD-0042, AUD-0029, AUD-0007, AUD-0009 (C8, and the
acceptance case for the widened outcome horizon), AUD-0010, AUD-0022,
AUD-0025's durable ledger, AUD-0030(a), AUD-0038(c), AUD-0019, AUD-0051, and
owner-use F03, F08, F09, F18, F31, F34 bounded, F42 and F44's measurable half.
Plus §13E.1's five-arm maintenance-probe regression — regression coverage only,
no scoring package, no new dimension, no urgency change. Plus C21's enforcement
half, reversing the shown-never-enforced rule for registered blocker concepts
only, and C14's bands with histories built to land at each one.

The phase before this left two things pointing at you. The multi-day and weekly
horizons have no profile yet and AUD-0009 is their consumer; the pinned digest
in tests/synthetic/reach-horizon.test.ts will fail when you land it, which is
correct — read what moved and say so rather than updating the number. And
sleep.quality-last-night is declared non-decisional because nothing reads it;
its reader belongs with AUD-0009 and the measurement will require the flag to
move back once one exists.

Meet both gates in §6.5 — the ordinary-owner contract across three simulated
weeks and the synthetic Validity gate — and the completion condition: C21's
enforcement proved by reintroduction, no scoring dimension added and no weight
moved without an explicit decision.

Nothing in this phase adds a domain, forecasts, sets an expectation, revises a
strategy, or composites the emotional dimensions. Those come later.

Write class tests and biting reintroduction proofs for the structural
properties, not fixtures that memorise phrases. Run npm run verify, one full
360/430/1280 browser matrix at one worker on a clean port, the privacy, copy and
adaptation scans, the Android-style deployed gate, checkpoint equivalence, CI
and release integrity from that CI run's own manifest artifact. Commit, push,
deploy and prove the deployed checkpoint is what Preview serves.

Update docs/DECISION_LOG.md, docs/DEFECT_LEDGER.md and docs/PHASE_STATUS.md, and
write docs/qa/PHASE_93_QA_HANDOFF.md as the brief for independent QA.

You may not approve your own phase (D-077). Reach YELLOW — READY FOR
INDEPENDENT QA and stop there. Do not mark anything GREEN, and do not start a
QA round yourself.
```

### Short launcher

**Model:** strongest current Claude Opus-equivalent. **Intelligence level:** Max.
**Conversation:** NEW.

```text
Build routing Phase 93 of the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the routing 93 dispatch at the end
exactly as written. Keep the Phase field exactly 93, leave
docs/qa/PHASE_91_QA_HANDOFF.md and docs/qa/PHASE_92_QA_HANDOFF.md unedited,
reach YELLOW rather than GREEN, and do not ask me to paste the file contents.
```

---

## Three debts this dispatch is carrying, so they are not lost

**Routing 91's independent QA.** Round 10's brief is written and waiting in
`docs/qa/PHASE_91_QA_HANDOFF.md`. It has not run.

**The most recent phase's independent QA.** Round 0 is written in
`docs/qa/PHASE_92_QA_HANDOFF.md` and opens with the one gate item that did not
come out even. **Zero rounds have run.** Whenever independent QA is turned back
on, these two are the first things owed — and that one has the widest blast
radius with the least scrutiny.

**The nineteen D-210 instrument-hardening findings.** Still open, still
untouched, backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`, and not part
of this phase's scope. They have now been deferred across six phases; that is
worth the owner knowing rather than discovering.

<!-- LCO_COMPLETE -->
