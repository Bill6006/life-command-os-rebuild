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

---

## Round 1 independent QA — FAIL

**Phase:** routing Phase 91 — semantic capture and clarification.
**Product checkpoint tested:**
`113bdb6f7c6efadccb3da38cc8e2878b49cb2964`.
**Deployed documentation head tested:**
`c148dace6b8946e73305430a49e1c97f561ea620`, bundle-equivalent to the product
checkpoint. The only changed paths are `docs/DECISION_LOG.md`,
`docs/NEXT_PROMPT.md` and this handoff.
**Live CI:** product run `33497715688` and deployed-head run `33500263488`, both
successful.

**Overall verdict: FAIL. Routing Phase 91 remains YELLOW.** The exact _"More
money"_ happy path works, the second proving domain works, the privacy digest
holds, the mechanical gates are clean, and all eight live files match the
deployed head's own CI manifest. Four owner-facing findings nevertheless block
GREEN: declining permanently consumes the interpretation offer; taking a
settled interpretation back does not take back the behavior it caused; the
adversarial phrase already present in the synthetic instrument is interpreted
backwards while its test stays green; and the six unknowns are rendered as one
phone-width comma-run.

### Governing criteria

I applied `ROUTING_91_BRIEF.md` §§3–4; adjudication §§6.1 and 6.3 plus correction
3.6; D-240 through D-244; D-143, D-162, D-167, D-176, D-184, D-188, D-193 and
D-238; canonical-plan §§22 and 43A; G-009; the routing-91 phase status;
DEF-0154; both QA tracks; and the explicit risks in this handoff.

The nineteen D-210 instrument-hardening findings remain untouched. Their
backlog is still blob `58d5af071355d252c4a254fc685fcc9e8e88f417`.

### Cold deployed use, before the governing documents

I opened the deployed Preview first and did not open `#/qa`. It identified
itself as the submitted product build and exposed discovery through ordinary
Insights. The browser already held owner-preview state, so I did not pretend
that this was the required fresh-store acceptance journey. I used it only as a
cold first-impression pass; every acceptance reproduction below began in an
isolated empty browser context, through ordinary owner controls.

The cold pass did establish one useful human fact before the reasoning was
read: the interpretation is easy to find from Insights, but a long confirmation
becomes much denser than the question that opened it.

### What passes

The submitted implementation genuinely does the following:

- _"More money"_ under the Career aspiration question names Money and keeps
  Career selected until the owner takes the offer.
- The stored destination aim remains byte-identical and the accepted meaning is
  a separate `aim-reading` row with derived provenance.
- The exact phrase carries non-empty unknowns, and the next discovery slot is
  one Money-specific clarification rather than three questions.
- Keeping the aim in Career writes no derived row.
- Accepting the reading, then answering _"Clear the credit card"_, produces the
  Money move that was absent before the clarification.
- The same route works from Money to Career with a differently shaped phrase,
  and the same-area null case adds no clarification.
- Three days later the settled reading is not proposed again.
- A private named thing is absent from the interpreter digest with the
  permission off, while the same probe reads an ordinary named thing. The
  permission-on positive control reaches the digest.
- B1's landed accommodation row has a real presence assertion, and the widened
  journey helper branches on all four prompt shapes rather than writing a
  second destination for a milestone answer.

Those are real PASSes. They do not establish the transitions the four findings
below exercise.

### QA-91-001 — declining permanently consumes the offer

**Severity:** Blocker. **Class:** ordinary-owner consequence journey and
false-green acceptance instrument.
**Governing contract:** adjudication §6.3 steps (e)–(f), acceptance test 5, and
D-238.

**Exact reproduction**

1. Begin in a fresh store and open the Career aspiration question on Insights.
2. Type **More money**.
3. Leave **Keep it in Career & Learning** selected and confirm.
4. Open the next question on Insights, still in the same owner store.

**Actual:** the Money interpretation is gone permanently. The next prompt is
_"What would be the next step towards ‘More money’?"_; there is no reading line,
no Money option and no control on the Career destination that can ask for the
interpretation again. The aim survives and no derived row is written, but the
owner cannot perform §6.3's next step: _"redo it, accept"_. Declining therefore
does cost something — the choice itself.

**Expected:** declining must leave the aim intact and leave an ordinary,
non-laboratory route to reconsider the same proposed interpretation. The exact
contract must be executable as one sequence: decline, verify no derived row,
redo, accept, clarify, and observe Now change.

**Why the current test is false green.** The browser tests for (e) and (b)/(f)
are separate `test()` cases, and `freshApp()` gives each a different empty
context. No shipped test walks decline → redo → accept in one store. The
synthetic tests split those branches the same way. That fragmentation hides the
one-way transition while the file header calls the suite the ordinary-owner
journey.

**Implementation evidence:** keeping the offer writes only the destination;
`outstandingPrompts()` then correctly sees an existing destination with no next
step and emits `next-step.<destination>`. Only an accepted reading has a
destination-row control, and that control is withdrawal, not reconsideration.

### QA-91-002 — taking the reading back leaves its Money behavior in force

**Severity:** Blocker. **Class:** reversibility across a consequence chain.
**Governing contract:** acceptance test 7, D-240, D-242 and the owner-visible
button **Put it back in Career & Learning**.

**Exact reproduction**

1. From a fresh store, accept the Money interpretation of **More money**.
2. Answer its one clarification with **Clear the credit card**.
3. Confirm that Now says **Deal with Clear the credit card today.**
4. Open Money and press **Put it back in Career & Learning** on the reading row.
5. Confirm the aim now appears in Career, then return to Now.

**Actual:** the aim moves to Career and the reading disappears, but Now still
says **Deal with Clear the credit card today.** The clarification created a
`financial-goal`; withdrawal supersedes only the `aim-reading` and the
destination row. It does not supersede, reclassify or otherwise settle the
milestone that the interpretation caused. The owner-visible reversal changes
the page while leaving the phase's strongest behavioral consequence unchanged.

**Expected:** taking back a cross-domain interpretation after its clarification
must resolve the whole consequence chain honestly. It may require a second
confirmation if the owner-authored clarification cannot safely be moved, but it
may not say the aim is back in Career while silently continuing to act on it as
Money.

**Implementation evidence:** `DomainPage.tsx:374-382` writes only
`withdrawAimReading(previous)` and
`reviseDestinationRecord(..., { domain: previous.askedIn })`.
`Discovery.tsx:335-344` created the milestone with the interpreted domain;
`authoring.ts:580-596` then made it that domain's entity kind. The Money
generator reads the surviving `financial-goal`, independently of the revised
destination row.

**Why the current test is false green.** Both reversibility tests withdraw
immediately after accepting the aspiration, before answering the clarification.
They prove that the reading row and destination domain reverse; they never
create or inspect the Now consequence whose reversibility the phase claims.

I added a temporary ordinary-browser probe for the five-step sequence above.
It failed on the final assertion with the exact same Money headline, then was
removed. The restored shipped suite remained green.

### QA-91-003 — token presence is treated as meaning, even under explicit negation

**Severity:** Blocker. **Class:** semantic capture, adversarial phrases and
false-green synthetic instrument.
**Governing contract:** the synthetic adversarial-phrase contract, rules 4–5,
G-009 and D-238.

Two bounded probes expose the same class: marker presence is used without the
role or scope that gives the marker meaning.

#### Probe A — explicit negation

Input under the Career question:

> **Not about money at all**

**Actual:** the interpreter names Money and offers **File it in Money &
Financial Resilience instead**.

**Expected:** a token explicitly negated by the owner is not positive evidence
for that area. A bounded interpreter may decline to read the sentence; it may
not propose the meaning the sentence explicitly rejects.

This exact phrase is already in `ADVERSARIAL` at
`tests/synthetic/interpretation.test.ts:632-643`. The test checks only that the
string comes back byte-identically and that the interpreter does not throw. It
never asserts what the adversarial phrase means, so it is green over the
backwards proposal.

#### Probe B — a calendar year becomes an amount

Input under the Career question:

> **More money by 2027**

**Actual:** `unknowns` omits **how much** and still includes **by when**.

