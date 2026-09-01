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

---

## Round 1 independent QA — FAIL

**Phase:** routing Phase 90, the Phase 9 visual-coherence gate.
**Product checkpoint tested:** `c6e0b3a1d50f84e0da6e6c5a2eb5bd11d359ca24`.
**Deployed documentation head tested:**
`ab85c7706cb7080031138e99b936f8e40d11651b`, bundle-equivalent to the product
checkpoint. The only changed paths are `docs/NEXT_PROMPT.md`,
`docs/PHASE_STATUS.md` and this handoff.
**Live CI run:** `33430068556`, successful; its downloaded preview manifest
matched all eight live files byte for byte.
**Android configuration:** deployed Preview, 360 × 780 CSS pixels, DPR 3,
touch/mobile enabled, Android 14 / Galaxy S24-style `SM-S921B` user agent.

**Overall verdict: FAIL. Routing Phase 90 remains YELLOW.** The visual system,
clock matrix, structural accommodations, release artifact and ordinary gate
suite are substantially sound. The sealed owner journey nevertheless fails
the phase's explicit two-domain Life contract, one of the named object-kind
proofs is a false green over the wrong rendered markers, and the first legal
grouping boundary renders owner-facing evidence that contradicts its own
count. The required physical-owner phone approval also remains outstanding.

### Governing criteria

I applied the handoff's ordinary-owner and synthetic contracts; canonical-plan
§§54, 24, 25, 37 and 22; D-230 through D-237; D-162, D-129, D-018, D-052,
D-075, D-087, D-167, D-176, D-181 and D-193; G-009; adjudication §§6.1 and
6.2; all ten owner-use questions in owner review §11.8; the complete visual
design record; routing-90 status and dispatch; DEF-0150, DEF-0152 and DEF-0153;
and the current D-218/D-222 accommodation dispatch.

The current dispatch governs the apparent old §6.2 row-label discrepancy:
D-218's fifth correction is structural accommodation B6, while D-222
provenance is refinement B7. That is not a defect.

### Sealed cold ordinary-owner journey

The journey began in an empty owner context on the deployed Preview at 360 ×
800. I did not open `#/qa`, seed a fixture or inspect implementation before the
journey.

1. On Now, I answered the discovery question with **Enough**.
2. In Health, I authored destination **Move comfortably through a full day**
   and milestone **Walk three times this week**.
3. Now offered **Get some movement in: Walk three times this week**, with the
   reason **Serves the goal you set**.
4. I started it, navigated away, returned and found it still **Under way**.
5. I completed it. Timeline recorded the completion, and I answered the
   outcome question **Enough**.
6. Health still correctly showed the milestone as **Still ahead**: completing
   one move was not presented as completing the milestone.
7. In Career, I authored destination **Move into a networking role** and
   milestone **Finish the CCNA study plan**.
8. I opened Life. It still showed only recency/coverage groups — **Recent** and
   **Nothing here yet** — and neither authored direction appeared.

The start/interruption/return/completion path and the distinction between a
finished move and an unreached milestone pass. The required second-domain
conclusion fails. Advancing a day without making the just-completed move read
as already done is covered by the passing D-160 regression, but the owner
phone execution of that step remains outstanding with the rest of the
physical-phone gate.

### QA-90-001 — Life still reads as recency after two authored directions

**Severity:** Blocker. **Class:** behavioral / phase acceptance.
**Governing contract:** the ordinary-owner contract in this handoff and the
direction-over-recent-life intent in canonical plan §54.

**Exact reproduction**

1. Begin from a fresh deployed owner store without laboratory data.
2. Author a destination and milestone in Health.
3. Start and complete the goal-serving Now move; answer its outcome question.
4. Author a second destination and milestone in Career.
5. Open Life.

**Actual:** Life groups domains solely as **Recent** and **Nothing here yet**.
Neither **Move comfortably through a full day** nor **Move into a networking
role** is rendered, so the screen still reads as coverage/recency.

**Expected:** after two domains have owner-authored direction, Life must make
that direction legible rather than continuing to read only as recency.

**Implementation evidence:** `src/features/life/LifeScreen.tsx:102-110` builds
every Life group from `DomainCoverage` via `standingFor`; the screen memo at
`LifeScreen.tsx:168-169` supplies only `coverage.domains`. No destination or
milestone state participates. `tests/browser/shell.spec.ts` proves the current
coverage/recency grouping, but contains no two-domain direction journey. A
repository search for the governing two-domain phrase finds only this handoff,
not an executable regression.

This is not a styling preference. It is the final assertion of the phase's
named ordinary-owner contract and fails on the deployed checkpoint.

### QA-90-002 — the three-object-kind proof passes without those three kinds

**Severity:** Blocker. **Class:** semantic visual contract plus false-green
instrument.
**Governing decisions:** D-231 and the explicit acceptance requirement that a
session, a course and a milestone are not represented by the same glyph.

**Exact reproduction**

1. Open the deployed controlled long-history scenario **Nine months of
   evenings**.
2. Open Career and inspect the rendered object-kind labels around its progress
   ladder.
3. Run the browser test named **a session, a course and a milestone are three
   different things** unchanged.

**Actual:** the controlled page exposes two `.kind` labels, both **Evidence**.
`src/features/life/DomainPanels.tsx:495` assigns `kind="evidence"` to every
progress rung, including the row whose visible measure is **Sessions done**.
Although `src/components/ui.tsx` declares a `session` kind, no production use of
`<ObjectKind kind="session">` exists.

The test at `tests/browser/phase90.spec.ts:172-199` passes because it only
requires `kinds.length > 0` and then proves that every marker has the same
color, size and weight. It never requires **Session**, **Course** or
**Milestone**, never proves three distinct marker texts/shapes, and therefore
passes over `[Evidence, Evidence]` — the opposite of its title.

