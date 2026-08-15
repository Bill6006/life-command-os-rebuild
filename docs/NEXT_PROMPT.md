# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

---

## BEFORE ANY OF THIS — the phone test

Phase 2 is YELLOW, not GREEN. Section 47's gate is the owner opening Preview on
a real phone and judging the recommendation, and it fails if the honest answer
is generic, dumb, vague, too many questions, doesn't understand what it is
talking about, looks lifeless, or technically valid but not useful.

What to try is in [`PHASE_STATUS.md`](PHASE_STATUS.md) under **Phone check**.

- **If it is accepted** → the prompt below starts Phase 3.
- **If it is not** → do not start Phase 3. Say what was wrong in the owner's own
  words and continue in the **current** conversation at **Max**: the context
  that built the engine is the context that should fix it, and section 47 says
  the app does not expand until this gate is passed.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `Max`
- **Conversation:** `NEW`
- **Why this level:** Phase 3 is where learning starts changing later decisions,
  and the failures it has to avoid — a decline read as "ineffective", one event
  becoming proof, a subject lost through a follow-up — are judgement calls about
  meaning, not typing.
- **Why this conversation:** Phase 2 is closed and its context is spent. Phase 3
  builds on the kernel through the same documents, and a fresh window that has
  to read the engine before changing it is likelier to notice what the engine
  actually does than one that remembers writing it.
- **Attach/reference:** Nothing. The prompt points at the files to read. Do not
  attach or request any old Life Command OS document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 2 is complete and the owner has accepted the slice on a phone. Begin Phase 3.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/PHASE_STATUS.md — what Phase 2 delivered, and what it deliberately did not
3. docs/DECISION_LOG.md — decisions D-001 to D-030 and their reasons
4. docs/ARCHITECTURE_BOUNDARIES.md — module ownership
5. docs/DEFECT_LEDGER.md — DEF-0001 to DEF-0004, and the discipline that closed them

Then read the engine you are building on, all of it: src/intelligence/. Start with engine.ts, then situation.ts, candidates.ts, constraints.ts, evaluate.ts, arbitrate.ts, explain.ts, guide.ts, moves.ts. Also src/memory/facts.ts and src/memory/view.ts.

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source. It also holds 32 commits that exist only on this machine, so never run git push, reset or clean against it.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Do not weaken a Phase 1 or Phase 2 guarantee to make Phase 3 easier. In particular: unknown stays unknown; a recommendation that cannot resolve its subject renders nothing; canonical records are append-first; nothing below the UI reads the wall clock; there is exactly one arbitration path and no surface may reach the parts that decide; the evaluator and the arbiter know no life area by name. tests/unit/architecture-guards.test.ts and the six golden scenarios must stay green.
- Run npm run verify before every push. Not a subset of it. Browser tests (npm run test:browser) before closing the phase.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

WHAT PHASE 2 ALREADY GIVES YOU

- A working intelligence kernel in src/intelligence/, pure and clock-free, with one entry point: decide(view, moment, options).
- Context assembly, a weekly/long-range direction resolver, candidate generation from the owner's own entities, a constraint filter that records why, a fifteen-dimension evaluator, one arbitration path that can return a valid non-action, and an explanation generator that composes the reason from real facts.
- A full decision trace, exposed in the QA inspector: facts considered and how each was known, every candidate, every rejection with a reason, the ranking with per-dimension notes, the chosen move, and — measured rather than asserted — what would change the answer.
- An adaptive guide that asks one question at a time, only when the answer would land somewhere different, and stops when it would not.
- A validated model-assisted seat (src/intelligence/advisor.ts) with section 18's guardrails proven by an adversarial advisor. The deterministic baseline is the selected architecture — see D-024 and D-025.
- Ten synthetic scenarios, a Now surface, and a shared store and clock so time travel reaches the engine.

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

D-023 records that src/intelligence/moves.ts currently holds priors rather than
learned effects. Replacing them is this phase's job. Do it in a way that keeps
the trace honest: the inspector should be able to show which learning influenced
a decision, and how much of it there was.

SCENARIOS TO ADD

At least G-004 (social opportunity — good energy, an appropriate setting, an active social goal and no stronger bottleneck; a specific natural move may win; no quota or gamification; the outcome records comfort and result) and G-014 (no-action is valid — a stable state where no move has positive net value).

The engine can already produce a valid non-action, and a social generator already exists. Neither is gated yet. Add matching scenarios to src/synthetic/scenarios.ts so the owner can tap through them, and to tests/synthetic so the gate runs them.

GATE — Phase 3 is not GREEN until all of these hold

- the six existing golden scenarios still pass, unchanged
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
- the owner tests the loop on a phone

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Keep the kernel pure and clock-free. Lifecycle events are canonical records like everything else.
- Write tests that verify semantic behaviour, not implementation paths.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate. DEF-0001 to DEF-0004 are the worked examples.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current.

CLOSING THE PHASE

End with the section 58 acceptance report: phase status, checkpoint SHA, deployed Preview SHA and whether they match, Preview URL, files changed, exact test counts, whether an owner phone test is required, product and semantic behaviour changes, open defects, deferred items, decisions made, next phase and role, the recommended Claude Code intelligence level, the CURRENT or NEW conversation instruction, one short reason for each, required references, and the complete next copy/paste prompt — all in the same response that closes the phase. Do not make the owner ask for the prompt.

One open owner decision is recorded as D-025: whether to stand up a small inference endpoint so the hybrid architecture can use a real model. Nothing in Phase 3 depends on it. Raise it only if the owner asks.
```
