# Next prompt

**Phase:** 81 — **QA round 3, retest after repair**

Canonical plan section 43 for the workflow, section 58 for the report format.
Independent QA is Codex (D-090); Claude builds. Every handoff ends with the
model, the level, the conversation and a short copyable launcher (D-092).

**Round 2 returned FAIL on two findings.** Both are repaired. The phase stays
**YELLOW — READY FOR INDEPENDENT QA** and remains Phase 81; under D-077 the
builder conversation may not approve its own phase, and under D-109 and D-092 a
retest keeps the phase number and goes to the **same Codex conversation that has
written both rounds**.

Round 2 also confirmed all five round-1 findings repaired and accepted the
sore/rested adjudication. Neither is reopened here.

The report is [`qa/PHASE_81_QA_HANDOFF.md`](qa/PHASE_81_QA_HANDOFF.md). The
builder's own report is [`PHASE_STATUS.md`](PHASE_STATUS.md); the specification
is section 6 of
[`WHOLE_APP_INTELLIGENCE_AUDIT.md`](WHOLE_APP_INTELLIGENCE_AUDIT.md).

|                                    |                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Product checkpoint                 | `7e00dac` — the last commit that changes the bundle                             |
| Deployed Preview SHA               | past the checkpoint by the commits that wrote these docs — **read it live**     |
| Relationship                       | proved with `scripts/checkpoint-equivalence.mjs`, never string equality (D-097) |
| Preview                            | https://bill6006.github.io/life-command-os-rebuild/preview/                     |
| Unit layer                         | 1,332 / 1,332 across 60 files (was 1,321 across 59)                             |
| Browser                            | 501 / 501 — 167 each at 360, 430 and 1,280px (was 495)                          |
| Android-style gate, deployed build | clean, 93 checks (was 86)                                                       |
| `npm run verify` from a clean tree | PASS                                                                            |
| Report path for this phase         | `docs/qa/PHASE_81_QA_HANDOFF.md` — the same file, updated for round 3           |

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest Codex model available for careful reading rather than
  for search depth
- **Reasoning level:** **High** — not Max. Round 2's two findings both came from
  walking a deployed screen across a day and reading what it said, and this
  retest is the same work on a smaller surface. Reach higher only if a repair
  turns out to have moved the architecture rather than the line.
- **Conversation:** **THE SAME CODEX CONVERSATION THAT WROTE ROUNDS 1 AND 2.**
- **Report path:** `docs/qa/PHASE_81_QA_HANDOFF.md`, updated in place

## COPY/PASTE PROMPT

```text
Independent QA — Phase 81, correctness and truthfulness. Round 3, retest after
repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Preview:
https://bill6006.github.io/life-command-os-rebuild/preview/

You are the same Codex conversation that wrote rounds 1 and 2 of this report.
Your two open findings are QA-81-006 and QA-81-007 and both are reported
repaired. Do not repair application or product code: you may create or update
only docs/qa/PHASE_81_QA_HANDOFF.md and narrowly scoped QA evidence artifacts.

Checkpoint
- Product checkpoint: 7e00dac
- Deployed Preview SHA: read it live from the URL below rather than from this
  file. The commits that wrote these documents sit on top of the checkpoint and
  change no byte the browser downloads.
- These are two facts, not one. Prove the relationship with
  `node scripts/checkpoint-equivalence.mjs 7e00dac --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
  rather than by comparing strings. That is D-097 and DEF-0061, and a deployed
  SHA past the checkpoint is not a reason to refuse to test.

WORK IN THIS ORDER

1. YOUR TWO REPRODUCTIONS, PRESSED AGAIN ON THE DEPLOYED BUILD, before reading
   anything the builder wrote about them.
2. THE THIRD DEFECT THE REPAIR FOUND, which you did not report and should
   judge — below.
3. THE REGRESSIONS, HELD AGAINST THE ACCEPTANCE MEANING. Round 2's own lesson
   is the one to apply: both findings were interactions and collateral, not the
   thing anyone was looking at. Ask what each new guard would have to be wrong
   about for the defect to come back green, and reintroduce at least one of the
   two root seams yourself.
4. COLLATERAL. The repair touched the filter, the engine's copy, one horizon
   fragment used in six frames, and the memory provider. Read whole screens
   across the library and the block sweep for anything that moved which should
   not have.
5. THE STANDING GATES, as before.
6. FULL-SUITE DUPLICATION ONLY ON A CONCRETE TRIGGER.

QA-81-006 — the repetition filter and the limiter

  Reproduction: your own. "A morning after three bad nights", one uninterrupted
  session, Now at 15:00, 20:00 and 23:00 on 2026-09-15, pressing no lifecycle
  action. The third hour must not become the study advice the app has spent the
  day declining.

  What changed: the two rules are ordered rather than left to compete. When the
  repetition rule withholds the only candidate that answers a named limiter,
  nothing that fails to answer that limiter may take its place; what is left is
  a real no-action state with copy that says why. "Answers the limiter" is now
  one definition read by the dimension that rewards it, the filter that protects
  it and the invariant that sweeps for it.

  Judge specifically:
  - The new no-action copy. It says "What is short has one answer here, and it
    has already been in front of you today. Everything else here works against
    it." Is that true, and is it the right thing to say to him at eleven at
    night? Saying nothing is one of the three outcomes you sanctioned; this is
    what saying nothing looks like.
  - The bound. The rule fires only when the withheld move was itself an answer
    to the limiter. Without that bound, an ordinary repetition under a time or
    coverage limiter would blank the screen — a worse defect than the one
    repaired. There is a test for that direction; check that it is real.
  - Measured blast radius: 2 of 105 decisions across the library with the ledger
    running, both of them the reported defect. Reproduce that count if you doubt
    it.

  A sibling was found and fixed, and it matters to how you test: the session
  ledger used to survive a change of history, so loading one laboratory fixture
  after another carried the first one's showings into the second and a move
  could arrive already used up. No owner can reach that; every auditor can, and
  it made the builder's own Android gate report the wrong screen for this very
  finding. If your round-2 notes contain a screen that looked odd after a
  scenario swap, that is probably why.

