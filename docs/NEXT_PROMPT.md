# Next prompt

**Phase:** 82 — **first submission to independent QA**

Canonical plan section 43 for the workflow, section 58 for the report format.
Independent QA is Codex (D-090); Claude builds. Every handoff ends with the
model, the level, the conversation and a short copyable launcher (D-092).

**Phase 82 is YELLOW — READY FOR INDEPENDENT QA.** Under D-077 the builder
conversation may not approve its own phase, and nothing it concluded while
building changes that. This is a **first submission**, not a retest, so it goes
to a **new Codex conversation**.

Nine audit findings in six work packages. The membership test was one question
and nothing else — _would Phase 9 approve the wrong product structure if this
landed afterwards?_ — so this phase creates the persistent owner-visible objects
the visual phase has to design around. **Its gate is structural rather than
truthfulness-based**, which is a different kind of acceptance from the one
Phase 81 just went through. Do not import Phase 81's gate shape onto it.

The builder's own report is [`PHASE_STATUS.md`](PHASE_STATUS.md); the
specification is section 7 of
[`WHOLE_APP_INTELLIGENCE_AUDIT.md`](WHOLE_APP_INTELLIGENCE_AUDIT.md).

|                                    |                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Product checkpoint                 | `befcb70` — the last commit that changes the bundle                             |
| Deployed Preview SHA               | may have moved past the checkpoint by the docs commits — **read it live**       |
| Relationship                       | proved with `scripts/checkpoint-equivalence.mjs`, never string equality (D-097) |
| Preview                            | https://bill6006.github.io/life-command-os-rebuild/preview/                     |
| Unit layer                         | 1,470 / 1,470 across 66 files (was 1,332 across 60)                             |
| Browser                            | 528 / 528 — 176 each at 360, 430 and 1,280px (was 501)                          |
| Android-style gate, deployed build | see PHASE_STATUS.md — run against the deployed build after the deploy           |
| `npm run verify` from a clean tree | PASS                                                                            |
| Tournament, re-baselined           | 100 / 100 deterministic, 100 / 100 hybrid, under a widened rubric               |
| Report path for this phase         | `docs/qa/PHASE_82_QA_HANDOFF.md` — new file                                     |

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest Codex model available. This phase is architecture
  work with owner-visible consequences, and the findings most worth having will
  come from reading whole screens against the record behind them rather than
  from search depth.
- **Reasoning level:** **High.** The acceptance items are written down and the
  builder has named where it thinks it is weakest; what this needs is careful
  reading rather than open invention. Reach higher only if a finding suggests a
  boundary is wrong rather than a line.
- **Conversation:** **NEW Codex conversation.** First submission, and
  independence is the whole point of D-077.
- **Report path:** `docs/qa/PHASE_82_QA_HANDOFF.md`

## COPY/PASTE PROMPT

```text
Independent QA — Phase 82, the structural intelligence skeleton. First
submission.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Preview:
https://bill6006.github.io/life-command-os-rebuild/preview/

You are Codex running the independent QA protocol (D-077, D-090). The builder
conversation may not approve its own phase, and you are not it. Do not repair
application or product code: you may create or update only
docs/qa/PHASE_82_QA_HANDOFF.md and narrowly scoped QA evidence artifacts.

CHECKPOINT

- Product checkpoint: befcb70
- Deployed Preview SHA: read it live from
  https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
- These are two facts, not one. Prove the relationship with
  `node scripts/checkpoint-equivalence.mjs befcb70 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
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
   than the line. This phase is architecture work, so this step matters more
   here than it did in Phase 81.
7. FULL-SUITE DUPLICATION ONLY ON A CONCRETE TRIGGER — a builder claim that does
   not match observed behaviour, a suspected false green, or a change to the
   test harness itself. Green builder tests are evidence; watching them go green
   again buys nothing and costs the attention steps 1 and 2 need.

READ AFTER STEP 2, NOT BEFORE

- docs/WHOLE_APP_INTELLIGENCE_AUDIT.md — section 7 is this phase's
  specification and its opening line is the membership test; then the nine
  findings themselves: AUD-0046, AUD-0021, AUD-0004, AUD-0020, AUD-0024,
  AUD-0015(a), AUD-0017, AUD-0035, AUD-0039. Section 10 is the do-not-change
  list.
- docs/PHASE_STATUS.md — the Phase 82 entry, including "Open, and named rather
  than left to be found". That section is where the builder disagrees with
  itself; start your architecture inspection there.
- docs/DECISION_LOG.md — D-128 to D-139 are this phase's, and they are the
  builder's own decisions, which are the ones most worth disputing. D-137 and
  D-139 carry the most judgement.
- docs/DEFECT_LEDGER.md — DEF-0087 and DEF-0088 are this phase's entries, and
  both were found by the phase's own new work rather than reported.
- docs/CANONICAL_REBUILD_PLAN.md sections 4.1, 4.3, 4.4, 4.5, 4.6, 6, 7, 15, 17.2,
  19, 20, 21, 22, 42, 43, 50, 58, 61, 62, 63 and 64.

THE GATE — six items, all structural (audit section 7)

1. A thread never bypasses the arbiter — an architecture-guard test, per section
   17.2's existing shape.