**Expected:** the fixture and assertion must actually reach all three named
object kinds and prove their distinct semantic markers while keeping the
settled restrained styling. The production surfaces must use the matching
semantic marker for each named object rather than labeling sessions as generic
evidence.

This blocks the visual-coherence gate because a specifically named coherence
claim has no honest proof and the deployed controlled screen demonstrates the
collapsed semantics.

### QA-90-003 — the first stale-belief grouping boundary says three are four

**Severity:** Blocker. **Class:** owner-facing semantic copy plus boundary
false green.
**Governing decisions:** D-232, D-235 and the full rendered-branch requirement.

`src/intelligence/insights.ts:1354` sets
`STALE_BELIEFS_BEFORE_GROUPING = 3`, and line 1386 groups at that threshold.
The grouped evidence explanation at line 1436 is nevertheless hard-coded as:
**four cards saying the same thing about four different subjects**.

**Exact bounded reproduction**

1. Load the controlled long-run history.
2. Remove only records whose domain list contains `social`, leaving exactly
   three independently stale belief subjects.
3. Advance the trusted clock by 200 days and compute the grouped insights.
4. Inspect the first `belief_check` group and its evidence reasoning.

**Actual:** the group headline begins **3 things the app is still going on**,
its comparable-evidence count is `3`, but its owner-facing explanation says
**four cards** and **four different subjects**.

**Expected:** every legal branch must state the count it actually groups, or
use truthful count-neutral language.

I created this probe only after the sealed journey, ran it against production
modules, and removed it before the final tree checks. The existing synthetic
audit reaches a four-item long-run case and checks grouping/headline/detail,
but never asserts the evidence explanation or the exact threshold of three;
it therefore gives false confidence at the first legal branch.

### Visual, responsive and mobile findings

No independent overflow, clipping, tap-target, typography or dark-theme defect
reproduced at 360, 430 or 1280. The sealed 360 × 800 screenshots and DOM
inspection showed a coherent live Now, domain and Life shell. The Android-style
deployed run completed **233 checks** cleanly. F40 is genuinely narrowed to the
two named authored textareas, and the touch-target guard genuinely narrows to
the authored `min-height: 44px` declaration rather than accepting arbitrary
numeric coincidences.

Those PASSes do not cure QA-90-001 through QA-90-003. A simulated viewport and
Galaxy-style browser context also do not substitute for the handoff's required
physical-owner phone use. That gate was not performed in this independent
environment and remains **OUTSTANDING**; Phase 90 cannot become GREEN without
the owner's separate approval even after the blockers are repaired.

### Phase-90 acceptance criteria

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| 1. Physical-owner phone gate | **OUTSTANDING / blocking** | Independent deployed 360 and Android-style runs passed technically; no physical owner approval was supplied. |
| 2. Accommodation table is structural only | **PASS** | A1-A9 and B1-B7 are asserted as reserved shapes; no deferred accommodation is presented as built. |
| 3. Ten owner-review acceptance questions are run honestly | **PASS as review; several product answers remain partial/no** | Results are recorded below without converting synthetic evidence into ordinary-owner proof. |
| 4. Trusted clock before navigation, both pairs at three widths | **PASS** | `phase90-clock.spec.ts` creates a fresh context, installs `page.clock` before `goto`, and passes block/day plus week/day at 360, 430 and 1280. |
| 5. Narrowed guard + named visual/semantic checks | **FAIL** | F40, touch targets, score-language exclusion, permission provenance and grouped-card structure pass. The named session/course/milestone proof is false green, and the 3-item grouped branch contradicts itself. |
| 6. Normal gates + responsive browser + Android-style gate | **PASS mechanically; phase FAIL behaviorally** | All automated gates are green, demonstrating why the three acceptance defects require stronger regressions rather than being waived. |

### Whole-app owner-review §11.8

| # | Acceptance question | Honest Round 1 answer |
| --- | --- | --- |
| 1 | Can it learn a desired outcome not pre-modeled? | **Yes, demonstrated.** The cold owner authored previously unknown Health and Career outcomes. |
| 2 | Can it help make a vague goal concrete without commandeering it? | **Partial / no.** The owner can author a milestone, but this journey did not show the app helping concretize vagueness beyond presenting fields. |
| 3 | Can it distinguish completion from progress? | **Yes, demonstrated.** The move completed while the milestone remained **Still ahead**. |
| 4 | Can a recurring blocker change approach while preserving the goal? | **No demonstration.** Existing safety wording correctly avoids promising adaptation, but the required adaptive behavior was not shown. |
| 5 | Does the guide avoid pretending it knows the answer, and does volume fall as certainty rises? | **Partial.** The cold language did not claim certainty; the declining-volume claim is synthetic/contract evidence, not months of this owner's use. |
| 6 | Can one meaningful cross-domain relationship be found? | **Synthetic only.** Controlled history can surface a relationship; the ordinary cold journey did not. |
| 7 | Can patterns influence decisions and later be reevaluated? | **Partial / synthetic.** A goal-serving move used known direction, but later reevaluation was not demonstrated in ordinary use. |
| 8 | Can an interrupted or changed life be revised humanely? | **Partial.** An interrupted active move resumed correctly; a broader life-change revision was not demonstrated. |
| 9 | Are corrections easy, and is private data permissioned? | **Yes at the shipped contract level.** Owner-authored direction remains editable and provenance/permission defaults are guarded. |
| 10 | Can the owner see what they are becoming over months without a score? | **No.** The deferred advancement-register / months view is not shipped, and no score is substituted for it. |

