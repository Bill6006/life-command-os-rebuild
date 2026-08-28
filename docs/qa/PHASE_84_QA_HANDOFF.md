# Phase 84 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 84 — what the owner is trying to become

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 84 builder, and not any routing 83
conversation.
**Model:** Codex.
**Reasoning level:** **High** — never Max, which is Claude's level and stops the
orchestrator when it appears in a Codex block.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

---

## Build submitted

| Fact                    | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| Product checkpoint      | `42667ea` — the commit the aggregate gate was run on (D-147, D-180)    |
| Documentation head      | this file, and the routing 84 record in `PHASE_STATUS.md`              |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/            |
| Owner-visible behaviour | **changed** — Now, Insights, and every domain page                         |
| Owner phone check       | required before GREEN                                                  |
| QA report path          | this file                                                              |

Confirm the deployed SHA against the checkpoint before testing. `node
scripts/checkpoint-equivalence.mjs 42667ea --deployed
https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
reports post-checkpoint changes and whether any is bundle-relevant; D-097 asks
for equivalence rather than literal SHA equality, and the same script now also
reports commits on `HEAD` that no remote branch contains (D-180).

**The builder's own run of it, for you to repeat rather than to trust:** the
Preview was live at `42667ea` — the checkpoint itself, with no files between
them — and the checker reported bundle equivalence. A documentation commit after
this one moves the head again and that is not a reason to refuse to test; read
the deployed SHA live.

**Two things worth knowing before you run it**, both about how this checkpoint
got here.

**D-180's failure mode happened twice in this phase, and both are recorded
here rather than tidied away.** `npm run verify` runs `prettier --check` over
the whole tree, so editing a file after running it leaves the head red on a
check that takes a second. It happened once on product commits and once on
documentation, and CI found both in under a minute — which is the rule working,
and is also the rule being learned twice.

**`b76ce91` was pushed with two files unformatted** — the decision log and the
new browser spec — because `npm run verify` was run and then those two files
were edited. CI found it in under a minute. That is D-180's own failure mode
occurring one phase after the rule was written, and it is recorded here rather
than tidied away; `994284a` is the repair.

**Two commits after that repair things nothing reported.** `e78d70b` closes
DEF-0117 and DEF-0118, both found by the builder reading its own code back:
one would have shown the owner his own aspiration twice on one page, the other
wrote a Wednesday into the record out of a question that never mentioned a day.
`42667ea` narrows the destination control to the three proving domains — it was
on every domain page, which is not wrong code and is wrong scope, because a goal
in Fatherhood stops `goal-fit` abstaining there and Fatherhood is the one area
this phase was told not to touch.

`39d147e` closes DEF-0119 — a question about a finished course that nothing
could ever be asked, because it keyed on a thread state nothing writes.

`42667ea` closes DEF-0120, DEF-0121 and DEF-0122, all three found by the browser
suite and by CI on a checkpoint that had already been pushed: the blocker
question nested under the wrong branch, a button whose name contained the name
of the button beside it, and Life going back to being a wall. Every one of them
was invisible to 1,812 synthetic assertions, which is the argument for having a
browser suite stated as a fact rather than as a principle.

So the product checkpoint is the sixth commit rather than the first, and the
five after the first are worth reading as a set: not one was found by a test
that already existed and passed, and every one is the class this phase exists to
answer.

**`42667ea`'s own CI run failed**, on `prettier --check` over
`docs/DEFECT_LEDGER.md` and `docs/PHASE_STATUS.md` — documentation written after
the aggregate gate was run, the second time in this phase. The documentation
head repairs it, changes no product code, and the aggregate gate is green there;
`checkpoint-equivalence.mjs` is what proves the bundle is the same, and it is
worth running rather than believing.

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** The
paths below are for step 2 onward. `README.md` is explicit about why: a reviewer
who reads the decision log before opening Now already knows what a destination
panel is *supposed* to mean, and this phase's whole subject is whether the
screen means anything to somebody who does not.

1. `docs/PRODUCT_ADJUDICATION.md` section 8 — the phase and its seven-item gate;
   section 11 is the do-not-change list
2. `docs/DECISION_LOG.md` **D-161 … D-169, D-173**, then **D-177 … D-186**
3. `docs/CANONICAL_REBUILD_PLAN.md` sections **11**, **21**, **22**, **43A**,
   **54**, **62**
4. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` — findings **F01, F02, F04, F05,
   F07, F10, F11, F13, F19, F26, F30, F32, F35, F36** and evidence entries
   **E04–E13, E16–E19, E22, E24, E28, E30, E32–E36**. This file is not edited
   by anyone.
5. `docs/PHASE_STATUS.md` — the routing 84 section, and the routing 83 section
   above it whose enumerated brief is this phase's scope
6. `docs/DEFECT_LEDGER.md` — **DEF-0115 … DEF-0122**, eight of them, and none
   reported by anything outside the build. Two are guards that read source and
   could not see correct code (D-183). Two are the app saying something the
   owner did not. One is a question nothing could ever reach. Three came from
   the browser suite and CI on a checkpoint that had already been pushed, and
   were invisible to 1,812 synthetic assertions.

---

## The acceptance criteria this phase is judged against

From `PRODUCT_ADJUDICATION.md` section 8, unchanged, and governed by **D-173**:
acceptance is the owner's own journey sentence, not a set of fields.

> "I start with a vague desire I have not fully planned myself → the app helps
> make the desired direction concrete → it establishes enough baseline and
> unknowns → it identifies a meaningful next milestone → it connects a strategy
> to that milestone → daily actions can serve that strategy → completion is
> distinguished from actual progress → the system can acquire additional useful
> information **without requiring me to already understand myself**."

1. From the **near-empty** store built in 83.0, the owner can name a desired
   outcome in each of the three proving domains, and the app's next
   recommendation visibly changes because of it.
2. A completed session, a completed course and a milestone are **three
   different things on screen**, and no surface claims capability from
   attendance.
3. Every object the rich fixtures contain — **goal, routine, person, place,
   skill, obligation** — is reachable through ordinary use, proved by building
   one of each from empty.
4. The discovery agenda asks a question that would **not** change today's
   recommendation, and can be shown to have changed a later one; and question
   volume falls as answers accumulate, measured across the library.
5. "Can't right now" produces a durable, correctable statement about **what was
   in the way** on at least one path, and asks nothing when the constraint is
   already known — with the no-question path proved as carefully as the question
   path.
6. Each correction gesture states its consequence before it acts, and a private
   reading can be stored without being reasoned from.
7. **The standing guards still bite** — no score about the owner, no percentage,
   rank, grade or score about Adaya, no wellness composite, no Life Score.

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed
build, the privacy scan, the block sweep, and the copy guards.

---

## What changed, stated as changes rather than as claims about them

Nothing about what any of it *means* is asserted here; that is what step 3 of
the protocol is for.

### The record schema

| Where                    | What changed                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain/records.ts`  | Three new kinds — `destination`, `permission`, `discovery-response`. `GoalRecord` gains `milestoneOf?`. `ActionCompletionRecord` gains `extent?`. `OUTCOME_ASPECTS` gains `retained` and `transfer`. |
| `src/domain/entities.ts` | One new entity kind, `destination`.                                                                                                    |
| `src/domain/wire.ts`     | Read and write for all of the above.                                                                                                   |
| `src/domain/knowledge.ts` | `UnknownReason` gains `withheld`, with its sentence.                                                                                  |
| `src/domain/privacy.ts`  | `PERMISSIONS`, `PermissionState`, `mayReasonFrom`.                                                                                     |
| `src/domain/progress.ts` | New. Six evidence rungs, their sentences, and what each is not evidence of.                                                            |

### The intelligence layer

| Where                                | What changed                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `src/intelligence/destinations.ts`   | New. Resolves destinations and their milestones; describes them.                                                    |
| `src/intelligence/authoring.ts`      | New. The six authorable kinds, the interpretation the owner confirms, the builders, and the destination builder.     |
| `src/intelligence/progress.ts`       | New. Reads the six rungs out of history; asks a finished course what is left of it.                                 |
| `src/intelligence/blockers.ts`       | New. Whether to ask what was in the way, and why either way; the seven causes; the durable half.                     |
| `src/intelligence/discovery.ts`      | New. The second agenda, its budget, its memory, and what an answer changed.                                          |
| `src/intelligence/direction.ts`      | `ActiveGoal` gains `status` and `milestoneOf`; `allGoals` split out; `DirectionState` gains `destinations`.          |
| `src/intelligence/lifecycle.ts`      | `part-done` state and action; `resumableToday` / `nextResumable`.                                                    |
| `src/intelligence/arbitrate.ts`      | `NoActionReason` gains `enough-done-today`.                                                                          |
| `src/intelligence/engine.ts`         | Its copy, and `finishedForToday` — a re-labelling computed after the arbiter, changing no decision.                  |
| `src/intelligence/situation.ts`      | `resolvePermissions`; the fact reader takes them and withholds a private concept while the permission is off.        |
| `src/intelligence/corrections.ts`    | The four-gesture consequence table, `withdrawEventRecord`, `redateEventRecord`, `permissionRecord`; `goalCorrectionRecord` carries `milestoneOf` forward. |

**No scoring weight, dimension or threshold moved.** `evaluate.ts` and
`arbitrate.ts`'s ranking are untouched apart from the new no-action reason's
name.

### The surfaces

| Where                                     | What changed                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/features/life/DomainPanels.tsx`      | New. Destination, progress, authoring, people, blockers, corrections, permission, and the blocker question.   |
| `src/features/life/DomainPage.tsx`        | Renders them, and owns every handler that builds a record.                                                    |
| `src/features/insights/Discovery.tsx`     | New. The second agenda, on Insights.                                                                          |
| `src/features/insights/InsightsScreen.tsx` | Renders it above what the app has worked out.                                                                |
| `src/features/life/domainPages.ts`        | `DomainPageData` gains destinations, progress, blockers and correctable events.                               |
| `src/features/now/NowScreen.tsx`          | The blocker question, the resume panel, and the sixth lifecycle button.                                       |
| `src/features/memory/MemoryProvider.tsx`  | `create(authored)` — the one write path that brings an entity into being (D-182).                             |
| `src/features/history/describe.ts`        | Tags and sentences for the three new record kinds and the two new outcome aspects.                            |

