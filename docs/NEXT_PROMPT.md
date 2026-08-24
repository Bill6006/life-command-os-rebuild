# Next prompt

Canonical plan section 43, and section 53 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 7 is GREEN.** Five rounds, closed on independent Codex QA PASS (Round
5). Full record in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 7 — AI
exports + backup/restore"; the QA report is
[`qa/PHASE_07_QA_HANDOFF.md`](qa/PHASE_07_QA_HANDOFF.md).

|                                           |                                              |
| ----------------------------------------- | -------------------------------------------- |
| Approved product checkpoint               | `e9979ef`                                    |
| Closing / deployed SHA                    | `b151ec8`, bundle-equivalent, confirmed live |
| Unit / contract / synthetic / adversarial | 1059 / 1059, 52 files                        |
| Browser                                   | 405 / 405 — 135 tests × 360, 430, 1280px     |
| Independent QA                            | PASS, Codex Round 5                          |

Phase 7 added four standing decisions: **D-097** (with its amendment) on how a
checkpoint is named and when; **D-098** on an artefact stating its identity in
its first line and an exclusion covering metadata as well as detail; **D-099**
on a restore's confirmation being part of its result; **D-100** on a sticky
layer owning its own opacity, and legibility being proved with pixels.

**Phase 8 — Legacy migration (canonical plan section 53) is next.**

---

## NEXT ACTION

- **System:** **Claude**
- **Model:** Opus-class (Claude Opus 5, or the current strongest Claude coding
  model if renamed)
- **Intelligence level:** **Max**
- **Conversation:** **NEW** — a phase boundary, and Phase 7's five QA rounds
  are not context Phase 8 needs.
- **Why this model and level:** this is the phase D-080 reserves Opus-class for,
  and the one place in the whole rebuild where **Max** rather than High is the
  honest call. It is not a bounded build against a written spec: it is a
  semantic mapping between two data models designed years apart, where the
  interesting decisions are all judgement about meaning — which legacy concept
  is genuinely the same thing as a canonical one, which merely looks like it,
  and which must be preserved verbatim rather than mapped at all. Section 30's
  own warning is the reason: _do not contort the new architecture to make legacy
  mapping easier_. Getting that wrong is not a bug that shows up in a test; it
  is a life's history quietly re-interpreted.
- **Why a new conversation:** Phase 7 is closed, and its context is five rounds
  of export composition, restore atomicity and checkpoint provenance. None of
  it helps with legacy mapping, and carrying it forward would spend the window
  that mapping needs.
- **Attach/reference:** `docs/CANONICAL_REBUILD_PLAN.md` sections 30 and 53,
  section 59's legacy exclusions, `src/domain/records.ts`
  (`ImportedLegacyRecord`), `tests/contract/legacy-quarantine.test.ts`,
  `src/memory/restore.ts` (the apply/verify/rollback shape Phase 7 already
  built), and the legacy tree named in the prompt.

---

## COPY/PASTE PROMPT

