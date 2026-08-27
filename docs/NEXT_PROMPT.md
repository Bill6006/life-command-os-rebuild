# Next prompt

**Phase:** 83 — **first submission to independent QA**

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 83 builder, and not any Phase 82
conversation.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 83 is YELLOW — READY FOR INDEPENDENT QA.** Under D-077 the builder
conversation may not approve its own phase, and nothing it concluded while
building changes that. This is a **first submission**, not a retest, so it goes
to a **new Codex conversation**.

**The `**Phase:**` field is `83` for every round of this phase.** Never `9`,
`09`, `8.3` or `9.1` — those parse at or below 82 and never route. Plan section
43A and D-159 have the map.

**Why High and not the top of Codex's range.** The acceptance items are written
down, the builder has named where it thinks it is weakest, and what this phase
needs is a person reading whole screens and tracing claims to evidence rather
than depth of search. Reach higher only if a finding suggests a boundary is
wrong rather than a line, and say why. **Never Max** — that is Claude's level
and Codex does not have it; a block asking for it stops the orchestrator with the
level unset.

The builder's own report is [`PHASE_STATUS.md`](PHASE_STATUS.md); the QA brief
is [`qa/PHASE_83_QA_HANDOFF.md`](qa/PHASE_83_QA_HANDOFF.md); the specification
is section 8 of [`PRODUCT_ADJUDICATION.md`](PRODUCT_ADJUDICATION.md).

|                                    |                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Product checkpoint                 | `582f648` — the commit the gate was run on (D-147); `21edfe8` is the last that changes the bundle |
| Deployed Preview SHA               | `51ef425` when the builder last read it; it moves with every docs push — **read it live**         |
| Relationship                       | proved with `scripts/checkpoint-equivalence.mjs`, never string equality (D-097)                   |
| Preview                            | https://bill6006.github.io/life-command-os-rebuild/preview/                                       |
| Unit layer                         | 1,753 / 1,753 across 80 files (was 1,675 across 76)                                               |
| Browser                            | 582 / 582 — 194 each at 360, 430 and 1,280px (was 552)                                            |
| Android gate, deployed             | clean, 183 checks against `51ef425` (was 119)                                                     |
| `npm run verify` from a clean tree | PASS; CI green on both jobs at `51ef425`                                                          |
| Privacy scan                       | clean, 270 tracked files                                                                          |
| Report path for this phase         | `docs/qa/PHASE_83_QA_HANDOFF.md` — Round 0 is the builder's brief; QA owns everything below it    |

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** a Codex model that can hold a phase's semantics and read a screen
  critically. This phase is correctness and truthfulness work on four owner
  surfaces; the findings most worth having come from reading whole screens
  against the record behind them.
- **Reasoning level:** **High.** See the reasoning above. Never Max.
- **Conversation:** **NEW Codex conversation.** First submission, and
  independence is the whole point of D-077.
- **Report path:** `docs/qa/PHASE_83_QA_HANDOFF.md`

## COPY/PASTE PROMPT

```text
Independent QA — routing Phase 83 of Life Command OS, "the instrument, and the
things that are untrue". First submission.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Preview:
https://bill6006.github.io/life-command-os-rebuild/preview/

You are Codex running the independent QA protocol (D-077, D-090). The builder
conversation may not approve its own phase, and you are not it. Do not repair
application or product code: you may create or update only
docs/qa/PHASE_83_QA_HANDOFF.md and narrowly scoped QA evidence artifacts. Round
0 of that file is the builder's brief; every round from 1 on is yours.

Your **Phase:** field is 83, in every round. Never 9, 09, 8.3 or 9.1 — those
parse at or below 82 and never route.

CHECKPOINT

- Product checkpoint: 582f648
- Deployed Preview SHA: read it live from
  https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
- These are two facts, not one. Prove the relationship with
  `node scripts/checkpoint-equivalence.mjs 582f648 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
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
5. TARGETED KNOWN-DEFECT REGRESSION for the surfaces this phase touched — Now,
   Timeline, the Private page and the two domain-page correction controls.
6. ARCHITECTURE INSPECTION where a defect suggests the boundary is wrong rather
   than the line.
7. FULL-SUITE DUPLICATION ONLY ON A CONCRETE TRIGGER — a builder claim that does
   not match observed behaviour, a suspected false green, or a change to the
   test harness itself. Green builder tests are evidence; watching them go green
   again buys nothing and costs the attention steps 1 and 2 need.

READ AFTER STEP 2, NOT BEFORE

- docs/PRODUCT_ADJUDICATION.md section 8 — this phase's specification and its
  five-item acceptance gate; section 11 is the do-not-change list.
- docs/qa/PHASE_83_QA_HANDOFF.md — Round 0, the builder's brief.
- docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md — findings F30, F33, F38, F39, F40, F41
  and F43, and evidence entries E02, E13, E17, E19, E22, E31, E32, E34 and E36.
  This document is not edited by anyone, including you.
- docs/PHASE_STATUS.md — the routing 83 entry. "The enumerated brief" and "Open,
  and named rather than left to be found" are where the builder disagrees with
  itself; start your architecture inspection there.
