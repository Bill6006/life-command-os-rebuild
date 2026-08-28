# Phase status

Report format: canonical plan section 58.

**From Phase 5 onward, a builder conversation may not approve its own phase.**
An implementation that believes it is finished reaches
**YELLOW — READY FOR INDEPENDENT QA**, and a separate conversation tests the
deployed checkpoint and writes `docs/qa/PHASE_XX_QA_HANDOFF.md` before anything
becomes GREEN. Owner decision D-077; the protocol is [`qa/README.md`](qa/README.md).

Phase 4 is the argument for it, and the record below is the evidence: every
automated gate passed, and the phone found five defects afterwards. Phase 7
repeated the shape from the other side — its own Android gate came back clean,
and reading the same screen as a person found five more.

**The canonical plan is now v1.2** (D-079) — the independent-QA gate and the
eleven-domains/ten-pages rule are now stated directly in the plan itself rather
than only in this project's decisions, and Phase 6 gains progressively
disclosed evidence/analytics. Every handoff from here also names a recommended
**Claude model**, not only an intelligence level (D-080). Neither change
reopens Phase 4 or any completed phase.

**The domain count changed after Phase 82.** The plan now states **twelve
domains and eleven baseline pages** — _Love / Dating / Romantic Life_ was added
by owner decision (D-168, amending D-078). The Health & Recovery page still
covers two domains, which is where the remaining difference comes from.

---

# Product adjudication — between Phase 82 and the next build phase

**Status: COMPLETE AND APPROVED, 2026-08-27.** Not a build phase; it produced a
decision, not a diff. The record is
[`PRODUCT_ADJUDICATION.md`](PRODUCT_ADJUDICATION.md) and it was approved by the
owner with amendments, recorded as **D-158 … D-173**.

An independent sealed owner-use review
([`qa/WHOLE_APP_OWNER_USE_REVIEW.md`](qa/WHOLE_APP_OWNER_USE_REVIEW.md) — 44
findings, 36 sealed browser evidence entries, 88 owner wishes) landed in the
middle of Phase 82 and was deliberately left unread by both conversations for all
twelve rounds so it could not bias the repairs. It was read first in this round,
in full, and reconciled against the intelligence audit, the canonical plan, this
log's D-001…D-157 and the repository itself.

**The central finding survived verification against the tree.** There is no
`destination`, `milestone` or `baseline` concept anywhere in `src/` — the only
matches are URL routing. Every object Phase 82 built is scoped to today or to a
bounded three-step course. The product can represent what to do next and cannot
represent what the owner is trying to become, so it cannot represent progress,
and cannot represent a strategy that fails. That changes what a domain page
**is**, and Phase 9 would otherwise typeset a fact-viewer and pass the owner's
phone gate on it.

**Three things this round found by reading the code rather than the documents.**

- **F43 is confirmed, not suspected, and the mechanism is located.**
  `stateOfChosen()` (`engine.ts:944`) matches `(verb, object.id)` across
  `situation.recentMoves`, which is a **three-day** window (`situation.ts:1282`)
  with no day filter. `TRANSITIONS.completed` is `[]` and `NowScreen.tsx:644-656`
  disables every action not available from the state — so a walk completed on the
  22nd makes a fresh walk on the 25th read _"Where this stands — Done"_ with all
  five controls inert. The lifecycle planner is already correct; the display path
  is not. **D-160**, and routing 83's second work package.
- **The routing constraint is wider than Phase 9.** Canonical Phases **10, 11 and
  12 are equally unroutable** as bare integers — all ≤ 82 — and only Phase 9's
  case had been noticed. **D-159** and new plan section 43A.
- **F07 is cheaper than the review knew.** `action-unable-now` already carries an
  optional `blocker`, plumbed to `request.reason` and stored on the episode, and
  **no surface writes it and nothing reads it** — AUD-0050's pattern, one record
  kind further on. **D-164**.

**Disposition of the 44 findings.** None is fully solved by Phase 81 or Phase 82,
so "already handled" was not available as a disposition and was not used. Twelve
need work before Phase 9; nine need only that Phase 9 leave room for their shape
(now written into plan section 54); twenty-three belong after it. Four are
refused as proposed and keep a narrower half. The largest deferral is deliberate:
F20–F25, F28 and F29 are each an **instance of one finding in one domain**, and
building twelve progression models before the shape is proved on three is the
mega-phase failure the audit already refused once.

**Five owner questions closed:** Q7 (six distinct emotional dimensions, no
composite — D-166), Q8 (private influence as one owner-controlled permission,
default off — D-167), romantic placement (a twelfth core domain with its own page
— D-168), the review surface (Insights and domain pages, no new tab — D-169), and
Faith (passivity is interim, not the design — D-170). Cross-device continuity is
deferred (D-171). **Q6 is reopened before routing 91** with the finite concept
vocabulary explicitly refused as a permanent ceiling (D-172). Q1 and Q4 remain
deferred.

**Nothing was reopened.** Phase 82 stays GREEN, Phases 1–81 are untouched,
canonical Phase 10 keeps its scope (D-109 stands, and a routing label is not a
re-scope), and no canonical phase is renumbered.

## The campaign from here

```
82 GREEN ─▶ adjudication ─▶ 83 ─▶ 84 ─▶ 90 ─▶ 91 ─▶ 92 ─▶ 93 ─▶ 94
```

| Routing | Product / canonical name                                 | State, or what it waits on        |
| ------- | -------------------------------------------------------- | --------------------------------- |
| **83**  | The instrument, and the things that are untrue           | **GREEN — closed, round 2**       |
| **84**  | What the owner is trying to become                       | **YELLOW — with independent QA**  |
| **90**  | **Canonical Phase 9** — visual coherence, motion, mobile | 84                                |
| **91**  | Later intelligence — Reach, then Validity                | 90, and Q6's adjudication (D-172) |
| **92**  | **Canonical Phase 10** — performance, PWA, reliability   | 91                                |
| **93**  | **Canonical Phase 11** — adversarial hardening           | 92                                |
| **94**  | **Canonical Phase 12** — release                         | 93                                |

Product phase names and routing integers are different things; plan section 43A
is the only place they are reconciled, and the `**Phase:**` field carries the
routing integer.

**Routing 83 was briefly claimed by the adjudication round itself** — the held
`NEXT_PROMPT.md` written at the Phase 82 closeout carried
`**Phase:** 83 — product adjudication`. That round was never dispatched through
the orchestrator, no `PHASE_83_QA_HANDOFF.md` exists, and the owner ran it
directly. Routing 83 belongs to the build phase, and the held handoff's scope is
superseded rather than reused.

---

# Routing Phase 84 — What the owner is trying to become

**Status: YELLOW — REPAIRED AFTER QA ROUND 2 FAIL, AWAITING ROUND 3 RETEST.**

Independent QA has failed this phase twice and been right twice.

**Round 1** returned FAIL on acceptance items 1, 2 and 4, with six findings.
**Round 2** confirmed five of those six closed and found four more: a cold-start
defect the manual owner-use check was added to look for, a Health confirmation
that the Round 1 repair had made false, a Timeline tag still contradicting its own
sentence, and a promise on the blocker path that the guard written to forbid it
did not match. All four are repaired.

It stays YELLOW. A builder conversation may not approve its own phase (D-077),
and this record says what was built and repaired and where to look at it; it does
not say the phase passed.

Canonical product name: _the destination and discovery structure — canonical
Phase 9's product contract_. **Routing integer 84** (plan section 43A, D-159) —
the `**Phase:**` field of every handoff in this phase and its rounds carries
`84`, never a decimal and never a canonical phase number.

The phase the product adjudication created (D-158), blocked on four owner
decisions that were all answered before it started (D-166 … D-169). It opened
none of its own.

## What it is, in one paragraph

The review's central finding, verified against the tree and true until this
phase: there was no `destination`, `milestone` or `baseline` anywhere in `src/`.
Every object the product held was scoped to today or to a bounded three-step
course, so it could represent **what to do next** and could not represent **what
any of it was for** — which is why it could not represent progress, and could
not represent a strategy that fails. Routing 84 builds that object, the
questioning surface that finds out about it, the authoring route that makes its
pieces reachable, the evidence semantics that stop attendance reading as
capability, the states an interrupted evening actually has, and the grammar for
correcting what was recorded.

**The instrument routing 83 built is how it is measured.** That phase's
deliverable was an enumerated list of the points where an ordinary owner journey
**cannot proceed** — five of them, produced by walking the app from a
near-empty store. This phase's claim is that the same walk, on the same store,
through the same controls, now gets past all eight steps.

## Checkpoint

| Fact                    | Value                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Product checkpoint      | `cdd9259` — the Round 2 repair, and the commit the aggregate gate was run on                      |
| Round 2 checkpoint      | `94e1716` — the Round 1 repair, which Round 2 tested and failed                                   |
| Round 1 checkpoint      | `42667ea` — what Round 1 tested and failed                                                        |
| Preview                 | https://bill6006.github.io/life-command-os-rebuild/preview/                                       |
| Owner-visible behaviour | **changed** — Now, Insights, and every domain page                                                |
| Owner phone check       | owed before release; not a blocker QA can clear                                                   |
| Independent QA          | **Round 1 FAIL** and **Round 2 FAIL**, both repaired; Round 3 dispatched in `docs/NEXT_PROMPT.md` |

**The documentation head is a later commit than the product checkpoint**, as it
was in Round 1. It carries this record, the Round 2 dispatch and two corrected
check labels in `scripts/android-gate.mjs`; none of it is bundle-relevant, and
`checkpoint-equivalence.mjs` is the way to confirm that rather than take it on
trust (D-097, D-180).

## Exact verification results

At the repaired checkpoint, not at the one QA failed.

| Gate                                      | Result                                                               |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `npm run verify`, clean checkout          | **PASS** — the aggregate command, format included (D-180)            |
| Unit / contract / synthetic / adversarial | **1,841 passed** in 83 files (1,834 at Round 2, 1,812 at Round 1)    |
| Browser, three widths, one worker         | **690 passed** at three widths, 230 per width (675 at round 2)       |
| Android-style gate, deployed              | **clean — 230 checks** against deployed `cdd9259` (219 at round 2)   |
| Privacy scan                              | **clean** — 286 tracked files                                        |
| Block sweep                               | **PASS** — unchanged                                                 |
| Copy guards                               | **PASS** — no percentage, rank, grade or score about him or Adaya    |
| Commits not on any remote                 | **none** at the handed-off head (D-180)                              |
| Checkpoint equivalence                    | **PASS** — deployed `cdd9259` serves the same bytes, nothing between |
| CI                                        | Verify **success**, Deploy preview **success**                       |

## Independent QA — round 1, and the repair

**Result: FAIL.** Codex, at High, on the deployed `3dbfc9b` (bundle-equivalent to
`42667ea`). Acceptance items 3, 5, 6 and 7 passed. Items 1, 2 and 4 failed. The
full report is [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), Round 1,
written and owned by QA and committed here unedited as `328e42f`.

**Every finding was real, and the pattern in them is one thing.** Five of the six
were reachable only by _using the app_, and every one of them had a passing test
beside it. The gate was 1,812 assertions and 648 browser cases; the walk that
found these was a person opening a near-empty store and pressing the controls in
order. That is D-161's claim about what a capability is, arriving a second time
in the same phase.