**Expected:** 2027 supplies a horizon, not a monetary amount. The amount remains
unknown and the horizon does not.

`interpret.ts:477-479` defines an amount as any digit anywhere in the phrase,
while the horizon table at `interpret.ts:402-428` recognises month/season words
but not a numeric year. The two predicates therefore exchange the meanings of
the same token.

**Repair the class, not these two strings.** The deterministic, offline and
bounded constraints stand. The repair needs conservative scope and token-role
handling with positive/negative pairs: asserted versus explicitly negated area
terms; currency amounts versus years/dates; and ambiguous cases that abstain
rather than guess. A phrase list containing _"not about money"_ or the number
2027 would repeat D-193/D-238's failure one layer lower.

I added a temporary two-test semantic probe. Both tests failed exactly as
described and were removed before the final gates.

### QA-91-004 — six unknowns render as one comma-run on the phone

**Severity:** Major. **Class:** owner-facing clarity at the phase's narrowest
required width.

**Exact reproduction**

1. Open the fresh Insights Career aspiration question at 360px.
2. Type **More money** and read the complete confirmation before pressing
   anything.

**Actual:** after the reading, two option rows and the destination proposal,
the app renders:

> The app will not assume how much, by when, whether this is about earning more
> or keeping more of it, what the next step towards it is, where you are
> starting from, what would count as getting somewhere.

At 360px this is a long seven-line comma-run inside an already long card. Every
item is truthful, but their relationship is not scannable and the sentence
reads as a disclaimer. This is the explicit risk the builder asked QA to judge;
it reads as pedantry, not care.

**Expected:** preserve all six unknowns and preserve the one-question budget,
but render the set as a readable set — for example, grouped semantic and object
unknowns or separate short lines. Six unknowns do not mean six questions, and
the repair must not turn the card into a questionnaire.

The existing browser assertions check that three named substrings occur and
that the page does not overflow. They do not check the delivered reading shape.
A temporary 360px full-page capture established the rendered result and was
removed after inspection.

### Acceptance disposition after Round 1

| Contract item | Result | Evidence |
| --- | --- | --- |
| 1. Right domain for exact CASE A | **PASS** | Money is named or offered from the Career question. |
| 2. Words survive | **PASS** | Destination aim is byte-identical; derived row is separate. |
| 3. Ambiguity declared | **PASS for exact CASE A; FAIL across the promised interpreter** | _More money_ has unknowns; a numeric year is declared as amount and not horizon (QA-91-003). |
| 4. Exactly one concrete follow-up | **PASS** | One Money-specific milestone prompt occupies the existing slot. |
| 5. Declining costs nothing | **FAIL** | The aim survives, but the interpretation can never be reconsidered (QA-91-001). |
| 6. Now changes | **PASS in both proving directions** | Money and Career each produce a previously absent move after clarification. |
| 7. Cross-domain links proposed and reversible | **FAIL after the consequence exists** | The destination moves back; the Money milestone and Money move remain (QA-91-002). |
| 8. Privacy digest | **PASS** | Private named text is withheld with a positive ordinary and permission-on control. |
| Ordinary-owner contract as one journey | **FAIL** | The suite splits decline, accept and the second domain across fresh stores; the real same-store sequence stops at redo. |
| Synthetic adversarial contract | **FAIL** | The named adversarial negation is interpreted backwards while its test checks only identity (QA-91-003). |
| Null case | **PASS** | A same-area, sufficiently specific phrase produces no reading or extra clarification. |

### Mechanical and live verification on the restored tree

Every temporary probe and capture was removed before these checks.

| Gate | Round 1 result |
| --- | --- |
| Focused Phase 91 synthetic / accommodation / architecture | **131 / 131 passed** |
| Focused Phase 91 browser contract at 360px | **13 / 13 passed** |
| `npm run verify` | **PASS** — format, lint, typecheck, tests, build, manifest and copy scan |
| Unit / contract / synthetic / adversarial | **1,960 / 1,960 passed** in 89 files |
| Rendered-copy scan | **clean — 8,425 shipped strings**, 8,337 placed in a module |
| Browser matrix, one worker | **825 / 825 passed in 18.7 minutes** — 275 each at 360 / 430 / 1,280 |
| Android-style deployed gate | **clean — 233 checks** |
| Android configuration | Galaxy S24-style, 360 × 780 CSS px, DPR 3, touch/mobile, Android 14 / `SM-S921B` user agent |
| Privacy scan | **clean — 310 tracked files** at the deployed documentation head |
| Network boundary | **one `fetch` in `src/`**, the same-origin build-info read |
| Product-checkpoint CI | **PASS** — run `33497715688` |
| Deployed-head CI | **PASS** — run `33500263488` |
| Checkpoint equivalence | **PASS** — `113bdb6` to live `c148dac`; only the three routing documents named above changed, none bundle-relevant |
| Live release integrity | **PASS** — current run `33500263488`'s manifest matches all 8 served files byte for byte |
| Remote containment | **PASS** — `origin/main` contains the deployed documentation head |
| Restored worktree | **clean** before this report was written |

The older `113bdb6` manifest correctly does not describe the later `c148dac`
documentation deploy: build identity changes the generated bytes. Running that
old manifest against the new live head produced the expected mismatch; using
the live head's own CI manifest was clean. This is the exact distinction the
handoff's warning exists to preserve, not a recurrence of QA-84-064.

### Automated tests that give false confidence

- `tests/browser/phase91.spec.ts` calls itself the ordinary-owner journey, but
  (e), (b)/(f), reversal and the second domain are isolated fresh-store tests.
  It cannot detect the one-way decline or the settled-consequence reversal.
- The two reversal tests stop before the clarification creates the domain-typed
  milestone, so they prove record movement and not behavioral reversibility.
- `tests/synthetic/interpretation.test.ts` includes **Not about money at all**
  under `ADVERSARIAL`, then asserts only identity and structural bounds. It
  never asks whether the interpreter concluded the opposite of the sentence.
- The unknowns checks pair currency amounts and named months, but never present
  a number whose semantic role is a date.
- The 360px check proves substrings and overflow, not whether the six-item
  confirmation is readable as a set.

These are direct acceptance-instrument findings under D-238, not a request for
generic coverage work and not any of the nineteen D-210 deferrals.

### Overall disposition and repair requirement

**FAIL. Routing Phase 91 remains YELLOW.** Do not mark it GREEN, remove the
routing brief, or start routing 92.

The original builder must reproduce all four findings before repair, identify
the whole class behind each, and then:

1. make decline genuinely costless by providing an ordinary same-store route to
   reconsider the interpretation;
2. make withdrawal honest after clarification, including the domain-typed
   milestone and Now consequence rather than only the destination row;
3. add conservative bounded handling for semantic scope and numeric role,
   without a phrase patch, network model, score or widened domain vocabulary;
4. render the complete unknown set readably at 360px without adding questions;
5. replace the fragmented acceptance proof with at least one sequential fresh
   owner journey that performs decline → verify → redo → accept → clarify → Now
   change → withdraw after consequence, and then exercises a second domain in
   the same store; and
6. add positive/negative regression pairs that fail under each exact
   reintroduction, including a test whose title says no more than it proves.

Then rerun the aggregate gate, all three browser widths, Android-style gate,
privacy scan, checkpoint equivalence, CI and live release integrity; preserve
every passing behavior, all explicit deferrals and all nineteen D-210 findings;
deploy a repaired checkpoint; and dispatch Round 2 to this **same Codex QA
conversation** at High.

---

## Round 1 FAIL — complete builder repair handoff

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.
**Intelligence level:** **Max** — this is a repair across an append-only
consequence chain, a semantic parser boundary and a false-green ordinary-owner
instrument.
**Conversation:** **CURRENT** — return to the original routing 91 Claude builder
conversation.

