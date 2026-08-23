# Phase 6 QA handoff — Timeline + Insights

> **STATUS: PASS — ROUND 6 CODEX RETEST. READY FOR GREEN CLOSEOUT.**
>
> The Round 5 repair restores the complete owner context through both return
> controls: owner source and snapshot, real/system time and zone, the default
> owner week start, and `travelled = false` become observable together without
> reload. Records later than every fixture clock remain visible immediately and
> after pending work settles. Phase 6 remains YELLOW only until the original
> Claude builder conversation performs the formal GREEN closeout.

---

# Round 6 — Codex retest

## Verdict and identity

**Overall verdict: PASS.** R5-B1 no longer reproduces through either return
control, including the answer-then-return interleaving that exposed the prior
repair. The complete visible context returns as one owner view, not merely as
the correct bytes under the wrong clock. The broader scenario-switch,
time-travel, reload and leftover-context checks also pass. No new blocking or
non-blocking finding was found.

| | Retest evidence |
|---|---|
| Product checkpoint | `ce4087a` — "Round 5: his clock comes back with his records" |
| `main` HEAD tested | `f6cb8026933ccc2ba9f538a92e81c13103b3e075` |
| Deployed Preview | `f6cb8026933ccc2ba9f538a92e81c13103b3e075`, read live from More → This build on the Preview |
| Checkpoint match | **PASS** — `git diff ce4087a..HEAD --name-only` lists only `docs/PHASE_STATUS.md` |
| Repository state before this report | Clean |

## Mobile configuration and owner baseline

The deployed Preview was started before repair-diff inspection and exercised
at 412×915 in the Codex in-app browser with real clicks, scrolling and rendered
mobile layout. The browser surface does not expose Android UA/DPR emulation, so
this is described as an Android-sized interaction pass rather than a physical-
device claim. The focused Playwright evidence below additionally ran the QA lab
at the repository's mobile-small, mobile-large and desktop projects.

At normal system Now on 22 August 2026, answering **Plenty** wrote a new owner
`Current energy: 4 of 5` observation dated Today. Timeline showed it with the
existing owner history before any fixture was loaded. QA reported eight raw
owner records and the effective Timeline reported six entries; that owner
baseline remained unchanged after every fixture return.

The live evidence was captured as a rendered screenshot and accessibility/DOM
snapshots during the run. No screenshot file was added because this handoff
permits writing only this report. Stable evidence references are the deployed
`#/now`, `#/timeline`, `#/qa`, More → This build, and the focused test files and
counts below.

## R5-B1 exact reproductions

### 1 — June fixture, answer, immediately Show mine

**PASS.** *One answer, and a lot of silence* loaded at owner-local
`2026-06-15 07:00`, America/Denver, Monday week start. Now showed the fixture
energy question. After answering **Plenty**, **Show mine** was pressed
immediately.

- Immediately after the return, the laboratory notice and fixture clock were
  absent and Timeline showed the owner Today group, `Current energy: 4 of 5`
  and all six effective owner entries.
- After 2.4 seconds, the same six-entry owner Timeline remained visible. No
  fixture row or notice reappeared.
- Reopening QA without reloading showed system owner-local time on 22 August,
  America/New_York, Monday (ISO), and no travelled clock. The June instant and
  America/Denver fixture frame were gone.

### 2 — February fixture, immediately Empty the laboratory

**PASS.** From the recovered owner, *Two ordinary weeks* loaded at owner-local
`2026-02-15 21:00`, America/Denver, Monday week start. **Empty the laboratory**
was pressed immediately.

- Timeline was opened in the same interaction continuation. It immediately
  showed Today, the owner energy entry and all six effective owner entries.
- The identical owner Timeline remained after 2.4 seconds.
- The notice, all fixture entries and the February clock were absent. QA again
  showed the owner database's eight raw records under current system time,
  America/New_York and Monday (ISO).

This directly closes the prior false empty/partial-history claim: the owner
record is later than both fixture clocks and is visible before and after pending
work settles, without reload.

## Whole-class result

| Flow | Result | Independent evidence |
|---|---|---|
| Scenario after scenario | **PASS** | Loading the June scenario and then *Two ordinary weeks* published the second scenario's February frame and records; the first scenario did not leak into the visible context. |
| Time travel, then return | **PASS** | Inside the chained fixture, QA changed the zone to Europe/London, week start to Sunday and advanced one local day. Returning from a visible **Show mine** control removed the test notice and restored owner Now immediately and after 1.8 seconds; QA then showed current system time, America/New_York and Monday. |
| Return while an answer is being written | **PASS** | The exact June answer-then-immediate-return sequence above stayed on the owner view after settlement. Focused browser coverage also deterministically holds the competing work open and passes. |
| Visible-context cleanup | **PASS** | A damaged-file fixture survived reload with its test-history notice, proving fixture persistence and provenance. Emptying it restored the owner records and cleared fixture notice, unreadable-row state, fixture clock, label and temporal settings without reload. |
| Owner/fixture storage and write scope | **PASS** | Fixture answers never entered the owner Timeline; the owner baseline remained intact. Two target-stable IndexedDB stores remain in source, and the focused browser suite verifies storage reopen, reload, no-localStorage and owner/fixture isolation. |

One automation-method note is not a product finding: while QA was scrolled deep
to the timezone controls, asking the browser driver to click the off-screen
sticky **Show mine** locator hit the fixed **More** control instead. A screenshot
made the off-screen geometry explicit. Repeating the user-visible path from Now
clicked the rendered **Show mine** control and passed immediately. No product
state changed during the mistaken hit, and the result was not counted as a
failed return.

## Architecture and coverage judgement

The repaired boundary matches the observed behavior. `MemoryProvider.clear()`
uses the existing newest-work/source guard, reads the owner snapshot, and then
publishes source, snapshot, system `now`, system `zone`, default week start,
`travelled = false`, issues, loaded label and storage-check cleanup in one React
continuation. `projection.ts` correctly remains an arbitration rule rather than
claiming to own temporal state.

The builder's restore-to-system-default argument holds in the current product:
repository search finds `travelTo`, `setZone` and `setWeekStartsOn` changes only
on the QA surface; ordinary Now can only return the clock to system time. There
is therefore no owner-set temporal frame to stash today. The code comment
correctly says that if a non-QA owner control is introduced, the boundary must
become a stash and the provider/view regression is the place that should fail.

The coverage hole named in Round 5 is closed. Browser seed history is dated 20
August, later than every scenario clock. The provider regression feeds the
snapshot through the rendered `MemoryView` at a controlled February instant and
asserts source, records, time, zone, week start and travelled state after clear.
The React act-environment warning is fixed; none appeared in the focused run.

## Preserved Phase 6 gate and automated evidence

No diff after product checkpoint `ce4087a` touches application or test code.
Source review and the focused gates preserve the two databases, fixture
inspectability, fixture-scoped writes, reload/notice behavior, R3-B2, R3-B3,
the seven semantic invariants, QA-A1, section 51, DEF-0034–DEF-0044, the
exact-three-verb decision and every explicit deferral recorded in Round 5.

Focused verification performed by this retest:

- Provider/view, projection, architecture and semantic guards: **71/71 passed**
  across five files, with no React `act()` warning.
- `tests/browser/qa-lab.spec.ts`: **69/69 passed** across mobile-small,
  mobile-large and desktop, including both return controls, the future-dated
  owner row, answer-then-return and held-load race.
- The disclosed `guide-resume.test.ts` case: **three consecutive focused runs
  passed, 39/39 assertions total**. The reported one-off failure could not be
  reproduced.

No full-suite duplication was run. The deployed behavior matched the repair,
the checkpoint identity was documentation-only past product code, the focused
regressions were deterministic, and the reported flake did not reproduce;
`qa/README.md` therefore provides no concrete trigger for duplicating the
builder's full green gate.

## Recommended next action

- **Model:** **Claude Sonnet 5** (or the current Sonnet-class equivalent if it
  has been renamed). Formal GREEN closeout is documentation and handoff work;
  an Opus-class repair model is no longer warranted.
- **Intelligence level:** **High.** The work is bounded but must preserve a long
  phase record, checkpoint identity, deferrals and the next-phase handoff.
- **Conversation:** **CURRENT — the original Claude Phase 6 builder
  conversation.** That conversation owns the governing phase documents and
  performs the formal closeout after independent QA PASS.

## Ready-to-paste next prompt