| Finding   | What it was                                                                          | Repair                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-84-001 | a Health destination changed nothing on Now, from the near-empty store               | `healthCandidates` now proposes the Health destination's **next milestone** as a candidate. An owner-created entity ranked by `goal-fit`, no dimension added, and no duration invented — the step is proposed with `durationUnknown`, so the app never says how long it will take. |
| QA-84-002 | **Only part of it** was counted as a completed session and called _Followed through_ | `readProgress` routes `extent: 'partial'` to its own rung, **part-done**, with its own sentence; `describe.ts` says _Got part of the way_ on Timeline and in the correction list. One distinction, kept by every reader.                                                           |
| QA-84-003 | a course finished through ordinary controls never appeared as a finished course      | `readProgress` reads `situation.threads` and `thread.finished` rather than a raw `state === 'done'` nothing writes. The dead assumption was in **three** readers, found by a source guard, and all three now read the same thing (DEF-0119's class, one reader out).               |
| QA-84-004 | the weekly-chunk question stored one calendar date                                   | The form asks **which day of the week** and `authoringRecords` writes a `weekly` recurrence from it. A recurring question stores a recurring fact, and the note no longer points at a control that is not on that screen.                                                          |
| QA-84-005 | a blank optional next step was confirmed as the literal next step _"that"_           | `milestoneConfirmation()` in `authoring.ts`, so the sentence is a function of what the owner typed and a test can hold it to what is written. It was composed inline in JSX, which is why nothing caught it.                                                                       |
| QA-84-006 | canonical section 54 told Phase 9 the second agenda shipped on Life                  | Corrected to Insights, which is where DEF-0122, D-169 and the deployed product all put it.                                                                                                                                                                                         |

The punctuation sibling QA named beside QA-84-005 — _"Finish the subnetting
lab.."_ — is repaired at the composition boundary: `ownerPhrase()` in
`recommendation.ts` strips trailing terminal punctuation from the owner's own
words as they enter a generated sentence, so the app never doubles its own full
stop onto his.

**And the coverage QA said was missing is there.** The deployed Android gate had
187 checks and touched none of this phase's controls; it now walks the aspiration
form, the progress panel, the second agenda's proposal, and the blocker question
with a thumb, on the deployed bytes. The browser suite gained the Health
counterfactual, the partial-progress copy, the naturally completed course, the
real discovery obligation flow and the empty milestone confirmation.

### Two owner-directed corrections in the same round

Neither is a QA finding. The owner hit both in real use of the deployed build and
directed them into this repair; they are named here so Round 2 meets them as
declared scope rather than as unexplained diff. QA-84-001…006 are unchanged,
unreprioritised and unreplaced by them.

**An eighth blocker cause — _"Can't leave — someone's in my care"_ (D-187).** Now
offered a walk while his daughter was asleep and there was nobody else to watch
her. The nearest of the seven was `someone-needs-me`, which is wrong twice —
nobody needed his time, he was not free to leave — and `standing: false`, so it
wrote nothing durable at all. The new cause is `standing: true`, so it becomes a
constraint on the domain page with **Not true any more** beside it.

**And it promises nothing**, because nothing in the engine acts on it:
`applyConstraints` never reads `situation.constraints`, and `cautionsFor` matches
a constraint's concept against a candidate's `leansOn`, which never holds a
`blocker.*` concept. Making it act is F08's blocker aggregation, adjudicated to
later Validity. A copy guard asserts that no owner-visible string on the path
claims a future recommendation will change, and it is proved by reintroduction.

**The discovery card stops bypassing the confirmation contract (D-188,
DEF-0123).** The owner typed **More money** into the Career prompt, pressed
**That is it**, and believed he had confirmed an interpretation. `Discovery.tsx`
never imported `proposeAuthoring`: its destination branch was a direct call to
the record builder, and no interpretation, no `creates` and no `unknowns` was
ever shown — while the domain page's form had all three. Same class as QA-84-005
one surface across.

The repair is `proposeDestination()`, returning the same `AuthoringProposal`
shape and composing `milestoneConfirmation()`. `AUTHORABLE_KINDS` stays at six:
D-188 records why widening a closed set to reuse a function was the worse of the
two available moves. **And the bypass cannot come back** —
`everyAuthoringSurface()` in `tests/synthetic/journey.ts` reads which feature
files call a builder that brings something into being and which of them propose
first, with one named exemption carrying its reason. Putting the direct call back
fails it.

**No semantic interpretation was added.** The aim is stored byte-identical to
what he typed, in the prompt's own domain. _"More money"_ under a Career prompt
stays Career; what the phrase means is routing 91 package 1 (D-172), and neither
correction opens it.

## Independent QA — round 2, and the repair

**Result: FAIL.** Codex, at High, on the deployed `eaf4536` (bundle-equivalent to
`94e1716`). Five of the six Round 1 findings closed by their own reproductions;
QA-84-002 only partly. Four new findings, all real. The full report is
[`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), Round 2, committed here
unedited as `180fcdd`.

**What Round 1 got right, Round 2 kept.** The standalone Health counterfactual now
changes Now with no Career destination near it, the part-done rung and sentence
hold, a naturally completed course renders as a course, the weekly question stores
a weekly recurrence and changes a later Thursday, the blank milestone is honest,
and canonical section 54 is correct. Items 3, 5, 6 and 7 passed again.

| Finding   | What it was                                                                                                                                                                     | Repair                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-84-007 | on a genuinely fresh store, Now's only control was **Open the QA laboratory** — and in production, hidden, so nothing at all. Life listed no areas; every domain page was blank | One clause in two files: `LifeScreen` and `DomainPage` both gated on `snapshot.records.length === 0`. `InsightsScreen` never did, which is why the agenda was the only door. Both now gate on readiness alone, and Now's abstention names the ways on — **D-189** |
| QA-84-008 | Health promised _"it will not start suggesting it"_ and then suggested it, one screen later                                                                                     | The sentence described the behaviour QA-84-001's repair had just changed. It now says the app will start suggesting it on evenings there is something to spend on it, which is the condition the generator applies — **D-190**                                    |
| QA-84-009 | Timeline's tag said **Done** directly above _"Got part of the way"_                                                                                                             | `tagOf(record)` reads the extent; `tagFor(kind)` stays for the schema sweep. A rendered entry is one statement — **D-191**                                                                                                                                        |
| QA-84-010 | the blocker note said the app could _"offer something that fits next time"_, which nothing performs — and the D-187 guard collected the string without matching it              | The copy says what is recorded and where. The guard is now over the **class** — actor × non-present modality × adaptation verb — in one module all three gates import, rather than three narrower phrase lists — **D-192**                                        |

### The two that are worth reading twice

**QA-84-007 is the product's first impression, and no gate could have seen it.**
Every automated gate starts by loading a scenario. The manual cold-store check
was added to Round 2 precisely because nothing walked a first run, and it found
this on the first screen. The abstention itself was right and is untouched — the
engine will not guess — but abstaining from a recommendation had been allowed to
mean having nothing to offer, and those are different things.

**QA-84-010 is the one to learn from.** D-187 forbade exactly this claim, one
round earlier, and the guard written with it did not catch it — it **collected the
live string** and its five phrases did not appear in it. Three copies of that list
had grown, in the synthetic suite, the browser suite and the Android gate, and all
three were green while the promise rendered. A guard that lists phrases is a
record of the wordings somebody thought of. D-192 replaces it with the class, in
one module, and names the two shipped strings in the fixture so a future pass
cannot be earned on the generic examples.

**QA-84-008 shows how two green tests hold a contradiction open.** One asserted
the Health sentence said the app would not suggest the step; another proved the
step becomes a candidate. Both true, neither able to see the other. The
regression now reads the confirmation and then makes the app do the thing, in one
test.

**And Round 1's repair produced Round 2's defects.** QA-84-008 exists because
QA-84-001 was fixed. QA-84-009 exists because QA-84-002 was fixed in the sentence
and argued away in the tag. That is not an argument against repairing; it is the
argument for a retest round, and for the four decisions above being about classes
rather than cases.

## The six packages

### Package 1 — the destination object (F01, F35, F26, D-162)

A `destination` record and a `destination` entity kind. Four parts, and every
one of them is either the owner's own words or a state from a closed list: what
he is aiming at, where he is now, what would count as getting somewhere, and
what he is unsure about. **There is no number on the record and nothing on it
that can be divided by anything else** — which is how D-162 is enforced rather
than remembered.

**What is next is a `goal` carrying `milestoneOf`, not a second record kind** —
**D-181**. A milestone is a named objective with a date and named work in it,
which is what a goal already is, and D-178's rule is that one thing has one name
in the layer every surface reads. What the field buys is the **word on screen**
and what may be concluded from finishing it.

**How a destination reaches a decision, and why that is the only wiring that was
allowed.** Through its milestone, which is an ordinary goal, ranked by
`goal-fit` exactly as every other goal is. No dimension was added and no weight
moved: Phase 82 re-cut the instrument and re-baselined the tournament, and
D-137/D-138 protect both. The milestone's entity is the kind that area's work
actually is — a `learning-topic` in Career, a `financial-goal` in Money, a
`routine` in Health — which is what closes routing 83's own step-3 stop: the
career generator returns nothing without a topic the owner is on, and nothing an
owner could tap made one.

**Proved on Career, Health and Money.** Fatherhood is outside the proving scope
and nothing here touches the growth model.

### Package 2 — progress evidence semantics (F05, F11)

Six rungs in `src/domain/progress.ts` — attempt, completion, quality, retained
capability, transfer, milestone — each with its own sentence **generated from
its own count**, and each with a statement of what it is _not_ evidence of. Two
new `OutcomeAspect`s, `retained` and `transfer`, asked about a **course** days
after it finished rather than about a session at the end of it.

**A completed session, a completed course and a milestone are three different
things**, counted separately and worded separately, and a milestone is reached
only when the owner says so — never from a run of completions.

`enough-done-today` joins the no-action taxonomy, and **D-185** is the rule that
came with it: a new no-action reason re-labels a silence and never creates one.
It is computed after the arbiter has finished, from the reason the arbiter
actually reached.

### Package 3 — owner authoring (F04, F19, F36)

One create-and-confirm control for a goal, a routine, a person, a place, a skill
and an obligation. The owner says what kind of thing it is and what he calls it;
the app says back what it understood, what it will create and **what it is not
going to assume**; he confirms.

**It is the first thing in the product that brings a semantic entity into
being.** Routing 83's instrument found that no control under `src/features`
called `createEntity` and that `constraint`, `goal`, `commitment` and
`relationship-event` had no owner route at all. All four are closed, by building
controls for them rather than by moving them onto the not-owner-authored list,
and `recordKindsWithNoOwnerRoute()` now returns **nothing**.

**D-182**: an authoring gesture writes the entity before the record, because the
two failure modes are not symmetric.

**Not a routines library.** AUD-0045 stays in the later Reach package: the route
exists, and nothing generates a recommendation from an owner routine. The
instrument asserts both halves.

### Package 4 — the second information agenda (F02, D-163)

`src/intelligence/discovery.ts`, on **Insights** and never on Now. Its own weekly
budget of two, separate from D-036's three a day, which is untouched. Prompts
are generated from what the app does not know, so the agenda empties itself as
it learns; a skip writes a record and is respected; an answer lands as a
`destination`, a milestone or a span of the week rather than as a survey row.

**D-184**: one question per object at a time, because a destination has four
parts and a prompt per gap would make answering the first question replace it
with three.

It began on Life and moved, and the move is recorded as DEF-0122 rather than
tidied into a design decision: Life is held to about a screen and a half on a
phone and had no room, and Insights is where D-169, F02 and AUD-0043 all
already put a _"what the app is working out"_ surface.

**It shows what an answer changed**, worked out by replaying the decision
without the record the answer produced — the same technique the guide uses to
decide whether its last question was worth asking, and the rule an agenda cannot
fake.

### Package 5 — inability, interruption, the states (F07, F10, F13, D-164)

The `blocker` field that has existed and done nothing since Phase 3 now has a
control and a reader. `blockerQuestionFor` never returns "nothing": it either
asks or says **why it is not asking**, from a closed list of reasons — which is
what makes the silent path something a test can hold. Two of the seven causes
are about the world rather than about one evening and become durable
`constraint` records, listed and correctable on the domain page.

`part-done` joins the lifecycle. It is a settled state that is not terminal, and
it is the evening real life actually has.

An interrupted or half-finished move is offered back on Now, through the state
machine's own transitions — `TRANSITIONS` has always allowed the return, and no
surface offered it.

### Package 6 — correction grammar, private consent (F32, F30, D-165, D-167)

Four gestures, each stating **what it will change, what it preserves and how to
get back** before it acts, from a table that cannot gain a fifth without all
three sentences. Two of them are new controls: withdrawing an entry, and moving
one to the day it happened. **Backfilling an entry that was never recorded is
deliberately absent** — D-165 leaves it in the later Reach package with
AUD-0050's retraction half.

One owner permission, on the Private page, **off by default**, and enforced
structurally: while it is off `createFactReader` cannot read a private concept
at all, and the reading resolves to `unknown` with the new reason `withheld`.
When it is on, the rendered reading stays the discreet placeholder — D-167's
structural discretion guard, which is a precondition rather than a substitute
for consent.

## Eight defects, and none of them was reported by anything outside the build

Worth its own section because of where they came from rather than what they
were. Nothing external found any of them: two by the builder's own gate the
first time it ran against code that existed, three by the builder reading its
own work back, and three by the browser suite and CI on a checkpoint that had
already been pushed.

**DEF-0115 and DEF-0116 are one class, and it is the class D-179 was written
for.** Two guards that read source could not see correct code: the
accessible-name scan did not recognise a plain quoted `htmlFor`, so every
correctly labelled control this phase added read as unlabelled; and the
instrument's builder reader looked for a return type ending in `Record`, so it
could not see either of the two highest-leverage controls in the phase — both of
which return entities and records together, because that is one act (D-182).
The second is D-179's own failure mode occurring **inside** the guard D-179 was
written for: the exhaustiveness claim stayed true of everything the reader could
see. Both were one edit from being hidden behind an exemption, and **D-183** is
the rule that came out of it: a source-reading guard is widened by the spelling
it could not read, never exempted from it.

**DEF-0117 and DEF-0118 are the class the whole review is about** — the app
saying something the owner did not.

- Naming the next step on a destination that already existed ran the destination
  builder again, so a second `destination` record carrying the same aim went
  into the history. The entity id is derived from the label, so the entity was
  written over itself and nothing errored; the duplication is in the record
  layer, and the surface reads the record layer. The owner would have read his
  own aspiration twice on one page, with half its milestones under each.
- The second agenda's commitment prompt asked for a name and a start time and
  then wrote `weekdays: [3]` — a Wednesday out of a question that never
  mentioned a day. F36's own sentence is _"do not silently infer a consequential
  fact from ambiguous prose"_, and that is this, in the phase built to answer it.

Both have a regression that fails when the shape returns, and adding the
milestone builder made the route table incomplete — which the reader D-183 had
just been widened to notice, and did.

**DEF-0119 is the one worth reading last**, because it is the pattern this whole
phase exists to stop repeating. `dueCourseReflections` asks a finished course
what is left of it, and it keyed on `thread.state === 'done'` — a state
**nothing writes**. The Life panel offers _Stop this_ and _Pick this up again_,
so a course that simply runs to its end stays `running`; the fourth thread state
has existed since Phase 82 with no control that reaches it. Two new
`OutcomeAspect`s would have shipped with no path to either, which is
`action-unable-now.blocker` all over again, one phase after routing 83 found it.

It was caught by writing the test that asks whether the thing can be **reached**
rather than whether it behaves once reached. Every other test of the two aspects
passed without it, and that is worth saying plainly: D-161's whole argument is
that reachability is a separate question from correctness, and this phase found
its own example of the difference.

**DEF-0120 to DEF-0122 came from the browser, which is the point of having
one.** Every one of them was invisible to 1,812 synthetic assertions.

- The blocker question was nested under the branch that draws the move currently
  on screen — and the move he pressed has **left** that screen by then. It
  survived only when something else happened to take its place, so it vanished
  on exactly the evenings its answer is worth most. It passed at two widths out
  of three, which is what that kind of defect looks like.
- `part-done` shipped as _"Got some of it done"_, which contains **Done** —
  two controls in one always-drawn row whose accessible names are substrings.
  Twenty-six existing assertions broke without being changed.
- And Life became a wall. The second agenda rendered a question, a note and an
  input permanently on the screen Phase 5 spent a phase reducing from homework,
  and `shell.spec.ts` measures it. Closing it until tapped got 2.09 against a
  ceiling of 1.9; one line and one link got 2.02; dropping the panel chrome got
  1.91. **The budget was saying the thing it was written to say**, and shaving a
  sentence until a measured constraint stops complaining is the move the
  constraint exists to stop — so the agenda moved to Insights, where D-169,
  F02 and AUD-0043 all already put it.

**And the builder's own reading of the browser run was wrong for one cycle**,
which is where **D-186** comes from: the suite was piped through `tail -6`, a
failing summary is longer than a passing one, so the visible tail read _"622
passed"_ over an invisible _"26 failed"_ — and the pipeline exited zero because
that is `tail`'s status. CI read it correctly a few minutes later. A gate's
result is its exit status, never the tail of its output.

## The gate, item by item

The house form: **where it is proved**, not whether it passed.

| #   | Acceptance item                                                                         | Where it is proved                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A desired outcome in each proving domain changes the next recommendation                | `destination-and-discovery.test.ts` — Career, Health and Money separately, each from the near-empty store; `phase84.spec.ts` reads the change on Now                           |
| 2   | A session, a course and a milestone are three things; no capability from attendance     | `destination-and-discovery.test.ts` — the rung sentences at four counts, the ladder's order, and five sessions leaving a milestone unreached; `phase84.spec.ts` reads the page |
| 3   | Every fixture object reachable through ordinary use                                     | `destination-and-discovery.test.ts` — one of each built from empty; `ordinary-use-journey.test.ts` — `recordKindsWithNoOwnerRoute()` is empty                                  |
| 4   | The agenda asks what would not change today, and volume falls                           | `destination-and-discovery.test.ts` — the commitment prompt, the monotonicity run, and the library sweep; `phase84.spec.ts` proves it is on Life and not on Now                |
| 5   | "Can't right now" produces a durable correctable statement, and asks nothing when known | `destination-and-discovery.test.ts` — both paths, and the silent one with its reason named; `phase84.spec.ts` presses it                                                       |
| 6   | Each correction states its consequence; a private reading is stored, not reasoned from  | `destination-and-discovery.test.ts` — the gesture table, withdraw, re-date, and the permission off, on and off again                                                           |
| 7   | The standing guards still bite                                                          | `destination-and-discovery.test.ts` — swept over every destination reading in the library and every progress sentence at every count, with a reintroduction that fails         |

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the deployed Android-style gate, the privacy
scan, the block sweep, and the copy guards.

## What this phase deliberately did not do

- **No strategy evaluation** (F03). A thread gains nothing; the verdict belongs
  to later Validity, and the precondition it was waiting on — a destination —
  now exists.
- **No pattern-discovery engine** (F15/F17/F18). No combinations, no lags, no
  hypothesis machinery.
- **No domain progression models** beyond the three proving domains.
- **No owner routines library** (AUD-0045). The route is built; Reach walks it,
  and the instrument asserts that nothing walks it yet.
- **No scoring change of any kind.** No dimension, no weight, no bar.
- **No new visual language.** Everything routing 84 put on screen is plain on
  purpose; canonical Phase 9 typesets it, and plan section 54 now lists what it
  inherits.
- **No live model.** D-172 keeps D-024/D-025 standing.
- **Nothing before routing 83 reopened**, and
  `qa/WHOLE_APP_OWNER_USE_REVIEW.md` is unaltered.
- **No orchestrator change.**

## Open, and named rather than left to be found

- **Backfilling a historical event** has no owner route, by decision (D-165).
  `ordinary-use-journey.test.ts` asserts its absence so it cannot arrive without
  the decision being amended.
- **An owner routine is nameable and is never suggested.** AUD-0045, later
  Reach. Asserted from both ends, because a route with nothing walking it reads
  as finished from the outside.
- **A destination has no verdict.** Whether a strategy is working is F03's and
  Validity's, and the instrument sweeps `destinations.ts` for one.
- **`REBUILD_PHASE` in `buildInfo.ts` still reads phase 8**, correctly: its
  number names the last **canonical** phase, and 81 to 84 are initiatives
  inserted before canonical Phase 9. What is stale is only its summary. D-034
  keeps that sentence in one constant and a guard pins it; changing it is not
  this phase's.
- **The twelfth domain** — Love / Dating / Romantic Life (D-168) — is approved
  and not built. Routing 84's package 1 is proved on three domains, and adding
  an eleventh page is navigation, which is canonical Phase 9's gate.
- **The evidence panel's composition** (F33 residual, E19) is still routing
  90's, unchanged by this phase.
- **The owner's phone check** is owed before release.
- **Q1, Q4 and Q6** remain the owner's, exactly as D-172 leaves them.

---

# Routing Phase 83 — The instrument, and the things that are untrue

**Status: GREEN — CLOSED BY INDEPENDENT QA, ROUND 2.**

Approved by the independent Codex QA conversation that wrote both rounds, at
repaired product checkpoint `9e6d46e`, on 2026-08-27. D-077 is satisfied: no
builder conversation approved its own phase.

Canonical product name: _the instrument, and the things that are untrue_.
**Routing integer 83** (plan section 43A, D-159) — the `**Phase:**` field of
every handoff in this phase and its rounds carried `83`, never a decimal and
never a canonical phase number.

The phase the product adjudication created (D-158): the ordinary-use acceptance
instrument, and then the small set of things the app states or does that are
wrong. Deliberately Phase 81's shape. Blocked on no owner decision, and it
opened none.

**One FAIL round preceded it, and the shape of that round is the phase's real
record.** Round 1 found four things, and three of them were the same thing: **a
guard that could not fail.** A copy guard holding a list of forbidden phrases
rather than comparing a quantity with its count; a route table saying "every"
with nothing comparing it to source, under a green test called _"keeps the route
table honest"_; and the aggregate `npm run verify` red at a head that had never
been pushed, so CI — which runs the identical command on every push — never ran
on it. The fourth was a layering fact: the table that names an action with its
subject in it lived above the two files that needed it, so one card said _"a
walk"_, _"Move"_, _"what move does for you"_ and _"getting out for a walk"_.

**Both repair sweeps then found more than had been reported.** The wrong plural
was wrong at counts of 1, 4 and 12 rather than only the one an independent
reader stood on, and a deferral's evidence panel was counting the _hold's_
occasions beside the _held move's_ conclusion — DEF-0112, which nobody asked
for.

QA independently reproduced that reintroduction in round 2, watched the guard
fail at all three counts, and restored the source byte-for-byte before passing.

**A builder conversation may not approve its own phase** (D-077). The record is
[`qa/PHASE_83_QA_HANDOFF.md`](qa/PHASE_83_QA_HANDOFF.md), and rounds 1 and 2 in
it are QA's and are not edited.

## Checkpoint

| Fact                        | Value                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Approved product checkpoint | `9e6d46e` — the round-1 repair, and the commit QA tested                                                                    |
| First submission (round 1)  | `582f648`, deployed `ab6b47f` — the checkpoint QA tested and failed                                                         |
| QA read the repository at   | `cba5e44`, documentation-only after the checkpoint                                                                          |
| Deployed at the retest      | `cba5e44`, proved bundle-equivalent to `9e6d46e` with `checkpoint-equivalence.mjs`                                          |
| Closing SHA                 | `ce91f77`, with the finishing sequence recorded at `d42689c`                                                                |
| Deployed at the closeout    | `d42689c`, proved bundle-equivalent to `9e6d46e` — six documentation files changed, none bundle-relevant                    |
| CI at the closeout head     | Verify **success**, Deploy preview **success**                                                                              |
| Preview                     | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                 |
| Owner-visible behaviour     | **changed** — Now, Timeline, the Private page, two domain-page controls, and the belief sentence and its correction control |
| Owner phone check           | still owed before release; not a blocker QA can clear                                                                       |
| Independent QA              | **PASS**, round 2, same Codex conversation as round 1                                                                       |
| Closeout                    | documentation only — no product code changed after `9e6d46e`                                                                |

## Exact verification results

At the approved checkpoint `9e6d46e`, confirmed independently by QA in round 2
and re-run by the builder at the closeout head. The aggregate command is the one
that failed at round 1, so it is stated first and it is the whole command, not
its stages run separately.

| Gate                                      | Result                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run verify`, clean checkout          | **PASS** — the aggregate command, format included (QA-83-004)                 |
| Unit / contract / synthetic / adversarial | **1,765 passed** in 82 files (1,753 in 80 at round 1; 1,675 before the phase) |
| Browser, three widths, one worker         | **591 passed** (582 at round 1; +9) — 197 per width                           |
| Android-style gate, deployed              | **clean — 187 checks** against `921c6b0` (183 at round 1)                     |
| Privacy scan                              | **clean** — 273 tracked files                                                 |
| Block sweep                               | **PASS** — unchanged                                                          |
| Copy guards                               | **PASS** — no percentage, rank, grade or score about the child or the owner   |
| Commits not on any remote                 | **none** at the handed-off head — the check DEF-0114 added                    |
| CI                                        | Verify **success**, Deploy preview **success**                                |
| Checkpoint equivalence                    | **PASS** — deployed `cba5e44` serves the same bytes as `9e6d46e`              |
| Independent QA's own re-run               | **PASS** — QA ran the aggregate gate, the suite and the reintroduction itself |

## Independent QA — round 2, and the GREEN closeout

**Round 2 returned PASS** on 2026-08-27, from the same Codex conversation that
wrote round 1, at repaired product checkpoint `9e6d46e` with the repository and
the deployed Preview both at `cba5e44`. QA-83-001 … QA-83-004 and the
builder-found DEF-0112 are closed; every round-1 PASS is still a PASS; all five
acceptance items pass. **QA recommended the formal GREEN closeout and this is
it.**

**The retest was not a re-reading of the builder's claims.** Three things in it
are worth keeping.

- **QA ran the reintroduction itself.** It replaced the three-band helper with
  the original hard-coded _"The last few times"_, watched the quantity guard
  fail over counts **1, 4 and 12** — naming each offending history — and then
  restored the source byte-for-byte and confirmed 4 / 4. The builder's claim that
  the guard bites was checked rather than believed, which is what D-077 is for.
- **QA independently enumerated the `memory.append` sites** rather than reading
  the repaired route table, and found no owner-facing writer absent from it.
- **The fact-versus-entity stop was verified in the running app**, not in the
  test: _"Cloud engineering (AWS)"_ was entered on the deployed Career page and
  read back, and the QA inspector then showed **2 records, 0 entities**.

**The browser matrix and the Galaxy-class gate were deliberately not
duplicated** — D-090 step 7 asks for that only on a concrete trigger, and the
deployed reproductions matched the repaired tests. The builder's evidence stands
as the record: 591 browser cases at three widths, 187 deployed Android checks.

### What the closeout changed

Documentation only. **No product code changed after `9e6d46e`**, which is the
condition the closeout handoff set: an executable change here would return the
phase to YELLOW and require independent QA again.

### The five acceptance items, as independent QA left them

| #   | Item                                                                          | Round 2 |
| --- | ----------------------------------------------------------------------------- | ------- |
| 1   | An earlier-day completion cannot settle today's occurrence                    | PASS    |
| 2   | No owner sentence asserts a quantity it did not count                         | PASS    |
| 3   | The Private page's promise and Timeline's behaviour agree                     | PASS    |
| 4   | Every owner-facing input has an accessible name                               | PASS    |
| 5   | The ordinary-use journey completes, and its stops are enumerated with reasons | PASS    |

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the deployed Android-style gate, the privacy
scan, the block sweep, and the copy guards — no percentage, rank, grade or score
about the child, and none about the owner.

### No new rule came out of round 2, and that is worth saying

Rounds do not always produce decisions. Round 1 produced four — D-177 to D-180 —
because it found four things nothing could have caught. Round 2 found nothing
new, so nothing was written down, and the absence is recorded here rather than
filled with a restatement of what the repairs already say.

### What remains open at GREEN

- **The enumerated brief is the phase's largest open item, and it is open on
  purpose.** Every line of it is a routing 84 or routing 90 package. It is
  immediately below, and it is the next phase's scope.
- **The evidence panel's composition** (F33 residual, E19) — the deciding
  evidence reaches the reason line and not the panel. Routing 90's; F33's own
  roadmap line assigns evidence composition to the visual phase.
- **The owner's phone check** is still owed before release. Independent QA is
  not a substitute for it and never was.
- **Q1, Q4 and Q6** remain the owner's, exactly as D-172 leaves them.

## Independent QA — round 1, and the repair

**Round 1 returned FAIL** at product checkpoint `582f648`, deployed `ab6b47f`,
on 2026-08-27. Acceptance items 1, 3 and 4 passed. Items 2 and 5 failed, and the
aggregate `npm run verify` gate failed at the repository head. Four findings,
**QA-83-001 … QA-83-004**, all repaired below. The phase stays **YELLOW**.

**The shape of the round is worth reading before the detail**, because three of
the four findings are the same shape: **a guard that could not fail.**

- Item 2's guard held a list of unmeasurable phrases and checked that none
  appeared. _"The last few times"_ is not unmeasurable — it is measurable and was
  never measured — so the list could not see it. **A blacklist finds the phrases
  somebody already thought of.**
- The instrument's route table said "every" and was compared with nothing. The
  test above it, named _"keeps the route table honest"_, checked that ids were
  unique and that a string contained a dot.
- The aggregate verify gate was red at a head that had **never been pushed**, so
  CI — which runs the identical command on every push — never ran on it.

The fourth, QA-83-002, is a layering fact wearing a copy problem's clothes: the
table that names an action with its subject in it lived above the two files that
needed it.

### What was repaired

| Finding        | Defect       | Repair                                                                                                                                                                                      |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QA-83-001**  | **DEF-0110** | The reason clause is generated from `learned.samples`, in the vocabulary `learning.ts` already uses for that number. The guard now **compares** a stated quantity with the count behind it. |
| **QA-83-002**  | **DEF-0111** | `patternNameFor` moved from `insights.ts` down to `domain/recommendation.ts`. The belief, the button and the panel read one table, under the pooled-object rule.                            |
| **QA-83-003**  | **DEF-0113** | Both missing controls listed; a reader that compares the table with the source, **per screen**; the object-creation stop rewritten; the step count corrected.                               |
| **QA-83-004**  | **DEF-0114** | `docs/NEXT_PROMPT.md` formatted, and `checkpoint-equivalence.mjs` now reports commits on `HEAD` that no remote branch contains.                                                             |
| _found by 001_ | **DEF-0112** | A deferral counted the **hold's** occasions beside the **held move's** conclusion. Not reported; found by the class sweep on its first run.                                                 |

### What the class sweeps found beyond what was reported

This is the part worth keeping. Both new sweeps found more than the instance
they were written for.

- **The plural was wrong at three counts, not one.** Reintroducing the
  hard-coded _"The last few times"_ fails the comparison sweep at **1, 4 and
  12** across three histories. An independent reader stood on the singular case;
  the phrase was equally wrong on a history with twelve occasions behind it.
- **A deferral's evidence panel contradicted itself** — _"0 occasions · too
  early to say"_ directly above _"Clearing the kitchen has worked several times
  in situations like today"_. `engine.ts` composes a hold by rewriting the verb
  to `hold`, and the panel counted that verb while concluding from the held
  move's. DEF-0112, DEF-0033's class, found because the sweep asked every
  history at every hour rather than the one that was reported.

### The three rules the round produced

- **D-177** — a quantity in a sentence is compared with the count behind it,
  never matched against a list of phrases. The one exemption is itself a check:
  a quantity quoted verbatim from the record is not the app's claim to make, and
  the sweep allows it only where the phrase appears word for word in a record
  the history holds.
- **D-178** — one name for an action, in the layer every surface can reach.
  `verbLabel` is the eyebrow word on a card and is not a name for a thing; the
  object is named only where the pooled episodes agree on one, and each label is
  named from the set it labels.
- **D-179** — a claim of exhaustiveness is a test, or it is a comment.
- **D-180** — a commit that is not pushed has met no gate, amending D-147.

### The enumerated brief, corrected

Round 1 was right that the object-creation stop conflated two claims, and the
instrument now separates them by doing it rather than asserting it. On **The
first evening**, Life → Career & Learning → **Add this** stores _"Cloud
engineering (AWS)"_ and reads it back on the page — the owner **can** state what
he is studying. What he cannot do is create the **entity** the rest of the app
would need: no learning-topic entity exists afterwards, so no study move is
generated, no goal can name it as a piece, and no course can take it as a
subject. The stop is that a fact has nowhere to go, not that it cannot be
stated.

The brief also now names routing 84's whole authoring list — **goal, routine,
person, place, skill and obligation** — rather than the four the first version
happened to mention.

### What round 1 passed, and what was preserved

Occurrence identity and the unchanged three-day window; Timeline's scope copy;
the Private promise and the withholding behaviour behind it; every accessible
name and purpose note; the five lifecycle controls; every standing copy and
scoring guard; and every explicit deferral. Nothing in this repair touches any
of them, and the suites over all of them ran green on the repaired checkpoint.

One existing test asserted the defect rather than the behaviour:
`outcome-learning.test.ts` pinned _"Reset a space has worked a few times…"_. It
now pins the named form and says why it changed.

## The five packages

### 83.0 — The ordinary-use instrument (F38, D-161)

Three near-empty histories, in the **shipped** library rather than the test tree,
so the QA laboratory offers them and the same store the suite walks is one the
owner can tap through on a phone:

| Scenario            | What it holds                                  | Why                            |
| ------------------- | ---------------------------------------------- | ------------------------------ |
| `the-first-evening` | one record — a single guide answer             | where an ordinary owner starts |
| `four-records`      | four answers over three days, none withdrawn   | F39's case, unambiguously      |
| `three-days-since`  | a walk completed on the 22nd, read on the 25th | F43's case, at the boundary    |

`tests/synthetic/journey.ts` is the instrument. It opens a history into a real
`createMemoryStore` and drives it with the gestures an owner has — a guide
answer, the five lifecycle controls, the result follow-up, a fact correction —
each one calling the builder its surface calls. `OWNER_ROUTES` is the table of
every control that appends to the record, with what it writes **and what must
already exist before it appears**, and `reachableRecordKinds()` walks it as a
fixpoint from an empty store. That is what makes the table an assertion rather
than a claim: `goal` is written only by a control that needs a goal, so it comes
out unreachable without anybody arguing about it.

**The journey gets past three of its eight steps from a store of one record**,
and saying so is part of the instrument — a run that only recorded failures
would be as unfaithful as the fixtures it replaces. Two guide answers produce
_"Move for 25 minutes: a walk."_; **Start it** and **Done** record it; twenty
minutes later the app asks for a reading of current energy rather than a grade
(D-089); correcting that reading on the Health page moves the recommendation to
_"Start winding down now and let tonight be a recovery night."_

**And one answer is enough to be offered a course.** _"Running on empty"_ on the
first evening produces a recovery move with _"Make this a run of recovery
nights?"_ beside it. That is asserted rather than argued, because it is the one
non-obvious entry in the route table: `thread` is reachable from guide answers
alone for exactly one of the three thread shapes, and the study schedule and the
growth ladder ride on moves that need an entity nothing can create.

### The enumerated brief — where an ordinary journey cannot proceed

**This list is the deliverable, and it is routing 84's brief.** It is produced by
a real run and held against a written table in
`tests/synthetic/ordinary-use-journey.test.ts`; nothing here is a description of
the code from outside it.

The numbers are the journey's own steps, so 4, 6 and 8 are absent because those
three are the ones it gets past. The test that produces it is titled for that
count now; at round 1 it said "four and four" over a map of three and five,
which QA reported as a self-contradiction and was right to.

| Step                       | What the owner was trying to do                              | Why it stops                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Where it belongs                        |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **1. Unknown aspiration**  | say what he is trying to become, before he can name it       | No concept in the registry is about anything he is aiming at. The longest-horizon thing he can state is **this week's focus** (`direction.weekly-focus`); there is no destination, no milestone, no starting point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | routing 84, package 1 (F01, F35, D-162) |
| **2. Discovery**           | be asked something that would surface what matters to him    | The guide asked two questions — current energy, soreness — and its whole catalogue is six readings of today's capacity. It has no question that could surface an aspiration, and D-036 caps it at three a day anyway.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | routing 84, package 4 (F02, D-163)      |
| **3. Object creation**     | name something the rest of the app can then refer to         | **He can state the fact and it goes nowhere.** Life → Career & Learning → **Add this** stores "Cloud engineering (AWS)" and reads it back — corrected after QA round 1, which was right that the first version of this row conflated two claims. What it does not create is an **entity**: no learning-topic entity exists afterwards, so no study move is generated, no goal can name it as a piece, no course can take it as a subject. No control on any screen calls `createEntity`, and `constraint`, `goal`, `commitment` and `relationship-event` have no owner route at all. Routing 84's authoring brief is the whole list — **goal, routine, person, place, skill and obligation**. | routing 84, package 3 (F04, F12, F19)   |
| **5. Interruption**        | say he was interrupted, then pick the same thing back up     | **Can't right now** is recorded and the move then leaves the screen: Now reads _"Nothing new for today."_ `TRANSITIONS` allows `unable-now → started, completed or declined` and no surface ever offers them again. Nor is a reason asked for or stored — `planLifecycle` takes one and `NowScreen` passes none.                                                                                                                                                                                                                                                                                                                                                                              | routing 84 riders F10/F11/F13, and F07  |
| **7. Correction (events)** | correct what the app **recorded**, not only what it believes | A fact corrects from its own row on a Life page and that works. Nothing withdraws a completion, moves an entry to the day it happened, or backfills one that was never recorded. `liftVetoRecord` is the only writer of a `correction` record and it corrects a veto.                                                                                                                                                                                                                                                                                                                                                                                                                         | routing 84 rider F32/F36, after D-165   |

**Five further points the instrument found in passing**, recorded so they are not
rediscovered:

- **One write in the app is not an owner control at all.** `MemoryProvider`
  appends the outcomes a history already implies — the morning sleep reading
  after an early night is the answer to a question the app would otherwise ask.
  It is deliberate and it resolves D-043 rather than ignoring it, and the
  instrument lists it as a write that is not a control rather than filtering it
  out, because an instrument about _ordinary owner use_ has to say what it does
  not cover. Found by the exhaustiveness guard round 1 asked for.
- **A control no shipped history reaches.** The coverage correction —
  _"Something's changed"_ — requires an area to be stale **and** to have no
  single overdue reading to point at instead. No history in the library is in
  that state at the moment it is written for; four weeks on from a studying
  history is where it first appears. Its browser test travels to reach it.
- **A field written by nothing and read by nothing.** `ActionUnableNowRecord`
  carries a `blocker`, `Episode` carries it forward, and no surface supplies it
  and no reader consumes it. That is F07 exactly, from the other end.
- **The result follow-up is invisible for the first twenty minutes.** `SOON`
  opens the outcome window twenty minutes after a completion, by design — a
  question about how something went has no answer in the second it finishes. It
  is also precisely what E32 recorded as _"no result question appeared
  immediately"_.
- **The deciding evidence reaches the reason and not the panel.** On the
  weak-topic move, Now says _"the /26 boundaries went wrong twice"_ and the
  evidence panel's conditions are current-condition readings, one of them
  unknown. The capability shipped (AUD-0027/0028) and the composition is
  routing 90's — F33's own roadmap line assigns evidence composition to the
  visual phase. Routing 83's half is the acceptance case, and it is written.

### 83.1 — Occurrence identity (F43, D-160)

A confirmed defect with the mechanism located before any code was written, so
this verified the diagnosis and repaired the display path. **DEF-0105.**

`stateOfChosen` matched `(verb, object.id)` across `situation.recentMoves` — a
three-day window — with no day filter, so a walk completed on the 22nd supplied
the state of a freshly generated walk on the 25th. `TRANSITIONS.completed` is
`[]` and `NowScreen` disables every action not in `availableActions(state)`, so
the card read **"Where this stands — Done"** with all five controls inert.

It now resolves today's occurrence through `openEpisode` — the same function
`planLifecycle` uses to decide what a tap would do, so the state the screen
shows and the transition a tap would take cannot disagree.

**A second bound went with the switch of source, and was caught before the
checkpoint.** `learning.episodes` is every episode in the record and
`view.history.effective` is not filtered by the moment; `recentMoves` carried
that bound in the upper end of its window. Without it, an episode later on the
same owner-local day could settle a move the owner had not touched. It is stated
on its own now, and its regression fails when it is removed. No shipped history
reaches it and the library sweep could not have seen it, so the case is built by
hand.

**Two things were not touched, and both were named in the decision before the
work started.** The lifecycle planner was already correct. The three-day window
is correct for what it was built for and still spans three days — the regression
asserts the 22nd's occurrence is still in `recentMoves` on the 25th, so the test
cannot be passed by making the evidence disappear.

**Which automated tests gave false confidence: all of them.** 1,675 tests and
552 browser assertions were green before the repair and green after it. Not one
read the state of a move on a history whose only completion of it was on an
earlier day. The library-wide sweep added here — every history, every block, `state`
equals today's episode or `shown` — is what says there is no second instance.

**F41's three unreproduced observations were re-run against the repaired build**
(`tests/synthetic/preview-state-observations.test.ts`), and the review's own rule
holds: no cause is named for anything that does not reproduce.

| Observation                                                                                           | Result on the repaired build                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E22** — "Not how it went" removed the recommendation, and the surrounding material changed markedly | **Does not reproduce.** The correction lands, the same move stays on screen with the same evidence, the premise and the goals are unchanged.       |
| **E22** — no correction scope stated and no undo at that moment                                       | **Survives, and it is a product observation rather than a defect.** One tap, one record, nothing between them. D-165's subject; routing 84's.      |
| **E32** — no result question after a completion                                                       | **Does not reproduce.** `subnetting-struggle` asks _"How much did going back over subnetting help?"_ from twenty minutes on, through the next day. |
| **E32** — the question is not specific to what went wrong                                             | **Survives as a wish, not a defect.** F11 and F33; the app asks a question and it names its subject.                                               |
| **E34** — state lost after "Something else"                                                           | **Does not reproduce.** The premise still names what was answered and the guide does not re-ask it.                                                |
| **E34** — two identically titled stopped courses                                                      | **Does not reproduce.** Stopping supersedes the running record; Life lists one course with one reason on it.                                       |

What survives from E34 is that on a thin history, asking for something else
exhausts the day — the same shape as the interruption stop above, and recorded
there rather than twice.

### 83.2 — Sentences that overstate (F39, F33's residual)

**DEF-0106 and DEF-0107.** _"There is plenty of history here"_ fired on any
non-empty store and was read by an independent reader on four records. The
sentence now says what the branch above it checked and nothing more: _"There is
history here, and none of it says how tonight is going."_ No count replaces it —
`history.all` includes superseded and retracted rows, and a quantity that needs a
footnote is worse than none.

**The class was swept and it found two more**, both on Timeline: a page header
claiming _"Everything that happened"_ over a record of what the owner told the
app, and a footer calling the two rows it could show _"the whole record"_ on a
history of four, one of them dated the following day. `mostly-unknown` has had that shape since Phase 1.

**Why every existing sweep passed, which is D-174.** `no-action-copy.test.ts` was
built for exactly this class and renders every reason at every block — against
**one** history, on which `nothing-proposed` always takes the limiter branch. The
catalogue had one axis and the sentence branched on two. It now has the second.

F33's residual is an acceptance case in `decision-evidence.test.ts`: the reason
names the specific failed retrieval, the move cites the record that produced it,
and the panel does not contradict either. Where the deciding evidence sits on the
screen is routing 90's.

### 83.3 — The private promise (F30, plan section 11)

**DEF-0108.** The Private page promised _"Nothing here appears anywhere else."_
while `privacy.ts` withheld the **detail** of a private record from a primary
surface and deliberately kept the row, so Timeline carried a dated **"Private
entry"**. Section 11 allows two repairs; this is the second — the promise now
says what it covers.

Timeline keeps the row, because on the owner's own screen a record that hides
rows from him is a record he cannot trust the length of, and that is the same
reasoning `compose.ts` uses to reach the **opposite** answer for an export, where
the reader is somebody else.

**The structural half (D-175):** the sentence moved into `domain/privacy.ts`,
beside `mayShowDetail` and `discreetPlaceholder`. It was written in one file and
implemented in another, and they disagreed for four phases with nothing able to
notice. The regression runs from both ends.

**Not touched:** whether private evidence may _influence_ a recommendation. That
is D-167's owner permission, default off, routing 84's.

### 83.4 — Form components (F40, D-176)

**DEF-0109.** Two owner-facing inputs had no accessible name: one described only
by `placeholder="What's changed"`, one by nothing at all — in a file that uses
`aria-label` correctly three times. Both now carry a visible `<label>` and a note
saying what the app will do with the answer, which is the half F40 asks for in
the same breath and the half a checker cannot see.

Swept twice: `architecture-guards.test.ts` reads every control under
`src/features` from source and accepts a name from `aria-label`,
`aria-labelledby`, a wrapping `<label>` or a `htmlFor` that points at it;
`phase83.spec.ts` asks the running app the same question through
`element.labels`, which is what a browser actually computes a name from. Every
other control in the app was already named.

## The gate, item by item

The house form: **where it is proved**, not whether it passed. A builder
conversation may not approve its own phase, so this says what was built and
where to look at it.

| #   | Acceptance item                                                                                               | Where it is proved                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A completion of the same move on any earlier day cannot settle today's recommendation or disable its controls | `occurrence-identity.test.ts` — the three-day fixture, today's own completion still settling, the older occurrence still in `recentMoves`, the later-today bound, the library-wide sweep, and the pre-repair match reintroduced verbatim; `phase83.spec.ts` presses the five controls |
| 2   | No owner-visible sentence asserts a quantity of history the app did not count                                 | `history-size-copy.test.ts` — every reason at every block at four history sizes including both four-record histories, plus the library-wide sweep over Timeline's own claim; `phase83.spec.ts` reads both screens                                                                     |
| 3   | The Private page's promise and Timeline's behaviour agree                                                     | `private-promise.test.ts` — from the promise against the display policy, and from a real private record through `assembleTimeline`; `phase83.spec.ts` reads the page and the Timeline                                                                                                 |
| 4   | Every owner-facing input has an accessible name                                                               | `architecture-guards.test.ts` — "F40 — no owner-facing control without a name", swept over `src/features` and proved to bite on both shapes that were in the tree; `phase83.spec.ts` asks the running app through `element.labels`                                                    |
| 5   | The ordinary-use journey completes end to end, and the points where it cannot proceed are enumerated          | `ordinary-use-journey.test.ts` — the eight steps walked through the controls the surfaces draw, held against a written table; the enumerated brief above is its output                                                                                                                |

Standing gates: `npm run verify` from a clean checkout, browser at three widths,
the Android-style gate on the deployed build, the privacy scan, the block sweep,
and the copy guards — no percentage, rank, grade or score about the child, and no
score about the owner.

## What this phase deliberately did not do

- **No destination object, no milestone, no baseline.** Routing 84's package 1.
- **No new domain.** _Love / Dating / Romantic Life_ is approved (D-168) and is
  routing 84's.
- **No consent model.** D-167's permission is routing 84's package 6.
- **No new questioning surface.** D-163's second agenda is routing 84's.
- **No scoring change of any kind.** No weight and no dimension moved.
- **No live model.** D-172 keeps D-024/D-025 standing.
- **Nothing before Phase 82 reopened**, and
  `qa/WHOLE_APP_OWNER_USE_REVIEW.md` is unaltered.
- **No orchestrator change.**

## Open, and named rather than left to be found

The two product items are also listed under the round-2 closeout above, which is
where a reader looking for "what is open at GREEN" will land. They are repeated
rather than moved, because this section is the phase's own list and a reader
working down it should not have to scroll back for the two that matter most.

- **The enumerated brief above is the largest open item**, and it is open on
  purpose. Every line of it is a routing 84 or routing 90 package, and routing
  84's handoff points at it.
- **The evidence panel's composition** (F33 residual, E19) — the deciding
  evidence reaches the reason line and not the panel. Routing 90.
- **The same browser flake reappeared once in the round-1 repair run** —
  `data.spec.ts` at 360px, `net::ERR_ABORTED` on `page.goto` again, 590 of 591.
  It passed at all three widths in isolation immediately afterwards. Twice now
  in one phase, always on `page.goto`, always the flake the config documents;
  worth watching rather than repairing blind.
- **One browser test flaked once**, in an earlier full-suite run, with
  `net::ERR_ABORTED; maybe frame was detached?` on `page.goto` — the navigation
  flake `playwright.config.ts` documents for this platform. The run behind the
  counts above is clean at 582 / 582, and the test passed in isolation as well.
  Recorded rather than smoothed over, because a flake nobody writes down is a
  flake somebody spends an afternoon on later.
- **`REBUILD_PHASE` in `buildInfo.ts` reads phase 8, and that is checked here
  rather than assumed.** Its number and title name the last **canonical** phase,
  and 81, 82 and 83 are initiatives inserted before canonical Phase 9 rather than
  canonical phases — so `8 / Legacy migration` is correct, `next` is still
  canonical Phase 9, and the ten Life pages it names are the ten that ship
  (D-168's twelfth domain is routing 84's). What is stale is only that its
  summary describes none of what Phase 81, Phase 82 or this phase added. D-034
  keeps that sentence in one constant and a guard pins it; changing it is not
  this phase's, and it is named here so nobody has to work the question out
  twice.

## Still open for the owner, and not this phase's to close

Q1, Q4 and Q6 remain as D-172 leaves them. Nothing in this phase touches them.

---

# Phase 82 — The structural intelligence skeleton

**Status: GREEN — CLOSED BY INDEPENDENT QA, ROUND 12.**

Approved by the independent Codex QA conversation that wrote every one of the
twelve rounds, at product checkpoint `5dd55cc`, on 2026-08-27. D-077 is
satisfied: no builder conversation approved its own phase.

**Eleven FAIL rounds preceded it**, and the shape of them is the phase's real
record. Read it before the detail. Round 1 found three defects. Round 2 closed one and found two of the
repairs incomplete — the class had been named correctly and then the repair
scoped to the places that had been _observed_ failing. Round 3 closed those two
and found one more instance of the same habit: a boundary fixed on the surfaces
that had been looked at, and not at the layer every surface reads from. Round 4
confirmed both of those closed and, by reading a whole generated export rather
than checking strings in it, found two more defects in the same document — one
privacy, one truthfulness — neither of which the latest change introduced. All
are now repaired, the repaired checkpoint is deployed, and the retest handoff is
written.

Round 5 closed QA-82-008 and kept QA-82-007 open, and it is worth being exact
about why, because the round 4 note that used to sit here claimed the habit was
repaired and it was not. **A property of the whole artefact only covers the
sections the private data can actually reach.** Round 4's guard injected one
inert private observation into all 24 histories; that record is not a goal, not
a correction, not a reading anything decides from and not one side of a learned
relationship, so five paths carried private detail straight past it. Round 5
constructed the kinds it could not.

**The boundary moved off the renderers in round 5.** A document is composed from
the record it may describe (**D-150**) rather than filtered on the way out, which
is the only answer to the case no filter could have reached: a private reading of
the owner's energy changes the suggestion itself, and there is no filter over a
finished decision that unmakes it. Round 6 accepted that, and every count,
conclusion and sentence with it.

**Round 6 found the one thing a scoped store cannot reach: what a retained row
carries.** A malformed row keeps its own position in the file, and the export
printed it — so `Record row 19` became `Record row 20` with one private record
ahead of it, and `Record row 22` with three. The coordinate now stays on the
owner's own screen, where the file is (**D-151**).

Four rounds, four layers of one rule, each right and each one short of the next:
the metadata (D-098), every section (D-148), the record composed from (D-150),
and what a retained row brings with it (D-151). A paired document found each
one; reading the code found none of them.

**Round 12 returned PASS and adjudicated the one open disagreement.** The
question route means _a real question offered to the guide's candidate set_ —
the same standard `an-action` is held to, where a move is offered to the arbiter
rather than required to win. Requiring the route to name the guide's live winner
would make coverage depend on a decision assembled after it, or make Life
recompute its own, and D-071 forbids both. **D-157** records the standard so it
cannot drift back.

**Round 11 found the same rule broken on both neighbouring routes**, and found
that round 10's own comment claiming `askable` was "the guide's answer" was not
true. Life denied a route for Health while Now was asking the one question that
would fix it, and called a move the owner had merely _started_ an answer already
on its way. **D-156**: where a projection describes what another module will do,
it calls that module rather than modelling it — a boolean that resembles the
capability is worse than no check, because it reads as though the question was
asked.

**Round 10 found a projection promising what no generator could produce.** Life
told the owner the app would bring Social back on its own, on a screen whose own
decision trace said _Moves considered 0_. The route said "an action will do it"
whenever the area had anything named in it; the generator has three moves —
Home/place, Career/learning-topic, Money/financial-goal — and Social has never
been one of them. **D-155**: where one module decides what to promise and
another has to keep it, the capability is one table both read.

**Round 9 found the round 8 repair read by one consumer of three.** The `later`
count was added to `DomainCoverage` and used in its `summary`, and the two other
surfaces answering the same question from the same projection were left deriving
the coarser answer — so one Coverage bullet contradicted itself across its own
prefix and summary, and Life told the owner he had never mentioned an area he had
mentioned four times. **D-154**: a distinction is not carried until every
consumer of the projection carries it.

**Round 8 found the same class three more times, once inside round 7's own
repair.** A reassurance that denied the fault panel below it; Coverage saying
nothing had _ever_ come in about areas whose entries the same document dated and
counted; and a record read perfectly, held back from reasoning, and reported
nowhere the owner would look. **D-153** states the rule one level up from D-152:
a projection is a reading of one moment, and a sentence about it may not reach
past that moment.

**Round 7 closed that privacy class and opened a different one.** QA accepted the
retained-coordinate repair in full. What it found instead was the place where the
export stopped describing anything at all: `historySection` returned its empty
state before the block that reports rows the app could not read, so a store whose
only rows were damaged said _"Nothing in the record for this"_ and mentioned the
fault nowhere. The same zero reached the owner's own screen from the other side,
where a history dated later than the clock was reported as a file that could not
be read. **D-152** — an empty list has more than one reason, and each is a
different thing to say.

Not GREEN, and not this conversation's to make GREEN. Owner decision D-077: a
builder conversation may not approve its own phase, and nothing concluded while
building or while repairing changes that.

Nine audit findings in six work packages, and the membership test was one
question and nothing else — _would Phase 9 approve the wrong product structure
if this landed afterwards?_ So this phase creates the persistent owner-visible
objects the visual phase has to design around: a course of action, an
obligation, a fifth Now state, a date and a set of pieces on a goal, a stage on
a child's skill, and a two-step answer where there was one tap. Its gate is
structural rather than truthfulness-based, which is a different kind of
acceptance from the one Phase 81 just went through.

**AUD-0040, AUD-0045 and AUD-0047 are not in scope**, were not added, and the
audit's own reasons for excluding each are unchanged.

## Checkpoint

|                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product checkpoint   | `5dd55cc0bb831fade20371332fb4d7745f61a2e1` — the QA round 11 repairs, and **the checkpoint Round 12 passed**. It is the last commit that changes the bundle; the GREEN closeout below is documentation only. Round 10 closed at `a494d51`, round 9 at `da8e4d4`, round 8 at `675aedd`, round 7 at `6a9c53e`, round 6 at `2cdeb4b`, round 5 at `dab8c2e`, round 4 at `1205402`, round 3 at `5936fe2`, round 2 at `da1a4ee`, round 1 at `0899f18`, the first build at `160ec9a`                                                |
| Deployed Preview SHA | **Read it live** from `preview/build-info.json`. The documentation commit that carries this row moves it past the checkpoint, which is exactly the case the equivalence checker exists for                                                                                                                                                                                                                                                                                                                                   |
| Relationship         | **Proved.** `node scripts/checkpoint-equivalence.mjs 5dd55cc --deployed <build-info url>`. Never asserted as string equality (D-097).                                                                                                                                                                                                                                                                                                                                                                                        |
| Independent QA       | **Round 12 returned PASS and recommended formal GREEN closeout.** QA-82-015 and QA-82-016 are closed, D-156 is exercised at both repaired seams, every earlier Phase 82 pass remains green and no new product defect was found. QA also adjudicated the question-route standard in favour of the capability boundary (**D-157**) and hardened one builder regression test that could not have failed — see **DEF-0104**. The full report is the Round 12 section of [`qa/PHASE_82_QA_HANDOFF.md`](qa/PHASE_82_QA_HANDOFF.md) |
| Owner phone test     | Required — owner-visible behaviour changed on Now, on Life and on two domain pages                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Preview              | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Exact verification results

Four columns, for the four most recent verifications. Every figure names the
head it was measured on, which is D-147 and the reason the last row exists.

| Gate                                                    | Round 9 (`da8e4d4`)   | Round 10 (`a494d51`)  | Round 11 (`5dd55cc`)  | Round 12 — QA's own, at `db1b556`                                    |
| ------------------------------------------------------- | --------------------- | --------------------- | --------------------- | -------------------------------------------------------------------- |
| `npm run verify` from a clean clone of the tracked head | **PASS**              | **PASS**              | **PASS**              | **PASS** — format, lint, typecheck, tests, build                     |
| Unit layer                                              | 1,651 across 73 files | 1,664 across 74 files | 1,675 across 75 files | **1,675 / 1,675** across 75 files                                    |
| Browser, three widths                                   | 551 / 552             | 551 / 552             | 552 / 552             | **552 / 552**, no retry                                              |
| Android-style gate on the deployed build                | clean — 144           | clean — 144           | clean — 144           | **clean — 144 / 144**                                                |
| Privacy scan                                            | clean, 249            | clean, 253            | clean, 256            | **clean — 258 tracked files**                                        |
| Tournament                                              | 100/100 and 100/100   | 100/100 and 100/100   | 100/100 and 100/100   | **100 / 100 deterministic, 100 / 100 hybrid**                        |
| CI green at the handed-off head                         | green at `da8e4d4`    | green at `a494d51`    | green at `5dd55cc`    | **green at `db1b556`** — and at the head that carries this table     |
| QA probes run first, unchanged                          | 6                     | 7                     | 8                     | **9** — rounds 4–10 and 12 exit 0; round 11 reports the expected 6/7 |
| Reintroductions proved                                  | 8                     | 9                     | 18                    | **18 replayed independently, 18 detected**                           |

The first build and round 1 columns are dropped rather than carried: `160ec9a`
and `0899f18` are four repairs behind, and a table nobody can act on is a table
nobody reads. Their figures are in the round 1 and 2 sections below.

Fifteen test files: `goal-horizon-and-parts`, `commitment-windows`, `threads`,
`deferral`, `growth-stage-and-occasion`, `instrument-recut`, `qa-82-round-1`,
`qa-82-round-4` through `qa-82-round-11`, and a browser suite `phase82.spec.ts`
for the surfaces the packages end in.

## Independent QA — round 1

**FAIL**, on gate item 4: _the complete owner experience_. Items 1, 2, 3, 5 and
6 passed, every standing gate passed, and the equivalence check between the
tested checkpoint and the live Preview passed. Three findings, all on the
primary surface, all now closed as DEF-0089, DEF-0090 and DEF-0091.

They are worth reading together, because they are one story about this phase's
own shape rather than three unrelated bugs. Phase 82 gave the engine its first
structural facts — an obligation, a fifth decision kind, a countdown to
something in the day — and each finding is an older part of the app meeting one
of them for the first time and being wrong in a way nothing could previously
have been wrong.

- **QA-82-001 → DEF-0089.** A durable custody arrangement was read as a claim
  that the owner's daughter was in the room, so during a school day he had
  entered himself the app said _"Adaya is here"_ and offered thirty minutes with
  her. The repair is a second concept — the arrangement, narrowed by her own day
  — computed once and read by every consumer, and it can only ever subtract.
  D-140.
- **QA-82-002 → DEF-0090.** The evidence panel for a held decision explained the
  move the app was declining to offer, and said nothing about the deferral. The
  grounds are now written where the deferral is decided and quoted unchanged.
  D-141.
- **QA-82-003 → DEF-0091.** A `time-fit` band carried two different facts and
  had to pick one sentence, so a ten-minute move with ten minutes in hand was
  told it would not fit. Four bands, split on the same comparison the sentence
  makes, and an overrun now counts against a move rather than abstaining.
  D-142.

**Three tests that gave false confidence were repaired rather than deleted**,
and QA named all three. One asserted that two hours of the same day agreed about
the daughter, which was true of the field and false of the day. One read the
headline at each hour and compared two different moves. One never advanced the
browser clock into the school window at all. Each is now the assertion it was
trying to be, and each fails against a reintroduction.

**Every PASS from round 1 is preserved and every deferral stands.** Nothing in
this repair reopens a package, and the three items QA deferred to Phase 9 are
untouched.

## Independent QA — round 2

**FAIL**, and a more useful failure than round 1's. QA-82-002 closed outright.
The other two came back not as new findings but as **the same class surviving in
a place the first repair did not reach**, which is the most valuable thing an
independent round can tell a builder. A fourth finding was against the mobile
gate itself.

- **QA-82-001 persists → DEF-0089 reopened.** Round 1 repaired every consumer
  that makes a decision and left the concept's own identity alone. Every surface
  that renders the _registry_ rather than the decision — the QA fact ledger, the
  Fatherhood page's belief panel, the export — went on printing the durable
  custody record as the answer to _whether she is here today_. Repairing readers
  one at a time cannot finish, because a generic renderer is a loop over the
  registry rather than a reader. The registry now carries two concepts: the
  arrangement, relabelled to mean what it stores, and the reading, marked
  `derived` so it is never asked, never counted as coverage, and never
  corrected. **D-143.**
- **QA-82-003 persists → DEF-0091 reopened.** Round 1's band said "would use all
  the time" about everything from four-fifths of the window to all of it, so a
  ten-minute move in a twelve-minute window carried that sentence above
  `opportunity-cost` saying 83 percent. The top three bands are now decided by
  comparing the two minute figures the sentence is a claim about. **D-144.**
- **QA-82-004 → DEF-0092.** The deployed gate finished 125/126 for QA and
  126/126 here, on the same bytes. Every touch target in the app was declared at
  exactly the 44px the gate asserts, so at a device pixel ratio of 3 a control
  measured `44.00006` and which side of the line it fell on was decided by
  rounding. One token, 48px, and a gate whose name, predicate and diagnostic
  state one number and report it unrounded. **D-145.**

**The class guard for QA-82-004 found two siblings on its first run**, and both
were real. One control was written `44px` rather than `2.75rem` — the same
number in a different unit, which is how a sweep for one misses the other. The
other was `2.25rem`, thirty-six pixels, under a comment asserting it was a real
touch target; it sits on the shell and is reachable from every screen in the
product, and nothing had ever measured it. That is **DEF-0093**, and it is the
argument for the token.

**Every round 2 PASS is preserved and every deferral stands.** QA-82-002 was not
touched. No package was reopened, and the owner questions, Phase 8
carry-forwards, deliberate non-features and audit-section-10 do-not-change items
are unchanged.

## Independent QA — round 3

**FAIL**, with the principal findings of rounds 1 and 2 all confirmed closed.
QA-82-002, QA-82-003 and QA-82-004 passed; the QA-82-001 boundary passed on the
fact ledger and the Fatherhood page. Two things remained.

- **QA-82-005 → DEF-0094.** The review export printed the derived reading under
  _what it read to decide_ and the same concept under _things the app knows it
  does not know_, in one document that asks its reader to treat it as the source
  of truth. `coverage.ts` had an exclusion for derived concepts because coverage
  was the surface that had been thought about; `compose.ts` read raw fact state
  and had none. The exclusion now lives in `resolveFacts` — the one place that
  knows a concept can never be recorded — so every reader of the fact layer is
  right without knowing the flag exists. **D-146.**
- **QA-82-006 → DEF-0095.** The handed-off head failed `npm run verify` at
  `format:check` and CI failed the same job. Both gates had been run and both
  were green — on the head before the last commit. The defect is not the
  emphasis marker that broke it; it is that a documentation-only change was
  treated as not needing the gate, and that an earlier head's results were
  reported as this head's. **D-147** states the finishing condition as a
  sequence, and every count below now names the head it came from.

**One reintroduction found a hole in its own regression**, which is worth
recording because it is the third time this phase that a guard has been narrower
than the class it was written for. Excluding the one derived concept by id —
rather than every concept marked derived — passed every assertion, because that
concept is the only derived one today. The guard now exercises the rule against
a registry extended with a second, invented derived concept, and separately
confirms an ordinary invented concept is still seeded.

**Every round 3 PASS is preserved and every deferral stands.** No package was
reopened, and the owner questions, Phase 8 carry-forwards, deliberate
non-features and audit-section-10 do-not-change items are unchanged.

## Independent QA — round 4

**FAIL**, with both round 3 findings confirmed closed. QA-82-005 passed on the
derived boundary and across all 24 histories; QA-82-006 passed, with the
aggregate verify green from a clean clone of the handed-off head and CI green at
that exact SHA. Reading the **whole** generated export, including the no-child
history the round had asked for, found two more defects in the same document.
Neither was introduced by the round 3 change.

- **QA-82-007 → DEF-0096.** With Private / Sexual Health left out, Diagnostics
  still reported the size of the withheld part. `diagnosticsSection` was the one
  section builder that ignored the `ExportHeader` it was handed and read the
  store instead: `19 records` where the same history without its one private
  record says `18`, and `Recent private pattern — never answered`, which names
  the area and states that nothing is known in it. D-098 has said since Phase 7
  that participation is the part of a private record that stays sensitive after
  the detail is withheld; it had been implemented in the sections that had been
  thought about. **D-148.**
- **QA-82-008 → DEF-0097.** Every unknown printed as `never answered`, so a
  soreness reading given at 06:41 and withdrawn at 06:55 was described as one
  the owner had never been asked for — in a document that printed the withdrawal
  three sections above. Four of `UnknownReason`'s six values sit on top of an
  answer the record actually holds. **D-149.**

**The class guard found two siblings QA had not named**, which is the point of
writing it as a property of the artefact rather than as an assertion about the
section that leaked. Two stores differing by exactly one private thing must
compose the same document — and under that rule the **timeline page** leaked
(a withheld record consumed one of the forty slots, so the section rendered
thirty-nine and two histories lost a day off the end) and so did the
**supersession issue list** (a dangling reference on a withheld record reported
that there is an entry in the area the document had just promised to be silent
about). A third sibling was found for QA-82-008 by asking who else turns "no
evidence" into a sentence: `coverageCards` in `insights.ts` reached the same
false line from `lastEvidenceAt`, which is undefined for every unknown reason.

**And one reintroduction passed on its first run**, for the third time this
phase. Removing the issue-list filter broke nothing, because no library history
has a supersession problem involving a private record — DEF-0094's shape one
field over. The guard now constructs that history. Twelve mutations were run in
total and all twelve now fail.

**Every round 4 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7
and Q8 remain open and unanswered; AUD-0040, AUD-0045 and AUD-0047 remain out of
scope; the Phase 8 carry-forwards, deliberate non-features and all 21
audit-section-10 do-not-change items are unchanged. Nothing here wires private
evidence into intelligence, and the owner's raw memory is untouched.

## Independent QA — round 5

**FAIL**, with QA-82-008 confirmed closed and QA-82-001 to QA-82-006 all holding.
QA-82-007 survived, in five paths the round 4 repair never reached.

- **The four sections nobody had filtered.** Direction printed a private goal's
  statement and a private commitment verbatim; Corrections printed the reason a
  private answer was withdrawn; Learning and Insights published relationship
  counts, date spans and a trend computed entirely from private readings. All
  four take the whole history or the finished report and were never handed the
  export's own boundary.
- **And the case no section filter could have answered.** A private observation
  of the owner's energy outranks the public one beneath it, and the suggestion
  changes from ten minutes with Adaya to a light day — with its reason, subject,
  follow-up, limiter, trace score and ranking. There is no filter over a
  finished decision that unmakes it.
- **The malformed entity.** `claimsWithheld` read a record's plural `domains`
  and not an entity's singular `domain`, so a row explicitly naming the private
  area was counted anyway. QA accepted the unreadable-row exception itself and
  was right that it has to cover both shapes.

**The repair moves the boundary off the renderers.** `composeExport` withholds
once, at the store, and runs the app's own pipeline over what is left — the same
means, shown the record the owner chose to share. **D-150** records why that is
the rule rather than a hole in the Phase 7 rule it appears to break, and why the
one honest cost is declared in the document rather than hidden: with something
withheld, the document can state a different suggestion from the one on the
owner's phone, so it says so before it says anything else.

**Why round 4's guard could not see any of it**, which is the part worth keeping:
it injected one inert private observation into all 24 histories and asserted
paired equality. That record reaches none of the five paths. A paired-history
property only covers the sections the private data can actually reach, so the
round 5 regression is a table of private things **by kind**, three of which carry
only one of the two privacy facts.

**Every round 5 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7 and
Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the Phase 8
carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged. The owner's own store is untouched, and
`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was neither altered nor adjudicated.

## Independent QA — round 6

**FAIL**, and the narrowest of the six. QA accepted D-150 and its declared
divergence, all five Round 5 cases passed, six new decision-path pairs passed —
no-action, deferral, a running thread, a stopped thread and its supersession, a
recurring school obligation and growth results — and QA-82-001 to QA-82-006 and
QA-82-008 all held.

One class remained: **a retained unreadable row carries its own position in the
file.** `Record row 19` became `Record row 20` with one private record ahead of
it and `Record row 22` with three; a private entity moved `Entity row 2` to
`Entity row 3`. Inserting the private row _after_ the broken one changed nothing,
which is what located the channel in the coordinate rather than in detail or
totals.

**The coordinate now stays on the owner's own Timeline**, where the file is. The
export names the row by what it is and says once that the position is on his own
screen. It is dropped whether or not anything is withheld, because a position in
a file the reader does not have was never worth much to them and one rule is
easier to keep than two. **D-151** records why the survivors are _not_ renumbered
instead: a malformed row's position is carried through a backup verbatim, so
renumbering would replace a leak with a false claim about the file.

**The rotating browser transient appeared twice, and no clean full run was
obtained.** Both matrix runs finished 548/549, each failing a different test
inside `page.goto` with `net::ERR_ABORTED` before any product assertion ran —
`phase82.spec.ts` at mobile-small, then `data.spec.ts` at desktop. Each passes in
isolation. A third run was not attempted: rolling until a clean one appears is
the selection this round's handoff forbids. It remains a property of the harness
rather than of the product, and the consequence stated when it was first recorded
now matters more: a single green run is weaker evidence than it looks.

**And the CI deploy job went red on a GitHub Pages backlog.** The Verify job —
format, lint, typecheck, unit layer, browser matrix, build — is green at every
head of this round. The Deploy preview job publishes and then reads the live
`build-info.json` back for 300 seconds; on the last documentation commit GitHub's
own pages build sat queued for over half an hour, so the read-back never matched.
Nothing in the bundle is implicated. It is recorded here because a red run in the
history that nobody explains is worse than one that is explained, and because
four pushes in forty minutes is what filled that queue.

**A guard was blind, and a reintroduction found it.** Removing the coordinate
from the owner's own screen broke nothing — the architecture guard matched
`row.where` in a React `key` prop, and no test read the rendered row. The browser
suite now asserts the text. Fourth time this phase that running the mutation
found what reading the test did not.

**Every round 6 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7 and
Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the Phase 8
carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was
neither read, altered nor adjudicated.

## Independent QA — round 7

**FAIL**, on a class that is not a privacy one. QA-82-007's retained-coordinate
repair passed in full — the three earlier probes, the five Round 6 positional
variants, and new strict whole-document comparisons over retained ids, validation
path indices, backup-carried coordinates, input ordering and batches of 100
damaged private records and 75 damaged private entities. D-150's recomposition and
declared divergence remain accepted, and QA-82-001 to QA-82-006 and QA-82-008 all
held.

**QA-82-009** is the new finding. When there are no entries to display, the review
export returned its empty state **before** the block that reports rows the app
could not read. A store whose only rows were damaged therefore said _"Nothing in
the record for this"_ — and since Diagnostics is off by default, the ordinary
document mentioned six real storage faults nowhere at all. The same zero reached
the owner's own screen from the other side: `total` counts entries at or before
the moment being viewed, so a history dated later than the clock reported zero,
and Timeline told him his file was the problem over five records that had parsed
perfectly.

**Four states, four things to say** (**D-152**): nothing in the store, only rows
that could not be read, readable rows that are all later than the moment, and
readable rows all withheld from this document. The last of those must read
_identically_ to the second in the export — the document has already promised the
excluded area is excluded down to whether anything is recorded in it.

**A guard could not see a disclosure, which is worth keeping in view.**
Reintroducing _"and some were left out of this document"_ into the private-off
empty sentence passed every paired comparison in the suite: a sentence said on
both sides of a pair is invisible to comparing them. The guard that catches it
asserts that no reason is given at all. Fifth time this phase a reintroduction
found what reading the test did not.

**Every round 7 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7 and
Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the Phase 8
carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged. QA's correction is accepted: the third archived
family is `milestone-observation`, not `stress-level` as round 6's paragraph said.
`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was neither read, altered nor adjudicated.

## Independent QA — round 8

**FAIL**, with QA-82-009 confirmed repaired: all seven of round 7's former
failures pass, a true empty store stays quiet, a damaged row is not counted as
future history, the owner's fault coordinates survive, and QA-82-007's privacy
boundary is intact. Every earlier finding held.

Three siblings of the same class remained, and one of them was introduced by the
round 7 repair itself:

- **QA-82-010.** The new later-history panel said _"nothing has been lost and
  nothing is unreadable"_, unconditionally, directly above six rows reading
  _"could not be read"_. The clause was true of the entries it was about and
  false of the store.
- **QA-82-011.** With the clock a week back from the damaged fixture's own dates,
  Coverage said _"Nothing has ever come in about sleep & recovery"_ in a document
  whose header named five later entries and their 5–8 April span. Excluding
  future records from evidence is right; **ever** reaches past the moment.
- **QA-82-012.** Two records that each claim to replace the other parse without
  trouble and are held back from reasoning. Recent record's fault block walked
  only the unreadable rows, so the ordinary document said nothing at all —
  Diagnostics, which is off by default, was the only place they appeared.

**D-153** states the rule one level up from D-152: a projection is a reading of
one moment, and a sentence about it may not reach past that moment. _Ever_ and
_never_ stay where they are true; a reassurance is about the thing it reassures
the owner of; and a row read perfectly and held back is still a fault, listed
separately from one that could not be read because they are different things to
say.

**Neither opposite error was traded for.** Future data still refuses to become
current evidence, an area that genuinely never heard anything keeps its absolute,
and a tangle is given no invented date or entry — all three proved by
reintroduction rather than promised.

**Every round 8 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7 and
Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the Phase 8
carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was
neither read, altered, staged nor adjudicated.

## Independent QA — round 12, and the GREEN closeout

**PASS.** QA-82-015 and QA-82-016 are closed. Both repaired seams were read on
the deployed build at 360 and 430px, and the second was walked as one continuous
sequence: the Home move offered, **Start it** pressed with Life correctly saying
nothing was coming, **Done** pressed with Home moving to _Catching up_ and _"An
answer is already on its way"_, then two daily advances closing the real result
window — the completed history staying put while the route and the arriving-answer
sentence went away.

**The question-route disagreement, adjudicated.** Round 11's probe held
`a-question` to naming the guide's live winner; the repair holds it to naming a
real question offered to the guide's candidate set. QA ruled for the capability
boundary and recorded why: it is the same standard `an-action` is held to, and
the alternative would make coverage depend on a decision assembled after it or
make Life recompute its own, against D-071. **D-157** writes the standard down.

QA replaced the live-winner assertion with a new probe rather than deleting it,
and proved the accepted boundary is not vacuous: all **433** question-route rows
carry an askable catalogue question, every option of every such question can
restore its own area to current, **71** are the selected question now and **362**
are valid unselected candidates, and the guide settles in all **144** corpus
runs.

**One builder regression test could not have failed, and QA said so.** The
window-closure case rebuilt the fixture for the later moment and so carried none
of the lifecycle into it — there was no completed episode there at all, and the
route was not `normal-life` for the trivial reason that nothing had ever been
finished. The product was already correct; the test was not. It is repaired in
the closeout commit and recorded as **DEF-0104**, and the repair is proved: with
the window taught never to close, the hardened case now fails, which the original
would not have.

**Every earlier boundary is preserved.** QA-82-001 through QA-82-016, D-150
through D-156, the round 4–12 probe boundaries, the privacy and export
architecture, the refresh capability table and the grouped Life surface are all
unchanged. Q1, Q4, Q6, Q7 and Q8 remain open; Reach and private-pattern
intelligence remain future work; AUD-0040, AUD-0045 and AUD-0047 remain outside
this phase; the Phase 8 carry-forwards, the deliberate non-features and all 21
audit-section-10 protections stand, including the compact ordinary Life list and
the rule that Private / Sexual Health is never raised on Now.

**`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was never read, altered, staged or
adjudicated** at any point in the twelve rounds, by QA or by the builder. It
remains untracked and is the first input to the adjudication round that comes
next.

## Independent QA — round 11

**FAIL**, on the two routes either side of the one round 10 repaired. QA-82-014
is independently confirmed closed: QA replayed all nine round 10 mutations in
their own clean clone and reproduced every count exactly, including the privacy
branch that was blind on its first builder pass.

**QA-82-015.** `routeFor` was handed `standing` — the concepts that are durable
facts — and asked whether any was `neglected && askable`. `energy.current` is not
a standing fact, so it can never be neglected, so an area whose way back was a
question about tonight's energy fell straight to `needs-review`. On the deployed
build at owner-local 2026-04-16 20:30, Life said **Needs a check-in** for Health
and _"Nothing the app can do on its own will bring these back"_ while Now
displayed _"How much energy have you got left?"_ — one tap from making the area
current. QA found 71 such contradictions, and the `a-question` route was reached
**zero** times in the whole corpus.

**QA-82-016.** `domainsWithEvidenceComing` accepted an `action-start` as well as
an `action-completion`, while its own comment said _finished_ and
`outcomeWindowFor` says outright that a move started and never finished "is still
a lifecycle question". Pressing **Start it** and stopping there made Life say an
answer was already on its way.

**D-156**: where a projection describes what another module will do, it calls
that module rather than modelling it. The question route now applies
`askable && questionFor(concept) !== undefined` over every concept in the area —
character-for-character the filter `probeSwings` opens with —
and `domainsWithEvidenceComing` asks `outcomeWindowFor` whether a result window
exists and is still open, which also retires the two-day guess it kept beside the
outcome layer's real one.

**Round 10's own comment was part of the defect.** It claimed `askable` was "the
guide's own answer rather than this file's guess at it". It was not; it is
`worthAsking` from the fact layer, read through `neglected`. Writing the claim
down is what let it stand another round, and the replacement comment says what
the code actually does.

**Neither opposite error was traded for.** A genuine `needs-review` survives —
it is round 10's own Social reproduction, where there is no move and no question
the fact layer will spend — and `normal-life` still appears the moment a move is
actually finished, and stops when its window closes.

**One thing is not resolved and is handed forward rather than argued away.**
Round 11's probe additionally requires every `a-question` row to be the domain
the guide is asking about _at this moment_. Coverage is assembled before the
decision the guide's selection depends on; `probeSwings` runs a full decision per
answer option; and D-071 requires Life to show the coverage object the decision
was made from. Six of QA's seven checks pass and that one does not. It is the
first thing round 12 is asked to settle.

**Every round 11 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7
and Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the
Phase 8 carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was
neither read, altered, staged nor adjudicated.

## Independent QA — round 10

**FAIL**, on one new material defect. QA-82-011 and QA-82-013 are closed — the
complete Coverage bullet agrees with itself at the earlier clock, and Life no
longer tells the owner he never mentioned an area he mentioned four times — and
every earlier finding held. QA also read the raw `unheard` status word in the
export in context and declined to open a second defect for it, because the same
bullet qualifies it twice immediately after.

**QA-82-014.** Life says two things about a stale area routed to `an-action`:
_"The app will try to bring these back on its own"_ and _"Something worth doing
here may come up on Now."_ Both are promises of an app-owned path.
`coverageCandidates` can keep them in three places — a place in Home, a learning
topic in Career, a financial goal in Money — and `routeFor` chose the route
whenever the area had **anything** named in it. Social has people and places and
goals in it. So on the deployed build, at owner-local 2026-08-15 15:30 in **A
Saturday with people in it**, Life promised a move on the same screen whose
decision trace said **Moves considered 0**.

**D-155**: where one module decides what to promise and another has to keep it,
the capability is a single table both read. It now lives in
`src/intelligence/refreshing.ts`; the route asks it, including for a subject of
the move's own kind, and the generator serves every area the route promised
rather than only the most neglected one.

**Nothing was added to the table.** Movement and the social moves are absent on
purpose — a quiet fortnight is not evidence of capacity or of social energy
(DEF-0006) — so the areas with no move fall to `needs-review` and Life says
_"Nothing the app can do on its own will bring these back."_ That is true, and
it is section 8's fifth preference doing the job it exists for.

**The defect was wider than the report.** QA's probe reads the most-neglected
area and found 21 rows. Enumerating every promised area found **117**: Home and
Career were escaping too whenever another area was more neglected, and when the
most-neglected area was one with no move at all, the whole route went silent and
the areas that did have a move got nothing either.

**The rotating browser transient returned, in a fifth distinct spec.** The single
full matrix run finished 551/552, failing `life-domain.spec.ts` at mobile-large
inside `page.goto` with `net::ERR_ABORTED` before any assertion; it passes in
isolation in 260 ms. A second matrix run was not attempted — rolling until green
is the selection these handoffs forbid.

**Every round 10 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7
and Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the
Phase 8 carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged, including the grouped Life overview.
`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was neither read, altered, staged nor
adjudicated.

## Independent QA — round 9

**FAIL**, on two consumers of round 8's own repair. QA-82-010 and QA-82-012
passed — Timeline no longer denies the faults below it, and Recent record reports
both replacement-cycle faults without inventing dates or entries — and every
earlier finding held.

Round 8 gave `DomainCoverage` a `later` count and taught its `summary` to say
_at this point_ rather than _ever_. Two other surfaces answer the same question
from the same projection, and neither was changed:

- **QA-82-011, reopened.** `coverageSection` joins a prefix, a status and the
  summary into one bullet, and derived the prefix from `daysSinceHeard ===
undefined` alone. The rendered line read _"nothing heard at all. Nothing has
  come in about sleep & recovery at this point. 4 entries here are later than
  it."_ — the two halves of one sentence contradicting each other, which is worse
  than the absolute was on its own.
- **QA-82-013.** Life's `standingFor` mapped every `unheard` area to one standing
  without reading `later`, so _"You have not mentioned these"_ was said over an
  area the owner had mentioned four times. One week forward the same unchanged
  records move those areas into **Quiet**, which is what proves the group came
  from the clock rather than from an unmentioned record.

**D-154**: a distinction is not carried until every consumer of the projection
carries it. The way to find them is to enumerate what reads the coarse answer —
`daysSinceHeard === undefined` and `status === 'unheard'` — rather than what says
the sentence that was reported.

**The group word stays and the note changes.** _"Nothing here yet"_ is a claim
about the moment and is true of both kinds of area; _"You have not mentioned
these"_ was true of one. The areas that are merely ahead of the owner now say so
on their own line, and that line appears only when there is one to write — an
ordinary history at an ordinary clock has nothing later, so Life's compact
seven-area list is untouched.

**The rotating browser transient returned, in a fourth distinct spec.** The
single full matrix run finished 551/552, failing `shell.spec.ts` at desktop
inside `page.goto` with `net::ERR_ABORTED` before any assertion; it passes in
isolation in 506 ms. A second run was not attempted — rounds 7 and 8 got a clean
552 first time and this one did not, and rolling until it does is the selection
these handoffs forbid. It remains a property of the harness rather than of the
product.

**Neither opposite error was traded for.** Future records still do not become
current evidence, an area nothing has ever reached keeps its absolute in both the
prefix and the summary, and no area was moved out of a group to make a sentence
easier — all proved by reintroduction.

**Every round 9 PASS is preserved and every deferral stands.** Q1, Q4, Q6, Q7 and
Q8 remain open; AUD-0040, AUD-0045 and AUD-0047 remain out of scope; the Phase 8
carry-forwards, deliberate non-features and all 21 audit-section-10
do-not-change items are unchanged. `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` was
neither read, altered, staged nor adjudicated.

## The six packages

### 1 — Goal horizon and parts (AUD-0046, AUD-0021)

`GoalRecord.targetWindow` had parsed, serialised and reached `ActiveGoal` since
Phase 1 with nothing reading it and no surface able to write it. That is not a
tidiness story: `candidates.ts` raised `goal-behind` whenever a career goal
merely existed and whenever the cash buffer was merely known, and `evaluate.ts`
pays that trigger `urgency 0.4` — an urgency premium on every career
recommendation, justified by a claim nothing checked.

- `activeGoals` reads the horizon and, for each named piece, whether the record
  holds a finished session about it.
- `goalIsBehind` is the measurement: less of the work has moved than of the
  time, needing both a date and pieces, and false where either is missing.
  Both generators that raise the trigger go through it.
- `goalFit` reads both. With neither, it is byte for byte the old behaviour —
  which is both findings' own acceptance condition.
- The Career page gains the one date control the horizon has ever had and the
  pieces beside it; Insights gains a trajectory card. Counts and a date, never
  a share (D-129).
- `week-pointed-at-home` now carries the winter its own statement names, so
  G-008's baseline wins on a measurement rather than on an assumption.

### 2 — Commitment windows (AUD-0004)

Five fixed blocks from wall-clock minutes modelled the shape of a day and
nothing about this owner's day. The brief's question — _does a recommendation
ever consider WHEN, not just WHETHER?_ — had a clean answer, and it was no.

- A `commitment-window` record kind: a label, a span of minutes into the
  owner-local day, a recurrence, and the provenance the finding asks for from
  the start so a trusted schedule source later is an adapter rather than a
  redesign.
- `whose` distinguishes a span that takes his time from one that takes somebody
  else's (D-130). Reading her school day as time he is busy would silence the
  app for the five freest hours of a full-custody week.
- The situation carries the day's obligations, the minutes until the next edge,
  and the smaller of that and what he said he had. The time limiter, `time-fit`,
  `opportunity-cost` and a move's own size all read it.
- Two seed questions on Life, answered once and never re-asked (D-131). No
  general event form: a calendar is a different product.
- `school-morning` is the adversarial history the finding asks for — one
  Wednesday, read at 08:20 and at 10:00, same block, opposite answers about a
  lab.

### 3 — Threads (AUD-0020)

The audit's highest-leverage change, and the phase's strongest member.

- A `thread` record kind, bounded to three concrete courses with no generic
  creation control (D-133).
- `thread-fit` is the nineteenth dimension. It abstains at zero weight for every
  move belonging to no live course — nearly all of them — so a history with no
  plan in it ranks exactly as it did before.
- A thread is never a hidden reason: Now says which course a move belongs to and
  where in it, and Life stops one in a tap. It expires on its own, and declining
  one of its moves pauses it.
- The architecture guard the finding asks for: `arbitrate.ts` and `engine.ts`
  know nothing about threads at all, and four files in the engine may look
  (D-132).

### 4 — Deferral (AUD-0024)

`hold` had a full move profile and its own templates since Phase 1 and no
generator produced it, because deferring needs a model of later blocks and there
was not one. There is now.

- The situation carries the rest of today with his own obligations taken out of
  it, and `arbitrate.ts` returns a deferral when the best move — already worth
  doing — does not suit this block and does suit the next one.
- Bounded on four sides at once (D-134), none of them a counter anybody has to
  maintain.
- The fifth Now state, with no buttons on it: there is nothing to start, and the
  way back is the hour arriving.
- `before-the-house-is-up` is the same Wednesday as `school-morning`, three
  hours earlier, so the state is read from the library rather than only from a
  test.

### 5 — Growth state and occasion context (AUD-0015(a), AUD-0017)

Two findings that had to move together because they change the same flow.

- A `domain-update` now carries the stage, the generator reads it, and a settled
  skill comes round only as an occasional check at expanding intervals, in a
  different sentence. Reversible in one tap (D-136).
- An occasion carries how much help she needed — the scaffolding construct
  itself, framed on the parent — and, in one extra skippable tap, where it
  happened.
- Three good goes in one place no longer produce "call that settled": the app
  says what it sees and suggests the thing that would settle it. A skipped
  setting is unknown, never familiar. This **amends** D-070 rather than
  replacing it (D-135).

### 6 — Re-cut and re-run (AUD-0035, AUD-0039)

Last, in one change, after the dimension package 3 added.

- `bottleneck-fit`, `direction-fit` and `goal-fit` abstain. D-048's rule,
  applied to the three dimensions D-048 explicitly left alone because
  re-cutting them means re-running the tournament — "which belongs to a phase
  that can".
- `WORTH_DOING` is re-derived rather than carried across, and the derivation is
  the argument: the same decisions land 1.29 to 1.51 times higher once the dead
  weight is gone, and _which_ depended on the history (D-137).
  `CLOSE_ENOUGH_TO_MENTION` is half of it, derived.
- `MAX_NUDGE` is a quarter of the ranked spread, capped at the old absolute, so
  "cannot reverse a decided contest" is arithmetic rather than a comment
  (D-138).
- The rubric gains the three checks AUD-0039 says it lacked. Both architectures
  re-baseline at 100/100; the hybrid still scores no better, so D-024 stands.

## The gate, item by item

| #   | Acceptance item                                                                                                    | Where it is proved                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A thread never bypasses the arbiter — an architecture-guard test, per section 17.2's shape                         | `tests/unit/architecture-guards.test.ts` — "lets a thread reach a decision in exactly one place". Three assertions: the chooser knows nothing of threads; four files in the engine may read them; the dimension still exists |
| 2   | A dominant limiter overrides a thread — `thread-fit` weighted below `bottleneck-fit`, asserted directly            | The weights table itself, in `architecture-guards.test.ts`; and the consequence on a real evening in `threads.test.ts` — the same history, differing only in three nights of sleep                                           |
| 3   | A thread can be stopped in one tap, expires on its own, and explains why it is active                              | `threads.test.ts` (five separate ways it stops pulling, enumerated) and `phase82.spec.ts` (the Life control, at three widths)                                                                                                |
| 4   | `hold` names a real later block and cannot be returned when no later block scores higher                           | `deferral.test.ts` — the block is named, later, free and his; and six separate states in which it cannot be returned                                                                                                         |
| 5   | The tournament is re-run and re-baselined on the re-cut instrument, with `MAX_NUDGE` relative to the ranked spread | `intelligence-tournament.test.ts` (100/100 both, widened rubric) and `model-guardrails.test.ts` (the bound, and the arithmetic that a decided contest cannot be turned over)                                                 |
| 6   | No percentage, rank, grade or score about the child survives package 5 — the Phase 81 copy guard must still bite   | `g003-growth-evidence.test.ts`, proved by reintroduction twice: a rate put back into the summary, and a confidence word put onto the **new** package-5 headline. Both caught                                                 |

## Two defects the phase found in passing, and what they taught

Neither was in scope, and both are the same lesson from opposite directions.

**DEF-0087** — `explain.ts` rendered `nothing-better` as _"Nothing else is
pressing, and X pays back tomorrow."_ That is DEF-0012's
absence-asserted-from-ignorance, in the same file two siblings had already been
removed from, guarded by a test that forbids the exact phrase by name. It
survived three phases because no history in the library reached the branch. The
first scenario with a career move and no career goal printed it on the first
run.

**DEF-0088** — `recall-practice` refused no hour at all, so the app offered a
study session at eleven at night. It survived because every check of "does it
suit the hour" ran at the one hour each history was written for. The tournament
rubric, widened under AUD-0039(b) to ask at every hour, found it immediately.

**D-139 is what they leave**: where a sweep asserts something about a closed set
of owner-facing sentences, it enumerates which members the library actually
reaches and names the ones it does not, with the reason and with where they are
covered instead. A green sweep over a set is evidence about the members it
reached, and writing down which those are turns "we did not check that" into a
failing test.

And repairing DEF-0088 re-broke a QA-81-006 copy branch — a condition that
required **every** rejection to be repetition stopped firing the moment one more
move refused the late night, putting "none of them suit where you actually are"
back on a screen that had been repaired for saying exactly that. It is now
stated as what it always meant, and the mixed case has its own line and its own
row in the copy catalogue.

## Open, and named rather than left to be found

**Abstention makes the denominator differ between candidates, and it changed an
ordering.** A score is a weighted mean, so a candidate with more dimensions
speaking about it is judged over a larger denominator. That is not new — D-048
introduced it in Phase 3 — but removing 5.3 units of shared dead weight made it
larger, and on "Nine months of evenings" the ordering of three candidates within
0.003 of each other changed. The new ordering is defensible and arguably better:
clearing the kitchen helped on all six weekday evenings and on two of six
weekends, the scenario's own clock stands on a Saturday, and the app now offers
it on the Friday and something else on the Saturday. But the mechanism is
arithmetic rather than judgement, and **the next phase should decide whether a
weighted mean is the right shape at all**. It is the deeper version of AUD-0035
and the audit does not ask for it.

**Three dimensions still score zero at full weight for an absent reading.**
`capacity-fit`, `opportunity-cost` and `time-fit`, each when the reading it
needs is unknown. AUD-0035 scopes itself to "the three older dimensions", and
`time-fit` runs 0…1 so abstaining there would _reward_ a move for the app not
knowing how long the evening is. `instrument-recut.test.ts` enumerates every
remaining case with a written reason, so a fourth one appearing fails the build.

**`time-fit`'s overrun band is reachable through one fixture and one narrow
gap.** After the QA-82-003 repair the bottom band — a move that genuinely does
not fit — is only reached when `inHand` is between one and four minutes, because
`sizeFor` floors a move at five and the filter already removes anything longer
than the free time the owner stated. Only the approach to her school day
produces that, and the regression walks 08:00 to 08:35 minute by minute to reach
it. That is honest coverage rather than comfortable coverage: a second
obligation in the library, or a fixture whose stated free time is large while
the next edge is minutes away, would exercise the same band from a different
direction.

**The three deferral sentences are asserted by content, not by wording.** What
is pinned is that the panel carries them on every hold and on nothing else,
names the block it is held for, states the room in it, never argues for acting
now, and never uses vague deferral language. The sentences themselves are not
string-matched, because this repository's own rule is that an exact-string
assertion proves a string is stable rather than right and fails for
improvements. If QA wants the wording frozen, that is a decision to take
deliberately rather than by accident.

**The rotating browser transient is real, and it is reported rather than
hidden.** It has now been seen twice in this phase, in different tests, and
neither occurrence ran a product assertion. In one round 1 run, `qa-lab.spec.ts`
— "gives him his history back and keeps it — Empty the laboratory, from QA" —
failed at desktop; that test waits 1,500ms for in-flight laboratory work to land
and is timing-sensitive by construction. In one round 2 run, `phase82.spec.ts`
— "lists it on Life and stops it in one tap" — failed at mobile-small inside
`page.goto` itself with `net::ERR_ABORTED`, before any assertion. Both pass in
isolation and in the runs either side of them. This is the class the round 1 QA
report documented, and it is a property of the harness rather than of the
product — but it is worth saying plainly that **it makes a single green run
weaker evidence than it looks**, which is why the counts below name the run they
came from.

**The re-cut did not separate a genuinely near-tied field, and cannot.** The
audit's worked example is three candidates inside three thousandths. They are
now inside three thousandths of a scale roughly half again as tall, and the app
says "close call" about them. Removing the compression was the fixable half;
the rest is that the evidence about those three moves is genuinely similar.

**A thread's moves are a set rather than an ordered sequence**, which departs
from AUD-0020's wording. The reasoning is in D-133: for a recovery run an order
is not merely unnecessary but wrong, because which recovery verb is right
depends entirely on the hour. If QA reads the finding as requiring an ordered
list, this is the place to say so.

**`goal-behind` is not reached by any history in the library**, and is named as
such by `no-hidden-genericity.test.ts` under D-139. Its sentence is rendered and
swept in `goal-horizon-and-parts.test.ts` across four combinations of horizon
and pieces, but no scenario puts a behind goal in front of the owner. A history
that does would be worth adding.

**The legacy mapper gained no rule for either new record kind**, and that is a
finding rather than an omission: `mapping.ts`'s registry is keyed on the old
app's own types, and nothing in it corresponds to a schedule or to a course of
action. Both new kinds round-trip through backup and restore, and both are in
`round-trip.test.ts`'s enumeration of all twenty-two.

**The default vitest timeout was raised to 30 seconds.** Two library sweeps
crossed the five-second default under parallel load only — green on a rerun,
which is the worst way for a gate to fail. The number is not a licence for slow
tests; it is the recognition that a sweep over every history is the shape this
repository's strongest guards take, and a timeout tuned to today's library gets
weaker every time a scenario is added.

**The two-step growth flow is reachable only by doing it.** No scenario in the
library puts the growth move in front of the owner as its primary suggestion, so
the browser test reaches the second step the way he would: ask for something
else, do it, and answer. That works and is honest, and a fixture with a growth
result already pending would be a better instrument.

## Deliberate non-features

No generic thread creation. No calendar. No third schedule question. No
percentage, share or progress bar anywhere — about the owner or about his
daughter. `hold` cannot name tomorrow, because the app has no model of it.

## Still open for the owner, and not this phase's to close

Q1 (Adaya's age and normative references), Q4 (legacy evidence admissibility),
Q6 (live model inference — D-025 and D-024 both stand, re-checked against the
re-cut instrument), Q7 (which emotional dimensions exist) and Q8 (private
evidence versus the concept registry).

---

# Phase 81 — Correctness and truthfulness

**Status: GREEN — CLOSED after independent QA PASS.**

Three QA rounds: **FAIL, FAIL, PASS.** Under D-077 the builder conversation
could not approve its own phase; the same independent Codex conversation tested
the deployed build across all three rounds, and its Round 3 PASS is what closes
this phase.

Twenty-two audit findings in six steps, every one of them a thing the app
states that is untrue or an action the plan promises that the interface lacks.
Nothing here is a new capability, a new domain or a new screen.

**Round 1 returned FAIL on five blocking findings**
([`qa/PHASE_81_QA_HANDOFF.md`](qa/PHASE_81_QA_HANDOFF.md)): a named-limiter
invariant that was documented rather than met, a trade-off sentence that
endorsed the move the app had just rejected, the ignored-recommendation
reproduction still repeating four times, the promised question not following the
second refusal, and a clean-tree `npm run verify` that did not pass. All five
were repaired in step 81.6, each under section 42 rather than at the line
reported, and each regression proved to fail against a faithful reintroduction
of the defect it guards. Three of the five had a green regression standing over
them at the time QA found them; what those regressions had in common is recorded
with each entry.

**Round 2 confirmed all five round-1 findings repaired and accepted the
sore/rested adjudication, then returned FAIL on two findings the round-1
repairs had themselves produced**: a repetition rule that could be made to
promote a move the situation argued against once it had withheld the correct
one, and a late-night no-action sentence that was not a sentence. Both were
repaired in step 81.7, and rendering the no-action copy catalogue for the first
time turned up a third defect of the same class that QA had not named.

**Round 3 confirmed both repaired, adjudicated the third defect as correctly
fixed, and returned PASS.** QA's own words on the acceptance instrument: _"The
old `block-sweep.test.ts` was insufficient by itself for gate item 1: it could
only render states the scenario library reached... The new explicit catalogue
closes that gap, while the real sweep continues to prove wiring."_ QA
independently reintroduced QA-81-006's root seam in an isolated worktree and
confirmed the guard fails without it (3/19) and holds with it (19/19). One
non-blocking documentation slip was found and is corrected here: DEF-0086 and
D-127 said the no-action copy table held thirty-eight lines; it holds forty.

The specification is
[`WHOLE_APP_INTELLIGENCE_AUDIT.md`](WHOLE_APP_INTELLIGENCE_AUDIT.md) section 6.
The governing decisions written before any code changed are **D-109 … D-113**;
the ones written during the work are **D-114 … D-127**.

## Checkpoint

|                        |                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product checkpoint     | `7e00dac` — the last commit that changes the bundle; the code Round 3 QA tested                                                                                                                                     |
| QA-tested deployed SHA | `caaf179` — read live by QA during Round 3, bundle-equivalent to `7e00dac`                                                                                                                                          |
| Docs-only closeout SHA | this commit — corrects DEF-0086/D-127's line count and records the PASS; changes no byte the browser downloads                                                                                                      |
| Relationship           | Proved with `node scripts/checkpoint-equivalence.mjs 7e00dac --deployed <build-info url>`, per D-097. Not asserted as string equality: this repository redeploys on every push, including a documentation-only one. |
| QA verdict             | **PASS**, Round 3, same Codex conversation across all three rounds. Report: [`qa/PHASE_81_QA_HANDOFF.md`](qa/PHASE_81_QA_HANDOFF.md)                                                                                |
| Preview                | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                                                         |

## Exact verification results

| Gate                                      | Result                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run verify` from a clean checkout    | **PASS** — format, lint, typecheck, 1,332 unit tests across 60 files, build                   |
| Unit layer                                | **1,332 / 1,332** across 60 files (was 1,321 across 59; the new file is the copy catalogue)   |
| Browser, three widths                     | **501 / 501** at 360, 430 and 1,280px — 167 each                                              |
| Android-style gate on the deployed build  | **clean — 93 checks** (was 86; the seven new ones press QA-81-006 and QA-81-007 on a handset) |
| Privacy scan                              | clean, 216 tracked files                                                                      |
| Block sweep, every scenario × every block | in `tests/synthetic/block-sweep.test.ts`, and by hand through the laboratory's own control    |

**One thing was already failing before a line of code changed, and is fixed in
its own commit.** `npm run verify` runs `format:check`, and three documents
written after Phase 8 closed — `DECISION_LOG.md`, `NEXT_PROMPT.md` and
`WHOLE_APP_INTELLIGENCE_AUDIT.md` — had never been through the formatter. The
standing gate is "verify from a clean checkout", and it did not hold at the
checkpoint this phase started from.

## The six steps

**81.0 — the instrument (AUD-0008).** The library was thirteen evenings, one late
night, three afternoons and one morning, and that one morning is the near-empty
history that produces no move. Nothing in it ever asked the engine to decide
before noon, which is how every temporal finding survived 1,199 green assertions.
Three fixtures close the gap — a morning after three bad nights, a Saturday
morning with the day open, and the first history the library has ever held
containing a failed growth occasion — and `sweepDayBlocks` re-runs one history at
all five blocks without moving the clock, with a control in the laboratory that
shows the five answers side by side.

**81.1 — the horizon (AUD-0002 → AUD-0001, AUD-0036; AUD-0005).** One definition
of what to call the part of the day, in `src/domain/horizon.ts` and re-exported
under the name the audit gave it. Every function there is total and an unknown
block is never the evening. The limiter, the templates, every explanation branch,
the four "why this one" phrases, the no-action copy, the guide's prompts **and
its answer labels**, the evidence panel's headings and its own account of
comparability, the decline button and the state label all read it now. Separately,
two freshness units that describe validity rather than shelf life: last night's
sleep is true of the day it describes, and how much time there is expires with
the part of the day it was said in.

**81.2 — the morning has an answer (AUD-0003).** `lighten-the-day`, gated on
strain exactly as the existing generator is, and worded only from what is known —
it defers nothing to a tomorrow the app has no model of. DEF-0016's sweep now
runs midnight to midnight rather than noon to midnight, which is the bound that
let this survive.

**81.3 — Adaya (AUD-0048 → 0049; AUD-0014 → 0015b, 0016; AUD-0037).** The
evidence is the sequence rather than the survivors, so the only count the app can
honestly speak is the run the record ends on — which makes the most recent
contrary occasion hold a settled suggestion back on its own. No share, no rate
and no pass mark about a four-year-old anywhere. The suggestion carries an
internal confidence that never renders and an evidence line in his own words. A
decline stopped counting as practice; the growth move sits on the parent rather
than on the child; and growth left the screen that was contradicting it.

**81.4 — honest sentences (AUD-0032, 0028, 0027, 0026, 0033).** A guess is spoken
as a guess. The app's best sentence about the owner's own life reaches the screen
it is about. The unfounded causal clause is gone and the learned band is
acknowledged rather than contradicted. The choice says what it cost. A near-tie
does not read like a clear win.

**81.5 — interaction (AUD-0025, 0023, 0050, 0034, 0031).** A session-scoped
shown-ledger, handed to the engine as data on the moment. A refused move is out
of the running for the block it was refused in, a question follows the second
refusal, and the app stops after the third. "Stop suggesting this", listed and
liftable. Silence that names the app's own reach rather than its readiness. And
D-111's narrow exception, verified last because it changes how often the guide
fires everywhere.

**81.6 — the five QA findings (QA-81-001 … 005).** Soreness is read as a
statement about exertion rather than about everything, which closes the
`capacity` invariant by fixing what was wrong upstream of the generator instead
of widening it. No clause in `explain.ts` takes a noun from its caller any more,
and the trade-off it composes names no move but the one on screen — while still
naming the cost, which the first attempt at this quietly deleted. A move put on
screen twice and left is taken off the table, and the silence that can cause
says why. Two refusals stop the app offering; an answer re-opens the block, which
is also what keeps the third-refusal stop reachable. And a synthetic test that
rebuilt the whole library inside its own loop no longer does.

**81.7 — the two findings round 2 raised (QA-81-006, QA-81-007).** The repetition
rule and the limiter invariant are ordered rather than left to compete:
withholding an answer may make the app stop speaking, and may not promote
something the situation argues against into the answer's place. "Answers the
limiter" is one definition now, read by the dimension that rewards it and the
filter that protects it. A sibling went with it — the session ledger survived a
change of history, which no owner can reach and every auditor can. And the
no-action copy is held as a table of finished sentences at every block, which
fixed the reported one, the fallback that broke the same frame, and a third the
render turned up: `nothing-in-reach` saying "your evening" at nine in the
morning.

## The gate, item by item

| #   | Acceptance item                                                                                                                                                                                       | Where it is proved                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No owner-visible string asserts the evening outside the evening, at any block, in any scenario                                                                                                        | `block-sweep.test.ts` — every scenario × six moments, over the move, the reason, the premise, the limiter, the no-action states, the growth suggestion, the guide's question and labels, the whole evidence panel and every Insights card |
| 2   | A named limiter always has a candidate that addresses it, in every block                                                                                                                              | `recovery-has-somewhere-to-go.test.ts` — for `recovery` **and** `capacity`, the second closed in 81.6 (QA-81-001) with a fixture that reaches it, so the sweep is not vacuous                                                             |
| 3   | No sentence about the child claims consecutiveness the occasions do not support; no percentage, rank, grade or score reaches any surface; the suggestion states how many occasions went the other way | `g003-growth-evidence.test.ts`                                                                                                                                                                                                            |
| 4   | The owner can stop a recommendation family, and find and lift that veto afterwards                                                                                                                    | `refusal-and-veto.test.ts` and `phase81.spec.ts`                                                                                                                                                                                          |

Item 1 gained a second instrument in 81.7. `block-sweep.test.ts` sweeps the
states the library reaches; `no-action-copy.test.ts` renders the copy catalogue
whether the library reaches it or not, which is how the `nothing-in-reach`
violation was found after two rounds of QA had passed the item.

## Open, and named rather than left to be found

**The sleep-protection move still out-ranks time with Adaya on the
sore-and-rested fixture**, 0.354 to 0.098, and the gap is `bottleneck-fit`:
2.375 against −0.250. This is the outcome that caused the `capacity` gate to be
closed in the first place, and it is now reached with nothing false feeding it —
`capacity-fit` reads +0.48 for the restorative move, 0.00 for the half-hour with
Adaya and −0.66 for a walk, which is the correction QA-81-001 asked for. What
decides it is a bottleneck the history states outright. Section 10 item 13
protects time with Adaya from being merged into a generic family or made
conditional; it does not protect it from being out-ranked by a history in which
the body is the bottleneck.

**Round 2 adjudicated this and accepted it**, in those terms: the remaining gap
comes from an explicit capacity bottleneck rather than from the old false
inference that soreness argues against a light move, and no further change is
required. It stays listed here because it is a judgement rather than a
derivation, and the next person to read the ranking should find it named.

**AUD-0027's refusal half is not shipped**, per the audit's own instruction to
drop it if either half is in doubt. Surfacing "you have passed on this fourteen
times" needs D-031 and DEF-0006's rule widened, and the audit calls that sentence
the riskiest copy it proposes without offering wording for it. D-115 records the
decision and a guard asserts no reason in the library mentions a refusal.

**The shown-ledger's weight question is still Phase 82's.** The kitchen's lead on
"A week pointed at the house" is wider than the whole range of
`recent-duplication` at its current weight, and that is still true. What changed
in 81.6 is that the promise no longer rests on the weight: a move put on screen
twice and left is removed by the filter, which cannot be outvoted (D-124).
Whether the weights themselves are cut right remains AUD-0035, and remains
Phase 82's.

**AUD-0005's own two columns disagree.** Its Tests-required column asks that a
reading taken at 22:00 still be known at 09:00 the next day; its
Recommended-behaviour column says a sleep reading is valid for the local day that
follows the night it describes. Those cannot both hold, and the recommended
behaviour is what is implemented.

**The known Playwright transient did not occur.** One test per full local run
used to fail at `page.goto` with `net::ERR_ABORTED`, on a rotating spec. Neither
the round-2 run of 495 nor this run of 501 saw it, and independent QA did not
see it in any of the three rounds. Still reported rather than declared gone.

**Round 3's own reading of gate item 1's instrument is recorded rather than
paraphrased**, because it states a rule this phase should keep: a sweep over
reachable states proves real wiring and cannot prove a universal claim about
branches the library does not reach; an explicit catalogue proves the universal
claim and cannot prove the wiring. Gate item 1 needed both, and `nothing-in-reach`
is the sentence that was wrong only where the first instrument could not see.

## Deliberate non-features, unchanged

No import from the QA laboratory, no partial import, no undo button. The v297
ancestor export, life-context-change mapping, the load-bearing literal NUL byte
in derived record ids, and the archived skill-claim, faith-anchor and
milestone-observation families all carry forward from Phase 8.

## Still open for the owner, and not this phase's to close

Q1 (Adaya's age and normative references), Q4 (legacy evidence admissibility),
Q6 (live model inference — D-025 stands), Q7 (which emotional dimensions exist)
and Q8 (private evidence versus the concept registry).

---

# Phase 8 — Legacy migration

**Status: GREEN — CLOSED after independent QA PASS.**

Four QA rounds: **FAIL, FAIL, FAIL, PASS.** Round 1 found two blocking semantic
defects. The retest confirmed one repaired and found the other half done — the
conclusions drawn from records had been missed while the records themselves were
fixed. The second retest confirmed the product correct and failed the
**regressions**: two of them claimed more than they asserted, and one of those
was hiding a real product gap. The third retest passed, having independently
reproduced both named fault reintroductions and checked the newly exposed
`life-season` gap on the deployed build.

The report is [`qa/PHASE_08_QA_HANDOFF.md`](qa/PHASE_08_QA_HANDOFF.md). Per
D-077 the QA conversation returned its PASS here for closeout and did not mark
the phase itself.

## What this phase is actually about

Section 53 lists thirteen things to build and most of them are bounded: detect,
quarantine, inventory, preview, dry run, snapshot, apply atomically, verify,
roll back, do not duplicate, keep provenance. Phase 7 already built the second
half of that list and this phase reuses it rather than rewriting it.

**The phase is the mapping**, and section 30's critical rule is the whole of it
in one sentence: _do not contort the new architecture to make legacy mapping
easier._ That rule is about pressure, and the pressure arrives one plausible
mapping at a time. Every one of the previous generation's twenty-eight record
families is a place where something nearly fits.

Five families map. Five observation attributes out of sixty-four map. The rest
are archived verbatim or, where section 59 names them, left out entirely — and
every single one carries a written reason that the import report shows the owner.

That ratio is the result rather than an embarrassment. The bulk of a recorded
life is readings, and the five attributes that map carry the readings whose
construct, scale and direction are the same on both sides.

## Build identity

Reported to D-097's pattern. The product checkpoint and the deployed SHA are two
different facts, and the relationship between them is **checked**, not stated.

|                    |                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product checkpoint | `1fc41cf` — the last commit that changed anything the build emits, the QA-tested build, and the build every result below was measured against                                                          |
| Earlier this phase | `77fb34a`, the first complete build; `2d2d70e`, the read-through build DEF-0068 was found on; `ffd943e`, its repair; `b593a49` at YELLOW; `d433079` and `1fc41cf`, the three QA repair rounds          |
| Deployed SHA       | `0eb920b`, read live from `preview/build-info.json` — the SHA QA tested against. It is whatever was pushed last and is **not expected** to equal the checkpoint                                        |
| Bundle equivalence | `node scripts/checkpoint-equivalence.mjs 1fc41cf --deployed <build-info-url>` — **passes**: three documentation files differ, none of them bundle-relevant, so `0eb920b` serves the checkpoint's bytes |
| Closing SHA        | current `main` HEAD. Documentation only past the checkpoint, and the same equivalence check holds across it                                                                                            |
| Stable Preview URL | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                                            |
| Live proof         | `preview/build-info.json`, and the equivalence script above                                                                                                                                            |

## Verification

| Gate                                      | Result                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy scan                              | Clean, 212 tracked files                                                                                                                                                                                                                                                           |
| Format (Prettier)                         | Pass                                                                                                                                                                                                                                                                               |
| Lint (ESLint)                             | Pass, 0 warnings                                                                                                                                                                                                                                                                   |
| Typecheck (strict TS)                     | Pass, 0 errors                                                                                                                                                                                                                                                                     |
| Unit / contract / synthetic / adversarial | 1199 passed / 1199, 57 files (in plain Node, no DOM)                                                                                                                                                                                                                               |
| Browser tests (Playwright)                | 459 passed / 459 — 153 tests × 360, 430, 1280px                                                                                                                                                                                                                                    |
| Production build                          | Pass                                                                                                                                                                                                                                                                               |
| `npm run verify` from a clean checkout    | Pass — cloned fresh at the deployed `0eb920b`, `npm ci`, 1199/1199                                                                                                                                                                                                                 |
| Deployed build is the checkpoint's        | By `scripts/checkpoint-equivalence.mjs`, not by string comparison (D-097)                                                                                                                                                                                                          |
| Reintroduction pass                       | **46 across the phase** — 25 before QA and 21 more across the three repair rounds. 23 of the first 25 were caught on the first attempt; the two exceptions, DEF-0067 and the round-2 fixture, are why the count is reported this way. Independent QA reproduced two of them itself |
| Builder's own Android-style gate          | `scripts/android-gate.mjs` against the deployed build — 56 checks clean, including the whole import flow by touch                                                                                                                                                                  |
| Independent QA                            | **PASS** on the fourth round, by a separate Codex conversation, against deployed `0eb920b` (D-077)                                                                                                                                                                                 |

Phase 7 ended at 1059 unit-layer tests across 52 files. The 140 new ones are five
new suites plus the architecture guards — 104 of them at YELLOW, and 36 more
written across the three QA repair rounds.

| Suite                                                                             | Tests |
| --------------------------------------------------------------------------------- | ----: |
| `contract/legacy-import.test.ts` — a real encrypted file, translated end to end   |    25 |
| `synthetic/legacy-inert.test.ts` — five evenings decided with and without it      |    40 |
| `unit/legacy-mapping.test.ts` — the registry held to its own claims               |    17 |
| `adversarial/legacy-hostile.test.ts` — damaged, wrong, and actively lying files   |    16 |
| `unit/architecture-guards.test.ts` — the wall around `src/legacy/`                |    +6 |
| `synthetic/imported-origin.test.ts` — where an entry, and a conclusion, came from |    20 |

The last of those is the QA rounds' suite and did not exist at YELLOW. It holds
three blocks: every surface that **shows an entry**, every surface that **states
a conclusion**, and every insight kind the library produces, enumerated by name
across four origins. The architecture guards grew to 46 over the same rounds —
the invisible-character sweep and the single-badge-definition guard are both
there.

Browser: `tests/browser/legacy-import.spec.ts`, 13 tests × 3 viewports = 39 new,
on top of the 405 already there, and 15 more across the QA rounds — all
unchanged, all still green.

## Gate checklist (section 53)

| Requirement                                                    | Status                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Legacy detector                                                | Pass — four verdicts, each with a reason. Including this app's **own** backup, whose format marker differs from the old one by a single character                  |
| Quarantined parser                                             | Pass — `src/legacy/format.ts` is behind a wall five architecture guards enforce; nothing below the UI can import it                                                |
| Mapping inventory                                              | Pass — every family, every count, every reason, shown to the owner before anything is written                                                                      |
| Explicit semantic mappings                                     | Pass — five families and five attributes, each with the argument for it; and `DECLINED_ATTRIBUTES` carries the argument against, for the near-fits                 |
| Raw preservation for uncertain fields                          | Pass — a mapped row keeps every field this app did not consume, named by exclusion; an unmapped row is kept whole                                                  |
| Preview / dry run                                              | Pass — and they are **one object**. `planImport` builds every record that would be written and then does not write it, so there is no second path to disagree with |
| Snapshot                                                       | Pass — `restoreInto` holds the current history before it writes                                                                                                    |
| Atomic apply                                                   | Pass — one `replaceAll` transaction carrying records and entities together                                                                                         |
| Verify                                                         | Pass — read back and fingerprinted, then read again from a **reopened** database, through the same ladder a restore uses (D-099)                                   |
| Rollback                                                       | Pass — including the case where the rollback itself fails, which gets its own sentence                                                                             |
| Idempotency                                                    | Pass — ids are derived from the old record ids, so a second pass recognises its own work exactly; asserted through the plan, through the store, and in the browser |
| Duplicate detection                                            | Pass — exact rather than heuristic. Two rows are the same row when the old app said so, not when they look alike                                                   |
| Provenance                                                     | Pass — `legacy-import`, the **mapping rules version** rather than "the importer", and the old record id                                                            |
| Gate: does not change the recommendation engine architecture   | Pass — nothing in `src/intelligence/` was touched, and a guard forbids it importing the reader                                                                     |
| Gate: ambiguous mappings remain explicit                       | Pass — four dispositions, and silence is not one of them                                                                                                           |
| Gate: imported raw records cannot silently drive decisions     | Pass — five scenarios × two opposite pulls, decided identically down to the dimensions and the score                                                               |
| Gate: current behaviour is correct with no legacy data present | Pass — every other suite in the repository runs with none, and none of them changed                                                                                |
| CI green                                                       | Pass — and confirmed independently by QA at the tested checkpoint                                                                                                  |
| Independent QA (D-077)                                         | **Pass** — four rounds, three FAIL and repaired under section 42, the fourth PASS                                                                                  |

## The mapping, and where the judgement went

### The one that most looked like it should map

A `move-preference` with the stance `forbidden` is section 4.3 in one record:
the owner told the old app never to suggest something. Losing it looks like the
worst thing this phase could do. Bringing it across would have been worse.

It is keyed on `engineCandidateId` — `home:make-the-change` — which is the **old
generator's** identity for a move. This app's vetoes match on an entity
reference and its candidates have entirely different ids, so an imported veto
matches nothing. It would sit in his history saying a move is forbidden while
the engine could never act on it. **An inert veto is worse than no veto, because
it looks kept.**

Two ways to make it fire and both are the contortion: reshape this app's
candidate identities to match the old catalogue, which is section 59's first
exclusion arriving through the back door; or widen the veto to the domain the
old id was prefixed with, which would forbid every move in an area of his life
because he once declined one move in it.

So it is archived, and the report **names the moves** he will have to say again.
It reads the chain rather than every record: a `forbidden` he later `restored`
is not standing, and handing that back would be worse than losing it because he
would very likely re-state it. D-103.

### Where a near-fit was available and refused

- **Mood, stress, confidence, overwhelm.** Four constructs. This app's
  `emotionalState` is one undivided dimension and an open question for the owner
  (D-091 invariant 6). Pouring four scales into it is the wellness score he
  rules out.
- **Physical and mental energy.** The old app split them _because_ averaging
  them loses what would have chosen between them. Mapping both onto one energy
  concept performs that averaging after the fact.
- **Financial pressure.** The old model says on its own face that it is not a
  measure of how much money there is. This app's cash buffer is a quantity.
- **Loneliness.** Not social energy. It can be high in a full house, and the two
  run in opposite directions.
- **Bedtime and wake time.** Deriving hours slept from them would be this app
  computing a reading the old one never took and presenting it as one he
  recorded.
- **Available minutes.** This app's own registry declines to track usable time
  as a trend — it is noise with a timestamp. Importing years of it adds rows and
  no understanding.
- **An expired goal.** Neither "abandoned" nor "paused" is true of a window that
  simply passed. There is no word here for it, so the row is archived rather
  than given the nearest one.
- **"Unsure."** A real first-hand report that the owner looked and could not
  say. There is no value here that means it, and a text reading of "Unsure"
  would put an answer where he put an absence. Caught through both doors — the
  old value kind, and the literal choice label.

### The whole decision-episode chain, archived together

`recommendation` is excluded by section 59 — the old move catalogue does not
return as product truth. `execution` and `outcome` are _about_ a recommendation,
and `learned-belief` and the effect evaluations are learned over it. Importing
the recommendation would make the old catalogue the object of every relationship
this app learns (D-091 invariant 1); importing the evidence without it would
attach evidence to nothing. One decision, applied to the chain as a chain.

## The passphrase, which is not a choice

The old application has exactly one complete data-out path and it is encrypted
with no plaintext branch — `encrypted: z.literal(true)` in its own schema. Its
AI export is a readable markdown summary that says on its face it is lossy and
not for recovery, so it is not a migration source.

That leaves implementing a compatible reader, or changing the old application to
write something else. **D-001 forbids the second absolutely.** So the passphrase
is the only door, and the app says so rather than offering a choice that does
not exist. D-102.

The reader is standard Web Crypto at whatever parameters the file declares, with
the old application's pipe-joined canonicalisation of the crypto metadata
reproduced byte for byte as additional authenticated data — pinned by a test
that states the exact string, because reordering those eight fields would make
every backup he has undecryptable and would present as a wrong passphrase rather
than as a code change.

Decrypt only. There is no encryptor in `src/legacy/` and a guard keeps one out.

## The one that no gate could see, and one person could

Every gate below was green. 1163 unit-layer tests, 441 browser tests across
three widths, a clean-checkout verify, CI, and a 44-check Android gate driving
the whole import flow by touch on the deployed build. Then the deployed build
was opened and the import report was **read**, and the panel turned out to be
reading the registry's audit trail out loud:

> `move-preference` — 1 entry, kept exactly as written. The one that most looks
> like it should map, and must not. **See MOVE_PREFERENCE_NOTE.**

> `recommendation` — 1 entry, left out on purpose. **Section 59** — the old move
> catalogue does not return as product truth.

> Deliberately not brought across — 1 entry. **D-091 invariant 6 by name.**
> Mood, stress, confidence and overwhelm are four things … the wellness score
> **he** rules out.

Every rule in the registry carries a `because` written so that a claim about
somebody else's data model stays checkable a year later — it cites decisions,
plan sections and the names of things in that file. The report rendered it
verbatim. So the screen sent the owner to a constant he cannot open, quoted
plan sections at him, used the word "defect", and discussed him in the third
person while he was reading it.

DEF-0068, and it is a blocker rather than a polish item: the report is the
whole safeguard of this phase. It is what he reads before agreeing to write a
re-interpretation of his history into the only copy of it.

**The fix is a second field, not a rewritten one.** Every rule now carries
`because` for whoever reads the registry and `owner` for the screen, and a test
asserts they are different strings and that the audit trail still cites what it
rests on — so it cannot be watered down to pass the sweep. Two regressions,
because there are two ways in: the registry's strings, and the rendered panel,
where a component can grow developer vocabulary in a label the registry sweep
never looks at.

One browser test in this very file already asserted
`toContainText('move catalogue')`. That is an assertion **that the developer
wording is on screen**, and it was green throughout.

### And what that sweep then found on the screen next door

Running it over the whole of Data rather than only over the new panel failed
immediately on a Phase 7 string: the export section chooser offered
**"Where the owner has overruled the app"** — the app discussing him in the
third person, on his own screen, since Phase 7 went GREEN.

It is fixed here rather than exempted, because a rule with a carve-out for the
place it was first broken is not a rule. The title is now
**"Where the app has been overruled"** — passive, because the same string is
also a heading in the document he hands to an assistant, where "you" would read
as the assistant.

## Eight defects, three of them found by reading the screen

Full entries in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).

**DEF-0065 — every import would have verified false and rolled itself back.**
`snapshotToWire` serialises in the order it is given and a store returns records
sorted, so an unsorted merge fingerprinted differently coming out than going in.
The verification correctly reported that what was written is not what the file
holds, and correctly undid it — every time. Found by the first end-to-end run
through a real store; the plan-only assertions passed throughout.

**DEF-0066 — a re-import offered to rewrite the store to change nothing.**
Records were filtered against the store and entities were not, so a second pass
produced an empty append list and a full list of subjects. The report said
everything was already present and the button beside it said "Bring it across".

**DEF-0067 — a guard that could never fire, and an assertion comparing nothing
to nothing.** The wall-clock guard over `src/legacy/` held a literal `0x08` byte
where `\b` was meant, so it passed with a `Date.now()` sitting in `plan.ts`. And
`legacy-inert.test.ts` compared `evaluation?.evidence` on both sides of a
property that does not exist. This is the failure Phase 7 shipped three of, and
the handoff's instruction to prove every regression by reintroduction is the only
reason it was found.

## Twenty-five reintroductions

Each new guard and each new claim was proved by putting the defect back and
watching the test fail.

| Reintroduced                                      | Caught by                                              |
| ------------------------------------------------- | ------------------------------------------------------ |
| a legacy type imported into `src/domain/`         | `lets nothing below the UI know the old format exists` |
| a feature importing `src/legacy/mapping` directly | `keeps the quarantined shapes ... inside the importer` |
| a store opened inside `src/legacy/detect.ts`      | `reaches no store of its own`                          |
| an encryptor added to `src/legacy/crypto.ts`      | `never writes a legacy file, only reads one`           |
| `Date.now()` in `src/legacy/plan.ts`              | `reads no wall clock` — **only after DEF-0067's fix**  |
| archive rows replaced with real observations      | all four assertions, on all five scenarios, one pull   |
| entities collected without checking the store     | `recognises its own work exactly`                      |
| an unsorted merged snapshot                       | `is idempotent through the store`                      |
| a store that drops the last record on write       | `puts the history back and says the import did not`    |

The sixth is the one worth reading twice. Its first fixture set energy to its
best and soreness to its worst, and on the scenario that was already about being
depleted the two cancelled — so three of that scenario's four assertions could
not have failed and read as evidence anyway. It now runs every scenario against
two opposite pulls, and `running-on-empty` was **removed** from the list because
neither pull moved it.

## Independent QA, round 1 — FAIL on two blocking semantic defects

Codex tested checkpoint `b593a49` against deployed build `a057783`, confirmed
bundle equivalence, ran a sealed cold owner-use pass before reading anything in
the repository, and returned **FAIL**. Full report:
[`qa/PHASE_08_QA_HANDOFF.md`](qa/PHASE_08_QA_HANDOFF.md).

Everything the phase claimed mechanically held. Detection, quarantine,
inventory, preview, atomic apply, verification through a reopened database,
rollback, exact idempotency, privacy handling and the 44-check Android gate all
passed, and the raw-archive inertness claim held under a deliberate attempt to
break it — two archive rows shaped like current-energy and sleep-quality
readings, at recent times, and Now did not move.

**Both failures were semantic, and both were wider than they were reported.**

### QA-08-001 — an imported reading was indistinguishable from one he typed

The record layer was right the whole time. `evidenceSourceOf` returned
`legacy-import`, the store kept it, and a backup taken immediately after the
import carried it on every row. **The presentation layer never asked.**

`describeRecord` returned a kind, a sentence and a withheld flag, and every
surface rendered those three. So the reported defect — "mapped legacy imports
lose their origin" — was the visible corner of a wider one: **no entry on any
list surface said where it came from.** A device reading and a derived one were
silent in exactly the same way, and D-014 asks for all of them.

The repair is one function with one vocabulary, rendered by every surface that
shows an entry or a belief resting on one: Timeline, a domain page's entries,
its readings, its goals, the evidence behind a figure, and the export. His own
entries carry nothing, and a test holds that half too — a build that marked
every row would satisfy a weaker test and would teach him to stop reading the
badge. A mixed basis says nothing, because a badge over a belief that is half
his would be a claim wider than its evidence. D-106.

The knowledge state does not substitute for it. An imported reading resolves as
`inferred` — this app did not watch it happen — and the export duly labelled
one `(inferred)`. That reads as the app having concluded something, when he
reported it, in the old app, two years ago. Both facts belong on the row.

### QA-08-002 — a later backup turned unchanged rows into conflicts

`legacyFormatLabel` returned `life-command-os.backup@<the backup's createdAt>`,
and that string is stored in every archived row. Conflict detection
fingerprinted the whole canonical record, so taking a **new** backup of the same
append-first history changed every archived row while its legacy payload was
byte-identical. QA generated a second backup with one row edited and got seven
conflicts. The honest answer is one.

Taking a later backup is the ordinary way an old history gains rows, so this
was the normal path rather than an edge case.

Fixing the label alone would have left the class. Two more members were live
and unreported: the **mapping rules version**, so revising a rule would have
made every previously imported row a conflict; and the **device's timezone**, so
importing the same file after travelling would have done the same. The
comparison now asks what the old file says, with everything this build stamped
on the row taken back off, each exclusion named beside its reason. D-107.

A revised rule is now reported as a re-reading in its own words — not a
conflict, which blames his old history for a change in this app, and not
silence, which hides a real difference in what the app believes his history
means.

### The false green QA found underneath it

`tests/contract/legacy-import.test.ts` carried a test titled "every imported
record says it was imported, **wherever it surfaces**". It asserted
`provenance.source` and rendered nothing. Anybody auditing the suite for that
claim would have found it, ticked it and moved on.

That is the lesson worth keeping: a test's title is a claim, and where the title
is broader than the body, the body is what is true and the title is what gets
believed. It is retitled to what it proves, and the claim it used to make is
now held by `tests/synthetic/imported-origin.test.ts`, which renders every one
of those surfaces.

QA also named the browser test "adds the history, reads it back, and shows it
without a reload", which checked only that Timeline was not empty — true of a
build rendering imported readings as native, which is exactly what it was doing.

### Both non-blocking findings addressed

- **QA-08-N1** — the report was headed "What this would do" over counts that
  classify the _file_, so an exact re-import said it would bring six entries
  across directly above "there is nothing new to write". The heading is now
  "What is in that file", and what this run would do is one line at the bottom
  that says it on its own.
- **QA-08-N2** — the wrong-passphrase panel said "Nothing has been changed"
  inside the sentence and "Nothing was changed." again underneath. Said once
  now, and the browser test asserts the count rather than one exact phrasing —
  the old assertion named the duplicate and would have held it in place.

### Ten reintroductions for round 1, ten caught

| Reintroduced                                                 | Caught by                                      |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `originOf` returning nothing                                 | all eight surface assertions                   |
| origin dropped from Timeline alone                           | two                                            |
| origin dropped from the domain page alone                    | one                                            |
| origin dropped from the export alone                         | one                                            |
| the per-file archive label, with the whole-record comparison | all five conflict tests, plus two pre-existing |
| the whole-record comparison alone                            | the revised-rules test                         |

The per-surface probes matter as much as the whole one: a fix applied in a
shared function and then dropped by one consumer is the shape this defect had
in the first place.

## Independent QA, retest — FAIL on the aggregate half, repaired

QA retested `d072012` and confirmed **QA-08-002 and both non-blocking findings
repaired**. QA-08-001 was **still failing**, and the diagnosis was exact.

The round-1 repair threaded origin through `DescribedRecord`, which is the shape
for **showing** a record. Every surface that lists entries was fixed; every
surface that states a **conclusion drawn from** them was not — Life's overview,
an Insights coverage card, and four sections of the review export. Each was true
and each read as though the owner had gone quiet about an area he had never
mentioned to this app at all.

The fact the intelligence layer was not computing is the whole repair.
`DomainCoverage.source` answers "where did the newest evidence come from",
which is right for reliability and wrong for disclosure: an area with one recent
entry of his own on top of a decade of imports would have read as entirely his.
So `sources` carries the whole body alongside it, on `DomainCoverage`,
`ConceptCoverage` and `Insight` — and `originOfSources` is the one place the
word is chosen, shared with the entry-level rule so the two cannot drift.
D-108.

`Insight.sources` is filled centrally from what each card cites, so a card
written next year discloses correctly without its author knowing the rule
exists. Coverage cards set it themselves, because their evidence lines name
concepts rather than records — which is exactly QA's reproduction: an area whose
only record is a goal has no concept evidence at all.

### The lesson this round is really about

The round-1 report found a test whose title claimed more than its body held, and
that was written down as a rule. **The repair for it then shipped the same
defect**: a test headed "every surface tells them apart", asserting the four
record-shaped surfaces and none of the four aggregate ones. QA named that title
as the reason the gap went unnoticed.

Both blocks are now named for what they hold. And the first version of the new
fixture could not fire either — it gave Career an imported _observation_ as well
as the goal, so the coverage card's evidence lines resolved and the assertion
passed with the area-level origin removed. Found by the reintroduction pass
rather than by review.

### And one the gate counted but could not read

DEF-0072. The Android gate passed 56 checks including "an Insights card drawn
from it says so too", and the card's eyebrow read **`OUT OF DATEIMPORTED`** — the
badge was nested in an eyebrow carrying `text-transform: uppercase` and had
inherited it. The badge had been defined separately in five stylesheets, so
there was nowhere to say "not that" once.

One class now, in the shared sheet, resetting the properties a parent can
impose, with an architecture guard that fails the build if a surface starts
styling its own. Present and legible are two claims and only the first can be
counted.

## Independent QA, second retest — product PASS, regression contract FAIL

QA retested `d433079` and confirmed **the product repair for QA-08-001 is
behaviourally correct** on every surface it named, with owner and mixed evidence
correctly unmarked and the widened device/derived and non-coverage-insight
behaviour working. It then failed the phase on the **regressions**, and it was
right to.

Two tests claimed more than they asserted:

- `every insight declares where its evidence came from` asserted
  `Array.isArray(insight.sources)`. Every constructor initialises the field to
  `[]`, so deleting `withSources` left every value an array and the test green.
- The repair claimed four aggregate export sections and the tests held three.
  QA found that one in the repair's **own prose** — a table naming four
  sections and, three lines below, a reintroduction account saying "each of the
  three export sections one".

**This is the third occurrence of the class in this phase, and the second inside
a repair for the rule against it.** Writing "a title is a claim" down has not
stopped it, so D-108 now carries four mechanical checks instead of the sentence:
enumerate in the body; assert the value rather than the container; reintroduce
what the _title_ names rather than what the assertion touches; and treat a guard
inside an assertion as a hole.

### The gap the weak assertion was hiding

That last one is not abstract. QA's own probe guarded with
`if (insight.sources.length > 0)`, which reads as caution and means _skip the
case where the field is empty_ — exactly the state the defect produces. Removing
it found a real product gap: a **`life-season` card cites no evidence lines at
all**, so the central computation had nothing to resolve, and a season standing
on an imported durable context disclosed nothing. It sets its own sources now,
from the arrangement it quotes and the entries it counts.

QA's report says "no current product-behaviour defect was observed". The guard
is why.

### The replacements

Built on QA's technique — rewriting each golden scenario's provenance to one
origin — because those histories already produce nine kinds of card, and a
fixture per kind would be nine things that resemble the product rather than nine
it actually reasons about. The new block enumerates those nine by name and fails
if the set changes, asserts the word the owner would read per kind per origin,
and asserts a mixed basis resolves to nothing across more than three kinds. The
fourth export section has its own test isolating `## What has been worked out`,
paired against the same history flipped to the owner's.

Proved by reintroduction: removing `withSources` fails five; removing
`fromSources` from `insightsSection` fails one; removing the `life-season`
sources fails four.

## Independent QA, third retest — PASS

QA retested product checkpoint `1fc41cf` through deployed `0eb920b`, confirmed
bundle-equivalent by the script rather than by string comparison, and returned
**PASS**. No new defect was found.

It did not take the repair's word for either reintroduction. It removed
`withSources` itself and saw five focused failures; it removed the `fromSources`
wrapper from `insightsSection` itself and saw the isolated fourth-section test
fail. It checked the enumeration was honest — that the nine named kinds really
are what the scenario library produces, and that `contradiction` and
`stale-assumption` really are unreachable from any current scenario — and that
the mixed case is genuinely mixed rather than arranged.

And it tested the product gap the weak assertion had been hiding, on the
deployed build rather than only at the intelligence layer: a `life-season` card
over imported history carries `Imported`, over the owner's own carries nothing,
and over a genuine mixture carries nothing. It restored the Preview's original
eight-record owner history exactly afterwards.

| Gate                                                      | Independent result                                    |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Format, lint, typecheck                                   | Pass, 0 warnings, 0 errors                            |
| Unit / contract / synthetic / adversarial                 | 1199 / 1199 across 57 files                           |
| Production build                                          | Pass                                                  |
| Browser (Playwright)                                      | 459 / 459 — 153 each at 360, 430 and 1280px, no retry |
| Android-style gate on the deployed build                  | Clean, 56 checks against `0eb920b`                    |
| Checkpoint equivalence                                    | Pass — `0eb920b` serves `1fc41cf`'s bytes             |
| Reintroduction: remove `withSources`                      | Five focused failures                                 |
| Reintroduction: remove the fourth section's `fromSources` | One isolated focused failure                          |

Every previously accepted behaviour still holds: QA-08-001 on entry and
aggregate surfaces, QA-08-002's identity comparison, QA-08-N1 and N2,
raw-archive inertness, atomic apply and reopened-database verification,
rollback, exact idempotency, privacy handling, the legacy architecture wall, and
the laboratory/owner store separation. The protected previous-generation tree
was not touched (D-001).

## GREEN closeout

Confirmed in this builder conversation before anything was marked, because a
PASS that is only read is not a PASS that is checked. Re-run here on a clean
tree:

| Confirmed                                | Result                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Deployed SHA                             | `0eb920bfb0ddd9fd02c5ba7210a71b9322545c17`, read live from `preview/build-info.json`                   |
| Equivalence to the tested checkpoint     | Pass — three documentation files differ from `1fc41cf`, none bundle-relevant                           |
| Format, lint, privacy scan               | Pass; 212 tracked files                                                                                |
| Typecheck, unit layer, production build  | 0 errors; 1199 / 1199 across 57 files; build passes                                                    |
| `npm run verify` from a clean checkout   | Pass — cloned fresh at `0eb920b`, `npm ci`, 1199 / 1199 and a build                                    |
| Browser (Playwright)                     | 458 / 459 and one known transient — see below                                                          |
| Android-style gate on the deployed build | Clean, 56 checks                                                                                       |
| Reintroduction, reproduced here          | Removing `withSources` fails five; removing the fourth section's `fromSources` fails one, in isolation |

**The one browser failure is the transient this phase has reported since round
1**, and it is reported again rather than quietly retried: `page.goto:
net::ERR_ABORTED` at navigation, on a different spec each run — `qa-lab` this
time. The affected spec passes 69 / 69 when run alone, which is the documented
characteristic. It is a local dev-server navigation flake that predates Phase 8,
CI retries and is green, and it is **not** a Phase 8 defect. It stays on the
list of things to fix rather than being closed by assertion.

### What this phase is actually a record of

Four rounds, and the arithmetic is worth stating plainly: the automated gates
were green at YELLOW, and independent QA then found **five defects** across
three FAIL rounds. Two were product defects a person could see and no assertion
could. Three were **verification** defects — tests whose titles claimed more
than their bodies held.

That last class occurred three times, twice inside a repair for the rule against
it. D-108 stopped being a sentence about care and became four mechanical checks
because being told it three times did not work. And the fourth round found the
rule finally holding: the enumerations are honest, the assertions carry values
rather than containers, and the reintroductions fail what their titles name.

The gap that hid behind the weakest of those assertions — a `life-season` card
citing no evidence at all, so a season standing on imported history disclosed
nothing — is the reason the class matters. A guard that reads as caution meant
"skip the case where the defect lives", and it took removing the guard to find a
real thing wrong with the product.

## Open items and questions for the owner

Four. None of them blocked QA, all four were confirmed unchanged by the PASS,
and **all four survive the GREEN closeout untouched** — they are the owner's to
answer, not a phase's to close.

1. **The generation before the previous one.** The single-HTML app's export
   (`v297-phase68`) is recognised by shape and refused with a sentence saying
   what it is. This build does not read it: mapping it would mean a second
   complete set of claims about a second data model, and the previous generation
   built its own importer for that format so anything brought across then is
   already inside its records. **If the owner has a v297 export whose contents
   never reached the old app, that is a decision to reopen.**
2. **`life-context-change` is `undecided`.** "Moved house", "custody changed" —
   real history, and a narrative event rather than a fact about a concept.
   Inventing a concept to hold free text is the contortion section 30 forbids,
   so it is archived and flagged. Which of these should become durable context
   here, and against what, is the owner's to say.
3. **A NUL byte holds every derived record id together.** `derivedRecordId`
   joins its parts on a literal NUL — written into the source as the byte
   itself rather than as `\0` — and has since Phase 3. It is a perfectly sound
   separator, precisely because it cannot occur in ordinary text, and it is
   **load-bearing**: change it and every episode id already written moves, along
   with every id an import has already produced.

   The risk is that it is invisible. It survives git, and it survived Prettier
   in `src`. It did **not** survive being quoted in this document: writing the
   byte into the sentence above and running `prettier --write` replaced it with
   U+FFFD without a word, which is exactly the failure mode — a tool rewrites
   it, every derived id moves, and the diff shows nothing a reader would notice.

   Named in the invisible-character sweep's allow-list rather than changed,
   because changing it is a migration and not a tidy-up. **Worth a deliberate
   decision; not this phase's to make.**

4. **`skill-claim`, `faith-anchor` and `milestone-observation` are archived.**
   Each is real and each would have to assert something the original refused to:
   a skill claim explicitly carries no assertion of truth; a faith anchor is a
   standing statement and the nearest concept here is a reading of the last
   week; a milestone answer is meaningless without which checklist and which
   revision, and this app has no checklist registry. Preserved in full, and
   waiting on a decision rather than on code.

## Deliberately not built, with reasons

Three, each confirmed as deliberate by independent QA rather than found missing.

- **No import from the QA laboratory.** An import writes to the owner's store
  and nothing else, and the panel refuses while a test history is on screen —
  the same rule and the same words a restore uses (D-091 invariant 8).
- **No partial import.** Sections cannot be chosen. A choice would mean a second
  set of decisions about the same file made under less information than the
  registry had, and re-running the file later is already a no-op for what came
  across.
- **No undo button.** An import adds rows and never rewrites one, so the way
  back is a backup taken beforehand — which is one panel up on the same screen.
  A dedicated undo would be a second write path with the same risks as the first
  and none of its scrutiny.

## Next

**Phase 9 — visual coherence, motion and mobile refinement** (canonical plan
section 54), in a **new** builder conversation: the defect loop that kept Phase 8
in one conversation is closed, and a new phase starts fresh. The ready-to-paste
handoff is in [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

Phase 8 carries one thing forward beyond the four owner questions: the
`net::ERR_ABORTED` browser transient, which has been reported in every round of
this phase and fixed in none of them. It is a local navigation flake rather than
a product defect, and it has now survived long enough to be worth a deliberate
look rather than another paragraph.

---

# Phase 7 — AI exports + backup/restore

**Status: GREEN — independent QA passed.**

Five rounds, closed on independent Codex QA PASS (Round 5). Per D-077 this
checkpoint did not self-certify at any round, and QA does not mark a phase
GREEN either — it recommends, and this closeout is the builder's.

**Only three of the five rounds reached the product.**
Rounds 1 and 3 stopped at the checkpoint gate without testing anything, both
times on a defect in the handoff rather than in the product (DEF-0061,
DEF-0063). Round 2 was the first full product pass and returned eight findings.
Round 4 confirmed all eight repaired and found one more (DEF-0064). Round 5
confirmed that repair, accepted the regression's shape, and found nothing new.

**Two rounds lost to the checkpoint contract is the phase's own lesson**, and
both halves are closed: a handoff may not assert literal SHA equality against a
commit its own push supersedes (D-097), and a checkpoint is named only after
its deploy has landed, confirmed against the live SHA rather than a green CI
workflow (D-097's amendment). The checker distinguishes "this deployment
predates the checkpoint" from "something bundle-relevant differs", because a
`git diff` is direction-blind and the first version of that message cost a
whole round.

Owner approval: **independent QA (Codex), Round 5, PASS** — the gate D-077
substitutes for self-certification at this phase.

Nothing in this area existed before this checkpoint: `MoreScreen.tsx` said so in
as many words, and that sentence was one of the acknowledged deferrals in the
copy guard. It is gone, replaced by the thing it was deferring.

## What this phase is actually about

Three artefacts that look similar and are not, and most of the design work was
keeping them apart.

**A review export** is a description of what the app currently believes,
composed of chosen sections, written for a person or an assistant to read. It is
allowed to leave things out — that is what choosing sections _is_.

**A backup** is the file the owner's whole recorded life comes back from.
Nothing is chosen and nothing is omitted for any reason: not the private domain,
not a row the parser could not read, not a field this schema version has never
heard of. Section 29, in as many words: "no silent omission of records required
for restoration."

**A restore** replaces everything he has. It is the only irreversible thing in
the app, and it is built as three separate presses with the whole preview
between the second and the third.

## Build identity

Reported to D-097's pattern rather than as a claim of string equality — which
is the shape QA-07-009 found still asserted here after D-097 had removed it
from the handoff. The product checkpoint and the deployed SHA are two different
facts, and the relationship between them is **checked**, not stated.

|                    |                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Product checkpoint | `3a8e8b6` — the last commit that changed anything the build emits, and the build every result below was measured against        |
| Earlier this phase | `322c00b` — the round-2 checkpoint QA tested; `91bf40f`, `cc221bd` — the first complete build and its first read-through repair |
| Closing SHA        | current `main` HEAD. Documentation only past the checkpoint                                                                     |
| Deployed SHA       | read live from `preview/build-info.json`. It is whatever was pushed last and is **not expected** to equal the checkpoint        |
| Bundle equivalence | `node scripts/checkpoint-equivalence.mjs 3a8e8b6` — passes; nothing under `src/`, `public/` or the build inputs changed         |
| Stable Preview URL | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                     |
| Live proof         | `preview/build-info.json`, and the equivalence script above                                                                     |

## Verification

| Gate                                      | Result                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Privacy scan                              | Clean, 188 tracked files                                                                                                                                                                               |
| Format (Prettier)                         | Pass                                                                                                                                                                                                   |
| Lint (ESLint)                             | Pass, 0 warnings                                                                                                                                                                                       |
| Typecheck (strict TS)                     | Pass, 0 errors                                                                                                                                                                                         |
| Unit / contract / synthetic / adversarial | 1059 passed / 1059, 52 files (in plain Node, no DOM)                                                                                                                                                   |
| Browser tests (Playwright)                | 405 passed / 405 — 135 tests × 360, 430, 1280px                                                                                                                                                        |
| Production build                          | Pass                                                                                                                                                                                                   |
| `npm run verify` from a clean checkout    | Pass — cloned fresh at `e9979ef`, `npm ci`, 1059/1059                                                                                                                                                  |
| Deployed build is the checkpoint's        | Pass — by `scripts/checkpoint-equivalence.mjs`, not by string comparison (D-097)                                                                                                                       |
| Reintroduction pass                       | **29 across the phase, 29 caught** — 15 before QA, 12 for Round 2's findings, 2 for Round 4's. Six escaped on a first attempt; each of those six assertions is stronger for it                         |
| Builder's own Android-style gate          | Pass — `scripts/android-gate.mjs` against the deployed checkpoint: 27 checks, touch, Android UA, device pixel ratio 3, 360×780                                                                         |
| Owner-style read-through of the screen    | **Five findings, all repaired** — none of them from a failing assertion; see below                                                                                                                     |
| Independent QA                            | **PASS — Codex, Round 5.** Rounds 1 and 3 failed at the checkpoint gate; Round 2 returned eight findings, all repaired and all passed at Round 4; Round 4 returned one, repaired and passed at Round 5 |

Phase 6 ended at 780 unit-layer tests across 45 files. The 220 new ones are seven
new suites plus growth in the sweeps that walk the whole scenario library.

| Suite                                                                           | Tests |
| ------------------------------------------------------------------------------- | ----: |
| `unit/checksum.test.ts` — SHA-256 against published vectors and against Node    |     5 |
| `contract/backup-round-trip.test.ts` — every scenario, out and back unchanged   |    29 |
| `adversarial/corrupt-backup.test.ts` — documents that parse and are not backups |    18 |
| `unit/restore.test.ts` — apply, verify, rollback, retry, and no false success   |    15 |
| `unit/memory-provider-restore.test.tsx` — which store, and what is published    |     8 |
| `synthetic/g013-export-handoff.test.ts` — G-013, over the whole library         |    54 |
| `synthetic/export-honesty.test.ts` — D-091 applied to the document              |    88 |
| `unit/architecture-guards.test.ts` — the literal scanner and its self-tests     |    +2 |
| `unit/routing.test.ts` — Data resolves in every build                           |    +1 |

Browser: `tests/browser/data.spec.ts`, 25 tests × 3 viewports = 75 new, on top of
the 312 already there — all unchanged, all still green.

## Gate checklist (section 52, and G-013)

| Requirement                                                                                     | Status                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-013 — selected sections are present                                                           | Pass — asserted per section, per scenario, over the whole library; and a chosen section with nothing to report says so rather than rendering an empty heading              |
| G-013 — the Private section can be included                                                     | Pass — off by default, never swept in by **Select all**, never remembered, stated either way in the header and in the prompt                                               |
| G-013 — the handoff prompt is embedded                                                          | Pass — it leads the document, and is separately copyable                                                                                                                   |
| G-013 — the prompt says what to keep / change / remove / not change                             | Pass — all four, plus every other part section 52 lists, held as data rather than as prose                                                                                 |
| Export composer: section selection, select all, clear, remembered last selection                | Pass                                                                                                                                                                       |
| Export carries app/engine version, current data range, current selected domains                 | Pass — and the domains are read off the records in the document rather than chosen separately (D-094)                                                                      |
| Handoff prompt: app-tuning review when diagnostics are included                                 | Pass — conditional on the composed document, not on a flag beside it                                                                                                       |
| Full backup: complete, private domain included, schema version, app version, integrity metadata | Pass                                                                                                                                                                       |
| Backup: no silent omission                                                                      | Pass — unreadable rows and unrecognised fields both survive a round trip, asserted over every scenario in the library                                                      |
| Restore: validate before apply                                                                  | Pass — five refusal stages, each with a sentence the owner can act on                                                                                                      |
| Restore: preview                                                                                | Pass — what is coming in, what is being replaced, the span, the areas, whether the private area is in the file, and the fingerprint                                        |
| Restore: atomic apply                                                                           | Pass — one `replaceAll` transaction; the write happens once, and a test asserts it happens once                                                                            |
| Restore: post-apply verification                                                                | Pass — read back and fingerprinted, then read again from a **reopened** database                                                                                           |
| Restore: rollback on failure                                                                    | Pass — including the case where the rollback itself fails, which gets its own sentence                                                                                     |
| Restore: no false success                                                                       | Pass — every failure path asserted, including a store that reports success and writes nothing                                                                              |
| Restore: same-file retry after a failure                                                        | Pass — proved at the reader, at the transaction and in the browser                                                                                                         |
| Restore: mobile tested                                                                          | Pass — the whole flow driven by touch on a Galaxy-class Android context against the deployed build                                                                         |
| Export remains reliable on a phone                                                              | Pass — every artefact is also rendered into a selectable field, so a refused clipboard is not the end of it                                                                |
| Data/restore accessible during degraded-state tests (G-012)                                     | Pass — a row the parser cannot read is written straight into the owner's database; Data still opens, the backup still carries the damage, and it still reads back complete |
| CI green: privacy scan, format, lint, typecheck, unit, browser, build                           | Pass                                                                                                                                                                       |
| `npm run verify` passes from a clean checkout                                                   | Pass                                                                                                                                                                       |
| Preview deploys automatically, deployed SHA equals checkpoint SHA                               | Pass                                                                                                                                                                       |
| Independent QA (required from Phase 5 on, D-077)                                                | **Outstanding**                                                                                                                                                            |

## What changed

### `src/domain/checksum.ts` — a fingerprint that works everywhere

SHA-256, written out rather than reached for through `crypto.subtle`, because
that API is asynchronous and absent or partial in several of the environments
this code runs in — and a restore whose guarantee depended on where it ran would
not be a guarantee. Proved against published vectors and against Node's own
implementation at every block-boundary length, including the two off-by-one
lengths where the padding needs a whole extra block. The first version got one
of them wrong, and the test is why that is a sentence in this report rather than
a defect in somebody's backup.

**What it proves and what it does not** is stated in the file and in D-095: it
catches damage, and it cannot prove authorship. Authenticated validation needs a
key, and there is nowhere on a device to keep one an attacker holding the device
could not also read. Deferred deliberately rather than dressed up.

### `src/memory/backup.ts` — the envelope, and what it refuses

A `SnapshotWire` inside an envelope rather than a second serialisation, because
`snapshotToWire` already carries malformed rows and `recordToWire` already
carries unrecognised fields — and a second writer is a second place for a field
to be forgotten.

The envelope adds what a restore has to know **before** it writes: which build
wrote the file, when, and what it should contain. The fingerprint is over
meaning rather than bytes — canonical record order, sorted keys — so a file that
was re-indented in transit is accepted and a file with one record altered is
refused. Five refusal stages, because the owner's next move differs by stage:
look for another copy, update the app, or check he opened the right file.

### `src/memory/restore.ts` — the six things section 29 asks for, in order

Five of the six only ever run when something has already gone wrong, which on a
real IndexedDB means they would essentially never be exercised. So the store in
`unit/restore.test.ts` is a fake whose failures the **test** chooses: a write
that throws, a read that throws, a write that reports success and keeps the old
contents, and a rollback that fails on top of a failure.

**What is atomic, and by which mechanism, is stated rather than implied.** The
write is one transaction. The _restore_ is larger than the write and is atomic
by a compensating action — the old history is read out and held first, and
written back if anything after that point fails. That distinction has a
consequence the owner is owed: if the rollback write itself fails he is left with
a store holding neither history intact, and `rollbackVerified` exists so that
sentence can be said out loud instead of being softened into "restore failed".

### `src/features/export/` — the composer and the prompt

The prompt's twelve required parts are **data**, not prose, so a rewording
cannot drop one and the G-013 regression asserts the parts rather than remembered
sentences.

The composer reads the situation, the decision and the insights report — the same
objects Now, Insights and Timeline render — and computes nothing of its own. An
export that did its own arithmetic would be a second brain with no surface, and
the first time it disagreed with Now nobody would find out. The guard is
structural: `compose.ts` cannot reach the generator, the filter, the evaluator,
the arbiter, the advisor, the learning index or the association module.

D-091 governs the document as much as the screens, and `export-honesty.test.ts`
holds it: no figure without the quantity it counts, an abstention written down
rather than omitted, no causal wording anywhere, and the source named on every
document over every scenario in the library.

### `src/features/data/` — Data, behind More

Three panels, deliberately three. Everything produced is also rendered into a
selectable field, because a clipboard can be refused and a download can be lost,
and a person reading text can always get it out — which is what "export remains
reliable on phone" means in practice.

### `src/features/memory/` — where a backup reads from, and where a restore writes

`ownerSnapshot()` is deliberately not `snapshot`: a backup is of his own records
whatever is on screen. A restore does not run at all while a fixture is loaded.
Both are D-091's eighth invariant applied to the two operations where getting it
wrong cannot be undone by pressing something again (D-093).

After a successful restore the provider publishes the whole visible context in
one continuation and **returns the clock** — R5-B1's shape, one surface over. A
restored history read under a clock the laboratory moved to February would hide
every entry dated after it, which on this screen would read as the restore having
lost half his life.

## One defect found, and it was in the harness rather than in the product

**DEF-0059.** Two of the standing copy guards — D-089's causal-language sweep and
section 51's per-cent sweep — found string literals with a regex, and a regex
cannot pair quotes. The pairing held until a file contained an **empty** literal:
`''` was too short to match, the scan resumed at its closing quote, and from
there every quote paired with the wrong partner. The contents of every literal
after that point fell into a gap nothing looked at.

It was found because the export composer's own honesty suite flagged a sentence
that `architecture-guards.test.ts` had passed on the same file, minutes apart.
The rules were right; the rules had stopped being applied. `stringLiterals` now
walks the source with the scanner that already had to understand quoting in order
to strip comments, and two self-tests build the exact defeating shape and assert
that the walker sees what the regex missed.

The honest reading is in the ledger: a guard passing is now evidence, and was not
before.

## Five findings from reading the screen, and none from an assertion

The Android gate came back clean on the first deployed checkpoint, so I read the
Data screen on the phone context instead. It was wrong in three places, and none
of them was ever going to fail a test: **a test expecting "1 entries" is exactly
as green as one expecting "1 entry".**

1. **"1 entries", and "1 records".** A count printed beside a plural noun,
   everywhere a count appears — the export header, the backup panel, both sides
   of the restore preview, and the line the restore prints afterwards.
   `src/domain/counts.ts` now takes both words, because English plurals are
   irregular often enough that a rule would be wrong somewhere and silently
   wrong everywhere else.
2. **A machine timestamp on an owner surface.** "Written
   2026-08-23T06:04:04.513Z". Section 36 puts technical detail behind
   inspection; a backup's date is now read in the zone the app is currently
   using, so it agrees with every other date on screen including under time
   travel.
3. **A sixty-four character hash on a 360px screen.** The owner's question of a
   fingerprint is "is this the same file as the other one", which twelve
   characters answer. The full digests are still printed in full where two of
   them actually have to be compared — in the refusal that says a file has been
   changed.

Then a second reading, on a history holding exactly one record, found two more:

4. **"1 entry came back exactly as the backup holds them."** The count agreed
   with its noun and then disagreed with its pronoun. Rewritten so there is no
   pronoun to disagree.
5. **"read back all 1 records identically"** — the line the restore prints after
   reopening the database. The first sweep never reached it, because it only ran
   before anything had been restored.

## And a hole that appeared twice, on two layers

Both times the same shape: **a sweep that could not fire.**

The document-level count sweep passed over every scenario in the library and
proved nothing, because **no scenario holds exactly one record** — and a count
only disagrees with its noun when the count is one. The browser sweep had the
identical hole with a two-record seed, and it was found the only way it could
be: by reintroducing the defect to check the sweep bit, and watching it not.

Both now construct a one-of-something history of their own. That is Phase 6's
lesson arriving on a new surface — coverage that cannot observe the thing it
claims to prove reads as evidence either way — and it is worth saying that the
lesson did not transfer on its own. It had to be found again.

**A third, smaller one, worth naming for QA's benefit.** `npx playwright test`
serves a **prebuilt** `dist` and never builds — `npm run test:browser` is the
script that builds first. A reintroduction made in `src/` and checked with a
bare `playwright test` therefore tests the previous bytes and passes, which is
how finding 2's proof escaped before it was caught. Every browser reintroduction
below was rebuilt before it was run.

## Fifteen reintroductions, fifteen caught

Section 42 asks for a regression that fails when the defect is put back. Each of
these was put back, run, and reverted.

| Reintroduced                                                         | Caught by                                        |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| **Select all** sweeps in the private section                         | `g013-export-handoff.test.ts`                    |
| The restore trusts the write instead of checking what landed         | `restore.test.ts`                                |
| A failed write is not rolled back                                    | `restore.test.ts`                                |
| The backup reader skips the fingerprint                              | `corrupt-backup.test.ts`                         |
| A backup drops the rows it could not read                            | `backup-round-trip.test.ts`                      |
| The restore writes to whichever store is on screen                   | `memory-provider-restore.test.tsx`               |
| The restore leaves the laboratory's clock in place                   | `memory-provider-restore.test.tsx`               |
| The document stops saying whose history it is                        | `export-honesty.test.ts`                         |
| A section with nothing to report renders an empty heading            | `g013-export-handoff.test.ts` — **escaped once** |
| The prompt drops "what not to change"                                | `g013-export-handoff.test.ts`                    |
| The literal scanner goes back to pairing quotes with a regex         | `architecture-guards.test.ts`                    |
| A count is printed without agreeing with its noun                    | `export-honesty.test.ts` — **escaped once**      |
| A raw machine timestamp goes back on the surface                     | `data.spec.ts` — **escaped once**                |
| The browser seed stops reaching the running app                      | `data.spec.ts`                                   |
| A count of one against a plural noun, on the line the restore prints | `data.spec.ts` — **escaped once**                |

**The four that escaped, and what was wrong with each assertion.** The
empty-heading test looked for the next non-blank line after a heading and found
the _following section's_ prose; it now looks only as far as the next heading,
and is proved both ways — a builder that returns nothing is covered by the
fallback and passes, and the same builder with the fallback removed fails. The
two count sweeps could not fire, for the reason above. The timestamp sweep read
only the panel that does not carry the file's own date.

## Deliberately not built, with reasons

- **Authenticated / tamper validation.** Section 29 keeps it separate from
  structural validation, and this build ships structural validation and
  integrity, not authorship. The reason is in D-095 and it is not implementation
  cost: there is nowhere on a device to keep a key that an attacker with the
  device could not also read.
- **Migrations.** `MIGRATIONS` is still empty because schema 1 is the first
  canonical schema. The runner is exercised by the refusal path — a file from a
  schema with no migration is refused rather than guessed at — and a migrated
  file's fingerprint is allowed to differ, with the reason stated in the code.
- **Selective restore.** Restore is whole-store, as section 29 describes.
  Restoring one domain over a live history is a merge, and a merge needs
  conflict semantics this phase has no requirement for.
- **A way to override a refused file.** A "restore anyway" control would make
  every guarantee above optional. If a real damaged-file case ever needs one, it
  needs its own owner decision.
- **A download the owner can find again from inside the app.** The file goes
  where the browser puts it; there is no library of past backups. Section 29
  does not ask for one and a list of files the app cannot actually see would be
  a claim it could not keep.
- **Legacy import.** Section 30 and Phase 8.

## Open items

- **`guide-resume.test.ts`, still recorded as resolved-unreproduced.** Named in
  Phase 6 and unchanged here. It did not fail in any run during this phase.
- **One transport-level abort, on an earlier run of the full browser suite.**
  `qa-lab.spec.ts` → "relabels the same history when the timezone changes"
  failed once at mobile-small with `net::ERR_ABORTED; maybe frame was
detached?` on `page.goto` — the `vite preview` connection-dropping that
  `playwright.config.ts` documents in its own comment. The spec passed 23/23 on
  an immediate focused re-run, and the two later full runs at `91bf40f` and
  `322c00b` were both 387/387 clean. Disclosed rather than dropped.
- **`npx playwright test` serves a prebuilt `dist`.** Not a defect, and worth
  knowing before testing a source change: `npm run test:browser` is the script
  that builds first. This cost one reintroduction a false pass before it was
  noticed.

## Decisions made

- **D-093** — a backup is of the owner's own store, and a restore only ever runs
  on his own history.
- **D-094** — an export is chosen by section; the domains in it are reported, not
  chosen; the private section is never swept in and never remembered.
- **D-095** — integrity is a content fingerprint; authenticated validation is
  deferred, and says so.
- **D-096** — Data is a destination of its own, reached from More.
- **D-097** — a handoff never asserts literal SHA equality against a commit a
  later push has already superseded; bundle equivalence is checked, not
  claimed.
- **D-098** — an artefact that leaves the device states whose life it is in its
  first line, and an excluded area is excluded from the metadata as well as the
  detail.
- **D-099** — a restore's post-reopen confirmation is part of its result, and a
  confirmation that fails is reported without being rolled back.
- **D-097, amended** — a checkpoint is named only after its deploy has landed,
  confirmed against the live SHA rather than against a green CI workflow.
- **D-100** — a sticky layer owns its own opacity, and a claim about legibility
  is proved with pixels rather than with rectangles.

Defects closed here: **DEF-0059**, the literal scanner, found by the builder
before QA; **DEF-0060**, a count printed beside a plural noun and the two
sweeps that could not fire on it, found by the builder before QA;
**DEF-0061**, the checkpoint-equivalence defect, found by independent QA at
the mandatory preflight; **DEF-0062**, the eight round-2 findings, found by independent QA's first full
product pass; **DEF-0063**, a checkpoint named before its deploy landed and a
checker that could not say so, found by independent QA at the round-3 gate;
**DEF-0064**, a sticky layer that was a window, found by independent QA at
round 4 by looking at a screenshot its own geometry assertions had passed.

## Independent QA, round 1 — FAIL at the checkpoint preflight

Codex opened the deployed Preview and, per D-090's first step, checked the
assigned checkpoint before reading anything else. `preview/build-info.json`
reported `66eeab3`, not the `322c00b` the handoff named — because pushing that
very handoff's commit is what moved the deployed SHA past the value it wrote
down. QA stopped exactly as instructed and returned FAIL, having tested only
the sealed cold-use opening screen. Full report: `docs/qa/PHASE_07_QA_HANDOFF.md`.

No Phase 7 product behaviour was accepted or rejected by this run. The repair
below does not touch application code.

## The repair — DEF-0061, and D-097

The class of mistake: a handoff asserting the deployed SHA equals a named
product commit, when this repository redeploys on every push including a
documentation-only one and therefore the deployed SHA is never that commit
again once anything is pushed after it. Phases 1 through 6 avoided this
informally — "the closing SHA… `git diff X..HEAD --name-only` shows only
`docs/`" — without ever writing the reasoning down or making it checkable.
Phase 7's first handoff asserted literal string equality instead, and broke
the first time a docs commit followed a product commit under it.

**D-097** makes the informal reasoning a standing rule: a handoff names the
product checkpoint and separately reports the live deployed SHA, and never
instructs a reader to block on the two matching as strings. **DEF-0061** is
the defect this phase's first handoff committed against that rule, closed by
`scripts/checkpoint-equivalence.mjs` — a read-only `git diff` between a named
product commit and the current ref, failing if anything under `src/`,
`public/`, or the build-input files at the repository root changed. Run
against `322c00b..HEAD`: four documentation files, nothing bundle-relevant.
Reintroduced by committing a one-line change to a `src/` file: the script
fails and names it, then passes again once reverted.

`docs/NEXT_PROMPT.md`'s CHECKPOINT section is rewritten to the sound pattern —
product checkpoint named once and never re-asserted as a literal match; the
deployed SHA read live; equivalence established by the script's output rather
than by string comparison.

## Independent QA, round 2 — FAIL on seven product findings, all repaired

The first full product pass. QA confirmed the checkpoint repair, ran the whole
Phase 7 acceptance, and found seven things in the product plus one in this
file. The exact reproductions are in
[`qa/PHASE_07_QA_HANDOFF.md`](qa/PHASE_07_QA_HANDOFF.md) under "Round 2"; the
evidence scripts are under `test-results/phase07-qa-retest/`.

**Every one of them passed the existing green suites**, and QA named which
assertion let each through. That list is worth more than the findings.

### QA-07-002 — a synthetic export opened by claiming it was the owner's own life

The prompt's first sentence is an identity claim and it was written once, for
the owner, and used for both. A laboratory export opened with "you are
reviewing one person's own record of his life… he is the owner of everything
below" and disclosed that it was invented further down, under a heading.

`export-honesty.test.ts` asserted that "not a real person" appeared
**somewhere** in the document, and passed on exactly that. _Where_ a claim
appears is the finding: an assistant reading in order has already been told
whose life it is, and a later correction does not repair an instruction already
given. D-091's eighth invariant applies to the first line of an artefact, not
to a section of it.

`handoffPrompt` now takes the source, and the regression asserts the opening
line rather than the presence of a phrase.

### QA-07-003 — the private exclusion covered the entries and not whether there were any

With the private section off, the document said "nothing from that area is
below" and then reported Private / Sexual Health as current, moderately
evidenced, last heard three days ago. A dated `Noted: Private entry` row in the
recent record said the same thing again, and the screen listed the area under
"Life areas in it".

Participation is the part of a private record that stays sensitive after the
detail is withheld. **A placeholder is not a redaction when its presence is the
fact.** The exclusion now covers the coverage row, the header's life areas, and
the withheld Timeline row — and the document says, once, that it covers whether
anything is recorded there, so the silence still cannot be read as an empty
area.

Worth stating precisely, because Timeline does the opposite on his own screen
and is right to: dropping the row there would tell him his history is thinner
than it is, and he already knows what is in it. The difference is that this
artefact leaves the device under an explicit promise.

### QA-07-004 — the header described the store, not the document

"No sections were chosen, so this document contains nothing about the owner",
printed directly under a row reporting nineteen entries across four life areas.
Both sentences were composed from the same object and only one of them was
about the document.

`recordsInScope` now derives the range, the count and the life areas from the
records the chosen sections actually draw on. The rule is deliberately coarse
and stated in the code: the four sections that genuinely summarise the whole
record put the whole record in scope, the narrower ones contribute their own,
and privacy is applied to the result rather than per section.

The old header test compared the document's domains against the **entire source
record** — so it encoded the behaviour that made the two sentences contradict.

### QA-07-005 — a backup took its records from the owner and its date from the laboratory

`ownerSnapshot()` was already deliberately not `snapshot`. The clock was not
given the same treatment, so a backup taken in August with a February fixture
loaded was stamped, filed and previewed as February: correct contents under a
date that would send him to the wrong file on the day it mattered.

`ownerMoment()` is the same decision applied to time, and the export's
"composed on" line uses it too — when a document was composed is a fact about
now, not about the history it describes.

### QA-07-006 — the way out was underneath the button it told him to avoid

The restore refusal names **Show mine** as the remedy. The bar and both notices
were each `position: sticky; top: 0`, so once the page scrolled they occupied
the same coordinate and the higher z-index took the tap. At the scroll position
where the refusal is legible, a real touch on Show mine went to More.

It was visible throughout, which is why every assertion passed: `toBeVisible`
and `toContainText` cannot tell a button from a picture of one. The group
sticks now instead of its members, so they stack — no offsets to keep in step
with the bar's height, and a notice added later inherits the behaviour.

### QA-07-007 — a restore reported a success it could not confirm

Force the post-restore reopen to fail and the screen showed, in green, "the
store now holds 1 entry, exactly as the backup does" — with "what came back
after reopening the database is not what was restored" printed underneath. Two
contradictory claims about one operation, the confident one first, no rollback,
and the provider publishing an empty fallback store as his history.

The reopen is part of the claimed restore. It has its own stage now — `confirm`
— and three ways of failing that all get the same answer: **applied, verified
once, not confirmed, not undone.** Not undone deliberately: the write had
committed and matched its fingerprint before this ran, so rolling back would
trade a restore that probably worked for one that certainly did not happen. The
owner is told exactly that, and told to reopen the app and look before
restoring anything else over it.

Two subtleties the repair had to get right. `openStore` degrades to an in-memory
store rather than throwing, and an empty memory store fingerprints as an empty
history — so the check has to notice the fallback itself, not just compare. And
the operation's outer `catch` returned `notAttempted`, which for an applied
restore is the opposite of what happened.

### QA-07-008 — a sentence ended twice

`The app is suggesting nothing right now: Nothing to suggest just yet..` — a
headline that already carried its terminator joined to a fragment that added
one. The English sweep DEF-0060 introduced only checked count/noun agreement,
which QA correctly noted is narrower than the name "the document reads as
English". It now checks doubled terminators too.

### QA-07-009 — this file still asserted the equality D-097 removed

The build identity table still read "Deployed Preview SHA `322c00b`", "Do they
match? Yes" and "deployed SHA equals checkpoint — Pass", while the live
deployment was `3fc1dde`. The handoff had been repaired to D-097's pattern and
the full record it links to had not.

Rewritten above: the product checkpoint and the deployed SHA are two different
facts, and the relationship between them is checked by
`scripts/checkpoint-equivalence.mjs` rather than asserted.

## Twelve reintroductions for round 2, twelve caught

Each defect was put back, run, and reverted. Two escaped on the first attempt
and both escapes were the same shape as the ones this phase has already
recorded twice — **a sweep that could not fire on the thing it was written
for.**

The private sweep's word list named the area's labels and not
`discreetPlaceholder('private')`, so the dated `Noted: Private entry` row it
was written to catch went straight past it. And forcing the database reopen to
_throw_ never reaches the operation's outer `catch`, because `openStore`
catches everything and degrades to memory — so proving the "reported as never
attempted" defect gone needed a reopened store that refuses to be **read**,
which is the only shape that gets there.

Both are fixed and both are now proved by reintroduction rather than by
reasoning.

## Independent QA, round 3 — FAIL at the checkpoint gate, and nothing wrong with the repair

QA stopped at the checkpoint gate again, correctly, and this time the fault was
entirely in the handoff and the tool it pointed at (DEF-0063).

`docs/NEXT_PROMPT.md` named `3a8e8b6` and was pushed **before that commit's
deploy had landed**. Preview was still serving `3fc1dde`, two commits older.
The document was true about the repository and false about the live site at the
moment QA read it.

Worse, the checker pointed QA at the wrong problem. `git diff` is
direction-blind, so running it between the checkpoint and an older deployment
listed eight files under `src/` as "bundle-relevant differences" — which reads
as a repair that touched things it should not have. QA had to work out by hand
that `3a8e8b6` was simply not an ancestor of the deployed SHA. **A gate that is
right to fail and wrong about why costs a whole round, and this one did.**

**Nothing in the round-2 repair was wrong.** The live build at `5405eb4` was
read by hand afterwards, in an Android context, and carries every fix: the
first line of a synthetic export says it is not a real person, the ownership
claim is gone, the no-action sentence ends once, and Private / Sexual Health no
longer appears under the header's life areas.

### The repair

`contains()` — `git merge-base --is-ancestor` — runs before the diff, so a ref
that predates the checkpoint is reported as its own outcome in words that name
the remedy: the deploy has not landed, wait and read the deployed SHA again,
nothing here says the checkpoint is wrong. And `--deployed <build-info-url>`
reads the live SHA itself, so the check is one command rather than a value
copied out of a browser tab.

Proved both ways against the real history: QA's exact invocation
(`--ref 3fc1dde`) now exits 1 with the ancestry message; `--deployed` against
the live Preview exits 0.

D-097 gains the step it was missing. It said how to _report_ a checkpoint and
not **when one may be named**: the builder reads the live deployed SHA after CI
completes — not merely that the CI workflow succeeded, because GitHub's own
`pages-build-deployment` runs afterwards — and confirms the checkpoint is an
ancestor of it before writing a handoff that names it. **Naming a checkpoint is
something done after a deploy, not before one.**

## Independent QA, round 4 — the repair passes; one new blocking defect

The first round to reach the product on a deployment that carried the repair.
**All eight round-2 findings PASS**, every round-2 boundary held, and both
judgement calls were accepted on their reasoning rather than waved through:

- **The private exclusion** — accepted. QA's words: the exported artefact is not
  Timeline, it says plainly that the exclusion covers both the entries and
  whether any exist, and its ordinary recent record still reports eighteen
  non-private entries over the same range, so the rule does not make the rest of
  the history falsely thin.
- **The unconfirmed restore** — accepted. Rolling back because a later
  connection could not confirm a committed, fingerprint-matched write "would
  convert a probable success into a definite non-restore".

One new blocking defect, found by looking at a screenshot after QA's own
geometry assertions had passed.

### QA-07-010 — the sticky layer was a window

Sticking the header as a group fixed the members overlapping _each other_ and
said nothing about what is behind them. `.build-notice` is a translucent orange
wash with no blur: at the top of a document the only thing behind it is the page
background, so it reads as a tint, and once the group starts sticking it is a
window. "What has been observed to follow what" was drawn straight through "A
newer build is deployed" on Data; "6.75 hours" on Timeline. With both notices
stacked, the lower laboratory notice stayed opaque and readable while the
warning above it did not — which is what pointed at the cause.

That notice is the one piece of copy whose whole job is to stop the owner
mistaking old code for the deployed product. A version of it he cannot read is
worse than not showing it.

**The background belonged to the members and the property is about the group.**
One opaque backing on `.shell__top`; every member composites over that instead
of over the page, keeps its own tint, and a notice added later inherits it. The
top bar's `backdrop-filter` goes in the same pass — it was doing this job for
one member only, which is exactly how the two notices underneath went
transparent for two phases without anybody noticing. Same reasoning as the
grouped-sticky fix, one layer down (D-100).

### And the more useful half: rectangles cannot see this

QA's first pass compared all three header controls at four scroll positions and
passed while the warning text was visibly interleaved with the page. **The
controls do not overlap; the words do**, and no geometry assertion can express
that.

So three of the four tests in `tests/browser/sticky-header.spec.ts` compare the
header's **pixels** at rest against its pixels with a page scrolled underneath —
on Data, on Timeline, and with both notices stacked at the Restore panel. If
anything shows through, the images differ. The fourth asserts the group has an
opaque backing, so the reason survives a refactor that keeps the screenshots
passing by accident.

Reintroduced two ways — removing the backing, and making it translucent as a
per-member fix would — and **all four fail both times**, including the three
pixel tests. That is the coverage QA said was missing, in the only form that
holds it.

## Independent QA, round 5 — PASS

QA retested QA-07-010 on the deployed build by the route that found it: the
app's own freshness request answered with a different valid SHA, real content
scrolled behind the header, on Data, on Timeline, and with both notices stacked
at the Restore panel. In all three the sticky group's box stayed at `y = 0`,
its computed backing is opaque `rgb(20, 23, 31)`, and the header's SHA-256 at
rest and over content is **identical**. The stale-build member keeps its orange
tint over that backing and reads "A newer build is deployed (fffffff)."

**156 focused browser executions passed** across both phone profiles and
desktop — the twelve runs of the four sticky-header tests, all 81 Data
executions, and the shell routing, build-identity, navigation and overflow
checks the CSS change could touch.

**The regression's shape was accepted**, which is the part that mattered: QA's
Round 4 finding included a claim about testing, not only about the product, and
it judged the answer rather than the symptom. It also closed a harness
ambiguity I had not thought about — that a locator screenshot might scroll
itself into view — by asserting the group was still pinned at `y = 0` before
each capture, and by cross-checking the header crops against full-viewport
screenshots.

Nothing new was found. QA's own words: "No automated test gave false confidence
in this round."

## What five rounds actually produced

Worth separating, because the count flatters the product and the shape does
not.

**One round found product defects.** Round 2's eight, of which five shared a
single shape — _a claim that is true somewhere in the artefact and false where
it is read_. A synthetic export that opened by claiming the owner's life and
corrected it under a later heading. An exclusion that covered the private
entries and not whether there were any. A header describing the store while the
sentence beneath it described the document. A green restore success with its own
contradiction printed underneath. A sentence that ended twice.

**One round found a defect no assertion could.** Round 4's sticky layer, found
by looking at a screenshot after four geometry checks had passed — the controls
did not overlap, the words did.

**Two rounds found nothing because they could not start.** Both were mine, and
both are now structural rather than remembered.

## Deliberately left as future test hardening

QA named one automation gap with no defect behind it: the unconfirmed-restore
tests prove the outcome semantics without rendering the owner-facing
third-state copy. Round 4 inspected that copy directly and found nothing wrong
with it, and QA's Round 5 judgement is that this is "future test hardening if
desired, not Phase 7 acceptance work". Recorded here rather than built, because
inventing coverage for a surface independent QA found no defect in is not a
repair — and because a phase is closed on its gate, not on everything anyone
could still write.

## Next

**Phase 8 — Legacy migration (canonical plan section 53).** A **new** builder
conversation. The complete prompt is in [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 6 — Timeline + Insights

**Status: GREEN — independent QA passed.**

Six rounds. Round 1 passed section 51's gate item by item and was then
**withdrawn** — QA-A1: the app was asking the owner to perform the causal
analysis it exists to learn, and rendering his answers as percentages that
read as measurements (D-089). Round 1a's repair fixed that, and an independent
Codex cold-use audit then found five further ways the same claim-wider-than-
its-evidence failure recurred one layer down: pooled under a verb rather than
scoped to an action, read across a whole record rather than the context that
disagreed with it, silence counted as absence, "nothing else happened" said
from a check of one record kind, and no way for the owner to correct a
conclusion that was the app's own (D-091). Rounds 3 through 5 each found and
closed one more sibling in the QA laboratory's storage boundary: the
laboratory sharing a database with the owner and destroying his real history
on load (DEF-0054); a correction's action identity surviving the key but not
the sentence Timeline rendered it into (DEF-0055); a store-level publish race
that could show an empty owner history after a valid return (DEF-0057); and
the laboratory's clock, zone and week start surviving that same return and
hiding owner records dated after a fixture's instant (DEF-0058). Round 6 found
nothing new.

Per D-077, this checkpoint did not self-certify at any round. Independent QA
is Codex from Round 3 onward (D-090) — cold-use first, claim-to-evidence
second, targeted acceptance third — and every FAIL routed back to this same
builder conversation for repair before the next retest. **Nineteen semantic
regressions in `observed-relationships.test.ts`, sixty-one reintroductions
across the seven rounds of repair, all sixty-one caught.**

**The last three rounds were one defect class, not three unrelated bugs.**
"Only the newest work may publish" (DEF-0057) solved the store half of what a
reader sees; "restore the whole visible context, not only the store"
(DEF-0058) solved the other half, because `buildView(snapshot, { now, zone,
weekStartsOn })` reads all three. Both were found only because Round 4's own
regression coverage seeded the owner's row one day _before_ the fixture clock
it was tested against — a hole Codex named explicitly, and one this repair
would not have found on its own. The seed is dated after every scenario clock
now, and the deterministic coverage for it lives in
`tests/unit/memory-provider-race.test.tsx`, which drives the provider with
fake stores whose reads the _test_ holds open — because a race cannot be
proven by a browser test hoping two things overlap. Round 4's own regression
failed three-for-three focused and passed three-hundred-for-three-hundred in
the full suite on identical code; that non-determinism was the finding, and
the rule that fixes it now lives outside the component, in
`src/features/memory/projection.ts`, where it is testable as a sequence rather
than as a hope.

**D-090 and D-091 are the standing outcome.** Independent QA is permanently
Codex, cold-use first (seven-step order in `qa/README.md`); nine semantic
invariants — action identity, negative exposure, context, confounding,
correctability, tracked-state meaning, historical order, the QA/owner storage
boundary, and the temporal half of a returned projection — are codified rather
than left to be rediscovered per phase. **D-092** closes the phase alongside
them: every handoff, in both directions, ends with a model, a level, a
conversation instruction and a short copyable launcher, so the owner is never
left assembling the next prompt out of a report.

**One thing disclosed rather than buried, and it is closed.** A single unit-
suite failure on `guide-resume.test.ts` — a pure, clock-free test the Round 5
repair never touched — appeared once on a loaded machine and did not recur
across four full runs and three focused runs during the repair, nor across
Round 6's own three independent focused runs (39/39). Named in `PHASE_STATUS.md`
and in every handoff since; Codex could not reproduce it either. Recorded as
resolved-unreproduced rather than silently dropped.

**Final verification, this checkpoint.** Unit / contract / synthetic /
adversarial: 780/780 across 45 files. Browser: 312/312 across three projects.
Clean-checkout `npm run verify`: pass. Lint, format, typecheck, privacy scan:
clean. CI: green on every push from Round 3 onward. Deployed Preview SHA
matches the approved checkpoint at every round, verified independently against
`build-info.json` and against the running app.

Owner approval: **independent QA (Codex), Round 6, PASS** — the gate D-077
substitutes for self-certification at this phase.

**Round 5 status, superseded by the above: YELLOW — ROUND 5 REPAIRED, AWAITING CODEX RETEST.**

Codex's Round 5 retest confirmed the Round 4 store race repaired and the two
databases holding, and returned **FAIL** on one blocker: **R5-B1**, the
laboratory's clock surviving the return. Repaired here as DEF-0058. Full report
at [`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md) under "Round 5 —
Codex retest".

**Round 4 solved half a projection.** Only the newest work may publish the
source and the snapshot — that held. But what a reader sees is
`buildView(snapshot, { now, zone, weekStartsOn })`, and a scenario sets all
three of those before it loads anything. The return gave back the store and
left the clock behind, so a February fixture followed by **Empty the
laboratory** left every raw owner record in Storage and none of them on
Timeline: they are dated after February and had not happened yet. The notice was
gone by then, so the screen was asserting that an empty history was his.

The return now publishes **one coherent context** — owner source, owner
snapshot, system clock, system zone, default week start, `travelled` false — in
a single continuation. Restored rather than remembered, because nothing outside
the laboratory can change those; if that ever changes, it becomes a stash, and
the comment and the test both say so.

**QA also named a hole in the builder's own coverage, and it was real.** Every
Round 4 return test seeded the owner's row at 1 May and loaded a fixture clocked
2 May — one day later — so no assertion could ever observe a record hidden for
being in the future. The tests proved the store boundary and were blind to the
temporal half of the same screen. The seed is now dated August, after every
scenario clock, and the guard bites. The provider tests also ran without
`IS_REACT_ACT_ENVIRONMENT`, printing an `act(...)` warning on every render;
fixed, because a warning that noisy makes the assertions around it harder to
trust.

**Nine reintroductions across Rounds 4 and 5, nine caught** — and one escaped
first time, because the test never asserted the zone came back.

**One thing left open and reported rather than buried.** During this repair the
full unit suite failed once on `guide-resume.test.ts` → "never re-asks something
already answered", a test that is pure and clock-free and that I did not touch.
It did not recur in four subsequent full runs or three focused ones, and the
failing run was on a loaded machine. I could not reproduce it, so I cannot say
it is nothing — it is named here and in the Codex handoff rather than left to be
found again.

**Every Round 5 PASS preserved**: the two databases, fixture inspectability,
fixture-scoped writes, reload and notice behaviour, R3-B2, R3-B3, the seven
semantic invariants, QA-A1, section 51, DEF-0034–DEF-0044, the exact-three-verb
decision and every explicit deferral.

---

**Round 4 status, superseded by the above: YELLOW — ROUND 4 REPAIRED, AWAITING CODEX RETEST.**

Codex's Round 4 retest confirmed R3-B2 and R3-B3 repaired and the two databases
holding — the owner's bytes survived everything — and returned **FAIL** on one
blocker: **R4-B1**, the return from the laboratory. Full report at
[`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md) under "Round 4 — Codex
retest". It is repaired here as DEF-0057.

**This was never a storage defect.** DEF-0054's separation held and nothing of
his was lost. What was wrong was the _picture_ of his history: an append still
running against the laboratory finished after **Show mine** had emptied it, and
published that empty store. Timeline said "Nothing here yet" — directly under a
notice promising nothing of his had been changed — and kept saying it until a
reload. A reload being able to fix it does not make a false empty-history claim
acceptable.

**The rule left the component.** `src/features/memory/projection.ts` now owns
which work may put a history on screen: every operation claims a job, anything
newer makes it stale, and a stale job still finishes its write — the records are
already going somewhere real — but publishes nothing at all: not a snapshot, not
`busy`, not an error, not the source.

It left the component for a reason worth writing down. **A rule about
interleaving cannot be tested by hoping two things overlap.** QA's Round 4
regression failed three-for-three in a focused run and passed
three-hundred-for-three-hundred in the full suite, on identical code — and when
the builder ran that same focused suite here, it passed first time. A test that
tells the truth only when the scheduler cooperates is worse than no test,
because it reads as evidence either way.

So the coverage is in three layers, and only the first two are deterministic:

- `tests/unit/memory-projection.test.ts` — eight sequences over the rule
  itself, including the reported one exactly. Nothing waits for anything.
- `tests/unit/memory-provider-race.test.tsx` — the provider driven with fake
  stores whose reads the **test holds open**, so the overlap is constructed
  rather than awaited, on every run.
- `tests/browser/qa-lab.spec.ts` — both entry points, with the owner's own
  content, asserted immediately and again after a delay.

**Five reintroductions, five caught** — and three of them escaped on the first
attempt, which is what sent the rule out of the component in the first place.

**Every Round 4 PASS preserved and re-verified**: the two physical databases,
fixture inspectability across normal surfaces, fixture-scoped writes, reload
behaviour and the notice, R3-B2, R3-B3, the seven semantic invariants, QA-A1,
section 51, DEF-0034–DEF-0044, the exact-three-verb decision and every explicit
deferral.

**And a workflow decision the owner made in the same breath:** D-092 — every
handoff, in both directions, ends with the model, the level, the conversation,
and a short copyable launcher naming the exact MD file to read. The detail stays
in the repository; the owner never hunts through a report for it.

---

**Round 3 status, superseded by the above: YELLOW — ROUND 3 REPAIRED, AWAITING CODEX RETEST.**

Codex's Round 3 retest confirmed all seven of the previous round's blockers
repaired, and QA-A1 still repaired — and returned **FAIL** on three siblings the
seven had not reached. Full report at
[`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md) under "Round 3 — Codex
retest". The three are repaired here.

| Finding | What it was                                                                                                                                      | Repaired as |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| R3-B1   | Loading a QA scenario called `replaceAll` on a store the laboratory shared with the owner, destroying his real history. **The owner lost data.** | DEF-0054    |
| R3-B2   | A correction scoped to a walk, described on Timeline as "follows move" — a sentence that fits the bike ride he never disputed                    | DEF-0055    |
| R3-B3   | `emotionalState` declared `tracked` and said to participate, while `numericValue` discarded its free-text readings before anything used them     | DEF-0056    |

**The first one is the one that matters.** It is the owner's "Plenty" answer
that vanished — the concern carried into the Round 3 handoff with the
instruction not to assume user error. It was not user error. `MemoryProvider`
kept one database for every surface, and `loadDocument` clears all four object
stores before writing a fixture.

The class is the one this phase keeps producing: **a rule applied on the axis
somebody was looking at, and not on the axis it exists to protect.**
`indexedDbStore.ts` already carried the rule in its own comment — synthetic data
must not land where real history lives — and it had been applied between Preview
and production, never between the laboratory and the owner.

So the laboratory has its own database now, and nothing it does can reach his.
Which one is active is derived from whether the laboratory holds anything rather
than remembered in a flag, so nothing can drift out of step. A fixture stays
inspectable from every normal surface, because that is what the laboratory is
for — and every normal surface now **says whose evening it is**, with one press
back to his own, which costs nothing because his history was never written over.

**QA named the test that gave false confidence, and it is worth repeating.**
`qa-lab.spec.ts` already proved a loaded scenario survives a reload and a
reopen, and exercised clearing. It had never once put an owner record in front
of the laboratory. Every assertion passed while the defect destroyed real data.

**R3-B2 is DEF-0046's invariant surviving in the key and dying on the way to the
screen.** The scope, the key and the card's own control were all correct; the
stored record is read back by a different renderer, and that path had never been
part of the identity work. It now names the object, and the regression goes
through `assembleTimeline` rather than around it.

**R3-B3 was an unverifiable declaration.** `tracked` asserted that a concept
could be learned from and nothing checked that the machinery could read what the
concept holds. It now names _how_ a reading becomes a number, which is a claim
that can be — and is — checked against `numericValue` itself.

**And no scale was invented for how he feels.** Mood, stress, confidence and
motivation are four things; one number for all four is the wellness score the
owner rules out. `emotionalState` keeps everything else and is simply no longer
claimed to be a trackable dimension. Which dimensions exist is his to say, and
it stays an open question (D-091 invariant 6). QA accepted the reasoning and
rejected only the claim, which is exactly the distinction this repair makes.

**Every Round 3 PASS was preserved and re-verified**: the seven semantic
invariants, QA-A1's observe-first owner flow, the exact-three-verb
`inferred-evidence` decision QA accepted, section 51's already-passing gate
items, DEF-0034–DEF-0044, and every explicit deferral.

**Four defects reintroduced one at a time; four caught** — the shared database,
the verb-named correction, the renderer dropping the entity index, and a concept
tracked on a shape the path cannot read.

---

**Round 2 status, superseded by the above: YELLOW — REPAIRED, AWAITING CODEX RETEST.**

Round 2's repair was deployed and then read by an **independent Codex cold-use
and semantic audit**, which reproduced **seven blocking defects** in it. The
phase carried 22 purpose-written regressions over the repaired code, all green,
and not one of them asked the questions the audit asked.

**The through-line of all three rounds is one failure.** DEF-0020: four
different facts sharing one carrier. QA-A1: one fact — _who performed the
inference_ — missing from the model entirely. And now: the inference performed
correctly and then **stated wider than the evidence underneath it**, in five
separate ways, plus two owner-facing surfaces saying more than they knew.

## What the audit found, and what was done

| #   | The defect                                                                                                                  | Repaired as                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Four walks and four bike rides pooled under the `move` verb, cancelled to "no different", printed as a finding about a walk | DEF-0046 — scope on the semantic action, verb **and** object                     |
| 2   | Walks that helped every weekday and no weekend collapsed to 4-of-8, and that figure ranked a Tuesday                        | DEF-0047 — per-context bands; the collapsed figure is not printed                |
| 3   | An evening nobody was asked about, counted as an evening without the walk                                                   | DEF-0048 — present / absent / **unknown**, and abstention                        |
| 4   | Four recorded relationship events between a walk and the later reading confounded nothing, and the card said so out loud    | DEF-0049 — named confounding classes, and copy that claims only the check it ran |
| 5   | The app's own conclusion could rank a recommendation and could not be disagreed with                                        | DEF-0052 — an `association` belief key scoped to the action                      |
| 6   | Life's "Recently" printed a same-moment correction below the reading it replaced                                            | DEF-0050 — canonical order, `occurredAt` → `recordedAt` → id                     |
| 7   | "Fresh — up to date on what matters", above a belief the app had marked out of date                                         | DEF-0051 — freshness says which question it answers                              |

Two more were found by the repair itself and are in the ledger: the card
borrowing the **verb's** phrase when an object had no name (DEF-0046's sibling —
two findings would have printed as one sentence), and Life silently dropping
three of eleven areas because the group word and the group order lived in two
files (DEF-0053).

## What this is now governed by

- **D-091** states the seven invariants as rules rather than as repairs: action
  identity, negative exposure, context, confounding, correctability, tracked
  state meaning, historical order — plus the freshness-language rule. Plan
  section 51 carries them in the pattern-quality rules and in the gate.
- **D-090** moves independent QA permanently from Claude to **Codex**, and sets
  the order it works in: sealed cold owner-use first, then a claim-to-evidence
  audit, then semantics, then the phase gate, then targeted regression, with
  full-suite duplication only on a concrete trigger. Green builder tests are
  evidence; re-running them to watch them pass again is not QA.

## What was preserved

Everything QA-A1's repair established, verified rather than assumed: no causal
grading where state is observable; the owner still reports his own state; the
app learns the relationship; association is never causation in either direction;
historical `aspect: 'effect'` records still mean what they meant and still
count; an attribution and a system finding are still visibly different on
screen; missing observations still stay missing; weak evidence still abstains;
the four state dimensions stay separate; contradictory evidence still reverses a
finding; the finding still reaches the ranking and the evidence panel.

`emotionalState` is still **not** split into named dimensions — D-091 invariant
6 records why, and it remains an open question for the owner. The two decisions
round 2 handed to QA (keeping `inferred-evidence.test.ts`'s three-verb
assertions, and not inventing an emotional taxonomy) are unchanged and still
QA's to accept or reject.

---

**Round 2 status, superseded by the above: YELLOW — QA FAIL, REPAIRED, AWAITING RETEST.**

Independent QA passed round 1 against section 51's gate item by item, and then
**withdrew the PASS**. The owner read one sentence on Now — _"How much did a
walk do for you?"_, answered _A real difference / Some difference / Not much /
Backfired_ — and asked who was doing the causal analysis. QA investigated,
confirmed it, and recorded **QA-A1**: the app asks the owner to perform the
inference the system exists to make, and Phase 6 renders his answers as
percentages that read as measurements. Full report at
[`qa/PHASE_06_QA_HANDOFF.md`](qa/PHASE_06_QA_HANDOFF.md).

## QA-A1 — repaired

Every line of QA's diagnosis checks out in the code. `effectFor` has exactly
one source and cannot tell an observation from an opinion — by an explicit
design note, written to avoid a second outcome path. The observe-first path is
gated to three verbs and one concept and is itself an attribution.
`MoveProfile.measures` already declared that the walk speaks to `energy`, and
nothing read it for collection. On the history built to demonstrate section 51,
**all forty-six figures Insights printed were tallies of the owner's judgments
and none was worked out from a reading**.

**This is a specification gap before it is an implementation defect**, which is
why the governing documents moved first. Section 20 said the app learns from
"observed outcomes" without saying who judges them; section 51 required a
percentage to name the quantity it measures without requiring it to name who
inferred it. That is exactly why round 1 checked every gate item correctly and
passed a screen that was not honest.

- **D-089** records the principle: observe first, infer cautiously, ask for a
  concrete fact, ask for current subjective state when that state itself
  matters, and never ask the owner for the causal relationship the system exists
  to learn. Plan sections 20 and 51 now state it directly. D-054, D-064, D-066
  and D-069 are annotated as incomplete, revisited or generalized — none
  overturned.
- **`MoveProfile.affects`** names the observable dimension a move is expected to
  move, on five verbs where that is defensible and deliberately nowhere else. A
  learning topic is an entity; home friction is free text; nothing in the
  registry honestly says what unhurried time with a daughter moves.
- **The grading question is off every verb declaring it**, keyed on the profile
  in one place, and the app asks for the reading instead. One question still —
  what changed is which one, and who does the thinking.
- **`association.ts`** compares two readings close enough together to be about
  the same stretch of day, sorted by what happened between them: this move
  alone, nothing at all, or something else — the third discarded and counted as
  discarded. Nothing is stated unless each side clears four pairs on its own,
  and it never says cause in either direction.
- **`observed-change`** carries the finding into the ranking, abstaining at zero
  weight where there is nothing to say (D-048) — which is why no golden scenario
  moved.
- **`ConceptDefinition.tracked`** separates "worth a trend" from `standing`. The
  trajectory card gated on the latter, which is false for every dimension the
  owner reports about himself, so energy, mood and soreness were collected,
  spent on similarity matching, and never read as evidence.
- **Every attribution-derived figure says whose judgment it is.** "How often
  **you said** clearing the kitchen made a difference afterwards." Follow-through
  is the deliberate exception and is asserted as one.
- **History keeps its meaning.** Existing `aspect: 'effect'` records are still
  his, still counted by `effectFor`, not relabelled and not deleted. The new
  quantity is additive and `association.ts` writes no record at all.

Recorded as **DEF-0045** in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).

**Twelve behaviours QA required, twenty-two tests**, including the one whose
absence allowed this — the engine learning something real from a history with no
causal answer in it, on a new scenario containing not one `effect` outcome.
**Twelve defects reintroduced one at a time; twelve caught** — four only after
the first pass showed the guard did not bite.

**One thing deliberately not done.** QA is right that `emotionalState` is one
generic dimension and closer to the wellness score the owner rules out than to
separate dimensions. Which dimensions is his to say, and inventing a taxonomy is
the mistake this whole finding is about. It is now `tracked`, so it
participates; the split is an open question for the owner.

**Two of QA's named tests kept, with the reasoning written into the file.**
`inferred-evidence.test.ts`'s assertions that `deriveOutcomes` fires for exactly
three verbs do pin a limitation in place, as QA said. Extending that mechanism
would have produced more attributions wearing the app's name instead of the
owner's; the repair was to stop needing them.

**One thing CI found that no test could.** `prettier --check .` covered
`docs/qa/PHASE_06_QA_HANDOFF.md`, which QA writes and D-077 forbids the builder
to edit — a gate only the one person forbidden to satisfy it could satisfy. QA
handoffs join the canonical plan in `.prettierignore`, for the same reason it is
already there.

---

**Round 1 status, superseded by the above: YELLOW — READY FOR INDEPENDENT QA.**

Section 51's goal is one sentence: make memory and learning visible without
turning the normal experience into a statistics dashboard. Three surfaces
carry it — Timeline, Insights, and a compact **See evidence** on Now — and
the hard part was never the wiring. It is what is honest to show.

Per D-077 this checkpoint does not self-certify. Everything below is the
builder's own gate — unit, contract, synthetic, adversarial, browser, a
clean-checkout `npm run verify`, a privacy scan, CI, the deployed Preview
SHA matching this checkpoint, and the builder's own Android-style pass
against that deployed Preview. Independent QA has not run.

## The problem this phase actually had to solve

DEF-0020 was four different facts collapsing into one carrier, because
nothing stopped them. Section 51 exists because that defect has an obvious
second form:

> Any percentage must identify the quantity it measures. Do not merge direct
> result, downstream effect, comfort/friction, or follow-through into one
> generic success statistic.

So there is no success rate in this phase and no type that could hold one. A
`MeasuredRate` carries the aspect it measures, a sentence naming that
quantity in ordinary words, and its own numerator and denominator — and
exactly one component in the whole app can render one, taking the whole rate
(D-084). Printing a figure without the sentence beside it is not something a
caller is able to do, and a guard fails the build if a second place learns
how.

Below four comparable occasions the figure is withheld with the reason and
the count. That threshold is defensible rather than round: `PATIENCE` in
`learning.ts` is 3, the point where observation starts outweighing the
starting belief, so a figure the app is willing to _print_ should rest on
more than it takes to move a belief a quarter of the way. A test asserts the
relationship rather than the number.

## What the builder's own gate found — eleven defects, none from an assertion

**DEF-0034 to DEF-0044**, all found by reading the assembled screens or by
measuring them, none reported by a failing test. Eight came from reading a
local build before the first push; three more came from the Android-style
pass against the **deployed** Preview, on lines the local read had gone
past — a situational context tagged "Standing" while its own sentence said
"for now", the validator's own words handed to the owner on Timeline's
damaged-row report, and a fixed "Everything counted" heading over a list of
what is overdue. Three are worth naming here.

**DEF-0039** is the one that matters. Now said _"Reset a space has made
little difference in situations like tonight"_ directly above a panel
reporting _"How often clearing the kitchen made a difference afterwards —
67% — 8 of 12."_ Neither is wrong. The line on Now is the belief, weighted
by how much each evening resembles tonight, and tonight is a weekend; the
figure is the plain proportion across every comparable evening. They measure
different things and the screen said nothing about that. The fix suppresses
neither: the panel carries the same sentence Now uses, and the split line
now names which side tonight falls on — _"6 of 6 on a weekday, 2 of 6 at the
weekend. Tonight is at the weekend."_ — which is what the difference between
the two numbers actually was.

**DEF-0041 is the reason the reintroduction step is not a formality.** The
sweep written for DEF-0037 passed with DEF-0037 still in place: its regex
had been corrupted into a pair of literal backspace characters and could
never match anything. It read correctly, exercised the right strings, and
was decoration. A repository-wide sweep for stray control characters found
one other, in `src/domain/ids.ts`, which is a deliberate hash separator and
correct.

**Nineteen defects were reintroduced one at a time. All nineteen were
caught.**

**And one correction to DEF-0041's own account.** ESLint's `no-control-regex`
would have caught the corrupted sweep. It was simply never given the chance:
the corruption was written, found by the reintroduction pass and repaired
between two full gates. The rule proved it a few hours later by catching the
identical mistake the moment lint ran over it. The narrower lesson is the
useful one — the reintroduction step and the lint gate cover the same
failure, and lint is the cheaper half.

## Build identity

|                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product checkpoint   | `ce4087a` — the Round 5 repair every result below was measured against, and the one Codex should retest                                                                                                                                                                                                                                                                                                                                                                                  |
| Earlier checkpoints  | `28d2efc` — the Round 4 repair Codex Round 5 tested; `8680642` — Round 3; `481c3a7` — the seven-blocker repair                                                                                                                                                                                                                                                                                                                                                                           |
| Closing SHA          | current `main` HEAD — documentation only past `ce4087a`, no product code                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Deployed Preview SHA | the closing SHA. Every push redeploys, so this is a rule rather than a frozen number: `git diff ce4087a..HEAD --name-only` shows only `docs/`. Both of QA's Round 5 reproductions were driven by hand on `ce4087a`: a February fixture then Empty the laboratory, and a June fixture answered then Show mine. The clock came back to real time in both, his August record was on Timeline immediately and still there after two and a half seconds, and nothing of the fixture remained. |
| Do they match?       | Yes, by construction — D-004, and asserted live in CI                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Live proof           | `preview/build-info.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Verification

| Gate                                      | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy scan                              | Clean, 163 tracked files                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Format (Prettier)                         | Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Lint (ESLint)                             | Pass, 0 warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Typecheck (strict TS)                     | Pass, 0 errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Unit / contract / synthetic / adversarial | 780 passed / 780, 45 files (in plain Node, no DOM)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Browser tests (Playwright)                | 312 passed / 312 — 104 tests × 360, 430, 1280px                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Production build                          | Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `npm run verify` from a clean checkout    | Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Reintroduction pass                       | 19 for the phase, 12 for QA-A1, 17 for the audit's seven, 4 for Codex Round 3, 5 for Codex Round 4, **9 across Rounds 4 and 5**; all 61 caught                                                                                                                                                                                                                                                                                                                                  |
| Builder's own Android-style gate          | Pass — against the deployed checkpoint; no findings                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Independent QA                            | **Round 1 PASS withdrawn on QA-A1; round 2 repaired; seven blockers found by Codex cold-use audit, repaired here. Codex Round 3 confirmed those seven and returned FAIL on three siblings, repaired here. Codex Round 4 confirmed R3-B2/R3-B3 and the storage split, and failed on the return projection, repaired here. Codex Round 5 confirmed the store race repaired and failed on the temporal half of the return, repaired here. Awaiting Codex Round 6 retest (D-090).** |

### Where the 700 sit

Phase 5 ended at 610. The 90 new ones are four new suites plus growth in the
library-wide sweeps, and the second half is worth noting: several existing
suites grew without being edited, because they walk every scenario and the
library gained one.

| Suite                                                                                                 | Tests |
| ----------------------------------------------------------------------------------------------------- | ----: |
| `synthetic/insights.test.ts` — the rate rules, and the gate claims                                    |    29 |
| `synthetic/timeline.test.ts` — section 26, rule by rule                                               |    31 |
| `synthetic/decision-evidence.test.ts` — Now's panel reads the decision                                |    15 |
| `unit/insights-copy.test.ts` — the copy tables, swept                                                 |    10 |
| `synthetic/observed-relationships.test.ts` — QA-A1's twelve behaviours, then D-091's seven invariants |    43 |
| `unit/architecture-guards.test.ts` — five phase guards, four for D-089, three for `ACTION_FAMILIES`   |   +12 |
| `unit/registries.test.ts` — what a tracked dimension may not become                                   |    +4 |
| `unit/life-pages.test.ts` — what a status word may not claim                                          |    +3 |
| `synthetic/domain-page-data.test.ts` — canonical order, honest freshness                              |    +2 |
| existing sweeps, over the two new histories                                                           |   +11 |

Browser: `tests/browser/timeline-insights.spec.ts`, 25 tests × 3 viewports =
75 new, on top of the 216 already in `shell.spec.ts`, `now.spec.ts`,
`qa-lab.spec.ts` and `life-domain.spec.ts` — all unchanged, all still green.

## Gate checklist (section 51, and the phase brief)

| Requirement                                                                | Status                                                                                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| The fourteen existing golden scenarios still pass, unchanged               | Pass — none of their files changed this phase                                                                                       |
| Timeline renders real canonical history for the kinds that matter          | Pass — all twenty record kinds have a line and a word; swept across every history in the library                                    |
| Malformed rows isolated rather than breaking the surface                   | Pass — reported apart from the record, undated, and every rendered entry traces to a record the store accepted                      |
| At least one Insight card from real synthetic learning history             | Pass — six cards on "Nine months of evenings", one on "A month of what actually worked"                                             |
| …and it demonstrably changes when a counterexample is added                | Pass — `insights.test.ts` "one counterexample, and what it changes": the kind, the headline, the figure and the confidence all move |
| "See evidence" opens real evidence for the actual current recommendation   | Pass — every field read off the decision's own explanation, evaluation and trace; asserted across the whole library                 |
| No percentage without a defensible sample and a named measured aspect      | Pass — structurally (one renderer, taking the whole rate) and by sweep over every figure the library can produce                    |
| At least one synthetic scenario proves the "not enough evidence yet" state | Pass — two: the withheld figure on a lab with two results, and "Still gathering" on a move with two occasions                       |
| Private-domain discretion holds on Timeline                                | Pass — the row stays, the detail is withheld, and there is no control anywhere that could reveal it                                 |
| CI green: privacy scan, format, lint, typecheck, unit, browser, build      | Pass                                                                                                                                |
| `npm run verify` passes from a clean checkout                              | Pass                                                                                                                                |
| Preview deploys automatically, deployed SHA equals checkpoint SHA          | Pass                                                                                                                                |
| Builder's own Android-style mobile pass against the deployed Preview       | Pass — 360×780, touch, Android UA, device pixel ratio 3, run twice: three findings, all repaired, clean on the re-run               |
| Independent QA (required from Phase 5 on, D-077)                           | **Outstanding — this phase is YELLOW until it passes**                                                                              |

## What changed

### `src/intelligence/insights.ts` — the rules that decide when a number is honest

Reads what has been learned and turns it into cards. It builds no learning
index: the beliefs come off `situation.learning`, the object the decision on
Now was made from, and the raw counts are taken over the episode set that
index itself selects. Two definitions of "a situation like this one" would
eventually disagree, and the owner would have no way to tell which screen
was lying — D-071's argument for coverage, applied to a second reader
(D-085).

Ten kinds of card, covering section 27's list. Two orderings turned out to
be load-bearing and are asserted rather than commented. A card leads with
the aspect that _means_ most, not the one with the most evidence: with
follow-through first, one card read "has worked every time it has come up"
over a figure that said only that it could be done. And a context split
leads over the counterexample it explains (D-086).

`evidenceForDecision` is the same discipline pointed at Now: every field
comes from the decision the surface already has, so there is nothing on that
panel to disagree with.

### `src/features/timeline/` — the record, with nothing to press

Days, newest first, in the canonical order reversed. Timeline is the only
primary destination with no action on it at all, which is how section 26's
"never create a phantom actionable item from corrupt data" is held: there is
nothing for a corrupt row to produce (D-087). Unreadable rows are reported
apart from the record, undated and unsorted, because they have no date and
no meaning. No filter — section 51's own "if actually needed, not by
default".

### `src/features/history/describe.ts` — one line per record, written once

Shared by Timeline and a domain page's "Recently" panel, which differ only
in which record kinds they ask for and what discretion they owe (D-088).
Every line reads correctly with no tag beside it, because a domain page
shows none.

### `src/features/evidence/` — the only place a figure is rendered

One component, taking the whole `MeasuredRate`. Used by both Insights and
Now, so the two surfaces cannot drift apart on how a number is worded.

### `src/synthetic/scenarios.ts` — "Nine months of evenings"

The history section 51's gate needs and the library did not have: twelve
evenings clearing the kitchen that split cleanly on the kind of evening, ten
walks that reverse across the year, six labs that mostly never happened, and
a result and a comfort that disagree about the same five episodes.

**Product behaviour changed:** yes — two shells became real surfaces, and
Now gained one closed link.
**Semantic behaviour changed:** no. Nothing here decides anything, no
ranking moved, and no golden scenario's outcome changed.

## Phone check (what to look at)

Open Preview — the build should read `e681a66`. Header → **More** → **Open
the QA laboratory**, load "Nine months of evenings".

1. **Insights, closed.** Six cards, six sentences, no figure anywhere on the
   screen. Judge whether each one is something you would want to be told.
2. **One card, opened.** Tap "See the evidence" under _Clearing the kitchen
   goes better on a weekday than at the weekend._ Every figure should say
   what it measures and how many it is over.
3. **Now, and the thing under it.** Tap **See evidence**. Read the whole
   panel against the sentence directly above it — the app's conclusion, the
   plain counts, and the line saying which side of the split tonight is on.
   That relationship is DEF-0039 and it is the thing most worth a second
   opinion.
4. **Timeline.** Scroll a full page. Does it read as a record of a life or
   as a log?
5. **"A file with damage in it"**, then Timeline. The readable history, and
   the broken rows reported separately with nothing to press.
6. **"Two ordinary weeks"**, then Timeline. One row reads _Private entry_.
   The thing it is about should be nowhere on the screen.
7. **"One answer, and a lot of silence"**, then Insights. It should say it
   has nothing worth saying, and mean it.

## Deliberately not built

- **Filters on Timeline.** Section 51 asks for them "if actually needed, not
  by default", and on every history in the library the day headings and a
  growing page do the work one would (D-087).
- **A reveal control for private detail on Timeline.** `privacy.ts` supports
  it and no surface offers it. Section 11 keeps explicit private detail off
  primary surfaces; the domain page is where the owner goes for it.
- **A peak-state likelihood.** Section 51 lists it as something the deeper
  view "may eventually include". Nothing in the current model defines that
  quantity well enough to put a number on, and inventing one to fill the
  slot is what the rest of this phase is arranged against.
- **Correcting an insight in any way other than rejecting the belief.** The
  existing `belief-correction` watershed is offered on every card that
  concludes something. A card cannot yet be edited, scoped or annotated.
- **Rebuilding a domain page's "Recently" panel** to match Timeline. The
  owner deferred it; what is shared is the wording of a line, not the panel
  (D-088).
- Exports, backup and restore (Phase 7), the legacy importer (Phase 8), the
  service worker (Phase 10).

## Open defects

None. **Twelve** were found and closed. DEF-0045 is QA-A1, and it is the only
one found by anybody other than the builder: the owner raised it after
independent QA had already passed the phase, and QA confirmed it and withdrew
the PASS.

The other eleven — DEF-0034 to DEF-0044 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md) — and not one came from a failing
assertion. Nine came from reading the assembled screens, one from measuring
them, and one from the reintroduction pass discovering that a guard could
not fail.

**One observation, offered rather than hidden.** During the repair gate,
`now.spec.ts`'s "creates one episode from a double tap" — a Phase 3 test,
untouched this phase — failed once in a full desktop run, then passed on a
full re-run and on three consecutive runs of that file on its own. Nothing
in this phase touches Now's lifecycle buttons. It is recorded because a
single unexplained failure is worth a reader knowing about even when it
does not reproduce.

## Deferred, with reasons

Unchanged and reconfirmed. Nothing in this phase touched the guide, the
lifecycle or the ranking.

From Phase 4:

- **P4-6 — the no-action eyebrow** renders a whole sentence in an uppercase
  micro-label slot.
- **P4-7 — the More button is 81×36** (re-measured this phase at 80.6×36),
  below the 44px minimum. It remains the only sub-44px control on any
  surface: a geometry pass over Timeline, Insights and Now's evidence panel
  at 375×812 found no others.
- **A started move that is never settled** stays "Under way" indefinitely.

From Phase 5:

- **An inline Life-area link** is below a 44px touch target, deliberately.
- **Creating a brand-new goal from a domain page** is not supported.
- **No domain page offers a dated situational-exception control.**
- **"Recent changes" on a domain page is domain-scoped, not chronological.**

And the older ones, also unchanged: the older ranking dimensions still cost
weight when they know nothing; `hold` is still never generated; free-text
constraints are still shown rather than enforced; Emotional Health still has
no standing concept.

## Decisions made

D-084 to D-088 in [`DECISION_LOG.md`](DECISION_LOG.md), and **D-089** for the
QA-A1 repair — the observe-first principle, which also amends canonical plan
sections 20 and 51 as owner-approved amendments under section 1.

## Next

Phase 6 is closed. See [`NEXT_PROMPT.md`](NEXT_PROMPT.md) for the Phase 7
handoff, and the closeout block at the top of this entry for the full record —
this "Independent QA, new conversation" pointer belongs to Round 1a and is kept
as history rather than edited to look as if it always said what happened later.

---

# Phase 5 — the Life domain experience

**Status: GREEN — independent QA passed.**

Section 50's goal is one sentence: give the owner optional deep inspection
without fragmenting the brain. Ten pages, reachable from Life and nowhere
else in the primary navigation, each answering the five things section 50
asks a domain page to answer — what the app believes, why, what changed,
whether it is fresh, and how to correct it — without becoming the static
questionnaire dump section 59 excludes by name.

Per D-077, this checkpoint does not self-certify. Everything below is the
builder's own gate — unit, contract, synthetic, browser, a clean-checkout
`npm run verify`, a privacy scan, CI, the deployed Preview SHA matching this
checkpoint, and the builder's own Android-style pass against that deployed
Preview — not the owner's phone approval and not independent QA. Both remain
required before GREEN.

**The builder's own gate found three defects, all on the deployed Preview,
none from a failing assertion** — DEF-0028 to DEF-0030 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md). All three are the same shape Phase
4's phone gate kept finding: individually reasonable code that reads wrong
once a whole screen is read as a person would rather than asserted on in
parts. A "recently" line naming its subject as "a suggestion here" four times
running on a history about one place; a bare "60 min" on the Direction page
with nothing saying it measured usable time tonight, reachable because a
record's own domain tag can legitimately differ from its concept's registered
one; and a correction control offered on an area Life's own grouping already
treats as calm. A fourth suspected finding — an inline Life-area link too
short for a 44px touch target — was investigated and reverted rather than
fixed: padding the hit area with the usual negative-margin trick made
adjacent wrapped names overlap, which is worse than the small target it
tried to fix, and the small target itself is WCAG 2.5.5's own exception for
a link inside a sentence. Documented in `LifeScreen.css` rather than silently
dropped.

## Independent QA — round 1: FAIL, repaired

Independent QA (D-077) tested checkpoint `34e03b6` fresh, in a new
conversation, against the deployed Preview — full report in
[`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md). **Overall: FAIL.**
Two blocking defects, one major, all three the same shape as Phase 4's phone
gate: individually reasonable code that reads wrong once a whole screen is
read as a person would.

- **QA-B1** — `#/more` still said Phase 4 and called the ten shipped domain
  pages "next," on the exact checkpoint that shipped them.
- **QA-B2** — coverage interpretation and domain status wrote a real record
  and then visibly did nothing: on any of seven pages whose staleness comes
  from a neglected standing concept, "How this stands" never moved and both
  buttons stayed offered under the unchanged sentence.
- **QA-M1** — a domain page could say "nothing here has gone out of date"
  two lines above a concept row tagged "out of date."

All three are fixed — DEF-0031 to DEF-0033 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md) — each with a regression proved to
fail when the defect is reintroduced before being restored. QA-B2 in
particular was a real semantic question, not a UI patch: `coverage.ts`'s
staleness computation was already honest (it correctly refuses to invent a
concept's current value from a record that says nothing about it), so the
fix is `CoveragePanel` pointing at the actual overdue concept instead of
offering two buttons that could never move it. Repaired checkpoint:
`8d06dae`. Phase 5 **remains YELLOW**, per D-077 — repair returns to the
same independent QA conversation for retest, not to GREEN here.

Round 1's own FAIL report gave a recommended next action but no ready-to-paste
prompt — the owner had to return and ask for one before the repair above could
start. That gap predates D-082, recorded the same day: from here on, every QA
run or retest carries its own complete next prompt automatically, on both PASS
and FAIL ([`qa/README.md`](qa/README.md) section 3a).

## Independent QA — round 2 (retest): PASS

The same QA conversation retested repaired checkpoint `8d06dae` (deployed at
`72c6d9f`, documentation-only past the repair) against each finding's exact
original repro steps rather than against the builder's account of the fix —
full retest record in [`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md),
"Round 2 — retest". All three findings verified fixed:

- **QA-B1** — `#/more` reads Phase 5, correct "Next," and a summary sentence
  QA confirmed accurate against what both rounds actually exercised. The QA
  lab's own eyebrow reads "PHASE 5."
- **QA-B2** — verified in substance, not merely in wording: on Career (a
  standing-concept domain), the pointer sentence replaces the two generic
  buttons, and correcting the named concept still closes the loop
  immediately. On a constructed Social case (no standing concept), the
  original two buttons are still present and still work exactly as before —
  confirming the fix did not regress the case it was never broken for. QA
  also read the `coverage.ts` diff directly and confirmed the repair
  changed nothing about the staleness computation itself, only which
  control `DomainPage.tsx` offers.
- **QA-M1** — the domain-level sentence no longer claims "nothing has gone
  out of date"; the concept-level tag is unchanged and still visible
  immediately below it. The contradiction is gone without the freshness
  signal being hidden.

One scope correction QA made to its own round-1 report: QA-B2 affects
**seven** of the ten pages, not eight — Fatherhood's only standing concept
(`custodyArrangement`) is durable and, per D-061, can never be neglected, so
it was never actually reachable by this defect. `DEF-0032` already recorded
seven; round 1's narrative text said eight. Corrected for the record; the
verdict is unaffected.

Nothing in round 1's PASS list regressed (spot-checked, not redone at full
depth, per the retest prompt). No new findings. Every deferred item —
P4-6, P4-7 (re-measured at 80.575×36), the never-settled started move, and
the inline Life-area link (re-measured at 115.9×20.8) — reconfirmed
unchanged, and none newly introduced by this phase.

**Recommendation: PASS.** Per [`qa/README.md`](qa/README.md) §6, this
closeout follows in the same response.

## Formal GREEN closeout

- **Final status:** GREEN.
- **Approved checkpoint SHA:** `8d06dae` — the repaired product checkpoint
  independent QA retested and passed.
- **Closing SHA:** current `main` HEAD — documentation only past `8d06dae`
  (this closeout included); no product code changes.
- **Deployed Preview SHA:** identical to `main` HEAD, asserted live in CI and
  confirmed by hand against `preview/build-info.json`.
- **Verification:** 610/610 unit·contract·synthetic·adversarial, 216/216
  browser (3 viewports), clean privacy scan, clean `npm run verify` from a
  checkout, green CI — all unchanged since the repaired checkpoint, since
  nothing after it touched `src/` or `tests/`.
- **QA report path:** [`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md).
  **SHA QA tested:** `72c6d9f` (at/after `8d06dae`). **Result:** PASS.
- **Deferred and open items:** P4-6, P4-7, the never-settled started move,
  and the sub-44px inline Life-area link all remain, all reconfirmed
  unchanged by both QA rounds. No new deferrals from this phase. Zero open
  defects — DEF-0028 through DEF-0033 are all Fixed in
  [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).
- **Decisions made:** D-081, D-082.

## Build identity

|                      |                                                                          |
| -------------------- | ------------------------------------------------------------------------ |
| Approved checkpoint  | `8d06dae` — the repaired build QA's retest passed                        |
| Round 1 tested SHA   | `34e03b6` — FAIL (QA-B1, QA-B2, QA-M1)                                   |
| Round 2 (retest) SHA | `72c6d9f` — PASS, at/after `8d06dae`                                     |
| Checkpoint SHA       | current `main` HEAD — documentation only past `8d06dae`, no product code |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`                      |
| Do they match?       | Yes, by construction — D-004, and asserted live in CI                    |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/              |
| Live proof           | `preview/build-info.json`                                                |

`8d06dae` is pinned above because it is the exact repaired SHA every
verification result below was measured against, including the Android-style
pass and both QA rounds; nothing observable has changed since.

## Verification

| Gate                                      | Result                                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy scan                              | Clean, 147 tracked files                                                                                                                                                   |
| Format (Prettier)                         | Pass                                                                                                                                                                       |
| Lint (ESLint)                             | Pass, 0 warnings                                                                                                                                                           |
| Typecheck (strict TS)                     | Pass, 0 errors                                                                                                                                                             |
| Unit / contract / synthetic / adversarial | 610 passed / 610, 38 files (in plain Node, no DOM)                                                                                                                         |
| Browser tests (Playwright)                | 216 passed / 216 — 72 tests × 360, 430, 1280px                                                                                                                             |
| Production build                          | Pass                                                                                                                                                                       |
| `npm run verify` from a clean checkout    | Pass                                                                                                                                                                       |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand                                                                                                                                 |
| Builder's own Android-style gate          | Pass — three findings pre-QA (DEF-0028–0030) and three from independent QA (DEF-0031–0033), all fixed and redeployed before this checkpoint; re-confirmed live post-repair |

### Where the 610 sit

Phase 4 ended at 574. The 36 new ones:

| Suite                                                                                                      | Tests |
| ---------------------------------------------------------------------------------------------------------- | ----: |
| `synthetic/domain-corrections.test.ts` — section 62's other six kinds, plus QA-B2's standing-concept sweep |    15 |
| `synthetic/domain-page-data.test.ts` — a domain page against real histories, plus QA-M1                    |     6 |
| `unit/life-pages.test.ts` — D-078, asserted rather than inspected                                          |     8 |
| `unit/routing.test.ts` — `lifePageSlugFromHash` additions                                                  |     6 |
| `unit/architecture-guards.test.ts` — QA-B1's phase-identity assertion                                      |     1 |

Browser: `tests/browser/life-domain.spec.ts`, 12 tests × 3 viewports = 36 new
(11 pre-QA + QA-B2's pointer-message test), on top of the 180 already in
`shell.spec.ts`, `now.spec.ts` and `qa-lab.spec.ts`, all unchanged and all
still green.

## Gate checklist (section 50, and the phase brief)

| Requirement                                                           | Status                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The fourteen existing golden scenarios still pass, unchanged          | Pass — none of their files changed this phase                                                                                                                                                             |
| Every registry domain reachable from exactly one page                 | Pass — `unit/life-pages.test.ts`, D-078 asserted directly                                                                                                                                                 |
| A correction on a domain page demonstrably changes later reasoning    | Pass — proved for all six new kinds in `synthetic/domain-corrections.test.ts`, and live: correcting a stale learning topic on Career turns the area current and removes the coverage-driven move from Now |
| The private domain is manual-entry-first and discreet elsewhere       | Pass — `life-domain.spec.ts`: the reading appears only on its own page, never on Life, Now or Timeline; "Not known yet" reads as an invitation ("Add this"), not a gap                                    |
| No domain page looks like a static questionnaire dump                 | Pass — every correction control closed until tapped, asserted structurally (`input.domain-input` has zero matches before a tap)                                                                           |
| CI green: privacy scan, format, lint, typecheck, unit, browser, build | Pass                                                                                                                                                                                                      |
| `npm run verify` passes from a clean checkout                         | Pass                                                                                                                                                                                                      |
| Preview deploys automatically, deployed SHA equals checkpoint SHA     | Pass                                                                                                                                                                                                      |
| Builder's own Android-style mobile pass against the deployed Preview  | Pass — 360×780, touch, mobile UA; six findings across two rounds, all fixed (DEF-0028–0033) — see "Independent QA — round 1" above                                                                        |
| Independent QA (required from Phase 5 on, D-077)                      | **PASS** — round 2 retest, checkpoint `8d06dae` deployed at `72c6d9f`; report at `qa/PHASE_05_QA_HANDOFF.md`                                                                                              |

## What changed

### `src/intelligence/corrections.ts` — the other six of section 62

Phase 4 could honestly offer two of section 62's eight correctable kinds — a
learned effect and a learned preference, both through `beliefCorrectionRecord`
— because Now was the only surface that could see a decision to disagree
with. This phase adds the other six, and every one of them writes a record
kind that already existed: `factCorrectionRecord` and
`contextCorrectionRecord` for facts, context and direction (the weekly focus
is simply a fact about `CONCEPT.weeklyFocus`); `goalCorrectionRecord`,
superseding rather than appending, because there is no "latest wins" for a
goal; `coverageInterpretationRecord` and `domainStatusCorrectionRecord`,
writing the same `coverage-update` and `domain-update` kinds `growth.ts`
already writes for a growth answer. No new record kinds, no changes to
`facts.ts`, `direction.ts` or `coverage.ts` — a domain-page correction changes
what the app reports next through the read paths that already governed these
records (D-081 records the one real judgment call: a durable concept has to
go through `contextCorrectionRecord`, never `factCorrectionRecord`, or it
would outrank every context record for that concept forever regardless of
date).

### `src/features/life/domainPages.ts` — the ten-page registry, and what a page reads

`LIFE_PAGES` is D-078 in code. `assembleDomainPageData` reads a domain page's
four sections from the same `Situation` Now and Life already read — nothing
decides anything and nothing is a second computation: coverage from
`situation.coverage`, goals from `situation.direction.goals`, concept
readings from `situation.view.facts`, recent changes from the records
`coverage.ts` already treats as meaningful evidence about the area, each
described in one line with its subject resolved where one exists (DEF-0028,
DEF-0029).

### `src/features/life/DomainPage.tsx` and `LifeScreen.tsx` — the pages, and the links to them

A domain page offers exactly one thing beyond what Life already shows: a
correction, closed until tapped, for each of the four things section 50 asks
it to answer. A concept reading reuses its `QuestionSpec`'s options where one
exists — the same control the guide already offers — and a plain text field
otherwise. Coverage gets "I've been keeping on top of this" and a free-text
"Something's changed", offered only when the area is actually stale
(DEF-0030). Goals get Done / No longer this. Every Life area name now links
to its page.

### `src/platform/routing.ts` — a domain page is a second hash segment under Life

`#/life/health-recovery`, not a fifth destination — section 5's four stay
fixed. `lifePageSlugFromHash` stays syntactic, so `src/platform` does not
have to depend on the page list in `src/features`.

**Product behaviour changed:** yes — ten new pages, reachable from Life, each
with a working correction path.
**Semantic behaviour changed:** no new decision logic — every correction
changes what the existing fact layer, direction and coverage engine already
read, through paths that predate this phase.

## Phone check (what to look at)

Open Preview. Header → **More** → **Open the QA laboratory**, load
"Everything current except the studying", then **Life** → **Career &
Learning**.

1. **The stale reading, corrected.** "Current learning topic" reads
   _subnetting_, flagged out of date, with a "Not right?" link. Tap it, type a
   new topic, **Save**. "How this stands" should read _"Career & Learning is
   current"_ rather than the seven-week-silence sentence, and "Recently"
   should show the new topic at the top, dated today.
2. **The same correction, on Now.** Back out to Now: the coverage-driven
   refresh move should be gone, because the app is no longer reading the area
   as quiet.
3. **A closed set of answers.** Load "A settled arrangement, and one week
   away", open **Fatherhood / Adaya**, tap "Not right?" under "Child with the
   owner". It should offer _Yes_ / _Not tonight_ — the same options the guide
   would — not a text field.
4. **The private page.** Open **Private / Sexual Health** on a history where
   nothing has been entered: "Not known yet" with an **Add this** button, not
   a gap. Enter something, then check Now, Life and Timeline — it should
   appear nowhere but here.
5. **A goal, settled.** On Career, tap **Done** under "Pass the CCNA" — it
   should leave the goals list.
6. **The wall, still absent.** Life itself should read exactly as it did at
   Phase 4's close — grouped, dull where it should be dull — with every area
   name now a link.

What to judge is section 50's own list, read as a person: does each page say
what the app believes, why, what changed, whether it is fresh, and how to
fix it — and does the "Recently" list read as a sentence you would recognise
having lived, not a log grep.

## Deliberately not built

- **Creating a new goal.** Section 50's build list says "goals"; what this
  phase offers is correcting the standing of an existing one (`Done` /
  `No longer this`), not authoring one. A new goal needs an entity-creation
  flow this phase did not need to build for the correction gate to hold.
- **A dedicated "state a situational exception" control**, beyond what the
  guide's own `childPresent` question already offers through the same
  correction path. `contextCorrectionRecord` supports a situational, dated
  exception on any concept; no domain page offers a control to set one with
  its own end date. `tests/synthetic/domain-corrections.test.ts` proves the
  mechanism works; nothing in the UI reaches it yet for concepts other than
  the ones with a `QuestionSpec`.
- **The full chronological Timeline.** "Recent changes" is domain-scoped and
  reads the same records `coverage.ts` already treats as meaningful evidence
  — Phase 6 builds the whole-life surface.
- **Progressively disclosed evidence/analytics** — D-079, explicitly Phase 6.
- Exports, backup and restore (Phase 7), the legacy importer (Phase 8), the
  service worker (Phase 10).

## Open defects

None. Six were found and closed across two rounds: DEF-0028 to DEF-0030 by
the builder's own Android-style gate before the first QA handoff, and
DEF-0031 to DEF-0033 by independent QA's round 1 (FAIL) against checkpoint
`34e03b6` — all six in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md), none from a
failing assertion.

## Deferred, with reasons

Unchanged from Phase 4, confirmed still true — none of this phase's work
touched Now, the guide, or the lifecycle:

- **P4-6 — the no-action eyebrow.**
- **P4-7 — the More button is 81×36.**
- **A started move that is never settled.**

And the older ones, also unchanged:

- **The older ranking dimensions still cost weight when they know nothing**
  outside `follow-through`, `direct-result` and the coverage branch of
  `bottleneck-fit`.
- **`hold` is still never generated.**
- **Free-text constraints are still shown, not enforced.**
- **Emotional Health has no standing concept** in the registry, so it can
  only go stale through the domain-level backstop — unchanged, and now also
  the reason its domain page's "current understanding" panel is thin: there
  is exactly one concept (`emotionalState`) to show.

## Decisions made

D-081 and D-082 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 6 — Timeline + Insights (canonical plan section 51). Built; the entry
above carries its acceptance report.

---

# Phase 4 — Coverage Engine + adaptive guides

**Status: GREEN — owner-approved on `1d52de4`.**

Section 49's gate ends, like every gate since Phase 2, with a person judging the
product rather than a suite judging itself. **The owner approved it on
`1d52de4`**, accepting the Galaxy S24 gate run against the deployed Preview as
his phone acceptance (D-076).

**The first gate failed, and that pass is the phase.** Everything automatable
was green, the checkpoint was pushed, and an Android context at 360×780 found
five defects in an afternoon. Three were blocking. Not one came from a failing
assertion.

The sharpest was DEF-0023, and it is the kind of thing only a person reading a
whole screen finds: the coverage generator proposed a move _because_ an area had
gone quiet, and `uncertainty` marked that same move down _because_ the area had
gone quiet. Both halves were individually correct, every test passed, and the
penalty came to twice the margin that decided the evening. What reached the
phone was circular — _nothing has come in about your studying, so here is a
walk, because it is better supported by what is known._ Section 8's third
refresh route was reliably cancelling itself, and the phase's headline feature
was quietly undoing its own work.

Section 49's goal is one sentence: make the system trustworthy without manual
tab maintenance. The failure it exists to prevent is section 63's, and section
63 states it as a rule rather than a feature — a domain may be quiet, stable or
low priority, and must not silently remain based on months-old assumptions while
the interface implies the app is current.

Two things had to become true. The app has to **notice**, which meant building
the coverage engine and making the `stale-evidence` trigger reachable after two
phases of being written down as barely reachable. And it has to notice **without
turning the guide into a questionnaire**, which is the risk the brief names
directly: DEF-0008 is the worked example, and section 47 fails a phase outright
on "too many questions".

The number of questions the guide asks did not go up. On the library it is still
at most two on any history, and on the evening built around a seven-week silence
it is zero.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Approved checkpoint  | `1d52de4` — the build the owner accepted                    |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`         |
| Do they match?       | Yes, by construction — D-004, and asserted live in CI       |
| Since the approval   | documentation only; no product code changed after `1d52de4` |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

## Verification

| Gate                                      | Result                                         |
| ----------------------------------------- | ---------------------------------------------- |
| Privacy scan                              | Clean                                          |
| Format (Prettier)                         | Pass                                           |
| Lint (ESLint)                             | Pass, 0 warnings                               |
| Typecheck (strict TS)                     | Pass, 0 errors                                 |
| Unit / contract / synthetic / adversarial | 574 passed / 574 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 180 passed / 180 — 60 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI                            |

### Where the 574 sit

Phase 3 ended at 448. The 108 new ones are the coverage engine, the two golden
scenarios, and the owner's four conditions on inferred evidence.

| Suite                                                            | Tests |
| ---------------------------------------------------------------- | ----: |
| `synthetic/outcome-learning` — section 20, rule by rule          |    44 |
| `synthetic/inferred-evidence` — the four owner conditions        |    41 |
| `synthetic/adaptive-guide` — one question at a time              |    36 |
| `unit/intelligence-kernel` — readers, direction, moves, order    |    30 |
| `synthetic/g007-coverage-freshness` — a quiet domain, noticed    |    29 |
| `synthetic/lifecycle` — episodes, double taps, outcome windows   |    26 |
| `synthetic/g003-growth-evidence` — three occasions, not one      |    23 |
| `unit/time` — instants, civil dates, weeks, DST, day blocks      |    20 |
| `synthetic/no-hidden-genericity` — sections 61 and 64            |    19 |
| `unit/registries` — ids, domains, concepts, privacy              |    19 |
| `unit/architecture-guards` — the boundaries and the copy sweep   |    18 |
| `unit/knowledge` — the four states, freshness, asking            |    18 |
| `synthetic/model-guardrails` — section 18's fence                |    17 |
| `synthetic/outcome-questions` — DEF-0020, every verb × aspect    |    17 |
| `synthetic/g008` — a non-career weekly direction                 |    15 |
| `unit/store` — append semantics, supersession                    |    14 |
| `synthetic/guide-resume` — interruption, and asking nothing      |    13 |
| `synthetic/g005` — sleep beats ambition, both ways               |    12 |
| `synthetic/g009` — unknown is unknown                            |    12 |
| `contract/projections` — rebuildability, migrations              |    11 |
| `unit/buildInfo`                                                 |    11 |
| `unit/routing`                                                   |    11 |
| `synthetic/g004` — a social opportunity                          |    10 |
| `synthetic/recovery-has-somewhere-to-go` — DEF-0016 and DEF-0017 |    10 |
| `unit/recommendation` — rendering and refusal                    |    10 |
| `adversarial/malformed-history`                                  |     9 |
| `synthetic/g011` — timezone and week boundary                    |     9 |
| `contract/round-trip` — 20 record kinds, lossless                |     8 |
| `synthetic/g001` — no orphan pronoun                             |     8 |
| `synthetic/g014` — no action is a real answer                    |     8 |
| `synthetic/intelligence-tournament` — section 18's choice        |     8 |
| `adversarial/malformed-records`                                  |     7 |
| `synthetic/g002` — durable family context                        |     7 |
| `contract/legacy-quarantine` — preserved and inert               |     6 |

## Gate checklist (section 49, and the phase brief)

| Requirement                                                              | Status                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| G-003 passes as an automated synthetic scenario                          | Pass — 23 tests, including one and two occasions producing nothing             |
| G-007 passes as an automated synthetic scenario                          | Pass — 27 tests, including the whole library swept for hidden staleness        |
| The eight existing golden scenarios still pass, unchanged                | Pass — G-001, G-002, G-004, G-005, G-008, G-009, G-011, G-014, files untouched |
| The owner can ignore Life for a realistic period without a silent freeze | Pass — the same history read at 14, 30, 60 and 90 days                         |
| Stale important areas eventually surface naturally                       | Pass — as a candidate, as the alternative, and as the limiter line             |
| No fixed "ask every domain" questionnaire                                | Pass — asserted structurally and behaviourally                                 |
| The guide can still ask nothing                                          | Pass — on two scenarios, one of them the quiet-domain one                      |
| Reliability is read per concept rather than per source                   | Pass — two concepts, the same two sources, opposite winners                    |
| Inferred evidence cannot be read as explicit                             | Pass — `inferred` at a reliability of one                                      |
| The completion gate holds — inference never opens a loop                 | Pass — started, shown, declined and unable-now all produce nothing             |
| The outcome architecture stays source-agnostic                           | Pass — a history whose only evidence is derived still learns                   |
| Learning traces expose evidence provenance                               | Pass — per reference, and summarised on the QA screen                          |
| G-005, G-008 and G-014 re-checked after the new limiter                  | Pass — and G-008 caught the first version of it                                |
| D-048's rule holds for the new dimension work                            | Pass — the coverage limiter scores zero at the same weight as no limiter       |
| CI green                                                                 | Pass                                                                           |
| `npm run verify` from a clean checkout                                   | Pass                                                                           |
| Preview deploys automatically, SHA matches                               | Pass                                                                           |
| A repaired Android gate re-run against the deployed Preview              | Pass — six confirmation points, all six met                                    |
| **The owner tests it on a phone and accepts it**                         | **Pass — approved on `1d52de4`**                                               |

## What changed

### `src/intelligence/coverage.ts` — noticing

Per domain and per sub-area: the last meaningful evidence, how it was known, how
far past its own mark it is, whether the current beliefs are still supported,
and which of section 8's five routes would bring it back.

Three things it adds over per-concept freshness, which is the question the brief
asks directly. **How far past**, derived from the concept's own horizon rather
than a number in the file — twenty-one days for home friction, ninety for a cash
buffer. **The area rather than the reading**, because clearing the kitchen is
evidence about the house and no concept records it. And **whether anything is
being done about it**, which is the difference between a signal and a chore.

Two rules keep it honest. It never contradicts the fact layer: a concept that
resolves to a usable value is covered whatever the age of the record behind it.
And importance is read off the owner's own commitments rather than a ranking
written here — an area he has never mentioned reads "nothing here yet" and is
left alone.

### `src/intelligence/derived.ts` — the morning reading

The clearest case section 8 defers to this phase. The morning after an early
night, the sleep reading the guide already collects _is_ the answer to "how much
did that do for your sleep?", so it becomes the outcome instead of being asked
for a second time.

The owner set four conditions before any of it shipped and each has a
regression that was proved to fail when the rule was removed. It closes a loop
and never opens one. It never reads as something he said. It is worth what a
derived reading of _sleep hours_ is worth, which is 0.8 against his own 1.0 —
the reading is excellent and the attribution is the assumption. And it writes
the ordinary outcome record, so learning reads it through the path that never
asks where a record came from.

It also may never conclude harm. Four hours after a wind-down is a short night,
not evidence that winding down backfired.

### `src/domain/concepts.ts` — D-059 in code

`reliability` sits beside `freshness` and answers the same shape of question
about a different property. A watch outranks the owner on hours slept and is
outranked by him on how the night felt — same device, same domain. A financial
record outranks his estimate of a balance. A model's guess at how he feels sits
below him saying so, everywhere.

`standing` sits beside them and says whether a gap in this concept is a gap in
understanding. Eight concepts set it; "how much time have you got tonight" does
not, and that is what stops every domain reading permanently red.

### `src/intelligence/growth.ts` — section 9's last step

Three completed occasions at one skill, each answered "all the way", produce a
question beside the decision rather than a change to the model. Both answers are
records and both are read: agreeing writes what changed, "not yet" writes that
the person who would know has looked.

### The guide

Coverage reaches question selection as a tiebreak below the two measurements
that already decide whether to ask, and above catalogue order, which carried no
information at all. It can never make a question askable.

And DEF-0021's repair: when a due result could be settled by a reading the guide
is entitled to ask for, the effect question is held back and the guide asks for
the reading. One card swapped for a better one.

### Life

Eleven areas, one ordinary word each, one line of plain English. No record
counts, no confidence, no "stale", no phase — swept for by a browser test. The
private area reports how it stands and never what it is about. Most of it should
read dull.

**Product behaviour changed:** yes — the app notices a quiet area, says so, and
writes down a result the owner never typed.
**Semantic behaviour changed:** yes — a fourth limiter, a third term in the
learning weight, and evidence that knows where it came from.

## What the sweeps changed

Three separate reintroduction passes, twenty-one defects reintroduced one at a
time. **The first pass of each caught most and missed the ones that mattered.**

| Sweep               | First pass | After  |
| ------------------- | ---------- | ------ |
| Inferred evidence   | 8 of 8     | 8 of 8 |
| Coverage and growth | 6 of 9     | 9 of 9 |
| The guide           | 2 of 4     | 4 of 4 |

The five escapes were all the same shape, and it is DEF-0020's shape: a claim
asserted somewhere that could not reach it.

- "Coverage never contradicts the fact layer" was proved on `durable-custody`,
  which is protected three ways over — so it proved the behaviour and not the
  rule. It now has a history where the two can actually disagree.
- "An area he never mentioned is left alone" was asserted against a filtered
  list rather than against a status, so removing the guard changed nothing the
  test looked at.
- "A coverage move may not claim to answer what is in the way" was riding on the
  tournament, which stopped catching it once the coverage engine changed which
  area was quiet.
- Two guide rules — the daily floor and the fallback when the better question
  will not be asked — had no history that reached them at all.

## Phone check (what to look at)

Open Preview. Header → **More** → **Open the QA laboratory**, load a scenario,
then tap **Now** or **Life**.

1. **Everything current except the studying.** Now should now recommend
   _"Spend 10 minutes recalling subnetting before you reopen your notes."_ —
   the refresh itself, chosen over the walk. The line claiming the gap was
   "in the way" is gone, and so is the gap line entirely, because the app is
   doing something about it rather than mentioning it.
2. **The same scenario, on Life.** Six lines rather than forty-four: _Going
   quiet_ with career on its own and the reason under it, then _Fresh_ and
   _Nothing here yet_ as rows of names. The question is whether this is a report
   you would glance at or a list of chores.
3. **Three times running, and the app noticed.** Under the move: _"Adaya has
   managed ordering her own food on her own 3 times running. Worth calling that
   settled?"_ Answer either way and it goes. Judge the sentence — this is the
   app making a claim about your daughter.
4. **Three broken nights, and a deadline.** Tap **Done**, then in QA press
   **+1 day** and come back. It should ask _"How much sleep did you actually
   get?"_ and, once answered, ask nothing else — no second card asking what the
   early night was worth. That is the whole of the inferred-evidence work.
5. **The same, in QA afterwards.** Open **Episodes**: the recovery episode
   should read _1 answer(s) given_ against a question you were never asked.
6. **A month of what actually worked**, in QA → **What it has learned**. A row
   reading _Who said so_ should separate what you answered from what was worked
   out.
7. **A Thursday with nothing needing doing**, and **A settled arrangement, and
   one week away.** Both should be exactly as they were — no new lines, no new
   questions. This phase is judged as much on what it left alone.

What to judge is section 47's list applied to coverage: is the quiet-area signal
useful or is it nagging, does Life read as a report or as homework, and does the
app ask you less than it did.

## Deliberately not built

- **Domain pages.** Phase 5. The Life overview is the coverage status section 49
  asks for; the pages behind it are section 50's.
- **Correcting a coverage interpretation or a domain status.** Section 62 lists
  both, and both belong on a domain page that does not exist yet. What is
  correctable now is a learned belief (Phase 3) and a growth suggestion.
- **Inferring anything but a sleep effect.** The machinery is per-concept and
  the profile table drives it, so a second matcher is a table entry and a number
  somebody has to defend. Nothing else has a reading the app already collects.
- **A model-assisted coverage read.** D-025 unchanged; still an owner decision.
- **Comfort is still recorded and not yet read for patterns.** Unchanged from
  Phase 3 — an Insights question.
- Timeline and Insights content (Phase 6), exports and backup (Phase 7), the
  legacy importer (Phase 8), the service worker (Phase 10).

## What the Android phone gate changed

The gate ran at 360×780 with touch, a device pixel ratio of 3 and an Android
Chrome user agent — a real mobile context rather than a narrow desktop.

| The owner found                                         | What it turned out to be                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The refresh move loses to the walk on its own scenario  | DEF-0023 — the silence created the move and then sank it, by twice the margin that decided the evening        |
| "What is in the way — Nothing has come in about career" | DEF-0024 — a coverage gap is the app's blind spot, and the label said obstacle while the ranking said nothing |
| Insights says the app is "not yet asking" for outcomes  | DEF-0025 — false since Phase 3, and the guard written for exactly this held four remembered sentences         |
| Life is two and a half screens of one repeated sentence | DEF-0026 — `Row` is built for `Commit / bdb1e18`, not for eleven wrapped paragraphs                           |
| "ordering her own food on her own"                      | DEF-0027 — the skill label already carries it                                                                 |

**Nine reintroductions across the repair, all caught.** Two of them are the ones
worth naming: a brand new deferral claim nobody had acknowledged, and a denial
of a capability in fresh wording. The old guard would have missed both, which is
the difference between a rule and a list.

## Open defects

None. Seven were found and closed during the phase. Not one came from a failing
assertion — two from tests that could not be made to pass, one from printing the
copy after everything was green, and four from the owner on a phone.

- **DEF-0021** — the app asking for a verdict when it could ask for the fact.
  Found by a browser test written to demonstrate the derived-evidence fix, which
  could not be made to pass: the outcome card takes the slot above the guide, so
  the question that would have produced the reading was never asked, and the
  matcher had nothing to read. The complaint that started the whole line of work
  had survived inside the repair for it.
- **DEF-0023 … DEF-0027** — the Android phone gate, above.
- **DEF-0022** — found by **printing every line the owner would read, on every
  scenario, after the suite was green and the checkpoint was already pushed.**
  "A week pointed at the house" said _Adaya is here_ in the premise and
  _nothing has come in about fatherhood / family for 6 months_ directly above
  the decision. Both from the same run. Coverage was measuring the age of the
  record carrying a durable context instead of asking whether the context was in
  force — which D-012 already settles, and which section 8 uses as its own
  example of something that never needs re-asking. DEF-0017's class, on the one
  fact the plan singles out.

## Deferred, with reasons

Three of these the owner deferred explicitly at the closeout and named as not to
be fixed in Phase 4. They are written down here so the next phase inherits them
as decisions rather than as oversights.

- **P4-6 — the no-action eyebrow.** On an evening with nothing worth doing, the
  limiter summary fills a slot styled for a short label, so it reads as
  `ONLY ABOUT 15 MINUTES LEFT TONIGHT.` — uppercase, letter-spaced, with a
  trailing full stop, where `MOVE` or `RECOVER` normally sit. Owner-deferred.
- **P4-7 — the More button is 81×36.** Below the 44px minimum, and the only
  target on any surface that is. It predates Phase 4 and is not a coverage
  concern. Owner-deferred.
- **A started move that is never settled.** Unchanged from Phase 3, and the
  Android gate confirmed it bites in practice: a move started yesterday still
  reads _Under way_ the next evening with **Start it** disabled. It needs a
  decision about how long is too long, which wants real use to answer.
  Owner-deferred.

- **The older dimensions still cost weight when they know nothing.** Unchanged
  from Phase 3. D-048 applies to `follow-through`, `direct-result` and now the
  coverage branch of `bottleneck-fit`; the rest still score zero at full weight.
  Re-cutting them means re-running section 18's tournament.
- **`hold` is still never generated.** Unchanged from Phase 2.
- **Free-text constraints are still shown, not enforced.** Unchanged.
- **Emotional Health has no standing concept**, so it can only go stale through
  the domain-level backstop. Nothing in the registry yet tracks a standing
  understanding of it, and inventing one to fill the gap would be collecting
  data because a field exists.

## Decisions made

D-060 … D-076 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 5 — the Life domain experience.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 3 — Recommendation lifecycle + outcome learning

**Status: GREEN — owner-approved on the phone.**

Section 48's goal is one sentence: complete the loop. A recommendation the owner
acts on, an outcome that gets observed, and learning that changes what happens
next. All three exist and are wired to each other through canonical records —
there is no side channel anywhere in it.

**The owner approved it on `0e416d4`**, after one phone pass that found
DEF-0020 and a repair that took four exchanges to get right.

**That pass is the phase.** The card said "Did the kitchen get cleared?" and
offered _Better than usual · About the same · Worse_ — a question its own
answers could not answer. No automated check here would have caught it: every
sweep the suite had was about pronouns, internal vocabulary and finished
sentences, and that sentence passes all three. It took a person reading a screen.

**And the first diagnosis of it was wrong.** It said the question was redundant
because tapping Done already records that the kitchen was cleared. The owner
said no: Done is the attempt, and fifteen minutes clearing a kitchen can be done
in full and leave it half clear. He was right, `action-completion` had no
definition anywhere in the codebase to settle it, and that correction is what
turned a copy fix into the semantic repair the phase actually needed —
completion, direct result, downstream effect and comfort separated into four
kinds of evidence that had been sharing one answer.

Two further rounds pushed back on the repair itself: whether direct result could
be folded into follow-through without losing a distinction (it could not), and
whether a delta-based effect scale behaved sensibly under repeated observations
(it did not — a move that consistently does nothing would keep its prior
forever). Both were caught by asking for the arithmetic rather than accepting
the shape.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`         |
| Do they match?       | Yes, by construction — D-004, and verified live by hand     |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

## Verification

| Gate                                      | Result                                         |
| ----------------------------------------- | ---------------------------------------------- |
| Privacy scan                              | Clean, 126 tracked files                       |
| Format (Prettier)                         | Pass                                           |
| Lint (ESLint)                             | Pass, 0 warnings                               |
| Typecheck (strict TS)                     | Pass, 0 errors                                 |
| Unit / contract / synthetic / adversarial | 448 passed / 448 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 141 passed / 141 — 47 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI, and confirmed by hand     |

### Where the 448 sit

Phase 2 ended at 330. The 118 new ones are almost all about the loop and what it
learns from.

| Suite                                                            | Tests |
| ---------------------------------------------------------------- | ----: |
| `synthetic/outcome-learning` — section 20, rule by rule          |    50 |
| `synthetic/adaptive-guide` — one question at a time              |    34 |
| `unit/intelligence-kernel` — readers, direction, moves, order    |    30 |
| `synthetic/lifecycle` — episodes, double taps, outcome windows   |    26 |
| `synthetic/outcome-questions` — DEF-0020, every verb × aspect    |    17 |
| `unit/time` — instants, civil dates, weeks, DST, day blocks      |    20 |
| `unit/registries` — ids, domains, concepts, privacy              |    19 |
| `synthetic/no-hidden-genericity` — sections 61 and 64            |    19 |
| `unit/knowledge` — the four states, freshness, asking            |    18 |
| `unit/architecture-guards` — the boundaries and the copy sweep   |    18 |
| `synthetic/model-guardrails` — section 18's fence                |    17 |
| `synthetic/g008` — a non-career weekly direction                 |    15 |
| `unit/store` — append semantics, supersession                    |    14 |
| `synthetic/g005` — sleep beats ambition, both ways               |    12 |
| `synthetic/g009` — unknown is unknown                            |    12 |
| `unit/buildInfo`                                                 |    11 |
| `unit/routing`                                                   |    11 |
| `contract/projections` — rebuildability, migrations              |    11 |
| `synthetic/g004` — a social opportunity                          |    10 |
| `unit/recommendation` — rendering and refusal                    |    10 |
| `synthetic/recovery-has-somewhere-to-go` — DEF-0016 and DEF-0017 |    10 |
| `synthetic/g011` — timezone and week boundary                    |     9 |
| `adversarial/malformed-history`                                  |     9 |
| `synthetic/g001` — no orphan pronoun                             |     8 |
| `synthetic/intelligence-tournament` — section 18's choice        |     8 |
| `contract/round-trip` — 20 record kinds, lossless                |     8 |
| `synthetic/g002` — durable family context                        |     7 |
| `synthetic/g014` — no action is a real answer                    |     8 |
| `adversarial/malformed-records`                                  |     7 |
| `contract/legacy-quarantine` — preserved and inert               |     6 |

## Gate checklist (section 48, and the phase brief)

| Requirement                                              | Status                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| G-001, G-002, G-005, G-008, G-009, G-011 pass, unchanged | Pass — 63 tests, and the six files are byte-identical to `79d033b`  |
| G-004 passes as an automated synthetic scenario          | Pass — 10 tests, including the no-quota sweep                       |
| Outcome questions are answerable by their own answers    | Pass — 17 class-wide checks, every verb × every aspect (DEF-0020)   |
| G-014 passes as an automated synthetic scenario          | Pass — 8 tests, including the counterexample                        |
| A completed action demonstrably changes later reasoning  | Pass — same evening, same options, different winner                 |
| A decline is not mislabelled ineffective                 | Pass — and structurally, not by convention (D-045)                  |
| Can't-now changes the situation appropriately            | Pass — reaches follow-through and neither of the other two          |
| One event does not become proof                          | Pass — one comparable evening moves the belief a quarter of the way |
| The semantic subject survives through the follow-up      | Pass — the question is the renderer's own follow-up                 |
| A double tap creates no duplicate episode                | Pass — three separate guards, each tested (D-042, D-052)            |
| The phone flow feels fast                                | Pass — owner-approved                                               |
| CI green                                                 | Pass                                                                |
| `npm run verify` from a clean checkout                   | Pass                                                                |
| Preview deploys automatically, SHA matches               | Pass — verified live against `main` HEAD                            |
| **The owner tests the loop on a phone and accepts it**   | **Pass — approved on `0e416d4`**                                    |

## What changed

### `src/intelligence/lifecycle.ts` — episodes

An episode is one suggestion, on one day, and everything that became of it. It
is identified by what it is about rather than by the record that created it,
which is what makes a duplicate episode unrepresentable rather than prevented
(D-042). Five states, and only `completed` is terminal: saying "not tonight" and
doing it anyway is an ordinary evening, and an app that refused to record the
second half would be wrong about the owner's life in order to be tidy about its
own state machine.

Nothing is written until the owner acts (D-043).

### `src/intelligence/outcomes.ts` — windows

A result is asked for when there is one to give. A recovery night judged at
23:05 would collect an answer about intent, and an answer about intent recorded
as an outcome is worse than none: it looks exactly like evidence. So a
`protect-sleep` is judged the next morning and a kitchen reset twenty minutes
later, and the difference comes from the move rather than from a rule.

Windows close, because asking on Thursday about Tuesday is asking someone to
invent something. Section 20's "outcome unknown" is a real and acceptable state.

### `src/intelligence/learning.ts` — what actually happened

D-023 discharged. The priors in `moves.ts` are pulled toward this owner's own
outcomes by `n / (n + 3)`, weighted by how much an evening resembles tonight and
gently by how long ago it was — similarity dominating recency, which is section
20's "context similarity matters" read literally.

Three learned quantities, and the separation is the point. Outcomes reach
`effect`. Inabilities reach `follow-through`. Declines reach `appetite` and
`owner-preference`, and can reach nothing else. Section 20's first two rules are
held by the code paths not meeting.

### `src/intelligence/corrections.ts` — section 62

A `belief-correction` is a watershed: everything the owner has already seen and
disagreed with stops counting, and what happens afterwards counts normally. It
is offered beside the decision it moved, because a belief the owner cannot see
is a belief they cannot correct.

### Now

Start, done, not tonight, can't right now, something else. A started move stays
in front of the owner until they settle it (D-049). A result that is due comes
above everything, because it expires and answering it is what makes the next
decision better. And one line saying what the decision rests on, with a way to
disagree with it.

### The clock

`MemoryProvider` refreshes the moment when the tab becomes visible, and sets one
timer for the instant the engine says the next window opens (D-050). No polling,
and no clock below the UI — `nextOutcomeDueAt` computes an instant and compares
it to nothing.

### `src/features/qa/` — the inspector

Two new panels. **What it has learned** shows, per surviving move, where the
belief started, where it landed, how many comparable results there were and how
far they pulled it — with follow-through and appetite listed separately, so it
is visible on screen that a decline never became a claim about whether the move
works. **Episodes** lists every suggestion in the history, how it ended, whether
a result is due, and how much tonight resembles it.

**Product behaviour changed:** yes — the app can be acted on, and it remembers.
**Semantic behaviour changed:** yes — decisions now move on what happened.

## What the phone test changed

| The owner said                                         | What it turned out to be                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| The answers do not answer the question                 | DEF-0020 — and eight of fifteen follow-ups were unanswerable, not one                                                     |
| Done is the attempt, not the result                    | Correct. `action-completion` had no definition at all, and the first diagnosis was wrong because of it (D-053)            |
| Do not fold direct result into follow-through          | Correct — perfect follow-through with a poor result is an ordinary evening, and folding them makes the app misdescribe it |
| Show me the delta arithmetic before I approve it       | It fails: a move that consistently does nothing keeps its prior forever. Withdrawn (D-056)                                |
| Comfort should matter if you are going to ask about it | Wired to learned friction (D-057)                                                                                         |
| Harm is not the same evidence as no help               | A fourth effect level, and the record keeps them apart even though ranking floors both                                    |

## Phone check (this is what was tested)

Open Preview. Header → **More** → **Open the QA laboratory**, load a scenario,
then tap **Now**.

1. **A month of what actually worked.** The headline should be the kitchen, and
   under it a line reading _"Reset a space has worked several times in
   situations like tonight."_ Tap **Not how it went** and the line goes, along
   with the belief behind it — the recommendation may change on the spot. That
   is section 62, end to end.
2. **The same scenario, in QA.** Open **What it has learned**. Clearing the
   kitchen should show four comparable results; the walk two, having moved its
   number the other way; the lab none at all, with its two interruptions under
   _Could it happen_ instead. That is section 20's separation, visible.
3. **A week pointed at the house.** Tap **Start it**. The kitchen should stay on
   screen with _Under way_ under it, rather than the app moving on to something
   else while you are at the sink. **Start it** greys out and does not move.
4. **The same, then Done.** Nothing is asked immediately. Go back to QA, press
   **+1 hour**, return to Now: _"Did the kitchen get cleared?"_ Answer it, and it
   goes.
5. **A Saturday with people in it.** _"Start one real conversation while you are
   at the climbing gym."_ No counter, no streak, nothing scored.
6. **A Thursday with nothing needing doing.** _"Nothing needs to move tonight."_
   — reached with sleep, energy, soreness and the evening's length all known.
   Judge whether it reads as an answer or as a shrug.
7. **Three broken nights, and a deadline**, at a quarter to six. Set the clock
   in QA to 17:45. It should say _"Start easing off now — the rest of today can
   be a light one."_ rather than "Nothing fits tonight." That is DEF-0016.
8. **Something else**, on any scenario, should produce a different suggestion
   rather than the same one again.

What to judge is section 47's list applied to the loop: are these the right
buttons, is it fast, does the learning line read as something the app actually
knows, and does answering a follow-up feel worth the tap.

## Deliberately not built

- **The coverage engine** — Phase 4. Nothing yet notices that a life area has
  gone quiet for a month, so `stale-evidence` remains barely reachable and the
  limiter set is still three.
- **Pause and continue.** Section 48 lists them "if needed". They are not: a
  started move already stays in front of the owner until it is settled, which is
  what pause would have been for, and a control that records an event nothing
  reads is D-029's mistake with a different label.
- **A started move that is never settled.** It stays `started` and no result is
  ever asked for. Asking "did that happen?" in a second shape when the buttons
  are already on screen would be nagging; letting it lapse silently loses the
  evidence. It needs a decision about how long is too long, which wants real use
  to answer.
- **Correcting anything but a learned effect.** Section 62 lists eight kinds of
  correction. Facts, goals, direction and domain status all belong to surfaces
  that do not exist yet (Phases 4 and 5), and inventing a screen for them here
  would be building the Life page badly and early.
- **Live model inference** — D-025, unchanged. Owner decision.
- Domain pages (Phase 5), Timeline and Insights content (Phase 6), exports and
  backup (Phase 7), the legacy importer (Phase 8), the service worker (Phase 10).

## Open defects

None. Five were found and closed during the phase, and the fifth came from the
owner.

- **DEF-0016** — the strained late afternoon, deferred by the owner at the end
  of Phase 2 and the natural first thing to build here.
- **DEF-0017** — found by sweeping DEF-0016's siblings across every hour rather
  than the one that was reported. Worse than the defect that found it: nine
  hours of sleep debt printed above the decision, and "none of it says how
  tonight is going" printed underneath.
- **DEF-0018** — found because a browser test hung rather than failed. Tapping
  **Start it** slid **Done** into the space under the finger.
- **DEF-0020** — **the owner's first phone pass.** "Did the kitchen get cleared?"
  offered against _Better than usual · About the same · Worse_. The visible edge
  of a semantic collapse: completion, direct result, downstream effect and
  comfort are four facts and one judgement was standing in for all of them. The
  first diagnosis was wrong about the central point — it said Done already
  records the result — and the owner corrected it, which is what turned a copy
  fix into a semantic one.
- **DEF-0019** — found by printing the copy the owner would actually read rather
  than only asserting on parts of it. A move with four completions was beating
  one with no history at all, and the app was calling the difference "more
  likely to actually happen". Fixing it showed that two of this phase's own
  demonstrations had been riding on the same bonus; both fixtures now carry
  real evidence on both sides and are more honest for it.

Each regression was proved to fail with its defect reintroduced. So were all six
of section 20's rules, individually: a decline counted as ineffectiveness, an
inability counted as ineffectiveness, `PATIENCE` set to zero, the similarity
floor removed, the correction watershed disabled, and the same-block and
next-day effects collapsed into one. All six were caught.

## Deferred, with reasons

- **The older dimensions still cost weight when they know nothing.** D-048
  applies the rule to `follow-through` only. Fixing the rest means re-cutting
  the weights, which means re-running section 18's tournament.
- **`hold` is still never generated.** A non-action is an arbitration outcome
  rather than a candidate. Unchanged from Phase 2.
- **Free-text constraints are still shown, not enforced.** Unchanged from
  Phase 2.
- **Comfort is recorded and not yet used.** G-004 asks for it to be captured and
  it is, as an outcome with no sentiment. Nothing reads it yet — section 10's
  "which contexts make connection easier" is an Insights question, and inventing
  a use for it now would be inventing a finding.

## Decisions made

D-042 … D-058 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 4 — the coverage engine and adaptive guides.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 2 — Intelligence tournament + first real Now

**Status: GREEN — owner-approved on the phone.**

Section 47's gate is not automated. It ends with a person opening the app on a
real phone and judging whether the recommendation is any good, and it fails if
the honest answer is generic, dumb, vague, too many questions, doesn't
understand what it is talking about, looks lifeless, or technically valid but
not useful.

**The owner approved it on `bd2b5fa`.** They returned to Preview after 18:00
local, Now recalculated to "Saturday evening", and the recommendation and its
explanation moved to the evening context with no stale state. That is the gate,
and it is the only thing that could close this phase.

**Four phone passes found twelve defects between them, and were right about
every one.** DEF-0005 to DEF-0016 in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).
The fourth pass approved it.

The first pass found the sharpest, DEF-0006: a walk explained by a sleep figure
that had contributed nothing to the decision. The owner's phrase — "rationalizing
the winner afterward" — was exactly right, and no automated check here would
have caught it, because every sentence involved was individually true.

The second pass was a diagnosis rather than a bug report, and it found two
things the first repair had introduced. DEF-0009: requiring two of a question's
answers to move the outcome made every two-option question unaskable, so "Is she
with you tonight?" was never asked — while answering yes turned a solo walk into
an afternoon with his daughter. DEF-0010: guide answers all claimed to have been
written down at the same instant, leaving "the answer you gave last"
unanswerable and a stopping rule removing an arbitrary one.

It also found that one of the repair's own regressions was vacuous — the copy
sweeps only inspected decisions made before any answer, and the branch they were
meant to guard is only reachable after one. They now run a second time with each
possible first answer given, which is what the owner was doing when they found
it.

The third pass asked two questions rather than reporting two bugs, and the
answers went opposite ways. The guide asking "Is Adaya with you tonight?" was
correct behaviour on a fixture that had left out the owner's custody arrangement
— DEF-0015, a scenario defect with no engine change. "Saturday afternoon" at a
quarter to six was a word rather than a boundary: 18:00 stays the evening for
every decision the engine makes, and only the display moved (D-040). Inspecting
the second of those turned up DEF-0016, which is open and deferred.

Everything below has been re-run since the repairs. What is below is everything
that _can_ be checked, and it all holds; the phone test is still the gate.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | `36c75ef`, read live from `preview/build-info.json`         |
| Do they match?       | Yes, by construction — D-004                                |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

Preview redeploys on every push to `main` that passes the gate, and the deploy
job fails if the live `build-info.json` does not serve the pushed SHA.

## Verification

| Gate                                      | Result                                         |
| ----------------------------------------- | ---------------------------------------------- |
| Privacy scan                              | Clean, 120 tracked files                       |
| Format (Prettier)                         | Pass                                           |
| Lint (ESLint)                             | Pass, 0 warnings                               |
| Typecheck (strict TS)                     | Pass, 0 errors                                 |
| Unit / contract / synthetic / adversarial | 330 passed / 330 (in plain Node, no DOM)       |
| Browser tests (Playwright)                | 120 passed / 120 — 40 tests × 360, 430, 1280px |
| Production build                          | Pass                                           |
| `npm run verify` from a clean checkout    | Pass                                           |
| Deployed SHA matches checkpoint           | Asserted live in CI                            |

### Where the 330 sit

| Suite                                                          | Tests |
| -------------------------------------------------------------- | ----: |
| `unit/intelligence-kernel` — readers, direction, moves, order  |    30 |
| `unit/time` — instants, civil dates, weeks, DST                |    20 |
| `unit/registries` — ids, domains, concepts, privacy            |    19 |
| `unit/knowledge` — the four states, freshness, asking          |    18 |
| `unit/architecture-guards` — the boundaries and the copy sweep |    18 |
| `unit/store` — append semantics, supersession                  |    14 |
| `unit/buildInfo`                                               |    11 |
| `unit/routing`                                                 |    11 |
| `unit/recommendation` — rendering and refusal                  |    10 |
| `contract/projections` — rebuildability, migrations            |    11 |
| `contract/round-trip` — 19 record kinds, lossless              |     8 |
| `contract/legacy-quarantine` — preserved and inert             |     6 |
| `synthetic/model-guardrails` — section 18's fence              |    17 |
| `synthetic/g008` — a non-career weekly direction               |    15 |
| `synthetic/no-hidden-genericity` — sections 61 and 64          |    19 |
| `synthetic/g005` — sleep beats ambition, both ways             |    12 |
| `synthetic/g009` — unknown is unknown                          |    12 |
| `synthetic/adaptive-guide` — one question at a time            |    32 |
| `synthetic/g011` — timezone and week boundary                  |     9 |
| `synthetic/g001` — no orphan pronoun                           |     8 |
| `synthetic/intelligence-tournament` — section 18's choice      |     8 |
| `synthetic/g002` — durable family context                      |     7 |
| `adversarial/malformed-history`                                |     9 |
| `adversarial/malformed-records`                                |     7 |

## Gate checklist (section 47, and the phase brief)

| Requirement                                                | Status                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| G-001, G-002, G-009, G-011 still pass, unchanged           | Pass — 36 tests, none of them edited this phase                     |
| G-005 passes as an automated synthetic scenario            | Pass — and its counterexample passes with it                        |
| G-008 passes as an automated synthetic scenario            | Pass — four directions, one uncategorised, one expired              |
| The decision trace shows the facts and how each is known   | Pass — concept, state, reading, what it was used for, source rows   |
| …the candidates                                            | Pass — every move proposed, by which generator, and why             |
| …which were filtered and why                               | Pass — reason and a plain-language explanation per rejection        |
| …the ranking                                               | Pass — fifteen dimensions per move, each with its value and a note  |
| …the chosen move                                           | Pass — opened by default in the inspector                           |
| …what would change the answer                              | Pass — measured by re-running the decision under each answer        |
| Two different profiles get different wording and reasoning | Pass — enforced across every scenario, not a sample                 |
| A deterministic baseline architecture                      | Pass                                                                |
| A model-assisted or hybrid architecture, if feasible       | Pass, with a caveat — see D-025                                     |
| The tournament is written down                             | Pass — D-024, and the table is printed by the test that produced it |
| A Now surface with the move, its reason and its state      | Pass                                                                |
| One adaptive guide flow                                    | Pass — one question, recompute, stop when it knows enough           |
| CI green                                                   | Pass                                                                |
| `npm run verify` from a clean checkout                     | Pass                                                                |
| Preview deploys automatically, SHA matches                 | Pass                                                                |
| **The owner tests the slice on a phone and accepts it**    | **Pass — approved on `bd2b5fa` after four passes**                  |

## What changed

### `src/intelligence/` — the kernel

Ten modules and one entry point. `decide(view, moment)` assembles the situation
from resolved facts, generates candidates from what is actually in the owner's
history, filters what does not fit and records why, scores what is left across
fifteen dimensions, chooses one move or a valid non-action, and explains it in
the owner's own particulars. Pure and clock-free: the moment is an argument.

Two boundaries inside it are enforced rather than described. The evaluator and
the arbiter contain no life area by name (D-030), which is what makes G-005 and
G-008 pass for the right reason. And nothing under `src/features/` can reach the
parts that decide — a surface asks the engine or it gets nothing.

### The tournament

Deterministic baseline against a hybrid with a semantic advisor between ranking
and choosing. Both scored 60 of 60 and chose identically on all ten profiles, so
the simpler one is selected (D-024). The advisor demonstrably fired rather than
sitting silent, which is what makes "they agreed" mean something. Section 18's
guardrails are tested by an advisor that tries to break every one of them: it
names moves nobody proposed, asks for adjustments a thousand times the cap,
speaks with certainty it has not earned, and throws. The decision does not move.

### `src/features/now/` — Now

The premise, one move, why it in the owner's own numbers, the time it takes,
what it was chosen over, what is still unknown, and where the move stands. Under
it, the guide: one question, and only when the answer would land somewhere
different.

### `src/features/qa/` — the inspector

Section 35's list, filled. Plus an architecture selector, so the tournament's two
candidates can be compared by hand on any scenario.

### Navigation

More leaves the bottom bar (D-028). Four primary destinations, as section 5 says.

**Product behaviour changed:** yes — the app makes a decision and explains it,
and asks a question when one would help.
**Semantic behaviour changed:** yes — this phase is the reasoning.

## What the phone test changed

| The owner said                                         | What it turned out to be                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| The answers do not answer the question                 | DEF-0020 — and eight of fifteen follow-ups were unanswerable, not one                                                     |
| Done is the attempt, not the result                    | Correct. `action-completion` had no definition at all, and the first diagnosis was wrong because of it (D-053)            |
| Do not fold direct result into follow-through          | Correct — perfect follow-through with a poor result is an ordinary evening, and folding them makes the app misdescribe it |
| Show me the delta arithmetic before I approve it       | It fails: a move that consistently does nothing keeps its prior forever. Withdrawn (D-056)                                |
| Comfort should matter if you are going to ask about it | Wired to learned friction (D-057)                                                                                         |
| Harm is not the same evidence as no help               | A fourth effect level, and the record keeps them apart even though ranking floors both                                    |

## Phone check (this is what was tested)

Open Preview. Header → **More** → **Open the QA laboratory**, load a scenario,
then tap **Now**.

1. **Three broken nights, and a deadline.** Now should say _"Take tonight as
   recovery — no subnetting session."_ with a reason in hours, _Chosen over_ the
   career rep it declined, and _Why this one_ — "Answers what is actually in the
   way." The week is deliberately pointed at career and the CCNA goal is live:
   if career had won, G-005 would have failed.
2. **The same week, properly slept.** Same goal, same bad session yesterday,
   three good nights instead of three bad. The career move should win.
3. **A week pointed at the house.** Four live options — a room, a daughter who
   is here, a topic that is behind, capacity for a walk. It should pick the
   kitchen and say the week is about a calmer house.
4. **Two ordinary weeks.** A fortnight of sleep and nothing about how you feel,
   so Now should say there is nothing to suggest _yet_ — and say plainly that
   the history is not the problem. Answer _Plenty_ and it becomes a walk,
   explained by the thing it just asked rather than by whatever number was
   nearest. That is DEF-0006 fixed, end to end.
5. **A settled arrangement, and one week away.** It should never ask whether
   Adaya is with you — and there should be no "Time" row, no "Still unknown",
   and no "Where this stands".
   5b. **A month of history, three weeks ago.** Every reading in it has expired and
   the custody arrangement has not, so it should act on the arrangement and
   never ask about it. Between 17:00 and 18:00 the premise should read "late
   afternoon" while the moves on offer stay exactly what they are at four.
6. **Life, Timeline, Insights.** No phase numbers anywhere, and nothing claiming
   a part of the app is missing that is not.
7. Back in QA, open **Ranking** and **What would change the answer** on any
   scenario.

What to judge is section 47's list: is it specific, does it understand what it
is talking about, is it useful, does it ask too much, does it look alive.

## Deliberately not built

- **The recommendation lifecycle** — accept, decline, can't-now, outcome capture
  and learning. Phase 3, and D-029 says why a button that records an event
  nothing learns from would be worse than no button.
- **The coverage engine** — Phase 4. Nothing yet notices that a life area has
  gone quiet for a month, so the `stale-evidence` trigger exists but is barely
  reachable.
- **Live model inference** — D-025. The hybrid path is complete and validated;
  what is missing needs an owner decision about a hosted endpoint.
- **G-004 and G-014** — Phase 3 by the brief. The engine can already produce a
  valid non-action and does so on two scenarios, and the social generator
  exists; neither is gated here.
- Domain pages (Phase 5), Timeline and Insights content (Phase 6), exports and
  backup (Phase 7), the legacy importer (Phase 8), the service worker (Phase 10).

## What the phone test changed

| The owner said                                    | What it turned out to be                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Do not ask for what the app already knows         | DEF-0005 — a row labelled "Time" carrying the move's own length, beside a guide asking for the owner's                |
| The walk's reasoning is not credible              | DEF-0006 — the explanation could cite any fact, and the walk should not have been proposed without a capacity reading |
| Tell me why this beats the realistic alternatives | Now shows what it was chosen over and the dimension that decided it, taken from the ranking (D-035)                   |
| Stale placeholder copy on owner surfaces          | DEF-0007 — five phase strings across four screens, one of them false                                                  |
| Do phase numbers belong on owner screens at all   | No. One constant, two surfaces, a guard (D-034)                                                                       |
| Ask only what could actually change the answer    | DEF-0008 — the guide asked in list order and kept going after answers stopped moving anything                         |
| "Where this stands: New tonight" and similar      | Removed, along with "Still unknown" — both were the app talking about itself                                          |

Nothing in the "do not weaken" list moved: four primary tabs, More secondary, QA
reachable, unknown still unknown, one question at a time, the semantic subject
intact, and every Phase 1 guarantee still asserted.

## Open defects

None. Six were found and closed during the phase — DEF-0003 to DEF-0008, in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md). Four of the six came from the phone
test, which is the argument for the gate being a person rather than a suite.

## Deferred, with reasons

- **Outcome-earned move profiles.** `moves.ts` holds priors, and says so
  (D-023). Phase 3 replaces them with what actually happens to this owner.
- **A richer limiter set.** Three today: recovery, capacity, time. Stale
  coverage is the obvious fourth and belongs with the engine that can see it.
- **Free-text constraints are shown, not enforced.** A constraint the owner
  wrote — "no gym until the shoulder settles" — is attached to any move that
  leans on the same concept and displayed, because guessing which moves it
  forbids would be inventing a rule they did not state.
- **`hold` is never generated.** A non-action is an arbitration outcome rather
  than a candidate, so the verb is only exercised by G-001's sweep.
- **The clock advances on load, not continuously.** `MemoryProvider` captures
  the moment once at mount, which is why returning to the app after 18:00
  recalculated correctly during the owner's approval pass. A tab left open
  across a block boundary will not notice on its own. Nothing in Phase 2 needs
  it to — every decision is a pure function of the moment it was given — but
  Phase 3's outcome windows are the first thing that will care, so it is written
  down here rather than discovered there.

## Decisions made

D-021 … D-041 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 3 — the recommendation lifecycle and outcome learning.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).

---

# Phase 1 — Canonical records + semantic model + QA lab

**Status: GREEN.**

Section 46's gate is entirely automated. Every item passes. No owner approval
gates this phase — unlike Phase 0, and unlike Phase 2, where the owner's
judgement of the recommendation is the gate. A phone check is still worth
making, and what to look at is below.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | `1c8dd08`                                                   |
| Deployed Preview SHA | identical                                                   |
| Do they match?       | Yes, by construction — D-004                                |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

## Verification

| Gate                                      | Result                                       |
| ----------------------------------------- | -------------------------------------------- |
| Privacy scan                              | Clean                                        |
| Format (Prettier)                         | Pass                                         |
| Lint (ESLint)                             | Pass, 0 warnings                             |
| Typecheck (strict TS)                     | Pass, 0 errors                               |
| Unit / contract / synthetic / adversarial | 188 passed / 188 (in plain Node, no DOM)     |
| Browser tests (Playwright)                | 78 passed / 78 — 26 tests × 360, 430, 1280px |
| Production build                          | Pass                                         |
| `npm run verify` from a clean checkout    | Pass                                         |
| Deployed SHA matches checkpoint           | Asserted live in CI                          |

### The gate held once, on purpose

`c1a827d` was pushed after typecheck, lint and the unit suite but without
`format:check`. Prettier failed it in CI, the deploy job never ran, and Preview
stayed on the previous green commit. That is D-004 working as intended: a red
build does not reach the phone. Fixed in `ba74ad5`.

## Gate checklist (section 46)

| Requirement                                 | Status                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| G-001 no orphan pronoun                     | Pass — the case, and a sweep of every verb and reason                                           |
| G-002 durable family context                | Pass — four moments, exception overrides, nothing rewritten                                     |
| G-009 unknown is unknown                    | Pass — no false zero, average or default; questions only when material                          |
| G-011 timezone and week boundary            | Pass — five zones, both clock changes, 23- and 25-hour days                                     |
| Malformed synthetic inputs are inspectable  | Pass — reason, path and raw payload kept for every bad row                                      |
| One malformed record cannot blank a surface | Pass — in the parser, in the store, and on the QA screen                                        |
| Canonical data round-trips without loss     | Pass — 19 kinds, plus fields this version has never seen                                        |
| No full UI dependency                       | Pass — every suite below the UI runs in plain Node with no DOM in scope, and a guard asserts it |
| Preview deploys automatically               | Pass — D-004                                                                                    |

## What changed

### `src/domain/` — meaning

- **Time** (`time.ts`, `windows.ts`): instants, owner-local days, local times and
  local week identifiers as separate branded types. Civil-date arithmetic, so a
  DST day really is 23 or 25 hours long. A generalised week rule that reduces
  exactly to ISO-8601 on a Monday start. Wall-clock times that do not exist, or
  happen twice, resolve and say which. Observation, due and freshness windows
  are three different types.
- **Knowledge** (`knowledge.ts`): explicit, inferred, stale, unknown — and no way
  to ask for a default.
- **Concepts** (`concepts.ts`): fifteen concepts across all eleven domains, each
  with its own freshness horizon, privacy class and question policy.
- **Records** (`records.ts`, `build.ts`): nineteen kinds behind one versioned
  envelope, append-first, with provenance and privacy.
- **Entities** (`entities.ts`): fifteen kinds with stable deterministic ids, and
  relationships as edges.
- **Recommendation** (`recommendation.ts`): structured semantics and a renderer
  that composes the sentence from them, or refuses.
- **The JSON boundary** (`validation.ts`, `wire.ts`): nothing throws; bad rows
  become inspectable rows.

### `src/memory/` — storage and projections

Canonical store interface; IndexedDB adapter; in-memory adapter; supersession
and retraction; fact resolution; the projection mechanism with a fingerprinted
read-through cache; the snapshot document and a migration runner.

### `src/synthetic/` — invented histories

Seven scenarios, each a JSON document loaded through the same parser a pasted
file uses.

### `src/features/qa/` — the laboratory

Scenario buttons, a JSON editor, date and time travel, and an inspector over
canonical facts, inferred facts, stale facts, questions, recommendations,
entities, relationships, unreadable rows and history.

**Product behaviour changed:** yes — there is a memory now, and a way to look at
it.
**Semantic behaviour changed:** yes — this phase is the semantics.

## Open defects

None. Two were found and closed during the phase — DEF-0001 and DEF-0002.

## Decisions made

D-011 … D-020 in [`DECISION_LOG.md`](DECISION_LOG.md).

---

# Phase 0 — New repo foundation + phone preview

**Status: GREEN, owner-approved.**

## Build identity

|                       |                                                             |
| --------------------- | ----------------------------------------------------------- |
| First verified deploy | `cc6624b`                                                   |
| Stable Preview URL    | https://bill6006.github.io/life-command-os-rebuild/preview/ |

The live `build-info.json` served exactly that SHA while the production root
simultaneously served its placeholder, confirming that a preview deploy does not
move production.

## Verification

| Gate                            | Result                                       |
| ------------------------------- | -------------------------------------------- |
| Privacy scan                    | Clean                                        |
| Format, lint, typecheck         | Pass                                         |
| Unit tests                      | 19 passed / 19                               |
| Browser tests                   | 33 passed / 33 — 11 tests × 360, 430, 1280px |
| Production build                | Pass                                         |
| Deployed SHA matches checkpoint | Asserted live in CI, and confirmed by hand   |

## What it delivered

Vite + React + TypeScript on strict settings; design tokens implementing the
section 24 visual contract; the app shell with hash routing; build identity
compiled in and published as `build-info.json`; stale-build detection; CI;
Preview and production separated on two paths of the `gh-pages` branch; the
required docs, including the canonical plan copied verbatim.

**Product behaviour changed:** yes — there was an app shell to look at.
**Semantic behaviour changed:** no.

## Decisions made

D-001 … D-010 in [`DECISION_LOG.md`](DECISION_LOG.md).