```text
Routing Phase 91 repair after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full. Round 1 at the end is the
authoritative independent QA verdict. Keep the Phase field exactly 91 and keep
the phase YELLOW.

Before changing implementation, reproduce QA-91-001 through QA-91-004 exactly
and explain the whole failure class behind each:

1. From one fresh ordinary-owner store, type "More money" under Career, keep it
   in Career and confirm, then try to redo the interpretation and accept it.
   There is no ordinary route back to the Money offer; the next prompt is the
   generic next-step question. Declining preserved the aim but consumed the
   choice, so §6.3's decline -> redo -> accept journey cannot be performed.
2. On a fresh store accept the Money reading, answer "Clear the credit card",
   confirm the Money move on Now, then press "Put it back in Career & Learning".
   The aim moves to Career while Now still says "Deal with Clear the credit card
   today." Repair the whole derived consequence chain without silently editing
   or deleting the owner's clarification.
3. Prove the current bounded parser offers Money for "Not about money at all"
   and treats 2027 in "More money by 2027" as the amount while still claiming
   the horizon is unknown. Repair semantic scope and numeric token role
   conservatively. Do not patch those strings, add a network/model call, widen
   the three readable domains, or add a score.
4. Render the full "More money" confirmation at 360px and read the six unknowns
   as delivered. Preserve every unknown and the one-question budget, but make
   the set scannable rather than one seven-line comma-run.

The acceptance instrument must stop splitting the contract into fresh stores.
Add at least one sequential ordinary-owner browser journey, never opening #/qa,
that performs decline -> verify no derived row -> redo -> accept -> clarify ->
verify Now changed -> withdraw after the consequence exists -> verify the
consequence is honestly resolved, then exercises the differently shaped second
domain in the same store. Keep the focused branch tests where useful, but do not
call them the journey in place of the journey.

Add direct positive/negative semantic pairs: asserted versus explicitly negated
area terms; currency amounts versus numeric years/dates; and ambiguous phrases
that abstain rather than guess. Make the exact existing adversarial phrase
"Not about money at all" fail the old implementation for its meaning, not only
pass for byte identity. Make the settled-withdrawal regression fail if only the
reading and destination rows move. Hold every test title to D-238.

Preserve the exact CASE A passes, byte identity, derived sibling provenance,
privacy digest boundary, one-question budget, same-area null case, both proving
domains, three-day non-reproposal, B1 layout, no-score rule, one-fetch boundary,
all explicit deferrals and the nineteen D-210 backlog items. CASE B and routings
92-97 remain out of scope.

Run npm run verify, the full 360/430/1280 browser matrix at one worker, the
Android-style gate, privacy scan, checkpoint equivalence, both relevant CI
checks and release integrity against the deployed head's own CI manifest. Run
reintroductions that demonstrate each new regression bites, restore the tree,
commit and push the repaired checkpoint, wait for Preview deployment, then
append the builder repair record and a complete Round 2 retest handoff to this
file. Dispatch Round 2 to the SAME Codex QA conversation at High. Do not ask the
owner to paste file contents, do not remove docs/ROUTING_91_BRIEF.md before
GREEN, and do not start routing 92.
```

### Short launcher

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.

**Intelligence level:** Max.

**Conversation:** CURRENT — the original routing 91 Claude builder conversation.

```text
Continue routing Phase 91 after independent QA Round 1 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full and execute the complete Round 1
builder repair handoff at the end exactly as written. Keep Phase 91 YELLOW and
do not ask me to paste the file contents.
```

---

## Round 1 repair — the builder's record

_Written by the Claude builder conversation. Round 1 above is QA's and is not
edited; this section records what was reproduced, what was changed and what was
run. Round 2 belongs to QA._

**Phase:** 91 — semantic capture and clarification. **Still YELLOW.**

**Repaired checkpoint:** `3afa7c2`
**Deployed Preview:** `3afa7c2` — they match exactly

### All four reproduced first, and reproduction found the cause of two of them

**QA-91-001.** Reproduced exactly: after declining, the next prompt is the
generic next-step question and no control anywhere can ask for the interpretation
again. Reproduction then found **why**, which the report could not see from
outside: `destinationRecords` writes an entity **whose label is the aim**, so
reading _"More money"_ again found a thing the owner had "named" in Career called
_More money_ — and a named thing outranks every word in the table. The app was
citing its own transcription of his sentence as independent evidence about that
sentence. `destinationReading(career, "More money")` returned `offer: undefined`
where it had returned `money` a moment earlier.

**QA-91-002.** Reproduced exactly: aim in Career, Now still _"Deal with Clear the
credit card today."_, and one entity left in the index —
`financial-goal:Clear the credit card`. The mechanism is that **an entity is an
index entry**: nothing supersedes one and nothing removes one, so re-typing the
milestone would have left the money entity behind and `moneyCandidates` reads it
directly.

**QA-91-003.** Both probes reproduced. Two further phrases were probed to find
the boundary of the class rather than the two strings: **"No more debt"** is
negated and *is* about money, and **"Save £3000 by 2027"** carries both a sum and
a year. Any repair that cancelled a marker near a negator would have broken the
first; any repair that treated digits uniformly would have kept failing the
second.

**QA-91-004.** Reproduced at 360px: after the reading, two option rows and the
proposal, the six unknowns arrive as one seven-line comma-run.

### What changed

| Where                                          | What changed                                                                                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/intelligence/interpret.ts`                | The digest excludes `destination` entities (D-245). A denial of **aboutness** cancels a marker, scoped to its clause; a four-digit year is a horizon and not an amount (D-247).           |
| `src/features/life/DomainPanels.tsx`           | The reading row is symmetric: an offer where the words still name another area, the way back where a reading is settled. Both state the consequence before acting (D-245, D-246).        |
| `src/features/life/DomainPage.tsx`             | `withdrawReading` re-files every milestone with the aim; new `acceptReading` is the route back after declining.                                                                          |
| `src/intelligence/authoring.ts`                | New `refileMilestone` — supersedes a milestone into another area's entity kind, carrying his sentence byte for byte.                                                                     |
| `src/intelligence/candidates.ts`               | `moneyCandidates` reads a `financial-goal` **the effective record still refers to** (D-246). New `firstStillReferredTo`; `firstOfKind`'s other five callers are untouched and it says why. |
| `src/components/ui.tsx` / `ui.css`             | New `UnknownSet` — two named halves, each a list, every unknown preserved (D-248).                                                                                                        |
| `src/features/insights/Discovery.tsx`          | Renders `UnknownSet` instead of the comma-run.                                                                                                                                           |
| `scripts/adaptation-claims.mjs`                | `'The app will not assume '` keeps only `DomainPanels.tsx` on its `in` list — the authoring panel still renders it and neither aspiration surface does. The two new headings carry no modal and no forward deixis, so neither is a claim. |

**Decisions D-245 … D-248.** Defect-ledger entry `QA-91-001 … QA-91-004`.

### The instrument, which is where all four were hiding

- **One sequential ordinary-owner journey, in one store** —
  `phase91.spec.ts`, _"declines, reconsiders, accepts, clarifies, sees Now
  change, takes it back, and moves on to a second area"_. Nine steps, never
  `#/qa`. The focused branch tests are kept **as branches**; the header no longer
  claims they are the journey.
- **`(e)` was retitled**, because its old title was the finding: it said _"no
  reading row"_ and asserted exactly that, and the absence it was celebrating was
  the defect.
- **Positive/negative semantic pairs** — asserted versus denied area terms, with
  _"No more debt"_ held on the positive side; currency versus a numeric year; and
  a denial that stops at its clause.
- **The settled-withdrawal regression** creates the consequence first and asserts
  on **what the generator produced**, not on what won.
- **The journey helper** now mirrors both gestures fully; its earlier
  `withdrawReading` wrote two records where the page writes the chain, which is
  what let two tests call a half-gesture reversible.

### A fifth false green, found by the reintroductions and inside this repair

The first draft of the new QA-91-002 regression read the **winning** move's area.
Putting the defect back left it green: the money move was generated again and
lost the arbitration to Career, so the assertion could not tell _"not proposed"_
from _"proposed and beaten"_. It asserts on `generateCandidates` now.

**That is D-238's first corollary, caught inside the repair for a D-238 finding**,
and it is the second time in this campaign that a reintroduction found what an
assertion could not. It is reported rather than quietly fixed.

### Reintroduction proofs — sixteen, all of which bite

Round 0's eight were re-run and still bite. The eight for this round:

