# Second-adjudication capability matrix

**Status: decision surface only. Nothing adjudicated, nothing approved, nothing
scheduled.** This document maps what the owner's product vision implies against
what the repository actually contains. It deliberately stops short of deciding
anything.

**Routing: none.** This file is invisible to the orchestrator, which routes only on
`docs/NEXT_PROMPT.md` and `docs/qa/PHASE_<digits>_QA_HANDOFF.md`
(`handoff_source.py:21-22`). It carries **no completion marker** and must never be
given one.

**Provenance.** Produced during routing 84's QA loop and persisted after routing 84
went GREEN (bounded retest, 2026-08-30, D-210). Its code citations were verified by
direct read at that time, against a tree in the `3dbfc9b`–`d78b765` range.

> **The adjudication that consumes this must verify rather than inherit.** Routing
> 84 continued for nineteen rounds after most of these citations were taken, and
> several files named here were touched. A status, dependency, size or risk that is
> wrong should be corrected and the corrected version adjudicated. An error that
> survives into the roadmap is worse than one caught at the door.

---

## 1 · Summary matrix

**Structural layers.** These are not features; almost everything below depends on
one of them.

| #      | Structural addition                    | Status                       | Size       | Likely owner           | Risk flag                                |
| ------ | -------------------------------------- | ---------------------------- | ---------- | ---------------------- | ---------------------------------------- |
| **S1** | Broader temporal / history horizons    | **ABSENT**                   | structural | new prerequisite layer | Silent invalidation of existing learning |
| **S2** | Wider owner / state / event vocabulary | **ABSENT**                   | structural | new layer + Reach      | Input burden; folk-causal confirmation   |
| **S3** | Forecasting / trajectory intelligence  | **ABSENT** (deferred by §22) | structural | new routing phase      | Confidently wrong about the owner's life |

**Capabilities.**

| #   | Capability                               | Status                           | Size                     | Likely owner       | Risk flag                       |
| --- | ---------------------------------------- | -------------------------------- | ------------------------ | ------------------ | ------------------------------- |
| C1  | Semantic capture & clarification         | PLANNED                          | substantial              | 91 pkg 1           | Silent misinterpretation        |
| C2  | Open-space longitudinal inference        | DEFERRED (D-172 open)            | structural               | 91 / new           | Manufactured pattern            |
| C3  | Combinations, sequences, lagged effects  | ABSENT                           | structural               | needs S1           | False discovery at scale        |
| C4  | All-domain understanding & progression   | PARTIAL (3 of 12)                | substantial              | 91 + content       | Nine thin domains               |
| C5  | Emotional / state modeling               | **APPROVED-BUT-UNBUILT** (D-166) | substantial              | Reach              | Wellness-score drift            |
| C6  | Learning progress, retention, transfer   | ABSENT                           | substantial              | 91 / new           | Second self-report              |
| C7  | Nutrition, food, caffeine, hydration     | ABSENT                           | structural               | needs S2           | Burden; spurious confirmation   |
| C8  | Sleep & recovery over long horizons      | PARTIAL                          | substantial              | needs S1           | —                               |
| C9  | Same-day → monthly+ effects              | **ABSENT** _(= S1)_              | structural               | prerequisite layer | Invalidation                    |
| C10 | Forecasts / predictions                  | ABSENT (deferred)                | structural               | new phase          | Self-fulfilling steer           |
| C11 | Intervention / steering on forecast      | ABSENT                           | substantial              | after S3           | Acting on a wrong future        |
| C12 | Explaining the intervention              | ABSENT                           | contained _(after S3)_   | with C11           | Persuasive but unfounded        |
| C13 | Sustainable **and increasing**           | ABSENT                           | substantial              | needs S1+S3        | Optimizing a proxy              |
| C14 | Confidence calibration low→very high     | PARTIAL                          | substantial              | 91 / Validity      | Bands read as probability       |
| C15 | **Research-grounded priors**             | ABSENT                           | substantial              | own decision       | **§68 blur — highest risk row** |
| C16 | Fatherhood capability support            | PARTIAL                          | substantial              | Validity (F24)     | Child instrumentation           |
| C17 | Social / charisma / romantic progression | PARTIAL                          | substantial              | Validity + D-168   | Person-ranking                  |
| C18 | Peak-performance state / score           | **DEFERRED, not prohibited**     | substantial              | needs S3           | Number replaces judgement       |
| C19 | Child progress-measurement semantics     | **PROHIBITED**                   | contained _(to reverse)_ | owner decision     | The audit's worst finding       |
| C20 | Recommendation diversity                 | APPROVED-BUT-UNBUILT             | substantial              | Reach (AUD-0045)   | —                               |
| C21 | Blocker enforcement / adaptation         | PARTIAL (capture only)           | substantial              | Validity (F08)     | Promise the engine can't keep   |
| C22 | Existing Reach/Validity at risk          | 20 AUD findings                  | —                        | Reach + Validity   | **Silent scope loss**           |

