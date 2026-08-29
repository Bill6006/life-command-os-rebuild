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

**Routing 84 remains YELLOW.** Independent QA Round 6 passed all seven D-173
product acceptance items and failed the standing D-187/D-193/D-194/D-195
guarantee. The repaired product checkpoint tested was `1324f66`; deployed
documentation head `875e40e` was proved bundle-equivalent. The builder has not
declared GREEN (D-077).

---

## What Round 6 proved

**QA-84-014 — Blocker:** the Round 5 repair catalogues what record describers
return but does not assert against copy a surface composes after a describer
returns.

QA made this one mutation in a disposable checkpoint worktree:

```diff
-text: described.text,
+text:
+  record.kind === 'action-unable-now'
+    ? `${described.text} The app will choose something better next time.`
+    : described.text,
```

The real Timeline output contained the unsupported promise on an ordinary
`action-unable-now` entry. A direct output probe passed 1/1. The repaired blocker
catalogue, Timeline and destination/discovery suites nevertheless passed
**118/118**.

This is the attack the Round 6 dispatch named: owner-visible blocker copy
composed in a surface from a local record after `describeRecord()` returns. The
describer inventory never sees it because `assembleTimeline()` accepts a
`Situation`, not a `CanonicalRecord`, and the catalogue evaluates the honest
describer output rather than final `TimelineEntry.text`.

The present product copy remains honest. Round 6's two genuinely fresh ephemeral
owner-use contexts passed CASE A and CASE B, and all seven acceptance items pass.
The complete evidence and reproduction are appended to
`docs/qa/PHASE_84_QA_HANDOFF.md`. Read it in full before editing.

---

## Required repair

Make D-195 true at the final owner-text boundary.

- Every owner-visible sink reached by blocker-path records must reject
  unapproved post-description composition, including Timeline, domain
  Recently/correction, export and siblings that join tags, origin labels,
  descriptions or local record fields.
- The mechanism must discover future sinks or make bypassing the guarantee
  structurally impossible. Do not replace the describer list with a manually
  maintained list containing only the four surfaces QA named.
- Reintroduce QA's exact `assembleTimeline()` mutation and prove the
  authoritative guard fails before browser or release gates.
- Check the class by putting an unsupported promise after the describer at more
  than one read boundary.
- Preserve the three existing catalogue halves and describer inventory where
  useful, but do not call them a final-owner-text guarantee until the value
  actually rendered or exported is what the guard evaluates.
- Do not close the finding with a phrase-only assertion or another surface-name
  array. Preserve the classifier as a secondary net and its documented
  entailment limit.

Preserve every Round 6 product PASS and explicit deferral: both fresh-store
cases; first-run abstention and ordinary routes; all eleven Life areas; the
byte-identical “More money” path and its unknowns; Health's
confirmation-to-recommendation agreement; complete partial Timeline rows;
truthful restorative silence; durable caregiving and withdrawal; course,
recurrence, correction and private behavior; all no-score protections;
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

Append the builder's repair record below Round 6 in the same QA report. Then
write a complete Round 7 retest prompt addressed to the **SAME Codex QA
conversation** at **High**. Round 7 must repeat CASE A and CASE B from new
ephemeral browser contexts, using ordinary product screens only and never opening
the QA laboratory.

Do not put the LCO completion marker in the QA handoff. For this handoff it
belongs only as the last meaningful line of this file. Do not ask the owner to
paste file contents.

---

## Copyable launcher

**Model:** Claude, Opus-class.

**Level:** Max.

**Conversation:** CURRENT — the original routing 84 builder conversation.

```text
Routing Phase 84 repair after independent QA Round 6 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full and execute the complete Round 6
repair handoff there exactly as written. Keep Phase 84 YELLOW; do not start
routing 90. Do not ask me to paste the file contents.
```

<!-- LCO_COMPLETE -->