---

## Where the builder expects QA to look hardest

Named as areas of exposure, not as answers.

1. **A number about him, anywhere.** This is a phase about progress and D-162
   names it as the single largest risk in package 1. The sweeps hold destination
   readings and progress sentences; what they cannot hold is a sentence composed
   somewhere the sweep does not know about. Read the whole domain page.
2. **The destination panel on a rich history.** Every automated proof of package
   1 runs on the near-empty store, because that is what D-161 requires. What a
   destination looks like beside twelve weeks of evidence, a growth ladder and a
   running course is the case the builder is least sure of.
3. **Whether the second agenda is a form.** Two a week is the budget, and it is
   closed until tapped — one line and a link, then a labelled box with a Save
   and a Not now. It was on Life and moved to Insights when the height budget
   said Life had no room (DEF-0122). F04's complaint is about exactly the shape
   this could still be, on a screen with no measured ceiling.
4. **The sixth button.** `Only part of it` joined a row of five that D-052
   requires to be always drawn. Its first label contained the word **Done** and
   broke twenty-six assertions (DEF-0121). Check the row does not wrap into a
   double-tap hazard at 360px, and that no target moves under a thumb.
5. **The blocker question's silence.** It is asked after `Can't right now` on an
   effortful move and not after a restorative one. The builder believes the
   silent branch is right; a person may find it reads as the app losing
   interest.
6. **Whether "That is enough for today" ever appears when it should not.** It is
   a re-label of one branch (D-185) and it fires on a completed move plus
   nothing left. A man who did one small thing and was then told he had done
   enough would be the failure.
7. **The correction list.** It shows the six most recent correctable entries per
   page. Whether that reads as a repair surface or as a database viewer is the
   question F04 and section 59 both ask.

---

## Verification the builder ran

Facts, not conclusions. Re-running a green suite to watch it go green again buys
nothing (`README.md`, step 2); these are here so that a discrepancy between them
and what QA observes is itself a trigger.

| Gate                                      | Result                                                    |
| ----------------------------------------- | ---------------------------------------------------------- |
| `npm run verify`, clean checkout          | **PASS** on `42667ea`                                      |
| Unit / contract / synthetic / adversarial | **1,812 passed** in 83 files (1,765 in 82 before)          |
| Browser, 360 / 430 / 1,280, one worker    | **648 passed**, 216 per width (582 before)                                           |
| Privacy scan                              | **clean, 284 tracked files**                               |
| Block sweep and copy guards               | **PASS** — 72 cases across five files, unchanged           |
| Android-style gate, deployed              | **clean — 187 checks** against `42667ea`                   |
| CI at the checkpoint                      | Verify **success**, Deploy preview **success**             |
| Checkpoint equivalence                    | **PASS** — the deployed build **is** `42667ea`             |
| Commits not on any remote                 | **none** at the handed-off head                            |

---

## Explicit deferrals — unchanged, and not this phase's to close

Confirm these are still absent rather than treating them as gaps:

- **No strategy evaluation** (F03). A thread has no review status and no verdict.
  The precondition it was waiting on — a destination — now exists; the verdict is
  later Validity's.
- **No pattern-discovery engine** (F15/F17/F18).
- **No domain progression models** beyond Career, Health and Money. Fatherhood is
  deliberately outside the proving scope and the growth model is untouched.
- **No owner routines library** (AUD-0045). A routine can be introduced and is
  never suggested; the instrument asserts both halves.
- **No backfill of a historical event** (D-165, AUD-0050). Withdraw and re-date
  exist; authoring an entry that was never recorded does not.
- **No twelfth domain page.** _Love / Dating / Romantic Life_ is approved
  (D-168) and adding a page is navigation, which is canonical Phase 9's gate.
- **No scoring change of any kind** (D-137, D-138).
- **No new visual language.** Everything this phase put on screen is plain on
  purpose; plan section 54 lists what canonical Phase 9 inherits.
- **No live model** (D-172, keeping D-024/D-025 standing).
- **Everything in audit section 10's DO-NOT-CHANGE list**, and
  `PRODUCT_ADJUDICATION.md` section 11's additions.

---

## The histories to test on

Unchanged from routing 83 — this phase added none, and that is deliberate: a
phase whose subject is what an ordinary owner can reach should not ship itself a
fixture that already contains the thing.

| Title                            | Holds                                                             |
| -------------------------------- | ----------------------------------------------------------------- |
| **The first evening**            | one record — a single guide answer. Everything in this phase's gate is proved from here. |
| **Four things, over three days** | four answers, none withdrawn                                      |
| **Three days since that walk**   | a walk completed on 22 May, read on 25 May                        |

The eighteen richer scenarios are unchanged and are where a destination has
never been seen beside real evidence.

---

## Which automated tests would have given false confidence

Stated by the builder, because QA is asked for it and because naming it first is
cheaper than discovering it in round 2.

- **Everything about package 1 runs on one history.** `the-first-evening` is the
  store D-161 requires and it is also the only store any destination has ever
  been created in. The library sweep in item 7 walks all twenty-one, and finds
  no destination in twenty of them, so it is a guard that has never had anything
  to guard.
- **The progress sweeps hold generated sentences, not rendered screens.**
  `progressSentence` is the only door a progress sentence can come through, and
  that is asserted; a sentence composed in JSX beside it would be invisible to
  the sweep.
- **`enough-done-today` has no library case.** It is proved by construction
  rather than by a history that reaches it, because no shipped history does.

---

## The handoff

**Model:** Codex.
**Reasoning level:** High.
**Conversation:** NEW — not the routing 84 builder.

```text
Independent QA of routing Phase 84 of Life Command OS.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Product checkpoint: 42667ea. Confirm the deployed build against it first.

Write your findings into docs/qa/PHASE_84_QA_HANDOFF.md from Round 1 on. The
builder does not edit your rounds and you do not change product code.