```text
Phase 6 Round 6 independent Codex retest is PASS. Return to the CURRENT Claude
Phase 6 builder conversation for formal GREEN closeout.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
QA report: docs/qa/PHASE_06_QA_HANDOFF.md
Product checkpoint QA passed: ce4087a
Deployed docs-only HEAD QA tested: f6cb8026933ccc2ba9f538a92e81c13103b3e075

Read docs/qa/PHASE_06_QA_HANDOFF.md in full, beginning with "Round 6 — Codex
retest". Confirm the tested product checkpoint and deployed SHA, then perform
the canonical plan section 43 formal GREEN closeout. Do not edit or rewrite the
Codex QA report.

Round 6 independently reproduced both R5-B1 paths and passed them: the June
fixture was answered and immediately returned through Show mine; the February
fixture was immediately returned through Empty the laboratory. Owner source,
snapshot, real/system time, system zone, Monday week start and travelled=false
were observable together without reload, and the future-dated owner record was
visible immediately and after pending work settled. Scenario chaining,
time-travel then return, return during an answer write, reload/provenance and
visible-context cleanup also passed. Targeted provider/projection/semantic
tests passed 71/71, QA-lab browser tests passed 69/69, and the reported guide-
resume flake passed three focused runs (39/39). There was no concrete trigger
for full-suite duplication.

For the closeout:

1. Mark Phase 6 GREEN with approved product checkpoint ce4087a and record the
   QA-tested deployed SHA f6cb8026933ccc2ba9f538a92e81c13103b3e075.
2. Update docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md (including DEF-0058's
   final status), docs/DECISION_LOG.md only if a genuine new decision is
   required, and docs/NEXT_PROMPT.md for the next canonical action.
3. Preserve every explicit deferral and the complete historical Phase 6 QA
   record. Do not edit docs/qa/PHASE_06_QA_HANDOFF.md.
4. Make no product-code change during this formal closeout and do not begin
   Phase 7 implementation. Any closing commit must remain documentation-only
   past ce4087a; verify that with git diff.
5. Commit and deploy the documentation closeout as the repository workflow
   requires, verify the deployed build identity, and provide the complete next
   Phase 7 handoff in docs/NEXT_PROMPT.md.
6. End with D-092's model, level, conversation and short launcher so the owner
   does not need another turn to obtain the next prompt.

Do not ask the owner to paste any file; you have the repository paths.
```

---

# Round 5 — Codex retest

## Verdict and identity

**Overall verdict: FAIL.** The repair correctly prevents stale store reads from
publishing across a source switch, and the owner bytes remain physically safe.
The return is still incomplete: it restores the owner store while retaining the
laboratory's travelled clock, zone and week interpretation. On ordinary
surfaces that makes legitimate owner records later than the fixture instant
disappear as future history.

| | Retest evidence |
|---|---|
| Product checkpoint | `28d2efc` — "Round 4: only the newest work may say what is on the screen" |
| `main` HEAD tested | `b9bcab118c32feb307bfc1b9cc0772a59f09cb01` |
| Deployed Preview | `b9bcab118c32feb307bfc1b9cc0772a59f09cb01`, built `2026-08-22T23:36:28.157Z`; read independently from the live bundle, `preview/build-info.json` and More → This build |
| Checkpoint match | **PASS** — `git diff 28d2efc..HEAD --name-only` lists only `docs/PHASE_STATUS.md` |
| Repository state before this report | Clean |

## Mobile configuration and sealed owner flow

The deployed Preview was exercised before repository reading at 412×915 in the
Codex in-app browser with real clicks and scrolling. The surface does not expose
UA/DPR controls, so this is an Android-sized interaction pass rather than a
claim of Android UA emulation. Repository browser projects additionally ran at
360×740, 430×932 and desktop with Desktop Chrome UA.

The persisted tab initially held the prior test history. **Show mine** returned
to the owner correctly. Normal Now showed *"Move for 25 minutes: a walk"*;
pressing **Done** produced a five-entry effective Timeline including the new
suggestion and completion plus `Current energy: 4 of 5`. The history was visible
before QA and remained durable throughout every reproduction below.

A fresh fixture was then loaded and inspected successfully across Now,
Timeline, Insights, Life and Health & Recovery. Every surface carried the
accurate test-history notice, fixture writes stayed fixture-scoped, and reload
preserved the fixture and notice. Those Round 4 passes remain intact.

## R4-B1 repair result

**PASS for the specific stale-store publication repaired; FAIL for the complete
return acceptance because of R5-B1 below.**

`projection.ts` now gives every async operation a sequence token and source.
`MemoryProvider` consults it before publishing a snapshot, source, error or
busy completion. The two physical target-stable databases remain separate.
The eight direct sequence tests and three fake-store provider tests pass, and
the deployed bundle contains the same projection implementation as checkpoint
`28d2efc`.

That abstraction protects only `source` and `snapshot`. The visible history is
also a function of `now`, `zone`, `weekStartsOn` and `travelled`. QA changes all
four when loading a scenario, while `clear()` restores none of them. The return
therefore combines owner records with laboratory time—a coherent store
projection under an incoherent temporal projection.

## Blocking finding

### R5-B1 — the laboratory's clock survives the return and hides newer owner history

- **Severity:** Blocker — both required return controls can make a valid owner
  history read as empty or partial until reload. The notice disappears, so the
  screen positively presents the result as the owner's history.
- **Show mine reproduction:** load *One answer, and a lot of silence* (clock:
  `2026-06-15 07:00`), answer its live `Current energy` question with
  **Plenty**, and immediately press **Show mine**. After 2.4 seconds the notice
  is gone, but Timeline contains only the owner's two May entries; the new
  August walk, completion and energy record are absent. Nothing from the
  fixture is labelled anymore, yet the owner view is still being evaluated at
  the fixture's June instant.
- **Empty the laboratory reproduction:** from the recovered owner, load *Two
  ordinary weeks* (clock: `2026-02-15 21:00`) and immediately press **Empty the
  laboratory**. After 2.4 seconds QA has no laboratory notice and its Storage
  block reports all seven raw owner records, but its clock still says February.
  Timeline says **Nothing here yet** because every owner entry is in May or
  August—future relative to the retained fixture clock.
- **Durability evidence:** a full reload restores real time and the complete
  owner Timeline. The two databases and owner bytes are not the defect.
- **Root cause:** a scenario button calls `setZone`, `setWeekStartsOn` and
  `travelTo` before `loadDocument`. `MemoryProvider.clear()` changes the source
  and snapshot only; it does not call the equivalent of `returnToNow`, restore
  the system zone, restore the owner's week-start interpretation, or clear
  `travelled`. `buildView(snapshot, { now, zone, weekStartsOn })` then correctly
  excludes records that have not happened yet according to the stale lab time.
- **Why the new browser coverage passes:** `seedHisOwnHistory` fixes the owner
  row at `2026-05-01`; every new return test loads *Two months of readings* at
  `2026-05-02`. The owner row is one day **before** the fixture clock, so the
  tests cannot observe future-record suppression. They assert the store
  boundary, not the temporal half of the visible projection. None answers a
  fixture question immediately before returning as the retest explicitly
  required.
- **Deterministic-test limitation:** the projection and provider tests model
  only `source` plus `snapshot`; their fake records are not passed through a
  view at a controlled clock. The provider test also emits repeated React
  warnings that the environment is not configured to support `act(...)`.
  Those tests are useful for the repaired interleaving, but they are not proof
  of a coherent owner-facing history.
- **Acceptance expectation:** both return controls must publish one coherent
  owner context without reload: owner source, owner snapshot, real/system time,
  owner/system zone, owner week-start interpretation and `travelled = false`.
  An owner record later than the fixture clock must be visible immediately and
  after pending work settles. No fixture row, clock or notice may remain.

## Preserved Phase 6 gate

R3-B2 and R3-B3 remain closed by source review and the focused semantic suite.
The two databases, fixture-scoped writes, fixture reload/notice, all seven
semantic invariants, QA-A1, section 51, DEF-0034–DEF-0044 and the accepted
exact-three-verb boundary show no regression. The repair diff does not reopen
P4-6, P4-7, the never-settled started move or Phase 5's four explicit
deferrals.

Focused verification:

- Projection/provider plus semantic guards: **111/111 passed**. The three
  provider tests pass with repeated `act(...)` environment warnings.
- Focused `qa-lab.spec.ts`: **66/66 passed**, demonstrating the timestamp-shaped
  coverage hole above rather than clearing the deployed reproduction.

The deployed mismatch triggered full-suite duplication:

- `npm run verify`: **PASS** — formatting, lint, typecheck, 45 files / 779
  tests, and production build.
- `npm run test:browser`: **PASS** — 309/309 across all three projects.

The gate is green because no automated case puts an owner record after the
fixture clock and then judges the rendered owner view. Phase 6 stays YELLOW.

## Recommended next action

- **Model:** **Claude Opus 5** (or the current strongest Claude coding model if
  renamed).
- **Reasoning level:** **High.** The remaining defect spans storage projection,
  temporal projection and user-command priority; the previous repair correctly
  solved one layer but encoded an incomplete definition of what “whose history
  is on screen” means.
- **Conversation:** **CURRENT — the Claude builder conversation.** It owns the
  projection design and its reintroduction evidence; after repair it must
  return to this same Codex QA conversation for Round 6.

## Ready-to-paste next prompt