2. A dominant limiter overrides a thread — `thread-fit` weighted below
   `bottleneck-fit`, asserted directly.
3. A thread can be stopped in one tap, expires on its own, and explains why it
   is active.
4. `hold` names a real later block and cannot be returned when no later block
   scores higher.
5. The tournament is re-run and re-baselined on the re-cut instrument
   (AUD-0035, AUD-0039), with MAX_NUDGE expressed relative to the ranked spread
   rather than as an absolute.
6. No percentage, rank, grade or score about the child survives package 5 — the
   Phase 81 copy guard (g003-growth-evidence.test.ts) must still bite. The
   builder proved this by reintroduction twice; check the proof rather than the
   claim.

Plus the standing gates: npm run verify from a clean checkout, the browser suite
at three widths, an Android-style pass on the deployed build, and the block
sweep across every scenario at five blocks.

WHAT IS NEW ON A SCREEN, AND WHERE TO FIND IT

Four fixtures were added to the QA laboratory, and three of them are the only
way to see a state this phase created:

- "A school morning" — 08:20 on a Wednesday, with her school day starting at
  half past. The same history at ten o'clock is the contrast AUD-0004 asks for:
  the same day block, opposite answers about a lab. Use "Sweep the day".
- "Before the house is up" — the same Wednesday at half past five. This is the
  only history in the library that reaches the fifth Now state, a deferral.
- "Two sessions in" — ten days into a three-session course on subnetting. The
  only history that reaches a running thread.
- "Three times running, and the app noticed" now spans two settings, which is
  what makes the settled offer reachable at all (D-135).

Surfaces that changed: Now (the "Part of" row, the deferral state, the thread
offer, the two-step growth answer), Life (the threads list with a one-tap stop,
and the day's shape), the Career page (a date and a set of pieces on a goal),
the Fatherhood page (a stage on a development skill, set and unset).

WHERE THE BUILDER THINKS IT IS WEAKEST — start here, and disagree freely

- **Abstention makes the denominator differ between candidates**, so a candidate
  with more dimensions speaking about it is judged over a larger one. That is
  D-048's shape from Phase 3, made larger by removing 5.3 units of shared dead
  weight — and on "Nine months of evenings" it changed which of three candidates
  within 0.003 of each other wins. The builder argues the new ordering is the
  honest one. Judge whether a weighted mean is the right shape at all.
- **WORTH_DOING moved from 0.05 to 0.06**, derived from the range of the
  translation rather than from the library. D-137 has the argument. Judge
  whether the app is now too willing or too reluctant to speak, on real
  histories rather than on the number.
- **Three dimensions still score zero at full weight** for an absent reading.
  `instrument-recut.test.ts` enumerates them with reasons. Judge whether leaving
  them is defensible or whether the phase is half-done.
- **A thread's moves are a set rather than an ordered sequence**, which departs
  from AUD-0020's wording. D-133 has the reasoning. Judge it.
- **`goal-behind` is reached by no history in the library** and is named as such
  under D-139. Its sentence is rendered and swept elsewhere. Judge whether that
  is coverage or a gap.
- **The two-step growth answer is reachable only by doing it** — no fixture puts
  a growth result pending. Judge whether the interaction is right, on a handset.
- **The Life page grew, and a paragraph was trimmed to make it fit.** Judge
  whether the trim lost something and whether the day's-shape invitation reads
  as an aside or as homework (D-075).
- The copy is new on six surfaces. Read whole screens, not asserted strings.

STILL OPEN FOR THE OWNER, AND NOT YOURS OR THE BUILDER'S TO CLOSE

Q1 Adaya's age and normative references (blocks AUD-0018 only); Q4 legacy
evidence admissibility (blocks AUD-0030(b) only); Q6 live model inference
(D-025 stands, and D-024 was re-checked against the re-cut instrument); Q7 which
emotional dimensions exist; Q8 private evidence versus the concept registry.
Repeat them in your report; do not answer them.

Four carry forward unchanged from Phase 8: the v297 ancestor export;
life-context-change mapping; the load-bearing literal NUL byte in derived record
ids; the archived skill-claim, faith-anchor and milestone-observation families.
Three deliberate non-features carry forward and are not gaps: no import from the
QA laboratory, no partial import, no undo button. Phase 82 adds four more: no
generic thread creation, no calendar, no third schedule question, and no
percentage or progress bar anywhere.

AUD-0040, AUD-0045 and AUD-0047 are deliberately out of scope. Section 7
explains why for each. Their absence is not a finding.

ONE KNOWN TRANSIENT, REPORTED AGAIN RATHER THAN RETRIED PAST

One Playwright test per full local run has historically failed at page.goto with
net::ERR_ABORTED, on a rotating spec. It did not occur on this phase's full run
of 528, and did not occur in any of Phase 81's three QA rounds. Still reported
rather than declared gone.

WRITE

docs/qa/PHASE_82_QA_HANDOFF.md, to the contract in canonical plan section 43 and
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
**Conversation:** NEW Codex conversation — required for independence (D-077)

```text
Run independent QA on the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the handoff it contains exactly as
written. It is the Phase 82 first submission to independent QA.

Do not ask me to paste the file contents.
```

<!-- LCO_COMPLETE -->