Do not ask me to paste file contents.
```

---

## Round 1 — independent QA, first submission

**Phase:** 84 — what the owner is trying to become

**Actor:** Codex / independent QA (D-077, D-090).

**Overall result:** **FAIL.** Acceptance items 3, 5, 6 and 7 pass. Acceptance
items 1, 2 and 4 fail. Five material owner-visible defects are open, four of
them directly inside the phase gate. The phase stays **YELLOW**.

This is not a deployment mismatch. The deployed documentation head
`3dbfc9b02ed5d41b810a494817f485021f4546ac` is bundle-equivalent to product
checkpoint `42667ea`.

### Build identity and test configuration

| Fact | Value |
| --- | --- |
| QA-tested product checkpoint | `42667ea` |
| Repository head at QA start | `3dbfc9b` — documentation-only after the product checkpoint |
| Deployed Preview SHA read live | `3dbfc9b02ed5d41b810a494817f485021f4546ac` |
| Relationship | `node --use-system-ca scripts/checkpoint-equivalence.mjs 42667ea --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` reported four post-checkpoint files, none bundle-relevant |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Android configuration | Playwright Galaxy S24-class context; 360 × 780 CSS px; DPR 3; touch and `isMobile`; Android 14 / Chrome 126 user agent; deployed Preview |
| Focused browser matrix | Desktop Chromium at 360 × 740, 430 × 932 and 1,280 × 900; one worker |
| QA report commit | Not committed by QA in this round |

### Protocol record

The order in D-090 was kept.

1. The deployed Preview was opened on ordinary Now before any repository
   document except this executable handoff was read. **The first evening** was
   then used from its one-record store through Career destination authoring,
   Now, partial completion, interruption, blocker capture, Life and Insights.
2. The cold screen appeared to claim that a named next step immediately became
   current work; partial work remained resumable; blocker causes were retained;
   sessions, courses and milestones were distinct; and the second agenda learned
   something for later without affecting today.
3. Those claims were traced through the deployed domain pages, QA laboratory,
   Timeline/correction copy and complete ordinary controls before the governing
   decisions and implementation were read.
4. The acceptance paths were then repeated with counterfactual resets, a
   naturally completed three-session course, a standing blocker, private storage
   with permission off, and the actual discovery-question sequence.

No screenshot artifact was added: every failure is a stable text/state
contradiction reproduced on the deployed build and tied below to its source and
false-green test. The browser DOM transcripts and exact owner steps are the QA
evidence.

### Acceptance result

| # | Result | Evidence |
| --- | --- | --- |
| 1. A destination changes the next recommendation in Career, Health and Money | **FAIL** | Career and Money change Now from the near-empty store. Health does not: identical guide answers produce the identical walk before and after a Health destination. See QA-84-001. |
| 2. A completed session, completed course and milestone are distinct; attendance is not capability | **FAIL** | Partial work is called a completed session, and a naturally completed course never appears as a course. Milestones remain owner-set and distinct. See QA-84-002 and QA-84-003. |
| 3. Goal, routine, person, place, skill and obligation are ordinarily authorable | **PASS** | All six controls are present from the near-empty domain page, preview an interpretation and unknowns, and the focused synthetic path builds each from empty. A separate false destination confirmation is QA-84-005. |
| 4. The second agenda asks for later-useful information and grows quieter | **FAIL** | Skip/budget/volume behavior passes, but the only longitudinal commitment question asks for a regular weekly chunk and records one calendar date. Its claimed later-change test bypasses the agenda and never checks a later decision. See QA-84-004. |
| 5. “Can't right now” learns a blocker when useful and stays silent when known | **PASS** | On a walk, **Haven't got what I need** produced the durable domain statement _“a walk needs something I have not got”_ with **Not true any more**. The known and restorative silent branches are held by the source decision and focused tests. |
| 6. Correction consequences and private permission | **PASS** | Event correction states consequence and preservation before applying. A private reading increased the store from one to two records while permission remained off and the QA decision still considered the same nine non-private facts. |
| 7. Standing no-score guards | **PASS** | No score, percentage, rank, grade, progress bar, readiness number, wellness composite or Life Score appeared on the tested destination/progress/private paths; the guards and privacy scan remain green. |

### Blocking semantic and behavioural defects

#### QA-84-001 — a Health destination does not change the near-empty recommendation

**Severity:** Blocker. **Acceptance item:** 1. **Type:** product semantics.

**Exact counterfactual reproduction:**

1. Load **The first evening**, open Now and answer **Enough** (and **Nothing**
   when soreness is asked). The headline is _“Move for 25 minutes: a walk.”_
2. Reset **The first evening**.
3. Open Health & Recovery and set the destination _“Build sustainable
   strength”_ with next step _“Lift twice each week”_.
4. Return to Now and give the same answers.
5. The headline is still, byte for byte, _“Move for 25 minutes: a walk.”_

Career and Money each add a candidate the thin store did not have. Health
deliberately does not suggest the owner-authored routine, preserving the explicit
AUD-0045 deferral; that protection is correct. The acceptance proof nevertheless
requires the Health destination itself to visibly change the next recommendation
from the near-empty journey. It does so only in the synthetic test after that
test first adds an unrelated Career destination and makes Career win, then uses
Health to restore the walk (`destination-and-discovery.test.ts:146-164`). That
is not the standalone Health counterfactual claimed by the handoff.

**Existing tests that gave false confidence:**

- `destination-and-discovery.test.ts` calls its three cases separate, but the
  Health case depends on a Career destination created first.
- `phase84.spec.ts` tests the deployed recommendation change only for Career.
- All 57 focused Phase 84 browser cases pass because no browser case performs
  the Health-before/Health-after comparison.

#### QA-84-002 — “Only part of it” becomes “1 session done” and “Followed through”

**Severity:** Blocker. **Acceptance item:** 2. **Type:** semantic contradiction.

**Exact reproduction:**

1. Load **The first evening**, answer **Enough**, press **Start it**, then
   **Only part of it** on the walk.
2. Now correctly offers the move back as **Part done**.
3. Open Health & Recovery.
4. **What has actually happened** says _“Sessions done — 1 session done.”_
5. **Something here wrong?** and Recently call the same event _“Followed
   through — getting out for a walk.”_

One screen preserves the owner's distinction and the next erases it. The record
does carry `extent: 'partial'`; `readProgress` counts every
`action-completion` as the **Sessions done** rung without consulting `extent`
(`src/intelligence/progress.ts:39-43,125-132`), while history copy assigns every
action completion **Followed through** (`src/features/history/describe.ts:242,
397-415`). This is exactly the attendance/progress boundary package 2 exists to
make visible.

**Existing tests that gave false confidence:**

- The synthetic partial test proves only `part-done` state and that it can later
  complete; it never reads progress or history copy.
- The browser partial test proves only the button and **Part done** row.
- The progress sentence sweep checks counts and forbidden capability words, not
  whether the counted record was complete.

#### QA-84-003 — a course completed through ordinary controls never appears as a completed course

**Severity:** Blocker. **Acceptance item:** 2. **Type:** architecture / unreachable reader.

**Exact reproduction:**

1. Load **The first evening**, answer **Running on empty**, accept **Three
   recovery nights in a row**, and complete its three ordinary occasions on 6,
   8 and 10 May.
2. The third card correctly says _“Third of three. The last one.”_
3. After completing it, open Health & Recovery.
4. The page shows **3 sessions done** and no **Courses finished** section at all.

`ActiveThread.finished` correctly recognises a running thread with all expected
occasions. `readProgress`, however, walks raw thread records and accepts only
`record.state === 'done'` (`src/intelligence/progress.ts:157`). DEF-0119 already
establishes that no ordinary control writes that state. This is the same
unreachable-value class one reader away from the repaired course-reflection
reader.

**Existing tests that gave false confidence:**

- The test titled _“reads a completion as a session, a finished course as a
  course…”_ never starts or finishes a course. It asserts only that one completed
  session did not become a course (`destination-and-discovery.test.ts:285-300`).
- The course-reflection reachability test proves a later retained-capability
  question, not that the finished course itself renders.
- The Phase 84 browser item-2 block tests sessions and milestones only; there is
  no completed-course browser case.

#### QA-84-004 — the “regular chunk of your week” question stores one dated occurrence

**Severity:** Blocker. **Acceptance item:** 4. **Type:** longitudinal discovery / semantic capture.

**Exact reproduction:**

1. On **The first evening**, skip the three destination questions across the
   agenda's two-per-week budget until Insights asks _“Is there something that
   takes a regular chunk of your week?”_
2. The form asks for a name, start time and **Which day?** as a calendar date.
3. Its own note says _“One day. A weekly shape is the Day shape control below,
   which asks it properly.”_ There is no Day-shape control below on Insights.
4. The handler passes a `dayId` and no weekdays
   (`src/features/insights/Discovery.tsx:183-196`), so `authoringRecords` writes a
   `one-off` commitment window, not the regular week the question asked about.

The app neither preserves the answer's recurrence nor offers the referenced
control on that surface. This is not a wording nicety: the agenda's purpose is
to learn something that changes a later decision, and one dated occurrence is a
different fact from the ordinary weekly obligation it asked the owner to name.

**Existing tests that gave false confidence:**

- The synthetic test titled _“asks something that would not change today, and
  changes a later day”_ bypasses the discovery agenda by calling generic
  `introduce` with weekdays. It then opens a fresh near-empty journey and asserts
  only that the fresh journey has no commitments and a day id exists
  (`destination-and-discovery.test.ts:430-460`). It never travels the answered
  store or reads a later decision.
- The browser tests open/skip the agenda and show a change panel after an
  aspiration. They never reach or answer the obligation question.

#### QA-84-005 — an empty optional milestone is confirmed as the literal next step “that”

**Severity:** Major, blocking for this submission. **Type:** owner confirmation / copy semantics.

**Exact reproduction:**

1. Reset **The first evening** and open Career & Learning.
2. Open **Say what you are aiming at** and enter only _“Working as a cloud
   engineer”_. Leave _“And the next step towards it, if you know it”_ empty.
3. **That is it** is enabled, while the consequence above it says _“The next
   step in Career & Learning: ‘that’. The app will treat this as what you are
   currently studying, and start suggesting work on it.”_
4. Saving actually creates no milestone, current learning topic or study move,
   which is the correct treatment of the optional blank.

The pre-action confirmation is false precisely where D-173 says the owner must
not already understand the next step. The source supplies the invented fallback
in `DomainPanels.tsx:265`. The browser test that saves an aim without a milestone
checks only the eventual missing-state copy, never the confirmation the owner
agreed to.

### Documentation defect

#### QA-84-006 — canonical Phase 9 is told that the second agenda shipped on Life

**Severity:** Non-blocking to the product bundle, material to the next handoff.

Canonical plan section 54 says _“A second questioning surface on Life”_
(`CANONICAL_REBUILD_PLAN.md:2999`). DEF-0122, D-169, the phase status and the
deployed product all place it on Insights because Life failed its measured height
budget. Section 54 explicitly tells canonical Phase 9 what routing 84 shipped;
that inheritance record must agree with the product it will typeset.

### Mobile and UI result

No separate touch-target, overlap, sticky-navigation or horizontal-overflow
defect was found in the targeted 360px flows. The six Now actions wrap to three
rows at 360px, each at 48px high, without overlap; **Only part of it** remains a
distinct accessible name. Owner-entered terminal punctuation can still produce
double punctuation in generated recommendation copy (for example
_“Finish the subnetting lab..”_); treat that as a copy-class sibling while
repairing QA-84-005, not as an additional gate finding.

The deployed Android gate passed 187 checks in a real Galaxy-class context, but
it contains no Phase 84 destination, authoring, discovery, blocker, partial or
progress-course interaction. Its generic navigation/overflow pass therefore
does not cover the failed surfaces.

### Verification record

| Gate | QA result |
| --- | --- |
| Aggregate `npm run verify` | **PASS** — 1,812 / 1,812 tests across 83 files; format, lint, typecheck and build pass |
| Focused Phase 84 browser matrix | **57 / 57 passed** — 19 at each of 360, 430 and 1,280px; confirms the false-green omissions above |
| Deployed Android-style gate | **clean — 187 checks** against deployed `3dbfc9b`, bundle-equivalent to `42667ea` |
| Privacy scan | **clean — 284 tracked files** |
| CI at deployed head | **PASS** — Verify and Deploy preview jobs successful for `3dbfc9b` |
| Checkpoint equivalence | **PASS** — four documentation files changed, none bundle-relevant |
| Commits on no remote at QA start | **none** |

The aggregate suite and focused browser matrix were duplicated on a concrete
D-090 trigger: deployed behavior contradicted the acceptance claims and the
purpose-written tests were suspected false-greens. Their green results confirm
the omissions; they do not clear the defects.

### Deferrals and protected behavior

All explicit deferrals remain absent and were not treated as defects: no
strategy verdict, no pattern-discovery engine, no progression model beyond the
three proving domains, no owner-routine recommendation library, no historical
backfill, no twelfth domain page, no scoring change, no new visual language and
no live model.

The protected behavior remains intact: Fatherhood's growth path is untouched;
all child and owner no-score guards still bite; Health and Sleep remain one
page; private reasoning is off by default; Timeline stays passive; the guide's
budget and five established lifecycle controls remain, with the sixth partial
control added distinctly; deterministic and hybrid remain aligned; and no
render-time owner record write was introduced.

---

## Complete next handoff — repair after Round 1 FAIL

**System:** Claude / builder.
**Model:** Claude, Opus-class.
**Intelligence level:** **Max** — this is audit-campaign repair across progress
semantics, reachability, longitudinal capture and the acceptance instrument.
**Conversation:** **CURRENT** — return to the original routing 84 Claude builder
conversation, which owns this unresolved phase and its repairs.

```text
Routing Phase 84 repair after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full. Round 1 is the independent QA
report and is authoritative for this repair. Keep the Phase field exactly 84.

