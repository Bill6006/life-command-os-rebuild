# The state engine — what the owner actually asked for, and the six decisions it needs

**Status: DECISION REQUEST. Nothing is built, nothing is approved, and nothing in
this document authorises a line of code.**

**Written 2026-09-04**, from a structured interview with the owner during the
routing 93 closeout. Every answer below is his, recorded as given. Every
recommendation is the builder's and is marked as such.

---

## Why this document exists

The owner asked a question about move variety, and the answer turned out to be a
different app.

He described a loop the current product does not have: sample his state several
times a day, recommend a move, measure what that move did to his state over
whatever window suits that move, forecast where he is heading, and deliberately
test alternatives to find better ones. Most of the machinery for it already
exists. **What does not exist is any of the data it needs**, and the reason is
five decisions that are individually defensible and collectively fatal to what he
is building.

This document records what he asked for, proves the starvation with a
measurement, states the six decisions in his way, and says plainly what it costs.

---

## The evidence: what a new store actually gets

Measured 2026-09-03, on `EMPTY_SNAPSHOT` and on `the-first-evening`, at three
blocks a day across three days. Read-only probes; no product code was changed.

| Day | Questions asked                                | Then    | Candidates |
| --- | ---------------------------------------------- | ------- | ---------- |
| 0   | **1** — _"How much energy have you got left?"_ | settled | 1          |
| 1   | **1** — the same question                      | settled | 1          |
| 2   | **1** — the same question                      | settled | 1          |

The guide's own stated reason, taken from its `because` field:

> _"4 question(s) could be asked and none of them would change the answer"_

**And it is telling the truth.** Replaying `probeSwings` exactly as
`nextGuideStep` calls it, all four available questions — usable time, child
present, soreness, social energy — land every one of their answers on the same
move, because there is only one move to land on.

**The loop, stated plainly.** The guide asks only what would change _today's_
recommendation. A new store has a candidate set of one. Nothing can re-rank a
list of one, so nothing is worth asking, so the store stays empty. The questions
that would break the cycle — what are you aiming at, what do you do, who matters
— do not change today's ranking. They change what is _on the list_ tomorrow, and
`probeSwings` does not measure that.

**The cap is not the binding constraint.** `QUESTIONS_PER_DAY = 3`
(`guide.ts:53`) is never reached. The information-value gate is what starves it.

---

## What the owner is building

**A self-experimentation engine that must also make good daily decisions.**
Asked to choose between the two, he chose _"both, equally weighted"_ and asked
that the app be explicit when they pull apart — _"this is bad for tonight and
good for the certification, your call."_

### The loop

1. **A check-in, several times a day.** Feeling (mood, irritation, stress,
   overwhelm), drive (motivation, confidence, focus), connection (loneliness,
   social energy), and energy. Plus a **morning-only** reading: sleep hours and
   quality.
2. **A score, 0–100.** 100 is _"every dimension at its best"_ — a fixed ceiling,
   not a personal best and not a target he sets. Per-dimension readings are
   always shown; the overall figure is shown too. **The app learns the weights**
   — which dimensions actually drive his good days.
3. **A move**, drawn from a research-built catalogue. _"I don't trust myself if I
   am the one coming up with the moves."_
4. **Effect measured on the app's own schedule** — _"some moves might take more
   than a week, some might be at the next check-in"_ — **never immediately**, and
   **never by asking him to attribute it**: _"I don't really know how to identify
   whether something made me a certain way… the app only needs to look at the
   patterns."_
5. **A forecast** — today and roughly seven days out, showing how his state is
   likely to fluctuate, with confidence attached and the reasoning openable.
6. **Exploration, announced.** _"Tell me it is testing."_

### The forecast, in his own example

> _"It's Tuesday. Many previous Tuesdays he does this Monday night; last night
> was Monday and he did it again, so his Tuesday morning will likely look like
> this — but usually he is more likely to do a high-boosting move on Tuesday
> mornings, so his afternoon should look like this."_

### Second-order move value, in his own example

> _"When I requested the move for him to drink coffee, his state boosted from 50%
> to 80%, but an hour later it drops from 80% to 35%. Hmm, maybe not that one…
> I noticed that one time when I requested [another move] it boosted his state by
> 15%, and from the patterns it looks like when he does that he's less likely to
> drink coffee and instead resorts to water, which boosts his state another 10%."_

**A move's value includes its effect on what he does next.** He asked that such
chains be acted on **only after a real statistical bar** — enough occasions, and
holding up when conditions vary.

