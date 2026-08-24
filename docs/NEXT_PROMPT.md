# Next prompt

**Phase:** 81

Canonical plan section 43 for the workflow, section 58 for the report format.
Independent QA is Codex (D-090); Claude builds. Every handoff ends with the
model, the level, the conversation and a short copyable launcher (D-092).

**Phase 8 — Legacy migration is GREEN.** Independent QA passed it on the fourth
round; the closeout is in [`PHASE_STATUS.md`](PHASE_STATUS.md). Do not reopen it.

**The sequence changed after Phase 8 closed.** A whole-app intelligence and
product audit ([`WHOLE_APP_INTELLIGENCE_AUDIT.md`](WHOLE_APP_INTELLIGENCE_AUDIT.md),
51 findings) and an independent review of it produced **D-109**: two initiatives
now precede Phase 9. This handoff is the first of them.

```
Phase 81   correctness and truthfulness       ← YOU ARE HERE.  22 findings, 6 steps
Phase 82   structural intelligence skeleton      9 findings, 6 work packages
Phase 9    visual coherence, motion, mobile      canonical section 54
Later      intelligence: Reach, then Validity    20 findings, unnumbered until reached
Phase 10   performance, PWA, reliability         canonical section 55, unchanged
Phase 11   adversarial hardening · Phase 12  release
```

**The Phase 9 handoff that used to live in this file is superseded, not
cancelled.** It is in git history and its carried-forward content is repeated
below. Phase 9 runs after Phase 82.

|                                       |                                                            |
| ------------------------------------- | ---------------------------------------------------------- |
| Last approved product checkpoint      | `1fc41cf` — the Phase 8 QA-tested build                    |
| Deployed SHA at audit time            | `0eb920b` — **not expected** to match a checkpoint (D-097) |
| Unit layer at Phase 8 close           | 1199 / 1199 across 57 files                                |
| Browser at Phase 8 close              | 459 / 459 — 153 each at 360, 430 and 1280px                |
| Governing decisions written for you   | **D-109 … D-113**, already in `DECISION_LOG.md`            |
| Plan amendments already made          | section 61's copy example (D-110); change-log addendum     |
| Independent QA (D-077) for this phase | `docs/qa/PHASE_81_QA_HANDOFF.md` (to be created by QA)     |

---

## NEXT ACTION

- **System:** **Claude Code**
- **Model:** current strongest Opus-class Claude coding model (or nearest current equivalent)
- **Intelligence level:** **Max** — 22 interdependent semantics-and-copy changes with a stated
  ordering constraint, three of which implement amendments to standing decisions. A lower tier
  will fix the wording and leave the reasoning underneath it wrong, which is the exact failure
  the audit is about.
- **Conversation:** **NEW** — Phase 8's defect loop is closed and this phase should not inherit
  eight rounds of legacy-import reasoning. Section 43 keeps a _retest_ in the conversation that
  found the defects; a new phase starts fresh.
- **Report path:** `docs/qa/PHASE_81_QA_HANDOFF.md` (to be created by QA)

## COPY/PASTE PROMPT

