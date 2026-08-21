# Next prompt

Canonical plan section 43. The intelligence level, model and conversation
instruction sit outside the prompt so the owner can switch Claude Code before
pasting.

**Phase 5 remains YELLOW — READY FOR INDEPENDENT QA.** Independent QA's round
1 tested checkpoint `34e03b6` and returned **FAIL** — two blocking defects,
one major — in
[`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md). All three are
fixed at repaired checkpoint `8d06dae` (current `main` HEAD is documentation
only past that SHA). Per `qa/README.md` §4, repair returns to the **same**
independent QA conversation that produced the report, for retest — not to a
new conversation, and not to GREEN here.

**New since round 1: D-082.** Every QA run or retest — PASS or FAIL — now
outputs the complete next handoff automatically in the same response
(`qa/README.md` §3a): tested SHA, report path, model, intelligence level,
conversation instruction, one-sentence reasons for each, and the complete
ready-to-paste next prompt. Round 1 gave a recommendation but no prompt,
which is why this retest prompt below explicitly asks for it. Whatever this
retest finds, the QA conversation should not stop at a verdict.

---

## NEXT CLAUDE ACTION

- **Model:** Sonnet-class (Claude Sonnet 5 or the nearest current equivalent)
- **Intelligence level:** High
- **Conversation:** **SAME — the existing independent QA conversation that
  produced `qa/PHASE_05_QA_HANDOFF.md`**
- **Why this model/level:** unchanged from the original QA recommendation —
  retesting three narrowly-scoped, already-diagnosed fixes inside
  well-understood modules (`buildInfo.ts`/`MoreScreen.tsx`,
  `coverage.ts`/`DomainPage.tsx`) is ordinary verification work, not
  architecture or inference design.
- **Why this conversation:** a retest is not a fresh review — it is checking
  that specific, named defects are actually gone, which requires the
  reviewer that found them. Starting over would re-spend the independence
  this protocol already spent once on round 1; QA's own report is what
  the retest checks itself against, and it belongs to that conversation.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
This is a retest. You are the same independent QA reviewer who wrote
docs/qa/PHASE_05_QA_HANDOFF.md against checkpoint 34e03b6 and returned FAIL.
The original builder conversation has repaired all three findings from that
report. Retest the repaired checkpoint and update the same report — do not
start a fresh review from scratch, and do not repair anything yourself.

Repaired checkpoint: 8d06dae (current `main` HEAD may be a later SHA if
documentation-only commits followed it — `git log -- src tests` from HEAD
will confirm nothing under those two directories differs from 8d06dae if you
want to check). Fetch
https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
and treat its `commitSha` as the SHA under test — verify it is at or after
8d06dae before testing anything else; if the Preview is behind 8d06dae, stop
and report that alone.

Preview URL: https://bill6006.github.io/life-command-os-rebuild/preview/

Re-read your own docs/qa/PHASE_05_QA_HANDOFF.md first, so you are retesting
against your own prior findings rather than reconstructing them from memory.
Then read docs/DEFECT_LEDGER.md entries DEF-0031, DEF-0032 and DEF-0033 —
the builder's account of what it believes it fixed and why, for each of your
three findings, in commit order. Do not take the builder's account on faith;
it is exactly what you are here to test.

For each of your three original findings, specifically:

## QA-B1 (blocking) — the app's own build screen denied that Phase 5 exists

Check `#/more`. The builder's claim: `REBUILD_PHASE` in
src/platform/buildInfo.ts now reads number 5, and the sentence describing
current capability and what's next is a single field (`REBUILD_PHASE.summary`)
that `MoreScreen.tsx` renders rather than duplicating. Verify directly:
does the Phase row read 5, does "Next" read something plausible for Phase 6
(Timeline and Insights), and does the paragraph underneath make any claim
that is false given what you already found built and working in round 1?
Check the QA laboratory's own header eyebrow too (`#/qa`) — it reads
REBUILD_PHASE.number the same way.

## QA-B2 (blocking) — two correction kinds wrote a record and did nothing

Reproduce your exact original steps: load "A month of history, three weeks
ago" (or "Everything current except the studying," which exercises the same
class on Career), open the affected domain page. The builder's claim: the
two generic coverage buttons ("I've been keeping on top of this",
"Something's changed") no longer appear when the domain's staleness is
driven by a specific neglected standing concept; instead the page names
that concept and points at its own "Not right?" control, which you already
verified works in round 1. Verify:

