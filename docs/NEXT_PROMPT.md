# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 4 of
`docs/qa/PHASE_84_QA_HANDOFF.md`. Not a new conversation, and not the Claude
builder.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 84 is YELLOW.** You have failed it four times and been right four
times. **Rounds 3 and 4 both came back clean on the product** — all seven
acceptance items, QA-84-007 through QA-84-011 closed on the deployed build, the
cold-store walk honest — and both findings were about the standing guard.
QA-84-012 is repaired. The repaired product checkpoint is `f45214b`. The builder
has not declared GREEN (D-077).

**The reasoning level is `High`, and it is not a Max phase for QA.** Codex has no
Max level and the application will not switch to its top level under automation.

---

## The constraint every phase from here carries

**Your `**Phase:**` field is `84`.** Never `9`, `09`, `8.4` or `9.1` — those
parse at or below 82 and never route, silently. Plan **section 43A** and
**D-159** hold the map: 83, 84, 90, 91, 92, 93, 94. **A QA round does not get a
new integer**; rounds 1…n all carry **84**, and there must be no `PHASE_85_*`
file on disk.

**On the completion marker.** Round 4's handoff asked for it at the end of this
file and not in the QA report. The owner's standing instruction is the opposite
and governs: the marker is the last meaningful line of
`docs/qa/PHASE_84_QA_HANDOFF.md` and appears in no other file. That is also what
keeps the orchestrator routing **this** dispatch rather than a finished repair.

---

## What QA-84-012 became

**Your finding is the third variation on one theme, and the repair names it as
such.** DEF-0127 guarded D-187 with a list of phrases; DEF-0128 with a list of
verbs; DEF-0129 with a list of one module. Each time the guard was collected
where the copy is _written_ rather than where it is _read_.

**1. The collector renders.** `tests/synthetic/blocker-copy.test.tsx` mounts
`BlockersPanel`, `BlockerQuestion` and `ResumePanel` in every branch and reads
every text-bearing element and every `aria-label` — the only place an
interpolated sentence and a template-literal accessible name exist whole. The
withdrawal control's name you named specifically appears nowhere in the source as
a complete string.

**2. The enumeration of surfaces is structural too.**
`blockerSurfacesInSource()` derives the set from what the components **take** — a
prop typed `StandingBlocker`, `BlockerDecision` or `ResumableMove` — and the test
asserts the rendered set equals it. A fourth panel fails until it is rendered.

**3. The catalogue has two halves**, one proved by walking the scenario library
through `blockerQuestionFor` and one by rendering, each responsible for its own
entries in both directions.

**4. The rendered gates read whole panels**, element by element plus the
accessibility tree, rather than the child locator you identified.

**Proved at the boundaries you named**, including your own proposed edit — _"The
app keeps these so it can choose something better next time."_ — which now fails
the synthetic catalogue **and** the browser gate.

**No product copy changed.** You read the live copy as honest and it still is.

---

## What Round 5 is judging it against

The **same seven-item gate** in `PRODUCT_ADJUDICATION.md` section 8, governed by
**D-173**. All seven passed in Rounds 3 and 4. **Re-verify all seven anyway.**

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed build,
the privacy scan, the block sweep, and the copy guards.

### The cold-store owner-use check, again

**Repeat it**, on the same terms: a genuinely fresh browser store, **no QA
laboratory**, no seeded fixture, ordinary product screens only, **CASE A**
(_"More money"_ into the second agenda) and **CASE B** (the caregiving blocker).
It is a **cold-store owner-use check and not a sealed one**. The trailing-dot
host remains a good technique.

### And the boundaries this repair declared rather than closed

Two, both named in the builder's Round 4 record, and both fair game:

1. **History, Timeline, correction and export renderers** describe an
   `action-unable-now` in their own words, and those words are guarded by the
   copy catalogues and sweeps those surfaces already have — **not** by the
   blocker catalogue. If a blocker promise can be written there, that is a real
   finding and the record says so is where the boundary was declared.
2. **The classifier's entailment limit** (D-193) is unchanged and documented.
   Escapes there are expected; a finding is one where the **catalogue** would let
   a promise through.

Beyond those, the thing worth attacking is the new collector itself: is there an
owner-visible blocker string that is neither in `blockers.ts` nor rendered by one
of the three enumerated components — a fifth surface, a branch the walk does not
enter, a string that appears only under a state the four resume walks miss?

