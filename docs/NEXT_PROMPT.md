# Next prompt

**Phase:** 81

Canonical plan section 43 for the workflow, section 58 for the report format.
Independent QA is Codex (D-090); Claude builds. Every handoff ends with the
model, the level, the conversation and a short copyable launcher (D-092).

**Phase 81 — correctness and truthfulness is implemented and is
YELLOW — READY FOR INDEPENDENT QA.** Under D-077 the builder conversation may
not approve its own phase. Twenty-two audit findings in six steps; the report is
in [`PHASE_STATUS.md`](PHASE_STATUS.md) and the specification is section 6 of
[`WHOLE_APP_INTELLIGENCE_AUDIT.md`](WHOLE_APP_INTELLIGENCE_AUDIT.md).

**QA rounds do not get new phase numbers.** A retest after a builder repair
stays under **Phase 81** and goes to the **same** Codex conversation (D-109,
D-092).

|                                    |                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Product checkpoint                 | `736a761` — the last commit that changes the bundle                             |
| Deployed Preview SHA               | `736a761` at the time of writing, and **read it live** — see below              |
| Relationship                       | proved with `scripts/checkpoint-equivalence.mjs`, never string equality (D-097) |
| Preview                            | https://bill6006.github.io/life-command-os-rebuild/preview/                     |
| Unit layer                         | 1,310 / 1,310 across 59 files (was 1,199 / 1,199 across 57)                     |
| Browser                            | 489 / 489 — 163 each at 360, 430 and 1,280px                                    |
| Android-style gate, deployed build | clean, 76 checks (was 56)                                                       |
| `npm run verify` from a clean tree | PASS                                                                            |
| Report path for this phase         | `docs/qa/PHASE_81_QA_HANDOFF.md` (to be created by QA)                          |

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest Codex model available for careful reading rather than
  for search depth
- **Reasoning level:** **High** — not Max. This phase changed what the app
  _says_ on nine surfaces, and QA's hard work here is reading assembled screens
  as a person and tracing each claim to its evidence. That is judgement rather
  than depth of search. The one place to reach higher is if a discovered defect
  turns out to be architectural — say so if it does.
- **Conversation:** **NEW CODEX CONVERSATION REQUIRED FOR INDEPENDENCE** — the
  builder's reasoning about why this is correct is exactly what must not be
  inherited. The retest after any repair goes to that same conversation.
- **Report path:** `docs/qa/PHASE_81_QA_HANDOFF.md`

## COPY/PASTE PROMPT

```text
Independent QA — Phase 81, correctness and truthfulness. Round 1.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Preview:
https://bill6006.github.io/life-command-os-rebuild/preview/

You are Codex running the independent QA protocol (D-077, D-090). The builder
conversation may not approve its own phase, and you are not it. Do not repair
application or product code: you may create or update only
docs/qa/PHASE_81_QA_HANDOFF.md and narrowly scoped QA evidence artifacts.

Checkpoint
- Product checkpoint: 736a761
- Deployed Preview SHA: read it live from the URL below rather than from this
  file. It was 736a761 when this was written and every push since — including
  the one that wrote this file — has moved it, without changing a byte the
  browser downloads.
- These are two facts, not one. Prove the relationship with
  `node scripts/checkpoint-equivalence.mjs 736a761 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
  rather than by comparing strings. This repository redeploys on every push,
  including a documentation-only one, so the deployed SHA may legitimately have
  moved past the checkpoint by the time you read it — that is D-097 and DEF-0061
  and it is not a reason to refuse to test.

WORK IN THIS ORDER — the order is the protocol (D-090)

1. SEALED COLD OWNER-USE. Open the deployed Preview at a normal Now and use it
   as the owner would, BEFORE reading any repository document. Record what it
   appears to claim, in its own words.
2. CLAIM-TO-EVIDENCE. For each claim you wrote down, establish what it actually
   rests on.
3. SEMANTIC AND PRODUCT CORRECTNESS. Does the app mean what it says, and is what
   it says worth saying.
4. TARGETED PHASE ACCEPTANCE, now that the meaning is understood.
5. TARGETED KNOWN-DEFECT REGRESSION for the surfaces this phase touched.
6. ARCHITECTURE INSPECTION where a defect suggests the boundary is wrong rather
   than the line.
7. FULL-SUITE DUPLICATION ONLY ON A CONCRETE TRIGGER — a builder claim that does
   not match observed behaviour, a suspected false green, or a change to the
   test harness itself. Green builder tests are evidence; watching them go green
   again buys nothing and costs the attention steps 1 and 2 need.

READ AFTER STEP 2, NOT BEFORE

- docs/WHOLE_APP_INTELLIGENCE_AUDIT.md — section 6 is this phase's
  specification, section 9 its implementation order, section 10 the
  do-not-change list.