### Full verification on the restored tree

Every temporary probe was removed before these final checks.

| Gate | Result |
| --- | --- |
| Fresh deployed ordinary-owner journey | **FAIL** at the required two-domain Life conclusion; preceding author/start/resume/complete/outcome/milestone distinctions passed |
| Checkpoint equivalence | **PASS** — live `ab85c77` is bundle-equivalent to product checkpoint `c6e0b3a`; only three routing docs differ |
| Live artifact integrity | **PASS** against CI run `33430068556` — eight files byte-for-byte; the older product-checkpoint manifest correctly does not describe the later docs deploy |
| `npm run verify` | **PASS** — format, lint, typecheck, test, build, release manifest and rendered-copy scan |
| Unit / contract / synthetic / adversarial | **1,895 passed** in 87 files |
| Rendered-copy scan | **clean — 8,147 shipped strings**, 8,061 placed in a build-graph module, 1 script chunk, 2 stylesheets |
| Browser, three widths, one worker | **762 passed** in 23.6 minutes — 254 each at 360, 430 and 1280; zero failures |
| Deployed Android-style gate | **clean — 233 checks** |
| Privacy scan | **clean — 304 tracked files** |
| CI for deployed head | **PASS** — run `33430068556` |
| QA probe cleanup | **PASS** — no temporary source, test or artifact remains |

### Automated tests that gave false confidence

- `tests/browser/shell.spec.ts` explicitly proves coverage/recency groups, but
  never creates two owner-authored directions and never asks whether Life
  reflects them. It stays green while QA-90-001 reproduces.
- `tests/browser/phase90.spec.ts:172-199` is titled for session/course/milestone
  distinction, but accepts any non-empty homogeneous marker list. It stays
  green over `[Evidence, Evidence]`.
- `tests/synthetic/phase90-audit-findings.test.ts` validates a four-item grouped
  case and the threshold constant, but does not render a three-item group or
  assert its evidence reasoning. It stays green while the legal three-item
  branch says four.

These are test adequacy findings tied to reproduced product/semantic failures,
not a request to chase coverage percentage.

### Explicit deferrals preserved

The nineteen D-210 Phase 84 instrument-hardening findings remain untouched,
open and identically numbered. `docs/qa/INSTRUMENT_HARDENING_BACKLOG.md` remains
blob `58d5af071355d252c4a254fc685fcc9e8e88f417`. None of QA-90-001 through
QA-90-003 is a renamed deferred item. Phase 10/11 work, the advancement
register, richer explainability, adaptation promises, longitudinal
personalization and every other named future item remain deferred exactly as
the handoff requires.

### Overall verdict and repair requirement

**FAIL. Routing Phase 90 remains YELLOW.** Do not promote to GREEN and do not
start the next phase. The builder must reproduce all three failures exactly
before repair; identify each whole failure class; make Life communicate
owner-authored direction after the second domain without regressing honest
coverage; make the three object kinds semantically real and prove the named
three rather than any markers; make every legal grouped-belief count truthful;
and add regressions that fail when each defect is deliberately reintroduced.

Then rerun the aggregate gate, complete three-width browser matrix, clock pairs,
copy/semantic guards, deployed Android-style gate, privacy scan, live artifact
integrity and CI; deploy a repaired checkpoint; preserve every passing behavior
and every deferral; and dispatch Round 2 to this same Codex QA conversation at
High. Physical-owner phone approval remains a separate necessary gate and must
not be fabricated by automation.

---

## Round 1 FAIL — complete builder repair handoff

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.
**Intelligence level:** **Max** — this is an audit-repair campaign across an
ordinary-owner behavior contract, semantic object identity and a rendered
branch boundary.
**Conversation:** **CURRENT** — the original routing 90 Claude builder
conversation.

```text
Routing Phase 90 repair after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_90_QA_HANDOFF.md in full. Round 1 at the end contains three
new Blockers, QA-90-001 through QA-90-003. Execute the Round 1 repair handoff
exactly as written.

Keep Phase 90 YELLOW. Before changing implementation, reproduce each exact
failure and explain its whole class:

1. From a fresh ordinary-owner store, create direction and milestones in two
   domains. Life still renders only coverage/recency groups and neither
   direction. Repair Life so the settled two-domain contract reads as
   owner-authored direction without inventing claims or regressing honest
   coverage and empty states.
2. The deployed controlled Career surface renders `[Evidence, Evidence]`, and
   the test called "a session, a course and a milestone are three different
   things" passes because it asserts only a non-empty homogeneous marker list.
   Make session, course and milestone semantically distinct production object
   kinds and make the regression actually reach and assert all three named
   kinds while preserving the restrained shared visual system.
3. `STALE_BELIEFS_BEFORE_GROUPING` is 3, but the legal three-item group explains
   itself as "four cards" about "four different subjects". Repair the entire
   grouped-count class so every rendered cardinality is truthful, including the
   exact threshold boundary, and assert owner-facing evidence reasoning.

For each blocker, add an honest regression and prove it by deliberately
reintroducing the defect. Do not merely change the test title, fixture or
threshold to make the existing assertion pass. Preserve the clock-before-
navigation proof, narrowed F40/touch-target guards, accommodation-as-structure
table, all passing owner-flow distinctions, all privacy/provenance behavior,
all nineteen D-210 deferrals and every other explicit deferral.

Run `npm run verify`, the full three-width one-worker browser matrix, both
trusted-clock pairs at all three widths, the full rendered-branch/copy guards,
privacy scan, deployed Android-style gate, CI and live byte-for-byte artifact
integrity. Deploy the repaired checkpoint, append the repair and verification
evidence here, keep Phase 90 YELLOW, and dispatch Round 2 to the SAME Codex QA
conversation at High. The physical-owner phone gate remains outstanding and
must not be represented as automated approval.

Do not edit QA's Round 1, alter
docs/qa/INSTRUMENT_HARDENING_BACKLOG.md, put a completion marker in another
handoff, start the next phase or ask me to paste file contents.
```

