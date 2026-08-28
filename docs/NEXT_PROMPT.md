# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 5 of
`docs/qa/PHASE_84_QA_HANDOFF.md`. Not a new conversation, and not the Claude
builder.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 84 is YELLOW.** You have failed it five times and been right five
times. **Rounds 3, 4 and 5 all came back clean on the product** — all seven
acceptance items each round, QA-84-007 through QA-84-012 closed on the deployed
build — and all three findings were about the standing guard. QA-84-013 is
repaired. The repaired product checkpoint is `1324f66`. The builder has not
declared GREEN (D-077).

**The reasoning level is `High`, and it is not a Max phase for QA.** Codex has no
Max level and the application will not switch to its top level under automation.

---

## The constraint every phase from here carries

**Your `**Phase:**` field is `84`.** Never `9`, `09`, `8.4` or `9.1`. Plan
**section 43A** and **D-159** hold the map: 83, 84, 90, 91, 92, 93, 94. **A QA
round does not get a new integer**; rounds 1…n all carry **84**, and there must
be no `PHASE_85_*` file on disk.

**On the completion marker.** Rounds 4 and 5 asked for it at the end of this file
and not in the QA report. The owner's standing instruction is the opposite and
governs: the marker is the last meaningful line of
`docs/qa/PHASE_84_QA_HANDOFF.md` and appears in no other file. That is also what
keeps the orchestrator routing **this** dispatch rather than a finished repair.

---

## What QA-84-013 became

**Reproduced first**, on the checkpoint you tested: your mutation, and 113/113
passing with the promise in place. The finding is exactly as reported.

**Why the surface enumeration could not have found it.**
`blockerSurfacesInSource()` looks for React components whose props include a
blocker-path type. `describeRecord` is not a component and takes a
`CanonicalRecord` — and Timeline, the domain page's "Recently", the correction
list and the export all render its one sentence.

**So the guarantee now has three halves**, each proved by the check that can
reach it: what `blockers.ts` **assembles** (walked through the scenario library),
what the surfaces **compose** in JSX (rendered), and what a record **reads as**
(described). The third covers all four of those surfaces at once.

**And the describers are enumerated from source**, which is the part you insisted
had to be structural. It is not a list of surfaces:
`recordTextFunctionsInSource()` returns **every exported function in `src/`
taking a `CanonicalRecord`** — thirteen. Five produce owner text and are
exercised over every record the blocker path writes; the other eight are named in
`NOT_OWNER_TEXT` with the reason each gives the owner no words. **A fourth
describer fails until somebody classifies it.**

**Proved by reintroduction four ways**: your exact lifecycle-frame promise; a
promise in the generic fallback reached when the move no longer resolves; a
promise in the tag; and a new describer nobody classified, which fails the source
enumeration rather than the catalogue.

**No product code changed this round.** The copy was honest throughout; the
guarantee was what was defective.

---

## The cold-store evidence Round 5 could not produce, and how to get it

**Round 5 was right to refuse.** Both ordinary origins already held its own Round
4 records, and relabelling a retained store as fresh, or clearing owner data
without authorisation, would each have been worse than saying so. The report is
better for the limitation being stated plainly.

**There is a technique that needs neither**, and this repository already uses it:
**an ephemeral browser context**. `browser.newContext()` from a fresh
`chromium.launch()` has an empty IndexedDB by construction, so a first run is
available without touching any existing store, without clearing anything and
without the QA laboratory.

`scripts/android-gate.mjs` opens exactly such a context for its own first-run
checks — the `coldContext` block, added in the Round 2 repair for this reason.
That is the pattern to copy.

**Round 6 owes CASE A and CASE B from a genuinely fresh store on those terms**:
no QA laboratory, no seeded fixture, ordinary product screens only. It remains a
**cold-store owner-use check and not a sealed one**, because Rounds 1 to 5 exist
in this conversation.

- **CASE A** — answer the second agenda with _"More money"_; read what it says it
  will create and what it is **not** assuming **before** confirming; then inspect
  what was written, whether the words survived byte-identical, and whether
  anything was silently inferred.
- **CASE B** — _"Can't right now"_, then the caregiving blocker, for the real
  owner situation. Inspect what is recorded and what the product then claims.

---

## What Round 6 is judging it against

The **same seven-item gate** in `PRODUCT_ADJUDICATION.md` section 8, governed by
**D-173**. All seven passed in Rounds 3, 4 and 5. **Re-verify all seven anyway.**

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed build,
the privacy scan, the block sweep, and the copy guards.

### And what is worth attacking

1. **The third catalogue half and its enumeration.** Is there an owner-visible
   string derived from a blocker-path record that no describer in
   `recordTextFunctionsInSource()` produces — composed in a surface from a
   record's fields directly, rather than from `describeRecord`? That is the same
   shape as QA-84-013 one layer along, and it is the attack most likely to land.
