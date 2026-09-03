# Next dispatch — routing 92, Reach: what the brain can see

**Written by the Claude builder conversation that finished routing 91.**
Independent QA is **off** for this run by owner instruction, so this file
dispatches the next build phase and starts no QA round.

---

## Read this part first: what you are inheriting

**Routing 91 is BUILT / QA DEFERRED. It is not GREEN and it did not pass.**

Nine rounds of independent Codex QA read it. A tenth was written and dispatched
and has not run. The owner deferred it for this run — deferred, not skipped, not
waived, not passed. D-077 is unchanged: **only independent QA may pass a phase**,
and nothing about 91 has been approved by anything but its own mechanical gates.

Two consequences you have to hold on to while you build 92:

1. **Do not treat 91's behaviour as settled.** Its two instruments — the denial
   scope reader and the numeric role reader — were rebuilt as recently as Round 9
   (D-258) and no independent eye has seen that version. If something in 92 makes
   you doubt a reading 91 produces, the doubt is probably right. Say so in your
   record rather than building on top of it quietly.
2. **`docs/qa/PHASE_91_QA_HANDOFF.md` must survive unedited.** It ends with the
   complete Round 10 retest handoff and is the brief the deferred round starts
   from. Do not append to it, do not correct it, do not tidy it. If you need to
   record something about 91, put it in `PHASE_STATUS.md` or the decision log.

**What is actually true about 91**, so you are not guessing: every mechanical
gate it required passed at its checkpoint — `npm run verify`, 2,037 unit,
contract, synthetic and adversarial tests, the whole 360/430/1,280 browser
matrix at one worker, the privacy, copy and adaptation scans, checkpoint
equivalence, CI, release integrity and the Android-style deployed gate. What has
**not** happened is a person outside the builder conversation looking at it.

---

## The phase

**Routing 92 — Reach: what the brain can see.**

The scope is fixed by the plan and the adjudication and is not yours to widen:

- plan section 43A for the routing map — **92 is Reach**, and canonical Phase 10
  is routing **101**, not 92. `PHASE_STATUS.md` carried the pre-adjudication map
  until this run and has been corrected;
- `PRODUCT_ADJUDICATION_2.md` **§6.4** is the phase contract — builder scope, the
  ordinary-owner QA contract, the synthetic QA contract, the completion condition
  and the explicit _not in this phase_ list. Read it in full before you plan.

**Purpose, in one sentence.** Make what the product already holds reach a
decision, and add only the concepts a broken decision is verifiably waiting on.

### The order is part of the contract

**AUD-0040 goes first.** `assembleSituation` becomes registry-driven instead of a
hand-written list of nine reads. The audit is explicit that this goes first
because it is what makes every other row in the phase cheap. Doing it late means
doing everything else twice.

### One coupling to decide deliberately, not discover

`trajectoryCards` gates on `definition.tracked` (`insights.ts:1815`), not on
`standing` — the D-089 repair moved it there on purpose. So **giving any of
D-166's six emotional dimensions a `tracked` scale automatically produces a
trajectory card per dimension**, and the same applies to every Tier 2 concept
given a `tracked` scale.

That is not a violation — six separate cards is the opposite of a composite, and
is arguably the point of making the dimensions distinct — but it is a **new
owner-facing claim per dimension arriving as a side effect of a schema choice**.
Decide it explicitly, write the copy for it, and record the decision. The
adjudication says in as many words that it must not be a surprise found in QA.

### The two gates that define done

- **Ordinary-owner:** fresh store, two domains, across simulated days. An
  emotional reading on two of the six dimensions with the other four reading
  unknown on the domain page and **nowhere aggregating them**. A decision's fact
  list containing a concept that was previously inert — the same journey before
  and after must produce a **visibly different fact list**. A must-stay blocker
  on a walk, not re-offered while it stands and re-offered after _"Not true any
  more"_. A week advanced with the app **not asking more questions than on day
  one**. A movement routine other than a walk, suggested by physical health.
- **Synthetic:** the audit's own Reach gate. A **privacy guarantee** that is
  structurally impossible rather than conventional — no explanation or evidence
  panel can render a `private` reading — and a **no-added-noise check**: making
  dormant concepts live must not increase how often the app speaks, measured
  across the whole scenario library. Plus S1a's byte-identity replay under both
  horizon enums, D-064's four conditions proved unchanged, and every new concept
  either proved to reach a decision or **honestly declared non-decisional with a
  test behind the declaration**.

