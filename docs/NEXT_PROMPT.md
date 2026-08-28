# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1, 2 and 3
of `docs/qa/PHASE_84_QA_HANDOFF.md`. Not a new conversation, and not the Claude
builder.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 84 is YELLOW.** You have failed it three times and been right three
times. **Round 3's product half was clean** — all seven acceptance items passed
and QA-84-007 through QA-84-010 were closed on the deployed build — and the one
finding, QA-84-011, was about the standing guard. It is repaired. The repaired
product checkpoint is `0f9b882`. The builder has not declared GREEN (D-077).

**The reasoning level is `High`, and it is not a Max phase for QA.** Codex has no
Max level and the application will not switch to its top level under automation.
The builder's own level being Max does not change the QA block's.

---

## The constraint every phase from here carries

**Your `**Phase:**` field is `84`.** Never `9`, `09`, `8.4` or `9.1` — those
parse at or below 82 and never route, silently. Plan **section 43A** and
**D-159** hold the map: 83, 84, 90, 91, 92, 93, 94. **A QA round does not get a
new integer**; rounds 1…n of this phase all carry **84**, and there must be no
`PHASE_85_*` file on disk.

---

## What QA-84-011 became

**Your sentence for it is the one the repair was written around:** _"the old
guards listed remembered phrases; the replacement takes a cross-product of
remembered words and calls that the semantic class."_ Three guards have now been
written for D-187 and two failed the same way. **The repair is not a third
list.**

**1. The guarantee is a closed catalogue.** `APPROVED_BLOCKER_COPY` enumerates
every string the blocker path can render, and the synthetic gate asserts it in
**both** directions against a walk of the whole scenario library — nothing
rendered that is not approved, nothing approved that is not rendered. An
allowlist over a finite set has no escapes: a copy edit now fails the gate until
somebody adds it deliberately, in a diff, which is the moment to decide what the
new sentence promises.

**2. The classifier is the net, and it no longer reads the verb.** What a promise
is _about_ is unbounded and any list of it is a list of what somebody remembered.
What is not unbounded is the grammar that puts a sentence in a later moment:
**modal auxiliaries are a closed class in English**, and forward deixis is a short
closed set. A claim is the app — or its output, named or nominalised — plus one of
those. `choose`, `pick`, `use` and `prefer` now fail because the verb is never
consulted at all.

**3. The proof changed with it**, which was your deeper objection. The boundary is
generated rather than remembered: **3,248 sentences** over subject × modal × verb,
where the verbs include `frobnicate`, `zorble` and `quibblify`. A guard that
consults a verb vocabulary fails that sweep on the first unfamiliar word.

**One copy change.** The restorative silence said _"there is nothing the app would
do differently"_ — true, and still a statement about what the app would do. A
denial of a future change is as much a claim about the future as an assertion of
one. It now says why it is silent in terms of the move that was offered.

**And what the classifier still cannot do is written into the module.** It cannot
decide entailment: _"the app learns from this"_ has no modal and no forward
reference, is a promise, and returns nothing. That is stated where the guard is
defined rather than left for a fifth round, and it is why the phase relies on the
catalogue rather than on the classifier (**D-193**).

---

## What Round 4 is judging it against

The **same seven-item gate** in `PRODUCT_ADJUDICATION.md` section 8, governed by
**D-173**. All seven passed in Round 3. **Re-verify all seven anyway** — every
round of this phase has broken something an earlier round passed, twice because
of a repair.

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed build,
the privacy scan, the block sweep, and the copy guards.

### The cold-store owner-use check, again

**Repeat it**, on the same terms: a genuinely fresh browser store, **no QA
laboratory**, no seeded fixture, ordinary product screens only, **CASE A** (answer
the second agenda with _"More money"_, read what it says it will create and what it
is not assuming before confirming, then inspect what was written) and **CASE B**
(_"Can't right now"_ and the caregiving blocker for the real owner situation). It
is a **cold-store owner-use check and not a sealed one**, because Rounds 1 to 3
already exist in this conversation.

The trailing-dot host you used for a fresh IndexedDB origin in Round 3 is a good
technique and worth repeating.

### And three things worth attacking specifically

1. **The catalogue, which is now the guarantee.** Can the blocker path render a
   string that is not in `APPROVED_BLOCKER_COPY` — through a branch the sweep
   does not walk, a template that interpolates, or a surface that composes copy
   of its own? The approval check missed exactly that once during this repair: it
   was walking one evening rather than the library, and an unapproved edit to the
   repeatedly-blocked note went straight past it.
2. **The classifier's boundary, which is named rather than closed.** Escapes are
   expected and the module says so. A finding here is one where the **catalogue**
   would let a promise through, not one where the classifier alone does — though
   naming further classifier escapes is useful and welcome.
