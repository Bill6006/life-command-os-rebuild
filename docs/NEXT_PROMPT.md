# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `Max`
- **Conversation:** `NEW`
- **Why this level:** Phase 3 is where learning starts changing later decisions,
  and the failures it has to avoid — a decline read as "ineffective", one event
  becoming proof, a subject lost through a follow-up — are judgement calls about
  meaning rather than typing.
- **Why this conversation:** Phase 2 is closed and its context is spent. A fresh
  window that has to read the engine before changing it is likelier to notice
  what it actually does than one that remembers writing it — and Phase 2's four
  phone passes showed that reading the trace beats recalling the intent.
- **Attach/reference:** Nothing. The prompt points at the files to read. Do not
  attach or request any old Life Command OS document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 2 is complete and GREEN, approved by the owner on a phone. Begin Phase 3.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/
Phase 2 closed at checkpoint bd2b5fa9fcee3009c71551ff63e3774120a28c1c.

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/PHASE_STATUS.md — what Phase 2 delivered, and what it deliberately did not
3. docs/DECISION_LOG.md — decisions D-001 to D-041 and their reasons
4. docs/ARCHITECTURE_BOUNDARIES.md — module ownership
5. docs/DEFECT_LEDGER.md — DEF-0001 to DEF-0016, the discipline that closed fifteen of them, and the one still open

Then read the engine you are building on, all of it: src/intelligence/. Start with engine.ts, then situation.ts, candidates.ts, constraints.ts, evaluate.ts, arbitrate.ts, explain.ts, guide.ts, moves.ts, questions.ts. Also src/memory/facts.ts, src/memory/view.ts, src/domain/records.ts and src/domain/knowledge.ts.

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source. It also holds 32 commits that exist only on this machine, so never run git push, reset or clean against it.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Run npm run verify before every push. Not a subset of it. Run npm run test:browser before closing the phase.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

WHAT PHASE 2 BUILT, AND WHAT YOU MUST NOT WEAKEN

A working intelligence kernel in src/intelligence/, pure and clock-free, with one entry point: decide(view, moment, options). It assembles the situation from resolved facts, generates candidates from the owner's own entities, filters what does not fit and records why, scores across fifteen dimensions, chooses one move or a valid non-action, and explains it in the owner's particulars. There is a full decision trace in the QA inspector, and an adaptive guide that asks one question at a time.

These are load-bearing. Breaking any of them is a regression, and each has a test that will fail:

- Unknown stays unknown. Four knowledge states, no default escape hatch, no valueOr (D-014). Nothing turns "never answered" into a zero or an average.
- A recommendation that cannot resolve its subject renders nothing (D-018). There is no fallback wording, ever.
- Canonical records are append-first. A correction is a new record; nothing is edited in place (D-015).
- Nothing below the UI reads the wall clock. The moment is always an argument (guarded in tests/unit/architecture-guards.test.ts).
- There is exactly one arbitration path. No surface may import candidates, constraints, evaluate, arbitrate, advisor or moves — features ask the engine or get nothing (guarded).
- The evaluator and the arbiter know no life area by name (D-030). A move is judged on what it demands, costs and pays back. This is what makes G-005 and G-008 pass for the right reason.
- The engine may name its own routines and never the owner's life (D-021). Three standing entities: sleep, winding down, a walk. Every other subject comes from the owner's history or the move is not proposed.
- The explanation may only cite evidence the decision actually leaned on (D-031), may not assert an absence from ignorance (D-038), and takes what a move was chosen over from the arbitration rather than from the winner (D-035).
- A question names what it is about (D-039), and is asked only when at least half its answers would land somewhere else (D-036), stopping once an answer has changed nothing (D-033).
- The bottom navigation has exactly four primary destinations; More is a header entry and QA lives inside it (D-028).
- Phase language appears in exactly two places — the build panel behind More, and the QA laboratory — both reading REBUILD_PHASE from src/platform/buildInfo.ts (D-034). No primary destination mentions a phase. Update REBUILD_PHASE when Phase 3 lands.
- Scenarios shown to the owner must be lives he recognises (D-041). He has full custody of his daughter Adaya; any scenario involving her carries the durable custody context. Fixtures that need a fact deliberately missing are built inside the test that needs them, not added to the scenario library.
- The deterministic baseline is the selected architecture (D-024). The hybrid model-assisted path still runs, still passes its guardrails, and is selectable in QA. tests/synthetic/intelligence-tournament.test.ts fails if the hybrid ever scores higher, which forces that choice to be made again rather than inherited.
- No live model inference (D-025). Section 18 forbids permanent API secrets in the browser and forbids storing the owner's life history on a server for inference. Enabling it needs a small owner-authorised endpoint, which is an owner decision. Do not raise it unless asked.