| Reintroduce                                                              | And this fails                                          |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| drop the `destination` exclusion in `interpreterInput`                    | QA-91-001 — a declined reading can be reconsidered      |
| make the journey's `acceptReading` return early                           | QA-91-001 — same                                        |
| make the journey's `withdrawReading` move no milestone                    | QA-91-002 — taking a reading back takes back what it caused |
| put `firstOfKind` back in `moneyCandidates`                               | QA-91-002 — same                                        |
| empty `deniedSpans`                                                       | QA-91-003 — a token is read for its role                |
| `saysHowMuch` back to any digit                                           | QA-91-003 — same                                        |
| drop `YEAR` from `saysWhen`                                               | QA-91-003 — same                                        |
| render the unknowns as one run again                                      | QA-91-004 — the six as two named sets                   |

### Verification on the repaired tree

| Gate                                      | Result                     |
| ----------------------------------------- | -------------------------- |
| `npm run verify`, clean tree              | PASS                       |
| Unit / contract / synthetic / adversarial | **1,976 passed** in 89 files (1,960 at `113bdb6`)           |
| Browser, 360 / 430 / 1,280, one worker    | **828 passed, 3 dropped connections** of 831 — see the note below         |
| Privacy scan                              | clean, 310 tracked files   |
| Rendered copy scan                        | clean — 8,454 shipped strings |
| Android-style gate                        | clean — **234 checks**, against the deployed Preview             |
| Release integrity against the manifest    | clean — 8 files served byte for byte as verified (`3afa7c2`)           |
| Checkpoint equivalence                    | **no files changed** between `3afa7c2` and the deployed SHA               |
| CI and deployed Preview                   | **success** — Verify and Deploy preview both green (run `33508385860`); the Preview serves `3afa7c2`                  |
| Worktree                                  | clean                      |

> ### The three browser failures, and why they are not being called a pass
>
> The local matrix reported **828 passed, 3 failed** of 831. All three died on
> `page.goto: net::ERR_ABORTED; maybe frame was detached?` — a navigation drop,
> before any product assertion ran — in three different files at two different
> widths: `now.spec.ts:185`, `qa-lab.spec.ts:498` and `shell.spec.ts:257`.
>
> This is the flake `playwright.config.ts` documents in its own comments: one
> `vite preview` process serving one worker drops connections, and *"failures
> which merely look like product failures cost real time."* **One of the three
> is a privacy assertion**, so it was not taken on trust: all three files were
> re-run across all three widths and passed **204 of 204**, and CI — which runs
> with `retries: 1` — is green on the same commit.
>
> It is reported rather than rounded off. A builder who writes "831 passed"
> because a re-run came back green has told QA something that did not happen.

### One instrument correction the deployed gate found

The Android-style gate holds two routing-84 checks over the discovery card, and
this repair made both stale. They are corrected rather than deleted:

- **`and what it is not assuming, before anything is written — D-188`** asserted
  the literal `will not assume`, which was the whole sentence until D-248 split
  the unknowns into two named sets. The contract is unchanged; the wording is
  not. It now asserts both halves by name.
- **`and does not read a second meaning into the phrase — D-172`** was routing
  84's claim, and routing 91 is the phase that reverses it. **It was still
  passing** — because the reading renders in a *sibling* of the element that
  check reads, so it was green for a reason unrelated to what it said. It is
  replaced by the live rule: the app reads the second meaning, offers it, and
  leaves the aim where the question was until the owner says otherwise.

### Preserved, and checked rather than assumed

Every Round 1 PASS is re-asserted by the shipped suite: the exact CASE A path,
byte identity, derived sibling provenance, the privacy digest with both its
controls, the one-question budget and `DISCOVERY_PER_WEEK`, the same-area null
case, both proving domains, three-day non-reproposal, B1's landed row, the
no-score rule and the single `fetch`. The **nineteen D-210 instrument-hardening
findings are untouched and still open**; `docs/ROUTING_91_BRIEF.md` is still
present; routing 92 has not been started; CASE B remains out of scope.

**One thing this repair did not do, said plainly.** `firstStillReferredTo` is
applied to the money lookup and to nothing else. The same latent shape exists for
the person and place lookups, and it is left alone because no gesture can orphan
those and because the equivalence that makes the money narrowing safe — **no
shipped history holds a `financial-goal` at all**, which the suite asserts — has
not been measured for them. Widening it on this round would be an unmeasured
change to five generators inside a repair.

---

## Round 2 retest handoff

**Model:** Codex.
**Reasoning level:** **High** — a middle level. Never Max, which is Claude's.
**Conversation:** **SAME** — the Codex conversation that ran Round 1, retesting
its own findings.

```text
Routing Phase 91 retest after the builder's Round 1 repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full. Your Round 1 report is unchanged;
the builder's repair record and this block are appended below it. Keep the Phase
field exactly 91.

Retest the four findings you raised, on the repaired checkpoint, in an ordinary
browser that never opens #/qa:

1. QA-91-001 — from one fresh store, type "More money" under Career, keep it in
   Career and confirm, then reconsider and accept from the aim's own row, answer
   the clarification and confirm Now changed. Check that declining still writes
   no derived row, and that the route back is a route rather than a prompt.
2. QA-91-002 — accept the reading, answer the clarification, confirm the Money
   move, then take the reading back and check what Now says afterwards and what
   became of the next step you named.
3. QA-91-003 — attack the semantic boundary yourself rather than only the two
   phrases you reported. Negated aboutness against ordinary negation; sums
   against years and dates; and phrases it should abstain from.
4. QA-91-004 — read the full "More money" confirmation at 360px and judge the
   delivered shape.

Then judge the repair as a whole: whether the fifth false green the builder
reports was really the only one, whether the new sequential journey covers the
transitions or merely looks like it does, whether the narrowed money lookup
changed anything it should not have, and whether any Round 1 PASS regressed.

Preserve the nineteen D-210 deferrals, do not remove docs/ROUTING_91_BRIEF.md,
and end with the complete next handoff under D-082 whichever way the retest
goes. Do not ask the owner to paste file contents.
```

### Short launcher

**Model:** Codex. **Reasoning level:** High. **Conversation:** SAME — the Round 1
QA conversation.

```text
Retest routing Phase 91 after the builder's Round 1 repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full and execute the Round 2 retest
handoff at the end exactly as written. Keep Phase 91 YELLOW unless your own
retest says otherwise, and do not ask me to paste the file contents.
```

---

## Round 2 independent QA — FAIL

**Phase:** 91 — remains **YELLOW**.
**Product checkpoint:** `3afa7c299eca5e2f2f54960ec1f04313bfab3046`.
**Deployed docs head at retest:**
`a430a44d4369e6e607aa4770da0c56e15293f7b6`, bundle-equivalent to the product
checkpoint.
**Overall verdict:** **FAIL.** QA-91-001 and QA-91-004 are closed.
QA-91-002 and QA-91-003 are not closed. The repair has three blocker-class
failures, including one additional false-green browser journey.

### Retest method

The product checkpoint and deployed docs head were proved bundle-equivalent
before the behavioral retest. The ordinary-owner checks used isolated fresh
browser origins running that source and never opened `#/qa`. The Round 1 passes
were treated as settled and checked for regression rather than re-derived.

### Closed findings

- **QA-91-001 — PASS.** In one fresh Career store, _More money_ could be kept in
  Career without producing a derived reading, and its aim row retained the
  direct **File it in Money & Financial Resilience** route. That route is a
  gesture, not a replacement prompt. Accepting it then produced one Money
  clarification and the corresponding Now move.
- **QA-91-004 — PASS.** At 360px all six unknowns are present as two named lists,
  **These words do not say** and **And the app has not been told**, with three
  items in each and one answer box. The delivered shape is scannable and does
  not spend another question.

### QA-91-005 — withdrawal turns a Money answer into invented study semantics

**Severity:** Blocker. **Disposition:** QA-91-002 is not closed.

From a fresh ordinary-owner store:

1. Under Career, record _More money_, accept the Money reading and answer the
   clarification with _Clear the credit card_.
2. Now correctly says **Deal with Clear the credit card today.**
3. Use **Put it back in Career & Learning** and confirm the reversal.