Keep routing 84 YELLOW. Do not start routing 90 and do not mark the phase GREEN.
Repair QA-84-001 through QA-84-006 under canonical plan section 42: reproduce
each defect, identify the whole class, write a regression, prove that regression
fails when the defect is faithfully reintroduced, fix the root cause, and run
the full gate on the final tracked checkpoint.

Required outcomes:

1. From The first evening, a Health destination must visibly change the next
   recommendation under a valid before/after counterfactual using identical
   guide answers and no unrelated destination as test scaffolding. Preserve
   D-021 and the explicit deferral: do not begin suggesting arbitrary
   owner-authored routines merely to make the test move.
2. Partial work must remain partial everywhere. It must not appear as a completed
   session or “Followed through” in progress, correction or history copy, and it
   must remain resumable and capable of later full completion.
3. A course completed through ordinary controls must render as a completed
   course, distinct from its sessions and from a milestone. Sweep every reader
   for the unreachable `thread.state === 'done'` assumption exposed by DEF-0119,
   rather than repairing only the reported page.
4. Prove the second agenda's later-useful question through the actual discovery
   UI and the same answered store. What the question asks, what the form accepts
   and what the record stores must be the same fact; then travel to the later
   situation and show the changed decision. Do not bypass the agenda with the
   generic authoring builder, and do not use a fresh store for the “later” half.
5. When the optional next step is blank, the confirmation must not invent
   “that” or promise a learning topic and recommendations that will not be
   written. Sweep owner-entered punctuation at the same composition boundary so
   generated sentences do not acquire doubled punctuation.
6. Correct canonical plan section 54 so its factual inheritance list places the
   shipped second agenda on Insights, consistent with D-169 and DEF-0122.

Preserve every Round 1 PASS and every explicit deferral, especially the private
structural guard, standing blocker and silent paths, all no-score protections,
Fatherhood's untouched growth model, the owner-routine recommendation deferral,
and Life's measured height budget.

The new regressions must cover the real owner surfaces. Add deployed
Android-style coverage for the Phase 84 controls the current 187-check gate does
not touch, and add browser cases for Health's counterfactual, partial-progress
copy, naturally completed course rendering, the actual longitudinal discovery
flow and the empty optional milestone confirmation.

Run the clean aggregate gate, full browser suite at 360/430/1280, privacy scan,
block and copy sweeps, and the deployed Galaxy-class Android gate. Deploy the
repaired checkpoint, prove checkpoint equivalence if documentation moves the
deployed SHA, and update this same QA report with the builder's repair record and
a complete retest prompt addressed to the SAME Codex QA conversation at High.
Do not start routing 90.

