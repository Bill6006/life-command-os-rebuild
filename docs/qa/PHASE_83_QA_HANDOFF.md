# Phase 83 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 83 — the instrument, and the things that are untrue

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 83 builder, and not any Phase 82
conversation.
**Model:** Codex.
**Reasoning level:** **High** — never Max, which is Claude's level and stops the
orchestrator when it appears in a Codex block.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

---

## Build submitted

| Fact                     | Value                                                        |
| ------------------------ | ------------------------------------------------------------ |
| Product checkpoint       | `582f648` — the commit the gate was run on (D-147)           |
| Documentation head       | `51ef425`, plus the commit that records the deployed gate    |
| Preview                  | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Owner-visible behaviour  | **changed** — Now, Timeline, the Private page, two domain-page controls |
| Owner phone check        | required before GREEN                                        |
| QA report path           | this file                                                    |

Confirm the deployed SHA against the checkpoint before testing. `node
scripts/checkpoint-equivalence.mjs 582f648 --deployed
https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
reports post-checkpoint changes and whether any is bundle-relevant; D-097 asks
for equivalence rather than literal SHA equality.

**The builder's own run of it, for you to repeat rather than to trust:** the
Preview was live at `51ef425` and the checker found seven post-checkpoint files
— five documents, this file, and `scripts/android-gate.mjs` — none of them
bundle-relevant. Read the deployed SHA live; a further documentation commit
moves it again and that is not a reason to refuse to test.

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** The
paths below are for step 2 onward. `README.md` is explicit about why: a reviewer
who reads the decision log before opening Now already knows what the walk card
is *supposed* to mean.

1. `docs/PRODUCT_ADJUDICATION.md` section 8 — the phase and its acceptance gate
2. `docs/DECISION_LOG.md` **D-159, D-160, D-161, D-153, D-167, D-174, D-175,
   D-176**
3. `docs/CANONICAL_REBUILD_PLAN.md` sections **11**, **26**, **37**, **43A**
4. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` — findings **F30, F33, F38, F39,
   F40, F41, F43** and evidence entries **E02, E13, E17, E19, E22, E31, E32,
   E34, E36**. This file is not edited by anyone.
5. `docs/PHASE_STATUS.md` — the routing 83 section
6. `docs/DEFECT_LEDGER.md` — **DEF-0105 … DEF-0109**

---

## The acceptance criteria this phase is judged against

From `PRODUCT_ADJUDICATION.md` section 8, unchanged:

1. **A completion of the same move on any earlier day cannot settle today's
   recommendation or disable its controls** — to be proved on the three-day
   fixture and by faithfully reintroducing the defect.
2. **No owner-visible sentence asserts a quantity of history the app did not
   count** — to be proved by rendering the copy catalogue at every history size,
   including four records, rather than only the sizes the library reaches.
3. **The Private page's promise and Timeline's behaviour agree** — proved from
   both ends.
4. **Every owner-facing input has an accessible name**, swept.
5. **The ordinary-use journey from a near-empty store completes end to end**, and
   the points where it cannot proceed are enumerated with reasons in the phase
   record.

Plus the standing gates: `npm run verify` from a clean checkout, browser at
three widths, the Android-style gate on the deployed build, the privacy scan,
the block sweep, and the standing copy guards — **no percentage, rank, grade or
score about the child, and no score about the owner** (D-162, and Phase 81's
guard must still bite).

---

## What changed, stated as changes rather than as claims about them

Four surfaces and one engine path. Nothing about what any of it means is
asserted here; that is what step 3 of the protocol is for.