The confirmation itself says the app will treat _Clear the credit card_ as what
the owner is currently studying. After confirmation, Now says:

> Build a small lab with Clear the credit card rather than reading about Clear
> the credit card.

The old Money candidate is gone, but it has been replaced by fabricated Career
and study meaning. The only offered reversal requires the owner to confirm that
nonsense. This is not an honest or reversible treatment of the consequence
created from the Money interpretation.

The implementation explains the result: `DomainPanels.tsx` calls
`describeMilestone(next, into...)` while `refileMilestone` recasts the next step
as an entity of the destination area's kind and writes `learningTopic` for
Career. The sequential journey at `phase91.spec.ts:668` only checks that the
post-withdraw headline contains _Clear the credit card_, so it passes this exact
absurd headline. This is an additional false green beyond the one reported by
the builder.

### QA-91-006 — a started action keeps the old Money consequence alive

**Severity:** Blocker. **Disposition:** QA-91-002 is not closed for an already
started consequence either.

The same path was repeated, but **Start it** was pressed on the Money move before
withdrawing the reading. After withdrawal, Now still shows:

- **Handle a money item**
- **Deal with Clear the credit card today.**
- **Where this stands: Under way**

The new Career candidate exists but loses arbitration; the old Money behavior
remains live. `firstStillReferredTo` in `candidates.ts:221-230` treats any
effective record referring to the entity as sufficient to retain it. The
action-recommendation and action-start records therefore keep the withdrawn
financial goal eligible. The ordinary-owner journey never starts the action,
and the synthetic regression creates no lifecycle records, so neither
instrument covers this consequence state.

The repair must define and verify what withdrawal means after a recommendation
has been started. It may preserve truthful owner history, but it must not
silently keep presenting the withdrawn Money interpretation as current.

### QA-91-007 — semantic roles still collapse at coordination and numeric dates

**Severity:** Blocker. **Disposition:** QA-91-003 is not closed as a semantic
class.

The repaired exact probes do pass: _No more debt_ offers Money; _Not about money
at all_ abstains; a bare year is not an amount; and a currency amount plus a
year supplies both roles. Adjacent probes expose two unhandled classes:

| Probe | Actual result | Required result |
| --- | --- | --- |
| _Not about money and debt_ | offers Money from _debt_ | abstain; one negation governs both coordinated objects |
| _Nothing to do with salary and savings_ | offers Money from _savings_ | abstain for the same reason |
| _No more debt and less spending_ | offers Money | offer Money; this is ordinary positive negation, not denied aboutness |
| _More money before 03/15/2027_ | omits **how much** | keep **how much** unknown; the digits are a date |
| _More money before March 15, 2027_ | omits **how much** | keep **how much** unknown; day and year are date parts |

At `interpret.ts:538`, every `and` ends the denied span even when it coordinates
two objects under the same negation. At `interpret.ts:608`, `saysHowMuch` treats
digits as an amount unless the whole token is exactly a four-digit year, so the
day and month components of a date become money. The present semantic tests
cover a `but` clause and a four-digit year/month-word form, not these classes.

### The builder's reported fifth false green

The reported winner-versus-generator false green is real: a test of only the
winning move could miss an unwanted generated Money candidate that lost
arbitration. It was not the only false green. The post-withdraw journey's
headline substring assertion also accepts the fabricated Career study
recommendation, and neither the journey nor the generator regression models a
started action.

### Acceptance disposition

| Acceptance item | Verdict | Evidence |
| --- | --- | --- |
| 1. Exact CASE A interpretation | PASS | The Money reading is offered without changing the aim first. |
| 2. Exact owner bytes | PASS | _More money_ remains byte-identical. |
| 3. Token meaning, not presence | **FAIL** | Exact repaired probes pass; coordinated negation and numeric full dates do not. |
| 4. One derived sibling with provenance | PASS | Acceptance writes the derived reading as the sibling specified. |
| 5. Decline, no derived row, direct redo | PASS | The declined choice is reachable again from the aim row. |
| 6. Clarify once and change Now | PASS | _Clear the credit card_ produces the Money move. |
| 7. Honest reversible withdrawal | **FAIL** | It fabricates study semantics, or keeps the started Money consequence live. |
| 8. Second proving domain | PASS | The differently shaped second-domain path remains covered. |
| One sequential ordinary-owner journey | **FAIL** | It runs, but its weak headline assertion blesses the wrong post-withdraw meaning and it omits the started state. |
| Synthetic/adversarial boundary | **FAIL** | Coordination and numeric dates remain false positives. |
| Same-area/null case | PASS | No duplicate same-area interpretation is offered. |

### Mechanical and live verification

| Gate | Result |
| --- | --- |
| `npm run verify` | PASS |
| Unit / contract / synthetic / adversarial | **1,976 passed** in 89 files |
| Browser, 360 / 430 / 1,280, one worker | **831 passed** in 18.5 minutes |
| Privacy scan | clean, 310 tracked files |
| Rendered copy scan | clean — 8,454 shipped strings; 8,366 placed in module |
| Android-style gate | clean — **234 checks** against deployed `a430a44` |
| Checkpoint equivalence | deployed `a430a44` is bundle-equivalent to `3afa7c2` |
| Product CI | success — run `33508385860` |
| Deployed docs-head CI | success — run `33511371387` |
| Release integrity | clean — 8 product files served byte for byte from the product manifest |

The narrower Money lookup does not change the shipped library: no shipped
history contains a `financial-goal`, and the aggregate stayed stable. It becomes
too broad only once an ordinary owner has lifecycle records referring to the
withdrawn entity, as QA-91-006 demonstrates.

Every other Round 1 PASS remained intact: derived sibling provenance, privacy
digest and both controls, one-question budget, both proving domains, three-day
non-reproposal, B1, the no-score rule and the one-fetch boundary. The nineteen
D-210 instrument-hardening findings remain open with backlog hash
`58d5af071355d252c4a254fc685fcc9e8e88f417`;
`docs/ROUTING_91_BRIEF.md` remains present; CASE B remains deferred; routing 92
has not begun.

---

## Round 2 FAIL — complete builder repair handoff

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.
**Intelligence level:** **Max** — this repair crosses interpretation semantics,
append-only consequence history and the ordinary-owner acceptance instrument.
**Conversation:** **CURRENT** — return to the original routing 91 Claude builder
conversation.

```text
Routing Phase 91 repair after independent QA Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full. The Round 2 report at the end is
the authoritative independent QA verdict. Keep the Phase field exactly 91 and
keep the phase YELLOW.

Before changing implementation, reproduce all three Round 2 blockers in fresh
ordinary-owner stores that never open #/qa:

1. Accept the Money reading for Career's "More money", answer "Clear the credit
   card", confirm the Money move, then put the reading back in Career. Observe
   that the only confirmation recasts the answer as something being studied and
   Now proposes a small lab about a credit card. Repair the whole consequence
   contract without inventing Career or study meaning and without deleting or
   rewriting the owner's words or truthful history.
2. Repeat the path, press "Start it" before withdrawal, then withdraw. Observe
   that the old Money move remains current and Under way because lifecycle rows
   keep the financial goal eligible. Define the honest fate of an already
   started consequence and make the visible state agree with the withdrawal.
3. Attack the semantic class with the exact positive and negative pairs in
   QA-91-007. Distinguish coordinated objects from a genuine clause break, and
   distinguish day/month digits in dates from amounts. Preserve "No more debt"
   as a positive Money statement and preserve real currency-plus-date cases.

Do not prescribe the result by patching these strings. Preserve owner-authored
bytes and append-only history; do not add a model/network call, a score, another
question, another readable domain or hidden special-case vocabulary. The
withdrawal design must explicitly account for the Money clarification and for
recommendation lifecycle rows, rather than merely changing which generated
candidate wins.

Strengthen the one sequential ordinary-owner journey so it asserts the meaning
and area of the post-withdraw state, not merely that a headline contains the
owner's next-step words. Add the started-action branch. Add direct semantic
positive/negative pairs for coordinated denied aboutness, ordinary positive
negation, numeric full dates, worded full dates, real amounts and mixed
amount-plus-date phrases. Each regression must fail for its title's reason under
a targeted reintroduction; restore the tree afterwards.

Preserve QA-91-001 and QA-91-004, every other Round 1 PASS, all explicit
deferrals, the nineteen D-210 findings and their backlog hash, and the existing
ROUTING_91_BRIEF.md. CASE B and routings 92-97 remain out of scope.

Run npm run verify, the full 360/430/1280 browser matrix at one worker, the
Android-style gate, privacy and copy scans, checkpoint equivalence, CI, and live
release integrity against the deployed head's own manifest. Commit and push the
repaired product checkpoint, wait for Preview deployment, then append the
builder repair record and a complete Round 3 retest handoff to this same file.
Dispatch Round 3 to the SAME Codex QA conversation at High. Do not ask the owner
to paste file contents, do not remove docs/ROUTING_91_BRIEF.md before GREEN, and
do not start routing 92.
```

