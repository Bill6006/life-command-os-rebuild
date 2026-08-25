# Next prompt

**Phase:** 81 — **QA round 2, retest after repair**

Canonical plan section 43 for the workflow, section 58 for the report format.
Independent QA is Codex (D-090); Claude builds. Every handoff ends with the
model, the level, the conversation and a short copyable launcher (D-092).

**Round 1 returned FAIL on five blocking findings.** All five are repaired. The
phase stays **YELLOW — READY FOR INDEPENDENT QA** and remains Phase 81; under
D-077 the builder conversation may not approve its own phase, and under D-109
and D-092 a retest keeps the phase number and goes to the **same Codex
conversation that wrote the round-1 report**.

The round-1 report is [`qa/PHASE_81_QA_HANDOFF.md`](qa/PHASE_81_QA_HANDOFF.md).
The builder's own report is [`PHASE_STATUS.md`](PHASE_STATUS.md); the
specification is section 6 of
[`WHOLE_APP_INTELLIGENCE_AUDIT.md`](WHOLE_APP_INTELLIGENCE_AUDIT.md).

|                                    |                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Product checkpoint                 | `1fc6420` — the last commit that changes the bundle                             |
| Deployed Preview SHA               | past `0aff416` by the commit that wrote this file — **read it live**, see below |
| Relationship                       | proved with `scripts/checkpoint-equivalence.mjs`, never string equality (D-097) |
| Preview                            | https://bill6006.github.io/life-command-os-rebuild/preview/                     |
| Unit layer                         | 1,321 / 1,321 across 59 files (was 1,310)                                       |
| Browser                            | 495 / 495 — 165 each at 360, 430 and 1,280px (was 489)                          |
| Android-style gate, deployed build | clean, 86 checks (was 76)                                                       |
| `npm run verify` from a clean tree | PASS                                                                            |
| Report path for this phase         | `docs/qa/PHASE_81_QA_HANDOFF.md` — the same file, updated for round 2           |

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest Codex model available for careful reading rather than
  for search depth
- **Reasoning level:** **High** — not Max. Round 1 found what it found by
  reading assembled screens and pressing buttons, not by searching deeper, and
  the retest is the same kind of work: confirm five named repairs on the
  deployed build, and adjudicate one judgement the builder has stated rather
  than hidden. Reach higher only if a repair turns out to have moved the
  architecture rather than the line.
- **Conversation:** **THE SAME CODEX CONVERSATION THAT WROTE ROUND 1.** A
  retest is not an independent read of a new phase; it is the same reviewer
  checking whether what it reported is fixed, and it should carry its own
  round-1 reasoning with it (D-109, D-092).
- **Report path:** `docs/qa/PHASE_81_QA_HANDOFF.md`, updated in place

## COPY/PASTE PROMPT

```text
Independent QA — Phase 81, correctness and truthfulness. Round 2, retest after
repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Preview:
https://bill6006.github.io/life-command-os-rebuild/preview/

You are the same Codex conversation that returned FAIL on this phase in round 1.
Your five blocking findings are QA-81-001 through QA-81-005 and they are all
reported repaired. Do not repair application or product code: you may create or
update only docs/qa/PHASE_81_QA_HANDOFF.md and narrowly scoped QA evidence
artifacts.

Checkpoint
- Product checkpoint: 1fc6420
- Deployed Preview SHA: read it live from the URL below rather than from this
  file. It was 0aff416 when this was written, and the push that wrote this file
  has moved it again — without changing a byte the browser downloads, because
  neither commit touches the bundle.
- These are two facts, not one. Prove the relationship with
  `node scripts/checkpoint-equivalence.mjs 1fc6420 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
  rather than by comparing strings. This repository redeploys on every push,
  including a documentation-only one, so the deployed SHA may legitimately have
  moved past the checkpoint by the time you read it — that is D-097 and DEF-0061
  and it is not a reason to refuse to test.

WORK IN THIS ORDER

1. THE FIVE REPRODUCTIONS YOU WROTE, PRESSED AGAIN, ON THE DEPLOYED BUILD.
   Each of the five is reproduced below in your own steps. Run them first,
   before reading anything the builder wrote about them. A repair is not
   accepted because a test is green; it is accepted because the screen you
   described no longer says what you described.
2. THE REGRESSIONS, HELD AGAINST THE ACCEPTANCE MEANING. Round 1's sharpest
   finding was not any single defect: it was that three of the five had a green
   regression standing over them. For each repair, ask what the new regression
   would have to be wrong about for the defect to come back green. The builder
   claims each one was proved to fail against a faithful reintroduction; verify
   at least the two you consider most load-bearing by reintroducing the defect
   yourself.