Keep this file's terminal completion marker as its last meaningful line. Do not
copy it to docs/NEXT_PROMPT.md or any other handoff file.
Do not ask the owner to paste file contents.
```

### Short launcher

**Model:** Claude, Opus-class. **Level:** Max. **Conversation:** CURRENT — the
original routing 84 builder conversation.

```text
Routing Phase 84 repair after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the complete repair
handoff there exactly as written. Keep Phase 84 YELLOW; do not start routing 90.
Do not ask me to paste the file contents.
```

---

## Round 1 repair — the builder's record

**Actor:** Claude / the routing 84 builder conversation. **This section is the
builder's and is appended below QA's round rather than inside it** — QA owns
every round and the builder does not edit them (D-077, `README.md`). QA's Round 1
above is byte-identical to what QA wrote; it was committed on its own as
`328e42f` before a line of the repair was written, so the history shows the
finding preceding the fix.

**Result: every Round 1 finding repaired. The phase stays YELLOW.** The builder
does not declare GREEN. Round 2 is dispatched in `docs/NEXT_PROMPT.md` to the
**same** Codex conversation.

### Checkpoint

| Fact                    | Value                                                                             |
| ----------------------- | --------------------------------------------------------------------------------- |
| Repaired checkpoint     | `94e1716` — the commit the aggregate gate was run on, and the one to test        |
| Round 1 checkpoint      | `42667ea` — deployed as `3dbfc9b`, what QA failed                                 |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/                       |
| Owner-visible behaviour | **changed** — Now, Insights, Timeline and every domain page                       |
| QA's Round 1 commit     | `328e42f` — QA's report, committed unedited                                       |
| Decisions written first | `25ba1cf` — D-187 and D-188, before the code they govern                          |

**The documentation head is a later commit than the product checkpoint**, as it
was in Round 1. It carries this record, the Round 2 dispatch and two corrected
check labels in `scripts/android-gate.mjs`; none of it is bundle-relevant, and
`checkpoint-equivalence.mjs` is the way to confirm that rather than take it on
trust (D-097, D-180).

### What each finding became

| Finding   | Repair                                                                                                                                                                                                                                                                                                                                                        | Where                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| QA-84-001 | `healthCandidates` proposes the Health destination's **next milestone** as a candidate — an owner-created entity, ranked by `goal-fit`, with **no invented duration** (`durationUnknown` passes `undefined` minutes). No dimension added, no weight moved, AUD-0045's routines deferral intact. The standalone Health counterfactual now holds with no Career destination anywhere near it. | `src/intelligence/candidates.ts`                                                   |
| QA-84-002 | `extent: 'partial'` routes to its own rung — **part-done** — with its own sentence, and history copy says _Got part of the way_ rather than _Followed through_. Seven rungs now, not six.                                                                                                                                                                       | `src/domain/progress.ts`, `src/intelligence/progress.ts`, `src/features/history/describe.ts` |
| QA-84-003 | `readProgress` reads `situation.threads` and `thread.finished`. The dead `state === 'done'` assumption was in **three** readers — a source guard found the other two — and all three now read the same thing.                                                                                                                                                   | `src/intelligence/progress.ts`, `src/features/life/Threads.tsx`                    |
| QA-84-004 | The form asks **which day of the week**; `authoringRecords` writes a `weekly` recurrence from it. The note no longer points at a Day-shape control that is not on that screen.                                                                                                                                                                                  | `src/features/insights/Discovery.tsx`                                              |
| QA-84-005 | `milestoneConfirmation()` composed in `authoring.ts`, so the sentence is a function of what the owner typed and a test can read it. A blank next step now says _"Leave this empty and nothing is created for it."_                                                                                                                                              | `src/intelligence/authoring.ts`, `src/features/life/DomainPanels.tsx`              |
| QA-84-006 | Canonical section 54 now says the second agenda shipped on **Insights**.                                                                                                                                                                                                                                                                                       | `docs/CANONICAL_REBUILD_PLAN.md`                                                   |
| sibling   | `ownerPhrase()` strips trailing terminal punctuation from the owner's words as they enter a generated sentence, so _"Finish the subnetting lab.."_ cannot occur. Applied at the composition boundary, to subject and object.                                                                                                                                    | `src/domain/recommendation.ts`                                                     |

**Three defects the repair itself produced were found and logged**, because the
repair round is not exempt from the thing this phase is about: DEF-0120 (the
blocker question nested under a branch it had nothing to do with, invisible at
360px), DEF-0121 (a new button's accessible name contained the name of the button
beside it), DEF-0122 (Life exceeded its measured height budget, which is why the
agenda is on Insights). All three came from the browser suite at three widths.

**And one from the gate discipline itself — D-186.** A browser run was reported
here as clean when it was not: `tee | tail -6` showed _"622 passed"_ and hid _"26
failed"_ above it, and the pipeline's exit status was `tail`'s. CI caught it. The
rule is now that a gate's **exit status** is what is read, never a tail of its
output.

### Coverage QA asked for and did not have

QA was right that the passing tests beside each finding were false greens, and
right that the 187-check Android gate touched none of this phase's controls.

- **Deployed Android gate** — a routing 84 block walks the aspiration form (the
  empty-milestone confirmation included), the progress panel, the second agenda's
  proposal, and the blocker question with all eight causes, each checked against
  the 44px thumb target, on the deployed bytes in a Galaxy-class context.
- **Browser suite** — the Health counterfactual with no Career destination
  present; the partial-completion copy on the domain page and in history; a
  course finished through ordinary controls rendering as a finished course; the
  real discovery obligation flow including the weekday control; and the blank
  optional milestone confirmation.
- **Synthetic** — every one of the above as a focused case, plus a scripted
  reintroduction harness proving each repair's guard fails when the defect is put
  back.

### Two owner-directed corrections, declared

**Not QA findings.** Codex raised neither in Round 1. They are owner-directed
scope added to this repair round and are named here so Round 2 meets them as
declared scope rather than as unexplained diff. **QA-84-001 … QA-84-006 are
unchanged, unreprioritised and unreplaced.**

**1. An eighth blocker cause — `must-stay`, _"Can't leave — someone's in my
care"_ (D-187).** The owner could not take the walk Now offered: his daughter was
asleep and there was nobody else to watch her. The nearest of the seven was
`someone-needs-me`, semantically wrong (nobody needed his *time*; he was not free
to leave) and `standing: false`, so nothing durable was written at all. The new
cause is `standing: true` and becomes a constraint on the domain page with **Not
true any more** beside it.

**It promises nothing, and that is the load-bearing part.** `applyConstraints`
never reads `situation.constraints`; `cautionsFor` matches a constraint's concept
against a candidate's `leansOn`, and no `leansOn` holds a `blocker.*` concept, so
that branch cannot fire; `constraints.ts` records the non-enforcement as
deliberate. A copy guard asserts that no owner-visible string on the path claims
a future recommendation will change — the labels, the statements, the live
question, its note, the silent line and the constraint description — and it is
proved by reintroduction. Enforcement is F08's blocker aggregation, adjudicated
to later Validity.

**2. The discovery card stops bypassing the confirmation contract (D-188,
DEF-0123).** `Discovery.tsx` never imported `proposeAuthoring`; its destination
branch called `destinationRecords` directly, so the owner typed **More money**,
pressed **That is it**, and confirmed an interpretation he was never shown — the
same class as QA-84-005, one surface across.

`proposeDestination()` now returns the same `AuthoringProposal` shape and
composes `milestoneConfirmation()`. `AUTHORABLE_KINDS` stays at six; D-188
records the choice and why widening a closed set to reuse a function was the
worse of the two available moves. The obligation branch on the same card went
through `proposeAuthoring` at the same time, from a single draft.

**The bypass cannot come back.** `everyAuthoringSurface()` in
`tests/synthetic/journey.ts` reads which feature files call a builder returning
`AuthoringResult` and which of them compose an `AuthoringProposal` first, with
one named exemption (`DomainPage.tsx`, whose form proposed and confirmed before
handing the draft over) carrying its reason. Reintroducing the direct call fails
it by name.

**No semantic interpretation was added by either correction.** The aim is stored
byte-identical, in the prompt's own domain — _"More money"_ under a Career prompt
stays Career. D-024, D-025 and D-172 stand; semantic capture is routing 91
package 1.

### Verification at the repaired checkpoint

| Gate                                      | Result                                                            |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `npm run verify`, clean checkout          | **PASS** — the aggregate command, format included (D-180)         |
| Unit / contract / synthetic / adversarial | **1,834 passed** in 83 files (1,812 at Round 1)                   |
| Browser, three widths, one worker         | **PENDING**                                                  |
| Deployed Android gate                     | **clean — 219 checks** against deployed `94e1716` (187 at Round 1, none of them this phase's controls)                                                  |
| Privacy scan                              | **clean** — 284 tracked files                                                  |
| Block sweep and copy guards               | **PASS**                                                          |
| Commits not on any remote                 | **none** at the handed-off head (D-180)                           |
| Checkpoint equivalence                    | **PASS** — deployed `94e1716` serves the same bytes, nothing between                                                    |
| CI                                        | Verify **success**, Deploy preview **success**                                                       |

### One additional Round 2 requirement, owner-directed

**A cold-store owner-use check.** Stated in full in `docs/NEXT_PROMPT.md` and
summarised here so it is not missed by a reader of this file alone: from a
**genuinely fresh browser store**, without ever opening the QA laboratory and
without seeding any fixture, walk the product as an ordinary owner and record
every point where ordinary use cannot continue without that laboratory.

**On a genuinely empty store Now offers exactly one control — _"Open the QA
laboratory."_** Confirmed by the builder on the deployed build. It is to be
recorded **as a cold-start finding in its own right, not as a blocked test**, and
the link is not to be followed. Life and Insights are still reachable, and
Insights does carry the second agenda on a cold store.

It carries two cases: **CASE A**, answering the agenda with the ordinary vague
phrase _"More money"_ and inspecting what the app says it will create and what it
says it is not assuming **before** confirming, then what was actually written;
and **CASE B**, _"Can't right now"_ and the caregiving blocker for the real owner
situation, inspecting what is recorded and what the product then claims.

**It is a _cold-store owner-use check_ and not a sealed one**, because Round 1
knowledge already exists in that conversation and D-090's sealed-before-repo
definition cannot honestly be claimed. It is manual owner-use evidence inside
Round 2 — **not a new automated acceptance instrument**, not a gate, and it
leaves QA-84-001 … QA-84-006 and every other Round 2 requirement unchanged.

### What is still open, and named rather than left to be found

- **Enforcement of a blocker constraint.** Nothing reads one. D-187 says so in
  the code and this record says so here; F08's aggregation is later Validity's.
- **The owner phone check** is owed before release and is not a blocker QA can
  clear.
- **Semantic capture of what an aim means** — routing 91 package 1 (D-172).
  Deliberately absent.

---

## Round 2 — independent QA retest after the Round 1 repair

**Phase:** 84 — what the owner is trying to become

**Actor:** Codex / independent QA (D-077, D-090).

**Overall result:** **FAIL.** The repaired Health counterfactual, partial-progress
rung, naturally completed course, weekly recurrence, blank optional milestone
and canonical-plan correction all reproduce. Four new owner-visible findings
remain: the required cold-start finding, a false Health milestone confirmation,
a partial event still tagged **Done**, and blocker copy that promises a future
adaptation the engine does not perform. Routing 84 stays **YELLOW**.

### Build identity and test configuration

| Fact | Value |
| --- | --- |
| QA-tested product checkpoint | `94e1716` |
| Deployed Preview SHA read live | `eaf45361eb5d3749a45950edba67d3c2d2a32f66` |
| Relationship | `node --use-system-ca scripts/checkpoint-equivalence.mjs 94e1716 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` reported four changed files and none bundle-relevant |
| Repository head at QA start | `9bd99f5` — one existing, documentation-only local commit not on a remote branch |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Manual mobile viewport | 360 × 800 CSS px in the live Preview |
| Android configuration | Galaxy S24-class Playwright context; 360 × 780 CSS px; DPR 3; touch and `isMobile`; Android 14 / Chrome 126 user agent; deployed Preview |
| Browser matrix | Chromium at 360 × 740, 430 × 932 and 1,280 × 900; one worker |
| QA report commit | Not committed by QA in this round |

The checkpoint checker without `--use-system-ca` and the first Android-gate
invocation could not verify this host's certificate chain. Repeating each with
Node's system certificate store succeeded. That was an environment condition,
not a product failure; the live browser and the successful equivalence check
both read deployed SHA `eaf4536`.

### Protocol and cold-store owner-use record

The additional check is a **cold-store owner-use check**, not a sealed check.
Round 1 knowledge already existed, exactly as the handoff says.

1. A fresh browser store opened on ordinary Now, without opening QA Lab or
   seeding any fixture. Now said **Nothing loaded / There is no history here
   yet**, and its only control was **Open the QA laboratory**. This is
   QA-84-007, recorded as a finding rather than as a blocked test.
2. Life said there was nothing to report and exposed no area links or owner
   controls. Insights was the only ordinary route that could continue: **Getting
   to know you / One answer would help the app know you better.**
3. CASE A entered `More money` under the Career prompt. Before confirmation the
   card showed the original words, the Career domain, the destination it would
   create, and the unknown next step, starting point and evidence. Confirmation
   preserved `More money` byte-identical; no amount, horizon, Money-domain
   interpretation or second meaning appeared.
4. The answer changed Now from **NOTHING LOADED** to **Nothing to suggest just
   yet**. Answering **Enough** then produced the walk. The owner can therefore
   eventually reach a useful Now without QA Lab, but only through Insights; the
   initial Now and initial Life are the two points where ordinary use itself
   offers no continuation.
5. CASE B pressed **Can't right now** on that walk and selected **Can’t leave —
   someone’s in my care**. The durable statement appeared on Health & Recovery
   with **Not true any more**, and Timeline held the inability and constraint.
   The question's note nevertheless said the answer was kept so the app could
   _offer something that fits next time_. Nothing performs that adaptation;
   this is QA-84-010.
6. Leaving a discovery proposal created no proposed destination. The agenda did
   write its normal `discovery-response: skipped` memory, which D-163 requires so
   a respected skip is not immediately re-asked; that is not an authored object
   and is not a finding.

No screenshot artifact was added. The evidence is the deployed DOM transcript,
the exact reproductions below, the live build identity, and the source/test
boundaries that explain why the green gates missed each line.

### Round 1 repairs and acceptance result

| # | Result | Round 2 evidence |
| --- | --- | --- |
| 1. A destination changes the recommendation in Career, Health and Money | **PASS mechanically; blocked semantically by QA-84-008** | The standalone Health counterfactual changed _Move for 25 minutes: a walk_ into _Get some movement in: Lift twice each week_, with no Career destination and no invented duration. The form had just promised it would **not** start suggesting that step. |
| 2. A completed session, completed course and milestone are distinct; attendance is not capability | **FAIL** | The partial rung and body sentence are repaired, and a three-occasion course renders under **Courses finished** separately from **3 sessions done**. Timeline still puts the tag **Done** above the partial event. See QA-84-009. |
| 3. Goal, routine, person, place, skill and obligation are ordinarily authorable | **PASS** | All six controls remain present from the near-empty domain page; the focused synthetic journey and the three-width browser suite build or exercise the same routes. |
| 4. The second agenda asks for later-useful information and grows quieter | **PASS** | After the three destination skips, the real UI asked for a name, start time and weekday. `Evening class`, 19:00, Thursday rendered on Life as **19:00 to 20:00, Thursdays**. Wednesday stayed unchanged; Thursday at 19:30 changed to **Evening class is under way / Nothing worth starting right now** in the same answered store. |
| 5. “Can't right now” learns a blocker when useful and stays silent when known | **FAIL on the declared D-187 addendum** | Durable capture, correction and the known/restorative silent branches remain held. The owner-visible question note promises a better-fitting future offer that no reader can produce. See QA-84-010. |
| 6. Correction consequences and private permission | **PASS** | The correction and private-off/on/off paths passed at all three browser widths and in the focused synthetic suite; the repair did not move their boundaries. |
| 7. Standing no-score guards | **PASS** | No score, percentage, rank, grade, readiness number, wellness composite or Life Score appeared on the retested destination, progress, discovery, blocker, correction or private paths; the focused sweeps and privacy scan passed. |

QA-84-001, QA-84-003, QA-84-004, QA-84-005 and QA-84-006 are closed by
their reproductions. QA-84-002 is only partly closed because the event's
sentence and progress rung are correct while its Timeline tag still says the
opposite.

### New Round 2 findings

#### QA-84-007 — the first screen of a first-run app offers only the QA laboratory

**Severity:** Major / material cold-start defect. **Type:** owner reachability.
**Acceptance relationship:** required manual evidence inside Round 2; it does
not create a new automated gate.

**Exact reproduction:**

1. Open the deployed Preview in a genuinely fresh store.
2. Do not open QA Lab and do not seed a fixture.
3. Now says _“There is no history here yet”_ and explains that the engine will
   not guess.
4. The only control on the screen is **Open the QA laboratory**.
5. Life exposes no area links or owner controls. Insights is the only ordinary
   continuation.

The owner can eventually recover through Insights, so this is not a blocked
test. It is the product claim visible at first contact: when the app knows
nothing, the first thing it offers the owner is a developer tool.

**Existing tests that gave false confidence:**

- `now.spec.ts` verifies that an empty store refuses to invent a recommendation;
  it does not verify that an owner-facing next step exists.
- `shell.spec.ts` verifies that empty Life does not guess; it does not verify
  that a domain or authoring route remains reachable.
- No automated gate starts from a genuinely fresh store while refusing QA Lab;
  this is why the handoff added the manual check.

#### QA-84-008 — Health says it will not suggest the milestone, then suggests it immediately

**Severity:** Blocker. **Acceptance item:** 1 and D-173. **Type:** false
pre-action consequence / product semantics.

**Exact reproduction:**

1. Load **The first evening** and establish the baseline with **Enough**. Now
   says _“Move for 25 minutes: a walk.”_
2. Reset **The first evening**. On Health & Recovery enter destination _“Build
   sustainable strength”_ and next step _“Lift twice each week”_.
3. Before saving, the form says: _“The app will know it is what you are working
   towards; it will not start suggesting it.”_
4. Save, return to Now and answer **Enough** identically.
5. Now immediately says _“Get some movement in: Lift twice each week.”_ and
   names the walk as the option it beat.

The ranking repair itself is right and closes QA-84-001. The confirmation is
now false because it still describes the pre-repair behavior.

**Source boundary:** `describeMilestone()` in
`src/intelligence/authoring.ts:750-760` emits the no-suggestion promise for a
Health `routine`; `healthCandidates()` in
`src/intelligence/candidates.ts:641-693` now deliberately proposes exactly that
destination milestone.

**Existing tests that gave false confidence:**

- `destination-and-discovery.test.ts` explicitly expects the Health sentence to
  contain _“will not start suggesting it”_ while a different test proves the
  same step becomes a candidate. It holds both halves separately and never asks
  whether they contradict.
- `phase84.spec.ts` proves the changed Health headline but never reads the
  Health milestone confirmation in that counterfactual.
- The Android gate checks the blank-milestone sentence and the changed controls,
  not a named Health milestone's consequence.

#### QA-84-009 — Timeline still calls a partial completion “Done”

**Severity:** Blocker. **Acceptance item:** 2. **Type:** remaining semantic
contradiction / history copy.

**Exact reproduction:**

1. Load **The first evening**, answer **Enough**, press **Start it**, then
   **Only part of it**.
2. Now correctly says **Part done**.
3. Health & Recovery correctly shows **Got part way** and says it is not a
   session done. Its correction and recent lines say _“Got part of the way.”_
4. Open Timeline. The event sentence says _“Got part of the way — getting out
   for a walk.”_ while the tag directly above it says **Done**.

Partial work therefore still does not remain partial everywhere. The repaired
sentence and the unrepaired event tag contradict each other in one Timeline
entry.

**Source boundary:** `TAG['action-completion']` remains hard-coded to `Done` in
`src/features/history/describe.ts:98-104`; the adjacent comment explicitly says
the tag stays Done for both extents. Only `describeLifecycle()` at lines 411-429
consults `extent`.

**Existing tests that gave false confidence:**

- The synthetic repair test calls `describeEvents()`, which returns the event
  sentence and not its tag.
- The Phase 84 browser repair test inspects the Health screen, not Timeline.
- The Android gate does not complete a partial move and inspect the resulting
  Timeline row.

#### QA-84-010 — the blocker question promises a better-fitting future offer that cannot happen

**Severity:** Blocker. **Acceptance relationship:** owner addendum D-187 and the
Round 2 attack requirement. **Type:** claim wider than evidence.

**Exact reproduction:**

1. From a store where the walk is on Now, press **Can't right now**.
2. Before choosing any cause, read the note under _“What got in the way?”_
3. It says: _“This is kept so the app can offer something that fits next time.
   It is never read as you not wanting to.”_
4. Choose **Can’t leave — someone’s in my care**. The durable record and its
   withdrawal control work.
5. Inspect the engine: as D-187 records, `applyConstraints` never reads blocker
   constraints and no candidate `leansOn` a `blocker.*` concept.

The note implies exactly the future adaptation D-187 forbids. Recording the
cause is useful; claiming a better-fitting next offer is not supported.

**Source boundary:** the adaptable branch in
`src/intelligence/blockers.ts:284-290` composes the promise directly.

**Existing tests that gave false confidence:**

- The synthetic copy guard in
  `destination-and-discovery.test.ts:1444-1499` blacklists only formulations
  built around _stop_, _won't_, _no longer_, _avoid_ and _from now on_. It does
  collect this live note, but its patterns do not match _offer something that
  fits next time_.
- `phase84.spec.ts` and `scripts/android-gate.mjs` use still narrower variants
  of the same blacklist. Both passed while rendering the quoted promise.
- The reintroduction proves only one already-listed phrase; it does not prove
  the class _any claim of future recommendation adaptation_.

### Mobile, verification and protected-scope result

No touch-target, overflow, sticky-navigation, button-shift or console defect was
found in the targeted mobile flows. The native time field required ordinary
sequential entry before the weekday proposal became confirmable; once entered,
the control and recurrence behaved correctly.

| Gate | QA result |
| --- | --- |
| Aggregate `npm run verify` | **PASS** — 1,834 / 1,834 tests across 83 files; format, lint, typecheck and production build pass |
| Full browser matrix | **PASS — 675 / 675**, 225 at each of 360, 430 and 1,280px; one worker; 13.4 minutes |
| Deployed Android-style gate | **clean — 219 checks** against deployed `eaf4536`, using Node's system CA store |
| Privacy scan | **clean — 286 tracked files** |
| Block sweep and standing copy/no-score guards | **PASS inside the aggregate suite**; the D-187 promise guard is a demonstrated false green |
| Checkpoint equivalence | **PASS** — deployed `eaf4536` is bundle-equivalent to `94e1716` |
| CI at deployed head | **PASS** — workflow run `33138229085` completed successfully for `eaf4536` |
| Commits on no remote at QA start | **one** — existing documentation-only `9bd99f5`; the tested product/deployed head is remote |

The protected scope remains intact. The repair changed no scoring file or
ranking weight, added no strategy evaluation or pattern-discovery engine,
introduced no progression model beyond the three proving domains, did not make
an arbitrary owner routine recommendable, added no historical backfill or
twelfth domain page, changed no orchestrator, created no `PHASE_85_*` file, and
did not alter `qa/WHOLE_APP_OWNER_USE_REVIEW.md`. Fatherhood, private structural
guards, Timeline's passive role and all standing no-score protections remain as
they were.

---

## Complete next handoff — repair after Round 2 FAIL

**System:** Claude / builder.
**Model:** Claude, Opus-class.
**Intelligence level:** **Max** — this is audit-campaign repair across owner
confirmation semantics, history representation, cold-start reachability and a
copy guard that asserts the wrong class.
**Conversation:** **CURRENT** — return to the original routing 84 Claude builder
conversation, which owns the still-unresolved phase and its repairs.

```text
Routing Phase 84 repair after independent QA Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full. Round 2 is the independent QA
retest and is authoritative for this repair. Keep the Phase field exactly 84.

