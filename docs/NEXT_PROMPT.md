# Next prompt

**Phase:** 83 — **the instrument, and the things that are untrue**

**Actor:** Claude Code / **builder**.
**Conversation:** **NEW** — not the Phase 82 builder, and not the adjudication
conversation.
**Model:** Claude Opus-class.
**Intelligence level:** **Max.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Why Max, and why the obvious answer is wrong here.** A first draft of this
handoff recommended High, reasoning that the phase is small, bounded and mostly
correctness. That is precisely the misclassification
[`qa/README.md`](qa/README.md) warns about: _"each individual repair reads like
ordinary work — a sentence to reword, a filter to reorder — so 'normal repairs'
is the natural classification and it has already been chosen twice."_ The
standing owner decision of 2026-08-25 covers **any further phase created by the
audit campaign's adjudication**, which is this one. It also holds on the merits:
83.1 is a semantic distinction spanning `engine.ts`, `situation.ts`,
`lifecycle.ts` and the Now surface; 83.3 is the privacy boundary that four
separate Phase 82 QA rounds each got right at one layer and wrong at the next;
and 83.0 is an acceptance instrument, which is the hardest thing in this
repository to design and the thing every green gate so far has been weakest at.
**Judge the level by what the change has to reason about, not by how large the
diff looks.**

**The QA retest block is Codex's and takes `High`, never `Max`.** Codex has no
Max level, the application will not switch to its top level under automation, and
a retest handoff asking for Max stops the orchestrator with the level unset. That
has happened twice. Do not copy this phase's Claude level into a Codex block.

---

## Status — READY TO DISPATCH

**Phase 82 is GREEN**, closed by independent QA on 2026-08-27 at product
checkpoint `5dd55cc` after twelve rounds. Nothing here reopens it.

**The product adjudication is complete and approved.** It is
[`PRODUCT_ADJUDICATION.md`](PRODUCT_ADJUDICATION.md); the owner approved it with
amendments on 2026-08-27 and the governing decisions **D-158 … D-173** are
written. **This phase is blocked on no owner decision.**

**This file replaces the held handoff of the same number.** The previous
`NEXT_PROMPT.md` carried `**Phase:** 83 — product adjudication`. That round was
never dispatched through the orchestrator — no `PHASE_83_QA_HANDOFF.md` exists —
and the owner ran the adjudication directly. **Routing 83 now belongs to the
build phase specified below, and the held handoff's scope is superseded rather
than reused.** Do not go looking for it.

---

## The constraint this phase and every phase after it must be told

**Routing phase integers are read as bare integers, and only the numerically
highest phase's QA report is kept.** `handoff_source.build_candidates()` keeps
`max(qa_phase(r) for r in reports)` and discards every lower phase as history;
`_stated_or_inferred_phase()` parses the `**Phase:**` field as a bare integer, so
decimals truncate. With phases 5, 6, 7, 8, 81 and 82 on disk the surviving
maximum is **82**, so `9`, `09`, `8.3` and `9.1` all parse at or below it and
**never route**.

**This is wider than Phase 9.** Canonical Phases **10, 11 and 12 are equally
unroutable**. The full map is plan **section 43A** and **D-159**:

| Product / canonical name                                 | Routing |
| -------------------------------------------------------- | ------- |
| The instrument, and the things that are untrue           | **83**  |
| What the owner is trying to become                       | **84**  |
| **Canonical Phase 9** — visual coherence, motion, mobile | **90**  |
| Later intelligence — Reach, then Validity                | **91**  |
| **Canonical Phase 10** — performance, PWA, reliability   | **92**  |
| **Canonical Phase 11** — adversarial hardening           | **93**  |
| **Canonical Phase 12** — release                         | **94**  |

Canonical phase names are unchanged and canonical Phase 10 is **not** re-scoped
by receiving a routing label (D-109 stands). A QA round does **not** get a new
integer: rounds 1…n of this phase all carry **83**.

---

## What this phase is

**Phase 81's shape, deliberately: the instrument first, then the things the app
states or does that are wrong.** It is small, it is bounded, and it exists so
that routing 84 and canonical Phase 9 are built and approved on a product that is
not lying to the owner.

It is **not** the destination model. That is routing 84 and it must not start
here.

### Why it comes before routing 84 rather than with it

The adjudication split them because **routing 83 is blocked on nothing and
routing 84 was blocked on four owner decisions**. Those decisions have since
landed, but the split stands on the owner's explicit instruction — _"Do not merge
them"_ — and on the better reason underneath it: 83.0's output is 84's brief. The
enumerated list of points where an ordinary owner journey **cannot** proceed is
what tells routing 84 where the real acquisition gaps are, rather than routing 84
guessing.

---

## Scope — five work packages

Findings prefixed `F` are the owner-use review's
([`qa/WHOLE_APP_OWNER_USE_REVIEW.md`](qa/WHOLE_APP_OWNER_USE_REVIEW.md)).

### 83.0 — The ordinary-use instrument (F38, D-161) — **do this first**