- docs/PHASE_STATUS.md — the builder's own report, including what it says is
  still open.
- docs/DECISION_LOG.md — D-109 to D-113 were written before the code;
  D-114 to D-121 were written during it and are the builder's own decisions,
  which are the ones most worth disputing.
- docs/DEFECT_LEDGER.md — DEF-0074 to DEF-0079 are this phase's entries.
- docs/CANONICAL_REBUILD_PLAN.md sections 4.1, 4.3, 4.4, 4.5, 4.6, 6, 12, 19,
  20, 22, 43, 58, 61, 62, 63, 64 and 68.

THE GATE — four acceptance items, all four of which failed before this phase

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
sweep across every scenario at five blocks.

THE INSTRUMENT THIS PHASE BUILT FOR YOU

The QA laboratory has a new control: **Sweep the day**, under "The whole day".
It re-runs the loaded history at all five day blocks and shows the five
decisions side by side without moving the clock. One press is the cheapest way
to check gate items 1 and 2 on any history. Three new fixtures:

- "A morning after three bad nights" — 10:00, nine hours short, his daughter in
  the house. This is the reproduction the audit's most damaging finding is about.
- "A Saturday morning with the day open" — 06:40, rested. The first history the
  library has ever held in the early-morning block.
- "Six chances, three managed" — two growth skills, one that alternates and one
  that turned a corner. The first failed growth occasion the library has held.

WHERE THE BUILDER THINKS IT IS WEAKEST — start here, and disagree freely

- The `capacity` limiter still has no restorative candidate. AUD-0003's
  invariant names it; the same finding's implementation guidance says to gate
  the new verb on strain exactly as the existing generator does. The builder
  followed the gate and named the gap in a test rather than closing it. Judge
  whether gate item 2 is met.
- AUD-0027's refusal half is deliberately unshipped (D-115). Judge whether the
  reasoning holds or whether the phase is incomplete.
- The shown-ledger (D-118) does not change what "A week pointed at the house"
  says at four hours of one day — the audit's own reproduction of AUD-0025.
  Judge whether AUD-0025 is met.
- D-111's exception changes how often the guide asks across every scenario.
  Section 47 fails a phase on "too many questions". Judge it.
- AUD-0005's own two columns contradict each other; the builder implemented the
  Recommended-behaviour column. Judge which is right.
- The copy is new on nine surfaces. Read whole screens, not asserted strings.

STILL OPEN FOR THE OWNER, AND NOT YOURS OR THE BUILDER'S TO CLOSE

Q1 Adaya's age and normative references (blocks AUD-0018 only); Q4 legacy
evidence admissibility (blocks AUD-0030(b) only); Q6 live model inference
(D-025 stands); Q7 which emotional dimensions exist (blocks AUD-0011's
emotional half); Q8 private evidence versus the concept registry (blocks
AUD-0040). Repeat them in your report; do not answer them.

Four carry forward unchanged from Phase 8: the v297 ancestor export;
life-context-change mapping; the load-bearing literal NUL byte in derived record
ids; the archived skill-claim, faith-anchor and milestone-observation families.
Three deliberate non-features carry forward and are not gaps: no import from the
QA laboratory, no partial import, no undo button.

ONE KNOWN TRANSIENT, REPORTED AGAIN RATHER THAN RETRIED PAST

One Playwright test per full local run fails at page.goto with net::ERR_ABORTED,
on a different spec each time; on the builder's last full run it was
tests/browser/legacy-import.spec.ts at 360px, and it passed alone immediately
afterwards. Local dev-server flake rather than a product defect.

WRITE

docs/qa/PHASE_81_QA_HANDOFF.md, to the contract in canonical plan section 43 and
qa/README.md: phase; checkpoint SHA tested; deployed SHA tested and how the
relationship was established; Android/mobile configuration; governing acceptance
criteria; flows tested with PASS/FAIL each; exact reproductions for any defect;
semantic, behavioural, privacy and mobile findings; blocking versus non-blocking;
automated tests that gave false confidence; deferred items confirmed unchanged;
overall PASS or FAIL.

End with D-082 and D-092: the complete ready-to-paste next prompt in the same
response, without waiting for another owner turn — to the builder conversation
for repair on FAIL, or for the GREEN closeout on PASS — plus the model, the
level, the conversation instruction and a short standalone launcher naming this
repository and the exact MD file.
```

---

**Model:** the strongest Codex model available
**Intelligence level:** High
**Conversation:** NEW Codex conversation — required for independence

```text
Run independent QA on the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the current independent-QA handoff
exactly as written. It is Phase 81, round 1.

Do not ask me to paste the file contents.
```

<!-- LCO_COMPLETE -->