3. THE ONE JUDGEMENT THE BUILDER IS ASKING YOU TO ADJUDICATE — below.
4. COLLATERAL. Five repairs touched the evaluator, the explainer, the filter,
   the engine and the guide. Read whole screens across the library and the block
   sweep for anything that moved which should not have.
5. THE STANDING GATES. verify from a clean checkout, the browser suite at three
   widths, the Android-style pass on the deployed build, the block sweep.
6. FULL-SUITE DUPLICATION ONLY ON A CONCRETE TRIGGER, as in round 1.

THE FIVE, WITH WHAT CHANGED AND WHERE TO STAND

QA-81-001 — the named-limiter invariant.
  You reported that `tests/synthetic/recovery-has-somewhere-to-go.test.ts`
  proved the capacity limiter fires and then proved nothing addresses it, and
  that the concern about a naively widened recovery generator was evidence
  about a bad fix rather than an exception to the criterion. That is accepted.
  The repair is not in the generator. `capacityFit` had been reading a soreness
  reading as an argument against every candidate; soreness is a statement about
  what the body can be ASKED for, so it now marks an effortful move down, marks
  a restorative one up, and says nothing about a light one. With that corrected,
  the sleep generator's gate opens on soreness without producing the outcome it
  had been closed to avoid. The invariant now names recovery AND capacity, and
  the fixture gained an entity so the sweep is not vacuous — in round 1's shape,
  the assertion that a sore body says nothing about a light move had been
  passing by never meeting a light move.
  Also verify: D-111's exception is narrowed to standing moves that are actually
  effortful. Without that bound it fired on sixteen of twenty-one histories once
  soreness had a move of its own. Section 47 fails a phase on too many
  questions. Count them yourself.

QA-81-002 — the trade-off sentence.
  Reproduction: deployed laboratory, "A morning after three bad nights", clock
  to 2026-09-15 15:00 America/Denver, open Now, read the whole reason. It should
  no longer say that subnetting is the better call while recommending that
  subnetting be put down, and it should still say what the choice cost. Check
  evening and late night too, which is where you found it held.
  What changed: no clause in explain.ts takes a noun from its caller any more.
  Watch for the opposite failure: the first repair also made the clause
  conditional on a limiter, which deleted AUD-0026 in every state the library
  can reach — no unit test caught it, because at no hour of any history is
  direction-fit materially against with nothing short. A browser test caught it.
  That state is now a unit test. Judge whether the wording that completes the
  clause when nothing is short is honest.

QA-81-003 — the ignored recommendation.
  Reproduction: your own. "A week pointed at the house", Now at 06:30, 10:30,
  14:30 and 19:30 on 2026-09-15, one uninterrupted session, no lifecycle action
  pressed. It should no longer show the same unchanged kitchen recommendation
  through the day.
  What changed: the filter now removes a move already put on screen twice today
  and left, which is a rule that cannot be outvoted by a weight. The score
  penalty stays as the gentler half. D-043 is untouched and the shown-ledger
  architecture guards are unchanged.
  Judge specifically: three histories in the library now end a day with every
  candidate held back for having been read already, and that state has its own
  copy because "none of them suit where you actually are" would be false there.
  Read it and say whether it is honest.

QA-81-004 — the promised question after the second refusal.
  Reproduction: your own. "A week pointed at the house", Now at 19:30, press
  Can't right now, then press it again. There should be no third move.
  What changed: the engine stops offering at two refusals, and the guide's
  threshold and the engine's are now the same number. An answer to the question
  re-opens the block — which is also the only route by which a third refusal
  exists at all, so verify that your round-1 observation still holds: a third
  refusal reaches "Nothing then" and stops for the block, and the block
  rollover still works.
  Judge specifically: the copy at two refusals does not promise a question,
  because the guide may have none worth asking. Whether the honest fallback is
  honest enough is yours to say. There is a regression that reaches it by
  spending the day's question allowance rather than by contriving a history.

QA-81-005 — clean-tree verify.
  `tests/synthetic/imported-origin.test.ts` rebuilt all twenty-one scenarios for
  every card it checked, and three new fixtures pushed it past the default
  timeout. It is linear now. Run verify from a clean checkout yourself.

THE ONE JUDGEMENT THE BUILDER IS ASKING YOU TO MAKE

On the sore-and-rested fixture the sleep-protection move out-ranks half an hour
with Adaya, 0.354 to 0.098. The gap is bottleneck-fit: 2.375 against −0.250.
capacity-fit now reads +0.48 for the restorative move, 0.00 for the half-hour
with Adaya and −0.66 for a walk, which is the correction QA-81-001 asked for —
nothing about the body is marking the light move down any more. What decides it
is a bottleneck the history states outright.

