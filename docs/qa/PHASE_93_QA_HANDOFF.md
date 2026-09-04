# Phase 93 independent QA handoff

## Round 0 — the builder's submission and the QA brief

**Phase:** 93 — Validity: what it concludes from what it sees

**Round:** 0 — written by the Claude builder conversation. **Everything below
this section belongs to independent QA**, which owns every update to this file
from Round 1 on (D-077, `README.md`). The builder does not edit QA's rounds.

**Actor:** Codex / **independent QA**.
**Conversation:** **NEW** — not the routing 93 builder, and not any routing 91
or 92 conversation.
**Model:** Codex.
**Reasoning level:** **High** — never Max, which is Claude's level.

**Overall result:** **YELLOW — READY FOR INDEPENDENT QA.** A builder
conversation may not approve its own phase.

Written by the Claude builder conversation that built routing 93. It approves
nothing. D-077 is unchanged: **only independent QA may pass a phase**, and no
round has run against this one.

---

## Read this first: this phase came in over its own split rule

`PRODUCT_ADJUDICATION_2.md` **§11** gives routing 93 an explicit split rule, and
the dispatch named it twice. **It was not invoked, and the phase came in at
fourteen packages against a rule written for five.** That judgement, its
reasoning and its cost are D-283, and it is the single most useful thing a
reviewer can know before starting.

**What it means for this round, concretely: treat this as two phases' worth of
change carrying one phase's worth of scrutiny.** Ask for more rounds than a
phase in this position would normally get, and do not assume that a package
which looks routine got the attention a smaller phase would have given it.

**How the decision actually got made** is in D-283 rather than a tidier version
of it: the conversation chose to build the whole of §6.5's scope in the split
order and judge the split at the end with evidence, which had exactly one
predictable failure mode — by the time the count was unambiguous the work was
done. Two things are worth knowing about the seam itself. It **would** have
worked for the eight packages §11 names. And it does **not** partition the scope:
six of the fourteen are named by neither half, `spacing-fit` most awkwardly of
all, since it is a scoring dimension like `trajectory-fit` and the no-added-noise
figure has to be measured once over both.

**D-283's conclusion, stated the way a reviewer needs it rather than the way a
builder would prefer it: this phase should have been dispatched as two, the rule
existed to say so, and the builder did not invoke it.** D-214 puts reaching for
the minimum-release path with the owner rather than with a builder already
running long, which is why it is recorded as a judgement to be checked rather
than as a decision that settles anything.

## Three deferred QA debts are still open, and this phase adds a third

| Phase | State | Rounds run |
| ----- | ----- | ---------- |
| Routing 91 | BUILT / QA DEFERRED | 9, with Round 10's brief written and unrun |
| Routing 92 | BUILT / QA DEFERRED | **0** |
| Routing 93 (this) | YELLOW — READY FOR INDEPENDENT QA | 0 |

`PHASE_91_QA_HANDOFF.md` and `PHASE_92_QA_HANDOFF.md` were **not edited by this
phase** and must not be — they are the briefs those rounds start from, including
routing 92's header, which still reads YELLOW because that is what it said when
it was written.

**Routing 92 is the one to worry about.** It touched the layer every decision
reads, four of its ten defects were found by a gate rather than by its builder,
and nobody outside its own conversation has read it. **Routing 93 is built on
top of it.** If a reading in this phase looks wrong, the cause may be a layer
below and unexamined; say so rather than repairing the surface.

**And routing 92 left one gate item open by its builder's own judgement** — the
no-added-noise rule came out at 218 against 216, two `emotional.overwhelm`
questions on `three-days-since` and `observed-evenings`, kept deliberately
(D-267). This phase did not settle it and did not disturb it. Routing 93's own
addition is measured separately and pinned at **15**, enumerated by name in
`reach-gate.test.ts`, so the two cannot hide inside each other.

---

## Build submitted

| Fact | Value |
| ---- | ----- |
| Product checkpoint | `b23e672` — the commit every product gate was run on (D-147) |
| Documentation head | `ed2a398` — what Preview serves; six files apart, none bundle-relevant |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Owner-visible behaviour | **changed** — Now, the Health, Career, Sleep and Direction pages, the import review, and the exported document |
| Owner phone check | **required before GREEN** |
| QA report path | this file |

Confirm the deployed SHA against the checkpoint before testing:

```bash
node scripts/checkpoint-equivalence.mjs b23e672 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
```

It will report the documents committed after the checkpoint and that none is
bundle-relevant. That is the expected answer rather than a reason to refuse to
test: D-097 asks for equivalence rather than literal SHA equality, and DEF-0061
is what happens when a handoff demands the second.