---

## The design rules, in the owner's words

These are his, and they are better than anything the builder proposed.

1. **Questions are for facts. The forecast is the only place the app may assume.**
   _"It can ask me the questions that it needs to without assuming, because
   that's what the forecast is supposed to do — assume and predict."_
2. **Silence and repetition kill trust. Being wrong does not.** _"This never
   killed my trust with my old app, only with this current app, since it only
   gives me one move and that's walk for 25 minutes."_
3. **It has to see him act to learn anything.** _"What patterns can it learn from
   if it doesn't see me taking action on anything?"_ Variety early is the
   precondition for any pattern at all, not a nicety.
4. **Moves must not contradict or repeat each other.** Not _"drink water"_
   followed by _"drink water and jump up and down"_. Not _"go for a walk today"_
   beside _"stay indoors today"_.
5. **The smart choice, not the seemingly smart choice for the moment.** Net
   effect over the right window, not the immediate spike.
6. **Revisit old moves when conditions change.** _"It may notice that for a while
   now I've been doing really good… so it may be worth revisiting an old move
   that before didn't seem to work very well."_
7. **Hold the state/aims tension explicitly**, rather than resolving it silently
   with a weight.
8. **The check-in must visibly earn itself.** His old app's failure, in his own
   words, was _"it asked but never learned"_ — 7–19 questions per block, data
   piling up, nothing coming back. **Dense sampling alone reproduces that
   failure with better typography.**

### What would prove it is learning

He was asked what would convince him, and selected **all four**:

- it tells him something about himself he did not know;
- its forecasts come true, with the misses shown as well as the hits;
- the moves measurably get better over time;
- he can open the reasoning behind any suggestion.

**Recommendation (builder).** Treat all four as acceptance criteria for the whole
programme, not as features. Rule 8 says the asking has to pay off visibly; these
four are the only definitions of "visibly" on record.

---

## The six decisions

Five of these change something already decided. Each is stated with what it was
protecting, so the owner is overturning a reason rather than a sentence.

### Decision 1 — the daily question ceiling becomes a preference

**Recorded:** §13B, owner decision #3. _"`QUESTIONS_PER_DAY = 3` remains a hard
ceiling and is not raised."_ Section 47 fails a phase outright if the answer is
_"too many questions"_.

**Asked for:** _"I don't really care how many taps it takes for me to be able to
get the best data possible… obviously not extreme like a hundred, but the app
should know what it needs."_ Delivered as **a settings control: depth and
frequency as two separate levels**, with the trade stated on the control itself —
fewer readings will not produce the best results.

**What §13B was protecting.** A real failure: an app that interrogates its owner
daily. That failure is still real.

**Why the ceiling is the wrong instrument anyway.** §13B caps _questions_,
treating every ask as equally expensive. A fixed four-tap check-in at three known
moments is not twelve interruptions — it is a ritual, bounded and anticipated.
Three scattered unpredictable questions can cost more, because they cannot be
planned around. **The budget is measured on the wrong axis.**

**Builder's caution.** The default is the real decision. Most people never open
settings, and the owner will live with the shipped default on exactly the days he
is too tired to change it. **Choose the default deliberately; do not let it be
the safe-looking low one.**

---

### Decision 2 — the information-value gate stops being the only gate

**Recorded:** §13B, _"information-value gating remains intact"_. Implemented as
`probeSwings` / `mostValuable` in `guide.ts`.

**Asked for:** a fixed ritual, plus _"additional questions that the app feels is
worth asking and that can make the data strong"_.

**Note the justification he gave.** Not _"would change today's answer"_ but
**"would strengthen the data."** That is a second, different rule, and the app
does not have it. Under the current gate a state reading can never qualify: its
value is that it makes _tomorrow's_ pattern match possible.

**Consequence.** Raising the cap alone changes nothing — the swing rule would
still refuse to spend the budget. **Decisions 1 and 2 only work together.**

**Builder's recommendation.** Two budgets with two rules, measured separately:
the ritual (fixed, scheduled, exempt from the swing rule) and decision-relevant
asks (the existing gate, on top). Never one pooled count, or the ritual will eat
the useful questions or vice versa.

---

### Decision 3 — an overall state score, shown

**Recorded:** D-166, and the rules there are minuted as **owner-stated**: the six
emotional dimensions _"do not form a composite wellness score, and nothing
anywhere may aggregate across them"_. A single `emotional.score` is named as
_"the wellness score arriving through the back door"_. Plan section 22 forbids a
Life Score.

