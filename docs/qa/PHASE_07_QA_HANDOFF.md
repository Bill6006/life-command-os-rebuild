# Phase 7 independent QA handoff

## Result

**Overall: FAIL — checkpoint precondition not met.**

Independent QA stopped at the mandatory deployed-checkpoint preflight. The
handoff requires the deployed Preview's `preview/build-info.json` to report
product checkpoint `322c00b` and says to stop if it does not. On 2026-08-23,
the endpoint returned HTTP 200 with:

```json
{
  "commitSha": "66eeab308b4f0757f0f8a6ba64c0803237888750",
  "commitShort": "66eeab3",
  "branch": "main",
  "target": "preview",
  "buildTime": "2026-08-23T06:56:16.883Z"
}
```

The visible Preview build badge independently read `66eeab3`. Because the
deployed artifact is not the checkpoint named in the QA handoff, no Phase 7
acceptance conclusion about `322c00b` is valid. Product behavior was not tested
beyond the sealed cold-use opening screen and this preflight.

## Scope and configuration

- **Phase:** Phase 7 — AI exports + backup/restore
- **Checkpoint SHA assigned for QA:** `322c00b`
- **Checkpoint SHA tested:** none; the assigned deployed checkpoint was not
  available at the required Preview URL
- **Deployed SHA observed:**
  `66eeab308b4f0757f0f8a6ba64c0803237888750` (`66eeab3`)
- **Preview:**
  `https://bill6006.github.io/life-command-os-rebuild/preview/`
- **Checkpoint evidence:**
  `https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
- **Mobile configuration:** preflight only in the Codex in-app Chromium
  browser at a 360 x 800 viewport. The required Android-style acceptance
  context (touch, mobile user agent, realistic device pixel ratio, mobile
  scrolling) was deliberately not started after the stop condition fired.
- **Repository state observed after the stop:** local `main` and `origin/main`
  were at `66eeab3`; `322c00b` was the immediately preceding commit. This is
  context only, not evidence that the deployed files are equivalent.

## Governing acceptance criteria used

Only the gate criteria needed to decide whether testing could begin were used:

1. `docs/NEXT_PROMPT.md` CHECKPOINT: confirm for oneself that
   `preview/build-info.json` reports `322c00b` before concluding anything; if
   it does not, stop and say so.
2. Canonical plan section 43 and `docs/qa/README.md`: QA tests the deployed
   checkpoint, reports the checkpoint and deployed SHA, and does not repair
   product code.

The Phase 7 criteria in canonical plan sections 11, 29, 32 and 52, G-012,
G-013, and D-091 were not evaluated. Evaluating them against a different
deployed SHA would violate the checkpoint gate.

## Scenarios and flows

| Flow | Result | Evidence |
| --- | --- | --- |
| Sealed cold owner-use opening screen | INCOMPLETE | The normal Now screen opened at 360 x 800 before any repository document beyond the dispatch handoff was read. It visibly claimed that Preview data was invented, showed build `66eeab3`, said there was nothing pressing/nothing to suggest yet despite “plenty of history,” and asked for current energy. QA stopped before navigating to Data. |
| Deployed checkpoint verification | **FAIL — BLOCKING** | The visible badge and `preview/build-info.json` both reported `66eeab3`, not `322c00b`. |
| Claim-to-evidence semantic audit | NOT RUN | Blocked by checkpoint mismatch. |
| Semantic and product correctness | NOT RUN | Blocked by checkpoint mismatch. |
| Targeted Phase 7 acceptance | NOT RUN | Blocked by checkpoint mismatch. |
| Known-defect regression | NOT RUN | Blocked by checkpoint mismatch. |
| Architecture inspection | NOT TRIGGERED | No product finding was investigated after the mandatory stop. |
| Full-suite duplication | NOT TRIGGERED | A suite run cannot establish that the required deployed SHA is present. |

## Exact reproduction

### QA-07-001 — deployed Preview does not match the assigned checkpoint

**Classification:** blocking; release/checkpoint integrity; behavioral QA
precondition.

1. Open
   `https://bill6006.github.io/life-command-os-rebuild/preview/`.
2. Observe the build badge at the top of the mobile screen: `66eeab3`.
3. Request
   `https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json`
   without using a cached response.
4. Observe HTTP 200 and `commitShort: "66eeab3"`, with full SHA
   `66eeab308b4f0757f0f8a6ba64c0803237888750`.
5. Compare it with the QA handoff checkpoint `322c00b`.

**Expected:** the endpoint reports `322c00b` before independent QA begins.

**Actual:** it reports `66eeab3`.

**Impact:** QA cannot identify the deployed artifact as the assigned product
checkpoint, so a PASS or FAIL on Phase 7 behavior would not certify
`322c00b`.

## Findings by category

### Semantic

Not assessed after the checkpoint stop. The opening-screen claims listed above
are sealed observations, not findings or conclusions.

### Behavioral

- **QA-07-001 (blocking):** the deployed checkpoint identity contradicts the
  handoff's CHECKPOINT and explicit precondition.

### Privacy

Not assessed after the checkpoint stop.

### Mobile/UI

Not assessed after the checkpoint stop. The opening screen rendered in the
360 x 800 preflight viewport, but that is not the required Android-style test
configuration and is not reported as a pass.

## Automated tests and false confidence

The builder handoff says product checkpoint `322c00b` was deployed and
confirmed live. The deployed checkpoint preflight disproves that current
claim: both owner-visible and machine-readable deployed identity are
`66eeab3`. Any build/deploy confirmation that supported the handoff therefore
gave false confidence about the artifact QA would actually receive. No builder
test suite was rerun, because none can substitute for the deployed identity
check and the protocol says not to duplicate green suites without a concrete
product trigger.

## Deferred and disclosed items

Authenticated/tamper validation, migrations, selective restore, override of a
refused file, a past-backup library, legacy import, DEF-0059, DEF-0060, and the
resolved-unreproduced `guide-resume.test.ts` item were **not reassessed and
cannot be confirmed unchanged in this run**. The mandatory checkpoint stop
occurred before those checks. This report introduces no conclusion about any
of them.

## Recommendation

Keep Phase 7 **YELLOW**. Return to the current original Claude builder
conversation. Re-establish a single unambiguous deployed checkpoint under plan
section 42, make the checkpoint named in the handoff agree with the SHA served
by `preview/build-info.json`, rerun the appropriate gate, and provide a retest
handoff to this **same Codex QA conversation**. Do not start Phase 8 and do not
mark Phase 7 GREEN.

- **Recommended model:** current Sonnet-class Claude coding model. The blocker
  is a bounded build/deploy/checkpoint-contract repair, not yet an ambiguous
  product-semantics investigation.
