# Phase 91 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 91 — semantic capture and clarification

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 91 builder, and not any routing 90
conversation.
**Model:** Codex.
**Reasoning level:** **High** — a middle level. Not Max, which is Claude's.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

---

## Build submitted

| Fact                    | Value                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| Product checkpoint      | `113bdb6` — the commit the gate was run on (D-147), and **the SHA the Preview is serving** |
| Documentation head      | this handoff, committed after the deploy; a later docs commit moves it again    |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/                    |
| Owner-visible behaviour | **changed** — the Insights discovery card, the aspiration form on every proving domain page, the destination object, and Timeline |
| QA report path          | this file                                                                      |

Confirm the deployed SHA against the checkpoint before testing:

```bash
node scripts/checkpoint-equivalence.mjs 113bdb6 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
```

D-097 asks for equivalence rather than literal SHA equality; the checker reports
post-checkpoint changes and whether any is bundle-relevant. A further
documentation commit moves the head again and that is not a reason to refuse to
test.

### Run release integrity with CI's manifest, never a local `dist`

`release-integrity.mjs` defaults to `dist/release-manifest.json`, and a
locally-built `dist` is a **different build** — `build-info.json` embeds the
commit and the build time, so every digest legitimately differs and it reports
404s and mismatches that look exactly like QA-84-064 and are not it.

```bash
gh run download 33497715688 --name preview-manifest --dir /tmp/m
node scripts/release-integrity.mjs https://bill6006.github.io/life-command-os-rebuild/preview/ --manifest /tmp/m/release-manifest.json
```

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** The
paths below are for step 2 onward. `README.md` is explicit about why: a reviewer
who reads the reasoning before opening the screen already knows what the app is
*supposed* to mean and will read the screen as confirming it.

1. `docs/ROUTING_91_BRIEF.md` — **sections 3 and 4**: the eight CASE A
   acceptance tests, and the seven rules any interpreter must obey. This is the
   gate.
2. `docs/PRODUCT_ADJUDICATION_2.md` **§6.3** (this phase's two contracts and its
   completion condition), **§6.1** (the two QA tracks and the time-advance
   mechanism), and **correction 3.6**, which is the gap package 91.2 exists to
   close.
3. `docs/DECISION_LOG.md` **D-240 … D-244** (this phase), then the standing
   guards **D-143, D-162, D-167, D-176, D-184, D-188, D-193, D-238** and
   **G-009**.
4. `docs/CANONICAL_REBUILD_PLAN.md` section **22** (scores and forecasts) and
   section **43A** (routing).
5. `docs/PHASE_STATUS.md` — the routing 91 section.
6. `docs/DEFECT_LEDGER.md` — **DEF-0154**.

---

## The acceptance criteria this phase is judged against

From the dispatch in `docs/NEXT_PROMPT.md`, unchanged. **All eight**, from a
fresh store, in a browser that has never opened `#/qa`, plus test 6 in **two**
domains.

1. **It reaches the right domain.** _"More money"_ typed under the Career prompt
   produces a proposal that names Money, or asks which.
2. **The words survive.** The stored aim is byte-identical, and any derived
   meaning is a separate row.
3. **Ambiguity is declared, not resolved.** `unknowns` names what was not
   concluded. An empty `unknowns` for a two-word aim is a failure.
4. **Exactly one follow-up, and it is concrete** — under the existing discovery
   budget. Not three.
5. **Declining costs nothing.** The aim survives; no derived record is written.
6. **Now changes.** A destination in the resolved domain produces a candidate
   where none existed.
7. **Cross-domain links are proposed, never asserted** — confirmable and
   reversible.
8. **Privacy holds.** With D-167 off, no private text reaches the interpreter —
   **proved by asserting the digest's contents rather than by reading copy.**

Plus the **ordinary-owner contract** (§6.3): fresh store, no laboratory; open
Insights, meet the Career aspiration question, type _"More money"_, and walk (a)
through (h) — including **(g) advance three days and confirm the interpretation
is not re-proposed**. Then the same journey in a second domain with a
differently-shaped phrase.

Plus the **synthetic contract**: byte-identity of stored wording across the copy
library; `provenance: 'derived'` on every derived row; a digest assertion that
private material is absent from the interpreter's input; adversarial phrases —
empty, whitespace, a single character, thousands of characters, mixed-domain,
contradictory; and the null case, where an unambiguous phrase produces **no**
clarification at all.

Plus **the normal required gates**: full suite, browser matrix at 360/430/1280,
the Android-style pass, privacy scan, checkpoint equivalence, release integrity
against the manifest (D-211), CI green, clean worktree.

---

## What changed, stated as changes rather than as claims about them

Nothing below asserts that any of it is correct. That is what steps 2 and 3 of
the protocol are for.

