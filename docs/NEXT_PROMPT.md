# Next prompt

Canonical plan section 43. The intelligence level, model and conversation
instruction sit outside the prompt so the owner can switch Claude Code before
pasting.

**Phase 81 is GREEN**, approved after independent QA's round 3 retest returned
PASS. Product checkpoint `7e00dac`; QA-tested deployed SHA `caaf179`; report at
[`qa/PHASE_81_QA_HANDOFF.md`](qa/PHASE_81_QA_HANDOFF.md). Full closeout in
[`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 81 — Correctness and
truthfulness."

---

## NEXT CLAUDE ACTION

- **Model:** Opus-class (Claude Opus 5 or the nearest current equivalent)
- **Intelligence level:** High
- **Conversation:** **NEW — a fresh builder conversation for Phase 82**
- **Why this model:** Phase 82's hard packages are structural-judgement work
  rather than routine wiring — deciding what a "thread" is allowed to be
  without becoming a second recommendation engine, keeping a thread from
  overriding a dominant limiter, and re-cutting the scoring instrument
  (AUD-0035) in a change that moves every learned belief and every scenario
  expectation at once. That is architecture-adjacent design judgement, the
  same class of work Phase 3 and Phase 6 needed Opus-class for.
- **Why this level:** High is enough. The work packages, their order, their
  dependencies and their gate are already fully specified in section 7 of the
  audit — this is disciplined execution against a written spec, not open
  invention. Max is not needed.
- **Why a new conversation:** a genuinely new phase after GREEN, per
  `qa/README.md`'s conversation rule and plan section 43's default routing.
  Phase 81's five-then-two repair history is not load-bearing context for
  Phase 82's work, which starts from a different part of the codebase
  (`direction.ts`, a new commitment-window record kind, a new `thread-fit`
  dimension) and has its own gate.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 81 is complete and GREEN,
approved by independent QA on round 3. Begin Phase 82 — the structural
intelligence skeleton.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Phase 81 was approved after independent QA's round 3 retest returned PASS, at
product checkpoint 7e00dac (QA-tested deployed SHA caaf179). The
independent-QA gate (D-077), the eleven-domains/ten-pages rule (D-078), and the
QA-handoff output rule (D-082 — every QA run or retest, PASS or FAIL, outputs
the complete next prompt automatically) all remain in force and unchanged.

WHAT PHASE 82 IS, AND WHAT IT IS NOT

Read docs/WHOLE_APP_INTELLIGENCE_AUDIT.md section 7 in full before anything
else — it is this phase's specification, and its own opening line is the test
that governs scope: "Membership is decided by one test and nothing else: would
Phase 9 approve the wrong product structure if this landed afterwards?" Nine
audit findings, six work packages, no owner-visible falsehood to fix — this
phase's gate is structural rather than truthfulness-based, which is a different
kind of acceptance than Phase 81 just went through. Do not import Phase 81's
gate shape onto this phase; read section 7's own gate instead.

Three findings that look like they belong here do not: AUD-0040, AUD-0045 and
AUD-0047 were in an earlier draft and were removed on re-examination. Section 7
explains why for each. Do not add them back without a reproduction that the
test above actually fails without them.

THE SIX WORK PACKAGES, IN THE ORDER SECTION 7 RECOMMENDS

1. Goal horizon and parts — AUD-0046, AUD-0021. AUD-0046 first (goalFit must
   read the horizon before parts build on it).
2. Commitment windows — AUD-0004. A new Life surface, new record kind, carrying
   provenance and recurrence from the start.
3. Threads — AUD-0020. The strongest member and the new persistent
   owner-visible object. Bounded to three concrete thread types with no generic
   creation UI — do not build a fourth or a generic mechanism "while you're in
   there."
4. Deferral — AUD-0024. A fifth Now state, depends on package 2 (hold cannot
   name a later block until commitment windows exist).
5. Growth state and occasion context — AUD-0015(a), AUD-0017. AUD-0017 is
   load-bearing: the extra tap makes the outcome answer a two-step flow, an
   interaction change, not a label change.
6. Re-cut and re-run — AUD-0035, AUD-0039. The re-cut of the scoring instrument
   itself, absolutely last, after package 3 (thread-fit is the dimension being
   cut around). The tournament is re-baselined in the same change. This is the
   highest-blast-radius change in the audit — every learned belief, every
   scenario's expected output and every golden profile moves. Do it once,
   deliberately, in one change, not incrementally.

Packages 1 and 5 have no dependency on anything else in this phase and may
float if a different order is more convenient. Packages 2→4 and 3→6 are hard
dependencies and must not be reordered.

THE GATE — section 7, six items, all structural

1. A thread never bypasses the arbiter — an architecture-guard test, per
   section 17.2's existing shape.
2. A dominant limiter overrides a thread — thread-fit weighted below
   bottleneck-fit, asserted directly.
3. A thread can be stopped in one tap, expires on its own, and explains why it
   is active.
4. hold names a real later block and cannot be returned when no later block
   scores higher.
5. The tournament is re-run and re-baselined on the re-cut instrument
   (AUD-0035, AUD-0039), with MAX_NUDGE expressed relative to the ranked
   spread rather than as an absolute.
6. No percentage, rank, grade or score about the child survives package 5 —
   the Phase 81 copy guard (g003-growth-evidence.test.ts) must still bite.
   Package 5 touches the growth model's data shape; prove the guard still
   catches a faithfully reintroduced violation before calling it green,
   exactly as Phase 81's own repairs were held to (canonical plan section 42).

READ, IN THIS ORDER

1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority (v1.2), read
   completely. Section 34 (module ownership), section 42 (the repair
   discipline — reproduce, name the class, regression, prove it fails
   reintroduced, fix, focused coverage, full gate — this now governs day-one
   work too, not only repairs), section 43 (the handoff workflow), section 58
   (report format).
2. docs/WHOLE_APP_INTELLIGENCE_AUDIT.md section 7 in full (read above), then
   the nine findings themselves in full: AUD-0046, AUD-0021 (goal horizon,
   H-adjacent sections), AUD-0004 (commitment windows), AUD-0020 (threads),
   AUD-0024 (deferral), AUD-0015(a) and AUD-0017 (growth), AUD-0035 and
   AUD-0039 (H.1 and its neighbour — the re-cut and the tournament rubric).
   Each finding's own "Implementation scope", "Risks" and "Tests required"
   rows are load-bearing, not decoration.
3. docs/qa/README.md — the independent QA protocol. This phase's gate is
   structural rather than copy-truthfulness, so read section 3a (D-082) again
   for how the retest loop and automatic next-prompt output apply regardless
   of gate shape.
4. docs/PHASE_STATUS.md — read the Phase 81 entry in full, especially "The six
   steps" and step 81.6/81.7's account of what a green regression can miss
   when it only sweeps reachable states rather than rendering a full
   catalogue. That lesson applies directly to package 6: a tournament
   re-baseline is exactly the kind of change where "the golden profiles still
   pass" can be true while the new scale is wrong in states the profiles do
   not reach.
5. docs/DECISION_LOG.md — D-109 (why Phase 82 exists and is only nine
   findings — read in full), D-077 (the QA protocol), D-078 (domains/pages),
   D-082 and D-092 (handoff format), D-097 (checkpoint equivalence), D-108
   (a guard is not a guard until its defect has been reintroduced and
   caught — read this one closely; it is what section 42 turned into
   mechanical steps and what package 6's tournament re-run must satisfy),
   D-114 through D-127 (Phase 81's decisions — background on the arbitration
   dimensions and copy discipline package 6 will re-derive constants against
   and package 3 will add a dimension alongside).
6. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, and the line between
   deciding and recording. `src/intelligence/` is the one brain; a thread must
   be read by `arbitrate.ts` as a dimension input the same way every other
   limiter and direction signal is, not as a side channel that can win outside
   the ranking. `OPEN_TO_SURFACES` in tests/unit/architecture-guards.test.ts is
   the enforced import list for `src/features/` — a new commitment-window
   surface and a threads list on Life read through `situation`/`decide` the
   same way every existing Life page does.
7. docs/DEFECT_LEDGER.md — DEF-0006 (the four-facts-collapsed-into-one class,
   relevant to keeping thread state and growth-occasion context from folding
   back into a single number the way an earlier phase's mistake did), and
   DEF-0080 through DEF-0086 (Phase 81's QA repairs — read for the pattern of
   how a rule correct in isolation broke when a second rule was added next to
   it, which is exactly the risk in adding thread-fit next to eighteen
   existing dimensions in package 6).

Then read the engine you are extending: src/intelligence/direction.ts (goal
state — package 1's foundation), src/intelligence/evaluate.ts (the eighteen
scoring dimensions and their weights — package 3 adds a nineteenth, package 6
re-derives the constants read against all of them), src/intelligence/arbitrate.ts
(the no-action reasons and near-tie handling — package 4's fifth state and
package 6's re-baselined MAX_NUDGE both land here), src/intelligence/guide.ts
and constraints.ts (Phase 81 just added the shown-ledger repetition rule and
the answersLimiter ordering here — thread-fit must not create the same
untested-interaction risk with them that QA-81-006 found), src/domain/records.ts
(every canonical record kind — commitment-window is a new one), and
src/synthetic/scenarios.ts (the 21-scenario library every package 6 change must
be re-verified against).

HOW THIS PHASE ENDS — READ BEFORE YOU START

You may not approve your own phase. This is owner decision D-077 and it is not
negotiable by anything you conclude while building.

When you believe the implementation is complete:

- the phase becomes YELLOW — READY FOR INDEPENDENT QA. Never GREEN.
- write docs/PHASE_STATUS.md's Phase 82 entry to the report format in section
  58: what was built, per work package; the gate, item by item, with where
  each is proved; anything you believe is still weak, named rather than
  hidden — Phase 81's "Open, and named rather than left to be found" section
  is the model for this, and it is what let QA adjudicate the sore/rested
  ordering instead of having to discover it.
- run the full clean-tree npm run verify, the browser suite at all three
  widths, the Android-style gate against a deployed build, and the tournament
  re-run required by gate item 5.
- deploy a checkpoint and prove its relationship to the live deployed SHA with
  scripts/checkpoint-equivalence.mjs, never string equality (D-097).
- write the complete independent-QA handoff into docs/NEXT_PROMPT.md, to a NEW
  Codex conversation (this is a first submission, not a retest), per D-082 and
  D-092: the model, the level, the conversation instruction, and a short
  standalone launcher, all in the same response, without waiting for another
  owner turn.

Do not start Phase 9 or the later intelligence phase. Do not add AUD-0040,
AUD-0045 or AUD-0047 back into scope. Do not touch anything in canonical plan
section 10 (DO-NOT-CHANGE) or add a percentage, rank, grade or score about
Adaya anywhere.
```