QA-81-007 — the sentence at late night

  Reproduction: your own. "A week pointed at the house" at 19:30 — refuse twice,
  answer the soreness question, refuse a third time, advance four hours to 23:30.

  What changed: `blockNoun` is documented as a noun phrase and returned an adverb
  for late night; the fallback arm returned a phrase that already carried a
  relative clause and broke the same frame. Both are fixed at the contract — a
  determiner and at most two words for every block — rather than at the
  sentence. Every no-action branch is now held as a finished sentence at every
  block in tests/synthetic/no-action-copy.test.ts, which required exporting the
  copy function so the catalogue can be rendered at all.

THE THIRD DEFECT, WHICH YOU DID NOT REPORT — please judge it

  Rendering that catalogue for the first time turned up a violation of gate item
  1, which you passed in both rounds and which block-sweep.test.ts sweeps for
  directly. The `nothing-in-reach` no-action detail ended "...which is about its
  reach rather than about your evening" — at every block, including nine in the
  morning. It survived because the state is not reached before the evening on
  any history in the library, so no sweep ever rendered it.

  It now reads the horizon. Two things worth your judgement:
  - Whether the repaired wording is right at each block.
  - Whether gate item 1 should be considered met by a sweep over reachable
    states at all, or whether the acceptance instrument for owner-visible copy
    has to enumerate the catalogue. The builder's position is that both are
    needed and neither replaces the other, and PHASE_STATUS.md says so under the
    gate table.

READ AFTER STEP 1, NOT BEFORE

- docs/PHASE_STATUS.md — step 81.7 is this repair.
- docs/DEFECT_LEDGER.md — DEF-0085 and DEF-0086.
- docs/DECISION_LOG.md — D-126 and D-127, both written during a repair, which
  makes them the ones most worth disputing.
- docs/WHOLE_APP_INTELLIGENCE_AUDIT.md sections 6, 9 and 10, unchanged.
- docs/CANONICAL_REBUILD_PLAN.md sections 4.3, 4.6, 6, 10, 12, 36, 42, 43, 58
  and 63.

THE GATE — unchanged, four items

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

WHAT IS SETTLED AND IS NOT BEING RELITIGATED

QA-81-001 through QA-81-005, which you confirmed repaired in round 2. The
sore/rested ordering, which you adjudicated and accepted; it stays listed in
PHASE_STATUS.md as a judgement rather than a derivation, and the record now says
you accepted it. Every round-1 PASS. Re-check any of these only where this
repair could plausibly have moved them — steps 3 and 4 above.

STILL OPEN FOR THE OWNER, AND NOT YOURS OR THE BUILDER'S TO CLOSE

Q1 Adaya's age and normative references (blocks AUD-0018 only); Q4 legacy
evidence admissibility (blocks AUD-0030(b) only); Q6 live model inference
(D-025 stands); Q7 which emotional dimensions exist (blocks AUD-0011's
emotional half); Q8 private evidence versus the concept registry (blocks
AUD-0040). Repeat them in your report; do not answer them.

AUD-0027's refusal half remains deliberately unshipped under D-115. AUD-0035's
weight question remains Phase 82's. The Phase 8 carry-forwards and the three
deliberate non-features — no import from the QA laboratory, no partial import,
no undo button — remain unchanged. No new domain, screen, capability, provider,
sync, notification, scoring redesign or audit expansion is in scope.

ONE KNOWN TRANSIENT

The rotating Playwright page.goto ERR_ABORTED did not occur in the builder's
last two full runs and you did not see it in either round. Reported rather than
declared gone.

WRITE

docs/qa/PHASE_81_QA_HANDOFF.md, updated in place for round 3, to the contract in
canonical plan section 43 and qa/README.md: phase and round; checkpoint SHA
tested; deployed SHA tested and how the relationship was established;
Android/mobile configuration; governing acceptance criteria; flows tested with
PASS/FAIL each; for each of QA-81-006 and QA-81-007 an explicit REPAIRED or NOT
REPAIRED with the evidence; your judgement on the third defect and on whether
gate item 1's instrument is sufficient; exact reproductions for any new defect;
semantic, behavioural, privacy and mobile findings; blocking versus
non-blocking; automated tests that gave false confidence; deferred items
confirmed unchanged; overall PASS or FAIL.

End with D-082 and D-092: the complete ready-to-paste next prompt in the same
response, without waiting for another owner turn — to the builder conversation
for repair on FAIL, or for the GREEN closeout on PASS — plus the model, the
level, the conversation instruction and a short standalone launcher naming this
repository and the exact MD file.
```

---

**Model:** the strongest Codex model available
**Intelligence level:** High
**Conversation:** THE SAME Codex conversation that wrote rounds 1 and 2

```text
Continue independent QA on the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the current independent-QA handoff
exactly as written. It is Phase 81, round 3 — the retest of QA-81-006 and
QA-81-007.

Do not ask me to paste the file contents.
```
