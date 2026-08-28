# Routing 84 — owner-directed addendum to the Round 1 repair

**Status:** owner instruction, issued 2026-08-27 during the Round 1 repair.
**Actor:** the **current routing 84 builder conversation** — the one holding the
uncommitted repair. Not a new conversation, and not the adjudication conversation
that wrote this file.
**Routing:** none. This file is invisible to the orchestrator, which routes only
on `docs/NEXT_PROMPT.md` and `docs/qa/PHASE_<digits>_QA_HANDOFF.md`
(`handoff_source.py:21-22`). It carries no completion marker and must not be
given one.

---

## What this is, and what it is not

Two **owner-use corrections to existing routing 84 paths**. The owner hit both in
real use of the deployed build.

**Neither is a QA finding.** Codex raised neither in Round 1. They are owner-directed
scope added to the repair round, and that has one consequence the builder must
honour: **the Round 2 handoff must declare them plainly**, so independent QA meets
them as declared scope rather than as unexplained diff. Do not fold them into a
QA-84-xxx number; they are not QA's.

**Explicitly not in scope: semantic interpretation.** No parsing of what the
owner's words mean, no inferred domain, no model, no hybrid. D-024 and D-025 stand
for this phase, and D-172 reserves the inference question for adjudication before
routing 91. The adjudication of 2026-08-27 considered a routing 85 for semantic
capture and **rejected it** — semantic capture is routing 91 package 1. This
addendum is the part that does **not** need it.

**Everything Codex raised in Round 1 stands.** QA-84-001 through QA-84-006 are
unchanged, not reprioritised, and not replaced. QA owns its findings and its
rounds; the builder does not edit them. This addendum is additional, never
substitutive. **The builder does not declare GREEN** (D-077).

---

## Fix 1 — a blocker cause for "I cannot leave her"

### The owner case

Now recommends _"Move for 25 minutes: a walk."_ The owner cannot, because **his
daughter is asleep and there is nobody else to watch her.**

### What happens today

`BLOCKER_OPTIONS` (`src/intelligence/blockers.ts:88-131`) holds seven causes. The
closest is `someone-needs-me` — label _"Someone needed me"_, stored statement
_"Somebody else needed the time."_, `standing: false`.

That is **semantically wrong for this case** and it is inert. Nobody needed his
time; he was not free to leave. And with `standing: false`,
`standingBlockerRecords` (`:312-342`) returns `[]`, so **no durable record is
written at all**. The system learns one canned string on one episode and forgets
it.

### What to build

One additional cause in `BLOCKER_OPTIONS`, with `standing: true`, meaning:

- he must remain where he is;
- because of a caregiving or supervision responsibility;
- and therefore cannot leave the house or location right now.

Wording is the builder's, subject to the rules below. `blockers.ts` is **clean in
the working tree** — no uncommitted changes — so this is a contained edit.

### Rules this fix must obey

1. **It is not a refusal and not a dislike.** D-045's separation of inability from
   decline from effect is the whole reason the reason is worth capturing. It must
   reach `owner-preference` through no path at all.
2. **`standing: true`**, so `standingBlockerRecords` writes a `ConstraintRecord`
   the domain page lists under _"Things you said were in the way"_ and the owner
   can lift with **Not true any more** (`DomainPanels.tsx:758-789`,
   `DomainPage.tsx:379-387`). That is what "durable enough for later intelligence
   to use" means here.
3. **Do not claim the engine acts on it, because it does not.** This is the rule
   that matters most and it is easy to break by accident. Verified in the tree:
   `applyConstraints` never reads `situation.constraints`
   (`constraints.ts:201-349`); `cautionsFor` matches `constraint.concept` against
   `candidate.leansOn` (`evaluate.ts:1106-1112`), and no `leansOn` anywhere
   contains a `blocker.*` concept, so that branch **cannot fire**;
   `constraints.ts:25-28` records the non-enforcement as deliberate — constraints
   are _"attached as cautions and shown, not enforced."_
   **So no owner-visible string may promise that the walk will stop being
   offered.** Say what was recorded. Do not say what will follow from it.
   G-009 and D-018 discipline applies: never claim knowledge the system does not
   act on.
4. **No `until`.** No blocker path sets one today and this fix does not invent
   expiry semantics. The lift control is the owner's way out.
5. The seven existing causes keep their ids, labels and statements. This is an
   addition.

### Acceptance

- Choosing the new cause writes a `ConstraintRecord` that survives the block, the
  day, and a reload, and appears on the relevant domain page.
- **Not true any more** withdraws it, and the withdrawal is a record rather than a
  deletion.
- A copy guard asserts that no owner-visible string on this path claims a future
  recommendation will change. Prove it by reintroduction: put such a sentence in
  and watch the guard fail.
- The block-sweep and no-action copy catalogues still pass at every block.

### Deliberately not in this fix

Enforcement. Making a later recommendation actually respect the constraint needs a
supervision/egress concept (none of the seventeen in `concepts.ts:230-253` fits), a
candidate attribute for "requires leaving the house" (nothing in `candidates.ts` or
`ACTION_VERBS`), and reversal of `constraints.ts:25-28`. That is **F08 blocker
aggregation, adjudicated to later Validity**, and it is the worked example that
forces D-172's adjudication before routing 91. Capturing it honestly now is what
makes that possible later.

---

## Fix 2 — Discovery stops bypassing the confirmation contract

### The owner case

Insights asks _"What do you hope Career & Learning eventually looks like?"_. The
owner types **"More money"** and presses **That is it**.