---

## 2 · Detail

### S1 · Broader temporal / history horizons — ABSENT · structural

**Evidence:** `OutcomeTiming.when = 'same-block' | 'next-morning'` (`moves.ts:45-46`).
Two values, total. The original audit confirmed _"no third horizon exists"_ and no
phase was ever assigned.
**Plan relation:** in no phase. Not in Reach, not in Validity, not in D-172.
**Depends on:** nothing. **It is the prerequisite** for C3, C7, C8, C9, C10, C13.
**Build:** a horizon vocabulary (same-block / next-morning / multi-day / weekly /
monthly / seasonal), outcome records that carry one, and every learning consumer
taught to read it.
**Owner QA:** log something Monday; on Friday the app can express a relationship
spanning that gap.
**Synthetic QA:** long histories where the same evidence yields different
conclusions per horizon; existing next-morning derivations unchanged (D-064's four
conditions must survive).
**Decision:** new. No existing decision blocks it.
**RISK:** widening the horizon can silently invalidate conclusions the engine
already drew at the narrow one. Migration semantics needed, not just a new enum.
**Sequencing:** **first.** Nothing temporal is buildable before it.

### S2 · Wider owner / state / event vocabulary — ABSENT · structural

**Evidence:** 16 concepts (`concepts.ts:230-253`). None for food, carbs, caffeine,
alcohol, hydration, weather, outdoors, screen time, work stress, who-you-were-with,
or where-you-are-now.
**Plan relation:** `PRODUCT_ADJUDICATION.md` §12 item 3 predicted exactly this.
D-172 refuses to leave it as a permanent ceiling but does not schedule widening it.
**Depends on:** Reach (AUD-0040/0041) to make new concepts decisional rather than inert.
**Build:** new concepts + capture surfaces + registry reach + privacy classes for each.
**Owner QA:** enter a new kind of fact through a normal screen; it appears in a
decision's fact list.
**Synthetic QA:** each new concept reaches a decision; unknown states stay unknown;
no increase in how often the app speaks.
**Decision:** new — §4.5 low-burden versus decision value, per concept.
**RISK:** **every new concept is a tap the owner must pay for.** The observe-first
constraint means the app learns nothing automatically, so vocabulary width converts
directly into daily burden. This is the row where scope discipline matters most.
**Sequencing:** with or after S1; Reach is its precondition.

### S3 · Forecasting / trajectory intelligence — ABSENT · structural

