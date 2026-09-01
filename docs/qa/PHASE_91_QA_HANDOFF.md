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

<!-- LCO_COMPLETE -->