He believed he was confirming an interpretation. He was not.

### What happens today

`Discovery.tsx` **never imports `proposeAuthoring`.** Its destination branch is a
direct write:

```
return destinationRecords({ aim: said, domain: asked.domain }, situation, at)
```

The domain comes from the prompt, the text goes in verbatim, and **no
interpretation, no `creates`, no `unknowns` is ever shown.** The domain-page
authoring panel has the full propose-and-confirm contract; the discovery card —
the surface the owner actually used — does not.

This is the same class as QA-84-005, one surface across: a confirmation that does
not describe what will happen. There, the sentence was wrong; here, there is no
sentence.

### The problem with the instruction as written, and the decision it needs

**"Route it through the existing `proposeAuthoring` contract" cannot be done as
stated.** `AUTHORABLE_KINDS` (`authoring.ts:94-101`) is six kinds — goal, routine,
person, place, skill, obligation — and **`destination` is not among them**.
`proposeAuthoring` has nowhere to put one.

Two ways out:

|         | Approach                                                              | Cost                                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** | Add `destination` to `AUTHORABLE_KINDS`                               | Four module-private `Record<AuthorableKind, …>` tables gain a row — `ENTITY_FOR`, `INTERPRETATION`, `NOT_ASSUMED`, `RECORDS_MADE`. They are exhaustive by type, so this is a compile error until complete, which is the good news. But `ENTITY_FOR` would need a destination entity kind, and a destination is not an authorable _thing in the world_ the way a person or a place is. |
| **(b)** | A `proposeDestination()` returning the same `AuthoringProposal` shape | No table churn. Keeps the six-kind exhaustiveness intact. Composes with `milestoneConfirmation()`, which this repair has **already written** for exactly this path.                                                                                                                                                                                                                   |

**Recommendation: (b).** It is the continuation of work already in flight rather
than a widening of a closed set, and `milestoneConfirmation()` is three-quarters
of it. The builder holds context this file does not and may choose (a) with a
reason — but it should choose deliberately and record which, and why, in the
decision log before the code.

### Rules this fix must obey

1. **The owner's exact words are preserved.** `aim` stays byte-identical to what
   he typed. D-162 already forbids scoring it; this forbids editing it.
2. **No inferred domain.** The destination is filed under `asked.domain`, exactly
   as today. "More money" under a Career prompt stays Career. Proposing a second
   reading is routing 91's work and must not appear here.
3. **The proposal must state what it is not assuming.** `unknowns` is the half
   that earns a confirmation — for a bare aim with no milestone, it says so.
   `milestoneConfirmation()` already establishes the honest empty case; reuse it
   rather than writing a second sentence with the same job.
4. **The confirmation must be true.** QA-84-005 is the standing lesson: a sentence
   a surface composes inline is a sentence no test can read. Compose it in
   `authoring.ts` where a test can hold it to what is actually written.
5. **No new visual language.** That is canonical Phase 9's budget and routing 84
   was held to it. Reuse the existing panel chrome.

### Acceptance

- From the near-empty store, answering the Career discovery prompt with **"More
  money"** shows an interpretation, what will be created, and what is **not**
  being assumed, **before** anything is written.
- Declining writes nothing at all.
- Confirming stores `aim` byte-identical to the input, in the prompt's own domain.
- A test reads the composed confirmation and asserts it against the records
  actually produced — the QA-84-005 shape, on the destination path.
- The bypass cannot come back: assert that `Discovery.tsx` reaches record builders
  only through a proposal. `tests/synthetic/journey.ts` already proves claims of
  this kind against source (`everyBuilderReachedFromAFeature()`); extend that
  instrument rather than writing a comment.

### Deliberately not in this fix

Any understanding of the phrase. "More money" is stored, confirmed, and left
alone. Whether it means a Money aim, what amount, what horizon — routing 91
package 1, per the approved adjudication.

---

## Process notes for the Round 2 handoff

1. **Commit QA's Round 1 first, on its own.** `docs/qa/PHASE_84_QA_HANDOFF.md`
   carries **+363 uncommitted lines** — QA's own Round 1 report, which the builder
   may not edit (D-077). It should land as its own commit so the history shows
   QA's finding preceding the repair, rather than the two arriving fused.
2. **Declare this addendum's scope in the Round 2 handoff**, named as owner-directed
   and separate from QA-84-001…006.
3. **`docs/NEXT_PROMPT.md` is stale** — it still dispatches the pre-Round-1 Codex QA
   run for `42667ea`, with the completion marker at line 200. It must be rewritten
   as the Round 2 retest dispatch, addressed to the **same** Codex conversation.
4. **`docs/PHASE_STATUS.md` still reads "READY FOR INDEPENDENT QA"** while Round 1
   returned FAIL. Correct it.
5. **Levels:** the Claude repair block is **Max** (standing owner decision,
   `qa/README.md`). The Codex retest block is **High** — Codex has no Max and it
   stalls the orchestrator. Do not copy one into the other.
6. **Do not create any `PHASE_85_*` file.** `build_candidates()` keeps only
   `max(qa_phase)` and `_freshness` counts dirty files by mtime, so a phase-85 QA
   filename existing on disk — committed or not — would silently drop
   `PHASE_84_QA_HANDOFF.md` out of the candidate set and orphan this phase's QA
   loop mid-repair.
7. **Delete this file at the routing 84 GREEN closeout.** It is a working
   instruction, not a governing document. What survives it is the decision-log
   entries the two fixes produce.
