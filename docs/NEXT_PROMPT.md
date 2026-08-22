# Next prompt

Canonical plan section 43, and the independent-QA protocol in
[`qa/README.md`](qa/README.md). Independent QA is Codex (D-090); Claude builds.

Every handoff ends with the model, the level, the conversation and a short
copyable launcher (D-092). The detail lives here, in the repository — the owner
should never have to hunt through a report for the next instruction.

**Phase 6 is YELLOW — ROUND 4 REPAIRED, AWAITING CODEX RETEST.** Codex's Round
4 retest confirmed R3-B2, R3-B3 and the two physical databases, and failed the
phase on **R4-B1**: returning from the laboratory could publish an empty owner
history that stayed empty until a reload. Repaired.

Builder account in [`PHASE_STATUS.md`](PHASE_STATUS.md); the defect is DEF-0057
in [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md); the decisions are D-090, D-091 and
the new D-092 in [`DECISION_LOG.md`](DECISION_LOG.md).

---

## NEXT ACTION

- **System:** **Codex**
- **Model:** GPT-5.1-Codex-class — the current Codex coding/review model, or its
  nearest equivalent if it has been renamed
- **Reasoning level:** **Medium**
- **Conversation:** **SAME — the Codex conversation that ran Rounds 3 and 4.**
- **Why this model:** reproducing one concrete asynchronous failure on a
  deployed build and judging a repair against criteria it wrote itself.
- **Why this level:** Medium. The boundary is located, written down and covered
  in three layers; this is verification, not open root-cause search. Reach
  higher only if something new appears, and say so.
- **Why the same conversation:** `qa/README.md`'s conversation rule — a retest
  returns to the conversation that ran the original test.

---

## COPY/PASTE PROMPT

```text
Phase 6's Round 4 repair is ready for your retest. This is the same Codex QA
conversation that ran Rounds 3 and 4 — you have your own reproduction of
R4-B1 and the reasoning behind it.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_06_QA_HANDOFF.md. Update it in place with a
"Round 5 — Codex retest" section. It is the only file you may write, and you
may not change application or product code. Your Round 4 report was committed
exactly as you wrote it; the builder has not edited it.

START WITH THE APP.

Open the deployed Preview at a normal Now on a phone-sized Android-style
context. Record something of your own. Then open QA, load a scenario, inspect
it across Now, Timeline, Insights, Life and a domain page, and come back with
Show mine.

WHAT TO RETEST

1. R4-B1 — the return.

   Both entry points: Show mine on a normal surface, and Empty the laboratory
   in QA. After each, his own history must be on screen immediately, without a
   reload, and must still be there after pending work has had time to land.
   The fixture must not reappear. Try it having just answered a question while
   the fixture was on screen, and having just loaded a scenario, so there is
   real work in flight when you press it.

   Judge the whole class, not the one interleaving you reported: a scenario
   load the owner walks away from, a return that is overtaken by newer work,
   two operations over the same store finishing out of order, and busy/error
   state left behind by work that no longer owns the screen.

2. Everything Round 4 passed, which must stay passed.

   The two physical databases and the owner's bytes; fixture inspectability
   across normal surfaces; fixture-scoped writes; reload preserving the
   fixture and the notice; the notice copy itself; R3-B2's correction naming
   the action on Timeline; R3-B3's tracked concepts and the still-open
   emotional taxonomy; the seven semantic invariants; QA-A1; section 51;
   DEF-0034 to DEF-0044; the exact-three-verb decision; and every explicit
   deferral.

3. The coverage itself, because you were right about it.

   Your Round 4 regression failed focused and passed in the full suite on
   identical code. When the builder ran that same focused suite on this
   repair, it passed first time — so the browser test was deliberately not
   allowed to be the proof. The rule now lives in
   src/features/memory/projection.ts with its own sequence tests, and
   tests/unit/memory-provider-race.test.tsx drives the provider with fake
   stores whose reads the test holds open, so the overlap is constructed
   rather than hoped for. Judge whether that is genuinely deterministic and
   whether it covers what you reported. Five reintroductions were run and all
   five caught; three escaped on the first attempt, which is what moved the
   rule out of the component.

Full-suite duplication only on a concrete trigger, as before.

THE CHECKPOINT

The product checkpoint is in docs/PHASE_STATUS.md's build identity table. The
Preview serves the current main HEAD and every push redeploys, so
build-info.json will normally report a docs commit rather than the checkpoint.
That is expected. Verify it with `git diff <checkpoint>..HEAD --name-only`,
which must list nothing outside docs/.

HOW THIS ENDS

Update docs/qa/PHASE_06_QA_HANDOFF.md with the retest record and an overall
PASS or FAIL. In the same response, end with the model, the reasoning or
intelligence level, the conversation instruction, and a short copyable
launcher naming the exact file the next conversation must read — naming a
Claude model where the next step is the builder's (D-092). Write the complete
prompt into the report file rather than into the response.

On PASS the next step is CURRENT — the Claude builder conversation — for the
GREEN closeout. On FAIL it is CURRENT for another repair round, and Phase 6
stays YELLOW.

Do not ask the owner to paste anything — you have the paths.
```
