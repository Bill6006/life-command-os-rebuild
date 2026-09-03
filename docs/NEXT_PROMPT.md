# Next dispatch — routing 93, Validity: what it concludes from what it sees

**Phase:** 93 — **Validity: what it concludes from what it sees**

**Written by the Claude builder conversation that finished routing 92.**
Independent QA remains **off** by owner instruction, so this file dispatches the
next build phase and starts no QA round.

---

## Read this part first: what you are inheriting

**Two phases are now BUILT / QA DEFERRED, and neither is GREEN.**

**Routing 91** — nine rounds of independent Codex QA read it, a tenth was
written and has not run. **Routing 92** — no independent eye has seen it at all.
D-077 is unchanged: **only independent QA may pass a phase**, and nothing about
either has been approved by anything but its own mechanical gates.

Three consequences to hold while you build 93:

1. **Do not treat 91's or 92's behaviour as settled.** 92 corrected five
   registry declarations, inverted five shipped assertions and changed what the
   fact layer resolves. If something in 93 makes you doubt a reading either
   produces, the doubt is probably right — say so in your record rather than
   building on top of it quietly.
2. **`docs/qa/PHASE_91_QA_HANDOFF.md` must survive unedited.** It ends with the
   complete Round 10 retest handoff. Do not append to it, correct it or tidy it.
3. **`docs/qa/PHASE_92_QA_HANDOFF.md` is Round 0 and is likewise QA's from
   Round 1 on.** You may read it — you should, it names where 92 is weakest —
   and you may not edit it.

**What is actually true about 92**, so you are not guessing: every mechanical
gate passed at its checkpoint — `npm run verify`, the full unit, contract,
synthetic and adversarial suite, the whole 360/430/1280 browser matrix at one
worker, the privacy, copy and adaptation scans, checkpoint equivalence, CI,
release integrity and the Android-style deployed gate.

**One gate item is open on purpose and it is written down rather than hidden.**
The audit's no-added-noise rule asks that making dormant concepts live must not
increase how often the app speaks. Measured on the twenty-seven histories that
existed before 92, it **spoke 216 times before and speaks 218 now** — two
questions, both mental load, on `three-days-since` and `observed-evenings`. The
reasoning for not suppressing them is **D-267**, and it is independent QA's to
judge. **If you disagree while building 93, that is a finding, not a nuisance.**

---

## The phase

**Routing 93 — Validity: what it concludes from what it sees.**

The scope is fixed by the plan and the adjudication and is not yours to widen:

- plan section 43A for the routing map — **93 is Validity**, and canonical Phase
  10 is routing **101**;
- `PRODUCT_ADJUDICATION_2.md` **§6.5** is the phase contract — builder scope, the
  ordinary-owner QA contract, the synthetic QA contract, the completion condition
  and the explicit _not in this phase_ list. Read it in full before you plan.

**Purpose, in one sentence.** The app cannot widen what it learns over a concept
it cannot read — 92 made it readable, and this is what it may honestly conclude.

### Two things 92 left pointing directly at you

**S1a's horizon has no consumer yet, and AUD-0009 is it.** `multi-day` and
`weekly` exist, are readable by every consumer, and no profile declares one —
deliberately, because judging recovery over several nights is a conclusion drawn
from evidence rather than a horizon to draw it over. §5.1 names C8 as S1a's
acceptance case. **The pinned digest in `tests/synthetic/reach-horizon.test.ts`
will fail when you land it, and that is correct** — read what moved and say so,
rather than updating the number.

**`sleep.quality-last-night` is declared non-decisional** because nothing reads
it (DEF-0156). AUD-0009's recovery work is where its reader belongs, and the
measurement in `tests/synthetic/reach-material.test.ts` will require the flag to
move back the moment one exists.

### This phase is the largest and the most likely to run long

§11 gives it an explicit split rule. **Read it before you plan, not after you
are behind.**

---

## How to run it

**Model:** strongest current Claude Opus-equivalent.
**Intelligence level:** **Max.**
**Conversation:** **NEW** — routing 92's builder conversation belongs to a phase
that is now closed to you.

```text
Build routing Phase 93 of the Life Command OS rebuild — Validity: what it
concludes from what it sees. Keep the Phase field exactly 93.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full, then PRODUCT_ADJUDICATION_2.md §6.5 as the
phase contract and §11 for the split rule this phase is most likely to need.
Read docs/PHASE_STATUS.md for what is GREEN and what is not.

Routings 91 and 92 are BUILT / QA DEFERRED. Neither is GREEN and neither has
passed independent QA. Do not treat their readings as settled, and do not edit
docs/qa/PHASE_91_QA_HANDOFF.md or docs/qa/PHASE_92_QA_HANDOFF.md for any
reason — both are briefs deferred QA rounds start from and must survive
unedited.

Build §6.5's scope: AUD-0042, AUD-0029 (S1b), AUD-0007, AUD-0009 (C8, and S1a's
acceptance case), AUD-0010, AUD-0022, AUD-0025's durable ledger, AUD-0030(a),
AUD-0038(c), AUD-0019, AUD-0051, and owner-use F03, F08, F09, F18, F31, F34
bounded, F42 and F44's measurable half. Plus §13E.1's five-arm maintenance-probe
regression — regression coverage only, no scoring package, no new dimension, no
urgency change. Plus C21's enforcement half, reversing the shown-never-enforced
rule for registered blocker concepts only, and C14's bands with histories built
to land at each one.

Routing 92 left two things pointing at you. S1a's multi-day and weekly horizons
have no profile yet and AUD-0009 is their consumer; the pinned digest in
tests/synthetic/reach-horizon.test.ts will fail when you land it, which is
correct — read what moved and say so rather than updating the number. And
sleep.quality-last-night is declared non-decisional because nothing reads it;
its reader belongs with AUD-0009 and the measurement will require the flag to
move back once one exists.

Meet both gates in §6.5 — the ordinary-owner contract across three simulated
weeks and the synthetic Validity gate — and the completion condition: C21's
enforcement proved by reintroduction, no scoring dimension added and no weight
moved without an explicit decision.

Nothing in this phase adds a domain, forecasts, sets an expectation, revises a
strategy, or composites the emotional dimensions. Those are 94 and later.

Write class tests and biting reintroduction proofs for the structural
properties, not fixtures that memorise phrases. Run npm run verify, one full
360/430/1280 browser matrix at one worker on a clean port, the privacy, copy and
adaptation scans, the Android-style deployed gate, checkpoint equivalence, CI
and release integrity from that CI run's own manifest. Commit, push, deploy and
prove the deployed checkpoint is what Preview serves.

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

**Routing 92's independent QA.** Round 0 is written in
`docs/qa/PHASE_92_QA_HANDOFF.md` and names the one gate item that did not come
out even. No independent eye has seen the phase at all.

**The nineteen D-210 instrument-hardening findings.** Still open, still
untouched, backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`, and not part
of routing 93's scope. They have now been deferred across six phases; that is
worth the owner knowing rather than discovering.

<!-- LCO_COMPLETE -->
