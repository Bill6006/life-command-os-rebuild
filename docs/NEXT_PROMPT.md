# Next prompt

**Phase:** 83 — **product adjudication, before any further build phase**

Canonical plan section 43 for the workflow, section 58 for the report format.
Independent QA is Codex (D-090); Claude builds. Every handoff ends with the
model, the level, the conversation and a short copyable launcher (D-092).

---

## HELD — do not dispatch this without the owner saying so

**Phase 82 is GREEN**, closed by independent QA on 2026-08-27 at product
checkpoint `5dd55cc`. The campaign **pauses here on the owner's instruction**,
and this file is written so the next step is ready rather than so it starts.

This file deliberately **carries no completion marker of its own**. The single
marker for the completed Phase 82 run is the last line of
[`qa/PHASE_82_QA_HANDOFF.md`](qa/PHASE_82_QA_HANDOFF.md), where the completion
contract expects it — and it belongs in exactly one file at a time.

**Why the pause is not optional.** `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` — an
independent Codex review of the whole app from the owner's side — landed in the
middle of Phase 82 and has been deliberately left unread by both conversations
for all twelve rounds. It may change what the next build phase should be.
Designing that phase first would design it against a product picture nobody has
reconciled.

---

## What this round is

A **product adjudication**, not a build. It reconciles six documents that have
been growing separately and now disagree in places nobody has written down:

| Input                                   | What it brings                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md` | the independent owner-use review — **read this first, it is the new information** |
| `docs/WHOLE_APP_INTELLIGENCE_AUDIT.md`  | the audit the last three phases were scoped from                                  |
| `docs/CANONICAL_REBUILD_PLAN.md`        | v1.2, the plan of record                                                          |
| `docs/DECISION_LOG.md`                  | D-001 through D-157                                                               |
| `docs/PHASE_STATUS.md`                  | every phase's gate and result                                                     |
| Phases 81 and 82 as completed           | what actually got built, and what the twelve QA rounds proved about it            |

**Its output is a decision, not a diff.** What the next build phase is, what it
contains, what it explicitly does not, and which findings from the owner-use
review are in scope, deferred, or refused — each with the reason.

## The constraint any new phase must be told

**Routing phase integers are read as bare integers, and only the numerically
highest phase's QA report is kept.** `handoff_source.build_candidates()` keeps
`max(qa_phase(r) for r in reports)` and discards every lower phase as history;
`_stated_or_inferred_phase()` parses the `**Phase:**` field as a bare integer, so
decimals truncate.

Measured against the real module with phases 5, 6, 7, 8, 81 and 82 on disk:

| `**Phase:**` value | parses to | routes? |
| ------------------ | --------- | ------- |
| `9`                | 9         | **no**  |
| `09`               | 9         | **no**  |
| `8.3`              | 8         | **no**  |
| `9.1`              | 9         | **no**  |
| `83`               | 83        | yes     |

So **every phase created after Phase 82 must carry a routing integer strictly
greater than 82**, and the visual/mobile phase everyone calls "Phase 9" must
route as **90** — never 9. A `PHASE_09_QA_HANDOFF.md` would be silently ignored:
its QA report would never route, and the builder → QA → repair → retest lifecycle
would never start, with nothing warning anyone. The canonical document name and
the routing integer may diverge; the `**Phase:**` field carries the routing
integer.

## What must not happen in this round

- **No product code changes.** This round decides; it does not build.
- **Phase 82 stays GREEN.** Nothing here reopens it, and nothing reopens Phases
  1 to 81 either.
- **No new phase is started.** The adjudication ends with the next phase
  _specified_, and the owner decides when it begins.
- **The twelve QA rounds are evidence, not drafts.** The Round 1–12 reports in
  `qa/PHASE_82_QA_HANDOFF.md` are the independent record and are not edited.

---

## Handoff — product adjudication

**Model:** Claude Opus-class.

**Intelligence level:** Max. This round reads six documents against each other
and its output constrains everything after it.

**Conversation:** a **new** conversation. This one is the Phase 82 builder and
has twelve rounds of repair context that would bias what it reads.

```text
Adjudicate the Life Command OS product picture before the next build phase.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Phase 82 is GREEN, closed by independent QA at product checkpoint 5dd55cc after
twelve rounds. The campaign paused here deliberately: an independent owner-use
review landed mid-phase and was left unread so it could not bias the repairs.

Read, in this order, in full:
1. docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md  — the new information
2. docs/WHOLE_APP_INTELLIGENCE_AUDIT.md
3. docs/CANONICAL_REBUILD_PLAN.md
4. docs/DECISION_LOG.md
5. docs/PHASE_STATUS.md
6. docs/qa/PHASE_82_QA_HANDOFF.md — twelve rounds of independent QA

Produce a written adjudication that answers, with a reason for each:

- Which owner-use review findings are real, and which are already answered by
  something the audit, the plan or a decision already says.
- Where the owner-use review and the intelligence audit disagree about what the
  product should be, and which one wins.
- What the next build phase is: its number, its scope, its membership test, and
  what it explicitly excludes.
- Which findings are deferred, and to what — and which are refused, and why.
- Whether anything in the canonical plan needs amending, and whether any decision
  in D-001..D-157 is now wrong rather than merely superseded.

Constraints:
- Do not change product code. This round decides; it does not build.
- Do not reopen Phase 82 or any earlier phase.
- Do not start the next phase. End with it specified and hand back.
- Every phase you create must carry a routing integer STRICTLY GREATER THAN 82.
  The phase called "Phase 9" must route as 90. A `**Phase:**` value of 9, 09,
  8.3 or 9.1 parses to something at or below 82 and would silently never route —
  its QA report would be discarded as history and the lifecycle would never
  start. The document name and the routing integer may differ; the `**Phase:**`
  field carries the routing integer.

Write the adjudication to docs/PRODUCT_ADJUDICATION.md, update the canonical plan
and decision log only where the adjudication concludes they are wrong, and end
with the complete handoff for the phase you specify plus a short launcher.

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Claude Opus-class. **Level:** Max.
**Conversation:** a **new** conversation, not the Phase 82 builder.

```text
Adjudicate the Life Command OS product picture before the next build phase.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Phase 82 is GREEN. Read docs/NEXT_PROMPT.md in full and run the product
adjudication exactly as the handoff there specifies — starting with
docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md, which has deliberately never been read.
Decide what the next phase is; do not build it, and do not start it.

Any phase you create must route as an integer strictly greater than 82 — "Phase
9" routes as 90.

Do not ask me to paste file contents.
```