Everything after this is verified with it.

A journey fixture family that starts from a **near-empty store** — not a rich
seeded history — and runs the loop the review says has never been proved:

> unknown aspiration → discovery → object creation → real action → interruption →
> concrete outcome → correction → changed recommendation

Plus the two histories the rest of this phase needs and the library does not
have:

- a store of **four records**, which is F39's case;
- a history whose only completion of a move is **exactly three days before** the
  read, which is F43's case.

**The deliverable is not only the fixtures.** It is the enumerated list of the
points where an ordinary journey **cannot proceed today**, each with the reason.
That list is routing 84's brief and it goes in the phase record.

**Why it is first:** every gate in this campaign so far is green against fixtures
authored by the same process that wrote the code, and an independent reader with
a browser then found 44 things that 1,332 unit tests, 501 browser assertions, a
93-check Android gate and twelve rounds of independent QA did not. Phase 81 put
AUD-0008 first for exactly this reason.

### 83.1 — Occurrence identity (F43, and the part of F41 it explains) — **D-160**

**A confirmed defect, with the mechanism already located.** Do not re-diagnose
it; verify the diagnosis and repair it.

`stateOfChosen()` (`src/intelligence/engine.ts:944`) resolves the chosen move's
state by matching `(verb, object.id)` across `situation.recentMoves` —
a **three-day** window (`src/intelligence/situation.ts:1282`,
`addLocalDays(moment.now, -3, zone)`) — with **no day filter in the match**.
`TRANSITIONS.completed` is `[]` (`lifecycle.ts:76`) and `NowScreen.tsx:644-656`
disables every action not in `availableActions(state)`. So a move completed up to
three days ago makes today's freshly generated recommendation read
_"Where this stands — Done"_ with all five controls inert.

**Two things must not be "fixed" on the way past.**

- **The lifecycle planner is already correct.** `openEpisode()` keys on
  `(target, dayId)` and `planLifecycle` writes correctly. The defect is in the
  display path only.
- **`recentMoves`' three-day window is correct for what it was built for.**
  `recent-duplication` and learning both need to see beyond today. **Narrow the
  match, never the window.**

Then re-run F41's unreproduced preview-state observations (E22, E32, E34) against
the repaired build and report which survive. **No cause may be named for a
survivor without an isolated reproduction** — the review's own rule, and it
holds.

### 83.2 — Sentences that overstate (F39, and F33's residual)