**Evidence:** zero `forecast` / `predict` / `projection` anywhere in
`src/intelligence/`. The `trajectory` insight is backward-only and refuses a rate
(`insights.ts:1890-1915`). `moves.ts` "expected value" is a static move profile, not
a claim about the owner's future.
**Plan relation:** §22 — _"a score or forecast may be added later only if it clearly
improves decisions."_ **Deferred with a bar, not prohibited.**
**Depends on:** S1 absolutely; S2 for anything multi-factor.
**Build:** a forecast object (what, horizon, confidence, what would change it — §22
names all four), plus a way to be wrong and notice.
**Owner QA:** a forecast is made, the day happens, the app reconciles what it said
against what occurred.
**Synthetic QA:** calibration over long histories — when it says 70%, is it right
about 70% of the time?
**Decision:** §22's bar must be cleared explicitly.
**RISK:** **the highest-consequence row in the matrix.** A forecast that steers the
owner is a claim about his future with no ground truth until after the fact — and
the campaign's entire discipline is built on never claiming what it cannot support.
A wrong forecast that changes behaviour is unfalsifiable: the counterfactual is
unobservable.
**Sequencing:** after S1. Cannot precede it.

---

### C1 · Semantic capture and clarification — PLANNED · substantial · 91 pkg 1

**Evidence:** nothing reads owner text for meaning; `destinationRecords()` is
`draft.aim.trim()`. Full analysis in `ROUTING_91_BRIEF.md`.
**Plan relation:** already routing 91 package 1 with CASE A as its gate. **Extends**
F36; does not collide.
**Depends on:** `AuthoringProposal` + `proposeDestination()` (both shipped in 84).
**Build:** a second producer of `AuthoringProposal` that reads words instead of a
kind-picker.
**Owner QA:** type "More money" under Career; see a proposal, unknowns, and one
clarification before anything is written.
**Synthetic QA:** words preserved byte-identical; derived rows carry
`provenance: 'derived'`; private text never reaches the interpreter with D-167 off.
**Decision:** none new. D-172's A/B split still needs writing as a decision.
**RISK:** an interpreter that is confidently wrong about what the owner meant, and a
confirmation tapped through without reading.
**Sequencing:** independent of S1–S3. **Can go first.**

### C2 · Open-space longitudinal inference — DEFERRED · structural

**Evidence:** D-172, `Status: Open — adjudication required before routing 91 starts`.
**Plan relation:** the existing open question. **Absorbs** nothing; C3 is its
concrete half.
**Depends on:** S1, S2. Without them it searches a 16-concept, 2-horizon space.
**Build:** decided by D-172's adjudication — model-assisted, bounded mechanism, or hybrid.
**Owner QA:** the app surfaces a relationship the owner did not tell it to look for,
with its evidence.
**Synthetic QA:** it does **not** surface relationships in histories where none
exists — the false-discovery arm.
**Decision:** D-172 itself, plus D-024/D-025 reconsideration.
**RISK:** searching a wide space over sparse data manufactures patterns. Every guard
in `association.ts` exists to prevent this at one variable; open search multiplies it.
**Sequencing:** after S1/S2, or it searches an empty room.

### C3 · Combinations, sequences, lagged effects — ABSENT · structural

**Evidence:** `association.ts` is single-action, two-arm, `MIN_PAIRS = 4` each side.
No combination or lag machinery.
**Plan relation:** F15, adjudicated to Validity. **Underspecified there** — Validity
assumed the horizon existed.
**Depends on:** **S1 blocks this outright.**
**Build:** multi-factor comparison with an explicit multiple-comparisons discipline.
**Owner QA:** "your strong weeks have these three things in common" with
counterexamples shown.
**Synthetic QA:** null histories produce no findings; comparison groups honest at
every horizon.
**Decision:** what evidence threshold licenses a combination claim.
**RISK:** **false discovery scales with the number of comparisons.** Four factors ×
five horizons is 20+ tests; some will look significant by chance. Needs a correction
discipline the product has never needed before.
**Sequencing:** after S1.

### C4 · All-domain understanding and progression — PARTIAL · substantial