| Where                                                       | What changed                                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/intelligence/engine.ts` — `stateOfChosen`              | Resolves the chosen move's state through `openEpisode(episodes, target, situation.dayId)` instead of matching `(verb, object.id)` across `situation.recentMoves`. |
| `src/intelligence/engine.ts` — `nothing-proposed` copy      | _"There is plenty of history here…"_ → _"There is history here…"_.                                               |
| `src/features/timeline/timelineEntries.ts`                  | New `TIMELINE_LEDE` and `describeExtent(data)`; the screen renders both.                                          |
| `src/features/timeline/TimelineScreen.tsx`                  | Lede and end-of-list sentence now come from those two.                                                            |
| `src/domain/privacy.ts`                                     | New `PRIVATE_PAGE_PROMISE`.                                                                                       |
| `src/features/life/domainPages.ts`                          | The Private page's lede is that constant.                                                                         |
| `src/features/life/DomainPage.tsx` + `.css`                 | Two free-text inputs gain a `<label htmlFor>` and a `.domain-correction__note`; the placeholder is gone.          |
| `src/synthetic/journeys.ts` (new), `scenarios.ts`           | Three histories added to the shipped library: **The first evening**, **Four things, over three days**, **Three days since that walk**. |

Nothing else in `src/` changed. No scoring weight, dimension or threshold moved.

---

## The histories this phase added, and where they are

All three are in the QA laboratory, listed first:

| Title                          | Holds                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| **The first evening**          | one record — a single guide answer, and nothing else            |
| **Four things, over three days** | four answers, none withdrawn                                  |
| **Three days since that walk** | a walk completed on 22 May, read on 25 May, today's answers given |

`One answer, and a lot of silence` — four records, one dated the following day —
is unchanged and is the other four-record case.

---

## Verification the builder ran

Facts, not conclusions. Re-running a green suite to watch it go green again
buys nothing (`README.md`, step 2); these are here so a discrepancy between them
and what QA observes is itself a trigger.

| Gate                                            | Result                                              |
| ----------------------------------------------- | ---------------------------------------------------- |
| `npm run verify`, clean checkout                | PASS                                                 |
| Unit / contract / synthetic / adversarial       | **1,753 passed** in 80 files (1,675 in 76 before)    |
| Browser, 360 / 430 / 1,280, one worker          | **582 passed**, 194 per width (552 before)           |
| Privacy scan                                    | clean, 270 tracked files                             |
| Android-style gate, deployed                    | **clean — 183 checks** against `51ef425` (119 before) |
| CI on the documentation head                    | Verify **success**, Deploy preview **success**        |

**One browser test flaked once**, in an earlier full-suite run, with
`net::ERR_ABORTED; maybe frame was detached?` on `page.goto` — the navigation
flake `playwright.config.ts` documents for this platform. The run behind the
count above is clean at 582 / 582, and the test passed in isolation as well.
Recorded rather than smoothed over.

---

## Explicit deferrals — unchanged, and not this phase's to close

Confirm these are still absent rather than treating them as gaps:

- **No destination, milestone or baseline object.** Routing 84, package 1.
- **No new domain.** _Love / Dating / Romantic Life_ is approved (D-168) and is
  routing 84's.
- **No consent model.** D-167's permission is one owner control, default off,
  routing 84's package 6. This phase's private-page change is a truthfulness
  repair and is not that permission.
- **No new questioning surface.** D-163's second question budget is routing 84's.
- **No scoring change of any kind** (D-137, D-138).
- **No live model** (D-172, keeping D-024/D-025 standing).
- **Everything in audit section 10's DO-NOT-CHANGE list**, and
  `PRODUCT_ADJUDICATION.md` section 11's additions.

---

## Where the builder expects QA to look hardest

Named as areas of exposure, not as answers.

- **The three-day repair's blast radius.** `stateOfChosen` is one of two places
  that read `situation.recentMoves` for a state. The other is `continuing()`.
  Whether anything else in the app resolves "where does this stand" through a
  different route is worth deciding independently.
- **Whether the window really is unchanged.** `recent-duplication` and the
  ignoring-is-a-response rule in `evaluate.ts` both need to see beyond today. A
  repair that quietly narrowed the window would pass a test written to check the
  match.
- **Whether the reworded sentences are true at sizes nobody rendered.** The copy
  catalogue now varies history size as well as block. Whether those are the
  right two axes is a judgement.
- **The private promise, read as a person rather than as a string.** It is longer
  than the sentence it replaced. Whether it is the sentence the owner needs, on a
  phone, at that width, is a reading rather than an assertion.
- **The two labelled inputs on a real handset.** Focus order, touch target, and
  whether the note reads as help or as clutter.
- **The enumerated brief in `PHASE_STATUS.md`.** It is a deliverable and it is
  routing 84's scope. Whether it is complete — whether an ordinary journey stops
  anywhere it does not name — is the most valuable thing QA can disagree with.

---

## What QA is asked to produce

Per `README.md` sections 3 and 3a, in the same response as the report:

- PASS or FAIL overall, and per acceptance item;
- the QA-tested product SHA and the deployed SHA;
- the Android/mobile configuration used;
- exact reproductions for any defect, with semantic, behavioural and mobile/UI
  defects separated, and blocking distinguished from non-blocking;
- **which existing automated tests gave false confidence**;
- confirmation that the deferrals above are unchanged;
- the complete next handoff written into this file — on FAIL addressed to the
  **CURRENT Claude builder conversation** for routing 83, on PASS addressed to
  the same conversation for the GREEN closeout;
- the four closing lines and a short launcher (D-092, D-083).

**Levels for the two blocks a QA report carries.** The repair block is Claude's
and takes **Max** — the standing audit-campaign rule in `README.md`. The retest
block is Codex's and takes **High**; Codex has no Max level and a retest handoff
asking for one stops the orchestrator with the level unset. Do not copy one into
the other.

**The `**Phase:**` field stays `83`** for every round of this phase — never a
decimal, never a canonical phase number. Plan section 43A and D-159 are why.

---

## Round 1 — independent QA, first submission

**Phase:** 83 — the instrument, and the things that are untrue

**Actor:** Codex / independent QA (D-077, D-090).

**Overall result:** **FAIL.** Acceptance items 1, 3 and 4 pass. Acceptance
items 2 and 5 fail. The standing aggregate verification gate also fails at the
current executable handoff head.

This is a product and instrument failure, not a deployment mismatch. The product
checkpoint `582f648` and deployed build
`ab6b47f592d1c2eaa844ba9f083e4f772dbfa5ad` are bundle-equivalent.

### Build identity and test configuration

| Fact | Value |
| --- | --- |
| QA-tested product checkpoint | `582f648` |
| Repository head at QA start | `76d9587` — documentation-only after the deployed head |
| Deployed Preview SHA read live | `ab6b47f592d1c2eaa844ba9f083e4f772dbfa5ad` |
| Relationship | `node --use-system-ca scripts/checkpoint-equivalence.mjs 582f648 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` reported seven post-checkpoint files, none bundle-relevant |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Android configuration | Playwright `Galaxy S24`; 360 × 780 CSS px; DPR 3; touch and `isMobile`; Android 14 / Chrome 126 user agent; deployed Preview |
| Desktop-width browser matrix | Playwright desktop Chromium at 360 × 740, 430 × 932 and 1,280 × 900; one worker |
| QA report commit | Not committed by QA in this round |

The first direct Node fetch failed because this workstation did not trust the
presented certificate chain. Re-running Node with `--use-system-ca` succeeded;
the browser itself loaded the same deployment normally. No TLS check was
disabled.

### Protocol record

The order in D-090 was kept:

1. The deployed Preview was opened at its ordinary Now before any repository
   document except the executable handoff was read. The cold screen claimed a
   kitchen reset was the best move; that recent attempts had made little
   difference; that it paid back more tomorrow; that Health was seven months
   out of date; and that the learned reset claim rested on several similar
   situations. Starting and completing it moved the app to recall practice.
2. Those claims were traced through See evidence, Timeline, Data/export and the
   QA laboratory before the governing specification and builder report were
   opened.
3. The whole Now, Timeline, Private and domain-correction surfaces were then read
   against their evidence, followed by the five acceptance items and the
   architecture only where the instrument itself failed.

### Acceptance result

| # | Result | Evidence |
| --- | --- | --- |
| 1. An earlier-day completion cannot settle today's occurrence | **PASS** | Deployed **Three days since that walk** showed a fresh walk, no false standing, and all five controls enabled. Starting it today changed the state to **Under way**. The older completion remained in the three-day evidence window. The focused reintroduction test passed. |
| 2. No owner sentence asserts a quantity it did not count | **FAIL** | The four-record no-action copy and Timeline extent repairs pass, but the same three-day fixture says **“The last few times made little difference”** while its open evidence says **“One occasion in the record”** and **“1 occasion.”** See QA-83-001. |
| 3. The Private promise agrees with Timeline | **PASS** | On **Two ordinary weeks**, Private says the words stay on that page and Timeline shows existence and time. Timeline showed **Private entry** and did not show **late scrolling again**. |
| 4. Every owner-facing input has an accessible name | **PASS** | The two repaired free-text controls have visible labels and persistent purpose notes. Source sweep, browser sweep and deployed Galaxy sweep all passed. No nameless control was found. |
| 5. The near-empty ordinary-use journey and its enumerated stops | **FAIL** | The executable path reaches a question, action, outcome, fact correction and changed recommendation, but the claimed exhaustive route instrument is not exhaustive, and one enumerated stop is false in the owner's words. See QA-83-003. |

### Blocking semantic defects

#### QA-83-001 — one occasion is called “the last few times”

**Severity:** Blocker. **Acceptance item:** 2. **Type:** semantic / owner-copy.

**Exact reproduction:**

1. Open the deployed Preview and load **Three days since that walk** from the QA
   laboratory.
2. Open Now.
3. Read the recommendation reason: _“Energy is good, and the evening suits a
   walk. **The last few times made little difference**, and nothing else here
   fits better.”_
4. Open **See evidence**.
5. Read _“**One occasion** in the record is like this evening — 22 May”_ and
   _“Too early to say · **1 occasion**.”_

The app counted one occasion and used a plural quantity. The source of the
contradiction is visible at `src/intelligence/explain.ts:345`, where the reason
hard-codes “last few times”; the learning summary beside it already has the
correct singular branch at `src/intelligence/learning.ts:558-564`.

This is the exact D-174 class the phase says it closed: a copy catalogue varied
history size but did not vary or assert agreement with the number of comparable
episodes used by a decision reason.

**Existing tests that gave false confidence:**

- `tests/synthetic/history-size-copy.test.ts` passed 8 / 8, including _“never
  lets a decision sentence assert an unmeasured quantity.”_ Its `UNMEASURED`
  list detects selected phrases such as “plenty of history”; it does not compare
  a sentence's quantifier with the count behind it.
- `tests/browser/phase83.spec.ts` passed at all three widths, but its item-2
  checks stop after the four-record no-action sentence and Timeline.
- `scripts/android-gate.mjs` passed all 183 checks but makes the same omission.

#### QA-83-002 — the named walk becomes “Move” at the point of learning and correction

**Severity:** Major, blocking for this submission. **Type:** semantic /
accessibility.

On the same acceptance fixture, Now correctly heads the action **“Move for 25
minutes: a walk.”** The learned statement immediately below it says **“Move has
made little difference in situations like tonight.”** The correction control's
accessible name is **“Not how it went — correct what move does for you.”** The
open evidence then recovers the missing subject in its detailed rate labels:
**“getting out for a walk.”**

The central claim and the control that changes it have lost the action identity
the screen already knows. A generic verb is not an adequate subject for what
the owner is being asked to correct, and it violates the standing specificity
and no-hidden-genericity rules.

**Existing tests that gave false confidence:**

- `occurrence-identity.test.ts` and `phase83.spec.ts` require the headline to
  contain “a walk” but never read the learned statement or correction name.
- `decision-evidence.test.ts` proves that Now and the evidence panel repeat the
  same belief. Both repeat the same generic belief, so equality does not prove
  specificity.

### Blocking architecture / instrument defect

#### QA-83-003 — the ordinary-use instrument is not an exhaustive map of ordinary use

**Severity:** Blocker. **Acceptance item:** 5. **Type:** architecture / test
harness / phase-record semantics.

There are three independently reproducible parts.

1. `tests/synthetic/journey.ts:131` claims `OWNER_ROUTES` is **every**
   owner-facing control that appends to the record. It omits at least:
   - **Stop this / Pick this up again** in `src/features/life/Threads.tsx:43-67`,
     which calls `memory.append([setThreadStateRecord(...)])`;
   - **That is not right** in
     `src/features/insights/InsightsScreen.tsx:54-83`, which calls
     `memory.append([beliefCorrectionRecord(...)])`.
2. The green _“keeps the route table honest”_ test at
   `ordinary-use-journey.test.ts:357` checks only that ids are unique, `writes`
   is non-empty and the builder string contains a dot. It never compares the
   table with the owner-facing source. `ROUTE_BUILDERS` keeps imported symbols
   compilable but does not prove that every source handler is in the table.
3. The enumerated object-creation stop says the owner cannot _“name a goal, a
   topic he is studying, a person, a place or a skill”_. On **The first
   evening**, ordinary navigation to **Life → Career & Learning → Current
   learning topic → Add this** opens a labelled textbox and explicitly says the
   answer becomes what the app reads from now on. An owner can name the topic as
   a fact. What the app cannot create is a semantic learning-topic entity that
   goals and study threads can refer to. Those are different claims. The brief
   also fails to enumerate routing 84 package 3's complete object list: goal,
   routine, person, place, skill and obligation.

The file visibly contains a second self-contradiction: the test named _“gets
past the four steps ... and stops at the four”_ has a `PROCEEDS` map with three
`true` and five `false` values. The phase record correctly says three of eight;
the green test title does not.

The omitted controls do not by themselves make the already named stops pass.
They do show that the instrument cannot support its completeness claim, which
is the acceptance item. Because the list is routing 84's brief, an incomplete
or semantically conflated list is material even where the underlying product
gap is deliberately deferred.

**Existing tests that gave false confidence:** all 7 tests in
`ordinary-use-journey.test.ts` passed; the full 1,753-test suite passed; and the
582-case browser suite passed. None can fail when an owner record-writing
handler is absent from `OWNER_ROUTES`.

### Blocking standing-gate defect

#### QA-83-004 — the aggregate clean-tree command stops at the executable handoff

**Severity:** Blocker for closeout. **Type:** verification / documentation.

At clean repository head `76d9587`, `npm run verify` exits 1 during its first
stage:

```text
> prettier --check .
[warn] docs/NEXT_PROMPT.md
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```

The remaining layers were run separately and all passed, but the standing gate
is the aggregate command and that command is not green. This is not a product
bundle defect; it is still a required gate failure at the handoff the
orchestrator executed.

### Behavioural and mobile/UI defects

No separate behavioural-state or mobile/UI defect was found. Occurrence state,
private withholding, labels, focusable controls, 44px targets, bottom-nav
clearance and horizontal overflow behaved correctly in the targeted flows.

The first click on one Life-domain link did not navigate in the cold browser
session; the same route worked on the next independently established path and
through the complete browser matrix. In accordance with F41's own rule, no
defect is assigned to a transient observation that did not reproduce.

### Verification record

| Gate | QA result |
| --- | --- |
| Focused Phase 83 / architecture tests | **139 / 139 passed across 7 files**, including the tests that gave false confidence |
| Unit / contract / synthetic / adversarial | **1,753 / 1,753 passed across 80 files** |
| Lint, typecheck, build | **PASS** when run separately after the aggregate format stop |
| Aggregate `npm run verify` | **FAIL** — `docs/NEXT_PROMPT.md` is not Prettier-clean |
| Browser matrix | **582 / 582 passed** — 194 at each of 360, 430 and 1,280px |
| Android-style deployed gate | **clean — 183 checks** against `ab6b47f`, Galaxy S24 configuration above |
| Privacy scan | **clean — 271 tracked files** at repository head `76d9587` |
| Checkpoint equivalence | **PASS** — deployed `ab6b47f` is bundle-equivalent to product checkpoint `582f648` |

The full suite was duplicated because D-090's trigger was concrete: a builder
claim did not match observed behaviour, two green purpose-written tests were
suspected false greens, and the phase introduced the test harness being
challenged. The result confirms the false confidence rather than clearing it.

### Deferrals and owner questions

All explicit deferrals remain unchanged and were not treated as defects: no
destination/milestone/baseline object; no Love / Dating / Romantic Life domain;
no private-consent model; no second questioning agenda; no scoring change; and
no live model. The do-not-change protections in product-adjudication section 11
remain in force.

Q1 (Adaya's age and normative references), Q4 (legacy evidence admissibility)
and Q6 (live model inference, reopened before routing 91 without treating the
finite concept vocabulary as a ceiling) remain open for the owner. QA does not
answer them.

---

## Complete next handoff — repair after Round 1 FAIL

**System:** Claude / builder.
**Model:** Claude.
**Intelligence level:** **Max** — this is audit-campaign repair work across
owner copy, action identity and the acceptance instrument.
**Conversation:** **CURRENT** — return to the original routing 83 Claude builder
conversation, which owns the phase and its repairs.

```text
Routing Phase 83 repair after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_83_QA_HANDOFF.md in full. Round 1 is the independent QA
report and is authoritative for this repair. Keep the Phase field exactly 83.