```text
Phase 6's Round 5 independent Codex retest is FAIL. Keep Phase 6 YELLOW — QA
FAIL / REPAIR REQUIRED. Do not perform the GREEN closeout and do not begin
Phase 7.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Report: docs/qa/PHASE_06_QA_HANDOFF.md
Product checkpoint QA tested: 28d2efc
Deployed docs-only HEAD QA tested: b9bcab118c32feb307bfc1b9cc0772a59f09cb01

This prompt is for the CURRENT Claude builder conversation. Read
docs/qa/PHASE_06_QA_HANDOFF.md in full, beginning with "Round 5 — Codex
retest". Repair R5-B1 under canonical plan section 42. Do not edit or rewrite
the Codex QA report.

The Round 4 sequence/source guard is present and its specific stale-store race
is repaired. Preserve it, the two physical databases, fixture inspectability,
fixture-scoped writes, reload/notice behavior, R3-B2, R3-B3 and every preserved
Phase 6 gate item named in Round 5.

The remaining blocker is the temporal half of the projection. QA scenario load
sets now, zone, weekStartsOn and travelled. Show mine / Empty the laboratory
restore owner source and owner snapshot but retain the fixture clock. On the
deployed build, a February fixture followed by Empty leaves all seven raw owner
records in Storage while Timeline says "Nothing here yet" because the owner's
May/August records are future relative to February. A June fixture followed by
an answer and Show mine leaves only two May owner entries visible and hides the
new August records. Reload restores them by restoring real time.

Address the whole visible-context class, not only `setNow`:

1. Reproduce both deployed paths before changing code: answer the fixture's
   energy question then immediately Show mine; freshly load a past scenario
   then immediately Empty the laboratory. Seed/record owner history later than
   the fixture instant.
2. Define one coherent owner projection. A successful return must make owner
   source, owner snapshot, real/system time, owner/system zone, owner week-start
   interpretation and travelled=false observable together. No fixture row,
   notice or temporal setting may survive onto normal owner surfaces.
3. Preserve the Round 4 async guards. A stale store operation must still be
   unable to publish, but autonomous laboratory work must not outrank the
   owner's explicit command to leave the laboratory.
4. Add deterministic provider/view coverage with a controlled clock and an
   owner record later than the scenario clock. Test both return controls,
   immediate and delayed stability, and the answer-then-return sequence. The
   current May 1 owner / May 2 fixture pair is incapable of proving this.
5. Extend the projection model if temporal state belongs there; do not keep
   calling source+snapshot a complete screen projection if time can contradict
   both. Fix the React act-environment warnings in the provider race tests.
6. Prove the new tests fail when temporal restoration is removed and when each
   stale-publication behavior from Round 4 is reintroduced.
7. Recheck both databases, fixture scope and reload, R3-B2, R3-B3, all seven
   semantic invariants, QA-A1, section 51, DEF-0034–DEF-0044, the exact-three-
   verb decision and every explicit deferral named in Round 5.
8. Run the full repository gate and complete browser suite, deploy the repaired
   checkpoint, keep Phase 6 YELLOW, and return a Round 6 retest prompt to this
   SAME Codex QA conversation.

Update docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md, docs/DECISION_LOG.md if a
new decision is genuinely required, and docs/NEXT_PROMPT.md as the repository
workflow requires. Do not edit docs/qa/PHASE_06_QA_HANDOFF.md. Do not ask the
owner to paste anything; you have the path.
```

---

# Round 4 — Codex retest

## Verdict and identity

**Overall verdict: FAIL.** R3-B2 and R3-B3 are repaired. R3-B1 is materially
improved—the fixture and owner are now stored in separate databases, so the
owner's bytes survived—but the promised one-press return to the owner renders
an empty owner history and can remain false until the document is reloaded.

| | Retest evidence |
|---|---|
| Product checkpoint | `8680642` — "Round 3: the laboratory stops writing over his life" |
| `main` HEAD tested | `2aba0bc7ebcc7ec78836475e319e2f18ba30a3f0` |
| Deployed Preview | `2aba0bc7ebcc7ec78836475e319e2f18ba30a3f0`, built `2026-08-22T21:11:00.897Z`; read independently from `preview/build-info.json` and More → This build |
| Checkpoint match | **PASS** — `git diff 8680642..HEAD --name-only` lists only `docs/PHASE_STATUS.md` |
| Repository state before this report | Clean |

## Mobile configuration and cold-use order

The sealed owner pass began on the deployed Preview before repository reading,
at 412×915 in the Codex in-app browser with real scrolling and interaction.
This browser does not expose UA, DPR or touch-point controls, so this is an
Android-sized interaction pass, not a claim of Android UA emulation. The
repository's focused browser run added 360×740, 430×932 and desktop layout
projects; those projects use Desktop Chrome UA and are layout coverage rather
than physical-phone validation.

Normal Now first said there was nothing to suggest and asked for current energy.
Answering `Plenty` produced *"Move for 25 minutes: a walk"* and Timeline
immediately recorded `Current energy: 4 of 5`. The entry survived refresh and a
tab close/reopen. Only then was the QA laboratory opened and the repository
read.

## Round 3 repair results

| Repair | Result | Independent evidence |
|---|---|---|
| R3-B1 — laboratory/owner isolation | **FAIL — repaired storage, broken return projection (R4-B1 below).** | `OWNER_DB` and `${OWNER_DB}:laboratory` are separate, a loaded fixture stayed inspectable on Timeline/Now/Insights/Life/domain pages, answers made while it was shown stayed with it, reload preserved it and every normal surface named it as test history. The owner bytes also survived. One-press return did not render them. |
| R3-B2 — correction loses its action object | **PASS.** | Rejecting the deployed walk relationship wrote: *"Told the app to stop assuming what the app has worked out follows a walk."* The evidence button also names the walk. The scoped correction key and its watershed remain intact in source and the 43 observed-relationship tests pass. |
| R3-B3 — `emotionalState` declared tracked but discarded | **PASS.** | `tracked` is now optional and limited to `scale | number | duration`; `emotionalState` deliberately has none, remains sensitive and decision-material, and no fake scale was invented. Registry coverage passes values through the real numeric paths while free text and entities remain untracked. |

The laboratory notice is clear and accurate about provenance while a fixture is
active: *"This is a test history, not yours. Nothing of yours has been
changed."* Its **Show mine** action and QA's **Empty the laboratory** action both
call the same `memory.clear()` transition. The fixture survives reload with the
notice, and normal-surface actions write to the active fixture rather than the
owner. Those parts pass.

## Blocking finding

### R4-B1 — returning from the laboratory can render an empty owner history

- **Severity:** Blocker — the owner is told that his history is unchanged and
  offered one press to show it, but that press can present an empty canonical
  Timeline indefinitely. A reload recovering the bytes does not make a false
  empty-history claim acceptable.
- **Deployed reproduction:** after the sealed owner flow above, load *Two
  months of readings, and nothing graded*, inspect it on Timeline, then press
  **Show mine**. Timeline says *"Nothing here yet"*. It was still empty after a
  1.2-second wait. A full reload restored the original owner Timeline,
  including `Current energy: 4 of 5`, proving physical separation prevented
  deletion while the live projection was wrong.
- **Automated reproduction:** the builder's new test at
  `tests/browser/qa-lab.spec.ts:341` seeds *"weekly review on Sunday"*, loads a
  fixture, presses **Empty the laboratory**, and expects that owner row on
  Timeline. A focused run of `qa-lab.spec.ts` plus `shell.spec.ts` failed this
  exact assertion in **mobile-small, mobile-large and desktop**: 117 passed, 3
  failed. The complete 300-test browser run then passed the same test at all
  three sizes. That order-dependent result is a false-green signal, not
  contradictory evidence that clears the deployed reproduction.
- **Code-level class:** both stores feed one mutable `snapshot`. `append()`
  captures whichever store is active and later calls `setSnapshot(await
  current.snapshot())`; `clear()` separately clears the laboratory, switches
  `sourceRef` to owner and publishes `owner.snapshot()`. No generation/source
  token prevents an already-running laboratory append or derived-outcome effect
  from publishing its laboratory snapshot after the switch. The single shared
  `busy` flag has the same cross-operation race. Reload remounts and selects
  from durable store contents, which matches the observed recovery.
- **Coverage hole:** the **Show mine** test at `qa-lab.spec.ts:359` checks only
  that the notice disappears. It never checks that owner content returns and
  remains visible. The stronger seeded-owner test is capable of failing, but
  is not deterministic under the current harness/build timing.
- **Acceptance expectation:** returning through either **Show mine** or
  **Empty the laboratory** must atomically publish the owner snapshot and keep
  it published without a reload. Work started against one source must not
  update the visible projection, busy/error state, or active source after a
  switch. Cover both entry points with owner content, assert immediate and
  delayed stability, and prove each regression fails when the stale-write
  behavior is reintroduced.

## Preserved Phase 6 gate

The seven semantic invariants repaired before Round 3 remain closed by the live
flows, source inspection and the focused semantic run: 100/100 across
`observed-relationships`, `registries` and `architecture-guards`. QA-A1 remains
closed: the app asked for current energy, never a causal grade. Section 51's
already-passing claim/evidence behavior, DEF-0034–DEF-0044, and the accepted
exact-three-verb inferred-evidence boundary showed no regression. The repair
diff does not reopen P4-6, P4-7, the never-settled started move, or Phase 5's
four explicit deferrals.

The concrete false-green triggered full-suite duplication:

- `npm run verify`: **PASS** — formatting, lint, typecheck, 43 files / 768
  tests, and production build.
