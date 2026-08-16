# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `Max`
- **Conversation:** `NEW`
- **Why this level:** Phase 4 decides when the app may admit it no longer knows
  something, and turn that into a question worth a tap. Too eager is the
  questionnaire section 12 abolished; too patient is the hidden staleness
  section 63 forbids. It also introduces the first evidence the owner did not
  personally state, which is the point at which provenance stops being
  bookkeeping.
- **Why this conversation:** Phase 3 is closed and its context is spent. Phase 4
  builds on the engine rather than inside it, and a window that has to read the
  learning layer before extending it is likelier to notice what it does than one
  that remembers writing it.
- **Attach/reference:** Nothing. The prompt names the files to read. Do not
  attach or request any old Life Command OS document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 3 is complete and GREEN, approved by the owner on a phone. Begin Phase 4.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/
Phase 3 was approved on checkpoint 0e416d4 and closed at the commit after it. Work from main.

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/PHASE_STATUS.md — what Phase 3 delivered, what the phone test changed, and what it deliberately did not build
3. docs/DECISION_LOG.md — decisions D-001 to D-058 and their reasons
4. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, and the line between deciding and recording
5. docs/DEFECT_LEDGER.md — DEF-0001 to DEF-0020 and the discipline that closed all twenty. Read DEF-0020 in full; it is the largest and it is the shape of what a phone test finds.

Then read the engine you are building on, all of it: src/intelligence/. Start with engine.ts, then situation.ts, candidates.ts, constraints.ts, evaluate.ts, arbitrate.ts, explain.ts, guide.ts, moves.ts, questions.ts, lifecycle.ts, outcomes.ts, learning.ts, corrections.ts. Also src/memory/facts.ts, src/domain/concepts.ts, src/domain/windows.ts, src/domain/knowledge.ts and src/domain/records.ts.

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source. It also holds 32 commits that exist only on this machine, so never run git push, reset or clean against it.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Run npm run verify before every push. Not a subset of it. Run npm run test:browser before closing the phase.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

WHAT PHASES 1 TO 3 BUILT, AND WHAT YOU MUST NOT WEAKEN

A working intelligence kernel in src/intelligence/, pure and clock-free, with one entry point: decide(view, moment, options). It assembles the situation from resolved facts, generates candidates from the owner's own entities, filters what does not fit and records why, scores across seventeen dimensions, chooses one move or a valid non-action, explains it in the owner's particulars, records what the owner does about it, asks for the right kind of result when there is one to give, and learns from it. The QA inspector shows the full decision trace including what was learned, how much of it there was, and how far it moved the starting belief.

These are load-bearing. Breaking any of them is a regression, and each has a test that will fail:

- Unknown stays unknown. Four knowledge states, no default escape hatch, no valueOr (D-014). Nothing turns "never answered" into a zero or an average.
- A recommendation that cannot resolve its subject renders nothing (D-018). There is no fallback wording, ever.
- Canonical records are append-first. A correction is a new record; nothing is edited in place (D-015).
- Nothing below the UI reads the wall clock. The moment is always an argument (guarded in tests/unit/architecture-guards.test.ts). The clock lives in MemoryProvider, which refreshes on tab visibility and sets one timer for the instant the engine says the next outcome is due (D-050).
- There is exactly one arbitration path. No surface may import candidates, constraints, evaluate, arbitrate, advisor, moves or learning — features ask the engine or get nothing (guarded). lifecycle, outcomes and corrections are open to surfaces because they record rather than decide.
- The evaluator and the arbiter know no life area by name (D-030). A move is judged on what it demands, costs and pays back.
- The engine may name its own routines and never the owner's life (D-021). Four standing entities: sleep, winding down, a walk, easing off. Every other subject comes from the owner's history or the move is not proposed.
- The explanation may only cite evidence the decision actually leaned on (D-031), may not assert an absence from ignorance (D-038, DEF-0017, DEF-0019), and takes what a move was chosen over from the arbitration rather than from the winner (D-035).
- A question names what it is about (D-039), and is asked only when at least half its answers would land somewhere else (D-036), stopping once an answer has changed nothing (D-033).
- An episode is identified by what it is about, not by the record that created it (D-042). Two taps cannot make two episodes. Every lifecycle button is always drawn so nothing moves under a thumb (D-052).
- The bottom navigation has exactly four primary destinations; More is a header entry and QA lives inside it (D-028).
- Phase language appears in exactly two places — the build panel behind More, and the QA laboratory — both reading REBUILD_PHASE from src/platform/buildInfo.ts (D-034). No primary destination mentions a phase. Update REBUILD_PHASE when Phase 4 lands.
- Scenarios shown to the owner must be lives he recognises (D-041). He has full custody of his daughter Adaya; any scenario involving her carries the durable custody context. Fixtures that need a fact deliberately missing are built inside the test that needs them, not added to the scenario library.
- The deterministic baseline is the selected architecture (D-024). The hybrid model-assisted path still runs, still passes its guardrails, and is selectable in QA. tests/synthetic/intelligence-tournament.test.ts fails if the hybrid ever scores higher.
- No live model inference (D-025). Section 18 forbids permanent API secrets in the browser and forbids storing the owner's life history on a server for inference. Enabling it needs a small owner-authorised endpoint, which is an owner decision. Do not raise it unless asked.