**Evidence:** destination object built and proved on **three** domains (Career,
Health, Money) per D-173. Nine remain, including Fatherhood which was deliberately
excluded.
**Plan relation:** **extends** F01. F20–F25/F28/F29 are the per-domain instances,
adjudicated to Validity.
**Depends on:** nothing structural — the shape is proved.
**Build:** content and evidence semantics per domain; no new architecture.
**Owner QA:** name an aim in a domain that has never had one; Now changes.
**Synthetic QA:** each domain's progress evidence is domain-appropriate, not a
generic template.
**Decision:** which domains, in what order — and whether Fatherhood joins now.
**RISK:** nine domains built as a checklist produces nine thin dashboards.
**Sequencing:** any time after 84. Good candidate for spreading across phases rather
than one bulk push.

### C5 · Emotional / state modeling — APPROVED-BUT-UNBUILT · substantial

**Evidence:** **D-166 approved the owner's six dimensions on 2026-08-27 and they are
not built.** `emotionalState` is still one free-text concept; `concepts.ts:530` still
carries the original DEF-0056 refusal text.
**Plan relation:** **already assigned** — AUD-0011's emotional half, in Reach. This is
C22's clearest instance: approved work that could vanish in a restructure.
**Depends on:** Reach's registry work.
**Build:** six optional concepts coexisting with free text (the audit verified this
needs **no schema change**).
**Owner QA:** answer two of six; the other four stay unknown; nothing aggregates them.
**Synthetic QA:** no path anywhere sums or averages across the six.
**Decision:** none — already made. Needs protecting, not deciding.
**RISK:** a single `emotional.score` concept appearing later is the wellness score
arriving by the back door. The audit's own first draft nearly proposed it.
**Sequencing:** Reach. Independent of S1–S3.

### C6 · Learning progress, retention, transfer — ABSENT · substantial