Release integrity is verified against the served bytes using **CI's own manifest
artifact** rather than the tree's (D-211, QA-84-064):

```bash
gh run download 33819695944 --name preview-manifest --dir /tmp/lco
```

```bash
node scripts/release-integrity.mjs https://bill6006.github.io/life-command-os-rebuild/preview/ --manifest /tmp/lco/release-manifest.json
```

At submission both came back clean: six changed files between the checkpoint and
the deploy — four documents, this handoff, and `tests/browser/phase93.spec.ts` —
none bundle-relevant, and 8 files served byte for byte.

---

## Read this in the order the protocol gives (D-090)

**Step 1 is cold use of the deployed app, before any repository document.** This
phase adds readings that _conclude_ things — a heavy week, a six-week
trajectory, a three-night recovery run, a study interval. A reviewer who reads
the design record first knows what each is supposed to mean and will read the
screen as confirming it. **The whole question of this phase is whether what the
app concludes is warranted by what it saw**, and that question cannot be asked
by someone who already knows the intended answer.

1. `PRODUCT_ADJUDICATION_2.md` **§6.5** (the phase contract, its two gates, its
   completion condition and its explicit _not in this phase_ list), **§11** (the
   split rule that was not invoked), **§13C** (research priors), **§13E.1** (the
   probe regression)
2. `docs/DECISION_LOG.md` **D-269 … D-284** — this phase's decisions.
   **D-283 and D-284 first.**
3. `docs/DEFECT_LEDGER.md` **DEF-0166, DEF-0167, DEF-0168** — the three this
   phase found, one of them by walking the owner contract at the very end
4. `docs/WHOLE_APP_INTELLIGENCE_AUDIT.md` rows **AUD-0007, 0009, 0010, 0019,
   0022, 0025, 0029, 0030, 0038, 0042, 0051**
5. `docs/CANONICAL_REBUILD_PLAN.md` section **43A** (the routing map)

---

## What the phase claims to have built

| Package | Claim | Where to attack it |
| ------- | ----- | ------------------ |
| 93.1 | A Tuesday is not a Saturday; a heavy week is read and only the heavy one speaks | `rhythm.ts`, `learning.ts`, `rhythm-and-load.test.ts` |
| 93.2 | A six-week reading reaches a decision — `trajectory-fit`, the twentieth dimension | `trajectory.ts`, `evaluate.ts`, `trajectory-reaches-a-decision.test.ts` |
| 93.3 | Recovery is a **run** of nights whose length comes from his own record | `recovery.ts`, `threads.ts`, `recovery-run.test.ts` |
| 93.4 | Observe-first stops meaning judged-in-the-morning | `derived.ts`, `observed-first.test.ts` |
| 93.5 | Study gets a schedule — `spacing-fit`, the twenty-first dimension | `spacing.ts`, `evaluate.ts`, `study-spacing.test.ts` |
| 93.6 | C21's enforcement half, proved by reintroduction | `constraints.ts`, `blockers.ts`, `blocker-enforcement.test.ts` |
| 93.7 | The shown ledger survives the session | `features/memory/shownStore.ts`, `shown-store.test.ts` |
| 93.8 | Two moves that are one outing; the evening she is away | `alongside.ts`, `explain.ts`, `one-occasion.test.ts` |
| 93.9 | When, and how sure — the cue and C14's bands | `cue.ts`, `cue-and-bands.test.ts` |
| 93.10 | What the record says about how it is going — F03, F08, F44 | `review.ts`, `insights.ts`, `review.test.ts` |
| 93.11 | What the import costs; goals that say the same thing | `legacy/plan.ts`, `ImportPanel.tsx` |
| 93.11 | §13E.1's five-arm maintenance-probe regression | `maintenance-probe.test.ts` |
| 93.12 | A standing blocker stays in the area he answered about | `blockers.ts`, `situation.ts` |
| — | The reach digest narrowed to the claim it was written for | `reach-horizon.test.ts`, DEF-0167 |
| — | The two new readings a screen actually shows, on real DOM at three widths | `tests/browser/phase93.spec.ts`, D-284 |

---

## The ordinary-owner contract — run this on the deployed app

§6.5's own five items. **The builder walked two of them through the surfaces**
(`tests/synthetic/owner-contract.test.ts`), which is not a substitute for this
and is stated in that file's own header. The other three are proved on histories
built for them, because no shipped history reaches them.

1. **Three poor nights differ from one, and the app says so from his record.**
   Report a short night, then a run of them. The guidance must differ, the
   sentence must name the hours it counted, and it must cite **no** study,
   average or general claim about people.