### Short launcher

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.

**Intelligence level:** Max.

**Conversation:** CURRENT — the original routing 91 Claude builder conversation.

```text
Continue routing Phase 91 after independent QA Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full and execute the complete Round 2
builder repair handoff at the end exactly as written. Keep Phase 91 YELLOW and
do not ask me to paste the file contents.
```

---

## Round 2 repair — the builder's record

_Written by the Claude builder conversation. Round 2 above is QA's and is not
edited. Round 3 belongs to QA._

**Phase:** 91 — semantic capture and clarification. **Still YELLOW.**

**Repaired checkpoint:** `0aa8419`
**Deployed Preview:** `0aa8419` — they match exactly.

### All three reproduced first

**QA-91-005.** Reproduced exactly. After withdrawal the generator produced
`career/recall-practice/learning-topic:clear-the-credit-card` and
`career/hands-on-lab/…`, which is where _"Build a small lab with Clear the credit
card"_ comes from.

**QA-91-006.** Reproduced exactly: with **Start it** pressed first, the
withdrawal left `money/handle-money-item/financial-goal:clear-the-credit-card`
still generated and winning.

**QA-91-007.** All five probes reproduced as reported, and two more were added
to find the **boundary** of each class rather than the two strings: _"No more
debt and less spending"_, which any rule keyed on nearby negation would have
broken, and _"Save £3000 by 2027"_, which any rule treating digits uniformly
would have kept failing.

### The Round 1 repair was wrong, not short

Worth stating plainly because the reasoning that produced it was reasonable.
Round 1 **re-typed** the milestone into the area the aim was moving to, on the
argument that the app should undo its own classification. What it actually did
was assert a new one. **`MILESTONE_ENTITY` is what makes a step reach Now at
all**, so an entity kind is *meaning*, not filing — and a repair that treats it
as a folder ends with the app inventing that a credit card is something to
study, and then asking the owner to confirm it.

### What changed

| Where                                    | What changed                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/intelligence/authoring.ts`          | `refileMilestone` **removed**; new `setMilestoneAside` supersedes the goal through `goalCorrectionRecord` — statement byte-identical, `milestoneOf` intact, status `paused`. |
| `src/intelligence/destinations.ts`       | `DestinationMilestone.setAside`; a set-aside step is not the destination's `next`.                                                                                  |
| `src/intelligence/candidates.ts`         | `firstStillReferredTo` **removed**; `openGoalEntity` reads the entity an **active goal** names.                                                                     |
| `src/intelligence/lifecycle.ts`          | `resumableToday` does not offer back a move whose subject is a goal that is not active. It can only silence a subject some `goal` record names.                     |
| `src/intelligence/interpret.ts`          | `and`/`or` continue a denial; punctuation and *but/though/rather/instead* end one. Dates are removed before the amount question is asked — slashed, dashed, month-word and bare-year shapes. |
| `src/features/life/DomainPage.tsx`       | Both reading gestures set live milestones aside instead of re-filing them.                                                                                          |
| `src/features/life/DomainPanels.tsx`     | The consequence sentence says what setting aside means and promises nothing about studying; a milestone reads **set aside — the aim moved** as a third state.       |
| `playwright.config.ts`, `phase84.spec.ts` | The preview port is overridable (`LCOS_PREVIEW_PORT`, default 4173 and unchanged); the one spec that wrote the port out by hand uses the configured base URL.       |

**Decisions D-249 … D-251.** Defect-ledger entry `QA-91-005 … QA-91-007`.

### A defect of my own, which a busy machine surfaced

**The phase 91 browser tests read the wall clock.** Whether a money move reached
Now depended on the hour the gate ran: at one point *"(f) Now offers a money move
it did not offer before the clarification"_ failed with _"Nothing needs to move
tonight."_ — a true sentence about a different evening. `ROUTING_91_BRIEF.md` §7
names this mechanic and routing 90 built `page.clock` for it; this file simply
was not using it outside test (g).

Every test in the file now installs the clock at a fixed moment. **Rounds 1 and 2
could have passed or failed by the hour**, and that is worth knowing about the
evidence in this report as much as about the fix.

### The sixth false green, and where it was

The sequential ordinary-owner journey asserted that the post-withdraw headline
**contained** _Clear the credit card_ — which _"Build a small lab with Clear the
credit card"_ satisfies perfectly. The journey walked through QA-91-005 and
blessed it. It now asserts the meaning and the area of that state: the step reads
as set aside, the aim has no next step and says so, and **nothing anywhere on Now
mentions the subject at all**. Neither instrument modelled a started action; that
branch exists now.

### Reintroduction proofs — twenty-one across three rounds, all biting

Round 0's eight and Round 1's four surviving entries were re-run and still bite.
Four Round 1 proofs were **retired** because Round 2 rewrote the code they
targeted (`QA-91-002a/b`, `QA-91-003b/c`); their successors below run against the
replacement code, so the coverage moved rather than lapsing.

| Reintroduce                                                       | And this fails                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| the journey gesture stops setting the milestone aside              | QA-91-002 — taking a reading back takes back what it caused  |
| a set-aside step reported as the destination's next step           | QA-91-002 — same                                             |
| the page gesture stops setting the milestone aside                 | the sequential journey                                       |
| the consequence sentence promises study meaning again              | the sequential journey                                       |
| an entity kept live by any record that refers to it                | QA-91-006 — a started consequence does not outlive the reading |
| a set-aside move offered back to be resumed                        | QA-91-006 — same                                             |
| `and` ends a denied span                                           | QA-91-007 — a token is read for its role                     |
| the day and month of a date read as an amount                      | QA-91-007 — same                                             |
| a written date not recognised as a horizon                         | QA-91-007 — same                                             |

**One of these had to be repaired twice.** The written-date proof passed at first
because every phrase under test carried a four-digit year, so `saysADate` was
dead code the assertions could not see. A two-digit-year date (`03/15/27`) was
added, and only then did removing it fail anything.

### Verification on the repaired tree

| Gate                                      | Result                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `npm run verify`, clean tree              | PASS                                                                        |
| Unit / contract / synthetic / adversarial | **1,988 passed** in 89 files (1,976 at `3afa7c2`)                          |
| Browser, 360 / 430 / 1,280, one worker    | **834 of 834** — run in batches; see the note below                        |
| Privacy scan                              | clean, 310 tracked files                                                    |
| Rendered copy scan                        | clean — 8,470 shipped strings, 8,382 placed in a module                     |
| Android-style gate                        | clean — **234 checks**, against the deployed Preview                        |
| Release integrity against the manifest    | clean — 8 files served byte for byte as verified (`0aa8419`)                |
| Checkpoint equivalence                    | **no files changed** between `0aa8419` and the deployed SHA                 |
| CI and deployed Preview                   | **success** — Verify and Deploy preview both green (run `33548428392`)      |
| Worktree                                  | clean                                                                       |

> ### Why the local matrix was run in batches, and what happened to the whole-run attempts
>
> Two full local runs were unusable and are reported rather than discarded. The
> first returned **686 failed / 148 passed**, of which **679 failures were
> `ERR_CONNECTION_REFUSED`**: the `vite preview` process died partway and every
> test after it failed at navigation. A second run on a different port failed the
> same way.
>
> Diagnosis: this machine had another project's dev server bound to `[::1]:4173`
> with live connections, and the preview process did not survive the run. **That
> other server was left alone** — it is not this repository's — and
> `playwright.config.ts` gained an `LCOS_PREVIEW_PORT` override instead, default
> 4173 and unchanged, so CI behaves exactly as it did.
>
> The suite was then run in four batches covering **all 834 tests**, and all 834
> pass. Two batches hit a single `ERR_ABORTED` navigation drop each; both files
> passed 357 of 357 on a clean re-run. **CI ran the whole matrix on a clean
> runner and is green**, and that is the number to trust over any of mine.
>
> None of this is a product signal, and none of it is being counted as one.

### Preserved, and checked rather than assumed

QA-91-001 and QA-91-004 remain closed and are still asserted by the shipped
suite. Every Round 1 PASS is re-asserted: the exact CASE A path, byte identity,
derived sibling provenance, the privacy digest with both controls, the
one-question budget and `DISCOVERY_PER_WEEK`, the same-area null case, both
proving domains, three-day non-reproposal, B1's landed row, the no-score rule and
the single `fetch`. The **nineteen D-210 findings are untouched and still open**;
`docs/ROUTING_91_BRIEF.md` is still present; routing 92 has not begun; CASE B
remains out of scope.

**What this repair did not do, said plainly.** The active-goal lookup is applied
to the money generator and to nothing else, for the reason D-246 gave and QA
accepted: no shipped history holds a `financial-goal`, so the narrowing is
provably equivalent there, and the same measurement has not been made for the
person and place lookups. The interpreter still abstains from any phrase it
cannot read, and a positive claim resumed after a bare `and` with no punctuation
is denied to the end — a false negative, deliberately, in the direction this file
errs in everywhere.

---

## Round 3 retest handoff

**Model:** Codex.
**Reasoning level:** **High** — a middle level. Never Max, which is Claude's.
**Conversation:** **SAME** — the Codex conversation that ran Rounds 1 and 2.

```text
Routing Phase 91 retest after the builder's Round 2 repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full. Your Round 1 and Round 2 reports are
unchanged; the builder's Round 2 repair record and this block are appended below
them. Keep the Phase field exactly 91.