**Asked for:** per-dimension readings **and** an overall figure he can see, on a
0–100 scale where 100 is every dimension at its best, **with weights the app
learns**.

**What D-166 was protecting, and whether it still applies.** It was written
against a **wellness score** — a number that grades a person's life. What is
asked for here is a **state reading**: how he is _right now_, recomputed each
check-in, closer to a thermometer than a report card. That is a genuine
distinction and it survives the forecast, which predicts a reading rather than
passing a verdict.

**It is not a free pass.** _"Where you are headed over the next seven days"_ sits
closer to a verdict than _"you are at 62% right now"_, and the thing that keeps
it on the right side of the line is that it is a **forecast of a measurement**,
falsifiable next Tuesday, rather than a judgement about him. **If it ever
acquires a quality adjective, it has become the thing D-166 refused.**

**Retained without change:** the prohibition on grading him as a person. He
selected it explicitly. _"You are at 62%"_ is permitted; _"you are falling
behind"_ is not, at any confidence, on any surface.

---

### Decision 4 — the forecast

**Recorded:** §6.5's _not in this phase_ list — _"No forecasting, expectation or
revision."_ Forecasting is routing 96, and §11 names 96 as **the phase to cut** if
throughput becomes binding.

**Asked for:** the forecast is the headline feature. Today, and roughly seven days
out. _"I want these features to look nice."_

**How to keep it honest — his rule, not an added one.** Rule 1 above draws the
line the plan needs: questions are for facts, and **the forecast is the only place
the app is allowed to guess**. Everything the current architecture protects — G-009,
unknown stays unknown, no invented precision — stays true of every reading. The
forecast is a clearly-labelled second class of statement.

**Thin data:** he chose _"show it, say how sure"_. Forecast from day one with the
confidence attached, including early when it is poor.

**Builder's requirement.** A forecast that is not scored is not a forecast, it is
decoration. **Every prediction must be logged and checked against what happened**,
and the accuracy record — misses included — must be visible. He named "its
forecasts come true" as one of his four proofs of learning; that proof does not
exist unless the app keeps score against itself.

---

### Decision 5 — a research-built move catalogue

**Recorded:** §13C, owner decision #2, Option B. _"A prior may **not** determine
recommendations."_ Moves today are generated only from entities the owner named
himself (`AUTHORABLE_KINDS`: goal, routine, person, place, skill, obligation).

**Asked for:** _"performing a large research on lots of situations, recording what
works, creating the moves, adjusting the metadata however needed so things connect
properly, and creating a catalog from that. **I don't trust myself if I am the one
coming up with the moves.**"_

**How far it reaches:** he chose **"research proposes, my data ranks"** — the
catalogue supplies candidates, and only his own measured effects order them.

**This is narrower than it first appears and may not overturn §13C at all.** §13C
forbids a prior _determining a recommendation_ and _influencing ranking because
personal evidence is sparse_. A catalogue that only widens the candidate pool does
neither. **The one place it bites is day one**, when there is nothing measured and
the choice among plausible moves is necessarily made by the prior. That case needs
an explicit rule and it is the honest residue of this decision.

**And §13C's own reasoning has changed underneath it.** Option C was declined for
a stated reason:

> _"C is not merely riskier than B — it gets **less safe** as evidence gets
> sparser. With no connected-data source and a hard three-question daily ceiling,
> evidence accumulates slowly and permanently — so a mechanism designed to be
> temporary becomes the standing behaviour, and a rule whose safety depends on a
> condition that will not arrive is not safe."_

**That decision was contingent on the ceiling this document removes.** At 12–30
readings a day, evidence stops being sparse and the stated reason for declining C
dissolves. The owner chose the conservative option anyway; **it is recorded here
that the stronger one is now available on its own terms**, should day-one quality
prove unacceptable.

---

### Decision 6 — catalogue coherence

**Not previously decided. New.**

> _"We have to make sure that the database of moves aren't contradicting each
> other and repetitive. It might tell me to drink some water, and then give me a
> second move right after and say drink some water then jump up and down. That's
> repetitive. Another thing about contradicting is it might say go outside for a
> walk today, and then another one that says don't go outside today, stay
> indoors."_

**Partly present, not as a catalogue property.** `recent-duplication` is a scoring
dimension, `ACTION_FAMILIES` groups related moves, and routing 93's shown ledger
stops one move being offered more than twice a day. All of them act on **one move
at a time**. None of them can see that two entries in a catalogue say the same
thing, or the opposite thing.