---

## What must not have happened, and QA should confirm it did not

- **No strategy evaluation** (F03), **no pattern-discovery engine** (F15/F17/F18).
- **No enforcement of a blocker constraint.** D-187, D-192, D-193 and D-194 are
  about _saying_ so honestly. If a recommendation now changes because of a
  blocker, that is a finding, not an improvement.
- **No semantic interpretation of the owner's words** (D-024, D-025, D-172).
- **No domain progression models** beyond Career, Health and Money.
- **No owner routines library** (AUD-0045). **No backfill** (D-165). **No twelfth
  domain page.** **No scoring change** (D-137, D-138). **No new visual language.**
- **No `PHASE_85_*` file**, no alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`,
  no orchestrator change.

---

## Handoff — independent QA of routing phase 84, round 5

**Model:** Codex.
**Reasoning level:** **High** — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 4.

```text
Round 5 retest of routing Phase 84 of Life Command OS: "what the owner is
trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You have failed this phase four times and been right four times. Rounds 3 and
4 were both clean on the product; both findings were about the standing guard.
QA-84-012 is repaired. Routing 84 is still YELLOW at repaired product
checkpoint f45214b; the builder has not declared GREEN (D-077).

Read, in full, and in this order:
1. docs/qa/README.md            — the protocol. Step 1 is cold use of the
                                  deployed Preview BEFORE any repository
                                  document, and the order is the point.
2. docs/qa/PHASE_84_QA_HANDOFF.md — your rounds 1 to 4, unedited, with the
                                  builder's repair records appended below them
3. docs/PRODUCT_ADJUDICATION.md section 8 — the seven-item gate; section 11 is
                                  the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169, D-173, D-177..D-194
5. docs/DEFECT_LEDGER.md DEF-0119..DEF-0129
6. docs/PHASE_STATUS.md — the routing 84 record, rounds 1 to 4 included

Confirm the deployed build against the repaired checkpoint before testing:
  node --use-system-ca scripts/checkpoint-equivalence.mjs f45214b --deployed \
    https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

Repeat the manual COLD-STORE OWNER-USE CHECK on the same terms as rounds 2 to
4: a genuinely fresh browser store, no QA laboratory, no seeded fixture,
ordinary screens only, CASE A ("More money") and CASE B (the caregiving
blocker). It is a cold-store owner-use check, NOT a sealed check.

Then re-verify all seven acceptance items.

Attack in particular:
- the new rendering collector: is there an owner-visible blocker string that
  is neither assembled in blockers.ts nor rendered by BlockersPanel,
  BlockerQuestion or ResumePanel — a fifth surface, a branch the walk does not
  enter, a state the four resume walks miss?
- the two boundaries the builder DECLARED rather than closed, both named in
  its round 4 record: the history/Timeline/correction/export renderers, which
  describe an unable-now in their own words and are guarded by their own copy
  sweeps rather than by the blocker catalogue; and the classifier's
  documented entailment limit.
- whether anything is invented to fill a first-run screen, whether Health's
  confirmation and recommendation still agree, and whether any rendered
  history entry contradicts itself about extent.

A finding is one where the CATALOGUE would let a promise through, or where
owner-visible blocker copy exists that no gate asks about. Naming further
classifier escapes is useful and welcome but is not the same claim.

Use a real Android-style context, read whole screens as a person, and actively
try to disprove that the repairs hold. Name which automated tests still give
false confidence.

Write Round 5 into docs/qa/PHASE_84_QA_HANDOFF.md, below the builder's Round 4
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
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 4.

```text
Round 5 retest of routing Phase 84 of Life Command OS, after your Round 4 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full — your rounds 1 to 4 and the
builder's repair records below them — and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Repaired product checkpoint: f45214b. Your **Phase:** field is 84. Do not
create any PHASE_85_* file.

Repeat the manual cold-store owner-use check from a genuinely fresh browser
store without ever opening the QA laboratory, including CASE A and CASE B.
docs/NEXT_PROMPT.md states it in full, along with what to attack in the
rebuilt copy catalogue and the two boundaries the builder declared.

Write Round 5 into docs/qa/PHASE_84_QA_HANDOFF.md, below the Round 4 repair
record. Do not change product code, and reproduce the builder's claims rather
than accepting them.

Do not ask me to paste file contents.
```
