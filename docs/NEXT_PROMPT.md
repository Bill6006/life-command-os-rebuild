# Next dispatch — routing 94, cycle 94.1: Fatherhood

**Phase:** 94 — **the rest of the life: domains and progression**, cycle **94.1**

**Written by the Claude builder conversation that finished the phase before this
one.** Independent QA is **off** for this run by owner instruction, so this file
dispatches the next build cycle, is addressed to the **Claude builder**, and
starts no QA round.

---

## Read this part first: what you are inheriting, and the mistake not to repeat

**Three phases are unapproved. None is GREEN, and none has been read by anyone
outside the conversation that wrote it.**

| Phase      | State                             | Rounds run                                 |
| ---------- | --------------------------------- | ------------------------------------------ |
| Routing 91 | BUILT / QA DEFERRED               | 9, with Round 10's brief written and unrun |
| Routing 92 | BUILT / QA DEFERRED               | **0**                                      |
| Routing 93 | YELLOW — READY FOR INDEPENDENT QA | **0**                                      |

D-077 is unchanged: **only independent QA may pass a phase.** Nothing about any
of the three has been approved by anything but its own mechanical gates.

### The phase before this went over its own split rule, and that is the lesson

§11 gave routing 93 a split rule: **more than five work packages and it becomes
two phases.** Fourteen landed. The rule was not invoked. **D-283 records it as a
judgement to be checked rather than a decision that settles anything**, and its
conclusion is that the phase should have been dispatched as two.

**This dispatch is that lesson applied.** §11B already sizes routing 94 into
**three internal cycles** and says the slice boundaries belong in the handoff
before the builder starts. **This dispatch is cycle 94.1 only.** Do not build
94.2 or 94.3. If you finish 94.1 early, stop and say so — starting the next
cycle because there is room is exactly how fourteen packages happened.

### Three more things to hold while you build

1. **Do not treat routing 92's or 93's behaviour as settled.** Routing 92 touched
   the layer every decision reads and has had zero independent rounds; routing 93
   is built on top of it and adds two scoring dimensions, four new readings and
   C21's enforcement. **If something in 94 makes you doubt a reading either
   produces, the doubt is probably right** — say so in your record rather than
   building on top of it quietly.
2. **All three QA handoffs in `docs/qa/` must survive unedited** —
   `PHASE_91_QA_HANDOFF.md`, `PHASE_92_QA_HANDOFF.md` and
   `PHASE_93_QA_HANDOFF.md`. They are the briefs three deferred rounds start
   from. Do not append to them, correct them, or tidy them. Anything you need to
   record about those phases goes in `PHASE_STATUS.md` or the decision log.
3. **Two gate items are open and unchecked.** Routing 92's no-added-noise rule
   came out at **218 against 216** (D-267). Routing 93's own addition is pinned
   separately at **15** and enumerated by name in `reach-gate.test.ts` so the two
   cannot hide inside each other. Cycle 94.1 will add owner-facing Fatherhood
   readings; **measure your own delta separately again** rather than re-baselining
   either number.

**What is actually true about routing 93**, so you are not guessing: every
mechanical gate passed at its checkpoint — `npm run verify`, 2,341 unit,
contract, synthetic and adversarial tests across 110 files, the whole 360/430/1280
browser matrix at one worker, the privacy, copy and adaptation scans, checkpoint
equivalence, CI, release integrity from CI's own manifest artifact, and the
Android-style deployed gate.

---

## The cycle

**Routing 94, cycle 94.1 — Fatherhood, alone.**

The scope is fixed by the plan and the adjudication and is not yours to widen:

- plan section 43A for the routing map;
- `PRODUCT_ADJUDICATION_2.md` **§6.6** is the phase contract — builder scope, the
  ordinary-owner QA contract, the synthetic QA contract, the completion condition
  and the explicit _not in this phase_ list. Read it in full before you plan.
- `PRODUCT_ADJUDICATION_2.md` **§11B** sizes the phase and defines the three
  cycles. **94.1 is Fatherhood alone**, and §11B says in terms why: it is _"the
  heaviest slice by an order of magnitude, and the one carrying every
  owner-decision addition"_, roughly **nine times the weight** of the Home slice
  by deliverable count, and _"84-shaped work inside a phase otherwise estimated
  at 83-shaped per domain."_
