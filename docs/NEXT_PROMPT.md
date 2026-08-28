# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the same Codex conversation that wrote Round 1 of
`docs/qa/PHASE_84_QA_HANDOFF.md`. Not a new conversation, and not the Claude
builder.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 84 is YELLOW.** Round 1 returned **FAIL**; every finding was real; all
six are repaired and the phase is back with you for **Round 2**. A builder
conversation may not approve its own phase (D-077), and the builder has not
declared GREEN. The repaired product checkpoint is `94e1716`; your own Round 1
report is in
[`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), unedited, with the
builder's repair record appended **below** it.

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
label (D-109 stands). **A QA round does not get a new integer**; rounds 1…n of
this phase all carry **84**, and there must be no `PHASE_85_*` file on disk.

---

## What Round 1 found, and what each finding is now

You found five owner-visible defects and one documentation defect. Every one was
real, every one was reachable only by using the app, and every one had a passing
test beside it. The repairs, in your numbering:

| Finding   | Your reproduction                                                               | What it is now                                                                                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-84-001 | a Health destination left Now byte-identical from the near-empty store          | `healthCandidates` proposes the Health destination's **next milestone** as a candidate — an owner-created entity ranked by `goal-fit`. No dimension added, no weight moved, AUD-0045's routines deferral intact, and **no invented duration**: the step is proposed with no minutes on it rather than with a guess. |
| QA-84-002 | **Only part of it** counted as a session and called _Followed through_          | `extent: 'partial'` has its own rung — **part-done** — with its own sentence, and history says _Got part of the way_. Seven rungs now, not six.                                                                                                                                                                     |
| QA-84-003 | a course finished through ordinary controls never rendered as a finished course | `readProgress` reads `situation.threads` and `thread.finished`. Your DEF-0119 class was right and the dead `state === 'done'` assumption was in **three** readers; a source guard found the other two.                                                                                                              |
| QA-84-004 | the weekly-chunk question stored one calendar date                              | The form asks **which day of the week** and a `weekly` recurrence is written from it. The note no longer points at a control that is not on that screen.                                                                                                                                                            |
| QA-84-005 | a blank optional next step was confirmed as the literal next step _"that"_      | `milestoneConfirmation()` is composed in `authoring.ts`, so it is a function of what the owner typed and a test can hold it to what is written. A blank now says _"Leave this empty and nothing is created for it."_                                                                                                |
| QA-84-006 | canonical section 54 told Phase 9 the second agenda shipped on Life             | Corrected to **Insights**.                                                                                                                                                                                                                                                                                          |

The punctuation sibling you named beside QA-84-005 is repaired at the
composition boundary rather than in the individual sentences: `ownerPhrase()`
strips trailing terminal punctuation from the owner's words as they enter a
generated sentence.

**The coverage you said was missing is there.** The deployed Android gate now
walks this phase's controls with a thumb — the aspiration form including the
empty-milestone confirmation, the progress panel, the second agenda's proposal
and the blocker question with every cause — and the browser suite gained the
Health counterfactual, the partial-progress copy, the naturally completed course,
the real discovery obligation flow and the blank milestone confirmation.

**Three defects the repair itself produced were found and logged** — DEF-0120,
DEF-0121, DEF-0122 — and one about the gate discipline, **D-186**: a browser run
was reported clean when a `tail` had hidden 26 failures above the last line. A
gate's exit status is what is read now, never a tail of its output.

---

## Two owner-directed corrections, declared

**Neither is a QA finding.** You raised neither in Round 1. The owner hit both in
real use of the deployed build and directed them into this repair round. They are
declared here so you meet them as **scope**, not as unexplained diff.
**QA-84-001 … QA-84-006 are unchanged, unreprioritised and unreplaced.**

**1. An eighth blocker cause — `must-stay`, _"Can't leave — someone's in my
care"_ (D-187).** Now offered a walk while the owner's daughter was asleep and
there was nobody else to watch her. The nearest of the seven was
`someone-needs-me`: semantically wrong (nobody needed his _time_; he was not free
to leave) and `standing: false`, so nothing durable was written at all.

The new cause is `standing: true` and becomes a constraint on the domain page
with **Not true any more** beside it. **It promises nothing, and that is the
part worth attacking.** `applyConstraints` never reads `situation.constraints`;
`cautionsFor` matches a constraint's concept against a candidate's `leansOn` and
no `leansOn` holds a `blocker.*` concept, so that branch cannot fire;
`constraints.ts` records the non-enforcement as deliberate. So no owner-visible
string on this path may claim a future recommendation will change. If you find
one that does, that is a finding.

**2. The discovery card stops bypassing the confirmation contract (D-188,
DEF-0123).** `Discovery.tsx` never imported `proposeAuthoring`; its destination
branch called `destinationRecords` directly. The owner typed **More money** into
the Career prompt, pressed **That is it**, and confirmed an interpretation he was
never shown — the same class as your QA-84-005, one surface across.

`proposeDestination()` now returns the same `AuthoringProposal` shape and
composes `milestoneConfirmation()`. `AUTHORABLE_KINDS` stays at six and D-188
records why widening a closed set to reuse a function was the worse of the two
available moves. `everyAuthoringSurface()` in `tests/synthetic/journey.ts` is the
guard that makes the bypass unrepeatable, with one named exemption carrying its
reason.

**Neither correction adds semantic interpretation.** The aim is stored
byte-identical, in the prompt's own domain — _"More money"_ under a Career prompt
stays Career. D-024, D-025 and D-172 stand; semantic capture is routing 91
package 1.

---

## What Round 2 is judging it against

The **same seven-item gate** in `PRODUCT_ADJUDICATION.md` section 8, governed by
**D-173**, whose load-bearing clause is _"without requiring me to already
understand myself."_ Items 3, 5, 6 and 7 passed in Round 1 and are not reopened
by the repair; **re-verify them anyway**, because a repair that breaks a passing
item is exactly the failure a retest exists to catch.

1. A desired outcome named in each proving domain changes the next
   recommendation, from the near-empty store. **Failed in Round 1 on Health.**
2. A completed session, a completed course and a milestone are three different
   things, and no surface claims capability from attendance. **Failed in Round 1
   on both halves.**
3. Every object the rich fixtures hold is reachable through ordinary use.
4. The agenda asks what would not change today, shows what it later changed, and
   asks less as it learns. **Failed in Round 1 on the weekly question.**
5. "Can't right now" produces a durable correctable statement, and asks nothing
   when the constraint is known.
6. Each correction states its consequence first, and a private reading is stored
   without being reasoned from.
7. The standing guards still bite.

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed build,
the privacy scan, the block sweep, and the copy guards.

**Reproduce the repairs the way you reproduced the defects** — cold, on the
deployed Preview, from **The first evening**, pressing the controls in order. The
builder's claim that a repair works is exactly the class of claim Round 1 showed
to be worth nothing on its own.

---

---

## One additional Round 2 requirement — the cold-store owner-use check

**Owner-directed, bounded, and manual.** It is **not** a new automated gate, it
does **not** expand routing 84's scope, and it replaces nothing: QA-84-001 …
QA-84-006 and every Round 2 requirement above stand unchanged.

**It is a _cold-store owner-use check_, not a sealed check.** D-090's sealed
definition requires the deployed build to be used before any repository document
is read, and you already hold Round 1 knowledge of this codebase. Calling this
sealed would be a claim the round cannot support. Call it what it is.

### How to start, and the one thing not to do

- A **genuinely fresh browser store** — a new profile or cleared site data, not a
  reset scenario.
- **Do not open the QA laboratory.**
- **Do not seed a fixture or any synthetic history.**
- Normal product screens only.

**On a genuinely empty store, Now offers exactly one control: _"Open the QA
laboratory."_** The builder confirmed this on the deployed build at 360px — Now
reads _"NOTHING LOADED / There is no history here yet"_, explains that the engine
will not guess, and the only thing to press is that link.

**Do not follow it.** Record it **immediately as a cold-start finding** in its own
right. It is not a blocked test and must not be written up as one: what it says
about the product is that the first screen of a first-run app hands the owner a
developer tool, and that observation is the evidence, not an obstacle to
gathering evidence.

### Then continue as an ordinary owner would

Navigate on through Life, Insights and the domain pages, and answer the question
the check exists to answer: **can the owner eventually reach a useful Now without
ever opening the QA laboratory?**

The builder's own cold read says Life reports _"With no history loaded there is
nothing to report about any of them"_ and **Insights does carry the second
agenda** — _"Getting to know you / One answer would help the app know you
better."_ So there is at least one door. Whether walking through it ends in a Now
that says something other than NOTHING LOADED is the thing to find out, and the
builder does not know the answer.

**Record every point where ordinary owner use cannot continue without the QA
laboratory.** That list is the deliverable of this check.

### CASE A — the second agenda, in ordinary vague language

When the agenda asks what you hope a domain eventually looks like, answer:

```text
More money
```

**Before confirming**, read exactly what the app says it will create and exactly
what it says it is **not** assuming.

**Then confirm**, and inspect:

- what records were actually written;
- whether the original words survived **byte-identical**;
- whether anything was silently inferred — a domain, an amount, a horizon, a
  second reading of the phrase;
- whether Now changes afterwards, and how.

**Do not expect semantic understanding.** Routing 84's claim is that the words are
preserved and the confirmation architecture is used honestly — not that the app
knows what _"More money"_ means. Understanding the phrase is routing 91 package 1
(D-172). A confirmation that describes something other than what is written is a
finding; an app that does not interpret the phrase is not.

### CASE B — "Can't right now", and the caregiving blocker

If Now produces a move, use the ordinary lifecycle controls. Press **Can't right
now**, and reach the new caregiving cause where it is reachable. The owner
situation it exists for:

> My daughter is sleeping and I have nobody else to watch her, so I cannot leave.

Inspect exactly what is recorded, and exactly what the product claims afterwards.

**Do not assume the blocker is enforced by ranking.** D-187 promises **capture,
not enforcement**, deliberately: `applyConstraints` never reads
`situation.constraints`, and `cautionsFor` matches a constraint's concept against
a candidate's `leansOn`, which never holds a `blocker.*` concept.

**If the UI implies that this blocker will prevent another walk — or claims any
behaviour the engine does not perform — record it as a finding.** That is the
failure mode D-187 exists to prevent and the one worth hunting.

Then continue using the app normally and observe whether anything reacts at all.

### What this check is, in the report

Manual owner-use evidence **inside Round 2**. Not a new acceptance instrument, not
a gate, and not a substitute for reproducing your own Round 1 findings.

---

## What must not have happened, and QA should confirm it did not

- **No strategy evaluation** (F03). Later Validity's.
- **No pattern-discovery engine** (F15/F17/F18).
- **No enforcement of a blocker constraint.** D-187 says a constraint is
  recorded and shown and not acted on. If a recommendation now changes because
  of one, that is a finding, not an improvement.
- **No semantic interpretation of the owner's words** (D-024, D-025, D-172). The
  aim is stored byte-identical, in the prompt's own domain.
- **No domain progression models** beyond Career, Health and Money. Fatherhood
  is outside the proving scope and the growth model is untouched.
- **No owner routines library** (AUD-0045). QA-84-001's repair proposes a
  **milestone**, not a routine the owner authored.
- **No backfill of a historical event** (D-165).
- **No twelfth domain page.** D-168 is approved and adding a page is navigation,
  which is canonical Phase 9's gate.
- **No scoring change of any kind** (D-137, D-138).
- **No new visual language.** The proposal on the discovery card reuses the
  authoring form's existing chrome.
- **No `PHASE_85_*` file.** A phase-85 QA filename on disk, committed or not,
  drops this file's phase out of the orchestrator's candidate set and orphans
  the QA loop.
- **No alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`.**
- **No orchestrator change.**

---

## Handoff — independent QA of routing phase 84, round 2

**Model:** Codex.
**Reasoning level:** **High** — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Round 1.

```text
Round 2 retest of routing Phase 84 of Life Command OS: "what the owner is
trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You failed this phase in Round 1. Every finding was real and all six are
repaired. Routing 84 is still YELLOW at repaired product checkpoint 94e1716;
the builder has not declared GREEN (D-077).

Read, in full, and in this order:
1. docs/qa/README.md            — the protocol. Step 1 is cold use of the
                                  deployed Preview BEFORE any repository
                                  document, and the order is the point.
2. docs/qa/PHASE_84_QA_HANDOFF.md — your own Round 1 report, unedited, with the
                                  builder's repair record appended below it.
                                  The repair record names two owner-directed
                                  corrections that are NOT your findings and
                                  are declared scope for this round.
3. docs/PRODUCT_ADJUDICATION.md section 8 — the seven-item gate; section 11 is
                                  the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169 and D-173, then D-177..D-188
5. docs/DEFECT_LEDGER.md DEF-0119..DEF-0123
6. docs/PHASE_STATUS.md — the routing 84 record, including its round 1 section

Confirm the deployed build against the repaired checkpoint before testing:
  node scripts/checkpoint-equivalence.mjs 94e1716 --deployed \
    https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

Retest on the near-empty store — "The first evening" in the QA laboratory —
because D-161 is what this phase is accepted against. Reproduce each of your
own Round 1 reproductions exactly, then re-verify items 3, 5, 6 and 7, which
passed before the repair and could have been broken by it.

One additional requirement, owner-directed and bounded — a COLD-STORE
OWNER-USE CHECK. It is manual owner-use evidence inside Round 2, not a new
automated gate, and it expands nothing: QA-84-001..006 and every requirement
above stand unchanged. Call it a "cold-store owner-use check", NOT a sealed
check — you already hold Round 1 knowledge, so D-090's sealed-before-repo
definition cannot be satisfied.

  - Start from a genuinely fresh browser store. Do NOT open the QA
    laboratory. Do NOT seed a fixture or synthetic history. Normal product
    screens only.
  - On a genuinely empty store Now offers exactly one control: "Open the QA
    laboratory." Do NOT follow it. Record that immediately as a COLD-START
    FINDING in its own right, not as a blocked test.
  - Then continue as an ordinary owner: navigate Life, Insights and the
    domain pages, and determine whether the owner can eventually reach a
    useful Now without ever opening QA Lab. Record every point where
    ordinary use cannot continue without it.

  - CASE A, destination/discovery. When the second agenda asks what you hope
    a domain eventually looks like, answer in ordinary vague language:
    "More money". BEFORE confirming, inspect exactly what the app says it
    will create and what it says it is NOT assuming. Then confirm and
    inspect: what records were written; whether the original words survived
    byte-identical; whether anything was silently inferred; whether Now
    changes afterwards. Do NOT expect semantic understanding — Phase 84 must
    preserve the words and use the confirmation architecture honestly, not
    understand their meaning (D-172).

  - CASE B, "Can't right now". If Now produces a move, use the normal UI
    lifecycle. Exercise "Can't right now" and the new caregiving /
    must-stay-here blocker where reachable, for the real owner situation:
    "My daughter is sleeping and I have nobody else to watch her, so I
    cannot leave." Inspect exactly what is recorded and exactly what the
    product claims afterwards. Do NOT assume the blocker is enforced by
    ranking — D-187 promises capture, not enforcement. If the UI implies the
    blocker will prevent another walk, or claims behaviour the engine does
    not perform, record that as a QA finding. Then continue normal use and
    observe whether anything reacts.

Attack in particular:
- the Health counterfactual with NO Career destination anywhere near it;
- whether any owner-visible string on the blocker path claims a future
  recommendation will change, when nothing in the engine reads a blocker
  constraint;
- whether the discovery card's proposal describes what is actually written,
  and whether declining writes anything at all;
- whether the owner's words survive byte-identical, in the prompt's own domain.

Use a real Android-style context, read whole screens as a person, and actively
try to disprove that the repairs hold. Name which automated tests still give
false confidence.

Write Round 2 into docs/qa/PHASE_84_QA_HANDOFF.md, below the builder's repair
record. The builder does not edit your rounds and you do not change product
code. Your **Phase:** field is 84 — a QA round does not get a new integer, and
you must not create any PHASE_85_* file.

End your response with the four lines and a launcher (D-092): model, reasoning
level, conversation, and a short copyable prompt naming the file the next
conversation must read.

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Codex. **Reasoning level:** High — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Round 1, not a new one.

```text
Round 2 retest of routing Phase 84 of Life Command OS, after your Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full — your Round 1 report and the
builder's repair record below it — and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Repaired product checkpoint: 94e1716. Your **Phase:** field is 84. Do not
create any PHASE_85_* file.

Round 2 carries one additional owner-directed requirement: a manual
COLD-STORE OWNER-USE CHECK from a genuinely fresh browser store, without ever
opening the QA laboratory. docs/NEXT_PROMPT.md states it in full, including
CASE A ("More money" into the second agenda) and CASE B (the caregiving
blocker). It is owner-use evidence inside Round 2, not a new gate, and it
changes none of QA-84-001..006.

Write Round 2 into docs/qa/PHASE_84_QA_HANDOFF.md, below the repair record. Do
not change product code, and reproduce the builder's claims rather than
accepting them.

Do not ask me to paste file contents.
```
