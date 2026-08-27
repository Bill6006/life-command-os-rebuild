# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 84 builder, and not any routing 83
conversation.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 84 is YELLOW — READY FOR INDEPENDENT QA.** A builder conversation may
not approve its own phase (D-077). The build is at product checkpoint
`39d147e`; the brief for QA is
[`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md) and the phase record is
[`PHASE_STATUS.md`](PHASE_STATUS.md).

**The reasoning level is `High`, and it is not a Max phase for QA.** Codex has
no Max level and the application will not switch to its top level under
automation; a handoff asking for Max stops the orchestrator with the level
unset. That has now happened three times across this campaign, and the builder's
own level being Max does not change the QA block's.

---

## The constraint every phase from here carries

**Your `**Phase:**` field is `84`.** Never `9`, `09`, `8.4` or `9.1` — those
parse at or below 82 and never route, silently. Plan **section 43A** and
**D-159** hold the map: 83, 84, 90, 91, 92, 93, 94. Canonical phase names are
unchanged and canonical Phase 10 is **not** re-scoped by receiving a routing
label (D-109 stands). A QA round does not get a new integer; rounds 1…n of this
phase all carry **84**.

---

## What was built

**The destination and discovery structure — canonical Phase 9's product
contract.** Six packages, in the dependency order the adjudication set, package
1 first and absolutely so.

The review's central finding was that there was no `destination`, `milestone` or
`baseline` anywhere in `src/`: every object the product held was scoped to today
or to a bounded three-step course, so it could say **what to do next** and could
not say **what any of it was for**. This phase builds that object and the five
things that had to exist around it before it meant anything.

| #     | Package                                 | What it is now                                                                                                                      |
| ----- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **The destination object**              | A `destination` record and entity, four parts, no number on any of it. What is next is a `goal` carrying `milestoneOf` (**D-181**). |
| **2** | **Progress evidence semantics**         | Six rungs, each with its own sentence and its own statement of what it is not evidence of. `enough-done-today` (**D-185**).         |
| **3** | **Owner authoring**                     | One create-and-confirm control for six things, and the first path in the product that creates a semantic entity (**D-182**).        |
| **4** | **The second information agenda**       | On Insights, its own weekly budget, one question per object (**D-184**), and it shows what an answer changed.                       |
| **5** | **Inability, interruption, the states** | The `blocker` field gets a control and a reader; `part-done`; a way back to an interrupted move.                                    |
| **6** | **Correction grammar, private consent** | Four gestures that say what they will change first; withdraw and re-date; one permission, off by default.                           |

**The measure is routing 83's own instrument.** The same walk, from the same
near-empty store, through the same controls: it got past three of eight steps
and enumerated the five it stopped at, and it now gets past all eight.
`recordKindsWithNoOwnerRoute()` returns nothing.

**One rule the phase discovered and had to widen a guard for** — **D-183**. Two
source-reading guards could not see correct code: the accessible-name scan did
not recognise a plain quoted `htmlFor`, and the instrument's builder reader
could not see a control that returns entities and records together. Both were
one edit away from being hidden behind an exemption, and both were repaired in
the reader.

---

## What QA is judging it against

The seven-item gate in `PRODUCT_ADJUDICATION.md` section 8, governed by
**D-173**: acceptance is the owner's own journey sentence, not a set of fields,
and its load-bearing clause is _"without requiring me to already understand
myself."_

1. A desired outcome named in each proving domain changes the next
   recommendation, from the near-empty store.
2. A completed session, a completed course and a milestone are three different
   things, and no surface claims capability from attendance.
3. Every object the rich fixtures hold is reachable through ordinary use.
4. The agenda asks what would not change today, shows what it later changed, and
   asks less as it learns.
5. "Can't right now" produces a durable correctable statement, and asks nothing
   when the constraint is known.
6. Each correction states its consequence first, and a private reading is stored
   without being reasoned from.
7. The standing guards still bite.

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed build,
the privacy scan, the block sweep, and the copy guards.

---

## What must not have happened, and QA should confirm it did not

- **No strategy evaluation** (F03). Later Validity's.
- **No pattern-discovery engine** (F15/F17/F18).
- **No domain progression models** beyond Career, Health and Money. Fatherhood
  is outside the proving scope and the growth model is untouched.
- **No owner routines library** (AUD-0045). The route exists; nothing walks it.
- **No backfill of a historical event** (D-165).
- **No twelfth domain page.** D-168 is approved and adding a page is navigation,
  which is canonical Phase 9's gate.
- **No scoring change of any kind** (D-137, D-138).
- **No new visual language.** Plan section 54 lists what canonical Phase 9
  inherits.
- **No live model** (D-172).
- **No alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`.**
- **No orchestrator change.**

---

## Handoff — independent QA of routing phase 84

**Model:** Codex.
**Reasoning level:** **High** — never Max.
**Conversation:** a **new** conversation. Not the routing 84 builder.

```text
Independent QA of routing Phase 84 of Life Command OS: "what the owner is
trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Routing 84 is YELLOW — READY FOR INDEPENDENT QA at product checkpoint 39d147e.
A builder conversation may not approve its own phase (D-077).

Read, in full, and in this order:
1. docs/qa/README.md            — the protocol. Step 1 is cold use of the
                                  deployed Preview BEFORE any repository
                                  document, and the order is the point.
2. docs/qa/PHASE_84_QA_HANDOFF.md — the builder's submission, the acceptance
                                  criteria, what changed, and where the builder
                                  expects you to look hardest
3. docs/PRODUCT_ADJUDICATION.md section 8 — the seven-item gate; section 11 is
                                  the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169 and D-173, then D-177..D-186
5. docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md — F01, F02, F04, F05, F07, F10, F11,
                                  F13, F19, F26, F30, F32, F35, F36
6. docs/PHASE_STATUS.md — the routing 84 record, and the routing 83 record
                          above it whose enumerated brief was this phase's scope

Confirm the deployed build against 39d147e before testing:
  node scripts/checkpoint-equivalence.mjs 39d147e --deployed \
    https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

Test on the near-empty store — "The first evening" in the QA laboratory — because
D-161 is what this phase is accepted against: a capability is accepted when an
ordinary owner can reach it from a near-empty store, not when a prepared fixture
demonstrates it. Then look at a destination beside a rich history, which is the
case the builder is least sure of.

Use a real Android-style context, read whole screens as a person, and actively
try to disprove that the phase is correct. Name which existing automated tests
gave false confidence.

Write your findings into docs/qa/PHASE_84_QA_HANDOFF.md from Round 1 on. The
builder does not edit your rounds. You do not change product code.

End your response with the four lines and a launcher (D-092): model, reasoning
level, conversation, and a short copyable prompt naming the file the next
conversation must read.

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Codex. **Reasoning level:** High — never Max.
**Conversation:** NEW — a new conversation, not the routing 84 builder.

```text
Independent QA of routing Phase 84 of Life Command OS.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Product checkpoint: 39d147e. Your **Phase:** field is 84.

Write your findings into docs/qa/PHASE_84_QA_HANDOFF.md from Round 1 on. Do not
change product code, and do not approve your own reading of the builder's
claims — reproduce them.

Do not ask me to paste file contents.
```

<!-- LCO_COMPLETE -->