- **§13D** (owner decision 1, C19 — RESOLVED, Choice A), **§13E** (owner decision
  4, C16 — RESOLVED, B-owner + C), **§13G** (Q1, age and normative reference —
  1.1/1.2 yes, 1.3–1.5 no). All three are settled; none is yours to reopen.

**Purpose, in one sentence.** Fatherhood gets a destination that can reach Now,
and everything the owner-decision sequence added about teaching a four-year-old
lands with it — under a prohibition that has not moved.

### The nine deliverables, all of them Fatherhood-specific

§11B enumerates them and §6.6 states each one's bound:

1. the `development-skill` **ordinary-use authoring route**, with its behavioural
   acceptance test;
2. the `about-person` **relationship-correctness repair**;
3. the **near-duplicate guard** through `AuthoringProposal.problems`;
4. **C's scaffolding guidance**;
5. the **help-ladder reader — form (b), the "closer" register**;
6. the **two-class growth-opportunity cap**, with its after-evaluation placement
   and trace-integrity requirement;
7. the **trace-integrity changes the cap forces**;
8. **Adaya's birthdate** as one durable question;
9. the **generation-time normative suppression filter** — which **may never
   render a norm statement anywhere** and **must be a `continue`** rather than a
   dimension or a rejection.

Plus Fatherhood's own destination: a `PROVING_DOMAINS` row, a `MILESTONE_ENTITY`
row, and progress evidence that is **domain-appropriate rather than a generic
template**.

### The prohibition, which is the whole risk of this cycle

**C19 is settled as PRESERVE (Choice A) and is independently load-bearing.** No
rate, share, percentage, grade, rank or numeric summary about Adaya — anywhere,
on any surface, in any export, at any privacy setting. D-070, D-112, D-117, D-135
and D-136 stand. **The #6/#7 subject rule does not protect this boundary**, so do
not lean on it.

**§6.6's synthetic contract requires the child guard proved by reintroduction in
every one of the five test files that carry it** — put a rate, share, rank or
grade about her back in and watch the build fail, in each of the five. Routing
93's own experience is that reintroduction is the only proof that survives
reading: it caught a narrowing that a passing suite had not.

**Two of the nine deliverables speak about a child** — the "closer" register and
scaffolding guidance — under C19, D-136 and the pull-only delivery rule. §11B
names them as the residual risk of the whole phase. Build them last, gate them
hardest, and if either cannot be built inside the prohibition, **say so and
deliver the other eight** rather than softening the bound.

### And the audit's protected item

**Time with Adaya must remain a first-class move, separate from working on
something with her.** §6.6 names a teaching feature as _"the likeliest thing to
erode"_ it. Prove the separation, do not assert it.

---

## How to run it

**Model:** strongest current Claude Opus-equivalent.
**Intelligence level:** **Max.**
**Conversation:** **NEW** — the previous builder conversation belongs to a phase
that is now closed to you.