```text
Begin Phase 8 — Legacy migration. Repository:

D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/CANONICAL_REBUILD_PLAN.md sections 30 and 53 in full, and section 59
(explicit legacy exclusions). Read docs/PHASE_STATUS.md's Phase 7 entry for the
apply/verify/rollback reasoning you will be extending rather than re-deriving.
Do not ask the owner to paste any of it; you have the paths.

THE LEGACY TREE, AND THE ONE RULE ABOUT IT

The previous generation of this app lives at:

  D:\Code\AI Coding Agents\Codax\Life App

It is at HEAD 45091d0 with one untracked doc. **Owner decision D-001 protects
it absolutely: it is legacy/reference only and must never be modified,
reinitialized, force-pushed, repointed or overwritten.** Read from it. Write
nothing to it, run nothing in it that writes, and do not run its build or its
tests. If you need to execute anything against it, copy what you need into the
rebuild's own scratch space first.

It holds work that exists nowhere else. Treat every file in it as evidence.

WHAT IS ALREADY THERE, ON BOTH SIDES

In the rebuild:

- `imported-legacy-record` already exists as a canonical record kind
  (src/domain/records.ts) carrying `legacyFormat` and a verbatim `raw` payload.
- tests/contract/legacy-quarantine.test.ts already proves the hard part of
  section 30's last rule: a legacy record whose payload is a perfectly good
  observation does not become an answer. Preserved, visible, inert. That test
  is the floor you build on, not something to revisit.
- src/memory/restore.ts is the transactional apply/verify/rollback Phase 7
  built, with its stages and its no-false-success outcome type. Section 30's
  "snapshot, atomic apply, verify, rollback" is the same shape, and it should
  be the same code where it honestly can be.
- src/memory/backup.ts's structural validation and content fingerprint are
  reusable for the same reasons.

In the legacy tree, worth reading before you design anything:

- src/importers/legacy/ — detect, inventory, mapping, plan, apply, report,
  traverse. The previous generation's own importer for the generation before
  it. It is prior art for exactly this problem and its shape maps onto section
  30's list almost line for line. Read it for what it learned, not to copy it.
- src/infrastructure/backup/portableBackup.ts — the legacy portable backup.
  **It is encrypted**: plaintext envelope, ciphertext payload, passphrase-
  derived key (src/infrastructure/crypto/backupCrypto.ts). This is a real
  constraint on Phase 8 and you should establish early what it means — whether
  import goes through that file and therefore needs the owner's passphrase and
  a compatible crypto implementation, or through some plaintext path, and
  whether that choice is the owner's to make.
- src/application/queries/aiExport.ts — the legacy AI export.
- src/domain/records/ — the legacy canonical record model. This is the thing
  you are mapping from.

WHAT SECTION 53 ASKS FOR

A legacy detector; a quarantined parser; a mapping inventory; explicit semantic
mappings; raw preservation for uncertain fields; preview and dry run; a
snapshot; atomic apply; verify; rollback; idempotency; duplicate detection;
provenance.

The gate: legacy import does not change the recommendation engine
architecture; ambiguous mappings remain explicit; imported raw legacy records
cannot silently drive decisions; current app behaviour remains correct with no
legacy data present.

WHERE THE JUDGEMENT IS, AND WHERE IT IS NOT

The mechanical half — detect, quarantine, preview, apply atomically, verify,
roll back, do not duplicate — is bounded, and Phase 7 already built most of its
machinery.

The half that needs Max is the mapping. Section 30's critical rule is the whole
phase in one sentence: **do not contort the new architecture to make legacy
mapping easier.** A legacy concept that does not map cleanly is preserved as
archive data, not forced into a canonical shape that nearly fits. Three
specific traps, all of them section 59's:

- The old 0/1/2 life score, the old bottleneck taxonomy, the old move
  catalogue, the old streaks and the old domain maturity UI do NOT return.
  Legacy rows carrying them are archive, not concepts.
- A legacy field whose meaning you are unsure of is preserved verbatim and
  mapped to nothing. Uncertain is a state; guessing is a defect.
- D-091's invariants govern anything imported the moment it becomes visible.
  An imported reading that reaches a surface is a claim, and it has to carry
  the same evidence and provenance discipline as one the owner entered today.

Propose the mapping decisions and the reasoning rather than guessing silently,
and flag anything that needs the owner's explicit decision. This phase writes
to the owner's only copy of his own history, so an assumption that turns out
wrong is not a cosmetic bug — and unlike Phase 7's restore, the thing being
written is a *re-interpretation* of records rather than a copy of them.

CHECKPOINT AND HANDOFF DISCIPLINE — read these before your first commit

Phase 7 lost two of its five QA rounds to this and both are now written down:

- D-097: a handoff names the product checkpoint and separately reports the
  live deployed SHA. It never asserts the two are the same string, because
  every push after a checkpoint — including the push of the handoff itself —
  moves the deployed SHA forward by design.
- D-097's amendment: a checkpoint is named only AFTER its deploy has landed,
  confirmed by reading the live manifest — not by observing that the CI
  workflow succeeded, because GitHub's own pages-build-deployment runs after
  the workflow that publishes.
- `node scripts/checkpoint-equivalence.mjs <checkpoint> --deployed <build-info-url>`
  does both checks in one command. If the fetch hits a certificate-chain error
  in your Node runtime, `--ref <full-sha>` with a SHA you read yourself is the
  supported fallback.

HOW TO PROCEED

Follow section 43's protocol. Build, verify with the full builder gate (unit,
contract, synthetic, adversarial, browser, clean-checkout npm run verify,
privacy scan, CI, and a real Android-style pass against the deployed Preview
via scripts/android-gate.mjs), deploy, confirm the live SHA, and reach
YELLOW — READY FOR INDEPENDENT QA. Do not self-certify (D-077).

Two things Phase 7 learned the hard way and you should not have to learn again:

- `npx playwright test` serves a PREBUILT dist and never builds. Use
  `npm run test:browser` when a source change needs testing — a reintroduction
  checked with a bare playwright run tests the previous bytes and passes.
- A sweep that cannot fire on the thing it was written for reads as evidence
  either way. Phase 7 shipped three of them and found all three only by
  reintroducing the defect and watching the test not fail. Prove every
  regression by reintroduction, and when one passes, ask whether it *could*
  have failed.

End with D-092's model, level, conversation and a short copyable launcher
addressed to Codex for independent QA — cold-use first, per D-090's seven-step
order in qa/README.md — so the owner does not need another turn to obtain the
next prompt.
```