Keep routing 83 YELLOW. Do not start routing 84 and do not mark the phase GREEN.
Repair QA-83-001 through QA-83-004 under canonical plan section 42: reproduce
each defect, identify the whole class, write a regression, prove the regression
fails when the defect is faithfully reintroduced, fix the root cause, and run
the full gate on the final tracked checkpoint.

Required outcomes:

1. No decision reason uses a plural or other quantity word that disagrees with
   the comparable occasions behind it. Start with “The last few times” over one
   occasion on “Three days since that walk,” then sweep the whole owner-visible
   class rather than adding that phrase to a blacklist.
2. The learned statement and its correction control retain the named action
   identity. On the same fixture they must say walk/getting out for a walk, not
   the generic subject “Move,” and the class guard must cover other engine-named
   routines from a near-empty store.
3. Make the ordinary-use instrument's exhaustiveness claim real. Enumerate every
   owner-facing record-writing handler, including Life thread state controls and
   Insights belief correction, and add a guard that can fail when a source
   handler is omitted. Correct the three-versus-five test title/count. Rewrite
   the object-creation stop so it distinguishes entering a current-topic fact
   from creating the semantic entity later features require, and ensure the
   phase record enumerates the full routing 84 authoring brief — goal, routine,
   person, place, skill and obligation — plus any other genuine stop the repaired
   exhaustive instrument finds. Do not implement routing 84 capabilities.
4. Restore the aggregate clean-tree `npm run verify` gate, including formatting
   docs/NEXT_PROMPT.md. Preserve the owner's dispatch constraint and the terminal
   completion comment already present there. Do not copy that comment into this
   QA report or a different handoff file.

Preserve every Round 1 PASS: occurrence identity and the unchanged three-day
window; Timeline scope copy; the Private promise and withholding policy; all
accessible names and purpose notes; the five lifecycle controls; every standing
copy/scoring guard; and every explicit deferral.

Run the full clean-checkout gate, browser suite at 360/430/1280, privacy scan,
block and copy sweeps, and the deployed Galaxy-class Android gate. Deploy the
repaired checkpoint, prove checkpoint equivalence if documentation moves the
deployed SHA, and update this same QA report with the builder's repair record and
a complete retest prompt addressed to the SAME Codex QA conversation at High.
Do not ask the owner to paste file contents.
```

### Short launcher

**Model:** Claude. **Level:** Max. **Conversation:** CURRENT — the original
routing 83 builder conversation.

```text
Routing Phase 83 repair after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_83_QA_HANDOFF.md in full and execute the complete repair
handoff there exactly as written. Keep Phase 83 YELLOW; do not start routing 84.
Do not ask me to paste the file contents.
```
