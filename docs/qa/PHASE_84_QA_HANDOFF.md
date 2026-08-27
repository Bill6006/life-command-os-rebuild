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
| Product checkpoint      | `994284a` — the commit the aggregate gate was run on (D-147, D-180)    |
| Documentation head      | this file, and the routing 84 record in `PHASE_STATUS.md`              |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/            |
| Owner-visible behaviour | **changed** — Now, Life, and every domain page                         |
| Owner phone check       | required before GREEN                                                  |
| QA report path          | this file                                                              |

Confirm the deployed SHA against the checkpoint before testing. `node
scripts/checkpoint-equivalence.mjs 994284a --deployed
https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
reports post-checkpoint changes and whether any is bundle-relevant; D-097 asks
for equivalence rather than literal SHA equality, and the same script now also
reports commits on `HEAD` that no remote branch contains (D-180).

**One thing worth knowing before you run it.** The first attempt at this
checkpoint, `b76ce91`, was pushed with two files unformatted — the decision log
and the new browser spec — because `npm run verify` was run and then those two
files were edited. CI found it in under a minute and `994284a` is the repair.
That is D-180's own failure mode occurring one phase after the rule was written,
and it is recorded here rather than tidied away.

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** The
paths below are for step 2 onward. `README.md` is explicit about why: a reviewer
who reads the decision log before opening Now already knows what a destination
panel is *supposed* to mean, and this phase's whole subject is whether the
screen means anything to somebody who does not.

1. `docs/PRODUCT_ADJUDICATION.md` section 8 — the phase and its seven-item gate;
   section 11 is the do-not-change list
2. `docs/DECISION_LOG.md` **D-161 … D-169, D-173**, then **D-177 … D-185**
3. `docs/CANONICAL_REBUILD_PLAN.md` sections **11**, **21**, **22**, **43A**,
   **54**, **62**
4. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` — findings **F01, F02, F04, F05,
   F07, F10, F11, F13, F19, F26, F30, F32, F35, F36** and evidence entries
   **E04–E13, E16–E19, E22, E24, E28, E30, E32–E36**. This file is not edited
   by anyone.
5. `docs/PHASE_STATUS.md` — the routing 84 section, and the routing 83 section
   above it whose enumerated brief is this phase's scope
6. `docs/DEFECT_LEDGER.md` — **DEF-0115 and DEF-0116**, both found by the
   builder's own gate and both the same class (D-183): a guard that reads
   source and could not see correct code

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
| `src/features/life/Discovery.tsx`         | New. The second agenda, on Life.                                                                              |
| `src/features/life/LifeScreen.tsx`        | Renders it above the courses.                                                                                 |
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
3. **Whether the second agenda is a form.** Two a week is the budget; the shape
   of it on screen is a labelled box with a Save and a Not now, and F04's own
   complaint is about exactly that shape appearing where a conversation belongs.
4. **The sixth button.** `Got some of it done` joined a row of five that
   D-052 requires to be always drawn. Check the row does not wrap into a
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
| `npm run verify`, clean checkout          | **PASS** on `994284a`                                      |
| Unit / contract / synthetic / adversarial | **1,804 passed** in 83 files (1,765 in 82 before)          |
| Browser, 360 / 430 / 1,280, one worker    | **BROWSER_LINE**                                           |
| Privacy scan                              | **clean, 283 tracked files**                               |
| Block sweep and copy guards               | **PASS** — 72 cases across five files, unchanged           |
| Android-style gate, deployed              | **ANDROID_LINE**                                           |
| CI at the checkpoint                      | **CI_LINE**                                                |
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

Product checkpoint: 994284a. Confirm the deployed build against it first.

Write your findings into docs/qa/PHASE_84_QA_HANDOFF.md from Round 1 on. The
builder does not edit your rounds and you do not change product code.

Do not ask me to paste file contents.
```