- `npm run test:browser`: **PASS** — 300/300 across all three projects.
- Focused `qa-lab.spec.ts` + `shell.spec.ts`: **FAIL** — 117 passed / 3 failed,
  all three failures at the owner-restoration assertion.

The aggregate green run cannot overrule the deployed reproduction plus the
same regression's isolated failures. Phase 6 stays YELLOW.

## Recommended next action

- **Model:** **Claude Opus 5** (or the current strongest Claude coding model if
  renamed).
- **Reasoning level:** **High.** The remaining issue is an asynchronous
  cross-store projection race with an order-dependent browser false-green;
  finding and closing the whole stale-work class needs deeper reasoning than a
  localized copy or taxonomy repair.
- **Conversation:** **CURRENT — the Claude builder conversation.** It owns the
  repair checkpoint and can preserve the reasoning and architecture choices
  that produced the two-store implementation; after repair it must return to
  this same Codex QA conversation for Round 5.

## Ready-to-paste next prompt

```text
Phase 6's Round 4 independent Codex retest is FAIL. Keep Phase 6 YELLOW — QA
FAIL / REPAIR REQUIRED. Do not perform the GREEN closeout and do not begin
Phase 7.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Report: docs/qa/PHASE_06_QA_HANDOFF.md
Product checkpoint QA tested: 8680642
Deployed docs-only HEAD QA tested: 2aba0bc7ebcc7ec78836475e319e2f18ba30a3f0

This prompt is for the CURRENT Claude builder conversation. Read
docs/qa/PHASE_06_QA_HANDOFF.md in full, beginning with "Round 4 — Codex
retest". Repair R4-B1 under canonical plan section 42. Do not edit or rewrite
the Codex QA report.

The storage boundary is materially better and must be preserved: owner and
laboratory bytes live in separate target-stable IndexedDB databases; fixture
actions stay with the fixture; a loaded fixture remains inspectable across
normal surfaces; reload preserves it and the notice; deployment does not
orphan either store. R3-B2 and R3-B3 pass and must stay closed.

The remaining blocker is the return projection. On deployed 2aba0bc, after an
owner energy reading was recorded and a QA scenario loaded, one press of Show
mine rendered "Nothing here yet" indefinitely; a full reload restored the
owner history. The new seeded-owner browser regression independently failed
the same return after Empty the laboratory in mobile-small, mobile-large and
desktop when run focused (117 passed / 3 failed), even though the complete
browser run later passed 300/300. Treat that order/timing dependence as a
false-green to eliminate, not as permission to rerun until green.

Address the defect class, not only the observed interleaving:

1. Reproduce the deployed Show mine path and the focused Empty the laboratory
   failure before changing code. Record the exact competing operations.
2. Make a source switch atomic from the visible consumer's perspective.
   Async work that began against the laboratory must not publish its snapshot,
   busy/error state, or source after the owner switch (and vice versa).
3. Preserve the two physical databases and all passing laboratory behavior.
   Do not trade fixture inspectability or durable reload for owner restoration.
4. Strengthen coverage for both Show mine and Empty the laboratory. Seed owner
   content; assert it appears without reload immediately and after pending
   derived work has had time to settle; assert laboratory content does not
   reappear. Make the regression deterministic in focused and full-suite order.
5. Prove the new tests fail when the stale-write behavior is reintroduced.
6. Recheck QA-A1, R3-B2, R3-B3, all seven semantic invariants, section 51,
   DEF-0034–DEF-0044, the exact-three-verb decision, and every explicit
   deferral named in Round 4.
7. Run the full repository gate and complete browser suite, deploy the repaired
   checkpoint, keep Phase 6 YELLOW, and return a Round 5 retest prompt to this
   SAME Codex QA conversation.

Update docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md as
the repository workflow requires, but do not edit
docs/qa/PHASE_06_QA_HANDOFF.md. Do not ask the owner to paste the report; you
have its path.
```

---

# Round 3 — Codex retest

## Verdict and identity

**Overall verdict: FAIL.** The repaired seven are substantially correct, and
QA-A1 remains repaired, but the phase gate is not met because three reproducible
claims still exceed the evidence or storage boundary underneath them.

| | Retest evidence |
|---|---|
| Product checkpoint | `481c3a7` — "Seven blockers: the claim narrowed to the evidence under it" |
| `main` HEAD tested | `d327cb45f3be2889f59e63207644cc66efab563d` |
| Deployed Preview | `d327cb45f3be2889f59e63207644cc66efab563d`, built `2026-08-22T12:53:33.876Z`; read independently from `preview/build-info.json` and More → This build |
| Checkpoint match | **PASS** — `git diff 481c3a7..HEAD --name-only` lists only `docs/NEXT_PROMPT.md` and `docs/PHASE_STATUS.md` |
| Repository state before this report | Clean |

## Mobile configuration

The sealed owner pass used the deployed Preview at 412×915 in the Codex in-app
browser with real scrolling and interaction. A second isolated Chromium context
used Playwright's **Pixel 7** device profile and confirmed an Android 14 mobile
UA, 412×839 CSS viewport, DPR 2.625 and one touch point. The in-app browser does
not expose UA/DPR controls, so these two observations are complementary rather
than a claim that resizing alone made it Android. The focused browser suite also
ran at 360×740, 430×932 and desktop; its two "mobile" projects use Desktop
Chrome UA and therefore count as layout regression, not Android emulation.

## Sealed cold owner-use — before repository reading

The persisted Preview opened on a normal Now with: *"Spend 10 minutes recalling
subnetting before you reopen your notes"* because *"Nothing has come in about
subnetting for a while."* Its evidence said the only material condition was the
current learning topic, there were zero comparable occasions, and it was too
early to say. After the owner marked that move Done, Now asked *"How much energy
have you got left?"* — not what the move did — and `Plenty` led to *"Move for 25
minutes: a walk"* because energy was good and the morning suited it.

The owner-facing claims recorded before reading code were:

- Timeline claims to be the canonical record in event order.
- Insights distinguishes what the app has worked out from what is still being
  gathered, and its evidence should name what was counted.
- Life's `Recent` means something came in lately, while each stale belief names
  itself separately; it no longer claims the whole area is up to date.
- A domain page says exactly which belief is stale and offers correction at that
  belief, not at the area as a whole.

No contradiction appeared in that cold reading. The `Plenty` observation
appeared in Timeline immediately as `Current energy: 4 of 5`.

## The seven repaired blockers

| # | Reproduction and criterion | Result |
|---|---|---|
| 1 | Four walks higher and four bike rides lower, with four positive absences for each. Separate scopes, cards, counts and names are required. | **PASS.** Two scopes and two opposite findings; no pooling and no borrowed name. The deployed library does not expose this exact fixture, so the exact fixture was exercised against the checkout proven byte-equivalent in product code to the deployed checkpoint. |
| 2 | Weekdays higher, weekends lower; no 4-of-8 collapsed claim, and Tuesday must use only the weekday band. | **PASS.** The supported split is detected, the card states the disagreement without `of 8`, and Tuesday's `observed-change` note names the weekday band. Same fixture limitation as #1. |
| 3 | Three occasions with readings but no recorded exposure. | **PASS live.** Deployed evidence says `3 occasions are in neither group`, and 14/14 remain the two legitimate groups. The abstention fixture also leaves twelve silent occasions out and states why. |
| 4 | Recorded events between readings invalidate pairs, and copy may name only checked record classes. | **PASS live.** Deployed evidence excludes two and names another completed suggestion, circumstance, constraint, or relationship record. Focused fixtures exclude relationship and domain-update classes and prohibit "nothing else happened". |
| 5 | Reject a system conclusion without deleting history; relearn from undisputed later evidence. | **PASS for the repair, with new blocker R3-B2 below.** The deployed card has a walk-specific correction; rejection removes the finding, writes a correction, and leaves the 142 underlying records/32 episodes. A focused later-evidence fixture reaches the opposite conclusion from four new pairs per side. |
| 6 | Same-moment correction order on Life's Recently. | **PASS.** Canonical `occurredAt → recordedAt → id` ordering puts the later-recorded correction/replacement before the original in the newest-first list, independent of fixture insertion order. |
| 7 | No surface may use recent intake as proof every belief is current. | **PASS live.** Life says `Recent` and immediately limits it to something having come in lately; stale rows name themselves on Life, Insights and domain pages. |

## Phase gate and claim-to-evidence result

Section 51 passes on progressive disclosure, comparison groups, honest
withholding, association language, context/confounder handling, counterexamples,
malformed-record survival, private display policy, and the shared Now/Insights
evidence path. QA-A1 remains repaired: the live flow asked for current energy,
never a causal grade, and the observed relationship is explicitly non-causal.

It fails the action-identity/correctability language, the QA production-isolation
boundary implicated by the owner's data-loss report, and D-091's tracked-state
meaning. Exact findings follow.

## Blocking findings

### R3-B1 — loading a QA scenario destroys normal Preview history

- **Severity:** Blocker — reproducible canonical data loss, explicitly named as
  a stop condition in the retest handoff.