- docs/DECISION_LOG.md — D-159, D-160, D-161 and D-153 govern the work.
  D-174, D-175 and D-176 are this phase's own and are therefore the ones most
  worth disputing.
- docs/DEFECT_LEDGER.md — DEF-0105 to DEF-0109.
- docs/CANONICAL_REBUILD_PLAN.md sections 11, 26, 37, 43A, 50, 58, 61, 62 and 64.

THE GATE — five items (PRODUCT_ADJUDICATION.md section 8)

1. A completion of the same move on ANY earlier day cannot settle today's
   recommendation or disable its controls. To be proved on the three-day fixture
   AND by faithfully reintroducing the defect and watching the guard fail. The
   builder claims a reintroduction; check the proof rather than the claim.
2. No owner-visible sentence asserts a quantity of history the app did not
   count, proved by rendering the copy catalogue at every history size —
   including four records — rather than only the sizes the library reaches.
3. The Private page's promise and Timeline's behaviour agree, proved from BOTH
   ends.
4. Every owner-facing input has an accessible name, swept.
5. The ordinary-use journey from a near-empty store completes end to end, and
   the points where it CANNOT proceed are enumerated with reasons in the phase
   record. That list is routing 84's brief, so judge it for completeness rather
   than only for accuracy.

Plus the standing gates: npm run verify from a clean checkout, the browser suite
at three widths, an Android-style pass on the deployed build, the privacy scan,
the block sweep across every scenario at five blocks, and the standing copy
guards — no percentage, rank, grade or score about the child, and no score about
the owner.

WHAT IS NEW ON A SCREEN, AND WHERE TO FIND IT

Three histories were added to the QA laboratory and they are listed first:

- "The first evening" — one record, a single guide answer, and nothing else.
  This is the near-empty store the whole phase is accepted against.
- "Four things, over three days" — four answers, none withdrawn.
- "Three days since that walk" — a walk completed on 22 May, read on 25 May.
  This is the only history that reaches the state F43 reported.

"One answer, and a lot of silence" is unchanged and is the other four-record
case; it also holds a record dated the following day, which matters on Timeline.

Surfaces that changed: Now (the state row and the lifecycle controls on a move
whose match now runs a day at a time; the nothing-proposed sentence), Timeline
(the page lede and the end-of-list sentence), the Private page (its lede), and
the two free-text correction controls on every domain page.

WHERE THE BUILDER THINKS IT IS WEAKEST — start here, and disagree freely

- The three-day repair changed one function. Whether anything ELSE in the app
  resolves "where does this stand" through an action's identity rather than
  today's occurrence is worth deciding independently of the builder's sweep.
- The three-day window must NOT have narrowed — recent-duplication and the
  ignoring-is-a-response rule both need to see beyond today. A repair that
  quietly narrowed it would pass a test written to check the match.
- The reworded sentences are true at the sizes that were rendered. Whether
  history size and part of day are the right two axes is a judgement, not a
  fact.
- The private promise is longer than the sentence it replaced. Whether it is the
  sentence the owner needs, on a phone, at 360px, is a reading.
- The two labelled inputs on a real handset: focus order, touch target, and
  whether the note reads as help or as clutter.
- The enumerated brief in PHASE_STATUS.md is a deliverable and it is routing
  84's scope. Whether an ordinary journey stops anywhere it does not name is the
  most valuable thing you can find.

STILL OPEN FOR THE OWNER, AND NOT YOURS OR THE BUILDER'S TO CLOSE

Q1 Adaya's age and normative references; Q4 legacy evidence admissibility; Q6
live model inference, reopened before routing 91 with the finite concept
vocabulary refused as a ceiling (D-172). Repeat them in your report; do not
answer them.

WHAT TO PRODUCE

Per qa/README.md sections 3 and 3a, in the same response as the report: PASS or
FAIL overall and per acceptance item; the QA-tested and deployed SHAs; the
Android configuration; exact reproductions, with semantic, behavioural and
mobile/UI defects separated and blocking distinguished from non-blocking; which
existing automated tests gave false confidence; confirmation that the deferrals
are unchanged; and the complete next handoff written into
docs/qa/PHASE_83_QA_HANDOFF.md — on FAIL addressed to the CURRENT Claude builder
conversation for routing 83, on PASS addressed to the same conversation for the
GREEN closeout.

The repair block is Claude's and takes Max. Your retest block is Codex's and
takes High. Do not copy one level into the other.

Do not ask the owner to paste file contents.
```

### Short launcher

**System:** Codex — independent QA. **Model:** Codex. **Level:** High.
**Conversation:** NEW — a new Codex conversation, not the routing 83 builder and
not any Phase 82 conversation.

```text
Independent QA — routing Phase 83 of Life Command OS. First submission.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the COPY/PASTE PROMPT there exactly
as written. Start with sealed cold use of the deployed Preview before you open
any repository document.

Your **Phase:** field is 83 — never 9, 09, 8.3 or 9.1, which never route.

Write your report to docs/qa/PHASE_83_QA_HANDOFF.md, below the builder's Round 0.

Do not ask me to paste file contents.
```

<!-- LCO_COMPLETE -->