**Builder's note.** With a research-generated catalogue this stops being a nicety.
A catalogue built by a generative process will contain near-duplicates and
contradictions by construction, and they must be caught **when the catalogue is
built**, not at ranking time. Related: routing 94.1 already carries a
near-duplicate guard through `AuthoringProposal.problems`, and it is the right
mechanism at the wrong scale.

---

## C19 and the Fatherhood screen — a drafting failure, found from a photograph

This section is separate because it concerns a child and the standard is
different.

### What was asked for, and what it turned out to be

Asked whether C19 should stay, the owner initially said he wanted _"real numbers
on her"_. Shown the three things that could mean, he chose **counts and change
over time** — _"did it herself 4 times this month, needed help 6; last month it
was 1 and 9"_ — and explicitly not rates, shares, or comparison against what is
typical for her age.

He then sent two screenshots of the app he built before this one.

### What the screen does

A Fatherhood page with categories (Communication, Independence, and others), each
holding six or so named skills, each skill carrying a position on a ladder:

> **Not Introduced → Practicing With Daddy → Needs Support → Doing Sometimes →
> Doing Often**

and each category showing a **percentage and a progress bar** — Communication
64%, Independence 0%.

### The ladder is right, and it is already this repository's own construct

`records.ts` cites Wood, Bruner & Ross (1976): the adult provides assistance
pitched slightly ahead of the child's competence and transfers responsibility for
each component as she masters it. **The owner's ladder is that construct**, built
independently, and routing 94.1's help-ladder reader is the same object.

Its wording is better than anything currently in the codebase. **"Practicing With
Daddy" names a relationship where a developmental scale would name a deficit.**
The states are observations rather than grades, which is the whole of what C19
asks for.

His stated use is the legitimate core: _"it helps me understand where I need to
continue to support my daughter in."_

### Where the norm actually lives — and it is not the percentage

The owner said, of the six skills:

> _"These are just some random six items that probably meets the milestones of
> what she should be capable of doing at her age… **I don't know what the AI did
> to find these.**"_

**That relocates the problem.** If the six skills were selected because they are
what a three-year-old should be doing, then _"Communication 64%"_ silently means
_"64% of what she is supposed to have by now"_ — §13G's percentile with extra
steps, one level further down and harder to see. The norm is not in the number.
**It is in the choice of rows, and it is unsourced.**

### The finding

**C19's numeric clause is drafted too widely and catches the wrong thing.** Read
§13G's reasoning and every word is about **norms**: _"a symmetric norm is a
percentile with extra steps"_, _"the risk is not shaming the owner, it is quietly
framing normal [as a gap]"_. A percentile against other children and a count
against a list the owner authored are different objects that share a symbol.

**Proposed redraft, for the owner to accept or reject:**

> C19's prohibition applies to any figure about Adaya measured against something
> **outside the owner's own record** — a norm, an age expectation, another child,
> or a list whose provenance is not his. Counts of what she did and how much help
> she needed, against a list he authored, are permitted, **rendered as counts and
> never as a bare percentage or a progress bar.**

### Three specific consequences

1. **Delete the percentage and the bar; keep everything else.** They are the only
   elements that carry the norm and the only ones that do no work — nothing is
   done differently at 64% than at 58%; the six rows already said where to help.
   A count summary replaces it with no loss: _"Communication — 2 doing often, 2
   sometimes, 1 needs support, 1 practising."_
2. **The arithmetic was wrong on its own terms.** Needs Support → Doing Sometimes
   → Doing Often are not equal-sized steps. Averaging an ordinal ladder into a
   percentage asserts that they are, which is the same standard the owner set for
   causal chains, unmet.
3. **Source the list, or replace it.** §13G already approves a **cited**
   developmental reference for suppression only. An unsourced list that reads as
   neutral is the real risk on that screen and has been the whole time. Knowing
   where the rows came from matters more than the percentage ever did.

**Unchanged by all of the above:** no comparison to other children, no age
expectation rendered anywhere, no grade, no rank, and §13G 1.2's suppression-only
rule stands exactly as written.

---

## What already exists and survives

More than the owner expected. The machinery is largely built and starved.