- **Live reproduction:** on normal Now, record `Plenty`; Timeline immediately
  shows `Current energy: 4 of 5`. It survives navigation, refresh, tab close and
  reopen. Enter QA and load `Two months of readings, and nothing graded`.
  Timeline is now the scenario's 142-record history and the seven-record normal
  history is gone.
- **Boundary evidence:** `MemoryProvider` creates exactly one database,
  `life-command-os:${runningBuild.target}`, for every surface. Its QA
  `loadDocument` calls `replaceAll`; `replaceAll` clears all four object stores
  before writing the fixture. Leaving QA does not clear again — it exposes the
  replacement on Now, Life, Timeline and Insights because they intentionally
  share the same store.
- **Deployment result:** ordinary deployment does **not** currently orphan the
  store: neither commit SHA nor build time is in the database name, and
  `DB_VERSION` remains 1. Preview and production are isolated from one another,
  but normal Preview and Preview QA are not.
- **Acceptance expectation:** loading, leaving or clearing the laboratory must
  not replace the normal owner history underneath the normal app. Preserve the
  already-passing ability to inspect a fixture across normal surfaces.
- **False confidence:** `qa-lab.spec.ts` proves that a loaded scenario survives
  reload/reopen and even tests `Clear everything`; it never seeds a normal
  owner record and proves the laboratory cannot replace it.

### R3-B2 — a scoped association correction is described as the verb alone

- **Severity:** Blocker — the phase gate says a learned relationship may never
  be printed under a name that fits a different action. The correction key is
  scoped correctly, but the owner's canonical history no longer says which
  conclusion was rejected.
- **Live reproduction:** open the deployed walk relationship, whose correction
  control correctly says `what the app has worked out follows a walk`; press
  `That is not right`; open Timeline. The new row reads: `Told the app to stop
  assuming what the app has worked out follows move.` The same sentence fits a
  walk and a bike ride.
- **Boundary evidence:** `Insight.beliefLabel` knows the object only while the
  card renders. The stored `belief-correction` retains the scoped key, but
  `describeBelief` parses only its verb for owner-facing history and explicitly
  falls back to the verb. `describeRecord` then uses that fallback on Timeline.
- **Acceptance expectation:** the stored correction remains action-scoped and
  every owner-facing description names that same action; do not weaken the key
  or delete the evidence underneath it.
- **False confidence:** `observed-relationships.test.ts` separately asserts the
  scoped key and the card's `beliefLabel`, but never passes the resulting
  correction through the shared history renderer.

### R3-B3 — `emotionalState` is declared tracked but cannot participate

- **Severity:** Blocker for D-091 invariant 6 and for accepting the builder's
  second explicit decision.
- **Reproduction:** `emotionalState` is `tracked: true`, and the builder account
  says it therefore participates. Its actual fixture value is free text
  (`flat`). Both association and trajectory paths call `numericValue`, which
  returns `undefined` for text, so every such reading is discarded before any
  scale, direction, trajectory or before/after comparison exists.
- **Meaning:** `Current emotional state` is not yet a stable construct with a
  scale and direction, and marking it tracked does not make it one. The decision
  not to invent mood/stress/confidence/motivation dimensions without the owner
  is reasonable; claiming that the undivided placeholder participates is not.
- **Acceptance expectation:** keep the taxonomy question open to the owner, but
  make the implementation and owner/builder claims honest about whether the
  current concept is a trackable dimension. Do not invent a wellness score.
- **False confidence:** the registry guard checks forbidden aggregate words and
  freshness, but never proves that every `tracked` concept has a value shape the
  tracking machinery can consume.

## The two builder decisions

1. **ACCEPTED:** keeping `deriveOutcomes` restricted to the three sleep verbs.
   The file's reasoning is sound: that path maps a morning reading to the old
   effect attribution scale without a comparison group; expanding it would
   create more system-authored attributions, while `association.ts` is the
   observe-first comparison path.
2. **REJECTED AS IMPLEMENTED:** not inventing emotional dimensions is accepted,
   but `emotionalState` cannot be described as participating merely because it
   carries `tracked: true`; R3-B3 is the unresolved semantic boundary.

## Owner-data transitions tested

| Transition | Result |
|---|---|
| Normal Now answer → Timeline immediately | **PASS** — `Plenty` becomes `Current energy: 4 of 5` |
| Navigate Now/Timeline/Insights/Life/domain and back | **PASS** |
| Refresh | **PASS** |
| Close tab and reopen Preview | **PASS** |
| Reopen IndexedDB connection | **PASS** — the normal record came back before QA replacement; builder's targeted test also verifies byte-identical fixture reopen |
| New deployment | **PASS by architecture at this checkpoint** — stable target-based database name and unchanged v1 schema; not keyed to SHA |
| Open and leave QA without loading/clearing | **No mutation observed/expected** |
| Load QA scenario after normal use | **FAIL — R3-B1**, atomic replacement of normal store |
| Clear in QA | **FAIL by the same boundary** — it clears the shared normal store |
| Preview vs production | **PASS** — target-specific database names |

## Targeted regression and deferred items

- Focused semantic gate: **115/115 passed** across observed relationships,
  domain-page data, Life words/order, registries and architecture guards.
- Focused browser gate: **147/147 passed** across QA laboratory, Life/domain and
  shell at the repository's three configured projects.
- No full-suite duplication: the concrete mismatches are missing assertions,
  not evidence that another green run would locate them.
- Timeline, Insights, Now evidence, Life and domain pages were exercised live.
  The prior DEF-0034–DEF-0044 behavior remained intact in the targeted sweep.
- P4-6, P4-7 and the never-settled started move remain unchanged; the repair
  diff does not touch Now's no-action rendering, its CSS/touch sizing, or
  lifecycle settlement.
- Phase 5's inline Life link, lack of new-goal creation, lack of a dated
  exception control and domain-scoped Recently remain unchanged. The repair
  touches Life grouping and canonical ordering, not those deferred controls.
- `hold`, unknown-ranking weight and shown-not-enforced free-text constraints
  remain deferred. Emotional Health's missing standing construct is no longer
  merely carried: R3-B3 is the explicit Phase 6 decision the handoff required
  QA to settle.

## Next handoff — CURRENT Claude builder conversation

**Recommended model:** **Claude Opus-class, current coding model.** The repair
crosses storage isolation, canonical correction identity and tracked-state
semantics, so the stronger Claude builder model is warranted.

**Recommended intelligence level:** **High.** All three reproductions and their
boundaries are concrete; Max is unnecessary unless the owner-defined emotional
taxonomy itself is brought into scope.

**Conversation:** **CURRENT — the original Phase 6 Claude builder
conversation.** Phase 6 remains unresolved and the builder must preserve its
own repair context while Codex retains this conversation for the next retest.

### Complete ready-to-paste next prompt

```text
Phase 6 remains YELLOW — Codex Round 3 QA FAIL / REPAIR REQUIRED.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_06_QA_HANDOFF.md in full, especially "Round 3 — Codex
retest", and execute its builder handoff exactly as written. Do not ask the
owner to paste the report.

QA-tested product checkpoint: 481c3a7
QA-tested deployed/main SHA: d327cb45f3be2889f59e63207644cc66efab563d

Keep Phase 6 YELLOW. Do not perform the GREEN closeout and do not begin Phase 7.

Repair all three Round 3 blockers under canonical plan section 42:

1. R3-B1 — loading or clearing a QA scenario replaces the normal Preview
   IndexedDB history because QA and normal surfaces share one store and
   loadDocument calls replaceAll. Preserve normal owner history while retaining
   the already-passing ability to inspect a synthetic scenario from Now,
   Timeline, Insights, Life and domain pages.
2. R3-B2 — a walk-specific association correction is stored with the right
   scope but Timeline describes it as "follows move", a label that also fits a
   bike ride. Every owner-facing rendering of the correction must preserve the
   action identity without weakening the correction watershed or deleting its
   evidence.
3. R3-B3 — emotionalState is declared tracked and claimed to participate, but
   its free-text values are discarded by numericValue before either trajectory
   or association analysis. Keep the taxonomy question open to the owner and do
   not invent a wellness score, while making the type, behavior, tests and
   claims honest about whether the present concept is a trackable dimension.

For each blocker: reproduce; identify the whole class and architectural
boundary; write a regression that fails when the defect is reintroduced; prove
that failure; repair the root cause; sweep siblings; and rerun the full builder
gate. In particular add cross-surface storage isolation coverage, pass a stored
association correction through the shared history renderer, and prove every
tracked concept has a value shape the tracking path can consume or is not
claimed as participating.

Preserve every Round 3 PASS: the seven repaired semantic invariants, QA-A1's
observe-first owner flow, the exact-three-verb inferred-evidence decision, the
section 51 gate items already passed, prior DEF-0034–DEF-0044 repairs, and every
explicit deferral. Historical effect records keep their original owner-
attribution meaning.

Deploy a repaired checkpoint, keep Phase 6 YELLOW, update the builder-owned
governing documents, and provide a retest prompt addressed to this SAME Codex
QA conversation. Do not edit docs/qa/PHASE_06_QA_HANDOFF.md; it remains QA-owned.
```