Retest on the repaired checkpoint, in ordinary browsers that never open #/qa:

1. QA-91-005 — accept the Money reading, answer the clarification, confirm the
   Money move, then put the reading back. Judge what the confirmation promises,
   what Now says afterwards, what became of the step you named, and whether the
   destination reads honestly about it.
2. QA-91-006 — repeat with "Start it" pressed before withdrawal, and also with
   the move left part-done. Check both the decision and anything offered back.
3. QA-91-007 — attack the semantic classes rather than the seven probes now
   under test: coordinated denials, ordinary negation, dates in shapes not
   listed, real amounts beside real dates, and phrases that should abstain.
4. Judge the repair as a whole. The builder reports one further false green of
   its own and one dead-code proof it had to repair twice; decide whether those
   were the only ones, whether the started-action branch covers the state you
   found, and whether the set-aside contract is honest rather than merely
   different from the one you rejected.

Two instrument changes are the builder's and want independent eyes: the phase 91
browser tests now pin the clock, having previously depended on the hour they ran
at; and playwright.config.ts takes an LCOS_PREVIEW_PORT override, default
unchanged. Confirm neither weakens what the suite proves.

Preserve the nineteen D-210 deferrals, do not remove docs/ROUTING_91_BRIEF.md,
and end with the complete next handoff under D-082 whichever way the retest
goes. Do not ask the owner to paste file contents.
```

### Short launcher

**Model:** Codex. **Reasoning level:** High. **Conversation:** SAME — the QA
conversation that ran Rounds 1 and 2.

```text
Retest routing Phase 91 after the builder's Round 2 repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full and execute the Round 3 retest
handoff at the end exactly as written. Keep Phase 91 YELLOW unless your own
retest says otherwise, and do not ask me to paste the file contents.
```

---

## Round 3 independent QA — FAIL

**Phase:** 91 — remains **YELLOW**.
**Product checkpoint:** `0aa84190144b4d57a692ed22f7aa9c86b3aa7d01`.
**Deployed documentation head:**
`94153a6d234077084a566af589c7f22895fca0d6`, bundle-equivalent to the product
checkpoint. Its only later path is this handoff.
**Overall verdict:** **FAIL.** QA-91-005 and QA-91-006 close. QA-91-007 does
not close as a semantic class; two adjacent owner phrases still turn punctuation
or date digits into meaning the owner did not give.

### Retest method

The live checkpoint identity and later documentation-only equivalence were
proved before and after the behavioral checks. Every behavior below was reached
through ordinary owner surfaces in an isolated fresh browser origin; none of
those browsers opened `#/qa`. The set-aside path was exercised with no lifecycle
state, after **Start it**, and after **Only part of it**.

The semantic boundary was attacked first through a temporary direct probe with
positive controls, then the two failures were reproduced through the fresh
ordinary Insights question. The temporary probe and all five temporary preview
servers were removed before the gates.

### QA-91-005 — PASS

The set-aside contract is honest rather than merely different from the rejected
re-file contract.

- Before withdrawal, the confirmation says that _Clear the credit card_ was the
  next step in Money, will be **set aside**, stays on the record, and will stop
  being suggested. It promises nothing about studying it.
- After confirmation, Career keeps _More money_ byte-identical, keeps _Clear the
  credit card_ byte-identical as **set aside — the aim moved**, and says
  **Nothing is named as the next step yet.**
- Now says **Nothing to suggest just yet** and contains neither the Money move
  nor a fabricated Career/study move about the credit card.

The owner's answer and truthful history survive; only its status as the active
answer to the old area's question ends. The ordinary **Fill that in** route
remains if the owner wants to name a next step for the moved aim. That is an
honest inverse of the accepted interpretation without asserting another one.

### QA-91-006 — PASS

Both consequence states requested by the handoff close:

- After **Start it**, withdrawal removes the Money move and **Under way** from
  Now. Timeline still records the suggestion, start, withdrawal, and paused
  goal.
- After **Start it** then **Only part of it**, withdrawal removes the move and
  **Part done** from Now and does not offer it back. Timeline still records both
  lifecycle events and the paused goal.

The started-action browser branch covers the exact state Round 2 found, and the
synthetic branch separately covers the part-done resumption door. The active-goal
lookup and lifecycle guard agree: a record that something was suggested,
started, or partly done is history, not a reason to keep the withdrawn
interpretation current.

### QA-91-008 — punctuation inside a coordinated denial revives denied objects

**Severity:** Blocker. **Disposition:** QA-91-007 is not closed.

Two fresh probes:

| Phrase | Actual | Required |
| --- | --- | --- |
| _Not about money, debt, or savings_ | offers Money from _savings_ and _debt_ | abstain; the comma separates coordinated objects under one denial |
| _Nothing to do with salary, savings, or debt_ | offers Money from _savings_ and _debt_ | abstain for the same reason |

The owner-facing confirmation says the first phrase sounds like Money and
offers **File it in Money & Financial Resilience instead**. At
`interpret.ts:558`, every comma is a `CLAUSE_BREAK`; the denied span therefore
ends after _money_ or _salary_ even when the comma is only list punctuation.

The controls pass: _Not about money, but about certification_ names Career, and
_No debt, no savings, no salary_ remains positive Money evidence. The repair
must distinguish a coordinated list from a genuine contrastive clause; removing
commas from the boundary wholesale would merely reverse the defect.

### QA-91-009 — common date grammar still supplies a fictional amount

**Severity:** Blocker. **Disposition:** QA-91-007 is not closed.

The following phrases all correctly satisfy **by when** and incorrectly omit
**how much**:

- _More money before the 15th of March 2027_
- _More money by March the 15th, 2027_
- _More money by Q3 2027_

The ordinary 360px confirmation for the first phrase shows only the
earning-versus-saving semantic unknown above the object unknowns. The missing
**how much** line means the app has treated `15` as an amount.

