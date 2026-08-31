# Next prompt

**Phase:** 90 — **canonical Phase 9: visual coherence, motion, mobile refinement**

**Actor:** Claude Code / **builder**.
**Conversation:** NEW — a fresh Claude builder conversation. Routing 84 is GREEN and closed; this is a new phase (D-092, `qa/README.md` conversation rule).
**Model:** Claude Opus 5.
**Reasoning level:** **Max** — the audit-repair campaign classification in `qa/README.md` covers every phase created by its adjudication, and this is one.

---

## Read these first, in this order

1. `docs/CANONICAL_REBUILD_PLAN.md` **section 54** — this phase's canonical scope and gate. Also **section 43A** (the routing map and the monotonic-integer rule), **section 22** (scores and forecasts), **sections 24 and 25** (visual design contract, motion), **section 37** (mobile and accessibility).
2. `docs/DECISION_LOG.md` **D-212 … D-229** — the roadmap and the eight settled owner decisions. Then the standing guards this phase must not break: **D-162** (a destination is described, never scored), **D-129**, **D-018**, **D-052**, **D-075**, **D-087**, **D-167**, **D-193**.
3. `docs/PRODUCT_ADJUDICATION_2.md` **§6.2** — the accommodation extension and the time-advance instrument, as approved.
4. `docs/qa/README.md` — the independent QA protocol. **You may not approve your own phase.**

**Routing 90 is not gated by any campaign hold.** `docs/CAMPAIGN_HOLDS.md` declares D-172 against **routing 97** only.

---

## What this phase is

Visual design began earlier; **this phase performs whole-product coherence.** Routing 84 built the product contract — a destination, a milestone, seven progress rungs, a create-and-confirm control, a second questioning surface, the inability question, two correction gestures and one owner permission — and **none of it has a visual language yet.** That was deliberate: routing 84 was not allowed to spend this phase's budget. Re-typesetting it is the work.

**The gate is the owner's physical phone.** Not a viewport, not a screenshot.

---

## Work packages

### 90.0 — The ordinary-owner time-advance instrument · **first, and gated on its own**

**Build this before any product claim rests on it.** Bundling an unproven instrument with the product whose acceptance depends on it is routing 82's failure pattern — instrument and product failing together with no way to tell which.

The whole product reads the wall clock in exactly **one** place: `systemClock().now()` at `src/domain/time.ts:576`. `MemoryProvider` captures the moment with `useState(() => clock.now())` and re-reads it on defined events. So Playwright's **`page.clock`**, installed _before_ `page.goto`, then `fastForward` plus a reload, moves the entire product's moment deterministically.

- **No `#/qa`, no `loadInQa`, no fixture seeding, no `travelTo`** — `travelTo` is a laboratory control (`QaScreen.tsx:160`) and must not be used here.
- Prove the clock moves the product's moment across **a block boundary, a day boundary and a week boundary**, from a fresh store.
- **Its acceptance is separate from every product acceptance item below.**

This is D-161 extended from record-kind reachability to **screen** reachability: a capability is proved in a browser that has never opened the QA laboratory.

### 90.1 — Whole-product visual coherence

Canonical section 54's review list, in full: hierarchy; spacing; typography; surface depth; contrast; motion; mood; copy; repeated components; phone density; navigation; private-domain discretion; empty states; error states.

**Anti-pattern review, rejecting:** submarine panel; cave; gamer UI; developer dashboard; card soup; massive empty dark spaces; endless tiny metrics; pastel wellness.

### 90.2 — Typeset what routing 84 shipped

Each of these exists, is reachable from a near-empty store, and has no visual language:

- **A destination** per life area, four parts, any of which may be absent — and **an absent part reads as unstated**, never as zero (G-009).
- **A milestone** — a goal that names its destination (D-181). It must read as a different thing from a goal and from a completed session, and it is reached **only when the owner says so**.
- **Seven rungs of progress evidence** — attempt, part-done, completion, quality, retained-capability, transfer, milestone — each with its own sentence and its own statement of what it is _not_ evidence of. A completed session, a completed course and a milestone are three different things on the page.
- **One create-and-confirm control** for a goal, routine, person, place, skill and obligation, showing the interpretation the owner agrees to and what the app will not assume.
- **A second questioning surface** on Insights, with its own weekly budget, always skippable, able to show what an answer changed.
- **One optional question after "Can't right now"**, and a way back to an interrupted or half-finished move.
- **Two correction gestures** on a recorded event — withdraw and re-date — each stating its consequence before it acts.
- **One owner permission** on the Private page, off by default (D-167).

> **The no-score rule binds every one of them.** No percentage, share, bar, rank, grade or readiness figure about the owner or about Adaya, and a destination must not become a score through the back door. **A phase whose subject is visual coherence is the second place a number arrives looking reasonable** — the first was the phase that built the objects. D-162 and section 22.

### 90.3 — Structural accommodation · **reserve the shape, build none of it**

