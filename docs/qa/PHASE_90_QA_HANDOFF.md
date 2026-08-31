# Phase 90 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 90 — canonical Phase 9: visual coherence, motion, mobile refinement

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 90 builder, and not any routing 84
conversation.
**Model:** Codex.
**Reasoning level:** **High** — never Max, which is Claude's level and stops the
orchestrator when it appears in a Codex block.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

---

## Build submitted

| Fact                    | Value                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| Product checkpoint      | `c6e0b3a` — the commit the gate was run on (D-147)                     |
| Documentation head      | `2c45b29` — the first deploy of this checkpoint; a later docs commit moves it |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/                  |
| Owner-visible behaviour | **changed** — Now, every domain page, Insights, and the shared surface system |
| Owner phone check       | **required before GREEN, and it is this phase's canonical gate**              |
| QA report path          | this file                                                                    |

Confirm the deployed SHA against the checkpoint before testing:

```bash
node scripts/checkpoint-equivalence.mjs c6e0b3a --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
```

D-097 asks for equivalence rather than literal SHA equality; the checker reports
post-checkpoint changes and whether any is bundle-relevant. A further
documentation commit moves the head again and that is not a reason to refuse to
test.

`node scripts/release-integrity.mjs` verifies the served bytes against the
manifest (D-211, QA-84-064). Run it against the deployed Preview.

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** The
paths below are for step 2 onward. `README.md` is explicit about why: a reviewer
who reads the design record before opening Now already knows what a marker is
*supposed* to mean, and will read the screen as confirming it.

1. `docs/CANONICAL_REBUILD_PLAN.md` sections **54** (this phase), **24** (visual
   design contract), **25** (motion), **37** (mobile and accessibility), **22**
   (scores and forecasts)