`DATE_SHAPES` at `interpret.ts:625-631` removes direct month/day adjacency and
bare years before `saysHowMuch` looks for remaining digits. It does not remove
the common _15th of March_, _March the 15th_, or quarter shape, so `15` or `3`
becomes money. Real amount controls beside the same horizon shapes still settle
the amount correctly.

This is the same role error as Round 2, one grammar step outside the repaired
list. The builder's two-digit-year proof now genuinely reaches `saysADate`; it
is no longer dead. It proves that one closed date shape is live, not that date
components generally cannot become sums.

### Repair and instrument judgment

The builder's sixth false green was real and is repaired: the sequential journey
now asserts the post-withdraw meaning, set-aside state, missing next step, and
absence from Now instead of a headline substring. No further false green was
found in the withdrawal or started-action instrument.

The semantic instrument remains narrower than its class headings. It proves
`and`/`or` coordination without list punctuation and a closed list of direct
date spellings, while the live parser still fails coordinated comma lists and
common indirect/quarter dates. Those are acceptance gaps under D-238, not any
of the nineteen D-210 deferrals.

The two builder-owned instrument changes do not weaken the gate:

- `freshApp` installs the fixed clock before navigation. All Phase 91 tests use
  that entry point, all Phase 90 clock-contract tests remain green, and all
  Phase 91 cases passed at all three widths. It removes wall-clock variance; it
  does not replace the product's time mechanism.
- `LCOS_PREVIEW_PORT` defaults to 4173 unchanged. QA ran the whole matrix on
  port 43196, and the previously hard-coded Phase 84 request path reached the
  configured server. The one timeout described below passed 3/3 on a clean
  port-43197 rerun.

### Acceptance disposition

| Acceptance item | Verdict | Evidence |
| --- | --- | --- |
| 1. Exact CASE A interpretation | PASS | Money is offered from Career without moving the aim first. |
| 2. Exact owner bytes | PASS | Aim and milestone wording remain byte-identical. |
| 3. Token meaning, not presence | **FAIL** | Commas in denied lists and digits in common date grammar still become positive meaning. |
| 4. One derived sibling with provenance | PASS | The accepted reading remains separate and derived. |
| 5. Decline, no derived row, direct redo | PASS | The aim row retains the ordinary reconsideration route. |
| 6. Clarify once and change Now | PASS | The Money clarification produces the expected move. |
| 7. Honest reversible withdrawal | PASS | Unstarted, started, and part-done consequences are set aside without rewriting or deletion. |
| 8. Second proving domain | PASS | The differently shaped second-domain branch remains green. |
| Sequential ordinary-owner journey | PASS | It asserts the repaired meaning and state, not a shared substring. |
| Started-action branch | PASS | It creates lifecycle rows and proves the withdrawn move is not current. |
| Synthetic/adversarial boundary | **FAIL** | QA-91-008 and QA-91-009 remain outside the shipped pairs. |
| Same-area/null case | PASS | No duplicate same-area interpretation is produced. |

### Mechanical and live verification

| Gate | Round 3 result |
| --- | --- |
| `npm run verify` | PASS |
| Unit / contract / synthetic / adversarial | **1,988 passed** in 89 files |
| Rendered copy scan | clean — 8,470 shipped strings; 8,382 placed in module |
| Privacy scan | clean — 310 tracked files |
| Browser matrix, 360 / 430 / 1,280, one worker, port 43196 | **833 passed, 1 dynamic-chunk/navigation timeout** of 834 in 20.3 minutes |
| Focused timeout retest, all three widths, port 43197 | **3 passed** |
| Android-style gate | clean — **234 checks** against deployed `94153a6` |
| Checkpoint equivalence | live `94153a6` differs from `0aa8419` only in this handoff; bundle-equivalent |
| Product CI and deploy | success — run `33548428392`; whole **834-test** matrix green |
| Deployed docs-head CI and deploy | success — run `33551674634` |
| Release integrity | clean — 8 files served byte for byte from `94153a6`'s own CI manifest |
| Network boundary | one `fetch` in `src`, for same-origin build identity |

The local timeout occurred in `phase84.spec.ts:481` before its product
assertion. The captured page remained on **Loading the QA laboratory…** after a
dynamic route navigation and never reached the QA heading. The exact test then
passed at 360, 430 and 1,280 on a clean server. It is reported as 833 plus one
timeout, not rounded to 834; CI supplies the clean whole-run result.

QA-91-001, QA-91-004 and every other Round 1 PASS remain intact. The nineteen
D-210 findings remain untouched with backlog hash
`58d5af071355d252c4a254fc685fcc9e8e88f417`;
`docs/ROUTING_91_BRIEF.md` remains present; CASE B remains deferred; routing 92
has not begun.

---

## Round 3 FAIL — complete builder repair handoff

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.
**Intelligence level:** **Max** — this is a conservative parser-boundary repair
where over-correction can invert ordinary owner meaning.
**Conversation:** **CURRENT** — return to the original routing 91 Claude builder
conversation.

```text
Routing Phase 91 repair after independent QA Round 3 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full. The Round 3 report at the end is
the authoritative independent QA verdict. Keep the Phase field exactly 91 and
keep the phase YELLOW.

QA-91-005 and QA-91-006 are closed. Preserve the set-aside contract exactly:
the confirmation states what happens, owner words and truthful lifecycle history
remain, the old milestone is paused rather than retyped, and unstarted, started,
and part-done Money behavior is neither current nor offered back after
withdrawal.

Before changing implementation, reproduce both remaining semantic failures in
fresh ordinary-owner stores that never open #/qa:

1. "Not about money, debt, or savings" and "Nothing to do with salary, savings,
   or debt" offer Money because a comma ends the denied span before the other
   coordinated objects. Hold the controls: "Not about money, but about
   certification" must name Career, while "No debt, no savings, no salary" must
   remain positive Money evidence.
2. "More money before the 15th of March 2027", "More money by March the 15th,
   2027", and "More money by Q3 2027" omit how much because 15 or 3 survives
   date stripping and becomes an amount. Hold real amounts beside those same
   horizons, direct numeric and month-word dates, bare years, and the existing
   two-digit-year proof.

Repair the semantic classes, not those strings. Do not make every comma continue
a denial, treat every digit near a date word as non-money, add hidden phrase
special cases, add a model/network call, add a score, add another question, or
widen the three readable domains. The bounded parser must distinguish list
coordination from a genuine clause turn and date components from real amounts,
then abstain where it cannot do so safely.

Add direct positive/negative pairs for coordinated denied lists versus
contrastive clauses and ordinary negative goals. Add date-role pairs for
indirect month/day grammar and quarters versus real sums beside the same
horizons. Titles must state no more than their assertions prove. Reintroduce the
comma boundary and the date-digit leak independently, show each new regression
fails for its title's reason, and restore the tree.

Preserve every accepted CASE A behavior, QA-91-001, QA-91-004, the Round 3
withdrawal passes, byte identity, derived provenance, privacy, one-question
budget, both proving domains, three-day non-reproposal, B1, no-score, one-fetch,
all explicit deferrals and all nineteen D-210 findings. Keep the fixed-clock and
overridable-port instrument corrections. CASE B and routings 92-97 remain out of
scope.

Run npm run verify, one whole 360/430/1280 browser matrix at one worker on a
clean port, the Android-style gate, privacy and copy scans, checkpoint
equivalence, CI, and live release integrity against the deployed head's own
manifest. Commit and push the repaired product checkpoint, wait for Preview
deployment, then append the builder repair record and a complete Round 4 retest
handoff to this same file. Dispatch Round 4 to the SAME Codex QA conversation at
High. Do not ask the owner to paste file contents, do not remove
docs/ROUTING_91_BRIEF.md before GREEN, and do not start routing 92.
```

### Short launcher

**Model:** Claude Opus 4.1 or nearest current Opus-class equivalent.

**Intelligence level:** Max.

**Conversation:** CURRENT — the original routing 91 Claude builder conversation.

```text
Continue routing Phase 91 after independent QA Round 3 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_91_QA_HANDOFF.md in full and execute the complete Round 3
builder repair handoff at the end exactly as written. Keep Phase 91 YELLOW and
do not ask me to paste the file contents.
```

<!-- LCO_COMPLETE -->