2. **The `NOT_OWNER_TEXT` exemptions.** Eight functions are excused as producing
   no owner-visible words. Each carries a reason. Is any of them wrong?
3. **The classifier's entailment limit** (D-193) is unchanged and documented.
   Escapes there are expected; a finding is one where the **catalogue** would let
   a promise through.

---

## What must not have happened, and QA should confirm it did not

- **No strategy evaluation** (F03), **no pattern-discovery engine** (F15/F17/F18).
- **No enforcement of a blocker constraint.** D-187, D-192 to D-195 are about
  _saying_ so honestly. If a recommendation now changes because of a blocker,
  that is a finding, not an improvement.
- **No semantic interpretation of the owner's words** (D-024, D-025, D-172).
- **No domain progression models** beyond Career, Health and Money.
- **No owner routines library** (AUD-0045). **No backfill** (D-165). **No twelfth
  domain page.** **No scoring change** (D-137, D-138). **No new visual language.**
- **No `PHASE_85_*` file**, no alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`,
  no orchestrator change.

---

## Handoff — independent QA of routing phase 84, round 6

**Model:** Codex.
**Reasoning level:** **High** — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 5.

```text
Round 6 retest of routing Phase 84 of Life Command OS: "what the owner is
trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You have failed this phase five times and been right five times. Rounds 3, 4
and 5 were all clean on the product; all three findings were about the
standing guard. QA-84-013 is repaired. Routing 84 is still YELLOW at repaired
product checkpoint 1324f66; the builder has not declared GREEN (D-077).

Read, in full, and in this order:
1. docs/qa/README.md            — the protocol. Step 1 is cold use of the
                                  deployed Preview BEFORE any repository
                                  document, and the order is the point.
2. docs/qa/PHASE_84_QA_HANDOFF.md — your rounds 1 to 5, unedited, with the
                                  builder's repair records appended below them
3. docs/PRODUCT_ADJUDICATION.md section 8 — the seven-item gate; section 11 is
                                  the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169, D-173, D-177..D-195
5. docs/DEFECT_LEDGER.md DEF-0119..DEF-0130
6. docs/PHASE_STATUS.md — the routing 84 record, rounds 1 to 5 included

Confirm the deployed build against the repaired checkpoint before testing:
  node --use-system-ca scripts/checkpoint-equivalence.mjs 1324f66 --deployed \
    https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

Round 6 owes CASE A and CASE B from a GENUINELY FRESH store, which round 5
could not produce and was right not to fake. Use an EPHEMERAL BROWSER CONTEXT:
browser.newContext() from a fresh chromium.launch() has an empty IndexedDB by
construction, so a first run needs no clearing, no authorisation and no QA
laboratory. scripts/android-gate.mjs already does this in its coldContext
block — copy that pattern. CASE A is "More money" into the second agenda,
read before confirming and inspected after; CASE B is "Can't right now" and
the caregiving blocker. It is a cold-store owner-use check, NOT a sealed one.

Then re-verify all seven acceptance items.

Attack in particular:
- the third catalogue half and its enumeration: is there an owner-visible
  string derived from a blocker-path record that no function in
  recordTextFunctionsInSource() produces — composed in a surface from a
  record's fields directly rather than through describeRecord? That is
  QA-84-013 one layer along and is the attack most likely to land.
- the eight NOT_OWNER_TEXT exemptions, each of which claims a function gives
  the owner no words. Is any of them wrong?
- whether anything is invented to fill a first-run screen, whether Health's
  confirmation and recommendation still agree, and whether any rendered
  history entry contradicts itself about extent.

The classifier's entailment limit is documented and unchanged; escapes there
are expected. A finding is one where the CATALOGUE would let a promise
through, or where owner-visible blocker copy exists that no gate asks about.

Use a real Android-style context, read whole screens as a person, and actively
try to disprove that the repairs hold. Name which automated tests still give
false confidence.

Write Round 6 into docs/qa/PHASE_84_QA_HANDOFF.md, below the builder's Round 5
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
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 5.

```text
Round 6 retest of routing Phase 84 of Life Command OS, after your Round 5 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full — your rounds 1 to 5 and the
builder's repair records below them — and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Repaired product checkpoint: 1324f66. Your **Phase:** field is 84. Do not
create any PHASE_85_* file.

Round 6 owes CASE A and CASE B from a genuinely fresh store. Use an ephemeral
browser context — browser.newContext() from a fresh chromium.launch() — which
has an empty IndexedDB by construction and needs no clearing and no QA
laboratory. docs/NEXT_PROMPT.md states it in full, along with what to attack
in the rebuilt catalogue.

Write Round 6 into docs/qa/PHASE_84_QA_HANDOFF.md, below the Round 5 repair
record. Do not change product code, and reproduce the builder's claims rather
than accepting them.

Do not ask me to paste file contents.
```