### Short launcher

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.
**Intelligence level:** Max.
**Conversation:** CURRENT — the original routing 90 Claude builder conversation.

```text
Continue routing Phase 90 after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_90_QA_HANDOFF.md in full and execute the complete Round 1
repair handoff at its end exactly as written. Do not ask me to paste the file.
```
---

## Round 1 repair — the builder's response

**Written by the routing 90 Claude builder conversation.** QA's Round 1 above is
untouched, and nothing in it has been edited, renumbered or answered in place.
**Phase 90 remains YELLOW.**

All three blockers were reproduced before anything was changed, and each repair
carries a regression proved by putting the defect back. QA was right about all
three, and right about the more uncomfortable part: **two of the three were
false greens in regressions this conversation wrote.**

### QA-90-001 — Life now reads as direction, and still reads as coverage

**Reproduced.** From a fresh store, authoring a destination and milestone in
Health and again in Career, Life rendered only **Recent** and **Nothing here
yet**. Neither aim appeared anywhere on the screen.

**The class.** Every group on Life is built from `DomainCoverage` through
`standingFor`, which answers *how recently has anything come in*. That is a true
and useful reading. The defect was that it was the **only** reading, so the
screen could not answer the question the phase's own contract ends on — and no
amount of restyling it would have.

**The repair.** A `Where you are heading` panel above the coverage groups,
listing each authored destination with the owner's aim rendered verbatim, the
area it belongs to, and the next unreached milestone where he named one.

- **It is presentation, not a second brain.** It reads
  `situation.direction.destinations` from the same `assembleSituation` the
  coverage groups come from. D-075's constraint — one coverage computation,
  presentation only — is untouched, because there is still one reading of the
  history and it is now shown twice over.
- **Nothing here is authored by the app.** The aim is his words byte for byte,
  the milestone is his goal statement. There is no verb of the app's own, no "on
  track", no count of filled-in parts — so there is nothing that could become a
  score through the back door (D-162).
- **Absent, not empty.** With no destination anywhere the panel does not render,
  so a first run and every history in the shipped library look exactly as they
  did. That is asserted, not assumed.
- **Reached milestones leave rather than becoming a notice.** What is next is
  direction; what is done is history, and Timeline and the domain page already
  carry it. Congratulating him on the size of his own work is not the app's to
  do (D-223).

**Regression:** `tests/browser/phase90-round1.spec.ts` — the two-domain journey
QA walked, from a genuinely empty store through the owner's own controls, with
no `#/qa`; plus the milestone-reached case and the absent-not-empty case.
**Proved:** short-circuiting the panel fails both direction tests.

### QA-90-002 — the object kinds are semantically real, and the union is closed both ways

**Reproduced.** `long-run` Career rendered `[Evidence, Evidence]`, including the
rung whose visible measure is **Sessions done**. `session` was declared in the
union, named in the acceptance criterion, described in the design record — and
used by no surface in the product.

**The class, which is wider than the one rung.** A shared vocabulary whose
members all resolve to one word is a label, not a vocabulary. The cause was a
literal `kind="evidence"` applied to every rung — a default that was right for
five of seven and wrong for the two that the acceptance criterion is about.

**The repair.**

- `RUNG_KIND` is an exhaustive `Record<ProgressEvidence, ObjectKindName>`:
  `completion → session`, `milestone → milestone`, the other five → `evidence`,
  which is the honest word for evidence *about* an object rather than the object
  itself. A `Record` rather than a switch with a default, so an eighth rung is a
  **compile error** instead of a rung that silently inherits the generic marker.
- `correction` was the other declared-but-unused kind — the same shape — and now
  marks the correction gesture when it opens. It is on the gesture rather than
  on the row, because the row is his history and only the gesture is a
  correction.
- The styling is unchanged: the markers now say different words and still carry
  no difference in colour, size or weight, because coloured markers on progress
  objects read as a ranking of them (D-231).

**Regressions:** a browser test that requires **Session**, **Milestone** and
**Destination** by name on one page and still requires uniform styling; and a
source guard applying D-193's both-directions rule to the vocabulary — nothing
rendered that is not declared, **nothing declared that is not rendered**.
**Proved:** reverting `completion` to `evidence` fails four tests across the two
files.

> #### A limitation this repair does not remove, reported rather than left to be found
>
> > **CORRECTED AT ROUND 2 — this claim was false.** The shipped **Two sessions
> > in** history reaches a finished course as soon as the owner completes its
> > final session, and `phase84.spec.ts` has driven that flow since routing 84.
> > The probe behind the claim below only advanced the clock, and a course does
> > not finish because time passes. See QA-90-004 and the Round 2 repair. The
> > original text is left standing as the record of what was claimed.
>
> **No history in the shipped library reaches a finished course, at any point in
> time.** A course is a finished thread; probing every scenario at its own
> moment, +30 days and +200 days finds none. So the third of section 54's three
> named objects cannot be put on a live page by any fixture, and the browser
> regression proves **Session** and **Milestone** rather than all three.
>
> `course` is not unreachable in the product — an owner who finishes a thread
> gets one, and `progress.ts` reads it — but it is unreachable in the
> *instrument*, which means the acceptance sentence *"a completed session, a
> completed course and a milestone are three different things on the page"* has
> no end-to-end proof available today. The source guard covers that the marker
> exists and is used; it does not cover a rendered page.
>
> This is the same class as the defect QA found, one step out, and the builder
> is not in a position to decide it is acceptable. **QA and the owner should
> judge whether routing 90 needs a fixture that finishes a course**, or whether
> it is honest to carry the gap forward with the claim narrowed.