Keep routing 84 YELLOW. Do not start routing 90 and do not mark the phase GREEN.
Repair QA-84-007 through QA-84-010 under canonical plan section 42: reproduce
each defect, identify the whole class, write a regression, prove that regression
fails when the defect is faithfully reintroduced, fix the root cause, and run
the full gate on the final tracked checkpoint.

Required outcomes:

1. A genuinely empty first-run store must offer an ordinary owner route rather
   than making QA Lab the only control on Now. Preserve truthful abstention: do
   not invent a recommendation merely to fill the screen. Re-run the cold-store
   owner-use path without QA Lab and enumerate every ordinary continuation.
2. A Health destination milestone's confirmation must agree with what
   `healthCandidates` now does. The repair must preserve the standalone Health
   counterfactual, the absence of invented minutes, D-021, and the explicit
   owner-routines-library deferral.
3. Partial work must remain partial in every part of a rendered history entry,
   including Timeline's tag. A full completion must still be distinguishable,
   and part-done must remain resumable and later completable.
4. No owner-visible blocker string may promise or imply future recommendation
   adaptation while blocker constraints are capture-only. Replace the phrase
   blacklist with a guard over the actual semantic class, and prove it fails on
   the deployed wording QA found, not only on “stop suggesting.” Preserve the
   durable caregiving cause and its withdrawal route; do not implement blocker
   enforcement in this phase.

Preserve every Round 2 pass: the Health ranking change itself, the part-done
progress rung and sentence, naturally completed course rendering, the real
weekly recurrence and later changed decision, the blank-milestone behavior,
canonical section 54, all six ordinary authoring routes, correction/private
semantics and the no-score guards. Preserve every explicit deferral and protected
surface.

Add deployed Android-style and three-width browser coverage for each repaired
owner surface, including the complete Timeline row and the exact blocker note.
Run the clean aggregate gate, full browser suite at 360/430/1280, privacy scan,
block/copy sweeps, and deployed Galaxy-class Android gate. Deploy the repaired
checkpoint, prove checkpoint equivalence if documentation moves the deployed
SHA, append the builder's repair record and a complete retest prompt to this same
QA report, and address that retest to the SAME Codex QA conversation at High.