| Where                                       | What changed                                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/intelligence/interpret.ts` **(new)**   | The interpreter. `interpreterInput` assembles what it may read; `readAim` names an area or declines and says what the words did not say; `proposeInterpretedDestination` composes `proposeDestination`; `aimReadingRecord` / `withdrawAimReading` / `readingFor` are the derived row and its lookup. |
| `src/domain/records.ts` / `wire.ts`         | New record kind `aim-reading` — destination, `reads` (the id of the record holding his words), `named`, `askedIn`, `words`, `unknowns`, optional `withdrawn`. Encode and decode both sides.        |
| `src/domain/privacy.ts`                     | New `mayRaiseUnasked(privacy)` — *may the app bring this up when nobody asked?* — beside `mayReasonFrom` and `mayShowDetail`. Takes no permission argument, deliberately.                            |
| `src/intelligence/coverage.ts`, `insights.ts`, `situation.ts` | **Seven** in-place comparisons against the private class routed through the three named predicates — five permission-blind exclusions and two display placeholders. **No behaviour change intended at any of the seven.** Both counts in the governing documents (the brief's six, correction 3.11's five) are approximations; D-243 states what is actually there. |
| `src/intelligence/authoring.ts`             | New `milestoneQuestion(domain, aim)`, keyed on the same `MILESTONE_ENTITY` table as `milestoneEntityKind` and `describeMilestone`. `reviseDestinationRecord` gains an optional `domain`, reached by one gesture only. |
| `src/intelligence/discovery.ts`             | The next-step prompt takes the area's own wording where a reading stands, under the **same prompt id**; a clarification is hoisted above a fresh aspiration question. No prompt added or removed.   |
| `src/features/insights/Discovery.tsx`       | The reading line, two option rows, and the derived row written only when the offer is taken.                                                                                                        |
| `src/features/life/DomainPanels.tsx` / `DomainPage.tsx` / `.css` | The same reading and option rows on the aspiration form; the reading rendered as its own row on a destination, with the gesture that takes it back; **the domain form now shows `unknowns`, which it did not before.** |
| `src/features/life/domainPages.ts`          | `DomainDestination` gains `interpretation`.                                                                                                                                                        |
| `src/features/history/describe.ts`          | `DescribeContext` gains `domains`; the `aim-reading` tag is **Worked out** and its sentence names the area and the words it rests on.                                                               |
| `src/intelligence/vocabulary.ts`            | New `isOwnerNamed(entity)` — the engine's own five routines are not things he named.                                                                                                               |

**No scoring weight, dimension or threshold moved.** No generator, evaluator,
constraint or arbitration path changed. `QUESTIONS_PER_DAY` and
`DISCOVERY_PER_WEEK` are unchanged. There is still exactly one `fetch` in `src/`,
for `build-info.json` (D-025).

---

## What was added to the instrument

| File                                          | What it holds                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tests/synthetic/interpretation.test.ts` (new) | The eight CASE A tests against the record, the synthetic contract, and the 91.3 sweep. **Every negative is written as a pair** — the same probe in the state where it must find something, and then in the state where it must not. |
| `tests/browser/phase91.spec.ts` (new)          | The ordinary-owner contract (a)–(h) from an empty store, the second area on the second authoring surface, the null case, and a self-scan that fails if the file reaches for a laboratory control. |
| `tests/synthetic/journey.ts`                   | `discoveryReading`, `withdrawReading`, `destinationReading`; `nameDestination` takes the page the form was on; **`answerDiscovery` now branches on all four prompt shapes.** |
| `tests/synthetic/accommodation.ts` / `phase90-accommodation.test.ts` | B1 marked `landed` with `built`, and a check that a landed row is where it says it landed. |
| `tests/unit/architecture-guards.test.ts`       | `interpret` added to the modules a surface may reach.                                                                            |

**Three existing instruments were changed, and all three changes are worth
checking yourself. A guard relaxed by the conversation whose change tripped it is
exactly what an independent reviewer exists for.**

- **`answerDiscovery` ran `proposeDestination` whatever was being asked**, so
  answering the next-step question would have written a second aspiration. It
  now mirrors `Discovery.tsx`'s own four-way branch. This is a **widening**, not
  a relaxation — but check it.
- **The accommodation absence sweep now skips a landed row** (DEF-0154, D-244).
  The replacement is a presence check. Confirm the presence check would fail if
  the feature were removed.
- **The architecture guard's `OPEN_TO_SURFACES` list gained `interpret`.**
  Confirm that `interpret` writes nothing and decides nothing.

---

## Verification the builder ran

Facts, not conclusions. Re-running a green suite to watch it go green again buys
nothing (`README.md`, step 2); these are here so a discrepancy between them and
what QA observes is itself a trigger.

| Gate                                      | Result             |
| ----------------------------------------- | ------------------ |
| `npm run verify`, clean tree              | PASS                                                       |
| Unit / contract / synthetic / adversarial | **1,960 passed** in 89 files (1,903 in 88 at `45d5f01`)    |
| Browser, 360 / 430 / 1,280, one worker    | **825 passed, 0 failed, 0 flaky** — 275 per width (762 at `c6e0b3a`) |
| Privacy scan                              | clean, 309 tracked files                                   |
| Rendered copy scan                        | clean — 8,425 shipped strings, 8,337 placed in a module    |
| Android-style gate                        | clean — **233 checks**, against the deployed Preview        |
| Release integrity against the manifest    | clean — 8 files served byte for byte as verified (`113bdb6`) |
| Checkpoint equivalence                    | **no files changed** between `113bdb6` and the deployed SHA |
| CI and deployed Preview                   | **success** — Verify and Deploy preview both green (run `33497715688`); the Preview serves `113bdb6` |