- **Recommended intelligence level:** High. The repair is operationally narrow
  but must preserve checkpoint provenance and avoid certifying an equivalent
  artifact by assumption.
- **Conversation:** CURRENT — the original Claude Phase 7 builder conversation.
  It owns the unresolved YELLOW phase and has the deployment context needed to
  repair the gate; QA must remain separate.

## NEXT CLAUDE ACTION

- **Intelligence level:** High
- **Conversation:** CURRENT — original Phase 7 Claude builder conversation
- **Why this level:** The checkpoint repair is bounded, but provenance and
  deployment verification require careful handling.
- **Why this conversation:** The same unresolved phase returns to its original
  builder; this Codex conversation remains independent for retest.
- **Attach/reference:** `docs/qa/PHASE_07_QA_HANDOFF.md`

## COPY/PASTE PROMPT

```text
Phase 7 independent QA returned FAIL at the deployed-checkpoint precondition.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You are the CURRENT original Claude builder conversation for Phase 7. Read
docs/qa/PHASE_07_QA_HANDOFF.md in full before acting.

Keep Phase 7 YELLOW. Do not start Phase 8 and do not mark Phase 7 GREEN.

QA was assigned product checkpoint 322c00b, but the deployed Preview badge and
preview/build-info.json both reported
66eeab308b4f0757f0f8a6ba64c0803237888750 (66eeab3). The QA handoff explicitly
required QA to stop on that mismatch, so no Phase 7 product acceptance testing
was performed.

Handle QA-07-001 under canonical plan section 42. Reproduce the checkpoint
contradiction, identify the whole build/deploy/handoff class, add or strengthen
the narrow regression or release guard that should prevent it, prove the guard
fails when the defect is reintroduced, repair the root cause, and rerun the
appropriate full builder gate. Do not assume that two commits produce an
equivalent artifact; provide an unambiguous checkpoint whose exact SHA matches
the SHA served by the deployed Preview's build-info.json.

Preserve all Phase 7 behavior already built and every explicit deferral. Do not
edit docs/qa/PHASE_07_QA_HANDOFF.md; QA owns that file.

Deploy the repaired checkpoint, verify the deployed build-info.json yourself,
keep the phase YELLOW, and provide the complete retest handoff addressed to the
SAME Codex QA conversation that authored this report. Include the repaired
checkpoint SHA, the deployed SHA, exact verification results, open/deferred
items, and the D-092 model/level/conversation/launcher ending. Do not make the
owner ask for the retest prompt.
```

## Independent QA retest — Round 2, full product pass

### Result

**Overall: FAIL — five blocking product findings, one closeout-blocking
documentation finding, and two non-blocking findings.**

QA-07-001 is resolved. The live deployed SHA was
`3fc1dde68bf4907fae9b9ce6c99334fd8cd7451a`, and
`node scripts/checkpoint-equivalence.mjs 322c00b` reported six changed files
and no bundle-relevant changes. The deployed product is mechanically
bundle-equivalent to product checkpoint `322c00b`, so the full Phase 7 pass
proceeded.

The product does pass the exact storage happy path: private records, unknown
fields and unreadable raw rows survive field by field; a damaged file is
refused; the same undamaged file is accepted immediately afterwards; the
replacement is exact; and the reopened database matches. Those passes do not
cover the failures below. The failures are at the boundaries the existing
suites did not ask about: what an export claims before its later disclaimer,
what “left out” actually excludes, which clock gives a backup its identity,
what happens when the second persistence check fails, and whether the recovery
control remains tappable after scrolling to Restore.

### Checkpoint and configuration

- **Phase:** Phase 7 — AI exports + backup/restore
- **Product checkpoint tested:** `322c00b`
- **Deployed SHA tested:**
  `3fc1dde68bf4907fae9b9ce6c99334fd8cd7451a` (`3fc1dde`)
- **Bundle equivalence:** PASS — six changed files, none bundle-relevant:
  `docs/DECISION_LOG.md`, `docs/DEFECT_LEDGER.md`, `docs/NEXT_PROMPT.md`,
  `docs/PHASE_STATUS.md`, `docs/qa/PHASE_07_QA_HANDOFF.md`, and
  `scripts/checkpoint-equivalence.mjs`
- **Deployed evidence:** live cache-bypassed HTTP 200 from
  `preview/build-info.json`, build time `2026-08-23T19:26:21.327Z`
- **Android/mobile configuration:** headless Chromium; 360 x 780 viewport;
  360 x 800 screen; DPR 3; `isMobile: true`; `hasTouch: true`; Android 14
  Galaxy-class Chrome user agent; America/New_York; touch/tap and mobile
  scrolling
- **Supplementary cold-use configuration:** Codex in-app Chromium at 360 x
  800, used before reading the governing repository documents
- **Evidence directory:** `test-results/phase07-qa-retest/`

### Governing acceptance criteria

- Canonical plan section 11 — private data is available to every export
  family, but review inclusion is explicit and clearly stated.
- Section 29 — complete backup; validate, preview, atomically apply, verify,
  roll back on failure, no false success, no stale recovery overwrite, and
  same-file retry.
- G-012 — degraded data does not blank the app and Data/restore remains
  reachable.
- G-013 — selected sections, deliberate Private inclusion, embedded prompt,
  and keep/change/remove/not-change instructions.
- Section 52 — selection/select-all/clear/remembering, app and engine build,
  data range, selected domains, diagnostics-conditioned tuning review,
  complete transactional verified mobile backup/restore.
- D-091 invariant 8 — synthetic and owner histories never share identity.
- D-093 — backup reads the owner store whatever is shown; restore runs only on
  owner history.
- D-094 — sections are chosen, domains are reported from the document, and
  Private is neither selected-all nor remembered.
- D-095 — content fingerprint is integrity, not authentication.
- D-097 — product and deployed SHAs are separately named and bundle
  equivalence is checked.

### Sealed cold-use claims recorded before specification reading

At normal Now the Preview said the visible data was invented, showed deployed
build `3fc1dde`, and offered the normal owner navigation. More then claimed:

- data leaves the device only when exported or backed up;
- a backup comes from the owner's records whichever history is visible;
- Data creates a review, takes a complete backup including the private area,
  validates a restore before applying it, verifies it afterwards, and undoes
  it if it does not land.

Data claimed:

- review selection controls what is included and the document starts with a
  self-contained assistant prompt;
- Private is off unless deliberately enabled;
- backup leaves nothing out and uses the owner records whatever is visible;
- restore writes nothing until the final press.

The default generated document also visibly contained the sentence
`The app is suggesting nothing right now: Nothing to suggest just yet..`.

### Scenarios and flows

