# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

**Phase 4 is GREEN**, approved by the owner on `1d52de4` and closed at
`297de05`.

**Phase 5 is the first phase under the independent QA protocol** (D-077,
[`qa/README.md`](qa/README.md)). The builder below does not approve its own
work: it finishes at **YELLOW — READY FOR INDEPENDENT QA** and hands off to a
separate conversation.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `High`
- **Conversation:** `NEW`
- **Why this level:** Phase 5 is domain pages, correction flows and goals on top
  of a kernel that already holds every reading they display — ordinary
  implementation, UI work and domain wiring, which D-077's rule puts at High.
  The one pattern that could have needed Max already exists: the growth
  suggestion is a worked correction with both answers recorded and read.
  Escalate to Max only if a correction kind turns out to need new inference
  semantics rather than a new record and a read path.
- **Why this conversation:** Phase 4 is closed and its context is spent. Phase 5
  builds surfaces on a large kernel, and a window that has to read the coverage
  engine before rendering it is likelier to notice what it says than one that
  remembers writing it.
- **Attach/reference:** Nothing. The prompt names the files to read. Do not
  attach or request any old Life Command OS document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 4 is complete and GREEN, approved by the owner. Begin Phase 5.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/
Phase 4 was approved on checkpoint 1d52de4 and closed at 297de05. Work from main.

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/qa/README.md — the independent QA protocol. It governs how this phase ends, and it changes what you are allowed to declare.
3. docs/PHASE_STATUS.md — what Phase 4 delivered, what the Android phone gate changed, and what it deliberately did not build
4. docs/DECISION_LOG.md — decisions D-001 to D-078 and their reasons. D-059 to D-076 govern coverage, reliability, inferred evidence and how Life presents them; D-077 is the QA protocol; D-078 settles the domain/page count you will otherwise trip over.
5. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, and the line between deciding and recording
6. docs/DEFECT_LEDGER.md — DEF-0001 to DEF-0027. Read DEF-0020 and DEF-0023 to DEF-0027 in full. Not one Phase 4 defect came from a failing assertion: two came from tests that could not be made to pass, one from printing the copy after everything was green, and four from the owner on a phone.

Then read the engine you are building on: src/intelligence/coverage.ts, growth.ts, derived.ts, situation.ts, engine.ts, evaluate.ts, explain.ts, learning.ts, corrections.ts, outcomes.ts, lifecycle.ts. Also src/domain/concepts.ts, src/domain/records.ts, src/domain/domains.ts, src/memory/facts.ts, and the surfaces you will be extending: src/features/life/LifeScreen.tsx and src/features/now/NowScreen.tsx.

HOW THIS PHASE ENDS — READ BEFORE YOU START

You may not approve your own phase. This is owner decision D-077 and it is not negotiable by anything you conclude while building.

When you believe the implementation is complete:

- the phase becomes YELLOW — READY FOR INDEPENDENT QA. Never GREEN.
- you complete your normal gate first: unit, contract, synthetic and adversarial tests; browser tests; clean-checkout npm run verify; privacy scan; CI; deployed Preview SHA equal to the checkpoint SHA; and your own Android-style mobile pass, because this phase is almost entirely owner-facing surface.
- in that same response, without being asked, you provide: phase status; checkpoint SHA; deployed Preview SHA and whether they match; exact verification counts; known, open and deferred items; the recommended intelligence level for QA; the conversation instruction NEW; the exact QA report path docs/qa/PHASE_05_QA_HANDOFF.md; and the COMPLETE copy/paste prompt for the independent QA conversation.

Write that QA prompt so it does not contaminate the review. Give QA the governing requirements, the acceptance criteria, the checkpoint, the explicit deferrals and the repository paths it needs. Do not tell it what you believe is correct, which behaviours are intentional, or what conclusion you expect. A reviewer handed your answer key stops being independent, and the whole point of the protocol is that Phase 4 passed 574 unit tests and 171 browser tests and then failed a phone gate on five counts.

If QA reports FAIL, the owner returns here. You read docs/qa/PHASE_05_QA_HANDOFF.md, take each blocking defect through plan section 42 — reproduce, identify the whole class, write a regression, prove it fails when the defect is reintroduced, fix the root cause, rerun the full gate, deploy a new checkpoint — and you still do not mark the phase GREEN. You give the repaired SHA and a retest prompt for the SAME QA conversation.

Only after QA reports PASS does the owner return here for the formal closeout, and only then is the phase GREEN.

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source. It also holds 32 commits that exist only on this machine, so never run git push, reset or clean against it.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Run npm run verify before every push. Not a subset of it. Run npm run test:browser before handing off to QA.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

