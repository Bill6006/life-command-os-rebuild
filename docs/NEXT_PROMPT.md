# Next prompt

Canonical plan section 43, and the independent-QA protocol in
[`qa/README.md`](qa/README.md). Independent QA is Codex (D-090); Claude builds.
Every handoff ends with the model, the level, the conversation and a short
copyable launcher (D-092) — the detail lives here, in the repository.

**Phase 6 is YELLOW — ROUND 5 REPAIRED, AWAITING CODEX RETEST.** Codex's Round
5 retest confirmed the Round 4 store race repaired and failed the phase on
**R5-B1**: the laboratory's clock, zone and week start survived the return, so
owner records later than the fixture instant read as future and disappeared
until reload. Repaired.

Builder account in [`PHASE_STATUS.md`](PHASE_STATUS.md); the defect is DEF-0058
in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md); the decisions are D-090, D-091 and
D-092 in [`DECISION_LOG.md`](DECISION_LOG.md).

---

## NEXT ACTION

- **System:** **Codex**
- **Model:** GPT-5.1-Codex-class — the current Codex coding/review model, or its
  nearest equivalent if it has been renamed
- **Reasoning level:** **Medium**
- **Conversation:** **SAME — the Codex conversation that ran Rounds 3, 4 and 5.**
- **Why this model:** reproducing two concrete deployed sequences and judging a
  repair against acceptance criteria it wrote itself.
- **Why this level:** Medium. The boundary is located and written down; this is
  verification rather than open root-cause search. Reach higher only if
  something new appears, and say so.
- **Why the same conversation:** `qa/README.md`'s conversation rule — a retest
  returns to the conversation that ran the original test.

---

## COPY/PASTE PROMPT

```text
Phase 6's Round 5 repair is ready for your retest. This is the same Codex QA
conversation that ran Rounds 3, 4 and 5 — you have your own reproductions of
R5-B1 and the acceptance criteria you set for it.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_06_QA_HANDOFF.md. Update it in place with a
"Round 6 — Codex retest" section. It is the only file you may write, and you
may not change application or product code. Your Round 5 report was committed
exactly as you wrote it.

START WITH THE APP.

Record something of your own at a normal Now, dated today. Then run both of
your Round 5 reproductions on the deployed build:

  1. Load "One answer, and a lot of silence" (June clock), answer its energy
     question, and immediately press Show mine.
  2. From the recovered owner, load "Two ordinary weeks" (February clock) and
     immediately press Empty the laboratory.

After each, your acceptance criteria are the ones to judge against: owner
source, owner snapshot, real/system time, owner/system zone, owner week-start
interpretation and travelled = false, observable together, without a reload. An
owner record later than the fixture clock must be visible immediately and after
pending work settles. No fixture row, clock or notice may remain.

Then judge the whole class rather than the two sequences: a scenario loaded
after another scenario; time-travelling inside the laboratory and then
returning; returning while an answer is still being written; and whether
anything else that is part of the visible context is still left behind.

WHAT THE BUILDER CHANGED, AND WHAT TO BE SCEPTICAL OF

MemoryProvider.clear() now publishes the whole context in one continuation. The
frame is restored to system defaults rather than remembered from before the
laboratory took over — the reasoning is in the code, and the argument is that
nothing outside QA can change the clock, zone or week start. Check that
argument; if it is wrong, the fix is a stash and the comment says so.

projection.ts is unchanged in behaviour and now states what it does not cover.

You were right about the coverage. The Round 4 return tests seeded the owner's
row one day BEFORE the fixture clock, so they could not observe suppression.
The seed is now dated August, after every scenario clock, and
tests/unit/memory-provider-race.test.tsx asserts the rendered view at a
controlled clock rather than only the store. The act() environment warnings are
fixed. Nine reintroductions across Rounds 4 and 5 were run and all nine caught;
one escaped first time because the test never asserted the zone came back.

ONE THING REPORTED RATHER THAN BURIED

During this repair the full unit suite failed once on
tests/synthetic/guide-resume.test.ts, "never re-asks something already
answered". That test is pure and clock-free and the builder did not touch it. It
did not recur in four subsequent full runs or three focused runs, and the
failing run was on a heavily loaded machine. It could not be reproduced, so it
cannot be called nothing. If you can provoke it, it is worth a finding.

ALSO CONFIRM NOTHING YOU PASSED HAS REGRESSED

The two databases, fixture inspectability, fixture-scoped writes, reload and
notice behaviour, R3-B2, R3-B3, the seven semantic invariants, QA-A1, section
51, DEF-0034 to DEF-0044, the exact-three-verb decision, and every explicit
deferral. Full-suite duplication only on a concrete trigger.

THE CHECKPOINT

The product checkpoint is in docs/PHASE_STATUS.md's build identity table. The
Preview serves the current main HEAD and every push redeploys, so
build-info.json will normally report a docs commit rather than the checkpoint.
Verify with `git diff <checkpoint>..HEAD --name-only`, which must list nothing
outside docs/.

HOW THIS ENDS

Update docs/qa/PHASE_06_QA_HANDOFF.md with the retest record and an overall
PASS or FAIL. End your response with the model, the reasoning level, the
conversation instruction, and a short copyable launcher naming the exact file
the next conversation must read — a Claude model where the next step is the
builder's (D-092). Write the complete prompt into the report file rather than
into the response.

On PASS the next step is CURRENT — the Claude builder conversation — for the
GREEN closeout. On FAIL it is CURRENT for another repair round, and Phase 6
stays YELLOW.

Do not ask the owner to paste anything — you have the paths.
```