| Flow | Result | Evidence |
| --- | --- | --- |
| QA-07-001 checkpoint-equivalence repair | **PASS** | Live `3fc1dde`; equivalence script passes against `322c00b`. |
| Data from More and direct `#/data` | **PASS** | Reached by Android touch and direct route. |
| Default selection, Select all, Clear, remembered selection | **PARTIAL FAIL** | Controls operate; Select all leaves Private off and includes Diagnostics; Private is not remembered. After Clear, the UI still reports 19 entries and four “Life areas in it,” contradicting `Sections chosen: none` and the document’s “No sections were chosen.” QA-07-004. |
| G-013 prompt parts and diagnostics tuning request | **PASS for owner history** | Embedded prompt contains source of truth, current state, limiter, app tuning when Diagnostics is included, working, drifting, change, simplify, not-change, actions, uncertainty and questions. |
| Synthetic export source identity | **FAIL — BLOCKING** | Its opening instruction says this is one person's own record and he owns everything below; only later does it say it is a synthetic QA history and not a real person. QA-07-002. |
| Private off / on / Select all | **FAIL — BLOCKING** | Private detail and heading are absent while off, present in full when deliberately enabled, and Select all leaves it off. But the off document says nothing from that area is below and later reports Private current, moderate, last heard three days ago; the screen also lists Private under “Life areas in it.” QA-07-003. |
| Backup completeness and exact restore | **PASS** | Two valid records (one private), two different unknown-field payloads, one unreadable raw row, and the fingerprint survived field by field; the pre-existing replacement row disappeared; reopened storage matched. |
| Damaged-file refusal and same-file retry | **PASS** | Altered checksum refused with “Nothing was changed”; the undamaged same file immediately produced a plan and restored. |
| Backup while laboratory history is visible | **FAIL — BLOCKING** | Records correctly come from the owner store, but `createdAt`, Taken, and filename use the laboratory's February clock rather than the real August owner clock. QA-07-005. |
| Restore while laboratory history is visible | **PASS in rule; mobile finding in remedy** | Apply is disabled and the refusal explains why. At the Restore scroll position, Show mine is overlapped by More and cannot be tapped; scrolling all the way to the top makes it work. QA-07-006. |
| Restore happy path and reopened persistence check | **PASS** | Exact Android flow reported restored content and reopened IndexedDB matched the fingerprint. |
| Post-restore reopen failure | **FAIL — BLOCKING** | Forced IndexedDB reopen failure falls back to an empty memory store, yet the UI keeps a green “Restored and checked” success and adds a contradictory warning below it; no rollback is attempted. QA-07-007. |
| G-012 malformed owner row | **PASS for reachability and preservation** | Data remained reachable; backup held one unreadable row verbatim; restore preview accepted it and exact restore returned it. |
| Phone copy/layout | **PARTIAL FAIL** | Export remains selectable and normal controls meet target sizing/no horizontal overflow in the standing gate. Sticky Show mine and More overlap after scrolling. QA-07-006. |
| Owner-facing document read-through | **FAIL — NON-BLOCKING COPY** | Double terminal punctuation in the no-action sentence. QA-07-008. |
| D-097 repository record | **FAIL — MATERIAL DOCUMENTATION** | `PHASE_STATUS.md` still says deployed SHA `322c00b`, “Do they match? Yes,” and “deployed SHA equals checkpoint,” while live deployment is `3fc1dde`; this contradicts D-097 and the repaired handoff. QA-07-009. |

## Exact findings and reproductions

### QA-07-002 — a synthetic export begins by claiming it is the owner's own life

**Classification:** blocking; semantic; synthetic/owner identity.

1. Open `#/qa` in Preview.
2. Load **Two ordinary weeks**.
3. Open More → Exports, backup and restore.
4. Select all (Private may remain off).
5. Read the generated document from the first line.

**Actual opening:**

> You are reviewing one person’s own record of his life, exported from an app
> he uses to keep it. He is the owner of everything below and has chosen to
> show it to you.

Only later, under About this document, it says:

> Source: a synthetic test history loaded into the app’s QA laboratory. This
> is not a real person’s record.

**Expected:** source identity is coherent from the first instruction an
assistant reads. A later disclaimer cannot repair the prompt's initial claim.

**Impact:** the artifact can leave the device with two mutually exclusive
instructions about whose life it describes. This violates D-091 invariant 8
and the phase's explicit “whose history is it?” acceptance pressure.

### QA-07-003 — Private is declared absent while private status is disclosed

**Classification:** blocking; privacy and semantic correctness.

1. Load **Two ordinary weeks**, which contains a private record three days
   before the scenario clock.
2. Open Data and press Select all.
3. Confirm Private remains unchecked and the screen says it is left out.
4. Read all Private mentions in the generated document.

**Actual:** the prompt says “Nothing from that area is below,” and the header
says Private is left out. Later the coverage section says:

> Private / Sexual Health — current, evidence moderate; last heard 3 days ago.
> Something has come in about private / sexual health recently.

The screen simultaneously lists Private / Sexual Health under **Life areas in
it**.

**Expected:** an export that says nothing from Private is included must not
disclose the presence, freshness or evidence strength of private records.
Either that metadata is part of the deliberate Private decision or the prompt
must accurately name what remains disclosed.

**Impact:** the document leaks sensitive participation metadata under an
explicit exclusion and contradicts its own source-of-truth instructions.

### QA-07-004 — range and selected domains ignore section selection

**Classification:** blocking/material; semantic; section 52 and D-094.

1. With **Two ordinary weeks** visible, open Data.
2. Press Clear.
3. Observe `Sections chosen: none` and the document sentence “No sections were
   chosen, so this document contains nothing about the owner.”
4. Read the rows immediately above it.

**Actual:** `Record covers` still reports 19 entries and `Life areas in it`
still reports Long-Range Direction, Fatherhood, Private and Sleep.

**Expected:** “Life areas in it” and the current selected domains are facts
about the selected document, not the whole source record after every section
has been removed. At minimum the UI and document may not claim both “nothing
about the owner” and four life areas “in it.”

**Impact:** the composer carries a header wider than its selection and makes a
zero-section export internally impossible to interpret.

### QA-07-005 — an owner backup inherits the laboratory clock

**Classification:** blocking; behavioral and storage metadata; D-093 boundary.

1. In the Android context, load **Two ordinary weeks**. Its clock is
   2026-02-15 owner-local; the real Preview date is 2026-08-23.
2. Open Data while the test-history banner remains visible.
3. Press Take a backup.
4. Inspect the backup's `createdAt`, Taken row and filename.

**Actual:** records come from the owner store as intended, but the new backup
has `createdAt: 2026-02-16T04:00:00.000Z` and filename
`life-command-os-backup-2026-02-15-3fc1dde.json`.

