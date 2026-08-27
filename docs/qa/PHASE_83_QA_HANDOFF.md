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
| Documentation head       | the commit that adds this file                               |
| Preview                  | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Owner-visible behaviour  | **changed** — Now, Timeline, the Private page, two domain-page controls |
| Owner phone check        | required before GREEN                                        |
| QA report path           | this file                                                    |

Confirm the deployed SHA against the checkpoint before testing. `node
scripts/checkpoint-equivalence.mjs 582f648 --deployed
https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
reports post-checkpoint changes and whether any is bundle-relevant; D-097 asks
for equivalence rather than literal SHA equality.

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
| Privacy scan                                    | clean, 262 tracked files                             |
| Android-style gate, deployed                    | see the line below                                   |

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
