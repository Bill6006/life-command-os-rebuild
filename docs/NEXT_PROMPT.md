# Next prompt

Canonical plan section 43, and the independent-QA protocol in
[`qa/README.md`](qa/README.md) section 4. The model, intelligence level and
conversation instruction sit outside the prompt so the owner can switch Claude
Code before pasting.

**Phase 6 is YELLOW — QA-A1 repaired, awaiting retest.** Independent QA
withdrew its round-1 PASS on QA-A1: the app asked the owner to perform the
causal analysis the system exists to make, and rendered his answers as
percentages that read as measurements. The finding held, the repair is done,
and the phase stays YELLOW until the same QA conversation retests it.

Full builder account in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 6 —
Timeline + Insights"; the defect is DEF-0045 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md); the principle is D-089 in
[`DECISION_LOG.md`](DECISION_LOG.md).

---

## NEXT CLAUDE ACTION

- **Model:** Opus-class (Claude Opus 5 or the nearest current equivalent)
- **Intelligence level:** High
- **Conversation:** **SAME — the independent QA conversation that raised QA-A1**
- **Why this model:** the retest has to judge whether a _new learned quantity_
  is honest — whether a comparison group is really a comparison group, whether
  a relationship is stated as association rather than cause, and whether the
  owner's judgments and the app's findings are now genuinely distinguishable on
  screen. That is the cross-system semantic reasoning D-080 reserves Opus-class
  for, and it is a step up from round 1's Sonnet-class recommendation because
  the thing under test changed.
- **Why this level:** High. The judgement is demanding but the evidence is
  counts printed on screen and a small pure module; Max is for ambiguous
  root-cause work, and the root cause here is already found and written down.
- **Why the same conversation:** `qa/README.md`'s conversation rule — a retest
  after a builder repair returns to the conversation that ran the original
  test. It raised QA-A1 and holds the reasoning the repair has to satisfy.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
Phase 6's QA-A1 repair is ready for your retest. This is the same QA
conversation that raised it — you have the round-1 record and your own
reasoning about the finding.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_06_QA_HANDOFF.md. Update it in place with a
"Round 2 — retest" section. It is the only file you may write, and you may
not change application or product code (D-077).

WHAT CHANGED

The governing documents moved first, because you were right that this is a
specification gap before it is an implementation defect:

- D-089 records the principle — observe first, infer cautiously, ask for a
  concrete fact, ask for current subjective state when that state itself
  matters, never ask the owner for the causal relationship the system exists
  to learn.
- Canonical plan sections 20 and 51 now state it directly, as owner-approved
  amendments under section 1. The v1.2 change log carries an addendum.
- D-054, D-064, D-066 and D-069 are annotated as incomplete, revisited or
  generalized. None is overturned.

Then the code. Read it fresh rather than from this list:

- src/intelligence/association.ts — new. The comparison.
- src/intelligence/moves.ts — MoveProfile.affects.
- src/intelligence/outcomes.ts — the grading question, and what replaced it.
- src/intelligence/learning.ts, src/intelligence/evaluate.ts — how the
  finding reaches the decision.
- src/domain/concepts.ts — ConceptDefinition.tracked.
- src/intelligence/insights.ts, src/features/insights/InsightsScreen.tsx,
  src/features/now/NowScreen.tsx — what is now said, and how.
- src/synthetic/scenarios.ts — "Two months of readings, and nothing graded".
- tests/synthetic/observed-relationships.test.ts — the twelve behaviours you
  required.

`git diff a6a9e67..HEAD` is the whole repair.

WHAT TO TEST

Retest QA-A1 against your own acceptance criteria A–I, from your own report,
rather than against the builder's account of them. In particular:

- Is a figure built from the owner's judgments now distinguishable from one
  built from observed state, on screen, by a reader who has not read any of
  this? (B)
- Is a relationship stated only against a comparison group, and only as
  association — in both directions, including when the reading is lower
  afterwards? (C, E)
- Can a state dimension now be learned from at all, and is it separate
  dimensions rather than one score? (D)
- Does a missing before- or after-observation produce an honest "not enough",
  rather than a figure over whichever occasions have both? (F)
- Do existing aspect:'effect' records still mean what they meant? (G)
- Is the owner still asked for how he is, and no longer asked to grade what a
  move did? (H)
- Were any sensors or integrations invented? (I)

And the one whose absence let this through: **does the engine learn something
useful when the owner answers no causal question at all?** The scenario "Two
months of readings, and nothing graded" contains no effect outcome anywhere.

Two things the builder decided rather than implemented, which are yours to
accept or reject:

1. `tests/synthetic/inferred-evidence.test.ts`'s assertions that
   `deriveOutcomes` fires for exactly three verbs are **kept**, with the
   reasoning written into the file. The argument is that extending that
   mechanism would have produced more attributions wearing the app's name
   rather than the owner's, and that the repair was to stop needing them.
   You named these tests; judge the argument.
2. `emotionalState` is **not** split into named dimensions. It is now
   `tracked` so it participates, but which dimensions is the owner's to say,
   and the builder judged inventing a taxonomy to be the same mistake the
   finding is about. Recorded as an open question for the owner.

Also confirm nothing round 1 passed has regressed — all eleven of
DEF-0034 to DEF-0044 — and that every deferred item is unchanged (P4-6, P4-7,
the never-settled started move, and Phase 5's four).

THE CHECKPOINT

The product checkpoint and the deployed Preview SHA are in
docs/PHASE_STATUS.md's build identity table. Verify both yourself against
preview/build-info.json and against what the app shows under More → This
build, and check `git log <checkpoint>..HEAD --stat` for anything outside
docs/. Test the deployed Preview in a real Android-style mobile context, as
you did in round 1.

HOW THIS ENDS

Update docs/qa/PHASE_06_QA_HANDOFF.md with the retest record and an overall
PASS or FAIL, and in the same response, without being asked (D-082,
qa/README.md section 3a): the verdict; the QA-tested SHA; the report path;
the recommended Claude model, intelligence level and conversation instruction
for the next action, each with a one-sentence reason; and the complete next
prompt written into the report file. Close with the short launcher block
D-083 requires rather than repeating the whole prompt inline.

On PASS the next prompt goes to CURRENT — the builder conversation — for the
formal GREEN closeout. On FAIL it goes to CURRENT for another repair round.

Do not ask the owner to paste anything — you have the paths.
```