**Expected:** reading records from the owner store must also give the backup an
owner/real moment and zone. A laboratory clock may date the synthetic review
it describes, but not the owner backup the screen says is independent of what
is visible.

**Impact:** a backup taken in August is filed and previewed as February. The
metadata used to identify the right backup later is false.

### QA-07-006 — Show mine is covered by More after scrolling to Restore

**Classification:** major, non-blocking because a workaround exists; mobile/UI
and D-093 product judgment.

1. Use the Android configuration and load a scenario.
2. Open Data and scroll down through the long export and backup panels to
   Restore.
3. Read the refusal directing the owner to press Show mine at the top.
4. Tap the sticky Show mine control without first returning to page top.

**Actual geometry at the Restore scroll position:** More occupies x 263.03–344,
y 8–44; Show mine occupies x 246.78–344, y 12–56. The top bar is z-index 20
and the lab notice z-index 19. A real touch tap times out because More receives
the pointer. The scenario remains visible. After scrolling all the way to page
top, Show mine moves to y 65–109 and the tap works.

**Expected:** a sticky recovery notice stays actionable when sticky. D-093
describes the cost as one press; at the destructive panel it is a full-page
scroll plus a press, and the apparent button is untappable.

**Evidence:** `android-data-top.png` shows the usable at-top state;
`android-show-mine-after-tap.png` and the recorded rectangles show the scrolled
failure.

### QA-07-007 — failed reopened-storage verification leaves a green success

**Classification:** blocking; behavioral/storage; no-false-success and rollback.

1. In a fresh Android context, seed one valid owner record A and take a backup.
2. Replace the owner database with different valid record B and reload.
3. Check the A backup; the plan correctly says one entry will replace one.
4. Immediately before the final press, force the next IndexedDB open to fail.
   This targets only the provider's promised post-restore reopen check; the
   transactional write and first read-back still run normally.
5. Press Replace everything with this backup.

**Actual:** `openStore` converts the failed reopen into an empty memory store.
The screen then shows the green result:

> Restored and checked: the store now holds 1 entry, exactly as the backup does.

and below it:

> what came back after reopening the database is not what was restored

The provider publishes the fallback's empty snapshot, returns the earlier
success outcome, and does not roll back. Record A was on disk when QA restored
the normal IndexedDB open, proving that a write did occur; the app simply could
not deliver the reopened verification it claims in green.

**Expected:** the final persistence check is part of the claimed restore. If
it cannot be completed or returns different content, the result cannot remain
success. The owner must get one coherent stage-specific outcome and the
rollback/uncertain-state handling required by section 29.

**Evidence:** `restore-reopen-failure.mjs` and
`android-reopen-failure.png`. The screenshot shows the green success before
the contradictory warning below the fold.

### QA-07-008 — double terminal punctuation in the export

**Classification:** non-blocking; semantic copy.

On the normal Preview no-action history, the generated document says:

> The app is suggesting nothing right now: Nothing to suggest just yet..

`compose.ts` appends a period to a headline that already carries one. This is
the same whole-document English class DEF-0060 says is now swept, but the sweep
only checks count/noun patterns.

### QA-07-009 — Phase status still asserts the literal SHA equality D-097 removed

**Classification:** material release documentation; blocking formal closeout,
not a product-runtime defect.

`docs/PHASE_STATUS.md` still records deployed Preview SHA `322c00b`, says
“Do they match? Yes,” and marks “deployed SHA equals checkpoint SHA” Pass. The
live deployed SHA is `3fc1dde`, and D-097 now explicitly says this repository
must report product checkpoint and deployed SHA separately and check bundle
equivalence. The repaired `NEXT_PROMPT.md` follows D-097; the full record it
links to does not.

## Findings by category

### Semantic

- **Blocking:** QA-07-002 synthetic/owner contradiction.
- **Blocking:** QA-07-003 Private-exclusion contradiction.
- **Blocking/material:** QA-07-004 selection-independent range/domains.
- **Non-blocking:** QA-07-008 double terminal punctuation.
- **Closeout-blocking documentation:** QA-07-009 stale literal SHA claims.

### Behavioral and storage

- **Blocking:** QA-07-005 laboratory time stamps the owner backup.
- **Blocking:** QA-07-007 reopened-storage failure leaves a green success and
  no rollback.
- **Passed:** field-by-field backup/restore exactness, damaged-file refusal,
  same-file retry, normal transactional apply, first fingerprint verification,
  and successful reopened persistence verification.

### Privacy

- **Blocking:** QA-07-003 discloses the existence and freshness of a private
  record while asserting that nothing from Private is included.
- **Passed:** explicit Private detail is off by default, Select all does not
  enable it, it is not remembered, and deliberate inclusion renders the full
  private record.

### Mobile/UI

- **Major non-blocking:** QA-07-006 sticky Show mine is covered by More after
  scrolling; returning to absolute page top is a working but costly workaround.
- **Passed:** normal Data route, touch selection, normal restore flow, target
  sizing and horizontal containment apart from the overlapping sticky controls.

## Evidence artifacts

- `test-results/phase07-qa-retest/android-owner-use.mjs`
- `test-results/phase07-qa-retest/android-data-top.png`
- `test-results/phase07-qa-retest/android-show-mine-after-tap.png`
- `test-results/phase07-qa-retest/backup-restore-exactness.mjs`
- `test-results/phase07-qa-retest/restore-reopen-failure.mjs`
- `test-results/phase07-qa-retest/android-reopen-failure.png`

The evidence scripts create isolated, disposable browser contexts. They do not
touch the owner's browser data or repair product source.

## Automated tests that gave false confidence

- `tests/synthetic/export-honesty.test.ts` checks that a synthetic document
  contains “not a real person” somewhere, but never checks that the opening
  prompt says the opposite first (QA-07-002).
- `tests/synthetic/g013-export-handoff.test.ts` proves the Private heading and
  full detail are absent while off, but never checks coverage metadata or the
  document's own “nothing from that area” promise (QA-07-003).
- The header test explicitly compares domains with the entire source record,
  so it encodes the behavior D-094's selected-document wording and the UI's
  “in it” label make contradictory (QA-07-004).
- `tests/browser/data.spec.ts` checks only that a cleared document contains “No
  sections were chosen”; it does not read the adjacent range/domain rows.
- The browser backup-while-laboratory test checks provenance/records only; it
  does not check `createdAt`, Taken or filename against the real owner clock
  (QA-07-005).
- The restore-under-laboratory test asserts only that refusal copy contains
  “Show mine”; it never taps the named remedy from the Restore scroll position
  (QA-07-006).