**Evidence:** no retention/mastery/proficiency machinery. One `proposedBecause`
string mentions retrieval.
**Plan relation:** F22 (career competency route), Validity. **Underspecified** —
names the goal, not a mechanism.
**Depends on:** S1 for spacing/retention over weeks.
**Build:** either the app tests the owner (spaced retrieval — a whole sub-product),
or it records external proof (a lab that ran, an artifact, an interview).
**Owner QA:** study three times; the app distinguishes "attended" from "retained" and
says which it knows.
**Synthetic QA:** attendance never silently becomes capability (F05's rule).
**Decision:** does the app test the owner, or only record proof? **These are very
different products.**
**RISK:** without external evidence, "retained capability" becomes a second
self-report wearing a better name — the exact failure F05 exists to prevent.
**Sequencing:** after S1.

### C7 · Nutrition, food, caffeine, hydration — ABSENT · structural

**Evidence:** zero concepts. Verified: no `food`, `meal`, `carb`, `nutrition`,
`caffeine`, `coffee`, `alcohol`, `hydration`.
**Plan relation:** **in no phase whatsoever.** Not in Reach, Validity, or any AUD
finding.
**Depends on:** S2 (vocabulary), S1 (for "last night → this morning" to be more than
the existing next-morning path).
**Build:** concepts + capture + registry reach + association arms.
**Owner QA:** log last night's meal; this morning's reading can be compared against
nights without it.
**Synthetic QA:** food-present vs food-absent arms both clear `MIN_PAIRS`; unknown
intake excluded rather than counted as absent.
**Decision:** new. Does the capture burden clear §4.5?
**RISK:** two. **Burden** — food is the highest-frequency, highest-friction thing to
log. And **spurious confirmation** — "carbs made me sluggish" is a strong folk
belief, so a weak association will feel confirmed. The owner's coffee-versus-milk
example is exactly this shape.
**Sequencing:** after S1+S2. The owner's most-wanted example is among the most
structurally expensive.

### C8 · Sleep & recovery over long horizons — PARTIAL · substantial

**Evidence:** sleep concepts exist; `derived.ts` reaches only sleep. AUD-0007/0009
(accumulated load, recovery runs) are in Validity.
**Plan relation:** **extends** existing Validity work. F20 is the destination half.
**Depends on:** S1.
**Build:** multi-night and multi-week aggregation over existing readings.
**Owner QA:** three bad nights produce different guidance than one, and the app says
so from the owner's record.
**Synthetic QA:** D-064's four conditions for the morning reading survive intact.
**Decision:** none new.
**RISK:** low. This is the safest of the horizon-dependent capabilities and a good
first proof of S1.
**Sequencing:** immediately after S1. **Recommended as S1's acceptance case.**

### C9 · Same-day → monthly effects — ABSENT · structural

This **is** S1. Listed separately because the owner named it as a capability; it is
the layer, not a feature on top of it. See S1.

### C10 · Forecasts / predictions — ABSENT (deferred) · structural

See S3. Adding here: §22 already specifies what a forecast must define — _what is
being forecast, time horizon, confidence, missing evidence, what could change the
forecast._ **The contract is already written; nothing implements it.**
**Decision:** clear §22's "clearly improves decisions" bar.
**RISK:** as S3.

### C11 · Intervention / steering on a forecast — ABSENT · substantial

**Evidence:** every recommendation is computed from present state. Nothing diverts
the owner from a predicted outcome.
**Depends on:** S3 absolutely.
**Build:** forecast → candidate influence, with the forecast visible in the trace.
**Owner QA:** the app says "I'm suggesting this because your next morning looks
poor," and the owner can inspect why.
**Synthetic QA:** a wrong forecast is detectable after the fact and down-weights the
next one.
**Decision:** may a forecast override a present-state judgement, and by how much?
**RISK:** **acting on a wrong future.** Worse than a wrong recommendation, because
the counterfactual is never observable. Also self-fulfilling: steering away from a
predicted bad day makes the prediction unfalsifiable.
**Sequencing:** after S3, never before.

### C12 · Explaining the intervention — ABSENT · contained _(once S3 exists)_

**Evidence:** `explain.ts` composes from present dimensions; no forecast clause exists.
**Depends on:** C11.
**Build:** one clause — and Q9 caps Now at **one additional clause**, so it competes
with the compatible-move and cost clauses.
**Owner QA:** the explanation names the forecast and its uncertainty, not just the move.
**Synthetic QA:** no forecast clause appears when no forecast drove the decision.
**Decision:** does a forecast clause win Q9's single slot?
**RISK:** a persuasive sentence about the owner's future backed by thin evidence is
the most dangerous copy the product could produce.

### C13 · Sustainable **and increasing** — ABSENT · substantial

**Evidence:** nothing distinguishes a spike from a sustained gain from a rising
trend. `trajectory` compares first-N to last-M and stops there.
**Plan relation:** closest is F14 (anti-stagnation), Validity — but that is about
maintenance crowding out advancement, not about _rate of improvement_.
**Depends on:** S1 + S3.
**Build:** trend-of-trend over a real horizon, plus a way to say "this worked but is
flattening."
**Owner QA:** two things both help; the app distinguishes the one that keeps helping.
**Synthetic QA:** a plateau is reported as a plateau, not as continued success.
**Decision:** what counts as "increasing," and over what window.
**RISK:** **optimizing a proxy.** The owner's coffee-versus-milk example is precisely
the right intuition and precisely the hard case: distinguishing a spike from
compounding growth needs more evidence than a single life produces quickly.

### C14 · Confidence calibration low → very high — PARTIAL · substantial

**Evidence:** bands exist — `very consistent` (≥10), `fairly consistent` (≥6),
`worth noticing` below, a counterexample costing a step (`insights.ts:592-603`). But
these measure **evidence sufficiency**, not calibrated probability.
`MIN_PAIRS`/`MATERIAL_GAP` are thresholds, not a gradient.
**Plan relation:** partially in Validity; calibration as such is unassigned.
**Depends on:** S1 for anything multi-horizon.
**Build:** for QA to test across bands today, histories that land at each band —
buildable now. True calibration needs forecasts to score against (S3).
**Owner QA:** the app speaks differently when it knows little versus much, visibly.
**Synthetic QA:** band boundaries hold; a counterexample always costs a step.
**Decision:** does confidence become owner-visible for the owner's own data? (It is
internal-only for anything about the child, D-193.)
**RISK:** a band word read as a probability. "Fairly consistent" is not 70%.