WHAT PHASES 1 TO 4 BUILT, AND WHAT YOU MUST NOT WEAKEN

A working intelligence kernel in src/intelligence/, pure and clock-free, with one entry point: decide(view, moment, options). It assembles the situation from resolved facts, notices which life areas have gone quiet, generates candidates from the owner's own entities, filters what does not fit and records why, scores across seventeen dimensions, chooses one move or a valid non-action, explains it in the owner's particulars, records what the owner does about it, asks for the right kind of result when there is one to give, works some results out for itself, and learns from all of it.

These are load-bearing. Breaking any of them is a regression, and each has a test that will fail:

- Unknown stays unknown. Four knowledge states, no default escape hatch, no valueOr (D-014). Reliability never changes which state a record resolves to: a derived or model reading is inferred at any reliability, including one (D-060).
- A recommendation that cannot resolve its subject renders nothing (D-018). There is no fallback wording, ever.
- Canonical records are append-first. A correction is a new record; nothing is edited in place (D-015).
- Nothing below the UI reads the wall clock. The moment is always an argument (guarded).
- There is exactly one arbitration path. No surface may import candidates, constraints, evaluate, arbitrate, advisor, moves, learning or coverage — features ask the engine or get nothing (guarded). lifecycle, outcomes, corrections, derived and growth are open because they record rather than decide. Coverage is reached through situation so Life shows the object the decision was made from (D-071, D-075).
- The evaluator and the arbiter know no life area by name (D-030).
- The engine may name its own routines and never the owner's life (D-021).
- The explanation may only cite evidence the decision leaned on (D-031), may not assert an absence from ignorance (D-038), and takes what a move was chosen over from the arbitration (D-035).
- A context in force is current, whatever the age of the record carrying it (D-012, DEF-0022). Coverage never contradicts the fact layer and never contradicts the premise on the same screen.
- A move proposed to resolve an unknown is not scored down for that unknown, and is not rewarded for it either (D-072).
- A limiter carries its own label; a coverage gap is not called an obstacle (D-073).
- Owner-facing copy may not claim the app cannot do something it does. The guard is a rule, not a phrase list: every deferral claim must be acknowledged with a reason, and six proved capabilities may not be denied (D-074). If you write a screen that says something is not built, expect to add an acknowledgement with a reason, and expect that to be read.
- A question names what it is about (D-039), is asked only when at least half its answers would land somewhere else (D-036), and stops once an answer has changed nothing (D-033). The guide can ask zero questions and must keep being able to. Coverage orders questions and never authorises one (D-068).
- Inference completes a loop and never opens one (D-064). It may never conclude harm (D-066).
- A growth-stage change is proposed after three occasions and never applied by the app (D-070).
- The bottom navigation has exactly four primary destinations; More is a header entry and QA lives inside it (D-028).
- Phase language appears in exactly two places — the build panel behind More, and the QA laboratory — both reading REBUILD_PHASE from src/platform/buildInfo.ts (D-034). Update REBUILD_PHASE when Phase 5 lands.
- Scenarios shown to the owner must be lives he recognises (D-041). He has full custody of his daughter Adaya.
- The deterministic baseline is the selected architecture (D-024). No live model inference (D-025) — owner decision, do not raise unless asked.

DEFERRED BY THE OWNER — DO NOT FIX THESE AS INCIDENTAL WORK

Three items were deferred explicitly at the Phase 4 closeout. They are decisions, not oversights. Do not fold them into Phase 5 unless the owner reopens them, and tell QA they are known so it does not report them as new:

- P4-6 — the no-action eyebrow renders a whole sentence in an uppercase micro-label slot.
- P4-7 — the More button is 81x36, below the 44px minimum. It predates Phase 4.
- A started move that is never settled stays "Under way" indefinitely and no result is ever asked for.

ELEVEN DOMAINS, TEN PAGES — SETTLED, DO NOT RE-DERIVE

The plan says eleven core domains in section 4.1 and lists ten baseline pages in section 50. That is not an off-by-one and both numbers are correct. D-078 settles it:

- The MODEL keeps ELEVEN domains. Section 4.1 is about what the engine reasons over and what may never be switched off.
- Phase 5 builds TEN pages. Section 50 is a list of surfaces.
- The difference is one page covering two domains: "Health & Recovery" covers BOTH "Health & Physical Capacity" AND "Sleep & Recovery". Every other entry maps one to one under looser naming — "Money" is "Money & Financial Resilience", "Fatherhood / Adaya" is "Fatherhood / Family", "Long-Range Direction" is "Long-Range Direction / Identity".