- `scripts/android-gate.mjs` never loads a laboratory history, so its 27 green
  checks cannot observe the lab/topbar sticky overlap or lab-clock backup.
- `memory-provider-restore.test.tsx` exercises a successful reopen and first
  write failure, but not failed reopen/fallback or mismatched reopened content.
  The Android gate accepts the mere presence of “Restored and checked” before
  separately checking a successful storage line, so the contradictory success
  state is outside both guards (QA-07-007).
- The “document reads as English” sweep checks count/noun disagreements and
  `(s)` only; it cannot see doubled terminal punctuation (QA-07-008).

No full green suite was duplicated. The purpose-built QA evidence targeted
claims the existing green suites demonstrably did not observe.

## Deferred and disclosed items

Confirmed unchanged by document and implementation inspection:

- authenticated/tamper validation remains deliberately deferred; SHA-256 is a
  content fingerprint, not a signature (D-095);
- migrations remain empty because schema 1 is first;
- selective restore, override of a refused file, a past-backup library and
  legacy import remain unbuilt;
- DEF-0059 and DEF-0060 remain recorded closed, though QA-07-008 shows the
  English sweep is narrower than the phrase “document reads as English”;
- `guide-resume.test.ts` remains resolved-unreproduced;
- bare `npx playwright test` still serves prebuilt `dist`; QA changed no
  product source and did not use it to certify a source edit.

## Recommendation

Keep Phase 7 **YELLOW**. Return to the CURRENT original Claude Phase 7 builder
conversation. Repair QA-07-002 through QA-07-009 under canonical plan section
42, preserving the storage exactness and privacy behaviors that passed. Deploy
a new product checkpoint and return to this **same Codex QA conversation** for
targeted retest plus regression of every passed boundary affected by the
repairs. Do not start Phase 8 and do not mark Phase 7 GREEN.

- **Recommended model:** current strongest Opus-class Claude coding model. The
  repairs cross export semantics, privacy boundaries, owner/laboratory time,
  IndexedDB failure handling, mobile stacking and release provenance.
- **Recommended intelligence level:** Max. Root causes span multiple state and
  evidence boundaries, and a local wording patch would leave sibling claims
  exposed.
- **Conversation:** CURRENT — the original Claude Phase 7 builder
  conversation. It owns the unresolved phase and its deployment context; this
  Codex conversation remains the independent retester.

## NEXT CLAUDE ACTION

- **Intelligence level:** Max
- **Conversation:** CURRENT — original Phase 7 Claude builder conversation
- **Why this level:** The repair requires cross-system privacy, storage,
  temporal, UI and semantic root-cause work rather than isolated copy edits.
- **Why this conversation:** The unresolved phase returns to its original
  builder, while this Codex conversation remains independent for the retest.
- **Attach/reference:** `docs/qa/PHASE_07_QA_HANDOFF.md` and the evidence files
  under `test-results/phase07-qa-retest/`

## COPY/PASTE PROMPT

```text
Phase 7 independent QA retest returned FAIL after the full product pass.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You are the CURRENT original Claude builder conversation for unresolved Phase
7. Read docs/qa/PHASE_07_QA_HANDOFF.md in full before acting, including the
Round 2 section and QA-07-002 through QA-07-009. The narrowly scoped evidence
is under test-results/phase07-qa-retest/.

Keep Phase 7 YELLOW. Do not start Phase 8 and do not mark Phase 7 GREEN. Do not
edit docs/qa/PHASE_07_QA_HANDOFF.md; QA owns it.

Repair every blocking/material finding under canonical plan section 42:
reproduce it, identify the whole claim/state/privacy/layout defect class, write
a focused regression, prove that regression fails when the defect is
reintroduced, fix the root cause, and rerun the full relevant gate.

The findings are:

- QA-07-002: a synthetic export opens by calling itself the owner’s own real
  record, then later says it is synthetic.
- QA-07-003: Private is declared left out and “nothing from that area” is said
  to follow, yet coverage discloses its presence, freshness and evidence
  strength and the screen lists it under Life areas in it.
- QA-07-004: Clear yields Sections chosen: none and “nothing about the owner”
  while range and four Life areas in it remain populated.
- QA-07-005: a backup correctly reads the owner store while a laboratory
  scenario is visible, but its createdAt, Taken and filename inherit the
  laboratory’s February clock instead of the real August owner moment.
- QA-07-006: after scrolling to Restore on Android, sticky Show mine is covered
  by More and cannot be tapped until the owner scrolls all the way back to the
  page top.
- QA-07-007: if the promised post-restore database reopen fails, the provider
  falls back to empty memory state but retains a green Restored and checked
  result, prints a contradiction below it, and does not enter rollback or an
  honest uncertain/failure outcome.
- QA-07-008: the exported no-action sentence ends in two periods.
- QA-07-009: PHASE_STATUS.md still asserts deployed SHA 322c00b equals the
  checkpoint and passed equality, contradicting live 3fc1dde and D-097.

Preserve every flow QA passed: deliberate Private detail inclusion; Select all
and remembered-Private safety; prompt completeness and diagnostics tuning;
field-by-field private/unknown/malformed backup exactness; damaged-file
refusal; same-file retry; atomic replacement; normal first verification;
successful reopened persistence verification; G-012 reachability; and all
explicit deferrals.

For restore failures, cover the whole post-apply class: a failed reopen, a
failed reopened read, different reopened contents, and any fallback backend.
The owner must receive one coherent result that does not say success before a
contradictory failure below it, and the rollback/uncertain-state semantics must
match what actually happened.

For export/privacy repairs, read the document from its first line as the
receiving assistant and prove exclusions cover metadata as well as detail.
Selected range/domains must agree with the actual selected document in the
zero-section, Private-off and ordinary cases.

For the mobile repair, use a touch Android context after scrolling to the
Restore panel; visibility alone is not a regression. Prove the named recovery
action receives the tap there.

Run the full builder gate, deploy a repaired product checkpoint, verify the
live deployed SHA and D-097 bundle equivalence, keep Phase 7 YELLOW, and write
the complete retest handoff for the SAME Codex QA conversation. Include exact
verification results, open/deferred items, model, level, conversation and the
D-092 launcher. Do not make the owner ask for the retest prompt.
```

## Round 3 — Codex retest (2026-08-23)

### Overall result: FAIL — deployed-checkpoint precondition

Phase 7 remains **YELLOW**. Round 3 stopped at the checkpoint gate exactly as
the builder handoff requires. The repaired product checkpoint is not the bundle
currently deployed at Preview, so this run did not certify the repair and did
not proceed into the requested regression matrix.

### Checkpoint identity and equivalence