Do not create a PHASE_85_* file. Do not alter
docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md. Do not ask the owner to paste file
contents.
```

### Short launcher

**Model:** Claude, Opus-class. **Level:** Max. **Conversation:** CURRENT — the
original routing 84 builder conversation.

```text
Routing Phase 84 repair after independent QA Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the complete Round 2
repair handoff there exactly as written. Keep Phase 84 YELLOW; do not start
routing 90. Do not ask me to paste the file contents.
```

---

## Round 2 repair — the builder's record

**Actor:** Claude / the routing 84 builder conversation. **Appended below QA's
round 2 rather than inside it** — QA owns every round and the builder does not
edit them (D-077). Round 2 above is byte-identical to what QA wrote and was
committed on its own as `180fcdd` before a line of this repair was written.

**Result: all four findings repaired. The phase stays YELLOW.** The builder does
not declare GREEN. Round 3 is dispatched in `docs/NEXT_PROMPT.md` to the **same**
Codex conversation at High.

**QA was right twice, and the second time it was right about the first repair.**
QA-84-008 exists because QA-84-001 was fixed; QA-84-009 exists because QA-84-002
was fixed in the sentence and argued away in the tag. That is the case for a
retest round, and it is why all four decisions below are about **classes** rather
than about the four sentences.

### Checkpoint

| Fact                    | Value                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| Repaired checkpoint     | `cdd9259` — the commit the aggregate gate was run on, and the one to test   |
| Round 2 checkpoint      | `94e1716` — deployed as `eaf4536`, what Round 2 failed                       |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/                  |
| Owner-visible behaviour | **changed** — Now on a first run, Life, every domain page, Timeline, blocker |
| QA's Round 2 commit     | `180fcdd` — QA's report, committed unedited                                  |

### What each finding became

| Finding   | Repair                                                                                                                                                                                                                                                                                                                                                                                             | Where                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| QA-84-007 | `LifeScreen` and `DomainPage` gated on `snapshot.records.length === 0`, which is not a readiness check: it switched off the aspiration form, the six authoring controls and the area links — the controls that exist **so the owner can write the first record**. Both now gate on readiness alone, as `InsightsScreen` always has. Now keeps its abstention and names the ordinary ways on. **D-189** | `src/features/life/LifeScreen.tsx`, `DomainPage.tsx`, `now/NowScreen.tsx`    |
| QA-84-008 | `describeMilestone`'s Health sentence described the behaviour QA-84-001's repair had changed. It now says the app will start suggesting the step **on evenings there is something to spend on it**, which is the condition `healthCandidates` actually applies. **D-190**                                                                                                                            | `src/intelligence/authoring.ts`                                              |
| QA-84-009 | `tagOf(record)` reads the extent and is what every surface renders; `tagFor(kind)` stays for the schema's exhaustiveness sweep. **D-191**                                                                                                                                                                                                                                                           | `src/features/history/describe.ts`, `src/features/export/compose.ts`         |
| QA-84-010 | Both promising notes rewritten to say what is recorded and where. The guard is now over the **class** — actor × non-present modality × adaptation verb — in one module every gate imports. **D-192**                                                                                                                                                                                                | `src/intelligence/blockers.ts`, `scripts/adaptation-claims.mjs`              |

### On QA-84-010 in particular

This is the one worth being plain about. **D-187 forbade exactly this claim one
round earlier, and the guard written alongside it did not catch it.** The guard
collected the live note into its sweep and its five phrases — *stop*, *won't*, *no
longer*, *avoid*, *from now on* — did not appear in *"so the app can offer
something that fits next time"*. Three narrower copies of that list had grown, in
the synthetic suite, the browser suite and the Android gate, and all three were
green while the promise rendered on the deployed build.

`scripts/adaptation-claims.mjs` asks for an actor, a modality that is not the
present, and a verb about what is put in front of him — a few hundred formulations
from three short lists rather than the six somebody remembered. It carries **no
negation exemption**: the first draft had one, and it immediately let through
*"the app will no longer put this in front of you"* by reading the *no* in *no
longer* as a denial. A negated promise is still a promise. Honest denials pass on
their own merits, because they contain no adaptation verb at all.

`MUST_BE_CAUGHT` names the two strings QA read off the build, so a future round
cannot earn a pass by catching only the generic examples.

**It is scoped to the blocker path deliberately.** *"The app will know it exists
and can refer to it; it will not start suggesting it"* is the authoring form's
sentence about a routine and is **true** — AUD-0045 means an owner routine
genuinely is never suggested. The rule is not "never speak of the future"; it is
"not on a path where nothing acts".

### The cold-store check, answered

The manual check Round 2 carried is what found QA-84-007, and no automated gate
could have: every gate begins by loading a scenario. Enumerated after the repair,
on the deployed build, from a genuinely fresh store and without opening the QA
laboratory:

- **Now** abstains as before — _"There is no history here yet"_, no invented
  recommendation, no lifecycle controls — and offers two ordinary ways on:
  answering one thing about what he is aiming at, and looking at the areas.
- **Life** lists all eleven areas, every one of them under **Nothing here yet**,
  with no area claiming a standing.
- **Every domain page** carries its controls: the aspiration form on the proving
  domains, and all six authoring controls everywhere.
- **Insights** carries the second agenda, as it always did.

**There is no remaining point where ordinary owner use cannot continue without the
QA laboratory.** That is the builder's reading and Round 3 should test it rather
than accept it.

### Coverage added

- **Synthetic** — a source instrument, `screensGatedOnRecordCount()`, over every
  feature file that assembles a situation; a domain-page assembly check from an
  empty store; a confirmation-versus-behaviour test that reads the sentence and
  then makes the app act, for all three proving domains; a library-wide sweep
  that no rendered entry contradicts itself about extent; and the blocker-path
  sweep against the shared class guard.
- **Browser, three widths** — the first-run Now and its two routes, Life and
  Career on an empty store, the Health form and the headline that follows it in
  one case, the complete Timeline row, and the exact blocker note.
- **Deployed Android gate** — the first-run screens with a thumb, and the
  Timeline row after a partial completion.

**Every repair was proved by reintroduction**, in the synthetic suite and, for the
two that render, in the browser as well.

### Verification at the repaired checkpoint

| Gate                                      | Result                                                            |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `npm run verify`, clean checkout          | **PASS** — the aggregate command, format included (D-180)         |
| Unit / contract / synthetic / adversarial | **1,841 passed** in 83 files (1,834 at round 2)                   |
| Browser, three widths, one worker         | **690 passed** at three widths, 230 per width (675 at round 2)                                                  |
| Deployed Android gate                     | **clean — 230 checks** against deployed `cdd9259` (219 at round 2)                                                  |
| Privacy scan                              | **clean — 286 tracked files**                                     |
| Block sweep and copy guards               | **PASS**                                                          |
| Commits not on any remote                 | **none** at the handed-off head (D-180)                           |
| Checkpoint equivalence                    | **PASS** — deployed `cdd9259` serves the same bytes, nothing between                                                    |
| CI                                        | Verify **success**, Deploy preview **success**                                                       |

### What is still open, and named rather than left to be found

- **Enforcement of a blocker constraint.** Still nothing reads one, still
  deliberate, still F08's aggregation and later Validity's. D-192 is a guard
  about saying so, not a step towards doing it.
- **Semantic capture of what an aim means** — routing 91 package 1 (D-172).
- **The owner phone check** is owed before release and is not a blocker QA can
  clear.

---

## Round 3 — independent QA retest after the Round 2 repair

**Phase:** 84 — what the owner is trying to become

**Actor:** Codex / independent QA (D-077, D-090).

**Overall result:** **FAIL.** All seven product acceptance items pass, and all
four Round 2 owner-visible reproductions are repaired on the deployed build.
The phase nevertheless remains **YELLOW** because the D-192 standing guard is
still a false green: an ordinary future-adaptation promise can be written in
several direct forms that `adaptationClaims` returns as safe. One new blocking
finding, QA-84-011, is open.

### Build identity and test configuration

| Fact | Value |
| --- | --- |
| QA-tested product checkpoint | `cdd9259` |
| Deployed Preview SHA read live | `7810904391f76ce4ccc182b4a07adcec0650f9ac` |
| Relationship | `node --use-system-ca scripts/checkpoint-equivalence.mjs cdd9259 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` reported four changed files and none bundle-relevant |
| Repository head at QA start | `7810904`, equal to `origin/main`, with a clean worktree |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Manual mobile viewport | 390 × 844 CSS px in the deployed Preview |
| Cold-store isolation | A DNS-equivalent trailing-dot host, `bill6006.github.io.`, supplied a genuinely fresh IndexedDB origin without clearing either existing QA browser store; the page showed deployed build `7810904` |
| Android configuration | Galaxy S24-class deployed gate; 360 × 780 CSS px; DPR 3; touch and `isMobile`; Android 14 / Chrome 126 user agent |
| Browser matrix | Chromium at 360 × 740, 430 × 932 and 1,280 × 900; one worker |
| QA report commit | Not committed by QA in this round |

### Protocol and cold-store owner-use record

This was the required **cold-store owner-use check**, not a new sealed check.
Rounds 1 and 2 already existed in this same conversation.

1. The deployed Preview opened from a genuinely fresh store without loading a
   scenario and without opening QA Lab. Now said **Nothing loaded / There is no
   history here yet**, invented no recommendation or history, and offered two
   ordinary routes: **Answer one thing about you** and **Or look at the areas of
   your life**. The developer route remained visibly separate.
2. The Life route listed all eleven areas together under **Nothing here yet**.
   Each distinct domain page remained reachable. Career, Health and Money
   carried **Say what you are aiming at**, and all ten distinct pages carried
   the six authoring controls: goal, routine, person, place, skill and
   obligation. No area invented a standing.
3. Insights carried the second agenda. CASE A entered `More money` under its
   Career prompt. Before confirmation it showed the owner's exact words, the
   Career destination and dated entry it would create, and that it would not
   assume the next step, starting point or evidence. After confirmation Career
   showed `More money` byte-identical, under Career, with every named unknown
   still unknown. No amount, horizon, Money interpretation or second meaning
   appeared.
4. Now then asked for current energy instead of inventing work. **Enough**
   produced the walk. CASE B pressed **Can't right now** and read the repaired
   note before answering: it said the cause would be kept on its area and could
   be taken back, with no claim about a future recommendation.
5. **Can’t leave — someone’s in my care** produced the durable Health statement
   _“a walk means leaving, and I could not — someone was in my care”_ with **Not
   true any more**. Now's resume panel and the Health page said only what was
   recorded. There was no unsupported future-adaptation claim on the live path.

No screenshot artifact was added. The evidence is the deployed DOM transcript,
the exact owner steps above, the live build identity, and the direct guard
counterexamples below.

### Round 2 repairs and acceptance result

| # | Result | Round 3 evidence |
| --- | --- | --- |
| 1. A destination changes the recommendation in Career, Health and Money | **PASS** | From **The first evening**, the unchanged baseline was _Move for 25 minutes: a walk_. A Health destination _Build sustainable strength_ with next step _Lift twice each week_ first promised that the app would suggest it on evenings with capacity, then produced _Get some movement in: Lift twice each week_ under identical **Enough** input, chosen over the walk. Career and Money's independent counterfactuals pass in the focused synthetic gate. |
| 2. A completed session, completed course and milestone are distinct; attendance is not capability | **PASS** | After **Start it → Only part of it**, the complete Timeline row read **Part done / Got part of the way — getting out for a walk**. The domain progress rung, naturally completed course and owner-set milestone distinctions pass in the focused synthetic and three-width browser paths. |
| 3. Goal, routine, person, place, skill and obligation are ordinarily authorable | **PASS** | All six controls were present on every cold-store domain page; the focused synthetic journey builds each from empty and the browser matrix exercises the confirmation contract. |
| 4. The second agenda asks for later-useful information and grows quieter | **PASS** | CASE A preserved the vague answer and its unknowns; the real weekly-obligation flow, later changed decision, skip budget and library-wide falling volume all pass in the focused synthetic/browser evidence. |
| 5. “Can't right now” learns a blocker when useful and stays silent when known | **PASS on the product path; standing guard FAIL is QA-84-011** | CASE B wrote the durable caregiving constraint with its withdrawal route and made no adaptation claim. The known and restorative silent paths pass. The rule intended to keep future copy honest is not capable of enforcing the semantic class. |
| 6. Correction consequences and private permission | **PASS** | The four consequence previews, withdraw/re-date paths and private off/on/off structural behavior pass in the focused synthetic suite and at all three browser widths. |
| 7. Standing no-score guards | **PASS** | No score, percentage, rank, grade, readiness number, wellness composite or Life Score appeared on the cold-store, destination, progress, discovery, blocker, correction or private paths; the synthetic sweeps and privacy scan pass. |

QA-84-007 through QA-84-010 are closed by their own deployed reproductions.
Nothing was invented to fill the first screen, Health's confirmation and action
agree, the partial row is one coherent statement, and the blocker copy now says
only what is recorded and where.

### New Round 3 finding

#### QA-84-011 — the shared adaptation guard is still a phrase list with easy semantic escapes

**Severity:** Blocker. **Acceptance relationship:** standing copy guard, D-187,
D-192 and the explicit Round 3 attack requirement. **Type:** false-green test
architecture.

**Exact reproduction:**

```text
node --input-type=module -e "import {adaptationClaims} from './scripts/adaptation-claims.mjs'; const lines=['The app will choose a more suitable option.','The app will pick something else for you.','The app will use this when deciding what comes next.','The app will prefer an option that works indoors.']; for (const line of lines) console.log(JSON.stringify({line,claims:adaptationClaims(line)}));"
```

Every line is a plain promise that the app will adapt a future recommendation
because of the blocker. Nothing in the current engine performs any of them.
Every result is nevertheless `"claims":[]`.

The same failure is visible through nominal and passive forms:

```text
Future recommendations will take this into account.
The app remembers this for future recommendations.
Recommendations will be different next time.
```

All three also return `[]`.

**Source boundary:** `scripts/adaptation-claims.mjs:66-150` is three finite word
lists. `adaptationClaims()` at line 168 reports a claim only when one actor, one
listed modality and one listed adaptation verb occur inside a 60-character
window. The actor and modality are present in _“The app will choose a more
suitable option”_; the promise escapes solely because `choose` is absent from
`ADAPTATION_VERBS`. `pick`, `prefer`, `use`, `decide`, nominal
`recommendations`, and ordinary `future` phrasing supply siblings.

This is the same defect class as QA-84-010 one layer deeper. The old guards
listed remembered phrases. The replacement takes a cross-product of remembered
words and calls that the semantic class. `MUST_BE_CAUGHT` at line 209 proves the
six strings already anticipated, including the two that shipped, but has no
mutation or paraphrase boundary capable of disproving the list itself.

**Existing tests that give false confidence:**

- `tests/synthetic/destination-and-discovery.test.ts`, _“QA-84-010 — nothing on
  the blocker path claims the app will change what it offers”_, passes because
  it sends the current live strings through this matcher.
- `tests/browser/phase84.spec.ts`, _“QA-84-010 — the blocker note claims nothing
  the engine does not do”_, imports the same matcher and passes at all three
  widths for the same reason.
- `scripts/android-gate.mjs` imports the same matcher and reports _“the question
  promises no change the engine cannot make”_ while the matcher accepts the
  counterexamples above.
- The aggregate 1,841-test gate, the 690-case browser matrix and the 230-check
  Android gate are therefore simultaneously green over the same false negative.

This finding does **not** say the repaired live blocker copy is false; it is
honest. It says D-192's required protection does not hold, so a future copy edit
can restore the exact forbidden behavior while every standing gate remains
green.

### Mobile, verification and protected-scope result

No touch-target, horizontal-overflow, sticky-navigation, button-shift, console
or mobile interaction defect was found in the targeted flows.

| Gate | QA result |
| --- | --- |
| Aggregate `npm run verify` | **PASS** — 1,841 / 1,841 tests across 83 files; format, lint, typecheck and production build pass |
| Full browser matrix | **PASS — 690 / 690**, 230 at each of 360, 430 and 1,280px; one worker; 13.8 minutes |
| Deployed Android-style gate | **clean — 230 checks** against deployed `7810904`, using Node's system CA store |
| Privacy scan | **clean — 288 tracked files** |
| Block sweep and standing no-score guards | **PASS inside the aggregate suite** |
| D-192 adaptation copy guard | **FAIL by direct adversarial counterexample**; all three importing gates are false green |
| Checkpoint equivalence | **PASS** — deployed `7810904` is bundle-equivalent to `cdd9259` |
| CI at deployed head | **PASS** — workflow run `33175320902` completed successfully for `7810904` |
| Commits on no remote at QA start | **none** |

The protected scope remains intact. No product code was changed by QA; no
strategy evaluation, pattern-discovery engine, blocker enforcement, semantic
interpretation, new domain progression model, owner-routines library,
historical backfill, twelfth page, scoring change, visual language or
orchestrator change appeared. There is no `PHASE_85_*` file, and
`qa/WHOLE_APP_OWNER_USE_REVIEW.md` is unaltered.

---

## Complete next handoff — repair after Round 3 FAIL

**System:** Claude / builder.
**Model:** Claude, Opus-class.
**Intelligence level:** **Max** — this is the third audit-campaign repair and the
remaining defect is the semantic boundary of the guard written in the preceding
repair.
**Conversation:** **CURRENT** — return to the original routing 84 Claude builder
conversation, which owns this still-unresolved phase and its repairs.

```text
Routing Phase 84 repair after independent QA Round 3 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full. Round 3 is the independent QA
retest and is authoritative for this repair. Keep the Phase field exactly 84.