3. **The restorative silence's new sentence.** It is the one string this repair
   changed. Is it true, and does it read as an explanation rather than a verdict
   on him?

---

## What must not have happened, and QA should confirm it did not

- **No strategy evaluation** (F03), **no pattern-discovery engine** (F15/F17/F18).
- **No enforcement of a blocker constraint.** D-187, D-192 and D-193 are about
  _saying_ so honestly. If a recommendation now changes because of a blocker,
  that is a finding, not an improvement.
- **No semantic interpretation of the owner's words** (D-024, D-025, D-172).
- **No domain progression models** beyond Career, Health and Money. Fatherhood is
  outside the proving scope and the growth model is untouched.
- **No owner routines library** (AUD-0045). **No backfill** (D-165). **No twelfth
  domain page.** **No scoring change** (D-137, D-138). **No new visual language.**
- **No `PHASE_85_*` file**, no alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`,
  no orchestrator change.

---

## Handoff — independent QA of routing phase 84, round 4

**Model:** Codex.
**Reasoning level:** **High** — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1, 2 and 3.

```text
Round 4 retest of routing Phase 84 of Life Command OS: "what the owner is
trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You have failed this phase three times and been right three times. Round 3's
product half was clean and its one finding, QA-84-011, is repaired. Routing 84
is still YELLOW at repaired product checkpoint 0f9b882; the builder has not
declared GREEN (D-077).

Read, in full, and in this order:
1. docs/qa/README.md            — the protocol. Step 1 is cold use of the
                                  deployed Preview BEFORE any repository
                                  document, and the order is the point.
2. docs/qa/PHASE_84_QA_HANDOFF.md — your rounds 1, 2 and 3, unedited, with the
                                  builder's repair records appended below them
3. docs/PRODUCT_ADJUDICATION.md section 8 — the seven-item gate; section 11 is
                                  the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169, D-173, D-177..D-193
5. docs/DEFECT_LEDGER.md DEF-0119..DEF-0128
6. docs/PHASE_STATUS.md — the routing 84 record, rounds 1 to 3 included

Confirm the deployed build against the repaired checkpoint before testing:
  node --use-system-ca scripts/checkpoint-equivalence.mjs 0f9b882 --deployed \
    https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

Repeat the manual COLD-STORE OWNER-USE CHECK on the same terms as rounds 2 and
3: a genuinely fresh browser store, no QA laboratory, no seeded fixture,
ordinary screens only, CASE A ("More money" into the second agenda) and CASE B
(the caregiving blocker) unchanged. It is a cold-store owner-use check, NOT a
sealed check.

Then re-verify all seven acceptance items. Every round of this phase has
broken something an earlier round passed, twice because of a repair.

Attack in particular:
- the catalogue, which is now the guarantee rather than the classifier: can
  the blocker path render a string that is not in APPROVED_BLOCKER_COPY,
  through a branch the sweep does not walk or a surface that composes its own
  copy? The approval check missed exactly that once during this repair.
- the restorative silence's new sentence, the one string this repair changed:
  is it true, and does it explain rather than judge?
- whether anything is invented to fill a first-run screen;
- whether the Health confirmation and the Health recommendation still agree,
  and whether any rendered history entry contradicts itself about extent.

The classifier's entailment boundary is named in the module rather than
closed, and escapes are expected there. A finding is one where the CATALOGUE
would let a promise through; naming further classifier escapes is useful and
welcome but is not the same claim.

Use a real Android-style context, read whole screens as a person, and actively
try to disprove that the repairs hold. Name which automated tests still give
false confidence.

Write Round 4 into docs/qa/PHASE_84_QA_HANDOFF.md, below the builder's Round 3
repair record. The builder does not edit your rounds and you do not change
product code. Your **Phase:** field is 84 — a QA round does not get a new
integer, and you must not create any PHASE_85_* file.

End your response with the four lines and a launcher (D-092): model, reasoning
level, conversation, and a short copyable prompt naming the file the next
conversation must read.

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Codex. **Reasoning level:** High — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1, 2 and 3.

```text
Round 4 retest of routing Phase 84 of Life Command OS, after your Round 3 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full — your rounds 1 to 3 and the
builder's repair records below them — and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Repaired product checkpoint: 0f9b882. Your **Phase:** field is 84. Do not
create any PHASE_85_* file.

Repeat the manual cold-store owner-use check from a genuinely fresh browser
store without ever opening the QA laboratory, including CASE A and CASE B.
docs/NEXT_PROMPT.md states it in full, along with what to attack in the
rebuilt copy guard.

Write Round 4 into docs/qa/PHASE_84_QA_HANDOFF.md, below the Round 3 repair
record. Do not change product code, and reproduce the builder's claims rather
than accepting them.

Do not ask me to paste file contents.
```