### QA-90-003 — every grouped cardinality is generated, not written

**Reproduced.** `STALE_BELIEFS_BEFORE_GROUPING` is 3; at exactly three the
headline read *"3 things the app is still going on"* above an explanation
reading *"four cards ... four different subjects"*.

**The class: a rendered cardinality written as a literal.** It was correct on
the day it was written, against the one case anybody had looked at — the audit's
four-card wall — and silently wrong at every other size. A swept the module for
the same shape; this was the only sentence asserting a count it did not compute.

**The repair.** The sentence is generated from `stale.length`, like the headline
and the comparable count beside it.

**Regression:** every legal size from three to eight, asserting that **every
sentence the card renders** states only numbers it is entitled to — and it is
split, because the headline and detail report real ages while the reasoning
reports none. That split is not tidiness: with one permissive rule, at size
three the true ages are two, three and four months, so a hard-coded "four" sits
inside the allowed set and the defect passes. The first draft did exactly that.
**Proved:** restoring the literal fails at sizes three, five, six, seven and
eight.

### Verification on the repaired tree

| Gate | Result |
| --- | --- |
| `npm run verify`, clean checkout | **PASS** |
| Unit / contract / synthetic / adversarial | **1,902 passed** in 88 files (1,895 in 87 at Round 1) |
| Browser, 360 / 430 / 1,280, one worker | **780 passed**, 260 per width — zero failures (762 at Round 1; this phase added 18) |
| Trusted-clock pairs, all three widths | **PASS** — block, day and week, unchanged |
| Blocker / rendered-copy guards | **PASS** — `phase84.spec.ts` 39 of 39; copy scan clean, 8,171 shipped strings |
| Privacy scan | clean — 304 tracked files |
| Android-style gate | **clean — 233 checks** |
| Release integrity, live bytes | clean — 8 files served byte for byte as verified |
| CI and deployed Preview | **success** — run `33454199293`, both jobs; the Preview serves `1047765` itself |
| Physical-owner phone gate | **OUTSTANDING** — not automated, and not fabricated here |

**Preserved, and checked rather than asserted:** the clock-before-navigation
proof; the narrowed F40 and touch-target guards; the accommodation table as
structure; every passing owner-flow distinction; privacy and provenance
behaviour; and the nineteen D-210 deferrals, untouched and identically numbered.

**Round 1's own PASSes are unchanged.** No overflow, tap-target, typography or
dark-theme defect was introduced: the direction panel reuses the existing area
rhythm, and the object markers changed their word and nothing else.

---

## Round 1 repair — retest dispatch to independent QA

**Model:** Codex.
**Reasoning level:** **High** — a middle level, and never Max, which is Claude's
and stops the orchestrator when it appears in a Codex block.
**Conversation:** **SAME** — the Codex conversation that ran Round 1, which owns
this file's rounds and already holds the reproductions.

**Phase 90 is still YELLOW.** Nothing here promotes it, and the physical-owner
phone gate is still outstanding and still not automated.

### What to retest

| Fact | Value |
| --- | --- |
| Repaired checkpoint | `1047765` |
| Deployed | `1047765` at the time of writing. **Read it live** — this round's own docs commit moves the head without changing the bundle, which is what `checkpoint-equivalence.mjs` is for (D-097). |
| Round 1 checkpoint, for comparison | `c6e0b3a` |

```bash
node scripts/checkpoint-equivalence.mjs 1047765 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
gh run download 33454199293 --name preview-manifest --dir /tmp/m
node scripts/release-integrity.mjs https://bill6006.github.io/life-command-os-rebuild/preview/ --manifest /tmp/m/release-manifest.json
```

### The three reproductions to run again first

Each should now fail to reproduce. Run them the way Round 1 did rather than the
way this repair describes them.

1. **QA-90-001.** Fresh deployed owner store, no laboratory. Author a
   destination and milestone in two domains, complete the goal-serving move,
   then open Life. Both aims should be on the screen. Then check the halves this
   repair could have broken: a store with **no** destination must look exactly
   as it did — coverage groups, no empty heading — and the coverage reading
   itself must be unchanged.
2. **QA-90-002.** Open a controlled long history, open Career, and read the
   markers. The rung labelled *Sessions done* should say **Session**. Then
   confirm the restraint survived: different words, identical colour, size and
   weight.
3. **QA-90-003.** Build a three-item stale group as you did before and read the
   grouped card's evidence reasoning. Every number in it should be three.

### Where this repair is most likely to be wrong

Offered so the retest can spend its attention well. None of it is a claim that
the rest is correct.

- **Life's new panel is the biggest change and the least tested by a person.**
  It is above the coverage groups, which is a deliberate claim that direction
  outranks recency on that screen. Read it as an owner: does it help, or is it a
  second thing to scroll past? Section 54's density and D-075's "not homework"
  are the standards, and neither is settled by an assertion.
- **On a store with many authored destinations** the panel grows one row each.
  Nothing caps it. Whether eleven directions read as a page or as a wall is a
  judgement no test here makes.
- **`life-direction-next` disappears when a milestone is reached.** That was a
  deliberate choice — what is next is direction, what is done is history — but it
  means a reached milestone leaves Life silently. Check that is not read as the
  aim itself having gone away.
- **`Session` now appears where `Evidence` did.** Confirm nothing else regressed
  in that swap, particularly on Fatherhood, where the growth surfaces read the
  same rungs.