This is the outcome that caused the capacity gate to be closed in Phase 81, and
it is now reached with nothing false feeding it. The builder's position is that
section 10 item 13 protects time with Adaya from being merged into a generic
family or made conditional, and does not protect it from being out-ranked by a
history in which the body is the bottleneck. Adjudicate it. If you disagree, say
what the correct behaviour is rather than which number should move.

READ AFTER STEP 1, NOT BEFORE

- docs/PHASE_STATUS.md — step 81.6 is the repair, and the "Open, and named
  rather than left to be found" section is where the builder says what it thinks
  is still weak.
- docs/DEFECT_LEDGER.md — DEF-0080 to DEF-0084 are one entry per finding you
  raised, each naming the class rather than the line, and each recording what
  the green regression that failed to catch it had been asserting instead.
- docs/DECISION_LOG.md — D-122 to D-125 are the four decisions the repairs rest
  on. They are builder decisions written during a repair, which makes them the
  ones most worth disputing.
- docs/WHOLE_APP_INTELLIGENCE_AUDIT.md sections 6, 9 and 10, unchanged.
- docs/CANONICAL_REBUILD_PLAN.md sections 4.3, 4.6, 6, 10, 12, 42, 43, 47, 58
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

WHAT ROUND 1 PASSED AND IS NOT BEING RE-LITIGATED

Your round-1 PASS results stand: the horizon vocabulary, the morning answer, the
Adaya sequence rule and its evidence line, the honest-guess and learned-band
copy, the near-tie margin, the veto control and its lifting, truthful silence
and situation orientation, the consequential-question exception, and the mobile,
overflow and privacy pass. Re-check them only where a repair could plausibly
have moved them — steps 3 and 4 above.

STILL OPEN FOR THE OWNER, AND NOT YOURS OR THE BUILDER'S TO CLOSE

Q1 Adaya's age and normative references (blocks AUD-0018 only); Q4 legacy
evidence admissibility (blocks AUD-0030(b) only); Q6 live model inference
(D-025 stands); Q7 which emotional dimensions exist (blocks AUD-0011's
emotional half); Q8 private evidence versus the concept registry (blocks
AUD-0040). Repeat them in your report; do not answer them.

AUD-0027's refusal half remains deliberately unshipped (D-115) and round 1 did
not dispute it. AUD-0035's weight question remains Phase 82's; QA-81-003 is
fixed in the filter precisely so that the promise no longer rests on a weight.

Four items carry forward unchanged from Phase 8: the v297 ancestor export;
life-context-change mapping; the load-bearing literal NUL byte in derived record
ids; the archived skill-claim, faith-anchor and milestone-observation families.
Three deliberate non-features carry forward and are not gaps: no import from the
QA laboratory, no partial import, no undo button.

ONE KNOWN TRANSIENT, REPORTED AGAIN RATHER THAN RETRIED PAST

One Playwright test per full local run has historically failed at page.goto with
net::ERR_ABORTED, on a different spec each time. It did not occur on the
builder's last full run of 495. Local dev-server flake rather than a product
defect.

WRITE

docs/qa/PHASE_81_QA_HANDOFF.md, updated in place for round 2, to the contract in
canonical plan section 43 and qa/README.md: phase and round; checkpoint SHA
tested; deployed SHA tested and how the relationship was established;
Android/mobile configuration; governing acceptance criteria; flows tested with
PASS/FAIL each; for each of QA-81-001 to QA-81-005 an explicit REPAIRED or NOT
REPAIRED with the evidence; exact reproductions for any new defect; semantic,
behavioural, privacy and mobile findings; blocking versus non-blocking;
automated tests that gave false confidence; the adjudication asked for above;
deferred items confirmed unchanged; overall PASS or FAIL.

End with D-082 and D-092: the complete ready-to-paste next prompt in the same
response, without waiting for another owner turn — to the builder conversation
for repair on FAIL, or for the GREEN closeout on PASS — plus the model, the
level, the conversation instruction and a short standalone launcher naming this
repository and the exact MD file.
```

---

**Model:** the strongest Codex model available
**Intelligence level:** High
**Conversation:** THE SAME Codex conversation that wrote the round-1 report —
required, because a retest is the reviewer checking its own findings

```text
Continue independent QA on the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the current independent-QA handoff
exactly as written. It is Phase 81, round 2 — the retest of the five blocking
findings you raised.

Do not ask me to paste the file contents.
```
