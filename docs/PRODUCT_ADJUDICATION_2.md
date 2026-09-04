# Second product adjudication — after routing 84 GREEN, before canonical Phase 9

**Status: NOTHING HERE IS APPROVED.** This document adjudicates; it does not
schedule, dispatch or amend. No governing document is changed by it, no phase is
marked approved, no completion marker is written, and no handoff exists for any
phase it proposes. It becomes roadmap only when the owner answers section 13 and
says so.

**Routing: none.** The orchestrator routes on `docs/NEXT_PROMPT.md` and
`docs/qa/PHASE_<digits>_QA_HANDOFF.md` only (`handoff_source.py:19-21`). This
file is invisible to it, carries **no** completion marker, and must never be
given one. `docs/NEXT_PROMPT.md` was **not** touched by this round: it holds
routing 84's GREEN closeout, and editing it would refresh its mtime and make it
the routing candidate — the opposite of the intent.

**Input:** [`CAPABILITY_MATRIX.md`](CAPABILITY_MATRIX.md), three structural layers
and 22 capabilities. **Authority: not the matrix.** Every status, dependency,
size, evidence claim and phase assignment below was re-checked against source in
the tree at **`9fc79a4`**. Twenty-two corrections were found and are in section 3; four of them retract claims this document itself made, and the owner found all four.
The corrected version is what is adjudicated.

**Predecessor:** [`PRODUCT_ADJUDICATION.md`](PRODUCT_ADJUDICATION.md), approved
2026-08-27 as D-158…D-173. Its method, its A/B/C/D/E discipline, its
reject-and-bound category and its section 12 lessons are preserved and used
unchanged. Where this document differs from it, the difference is stated.

---

## 1 · Evidence reviewed

Read in full: `CAPABILITY_MATRIX.md`; `PRODUCT_ADJUDICATION.md`;
`ROUTING_91_BRIEF.md`; `qa/README.md`; `CAMPAIGN_HOLDS.md`; `NEXT_PROMPT.md`;
`PHASE_84_OWNER_ADDENDUM.md`; `CANONICAL_REBUILD_PLAN.md` sections 2, 3, 4.1,
4.5, 21, 22, 23, 43A, 44, 54–59, 60, 68, 69, 70, 71; `DECISION_LOG.md`
D-158…D-211 in full, plus D-024, D-025, D-036, D-043, D-045, D-063, D-064, D-070,
D-078, D-084, D-087, D-089, D-091, D-101, D-109, D-112, D-113, D-117, D-129,
D-133, D-134, D-135, D-136, D-137, D-138, D-143, D-149; the audit's finding set
and package assignments for all 20 Reach/Validity findings; and
`qa/INSTRUMENT_HARDENING_BACKLOG.md` (index and all nineteen titles).

Read in source at `9fc79a4`: `moves.ts`, `outcomes.ts`, `derived.ts`,
`learning.ts`, `association.ts`, `insights.ts`, `candidates.ts`, `authoring.ts`,
`destinations.ts`, `discovery.ts`, `progress.ts`, `blockers.ts`,
`constraints.ts`, `evaluate.ts`, `growth.ts`, `situation.ts`,
`domain/concepts.ts`, `domain/domains.ts`, `domain/entities.ts`,
`domain/privacy.ts`, `domain/time.ts`, `legacy/mapping.ts`,
`features/memory/MemoryProvider.tsx`, `tests/browser/phase84.spec.ts`,
`tests/unit/architecture-guards.test.ts`.

Read in the orchestrator, read-only, nothing changed: `handoff_source.py`,
`handoff_parser.py`, `campaign_holds.py`, `model_policy.py`.

---

## 2 · Method

The predecessor's method, unchanged:

1. **Verify before adjudicating.** "Verified" below means read in the tree at
   `9fc79a4`, not read in a document that says what was built.
2. **A membership test, applied to every row.** The predecessor's was _"would
   Phase 9 approve the wrong product structure if this landed afterwards?"_ Phase
   9's structural question is now largely answered, so this round uses the
   successor test: **"does the owner's decision change because of this, and can
   the product be honest about it with the evidence it can actually get?"** Both
   halves must pass. A capability that would change a decision but cannot be
   supported honestly is bounded or refused, not deferred with good intentions.
3. **Reject and bound are first-class outcomes**, and they are used. The
   predecessor refused four proposals outright — F17, F34, F37, F44 — and the
   product is better for it.
4. **Owner-value questions are not answered here.** Four were named in the brief;
   two more met the bar and are added. Everything else, including hard calls, is
   decided.

**One method change, and it is deliberate.** The predecessor classified findings
and then built phases around the classification. This round starts from the
**evidence economy** instead: what the product can observe, how much of that
reaches a decision, and what any given claim could ever be scored against. That
reordering is the single largest difference between the two documents and it is
what produces section 4's verdict.

---

## 3 · Matrix verification — twenty-two corrections

The matrix asked to be verified rather than inherited. It was. Its central claims
hold; these twenty-two do not, and the corrected versions are what section 7
adjudicates.

### Corrections that change an adjudication

**3.1 — S1 is not "in no phase". Its longitudinal half is already in Validity.**
The matrix says S1 is _"in no phase. Not in Reach, not in Validity, not in
D-172."_ **AUD-0029** is _"nothing reasons at month or season scale, so the app
cannot see the shape of a year"_; **AUD-0007** is _"a Tuesday and a Saturday
differ by one boolean; nothing models a rhythm or a heavy season"_; **AUD-0009**
is _"recovery is always proposed as one night, when the evidence says it takes
several"_. All three are in the audit's Validity package and the matrix's own C22
list contains them. S1 therefore splits, and only one half is unowned — see 5.1.

**3.2 — The product already runs a multi-day horizon, and S1 should generalise it
rather than invent one.** The matrix says two horizon values exist, _"total"_.
That is true of `OutcomeTiming.when` (`moves.ts:46`). But routing 84 shipped
`CourseReflection` (`progress.ts:262-300`): a question that **opens three days**
after a course ends (`DAYS_BEFORE_ASKING_WHAT_STUCK = 3`), a second that opens at
**ten** (`DAYS_BEFORE_ASKING_ABOUT_USE = 10`), each keyed on an `opensOn:
LocalDayId` and each open for seven days. A working, tested, owner-facing
multi-day mechanism exists. This materially reduces S1's size and its risk.

**3.3 — C6 is not ABSENT. It is PARTIAL, and smaller than the matrix says.**
`retained-capability` and `transfer` are **shipped progress rungs**
(`progress.ts:38-47`), each an `outcome` of its own aspect, each asked days after
a course rather than at the end of it, and `RUNG_FOR_ASPECT` maps them. What is
absent is spaced-retrieval testing and any _aggregation_ of retention over time —
not the evidence kind, and not the distinction between attending and retaining.

**3.4 — S3 is governed by section 59 as well as section 22, and 59 is the harder
gate.** The matrix cites only section 22's _"may be added later only if it clearly
improves decisions."_ Plan **section 59** additionally excludes _"giant Forecast
100 as the center of the product"_ and states that anything on that list _"may
only return through an explicit new decision with a current reason."_ And
`src/legacy/mapping.ts:293-309` still refuses to import three legacy record
families by name — `untreated-forecast`, `intervention-effect-prediction`,
`forecast-evaluation`. **The previous generation built exactly the C10 → C11 →
C18 chain the owner is now asking for, and this rebuild threw all three of its
record kinds away on purpose.** That is the most important single fact in the S3
adjudication and the matrix does not contain it.

**3.5 — C4 is "no new architecture" for four of the nine remaining domains and
new architecture for five.** Seven domains have a candidate generator
(`candidates.ts:829-840`): sleep, career, fatherhood, home, social, health,
money. **Emotional, Faith, Private / Sexual Health and Long-Range Direction have
none**, and Romantic is unbuilt. In a domain with no generator, a destination
cannot change Now at all, whatever content is written for it. D-170's requirement
that Faith eventually participate in _destination, discovery, practices and
experiences_ sits squarely in this class. C4 is two jobs with two sizes.

**3.6 — The destination-to-Now bridge is domain-specific, and its bare-aim case is
empty.** `MILESTONE_ENTITY` (`authoring.ts:625-629`) maps career →
`learning-topic`, money → `financial-goal`, health → `routine`, with anything else
falling back to `goal`. That is what makes a named milestone reach Now in the
three proving domains — `careerCandidates` returns nothing without a
`learning-topic`, `moneyCandidates` nothing without a `financial-goal`. But the
entity is written by `milestoneRecords`, **not** by `destinationRecords` — so a
destination with **no milestone**, which is exactly CASE A's _"More money"_ shape,
creates a `destination` entity that **no generator consumes**, and produces no
candidate in any domain. D-188 records this honestly. It is the load-bearing gap
under C1 and it belongs in C1's gate rather than being left implicit.

**3.7 — C14's citation is wrong.** The matrix says confidence is internal-only for
anything about the child _"(D-193)"_. D-193 is about closing the set of rendered
copy. The rule meant is **AUD-0049 / D-112**, implemented at `growth.ts:203-207`:
_"How sure the app is, and it never renders."_

### Corrections to counts, and stale claims in the governing documents

**3.8 — Sixteen concepts, not seventeen, and only six are numerically tracked.**
`CONCEPT` holds sixteen ids (`concepts.ts:229-251`). The matrix says sixteen and
is right; **D-172, `PRODUCT_ADJUDICATION.md` section 12 item 3, and
`ROUTING_91_BRIEF.md` section 6 all say seventeen and are wrong.** One of the
sixteen (`childHere`) is derived and never recorded, so **fifteen are
recordable**. Six carry `tracked:` — `sleepHours`, `sleepQuality`, `energy`,
`soreness`, `cashBuffer`, `socialEnergy` — and `tracked` is the gate on
`trajectoryCards` (`insights.ts:1815`). **Six concepts is therefore the entire
surface over which this product can currently describe a direction over time.**
That number, not the concept count, is the real ceiling, and it is the fact that
drives section 4.

**3.9 — `ROUTING_91_BRIEF.md` section 7's "no fresh-store test anywhere" is
stale.** Routing 84 added genuine fresh-store browser cases — `page.goto(APP)`
with no `loadInQa` and no `#/qa` — at `tests/browser/phase84.spec.ts:836-871`,
and CASE A and CASE B both passed from ephemeral contexts. What is **still** true
is that section's third mechanic: **nothing in `tests/browser` uses
`page.clock`.**

**3.10 — `ROUTING_91_BRIEF.md` section 5's first reason for rejecting routing 85
has expired.** `routing_ceiling()` (`handoff_source.py:75-101`) was hardened since
the brief was written: an **untracked** QA report raises the ceiling only when its
phase has genuinely been dispatched, proved from the orchestrator's own dispatch
history. A **committed** one still raises it. The prohibition on writing a
`PHASE_*_QA_HANDOFF.md` during an adjudication therefore still stands, and the
mechanism behind it has changed.

**3.11 — `ROUTING_91_BRIEF.md` section 4 item 6's private boundary is now partly a
chokepoint.** D-167 shipped: `createFactReader.read()` resolves a private concept
to `unknown` with reason `withheld` while the permission is off
(`situation.ts:515-528`, `privacy.ts:131-160`), which is a real structural
boundary for reasoning. **Five** permission-blind exclusion sites remain —
`coverage.ts:638`; `insights.ts:1816`, `2026`, `2559`; `situation.ts:558` — not
seven, and consolidating them is still Reach's work.

**3.12 — `qa/README.md`'s "never write Max into a Codex block, it stalls the
orchestrator" is stale. It is reported here, not rewritten.**
`model_policy._EFFORT_RUNG` (`model_policy.py:72-83`) maps **`max` and `extra
high` to one `top` rung**, deliberately, with a comment saying why. A Codex block
reading Max resolves to Codex's Extra High; it does not leave the level unset and
does not stall anything. **Keep the convention** — a retest block should still say
High, because Extra High is not what independent QA needs — **and drop the stated
consequence.** `ROUTING_91_BRIEF.md` section 10 already flagged this; it is
confirmed here against the module. Correcting `qa/README.md` is outside this
round's write permission and is listed in section 14.

**3.13 — D-159 states half the routing rule, and the other half is decisive for
this document.** D-159 requires a routing integer **strictly greater than 82**.
But `routing_ceiling()` keeps only the **maximum** phase that has a QA report, so
the operative constraint is stronger: **routing integers must increase
monotonically in execution order.** A phase numbered 85 and dispatched after
`PHASE_90_QA_HANDOFF.md` is committed would sit below the ceiling and would never
route, silently, with nothing warning anyone. This is why section 6 does not
reuse 85–89 even though they are free, and why canonical 10/11/12 are renumbered.

**3.14 — A campaign hold matches `blocks_phase` by exact integer equality.**
`campaign_holds.blocking()` (`campaign_holds.py:163-180`) compares
`int(blocks) != int(phase)` and skips on inequality. `CAMPAIGN_HOLDS.md` declares
`<!-- lco:decision id=D-172 status=open blocks_phase=91 -->`. **Any split or
renumbering of routing 91 silently releases the D-172 hold on everything that
moves off 91.** Section 6.11 says exactly what must be declared instead. This
document does not touch `CAMPAIGN_HOLDS.md`.

**3.15 — `emotionalState`'s source comment is stale, and it is C22's risk visible
in one file.** `concepts.ts:530-537` still reads _"Which dimensions exist here is
his to say, and until he says, this stays what it actually is… Open question for
the owner."_ **D-166 answered it on 2026-08-27.** The concept itself is correctly
unchanged — D-166 does not authorise building the six dimensions before Reach —
but the comment now describes a closed question, in the exact place a later reader
would go to find out whether it was still open.

### Two further corrections, found while settling owner decisions #6 and #7

**3.16 — plan section 54 says "Six rungs of progress evidence". The code has
seven.** `PROGRESS_EVIDENCE` is `attempt, part-done, completion, quality,
retained-capability, transfer, milestone` (`domain/progress.ts:50-72`) —
`part-done` was added by QA-84-002 and the plan text was not swept. **This
document's own first draft inherited the error.** It matters because `rankOf()`
indexes that array, and the ladder is what section 13A's advancement work reads.

**3.17 — `time.ts:562` names a guard file that does not exist.** It cites
`tests/unit/no-ambient-clock.test.ts`; the ambient-clock guard actually lives in
`tests/unit/architecture-guards.test.ts`. Harmless, and worth correcting when that
file is next touched. Noted because section 6.1's time-advance instrument rests on
that guard being real — **it is; only its name is wrong.**

### Five corrections from the owner-decision sequence, four of them retractions of claims made in this document

**3.18 — the stale D-172 target inside this document.** One line said the work
D-172 is about moves to **96** while the hold instruction two paragraphs later
said **97**, and the proposed roadmap places longitudinal inference at 97.
**Corrected to 97**, so the later mechanical retarget has one unambiguous target.
The live hold is **not** retargeted by this document.

**3.19 — RETRACTED: the settled-sufficiency claim. Mine, and it was false.** This
document's analysis claimed a `development-skill` could reach `settled` over
occasions where the owner answered `needed-me`, and proposed amending D-112 and
D-135 to close it. **The owner refuted it from source.** The capture answers
write result and help together (`outcomes.ts:469-476`): _On her own_ →
`scale(2,2)` → `RESULT_VALUE[2]` = 1.0 → `on-her-own`; _With a small prompt_ →
0.5; _Needed me_ → 0.0. With `GROWTH_CLEARLY = 0.9`, **`cleared` is equivalent to
`help === 'on-her-own'`**, and `trailingRun` breaks on the first non-cleared
occasion. **The existing run already requires three consecutive independent
occasions, and D-135 adds the two-setting bar.** There was no defect. Form (a),
its guarded routing 94 package, the D-112/D-135 amendment and a separate
independence-sufficiency owner decision were all **deleted**.

**3.20 — RETRACTED: "settled skills are excluded from candidacy entirely." Mine,
and overstated.** `candidates.ts:496` reads
`if (standing.stage === 'settled' && !maintenanceProbeDue(...)) continue` —
settled skills are **re-admitted** whenever a maintenance probe is due. The
owner caught it.

**3.21 — RETRACTED: "permanently due and permanently invisible." Mine, and
false.** The claim was that a due maintenance probe could never fire. **The owner
found the third term in `recentDuplication` that refutes it.** Two recovery paths
exist: the **ignore path**, where each active skill accrues −0.35 per distinct
`now` while an unshown probe holds the +0.2 _"not offered lately"_ branch — a
0.55 gap at weight 0.8 = **+0.44** against the probe's 0.20 urgency deficit; and
the **response path**, where competing skills accumulate `sameThing` (−0.5) while
the probe carries only `sameShape` (−0.2) — **+0.24**, also clearing the deficit.
The routing 93 scoring package, probe-specific urgency escalation, a global
`stale-evidence` change and a separate written scoring decision were all
**deleted**; a regression test remains.

**3.22 — the aggregate thread-fit bound was asserted before it was proved, and
the owner said so.** This document called a live `growth-ladder` thread _"a real
starvation case, not a slow one"_ without establishing whether repeated finite
threads could accumulate. **The owner proposed the bound and demanded proof
rather than accepting it.** The trace established it: `steps: 3`, `lastsDays: 42`
(`threads.ts:139-140`), expiry _"set once, here, and never extended"_ (`:401-402`);
`activeThreads` pushes **every** thread record including finished and expired, so
`threadOfferFor`'s `answered` check blocks a re-offer on the same subject
permanently; `startThreadRecord` has one product call site, gated on
`threadOfferFor`; and `entityId(kind, label)` is deterministic, so re-authoring
the same normalized label cannot evade the block. **Bound: at most one
growth-ladder thread per `development-skill` for that skill's lifetime, and at
most 42 days of thread-fit per skill.** "Indefinite starvation" was wrong;
**bounded delay** is correct.

### One matrix claim worth restating precisely