### The gap this repair reports rather than closes

**No history in the shipped library reaches a finished course**, at its own
moment, +30 days or +200 days. A course is a finished thread and none finishes.
So section 54's *"a completed session, a completed course and a milestone are
three different things on the page"* has **no end-to-end proof available**: the
regression proves Session and Milestone on a rendered page and proves the
`course` marker only at source.

That is the same class as QA-90-002 one step out — a named object with no
reachable instance — and it is not the builder's to wave through. **QA and the
owner should decide** whether routing 90 needs a fixture that finishes a course,
or whether the claim is carried forward narrowed and stated.

### Verification the builder ran on the repaired tree

Repeated here so a discrepancy between these numbers and QA's own is itself a
trigger.

| Gate | Result |
| --- | --- |
| `npm run verify`, clean checkout | PASS |
| Unit / contract / synthetic / adversarial | **1,903 passed** in 88 files |
| Browser, 360 / 430 / 1,280, one worker | **780 passed** — zero failures |
| Privacy scan | clean, 304 tracked files |
| Android-style gate | clean — 233 checks |
| Release integrity | clean — 8 files byte for byte |
| Format / lint / typecheck | clean |
| Worktree | clean |

### Short launcher

**Model:** Codex. **Reasoning level:** High. **Conversation:** SAME — the Round 1
QA conversation.

```text
Retest routing Phase 90 after the builder's Round 1 repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_90_QA_HANDOFF.md in full. The builder's repair round and the
retest dispatch are at the end. Re-run the three QA-90-001..003 reproductions
first, then the rest of the protocol, and append Round 2 to this file. Keep the
phase YELLOW unless you are recommending otherwise, and do not treat any
automated result as the owner's physical-phone approval. Do not ask me to paste
the file.
```

---

## Round 2 independent QA — FAIL

**Phase:** routing Phase 90, the Phase 9 visual-coherence gate.

**Repaired product checkpoint tested:**
`10477659d73d01bfc3e6f4ea49664e92f9928e7a`.

**Deployed documentation head tested:**
`b18008bf6d57bbc5e1244ede8d53ba0aa6c264b1`, bundle-equivalent to the repaired
product checkpoint. The only path changed between them is this handoff.

**Live CI run:** `33455815211`, successful; its downloaded preview manifest
matched all eight live files byte for byte.

**Android configuration:** deployed Preview, 360 x 780 CSS pixels, DPR 3,
touch/mobile enabled, Android 14 / Galaxy S24-style `SM-S921B` user agent.

**Overall verdict: FAIL. Routing Phase 90 remains YELLOW.** All three Round 1
product failures are repaired on the deployed application. QA-90-001 and
QA-90-003 have honest regressions. QA-90-002 passes when exercised by a person,
but the required rendered regression still does not prove the named three
objects: the old test accepts any markers and the new repair test deliberately
omits **Course**. That leaves the same acceptance claim capable of a false
green. The separate physical-owner phone approval also remains outstanding.

### Governing criteria and retest scope

I retained the settled Round 1 findings and reviewed only the builder's repair
and its first unfinished acceptance item. The governing material remains the
handoff's ordinary-owner and synthetic contracts; canonical-plan §§54, 24, 25,
37 and 22; D-230 through D-237; D-162, D-129, D-018, D-052, D-075, D-087,
D-167, D-176, D-181 and D-193; G-009; adjudication §§6.1 and 6.2; owner review
§11.8; the complete visual design record; routing-90 status and dispatch;
DEF-0150, DEF-0152 and DEF-0153; and the D-218/D-222 accommodation dispatch.

The decisive requirement is explicit in canonical-plan §54 and D-231: a
completed session, a completed course and a milestone are three different
things on the page. It is not enough for source types to exist or for a test
with that title to accept an arbitrary homogeneous marker list.

### Round 1 blocker retest

| Finding | Product result | Regression result | Round 2 disposition |
| --- | --- | --- | --- |
| QA-90-001 — Life omitted authored direction | **PASS** | **PASS** | Closed |
| QA-90-002 — named object kinds collapsed / false green | **PASS live** | **FAIL** — Course is not rendered or asserted | Continued as QA-90-004 |
| QA-90-003 — three-item group said four | **PASS** | **PASS** | Closed |

### QA-90-001 retest — PASS

I restored a valid empty owner backup through the ordinary Data UI, without
opening the laboratory. At deployed 360 x 800 I then:

1. answered the discovery question with Career aim **Move into a networking
   role**;
2. authored Career goal **Finish the CCNA study plan**;
3. authored Health destination **Move comfortably through a full day** and
   next milestone **Walk three times this week**;
4. accepted Now's goal-serving move **Get some movement in: Walk three times
   this week**, whose reason was **Serves the goal you set**;
5. started it, navigated to Timeline, returned to Now and found it still
   **Under way**; and
6. completed it, then opened Life.

Life now begins with **Where you are heading**, renders both verbatim Career
and Health aims, renders the unreached Health milestone, and retains the
coverage/recency groups below. On a restored empty store, the heading is absent
and the honest coverage groups remain. After marking the Health milestone
reached, the aim remains while only that domain's next-milestone line
disappears. Fatherhood's existing **Three times running** surface also retained
its Session/Evidence reading.

The builder's uncapped-list risk is not currently reproducible as an
eleven-direction wall: only the three currently proving domains — Health,
Career and Money — expose the destination control, and all three directions
remain readable at phone width. That observation does not waive a future
scaling concern if the control expands to more domains.

### QA-90-003 retest — PASS

