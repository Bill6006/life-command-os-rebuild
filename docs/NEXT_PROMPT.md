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

**Routing 84 remains YELLOW.** Independent QA Round 8 passed all seven D-173
product acceptance items and failed the standing D-187/D-193/D-194/D-195/D-196/
D-197 final-owner-text guarantee. The repaired product checkpoint tested was
9c4cb5f; deployed documentation head 9773a9a was proved bundle-equivalent. The
builder has not declared GREEN (D-077).

---

## What Round 8 proved

The current product behavior remains honest, including both genuinely fresh
CASE A and CASE B journeys. Three structural false-greens remain:

1. **QA-84-016:** copy keyed to Now's resumable state stays visible when the
   blocker question is dismissed, so the rendered delta subtracts it.
   “This needs special care.” passed 14/14 synthetic and 6/6 delta cases.
2. **QA-84-017:** export validates only the first line containing the
   describer's text. A separate blocker-derived bullet promising a better next
   suggestion passed 441/441 relevant tests. A missing matching line also
   continues silently per record.
3. **QA-84-018:** blockerHostsInSource sees only literal JSX tags named
   BlockerQuestion, BlockersPanel or ResumePanel. Importing BlockerQuestion as
   Surface and rendering Surface through a wrapper passed 14/14 blocker-copy
   tests and TypeScript without entering the inventory.

The exact mutations, evidence and full Round 8 report are appended to
docs/qa/PHASE_84_QA_HANDOFF.md. Read it in full before editing.

---

## Required repair

Reproduce all three exact mutations before changing the guards. Make every one
fail an authoritative pre-release guard.

- Close parent-composed blocker copy that remains after one surface is
  dismissed; do not equate a transition delta with the whole final screen.
- Close the whole blocker-derived export output, not only one line selected by
  described.text. Assert each expected record is reached and inspect every
  additional line it causes.
- Replace or honestly narrow the literal-tag host inventory. Ordinary aliases,
  wrappers, mapped components and createElement must not create untracked
  blocker hosts.
- Do not repair by adding mutation strings, Surface, wrapper names, tag aliases,
  import names, prop types or manual host names to lists.
- Preserve the exact catalogue halves, describer inventory and Timeline/domain
  identity checks where useful, but do not call them final owner-text coverage
  until all three values the owner receives are protected.

Preserve every Round 8 product PASS and explicit deferral: both fresh-store
cases; first-run abstention and ordinary routes; all eleven Life areas; the
byte-identical “More money” path and its unknowns; Health's
confirmation-to-recommendation agreement; complete partial Timeline rows;
truthful restorative silence; durable caregiving and withdrawal; course,
recurrence, correction and private behavior; all no-score protections;
Fatherhood's untouched growth model; and the absence of blocker enforcement.

Do not add strategy evaluation, pattern discovery, blocker enforcement,
semantic interpretation, new domain progression models, an owner-routines
library, historical backfill, a twelfth page, scoring, a new visual language or
an orchestrator change. Do not alter
docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md. Do not create a PHASE_85_* file.

---

## Verification and handoff

Run the clean aggregate gate, full browser suite at 360/430/1280, privacy scan,
block/copy sweeps and deployed Galaxy-class Android gate. Deploy the repaired
checkpoint and prove checkpoint equivalence if documentation moves the deployed
SHA.

Append the builder's repair record below Round 8 in the same QA report. Then
write a complete Round 9 retest prompt addressed to the **SAME Codex QA
conversation** at **High**. Round 9 must repeat CASE A and CASE B from new
ephemeral browser contexts, using ordinary product screens only and never
opening the QA laboratory.

For this owner handoff, the LCO completion marker belongs only as the last
meaningful line of docs/qa/PHASE_84_QA_HANDOFF.md. Do not add it to this file.
Do not ask the owner to paste file contents.

---

## Copyable launcher

**Model:** Claude, Opus-class.

**Reasoning level:** Max.

**Conversation:** CURRENT — the original routing 84 builder conversation.

```text
Routing Phase 84 repair after independent QA Round 8 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the complete Round 8
repair handoff there exactly as written. Keep Phase 84 YELLOW; do not start
routing 90. Do not ask me to paste the file contents.
```

---

## Done — 2026-08-29

This handoff was executed. QA-84-016, QA-84-017 and QA-84-018 are repaired at
**`9d7d186`**; QA's Round 8 is committed alone and unedited at `61870e7`, the
repair on top of it. All three of Round 8's exact mutations were reproduced
before the repair and are caught after it, and the aliased wrapper still passes
the synthetic suite 14/14 while failing on the screen.

**Routing 84 stays YELLOW.** The builder does not declare GREEN (D-077). The
next step is **Round 9**, dispatched at the end of
[`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md) to the **SAME** Codex
QA conversation at **High**. That file is the one to read.