### C15 · Research-grounded priors — ABSENT · substantial · **highest-risk row**

**Evidence:** §68 requires distinguishing _what the app was told_, _what research
says generally_, and _what it would infer by combining them_. D-143 already makes
told-versus-worked-out two rows. Research is currently used **only** to justify
design choices (Van Dongen for recovery, Cepeda for spacing, Wood/Bruner/Ross for
scaffolding) — never as a claim about the owner.
**Plan relation:** no phase. The discipline exists; the capability does not.
**Depends on:** a provenance class distinct from both owner-record and derived.
**Build:** a third provenance kind, explicit in every surface that renders it, with
the prior visibly weakening as the owner's own evidence accumulates.
**Owner QA:** the app says _"people who sleep badly usually X — I don't yet know if
that's you"_ and never elides the distinction.
**Synthetic QA:** no path lets a general prior be rendered as a personal observation;
priors decay as personal N rises.
**Decision:** may general-population evidence influence a recommendation about the
owner at all — and if so, must it always be labelled?
**RISK:** **the single most dangerous capability in this matrix.** A prior is
confident, well-sourced, and about someone else. It can make the app sound most
authoritative exactly where it knows least about the owner, and §68's blur is easy to
cross by accident — a sentence that begins "people like you" and ends as a fact about
him.

### C16 · Fatherhood capability support — PARTIAL · substantial

**Evidence:** growth model built and corrected across three phases; Fatherhood
deliberately outside routing 84's proving scope (D-173).
**Plan relation:** F24 (closeness, experiences, breadth), Validity. **"Lessons to
teach her" is absent entirely** — the model tracks her skills, nothing suggests what
to teach.
**Depends on:** C4's destination shape.
**Build:** relationship intentions, shared experiences, support opportunities — with
every existing protection intact.
**Owner QA:** the app suggests something to do _with_ her that is not a skill drill.
**Synthetic QA:** no score, rate, rank or grade about her survives, proved by
reintroduction.
**Decision:** does Fatherhood get a destination object, and does "what to teach her"
become a capability?
**RISK:** instrumenting the relationship. The audit's protected item — _"time with her
is a first-class move, separate from working on something with her"_ — must not be
eroded by a teaching feature.

### C17 · Social / charisma / romantic progression — PARTIAL · substantial

**Evidence:** Romantic approved as the **twelfth domain** (D-168) and **not built**.
Social has energy plus a seeded goal. F25 (capability vs appetite) is Validity;
AUD-0013/0047 are Reach.
**Plan relation:** **extends** approved work. D-168 is another C22 item at risk.
**Depends on:** C4.
**Build:** the twelfth domain page, plus progression evidence for
confidence/comfort/transfer.
**Owner QA:** name a romantic aim; it is not filed under Social; Now can act on it.
**Synthetic QA:** AUD-0047's rule holds — a quality signal may **only suppress, never
rank**. No person is scored.
**Decision:** none new (D-168 settled placement); the progression model needs one.
**RISK:** ranking people, or reducing the aim to a date quota — D-168 forbids both.

### C18 · Peak-performance state / score — DEFERRED, **not prohibited** · substantial

