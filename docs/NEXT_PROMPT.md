# Next prompt

Canonical plan section 43, and the independent-QA protocol in
[`qa/README.md`](qa/README.md). The model, reasoning level and conversation
instruction sit outside the prompt so the owner can set them before pasting.

**Independent QA is Codex from here (D-090).** Claude builds; Codex tests. The
loop is Claude builds → Codex QA (NEW) → Claude repairs → the **same** Codex
conversation retests → PASS → Claude GREEN closeout → next phase. This is not a
relaxation of D-077 — it is how D-077's rule is satisfied, since two
conversations of the same model reading the same documents reach the same
reading of them.

**Phase 6 is YELLOW — REPAIRED, AWAITING CODEX RETEST.** A Codex cold-use and
semantic audit reproduced seven blocking defects in a phase that had already
passed Claude independent QA, had that PASS withdrawn on QA-A1, been repaired,
and carried 22 purpose-written regressions, all green. The seven are repaired.
The phase stays YELLOW until Codex retests it.

Builder account in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 6 —
Timeline + Insights"; the defects are DEF-0046 … DEF-0053 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md); the principles are D-090 and D-091 in
[`DECISION_LOG.md`](DECISION_LOG.md).

---

## NEXT ACTION

- **System:** **Codex**
- **Model:** GPT-5.1-Codex-class — the current Codex coding/review model, or its
  nearest equivalent if it has been renamed
- **Reasoning level:** **Medium**
- **Conversation:** **SAME — the Codex conversation that ran the cold-use audit
  and raised the seven blockers.** If that conversation is gone, start a NEW
  Codex one and follow the prompt from step 1; it is written to work either way.
- **Why this model:** the work is reading owner-facing screens critically and
  tracing each claim to the evidence under it, then reproducing seven specific
  failures. That is a coding-and-review model's job, and the audit that found
  these defects was done at this class.
- **Why this level:** Medium. The hard part is judgement — does this sentence
  mean what the numbers under it support — not depth of search, and the root
  causes are already found and written down. `qa/README.md` asks for the lowest
  level that does not risk quality; save the top of the range for a defect that
  turns out to need architectural reasoning, and say so if one does.
- **Why the same conversation:** `qa/README.md`'s conversation rule. A retest
  after a builder repair returns to the conversation that ran the original test;
  it holds the seven reproductions and its own reasoning about them, which is
  what the repair has to satisfy.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
You are independent QA for the Life Command OS rebuild. Claude is the builder;
you are the reviewer, and the builder cannot approve its own phase.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_06_QA_HANDOFF.md. Update it in place with a
"Round 3 — Codex retest" section. It is the only file you may write, and you
may not change application or product code. The builder may not edit that
report; it is yours, including during this retest.

START HERE, BEFORE READING ANY REPOSITORY DOCUMENT.

1. Open the deployed Preview at a normal Now, on a phone-sized Android-style
   context — touch, mobile user agent, realistic device pixel ratio, real
   scrolling. Use it as the owner. Answer what it asks. Move between Now,
   Timeline, Insights, Life and a domain page.
2. Write down what the app appears to claim, in its own words, before you know
   what it is supposed to claim. This step is the reason the last three rounds
   of defects were found by a person and not by 750 passing tests.

Only then read the repository.

WHAT TO TEST, IN THIS ORDER

Step 2 — claim to evidence. For each claim on screen, establish what it
actually rests on. Every defect in this phase's three rounds was a claim
printed wider than the evidence underneath it.

Step 3 — the seven you raised. Reproduce each one on the deployed build and
judge the repair against your own criteria, not against the builder's account
of them:

  1. Two objects under one verb. Four walks with energy higher and four bike
     rides with energy lower must be two findings, never one, and neither may
     be printed under the other's name.
  2. Context. A relationship that holds on weekdays and not at weekends must
     not collapse to one figure, and the collapsed figure must not reach a
     recommendation on a Tuesday.
  3. Exposure. An occasion the record cannot place must be in neither group,
     counted, and reported. Silence is not a "without".
  4. Confounding. Recorded events between the two readings must invalidate the
     pair, and the copy must claim only the check that was actually run.
  5. Correctability. The owner must be able to reject what the app has worked
     out without deleting the history under it, and the app must be able to
     conclude again from evidence he has not disputed.
  6. Order. Life's "Recently" must show a same-moment correction after the
     thing it corrects.
  7. Freshness. No surface may answer "is what the app believes still current"
     with "something came in recently".

Step 4 — the phase gate. Canonical plan section 51, including the lines D-091
added to it, now that you understand what the screens mean.

Step 5 — targeted regression on what this repair touched: Timeline, Insights,
Now's evidence panel, Life, and the domain pages. Confirm nothing you passed in
earlier rounds has regressed, that QA-A1's repair is intact — the owner is
still asked how he is and never asked to grade what a move did — and that every
deferred item is unchanged (P4-6, P4-7, the never-settled started move, and
Phase 5's four).

Step 6 — architecture inspection only where a defect suggests the boundary is
wrong rather than the line.

Step 7 — full-suite duplication ONLY on a concrete trigger: a builder claim
that does not match what you observe, a suspected false-green, or a change to
the test harness itself. The builder's suite is green and that is evidence;
re-running it to watch it pass again is not QA and costs the attention steps 1
and 2 need.

ONE THING THE OWNER RAISED, WHICH IS YOURS TO SETTLE

Using the normal app — not the QA laboratory — the owner answered a
current-energy question with "Plenty", and Timeline then showed "Nothing here
yet". Do not assume this is user error. Establish what actually happens:

- does an answer given at a normal Now persist as a canonical record;
- does it survive navigation, a refresh, closing and reopening the browser, and
  a new Preview deployment;
- does Timeline show the observation immediately;
- is QA-scenario data isolated from normal owner data;
- can loading or leaving the QA laboratory overwrite or clear normal history;
- can a deployment orphan or reset the IndexedDB store.

Reproducible data loss is a Phase 6 blocker. If it does not reproduce, record
which transitions you tested and what the expected behaviour is, so the next
person does not have to guess.

TWO DECISIONS THE BUILDER MADE RATHER THAN IMPLEMENTED, STILL YOURS TO ACCEPT
OR REJECT

1. tests/synthetic/inferred-evidence.test.ts's assertions that deriveOutcomes
   fires for exactly three verbs are kept, with the reasoning in the file.
2. emotionalState is not split into named dimensions. It is tracked, so it
   participates, but which dimensions exist is the owner's to say. D-091
   invariant 6 records it as an open question.

THE CHECKPOINT

The product checkpoint and the deployed Preview SHA are in
docs/PHASE_STATUS.md's build identity table. Verify both yourself against
preview/build-info.json and against what the app shows under More → This build,
and check `git log <checkpoint>..HEAD --stat` for anything outside docs/.

HOW THIS ENDS

Update docs/qa/PHASE_06_QA_HANDOFF.md with the retest record and an overall
PASS or FAIL, and in the same response, without being asked: the verdict; the
QA-tested SHA; the report path; the recommended model, level and conversation
instruction for the next action, each with a one-sentence reason — naming a
Claude model where the next step is the builder's — and the complete next
prompt written into the report file. Close with a short launcher rather than
repeating the whole prompt inline.

On PASS the next prompt goes to CURRENT — the Claude builder conversation — for
the formal GREEN closeout. On FAIL it goes to CURRENT for another repair round,
and this phase stays YELLOW.

Do not ask the owner to paste anything — you have the paths.
```