2. `docs/DECISION_LOG.md` **D-230 … D-237** (this phase's decisions), then the
   standing guards **D-162, D-129, D-018, D-052, D-075, D-087, D-167, D-176,
   D-181, D-193** and **G-009**
3. `docs/PRODUCT_ADJUDICATION_2.md` **§6.1** (the two QA tracks and the
   time-advance mechanism) and **§6.2** (this phase's contract)
4. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` **section 11.8** — the ten acceptance
   questions, **run here for the first time**. This file is not edited by anyone.
5. `docs/VISUAL_DESIGN_RECORD.md` — the design decisions and the accommodation
   table. **Read this last**, for the reason above.
6. `docs/PHASE_STATUS.md` — the routing 90 section
7. `docs/DEFECT_LEDGER.md` — **DEF-0150, DEF-0152, DEF-0153**

---

## The acceptance criteria this phase is judged against

From the dispatch in `docs/NEXT_PROMPT.md`, unchanged:

1. **Owner physical-phone approval.** The canonical gate. **Not satisfied by any
   viewport, emulator or screenshot** — including yours. Your Android-context
   pass is evidence for the owner's decision and is not a substitute for it.
2. **The structural accommodation list is intact** — all nine canonical rows plus
   the six added by the second adjudication, each reserved and **none built**.
3. **The owner-use review's section 11.8 acceptance questions run for the first
   time.** They are research criteria, not an implementation checklist: the
   answer to most of them today is *no*, and what QA is asked for is an honest
   reading of which the product can demonstrate and which it cannot.
4. **The time-advance instrument is proved independently of every product
   claim** — block, day and week boundaries, from a fresh store, with no QA
   laboratory.
5. **The standing guards still bite**, proved by reintroduction where a guard
   exists: no score, percentage, share, bar, rank, grade or readiness figure
   about the owner or about Adaya; no wellness composite; no Life Score; the
   child copy guard unchanged; D-167's permission still off by default; nothing
   aggregating across the six emotional dimensions.
6. **The normal required gates**: full suite, browser matrix at 360/430/1280, the
   Android-style pass, privacy scan, checkpoint equivalence, release integrity
   against the manifest (D-211), CI green, clean worktree.

---

## What changed, stated as changes rather than as claims about them

Nothing below asserts that any of it is correct. That is what steps 2 and 3 of
the protocol are for.

| Where                                                           | What changed                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/ui.tsx` / `ui.css`                              | `Panel` gains a `tone` prop (`plain` \| `quiet`); new `ObjectKind` marker component and `.kind` class; `.panel` shadow `--shadow-2` → `--shadow-1`; `.rows__row` stacks below 30rem; new `arrive` keyframe and `.arrives` / `.settles` classes. |
| `src/features/life/DomainPanels.tsx`                            | New `StandingControls` (shared with Now) and `DestinationPart`. The destination renders four parts always, with an unstated one marked. Milestones and rungs carry `ObjectKind`. `destination-missing` unchanged. |
| `src/features/life/DomainPage.tsx` / `.css`                     | Coverage panel uses `StandingControls`; new "What the app is working out here" panel; `tone="quiet"` on coverage-when-calm, learning and Recently; goals row uses `ObjectKind`; new `.destination*`, `.milestone*`, `.rung*` classes; trailing row control no longer wraps. |
| `src/features/now/NowScreen.tsx`                                | New coverage-response panel under the decision, drawn only for a `coverage` limiter, using the same `StandingControls` and writing the same two records as the Life page. |
| `src/features/insights/InsightsScreen.tsx` / `.css`             | "Still gathering" is `tone="quiet"` and renders the shared `GatheringList`; its CSS moved to `evidence.css` as `.gathering*`.                     |
| `src/features/evidence/EvidencePieces.tsx` / `evidence.css`     | New shared `GatheringList`.                                                                                                                      |
| `src/intelligence/insights.ts`                                  | `GatheringLine` carries an optional `domain`; `staleBeliefCard` returns its parts; new `staleBeliefCards` grouping at `STALE_BELIEFS_BEFORE_GROUPING = 3`. |
| `src/intelligence/destinations.ts`                              | `DestinationReading` gains `stated` (four booleans); `evidence` and `unknowns` render a not-said sentence when empty; `missingParts` derives from the same conditions. |
| `src/domain/horizon.ts`, `intelligence/vocabulary.ts`, `arbitrate.ts`, `explain.ts` | One `describeDuration`, defined in `horizon.ts` and re-exported from `vocabulary.ts`; `arbitrate.freeTime` and the premise both use it. |
| `src/domain/records.ts`                                         | `describeFactValue` renders a duration through `describeDuration`; `factValuesEqual` compares durations by `minutes` rather than by rendered text. |
| `src/features/life/domainPages.ts`                              | `DomainPageData` gains `gathering`, filtered from `insightsFor(situation).gathering`.                                                             |
| `src/domain/time.ts`                                            | One comment: the ambient-clock guard is named as `tests/unit/architecture-guards.test.ts` (DEF-0150).                                             |
| `src/features/life/DomainPage.css`, `qa/QaScreen.css`, `shell/AppShell.css` | Four uses of the never-defined `--border-subtle` and `--edge` repaired (DEF-0152).                                                    |

**No scoring weight, dimension or threshold moved.** No generator, constraint,
evaluator or arbitration path changed. `QUESTIONS_PER_DAY` and
`DISCOVERY_PER_WEEK` are unchanged.

---

## What was added to the instrument

| File                                        | What it holds                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `tests/browser/phase90-clock.spec.ts`       | Package 90.0. Block, day and week boundaries under `page.clock`, fresh store, no laboratory; and a self-scan that fails if the file reaches for one. |
| `tests/browser/phase90.spec.ts`             | Hierarchy, kinds, rungs, overflow, touch targets, the no-score rules on re-typeset surfaces, and motion — all read from **computed** values in the running page. |
| `tests/synthetic/accommodation.ts`          | The fifteen accommodation rows as data.                                                              |
| `tests/synthetic/phase90-accommodation.test.ts` | Two falsifiable claims per row: reserved, and not built.                                         |
| `tests/synthetic/phase90-audit-findings.test.ts` | AUD-0038(a), AUD-0038(b), AUD-0043 and AUD-0044.                                                 |
| `tests/unit/architecture-guards.test.ts`    | New: every `var(--name)` read resolves to a definition somewhere in `src/**` (DEF-0152).             |

**Two existing guards were changed, and both changes are worth checking:**

- The **F40 placeholder guard** counted `domain-correction__note` in
  `DomainPage.tsx` and expected 2. One of the two controls moved into
  `DomainPanels.tsx` when it was shared with Now, so the guard now reads both
  files. The rule is unchanged — two free-text corrections, each saying what
  happens to the answer.
- The **touch-target guard** treated `@media (min-width: 26rem)` as a control
  sized by hand and failed on the first responsive breakpoint in the repository.
  It now excludes `@media` / `@container` lines, and a new sibling test proves
  the narrowing still catches `min-height: 44px` on a control.

**Verify both narrowings yourself.** A guard relaxed by the conversation whose
change tripped it is exactly the thing an independent reviewer exists to check.

---

## Verification the builder ran

Facts, not conclusions. Re-running a green suite to watch it go green again buys
nothing (`README.md`, step 2); these are here so a discrepancy between them and
what QA observes is itself a trigger.

| Gate                                      | Result                                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `npm run verify`, clean checkout          | PASS                                                                |
| Unit / contract / synthetic / adversarial | **1,895 passed** in 87 files (1,861 in 84 before)                   |
| Browser, 360 / 430 / 1,280, one worker    | **761 of 762**, 254 per width — see the note below (708 before)                         |
| Privacy scan                              | clean, 304 tracked files                                            |
| Android-style gate                        | **clean — 233 checks** (183 at routing 83)                          |
| Release integrity against the manifest    | clean — 8 files served byte for byte as verified (`c6e0b3a`)        |
| Checkpoint equivalence                    | bundle-equivalent; no files changed between `c6e0b3a` and HEAD      |
| CI and deployed Preview                   | **success** — Verify and Deploy preview both green (run 33427826197)  |

> ### The one browser failure, and why it is not being called a pass
>
> The full matrix reported **761 passed, 1 failed**. The failure was
> `data.spec.ts:106 › reaching Data › lives behind More rather than in the
> navigation` — `page.goto: net::ERR_ABORTED`, a thirty-second navigation
> timeout. The spec passes 27 of 27 in isolation on the same build.
>
> This is the flake `playwright.config.ts` documents in its own comments: the
> single `vite preview` process drops connections, and *"failures which merely
> look like product failures cost real time."* An earlier full run on the same
> source hit the same error on a **different** test (`shell.spec.ts:128`), which
> is what a connection drop looks like and is not what a product defect looks
> like. CI runs with `retries: 1` and absorbs it.
>
> **It is reported rather than rounded off.** A builder who writes "762 passed"
> because a re-run came back green has told QA something that did not happen,
> and the whole point of this handoff is that QA can check these numbers against
> its own.

> ### The deploy, and how to re-verify it
>
> `c6e0b3a` was pushed after the gate was run. CI run **33427826197** is green on
> both jobs, and the Preview serves **`2c45b29`** — the documentation commit that
> records the numbers above. `checkpoint-equivalence.mjs` reads the deployed SHA
> live and reports **bundle-equivalent**: three files changed between `c6e0b3a`
> and `2c45b29`, all of them documents, none bundle-relevant. D-097 asks for
> equivalence rather than literal SHA equality, and a further documentation
> commit moving the head again is not a reason to refuse to test.
>
> **Release integrity is clean — 8 files served byte for byte as verified.**
>
> ### Run integrity with CI's manifest, not with one you built
>
> `release-integrity.mjs` defaults to `dist/release-manifest.json`, and a
> locally-built `dist` is a **different build**: `build-info.json` embeds the
> commit and the build time, so `index.html` references differently-hashed
> assets and every digest legitimately differs. Run it that way and it reports
> four 404s and two mismatches, which look exactly like the defect QA-84-064 was
> written about and are not one.
>
> The manifest to use is the one the gate uploaded, which is also the provenance
> D-211 requires — a check that only ever runs beside the thing it checks is the
> shape of the problem rather than the fix:
>
> ```bash
> gh run download 33427826197 --name preview-manifest --dir /tmp/m
> node scripts/release-integrity.mjs https://bill6006.github.io/life-command-os-rebuild/preview/ --manifest /tmp/m/release-manifest.json
> ```

**Reintroduction proofs the builder ran** (each is a claim you can repeat):

- Remove the `fastForward` calls from `phase90-clock.spec.ts` → the block, day
  and week boundary tests all fail.
- Return `stale.map(entry => entry.card)` unconditionally from
  `staleBeliefCards` → AUD-0044's regression fails, naming `long-run @ +200
  days: 4 × stale-assumption`, which is the audit's own reproduction.
- Restore `about ${Math.round(usable.value)} minutes free` in `explain.ts` → the
  premise regression fails.
- Return `[]` from `gatheringFor` → AUD-0043's regression fails.
- Add `const romantic = true` anywhere in `src/` → the accommodation check fails
  on row B5.
- Add `color: var(--nobody-defined-this)` to any stylesheet → the new token
  guard names the file and the property.
- Wash out `--ground-deep` in `tokens.css` → the palette test fails on AA, on the
  accent-as-link rule, and on D-230's quiet-tier rule.
- Return `` `${count} done — 40% of the way there.` `` from `progressSentence`
  → **five** standing guards fail, including *routing 84 item 7 — no score about
  the owner, anywhere*. This is acceptance item 5's reintroduction, run on the
  guard this phase was most at risk of breaking.
- Remove the `fastForward` from the week test only → that boundary fails while
  the block and day tests still pass, which is what says the three are
  independent rather than one assertion in three costumes.

---

## Where the builder thinks the risk is, stated as places to look rather than as reassurance

These are the parts of the change that would be hardest for the builder's own
tests to catch, offered so QA can spend its attention well. **None of them is a
claim that the rest is correct.**

1. **The phone.** Everything in this phase is a judgement about how a screen
   reads, and every assertion in the suite is a rule about what it may not do.
   No test can tell the owner whether the result is bland, cave-like, overly
   technical or lifeless, and section 24 says the gate fails on that even when
   the CSS tests pass.
2. **The quiet tier's effect on a real history.** It is applied where the app is
   reporting what it has not settled. On a history where most panels qualify,
   the page could read as uniformly recessed — which would be card soup again,
   one shade down.
3. **Whether the object markers help or clutter.** Eight kinds is a vocabulary
   the owner has to learn. On a page with several of them the markers may add
   more noise than hierarchy.
4. **The destination's four-always rows.** This is more on screen than before.
   Check it does not read as a form to complete — the failure mode is the owner
   feeling behind on a thing he has not been asked for.
5. **The grouped stale-belief card.** It carries no `belief` key, so the
   per-belief correction is not on it. Confirm the correction is still reachable
   where the belief is actually stated, and that the group naming the oldest is
   enough.
6. **Now's coverage response.** A new panel on the screen section 6 keeps
   uncluttered. Check it does not read as a chore, and that pressing *"I've been
   keeping on top of this"* writes what the Life page writes.

---

## Explicit deferrals, unchanged

The **nineteen deferred Phase 84 instrument-hardening findings** (D-210,
`qa/INSTRUMENT_HARDENING_BACKLOG.md`) are untouched and still open. They may not
be edited, removed or renumbered by any QA round, and re-finding one of them is
not a routing 90 defect.

---

## The ordinary-owner QA contract for this phase (§6.2)

From a fresh store on a real phone, with **no `#/qa` and no fixture seeding**:

reach Now → answer a discovery question → author a destination in one domain and
a milestone under it → receive a move that serves it → start it → be interrupted
→ come back → complete it → answer the outcome question → **advance a day** and
confirm the same move does not read as already done (D-160's defect, on the
phone this time) → confirm the domain page shows the milestone unreached. Then
repeat the first half in a second domain and confirm Life reads as direction
rather than recency.

## The synthetic contract

The full copy catalogue at every rendered branch; the block sweep; three widths
plus the Android context; long-history render performance; and **the
accommodation list asserted as reserved shapes rather than as built features.**

---

## Rounds 1 onward — independent QA

_This section and everything below it belongs to Codex. The builder does not
edit it._