---

# Round 1a — owner-raised architecture review

## QA-A1 — the app asks the owner to perform the causal analysis it is supposed to be learning, and Phase 6 renders his answers as measurements

- **Severity: Blocking** — for Phase 6 GREEN, and it reaches Phase 3's
  collection model and the governing specification. Not a wording defect.
- **Class:** **DEF-0020's, one level up.** DEF-0020 was four different facts
  collapsed into one carrier. This is one fact — *who performed the causal
  inference* — collapsed out of the model entirely, so an owner opinion and a
  system finding occupy the same slot and print in the same sentence.
- **Raised by:** the owner, post-PASS, from the sentence
  *"How much did a walk do for you?"*

### What that sentence actually is

Not a wording accident. It is the `move` verb's `effect` question, generated at
`src/intelligence/outcomes.ts:459-464`:

```ts
move: {
  effect: {
    prompt: ({ object }) => `How much did ${object} do for you?`,
    answers: EFFECT_ANSWERS,
  },
},
```

`EFFECT_ANSWERS` (`outcomes.ts:307-322`) offers **A real difference / Some
difference / Not much / Backfired**.

The question asks what the walk *did* — its contribution against an unstated
counterfactual. The answer set grades that contribution. What it records is an
`outcome` record, `aspect: 'effect'`, `observation: {type:'scale', value: 0–3,
of: 3}`, provenance `owner`. **Semantically that field is an owner causal
attribution**, and nothing in the type system, the record schema, the learning
layer or the display layer says so.

This is the same shape across nine of the fifteen verbs — every one whose
profile lists `effect`. The walk is where it reads worst because the owner
genuinely cannot know the answer, but it is not the only instance.

### Evidence 1 — the learning engine has no other source

`effectFor` (`learning.ts:589`) is the only producer of the effect belief, and
it gathers exactly one thing:

```ts
const contributing = gather(verb, context, 'effect', effectValueOf, after, true)
```

`gather` (`learning.ts:569-586`) walks comparable episodes and calls `answerOf`,
which selects records by `outcome.aspect === 'effect'` and nothing else. Its own
docstring (`learning.ts:447-454`) states the design intent plainly: *"It asks
nothing about where the record came from… an outcome the app derived travels the
same path as one the owner tapped."* That was written to avoid a second outcome
path. Its consequence is that **the belief cannot distinguish a fact the system
observed from an opinion the owner supplied.** Provenance survives on the record
and reaches the QA trace; it does not survive into the quantity.

A repository-wide search for anything else writing `aspect: 'effect'` in `src/`
returns exactly one non-fixture producer: `derived.ts:199`.

### Evidence 2 — the observe-first path exists and is gated to one concept

`derived.ts` is the architecture the owner is describing — read a fact the
owner reported, close the loop, never ask him to grade it. It is scoped by three
gates at `derived.ts:169-171`:

```ts
if (profile.measures !== CONCEPT.sleepHours) continue
if (profile.outcome.when !== 'next-morning') continue
if (!profile.aspects.includes('effect')) continue
```

The walk's own profile (`moves.ts:278-289`) declares **`measures: CONCEPT.energy`**
— it already says which state dimension it speaks to — but carries
`outcome: SOON` (same-block). It fails gate 1 and gate 2. `readingAwaitedBy`
(`outcomes.ts:538-574`) has the same `next-morning` condition at line 546, so
the guide will not ask for a post-walk energy reading either.

So the observe-first machinery reaches **three verbs of fifteen**
(`protect-sleep`, `recover`, `wind-down`) and no state dimension except hours
slept. Every other move's effect belief is, and can only be, a tally of the
owner's own judgments.

### Evidence 3 — deployed, on the scenario built for section 51

Every card on "Nine months of evenings" was opened on the deployed Preview and
its evidence-mix line read off. `describeEvidenceMix` reports how many answers
the owner gave versus how many the app worked out:

| Card | Percentages shown | Answers behind them |
| --- | --- | --- |
| `emerging-change` (walks) | 100%, 70% | **10 you answered** |
| `context-effect` (kitchen) | 100%, 67%, 67% | **24 you answered** |
| `repeated-friction` (lab) | 33% | **2 you answered** |
| `move-effectiveness` (sister) | 100%, 40%, 20% | **10 you answered** |
| `trajectory` (hours slept) | none | none |
| `life-season` (custody) | none | none |

**Forty-six owner-supplied judgments; zero worked out from any reading**, across
every figure Insights prints on the history purpose-built to demonstrate
section 51. The two cards carrying no percentage are the only two that are not
built from his attributions — and the `trajectory` card, the one place Phase 6
reads observed state over time, is not connected to any action at all.

So the flagship figure —

> *How often clearing the kitchen made a difference afterwards — 67% — 8 of 12*

— is a count of how often he **said** it made a difference. The label asserts an
observed downstream fact about the world. The denominator is a tally of
opinions. Both halves are individually honest and the sentence they form is not.

### Evidence 4 — the two halves are in the same file and never meet

`insights.ts` holds both. `trajectoryCards` (from `insights.ts:1416`) reads
observed state over time. `tallyFor`/`patternCard` read action outcomes. There
is no code path joining them, and no co-occurrence, comparison-group or
temporal-association computation anywhere in `src/intelligence/`. The only
"before/after" in the file (`insights.ts:835, 1133, 1468`) is *calendar* earlier-
versus-later of the same ratings, not state-before-action versus state-after.

A secondary gate compounds it: `trajectoryCards` requires `standing === true`
(`insights.ts:1426`), and of the state concepts only `sleepHours` is standing.
`energy`, `emotionalState`, `soreness`, `socialEnergy` and `sleepQuality` are
all `standing: false`, so **no subjective state dimension the owner says he can
reliably report can produce a trajectory, or feed any belief.** They are
collected, used as similarity features for context matching, and never learned
from.

---

## The ten questions, answered

**1. What does "How much did a walk do for you?" record?**
An `outcome` record, `aspect: 'effect'`, a 0–3 scale step, provenance `owner`,
carrying a `sentiment`. Semantically an owner causal attribution; structurally
indistinguishable from a system-derived effect.

**2. Does the learning engine depend on owner-supplied downstream-effect
judgments?** Yes, for twelve of the fifteen verbs, completely. For the three
sleep verbs it can substitute one derived reading. There is no third source.

**3. If the owner stops answering causal-effect questions, can it still learn
action↔state relationships?** No — except for those three sleep verbs. For every
other move the effect belief stays pinned at the profile prior (`samples: 0`,
`moved: 'neither'`), and Insights degrades to a "Still gathering" line. Verified
live: "A month of what actually worked" shows exactly that for the walk and the
lab.

**4. Is current state represented independently enough to compare before/after?**
At the **record** layer, yes — observations carry a concept, a value and
`occurredAt`; episodes carry `shownAt`/`settledAt`/`context`. The raw material
for the join is present, so **this is not a Phase 1 schema break.** What is
missing is (a) any code performing the join, (b) collection — nothing asks for a
state reading after a non-sleep move, and (c) `standing: false` on every
subjective dimension, which locks them out of the one surface that reads state
over time.

**5. Does the architecture distinguish the nine things?** Five cleanly, four not:

| Distinction | Present? |
| --- | --- |
| completion | **Yes** — `action-completion` |
| direct result | **Yes** — `aspect: 'result'` |
| current state | **Yes as a record** — but consumed only as decision context, never as evidence about a move |
| later observed state | **No** — nothing marks an observation as falling after a given action |
| temporal association | **No** — no such computation exists |
| inferred relationship | **No** — the sleep matcher infers a *value*, not a relationship (see below) |
| explicit owner causal attribution | **Conflated** — shares the `effect` slot with derived records, by explicit design |
| comfort / friction | **Yes** — `aspect: 'comfort'` |
| follow-through | **Yes** — learned from `unable-now` |

**6. Did DEF-0020 separate result/effect/comfort without solving the deeper
problem?** Yes — precisely. DEF-0020 split one carrier into four well-formed
aspects. It never asked *who supplies the effect*. The repair made the question
coherent instead of removing the demand, and D-054 records the split without
raising the question either.

**7. Is Phase 6 discovering patterns from observed history, or summarizing
effect ratings?** Overwhelmingly the latter — 46 of 46 figures on the flagship
scenario. The single card built on observed state carries no rate and no link to
any action.

**8. Could Phase 6 produce intelligent-looking percentages that reflect his own
causal judgments?** Yes, and it demonstrably does. Note carefully: this is **not**
a section 51 percentage violation as that gate is written — the denominators are
real, the samples clear the threshold, and every rate names its aspect. That is
exactly why round 1 passed it. The gate requires a figure to declare *which
quantity* it measures. It does not require it to declare *who performed the
inference*, and that is the gap.

**9. Does the clarification conflict with or supersede an existing decision?**

- **D-066 — no conflict; the clarification generalizes it.** D-066 forbids
  inference concluding harm. The owner now forbids inference concluding
  causation in either direction. D-066 becomes a special case of a broader rule.