Passing the phone gate on a design that forecloses one of these re-opens a passed gate later. Canonical section 54's nine rows stand unchanged:

a course of action carrying a **review status and a verdict sentence** · a tradeoff clause naming a **longer horizon** inside Q9's one-additional-clause budget, not a second card · a **recurring constraint** the owner can see and dismiss, on the domain page · a held intention resolving to **fulfilled, missed or expired** · a **maintenance-versus-advancement distinction in the reason line**, not a chart · an evidence card carrying a **competing explanation and an open question** · domain pages composing a **destination section with an existing progression object** · a compact **reentry state** after a long absence · a restrained **"why am I being asked this?"** affordance, no dashboard and no score.

**Six further rows, from the settled owner decisions (D-216 … D-227):**

1. **A cross-domain re-file option** inside a confirmation block — one option row, not a picker screen. Routing 91 needs it; this phase only leaves room.
2. **An expectation-and-reconciliation line** on an evidence surface: what the app expected, and what happened (D-219, routing 96).
3. **A destination that is not moving**, readable as a state of the destination rather than as a new card — and **pull-only in its domain's tier** (D-216).
4. **The six emotional dimensions as six independently-unknown readings**, with no arrangement in which they could be summed or averaged (D-166, D-221).
5. **A twelfth domain page** in navigation — Love / Dating / Romantic Life (D-168). Designed even though it is built at routing 94.
6. **A fifth correction gesture** — _"the record is incomplete here"_ — alongside withdraw and re-date, stating its consequence before it acts (D-218).

**And one refinement rather than a new row:** the existing _"why am I being asked this?"_ affordance must be able to carry a **provenance answer**, because under D-222 a research prior may aim a question and must be answerable for. It may never render as a claim about the owner.

### 90.4 — AUD findings assigned to this phase

**AUD-0038(a) and (b)**, **AUD-0043**, **AUD-0044** — the visual-phase members of the audit's own assignment. AUD-0044's stale-belief grouping is also the mechanism behind accommodation row 8's reentry state.

### 90.5 — DEF-0150 · one-line incidental correction

`src/domain/time.ts:562` cites `tests/unit/no-ambient-clock.test.ts`. **That file does not exist**; the ambient-clock guard is real and lives in `tests/unit/architecture-guards.test.ts`. **Correct the comment to name the real file. Nothing else.**

It is in scope here only because package 90.0 rests on that guard being real — it is, and only its name is wrong. **This is a comment fix. Do not turn it into architectural work, do not move the guard, and do not widen it.**

---

## Acceptance gate

1. **Owner physical-phone approval.** The canonical gate, and it is not satisfied by any viewport, emulator or screenshot.
2. **The structural accommodation list is intact** — all nine canonical rows plus the six above, each reserved and none built.
3. **The owner-use review's section 11.8 acceptance questions run for the first time.**
4. **The time-advance instrument is proved independently of every product claim** — block, day and week boundaries, fresh store, no QA laboratory.
5. **The standing guards still bite**, proved by reintroduction where a guard exists: no score, percentage, share, bar, rank, grade or readiness figure about the owner or about Adaya; no wellness composite; no Life Score; the child copy guard unchanged; D-167's permission still off by default; nothing aggregating across the six emotional dimensions.
6. **The normal required gates**: full test suite, browser matrix at 360/430/1280, the Android-style pass, privacy scan, checkpoint equivalence, release integrity against the manifest (D-211), CI green, and a clean worktree.

---

## What this phase must NOT do

- **No semantic capture.** Reading owner text for meaning is **routing 91** and must not be pulled forward. `destinationRecords()` keeps `draft.aim.trim()` and the prompt's own domain.
- **No new concept, no new vocabulary, no registry reach.** That is routing 92.
- **No new conclusions from evidence.** Routing 93.
- **No new domain built** — the twelfth is designed in navigation only; building it is routing 94.
- **No advancement register, no "closer" sentence, no scaffolding guidance.** Routing 94 and 95.
- **No named expectation and no reconciliation.** Routing 96.
- **No inference mechanism.** Routing 97, and it is held by D-172.
- **No scoring change of any kind.** Routing 82 re-cut the instrument and re-baselined the tournament (D-137, D-138); this phase must not disturb either.
- **No change to `QUESTIONS_PER_DAY`** and no new asking channel.
- **Phases 1 through 84 are not reopened.**

---

## When you believe it is complete

The phase becomes **YELLOW — READY FOR INDEPENDENT QA**, never GREEN. **A builder conversation may not approve its own phase** (D-077).

In that same response, without being asked, provide: phase status; checkpoint SHA; deployed Preview SHA and whether they match; exact verification counts; known, open and deferred items; the recommended **Codex** model and reasoning level for QA — **a middle level, and never Max, which is not a Codex level**; the conversation instruction (**NEW**); the exact QA report path `docs/qa/PHASE_90_QA_HANDOFF.md`; and the complete QA prompt written into that file.

End with the four lines and the launcher (D-092).

**Do not write a completion marker into this file until this dispatch is actually finished.**