Using a temporary QA-only production-module probe, I loaded the long-run
history, removed records whose domain list contained `social`, advanced the
trusted date by 200 days and evaluated the first grouped stale-belief card.
The headline began **3 things**, its comparable-evidence count was `3`, and its
reasoning said **3 cards** about **3 different subjects**. The focused
`phase90-round1-repairs` synthetic suite also passed all eight cases and covers
group sizes three through eight.

The temporary probe was removed before final verification. No probe source,
test, backup or generated evidence file remains in the repository.

### QA-90-002 product retest — PASS

On **Nine months of evenings**, Career's progress rungs rendered **Session**
and **Evidence** with identical restrained presentation: `rgb(141, 150, 170)`,
12 px and weight 600. I then used the shipped **Two sessions in** scenario,
started and completed its third and final session through Now, and returned to
Career. The page rendered:

- **Session** — Sessions done;
- **Course** — Courses finished; and
- the completed course label **subnetting**.

After authoring Career direction and a next milestone through the ordinary UI,
the same page rendered Destination, Milestone, Session and Course markers with
the same color, size and weight. The semantic product repair is therefore
correct and the course state is reachable without a new laboratory fixture.

### QA-90-004 — the named three-object regression still omits Course

**Severity:** Blocker. **Class:** phase-acceptance instrument / false green.

**Governing contract:** canonical-plan §54, D-231 and Round 1's explicit repair
requirement to make the regression reach and assert Session, Course and
Milestone.

**Exact reproduction**

1. Run the browser test titled **a session, a course and a milestone are three
   different things** in `tests/browser/phase90.spec.ts`.
2. Inspect its assertions: it requires only a non-empty `.kind` list and
   uniform color, size and weight. It never asserts any of the three words.
3. Run the repaired marker regression in
   `tests/browser/phase90-round1.spec.ts`. Inspect its explicit expected list:
   it proves **SESSION**, **MILESTONE** and **DESTINATION**, not **COURSE**.
4. Load **Two sessions in**, start and complete the final session in Now, then
   open Career. The ordinary page renders Session and Course. Authoring Career
   direction and a milestone places Milestone on that same rendered page.
5. Observe that `tests/browser/phase84.spec.ts` already drives the final-session
   flow and asserts the resulting session/course progress structures, although
   it does not assert their `.kind` text or visual equality.

**Actual:** both Phase 90 tests pass without ever requiring a rendered Course
marker. The original claim can still pass over the wrong object set, and the
new repair regression proves a different three-item set than the governing
acceptance requirement.

**Expected:** one rendered owner-flow regression must place Session, Course and
Milestone on the page together, assert those exact semantic marker words, and
assert their intentionally identical restrained style. Deliberately collapsing
any one of those three kinds must make that regression fail.

The builder's statement that no shipped history reaches a finished course is
incorrect. The live **Two sessions in** journey and the existing Phase 84
browser flow both reach one. `RUNG_KIND`'s exhaustive source guard is useful,
but source declarations and source-use checks cannot replace the rendered
acceptance proof. This finding is Phase 90's named acceptance claim, not one of
the nineteen general D-210 instrument-hardening deferrals.

### Visual, responsive and mobile findings

No independent overflow, clipping, tap-target, typography or dark-theme defect
reproduced. The repaired Life panel, empty state, reached-milestone state and
combined marker surface were inspected live at 360 x 800. The complete browser
matrix passed at 360, 430 and 1280, and the deployed Android-style gate
completed 233 checks cleanly.

These technical passes do not constitute the required physical-owner phone
approval. That gate was not performed in this environment and remains
**OUTSTANDING / blocking** even after QA-90-004 is repaired.

### Phase-90 acceptance criteria

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| 1. Physical-owner phone gate | **OUTSTANDING / blocking** | Deployed phone-width and Android-style technical checks passed; no physical-owner approval was supplied. |
| 2. Accommodation table is structural only | **PASS** | The repair did not convert reserved shapes or deferred accommodations into shipped claims. |
| 3. Ten owner-review acceptance questions are run honestly | **PASS as review; prior partial/no answers remain** | Round 1's recorded §11.8 answers remain the honest whole-app review; this narrow repair creates no basis to upgrade them. |
| 4. Trusted clock before navigation, both pairs at three widths | **PASS** | The full matrix passed the block/day and week/day pairs with `page.clock` installed before navigation in a fresh context. |
| 5. Narrowed guards plus named visual/semantic checks | **FAIL** | Product semantics, F40, touch targets, provenance and grouped cardinality pass; the rendered Session/Course/Milestone proof omits Course. |
| 6. Normal gates plus responsive browser and Android-style gate | **PASS mechanically; phase FAIL on acceptance** | All aggregate gates are green, which is why the remaining false-green acceptance test cannot be inferred away. |

### Full verification on the restored tree

These gates were run once against the repaired tree and are not rerun merely to
rewrite this QA document.

| Gate | Result |
| --- | --- |
| Round 1 exact product reproductions | **PASS** — QA-90-001, QA-90-002 product behavior and QA-90-003 no longer reproduce |
| Checkpoint equivalence | **PASS** — deployed `b18008b` differs from repaired product checkpoint `1047765` only in this handoff; no bundle-relevant path differs |
| Live artifact integrity | **PASS** — CI run `33455815211`, eight files byte for byte |
| `npm run verify` | **PASS** — format, lint, typecheck, tests, build, release manifest and rendered-copy scan |
| Unit / contract / synthetic / adversarial | **1,903 passed** in 88 files |
| Focused Round 1 repair synthetic suite | **8 passed** |
| Rendered-copy scan | **clean — 8,171 shipped strings**, 8,085 placed in a build-graph module, 1 script chunk, 2 stylesheets |
| Browser, three widths, one worker | **780 passed** in 17.3 minutes — 260 each at 360, 430 and 1280; zero failures |
| Trusted-clock pairs | **PASS** inside the matrix at all three widths, fresh store and clock before navigation |
| Deployed Android-style gate | **clean — 233 checks** |
| Privacy scan | **clean — 306 tracked files** |
| CI for deployed head | **PASS** — run `33455815211` |
| QA cleanup | **PASS** — all temporary QA material removed |

