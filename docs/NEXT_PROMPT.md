# Next prompt

Canonical plan section 43. The intelligence level sits outside the prompt so the
owner can switch Claude Code before pasting.

---

## NEXT CLAUDE ACTION

- **Intelligence level:** `Max`
- **Conversation:** `NEW`
- **Why this level:** Phase 1 fixes the meaning of every record, entity and time
  boundary the rest of the system will be built on, and getting it wrong forces
  the ground-up rewrite this plan exists to prevent.
- **Why this conversation:** Phase 1 is a large from-scratch build that deserves
  a full fresh context window, and nothing is lost — the canonical plan,
  decision log and phase status are all in the repository.
- **Attach/reference:** Nothing. The repository is self-contained; the prompt
  points at the files to read. Do not attach or request any old Life Command OS
  document.

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 0 is complete and owner-approved. Begin Phase 1.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)

Read these first, in this order:
1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority, read it completely
2. docs/PHASE_STATUS.md — what Phase 0 delivered
3. docs/DECISION_LOG.md — decisions D-001 to D-010 and their reasons
4. docs/ARCHITECTURE_BOUNDARIES.md — module ownership

HARD RULES

- The canonical plan is the sole governing authority. Authority order: explicit current owner decisions, then the plan, then owner-approved amendments, then docs/DECISION_LOG.md, then verified implementation in this repository.
- The old planning and archive documents are intentionally excluded. Do not ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect, modify, repoint or mine it. It is not a requirements source.
- No real owner data enters this repository. Fixtures are synthetic only. scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- If something conflicts with the plan or is genuinely ambiguous, stop and ask the owner rather than guessing.

PHASE 1 GOAL (plan section 46)

Build the meaning layer before the product shell expands.

BUILD

- versioned canonical record schemas
- semantic entity model
- explicit / inferred / unknown distinction — unknown must stay unknown, never a false zero, average or default
- corrections and supersession, append-first, with stable IDs and provenance
- owner-local time semantics: real instant, owner-local date, owner-local time, local day identifier, local week identifier, observation window, due window, freshness window are all distinct concepts and a week identifier is never an instant
- privacy metadata (at minimum: normal, sensitive, private, child/family-sensitive)
- IndexedDB or equivalent transactional storage; localStorage must not be the authoritative lifetime history store
- a derived projection mechanism where every derived value is rebuildable from canonical records, so a corrupted cache cannot corrupt lifetime history
- synthetic JSON loader and editor
- date/time travel
- QA inspector exposing canonical facts, inferred facts, stale facts, entities, relationships and malformed rows
- the initial golden scenarios listed below

Record meanings to distinguish are listed in plan section 13.2. Semantic entities are listed in section 13.3.

SPECIAL ACCEPTANCE (plan section 46)

The semantic model must retain the exact learning topic, the exact goal, the exact person or relationship, and the exact recommendation subject. A recommendation must carry structured semantic references — subject entity, domain, action target, why-now context, related goal, evidence references — so the display sentence is derived from structured meaning rather than the UI guessing a subject from free text. If a record is about subnetting, the subject stays subnetting.

GATE — Phase 1 is not GREEN until all of these hold

- G-001 (no orphan pronoun), G-002 (durable family context), G-009 (unknown is unknown) and G-011 (timezone and week boundary across multiple timezones and DST) pass as automated synthetic scenarios
- malformed synthetic inputs are inspectable rather than fatal, and one malformed record cannot blank a surface
- canonical data round-trips without loss
- no full UI dependency — the meaning layer is testable without the app shell
- preview deploys automatically and the deployed Preview SHA equals the checkpoint SHA
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build
- npm run verify passes from a clean checkout

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes the gate redeploys Preview automatically, so tell the owner when a new phone-testable checkpoint is available.
- Put pure meaning in src/domain/, storage and projections in src/memory/, QA surfaces in src/features/qa/. Keep the intelligence kernel out of Phase 1 — it is Phase 2.
- Write tests that verify semantic behaviour, not implementation paths.
- Follow plan section 42 for any defect: reproduce, identify the whole defect class, write a focused regression, prove it fails when reintroduced, fix the root cause, rerun the gate.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and docs/NEXT_PROMPT.md current.

CLOSING THE PHASE

End with the section 58 acceptance report: phase status, checkpoint SHA, deployed Preview SHA and whether they match, Preview URL, files changed, exact test counts, whether an owner phone test is required, product and semantic behaviour changes, open defects, deferred items, decisions made, next phase and role, the recommended Claude Code intelligence level, the CURRENT or NEW conversation instruction, one short reason for each, required references, and the complete next copy/paste prompt — all in the same response that closes the phase. Do not make the owner ask for the prompt.
```