| Piece                                    | State                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Similarity matching over past situations | Built — `SIMILARITY_WEIGHTS`: block 2, strain 2, weekend 1, child 1, minutes 1, weekday 0.5, load 0.5                     |
| Effect as a first-class outcome          | Built — `OUTCOME_ASPECTS` includes `effect`, _"what was it worth? The downstream change"_                                 |
| Learned pull feeding the ranking         | Built — weighted by similarity × source reliability, completed episodes only                                              |
| Outcome horizons                         | Built — `same-block`, `next-morning`, `multi-day`, `weekly`                                                               |
| Confidence bands                         | Built — routing 93, C14, with histories proving each band                                                                 |
| The six emotional dimensions             | Approved and defined (D-166); most not yet asked                                                                          |
| Evidence trails behind every claim       | Built and enforced by guards                                                                                              |
| Counting occasions about a child         | Built — `growth.ts` is _"a counter over occasions"_                                                                       |
| **Explore/exploit**                      | **Absent. Zero occurrences of explore, exploit, bandit, untried or novelty, and no dimension rewards low sample counts.** |

**The gap in one line:** the app can learn from data it has no way of collecting,
and cannot deliberately generate the variety that learning needs.

**Two dimensions the state model needs that are not in the fingerprint.**
`SIMILARITY_WEIGHTS` has no emotional term at all. _"Last time he had this exact
or similar pattern"_ currently means same block, similar strain, weekend, child
present, similar free time — mood and irritation are not compared on.

---

## Four hard problems, stated before they are discovered

**1. "Useful from day one" and "the moves get better over time" pull against each
other.** A research catalogue that is always plausible is how the owner's previous
app failed — asking forever, never visibly learning. The catalogue must be the
**floor the learning is measured against**, and that comparison has to be on
screen, or day-one usefulness will mask the absence of learning indefinitely.

**2. Learned weights over nine dimensions on a few weeks of data will overfit.**
It will discover that Thursdays matter. The owner set a statistical bar for causal
chains; the same bar has to apply to the weights, and until it is met the honest
default is equal weighting stated as such.

**3. The multiple-comparisons problem on causal chains is severe.** With nine
dimensions and a catalogue of moves, thousands of candidate chains are under test
simultaneously. **A plain significance test will produce confident nonsense by
volume.** "A real bar" needs designing — a correction for the number of chains
tested, a held-out confirmation window, or both — and it is the single most
likely place for this app to become untrustworthy.

**4. Holding the state/aims tension needs a policy, not a weight.** _"Both,
equally weighted"_ is a choice about what the app optimises, not an implementation.
Making the conflict visible — _"good for the certification, bad for tonight"_ —
is a different mechanism from scoring both and adding them up, and the second
would quietly resolve what the owner asked to have surfaced.

---

## What this does to the roadmap

**It does not fit in routing 94.** The owner asked for as much of it as possible
inside 94; the honest answer is that 94.1 is Fatherhood and this is a different
programme. Three things follow.

1. **94.1 is unaffected and should proceed.** The help-ladder, scaffolding states
   and skill-authoring route it already carries are, on the evidence of the
   screenshots, the right design. The single change is that its progress rollups
   ship as counts rather than percentages, which is smaller than the work already
   scoped.
2. **The state engine needs its own phase sequence**, and it inverts the current
   order: sampling and the score first, because nothing else can be measured until
   those exist; then effect measurement and the catalogue; then the forecast; then
   exploration and chains, which are the highest-risk and depend on everything
   before them.
3. **Routing 96 and 97 are partly superseded.** 96 is expectation and
   reconciliation — this is that, differently framed. 97 is inference with a kill
   criterion, and the causal-chain bar is exactly that machinery. Neither should be
   planned independently of this document.

**One sequencing recommendation, offered and not taken.** Decisions 1 and 2 are
cheap, they unblock everything, and they are separately testable: raise the
ceiling, add the ritual with its own rule, and ship the check-in. **Every day
that passes without sampling is a day of history the forecast will never have.**
The catalogue, the score and the forecast can all be designed while the data
starts accumulating.

---

## What is not decided here

- Nothing in this document is approved. All six decisions are the owner's.
- No amendment to §13B, §13C, D-166, C19 or §6.5 has been written; this states the
  case for each.
- The check-in's exact readings, the ladder for each, and the default depth are
  unspecified.
- What the 20 years of legacy records could honestly contribute is **unknown** and
  the owner asked to be told before deciding. They contain no state readings, so
  they cannot feed the forecast directly; what else is recoverable from them has
  not been examined.
- No estimate of effort is given, because the phases do not exist yet.