**C21's conclusion holds, with one nuance the matrix omits.** `applyConstraints`
never reads `situation.constraints`; `cautionsFor` matches `constraint.concept`
against `candidate.leansOn` (`evaluate.ts:1106-1112`) and **no `leansOn` list
anywhere contains a `blocker.*` id** — every one is a registered `CONCEPT.*`. So
that branch cannot fire. The nuance: `standingBlockerFor` **is** read, at
`blockers.ts:236`, where a standing blocker suppresses the follow-up question
(D-164's `already-known` path). So a blocker record does change behaviour — it
stops the app asking again — and never changes which move is offered. And
`blockerConcept()` (`blockers.ts:175-177`) mints ids of the form
`blocker.<cause>.<objectId>` which appear **in no registry**. That is why C21
needs S2 and not merely a reversal of a rule.

---

## 4 · Executive verdict

**The bottleneck is not intelligence. It is evidence, and then it is revision.**

The owner's chain is: observe → accumulate → detect patterns → form hypotheses →
seek missing evidence → test over time → revise its model of him. Routing 84
built the object that chain revises. Three facts about the tree decide everything
that follows.

**One. The product can describe a direction over time for six quantities.** Six
concepts carry `tracked`. `derived.ts` observes exactly one thing without being
told (`sleepHours`, twice, at lines 126 and 169). Every other observation in the
system is a deliberate tap. So the accumulate step — the second link in the chain
— is running at a scale that no amount of inference machinery downstream can
compensate for. **Wiring a smarter engine to a six-variable space is the most
expensive way available to discover nothing.**

**Two. Nothing revises a destination except the owner.** The predecessor named
this as its number one residual risk — _"the revision loop is the top of the chain
and no phase in this plan closes it"_ — and **it is still true, it is still
unowned, and it does not appear anywhere in the capability matrix.** That is this
adjudication's largest single finding. Nothing detects that a destination has
quietly stopped mattering, that two destinations do not fit the hours in a week,
or that eight months have produced no movement. A destination the system can only
receive is a form.

**Three. The forecasting the owner describes was already built once and
deliberately thrown away.** Section 59 and `legacy/mapping.ts` record it by name.
Bringing it back is not a bar to clear; it is a reversal that needs a reason.

**So the product this adjudication recommends is this.** Life Command OS remains
a personal operating system whose central question is _"what should I do right
now?"_, and it becomes a personal intelligence system by getting **better at
knowing him**, not by getting better at **predicting him**. In order:

1. **Understand what he says** — semantic capture, so that words he types become
   something the app can act on rather than a stored string (C1).
2. **See what it already holds** — Reach: make dormant concepts reach decisions,
   widen the vocabulary only where a decision is verifiably blocked, and give the
   outcome horizon a third value (S1a, S2 bounded).
3. **Conclude better from what it sees** — Validity: longer-horizon reading,
   blocker enforcement, honest comparison groups (S1b, C21, C8, C14).
4. **Cover the life, not three domains** — the remaining domains and the twelfth,
   with a generator each where one is needed (C4, C16, C17, D-168, D-170).
5. **Revise** — the loop the predecessor named and nobody owns: a destination that
   is not moving, a strategy that has stopped working, an expectation the app
   stated and then reconciled against what happened (the revision loop, bounded
   C10, bounded C13, C14 made visible).
6. **Then, and only then, discover** — D-172's mechanism, over a space that by
   then has something in it, with a pre-declared kill criterion (C2, C3).

**What the product does not become.** It does not become a forecaster. It does not
become a food-logging app. It does not become a spaced-retrieval tutor. It does
not acquire a peak-performance number. It does not steer him away from a predicted
future it can never check. Each of those is refused or bounded in section 12, and
each refusal is what keeps the rest finishable.

**And the honest arithmetic.** Nine phases remain. On a record of 3, 12, 2 and 19
QA rounds, that is a long road, and the predecessor's section 12 item 9 — _"the
realistic risk is not that this plan is wrong; it is that it does not finish"_ —
is the governing risk of this document too. Section 11 names which phases are
82-shaped, which are 84-shaped, where to split, and **what the minimum shippable
subset is if throughput becomes binding.** That subset is stated so that the
decision to stop, if it comes, is a decision rather than an exhaustion.

---

## 5 · The three structural questions

### 5.1 · S1 — broader temporal and history horizons

**Verdict: BUILD, split in two, bounded at weekly, and not as its own routing
phase.**

The matrix treats S1 as one thing. It is two, with different owners, different
sizes and different risks.

**S1a — the outcome-judgement horizon.** _When can the effect of this move
honestly be judged?_ Today: `same-block | next-morning` (`moves.ts:46`), read by
eight call sites (`derived.ts:170`, `learning.ts:764`, `moves.ts:51,52,311`,
`outcomes.ts:109,603`). Genuinely absent, genuinely unowned, and **small** — a
widened union, a migration rule, and eight consumers taught to read it.

**S1b — reasoning at week, month and season scale.** _What does the record say
over a longer span?_ **Already owned**: AUD-0029, AUD-0007 and AUD-0009 are in
Validity (correction 3.1). It does not need inventing; it needs building where it
already sits.

**What S1a should be, and the bound.** Approved horizon values: `same-block`,
`next-morning`, **`multi-day`** (carrying a named day count), **`weekly`**.

**`monthly` and `seasonal` are refused as outcome-judgement horizons.** A move
whose effect can only be judged in a month cannot be settled by a lifecycle keyed
to a day (`openEpisode` keys on `(target, dayId)`), and there is no evidence
supply that would ever score it: at six tracked concepts and one derived path, a
monthly outcome would be a question asked into silence. Monthly and seasonal
belong to **reading the record** — S1b, AUD-0029 — not to **judging a move**. This
distinction is the whole of the bound and it should be written into the decision
that creates the horizon.

**Build it by generalising what exists.** `CourseReflection` (correction 3.2)
already opens a question three days later and another at ten, keyed on `opensOn:
LocalDayId`, open for seven days. That is a proven multi-day deferred-question
mechanism with owner-facing copy that has been through QA. S1a's `multi-day` and
`weekly` outcomes should use that shape rather than a second one. **One name for a
thing, in the layer every surface can reach** — D-178, applied to horizons.

**Migration, which is the actual risk.** Widening an enum is trivial; the danger
the matrix correctly names is that a wider horizon silently invalidates
conclusions drawn at the narrow one. The rule: **no existing value is
reinterpreted, and no existing derivation changes.** D-064's four conditions for
the morning reading must produce byte-identical output before and after, proved by
a replay of the whole shipped scenario library under both enums. That is an exact,
falsifiable acceptance item, and it is what makes this safe.

**Where it goes:** a package inside **routing 92 (Reach)**. It is registry-shaped
work — a vocabulary that every consumer must be taught to read — which is
precisely what Reach is. It is not large enough to be a phase and making it one
would cost a full QA cycle for an enum. **C8 (sleep and recovery over longer
horizons) is its acceptance case**, as the matrix recommends, and that is right:
it is the one horizon-dependent capability with existing evidence behind it.

### 5.2 · S2 — wider owner, state and event vocabulary

**Verdict: BUILD, in three tiers, heavily bounded. The daily-burden question
itself is the owner's (blocking decision 3).**

Section 4.5 is the governing constraint — _"the app should require less input as
it learns more"_ and _"it should not collect data merely because a field exists"_ —
and it points the opposite way from a wider vocabulary. Every new concept is a tap
the owner pays for, forever, and the observe-first architecture means almost
nothing arrives on its own. So the test for each candidate concept is not _"would
this be useful?"_ but **"which decision is verifiably blocked today for want of
it?"**

Applying that test:

**Tier 1 — build in Reach. Each unblocks a decision that is broken now, and none
adds a daily tap.**

| Concept or attribute                                    | What it unblocks                                                                                                                                          | Marginal burden                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A **supervision / egress** concept — "I must stay here" | C21. Registers `blocker.must-stay` so `cautionsFor` can fire at all. The owner's own CASE B.                                                              | **None.** Routing 84 already captures it (D-187); it has no registry home.      |
| A candidate attribute **`requiresLeaving`**             | The other half of the same. `A_WALK` is an undifferentiated `entityRef('routine','a walk')` and nothing distinguishes an indoor move from an outdoor one. | **None.** A property of candidates, not of the owner.                           |
| The **six D-166 emotional dimensions**                  | C5, AUD-0011's emotional half. Already owner-approved and unbuilt.                                                                                        | Low, and **asked when informationally useful, never daily** — D-166's own rule. |
| A **bounded `until`** on a constraint                   | "While she is asleep" has no representation; no blocker path sets `ConstraintRecord.until`.                                                               | None; it is an optional field on a record he is already writing.                |

**Tier 2 — build in Reach, low burden, decision value demonstrable.**

| Concept                      | Why it earns its tap                                                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`health.trained-today`**   | `derived.ts` observes one thing. Movement is the second-cheapest observe-first path in the product — it is already implied by a completed movement episode — and AUD-0042 is exactly the finding that the observe-first path reaches three verbs of fifteen. Mostly **derived, not asked.** |
| **`work.strain`**            | One scale, once a day, and the largest unmodelled driver of an evening. The only work-shaped concept today is `career.usable-time-tonight`, which AUD-0006 already records as mis-namespaced and mis-filed.                                                                                 |
| **`context.people-present`** | Not new capture: AUD-0047 records that the app already builds a relationship graph with a quality signal on every interaction **and only the QA laboratory reads it.** This is reach over data that exists.                                                                                 |

**Tier 3 — DEFER, and say why rather than leaving them unmentioned.** Caffeine,
alcohol, hydration. Each is at least one tap a day, each carries a strong folk-causal
prior, and the association engine at `MIN_PAIRS = 4` per arm with no
multiple-comparisons discipline will confirm a weak belief before it can test one.
They become buildable **after** C3's correction discipline exists (routing 97), not
before. Deferring them is not a judgement that they do not matter; it is a judgement
that capturing them before the engine can handle them produces confident nonsense.

**Tier 4 — REFUSED.** Nutrition and food (C7) — see section 12. Weather, screen
time, and location-as-coordinates — no owner decision turns on them at any
resolution this product could honestly capture, and each is a standing tap.

**What must travel with every new concept**, and this is the part that makes S2
Reach work rather than schema work: a **privacy class**, an **`ask` declaration
that is verifiable rather than asserted** (AUD-0041 found `materialToDecision`
wrong in four of fifteen cases), a **reader in `assembleSituation`** (AUD-0040
makes that registry-driven instead of a hand-written list of nine reads), and a
**freshness horizon**. A concept without all four is the inert-declaration defect
the audit found repeatedly, added deliberately.

**The no-added-noise rule is the gate**, and it is already the audit's gate for
Reach: making dormant concepts live **must not increase how often the app speaks.**
That single check is what stops S2 becoming a logging application.

### 5.3 · S3 — forecasting and trajectory intelligence

**Verdict: the forecast is REFUSED for this generation. Steering on a forecast is
REFUSED outright. A narrower successor — the named expectation — is APPROVED and
is what the owner should actually get.**

This is the most consequential call in the document, so the reasoning is given in
full.

**Section 22's four requirements are satisfiable. The fifth thing is not.** A
forecast must define what is being forecast, its horizon, its confidence, the
missing evidence, and what could change it. All five are writable. What section 22
does not say, because it did not need to, is that a forecast is only a forecast if
it can be **scored** — and the campaign's entire discipline is that a claim is
worth exactly what the evidence under it is worth. Calibration needs tens of
resolved forecasts per class before "70%" means anything. The evidence supply is
six tracked concepts, one automatic observation path, and a deliberate tap for
everything else. **A forecast this product cannot score is not a forecast; it is a
confident sentence about a man's life, and confident sentences with nothing under
them are the one thing this campaign has spent four phases removing.**

**Section 59 makes it a reversal, not a hurdle.** Correction 3.4: the previous
generation shipped the whole chain — a hundred-point forecast, an
intervention-effect prediction, and an evaluation of the forecast — and this
rebuild excluded all three by name and still refuses to import their records.
Section 59 permits their return only _"through an explicit new decision with a
current reason."_ The current reason would have to be that something changed which
makes the forecast honest this time. Nothing has. The evidence base is thinner than
the legacy app's was, because the legacy app had the same manual-entry problem and
five more years of it.

**C11 is refused for a stronger reason than cost: it is unfalsifiable by
construction.** Steering the owner away from a predicted bad evening makes the
prediction unobservable — the counterfactual never happens. A capability that
cannot be wrong cannot be learned from, and a system built to revise its model of
the owner must not contain a component immune to revision. This is not a matter of
evidence volume; more data would not fix it. **C11 is refused, not deferred**, and
C12 (explaining the intervention) falls with it.

**What is approved instead, and it delivers most of what the owner is asking
for.** The question behind "can it forecast" is _"is this going to keep working,
and what should I do about it?"_ That is answerable **backwards**, with a
forward-facing sentence, and without a probability:

> **A named expectation.** Where the record already supports it, the app may state
> what it **expects** of a move it is about to offer — _"on evenings like this one,
> this has usually gone well"_ — **record that expectation**, and then **reconcile
> it against what actually happened.**

Every property section 22 demands is present: what is expected (a named outcome
aspect on a named move), the horizon (the one the outcome already uses — no new
horizon needed), the confidence (the existing evidence-sufficiency words, which
are honest because they are about the evidence rather than about the future), the
missing evidence, and what would change it. And it adds the thing a forecast could
not have: **it is scored, always, because the occurrence it is about actually
happens and is already recorded.**

That gives the owner:

- a system that **notices when it was wrong**, which is the chain's sixth link;
- **C13's honest half** — _"this used to help and lately it has not"_ — with no
  rate anywhere;
- a real input to the **revision loop**, because an expectation that keeps failing
  is evidence that a strategy has stopped working.

**What it deliberately does not give him:** a claim about a day that has not
happened, a number, or a reason to act differently because of a prediction.

**C18 (peak-performance score) stays DEFERRED, not prohibited**, exactly as
section 22 leaves it. It is a hurdle, and the hurdle is unmet: a composite needs
inputs that are meaningful, and six tracked concepts across eleven domains is not
that. It should be revisited when Reach and Validity have shipped and the number
of tracked quantities is materially larger — and section 22's own line, _"do not
use a number as a proxy for personal worth"_, remains the reason to be slow.

---

## 6 · Proposed roadmap

### 6.0 · Routing map, and why canonical 10/11/12 move

Correction 3.13: routing integers must **increase monotonically in execution
order**, because `routing_ceiling()` keeps only the maximum phase with a QA
report. 85–89 are unusable — they sit below routing 90, which runs first. And
92/93/94 are currently held by canonical Phases 10/11/12, which run **last**,
leaving no integer space for the intelligence work between them.

**Recommendation: canonical Phases 10, 11 and 12 take routing integers 101, 102
and 103.** Their scope is unchanged, exactly as it was unchanged when D-159 gave
canonical Phase 10 the integer 92 — **D-109 stands.** Three-digit integers parse
correctly: `_stated_or_inferred_phase` reads `re.search(r"\d+", raw)`
(`handoff_parser.py:693`) and `QA_FILE_RE` is `^PHASE_(\d+)_QA_HANDOFF\.md$`.
This is not renumbering for aesthetics — it is forced by 3.13, and the gap above
canonical 10 is deliberate headroom, because this campaign has now had to insert
phases into its own map twice and every insert renumbers everything downstream.

**The headroom has already earned itself.** Settling owner decisions #6 and #7
(section 13A) split the former routing 95 into **95 — advancement and revision**
and **96 — expectation and reconciliation**, pushing longitudinal inference from
96 to **97**. That insert landed inside the reserve, so **canonical 10, 11 and 12
stay at 101, 102 and 103 and nothing downstream renumbered.**

| Product / canonical name                                 | Routing | Status                                 |
| -------------------------------------------------------- | ------- | -------------------------------------- |
| The instrument, and the things that are untrue           | 83      | **GREEN**                              |
| What the owner is trying to become                       | 84      | **GREEN**                              |
| **Canonical Phase 9** — visual coherence, motion, mobile | **90**  | approved, not started; scope unchanged |
| Semantic capture and clarification                       | **91**  | proposed                               |
| Reach — what the brain can see                           | **92**  | proposed                               |
| Validity — what it concludes from what it sees           | **93**  | proposed                               |
| The rest of the life — domains and progression           | **94**  | proposed                               |
| **Advancement and revision**                             | **95**  | proposed — carries the settled #6/#7   |
| **Expectation and reconciliation**                       | **96**  | proposed                               |
| Longitudinal inference — D-172's mechanism               | **97**  | proposed                               |
| _(98–100 reserved headroom)_                             | —       | —                                      |
| **Canonical Phase 10** — performance, PWA, reliability   | **101** | scope unchanged (was 92)               |
| **Canonical Phase 11** — adversarial hardening           | **102** | scope unchanged (was 93)               |
| **Canonical Phase 12** — release                         | **103** | scope unchanged (was 94)               |

### 6.1 · The two QA tracks, defined once

Every owner-facing phase below carries both. The definitions are the owner's, and
are recorded here so each phase's contract can be short.

**Ordinary-owner reality QA.** Normal product surfaces only. No QA laboratory, no
`#/qa`, no `loadInQa`, no fixture seeding, no direct record or state injection.
Every piece of meaningful evidence is created through the same controls the owner
uses. Time **may** be advanced under test control; manufactured history may not.
A pass is a **multi-step consequence journey** across at least two domains that
creates real state transitions, revisits the affected surfaces, and repeatedly
answers _"what changed because of what I just did?"_ Where the phase claims
learning or adaptation, **later behaviour must be demonstrably different because
of earlier evidence.** Open-app-see-card-click-Done-nothing-crashed is a smoke
test and is not a pass.

**The time-advance mechanism, and it is cheap — this is a verified finding.** The
whole product reads the wall clock in exactly **one** place:
`systemClock().now()` at `domain/time.ts:576`, and
the ambient-clock guard in `tests/unit/architecture-guards.test.ts` fails the
build if a second appears. (`time.ts:562` names that guard as
`no-ambient-clock.test.ts`, which does not exist — a stale citation in product
source, harmless, and worth correcting when that file is next touched.)
`MemoryProvider` captures the moment with `useState(() => clock.now())`
(`MemoryProvider.tsx:187`) and re-reads it on defined events. So Playwright's
`page.clock` — installed **before** `page.goto`, then `fastForward` plus a reload —
moves the entire product's moment, deterministically, without touching the QA
laboratory and without `travelTo`, which is a lab-only control
(`QaScreen.tsx:160`). **Proving that instrument is routing 90's first deliverable
and its own acceptance item**, separately from any product claim, because
`ROUTING_91_BRIEF.md` section 7 is right that bundling an unproven instrument with
the product whose acceptance depends on it is routing 82's failure pattern.

**Synthetic and controlled QA.** Long histories, months and years of evidence,
controlled comparison arms, calibration, combinations and lag, false-discovery
null arms, malformed and adversarial records, timezones and DST, deterministic
replay, regression matrices, and rare situations. Synthetic **supplements**
ordinary-owner QA and never replaces it for owner-facing behaviour; ordinary-owner
QA never replaces synthetic for anything requiring a history no owner could live
inside a test.

---

### 6.2 · Routing 90 — canonical Phase 9: visual coherence, motion, mobile

**Purpose.** Unchanged from plan section 54. Whole-product visual coherence, and
the owner's physical-phone gate on a product that now has a destination, a
milestone, six progress rungs, an authoring control, a second questioning surface
and a permission — **none of which has a visual language yet.**

**Prerequisites.** Routing 84 GREEN (done). No owner decision blocks it. The
D-172 hold does not gate it (`blocks_phase=91`).

**Builder scope.** Plan section 54 exactly, plus AUD-0038(a)(b), AUD-0043 and
AUD-0044, plus **two additions from this adjudication**:

1. **The ordinary-owner time-advance instrument** (6.1). Prove `page.clock` moves
   the product's moment across a block boundary, a day boundary and a week
   boundary, from a fresh store, without `#/qa`. This is infrastructure and it is
   gated on its own, before any product claim rests on it.
2. **Six additional rows on the section 54 structural accommodation list**, so the
   phone gate is not passed on a design that forecloses what follows:
   - a **cross-domain re-file option** inside a confirmation block, not a picker
     screen (this is `ROUTING_91_BRIEF.md` section 10's row, and 91 needs it);
   - an **expectation-and-reconciliation** line on an evidence surface — what the
     app said it expected, and what happened;
   - a **destination that is not moving**, readable as a state of the destination
     rather than as a new card;
   - **six emotional dimensions rendered as six independently-unknown readings**,
     with no arrangement in which they could be summed or averaged;
   - a **twelfth domain page** in navigation (D-168), designed even if unbuilt;
   - a **research-attributed sentence** distinguishable at a glance from a
     sentence about him, if blocking decision 2 is answered yes.

**Ordinary-owner QA contract.** From a fresh store on a real phone: reach Now,
answer a discovery question, author a destination in one domain and a milestone
under it, receive a move that serves it, start it, be interrupted, come back,
complete it, answer the outcome question, then **advance a day** and confirm the
same move does not read as already done (D-160's defect, on the phone this time),
and that the domain page shows the milestone unreached. Then repeat the first
half in a second domain and confirm Life reads as direction rather than recency.

**Synthetic QA contract.** The full copy catalogue at every rendered branch;
the block sweep; three widths plus the Android context; long-history render
performance; the accommodation list asserted as reserved shapes rather than as
built features.

**Completion condition.** Owner physical-phone approval; the accommodation list
intact; the owner-use review's section 11.8 acceptance questions run for the
first time; the time-advance instrument proved independently.

**Not in this phase.** No new concept. No new intelligence. No destination
semantics. No forecast surface. No emotional dimensions **built** — only room left
for them.

---

### 6.3 · Routing 91 — semantic capture and clarification

**Purpose.** Make the words the owner types mean something. `ROUTING_91_BRIEF.md`
rules that semantic capture is _"routing 91 package 1, first, and its gate is its
own"_, that it may not be closed by D-172's adjudication and that D-172's
adjudication may not absorb it. **This adjudication honours that literally by
making it the whole of routing 91**, and moving the rest of Reach to 92.

**Prerequisites.** Routing 90. Nothing else — verified independent of S1, S2 and
S3, and the brief's finding stands that D-025 blocks a network call to a model,
not interpretation: the only `fetch` in `src/` is a same-origin `build-info.json`
read. **A deterministic capture-time interpreter needs no secret and no network.**

**Builder scope.**

1. A **second producer of `AuthoringProposal`** that reads words rather than a
   kind-picker, alongside `proposeDestination()` (D-188), obeying the brief's seven
   rules: proposed and never asserted; the owner's wording preserved byte-identical;
   a derived meaning is a `provenance: 'derived'` sibling row (D-143), never a
   replacement; cross-domain meaning proposed or clarified, never assumed;
   `unknowns` explicit; the private boundary is D-167's; no score (D-162).
2. **Close correction 3.6's gap, which is CASE A's real test.** A destination with
   no milestone creates a `destination` entity no generator consumes. Either the
   clarification must reach a milestone, or the bare aim must reach Now some other
   way. **Naming which, and proving it, is this phase's hardest item** and it is
   the difference between shipping interpretation and shipping a better-worded
   string.
3. **Consolidate the private boundary** where interpretation touches it — the five
   permission-blind sites from correction 3.11 — so that "private text never
   reaches the interpreter with D-167 off" is a property, not a convention.

**Ordinary-owner QA contract.** Fresh store, no laboratory. Open Insights, meet the
Career aspiration question, type **"More money"**, and:
(a) a proposal names Money or asks which; (b) after confirming, the stored aim reads
back byte-identically as _"More money"_; (c) `unknowns` names what was not concluded;
(d) exactly **one** concrete clarification is offered, not three; (e) decline the
interpretation and confirm the aim survives with no derived record; (f) redo it,
accept, and **Now produces a move it did not produce before** — the strongest single
test on the list; (g) advance three days and confirm the interpretation is not
re-proposed; (h) with the private permission off, enter private text and confirm no
interpretation of it appears anywhere. Then the same journey in a second domain with
a differently-shaped phrase, to prove the interpreter is not one hard-coded case.

**Synthetic QA contract.** Byte-identity of stored wording across every phrase in
the copy library; `provenance: 'derived'` on every derived row; a digest assertion
that private material is absent from the interpreter's input, asserted on the
digest's contents rather than on rendered copy; adversarial phrases — empty,
whitespace, a single character, thousands of characters, mixed-domain,
contradictory; and the null case, where an unambiguous phrase produces **no**
clarification at all.

**Completion condition.** All eight CASE A acceptance tests, from a fresh store, in
a browser that has never opened `#/qa`, plus (f) proved in two domains.

**Not in this phase.** **CASE B, explicitly.** The brief is right that capture
without enforcement produces the worst outcome available — the app says it
understood and offers the walk again tomorrow at full score. No model, no hybrid,
no network, no inference over history, no widened vocabulary beyond what the
interpreter itself needs, no emotional dimensions.

---

### 6.4 · Routing 92 — Reach: what the brain can see

**Purpose.** The audit's package 1, plus the vocabulary this adjudication approves.
Make what the product already holds reach a decision, and add only the concepts a
broken decision is verifiably waiting on.

**Prerequisites.** Routing 91. **Q8 is answered** (D-167 shipped), so the audit's
own precondition for AUD-0040 is met.

**Builder scope.**

- **AUD-0040 first, with the structural discretion guard** — `assembleSituation`
  becomes registry-driven instead of a hand-written list of nine reads. This is the
  change that makes every other row in this phase cheap, and the audit is explicit
  that it goes first.
- **AUD-0041** — `ask.materialToDecision` becomes verifiable rather than asserted
  (wrong in four of fifteen cases).
- **AUD-0011 including D-166's six emotional dimensions** — mood, stress,
  motivation, confidence, loneliness / social connection need, mental overload.
  **Eight since D-293** (irritation and focus added 2026-09-04). Distinct,
  independently unknown, **never composited into a wellness score**
  (**D-287** approves a separate 0–100 **state reading** with learned weights —
  a thermometer, not a verdict, and it acquires no quality adjective), not all
  asked on any day, free
  text coexisting. **And correction 3.15's stale comment corrected as part of it.**
- **AUD-0006** (usable time is mis-namespaced and mis-filed), **AUD-0012** (money
  dormant), **AUD-0013** (social fires only after he says he feels sociable),
  **AUD-0047** (the relationship graph only the laboratory reads — **suppress
  only, never rank**), **AUD-0045 with per-object size and demand as its stated
  precondition**, **AUD-0050's retraction half**.
- **S1a — the outcome horizon**, per 5.1, with the migration rule and the
  byte-identity replay.
- **S2 Tier 1 and Tier 2**, per 5.2, each carrying privacy class, verifiable `ask`,
  a registry reader and a freshness horizon.
- **The five permission-blind sites consolidated** (correction 3.11).
- Owner-use findings: **F12**, **F19** (reach half), **F27**, **F30** (consent
  granularity), **F32** (retraction and backfill), **F36** (observation breadth).

**Settled by the owner-decision sequence (§13B, §13C, §13F):** S2 **Tier 1 + Tier
2** confirmed and **Tier 3 deferred to routing 97**; each new askable concept
ships **only with its consumer** (D-166's six dimensions split per consumer —
loneliness via AUD-0013, overwhelm via the capacity limiter, motivation and stress
conditional, **mood not askable here**, **confidence deferred to 94**);
`work.strain` wired to the existing `Capacity` consumer; the **starvation QA gate**
with its closed exemption registry; the **guide performance work** — pre-filter and
incremental probe, shipped here rather than deferred to 101; **research priors,
option B only**, inside the existing discovery agenda; and
**`life-context-change`** as a vocabulary item to be brought back as its own
decision once the concept exists.

**One coupling the builder must decide deliberately rather than discover.**
`trajectoryCards` gates on `definition.tracked` (`insights.ts:1815`), not on
`standing` — the D-089 repair moved it there on purpose. So **giving any of D-166's
six dimensions a `tracked` scale automatically produces a trajectory card for it**,
one per dimension. That is not a violation — six separate cards is the opposite of a
composite, and it is arguably the whole value of making them distinct — but it is a
new owner-facing claim per dimension, arriving as a side effect of a schema choice.
It must be an explicit decision in the phase with copy written for it, not a
surprise found in QA. The same coupling applies to every Tier 2 concept given a
`tracked` scale.

**Ordinary-owner QA contract.** Fresh store, two domains, across simulated days.
Record an emotional reading on two of the six dimensions and confirm the other four
read as unknown on the domain page and **nowhere aggregates them**. Confirm a
decision's fact list now contains a concept that was previously inert — the same
journey run before and after the concept exists must produce a visibly different
fact list. Record a **must-stay** blocker on a walk; confirm the walk is not
re-offered while the constraint stands, and **is** re-offered after lifting it with
_"Not true any more"_. Advance a week and confirm the app is **not asking more
questions than it was on day one**. Author a movement routine other than a walk and
confirm physical health can suggest it.

**Synthetic QA contract.** The audit's own Reach gate, unchanged: a **privacy
guarantee** — structurally impossible, not merely conventional, for an explanation
or evidence panel to render a `private` reading — and a **no-added-noise check**:
making dormant concepts live must not increase how often the app speaks, measured
across the whole scenario library. Plus S1a's byte-identity replay under both
horizon enums, D-064's four conditions proved unchanged, and every new concept
proved to reach a decision or proved to be honestly declared non-decisional.

**Completion condition.** Both gates above; every Tier 1 and Tier 2 concept
reaching a decision or declared non-decisional with a test behind the declaration;
question volume across the library not higher than before.

**Not in this phase.** No new conclusions from evidence — that is 93. No blocker
**enforcement**, only the concept and the attribute that make it possible. No
domain progression models. No inference mechanism. No forecast, expectation or
revision.

---

### 6.5 · Routing 93 — Validity: what it concludes from what it sees

**Purpose.** The audit's package 2. The app cannot widen what it learns over a
concept it cannot read, which is why this follows 92 and not the reverse.

**Prerequisites.** Routing 92.

**Builder scope.** **AUD-0042** (observe-first reaches three verbs of fifteen),
**AUD-0029** (month and season scale — S1b), **AUD-0007** (rhythm and heavy
season), **AUD-0009** (recovery over several nights — **C8, and S1a's acceptance
case**), **AUD-0010** (career study has no schedule), **AUD-0022** (two moves that
are the same thirty minutes), **AUD-0025** durable shown-ledger, **AUD-0030(a)**,
**AUD-0038(c)**, **AUD-0019** (nine identical evenings), **AUD-0051** (when and
where). Plus owner-use **F03** (a strategy must be able to fail), **F08** (blocker
aggregation), **F09** (a carried intention's fate), **F14** (maintenance versus
advancement), **F18** (pattern to changed approach), **F31** (reorientation),
**F34** bounded (the review loop on Insights and domain pages — D-169), **F42**,
**F44** bounded (the measurable half only).

**Added by the owner-decision sequence:** the **maintenance-probe regression,
five arms** (§13E.1) — ignore path, response path, loop close, null arm, and the
thread-fit bound arm. **Regression coverage only: no scoring package, no new
dimension, no urgency change, no separate scoring decision.** And **AUD-0030(a)**
is confirmed wanted (§13F) — the import screen states plainly which families came
across as history and which did not.

**F14 is no longer in this phase.** It moved to routing 95 when owner decisions #6
and #7 were settled: F14 (maintenance crowding out advancement) and C13's minimum
subset are **the same axis** — the negative and descriptive halves of one thing —
and they need the same domain delivery policy and the same anti-shame gate.
Splitting them across two phases would build that policy twice and run the human
wording gate twice on one sentence class. See section 13A. Plus **C21's enforcement half**: reverse
`constraints.ts:25-28`'s shown-never-enforced rule for **registered blocker
concepts only**, and **C14's bands**, with histories built to land at each band.

**This phase is the largest and the most likely to run long.** Section 11 gives it
an explicit split rule.

**Ordinary-owner QA contract.** Across three simulated weeks, two domains. Record
three consecutive poor nights and confirm the guidance differs from one poor night,
**and that the app says so from his record rather than from a rule**. Record a
recurring blocker on the same move three times and confirm the app stops offering
it and says what it learned. Set a milestone, work at it for two weeks, then stop;
confirm the app can say the strategy is not moving. Complete the same move at four
different hours in one day and confirm it is not offered four times (AUD-0025).
Confirm the confidence wording visibly differs between a two-occasion history and a
twelve-occasion one, on screens the owner actually reads.

**Synthetic QA contract.** The audit's Validity gate, unchanged: scoring and
learning correctness — every belief that moves is accounted for, scenario diffs read
rather than rubber-stamped, plus the standing copy guards. Plus long histories at
each confidence band; comparison groups honest at every horizon; timezone and DST
across a week and month boundary; nine-month histories for season-scale reading;
and **D-137/D-138's re-cut instrument and re-baselined tournament proved
undisturbed.**

**Completion condition.** Both gates; C21's enforcement proved by reintroduction —
put the non-enforcement back and watch the test fail; no scoring dimension added
and no weight moved without an explicit decision.

**Not in this phase.** No new domain. No forecasting, expectation or revision. No
open-space search. No emotional composite, ever.

> **The last two clauses are superseded for the campaign as a whole — D-287 and
> D-288, owner-decided 2026-09-04.** They remain true _of routing 93_, which is
> submitted and unchanged. They are no longer true of the roadmap: an overall
> **state score** (D-287) and a **forecast** (D-288) are approved and are routing
> 94's and 97's work. The rule that keeps the forecast honest is the owner's own —
> _questions are for facts; the forecast is the only place the app may assume_ —
> and every **reading** stays bound by G-009 exactly as before.

---

### 6.6 · Routing 94 — the rest of the life: domains and progression

**Purpose.** The predecessor's largest deliberate deferral, now due. Twelve
domains, eleven pages, and a destination shape proved on three of them.

**Prerequisites.** Routing 93. **Owner decisions 1 (C19), 4 (C16) and the domain
ordering** must be answered before it is specified in detail.

**Builder scope, in two clearly different sizes** — correction 3.5:

- **Cheap: domains that already have a candidate generator** — Sleep, Fatherhood,
  Social, Home. A `PROVING_DOMAINS` row, a `MILESTONE_ENTITY` row, and
  domain-appropriate progress evidence. F20, F24, F25, F29.
- **Expensive: domains with no generator at all** — Emotional, Faith, Private,
  Long-Range Direction, and **Romantic which does not exist yet** (D-168). Each
  needs a generator before a destination can change anything. **D-170's Faith
  requirement is in this class**, and its bound is D-170's own: participate in
  destination, discovery, practices, reflection, strategy and pattern learning;
  never manufacture certainty, grade faith, treat doubt as failure, or become a
  devotional app by default.
- **D-168's twelfth domain page** — Love / Dating / Romantic Life. Not filed under
  Social, not under Private. AUD-0047's rule binds: a quality signal may **only
  suppress, never rank**. No date quota, no partner score, no compatibility
  percentage, no ranking of people.
- **C17's progression model** — confidence, comfort and transfer as capability
  evidence rather than as appetite (F25).
- **C16's Fatherhood destination**, with every existing protection intact, and its
  scope depending entirely on owner decisions 1 and 4.

**Added by the owner-decision sequence (§13D, §13E, §13G) — all nine land on the
Fatherhood slice, and §11B sizes the consequence:** the `development-skill`
ordinary-use authoring route with its behavioural acceptance test; the
`about-person` relationship-correctness repair; the near-duplicate guard through
`AuthoringProposal.problems`; **C's scaffolding guidance**; the **help-ladder
reader — form (b), the "closer" register**; the **two-class growth-opportunity
cap** with its after-evaluation placement and trace-integrity requirement;
**Adaya's birthdate** as one durable question; and the **generation-time normative
suppression filter**, which may never render a norm statement anywhere and must be
a `continue` rather than a dimension or a rejection.

**This phase runs as three internal cycles under one routing integer — see §11B.**

**Ordinary-owner QA contract.** Fresh store. Name an aim in a domain that has never
had one, in **three** different domains including one with no prior generator, and
prove Now changes in each. Confirm a romantic aim is not filed under Social and can
reach a move. Confirm time with Adaya remains a first-class move, **separate from
working on something with her** — the audit's protected item, which a teaching
feature is the likeliest thing to erode.

**Synthetic QA contract.** Each domain's progress evidence proved
domain-appropriate rather than a generic template rendered eleven times. **The
child guard proved by reintroduction in every one of the five test files that carry
it** — put a rate, share, rank or grade about her back in and watch the build fail.
No score, percentage, bar, rank or grade about the owner on any surface, swept
across all twelve domains.

**Completion condition.** Every domain either has a destination that can reach Now,
or is explicitly and truthfully declared as inspect-and-record with a reason on the
page — **D-170's rule generalised: a deliberately passive domain must say it is
passive, so passivity cannot harden into the design by silence.**

**Not in this phase.** No revision loop. No inference. No forecasting. And **nothing
about the child changes** unless owner decision 1 says so.

---

### 6.7 · Routing 95 — advancement and revision

**Purpose.** Two things the product has never done: say when the owner is
**genuinely becoming more capable**, and notice that a destination has stopped
moving. Both are settled owner decisions — **#7 and #6, section 13A** — and both
are record-factual, owner-initiated and governed by one delivery policy, which is
why they are one phase.

**This phase carries the gap the predecessor named first and nobody owned.** _A
destination the system can only receive is a form._

**Prerequisites.** Routing 94 (destinations across the life), routing 93 (longer
horizons and honest comparison). **Owner decisions #6 and #7 are settled**, so
nothing in this phase is blocked on the owner.

**Builder scope, in package order. Package 1 is first and absolutely so.**

1. **The C13 minimum subset — advancement.** Rung advancement (is evidence
   arriving at higher rungs than in a comparable earlier window), and new ground
   versus repeatedly reaching the same ground. Plus the settled subject-eligibility
   rule, the domain delivery table, the frequency bounds and the known-incomplete
   correction — all of section 13A. **This package is what makes the phase worth
   running even if nothing after it lands.**
2. **F14 — maintenance crowding out advancement**, moved here from routing 93. The
   negative half of package 1's axis, sharing its policy and its gate.
3. **Destination revision.** A destination with no movement over a real span; two
   destinations that do not fit the hours in a week; a destination whose evidence
   has gone quiet; a milestone repeatedly re-dated. Detected and **said in the
   settled grammar**, never silently altered — the owner revises, the app notices.
4. **F03's verdicts and F18's link**, which close here rather than in 93 because a
   strategy fails against a destination and the revision loop is what reads it.

**One verified implementation fact, recorded so it is not discovered mid-phase.**
There is **no per-entity progress index today**: `progressReading(situation,
domains)` groups by **domain**, and `ProgressEntry.about` is a display label
derived from the first resolvable entity on the record, not a key. Records already
carry `entities: EntityRef[]` on the envelope, so grouping by entity ref is a
**small selector — no schema change and no authoring change** — but it is real
work and it is package 1's first task.

**Ordinary-owner QA contract.** Across **eight simulated weeks**, from a fresh
store, in at least two domains of different delivery tiers. Author a destination
with a milestone in Career and a routine in Fatherhood. Work at the Career one
until evidence appears at a higher rung, and confirm the app says so — on the
domain page, naming the typed subject, never the destination. Neglect the
Fatherhood routine past 28 days and confirm the app says only what the record
holds, on the domain page and never on Now. Answer the accompanying revision
question and confirm it is not re-asked. Then trigger the **known-incomplete
correction** — _"I've been doing this, it just isn't written down"_ — and confirm
the span goes from empty to unknown: no stagnation statement, and **no advancement
statement either**. Advance past 60 days with nothing new and confirm **nothing
repeats**. Confirm no statement ever names a destination or a bare goal as its
subject, and that Private says nothing on any surface.

**Synthetic QA contract.** Nine-month histories where rung composition plainly
advances and the app must say so; mirror histories where it plainly does not and
the app must stay quiet; the **null arm**, a history with no stagnation, in which
the app raises nothing at all. Plus the closed structural assertions: an exhaustive
`Record<EntityKind, …>` subject table proved to fail the build on an unclassified
kind; no composed statement carrying a subject outside the permitted set; no
statement whose grammatical subject is "you"; no rendered zero count and no
denominator; at most one domain named per statement; suppression proved for every
declared-constraint class; and the frequency bounds proved at 27, 28, 59 and 60
days.

**Completion condition.** Earlier evidence demonstrably changes a later statement,
proved from a near-empty store. Nothing anywhere emits a rate, score, percentage,
rank or grade about the owner. Every statement passes the anti-shame reading **on
the ordinary-owner track and the phone gate** — not a scanner.

**Not in this phase.** No forecast. No steering on a prediction. No named
expectation or reconciliation — that is 96. No score. No open-space search. No
inferred milestone difficulty. No breadth or transfer claims.

---

### 6.8 · Routing 96 — expectation and reconciliation

**Purpose.** The bounded successor to forecasting (section 5.3): the app states
what it **expects**, records it, and reconciles it against what actually happened —
which is always scoreable, because the occurrence it is about really occurs.

**Prerequisites.** Routing 95. Separated from it deliberately: this is a **new
claim class** and 95's is record-factual, and the split is where 95's own package
rule bites.

**Builder scope.**

1. **The named expectation.** What is expected, of which move, over the horizon the
   outcome already uses, in the existing evidence-sufficiency words, with what
   would change it — section 22's five requirements, all satisfiable.
2. **Reconciliation**, and the app **noticing it was wrong**.
3. **C14 made owner-visible** for the owner's own data. **Not** for anything about
   the child: that confidence stays internal (D-112 / AUD-0049).

**Ordinary-owner QA contract.** Accept an expectation the app names, let the
evening go badly, and confirm the app reconciles what it said against what happened
on a surface the owner would actually open. Repeat until an expectation has failed
three times and confirm the confidence wording visibly weakens.

**Synthetic QA contract.** Reconciliation scored across hundreds of expectations to
show the wording tracks the record; histories where the expectation was right and
the wording strengthens; and a null arm where the app expects nothing.

**Completion condition.** An expectation that failed repeatedly demonstrably
changes what the app says next. No forecast about a day that has not happened.

**Not in this phase.** No steering (C11 is refused). No forecast clause on Now
(C12 falls with it). No advancement work — that shipped at 95.

---

### 6.9 · Routing 97 — longitudinal inference: D-172's mechanism

**Purpose.** D-172's question, answered at the point where the space is worth
searching: _"how can this system discover hypotheses, combinations, sequences and
potentially important variables that were not manually hardcoded in advance?"_

**Prerequisites.** Routing 92 and 93 absolutely. **This is the load-bearing
sequencing judgement of the whole document.** D-172 is currently held against
routing 91, which today means it must be adjudicated over a space of six tracked
concepts and two horizons. **Widening the space is half of D-172's own answer**, and
it is Reach. Deciding the search mechanism first would spend the campaign's hardest
remaining decision on a room with nothing in it.

**Recommended answer to D-172, and it is a technical judgement, not an owner
one:** **a bounded deterministic mechanism first, with model assistance held as a
named, pre-specified fallback.** Reasons: D-024 recorded that `hybrid` and
`deterministic` chose identically on all ten golden profiles; D-025's blocker is a
hosting account and a secret, which is an owner decision the product does not
otherwise need; and the honest test of whether rules can do hypothesis generation
over a widened space has never been run, because the space has never been widened.
**Run it.** If the bounded mechanism cannot generate a hypothesis a human did not
plant, that is evidence — and it is the evidence D-025 itself said it would take.

**Builder scope.** Multi-factor comparison with an explicit **multiple-comparisons
discipline** — C3's requirement, and a discipline this product has never needed
before. Combination and sequence search over the widened vocabulary. Lag. Every
existing `association.ts` guard preserved, and D-172's seven non-negotiables intact:
provenance, uncertainty, privacy including D-167, owner correction, deterministic
safety constraints, association never causation (D-089, D-091), and **no silent
canonical facts from inference — an inference is a conclusion with its evidence
attached, never a recorded truth.**

**The kill criterion, declared before the build.** If the **null arm** cannot be
made to produce zero findings while the true-positive arm produces any, the
mechanism is **abandoned rather than tuned.** A discovery engine that finds patterns
in noise is worse than none, and tuning thresholds until the null arm goes quiet is
how a false-discovery machine is built by well-meaning people. Writing the kill
criterion down before the phase starts is what makes this phase falsifiable.

**Ordinary-owner QA contract.** Over twelve simulated weeks of genuinely
owner-created evidence across three domains, the app surfaces a relationship the
owner never told it to look for, **with its evidence and a counterexample shown**,
and the owner can disagree with it and see the disagreement take effect.

**Synthetic QA contract.** The **false-discovery arm is the gate**: many null
histories, no findings. Comparison groups honest at every horizon. Multiple-comparison
correction proved to bite by removing it and watching false findings appear.
Adversarial histories designed to manufacture a pattern.

**Completion condition.** The null arm is clean, or the mechanism is abandoned and
that is written down as the phase's result. **A phase that honestly concludes "this
cannot be done well here" is a successful phase.**

**Not in this phase.** No forecast. No steering. No new vocabulary. No new domain.

---

### 6.10 · Routing 101, 102, 103 — canonical Phases 10, 11 and 12

**Scope unchanged. Only the routing label differs, exactly as when canonical Phase
10 became 92 — D-109 stands.** They are listed here only because the two QA tracks
apply to them as well and because 102 acquires one input.

- **101 — canonical Phase 10.** Plan section 55, unchanged: startup, caching,
  service-worker update behaviour, offline shell, lifetime-history performance,
  restore progress, malformed records, browser lifecycle, long-history load,
  interruption resilience. Plus **F37's reliability half.**
  _Ordinary-owner QA:_ from a store built by ordinary use across simulated months,
  close the browser mid-guide and reopen; run a backup and a restore and confirm the
  record is the same afterwards; confirm the app is still responsive at that history
  size on a phone. _Synthetic QA:_ multi-year synthetic loads, malformed records,
  stale service worker, cross-tab races.
- **102 — canonical Phase 11.** Plan section 56, unchanged. **It additionally takes
  the nineteen deferred instrument findings** from `qa/INSTRUMENT_HARDENING_BACKLOG.md`
  as a standing input (section 9). Its question — _can interactions across phases
  break it?_ — is exactly the question those nineteen findings are about, and a
  proven list of ways to fool the guards is the best brief the phase could have.
  This does not reopen D-210: they arrive as 102's scope, not as 84's.
- **103 — canonical Phase 12.** Plan section 57, unchanged, including the release
  integrity check D-211 added.

### 6.11 · What must happen to the D-172 hold, and it is the owner's to do

`CAMPAIGN_HOLDS.md` declares `blocks_phase=91`, and correction 3.14 shows the match
is exact-integer. Under this roadmap, **routing 91 becomes semantic capture, which
`ROUTING_91_BRIEF.md` explicitly says D-172 may not close and may not absorb**, and
the work D-172 is actually about moves to **97**.

If the roadmap is approved and nothing else is done, **the hold would sit on a phase
it was never about and release the phase it was.**

The owner must therefore, at approval time and not before:

- **add** `<!-- lco:decision id=D-172 status=open blocks_phase=97 -->`;
- **decide separately** whether D-172 should also continue to hold 92 (Reach), given
  that widening the vocabulary is half of D-172's own answer. **Recommendation: no.**
  Reach is the answer to D-172's first half and holding it hostage to D-172's second
  half is backwards;
- **not delete** the existing line to release 91. Deleting a declaration does not
  release a hold — `not declared + cache holds` is a **BLOCK** showing the record as
  missing. Releasing takes two deliberate acts: `status=resolved` in the file **and**
  `campaign_holds.resolve(config, "D-172")`.

**This document does not touch `CAMPAIGN_HOLDS.md` and must not.**

---

## 7 · Capability disposition

Every structural layer and every capability row, with the corrected status.
**BUILD · PRESERVE · BOUND · DEFER · REJECT · SEPARATE PRODUCT · OWNER DECISION.**

| #       | Capability                                                                | Disposition                                               | Phase                          | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1a** | Outcome-judgement horizon                                                 | **BUILD, BOUNDED**                                        | 92                             | Real, unowned, small: one union, eight consumers. Bounded at `weekly`; `monthly`/`seasonal` refused as judgement horizons because a lifecycle keyed to a day cannot settle them and no evidence supply would score them. Generalise `CourseReflection` rather than invent a mechanism (3.2).                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **S1b** | Week / month / season reading                                             | **PRESERVE**                                              | 93                             | Correction 3.1: already AUD-0029 + AUD-0007 + AUD-0009 in Validity. It does not need inventing, it needs building where it sits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **S2**  | Wider vocabulary                                                          | **BUILD, OWNER-RESOLVED (#3), bounded**                   | 92                             | **Settled §13B: Tier 1 + Tier 2 approved, Tier 3 deferred to 97.** `QUESTIONS_PER_DAY = 3` locked; each askable concept ships only with a consumer; D-166’s six split per consumer, mood not askable in 92 and confidence to 94.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **S3**  | Forecasting                                                               | **REJECT this generation; BOUND a successor**             | 96                             | Section 59 makes it a reversal, not a hurdle (3.4). A forecast that cannot be scored is a confident sentence. The **named expectation** delivers the falsifiable half and is approved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **C1**  | Semantic capture and clarification                                        | **BUILD**                                                 | **91**                         | The brief's rule honoured literally: it is the whole of 91, with its own gate. It is what the owner is feeling now, and correction 3.6 is its hardest and most valuable item.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **C2**  | Open-space longitudinal inference                                         | **BUILD, LAST, with a kill criterion**                    | 97                             | The owner's top-ranked wish and the thing rules are structurally worst at. But it must search a space with something in it. Deterministic-bounded first, model-assist as a named fallback, null arm as the gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **C3**  | Combinations, sequences, lags                                             | **BUILD with a correction discipline**                    | 97                             | Four factors across five horizons is 20+ tests; some will look significant by chance. The multiple-comparisons discipline is not optional and is the phase's real content.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **C4**  | All-domain understanding                                                  | **BUILD, split by size**                                  | 94                             | Correction 3.5: cheap for four domains that have a generator, new architecture for five that do not. Sizing it as one job is how it becomes a mega-phase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **C5**  | Emotional / state modelling                                               | **PRESERVE — approved, unbuilt**                          | 92                             | D-166. Six dimensions, distinct, independently unknown, never composited. A single `emotional.score` is the wellness score by the back door and is forbidden. Correction 3.15's stale comment goes with it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **C6**  | Learning progress, retention, transfer                                    | **PARTIAL — PRESERVE; spaced retrieval SEPARATE PRODUCT** | 93                             | Correction 3.3: the rungs ship and are asked at 3 and 10 days. **Settled §13G.1.3: the app does not test her, and system-directed teaching is declined.** What is absent is aggregation, not the evidence kind.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **C7**  | Nutrition, food, caffeine, hydration                                      | **SEPARATE PRODUCT (food) / DEFER (the rest)**            | —                              | Section 12. The highest-frequency, highest-friction capture in the whole matrix, aimed at the strongest folk-causal prior, over an engine with no multiple-comparisons discipline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **C8**  | Sleep and recovery, long horizons                                         | **BUILD**                                                 | 93                             | AUD-0009 already. The safest horizon-dependent capability and **S1a's acceptance case**, exactly as the matrix recommends.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **C9**  | Same-day → monthly effects                                                | **= S1a + S1b**                                           | 92, 93                         | Not a separate capability. Split per 5.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **C10** | Forecasts / predictions                                                   | **BOUND to the named expectation**                        | 96                             | Everything section 22 requires, plus the thing a forecast could not have: it is always scored, because the occurrence it is about actually happens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **C11** | Steering on a forecast                                                    | **REJECT**                                                | —                              | Unfalsifiable by construction: steering away from a predicted bad day makes the prediction unobservable. Not an evidence problem; more data would not fix it. A system built to revise its model of him must not contain a component immune to revision.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **C12** | Explaining the intervention                                               | **REJECT with C11**                                       | —                              | Falls with C11, and Q9's single additional clause is better spent on the maintenance-versus-advancement distinction that plan section 54 already reserves it for.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **C13** | Sustainable **and increasing**                                            | **BUILD — OWNER-RESOLVED (#7), bounded**                  | **95, package 1**              | **Settled yes, section 13A.** The product explicitly helps the owner keep becoming more capable, qualitatively: **rung advancement** and **new ground versus repeatedly reaching the same ground**. Refused within it, on technical grounds independent of D-162: any rendered capability score, percentage, rate, rank, grade or acceleration figure. **Correction to this document’s first draft:** D-162 forbids the rendered _figure_, not the capability — `trajectoryCards` already computes a normalised rate of change and deliberately renders none (`insights.ts:1899-1902`). Deferred: inferred milestone difficulty, and breadth/transfer until its upstream evidence and domain dependencies exist. |
| **C14** | Confidence calibration                                                    | **BUILD bands; DEFER calibration**                        | 93, 96                         | Bands are evidence sufficiency and are honest today. True calibration needs scored predictions; the named expectation supplies the only honest version. Owner-visible for his own data (95); internal for the child, **D-112 / AUD-0049 not D-193** (3.7).                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **C15** | Research-grounded priors                                                  | **BUILD — OWNER-RESOLVED (#2), Option B**                 | 92                             | **Settled §13C: Option B only.** Priors may aim what is asked and never become findings, rank, or determine recommendations. Self-extinguishing: the owner’s answer replaces the prior. **C declined because sparse evidence makes its decay guard unreachable; D declined.**                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **C16** | Fatherhood capability support                                             | **BUILD — OWNER-RESOLVED (#4), bounded**                  | 94                             | **Settled §13E: B-owner-directed + C.** The owner names the growth area; the app helps pitch assistance using the help ladder it already records. Two-class growth-opportunity cap protects `time-with`. **B-system-directed and E declined at Q1 (§13G).**                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **C17** | Social / charisma / romantic progression                                  | **BUILD**                                                 | 94                             | D-168 is approved and unbuilt — a live C22 item. AUD-0047's rule binds absolutely: suppress, never rank. No person is scored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **C18** | Peak-performance state / score                                            | **DEFER — hurdle unmet, not prohibited**                  | —                              | Section 22 leaves the door open and the door stays open. A composite over six tracked concepts across eleven domains would name nothing. Revisit after 93.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **C19** | Child progress semantics — **REDRAWN by D-291, see note below the table** | **PRESERVE — OWNER-RESOLVED (#1), Choice A**              | —                              | **Settled §13D: not reversed.** No rate, share, percentage, grade, rank or numeric summary about Adaya. D-070, D-112, D-117, D-135, D-136 stand. **The #6/#7 subject rule does not protect this boundary — C19 remains independently load-bearing.** The real gap is the discarded help ladder (form b, routing 94).                                                                                                                                                                                                                                                                                                                                                                                             |
| **C20** | Recommendation diversity                                                  | **PRESERVE — approved, unbuilt**                          | 92                             | AUD-0045 + D-113, high priority, with per-object size and demand as its stated precondition. `A_WALK` is still the only movement subject (`candidates.ts:627`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **C21** | Blocker enforcement / adaptation                                          | **BUILD, split**                                          | 92 (concept), 93 (enforcement) | Correction 3.15's nuance: it already suppresses the question and never changes the move. Needs a registered concept (92) before the rule can be reversed (93). The owner's own CASE B.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **C22** | Existing Reach / Validity at risk                                         | **PRESERVE — all 20**                                     | 92, 93                         | Section 9 is the map. Nothing disappears.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Three rows in that table were changed on 2026-09-04 — D-287, D-288, D-291

**C10 — forecasts.** No longer bound to a named expectation. **D-288 approves a
state forecast** — today and roughly seven days out, from his own patterns, shown
with its confidence from day one. It moves from routing 96 to **routing 97** under
D-292's shift and its §6.x contract is re-derived rather than reused.

**C11 — steering on a forecast. The rejection was right, and it survives as a
design constraint rather than as a refusal.** Its reasoning is exact:

> _"Unfalsifiable by construction: steering away from a predicted bad day makes
> the prediction unobservable… A system built to revise its model of him must not
> contain a component immune to revision."_

The owner asked for a forecast he can bend — _"unless I start doing things to
improve"_ — which is precisely the loop C11 names. **The resolution is that the
forecast is a no-intervention baseline:** it predicts what happens _if he does
nothing_, so acting on it is a deliberate departure rather than a contamination,
and **it is scored only on the occasions where nothing was done.** D-288 requires
the accuracy record to be shown with its misses; C11 is what determines which
occasions may honestly appear in it. **A forecast that cannot be scored is not
approved by D-288**, and C11 is the reason.

**C19 — child progress semantics.** Redrawn by **D-291**: the prohibition applies
to any figure about Adaya measured against something **outside the owner's own
record** — a norm, an age expectation, another child, or a list whose provenance is
not his. Counts against a list he authored are permitted, rendered as counts and
never as a bare percentage or progress bar. **§13G's suppression-only rule and
every prohibition on norms and comparisons stand exactly as written.**

---

## 8 · Existing decision reconciliation

**Preserved, unchanged, and load-bearing for this roadmap.** D-018, D-021, D-024,
D-036, D-043, D-045, D-047, D-052, D-053, D-061, D-063, D-064, D-070, D-073,
D-075, D-077, D-078 (as amended by D-168), D-080, D-082, D-083, D-084, D-087,
D-089, D-090, D-091, D-092, D-101, D-109, D-111, D-112, D-113, D-117, D-129,
D-133, D-134, D-135, D-136, D-137, D-138, D-143, D-147 (as amended by D-180),
D-149, D-153…D-157, D-158, D-160, D-161, D-162, D-163, D-164, D-165, D-166,
D-167, D-168, D-169, D-170, D-171, D-173…D-186, D-187, D-188, D-189…D-208,
D-210, D-211. **Everything in the audit's DO-NOT-CHANGE list carries forward
unchanged**, and everything in `PRODUCT_ADJUDICATION.md` section 11's additional
protection list carries forward unchanged.

**Amended — the decision stands and gains a clause.**

| Decision  | Amendment                                                                                                                                                                                                  | Why                                                                                                                                                                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-159** | Routing integers must **increase monotonically in execution order**, not merely exceed 82. And the map changes: canonical 10/11/12 become **101/102/103**; new intelligence phases take 91–96.             | Correction 3.13. `routing_ceiling()` keeps only the maximum phase with a QA report, so an integer below the current ceiling never routes, silently. D-159 states only the lower bound. **D-109 stands: canonical Phase 10's scope is unchanged by its label, exactly as it was when it became 92.** |
| **D-161** | Extends from record-kind reachability to **screen** reachability: a capability is proved in a browser that has never opened the QA laboratory, with time advanced by test control and never by `travelTo`. | `ROUTING_91_BRIEF.md` section 7's requirement, now feasible: correction in 6.1 shows exactly one wall-clock read in the whole product, so `page.clock` moves the product's moment deterministically.                                                                                                |
| **D-162** | Explicitly binds the **named expectation, C13's wording, and every stagnation sentence** in routing 95, and every advancement sentence in 13A.                                                             | A phase whose subject is _"is this still working"_ is the next place a percentage arrives looking reasonable. The predecessor said this about routing 84 and was right; it is truer of 95.                                                                                                          |
| **D-163** | The second agenda gains one licensed purpose: **aiming a question with a research prior** — if and only if owner decision 2 says yes, and never as a claim about him.                                      | Section 68's honest use of general evidence is to decide what is worth finding out, which is a question, not a recommendation.                                                                                                                                                                      |
| **D-164** | Extends from "asked when the answer has a use" to **"and the use is delivered"** once C21's enforcement lands in 93.                                                                                       | D-187 is honest today because nothing acts on a blocker. When something does, silence about it becomes a different defect.                                                                                                                                                                          |
| **D-166** | No change to the decision. Its **source comment must be corrected** when the dimensions are built (correction 3.15).                                                                                       | The comment says the question is open. It is closed. It is C22's risk visible in one file.                                                                                                                                                                                                          |
| **D-187** | Holds unchanged until routing 93. When enforcement lands, the copy guard **inverts**: the app must then say what will follow, because it will be true.                                                     | D-187's rule is _"a constraint the engine does not act on promises nothing."_ When the engine acts, the rule's condition is gone. The guard must be rewritten deliberately, not quietly deleted.                                                                                                    |

**Superseded — replaced by a new decision, with the old one preserved in the log.**

| Decision                                               | Superseded by                                                   | Why                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constraints.ts:25-28`'s **shown-never-enforced rule** | A routing 93 decision, for **registered blocker concepts only** | The rule remains right for free-text constraints the owner wrote — _"no gym until the shoulder settles"_ — because guessing what those forbid is inventing a rule he did not state. It is wrong for a **structured** blocker cause with a registered concept and a bounded `until`, which is exactly what S2 Tier 1 creates. **The supersession is narrow and the free-text half survives.** |

**Reopened.**

| Decision  | Reopened how                                                                                                                                                                                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-172** | Answered in **two parts**, not one. Part one — _widen what can be searched_ — is Reach (routing 92) and needs no model and no adjudication of mechanism. Part two — _how to search it_ — is routing 97, decided on evidence over a space that by then has something in it. **Its hold must move from 91 to 97** (6.11), and this is the owner's act. |
| **D-025** | Not reversed. Reconsidered **at routing 97 and not before**, under the condition D-025 itself named — a rubric strong enough to see the difference (AUD-0039) — and only if the bounded deterministic mechanism demonstrably cannot generate a hypothesis nobody planted.                                                                            |

**Explicitly not reopened.** D-024's deterministic selection (for every phase up to
96), D-087's passive Timeline, D-129's counts-not-shares, D-171's local-first
deferral of cross-device sync, D-173's proving-domain discipline, D-210's separation
of product acceptance from instrument hardening, and **Phases 1 through 84.**

**New decisions this roadmap would need**, drafted before their code, beginning at
**D-212** (check the log's tail before allocating):

- _A horizon says when an effect can be judged, and a horizon nothing can score is
  not offered._ (S1a)
- _A new concept arrives with a privacy class, a verifiable ask, a registry reader
  and a freshness horizon, or it does not arrive._ (S2)
- _An interpretation is a proposal and never a fact._ (C1 — anticipated by the brief)
- _The app states what it expects, records it, and reconciles it against what
  happened; it does not state what will happen._ (C10 bounded)
- _A strategy that has stopped working is said in a sentence, never in a rate._ (C13)
- _A destination that is not moving is noticed by the system and revised only by the
  owner._ (the revision loop)
- _A search discipline declares its kill criterion before it runs._ (C2/C3)
- _A deliberately passive domain says that it is passive._ (D-170 generalised)
- _Routing integers increase monotonically in execution order._ (D-159 amended)

---

## 9 · Reach / Validity preservation map

Every one of the 20 approved AUD findings, and every owner-use finding the
predecessor deferred, with its home after the restructure. **Nothing disappears,
and nothing is left without an owner.**

### Reach — the audit's package 1, all nine

| Finding               | What it is                                                               | Lands in      | Note                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AUD-0040              | `assembleSituation` is a hand-written list of nine reads                 | **92**, first | With its structural discretion guard. Q8 is answered (D-167 shipped), so its precondition is met.                          |
| AUD-0041              | `ask.materialToDecision` is unverifiable and wrong in 4 of 15            | **92**        | Near-free once the situation is registry-driven.                                                                           |
| AUD-0011              | Emotional and private health declared to matter, cannot reach a decision | **92**        | Carries **D-166's six dimensions** — an approved-and-unbuilt C22 item.                                                     |
| AUD-0006              | Available time is a career-namespaced concept filed under direction      | **92**        |                                                                                                                            |
| AUD-0012              | Money is effectively dormant and no scenario exercises it                | **92**        |                                                                                                                            |
| AUD-0013              | Social fires only once he has said he feels sociable                     | **92**        |                                                                                                                            |
| AUD-0045              | `A_WALK` is the only movement, with no route to add another              | **92**        | **After** per-object size and demand — a precondition, not a risk. Highest priority in the package under D-113. **= C20.** |
| AUD-0047              | A relationship graph with a quality signal only the lab reads            | **92**        | Quality may **only suppress, never rank.** Feeds C17 at 94.                                                                |
| AUD-0050 (retraction) | Five record kinds read and enforced, none creatable                      | **92**        | The veto half shipped in 81.                                                                                               |

### Validity — the audit's package 2, all eleven

| Finding            | What it is                                                 | Lands in | Note                                                                              |
| ------------------ | ---------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| AUD-0042           | Observe-first reaches 3 verbs of 15                        | **93**   | `derived.ts` still reaches only `sleepHours`. Feeds S2 Tier 2.                    |
| AUD-0029           | Nothing reasons at month or season scale                   | **93**   | **= S1b.** Correction 3.1: this is where the matrix's "S1 has no phase" is wrong. |
| AUD-0007           | A Tuesday and a Saturday differ by one boolean             | **93**   |                                                                                   |
| AUD-0009           | Recovery is always one night when evidence says several    | **93**   | **= C8, and S1a's acceptance case.**                                              |
| AUD-0010           | Career study has no schedule                               | **93**   | The honest half of C6's spacing question.                                         |
| AUD-0022           | Two moves that are the same thirty minutes compete         | **93**   | = F42. Bounded to one clause; Q9 settled it.                                      |
| AUD-0025 (durable) | An ignored recommendation is invisible forever             | **93**   | The session half shipped in 81.                                                   |
| AUD-0030(a)        | Legacy learning evidence archived and barred               | **93**   | (b) stays post-release-optional under Q4.                                         |
| AUD-0038(c)        | The interface finding that is an intelligence one          | **93**   | (a) and (b) are routing 90's.                                                     |
| AUD-0019           | Nine identical evenings, silence for the three she is away | **93**   | Depends on AUD-0025's durable ledger.                                             |
| AUD-0051           | Recommendations name what, almost never when or where      | **93**   | The one wording change with a large evidence base behind it.                      |

### Owner-use findings the predecessor deferred

| Finding                                                                                                                | Lands in                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| F12 (diversity), F19 reach half, F27 (emotional dimensions), F30 consent half, F32 retraction half, F36 precision half | **92**                                                                                        |
| F03, F08, F09, F16, F18, F31, F34 bounded, F42, F44 bounded                                                            | **93** (F03 and F18 **complete** at 95, where a strategy can be judged against a destination) |
| **F14** — maintenance crowding out advancement                                                                         | **95** — moved from 93 by the settled #6/#7 (13A.9); same axis as C13's minimum               |
| F20, F21, F22, F23, F24, F25, F28, F29 — the per-domain progression models                                             | **94**                                                                                        |
| F36 interpretation half                                                                                                | **91**                                                                                        |
| F37 reliability half                                                                                                   | **101** (canonical Phase 10), scope unchanged                                                 |
| F17, F34 search half, F37 cross-device, F44 self-feedback half                                                         | **remain refused** — `PRODUCT_ADJUDICATION.md` section 11, unchanged                          |

### Approved-but-unbuilt, named individually because they are C22's live examples

| Item                                            | Approved                   | Lands in                                             | Protected how                                                                                                                               |
| ----------------------------------------------- | -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-166** — six emotional dimensions            | 2026-08-27                 | **92** (AUD-0011)                                    | Named in 92's gate; the stale source comment corrected with it (3.15); no path may sum or average across the six, proved by reintroduction. |
| **D-168** — the twelfth Romantic domain         | 2026-08-27                 | **94**, with navigation reserved at **90**           | Named in 90's accommodation list and in 94's gate. AUD-0047's suppress-never-rank rule binds.                                               |
| **C20 / AUD-0045** — recommendation diversity   | D-113                      | **92**                                               | Its precondition (per-object size and demand) is stated as scope, not as a risk.                                                            |
| **C21 / F08** — blocker enforcement             | D-187 captures it          | **92** + **93**                                      | Split across two phases so the concept exists before the rule is reversed.                                                                  |
| **D-170** — Faith's passivity is interim        | 2026-08-27                 | **94**                                               | Generalised into 94's completion condition: a passive domain must say it is passive.                                                        |
| **AUD-0007/0009 accumulated load and recovery** | audit                      | **93**                                               | S1a's acceptance case sits on AUD-0009 deliberately, so the horizon cannot ship without it.                                                 |
| **F01 destination / progression**               | D-162, D-181               | shipped in 84; extended at **94**, revised at **95** | D-162 binds every extension.                                                                                                                |
| **Truthfulness and privacy constraints**        | D-018, D-167, D-193, G-009 | every phase                                          | Each phase's synthetic contract carries them; 92's gate is the privacy guarantee itself.                                                    |

### The nineteen deferred instrument findings

`qa/INSTRUMENT_HARDENING_BACKLOG.md` — QA-84-046…063, 065 — are open under D-210
and have **no owner in the roadmap today.** They are guard, scanner, oracle and
verifier findings, not product defects, and the terminal one (QA-84-062: _the
oracle shares the defect it is meant to detect_) shows why chasing them inside a
product phase does not converge.

**Recommendation: they become a standing input to routing 102 (canonical Phase
11, independent adversarial hardening).** That phase's question is literally
_"now that the whole system exists, can interactions across phases break it?"_ and
a list of nineteen proven ways to fool the guards is the best brief it could have.
This gives all nineteen a home without creating a phase and without reopening
D-210.

---

## 10 · Structural dependency order — the critical path

```
84 GREEN
  │
  ▼
90  visual coherence + the phone gate + the time-advance instrument
  │      (reserves shape for 91-95; builds none of it)
  ▼
91  semantic capture ── independent of S1/S2/S3; the bare-aim gap (3.6) is its gate
  │
  ▼
92  REACH ─────┬── AUD-0040 first (registry-driven situation) ── everything else is cheap after it
               ├── S1a horizon vocabulary  ──────────┐
               ├── S2 Tier 1 + Tier 2 concepts ──────┤
               ├── D-166 six dimensions (C5)         │
               ├── C20 diversity (after size/demand) │
               └── C21 concept half                  │
  │                                                  │
  ▼                                                  ▼
93  VALIDITY ─┬── AUD-0009 = C8 = S1a's ACCEPTANCE CASE
              ├── AUD-0029 + AUD-0007 = S1b (month/season reading)
              ├── C21 enforcement half (supersedes shown-never-enforced, narrowly)
              ├── C14 bands
              └── F03/F08/F09/F14/F18/F31/F34/F42/F44
  │
  ▼
94  DOMAINS ──┬── cheap: Sleep, Fatherhood, Social, Home   (generator exists)
              └── expensive: Emotional, Faith, Private, Direction, ROMANTIC (generator needed)
  │
  ▼
95  ADVANCEMENT AND REVISION   ◀── settled owner decisions #6 and #7 (13A)
    ├── pkg 1  C13 minimum: rung advancement + new ground vs same ground
    │            + subject eligibility, delivery tiers, frequency, known-incomplete
    │            (first task: the per-entity progress selector, 13A.7)
    ├── pkg 2  F14 maintenance crowding out advancement   (moved from 93)
    ├── pkg 3  destination revision — not moving / incompatible / gone quiet
    └── pkg 4  F03 verdicts + F18 link
  │
  ▼
96  EXPECTATION AND RECONCILIATION  (bounded C10; C14 owner-visible)
  │      ── a new claim class, gated separately from 95's record-factual work
  ▼
97  LONGITUDINAL INFERENCE  (D-172 part two; C2 + C3; null arm is the gate)
  │      ── droppable without dropping anything above it
  ▼
101 → 102 → 103   canonical Phases 10, 11, 12   [scope unchanged; 102 absorbs the instrument backlog]
```

**Three dependency facts that decide the order, and each is verified.**

1. **AUD-0040 gates the whole of Reach**, and the audit says so: it is the change
   that makes every other reach item cheap. Nothing in 92 should precede it.
2. **Reach gates Validity** — _"the app cannot widen what it learns over a concept
   it cannot read."_ This is the audit's own sequencing and it is unchanged.
3. **Reach and Validity gate D-172**, which is this document's reordering. The
   search space today is six tracked concepts and two horizons. **Deciding the
   search mechanism before widening the space is the single most expensive mistake
   available in this roadmap**, because it spends the campaign's hardest remaining
   decision on evidence that cannot distinguish the answers.

**What is off the critical path and can move.** C1 at 91 is independent of
everything structural and could run earlier or later. C19 (owner decision 1) is
independent of everything and decidable at any time. C4's cheap domains can be
sliced across phases rather than landing as one.

---

## 11 · Throughput and finishability

**The record, which is the only honest basis for an estimate.**

| Phase                                 | Packages | QA rounds                          | Shape                           |
| ------------------------------------- | -------- | ---------------------------------- | ------------------------------- |
| 81 — correctness and truthfulness     | —        | **3**                              | Removed untrue claims           |
| 82 — structural intelligence skeleton | 6        | **12**                             | New structural objects          |
| 83 — instrument and untrue things     | 5        | **2**                              | Instrument first, then removals |
| 84 — destination and discovery        | 6        | **19** + an owner closeout (D-210) | New owner-facing _meaning_      |

**The pattern, and it is not package count.** Routing 83 had five packages and two
rounds. Routing 84 had six packages and nineteen. **Rounds scale with how many new
claims about the owner a phase puts on a screen** — because every new claim creates
copy-guard surface. The campaign record is that routing 84's rounds 3 to 18 were
clean on the product, and that rounds 15 to 19 produced twenty findings of which
**D-210 found zero were owner-visible product-behaviour defects.** Routing 83
was cheap because it mostly **removed** claims.

**Second predictor, and it is actionable.** The shortest loops in this campaign
followed acceptance lists written **before** the build. Routing 83 had a five-item
gate written in advance and closed in two rounds. Routing 84's gate was seven items
but its instrument was invented during the phase, and the instrument is what took
seventeen rounds. **Every phase below should have its acceptance list written into
its handoff before the builder starts, and its instrument proved separately.**

**Per-phase estimate, stated relatively as the brief requires. No invented round
counts.**

| Phase                                 | Resembles                                            | Why                                                                                                                                                                                                                                                                                             | Risk                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **90** visual                         | **83**, plus a phone gate                            | Re-typesets existing claims rather than adding new ones. But Phase 4 found five defects on a phone that three desktop widths missed, and Phase 7 repeated it.                                                                                                                                   | Medium. The phone gate is a step-change in reviewer, not in scope.                                                                                                                                                                                                                        |
| **91** semantic capture               | **82**                                               | New claims about _what he meant_, but scope is one package and CASE A's eight tests are already written. The best-specified phase in the roadmap before it starts.                                                                                                                              | Medium. Correction 3.6 is the item most likely to expand.                                                                                                                                                                                                                                 |
| **92** Reach                          | **82**                                               | Mostly makes existing concepts reach decisions; the gate is structural (a privacy guarantee, a no-added-noise count) rather than semantic.                                                                                                                                                      | Medium. **The six emotional dimensions are new owner-facing readings and will attract copy guards** — that is 84's cost arriving inside 92.                                                                                                                                               |
| **93** Validity                       | **84 — the most expensive in the roadmap**           | New _conclusions_ about him, across eleven findings plus nine owner-use findings plus C21's reversal. Every conclusion is a claim, and every claim is guard surface.                                                                                                                            | **High. This is the phase most likely not to converge.** Split rule below.                                                                                                                                                                                                                |
| **94** domains                        | **83 per domain**, but many domains                  | Repetitive content work, each domain independently falsifiable. Five domains need a generator, which is real architecture.                                                                                                                                                                      | Medium, but it is the phase most likely to sprawl. Slice rule below.                                                                                                                                                                                                                      |
| **95** advancement and revision       | **83-shaped for package 1; 84-shaped for the phase** | Package 1 (C13 minimum) describes the **record’s own composition**, so a mechanical oracle exists and its acceptance list is fully enumerable before the build — 83’s best predictor. The later packages say the most emotionally-loaded things the product will ever say, against section 4.4. | **High overall, and front-loaded safely.** The domain delivery table multiplies the copy catalogue by twelve — mitigate by shipping the four push-tier domains first. **The anti-shame gate is human, not automated** (13A.2), which is what keeps it out of 84’s nineteen-round pattern. |
| **96** expectation and reconciliation | **84-shaped**                                        | A new claim class: what the app expected, expected-versus-happened, and confidence language about his own data. Three new owner-facing claim families.                                                                                                                                          | **High.** This is the half that was split out of the former 95 precisely so it can fail without taking the advancement work with it.                                                                                                                                                      |
| **97** inference                      | **materially different from all of them**            | Its failure mode is false discovery, not copy. Its gate is a null arm, which either passes or does not.                                                                                                                                                                                         | **Bimodal**: short if the mechanism fails the null arm and is abandoned; long if it half-works and someone starts tuning. The kill criterion exists to prevent the second.                                                                                                                |
| **101/102/103**                       | unchanged                                            |                                                                                                                                                                                                                                                                                                 | 102 absorbs the nineteen deferred instrument findings.                                                                                                                                                                                                                                    |

**Where scope must be split to keep QA falsifiable.**

- **Routing 93 must carry a split rule in its handoff:** if it exceeds **five work
  packages**, it becomes 93 and a successor, divided at the seam between _reading
  the record over longer horizons_ (AUD-0029/0007/0009/0042) and _acting on what it
  concludes_ (C21 enforcement, F03, F08, F18). Those two halves have different
  gates and can fail independently, which is the whole point.
- **Routing 94 slices by domain**, not by capability. Each domain is independently
  buildable and independently falsifiable. A cap of **four domains per QA cycle** is
  the right shape; twelve at once is the mega-phase the campaign has already refused
  twice. **Sized with arithmetic in §11B, because the owner-decision sequence put
  nine of its twenty additions into this phase.**
- **Routing 95 carries its own split rule**: if it exceeds **four packages**, it
  splits at the seam between _describing advancement_ (record-factual, cheap) and
  _stating and reconciling expectations_ — which is exactly the seam that produced 96. Applying it once more is the mitigation if 95 grows again.
- **Routing 97's kill criterion is declared in its handoff before the builder
  starts.** A phase that can conclude "no" is a phase that can end.

**Where the roadmap risks not finishing, said plainly.** **Eleven routed phases remain** — 90, 91, 92, 93, 94, 95, 96, 97, 101, 102 and 103. (83 and 84 are GREEN and are not counted; 98–100 are reserved headroom and carry no work.) An earlier count of ten in this document was wrong and is corrected here. At the
observed range of 2 to 19 rounds, that is a long road, and the predecessor's section
12 item 9 governs. Two specific risks:

1. **93, 95 and 96 are the expensive stretch, and they are consecutive.** Three
   84-shaped phases in a row is where a campaign stops. Two mitigations, both
   already applied: the split rule for 93, and the settled #6/#7 splitting the
   former 95 so that its **cheapest and most valuable package runs first** and the
   new-claim-class work is isolated in 96. **If throughput becomes binding, 96 is
   now the one to cut, not 95** — the advancement work the owner asked for survives,
   and only the expectation machinery is lost.
2. **The copy-guard surface compounds.** Nineteen deferred instrument findings
   already exist, every one of them a proven way to fool a guard, and every new claim
   adds more guard to fool. D-210 closed that loop once by decision. **It will need
   closing again**, and the honest place to plan for it is each phase's handoff
   stating in advance that instrument findings are backlog rather than blockers,
   exactly as D-210 ruled.

**The minimum shippable subset, named now so that stopping is a decision rather than
an exhaustion.**

> **90 → 91 → 92 → 93 → 101 → 102 → 103.**

That delivers a visually coherent product that understands what the owner says,
reads everything it records, concludes honestly over real horizons, enforces the
constraints he tells it about, and covers three proving domains properly — hardened
and released. It omits the remaining domains (94), advancement and revision (95),
expectation and reconciliation (96) and open-space discovery (97). **It is a truthful, useful personal operating system. It
is not yet the personal intelligence system the owner described**, and the
difference is precisely 94, 95, 96 and 97 — which is why they are last, and in
that order.

---

## 11B · Routing 94, sized in the roadmap's own unit

Routing 94 absorbed **nine of the twenty additions** from the owner-decision
sequence. The roadmap's unit of work for this phase is the **domain slice**, capped
at **four domains per QA cycle**.

### The domain arithmetic

Career, Health and Money are the three proving domains and are already done
(D-173). **Nine domains remain:**

| Class                      | Domains                                         | Count | Cost                                                                                 |
| -------------------------- | ----------------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| Have a candidate generator | Sleep, Fatherhood, Social, Home                 | 4     | Content and evidence semantics; a `PROVING_DOMAINS` row and a `MILESTONE_ENTITY` row |
| **No generator at all**    | Emotional, Faith, Private, Long-Range Direction | 4     | **New architecture** — a destination cannot reach Now without one (correction 3.5)   |
| Does not exist yet         | **Romantic** (D-168)                            | 1     | A twelfth domain page **and** a generator                                            |

**Nine domains ÷ four per cycle = three cycles.** The domain work alone is
**within** the slice rule.

### The non-domain arithmetic, and this is where it breaks

Routing 94 now also carries **eight non-domain deliverables**, and **every one of
them is Fatherhood-specific**:

`development-skill` authoring route · `about-person` relationship correctness ·
near-duplicate guard · C scaffolding guidance · help-ladder reader (form b) ·
two-class growth-opportunity cap · trace-integrity changes from the cap · Adaya
birthdate capture · generation-time normative suppression filter.

**That is nine deliverables landing on one slice.** By deliverable count the
Fatherhood slice is roughly **nine times the weight** of the Home slice, and the
four-domains-per-cycle rule — which counts domains, not deliverables — **does not
see it.**

> **So the current routing 94 scope does exceed the slice rule in substance while
> satisfying it in form. The rule counts the wrong unit for this phase.**

### The proposed split — three cycles, Fatherhood alone in the first

| Cycle    | Contents                                                                      | Rationale                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **94.1** | **Fatherhood alone** — its destination, plus all nine Fatherhood deliverables | The heaviest slice by an order of magnitude, and the one carrying every owner-decision addition. It also proves the authoring route the other domains do not need |
| **94.2** | Sleep, Social, Home, **Romantic**                                             | The generator-bearing domains plus the new one. Four, within the rule                                                                                             |
| **94.3** | Emotional, Faith, Private, Direction                                          | The four needing generators. Four, within the rule                                                                                                                |

**One domain in cycle 1, four in each of cycles 2 and 3 — nine domains, three
cycles, and no cycle over the cap.**

### Does the split change routing numbers?

**No. It is internal multi-cycle execution inside routing 94.**

Two reasons, and the first is binding. **Routing integers must increase
monotonically in execution order** (correction 3.13), and 95, 96 and 97 are
taken — so a `94a / 94b / 94c` split would need integers above 94 and below 95,
which do not exist. And **D-159 already settles the convention**: _"A QA round
does not get a new routing integer"_ — rounds 1…n of one phase all carry that
phase's integer, as they did through routing 82's twelve and routing 84's
nineteen.

**So 94 runs as one routing phase over three internal cycles**, with the slice
boundaries written into its handoff before the builder starts — which §11's second
predictor says is the strongest available lever on round count.

### The residual risk

**94.1 is the cycle to watch.** It is nine deliverables of new owner-facing
Fatherhood meaning, including two — the "closer" register and scaffolding guidance
— that speak about a child, under C19, D-136 and the pull-only delivery rule.
**That is 84-shaped work inside a phase otherwise estimated at 83-shaped per
domain.** If routing 94 runs long, 94.1 is where it will happen, and the mitigation
is to gate 94.1 on its own acceptance list rather than letting it share one with
94.2 and 94.3.

---

## 11A · Risk register

The risks this roadmap carries, ranked by what they would cost, each with the thing
that is supposed to catch it. A risk with no catcher is named as such.

| #   | Risk                                                                                                                                                                                                    | Where                  | Catcher                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **It does not finish.** Nine phases against a record of 2–19 rounds, with two 84-shaped phases adjacent.                                                                                                | 93 and 95              | Section 11's split rule for 93, slice rule for 94, and the named minimum shippable subset so stopping is a decision. **This is the governing risk and it is inherited from the predecessor's section 12 item 9.** |
| 2   | **The copy-guard surface compounds faster than the product.** Nineteen proven ways to fool the guards already exist, and every new claim adds more. Routing 84 spent seventeen of nineteen rounds here. | every phase from 92 on | D-210's rule stated **in advance** in each handoff: instrument findings are backlog, not blockers. Section 9 gives the backlog a home at 102.                                                                     |
| 3   | **A rate about the owner arrives inside a phase about progress.** It happened to be avoided in 84 only because D-162 was written first.                                                                 | 95 above all, then 93  | D-162 amended to bind the named expectation, C13's wording and every stagnation sentence; C13's rate refused outright in section 12.                                                                              |
| 4   | **Reach widens the vocabulary and the app gets louder.** Every dormant concept made live is a new thing the app could say.                                                                              | 92                     | The audit's own no-added-noise gate, measured across the whole scenario library, and section 4.5.                                                                                                                 |
| 5   | **Routing 96 half-works and someone tunes the thresholds until the null arm goes quiet.** This is how a false-discovery machine gets built by careful people.                                           | 96                     | The kill criterion, declared in the handoff **before** the builder starts. Abandonment is a permitted result.                                                                                                     |
| 6   | **The D-172 hold lands on the wrong phase and silently releases the right one.** Exact-integer matching, correction 3.14.                                                                               | at approval            | Section 6.10, and it is the owner's act rather than the builder's.                                                                                                                                                |
| 7   | **A phase is numbered below the current ceiling and never routes**, with nothing warning anyone.                                                                                                        | at approval            | Correction 3.13, D-159 amended to require monotonic increase, and the 97–100 headroom.                                                                                                                            |
| 8   | **S1a silently invalidates conclusions drawn at the narrow horizon.** The matrix's own warning, and it is right.                                                                                        | 92                     | The byte-identity replay of the whole scenario library under both enums, and D-064's four conditions proved unchanged.                                                                                            |
| 9   | **A destination arrives in a domain with no generator and changes nothing**, and the phase passes because the page looks right.                                                                         | 94                     | Correction 3.5 built into the phase's completion condition: every domain either reaches Now or **says it is passive**.                                                                                            |
| 10  | **The revision loop reads as blame.** Section 4.4 is a non-negotiable principle and this is the phase most able to violate it.                                                                          | 95                     | Owner decision 6 settles the surface; every stagnation sentence carries an anti-shame reading in the QA contract.                                                                                                 |
| 11  | **C22's approved-but-unbuilt work is lost in the restructure.** D-166 and D-168 are the live examples, and correction 3.15 shows one of them already drifting in a source comment.                      | 92, 94                 | Section 9's map, with each item named in the receiving phase's gate rather than only in a table here.                                                                                                             |
| 12  | **The ordinary-owner instrument and the product fail together with no way to tell which.** Routing 82's failure pattern, and routing 84's.                                                              | 90                     | The time-advance instrument is routing 90's **first** deliverable with its own acceptance item, proved before any product claim rests on it.                                                                      |
| 13  | **The evidence base stays too thin for anything in 95 or 96 to be worth building**, and that is only discovered at 96.                                                                                  | 96                     | **No catcher inside the roadmap.** It is blocking owner decision 5, and the reason that decision should be answered before 96 is specified.                                                                       |

---

## 12 · Deliberate refusals and bounds

What was kept out, and why. Each is a real refusal, not a deferral wearing a
refusal's clothes.

**REJECTED outright**

| Item                                                                                                                     | Refused because                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | What is accepted instead                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C11 — steering on a forecast**                                                                                         | Unfalsifiable by construction. Steering away from a predicted bad evening makes the prediction unobservable, so the app can never learn it was wrong. A system whose purpose is to revise its model of the owner must not contain a component immune to revision. This is not an evidence-volume problem and more data would not fix it.                                                                                                                                                                                                                                                                                                                                                                                                           | The **named expectation** (5.3), which is always scored because the occurrence it is about actually happens.                                                                                                                                                                                                                                                                                    |
| **C12 — explaining the intervention**                                                                                    | Falls with C11. And Q9 caps Now at one additional clause; plan section 54 already reserves it for the maintenance-versus-advancement distinction, which is honest today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Nothing. The clause budget goes where it was already promised.                                                                                                                                                                                                                                                                                                                                  |
| **A rendered capability acceleration figure** — a slope, a second derivative, a capability score, "improving 12% faster" | Three reasons that stand **independently of D-162**. The progress ladder is **ordinal** — `rankOf` returns an index, so the spacing between _transfer_ and _milestone_ is not a quantity and a derivative of it is arithmetic on labels. The evidence bar compounds: a first derivative already needs `TRAJECTORY_READINGS = 6` over `TRAJECTORY_SPAN_WINDOWS = 6` with a seven-day floor, so distinguishing _improving_ from _improving faster_ needs three separated windows each clearing that bar, per quantity, across six tracked concepts. And differencing amplifies noise over a **non-stationary** series — life seasons, custody weeks, work strain — so a second derivative would be dominated by the season rather than by the owner. | **The capability itself, approved under #7** — rung advancement, and new ground versus repeatedly reaching the same ground. Section 13A. **This entry corrects the first draft of this document**, which refused C13’s capability and cited D-162 as authority. D-162 forbids the rendered figure and explicitly permits _"description with evidence"_; the capability was never its to refuse. |
| **`monthly` and `seasonal` as outcome-judgement horizons**                                                               | A lifecycle keyed to `(target, dayId)` cannot settle a month-long occurrence, and at six tracked concepts nothing would ever score one. A horizon that cannot be judged is a field, not a capability.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | The same span is read at **S1b / AUD-0029**, where it is a reading of the record rather than a judgement of a move.                                                                                                                                                                                                                                                                             |
| **Weather, screen time, location-as-coordinates**                                                                        | No owner decision turns on them at any resolution this product could honestly capture, and each is a permanent tap. Section 4.5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Nothing.                                                                                                                                                                                                                                                                                                                                                                                        |

**SEPARATE PRODUCT**

| Item                                              | Why it is a different product                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C7 — nutrition and food logging**               | Three independent reasons, any one sufficient. **Burden**: food is the highest-frequency, highest-friction thing a person can log — three to five entries a day, forever — against section 4.5's rule that the app should require _less_ input as it learns more. **Spurious confirmation**: "carbs made me sluggish" is among the strongest folk-causal priors a person holds, and an engine at `MIN_PAIRS = 4` per arm with no multiple-comparisons discipline will confirm it long before it can test it. The owner's own coffee-versus-milk example is exactly this shape. **Scope**: food is a domain with its own vocabulary, its own units, its own database and its own product. Life Command OS's job is to decide _whether_ today can support a hard training session, not to model macronutrients — plan section 23 already draws exactly this line for workout programming and the same reasoning applies. **If the owner logs food elsewhere, the honest integration is a single low-resolution reading the owner supplies, not a food model** — and that is an S2 Tier 3 concept at best, after routing 97. |
| **Spaced-retrieval learning (C6's testing half)** | An app that tests the owner is a study product: a scheduler, an item bank, an interval algorithm, a review UI, and its own idea of mastery. Plan section 23 already says exact programming may live elsewhere, and section 12 item 5 of the predecessor already warned that retention without external evidence becomes a second self-report wearing a better name. **The product records external proof — a lab that ran, an artifact, an interview that happened — and says which it knows.** That is the honest half and it is already shipped as rungs four and five.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**BOUNDED — accepted in a narrower form than requested**

- **S2** to three tiers, with Tier 3 gated behind C3's correction discipline.
- **S1a** to `weekly`, with `monthly`/`seasonal` refused as judgement horizons.
- **C10** to the named expectation, with no claim about a day that has not happened.
- **C15** to question-aiming, suppression and design justification — never a premise
  in a Now reason line (13.2, subject to owner decision).
- **C14** to owner-visible for his own data only; internal for anything about the
  child, per D-112 / AUD-0049.
- **C17** to progression evidence with AUD-0047's rule absolute: a quality signal may
  only suppress, never rank. No person is scored.
- **C21's enforcement** to registered blocker concepts only; the free-text constraint
  rule in `constraints.ts:25-28` survives, because guessing what _"no gym until the
  shoulder settles"_ forbids is still inventing a rule the owner did not state.
- **C2/C3** to a bounded mechanism with a pre-declared kill criterion.

**PRESERVED FROM THE PREDECESSOR — still refused, and this document does not
reopen them.** F17 (actively gathering comparison evidence — it turns his life into
a study protocol), F34's search over Timeline (D-087 made Timeline passive
deliberately, and search would be the first place a private entry becomes findable
by attribute), F37's cross-device continuity (D-171), and F44's satisfaction loop
(an engagement metric wearing a humbler name; plan section 2 rules out optimising
for engagement).

**And one thing this document deliberately did not do.** It did not shrink the
product to make the roadmap smaller. C2 and C3 — the owner's top-ranked wish and the
hardest thing to do honestly — are **built**, at the end, with a kill criterion, over
a space that by then has something in it. Refusing them would have made the roadmap
shorter and the product something else.

---

## 12A · What the owner-decision sequence removed, and what it added

**Counting unit, used identically on both sides: one distinct roadmap deliverable
or decision** — a thing that would have had to be built, decided or amended.
Sub-tasks inside one deliverable are not counted separately, which is why
AUD-0030(b) is one row rather than four.

### Removed outright — fifteen

| #   | Removed                                                                                                                  | Why                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 1   | Form (a), the settled-sufficiency repair                                                                                 | Correction 3.19 — the claim was false                    |
| 2   | Its guarded routing 94 package                                                                                           | same                                                     |
| 3   | The D-112 / D-135 amendment                                                                                              | same                                                     |
| 4   | A separate independence-sufficiency owner decision                                                                       | same                                                     |
| 5   | The routing 93 probe **scoring package**                                                                                 | Correction 3.21 — duplication decay already recovers it  |
| 6   | Probe-specific urgency escalation                                                                                        | same                                                     |
| 7   | A global `stale-evidence` urgency change                                                                                 | same                                                     |
| 8   | A separate written scoring decision for the probe                                                                        | same                                                     |
| 9   | **AUD-0030(b)** — new record kind, episode-projection extension, `MAPPING_RULES_VERSION` bump, extended quarantine tests | §13F — the context gate makes its benefit false as built |
| 10  | Q1.3's generative content artifact                                                                                       | §13G — 1.3 no                                            |
| 11  | Q1.4's sequencing model                                                                                                  | §13G — 1.4 no                                            |
| 12  | Q1.5's checklist registry                                                                                                | §13G — 1.5 no                                            |
| 13  | #1 option C — five-decision amendment, guard rewrite across five test files, QA-suite inversion                          | §13D — Choice A                                          |
| 14  | #2 option C — a third provenance class in every evidence surface, a decay rule, a dependency on routing 96               | §13C — Option B                                          |
| 15  | 1.2's **rendered norm surface** — no norm sentence on Now, page, pull, trace or export                                   | §13G — suppression-only                                  |

**Five further items were moved or deferred rather than deleted:** Tier 3 →
routing 97; F14 → 93 to 95; `mood` dropped as a routing 92 askable concept and
`confidence` → 94; longitudinal inference 96 → 97; `life-context-change` → 92.

### Added — twenty

Counted on the same unit: a deliverable that exists in the roadmap **after** this
sequence and did **not** exist before it. Confirmations of already-proposed items
— S2 Tier 1/2, D-166's dimensions, C15's option B as a roadmap row — are **not**
counted as additions.

| #   | Added                                                    | Origin        | Owner    |
| --- | -------------------------------------------------------- | ------------- | -------- |
| 1   | Subject-eligibility rule + exhaustive `EntityKind` table | #6 / #7       | 95       |
| 2   | Domain delivery-tier table (push / pull / never)         | #6            | 95       |
| 3   | Frequency and aggregate bounds                           | #6            | 95       |
| 4   | Known-incomplete correction gesture                      | #6            | 95       |
| 5   | C13 minimum package — rung advancement + new ground      | #7            | 95 pkg 1 |
| 6   | Per-entity progress selector                             | #7            | 95       |
| 7   | Routing 96 as a distinct phase                           | #7 split      | 96       |
| 8   | Starvation QA gate + closed exemption registry           | #3            | 92       |
| 9   | Guide performance work — pre-filter + incremental probe  | #3            | 92       |
| 10  | `life-context-change` vocabulary item                    | Q4            | 92       |
| 11  | Help-ladder reader / the "closer" register — form (b)    | #1            | 94       |
| 12  | `development-skill` ordinary-use authoring route         | #4            | 94       |
| 13  | `about-person` relationship-correctness repair           | #4            | 94       |
| 14  | Near-duplicate `development-skill` guard                 | #4            | 94       |
| 15  | C scaffolding guidance                                   | #4            | 94       |
| 16  | Two-class growth-opportunity cap                         | #4            | 94       |
| 17  | Trace-integrity changes from the cap                     | #4            | 94       |
| 18  | Adaya birthdate capture                                  | Q1.1          | 94       |
| 19  | Generation-time normative suppression filter             | Q1.2          | 94       |
| 20  | Maintenance-probe regression, five arms                  | probe finding | 93       |

### The comparison, exactly

**Fifteen removed, twenty added, on the same unit — net +5 roadmap items**, plus
one new phase (96) and longitudinal inference renumbered to 97.

**Nine of the twenty additions land in routing 94**, which is why §11 sizes that
phase with arithmetic rather than a warning.

### The principle these removals establish

> **Items were removed because source traces showed their justification did not
> hold. Roadmap work is not preserved out of caution after its supporting
> evidence collapses. A finding survives on its evidence or it goes.**

**Four of the fifteen removals followed retractions of claims this document made**
(corrections 3.19–3.22), and the owner found every one of them.

---

## 13 · Blocking owner decisions

Seven. The four named in the brief, two that met the bar, and one — C13 — promoted
after the owner challenged this document's original refusal of it. Each states the
real decision, why it cannot legitimately be made without the owner, what each
option actually costs, and a recommendation.

**Eight are now RESOLVED by the owner and recorded in sections 13A–13G. Only #5
remains unresolved**, and its reason is at §13H.1: no connected-data source
exists. The consolidated register is §13H.

| #   | Decision                             | Status                                        |
| --- | ------------------------------------ | --------------------------------------------- |
| 1   | C19 — child progress measurement     | **RESOLVED — §13D** (Choice A)                |
| 2   | C15 — research-grounded priors       | **RESOLVED — §13C** (Option B)                |
| 3   | S2 — acceptable daily input burden   | **RESOLVED — §13B** (Tier 1 + Tier 2)         |
| 4   | C16 — "what to teach her"            | **RESOLVED — §13E** (B-owner + C)             |
| 5   | Connected data sources               | **UNRESOLVED — §13H.1** (no source)           |
| 6   | Record-state / plateau surfacing     | **RESOLVED — section 13A**                    |
| 7   | C13 — sustainable **and increasing** | **RESOLVED — section 13A**                    |
| Q4  | Legacy evidence admissibility        | **RESOLVED — §13F** (rung A declined)         |
| Q1  | Age and normative reference          | **RESOLVED — §13G** (1.1/1.2 yes, 1.3–1.5 no) |

### 13.1 · Decision 1 — C19, child progress measurement

**The decision.** May the product express a **rate, share, rank or grade** about
Adaya — for example "three of the last six" as a proportion, or a percentage of
occasions settled?

**Why it is the owner's.** Its origin is **AUD-0048**, which the audit called its
most serious single defect: the app asserted that a four-year-old had done something
_"three times running"_ when the record held three of six with the most recent a
failure. Five decisions now enforce the prohibition — **D-070, D-112, D-117, D-135,
D-136** — with guards in five test files. This is not a technical trade-off. It is a
judgement about how a father wants a machine to describe his daughter, and no
engineering argument can settle it.

**The space is not binary, and this matters more than anything else here.** Already
permitted and **already built**: counts of occasions in his own words; settled versus
not-settled; context transfer across two settings (D-135); what she is currently
working on; and a suggestion held back by a recent contrary occasion (D-112). **Only
the rate is prohibited.**

| Option                                           | Real cost                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Leave the prohibition**                    | Nothing to build. The product keeps saying counts and states, which is what the evidence supports. Cost: zero.                                                                                                                                                                                                                                 |
| **(b) Permit a rate on a stated evidence floor** | Amend or supersede five decisions; rewrite the copy guards that currently fail the build on any rate, share, rank or grade about her; re-derive what the denominator measures; and rebuild the QA suites, which today assert the **opposite** and would have to be inverted. Substantial, and it re-opens the audit's worst finding by design. |
| **(c) Permit it internally, never rendered**     | Already the case for growth confidence (`growth.ts:203-207`, D-112 / AUD-0049). Nothing to decide.                                                                                                                                                                                                                                             |

**Recommendation: (a), do not reverse.** The prohibition costs the owner nothing he
cannot already have — counts, states and transfer are all built — and it protects
the one surface where a wrong number is not a bug but a thing said about a child.
**But this is the owner's, and it is not answered here.**

> **The question:** _"May Life Command OS ever express a rate, share, rank or grade
> about Adaya — and if so, on what evidence floor, and on which surfaces?"_

### 13.2 · Decision 2 — C15, research-grounded priors

**The decision.** May general-population evidence influence what the app says about
or recommends to the owner, before his own record can support it?

**Why it is the owner's.** Plan section 68 requires the app to distinguish what it
was told, what research says generally, and what it infers from combining them. But
section 68 does not say whether the owner **accepts being treated as a member of a
population** — and that is the actual question. Some people find "people who sleep
badly usually…" useful; others find it presumptuous about a life it has not
observed. This turns on how he wants to be treated when the system knows little
about him, and there is no defensible engineering answer.

**Today, research is used only to justify design choices** — Van Dongen for
recovery, Cepeda for spacing, Wood/Bruner/Ross for scaffolding — and **never as a
claim about him.** D-143 already makes told-versus-worked-out two rows.

| Option                                                                                         | Real cost                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Never**                                                                                  | Zero build. The app stays silent where it has no personal evidence. Cost: it is least useful in year one, exactly when he needs it most.                                                                                                                                                                                                                               |
| **(b) Full priors, always labelled**                                                           | A third provenance class beside owner-record and derived, explicit in every surface that renders it, weakening as personal N rises. Substantial, and it is the highest-risk row in the matrix: a prior is confident, well-sourced, and about somebody else. Section 68's blur is one sentence away — one that begins _"people like you"_ and ends as a fact about him. |
| **(c) Bounded to question-aiming, suppression and design justification** _(my recommendation)_ | A prior may (i) **aim a question** in the second agenda — _"this is worth finding out about you"_; (ii) **suppress** an option that general evidence says is unwise; (iii) justify a design choice, as today. It may **never** appear as a premise in a Now reason line, never rank, never score. Modest build, mostly inside D-163's existing agenda.                 |

**Recommendation: (c).** The honest use of general evidence is to decide **what is
worth finding out**, which is a question rather than a claim, and D-089's ladder
already has that rung — _observe first, infer cautiously, ask for a concrete fact._
It gives the owner most of the value at a fraction of the risk. **But whether he
accepts population reasoning about himself at all is not mine.**

> **The question:** _"May general-population research influence what Life Command OS
> says to me — never, only to decide what to ask me and what to hold back, or fully
> and always labelled?"_

### 13.3 · Decision 3 — S2, acceptable daily input burden

**The decision.** How much will the owner actually log, every day, for years?

**Why it is the owner's.** Section 4.5 says the app should require **less** input as
it learns more, and the observe-first architecture means it learns almost nothing on
its own. Every concept in section 5.2 converts directly into a recurring tap. Only
he knows what he will still be doing in month nine — and a vocabulary he abandons is
worse than one he never had, because the engine will read the silence as absence.

| Option                                        | Real cost                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Tier 1 only**                           | Zero new daily taps: everything in Tier 1 is already captured or is a property of candidates. Unblocks C21 and C5. The safest possible answer and it still closes his own CASE B.                                                                       |
| **(b) Tier 1 + Tier 2** _(my recommendation)_ | Two new light daily readings (`work.strain`, and `health.trained-today` which is mostly derived) plus reach over the relationship graph that already exists. Materially widens what the engine can compare.                                             |
| **(c) + Tier 3**                              | Caffeine, alcohol, hydration: one to several taps a day each, aimed at the folk-causal beliefs most likely to be falsely confirmed by an engine with no multiple-comparisons discipline. **Should not be built before routing 97 whatever he answers.** |

**Recommendation: (b), with Tier 3 gated behind 97.** But the honest form of this
question is not which tier — it is the daily reality.

> **The question:** _"On an ordinary bad Tuesday — tired, daughter at home, work
> difficult — how many times am I willing to tell this app something, and about
> what?"_

### 13.4 · Decision 4 — C16, "what to teach her"

**The decision.** Does suggesting lessons, skills or activities to teach his
daughter become an explicit Life Command OS capability?

**Why it is the owner's.** It is a parenting boundary, not a product boundary. The
growth model tracks skills she is working on; nothing suggests what to teach. The
audit's protected item is that **time with her is a first-class move, separate from
working on something with her** — and a teaching feature is the likeliest thing in
this entire document to erode it, because every suggestion nudges the relationship
one step toward a curriculum. Whether that is what he wants fatherhood to be is not
a question anyone else may answer.

| Option                                                            | Real cost                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) No**                                                        | Zero build. The model keeps tracking what she is working on and never proposes what she should.                                                                                                                                                                   |
| **(b) Yes, activities only** _(my recommendation if it is a yes)_ | Suggest something to **do with her** — an experience, a shared activity — never a skill drill and never a lesson plan. The protected item survives explicitly, and the suggestion is about the relationship rather than about her development.                    |
| **(c) Yes, skills and lessons**                                   | Requires a model of what a four-year-old should be able to do, which is a **normative reference about a child** — the exact shape of open question Q1, still deferred, and one step from C19's prohibition. Substantial, and the riskiest thing in this document. |

**Recommendation: (b) if yes, and (a) is entirely respectable.** **Not decided
here.**

> **The question:** _"Should the app ever suggest what to teach Adaya — never, only
> things to do together, or actual skills and lessons?"_

### 13.5 · Decision 5 — connected data sources _(additional; meets the bar)_

**The decision.** May Life Command OS receive evidence from anything other than the
owner's fingers — a phone's step count, a sleep tracker, a calendar, a health app?

**Why it is the owner's, and why it meets the high bar.** This is not a technical
question and it is not a sequencing question. It turns on **whether he wants to be
observed**, which is a value, and on **what burden he will carry**, which only he
knows. The predecessor named it explicitly and left it unowned: _"either the product
accepts a permanently thin evidence base, or a decision about connected data
sources has to be taken, and it is in no phase in this document."_ It is still in no
phase. **It is a different question from D-171**, which deferred cross-device
_synchronisation_ — that is about the record travelling; this is about evidence
arriving.

**And it changes more than anything else in this document.** Correction 3.8: six
tracked concepts and one automatic observation path. Every accumulation capability
the owner described — combinations, lags, trajectories, calibration, discovery — is
starved at the input, not at the inference. **A single connected source of objective
daily evidence would do more for C2, C3, C13 and C14 than any amount of engine
work.**

| Option                                                                     | Real cost                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **(a) Stay manual-only**                                                   | Zero build. Honest, private, entirely under his control, and permanently thin. It bounds what routing 97 can ever find, and that bound should then be written down rather than discovered.                                                       |
| **(b) One narrow read-only source, owner-initiated** _(my recommendation)_ | An import the owner performs, not a live connection — the same shape as the existing backup/restore path, so no account, no server, no new threat model, and D-171 is untouched. Modest build. Roughly doubles the objective evidence available. |
| **(c) Live connected integrations**                                        | Accounts, tokens, a background sync, a new threat model over the most intimate record he owns, and a permission surface. Large, and it reverses the local-first posture the product has held since Phase 0.                                      |

**Recommendation: (b), scoped as an owner-performed import and decided before
routing 97 is specified** — because 97's honest expectations depend on how much
evidence exists. **Not decided here.**

> **The question:** _"Do I want this app to be able to read anything about me that I
> did not type — and if so, may it read one thing I import myself, or should it stay
> entirely manual?"_

### 13.6 · Decision 6 — how the app tells him something is not working — **RESOLVED**

> **Resolved by the owner. The settled resolution is section 13A.** The framing below is preserved as the record of the question that was put.

**The decision.** When the record shows months of no movement toward a destination,
may the app say so **unprompted, on Now** — or only when he opens that destination?

**Why it is the owner's, and why it is narrow enough to meet the bar.** The
_capability_ is mine to decide and I have decided it: the revision loop is built
(routing 95), because a destination the system can only receive is a form. What is
**not** mine is how he wants to be treated by it. Plan section 4.4 — **anti-shame** —
is a non-negotiable product principle, and _"you have not moved on this in eight
months"_ is either the most useful sentence the product will ever produce or the
reason he stops opening it. That depends entirely on him, and nothing in the code or
the evidence can settle it.

| Option                                                                  | Real cost                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Only where he goes looking** — on the destination and on Insights | Smallest build, safest, and consistent with D-169's ruling that review lives on Insights and the domain pages. Cost: the sentence most likely to change his behaviour is the one he must go and find.                                                                                   |
| **(b) On Now, unprompted, bounded** _(my recommendation)_               | Inside Q9's existing one-additional-clause budget, at most once per destination per a long interval, never twice for the same destination without new evidence, always with what would change it. Modest build; the cost is entirely in the wording, and section 4.4 is the live guard. |
| **(c) On Now, whenever true**                                           | Nag behaviour. The QA protocol names "questionnaire, dashboard or nag behaviour" as a defect class. **Not recommended in any form.**                                                                                                                                                    |

**Recommendation: (b).** **Not decided here** — and if the answer is (a), routing
95's scope shrinks and nothing else in the roadmap changes.

> **The question:** _"When I have not moved on something for months, do I want the
> app to tell me on Now without being asked, or only when I go and look?"_

### 13.7 · Decision 7 — C13, sustainable **and increasing** — **RESOLVED**

> **Resolved by the owner. The settled resolution is section 13A.**

**Why this decision exists at all, recorded because the correction matters.** This
document's first draft **refused** C13's "increasing" half and cited D-162 as the
authority. The owner challenged that reading and was right. Two errors:

1. **D-162 was over-applied.** Its forbidden clause does reach _"every owner
   surface"_ — the challenge's premise that it is destination-scoped is incomplete —
   but D-162 states its own resolution as _"description with evidence, not a number
   with a friendly face"_ and permits _"counts of occasions, dates, the owner's own
   stated targets in his own units, and honest uncertainty."_ The shipped
   `trajectoryCards` settles it: it computes a normalised rate of change and
   **deliberately renders none** (`rates: []`, `insights.ts:1899-1902`). **D-162
   forbids the rendered figure. It never forbade the capability.**
2. **A weaker capability was substituted and asserted to be equivalent.** The first
   draft offered _"this kept helping"_ / _"this has flattened"_ as _"the same
   information."_ It is not: that is one intervention's continued efficacy, not the
   owner's capability trajectory. Substituting it narrowed a stated owner intent on
   the adjudicator's own authority, which is the governance error the brief exists
   to prevent.

**Whether the product should pursue continuing capability rather than maintenance
is an owner-value question** — it decides what the system is for, and it decides
whether a plateau is a neutral state or a shortfall, which sits directly on plan
section 4.4. It was therefore promoted to a blocking decision rather than answered.

**C11 and C12 were re-examined for the same fault and no value question was found
in them.** Their refusal is epistemic: steering away from a predicted outcome makes
the counterfactual unobservable, so the app can never learn it was wrong, and the
only mechanism that would make it falsifiable is comparison arms with assigned
exposures — refused as **F17** on owner-protection grounds. **One framing
correction:** S3 and C11 are refused **on evidence**, and section 59 routes a
legacy-exclusion reversal to _"an explicit new decision with a current reason"_ —
so both are **re-openable if blocking decision 5 changes the evidence supply**, in
the same status class as C18, rather than settled product policy. And **C12 falls
with C11 and nothing else** — the Q9 clause-budget argument beside it is a real
design call, not an independent reason.

---

## 13A · The settled resolutions — owner decisions #6 and #7

**Status: RESOLVED BY THE OWNER.** Recorded here as the complete settled
resolution. **This is persistence of the adjudication, not canonicalization.** No
decision-log entry, no plan amendment and no hold change is made by writing it
down; section 14 lists what would eventually carry it into the governing
documents.

### 13A.1 · #7 — sustainable **and increasing** capability: YES

**Life Command OS should explicitly help the owner continue becoming more capable
over time, rather than merely maintaining or sustaining his current level.** The
system is **positively authorized** to say when advancement is genuinely supported
by the evidence — the permission matters as much as the prohibitions, because a
resolution phrased only as "do not say these things" would not authorise the half
that serves the intent.

**Refused within it, and the refusal is technical rather than policy:** fabricated
numeric capability scores, percentages, rates, ranks, grades, acceleration figures,
or anything of the shape _"you are improving 12% faster"_ where the evidence cannot
honestly support it. Qualitative, evidence-grounded advancement is what is built.
The three reasons that hold **independently of D-162** are in section 12.

**Approved minimum package — routing 95, package 1:**

- **rung advancement** — is evidence arriving at higher rungs than in a comparable
  earlier window;
- **new ground versus repeatedly reaching the same ground**;
- the subject-eligibility, delivery, frequency and correction policy in 13A.2–13A.6.

**Deferred, explicitly:**

- **inferred milestone difficulty** — "harder" is not recorded, inferring it would
  be the app judging the owner's work, and a supplied difficulty scale is a quantity
  about him;
- **breadth and transfer** — until its upstream evidence and domain dependencies
  actually exist. `transfer` is asked only about a finished course, so its supply is
  thin, and breadth across domains needs destinations across domains, which is
  routing 94. This is a dependency, not a judgement.

### 13A.2 · #6 — record-state and plateau surfacing

**The app must not make unsupported claims about the owner** — _"You've stalled,"_
_"Progress has been flat,"_ _"This hasn't moved in months."_

**The app may describe what its own record contains. Its record is its memory, not
the owner's history, and is never authority over him.**

**Record-fact grammar is necessary but not sufficient.** A record-factual sentence
can still land as a judgement — _"nothing has been recorded towards being closer to
your daughter since March"_ is literally true and unacceptable. **Safety is
primarily structural**, in this order of weight:

1. eligible statement subject (13A.3);
2. delivery location and owner initiation;
3. domain delivery policy (13A.4);
4. frequency and aggregate limits (13A.5);
5. suppression under declared life seasons, standing blockers, custody constraints,
   recovery conditions, standing obligations and other applicable durable context;
6. veto and correction affordances (13A.6).

**Wording remains the human-reviewed layer.**

> **QA rule, preserved as part of the resolution.** The section 4.4 gate on this
> work is the **ordinary-owner reality track and the phone gate**, not an
> open-ended shame or copy scanner. Modal auxiliaries are a closed grammatical
> class; **shame is not.** Do not guard this with an ever-growing catalogue or
> classifier — that is the instrument-hardening pattern that turned routing 84 into
> nineteen rounds (D-210). **Mechanically guard the closed structural rules; read
> the wording with a person.**

### 13A.3 · Subject eligibility — universal, and independent of domain

**Free-aim kinds are CONTEXT, not record-state or advancement statement subjects.**
Generic `destination` and `goal` may be named in a question or as context, but may
never themselves be the assertion subject.

**Subject eligibility is universal across all twelve domains and does not depend on
the domain tier.**

A record-state or advancement subject must satisfy **both**:

1. **be a typed entity in the closed permitted set**; and
2. **carry at least one real progress-evidence record naming that entity which maps
   to a progress rung.**

**Final permitted kinds** — `routine`, `skill`, `learning-topic`,
`development-skill`, `project`, `work-item`, `financial-goal`; plus
`health-concern` **only** as the object of an owner-named goal.

**Every other `EntityKind` fails closed**, enforced by an **exhaustive
`Record<EntityKind, …>` table**, so a future unclassified kind is a **compile-time
failure** rather than a kind that silently becomes permitted. That is how the hole
opened in the first place: `destination` was added to `ENTITY_KINDS` and inherited
permission by omission.

**Subject eligibility is never inferred from free text.** The sentence subject is
mechanically derived from typed entity structure plus the evidence count.

**Why test 1 is a derivation rather than a stipulation.** `progress.ts`'s
`case 'goal'` branch breaks unless `milestoneOf !== undefined && status ===
'achieved'`, and no generator produces a move whose object is a bare `goal` entity —
`socialCandidates` uses `place` and `person`, `moneyCandidates` uses
`financial-goal`, `careerCandidates` uses `learning-topic`, and health reaches a
milestone whose `MILESTONE_ENTITY` is `routine`. **So a bare `goal` entity can never
accumulate a single rung, in any domain.**

**Preserved prohibitions:**

- no **person or relationship** as an advancement or record-state subject;
- no **feeling or internal-state** plateau statement — a state does not plateau;
- no **belief or faith** plateau statement (D-170 forbids grading faith and treating
  doubt as failure); a **named faith practice is a `routine`** and is eligible;
- no **counted absence** as a disguised negative rate — no rendered zero count, no
  denominator;
- no **cross-domain advancement comparison** — at most one domain named per
  statement (section 22 forbids the composite);
- no **attributed silence** — the grammatical subject of a record-state sentence is
  never "you"; it says _"nothing has been recorded,"_ never _"you haven't"_;
- no **trend characterization in Private / Sexual Health**. Private may never
  volunteer and never characterize a trend on any surface; it may list what is
  recorded.

**A destination may be named in the accompanying revision question**, and is context
rather than the assertion subject. Where a destination has no eligible subject
beneath it, there is nothing to assert and only the question fires — which is
honest, because the app genuinely has nothing to report.

**The irreducible residual, recorded rather than papered over.** The owner may name
a `routine` "get on better with my manager." The app then quotes **his own label**
inside a fixed frame, rendered verbatim (D-018 forbids paraphrase). It never authors
the phrase. The veto handles it in one tap. That floor does not grow under this
rule.

### 13A.4 · Domain tiers — DELIVERY MODE only

The domain-tier table **no longer governs subject eligibility. It governs delivery
mode only: push, pull, or never.**

| Delivery                                                | Domains                                                                                                | Reason                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Push** — may be volunteered, and may propose a change | Career & Learning, Money, Health & Physical Capacity, Home & Environment                               | The aim is an achievement the owner controls and progress is externally evidenced                        |
| **Pull, naming only** — may be shown, proposes nothing  | Sleep & Recovery, Social & Relationships                                                               | Sleep is substantially not willed; social outcomes depend on other people                                |
| **Pull only** — held, shown where the owner navigates   | Fatherhood / Family, Love / Dating / Romantic, Faith & Meaning, Emotional Health, Long-Range Direction | Relationship, belief and state subjects live here, and the record carries least of what actually happens |
| **Never**                                               | Private / Sexual Health                                                                                | D-167                                                                                                    |

**Nothing volunteered on Now by default.** Where a move already serves a
destination, advancement language rides the existing `proposedBecause` reason line,
so it is **not an additional clause** and never competes for Q9's single slot.

### 13A.5 · Frequency and aggregate bounds — derived from existing cadence

Every number is an existing product constant. No new constant is introduced.

- **First record-state statement only after `DOMAIN_QUIET_DAYS = 28`**
  (`coverage.ts:260`);
- **repeat floor `STALE_BELIEF_DAYS = 60`** (`insights.ts:144`);
- **calendar time alone NEVER permits repetition.** A repeat requires **both** the
  time floor **and** mechanically new information;
- a **known-incomplete** marker suppresses the affected span **indefinitely**, until
  genuinely new evidence begins a fresh span;
- a **veto** suppresses until lifted;
- **answered discovery questions are remembered and not re-asked** (D-163).

**Volunteered, question-shaped statements inherit `DISCOVERY_PER_WEEK = 2`**
(`discovery.ts:72`) **and D-184's one-prompt-per-object rule.** They are the same
class of communication D-163 created that budget for. **No new aggregate nagging
budget is needed.**

**Pull-shaped content** consumes no budget but is bounded per view: **at most one
line per destination on a composed view**, with grouped presentation where
appropriate (AUD-0044, routing 90).

### 13A.6 · The incomplete-record correction

**Every consequential record-state statement must be answerable.** When the owner
says the equivalent of _"I've been doing this — it just isn't written down,"_ a
**known-incomplete marker** is recorded for that subject and span.

**What it is not, and this is the whole design:**

- it is **not progress evidence**;
- it **does not manufacture** an event, date, quantity, milestone or rung;
- it **does not silently reaffirm** the destination — correcting the record is not
  renewing the aim.

**What it does:**

- changes the affected span **from empty to unknown**;
- prevents that span supporting **either stagnation or advancement** — the asymmetry
  matters, because a correction that suppressed only the negative statement while
  still permitting advancement over the same span would be a way to buy good news;
- suppresses the disputed record-state conclusion for that span.

**"The record is incomplete here" is a distinct correction gesture**, added to
D-165's grammar as a fifth alongside wrong event, wrong date, wrong current fact and
disagree-with-the-inference. It inherits D-165's rule unchanged: **it states its
consequence before it acts.**

> **A correction may cause the app to say less. It may not silently conclude more.**

Repeated corrections may **reduce how often the app speaks about that record** — a
behaviour change, monotone toward silence — but must never become a conclusion about
the owner.

**It does not collide with backfill.** A known-incomplete marker is a statement
_about the record_, the same class as a correction, not a backfilled event. When
authoring history lands in Reach, a known-incomplete span is precisely where an
optional, owner-authored, owner-dated fill would be offered.

### 13A.7 · Verified implementation facts recorded with the resolution

**A per-entity progress selector is still needed.** `progressReading(situation,
domains)` groups by **domain**, and `ProgressEntry.about` is a display label derived
from the first resolvable entity on the record, not a key. Records already carry
`entities: EntityRef[]` on the envelope, so grouping by entity ref is a **small
selector-level implementation — no schema change and no authoring change** — but it
is real work, and it is routing 95 package 1's first task.

**No authoring burden, and no dependency on unresolved decision #3.** Subject
eligibility reads only `entity.kind` and the evidence count. `kind` and `domain` are
**required, non-optional fields on every `SemanticEntity` ever written**, so there is
no unclassified legacy state, no migration, and nothing manufactured. This adds no
field, no question and no tap, and therefore **cannot be blocked by, and does not
pre-empt, owner decision #3.**

**Money needs no additional typed structure.** `MILESTONE_ENTITY[money]` already
creates a `financial-goal` entity when a milestone is named (`authoring.ts:627`), and
that is the same act that makes Money capable of producing evidence at all —
`moneyCandidates` returns `[]` without one (`candidates.ts:721`). So a bare Money aim
has no eligible subject **and no evidence**; the rule reports an existing product
state rather than creating a gap.

### 13A.8 · Known limitation, with routing 94 as its owner

**`milestoneEntityKind` falls back to `'goal'`** for every domain absent from
`MILESTONE_ENTITY` (`authoring.ts:625-631`). Under the settled subject-eligibility
rule, **milestones in Fatherhood, Social, Home, Faith, Emotional, Private and
Direction are therefore not record-state or advancement statement subjects today.**
**Routines and skills in those domains remain eligible** when they satisfy the
evidence test.

**This is correct under the current implementation**, because those milestone
entities also carry no usable progress evidence — no generator produces moves about
them. It is a restriction, not a defect.

**Extending `MILESTONE_ENTITY` for those domains belongs to routing 94**, the
domains phase, where the per-domain work already lives. **Recorded here with its
owner so it is not rediscovered in QA or mid-implementation.**

### 13A.9 · Roadmap disposition carried by these decisions

- **Do not move this work into routing 93**, which is already the highest-risk phase.
- **F14 moves out of routing 93** to join the same advancement axis.
- **Routing 95 becomes _advancement and revision_**, and the **C13 minimum is its
  first package**.
- **Routing 96 becomes _expectation and reconciliation_.**
- **Longitudinal inference / D-172 moves to routing 97.**
- **Canonical 101 / 102 / 103 are preserved** — the insert landed inside the reserved
  headroom — unless later adjudication evidence requires otherwise.

---

## 13B · Owner decision #3 — acceptable daily input and authoring burden — **RESOLVED**

**Approved: Tier 1 + Tier 2, conditional on consumers. Tier 3 deferred.**

> ### SUPERSEDED IN PART — D-285 and D-286, owner-decided 2026-09-04
>
> **Two clauses of the lock below no longer hold. Read
> [`STATE_ENGINE_OWNER_DECISION.md`](STATE_ENGINE_OWNER_DECISION.md) before
> building anything that asks the owner a question.**
>
> - **`QUESTIONS_PER_DAY = 3` is a default, not a ceiling (D-285).** The owner sets
>   depth and frequency himself. What §13B was protecting — an app that
>   interrogates its owner — is still real; who decides where the line sits has
>   changed.
> - **Information-value gating is no longer the only gate (D-286).** A second
>   budget exists for a fixed check-in ritual, exempt from the swing rule and
>   counted separately, because a state reading's value is that it makes
>   _tomorrow's_ pattern match possible and `probeSwings` cannot measure that.
>
> **Measured 2026-09-03:** under the rules below, a new store is asked **one
> question a day**, three days running. The ceiling was never reached; the gate is
> what starved it. Everything else in §13B stands.

### The lock

- **`QUESTIONS_PER_DAY = 3` remains a hard ceiling** and is not raised.
- **Daily push burden must not increase.**
- **Unknown remains unknown.**
- **No question becomes eligible merely because it is stale.**
- **Information-value gating remains intact.**
- **Wider evidence coverage is acceptable even when individual concepts are
  refreshed less often** — the owner accepted lower freshness for wider reach,
  which is the real trade this decision makes.

### Unconditionally approved and buildable — routing 92

The supervision / must-stay blocker concept; `requiresLeaving`; a bounded blocker
`until`; **`health.trained-today`, derived whenever existing movement evidence can
settle it** rather than asked; **`context.people-present`, reached from the
relationship graph AUD-0047 says already exists** rather than from new owner
input. None depends on the guide selector.

### The condition on new askable concepts

> **A concept may ship as askable only when an actual consumer exists that makes
> at least one possible answer capable of materially changing a decision. Do not
> ship declared-but-unreachable concepts.**

This is the `emotionalState` failure written as a rule: `materialToDecision:
true`, `askWhenStale: true`, and **no reachable owner-facing question since Phase
1** — because it is absent from the `QUESTIONS` catalogue and read by nothing.

### D-166 clarification — a routing/consumer split, not a reversal

**D-166's six emotional dimensions remain APPROVED.** What is clarified is that
**D-166 does not require all six to become askable in routing 92.** Their
implementation follows their honest consumers:

| Dimension                               | Disposition                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **loneliness / social-connection need** | Routing 92 candidate via **AUD-0013's missing social-demand path** — the social generator today fires only once the owner has said he feels sociable |
| **overwhelm**                           | Routing 92 candidate via the **capacity limiter**, which renders as _"What is in the way"_                                                           |
| **motivation**                          | Routing 92 **only if** an honest capacity/friction consumer is demonstrated                                                                          |
| **stress**                              | Routing 92 **only if** an honest friction/opportunity-cost consumer is demonstrated                                                                  |
| **mood**                                | **Not askable in routing 92** without a real consumer                                                                                                |
| **confidence**                          | **Deferred to routing 94 / F25**, where the progression consumer belongs                                                                             |

**When D-166 is later persisted or canonicalized, record explicitly that the six
approved dimensions may land in different routing packages, and that approval of
the vocabulary is not approval to create unreachable questions.**

### `work.strain`

May ship with the **existing `Capacity` / `strain` consumer wired to it**. It
requires no selector redesign: `situation.capacity.strain` already exists and is
read by `applyConstraints` and the capacity limiter.

### Selector — unchanged, and the proposed tiebreak already exists

**Keep existing selector semantics.** The `overdue` term in `mostValuable`
(`guide.ts:186-197`) is already the bounded least-recently-used tiebreak, sitting
**below** the two information-value measures and **above** catalogue order, with
its own comment: _"Coverage never makes a question askable."_

**Do not add** staleness quotas, forced rotation, coverage rules that create
eligibility, or questions asked merely because they have not been asked recently.

### Standing starvation QA gate — with a closed exemption discipline

> **A concept declaring `materialToDecision: true` that wins zero question slots
> across the complete scenario library is a defect.**

**But STARVED and LEGITIMATELY RARE must be distinguished.** A concept too narrow
to win in the ordinary library may be exempt **only** through a named, exhaustive
exemption registry carrying: the concept identifier; a written reason; the
specific circumstance in which it becomes decision-relevant; and **a dedicated
test proving that circumstance can actually make it win.**

**An exemption is not a generic escape hatch, and a concept with no consumer may
never use the rare-concept exemption.**

### Performance requirement — shipped with the expansion, not deferred to 101

**Verified cost:** today ≈ **21** full `buildView + decide` evaluations per guide
render (option counts 4+4+4+2+3+3 = 20 probes, plus `lastAnswerMovedIt`'s
replay). Under a naive Tier 1 + Tier 2 expansion, ≈ **50**.

**And the worst case is the common case for the new concepts**: `shouldAsk`
returns true when knowledge is `unknown`, and emotional concepts are unknown
almost always by design, so they would be probed on essentially every render.

**Ship bounded performance work with the question expansion:** pre-filter probe
candidates to concepts with an active consumer in the current situation; use
incremental probe projection rather than rebuilding the whole long-history view
per option where feasible; keep new answer sets to the smallest semantically
honest size; verify on the physical-phone gate. **These optimizations must not
alter selection semantics.**

**Do not defer this to routing 101** — the phase that would otherwise catch it
runs three phases later.

### Tier 3 — deferred

**No ordinary-use event logging for caffeine, alcohol or hydration.** Tier 3 stays
behind **routing 97** and its stronger inference and correction discipline.

### The burden feedback mechanism

The known-incomplete correction (§13A.6) remains the instrument. **Repeated
corrections may move the system toward asking and speaking less. They may never
become a judgement about the owner's character or reliability.**

### Classification

**B — CONDITIONAL, CONSUMER**, executed **E-shaped**: the unconditional items ship;
each askable concept ships only with its consumer, or does not ship.

---

## 13C · Owner decision #2 — research-grounded priors — **RESOLVED**

**Approved: OPTION B. Options C and D declined.**

### What is permitted

Research-grounded priors may influence **what Life Command OS decides is worth
ASKING or INVESTIGATING** about the owner. The approved uses are: identify
potentially useful questions; spend the bounded discovery agenda more
intelligently; identify evidence that may be worth seeking; and help the system
know where caution or missing evidence matters.

### What is forbidden

A prior may **not** become a finding about the owner; may **not** determine
recommendations; may **not** influence recommendation ranking merely because
evidence about him is sparse; and may **not** persist as a substitute for
personal evidence.

> **BOUNDED BY D-289, owner-decided 2026-09-04.** A **research-built move
> catalogue** is approved: research supplies candidates, and **only the owner's
> own measured effects rank them.** That widens the candidate pool without a prior
> determining a recommendation, so the clause above is intact — **except on day
> one**, when nothing is measured and the choice among plausible moves is
> necessarily the prior's. That case needs an explicit rule and is the honest
> residue of D-289.
>
> **And the reasoning for declining Option C has changed underneath this section.**
> C was refused because _"it gets less safe as evidence gets sparser… with a hard
> three-question daily ceiling, evidence accumulates slowly and permanently."_
> **D-285 removes that ceiling.** The owner chose the conservative form anyway;
> D-289 records that the stronger one is now available on its own terms.

### When a prior causes a question

The question must still satisfy every discovery rule; **the owner's answer becomes
the personal evidence**; the prior does not become a belief about him; **skipping
the question produces no inferred fact**; and provenance must support answering
_"why did you ask me this?"_

### The permission is intentionally self-extinguishing

**Research may help decide what is worth learning about the owner. Once he
answers, his evidence replaces the prior's role.**

### Why C is declined, recorded because the reasoning inverts the obvious one

**Option C is not merely riskier than B — it gets _less_ safe as evidence gets
sparser.** C's guard is that the prior weakens as personal evidence accumulates.
With **no connected-data source** (#5 unresolved) and a hard three-question daily
ceiling (#3), evidence accumulates slowly and permanently — so **a mechanism
designed to be temporary becomes the standing behaviour, and a rule whose safety
depends on a condition that will not arrive is not safe.**

**Record that sparse personal evidence strengthened B while making C less safe.**

**Option D** — population evidence directly determining recommendations with no
personal evidence — is **not approved**.

### Roadmap

**Routing 92**, inside D-163's existing discovery agenda. No new provenance class
rendered in every evidence surface, no decay rule, and **no dependency on routing
96's confidence work** — all of which C would have required and which are
therefore deleted from 92's scope.

---

## 13D · Owner decision #1 — child progress measurement — **RESOLVED**

> **REDRAWN AT THE BOUNDARY BY D-291, owner-decided 2026-09-04 — not reversed.**
>
> The prohibition applies to any figure about Adaya measured against something
> **outside the owner's own record**. **Counts of what she did and how much help
> she needed, against a list the owner authored, are permitted** — rendered as
> counts, never as a bare percentage or a progress bar.
>
> Everything below stands otherwise. No comparison to another child, no age
> expectation rendered anywhere, no grade, no rank, no rate, no share. §13G's
> suppression-only rule is untouched.
>
> **Why the line moved.** §13G's reasoning is entirely about **norms** — _"a
> symmetric norm is a percentile with extra steps"_. A percentile against other
> children and a count against a list the owner wrote are different objects that
> share a symbol, and the clause caught the second by accident. **The norm, where
> one exists, is in the choice of rows and not in the number** — which is why
> D-291 also requires that any skill list be sourced.

**Approved: CHOICE A. The existing protected qualitative, per-entity growth model
is kept.**

### The lock

**Not authorized:** rates, shares, percentages, grades, rankings or numeric
progress summaries about Adaya. **D-070, D-112, D-117, D-135 and D-136 remain in
force. C19 remains load-bearing.**

> **The #6/#7 subject-class rule does NOT itself protect against numeric child
> measurement**, because `development-skill` is already a legal statement subject.
> **The child-specific prohibition must remain independently enforced.** Two
> constraints, both required: the subject rule governs _which entity may be a
> subject_; C19 governs _what may be said about it_.

### The owner's reason, recorded because it is the argument

**The question he wants answered is _"how close is she to doing this solely on her
own?"_ and a percentage cannot answer it.**

**The trajectory problem.** All three of these produce 50%, and they are
materially different:

```
✗ ✗ ✗ ✓ ✓ ✓        ✓ ✓ ✓ ✗ ✗ ✗        ✓ ✗ ✓ ✗ ✓ ✗
```

**The task-difficulty problem.** If she becomes independent at an easier version
of a skill and is then moved to a harder version, a success percentage may
**fall while she is actually advancing**. That must never be presented as
regression merely because the task became harder.

**The denominator problem.** Life Command OS sees only a fraction of the
occasions that actually happen. So _"3 of 6 recorded occasions"_ must never
silently become _"she succeeds 50% of the time."_ **The denominator is the app's
observed record, not her life** — and more recorded data does not fix it unless
the system observes a sufficiently complete denominator, which this product
should not assume.

### What remains available, and it is substantial

Occasion history; occasions that went the other way; the help ladder
`needed-me → a-small-prompt → on-her-own`; current run; setting; widening
settings; cross-setting generalization; owner-confirmed reversible settled
status; `widen-the-setting`; qualitative per-entity advancement under #7; and
internal confidence that never renders.

### Longitudinal understanding is wanted and is legal

A year-scale **qualitative** Fatherhood progression view — March: _"1 in a row,
one setting."_ October: _"4 in a row, three settings."_ — showing longer runs,
less scaffolding, wider settings, sustained settled status, and new ground versus
repeatedly reaching the same ground, **is a valid future domain capability and
does not require reopening #1.**

### Option B disposition

**PER-ENTITY B is already authorized under owner decision #7.** **CROSS-ENTITY B
is not legal** under the locked #6/#7 subject rule, because every candidate
subject is prohibited: `life-domain` explicitly, a synthetic "my provision"
entity is not in the permitted set, and a destination is context and never an
assertion subject.

**Do not invent a Fatherhood aggregate entity, a synthetic provision entity, or a
`life-domain` assertion subject to recreate it.**

### The preferred legal composition pattern

> _"Towards being closer to Adaya — the Saturday-morning routine has occasions
> across three settings now."_

The **destination is context**; the **routine or `development-skill` is the
assertion subject**. This connects the Fatherhood aim to evidence about a real
permitted entity without a domain-level aggregate.

**Fatherhood remains pull-only / owner-initiated.** This may appear when the owner
navigates to the relevant Fatherhood or destination surface. **It may not be
volunteered proactively on Now.**

### D-135 preservation

**#7's deferral of broader breadth-and-transfer work must NOT be read as
retracting D-135.** D-135's setting-spread and generalization capability has its
own shipped evidence supply — `OccasionSetting`, `settingsIn()`, the two-setting
bar, `widen-the-setting` — and **remains existing protected capability.**

### The real gap, and its owner

**The help ladder is captured and discarded.** Verified: `growth.ts` contains
**zero** references to `help`, `helpLevelOf` or `HelpLevel`; `cleared` is a binary
(`reached >= GROWTH_CLEARLY`); `settingsIn()` consumes the **optional** `setting`
while the **required** `help` is read by nothing; and `helpLevelOf()`
(`outcomes.ts:884`) has **no consumer anywhere in the repository** — it is dead
code.

**The consequence the owner named:** `needed-me → needed-me → a-small-prompt →
a-small-prompt` contains real movement, produces `trailingRun` 0, no suggestion,
and **no sentence anywhere in the app**. `occasionsSummary` exists only on a
suggestion, and a suggestion requires `runLength >= 3`.

> **The app can say "arrived." It cannot say "closer." That register does not
> exist.**

**Form (b) — the descriptive ladder reader — is therefore not additive polish. It
is the only thing that would surface approach-to-independence at all.** It needs
**no rate**: ordinal rungs, counts and sequence only. **No new Fatherhood view is
required** — development-skills are already listed on the Fatherhood page with
D-136's stage control, which is also the surface the pull-only rule requires.

**Owner: routing 94.** Recorded as a capability gap with an owner. **Not
scheduled.** **Form (a) is deleted** — see correction 3.19.

### Reversibility, recorded as the owner framed it

**C19 is contained to reverse later** if real owner experience shows the
qualitative model insufficient. **He is not choosing that reversal now**, and if
he later reopens it, it should be because the shipped qualitative experience
failed to answer his real question — **not because a percentage looked more
rigorous.**

### Q1 stays separate

**#1 does not decide** whether the app knows Adaya's age, normative developmental
references, what is typical at her age, peer comparison, expected developmental
rates, or whether age becomes model input. Those were Q1 / AUD-0018 — resolved
separately at §13G.

---

## 13E · Owner decision #4 — teaching support — **RESOLVED**

**Approved: B-owner-directed + C, with the bounded two-class
growth-opportunity cap.**

### The lock

The owner may name a growth area he wants to work on with Adaya. Life Command OS
may help him plan **how** to support it, using evidence it already records.
**He chooses WHAT. The app may help decide HOW to pitch his assistance next
time.**

> **Teaching support remains an OPTIONAL branch of Fatherhood, never the
> definition of good Fatherhood.**

### Owner-directed authoring — routing 94

**`development-skill` is not authorable through ordinary owner use today.**
`AUTHORABLE_KINDS` is `goal, routine, person, place, skill, obligation`, and
`ENTITY_FOR` maps `skill → 'skill'`. Every `development-skill` arrives through a
fixture. **This is F04's pattern one entity kind further on**, uncaught because
D-173 kept Fatherhood outside routing 84's proving scope.

**Approve the ordinary-use authoring route. Do not require fixtures. Reuse the
existing create-and-confirm authoring contract. Do not introduce a new record
family, provenance model or schema merely to support this.**

**This permission is OWNER-DIRECTED only.** The app may not independently decide
what a child like Adaya should learn — that remained Q1 / AUD-0018 and was
declined there (§13G).

### Authoring relationship correctness — a behavioural acceptance test

**Authoring is not complete merely because a `development-skill` entity can be
created.** The generic authoring path appears to write `part-of` for kinds other
than `skill` or `routine`, while Fatherhood growth candidacy walks the
**`about-person`** link — `fatherhoodCandidates` skips any skill whose
`entities.linked(skill.id, 'about-person')` is not the child.

A `development-skill` authored through **ordinary owner use** must:

1. be created successfully;
2. be associated with Adaya using **the relationship shape the Fatherhood
   reasoning actually consumes**;
3. survive projection and reload;
4. appear in the Fatherhood domain skill structure;
5. **produce an eligible `growth-opportunity` candidate on the next qualifying
   render** when the remaining candidacy conditions are met.

**Existing in the entity store is not sufficient. Do not create an authoring
route that writes a syntactically valid but reasoning-invisible
`development-skill`.** If the existing generic authoring path cannot express the
required relationship, that repair is **part of this authoring prerequisite** and
belongs to the routing 94 package.

### Near-duplicate skills must be surfaced, not silently created

`entityId(kind, name)` is deterministic and label-derived, so **"Getting dressed"
and "Getting dressed on her own" produce different entities and separate evidence
pools** — splitting occasions across two skills so that neither reaches the
sequence the growth model requires.

**Before creating a `development-skill` whose proposed label is close to an
existing one for the same child**: surface the potential duplicate in the
authoring proposal; show the existing skill as an option; let the owner choose.
**Use the existing `AuthoringProposal.problems` channel** rather than a new
authoring architecture.

**Do not auto-merge. Do not silently redirect the owner's wording. Propose and
let him choose**, and **preserve his choice** if he explicitly creates the
distinct skill anyway.

**Acceptance test:** with "Getting dressed" already existing for Adaya, authoring
"Getting dressed on her own" must surface the existing skill as a possible match
and must **not** silently create a second entity before he chooses.

**This protection prevents accidental evidence fragmentation. It does not decide
that two skills are semantically identical.**

### C — scaffolding and approach-to-independence

**Approved.** Life Command OS may consume the ordinal help ladder
`needed-me → a-small-prompt → on-her-own` to show approach-to-independence and
help the owner decide how much assistance to give next time.

**C includes the descriptive ladder-reading capability, and therefore includes the
currently missing "closer" register.** Legal evidence language may say _"the last
two went with a small prompt, where the three before that needed you"_ — or
equivalent showing less help over time, current ordinal rung, recent sequence,
counts of observed occasions, setting spread, and whether independent performance
has begun holding across settings.

**Forbidden:** percentages, rates, shares, grades, ranks, numeric progress scores,
and rendered zero-count constructions. **Preserve sequence and ordinal shape
rather than compressing the trajectory.**

**The Fatherhood domain page is the correct home. No new Fatherhood view is
required.**

### Guidance safety

Guidance preserves **D-136's protected shape**: proposed not asserted;
owner-confirmed where a stored judgement is involved; reversible; never silently
converted into a developmental fact. **The assertion subject remains the permitted
`development-skill`.** No age norm, peer comparison or normative developmental
model is authorized by #4.

### Fatherhood delivery — both surfaces coexist

**Pull-only applies to the NEW descriptive "closer" register and the NEW
scaffolding guidance.** They belong on the Fatherhood or destination surface and
**may not be volunteered proactively on Now merely because evidence exists.**

**The EXISTING growth suggestion is unchanged and stays where it is.** The
settled / `widen-the-setting` suggestion renders on Now, and that is where the
owner confirms or rejects a stored judgement about her. **It is a proposal
attached to a move he has just acted on, which is a different speech act from
volunteering a progress report.**

**Do not move it to the Fatherhood page for consistency. Do not gate it behind
opening the domain page.** Removing or relocating it would break the loop by which
settled judgements are proposed, confirmed, rejected and later revisited.

**Both surfaces coexist:** confirmation on Now when he has just acted; fuller
approach-to-independence information on the Fatherhood page when he goes looking.

### Ordinary time remains first-class

**Do not** merge `time-with` into `growth-opportunity`; score ordinary time for
developmental productivity; make play require a lesson; make affection, presence
or shared experience look incomplete because no skill was practised; or
characterize ordinary time as a missed developmental opportunity.

### The two-class growth-opportunity cap

**Approved as a candidate-VOLUME protection.**

**The problem it solves, verified:** `generateCandidates` deduplicates by
`verb/object.id`, so different skills are different objects and are **not**
deduplicated. Three non-settled skills produce **three** growth candidates
against **one** `time-with`. The threat to ordinary time is candidate volume, not
copy — and it is already mildly true today.

**The rule.** Partition `growth-opportunity` candidates by `standing.stage`:

- **Practice class** — non-settled skills. Retain at most **one**.
- **Maintenance class** — settled skills where `maintenanceProbeDue()` is true.
  Retain at most **one**.

**At most two growth-opportunity candidates proceed into final arbitration, and
that bound is constant regardless of how many skills the owner authors.** Naming
ten growth areas must not create ten competitors against `time-with`.

**Why two classes rather than one slot.** `candidates.ts:496` re-admits settled
skills when a probe is due, and a single slot would let an active skill suppress
the probe — the only app-initiated safeguard against `settled` becoming
permanent, which D-136 and AUD-0015(a) both forbid.

### Selection inside each class

**Do not invent a ranking of Adaya's skills. Reuse existing move evaluation.**
Within each class, use the existing move score and then the deterministic id
tiebreak.

**And for growth-opportunity candidates `compare` collapses past its middle
terms:** they share the verb, so friction ties; they share the Fatherhood domain,
so the limiter term ties. **The discriminator is score alone, then the explicitly
meaningless id tiebreak.** The selection answers _"which move is most useful
tonight?"_ and cannot answer _"which skill is Adaya best or worst at?"_

**Do not render or persist an ordering of her development-skills.**

### Cap placement

**AFTER candidate evaluation, BEFORE final arbitration.**

**Not before evaluation**, because the move scores required to choose the best
candidate do not yet exist — and a pre-evaluation cap would need some other rule
to pick, which is the judgement-about-her risk. **Not after arbitration**, because
that is too late to prevent volume from crowding out `time-with`.

### Trace integrity

**Do not silently shrink candidate accounting.** Set-aside growth opportunities
must remain truthfully represented in `ranked.length` notes, runner-up reporting,
chosen-from-N notes and no-action trace language. Equivalent truthful language:
_"chosen at 0.62 from 5 that fitted, with 3 further growth opportunities set
aside."_ **The requirement is truthful accounting, not that exact sentence.**

### What remains outside #4

**A** — ordinary `time-with` already ships and remains protected; named
non-developmental activities are Reach/content work (AUD-0045-shaped), not a new
owner permission. **B-system-directed** — Q1 / AUD-0018, declined at §13G.
**D** — bounded qualitative assessment already ships; numeric assessment
prohibited by #1. **E** — Q1 / AUD-0018, declined at §13G.

---

## 13E.1 · The maintenance-probe result — classification B

**Carried forward exactly as verified. This is NOT a scoring defect requiring a
scoring change.**

A due probe begins with a **0.20 weighted urgency disadvantage** against an active
`opportunity-window` candidate (0.3 vs 0.5, weight 1). **The existing duplication
mechanisms recover it.**

**Ignore path.** `shownToday` counts a move once per **distinct `now`** — not per
repaint. With three active skills, the due probe can become the top growth
candidate by the **fourth distinct visit**, once each active candidate has
surfaced: 0.55 gap × weight 0.8 = **+0.44** against a 0.20 deficit.

**Response path.** Once competing skills accumulate `sameThing` (−0.5) while the
probe carries only `sameShape` (−0.2): 0.3 × 0.8 = **+0.24**, also clearing it.

**Growth-ladder thread bound.** `thread-fit` (value 1, weight 1) can delay
recovery while a competing skill has a **live** thread. The delay is **bounded**:
`steps: 3`, `lastsDays: 42`, expiry set once and never extended; `activeThreads`
includes finished, stopped, abandoned and expired threads, so `threadOfferFor`'s
`answered` check **permanently blocks a re-offer on the same subject**;
`startThreadRecord` has one product call site gated on that offer; and
`entityId(kind, label)` is deterministic, so re-authoring the same normalized
label cannot evade the block.

> **At most one growth-ladder thread per `development-skill` for that skill's
> lifetime, and at most 42 days of thread-fit per skill. A genuinely different
> skill may have its own one-time thread.**

**This is bounded delay, not indefinite starvation.**

**Owner correction remains independently available.** The Fatherhood page already
exposes the stage control. **A delayed app reminder is not an inability to correct
the belief** — distinguish app-initiated resurfacing through arbitration from
owner-initiated inspection and reversal.

### Classification and what is deleted

**B — CALIBRATION / REGRESSION QA.** **Do not create** a routing 93 scoring
package, a new scoring dimension, probe-specific urgency escalation, a global
`stale-evidence` urgency change, or a separate written scoring decision.
**Routing 93 carries the regression coverage only.**

### The probe regression — five arms

**Arm A, ignore path.** One due settled probe plus three active practising
skills; **advance `now` between distinct visits** so `noteShown` actually counts;
ignore each shown move; assert the probe becomes **CHOSEN AND SHOWN** within the
verified distinct-visit bound. **Not merely that it entered arbitration.**

**Arm B, response path.** Same history; respond across child-present evenings so
`recentMoves` accumulates; assert the probe recovers and is **chosen and shown**
under the documented conditions.

**Loop close.** Acting on the shown probe produces an episode; `wasAttempted`
becomes true; `probes` increments; the maintenance interval advances.

**Null arm.** With no probe due, no probe may be shown merely to satisfy the test.

**Thread-fit bound arm.** With a competing skill holding a live growth-ladder
thread, assert **the documented bound, not "whatever happens"**: live thread-fit
can delay the probe; the thread ends at three steps or 42 days; expiry is not
extended; the same skill cannot receive another thread after the historical one
answered that subject; and once the live thread ends its thread-fit stops
pulling. **If any of those mechanics change, the test goes red.**

**The two-class cap remains only a candidate-volume protection. It does not fix
or cause maintenance scheduling behaviour, and maintenance behaviour does not
reopen #4.**

---

## 13F · Q4 — legacy evidence admissibility — **RESOLVED**

**Rung A declined. AUD-0030(b) is not built. The quarantine holds.**

Objective legacy episodes stay archived as `imported-legacy-record` and **do not
become admissible evidence.**

### The reason — not caution, a failed justification

AUD-0030(b) is justified as _"the difference between a brain that starts cold and
one that starts with years."_ **That is false as built.**

`comparable` (`learning.ts:493-501`) is a thin wrapper over `comparableEpisodes`
for **all five verb-keyed dimensions** — its own comment: _"The same selection,
under the name the rest of this file already used."_ And `comparableEpisodes`
imposes two gates:

- **`:471`** — `if (theirs === undefined) continue`, with the comment _"An episode
  with no context recorded cannot claim to resemble tonight. It is still history;
  it is not evidence about a situation."_
- **`:473-474`** — `similarity(theirs, context)` must clear `RECOGNISABLE`.

**Legacy episodes cannot carry that context.** The family that held it —
`context-snapshot` — is archived under an **independent** decision: _"Every part
of it is either the old engine's taxonomy — capacity bands, protected contexts —
or a reading this app's own registry declines to track over time."_ Reconstructing
it means importing the old engine's taxonomy, which is what **D-101** exists to
prevent.

**So the brain starts cold either way.** (b) would buy a new record kind, an
episode-projection extension, a `MAPPING_RULES_VERSION` bump and extended
quarantine tests — in exchange for episodes skipped at `:471` or `:474`. **The
narrow verb-keyed position does not rescue it, because it passes through the same
gate.**

### What the decline also settles

**Association: not admitted.** Section 59's own note — _"importing these would
make the old catalogue **the object** of every relationship this app learns"_ —
describes `observed-change`'s key exactly (D-091 invariant 1: a relationship is
scoped to verb **and** object). **No sealed wrapper changes a key.**

**Reliability: `legacy-import` 0.5 stays a _second_ fence** and is not asked to be
the only one. Its own comment: _"section 30 keeps imported history from silently
driving decisions, and this is the second fence rather than the first."_

### The other three rungs

- **B — owner-reported states: already shipped, nothing to decide.** `observation`
  and `observation-correction` map and remain canonical.
- **C — owner attributions: remain the owner's.** They may never become observed
  causal relationships, and this is **already structural** — an imported judgement
  cannot manufacture the comparison group `association.ts` requires.
- **D — old-system conclusions: never canonical.** Confirmed as archived.

### Explicitly outside this decision — written, not inferred

> **`milestone-observation` is OUTSIDE Q4's scope and goes to Q1 / AUD-0018. No
> part of this answer admits it. Adaya's recorded developmental history is not
> made admissible by anything here, and importing checklist-based developmental
> claims about her is against owner decision #1's lock.**

It was subsequently **declined at Q1.5** (§13G).

### `life-context-change` — routed, not decided

**Not decided as an admissibility question, because it is not one.** It needs an
S2 concept that does not exist — a `ContextRecord` carries `concept` + `value`
and the registry has no entry for _"something changed in my life."_ **That makes
it routing 92 vocabulary work.**

**Route it to routing 92. When the concept exists, bring it back as a vocabulary
decision**, with its `lifeSeasonCards` consequence and its **retroactive
season-marking effect** stated — a durable `context` record is one of the
declared-constraint classes that suppresses a record-state statement under #6, so
admitting historical context changes would retroactively mark past spans as
declared seasons.

**The owner is inclined toward yes** — a house move is a fact about his life
whichever engine recorded it — **but is not deciding it before the thing it needs
exists.**

### What still ships

**AUD-0030(a) is unaffected and wanted:** the import screen tells the owner plainly
which families came across as history and which did not. **A "no" here is not
silence.** It remains routing 93 work.

---

## 13G · Q1 / AUD-0018 — age and normative reference — **RESOLVED**

**Five sub-decisions. 1.1 yes; 1.2 yes, suppression-only; 1.3, 1.4 and 1.5 no.
AUD-0018 is unblocked.**

**Owner decision #1 and C19 are untouched by all of it.** No rates, shares,
percentages, grades, rankings or numeric progress summaries about Adaya.

> **D-291 (2026-09-04) redraws where that clause bites** — it applies to figures
> measured against something **outside the owner's own record**, so counts against
> a list he authored are permitted. **Nothing in §13G changes.** The
> suppression-only rule below, the refusal of symmetric speech, and the refusal of
> asymmetric pull-only speech all stand, and D-291 additionally requires that any
> skill list be **sourced** — because an unsourced age-derived list is this
> section's own risk arriving without its citation.

### The reframing this rests on

**No birthdate, no age and no developmental reference exists anywhere in the
codebase.** AUD-0018's problem is **not** that the app cannot rank her:

> _"Every judgement the growth model makes is age-relative and it has no age…
> It is also an anti-shame problem **in the direction section 4.4 does not name:
> the risk is not shaming the owner, it is quietly framing normal** [as a gap]."_

`growth.ts` was built as _"a counter over occasions rather than as a judgement
about a child of a particular age."_ **The current state is not neutral** — every
unsettled skill reads as a growth area with no way to know it is ordinary.

### 1.1 — Adaya's date of birth: **YES**

Optional, asked once, durable, never re-asked — **exactly like custody**. A person
entity field. **It is a fact the owner supplies, not a claim about her.**

**It changes no judgement by itself.** It exists to gate 1.2 and nothing else.

### 1.2 — a bounded normative reference: **YES, SUPPRESSION-ONLY**

A bounded, cited normative reference used **ONLY as a one-way protective filter**.

> **The app may NEVER render a norm statement. Not on Now, not on the Fatherhood
> page, not on pull, not in the trace, not in the export.**

#### Why symmetric speech was declined

**A symmetric norm is a percentile with extra steps.** A table that can say _"most
four-year-olds are still working on this"_ is the same mechanism that says _"most
four-year-olds have this by now,"_ and the second tells the owner where she sits
by implication.

#### Why asymmetric pull-only speech was also declined

The adjudicator proposed a third form — positive support produces a reassuring
sentence, everything else returns one indistinguishable _"not something the source
covers."_ **The owner declined it, and the reason is the same one that killed
symmetric speech:**

> Its protection depends on being unable to tell whether the source covers a
> skill. For most owner-authored skills that holds. **For obviously standard ones
> — toileting, dressing, counting — it does not.** Ask about one of those, get
> _"this isn't something the source covers,"_ and it will not be believed; it will
> be read as covered and withheld. **The asymmetry is the tell:** positive support
> produces speech, so absence of speech on a skill known to be standard means the
> negative case. And the transparent variant is worse — _"covered, but I don't
> report position"_ plus no affirmation is _"not typical"_ in two steps.

**And the reassurance is not forgone.** C already delivers a better version from a
better source: _"three weeks, from needing you to a small prompt, and it held at
Grandma's."_ **That is about her, it is true, and it needs no table.** The norm's
reassurance is a weaker generic duplicate.

#### The rule — into the decision log before any code

> **POSITIVE normative support may make the app say LESS.**
> **Lack of positive normative support may NEVER make the app say MORE.**

**Non-suppression carries no meaning.** It covers at least: the source does not
cover this skill; the source is ambiguous; evidence is insufficient; the skill is
owner-defined with no normative analogue; the source cannot justify protective
suppression. **These are indistinguishable and must remain so.**

Failure to suppress must **not** increase urgency, score or priority; create a
"behind" state or a concern flag; become evidence against her; or imply the source
says she should already have the skill.

#### Placement — generation, verified

The norm may **only** cause `fatherhoodCandidates` to skip a skill in its existing
loop, in the same shape as the two skips already there.

**NOT a dimension.** A `norm-fit` dimension would carry a value and a weight, so
**non-suppression would participate in scoring — the leak built in.**

**NOT a rejection.** `features/export/compose.ts:942-947` iterates
`trace.rejected` into the **AI review export, which is a production feature**, so
a rejection reason would reach the owner. **A generation-time skip is never
proposed and never rejected, so there is nothing to disclose** — and that is
consistent with §35, because it is _"a candidate that was never thought of"_
rather than _"a rejection nobody can see."_

**Structural assertion**, in the shape the architecture guard already uses: the
norm module is imported by `candidates.ts` and by **nothing** in the evaluation or
arbitration path, and **`Candidate` gains no field.**

#### Cap interaction

**None, by construction.** A suppressed skill is absent before the two-class cap
exists and **cannot consume the practice slot.**

#### The residual — recorded rather than denied

**The SET of suppressed versus unsuppressed skills is inferable.** Heavily diluted
by the base rate of not-covered owner-defined skills — CDC's checklists _"do not
cover 'ordering her own food' or any other owner-defined skill"_ — and stronger
the more standard the owner's skills happen to be. **Not zero.**

**The owner accepts it as smaller than the harm running today**, which is that
every unsettled skill reads as a growth area with no way to know it is ordinary.

`skillsFor` (`domainPages.ts:534-547`) lists every `development-skill` by domain
**regardless of candidacy**, so the page does not hide a suppressed skill. That
**helps** — suppression removes a nudge, not the thing, and the skill stays
workable deliberately — and **hurts**, because the full list beside a partial
suggestion stream is the substrate for the inference. On balance it helps.

### 1.3 — system-directed teaching suggestions: **NO**

**#4's owner-directed half already gives the capability with a source: the owner.**
The generative half needs a content artifact nobody has scoped, and **a checklist
that cannot cover "ordering her own food" cannot generate a curriculum for it.**
1.2's table is **interpretive**; 1.3 needs a **generative** source. Different
artifacts — **a yes to 1.2 would not have delivered 1.3.**

### 1.4 — inferring what she should learn next: **NO**

No source, no scope, **largest collision with #4's protected item.** A system with
a standing view about what she should be learning has an implicit view about the
time that taught nothing.

### 1.5 — `milestone-observation`: **NO**

**Stays archived. Over-determined:** it needs a checklist registry carrying **list
identity and revision** — _"an answer against a developmental checklist is
meaningless without which list and which revision"_ — and 1.2's table would match
only by coincidence. **And the Q4 trace applies**: the rows are
`imported-legacy-record` and die at the `collectEpisodes` gate
(`lifecycle.ts:172-173`) unless something is built specifically to read them.

### Roadmap

**1.1 and 1.2 land in routing 94** — a person-entity birthdate field with one
durable question, and a generation-time suppression filter with its structural
assertion. **AUD-0018 is unblocked.** 1.3, 1.4 and 1.5 add nothing.

---

## 13H · The owner-decision register

**Eight resolved, one unresolved.** All persisted in this document as an inert
artifact. **Nothing here is canonical.**

| #      | Decision                                  | Ruling                                                                                                                                              | Section |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **1**  | Child progress measurement                | **Choice A** — the protected qualitative per-entity model is kept; no rates, shares, percentages, grades, rankings or numeric summaries about Adaya | §13D    |
| **2**  | Research-grounded priors                  | **Option B** — priors may aim what is asked, never become findings, rank, or determine recommendations. C and D declined                            | §13C    |
| **3**  | Daily input / authoring burden            | **Tier 1 + Tier 2**, conditional on consumers; Tier 3 deferred to routing 97; `QUESTIONS_PER_DAY = 3` locked                                        | §13B    |
| **4**  | Teaching support                          | **B-owner-directed + C**, with the two-class growth-opportunity cap                                                                                 | §13E    |
| **5**  | **Connected data sources**                | **UNRESOLVED — §13H.1** (no source)                                                                                                                 | §13H.1  |
| **6**  | Record-state / plateau surfacing          | Resolved — structural safety, subject eligibility, delivery tiers, frequency bounds, known-incomplete correction                                    | §13A    |
| **7**  | Sustainable **and increasing** capability | **YES** — qualitative advancement; no rendered acceleration figure                                                                                  | §13A    |
| **Q4** | Legacy evidence admissibility             | **Rung A declined**; B shipped, C structural, D archived                                                                                            | §13F    |
| **Q1** | Age and normative reference               | **1.1 yes; 1.2 yes suppression-only; 1.3, 1.4, 1.5 no**                                                                                             | §13G    |

### 13H.1 · #5 remains explicitly unresolved

**Reason recorded:** the owner **does not currently track sleep with a device**,
so the preferred B1 fetch-on-open pilot for `sleepHours` — the concept whose
registry entry declares `device: 1, owner: 0.85` — **has no source to connect
to.**

**What this decision does not imply.** No stored third-party credential has been
approved. **No D-171 amendment is implied; D-171 stands entire.** No substitute
pilot was manufactured to keep #5 ahead of #3.

**Preserved for later:** `cashBuffer` declares `device: 0.95, derived: 0.9, owner:
0.6` — _"the only concept in the registry where the owner sits below three other
sources"_ — so **the registry's second-strongest case for connected evidence is
financial, and true financial connectivity requires a confidential server client,
which conflicts with local-first / no-server.** That tension is unresolved and is
the most likely future reason to reopen the architecture question.

### 13H.2 · Four items Q1 absorbed and closed

Owner decision #1's option D (norms, peer comparison, expected developmental
rates); **B-system-directed** from #4; **option E** from #4; and
**`milestone-observation`** from Q4. **All four were routed to Q1 and all four
were declined there** (§13G, 1.2's suppression-only form and 1.3/1.4/1.5).

### 13H.3 · Findings recorded with owners — none scheduled

| Finding                                                                                                                                                   | Owner      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| The help ladder is captured and discarded; `growth.ts` reads no `help`; the "closer" register does not exist (form **b**)                                 | routing 94 |
| `helpLevelOf()` (`outcomes.ts:884`) has no consumer anywhere — dead code                                                                                  | routing 94 |
| The maintenance probe must **win** arbitration to fire; recovery is bounded, thread-fit delay ≤ 42 days per skill — **classification B, regression only** | routing 93 |
| Generic authoring may write `part-of` where Fatherhood candidacy walks `about-person`                                                                     | routing 94 |
| `entityId(kind, label)` is label-derived, so near-duplicate skill labels fragment evidence pools                                                          | routing 94 |
| `life-context-change` needs an S2 concept before it can be decided                                                                                        | routing 92 |
| `concepts.ts:530-537` still describes D-166's question as open                                                                                            | routing 92 |

---

## 14 · Proposed next step, after owner approval

**Nothing below is performed by this round.** Listed so the owner can see exactly
what approving this would set in motion.

**Stage 0 — documents, before any code, in this order.**

0. **The settled owner decisions — #1, #2, #3, #4, #6, #7, Q4 and Q1** (sections
   13A–13H) become decision-log entries of their own, alongside the section 8 list — at minimum: _a record-state
   statement names a typed subject that carries evidence, never a free aim_; _the
   app describes its record and its record is not authority over the owner_; _the
   record is incomplete here is a correction gesture, and a correction may cause
   the app to say less and never to conclude more_; and _advancement is described,
   never rated_. Plus, from the later decisions: _a concept ships as askable only
   with a consumer_; _a research prior may aim a question and never become a
   finding_; _the app may say what is typical is refused — a normative reference
   may only suppress_; _positive normative support may make the app say less,
   and lack of it may never make the app say more_; _an archived legacy record
   stays archived_; and **D-166's clarification that the six approved dimensions
   may land in different routing packages, and that approving the vocabulary is
   not approving unreachable questions.** **None of that is written by this
   round.**

0a. **`CAMPAIGN_HOLDS.md` — the D-172 retarget from 91 to 97**, per §6.11. **The
owner's act, and this document does not perform it.** Section 3.18 records that
the target inside this artifact is now unambiguously 97.

1. **`DECISION_LOG.md`** — the new entries in section 8, beginning at **D-212**
   (check the tail before allocating; routing 84 took through D-211). Plus the
   amendments to D-159, D-161, D-162, D-163, D-164 and D-187, each as a new entry
   that extends rather than edits, per the log's append-only rule.
2. **`CANONICAL_REBUILD_PLAN.md`** — section 43A's map replaced with section 6.0's,
   including the monotonic-routing rule and canonical 10/11/12 at 101/102/103;
   sections 55, 56 and 57 re-labelled with their new integers and **their scope
   explicitly restated as unchanged** (D-109); section 54's accommodation list gains
   the six rows in 6.2; section 22 gains the named-expectation bound and the explicit
   refusal of C11; section 23's Emotional Health entry cross-referenced to routing 92
   where D-166 is actually built.
3. **`qa/README.md`** — the stale Max-into-a-Codex-block consequence corrected per
   correction 3.12. **The convention stays; the claimed mechanism goes.** This is the
   one governing document this adjudication found materially wrong about current
   orchestrator behaviour and deliberately did not rewrite.
4. **`PRODUCT_ADJUDICATION.md`** — a section 0 row for this adjudication, and section
   5/6 refined where a finding's home has moved.
5. **`ROUTING_91_BRIEF.md`** — corrections 3.9, 3.10 and 3.11 recorded in it, then
   **deleted when routing 91 is specified**, as the brief itself instructs. What
   survives it is its section 9 decisions and its CASE A gate, which section 6.3
   carries forward verbatim.
6. **`CAPABILITY_MATRIX.md`** — a note pointing at this document's section 3 for the
   fifteen corrections. The matrix is not rewritten; it is a superseded input and its
   value now is as the record of what the surface looked like.
7. **`PHASE_STATUS.md`** — the adjudication result and the revised sequence.
8. **`CAMPAIGN_HOLDS.md`** — **the owner's act, not the builder's**, per section 6.11.
   Add the D-172 declaration for routing 97 and decide the 91 line. Deleting a line
   does not release a hold.

**Stage 1 — the owner answers section 13.** Decisions 1, 2, 4 and 6 shape scope
directly; decision 3 shapes routing 92; decision 5 should be answered before routing
96 is specified. **Decisions 1 and 4 do not block routing 90, 91, 92 or 93** — only
routing 94 and 95 wait on them, which means the roadmap can start while they are
thought about.

**Stage 2 — `docs/NEXT_PROMPT.md` is rewritten as routing 90's kickoff.** This is
the only file that dispatches anything, and rewriting it is what starts the
campaign. It should carry `**Phase:** 90`, actor Claude Code / builder, conversation
**NEW**, Opus-class, **Max** (the audit-repair campaign classification in
`qa/README.md` covers every phase created by its adjudication), and a launcher per
D-092 and D-083.

**Stage 3 onward — the phases in section 6, in order**, each with its acceptance list
written into its handoff **before** the builder starts (section 11's second
predictor), each with its instrument proved separately from its product, and each
declaring in advance — per D-210 — that instrument findings are backlog rather than
blockers.

---

## 15 · What this round did not do

Recorded so the boundary is checkable rather than asserted.

- **`docs/NEXT_PROMPT.md` was not opened for writing.** It holds routing 84's GREEN
  closeout and its freshness is what keeps it from being re-routed.
- **No `PHASE_*_QA_HANDOFF.md` was created.** Correction 3.10 shows the mechanism has
  changed, and the prohibition still stands: a committed handoff for a higher phase
  raises `routing_ceiling` and orphans everything below it.
- **No completion marker** (`LCO_COMPLETE`) exists in this file and none may be added.
- **`CANONICAL_REBUILD_PLAN.md`, `DECISION_LOG.md`, `PHASE_STATUS.md`,
  `CAMPAIGN_HOLDS.md`, `qa/README.md` and every QA handoff are unmodified.**
- **The orchestrator repository was read and not written.** Four modules were read to
  verify corrections 3.10, 3.12, 3.13 and 3.14.
- **No product code changed.** `git diff -- src` is empty for this round.
- **Eight owner decisions were settled and persisted** into sections 13A–13H:
  #1, #2, #3, #4, #6, #7, Q4 and Q1. **That is persistence, not canonicalization**:
  no decision-log entry, no plan amendment, no hold change and no handoff was
  created by recording them. **#5 remains explicitly unresolved** because no
  connected-data source exists (§13H.1).
- **§13A and the already-persisted #6 and #7 were not substantively changed** by
  the later pass — only cross-references were added.
- **The live D-172 hold was not retargeted.** Only the stale internal reference
  inside this document was corrected from 96 to 97 (correction 3.18).
- **Routing 90 was not released**, no phase was marked approved, and nothing here is
  roadmap state.

---

**End of the second adjudication. Nothing here is approved, and the six decisions in
section 13 are the owner's.**