- **Product checkpoint requested:** `3a8e8b6`
- **Deployed SHA read live from `preview/build-info.json`:** `3fc1dde68bf4907fae9b9ce6c99334fd8cd7451a`
- **Repository HEAD inspected:** `5405eb4df8320adb896b7f6fcb222fea9dc1a413`
- **Relationship:** deployed `3fc1dde` is the parent-side, pre-repair commit;
  `3a8e8b6` is not its ancestor. The repair commit is newer than the deployed
  build, rather than an older product checkpoint followed by docs-only commits.

The handoff says to run the supplied checker from the deployed ref and stop if
it reports bundle-relevant differences. The equivalent read-only invocation
from the current checkout was:

```text
node scripts/checkpoint-equivalence.mjs 3a8e8b6 --ref 3fc1dde
```

It exited 1 and identified these bundle-relevant differences:

```text
src/features/data/DataScreen.tsx
src/features/export/compose.ts
src/features/export/handoffPrompt.ts
src/features/memory/MemoryProvider.tsx
src/features/memory/memoryContext.ts
src/features/shell/AppShell.css
src/features/shell/AppShell.tsx
src/memory/restore.ts
```

The check initially run against local `HEAD` passed, but that is not evidence
about the live deployment: `HEAD` is newer than the product checkpoint and its
intervening changes are documentation-only, while the live SHA is older than
the product checkpoint and lacks the eight repaired source files above. The
live-ref check is the one the checkpoint contract requires.

### Deployed-product corroboration

Before the ancestry error was resolved, QA opened the deployed Preview and read
the document from its first line. It showed the same pre-repair signatures the
source comparison predicts:

- a synthetic export opened with “You are reviewing one person’s own record of
  his life” and “He is the owner of everything below” before later identifying
  itself as a synthetic test history (QA-07-002);
- with Private left out, the header still listed Private / Sexual Health under
  “Life areas in it” (QA-07-003);
- the no-action sentence still ended in doubled punctuation (QA-07-008).

These observations corroborate the failed gate; they are not a substitute for
the required cold Android Round 3 matrix and do not assess whether the local
repairs are correct.

### Acceptance, scenarios, and evidence status

- **Checkpoint gate:** FAIL — blocking precondition.
- **QA-07-002 through QA-07-009 repaired-product retest:** NOT RUN — the
  repaired bundle is not deployed.
- **Ordinary selection/header scope:** NOT RUN.
- **Private exclusion without non-private over-reach:** NOT RUN.
- **Post-reopen throw, memory fallback, and different-content outcomes:** NOT
  RUN.
- **Successful restore and field-by-field backup exactness regressions:** NOT
  RUN.
- **Android touch, sticky header group, laboratory notice, and build notice:**
  NOT RUN.
- **Real-phone copy from the first line:** NOT RUN.
- **New evidence artifacts:** none. The precondition is fully reproducible from
  the live build manifest and Git history; no QA-only script was needed.

The Android configuration and evidence from Round 2 remain recorded above but
cannot be carried forward as Round 3 evidence for a bundle that was never
deployed. No automated suite was rerun after the blocking gate, because the
handoff explicitly says to stop. The automated confidence gap in this round is
deployment provenance: green local tests cannot certify browser bytes that
predate the repair.

### Findings and deferrals

No new semantic, behavioral/storage, privacy, or mobile/UI product finding is
opened. The blocker is release provenance: Preview serves the pre-repair
product. QA-07-002 through QA-07-009 therefore remain unverified on the
deployed surface rather than reopened against the local source.

The disclosed deferrals remain unchanged: authenticated/tamper validation
(D-095), migrations, selective restore, override of a refused file, a
past-backup library, and legacy import. DEF-0059 through DEF-0062 and the
resolved-unreproduced `guide-resume.test.ts` status were not altered by this
run.

### Recommendation

Return to the **CURRENT original Claude Phase 7 builder conversation**. Keep
Phase 7 YELLOW. Diagnose why Preview still reports and serves `3fc1dde`, deploy
the repaired checkpoint (or a later commit proved bundle-equivalent to
`3a8e8b6`), and verify the live SHA and live-ref equivalence before handing it
back to this **same Codex QA conversation**. Do not mark GREEN or start Phase 8.

- **Recommended model:** current strongest Opus-class Claude coding model,
  because the next task owns the repository deployment and release provenance.
- **Recommended intelligence level:** Max, because it must distinguish Git,
  CI/deploy, manifest, and served-bundle state without disturbing the repaired
  source.
- **Conversation:** CURRENT — original Phase 7 Claude builder conversation,
  because this is deployment completion for the unresolved phase; this Codex
  conversation remains the independent retester.

## ROUND 3 NEXT CLAUDE ACTION

- **Model:** current strongest Opus-class Claude coding model
- **Intelligence level:** Max
- **Conversation:** CURRENT — original Phase 7 Claude builder conversation
- **Attach/reference:** `docs/qa/PHASE_07_QA_HANDOFF.md`, especially “Round 3
  — Codex retest”

## ROUND 3 COPY/PASTE PROMPT

```text
Phase 7 independent QA Round 3 returned FAIL at the deployed-checkpoint
precondition. The repaired product was not deployed, so QA correctly stopped
before certifying it.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You are the CURRENT original Claude builder conversation for unresolved Phase
7. Read docs/qa/PHASE_07_QA_HANDOFF.md in full before acting, including the
Round 3 section. Keep Phase 7 YELLOW. Do not start Phase 8 and do not mark Phase
7 GREEN. Do not edit docs/qa/PHASE_07_QA_HANDOFF.md; QA owns it.

The required repaired product checkpoint is 3a8e8b6. On 2026-08-23, live
preview/build-info.json reported 3fc1dde68bf4907fae9b9ce6c99334fd8cd7451a.
That deployed commit predates the repair. This exact live-ref check exited 1:

  node scripts/checkpoint-equivalence.mjs 3a8e8b6 --ref 3fc1dde

It found bundle-relevant differences in DataScreen.tsx, compose.ts,
handoffPrompt.ts, MemoryProvider.tsx, memoryContext.ts, AppShell.css,
AppShell.tsx, and restore.ts. The deployed UI also exhibited the old synthetic
owner claim, private-area metadata disclosure, and doubled punctuation.

Diagnose the deployment path and deploy the repaired product checkpoint, or a
later commit whose emitted bundle is proved equivalent to 3a8e8b6. Preserve the
current repaired source and all flows Round 2 passed. Do not turn this into a
new implementation round unless deployment diagnosis proves a source change is
actually required.

After deployment:

1. Fetch preview/build-info.json live with a cache buster and record its full
   commit SHA.
2. Run scripts/checkpoint-equivalence.mjs from that deployed ref, or pass the
   exact live ref with --ref, and prove there are no bundle-relevant differences
   from 3a8e8b6.
3. Confirm the served application bytes contain the repaired first-line
   synthetic identity, selected-document/private metadata behavior, honest
   unconfirmed-restore state, owner-clock backup behavior, and grouped sticky
   header.
4. Keep Phase 7 YELLOW and write the complete Round 4 retest handoff for the
   SAME Codex QA conversation. Include the exact live SHA, equivalence output,
   verification results, unchanged deferrals, model, level, conversation, and
   D-092 launcher.

Do not make the owner ask for the retest prompt, do not edit QA's report, and
do not claim deployment from local HEAD alone.
```