`nothing-proposed` emits _"There is plenty of history here"_ whenever
`history.all.length > 0` (`engine.ts:902`) — any non-empty history, four records
included. **D-153 already forbids this** ("a reading of one moment may not be
worded as a claim about the whole record"); round 8 named the rule and this
instance was never swept. Ground the quantity language in what the sentence
actually counted.

Sweep the class rather than the instance, the way 81.7's copy catalogue did.

Plus F33's residual acceptance case: the weak-topic recommendation names repeated
`/26` mistakes while its evidence panel emphasises topic and time rather than the
failed-retrieval evidence that actually drove it (review E19). AUD-0027/0028
shipped in Phase 81, so this is **an acceptance test, not a new capability**.

### 83.3 — The private promise (F30, honesty half) — plan section 11

The Private page promises _"Nothing here appears anywhere else"_
(`src/features/life/domainPages.ts:104`) while `privacy.ts:72` renders
**"Private entry"** on Timeline — and `src/features/export/compose.ts:676`
documents that behaviour knowingly. Concealing the sentence is not concealing the
entry.

**Either the existence and timing are also withheld, or the promise says what it
actually covers.** One of the two changes.

**This is a truthfulness repair and it is not gated on D-167.** D-167 settles
whether private evidence may _influence_ recommendations (one owner permission,
default off) and belongs to routing 84. This package is about a sentence that is
currently false, and it lands whatever that permission later does.

### 83.4 — Form components (F40)

`src/features/life/DomainPage.tsx:694` is a bare `<input type="text">` with
`placeholder="What's changed"` and **no `aria-label` and no `<label htmlFor>`** —
in a file that uses `aria-label` correctly three times elsewhere. Every
owner-facing input gains a real accessible name and a stated expectation of what
the app wants and how the answer will be used.

**Why now:** Phase 9 designs repeated components. An unlabeled input inherited
into the design system becomes settled design, and Phase 11's accessibility
attack would then be re-opening a passed phone gate.

---

## Dependency order

**83.0 → 83.1 → {83.2, 83.3, 83.4} in any order.** 83.0 is absolutely first.

---

## Decision-log entries that must exist before the code

All four are **already written and approved** — this phase implements against
them rather than authoring them:

- **D-160** — a move's identity is what learning pools on; a state belongs to one
  occurrence on one day. (83.1)
- **D-161** — a capability is accepted when an ordinary owner can reach it from a
  near-empty store. (83.0, and it binds 84, 90 and 91)
- **D-159** — routing integers, and the map. (the whole campaign)
- Plan **section 11**'s new metadata paragraph. (83.3)

Anything this phase discovers that needs a new rule gets its own entry, written
**before** the code that implements it, in the repository's standing pattern.

---

## Gate

Independent QA is Codex, cold, auditing meaning before duplicating gates
(D-077 / D-090). Five acceptance items:

1. **A completion of the same move on any earlier day cannot settle today's
   recommendation or disable its controls** — proved on 83.0's three-day fixture
   and by faithfully reintroducing the defect and watching the guard fail.
2. **No owner-visible sentence asserts a quantity of history the app did not
   count** — proved by rendering the copy catalogue at every history size,
   including four records, rather than only the sizes the library reaches.
3. **The Private page's promise and Timeline's behaviour agree** — proved from
   both ends.
4. **Every owner-facing input has an accessible name**, swept.
5. **The ordinary-use journey from a near-empty store completes end to end**, and
   the points where it cannot proceed are **enumerated with reasons** in the phase
   record.

Plus the standing gates: `npm run verify` from a clean checkout, browser at three
widths, the Android-style gate on the deployed build, the privacy scan, the block
sweep, and the standing copy guards — **no percentage, rank, grade or score about
the child, and no score about the owner** (D-162, and Phase 81's guard must still
bite).

---

## What must not happen in this phase

- **No destination object, no milestone, no baseline.** That is routing 84's
  package 1 and starting it here would make this the mega-phase the adjudication
  refused.
- **No new domain.** _Love / Dating / Romantic Life_ is approved (D-168) and is
  routing 84's.
- **No consent model.** D-167's permission is routing 84's package 6.
- **No new questioning surface.** D-163's second agenda is routing 84's package 4.
- **No scoring change of any kind.** Phase 82 re-cut the instrument and
  re-baselined the tournament (D-137, D-138); this phase must not disturb a weight
  or a dimension.
- **No live model.** D-172 keeps D-024/D-025 standing through 83 and 84.
- **No reopening of Phase 82 or anything before it.** The twelve rounds in
  `qa/PHASE_82_QA_HANDOFF.md` are the independent record and are not edited.
- **No alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`.** It is now a tracked,
  durable repository artifact and this phase reads it.
- **No orchestrator changes.**

Everything in audit section 10's DO-NOT-CHANGE list carries forward, and
`PRODUCT_ADJUDICATION.md` section 11 adds to it.

---

## Handoff — routing phase 83

**Model:** Claude Opus-class.
**Intelligence level:** **Max** — the standing audit-campaign rule, and see the
reasoning at the top of this file.
**Conversation:** a **new** conversation. Not the Phase 82 builder, and not the
adjudication conversation — the first carries twelve rounds of repair context and
the second carries the whole 44-finding argument, and this phase needs neither.

```text
Build routing Phase 83 of Life Command OS: "the instrument, and the things that
are untrue."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Phase 82 is GREEN at product checkpoint 5dd55cc. The product adjudication that
followed it is complete and approved by the owner, and its decisions D-158..D-173
are written. This phase is blocked on nothing.

Read, in full, before writing code:
1. docs/NEXT_PROMPT.md          — this handoff, and your scope
2. docs/PRODUCT_ADJUDICATION.md — why this phase exists and what it excludes
3. docs/DECISION_LOG.md D-158..D-173 — the rules you build against
4. docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md — findings F38, F39, F40, F41, F30, F43
5. docs/CANONICAL_REBUILD_PLAN.md sections 11, 43A, 54

Build the five work packages in docs/NEXT_PROMPT.md, 83.0 first and absolutely
so. 83.0's enumerated list of points where an ordinary owner journey cannot
proceed is a deliverable, not a note — routing 84 is scoped from it.

83.1 is a confirmed defect with the mechanism already located in D-160. Verify
the diagnosis, then repair the display path only: openEpisode and planLifecycle
are already correct, and recentMoves' three-day window must keep its width.
Narrow the match, never the window.

Constraints:
- Your **Phase:** field is 83. Never 9, 09, 8.3 or 9.1 — those parse at or below
  82 and silently never route. Plan section 43A has the full map.
- Do not build the destination model, a new domain, the consent model, a new
  questioning surface, or any scoring change. Those are routing 84's.
- Do not reopen Phase 82 or anything before it.
- Do not alter docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md.
- Stop at YELLOW — READY FOR INDEPENDENT QA and write
  docs/qa/PHASE_83_QA_HANDOFF.md. A builder conversation may not approve its own
  phase (D-077).

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Claude Opus-class. **Level:** Max.
**Conversation:** a **new** conversation, not the Phase 82 builder and not the
adjudication conversation.

```text
Build routing Phase 83 of Life Command OS.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute it exactly as the handoff there
specifies. Phase 82 is GREEN and the product adjudication is approved; you are
blocked on nothing. Build 83.0 first.

Your **Phase:** field is 83 — never 9, 09, 8.3 or 9.1, which never route.

Stop at YELLOW and write docs/qa/PHASE_83_QA_HANDOFF.md. Do not approve your own
phase.

Do not ask me to paste file contents.
```