- **D-054 — no contradiction, but incomplete.** Its three aspects are all
  judgments *about an action*. Needed: a class that is not about an action, and
  a distinction between an owner attribution and a system inference.
- **D-064 needs revisiting.** `effectStepForSleep` (`derived.ts:89-93`) maps an
  absolute reading against a fixed `SLEEP_BASELINE_HOURS` — eight hours becomes
  "a real difference" with no comparison to nights *without* the wind-down. That
  is itself an attribution, currently acknowledged only as a 0.8 reliability
  discount. Under the new principle the reading and the attribution must be
  separate objects rather than one discounted number. D-064's four conditions
  all still hold and none of this reopens them.
- **D-056** (effect as absolute worth, four levels including harm) is the
  decision that makes the effect question causal, and must be read alongside.

**10. Phase 3, Phase 6, the specification, or a combination?** **A combination,
rooted in Phase 3 and the governing specification, surfacing in Phase 6.**

- **Phase 3** built the collection model — the effect question and `effectFor`.
  That is where the owner became the causal analyst. **Yes: Phase 3's foundation
  needs correction.** Not its record schema, which is sound — its collection
  path and its learned quantity.
- **The specification never asked otherwise.** Section 20 says the app learns
  from "observed outcomes" without saying who judges them. Section 51 constrains
  how a percentage is worded, not who inferred it. **The builder implemented the
  plan as written.** This is a specification gap before it is an implementation
  defect, and the governing documents have to move first.
- **Phase 6** is where it becomes visible and consequential, by rendering those
  judgments as percentages that read as measurements.
- **Phase 1's canonical record layer is sound** and should not be broken.

---

## Why the PASS is withdrawn, and where round 1 fell short

Round 1 checked section 51's gate item by item and every one of those checks was
correct as stated. Nothing in the round-1 record is retracted.

But I read the sentence *"How often clearing the kitchen made a difference
afterwards — 67% — 8 of 12"*, confirmed the denominator was real and the aspect
was named, and **did not ask where the eight came from.** The evidence-mix line
naming them as the owner's own answers was on the same panel, and I recorded it
as provenance transparency rather than reading it as the finding it was. The
gate as written did not direct me to ask; I should have asked anyway. That is a
genuine QA miss and not only a specification gap.

The verdict changes because Phase 6's stated purpose is *making memory and
learning visible*, and what it currently makes visible is mislabelled at the
root. Marking it GREEN would codify those labels.

---

## Required acceptance criteria for the repair

Stated as expectations the repair must meet, not as an implementation design —
`qa/README.md` §3a leaves root-cause repair to the builder.

**A. The governing documents move first.** This is a specification gap. A new
owner decision must record the principle — *observe first, infer cautiously, ask
for a concrete fact, ask for current subjective state when that state matters,
never ask the owner for the causal relationship the system exists to learn* —
and section 20 and section 51 must state it, before code changes.

**B. Owner attribution and system inference become separately legible.** A
figure derived from observed state and a figure tallied from the owner's
opinions may not render as the same kind of claim. Whatever mechanism achieves
it, no owner surface may present an aggregate of attributions in language that
asserts an observed fact.

**C. Association is never written as causation, in either direction.** A
learned relationship must read as *"on evenings like this, walks have often been
followed by better energy an hour later"* and never as *"walks improve your
energy"*. A worse state after an action must not read as harm — D-066
generalized.

**D. State becomes learnable in its own right.** Separate dimensions, not one
wellness score. `emotionalState` is currently a single generic "Current
emotional state" and is closer to the score the owner rules out than to the
dimensions he named. The `standing: false` flag on every subjective dimension
must be revisited, since it is what currently locks them out of trajectories.

**E. A comparison group is required before a relationship is claimed.**
Comparable situations where the action did **not** occur must be identifiable
and counted. Without them the figure is a description of evenings that happened
to include a walk, not evidence about walks. This is reachable with no new
sensors: `energy` is already `materialToDecision: true, askWhenStale: true`, so
readings on non-action evenings are already being collected.

**F. Absence of evidence stays a first-class answer.** Missing before- or
after-observations must produce an honest "not enough to say", not a figure
computed over whichever evenings happen to have both.

**G. Historical records keep their original meaning.** Existing
`aspect: 'effect'` records are owner attributions and must remain exactly that —
not silently reinterpreted as observations, not retroactively relabelled, not
deleted. This is the owner's explicit instruction and it likely forces the new
quantity to be additive rather than a redefinition of `effect`.

**H. The owner may still volunteer an attribution.** The goal is not to stop
asking how he feels. Asking for current state is wanted; asking him to grade a
causal contribution as the primary evidence path is not. If an explicit
attribution is retained it must be optional, clearly his opinion, and not the
only thing the engine can learn from.

**I. Do not invent sensors or integrations.** Owner-reported state, lifecycle
events and time are the whole budget.

## Required synthetic / adversarial coverage

The repair is not complete until tests prove each of these, each failing when
its behaviour is reintroduced (plan section 42, step 4):

- state improves after an action;
- state improves **without** that action — the comparison group is real;
- state worsens, and this does not become a harm claim;
- state is unchanged;
- before- or after-observations are missing entirely;
- multiple state dimensions move in different directions on the same evening;
- an unrelated event falls between the action and the later observation;
- context changes the relationship;
- an early pattern later weakens or reverses;
- selective self-reporting — the owner reports state more often after good
  evenings — does not silently become a finding;
- historical owner-attributed effects remain semantically distinct from
  observed-state findings, in the store, in the learning trace and on screen;
- **the engine still learns something useful when the owner answers no causal
  question at all.** This is the test whose absence allowed the gap.

## Which automated tests gave false confidence

Round 1 reported none. That was wrong, and the specific case is sharp.

`tests/synthetic/inferred-evidence.test.ts:656-668` asserts:

```ts
expect(eligible).toEqual(['protect-sleep', 'recover', 'wind-down'])
```

and line 680 adds *"derives nothing about a move judged in the same block."*

These **pin the limitation in place as intended behaviour.** They do not merely
fail to catch the gap — they would fail if a builder extended observe-first
derivation to the walk. Any repair must revise them deliberately rather than
work around them.

More broadly: 700 tests, 29 of them in `insights.test.ts`, sweep every figure
for a defensible denominator and a named aspect. Not one asks what the
denominator is a count *of*. The suite verifies the arithmetic and the wording
of a claim whose semantics nothing checks.

---

# Builder repair handoff

**Phase 6 is YELLOW — QA FAIL / REPAIR REQUIRED.** Return to the original
Phase 6 builder conversation.

Preserve everything round 1 passed — all eleven DEF-0034–DEF-0044 fixes were
independently verified closed and none are reopened by this — and every deferred
item listed below. Do not begin Phase 7.

Repair sequence, per plan section 42 and `qa/README.md` §4:

1. **Governing documents first.** This is a specification gap (question 10). A
   new decision recording the observe-first principle, plus the amendments to
   sections 20 and 51 and to D-054/D-064, before implementation. D-056 and D-066
   to be read alongside; D-066 is generalized, not overturned.
2. Reproduce QA-A1 from the evidence above — the four independent lines are the
   `move` profile's dead `measures`, `effectFor`'s single source, `derived.ts`'s
   three gates, and the 46-of-46 owner-answered figures on the deployed Preview.
3. Identify the whole class: **every verb whose profile lists `effect`**, not
   the walk alone, and every surface that renders an effect-derived figure —
   Insights cards, the Now evidence panel, and the learning trace.
4. Write the regressions listed under "Required synthetic / adversarial
   coverage" and prove each fails when its behaviour is reintroduced.
5. Fix the root cause, honouring acceptance criteria A–I. In particular G:
   existing `aspect: 'effect'` records must keep their original meaning.
6. Revise `inferred-evidence.test.ts:656-668` and `:680` deliberately, with the
   reasoning recorded — they currently assert the defect as correct.
7. Rerun the full gate, redeploy, stay YELLOW, and return a retest prompt to
   **this same QA conversation**.

Root-cause repair is the builder's. The reproductions, the defect class, the
evidence and the acceptance expectations above are QA's, and the architectural
direction in criteria D–F is offered as direction rather than prescription.

### Ready-to-paste next prompt