## Round 4 — Codex retest (2026-08-23)

### Overall result: FAIL — repaired product passes; one new blocking mobile defect

Phase 7 remains **YELLOW**. The deployed repair resolves QA-07-002 through
QA-07-009 and preserves the backup, restore, privacy and G-012 boundaries that
Round 2 passed. Round 4 found one new blocking mobile/UI defect while testing
the repaired sticky header with the stale-build notice visible: QA-07-010.

### Checkpoint and deployed identity

- **Product checkpoint tested:** `3a8e8b6`
- **Deployed SHA tested:** `d8dd09b5848f048d5905842bccf18c1d9503f200`
- **Preview build time:** `2026-08-24T02:01:25.229Z`
- **Stable URL:** `https://bill6006.github.io/life-command-os-rebuild/preview/`

The handoff's direct `--deployed` command encountered the local Node runtime's
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` error before it could read the manifest. QA
read the same cache-busted manifest through the system trust store and passed
its full SHA to the same checker:

```text
node scripts/checkpoint-equivalence.mjs 3a8e8b6 --ref d8dd09b5848f048d5905842bccf18c1d9503f200
```

Result: exit 0. The six intervening files are documentation plus
`scripts/checkpoint-equivalence.mjs`; none is bundle-relevant. The deployed
build contains and is bundle-equivalent to `3a8e8b6`.

### Android/mobile configuration

- Chromium, isolated disposable context
- viewport `360 × 780`; screen `360 × 800`
- device pixel ratio `3`
- touch and mobile mode enabled
- Android 14 / Pixel 7 mobile user agent
- locale `en-US`; timezone `America/New_York`
- deployed Preview, not a local server

The context had its own IndexedDB and clipboard permissions. It did not inspect
or modify the owner's browser data.

### Verification executed

- Export/privacy/restore-provider focus: **209 passed** across
  `export-honesty`, G-013 handoff, and `memory-provider-restore`.
- Backup/restore exactness and corruption focus: **62 passed** across the
  contract round-trip, adversarial corrupt-backup, and restore unit suites.
- Rebuilt Data browser suite: **81 passed** across `mobile-small`,
  `mobile-large`, and desktop.
- QA-07-007 verbose failure matrix: **7 passed** — reopen throw, memory
  fallback, fallback snapshot publication, different reopened contents,
  reopened read throw, restored bytes retained, and ordinary reopen success.
  These seven repeat coverage already present in the 209-test run and are not
  added to its count.
- Independent deployed Android evidence script: all semantic, clipboard,
  privacy, date, selection, action and rectangle assertions passed. Visual
  review of its screenshots found QA-07-010.

No full green suite was duplicated. These runs target the repaired classes and
the passed boundaries the repair could disturb.

### Round 2 finding retest

| Finding | Result | Evidence |
| --- | --- | --- |
| QA-07-002 synthetic export opens as the owner | **PASS** | The first non-heading instruction is “**This is not a real person.**” and contains no owner claim; the phone clipboard preserves the whole 10,334-byte document from that opening. |
| QA-07-003 Private exclusion contradicts metadata/recent row | **PASS** | With Private off, header areas are Direction, Fatherhood and Sleep only; `private-health` and “Noted: Private entry” are absent. Ordinary non-private content remains. |
| QA-07-004 Clear leaves range/domains populated | **PASS** | Clear produces `Record covers: nothing recorded`, `Life areas in it: none`, and no chosen sections. A subsequent Recent-record-only selection restores its honest 18-entry range and three non-private areas. |
| QA-07-005 owner backup carries laboratory time | **PASS** | Under the February fixture, backup `createdAt` was `2026-08-24T03:20:43.756Z`; owner-local filename was `life-command-os-backup-2026-08-23-d8dd09b.json`. |
| QA-07-006 Show mine covered by More | **PASS** | From the Restore scroll position, More and Show mine do not overlap and a real touch click removes the laboratory and the restore refusal. |
| QA-07-007 failed reopen remains green success | **PASS** | Throw, memory fallback and different contents all return `ok: false`, stage `confirm`, applied true, not rolled back. Fallback never publishes an empty history; a normal reopen remains success. |
| QA-07-008 doubled punctuation | **PASS** | No doubled no-action terminator in the deployed export; the whole-scenario terminator sweep is green. |
| QA-07-009 stale literal SHA claims | **PASS** | The Phase 7 status now reports checkpoint and deployed state separately and records the Round 3 ancestry correction. |

### The two judgment calls

**Private exclusion:** accepted. The exported artefact is not Timeline. It says
plainly that exclusion covers both the entries and whether any exist, then
withholds the participation metadata consistently. Its ordinary recent record
still reports 18 non-private entries over the same range and areas, so the
privacy rule does not make the rest of the history falsely thin. Deliberately
turning Private on adds the area and a full Private section rather than a
placeholder.

**Unconfirmed restore:** accepted. Once the replacement transaction committed
and matched its fingerprint, rolling it back because a later connection could
not confirm it would convert a probable success into a definite non-restore.
The third state is honest: not success, applied and checked once, not confirmed,
not undone. The owner-facing copy says the backup is probably present, says
exactly what could not be checked, and tells the owner to close/reopen and not
restore over it before looking. It neither claims success nor claims nothing
was attempted.

### Preserved flows

**PASS:** field-by-field backup round-trip, Private records, unknown record
fields, malformed rows, checksum/damaged-file refusal, same-file retry, atomic
replacement, first fingerprint verification, successful reopened persistence
verification, G-012 Data reachability with a malformed row, deliberate Private
inclusion in full, Select all excluding Private, Private not remembered, prompt
completeness, diagnostics tuning request, mobile target size, horizontal
containment, and destructive-control separation.

## QA-07-010 — translucent stale-build notice becomes unreadable over scrolled content

**Classification:** blocking formal closeout; mobile/UI and release provenance.

### Reproduction

1. Open the deployed Preview in the Android configuration above.
2. Make the app's ordinary build-freshness request return a different valid
   deployed SHA, so the real stale-build notice appears. This does not modify
   product code.
3. On Data, scroll until ordinary section text is behind the sticky header.
4. Repeat with the laboratory notice also present, at the Restore panel.
5. Repeat on Timeline with a real synthetic record behind the header.

### Actual

The repaired `.shell__top` correctly sticks as one group. At scroll positions
0, 500, 1500 and 2937 its top remains 0, and More, Reload and Show mine have no
rectangle overlap. Both actions remain tappable.

The stale-build notice itself uses this translucent background:

```text
linear-gradient(rgba(255, 125, 77, 0.2), rgba(255, 125, 77, 0.11))
```

Once the sticky group leaves its original document position, page text scrolls
behind that translucent layer and remains fully visible. On Data, “What has
been observed to follow what” is drawn through “A newer build is deployed.” On
Timeline, “6.75 hours” is drawn through the same warning. With both notices,
Restore copy competes with the warning while the lower laboratory notice stays
opaque and readable. The warning's controls do not geometrically overlap; its
words visually overlap the page underneath.

The stale-build warning exists so the owner does not mistake old code for the
deployed product. A provenance warning whose sentence cannot be read under the
ordinary scrolled condition does not meet that acceptance, so this blocks the
formal GREEN closeout.

### Expected

Every member of the sticky header group must remain visually legible over
whatever content scrolls beneath it. Fix the whole background/compositing
class, on Data and ordinary routes and with either or both notices present. A
regression that only compares control rectangles is insufficient; QA's
rectangles all passed while the warning text was visibly interleaved.

### Evidence

- `test-results/phase07-qa-round4/android-round4.mjs`
- `test-results/phase07-qa-round4/android-build-notice-only.png`
- `test-results/phase07-qa-round4/android-stacked-notices.png`
- `test-results/phase07-qa-round4/android-timeline-stacked-notices.png`
- `test-results/phase07-qa-round4/android-data-lab-notice.png` — the laboratory
  notice alone, opaque and readable, for comparison

### Automated tests that gave false confidence

- `tests/browser/shell.spec.ts` proves the stale-build notice is absent when
  the build is current; it never makes the notice visible and scrolls content
  behind it.
- The QA-07-006 browser regression compares More and Show mine rectangles and
  taps Show mine. It does not exercise the build notice.
- The first pass of QA's own evidence script compared all three header-control
  rectangles at four scroll positions and passed. Only screenshot review found
  the translucent-layer text collision. This is why rectangle overlap is not a
  visual-legibility test.
- The unconfirmed-restore tests prove outcome semantics but do not render the
  owner-facing third-state copy. Round 4 inspected that production copy
  directly; adding a DOM regression for its no-success/no-never-attempted
  wording would close that remaining automation gap, but no defect was found.

### Deferred and disclosed items

Confirmed unchanged: authenticated/tamper validation remains deferred (D-095);
migrations remain empty; selective restore, override of a refused file, a
past-backup library and legacy import remain unbuilt; DEF-0059 through DEF-0063
remain recorded closed; `guide-resume.test.ts` remains
resolved-unreproduced; bare `npx playwright test` still serves prebuilt `dist`,
while `npm run test:browser` builds first.

### Recommendation

Keep Phase 7 **YELLOW**. Return to the **CURRENT original Claude Phase 7
builder conversation** for QA-07-010 only. Repair the sticky-layer readability
class under plan section 42, preserve every Round 4 pass, deploy the repaired
checkpoint, and return to this **same Codex QA conversation** for a narrow
Round 5 visual retest plus affected regression. Do not start Phase 8 or mark
Phase 7 GREEN.

- **Recommended model:** current strongest Opus-class Claude coding model,
  because the next action is a product repair in the current builder-owned
  phase.
- **Recommended intelligence level:** High, because the defect is contained
  but the regression must test composited readability rather than repeat the
  already-green geometry assertion.
- **Conversation:** CURRENT — original Phase 7 Claude builder conversation,
  because the unresolved phase and deployment remain its responsibility.

## ROUND 4 NEXT CLAUDE ACTION

- **Model:** current strongest Opus-class Claude coding model
- **Intelligence level:** High
- **Conversation:** CURRENT — original Phase 7 Claude builder conversation
- **Attach/reference:** `docs/qa/PHASE_07_QA_HANDOFF.md`, especially “Round 4
  — Codex retest,” and `test-results/phase07-qa-round4/`

## ROUND 4 COPY/PASTE PROMPT

```text
Phase 7 independent QA Round 4 returned FAIL on one new blocking mobile/UI
finding after all eight Round 2 defects passed.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You are the CURRENT original Claude builder conversation for unresolved Phase
7. Read docs/qa/PHASE_07_QA_HANDOFF.md in full before acting, especially “Round
4 — Codex retest” and QA-07-010. Review the evidence under
test-results/phase07-qa-round4/. Keep Phase 7 YELLOW. Do not start Phase 8 and
do not mark Phase 7 GREEN. Do not edit docs/qa/PHASE_07_QA_HANDOFF.md; QA owns
it.