```text
Continue the Life Command OS rebuild with Phase 81 — correctness and truthfulness.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Phase 8 — Legacy migration is GREEN. Do not reopen it. Phase 81 and Phase 82 now
precede Phase 9 (D-109). You are Phase 81. Do not start Phase 82. Do not start
Phase 9. Do not modify the orchestrator.

READ FIRST, IN FULL

- docs/WHOLE_APP_INTELLIGENCE_AUDIT.md — this is your specification. Section 6 is
  Phase 81. Section 9 is the implementation order. Section 10 is the
  do-not-change list and it is not advisory. Section 0A explains why the plan
  looks the way it does.
- docs/CANONICAL_REBUILD_PLAN.md — sections 43 and 58 are the workflow and the
  report format; 4.3, 4.4, 4.6, 6, 12, 19, 20, 61, 62, 63, 64 and 68 all
  constrain this phase.
- docs/DECISION_LOG.md — D-109 to D-113 were written for this phase. D-036 and
  D-070 carry amendments you are implementing. D-018, D-021, D-030, D-031,
  D-038, D-040, D-043, D-045, D-048, D-052, D-063, D-073, D-075, D-084, D-089
  and D-091 all constrain it.
- docs/DEFECT_LEDGER.md — DEF-0006, DEF-0016, DEF-0022, DEF-0026, DEF-0028,
  DEF-0033, DEF-0039, DEF-0040 and DEF-0056 are the classes this phase is
  finishing. Several findings are those classes surviving where nobody swept.
- docs/ARCHITECTURE_BOUNDARIES.md

WHAT THIS PHASE IS

22 findings in 6 steps. Every one is a thing the app states that is untrue, or
an action the plan promises that the interface lacks. Nothing here is a new
capability, a new domain, or a new screen.

Phase 9's review list includes copy and its gate is owner physical-phone
approval. A sentence that is factually wrong does not become right by being well
set. If these are not fixed first they get typeset, approved on a phone, and
become the thing the design depends on.

THE SIX STEPS, IN ORDER

81.0  THE INSTRUMENT — AUD-0008. Do this first; everything after is verified
      with it. Two scenarios the library lacks: a morning with something to
      decide, and a history containing a FAILED growth occasion. Plus a
      block-sweep control in the QA laboratory that re-runs the loaded history
      at all five day blocks and shows the five decisions side by side. Without
      those two fixtures, gate items 2 and 3 below cannot be tested — which is
      how they survived 1,199 green assertions.

81.1  THE HORIZON — AUD-0002 first (the shared vocabulary), then AUD-0001 and
      AUD-0036 which depend on it, plus AUD-0005. Do AUD-0002 first or the word
      gets fixed in three places with three definitions. `whenPhrase` in
      learning.ts:541 is already the correct helper; promote it, do not write a
      second one. D-110 has already corrected the plan's own copy example.

81.2  THE MORNING HAS AN ANSWER — AUD-0003, after AUD-0005. Lead with the
      invariant: when recovery or capacity is the dominant limiter, a
      recovery-compatible option must exist in every relevant day block. Word it
      only from what is known. It must NOT defer anything to "tomorrow" — the
      app has no model of what is coming, and inventing one is the same failure
      this phase exists to fix.

81.3  ADAYA — AUD-0048 and AUD-0049 together and FIRST within this step, then
      AUD-0014, then AUD-0015(b) and AUD-0016 which depend on it, plus
      AUD-0037. D-112 is the revised sufficiency rule and it is already written;
      implement it exactly. No child-performance percentage threshold. Growth
      changes stay PROPOSED and are never applied. THIS IS THE STEP TO DO FIRST
      IF ONLY ONE GETS DONE.

81.4  HONEST SENTENCES — AUD-0032, then AUD-0028 and AUD-0027 together (same
      file, same mechanism), then AUD-0026 which depends on 0027, plus AUD-0033.
      AUD-0027's second half needs the DEF-0006 rule widened from "concepts in
      leansOn" to "concepts in leansOn plus dimensions that materially moved the
      score" — record that in the decision log and prove the DEF-0006 regression
      still bites afterwards. If in doubt, ship the association half only.

81.5  INTERACTION — AUD-0025 (session-scoped ledger) first, then AUD-0023 and
      AUD-0050's veto together, then AUD-0034, then AUD-0031 last. AUD-0031
      implements D-111 and changes how often the guide fires across every
      scenario, so verify it last. The shown-ledger must arrive at the engine as
      an argument on the Situation — src/intelligence/ is pure and clock-free and
      the guards enforce it.

THE GATE

Four acceptance items, all four of which currently FAIL:

1. No owner-visible string asserts the evening outside the evening, at any
   block, in any scenario.
2. A named limiter always has a candidate that addresses it, in every block.
3. No sentence about the child claims consecutiveness the occasions do not
   support; no percentage, rank, grade or score about her reaches any surface;
   and the suggestion states how many occasions went the other way.
4. The owner can stop a recommendation family, and find and lift that veto
   afterwards.

Plus the standing gates: npm run verify from a clean checkout, the browser suite
at three widths, an Android-style pass on the deployed build, and the block
sweep from 81.0 across every scenario at five blocks.

DECISIONS ALREADY WRITTEN FOR YOU — DO NOT RE-DECIDE THEM

- D-109  Phase 81 and 82 precede Phase 9; canonical Phase 10 keeps its scope.
- D-110  Owner-facing copy names the horizon the owner is in. Section 61 amended.
- D-111  The narrow consequential-question exception. Amends D-036. KEEP IT
         NARROW: consequential concepts only, only when the flip is toward LESS
         action, the three-a-day cap unchanged, D-036's regression still in force.
- D-112  Growth sufficiency reads the sequence, not the survivors. Amends D-070.
- D-113  Move diversity is a named product outcome — for the LATER phase, not
         this one. Do not add verbs or routines in Phase 81.

STILL OPEN, AND NOT YOURS TO CLOSE

From the audit, five owner questions remain. Do not answer them, do not
implement against them, and repeat them in your report:

  Q1  Adaya's age and normative references — blocks AUD-0018 only.
  Q4  legacy evidence admissibility — blocks AUD-0030(b) only.
  Q6  live model inference — D-025 stands.
  Q7  which emotional dimensions exist — blocks AUD-0011's emotional half.
  Q8  private evidence vs the concept registry — blocks AUD-0040.

Four carry forward unchanged from Phase 8:

  1. the v297 ancestor export;
  2. life-context-change mapping — "moved house", "custody changed";
  3. the load-bearing literal NUL byte in derived record ids;
  4. the archived skill-claim, faith-anchor and milestone-observation families.

Three deliberate non-features carry forward and are not gaps: no import from the
QA laboratory, no partial import, no undo button.

DO NOT CHANGE

Read section 10 of the audit in full before touching anything. It lists twenty-one
things that look wrong and are right, several of which this phase's steps sit
next to. In particular: all five lifecycle buttons stay always-drawn (D-052);
"Something else" stays down-weighted rather than treated as a plain refusal;
a refusal may still only reach owner-preference and never immediate-benefit;
ACTION_FAMILIES stays empty; nothing is written when a screen renders (D-043);
and emotional state does not get a numeric scale to make a domain machine-readable.

ONE KNOWN TRANSIENT

One Playwright test per full local run fails with page.goto net::ERR_ABORTED at
navigation, on a different spec each time; the affected spec passes alone and CI
retries green. Local dev-server flake, not a product defect. Fix it if cheap
while you are in the browser layer; otherwise report it again rather than
retrying past it.

HOW TO WORK

Follow section 43. Reach YELLOW — READY FOR INDEPENDENT QA, not GREEN: under
D-077 this conversation may not approve its own phase. Keep D-097 checkpoint
discipline — report the product checkpoint and the deployed SHA as two facts and
prove the relationship with scripts/checkpoint-equivalence.mjs rather than by
string comparison.

D-108 applies to every regression you write: enumerate what "every" means in the
body, assert the value rather than the container, reintroduce what the title
names rather than the line the assertion touches, and treat a guard inside an
assertion as a hole.

Write copy guards as rules about what the copy may not claim, never as exact
strings. An exact-string assertion proves a string is stable, not that it is
right, and it fails for improvements.

Do not modify anything at D:\Code\AI Coding Agents\Codax\Life App — owner
decision D-001, absolute.

End with D-082 and D-092: write the complete ready-to-paste QA prompt into
docs/NEXT_PROMPT.md with the routing field **Phase:** 81 preserved, along with
the model, the intelligence level, the CURRENT/NEW conversation routing and a
short standalone launcher. QA rounds do not get new phase numbers.
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
written. It is Phase 81.

Do not ask me to paste the file contents.
```
