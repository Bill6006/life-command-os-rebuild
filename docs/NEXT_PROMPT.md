# Next prompt

Canonical plan section 43, and section 52 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 6 is GREEN.** Six rounds, closed on independent Codex QA PASS (Round
6). Full record in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 6 —
Timeline + Insights"; the nine standing semantic and storage invariants are
D-091; the QA protocol is D-090; the handoff-launcher rule is D-092, all in
[`DECISION_LOG.md`](DECISION_LOG.md).

**Phase 7 — AI exports + backup/restore (canonical plan section 52) is next.**
Nothing in this area is built: `MoreScreen.tsx` currently says so directly —
"Exports, backup and restore are not built yet." `documentJson()` already
exists on the memory context (`src/features/memory/memoryContext.ts`) and
round-trips a `StoreSnapshot` through `snapshotToJson`/`snapshotFromWire`; it
is the QA laboratory's load/save path today, and the phase's job is to give the
owner the same fidelity, deliberately, with a UI in front of it.

---

## NEXT ACTION

- **System:** **Claude**
- **Model:** Opus-class (Claude Opus 5, or the current strongest Claude coding
  model if renamed)
- **Intelligence level:** **High**
- **Conversation:** **NEW** — a phase boundary, not a continuation of the Phase
  6 repair conversation's context.
- **Why this model:** a full backup/restore has to be transactional and
  verified on a real phone (the phase's own gate), and the AI handoff prompt
  composer has to describe the app's own state honestly to an entirely
  different assistant reading it cold — both are cross-system reasoning tasks
  D-080 reserves Opus-class for.
- **Why this level:** High. The shape of the work is bounded by section 52, but
  correctness here is unusually unforgiving — a restore that silently loses or
  duplicates data is the worst possible failure mode for an app whose entire
  premise is being a trustworthy record of a life.
- **Why a new conversation:** Phase 6 is closed and its repair context (six
  rounds of laboratory-storage races) is not needed to reason about export
  composition or restore atomicity, and carrying it forward would waste
  context on an unrelated problem.
- **Attach/reference:** `src/features/memory/store.ts` (`CanonicalStore`,
  `replaceAll`), `src/memory/indexedDbStore.ts`, `src/memory/snapshot.ts`
  (`snapshotToJson`, `snapshotFromWire`), `src/features/memory/MemoryProvider.tsx`
  (D-091's storage-boundary reasoning — a restore is the same "whole visible
  context, published together" problem the last three rounds just closed), and
  `src/features/more/MoreScreen.tsx`.

---

## COPY/PASTE PROMPT

```text
Begin Phase 7 — AI exports + backup/restore. Repository:

D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/CANONICAL_REBUILD_PLAN.md section 52 in full, and
docs/PHASE_STATUS.md's Phase 6 entry for the storage-boundary reasoning you
will be extending rather than re-deriving. Do not ask the owner to paste
either file; you have the paths.

WHERE THIS PHASE STARTS

Nothing in this area is built. src/features/more/MoreScreen.tsx says so
directly. What already exists and is yours to build on:

- MemoryContextValue.documentJson() (src/features/memory/memoryContext.ts)
  round-trips the active store through snapshotToJson/snapshotFromWire. The QA
  laboratory already uses this path to load and inspect fixtures.
- CanonicalStore.replaceAll() (src/memory/store.ts,
  src/memory/indexedDbStore.ts) is the transactional whole-store write a
  restore needs — replaceAll already clears every object store and writes the
  new one inside a single IndexedDB transaction.
- The two-database owner/laboratory split and the D-091 projection rule in
  MemoryProvider.tsx are the reasoning to extend, not reinvent: a restore that
  publishes a snapshot without also publishing a coherent read of it (clock,
  zone, week start) is the exact defect class DEF-0057 and DEF-0058 just
  closed, one surface over.

WHAT SECTION 52 ASKS FOR

An AI export composer: section selection, select-all, clear, a remembered last
selection, Private/Sexual Health available for deliberate inclusion, an
embedded handoff prompt, a Copy Prompt action, current app/engine version,
current data range, current selected domains.

An AI handoff prompt with a fixed shape: source-of-truth instruction,
current-state review, main limiter, an app-tuning review when diagnostics are
included, what is working, what is drifting, what to change, what to
remove/simplify, what NOT to change, next practical actions, an uncertainty
rule, and a instruction to ask only necessary questions.

A full backup/restore: complete, transactional, verified, with rollback, and
tested on a real phone.

The gate: G-013 passes; the private section can be intentionally included;
export stays reliable on a phone; restore exactness is proven; Data/restore
stays accessible during degraded-state tests. Look up G-013's exact wording in
the plan rather than assuming it.

HOW TO PROCEED

Follow section 43's protocol. Where the plan is ambiguous or leaves a design
choice open, propose the choice and the reasoning rather than guessing
silently, and flag anything that needs the owner's explicit decision rather
than assuming it — this phase writes to the owner's only copy of his own data,
so an assumption that turns out wrong is not a cosmetic bug.

Build, verify with the full builder gate (unit, contract, synthetic, browser,
clean-checkout npm run verify, privacy scan, CI, a real Android-style pass
against the deployed Preview — restore in particular needs to be exercised on
the actual device class the gate targets, not only in Playwright), deploy, and
reach YELLOW — READY FOR INDEPENDENT QA. Do not self-certify (D-077): a
builder conversation may not mark its own phase GREEN.

End with D-092's model, level, conversation and a short copyable launcher
addressed to Codex for independent QA — cold-use first, per D-090's seven-step
order in qa/README.md — so the owner does not need another turn to obtain the
next prompt.
```

<!-- LCO_COMPLETE -->
