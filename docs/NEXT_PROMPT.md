# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Claude / builder.
**Conversation:** **CURRENT** — the original routing 84 Claude builder
conversation. Do not create a new conversation.
**Model:** Claude, Opus-class.
**Reasoning level:** **Max.**

Canonical plan section 42 governs the repair workflow. Section 43A and D-159
govern routing. Keep the Phase field exactly **84**: a QA round does not create
Phase 85.

**Routing 84 remains YELLOW.** Independent QA Round 5 passed all seven D-173
product acceptance items and failed the standing D-187/D-193/D-194 guarantee.
The repaired product checkpoint tested was `f45214b`; the deployed documentation
head `23ce35f` was proved bundle-equivalent. The builder has not declared GREEN
(D-077).

---

## What Round 5 proved

**QA-84-013 — Blocker:** the shared `action-unable-now` description in
`src/features/history/describe.ts` is an owner-facing blocker rendering boundary
outside every blocker-promise guard.

QA changed only its lifecycle frame in a disposable worktree:

```diff
-'action-unable-now': 'Did not fit at the time',
+'action-unable-now': 'The app will choose something better next time',
```

The real description then rendered the unsupported promise on an ordinary
Timeline record, while the blocker catalogue, destination/discovery, Timeline,
export-honesty and G013 export suites all passed: **431/431**. The same shared
description is consumed by Timeline, domain Recently/correction and export.

The Round 4 repair structurally enumerates React function components that
directly accept `StandingBlocker`, `BlockerDecision` or `ResumableMove`, then
renders `BlockersPanel`, `BlockerQuestion` and `ResumePanel`. A record describer
takes none of those types, so it is invisible to both the enumeration and the
catalogue. The live copy remains honest; the guarantee is incomplete.

Round 5's full evidence is appended to
`docs/qa/PHASE_84_QA_HANDOFF.md`. Read it in full before editing.

---

## Required repair

Close D-187 structurally over every owner-visible renderer of an
`action-unable-now`, not only React panels that directly accept one of the three
blocker types.

- Bring the shared history description and every Timeline, domain
  Recently/correction and export route that consumes it under the same deliberate
  semantic guarantee, or an equivalent structural guarantee with no weaker
  coverage.
- Make the enumeration discover future record-rendering boundaries. Do not
  replace one hand-maintained list with another list containing only the four
  surfaces QA named.
- Reintroduce the exact unsupported lifecycle-frame promise above and prove the
  authoritative guard fails before browser or release gates. Prove the honest
  present frame passes.
- Keep bidirectional catalogue reachability where it is meaningful. Do not close
  the finding with a phrase assertion or merely append the current history
  sentence to a manually assembled array.
- Preserve the shared classifier as a secondary net. Its documented entailment
  limit is not this finding and must not be overstated.

Preserve every Round 5 product PASS and explicit deferral: first-run abstention
and ordinary routes; all eleven empty Life areas and domain controls; the
byte-identical “More money” path and its unknowns; Health's
confirmation-to-recommendation agreement; complete partial Timeline rows;
truthful restorative silence; the durable caregiving fact and withdrawal route;
course, recurrence, correction and private behavior; all no-score protections;
Fatherhood's untouched growth model; and the absence of blocker enforcement.

Do not add strategy evaluation, pattern discovery, blocker enforcement, semantic
interpretation, new domain progression models, an owner-routines library,
historical backfill, a twelfth page, scoring, a new visual language or an
orchestrator change. Do not alter
`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md`. Do not create a `PHASE_85_*` file.

---

## Verification and handoff

Run the clean aggregate gate, full browser suite at 360/430/1280, privacy scan,
block/copy sweeps and deployed Galaxy-class Android gate. Deploy the repaired
checkpoint and prove checkpoint equivalence if documentation moves the deployed
SHA.

Append the builder's repair record below Round 5 in the same QA report. Then
write a complete Round 6 retest prompt addressed to the **SAME Codex QA
conversation** at **High**. Round 6 still owes CASE A (“More money”) and CASE B
(caregiving blocker) from a sanctioned, genuinely fresh ordinary browser store:
do not call a retained store fresh and do not use the QA laboratory.

Do not put the LCO completion marker in the QA handoff. For this handoff it
belongs only as the last meaningful line of this file. Do not ask the owner to
paste file contents.

---

## Copyable launcher

**Model:** Claude, Opus-class.

**Level:** Max.

**Conversation:** CURRENT — the original routing 84 builder conversation.

```text
Routing Phase 84 repair after independent QA Round 5 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the complete Round 5
repair handoff there exactly as written. Keep Phase 84 YELLOW; do not start
routing 90. Do not ask me to paste the file contents.
```

<!-- LCO_COMPLETE -->