PHASE 3 GOAL (plan section 48)

Complete the loop: a recommendation the owner acts on, an outcome that gets observed, and learning that changes what happens next.

BUILD

- the recommendation lifecycle: start, complete, decline, can't now, try another, pause/continue if useful
- outcome windows — when a result is due, which differs by kind of move (a sleep action is judged next morning, section 20)
- outcome capture, asked at the right moment and not before
- context-specific learning: what worked in situations like this one, not what worked on average
- recomputation after every lifecycle event
- duplicate protection, including double taps
- owner correction of a learned belief (section 62)

WHAT MUST BE TRUE OF THE LEARNING

Section 20 is the specification and every line of it is a defect waiting to be written:
- a rejection is not evidence the move is ineffective
- can't-now is evidence about the situation, not about the move
- one success is not proof
- context similarity matters more than date proximity
- same-block effects and next-day effects can differ
- a learned effect must be reversible when later evidence contradicts it

D-023 records that src/intelligence/moves.ts currently holds priors rather than learned effects — what each move demands, is worth tonight and tomorrow, costs to start, how long it takes, and which parts of the day it suits. Replacing those with something earned from this owner's outcomes is this phase's central job. Do it in a way that keeps the trace honest: the inspector must be able to show which learning influenced a decision and how much of it there was.

TWO THINGS YOU WILL NEED EARLY

- The clock advances on load, not continuously. MemoryProvider captures the moment once at mount. Every decision is a pure function of the moment it is given, so Phase 2 never needed more — outcome windows are the first thing that will. Decide deliberately how "a result is now due" is noticed, and do not solve it by making the kernel read a clock.
- DEF-0016 is open and was deferred by the owner. A strained owner in the late afternoon with no current study topic gets a correct wrong-time-of-day refusal on the only recovery moves available, and nothing else — "Nothing fits tonight" to someone nine hours down. Fixing it means adding a recovery move that suits the afternoon, which means a verb, a template, a move profile, a generator branch and its own copy. It is a natural fit for this phase. Read the ledger entry before deciding.

SCENARIOS TO ADD

At least G-004 (social opportunity — good energy, an appropriate setting, an active social-growth goal and no stronger bottleneck; a specific natural move may win, such as starting a conversation or giving a genuine compliment; no quota or gamification; the outcome records comfort and result) and G-014 (no-action is valid — a stable state where no move has positive net value).

The engine can already produce a valid non-action and does so on several scenarios, and a social generator already exists in candidates.ts. Neither is gated yet. Add matching scenarios to src/synthetic/scenarios.ts so the owner can tap through them, and to tests/synthetic so the gate runs them.

GATE — Phase 3 is not GREEN until all of these hold

- the six existing golden scenarios still pass, unchanged: G-001, G-002, G-005, G-008, G-009, G-011
- G-004 and G-014 pass as automated synthetic scenarios
- a completed action demonstrably changes later reasoning
- a decline is not mislabelled ineffective
- can't-now changes the situation appropriately
- one event does not become proof
- the semantic subject survives through the follow-up question
- a double tap creates no duplicate episode
- the phone flow feels fast
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build
- npm run verify passes from a clean checkout
- preview deploys automatically and the deployed Preview SHA equals the checkpoint SHA
- THE OWNER TESTS THE LOOP ON A PHONE AND ACCEPTS IT

Phase 2's gate was failed four times by the owner on a phone before it passed, and eleven of that phase's fifteen fixed defects came from those passes. Two of them were introduced by the repair for an earlier one, and one repair shipped a regression that did not actually bite. Expect the same here: do not treat a green suite as evidence the phase is done, and prove every regression fails when its defect is reintroduced.

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Keep the kernel pure and clock-free. Lifecycle events are canonical records like everything else, and guide answers already show the pattern: they carry both when the thing happened and when it was written down (D-037).
- Write tests that verify semantic behaviour, not implementation paths.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate. DEF-0001 to DEF-0015 are the worked examples.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current.

CLOSING THE PHASE

End with the section 58 acceptance report: phase status, checkpoint SHA, deployed Preview SHA and whether they match, Preview URL, files changed, exact test counts, whether an owner phone test is required, product and semantic behaviour changes, open defects, deferred items, decisions made, next phase and role, the recommended Claude Code intelligence level, the CURRENT or NEW conversation instruction, one short reason for each, required references, and the complete next copy/paste prompt — all in the same response that closes the phase. Do not make the owner ask for the prompt.
```