```text
Independent QA has WITHDRAWN the Phase 6 PASS. Phase 6 is YELLOW — QA FAIL /
REPAIR REQUIRED.

Report: docs/qa/PHASE_06_QA_HANDOFF.md
QA-tested SHA: a6a9e67
Finding: QA-A1 — the app asks the owner to perform the causal analysis it is
supposed to be learning, and Phase 6 renders his answers as measurements.

Read docs/qa/PHASE_06_QA_HANDOFF.md in full, starting at "Round 1a — owner-
raised architecture review". The round-1 record below it is unretracted and
every DEF-0034–DEF-0044 fix remains verified closed.

Do not perform the GREEN closeout. Do not begin Phase 7. Keep Phase 6 YELLOW.

This is a specification gap before it is an implementation defect — the plan
never said who supplies the causal judgment, so the governing documents move
first:

1. Record a new owner decision for the principle: observe first, infer
   cautiously, ask for a concrete fact if needed, ask for current subjective
   state when that state itself matters, and never ask the owner for the causal
   relationship the system exists to learn. Amend canonical plan sections 20
   and 51, and D-054 and D-064, to state it. D-066 is generalized by this, not
   overturned; read D-056 alongside.
2. Then repair under plan section 42 against acceptance criteria A–I in the
   report, addressing the whole class — every verb whose profile lists
   'effect', and every surface rendering an effect-derived figure — not the
   walk alone.
3. Write the synthetic/adversarial coverage the report lists, including the one
   whose absence allowed this: the engine still learns something useful when
   the owner answers no causal question at all. Prove each regression fails
   when its behaviour is reintroduced.
4. Revise tests/synthetic/inferred-evidence.test.ts:656-668 and :680
   deliberately and record why — they currently assert the limitation as
   correct behaviour and would fail on a correct fix.
5. Preserve every deferred item and everything round 1 passed. Historical
   aspect:'effect' records must keep their original meaning — owner
   attributions — and must not be relabelled, reinterpreted or deleted.
6. Do not invent sensors or integrations the app does not have. Owner-reported
   state, lifecycle events and time are the whole budget.
7. Deploy a repaired checkpoint, stay YELLOW, and return a retest prompt
   addressed to the SAME independent QA conversation.

Do not ask the owner to paste the report's contents — you have the path.
```

---
---

# Round 1 — the original test record (unretracted)

> Everything below is the round-1 record exactly as written. Its individual
> findings stand; only the overall verdict is superseded by Round 1a above.

**Round 1 verdict (superseded): PASS.** A fresh conversation, per D-077, that
had not seen how this phase was built. Every scenario the phone-check list names
was exercised against the deployed Preview, all eleven defects the builder's own
gate recorded (DEF-0034–DEF-0044) were independently re-reproduced from their
own repro steps rather than taken on the builder's word, and all eleven no
longer reproduce. No new blocking or non-blocking finding *within the gate as
written*. The full automated suite was independently rerun from the checked-out
repository rather than trusted from `PHASE_STATUS.md`, and it matches the
builder's counts exactly.

## Identity

|                          |                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase                    | 6 — Timeline + Insights                                                                                                                                                             |
| Checkpoint SHA tested    | `e681a66` — the product checkpoint named in `docs/PHASE_STATUS.md` and `docs/NEXT_PROMPT.md`                                                                                       |
| `main` HEAD at test time | `a6a9e67` — confirmed documentation-only past `e681a66`: `git diff e681a66..HEAD --stat` touches only `docs/NEXT_PROMPT.md` and `docs/PHASE_STATUS.md`, no `src/` or `tests/`      |
| Deployed Preview SHA     | `a6a9e67`, read live from `preview/build-info.json` (`commitSha a6a9e6716f1182bab75b798c70028812b721eeaa`, built `2026-08-21T22:09:50.243Z`) |
| Match                    | Yes — deployed Preview equals `main` HEAD, and `main` HEAD is `e681a66` plus docs only |
| Preview URL tested       | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                          |

## Mobile configuration

Claude Browser pane, 360×780 viewport, Android Chrome UA
(`Mozilla/5.0 (Linux; Android 14; Pixel 8) ... Chrome/148 Mobile Safari/537.36`),
`devicePixelRatio` ≈ 2, `navigator.maxTouchPoints` 5 — confirmed live via
script before testing began, not assumed from the resize call.

**Disclosed limitation.** `computer` tool click actions timed out after 30s on
every target tried, while the page stayed responsive throughout. Screenshots
worked once the tab was fronted, so visual verification is by real rendered
screenshots. Real interaction was driven by dispatching `.click()` on the actual
DOM element through the page's own JS context, exercising the same React
handlers a touch would, plus `getBoundingClientRect()` for touch-target sizing.
It does **not** reproduce genuine multi-touch gesture timing. Nothing in this
phase's diff touches double-tap protection, and Timeline structurally cannot
receive a double-tap-created duplicate (D-087), so the gap was judged low-risk
for this phase. It is not physical-phone validation, which section 37 keeps as a
separate, still-required check.

## Governing acceptance criteria used

`docs/CANONICAL_REBUILD_PLAN.md` v1.2 in full (section 51 as the phase's gate;
sections 4.6, 11, 26, 27, 36, 37, 60, 61, 63, 64); `docs/qa/README.md` including
§3a/D-082/D-083; `docs/PHASE_STATUS.md`'s Phase 6, 5 and 4 entries read as the
builder's account and independently checked; `docs/DECISION_LOG.md` D-059–D-079
and D-084–D-088; `docs/DEFECT_LEDGER.md` DEF-0020 and DEF-0028–DEF-0044;
`docs/ARCHITECTURE_BOUNDARIES.md` with the `OPEN_TO_SURFACES` boundary confirmed
against the actual guard. Implementation read fresh: `insights.ts` in full,
`timelineEntries.ts`, `TimelineScreen.tsx`, `InsightsScreen.tsx`,
`EvidencePieces.tsx`, `describe.ts`, and the diffs to `NowScreen.tsx`,
`learning.ts`, `outcomes.ts` and `buildInfo.ts`.

## Scenarios and flows tested

| # | Scenario / flow | What it checks | Result |
|---|---|---|---|
| 1 | Deployed `build-info.json` vs. checkpoint | Preview SHA matches | **PASS** |
| 2 | `#/qa` header eyebrow | Phase identity claim (DEF-0031's class) | **PASS** — reads "PHASE 6" |
| 3 | "Nine months of evenings" → Insights, closed | Six cards, no percentage, ordinary language | **PASS** |
| 4 | Same → kitchen card, opened | Evidence panel figures | **PASS** |
| 5 | Same → Now, **See evidence** | DEF-0039: conclusion vs. tally | **PASS** |
| 6 | Same → Timeline, one page | Reads as a life; day order consistent | **PASS** |
| 7 | "A file with damage in it" → Timeline | Malformed rows isolated (DEF-0043) | **PASS** |
| 8 | Same → Insights, Now | Malformed history breaks no surface | **PASS** |
| 9 | "Two ordinary weeks" → Timeline | Private-domain discretion (section 11) | **PASS** |
| 10 | "One answer, and a lot of silence" → Insights | Honest empty state | **PASS** |
| 11 | "A month of what actually worked" → Insights | Withheld-rate state and threshold | **PASS** |
| 12 | Correct a belief on "Nine months of evenings" | Section 62: correction preserved | **PASS** |
| 13 | "Everything current except the studying" → Insights | Coverage card, DEF-0044 | **PASS** |
| 14 | "A settled arrangement, and one week away" → Timeline | DEF-0042 temporary vs. standing | **PASS** |
| 15 | Career & Learning → "Recently" | D-088 shared wording without a tag | **PASS** |
| 16 | Touch-target sweep, Insights + Timeline | No new sub-44px control | **PASS** — only "More" (80.6×36, P4-7) |
| 17 | Overflow / sticky sweep | DEF-0036's class; D-087 | **PASS** |
| 18 | `npm run test` full suite | Confirm the 700-test claim | **PASS** — 42 files, 700/700 |
| 19 | `npm run verify` | Confirm the clean-checkout gate | **PASS** |
| 20 | "A Thursday with nothing needing doing" → Now | P4-6 deferral, live | **Confirmed unchanged (deferred)** |

## Round-1 findings

None within section 51's gate as written. All eleven of DEF-0034–DEF-0044 were
re-reproduced from their own recorded repro steps against the deployed Preview
and none reproduce (mapping: #4/#5 → DEF-0039; #7 → DEF-0043; #13 → DEF-0044;
#14 → DEF-0042; #6 → DEF-0034/0035/0037; #17 → DEF-0036).

## Deferred items — confirmed unchanged

- **P4-6 — the no-action eyebrow** renders a whole sentence in the uppercase
  micro-label slot. **Reconfirmed live** (scenario 20).
- **P4-7 — the More button is 80.6×36**, below 44px. **Reconfirmed live** by
  direct measurement (scenario 16).
- **A started move that is never settled** stays "Under way" indefinitely.
  Carried forward by code-diff inspection — nothing in `f50137d..e681a66`
  touches `lifecycle.ts` or any started-move path.
- **The four Phase 5 deferrals** (inline Life-area link under 44px; no new-goal
  creation; no dated situational-exception control; domain-scoped "Recent
  changes") — carried forward by diff scope; nothing in the diff touches
  `src/features/life/`.
- **Older deferrals** (ranking dimensions costing weight on ignorance; `hold`
  never generated; free-text constraints shown not enforced; Emotional Health
  with no standing concept) — carried forward by diff scope. **Note:** the last
  of these is now directly relevant to QA-A1 and should be reconsidered as part
  of that repair rather than carried forward again.

No new deferral is introduced by this QA pass.

## The one thing worth a second look that is not a defect

`PHASE_STATUS.md` records that `now.spec.ts`'s "creates one episode from a
double tap" failed once in a full desktop Playwright run during the repair gate,
then passed on every rerun. This session had no Playwright against the deployed
Preview and could not attempt to reproduce it, so it is neither confirmed nor
cleared here — repeated only so a reader need not cross-reference to know it
exists.