### Automated tests that still give false confidence

- `tests/browser/phase90.spec.ts` retains a title about Session, Course and
  Milestone while asserting only that some markers exist and share style.
- `tests/browser/phase90-round1.spec.ts` adds exact semantic assertions, but
  its three named markers are Session, Milestone and Destination. Course is
  absent.
- `tests/browser/phase84.spec.ts` already proves that the owner can finish the
  third session and obtain session/course progress. It does not assert marker
  text, but it disproves the premise that Course is unreachable and supplies
  the flow the Phase 90 acceptance regression needs.

The product behavior was manually proven correct. The defect is the executable
acceptance claim, not an invitation to change working product semantics.

### Explicit deferrals preserved

The nineteen D-210 Phase 84 instrument-hardening findings remain untouched,
open and identically numbered. The advancement register, richer
explainability, adaptation promises, longitudinal personalization, Phase 10/11
work and every other named future item remain deferred. QA-90-004 is not a
renamed deferred item: it is the still-incomplete direct repair of QA-90-002
and of this phase's explicit D-231 acceptance proof.

### Overall verdict and repair requirement

**FAIL. Routing Phase 90 remains YELLOW.** Preserve all three working product
repairs and every passing gate. Repair the whole false-green marker-test class:
make an owner-flow browser regression render Session, Course and Milestone
together; assert those exact words and their uniform restrained styles; and
prove the regression fails when each semantic marker is deliberately collapsed
to the wrong kind. Make the old misleading test honest — replace it, strengthen
it or retitle it so no green test claims an assertion it does not make.

No product-code change should be necessary unless the honest regression
reveals a new behavior defect. Rerun the aggregate, three-width browser,
trusted-clock, Android-style, privacy, integrity and CI gates after the repair;
deploy the resulting checkpoint; preserve all deferrals; and dispatch Round 3
to this same Codex QA conversation at High. The physical-owner phone approval
remains a distinct necessary gate and must not be fabricated by automation.

---

## Round 2 FAIL — complete builder repair handoff

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.

**Intelligence level:** **Max** — this remains an adjudication-created audit
repair campaign, now narrowed to a false-green rendered acceptance class.

**Conversation:** **CURRENT** — the original routing 90 Claude builder
conversation.

```text
Routing Phase 90 repair after independent QA Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_90_QA_HANDOFF.md in full. Round 2 at the end confirms that
all three Round 1 product defects are repaired, but continues QA-90-002 as the
single acceptance-instrument Blocker QA-90-004. Execute this Round 2 repair
handoff exactly as written.

Keep Phase 90 YELLOW. Preserve the working Life direction panel, semantic
RUNG_KIND implementation, generated grouped-card cardinality, all passing
owner-flow behavior, all clock/accommodation/privacy/provenance behavior and
every explicit deferral. Do not make a product change merely to satisfy the
test.

Repair the whole false-green marker-test class. The Phase 90 test titled "a
session, a course and a milestone are three different things" currently
asserts only that an arbitrary non-empty marker list shares color, size and
weight. The Round 1 repair test asserts SESSION, MILESTONE and DESTINATION, not
COURSE. Both pass without proving the governing §54/D-231 claim.

Use the already shipped ordinary path: load "Two sessions in", start and
complete its final session through Now, open Career, and author Career
direction/next milestone through ordinary controls as needed. The live product
and tests/browser/phase84.spec.ts already prove this flow reaches a finished
course. Build one rendered regression that places Session, Course and Milestone
on the page together, asserts those exact semantic marker words, and asserts
their intentionally identical restrained color, size and weight. Make the old
misleading test honest by replacing it, strengthening it or retitling it so no
test title claims evidence its assertions do not establish.

Deliberately reintroduce each collapse and show the new regression fails:
Course -> Evidence, Session -> Evidence, and Milestone -> a generic/wrong kind.
Restore the correct implementation afterward. Source exhaustiveness and
source-use guards may remain, but they do not substitute for the rendered
proof. Do not add a fixture solely to manufacture Course; the existing
ordinary scenario already reaches it.

Run npm run verify, the complete one-worker browser matrix at 360 / 430 / 1280,
both trusted-clock pairs at all three widths, the deployed Android-style gate,
privacy scan, CI and live byte-for-byte artifact integrity. Deploy the repaired
checkpoint, append the builder response and verification evidence to this
file, keep Phase 90 YELLOW, and dispatch Round 3 to the SAME Codex QA
conversation at High. The physical-owner phone gate remains outstanding and
must not be represented as automated approval.

Do not edit either QA round, alter
docs/qa/INSTRUMENT_HARDENING_BACKLOG.md, put the completion marker in another
handoff, start the next phase or ask me to paste file contents.
```

### Short launcher

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.

**Intelligence level:** Max.

**Conversation:** CURRENT — the original routing 90 Claude builder conversation.

```text
Continue routing Phase 90 after independent QA Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_90_QA_HANDOFF.md in full and execute the complete Round 2
FAIL builder repair handoff at the end. Preserve the repaired product; close
QA-90-004 by making the rendered browser regression actually prove Session,
Course and Milestone, including reintroduction failure evidence. Keep Phase 90
YELLOW, preserve all deferrals, and keep physical-owner phone approval
distinct. Do not ask me to paste the file.
```

<!-- LCO_COMPLETE -->