THE OUTCOME AND LEARNING ARCHITECTURE — DEF-0020, AND THE PART PHASE 4 TOUCHES

This is the most recent and most argued-over part of the system. Phase 3 shipped a version where one better/same/worse judgement stood in for four different facts; the owner found it on a phone and the repair took four exchanges. Do not undo it.

- Completion is the attempt, not the achievement (D-053). action-completion means the owner carried out the action the sentence asked for. It says nothing about whether the intended end state was reached. Fifteen minutes clearing the kitchen can be done in full and leave the kitchen half clear.
- An outcome record carries an explicit aspect: result | effect | comfort (D-054). Result is whether the intended end state occurred; effect is what it was worth afterwards; comfort is how it felt, where the experience is itself the fact. Whose result it is comes from the subject, not from a fourth aspect — "how did Adaya do" is a result about a development skill that links to her.
- Only an effect answer carries a sentiment. This is load-bearing: roughOutcomesFor reads 'worse' as "this topic went badly" and fires the weak-topic generator from it, so a result of "not at all" wearing that flag would produce a study recommendation off an evening that says nothing about studying.
- Which aspects a move produces is declared beside its profile in moves.ts, decided by one test: does the sentence name an end state, or only an activity? Eleven verbs produce one kind of evidence, three produce two, hold produces none.
- Direct result is its own learned quantity with its own dimension, and it is penalty-only (D-055). Its prior is 1 — a move achieves what it is for — so achieving it sits at the prior and abstains. That is what stops the one move with two aspects collecting two positive rewards for one good evening. Do not fold it into follow-through: follow-through asks whether the move can happen here at all, from unable-now, and perfect follow-through with a poor result is an ordinary evening.
- Effect answers are four absolute levels — 0.85 / 0.50 / 0.15 / 0.00 — including harm, because a walk that aggravated soreness and a walk that did nothing are not the same evidence (D-056). A delta model was proposed, worked through numerically and withdrawn: with no change meaning zero delta, a move that consistently does nothing keeps its prior forever. shrink() is unchanged and stays unchanged.
- Comfort is learned as friction (D-057), signed both ways, because its prior is a middling guess rather than a ceiling.
- A result of "not at all" ends the sequence and no effect question is asked (D-058).
- Declines reach appetite, inabilities reach follow-through, results reach direct-result, effects reach immediate-benefit or next-day-effect, comfort reaches friction. Five learned quantities and they cannot reach each other's. This is held by the code paths not meeting, not by a comment.
- One event is not proof: every learned belief is the prior pulled toward observation by n/(n+3) (D-046). Context similarity outranks recency, and below a floor an evening is not "a situation like this one".
- A belief correction is a watershed rather than a retraction (D-047), offered beside the decision it moved.
- Priors are immutable. MOVE_PROFILES is read and never written; the trace reports startedAt and landedAt separately and a test asserts the table is unchanged after a run.
- tests/synthetic/outcome-questions.test.ts holds all of this as class-wide sweeps over every verb and every aspect. A sixteenth verb is covered the moment it exists. Eight defects were reintroduced one at a time during the repair and all eight were caught.

PHASE 4 GOAL (plan section 49)

Make the system trustworthy without manual tab maintenance. The owner must never have to patrol Life pages to keep the app intelligent, and a life area must never sit quietly on months-old assumptions while the interface implies it is current.

BUILD

- a domain and sub-area coverage model
- concept-specific freshness — section 8 is explicit that freshness is not one universal number of days, and src/domain/concepts.ts already carries a horizon per concept, so the question is what coverage adds on top of it
- stale belief detection
- natural refresh opportunities — section 8's preference order is: use evidence normal life already produces, infer cautiously, create an action that produces evidence, ask one small question, and only then surface a "needs update" signal
- adaptive question selection
- guide resume after interruption
- stop asking when enough is known
- coverage status for the Life overview

INFERRED AND DERIVED EVIDENCE — OWNER REQUIREMENTS

Section 8's preference order puts "use trustworthy evidence already being generated by normal life" above "ask one small question", and Phase 3 deferred the clearest case to you: the morning after a protect-sleep or wind-down episode, the sleepHours reading the guide already collects IS the effect, and asking for it again is asking twice. Building that means writing outcome records the owner never typed, and the owner has set four conditions before any of it is introduced.

