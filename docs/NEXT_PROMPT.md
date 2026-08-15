# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `Max`
- **Conversation:** `NEW`
- **Why this level:** Phase 2 has to choose between competing intelligence
  architectures on evidence rather than on which sounds better, and section 47
  fails the phase on the owner's judgement of one sentence — that is design
  reasoning, not typing.
- **Why this conversation:** Phase 1 is closed and its context is spent; Phase 2
  is a different concern that deserves a full fresh window, and the repository
  carries everything it needs.
- **Attach/reference:** Nothing. The prompt points at the files to read. Do not
  attach or request any old Life Command OS document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 1 is complete and GREEN. Begin Phase 2.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/PHASE_STATUS.md — what Phase 1 delivered, and what it deliberately did not
3. docs/DECISION_LOG.md — decisions D-001 to D-020 and their reasons
4. docs/ARCHITECTURE_BOUNDARIES.md — module ownership
5. docs/DEFECT_LEDGER.md — DEF-0001 and the discipline that closed it

Then read the meaning layer you are building on, at least: src/domain/knowledge.ts, src/domain/recommendation.ts, src/domain/concepts.ts, src/memory/facts.ts, src/memory/view.ts, src/synthetic/scenarios.ts.

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source. It also holds 32 commits that exist only on this machine, so never run git push, reset or clean against it.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Do not weaken a Phase 1 guarantee to make Phase 2 easier. In particular: unknown stays unknown, a recommendation that cannot resolve its subject renders nothing, canonical records are append-first, and nothing below the UI reads the wall clock. tests/unit/architecture-guards.test.ts and the four golden scenarios must stay green.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

WHAT PHASE 1 ALREADY GIVES YOU

- Canonical records, semantic entities, owner-local time, privacy classes, and a four-state Knowledge type with no default escape hatch.
- A transactional IndexedDB store, supersession and retraction, and fact resolution (the pipeline's step 1 from plan section 17.1 is done — see D-011).
- A projection mechanism: pure folds over canonical records, fingerprinted, read-through cache. Add your intelligence outputs as projections and they are rebuildable and inspectable for free.
- buildView(snapshot, { now, zone }) in src/memory/view.ts — synchronous and pure, so the whole engine can be tested with no browser and no app shell. Keep it that way.
- A QA laboratory at #/qa with seven synthetic scenarios, date and time travel, and an inspector. Extend it; do not build a second one.

PHASE 2 GOAL (plan section 47)

Prove the brain can produce an excellent recommendation before building the full app.

BUILD (src/intelligence/, plus a Now surface)

- context assembler — the current situation from durable and temporary context
- candidate generator — realistic possible actions, carrying the structured RecommendationSemantics that already exists
- constraint filter — remove what does not fit current reality, and record why
- candidate evaluator — the dimensions in plan section 19
- global arbitration — one primary move, or a valid non-action (section 17.2: exactly one arbitration path)
- explanation generator — structured decision to concise human language, obeying plan section 61's copy rules
- decision trace — every fact considered, every candidate, every rejection and its reason, exposed in the QA inspector per section 35
- a deterministic baseline architecture
- at least one model-assisted or hybrid candidate architecture if feasible, under plan section 18's guardrails
- a simple Now surface showing the chosen move, its reason, and the state it is in
- one adaptive guide flow that asks one question at a time, recomputes after each, and stops when it knows enough (section 12)

INTELLIGENCE TOURNAMENT (plan section 18)

Compare the candidate architectures on the golden synthetic profiles. Choose the simplest architecture that clearly produces better decisions. Do not select one because it sounds more advanced. Write down what was compared, on what, and what the result was.

If a model-assisted path is adopted: no permanent API secrets in the browser, no storing the owner's life history on a server merely because inference needs a network request, strict structured-output validation, and a model may never silently write canonical facts, override explicit owner facts, or turn low confidence into confident language.

SCENARIOS TO ADD

At least G-005 (severe sleep deficit against a career goal — career must not automatically win) and G-008 (a non-career weekly direction, with the stored semantic category matching and no hardcoded career value). Both belong to arbitration, which is what this phase builds. G-004 and G-014 are Phase 3.

Add matching scenarios to src/synthetic/scenarios.ts so the owner can tap through them on the phone, and to tests/synthetic so the gate runs them.

GATE — Phase 2 is not GREEN until all of these hold

- the four existing golden scenarios still pass, unchanged
- G-005 and G-008 pass as automated synthetic scenarios
- the decision trace shows, for any recommendation: the facts considered and whether each was explicit, inferred, stale or unknown; the candidates; which were filtered and why; the ranking; the chosen move; and what would change the answer
- two substantially different synthetic profiles do not receive the same recommendation wording and reasoning (plan section 64)
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build
- npm run verify passes from a clean checkout
- preview deploys automatically and the deployed Preview SHA equals the checkpoint SHA
- THE OWNER TESTS THE SLICE ON A PHONE AND ACCEPTS IT

Section 47 is explicit that the phase fails if the owner reasonably says: generic, dumb, vague, too many questions, doesn't understand what it is talking about, looks lifeless, or technically valid but not useful. Do not declare GREEN before that check. Do not expand to the rest of the app until this gate is passed.

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Put the kernel in src/intelligence/. Keep it pure and clock-free, like the layers below it.
- Write tests that verify semantic behaviour, not implementation paths.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate. DEF-0001 in docs/DEFECT_LEDGER.md is the worked example.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current.

CLOSING THE PHASE

End with the section 58 acceptance report: phase status, checkpoint SHA, deployed Preview SHA and whether they match, Preview URL, files changed, exact test counts, whether an owner phone test is required, product and semantic behaviour changes, open defects, deferred items, decisions made, next phase and role, the recommended Claude Code intelligence level, the CURRENT or NEW conversation instruction, one short reason for each, required references, and the complete next copy/paste prompt — all in the same response that closes the phase. Do not make the owner ask for the prompt.
```