```text
Build routing Phase 94, cycle 94.1, of the Life Command OS rebuild — Fatherhood.
Keep the Phase field exactly 94.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full, then PRODUCT_ADJUDICATION_2.md §6.6 as the
phase contract and §11B for the three-cycle sizing. Read §13D, §13E and §13G for
the settled owner decisions this cycle depends on, and docs/PHASE_STATUS.md for
what is GREEN and what is not.

Build cycle 94.1 ONLY — Fatherhood alone, plus its nine deliverables: the
development-skill ordinary-use authoring route with its behavioural acceptance
test, the about-person relationship-correctness repair, the near-duplicate guard
through AuthoringProposal.problems, C's scaffolding guidance, the help-ladder
reader in form (b)'s "closer" register, the two-class growth-opportunity cap with
its after-evaluation placement and trace-integrity requirement, Adaya's birthdate
as one durable question, and the generation-time normative suppression filter
which may never render a norm statement anywhere and must be a continue rather
than a dimension or a rejection. Plus Fatherhood's own destination — a
PROVING_DOMAINS row, a MILESTONE_ENTITY row, and progress evidence that is
domain-appropriate rather than a generic template rendered twelve times.

Do NOT build cycle 94.2 or 94.3. If you finish early, stop and say so. The phase
before this went over its own split rule at fourteen packages against a rule
written for five (D-283), and this dispatch is that lesson applied.

C19 is settled as PRESERVE and is independently load-bearing: no rate, share,
percentage, grade, rank or numeric summary about Adaya anywhere, at any privacy
setting. Prove the child guard by reintroduction in every one of the five test
files that carry it. Keep time with Adaya a first-class move, separate from
working on something with her, and prove the separation rather than asserting it.

Three phases are unapproved — routing 91 and 92 are BUILT / QA DEFERRED and
routing 93 is YELLOW. None is GREEN. Do not treat their readings as settled, and
do not edit docs/qa/PHASE_91_QA_HANDOFF.md, docs/qa/PHASE_92_QA_HANDOFF.md or
docs/qa/PHASE_93_QA_HANDOFF.md for any reason: all three are briefs deferred QA
rounds start from and must survive unedited.

Measure your own addition to how often the app speaks separately, and do not
re-baseline routing 92's 216/218 or routing 93's pinned 15.

Meet §6.6's gates — the ordinary-owner contract and the synthetic contract — and
its completion condition: every domain either has a destination that can reach
Now or is explicitly and truthfully declared as inspect-and-record with a reason
on the page. For this cycle that condition applies to Fatherhood.

Nothing in this cycle adds a revision loop, an inference, or a forecast, and
nothing about the child changes beyond what owner decision 1 already settled.

Write class tests and biting reintroduction proofs for the structural
properties, not fixtures that memorise phrases. Run npm run verify, one full
360/430/1280 browser matrix at one worker on a clean port, the privacy, copy and
adaptation scans, the Android-style deployed gate, checkpoint equivalence, CI
and release integrity from that CI run's own manifest artifact. Commit, push,
deploy and prove the deployed checkpoint is what Preview serves.

Update docs/DECISION_LOG.md, docs/DEFECT_LEDGER.md and docs/PHASE_STATUS.md, and
write docs/qa/PHASE_94_QA_HANDOFF.md as the brief for independent QA, with
94.1's own acceptance list in it — §11B says to gate 94.1 separately rather than
letting it share a list with 94.2 and 94.3.

You may not approve your own phase (D-077). Reach YELLOW — READY FOR
INDEPENDENT QA and stop there. Do not mark anything GREEN, and do not start a
QA round yourself.
```

### Short launcher

**Model:** strongest current Claude Opus-equivalent. **Intelligence level:** Max.
**Conversation:** NEW.

```text
Build routing Phase 94, cycle 94.1, of the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the routing 94 dispatch at the end
exactly as written. Keep the Phase field exactly 94, build cycle 94.1 only,
leave the three QA handoffs in docs/qa/ unedited, reach YELLOW rather than
GREEN, and do not ask me to paste the file contents.
```

---

## Four debts this dispatch is carrying, so they are not lost

**Routing 91's independent QA.** Round 10's brief is written and waiting in
`docs/qa/PHASE_91_QA_HANDOFF.md`. It has not run.

**Routing 92's independent QA.** Round 0 is written in
`docs/qa/PHASE_92_QA_HANDOFF.md` and opens with the one gate item that did not
come out even. **Zero rounds have run**, and it has the widest blast radius with
the least scrutiny.

**Routing 93's independent QA.** Round 0 is written in
`docs/qa/PHASE_93_QA_HANDOFF.md` and opens with D-283 — fourteen packages
carrying one phase's worth of scrutiny. **Zero rounds have run.** Whenever
independent QA is turned back on, these three are what is owed, and 92 is first.

**The nineteen D-210 instrument-hardening findings.** Still open, still
untouched, backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`, and not part
of this cycle's scope. They have now been deferred across seven phases; that is
worth the owner knowing rather than discovering.

<!-- LCO_COMPLETE -->