The rule: all eleven domains stay in the registry, every one remains reportable on the Life overview, and every one is reachable from a page. Ten pages, none omitted, none duplicated, and the Health & Recovery page names both domains it covers. Do not build eleven pages — that splits a reading the engine takes as one. Do not reduce the registry to ten — that drops Sleep & Recovery from the model, which section 4.1 forbids and which would break the coverage engine, the recovery limiter and G-005. Write a test that asserts every registry domain is reachable from exactly one page.

PHASE 5 GOAL (plan section 50)

Give the owner optional deep inspection without fragmenting the brain. Life is where he goes to see what the app believes, why, what changed, whether it is fresh, and how to correct it — and he must never need to go there to keep the app working.

BUILD

- ten domain pages, per the rule above
- correction flows — section 62 lists eight kinds and two exist
- goals
- current understanding, per area
- coverage, per area and sub-area
- recent changes
- optional manual updates
- Private / Sexual Health, manual-entry-first, with discreet behaviour on normal surfaces (section 11)

The Life overview already exists and passed a phone gate. It groups eleven areas by standing, says each thing once, and reads in about a screen and a half. Extend it; do not restart it, and do not undo the grouping — DEF-0026 is what one-row-per-domain produced.

WHAT MUST BE TRUE

- Section 50's gate is a person navigating each page on a phone and understanding what the app believes, why, what changed, whether it is fresh, and how to correct it.
- No domain page may look like a static questionnaire dump. Section 59 excludes the old domain maturity UI and the old category switches.
- A domain page is not a second brain (section 7). It contributes facts, interpretation, constraints and candidates; one arbitration path still decides.
- Section 62's corrections need a read path each. A correction nothing reads is D-029's mistake, and the growth suggestion is the worked example of doing it properly: both answers are records and both are read by the coverage engine.
- Private / Sexual Health must be enterable deliberately and must not leak into Now or Timeline. Section 11 also forbids the app deciding that any of it is morally wrong.
- Coverage status on a domain page must agree with the overview, which means one computation and not two (D-071).

GATE — Phase 5 reaches YELLOW — READY FOR INDEPENDENT QA when all of these hold

- the fourteen existing golden scenarios still pass, unchanged
- every registry domain is reachable from exactly one page, asserted by a test
- a correction made on a domain page demonstrably changes later reasoning
- the private domain is manual-entry-first and discreet elsewhere
- no domain page looks like a static questionnaire dump
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build
- npm run verify passes from a clean checkout
- preview deploys automatically and the deployed Preview SHA equals the checkpoint SHA
- your own Android-style mobile pass finds nothing blocking — a real mobile browser context with touch, a mobile user agent and a realistic device pixel ratio, run against the deployed Preview, not merely a narrow desktop viewport

Phase 5 becomes GREEN only after independent QA reports PASS and the owner returns here for the closeout.

Phase 2's gate was failed four times by the owner on a phone. Phase 3's largest defect came from his first pass. Phase 4 passed every automated check — 574 unit tests and 171 browser tests at three widths — and then failed an Android gate on five counts: a self-cancelling ranking, a label that contradicted the ranking underneath it, two screens describing an app from two phases earlier, a wall of repeated text, and a sentence about his daughter that said the same thing twice. Every one was invisible to the suite, because the suite was written by the same reasoning that wrote the code. Expect the same: do not treat a green suite as evidence the phase is done, run a real mobile context as part of your own gate, print what the owner will actually read, prove every regression fails when its defect is reintroduced, and when the owner or QA disagrees with a diagnosis, check the code before defending it.

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Keep the kernel pure and clock-free.
- Write tests that verify semantic behaviour, not implementation paths. An exact-string assertion proves a string is stable, not that it is right — and a count assertion proves the data is present, not that the screen is readable.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current. Do not write docs/qa/PHASE_05_QA_HANDOFF.md — that file belongs to QA.

HANDING OFF TO QA

End with the section 58 report, adjusted for the protocol: phase status YELLOW — READY FOR INDEPENDENT QA; checkpoint SHA; deployed Preview SHA and whether they match; Preview URL; files changed; exact test counts; product and semantic behaviour changed; open defects; deferred items confirmed unchanged; decisions made; the recommended Claude Code intelligence level for QA; the conversation instruction NEW; one short reason for each; required references; the QA report path docs/qa/PHASE_05_QA_HANDOFF.md; and the complete QA copy/paste prompt — all in the same response. Do not make the owner ask for the QA prompt.
```