**Evidence:** no composite anywhere. §22: _"No single score is **required** for the
initial rebuild… may be added later only if it clearly improves decisions."_
**Plan relation:** deferred by §22; D-162 binds the destination object to
description, not the whole product.
**Depends on:** S3, and arguably S1+S2 for the inputs to be meaningful.
**Build:** a defined quantity — §22 requires it name what it measures — plus what
moves it and what it excludes.
**Owner QA:** the number changes when the owner's life changes, and he can see which
inputs moved it.
**Synthetic QA:** it is never rendered where evidence is insufficient; it never
becomes a proxy for personal worth (§22's explicit line).
**Decision:** clear §22's bar. **This is a hurdle, not a reversal.**
**RISK:** a single number displaces the judgement the product exists to provide, and
becomes something to optimize rather than a reading.

### C19 · Child progress-measurement semantics — PROHIBITED · contained _(to reverse)_

**Evidence:** **five decisions** — D-070, D-112, D-117, D-135, D-136 — plus guards in
five test files including `g003-growth-evidence.test.ts` and
`architecture-guards.test.ts`. Origin: AUD-0048, which the audit called _"the most
serious single defect"_ — the app asserting a four-year-old had done something "three
times running" when the record showed three of six with the most recent a failure.
**What reversal costs:** amend or supersede five decisions; rewrite the copy guards
that currently fail the build on any rate, share, rank or grade about her; and
re-derive what the percentage would measure.
**Owner QA / synthetic QA:** would need redefining entirely — the current suites
assert the opposite.
**Decision:** the owner's. Note the space is not binary: _counts of occasions_,
_settled/not-settled_, _context transfer_ and _what she is working on_ are all
already permitted and already built. What is prohibited is specifically a **rate,
share, rank or grade**.
**RISK:** the original one — a number about a child that the evidence does not
support, offered for one-tap acceptance.
**Sequencing:** independent of everything else. Decidable at any time.

### C20 · Recommendation diversity — APPROVED-BUT-UNBUILT · substantial

**Evidence:** `A_WALK` still hardcoded as physical health's only subject
(`candidates.ts:606`). AUD-0045 + D-113 name diversity a product outcome; Reach, high
priority.
**Plan relation:** **already assigned.** Routing 84's authoring unlocked its
precondition.
**Depends on:** per-object size/demand (a scoring change, its stated precondition).
**RISK:** none new. **Risk is that it disappears in a restructure** — C22.

### C21 · Blocker enforcement / adaptation — PARTIAL · substantial

**Evidence:** capture shipped in routing 84 (the `must-stay` cause, D-187).
Enforcement absent: `applyConstraints` never reads `situation.constraints`;
`cautionsFor` cannot fire for a `blocker.*` concept; `constraints.ts:25-28` records
non-enforcement as deliberate.
**Plan relation:** F08, Validity. Four missing pieces documented in
`ROUTING_91_BRIEF.md` §6.
**Depends on:** S2 (a supervision/egress concept) and a candidate attribute for
"requires leaving the house."
**Decision:** reverse `constraints.ts:25-28`'s shown-never-enforced rule.
**RISK:** D-187's exact concern — the app promising behaviour the engine cannot
deliver.

### C22 · Existing Reach/Validity work at risk — 20 AUD findings

**Reach (9):** AUD-0040, 0011, 0041, 0047, 0045, 0012, 0013, 0006, 0050-retraction —
plus F12, F19, F27, F30, F32, F36.
**Validity (11):** AUD-0042, 0029, 0007, 0009, 0010, 0022, 0025-durable, 0030(a),
0038(c), 0019, 0051 — plus F03, F08, F09, F14, F15/F17, F16, F18, F20–F25/F28/F29,
F31, F34, F42, F44.
**RISK:** **a roadmap redrawn around the owner's new list can silently drop these.**
D-166 and D-168 are already approved-and-unbuilt and neither appears in the
capability list. Any restructure must reconcile against this membership explicitly.

---

## 3 · Structural dependency map

```
                    ┌─────────────────────────────────────────┐
   INDEPENDENT      │  C1 semantic capture   (91 pkg 1)       │
   — buildable now  │  C5 emotional states   (Reach, approved)│
                    │  C20 diversity         (Reach, approved)│
                    │  C4 all-domain         (shape proved)   │
                    │  C19 child semantics   (owner decision) │
                    └─────────────────────────────────────────┘

   S1 HORIZONS ──┬──▶ C8 sleep long-horizon   ◀── recommended S1 acceptance case
   (prerequisite)├──▶ C3 combinations/lags
                 ├──▶ C6 learning retention
                 ├──▶ C13 sustainable+increasing
                 └──▶ S3 ──┬──▶ C10 forecasts
                           ├──▶ C11 steering
                           ├──▶ C12 explanation   (competes for Q9's one clause)
                           └──▶ C18 peak score

   S2 VOCABULARY ─┬──▶ C7 nutrition/food
   (needs Reach)  ├──▶ C21 blocker enforcement
                  └──▶ C2 open-space inference (with S1)

   C15 RESEARCH PRIORS — independent layer, own provenance class, own decision
```

**Critical path:** `S1 → S3 → C10/C11/C12/C18`. Everything the owner described about
prediction and peak performance sits behind two structural layers that do not exist.

**Fastest visible wins:** C1, C5, C20, C4 — all independent of S1–S3, and two are
already approved.

---

## 4 · Roadmap pressure

| Phase                    | Currently                       | Pressure                                                                                   | Verdict                                  |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **90** canonical Phase 9 | visual coherence + 3 AUD        | Would need to accommodate forecast, intervention and confidence surfaces that do not exist | **Do not load.** Accommodation list only |
| **91** Reach + Validity  | 20 AUD + ~20 owner-use findings | Adding C2, C3, C6, C13, C14 makes it the largest phase ever attempted                      | **Already at capacity. Overloaded**      |
| **92/93/94**             | canonical 10/11/12              | Unchanged                                                                                  | Leave alone                              |

**Where new work is warranted:**

- **S1 as a prerequisite layer, not a phase package.** Small, self-contained,
  unblocks six capabilities, and C8 is a natural acceptance case. Candidate for its
  own short routing phase between 90 and 91.
- **S2 folds into Reach** — it is the same registry work, extended.
- **S3 + C10/C11/C12/C18 as its own routing phase**, after 91. Too large and too
  risky to bolt onto anything.
- **91 should split.** Reach and Validity were already two gated packages; with C1 as
  package 1 and the additions above, they are plausibly two phases.

**Honest note on throughput:** routing 84 ultimately took nineteen QA rounds and an
owner closeout decision (D-210) to reach GREEN, and routing 82 took twelve. Sizing
new phases against that record matters more than sizing them against ambition.

---

## 5 · Owner decisions required

**Not decided here. Listed so the whole surface is visible.**

**Structural**

1. Does the product take on **broader time horizons** (S1)? — unblocks six capabilities
2. Does it take on a **wider state vocabulary** (S2), and what daily burden is
   acceptable per §4.5?
3. Does it take on **forecasting** (S3), clearing §22's "clearly improves decisions" bar?

**Consequential**

4. May a forecast **steer** a recommendation, and how far? (C11)
5. Does a forecast clause win **Q9's single additional-clause slot**? (C12)
6. Does the app **test the owner's retention**, or only record external proof? (C6)
7. May **general-population research** influence a recommendation about the owner —
   and must it always be labelled? (C15)
8. Does **confidence become owner-visible** for the owner's own data? (C14)
9. Reverse `constraints.ts`'s shown-never-enforced rule? (C21)

**Scope**

10. Which of the nine remaining domains get destination objects, in what order — and
    does **Fatherhood** join? (C4, C16)
11. Does "**what to teach her**" become a capability? (C16)

**Reversals**

12. **C19** — child progress as a rate/share/rank/grade. Five decisions, guards in
    five test files, and the audit's most serious finding as its origin. _Counts,
    settled-status and context transfer are already permitted and built; only the
    rate is prohibited._
13. **C18** — a peak-performance score. A hurdle (§22's bar), not a reversal.

**Protection**

14. How is the **20-finding Reach/Validity membership** protected through a
    restructure — with D-166 and D-168 already approved and unbuilt as the live
    examples? (C22)

---

**Nothing adjudicated. This document decides nothing and schedules nothing.**