2. **A recurring blocker stops the move being offered.** Say **Can't right now**
   → **Haven't got what I need** on a study move. The move goes, and the app
   says what it learned. Come back tomorrow: it is still gone. Come back three
   days later: still gone.
3. **A milestone that stops moving is said to be.** Fourteen days without
   progress, and the app says so without promising to do anything about it.
4. **The same move is not put in front of you four times in a day.** Open Now
   four times across one day. Then close the app, reopen it, and check the count
   survived — that is the half this phase added.
5. **The confidence wording differs at two readings and at twelve.**

**Item 2 is where this phase's last defect lived.** After blocking the study
move, check that the app can still offer you the move that says _to rest
instead_. DEF-0168 is exactly that going wrong.

---

## Where the builder thinks this is weakest

Written as findings rather than as reassurance.

**1. The split rule, above all.** D-283. Fourteen packages, one round's
scrutiny. Everything else on this list is downstream of it.

**2. The browser gate covered almost nothing this phase built, and only partly
does now — D-284.** The first full matrix passed **849 of 849**, exactly the count
routing 92 left behind, because **not one browser spec had changed**. New
sentences on Now, Insights and the import review were all proved through the
builders the screens call and none through a rendered screen. `phase93.spec.ts`
now covers the two readings reachable from the QA laboratory's own scenarios —
the recovery run and the heavy week — at all three widths. **Everything else this
phase put on a screen still has no rendered test**, because no shipped scenario
produces it: the trajectory card, the study interval, the alongside row, the cue,
C14's confidence bands, and the four review readings. **That list is the shortest route to a real defect
in this round.**

**3. Almost nothing new is reachable from the shipped histories.** Every reading
this phase added needed a **purpose-built** history to fire, and each such test
also asserts the twenty-seven shipped histories stay silent. That is honest
construction and it is also the weakest possible evidence about real use: it
means the builder chose the conditions under which his own code speaks. **The
most valuable thing this round can do is drive the deployed app until one of
these readings appears without being invited.** If none ever does, that is a
finding about the readings, not about the round.

**4. Two scoring dimensions were added.** `trajectory-fit` (weight 1) and
`spacing-fit` (weight 0.8), each with an explicit decision (D-270, D-273) as
§6.5's completion condition requires, and each abstaining at zero weight in the
common case per D-048. **No weight moved.** Attack the abstentions:
`instrument-recut.test.ts` holds the list of dimensions allowed to be zero at
full weight, and a dimension that abstains everywhere is a dimension that is not
doing anything.

**5. `spacing-fit` has a rule-level exemption and it is the ugliest thing in the
phase.** It abstains entirely when a live thread covers the same object, because
without that it argued with the owner's own plan and cost an extra guide question
on `study-thread`. The principle is D-273's — the app's timing never out-argues
his — but an exemption written into a rule to make a test pass deserves a hard
look.

**6. C21's enforcement narrows twice, and the second narrowing is a day old.**
D-274 restricts enforcement to the app's own registered blocker concepts and
leaves free text unenforced. D-282 restricts it again to the areas the record was
written with. Both are proved by reintroduction. **The second was found by
walking the owner contract in the last hour of the phase**, which is a strong
hint that the first walk of it by somebody else will find more.

**7. Two defects in this phase were found by instruments rather than by
reading.** DEF-0167 — a pinned digest that had been hashing an empty list since
routing 92, so an acceptance claim was verified against zero rows. DEF-0166 — a
recovery run that could not advance past the object of its first evening. Both
are repaired; what they say about the rest of the suite's claims is not.

**8. The predicted digest failure did not happen, and that is recorded rather
than passed over.** The dispatch said `reach-horizon.test.ts`'s pin *would* fail
when the multi-day horizon got its consumer. It did not: D-271 explains why
(multi-day's consumer is the **run**, not the night, so D-064's four conditions
are untouched). A reviewer should check that reasoning rather than accept it —
a prediction that fails to come true is either a good explanation or a missed
change.

**9. Nothing here composites the emotional dimensions, forecasts, sets an
expectation, revises a strategy or adds a domain.** §6.5 forbids all five. If
any screen reads as if it does one of them, that is a finding.

---

## Three debts this phase is carrying, so they are not lost

**Routing 91's Round 10.** Written, waiting, unrun.

**Routing 92's Round 0.** Written, waiting, unrun — zero rounds, widest blast
radius, and this phase is built on it.

**The nineteen D-210 instrument-hardening findings.** Still open, still
untouched, backlog blob `58d5af071355d252c4a254fc685fcc9e8e88f417`. Deferred
across seven phases now.