- On a domain where a standing concept is the cause (Career, Home, Money,
  Sleep, Faith, Direction, Private), do you still see two buttons that
  write a record and leave "How this stands" unchanged? You should not —
  confirm what replaced them, and judge on its own terms whether it is an
  honest, usable fix rather than a plausible-looking new dead end.
- On a domain with no standing concept at all (Social, Emotional), do the
  original two buttons still appear and still work — i.e., does correcting
  this genuinely fix the case it always could, without having regressed?
- Does the concept-level correction path itself (the one you already passed
  in round 1) still work identically?

The builder's own account claims this required no change to the coverage
staleness computation itself — only to which control the page offers.
Decide for yourself whether that account holds up or whether it looks like
a change in substance dressed as a change in wording.

## QA-M1 (major) — a domain page contradicted itself about freshness

Reproduce your exact original repro on Health & Recovery and/or Home (you
used the deployed Preview's seed data; if that state has since changed,
build the equivalent — a standing concept whose own reading is individually
stale but not yet neglected, with the domain status "quiet"). The builder's
claim: the domain-level sentence for a `quiet` area no longer claims
"nothing here has gone out of date"; it now says the domain is not asking
for attention, which is what `quiet` actually means, while a concept row's
own "out of date" tag is untouched. Verify the contradiction is gone and
that the new sentence is not simply vaguer in a way that hides real
information — section 8/63's freshness signal still has to reach the
owner somehow.

## Everything you already passed

Spot-check that nothing in your original PASS list has regressed: the ten
pages, Health & Recovery representing both domains, fact/context/goal
correction, private-domain discretion and manual-entry-first behaviour,
unheard-domain framing, malformed-record resilience, rapid navigation,
overflow, touch targets, and coverage agreement between Life's overview and
a domain page. You do not need to redo the full depth of round 1 on all of
these — a reasonable spot-check is enough unless something looks different.

## Report

Update the same docs/qa/PHASE_05_QA_HANDOFF.md — do not create a new file.
Add the retest results (SHA tested, per-finding verdict, any new findings)
to the existing report per docs/qa/README.md's format, and give an updated
overall PASS or FAIL.

You do not repair product code. If something is still wrong, or if the fix
introduced something new, describe it precisely enough that the builder can
reproduce it without guessing.

## Mandatory: the complete next handoff (owner decision D-082, qa/README.md §3a)

This applies whichever way the retest goes — do not stop at a verdict. In
the same response as your updated report, before finishing, output:

- overall PASS or FAIL for this retest;
- the exact SHA you tested;
- the QA report path (docs/qa/PHASE_05_QA_HANDOFF.md) and its commit SHA if
  you commit it;
- the recommended Claude model for the next action, with a one-sentence
  reason;
- the recommended intelligence level, with a one-sentence reason;
- the conversation instruction for the next action, with a one-sentence
  reason;
- the complete ready-to-paste next prompt.

If your verdict is FAIL: address the next prompt to CURRENT — the original
Phase 5 builder conversation. Instruct it to read your updated report, stay
YELLOW, repair each blocking/material defect under plan section 42
(reproduce, identify the whole class, write a regression, prove it fails
when reintroduced, fix the root cause, rerun the full gate), preserve
everything already passed and every explicit deferral, deploy a repaired
checkpoint, and return a retest prompt addressed to this same QA
conversation — not to start the next phase. Give reproductions, the defect
class, the evidence, and the acceptance expectation the fix must meet;
do not prescribe the implementation patch yourself.

If your verdict is PASS: address the next prompt to CURRENT — the original
Phase 5 builder conversation. Instruct it to read your report, confirm the
tested SHA and the PASS, perform the formal GREEN closeout, update the
governing docs, preserve deferred items, and provide the next phase's
recommended model, intelligence level, CURRENT/NEW instruction and complete
next-phase prompt — so the owner does not have to ask for another handoff.
```
