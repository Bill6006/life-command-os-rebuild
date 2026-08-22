# Next prompt

Canonical plan section 43, and the independent-QA protocol in
[`qa/README.md`](qa/README.md). The model, reasoning level and conversation
instruction sit outside the prompt so the owner can set them before pasting.

**Independent QA is Codex (D-090).** Claude builds; Codex tests. The loop is
Claude builds → Codex QA (NEW) → Claude repairs → the **same** Codex
conversation retests → PASS → Claude GREEN closeout → next phase.

**Phase 6 is YELLOW — ROUND 3 REPAIRED, AWAITING CODEX RETEST.** Codex's Round
3 retest confirmed all seven of the previous round's blockers repaired and
QA-A1 still repaired, and returned **FAIL** on three siblings: the QA
laboratory replaced the owner's real history, a scoped association correction
was described on Timeline by its verb, and `emotionalState` was declared
trackable while its readings were discarded. All three are repaired.

Builder account in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 6 —
Timeline + Insights"; the defects are DEF-0054, DEF-0055 and DEF-0056 in
[`DEFECT_LEDGER.md`](DEFECT_LEDGER.md); the principles are D-090 and D-091 in
[`DECISION_LOG.md`](DECISION_LOG.md), which gains an eighth invariant —
synthetic and real never share a store.

---

## NEXT ACTION

- **System:** **Codex**
- **Model:** GPT-5.1-Codex-class — the current Codex coding/review model, or its
  nearest equivalent if it has been renamed
- **Reasoning level:** **Medium**
- **Conversation:** **SAME — the Codex conversation that ran the Round 3
  retest.** It holds the three reproductions and its own reasoning about them.
- **Why this model:** the work is reproducing three concrete failures on a
  deployed build and judging whether the repairs meet criteria it wrote itself.
  That is a coding-and-review model's job, and Round 3 was done at this class.
- **Why this level:** Medium. All three boundaries are already located and
  written down; this is verification against stated criteria rather than open
  root-cause search. `qa/README.md` asks for the lowest level that does not risk
  quality — reach higher only if a new defect genuinely needs it, and say so.
- **Why the same conversation:** `qa/README.md`'s conversation rule. A retest
  after a builder repair returns to the conversation that ran the original test.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
Phase 6's Round 3 repair is ready for your retest. This is the same Codex QA
conversation that ran Round 3 — you have your own three reproductions and the
reasoning behind them.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_06_QA_HANDOFF.md. Update it in place with a
"Round 4 — Codex retest" section. It is the only file you may write, and you
may not change application or product code. The builder has not edited your
Round 3 report; it was committed exactly as you wrote it.

START WITH THE APP, NOT THE DIFF.

Open the deployed Preview at a normal Now on a phone-sized Android-style
context and use it. The three findings below are all about what the owner sees
and what happens to what he records, so reading them off the screen comes
first.

WHAT TO RETEST

1. R3-B1 — the laboratory and the owner's history.

   Record something on a normal Now. Confirm it persists. Then open QA, load a
   scenario, and confirm BOTH halves:
   - the fixture is still inspectable from Now, Timeline, Insights, Life and a
     domain page — that capability had to survive the repair;
   - his own record is not gone, and comes back when the laboratory is emptied.

   Then judge the rest of the boundary yourself: what happens on reload with a
   fixture loaded; whether answering a question while a fixture is on screen
   writes to the fixture rather than to his history; whether "Empty the
   laboratory" can reach his records at all; whether a deployment can orphan
   either store; and whether Preview and production remain separated.

   The repair also added a notice on every normal surface saying the history on
   screen is not his, with one press back. Judge that as product copy, not only
   as a mechanism: it is the thing standing between him and believing a
   synthetic evening is his own.

2. R3-B2 — the correction's subject in his own history.

   Reject the walk relationship, then read Timeline. The sentence must name the
   action, and must not name a verb that also fits the bike ride. Check the
   stored record still carries the scoped key, that the watershed still works,
   and that nothing underneath it was deleted.

3. R3-B3 — tracked concepts.

   `tracked` now names how a reading becomes a number, and emotionalState no
   longer carries it. Judge whether the type, the behaviour, the tests and the
   builder's claims are now honest about which concepts are trackable
   dimensions — and confirm no scale was invented for how he feels. The
   taxonomy question stays open to the owner; that was your acceptance
   expectation and it is the part most worth checking has not been quietly
   resolved by the implementation.

ALSO CONFIRM NOTHING YOU PASSED HAS REGRESSED

The seven semantic invariants from your cold-use audit, QA-A1's observe-first
owner flow, section 51's already-passing gate items, DEF-0034 to DEF-0044, the
exact-three-verb inferred-evidence decision you accepted, and every explicit
deferral (P4-6, P4-7, the never-settled started move, and Phase 5's four).

Full-suite duplication only on a concrete trigger, as before: a builder claim
that does not match what you observe, a suspected false-green, or a change to
the test harness itself.

WHAT THE BUILDER CHANGED

Read it fresh rather than from this list, which exists so you know where to
look and not what to conclude:

- src/features/memory/MemoryProvider.tsx, src/features/memory/memoryContext.ts
  — two databases, and which is active.
- src/features/shell/AppShell.tsx, AppShell.css — the notice.
- src/features/qa/QaScreen.tsx — the button that used to say "Clear
  everything".
- src/intelligence/association.ts, src/intelligence/corrections.ts,
  src/features/history/describe.ts, src/features/insights/InsightsScreen.tsx —
  reading an action back out of a scope, and naming it.
- src/domain/concepts.ts, src/intelligence/insights.ts — what `tracked` means.
- tests/browser/qa-lab.spec.ts, tests/unit/registries.test.ts,
  tests/synthetic/observed-relationships.test.ts — the three regressions, plus
  the cross-surface isolation coverage you asked for.

THE CHECKPOINT

The product checkpoint is in docs/PHASE_STATUS.md's build identity table.

The Preview serves the current main HEAD and every push redeploys, so
build-info.json will normally report a docs commit rather than the checkpoint
itself. That is expected and is not a mismatch. Verify it this way instead:
`git diff <checkpoint>..HEAD --name-only` must list nothing outside docs/. If
it lists anything else, the deployed product code is not the checkpoint's, and
that is a finding.

Check the SHA yourself against preview/build-info.json and against what the app
shows under More → This build.

HOW THIS ENDS

Update docs/qa/PHASE_06_QA_HANDOFF.md with the retest record and an overall
PASS or FAIL, and in the same response, without being asked: the verdict; the
QA-tested SHA; the report path; the recommended model, level and conversation
instruction for the next action, each with a one-sentence reason — naming a
Claude model where the next step is the builder's — and the complete next
prompt written into the report file. Close with a short launcher rather than
repeating the whole prompt inline.

On PASS the next prompt goes to CURRENT — the Claude builder conversation — for
the formal GREEN closeout. On FAIL it goes to CURRENT for another repair round,
and this phase stays YELLOW.

Do not ask the owner to paste anything — you have the paths.
```