QA-07-010: the grouped sticky header fixes sibling-control overlap, but the
stale-build notice has a translucent rgba gradient. When Data or Timeline
content scrolls beneath the sticky group, underlying text remains visible and
is drawn through “A newer build is deployed,” making the release-provenance
warning unreadable. This reproduces with the build notice alone and with the
laboratory notice; all control rectangles remain separate and the buttons work,
so another rectangle-only regression will miss it.

Repair this whole sticky-layer readability/compositing class under canonical
plan section 42: reproduce it, write a focused regression, prove that
regression fails when the defect is reintroduced, fix the root cause, and run
the full relevant gate. Exercise Data and an ordinary route at multiple scroll
positions, build notice alone and both notices together. The warning and every
other sticky member must remain visually legible over arbitrary page content.
Do not prescribe success as “rectangles do not overlap”; that already passes.

Preserve every Round 4 pass: QA-07-002 through QA-07-009; the accepted Private
exclusion and unconfirmed-restore judgments; honest zero/ordinary/private
export metadata; phone clipboard from the first instruction; owner-clock
backup; Show mine receiving the touch at Restore; exact Private/unknown/
malformed backup round-trip; damaged-file refusal and retry; atomic apply;
first and reopened verification; all three unconfirmed reopen states; G-012;
Private selection safety; prompt/diagnostics completeness; and all disclosed
deferrals.

Deploy a repaired product checkpoint. After the live manifest contains it,
prove bundle equivalence, keep Phase 7 YELLOW, and write the complete Round 5
retest handoff for the SAME Codex QA conversation. Include exact verification,
unchanged deferrals, model, level, conversation and the D-092 launcher. Do not
make the owner ask for the retest prompt.
```
