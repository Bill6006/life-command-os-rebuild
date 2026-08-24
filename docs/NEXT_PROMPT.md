# Next prompt

Canonical plan section 43, and section 54 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092).

**Phase 8 — Legacy migration is GREEN.** Independent QA passed it on the fourth
round, and the closeout is written in [`PHASE_STATUS.md`](PHASE_STATUS.md).

|                                          |                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Approved product checkpoint              | `1fc41cf` — the QA-tested build                                                        |
| Deployed SHA                             | `0eb920b`, read live from `preview/build-info.json`; **not expected** to match (D-097) |
| Bundle equivalence                       | Pass — three documentation files differ, none bundle-relevant                          |
| Closing SHA                              | current `main` HEAD. Documentation only past the checkpoint; the same check holds      |
| Unit layer                               | 1199 / 1199 across 57 files                                                            |
| Browser                                  | 459 / 459 — 153 each at 360, 430 and 1280px                                            |
| `npm run verify` from a clean checkout   | Pass — cloned fresh, `npm ci`, 1199 / 1199 and a build                                 |
| Android-style gate on the deployed build | Clean, 56 checks                                                                       |
| Independent QA (D-077)                   | **PASS** — [`qa/PHASE_08_QA_HANDOFF.md`](qa/PHASE_08_QA_HANDOFF.md)                    |

---

## NEXT ACTION

- **System:** **Claude Code**
- **Model:** current strongest Opus-class Claude coding model (or nearest
  current equivalent)
- **Intelligence level:** **Max** — this phase reviews every screen in the
  product at once against fourteen dimensions and eight named anti-patterns, and
  its gate is the owner's judgement on a physical phone rather than an
  assertion. It is the phase with the least mechanical ground truth so far.
- **Conversation:** **NEW** — Phase 8's defect loop is closed. Section 43 keeps
  a _retest_ in the conversation that found the defects; a new phase starts
  fresh, and this one in particular should not inherit eight rounds of legacy
  import reasoning.
- **Report path:** `docs/qa/PHASE_09_QA_HANDOFF.md` (to be created by QA)

## COPY/PASTE PROMPT

```text
Continue the Life Command OS rebuild with Phase 9 — visual coherence, motion and
mobile refinement (canonical plan section 54).

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Phase 8 — Legacy migration is GREEN, closed after an independent Codex QA PASS
on its fourth round. Approved product checkpoint 1fc41cf; deployed 0eb920b,
bundle-equivalent under D-097. Do not reopen it.

READ FIRST, IN FULL

- docs/CANONICAL_REBUILD_PLAN.md — section 54 is this phase; sections 43 and 58
  are the workflow and the report format
- docs/PHASE_STATUS.md — Phase 8's closeout, and every phase before it
- docs/DECISION_LOG.md — D-001, D-077, D-079, D-091, D-092, D-097, D-100 and
  D-106 through D-108 all constrain this phase
- docs/DEFECT_LEDGER.md — DEF-0064 and DEF-0072 are visual defects a green
  suite could not see, and both are in this phase's blast radius
- docs/ARCHITECTURE_BOUNDARIES.md

WHAT THIS PHASE IS

Whole-product visual coherence. Review hierarchy, spacing, typography, surface
depth, contrast, motion, mood, copy, repeated components, phone density,
navigation, private-domain discretion, empty states and error states — across
every screen, as one product rather than one screen at a time.

Reject these explicitly, and say in the report where each was checked:
submarine panel; cave; gamer UI; developer dashboard; card soup; massive empty
dark spaces; endless tiny metrics; pastel wellness.

THE GATE IS THE OWNER'S PHONE

Section 54's gate is owner physical-phone approval. That is not a formality and
not something a screenshot satisfies. Build to be looked at on a real phone, and
reach YELLOW with a deployed Preview the owner can open. The independent Codex
QA round comes first (D-077), and the owner's approval is the gate after it.

WHAT PHASE 8 LEAVES YOU THAT MATTERS HERE

- `.origin-badge` is defined once, in src/styles/base.css, and an architecture
  guard enforces that. It appears on Timeline, a domain page, the Life overview,
  an Insights card and the evidence panel. It was five copies before, they
  drifted within one round, and DEF-0072 is what that cost. Restyle it in one
  place or not at all.
- That badge resets text-transform and letter-spacing deliberately. It sits
  beside an uppercase, wide-tracked eyebrow on the Insights card and inherited
  both, rendering "OUT OF DATEIMPORTED" as one run of capitals. A visual phase
  that touches eyebrows or badges must not undo those resets.
- D-100: a sticky layer owns its own opacity, and legibility is proved with
  pixels rather than rectangles. Motion and depth work is exactly where that
  regresses.
- D-106: an entry the owner did not write says so, wherever it is read. Origin
  disclosure is a correctness rule, not decoration. It must survive any
  restyling, on entries and on the conclusions drawn from them.
- The eleven-domains / ten-pages rule (D-079) is a product invariant, not a
  layout preference.

STILL OPEN, AND NOT YOURS TO CLOSE

Four owner questions carry forward unchanged from Phase 8. Do not answer them,
do not implement against them, and repeat them in your report:

1. the v297 ancestor export — whether the owner has one whose contents never
   reached the old app;
2. life-context-change mapping — "moved house", "custody changed": real history
   with no honest home in this data model;
3. the load-bearing literal NUL byte in derived record ids — sound, invisible,
   and a migration to change;
4. the archived skill-claim, faith-anchor and milestone-observation families.

Three deliberate non-features also carry forward and are not gaps: no import
from the QA laboratory, no partial import, no undo button.

One known transient, reported in every Phase 8 round and fixed in none: one
Playwright test per full local run fails with page.goto net::ERR_ABORTED at
navigation, on a different spec each time; the affected spec passes alone and CI
retries green. It is a local dev-server flake rather than a product defect. If
it is cheap to fix while you are in the browser layer, fix it; if not, report it
again rather than retrying past it.

HOW TO WORK

Follow section 43. Reach YELLOW — READY FOR INDEPENDENT QA, not GREEN: under
D-077 this conversation may not approve its own phase. Keep the D-097 checkpoint
discipline — report the product checkpoint and the deployed SHA as two facts and
prove the relationship with scripts/checkpoint-equivalence.mjs rather than by
string comparison.

D-108 applies to every regression you write: enumerate what "every" means in the
body, assert the value rather than the container, reintroduce what the title
names rather than the line the assertion touches, and treat a guard inside an
assertion as a hole. Phase 8 broke that rule three times, twice inside a repair
for it.

Do not modify anything at D:\Code\AI Coding Agents\Codax\Life App — owner
decision D-001, absolute.

End with D-082 and D-092: write the complete ready-to-paste QA prompt into
docs/NEXT_PROMPT.md along with the model, the intelligence level, the
CURRENT/NEW conversation routing and a short standalone launcher. Do not make
the owner ask for the next handoff.
```

---

**Model:** current strongest Opus-class Claude coding model (or nearest current
equivalent)
**Intelligence level:** Max
**Conversation:** NEW Claude builder conversation

```text
Continue the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the current handoff exactly as
written.

Do not ask me to paste the file contents.
```