**Not in this phase:** no new conclusions from evidence (that is 93), no blocker
_enforcement_ (only the concept and the attribute that make it possible), no
domain progression models, no inference mechanism, no forecast, expectation or
revision.

---

## How to run it

**Model:** strongest current Claude Opus-equivalent.
**Intelligence level:** **Max.**
**Conversation:** **NEW** — routing 91's builder conversation is nine QA rounds
deep and its context belongs to a phase that is now closed to you.

```text
Build routing Phase 92 of the Life Command OS rebuild — Reach: what the brain
can see. Keep the Phase field exactly 92.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full, then PRODUCT_ADJUDICATION_2.md §6.4 as the
phase contract and plan section 43A for the routing map. Read
docs/PHASE_STATUS.md for what is GREEN and what is not.

Routing 91 is BUILT / QA DEFERRED. It is not GREEN and it has not passed
independent QA. Do not treat its readings as settled, and do not edit
docs/qa/PHASE_91_QA_HANDOFF.md for any reason — it is the brief a deferred QA
round will start from and must survive unedited.

Do AUD-0040 first: assembleSituation becomes registry-driven rather than a
hand-written list of nine reads. The audit is explicit that this ordering is
what makes the rest of the phase cheap.

Then the rest of §6.4's builder scope: AUD-0041, AUD-0011 with D-166's six
emotional dimensions and correction 3.15, AUD-0006, AUD-0012, AUD-0013,
AUD-0047 (suppress only, never rank), AUD-0045 with per-object size and demand
as its stated precondition, AUD-0050's retraction half, S1a's outcome horizon
with the migration rule and byte-identity replay, S2 Tier 1 and Tier 2 each
carrying privacy class, verifiable ask, a registry reader and a freshness
horizon, the five permission-blind sites consolidated, and owner-use findings
F12, F19 (reach half), F27, F30, F32 and F36.

Decide the trajectoryCards coupling deliberately: a tracked scale on any of the
six dimensions produces a trajectory card per dimension. Write the copy and
record the decision rather than letting QA find it.

Ship each new askable concept only with its consumer, per the owner-decision
sequence: loneliness via AUD-0013, overwhelm via the capacity limiter,
motivation and stress conditional, mood not askable here, confidence deferred
to 94. Tier 3 is deferred to routing 97.

Meet both gates in §6.4 — the ordinary-owner contract and the synthetic Reach
gate — and the completion condition: every Tier 1 and Tier 2 concept reaching a
decision or declared non-decisional with a test behind the declaration, and
question volume across the library not higher than before.

Nothing in this phase concludes anything new from evidence, enforces a blocker,
models domain progression, or forecasts. Those are 93 and later.

Write class tests and biting reintroduction proofs for the structural
properties, not fixtures that memorise phrases. Run npm run verify, one full
360/430/1280 browser matrix at one worker on a clean port, the privacy, copy and
adaptation scans, the Android-style deployed gate, checkpoint equivalence, CI
and release integrity from that CI run's own manifest. Commit, push, deploy and
prove the deployed checkpoint is what Preview serves.

Update docs/DECISION_LOG.md, docs/DEFECT_LEDGER.md and docs/PHASE_STATUS.md, and
write docs/qa/PHASE_92_QA_HANDOFF.md as the brief for independent QA.

You may not approve your own phase (D-077). Reach YELLOW — READY FOR
INDEPENDENT QA and stop there. Do not mark anything GREEN, and do not start a
QA round yourself.
```

### Short launcher

**Model:** strongest current Claude Opus-equivalent. **Intelligence level:** Max.
**Conversation:** NEW.

```text
Build routing Phase 92 of the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the routing 92 dispatch at the end
exactly as written. Keep the Phase field exactly 92, leave
docs/qa/PHASE_91_QA_HANDOFF.md unedited, reach YELLOW rather than GREEN, and do
not ask me to paste the file contents.
```

---

## Two debts this dispatch is carrying, so they are not lost

**Routing 91's independent QA.** Round 10's brief is written and waiting in
`docs/qa/PHASE_91_QA_HANDOFF.md`. It has not run. Whenever the owner turns
independent QA back on, that round is the first thing owed — before 91 can be
called anything other than built.

**The nineteen D-210 instrument-hardening findings.** Still open, still
untouched, backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`, and not part
of routing 92's scope. They have now been deferred across five phases; that is
worth the owner knowing rather than discovering.

<!-- LCO_COMPLETE -->