**Reintroduction proofs the builder ran.** Each is a claim you can repeat: make
the edit, run the named suite, watch it fail, put it back.

| Reintroduce                                                                | And this fails                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `if (false && !mayReasonFrom(...))` in `interpreterInput`                   | CASE A 8 — private material never reaches the interpreter          |
| `topOthers.length >= 1` in `readAim`                                        | CASE A 1 — offers nothing where two areas other than the asked one tie |
| write the `aim-reading` unconditionally in the journey's destination branch | CASE A 5 — declining costs nothing                                 |
| return the generic sentence from `milestoneQuestion` for `financial-goal`   | CASE A 4 — exactly one follow-up, and it is the area's own question |
| push the clarification into `out` rather than `first` in `discovery.ts`     | 91 synthetic — the clarification takes the slot rather than adding one |
| put `=== 'private'` back at `coverage.ts`'s first site                      | 91.3 — the private boundary is one place                           |
| `words: typed.toLowerCase()` in `readAim`                                   | 91 synthetic — the words survive every phrase in the library        |
| change one token in B1's `built` proof                                      | 90.3 — holds every landed row to where it actually landed          |

**The second one found a real gap.** The tie-break refusal had no test at all
until the reintroduction showed nothing failed; the case it protects is two
areas *other than the asked one* tying, and the test for it was written because
of that.

---

## Where the builder thinks the risk is, stated as places to look rather than as reassurance

**None of these is a claim that the rest is correct.**

1. **The marker table is a table.** It recognises what somebody thought of.
   _"Get the CCNA done"_ names **nothing** on a store where CCNA is not already a
   named thing — honestly, and it may still read as the app being dim. Attack it
   with the phrases a real person would type.
2. **Six unknowns in one sentence.** _"More money"_ produces three from the words
   and three from the object, rendered as one comma-run. It is honest and it is
   long. Read it on a 360-wide screen and say whether it reads as care or as
   pedantry.
3. **The re-file moves which page the aim is on.** He answers a Career question
   and his aim appears on Money. The confirmation says so before he presses, and
   the app never does it unasked — but check that a person who took the offer can
   find his aim afterwards without being told where to look.
4. **The clarification hoist.** A clarification now comes before a fresh
   aspiration question in another area. Check the agenda does not read as
   pursuing one subject at the expense of the rest of his life.
5. **`isOwnerNamed` excludes the engine's five standing routines by id.** An
   owner who authors a routine literally called _"a walk"_ gets the same derived
   id, and his own thing would be excluded from the digest. The lexicon still
   names Health from the word, so the reading is unchanged — but the reason is a
   coincidence rather than a design, and it is worth knowing.
6. **What the interpreter may name is three areas.** A Fatherhood-shaped aim
   reads as nothing. That is deliberate (D-240) and it is exactly the sort of
   deliberate silence that reads as a defect from cold use. Judge it as a person
   would.
7. **The seven consolidated privacy sites are claimed to be behaviour-neutral.**
   The suite says so. A reviewer who does not believe it should read the seven
   diffs directly.
8. **A withdrawn re-file leaves the destination *entity* in the area it was
   filed in**, while the destination *record* goes back. `resolveDestinations`
   reads the record first, so every surface follows the record — the builder
   checked that nothing reads a `destination` entity's own area (`byDomain` has
   no consumer, and `refreshingMoveFor` names only `place`, `learning-topic` and
   `financial-goal`). It is stated here rather than left silent because it is
   the kind of thing that is true until something new reads that field.
9. **The option rows gained a `[aria-pressed='true']` treatment.** It is the
   one the navigation already uses for *where you are*. Two pills with no
   visible difference is a control that lies about what will happen, and the
   first draft of this phase shipped exactly that — read it on the phone.

---

## Explicit deferrals, unchanged

The **nineteen deferred Phase 84 instrument-hardening findings** (D-210,
`qa/INSTRUMENT_HARDENING_BACKLOG.md`) are untouched and still open. They may not
be edited, removed or renumbered by any QA round, and re-finding one of them is
not a routing 91 defect.

**CASE B is explicitly out of scope**, and so is anything routings 92 to 97 own:
no widened concept vocabulary, no inference over history, no emotional
dimensions, no advancement register, no named expectation.

**`docs/ROUTING_91_BRIEF.md` still exists.** Its own §10 says to delete it when
routing 91 is specified. It is kept until GREEN because it is the document this
phase is judged against, and deleting the gate before the gate is run would be
the wrong order. Its removal is a closeout action, not a QA finding.

---

## Rounds 1 onward — independent QA

_This section and everything below it belongs to Codex. The builder does not
edit it._