---

# Dispatch complete — routing 90 is built and submitted

**Written by the routing 90 Claude builder conversation.** Everything above is
the dispatch as it was received and is unchanged. This section records what was
done against it.

**Phase status: YELLOW — READY FOR INDEPENDENT QA.** Never GREEN. A builder
conversation may not approve its own phase (D-077), and this phase's canonical
gate is the **owner's physical phone**, which no automated result satisfies.

## The six work packages

| Package  | What was delivered                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **90.0** | `tests/browser/phase90-clock.spec.ts` — block, day and week boundaries under `page.clock`, from a fresh store, no laboratory. Gated on its own and proved by reintroduction. |
| **90.1** | Surface-weight axis, elevation reserved for the decision, phone density, motion, and the explicit anti-pattern review (design record section 3).                             |
| **90.2** | Destination, milestone, seven rungs, courses, the authoring control, corrections and the permission all typeset; `ObjectKind` is the shared vocabulary.                      |
| **90.3** | Fifteen accommodation rows as a machine-checked table — each **reserved**, and **none built**.                                                                               |
| **90.4** | AUD-0038(a), AUD-0038(b), AUD-0043, AUD-0044 — each with a regression that fails when the defect is reintroduced.                                                            |
| **90.5** | DEF-0150: one comment now names the guard's real file. Nothing else.                                                                                                         |

## The checkpoint and its gates

| Fact                                      | Value                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Product checkpoint                        | `c6e0b3a`                                                               |
| `npm run verify`, clean checkout          | PASS                                                                    |
| Unit / contract / synthetic / adversarial | **1,895 passed** in 87 files (1,861 in 84 before)                       |
| Browser, 360 / 430 / 1,280, one worker    | **761 of 762** — one `ERR_ABORTED` navigation flake, green in isolation |
| Privacy scan                              | clean, 304 tracked files                                                |
| Android-style gate                        | **clean — 233 checks**                                                  |
| Release integrity against the manifest    | clean — 8 files served byte for byte as verified (`c6e0b3a`)            |
| Checkpoint equivalence                    | bundle-equivalent; no files changed between `c6e0b3a` and HEAD          |
| Worktree                                  | clean                                                                   |
| CI and deployed Preview                   | **green** — run 33427826197; the Preview serves `2c45b29`               |

**The deploy.** `c6e0b3a` was pushed after the gate was run, on the owner's
instruction. CI run **33427826197** is green on both Verify and Deploy preview,
and the Preview serves **`2c45b29`** — the documentation commit carrying the
numbers above. `checkpoint-equivalence.mjs` reads the deployed SHA live and
reports bundle-equivalent: the three files that changed are all documents.
**Release integrity against the deployed bytes is clean — 8 files served byte
for byte as verified**, checked with the manifest CI uploaded rather than with a
local build, which is the provenance D-211 requires.

**Independent QA can begin.** The Preview serves this checkpoint's bundle, so
step 1 of the protocol — cold use of the deployed app — is now a reading of
routing 90 rather than of routing 84.

## What the phase did not do

No semantic capture (91). No new concept or vocabulary (92). No new conclusion
from evidence (93). No twelfth domain built — designed in navigation only (94).
No advancement register and no "closer" sentence (94, 95). No named expectation
and no reconciliation (96). No inference mechanism (97, held by D-172). No
scoring change of any kind. No change to `QUESTIONS_PER_DAY`. Phases 1 through 84
are not reopened.

## Open and deferred, unchanged

The **nineteen deferred Phase 84 instrument-hardening findings** (D-210,
`docs/qa/INSTRUMENT_HARDENING_BACKLOG.md`) are untouched and still open.
Re-finding one of them is not a routing 90 defect.

## Two defects found by the review itself

**DEF-0152** — `--border-subtle` and `--edge` are read by four declarations and
defined nowhere, so three borders never rendered. Fixed, and guarded by a link
step for the design system. **DEF-0153** — the "Not right?" control rendered as
two lines beside every entry in a list at 360 pixels. Fixed and measured.

## The next handoff

The complete QA prompt is written into **`docs/qa/PHASE_90_QA_HANDOFF.md`**,
Round 0. It carries the checkpoint, the acceptance criteria, what changed stated
as changes, the reintroduction proofs to repeat, the ordinary-owner and synthetic
contracts, and the places the builder thinks the risk is.

- **Model:** Codex — independent QA, per D-090. The builder is Claude; the
  reviewer must not be.
- **Reasoning level:** **High** — a middle level. **Never Max**, which is
  Claude's level and stops the orchestrator when it appears in a Codex block.
- **Conversation:** **NEW** — not this builder conversation, and not any routing
  84 conversation.

```
Read docs/qa/PHASE_90_QA_HANDOFF.md in full, in the repository at
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild, and execute
Round 0's brief exactly as written. This is the independent QA handoff for
routing phase 90. Do not ask for the file to be pasted.
```

<!-- LCO_COMPLETE -->