Keep routing 84 YELLOW. Do not start routing 90 and do not mark the phase GREEN.
Repair QA-84-011 under canonical plan section 42: reproduce it, identify the
whole semantic escape class, write a regression, prove that regression fails
when the defect is faithfully reintroduced, fix the root cause, and run the full
gate on the final tracked checkpoint.

The current live blocker copy is honest and QA-84-007 through QA-84-010 are
closed. Preserve them. The defect is that scripts/adaptation-claims.mjs returns
no claim for direct future-adaptation promises including:

- “The app will choose a more suitable option.”
- “The app will pick something else for you.”
- “The app will use this when deciding what comes next.”
- “The app will prefer an option that works indoors.”
- “Future recommendations will take this into account.”

Do not repair only those words by adding them to the existing lists. Establish
the whole class D-187 forbids and D-192 claims to guard, including ordinary
active, nominal and passive paraphrases; prove the exact reported escapes fail;
and prove honest present-tense recording/correction copy still passes. Keep one
authoritative guard shared by the synthetic, browser and Android gates.

Preserve every Round 3 product PASS and every explicit deferral, especially the
first-run abstention and ordinary routes, all eleven empty Life areas and domain
controls, Health's confirmation-to-recommendation agreement, the complete
partial Timeline row, the honest live blocker copy and caregiving withdrawal
route, course/recurrence/correction/private behavior, all no-score protections,
Fatherhood's untouched growth model, and the absence of blocker enforcement.

Run the clean aggregate gate, full browser suite at 360/430/1280, privacy scan,
block/copy sweeps, and deployed Galaxy-class Android gate. Deploy the repaired
checkpoint, prove checkpoint equivalence if documentation moves the deployed
SHA, append the builder's repair record and a complete Round 4 retest prompt to
this same QA report, and address that retest to the SAME Codex QA conversation
at High.

Do not create a PHASE_85_* file. Do not alter
docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md. Do not ask the owner to paste file
contents.
```

### Short launcher

**Model:** Claude, Opus-class. **Level:** Max. **Conversation:** CURRENT — the
original routing 84 builder conversation.

```text
Routing Phase 84 repair after independent QA Round 3 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the complete Round 3
repair handoff there exactly as written. Keep Phase 84 YELLOW; do not start
routing 90. Do not ask me to paste the file contents.
```
