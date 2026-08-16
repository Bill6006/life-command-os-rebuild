# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

**Phase 4 is YELLOW until the owner tests it on a phone.** Everything automatable
passes. If the phone pass finds defects, they are Phase 4's to fix — follow
section 42 in a fresh conversation and close the phase before pasting anything
below. If it passes, Phase 4 is GREEN and the prompt below is Phase 5.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `Max`
- **Conversation:** `NEW`
- **Why this level:** Phase 5 is where the app finally shows the owner what it
  believes about eleven areas of his life and lets him argue with it. Section 62
  lists eight kinds of correction and only two exist; the rest need a way to
  write down "you have this wrong" that later reasoning actually reads. The
  private domain lands here too, and section 11 is the plan's most easily
  mishandled page.
- **Why this conversation:** Phase 4 is closed and its context is spent. Phase 5
  builds surfaces on top of a kernel that is now large, and a window that has to
  read the coverage engine before rendering it is likelier to notice what it
  actually says than one that remembers writing it.
- **Attach/reference:** Nothing. The prompt names the files to read. Do not
  attach or request any old Life Command OS document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 4 is complete and GREEN, approved by the owner on a phone. Begin Phase 5.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/
Phase 4 closed at the head of main. Work from main.

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/PHASE_STATUS.md — what Phase 4 delivered, what the reintroduction sweeps changed, and what it deliberately did not build
3. docs/DECISION_LOG.md — decisions D-001 to D-071 and their reasons. D-059 to D-071 govern coverage, reliability and inferred evidence, and Phase 5 renders all three.
4. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, and the line between deciding and recording
5. docs/DEFECT_LEDGER.md — DEF-0001 to DEF-0021. Read DEF-0020 and DEF-0021 in full: the first is the shape of what a phone test finds, the second is the shape of what a test written to demonstrate a fix finds.

Then read the engine you are building on: src/intelligence/coverage.ts, growth.ts, derived.ts, situation.ts, engine.ts, explain.ts, learning.ts, corrections.ts, outcomes.ts, lifecycle.ts. Also src/domain/concepts.ts, src/domain/records.ts, src/memory/facts.ts, and the two surfaces you will be replacing: src/features/life/LifeScreen.tsx and src/features/now/NowScreen.tsx.

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source. It also holds 32 commits that exist only on this machine, so never run git push, reset or clean against it.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Run npm run verify before every push. Not a subset of it. Run npm run test:browser before closing the phase.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

WHAT PHASES 1 TO 4 BUILT, AND WHAT YOU MUST NOT WEAKEN

A working intelligence kernel in src/intelligence/, pure and clock-free, with one entry point: decide(view, moment, options). It assembles the situation from resolved facts, notices which life areas have gone quiet, generates candidates from the owner's own entities, filters what does not fit and records why, scores across seventeen dimensions, chooses one move or a valid non-action, explains it in the owner's particulars, records what the owner does about it, asks for the right kind of result when there is one to give, works some results out for itself, and learns from all of it.

These are load-bearing. Breaking any of them is a regression, and each has a test that will fail:

- Unknown stays unknown. Four knowledge states, no default escape hatch, no valueOr (D-014). Reliability never changes which state a record resolves to: a derived or model reading is inferred at any reliability, including one (D-060).
- A recommendation that cannot resolve its subject renders nothing (D-018). There is no fallback wording, ever.
- Canonical records are append-first. A correction is a new record; nothing is edited in place (D-015).
- Nothing below the UI reads the wall clock. The moment is always an argument (guarded in tests/unit/architecture-guards.test.ts).
- There is exactly one arbitration path. No surface may import candidates, constraints, evaluate, arbitrate, advisor, moves, learning or coverage — features ask the engine or get nothing (guarded). lifecycle, outcomes, corrections, derived and growth are open because they record rather than decide. Coverage is reached through situation so Life shows the object the decision was made from (D-071).
- The evaluator and the arbiter know no life area by name (D-030).
- The engine may name its own routines and never the owner's life (D-021).
- The explanation may only cite evidence the decision leaned on (D-031), may not assert an absence from ignorance (D-038), and takes what a move was chosen over from the arbitration (D-035).
- A question names what it is about (D-039), is asked only when at least half its answers would land somewhere else (D-036), and stops once an answer has changed nothing (D-033). The guide can ask zero questions and must keep being able to.
- Coverage orders questions and never authorises one (D-068). Stale coverage is the fourth limiter and scores nothing in the ranking (D-063).
- Reliability is a property of the source AND the concept (D-059, D-060). Evidence carries its provenance into every trace it reaches (D-067).
- Inference completes a loop and never opens one (D-064). It may never conclude harm (D-066).
- A growth-stage change is proposed after three occasions and never applied by the app (D-070).
- The bottom navigation has exactly four primary destinations; More is a header entry and QA lives inside it (D-028).
- Phase language appears in exactly two places — the build panel behind More, and the QA laboratory — both reading REBUILD_PHASE from src/platform/buildInfo.ts (D-034). Update REBUILD_PHASE when Phase 5 lands.
- Scenarios shown to the owner must be lives he recognises (D-041). He has full custody of his daughter Adaya.
- The deterministic baseline is the selected architecture (D-024). No live model inference (D-025) — owner decision, do not raise unless asked.