1. Inferred or derived outcome evidence must carry appropriately lower confidence and weight than explicit owner-reported evidence. Reuse the existing provenance and learning-weight path rather than creating another learning system. The weight is already `similarity * recencyFactor(days)` in learning.ts; a confidence factor from provenance.source belongs there, as one more term. PROVENANCE_SOURCES already contains 'derived', 'device' and 'model'.

2. Learning traces must preserve and expose evidence provenance, so the owner can tell explicit owner reports from derived, inferred or device evidence. Today LearningTrace.evidence is a bare RecordId[] and nothing carries the source, so "3 comparable results" could mean three things he said, three things the app concluded, or a mix — and he would have no way to tell before deciding whether to correct the belief. Do this before the first inferred outcome is written, not after.

3. Preserve the source-agnostic outcome architecture. Phase 4 writes the existing outcome record shape — aspect, about, observation, optional sentiment — rather than creating a second outcome path or a second learning path. Verify this before building: the read path in learning.ts asks four things of a record (it is an outcome, `about` names an episode's recommendation, the aspect matches, the observation is readable) and never once looks at provenance, so a derived record is already legible. The judgement about what a reading means — how many hours counts as "a real difference" — belongs in the matcher, not in learning.

4. Do not infer that an action occurred merely because a later result exists. The completion gate stays: outcomeWindowFor returns nothing unless the episode is completed, so inference can complete the loop and must never open it. A wind-down that was started and never marked done, followed by eight hours of sleep, produces no evidence — the app does not know he did it. Change this only if the canonical plan explicitly supports something different, and say where.

WHAT MUST BE TRUE

- The stale-evidence trigger exists in the engine and is currently almost unreachable, because nothing notices that a life area has gone quiet. Making it reachable is most of this phase.
- The limiter set is three: recovery, capacity, time. Stale coverage is the obvious fourth and belongs with the engine that can see it. Adding it changes what wins on quiet evenings, so expect to re-check G-005, G-008 and G-014.
- Section 63 is the specification for the failure to avoid: a domain may be quiet, stable or low priority, and must not silently remain based on months-old assumptions while the UI gives the impression the app is current.
- Section 12's rules still hold. The guide must be able to ask zero questions, and a coverage engine that generates questions is the most likely thing yet built to break that. DEF-0008 is the worked example of how a run of individually justified questions becomes "too many questions", and section 47 fails a phase outright on it.
- D-048's rule holds for any dimension you add: a dimension with nothing to say must carry no weight, because the score is a weighted mean and a zero at full weight moves the WORTH_DOING bar for every move. DEF-0019 is what happens when a dimension speaks while sitting at its own prior.

GATE — Phase 4 is not GREEN until all of these hold

- G-003 and G-007 pass as automated synthetic scenarios
- the eight existing golden scenarios still pass, unchanged: G-001, G-002, G-004, G-005, G-008, G-009, G-011, G-014
- the owner can ignore Life pages for a realistic synthetic period without the system silently freezing
- stale important areas eventually surface naturally
- no fixed "ask every domain" questionnaire, and the guide can still ask nothing
- if inferred or derived outcomes are introduced, all four owner requirements above hold and each has a regression
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build
- npm run verify passes from a clean checkout
- preview deploys automatically and the deployed Preview SHA equals the checkpoint SHA
- THE OWNER TESTS IT ON A PHONE AND ACCEPTS IT

Phase 2's gate was failed four times by the owner on a phone; eleven of that phase's fifteen fixed defects came from those passes. Phase 3 opened with a defect Phase 2 had deferred, found two more while fixing it, a fourth by printing the copy rather than asserting on parts of it, and a fifth — the largest — from the owner's first phone pass. The first diagnosis of that fifth defect was wrong and the owner corrected it. Expect the same: do not treat a green suite as evidence the phase is done, print what the owner will actually read, prove every regression fails when its defect is reintroduced, and when the owner disagrees with a diagnosis, check the code before defending it.

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Keep the kernel pure and clock-free.
- Write tests that verify semantic behaviour, not implementation paths. An exact-string assertion proves a string is stable, not that it is right — that is why DEF-0020 shipped.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate. DEF-0001 to DEF-0020 are the worked examples.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current.

CLOSING THE PHASE

End with the section 58 acceptance report: phase status, checkpoint SHA, deployed Preview SHA and whether they match, Preview URL, files changed, exact test counts, whether an owner phone test is required, product and semantic behaviour changes, open defects, deferred items, decisions made, next phase and role, the recommended Claude Code intelligence level, the CURRENT or NEW conversation instruction, one short reason for each, required references, and the complete next copy/paste prompt — all in the same response that closes the phase. Do not make the owner ask for the prompt.
```