PHASE 5 GOAL (plan section 50)

Give the owner optional deep inspection without fragmenting the brain. Life is where he goes to see what the app believes, why, what changed, whether it is fresh, and how to correct it — and he must never need to go there to keep the app working.

BUILD

- the Life overview (it exists as a coverage report; section 7 asks for more)
- domain pages for all ten baseline areas listed in section 50
- correction flows — section 62 lists eight kinds and two exist
- goals
- current understanding, per area
- coverage, per area and sub-area
- recent changes
- optional manual updates
- Private / Sexual Health, manual-entry-first, with discreet behaviour on normal surfaces (section 11)

WHAT MUST BE TRUE

- Section 50's gate is a person navigating each page on a phone and understanding what the app believes, why, what changed, whether it is fresh, and how to correct it.
- No domain page may look like a static questionnaire dump. Section 59 excludes the old domain maturity UI and the old category switches.
- A domain page is not a second brain (section 7). It contributes facts, interpretation, constraints and candidates; one arbitration path still decides.
- Section 62's corrections need a read path each. A correction nothing reads is D-029's mistake, and the growth suggestion in Phase 4 is the worked example of doing it properly: both answers are records and both are read by the coverage engine.
- Private / Sexual Health must be enterable deliberately and must not leak into Now or Timeline. Section 11 also forbids the app deciding that any of it is morally wrong.
- Every export family must be able to include the private domain (section 11) — that is Phase 7, but do not build anything here that makes it impossible.
- Coverage status on a domain page must agree with the overview, which means one computation and not two (D-071).

GATE — Phase 5 is not GREEN until all of these hold

- the owner can navigate each page on a phone and understand what the app believes, why, what changed, whether information is fresh, and how to correct it
- no domain page looks like a static questionnaire dump
- the fourteen existing golden scenarios still pass, unchanged
- a correction made on a domain page demonstrably changes later reasoning
- the private domain is manual-entry-first and discreet elsewhere
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build
- npm run verify passes from a clean checkout
- preview deploys automatically and the deployed Preview SHA equals the checkpoint SHA
- THE OWNER TESTS IT ON A PHONE AND ACCEPTS IT

Phase 2's gate was failed four times by the owner on a phone. Phase 3's largest defect came from his first pass, and his correction of the first diagnosis is what made the repair right. Phase 4 found its own defect only because a browser test written to demonstrate a fix could not be made to pass, and five regressions escaped their first reintroduction sweep — every one of them asserted somewhere that could not reach it. Expect the same: do not treat a green suite as evidence the phase is done, print what the owner will actually read, prove every regression fails when its defect is reintroduced, and when the owner disagrees with a diagnosis, check the code before defending it.

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Keep the kernel pure and clock-free.
- Write tests that verify semantic behaviour, not implementation paths. An exact-string assertion proves a string is stable, not that it is right.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current.

CLOSING THE PHASE

End with the section 58 acceptance report: phase status, checkpoint SHA, deployed Preview SHA and whether they match, Preview URL, files changed, exact test counts, whether an owner phone test is required, product and semantic behaviour changes, open defects, deferred items, decisions made, next phase and role, the recommended Claude Code intelligence level, the CURRENT or NEW conversation instruction, one short reason for each, required references, and the complete next copy/paste prompt — all in the same response that closes the phase. Do not make the owner ask for the prompt.
```
