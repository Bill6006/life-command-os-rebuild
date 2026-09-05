# The move catalogue — the document routing 95 builds against

**Status: RESEARCH COMPLETE, AWAITING OWNER REVIEW. Not a build phase.**
**Written 2026-09-04 by the research exercise D-296 separated out of routing 95.**

This document produced **no diff to `src/`, no test and no gate**, and it carries
no routing integer. It follows the precedent set by `PRODUCT_ADJUDICATION.md` and
`PRODUCT_ADJUDICATION_2.md` — _"not a build phase; it produced a decision, not a
diff."_

**Nothing here is wired to anything.** Routing 95's build half imports it, and
D-296's third bound says that build does not start until the owner has read this.

---

## Why this exists, in one paragraph

The owner has asked three times when he stops seeing only _"walk for 25 minutes"_.
The answer is that the app has one candidate, because moves are generated only
from entities he has authored himself and a new store has almost none. D-289
approved a **research-built** catalogue for a reason he gave himself — _"I don't
trust myself if I am the one coming up with the moves."_ D-296 then took the
research out of routing 95, because leaving it there made that phase _research
plus build plus coherence-check plus effect measurement_, which is D-283's
fourteen-package mistake with a different subject.

**What follows is 27 candidate moves.** Nineteen of them can be offered on a store
with nothing in it at all.

---

## The four things worth reading even if you read nothing else

**1. Every effect this catalogue can measure is a feeling.** Routing 94's check-in
takes thirteen readings and all of them are about how he is: mood, irritation,
energy, hunger, stress, sleep, overwhelm, motivation, confidence, focus,
loneliness, social energy. **None of them reads whether anything got done.** So
when routing 95 measures what a move did, it will measure how he felt afterwards
and never what it produced — and roughly half this catalogue exists to produce
something. Detailed in [What the check-in can and cannot
see](#what-the-check-in-can-and-cannot-see).

**2. Six of the sixteen shipped verbs are categories, not moves — and this
catalogue makes several of them concrete.** `wind-down` is a category; _"screens
down and the lights low for the last twenty minutes"_ is a move inside it. **Both
of them on the same evening is D-290's first example exactly**, and routing 95 has
to decide whether the category retires or the concrete entry becomes its object.
Detailed in [The coherence pass](#the-coherence-pass-d-290-done-on-the-document).

**3. Nineteen entries need nothing he has authored.** That is the number that
answers the original complaint. The other eight need a learning topic or a person
to exist first, and are marked **tier 2** for that reason — they cannot fire on
day one, which is the day the catalogue exists for.

**4. Six entries have a `now` at or below 0.20 on purpose** — A1, A6, E6, E7, F1
and J1. Three of them do not merely fail to help in that block, they **take
something from it**: no caffeine from now on, book the exam, look at the balance.
**The app has to be able to say that out loud** or it will look like it is
recommending things that do not help.

---

## How to read an entry

D-296 fixes five fields, because `MoveProfile` is not free text and an entry
missing one is not an entry:

| Field      | What it is                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| `demand`   | what kind of effort it asks for — `restorative`, `light`, `effortful`      |
| `now`      | expected value in the block it happens in, **0–1**                         |
| `tomorrow` | expected value the following day, **0–1**                                  |
| `friction` | how hard it is to start, **0–1**, higher is harder                         |
| `size`     | minutes where the move has a natural length, **omitted where it does not** |

Each entry carries three more lines that are research output rather than fields:

- **Evidence** — what the priors are placed on, with the citation.
- **Seen in** — which of routing 94's thirteen readings a plausible effect would
  show up in, and where the honest answer is _none of them_, it says so.
- **Fit** — what about this owner's life the entry passes, or needs.

**`now`, `tomorrow` and `friction` are priors in the exact sense §13C means.** The
code comment on them already says _"Learning moves this."_ The research seeds
them; his measured effects move them. That is D-289's _"research proposes, his
data ranks"_ arriving as three numbers rather than as a slogan.

---

## The ruler: how the priors were placed

A number between 0 and 1 means nothing on its own. **The sixteen shipped profiles
in `src/intelligence/moves.ts` are the ruler**, because a catalogue placed on a
different scale would be ranked against them and lose or win for the wrong reason.
Every prior below was placed by asking _where does this sit relative to something
already in that table_, and the anchor is named on the entry.

### The bands, and the shipped move that fixes each one

**`now` and `tomorrow` — expected value in that window**

| Band          | What it means                                | Shipped anchor                              |
| ------------- | -------------------------------------------- | ------------------------------------------- |
| **0.00–0.15** | nearly nothing in this window                | `hold` — 0.05 now, 0.10 tomorrow            |
| **0.20–0.35** | a small, real difference                     | `protect-sleep` — 0.30 now                  |
| **0.40–0.55** | the middle of the table                      | `move` — 0.50 / 0.50; `ease-off` — 0.45 now |
| **0.60–0.75** | clearly better than most alternatives        | `hands-on-lab` — 0.60 now                   |
| **0.80–0.90** | the strongest thing available in that window | `time-with` — 0.80 now; `recover` — 0.90    |

**`friction` — how hard it is to start**

| Band          | What it means              | Shipped anchor                                 |
| ------------- | -------------------------- | ---------------------------------------------- |
| **0.00–0.15** | nothing to overcome        | `hold` — 0; `recover` — 0.10                   |
| **0.20–0.35** | one small act of will      | `wind-down` — 0.20; `recall-practice` 0.25     |
| **0.40–0.55** | a decision has to be made  | `move` — 0.45; `handle-money-item` — 0.55      |
| **0.60–0.75** | needs a run-up             | `start-conversation` 0.60; `hands-on-lab` 0.70 |
| **0.80–1.00** | he will avoid it for weeks | **nothing shipped is here.** One entry is.     |

**Everything is rounded to the nearest 0.05.** Two decimal places is more
precision than any of this evidence supports, and a prior written as `0.53` is a
claim about a third significant figure that no study in the bibliography could
settle.

### The citation rule, and the one place it had to be interpreted

D-296: _"Every prior carries its citation… A number without one is a builder's
guess wearing a lab coat."_

**`now` and `tomorrow` are placed on evidence** — an effect, an effect size, a
duration, a sample. That is a citation in the ordinary sense and every entry has
one.

**`friction` mostly has no literature.** Nobody has measured how hard it is to
get out of a warm bed at one in the morning. So the rule is read as _sourced_
rather than _published_: a friction prior cites either the research (where the
research is itself about the barrier, as with the anticipated awkwardness of a
phone call) **or the shipped move it was placed beside, by name**. Where a friction
number had neither, the entry did not go in — see [B5 in the
refusals](#considered-and-refused).

**This is an interpretation and it is flagged so the owner can reject it.** If he
wants a published number behind every friction value, the catalogue loses most of
its entries and the ones left are not the ones that fit his evenings.

### Verification status of the sources — read this before trusting a number

**The bibliography was written from the builder's own knowledge and was not
retrieved.** Journal, volume, year and sample size are given for every source
precisely so that checking one is cheap. This campaign has already been bitten
once by strings that were imagined rather than read, and a prior is exactly the
kind of thing that gets quoted back later as though it were measured.

**Routing 95 must spot-check any source whose number it intends to ship.** The
priors are seeds and the owner's data moves them, so an error in one is
self-correcting over weeks — but it is not self-correcting on day one, which is
the day the prior actually decides.

---

## The admission test

D-296's first bound: _"It must fit this owner's actual life, not a generic
wellness library. A catalogue of moves for someone with unlimited evenings is
worse than no catalogue."_

He has a young daughter, a custody arrangement, a certification he is behind on,
and evenings that are frequently not his. **Five questions, and an entry that
fails one is rewritten or dropped:**

1. **Does it fit the time he actually has?** Most entries are ten minutes or less.
   One is forty-five, and it is marked as needing an evening he does not always
   get.
2. **Can it be done without leaving the house — or does it declare that it
   cannot?** Two entries require going out and say so, because a supervision
   constraint has to have something to bite on.
3. **Can it be interrupted and either resumed or abandoned without waste?** This
   is the question that removed expressive writing, which reliably makes people
   feel worse before it makes them feel better and therefore must not be started
   and dropped.
4. **Does it need nothing he has to buy, book or arrange?** One entry fails this
   deliberately and is at the top of the veto list.
5. **Would a plausible effect land on something the app can read?** Where the
   answer is no, the entry may still be right — but it can never be shown to be
   right, and it says so.

---

## What the check-in can and cannot see

Routing 94 shipped thirteen readings on a five-point scale with a stated
direction, and a 0–100 score over ten of them (D-300). **That is what routing 95
will measure a move's effect against**, so it is worth knowing while the entries
are being written rather than after.

**The thirteen:** mood · irritation · energy · hunger · stress · hours slept ·
how the night went · overwhelm · motivation · confidence · focus · loneliness ·
social energy.

**Every one of them is a reading of how he is.** None of them reads whether the
kitchen got cleared, whether he got through a chapter, whether the balance is
better, or whether he is fitter. Four consequences fall out of that:

- **The whole certification family (E1–E7) has no progress reading.** Their
  honest effect target is confidence, motivation and focus. A study session that
  taught him a great deal and left him tired will read as a move that made things
  slightly worse.
- **The two training entries (B3, B4) have no fitness reading.** Their effect is
  visible only as mood and energy in the hours afterward, which is the smallest
  and least interesting part of what they do.
- **`health.soreness`, `home.friction`, `money.cash-buffer-state` and
  `career.usable-time-tonight` exist in the concept registry but the check-in does
  not take them.** A before-and-after on those depends on evidence arriving some
  other way, and today it mostly does not arrive.
- **Hours slept and how the night went are read every morning but are not terms
  in the score** (D-300). So the sleep family's effect is measurable on its own
  two readings and invisible in the headline number — which is correct, and will
  look wrong on a screen unless it is said.

**This is not an argument for adding readings.** It is the thing routing 95 needs
to have decided before it claims to measure effect, and it is stated here so that
decision is made deliberately.

---

## The catalogue — 27 entries

**Tier 1** needs nothing the owner has authored and can be offered on an empty
store. **Tier 2** needs an entity — a learning topic, a person — to exist first.

| #      | Move                                                                     | demand      | now  | tom. | fric. | size | tier |
| ------ | ------------------------------------------------------------------------ | ----------- | ---- | ---- | ----- | ---- | ---- |
| **A1** | Set tomorrow's alarm for the same time as today's                        | restorative | 0.10 | 0.55 | 0.10  | —    | 1    |
| **A2** | Screens down and the lights low for the last twenty minutes              | restorative | 0.30 | 0.70 | 0.30  | 20   | 1    |
| **A3** | A warm shower an hour or so before bed                                   | restorative | 0.40 | 0.55 | 0.20  | 10   | 1    |
| **A4** | Write down tomorrow's first job, then stop                               | restorative | 0.35 | 0.60 | 0.10  | 5    | 1    |
| **A5** | Get out of bed if you have been lying awake twenty minutes               | restorative | 0.20 | 0.50 | 0.40  | —    | 1    |
| **A6** | No more caffeine from now on today                                       | light       | 0.05 | 0.50 | 0.25  | —    | 1    |
| **B1** | Ten minutes outside, at whatever pace                                    | light       | 0.55 | 0.20 | 0.25  | 10   | 1    |
| **B2** | Daylight on your face in the first hour you are up                       | light       | 0.35 | 0.45 | 0.20  | 10   | 1    |
| **B3** | One flight of stairs, fast, three times                                  | effortful   | 0.35 | 0.15 | 0.35  | 3    | 1    |
| **B4** | A set on the floor — press-ups, squats, whatever you have                | effortful   | 0.45 | 0.35 | 0.40  | 12   | 1    |
| **C1** | Five minutes of breathing, the out-breath longer than the in             | restorative | 0.55 | 0.15 | 0.15  | 5    | 1    |
| **C2** | Say what you are feeling, in one sentence                                | light       | 0.40 | 0.10 | 0.25  | 3    | 1    |
| **C3** | Put everything on your mind on one page, in no order                     | light       | 0.50 | 0.35 | 0.30  | 10   | 1    |
| **C4** | Ask what you would say to someone else in this position                  | light       | 0.40 | 0.15 | 0.30  | 5    | 1    |
| **D1** | Eat something now                                                        | light       | 0.60 | 0.05 | 0.20  | 10   | 1    |
| **D2** | A glass of water                                                         | light       | 0.25 | 0.05 | 0.05  | —    | 1    |
| **E1** | Write down three things you could not answer, before looking anything up | light       | 0.50 | 0.40 | 0.30  | 10   | 2    |
| **E2** | Redo the ones you got wrong last time, not the ones you got right        | effortful   | 0.55 | 0.45 | 0.45  | 20   | 2    |
| **E3** | Sit one section timed, under exam conditions                             | effortful   | 0.50 | 0.50 | 0.70  | 45   | 2    |
| **E4** | Explain one thing out loud as if you were teaching it                    | light       | 0.50 | 0.35 | 0.30  | 10   | 2    |
| **E5** | Open it and do five minutes — you may stop after five                    | light       | 0.35 | 0.30 | 0.15  | 5    | 2    |
| **E6** | Decide the when and where of the next session, in writing                | light       | 0.20 | 0.55 | 0.10  | 3    | 2    |
| **E7** | Book the exam date                                                       | effortful   | 0.15 | 0.40 | 0.85  | 15   | 2    |
| **F1** | Put tomorrow morning's things where you will trip over them              | light       | 0.20 | 0.55 | 0.20  | 10   | 1    |
| **G1** | Call them instead of texting                                             | light       | 0.50 | 0.20 | 0.50  | 15   | 2    |
| **H1** | Ten minutes lying down, before three o'clock                             | restorative | 0.50 | 0.10 | 0.30  | 10   | 1    |
| **J1** | Look at the balance you have been avoiding. Just look.                   | effortful   | 0.10 | 0.40 | 0.70  | 10   | 1    |

**Nineteen tier 1, eight tier 2.** Against a candidate set of one, measured
2026-09-03 on an empty store.

---

### A — Ending the day

#### A1 · Set tomorrow's alarm for the same time as today's

**restorative · now 0.10 · tomorrow 0.55 · friction 0.10 · size —**

**Evidence.** Sleep regularity predicted mortality more strongly than sleep
duration across roughly 61,000 accelerometry-tracked UK Biobank participants
(Windred et al., _Sleep_ 47(1):zsad253, 2024). A fixed wake time is the anchor of
the two-process model — the circadian process is entrained by the wake time, not
by the bedtime (Borbély, _Human Neurobiology_ 1:195–204, 1982).

**Why these numbers.** `now` 0.10 because setting an alarm changes nothing about
tonight; it is placed just above `hold`. `tomorrow` 0.55 rather than higher
because one night of one habit is not the regularity the evidence is about — the
payoff accrues over weeks and a prior about a single tomorrow should not claim it.
`friction` 0.10, beside `recover`: it is a thing he does with his thumb.

**Seen in.** Hours slept and how the night went, next morning. Energy and focus,
indirectly.

**Fit.** Survives the nights that are not his. It is the only sleep entry that
costs nothing and requires no part of the evening to have gone well.

---

#### A2 · Screens down and the lights low for the last twenty minutes

**restorative · now 0.30 · tomorrow 0.70 · friction 0.30 · size 20**

**Evidence.** Ordinary room light before bedtime suppressed melatonin onset and
shortened melatonin duration by around 90 minutes relative to dim light (Gooley et
al., _Journal of Clinical Endocrinology & Metabolism_ 96(3):E463–E472, 2011).

**Why these numbers.** `now` 0.30, beside shipped `protect-sleep`, because the
evening itself is quieter and that is real but small. `tomorrow` 0.70 — below
`wind-down`'s 0.85, deliberately, because this is one component of winding down
rather than the whole of it and should not out-rank its own parent. `friction`
0.30, above `wind-down`'s 0.20, because putting the phone down is harder than
deciding to wind down.

**Seen in.** How the night went, hours slept. Energy next morning.

**Fit.** Works with the house asleep. **Flagged:** the closest thing in this
catalogue to a shipped verb — see the coherence pass.

---

#### A3 · A warm shower an hour or so before bed

**restorative · now 0.40 · tomorrow 0.55 · friction 0.20 · size 10**

**Evidence.** Water-based passive body heating 1–2 hours before bed shortened
sleep onset latency by around 36% across 17 studies (Haghayegh et al., _Sleep
Medicine Reviews_ 46:124–135, 2019). The mechanism is the drop in core temperature
that follows peripheral warming, which is why the timing matters and _"a hot
shower at bedtime"_ is not the same move.

**Why these numbers.** `now` 0.40 — it is pleasant immediately, which most of this
family is not. `tomorrow` 0.55 on a real but single-night effect. `friction` 0.20,
matched to `wind-down`.

**Seen in.** How the night went, hours slept.

**Fit.** Ten minutes, indoors, interruptible, and it is something he was probably
going to do anyway at a different hour.

---

#### A4 · Write down tomorrow's first job, then stop

**restorative · now 0.35 · tomorrow 0.60 · friction 0.10 · size 5**

**Evidence.** Writing a specific to-do list before bed produced faster sleep onset
than writing about the day already completed (Scullin et al., _Journal of
Experimental Psychology: General_ 147(1):139–146, 2018; n = 57, polysomnography).
The mechanism is that an unfulfilled goal intrudes until a plan exists, and making
the plan removes the intrusion without completing the goal (Masicampo &
Baumeister, _Journal of Personality and Social Psychology_ 101(4):667–683, 2011).

**Why these numbers.** `now` 0.35 because the head going quiet is felt in the same
block. `tomorrow` 0.60 on both the sleep effect and the morning that starts with
the decision already made. `friction` 0.10 — one line on paper.

**Seen in.** Overwhelm in the same block; how the night went and motivation next
morning.

**Fit.** Five minutes, needs nothing, survives an evening that went badly.
**Flagged:** adjudicated against C3 and F1 in the coherence pass.

---

#### A5 · Get out of bed if you have been lying awake twenty minutes

**restorative · now 0.20 · tomorrow 0.50 · friction 0.40 · size —**

**Evidence.** Stimulus control — leave the bed when not sleeping, so the bed stops
being a place where he lies awake (Bootzin, _Proceedings of the American
Psychological Association_, 1972). It is one of the components of CBT-I, which
reduced sleep onset latency by around 19 minutes and wake-after-sleep-onset by
around 26 minutes across 20 randomised trials (Trauer et al., _Annals of Internal
Medicine_ 163(3):191–204, 2015).

**Why these numbers.** `now` 0.20 — the night is already partly lost and this does
not recover it. `tomorrow` 0.50 on the conditioning effect, which is the part that
compounds. `friction` 0.40, just below `move`'s 0.45 and **the highest of any
restorative entry in the catalogue**: getting out of a warm bed at one in the
morning is a decision, not a nudge.

**Seen in.** How the night went, hours slept.

**Fit.** Needs nowhere to go but the next room, which matters with a child asleep
in the house.

---

#### A6 · No more caffeine from now on today

**light · now 0.05 · tomorrow 0.50 · friction 0.25 · size —**

**Evidence.** 400 mg of caffeine taken 6 hours before bed reduced total sleep time
by more than an hour, and the sleepers did not notice the disruption in their own
subjective reports (Drake et al., _Journal of Clinical Sleep Medicine_
9(11):1195–1200, 2013). The second half of that sentence is why the move is worth
having: he cannot feel the cost he is paying.

**Why these numbers.** `now` 0.05, at `hold`'s level, and honestly it may be
negative — this is a move that takes something away this afternoon. `tomorrow`
0.50. `friction` 0.25, beside `recall-practice`: it is a small act of will,
repeated.

**Seen in.** Hours slept and how the night went, next morning. **Nothing in the
same block**, which is unusual in this catalogue and has to be said on screen.

**Fit.** Costs nothing, needs nothing, and is available in every afternoon he has.
**Flagged:** one of the three entries that deliberately take something from the
block they happen in.

---

### B — Moving

#### B1 · Ten minutes outside, at whatever pace

**light · now 0.55 · tomorrow 0.20 · friction 0.25 · size 10 · requires leaving**

**Evidence.** A ten-minute self-paced walk improved affective valence, and the
effect was largest when the pace was self-selected rather than prescribed
(Ekkekakis, Hall, VanLanduyt & Petruzzello, _Journal of Sport & Exercise
Psychology_ 22:245–275, 2000). Twenty minutes of contact with urban nature
produced a measurable drop in salivary cortisol and amylase (Hunter, Gillespie &
Chen, _Frontiers in Psychology_ 10:722, 2019).

**Why these numbers.** `now` 0.55 — the top of the middle band, because the
affective effect is immediate and reliable and this is what most of the evidence
for _"go for a walk"_ actually shows. `tomorrow` 0.20: almost none of it survives
the night. `friction` 0.25, well below shipped `move`'s 0.45, because that is the
whole difference between the two.

**Seen in.** Mood, energy, stress, irritation — four of the ten score readings,
the widest of any entry here.

**Fit.** **Requires leaving**, so it is unavailable on the evenings a supervision
constraint is active, and that is exactly what `requiresLeaving` exists to
express. **Flagged:** adjudicated against shipped `move` in the coherence pass —
this is deliberately _not_ "walk for 25 minutes".

---

#### B2 · Daylight on your face in the first hour you are up

**light · now 0.35 · tomorrow 0.45 · friction 0.20 · size 10 · requires leaving**

**Evidence.** A week of natural light-dark exposure advanced circadian timing by
roughly two hours and brought melatonin onset into line with sleep onset (Wright
et al., _Current Biology_ 23(16):1554–1558, 2013). **The sample was eight people**
and that is stated on the entry rather than buried, because it is the thinnest
evidence base in this catalogue.

**Why these numbers.** `now` 0.35 on the immediate alerting effect. `tomorrow`
0.45 on the circadian one, held below the sleep family's numbers because the
mechanism runs over days rather than one night. `friction` 0.20, matched to
`wind-down`.

**Seen in.** Mood and energy in the same block; hours slept and how the night went
the following morning.

**Fit.** **This can be the school run.** It is the only entry in the catalogue
that costs no additional time at all on a morning he already has to be outside.

---

#### B3 · One flight of stairs, fast, three times

**effortful · now 0.35 · tomorrow 0.15 · friction 0.35 · size 3**

**Evidence.** Three separate 20-second stair-climbing sprints, three times a week
for six weeks, improved peak oxygen uptake by around 5% (Jenkins et al., _Applied
Physiology, Nutrition, and Metabolism_ 44(6):681–684, 2019; n = 24).

**Why these numbers.** `now` 0.35 — a small immediate lift, and no more than that.
`tomorrow` 0.15: nothing from a single bout survives to the next day. `friction`
0.35 — three minutes, but it means starting something unpleasant.

**Seen in.** **Nothing the check-in reads is what this move is for.** Its effect
is cardiorespiratory fitness over six weeks, and mood and energy in the hour after
are the only trace of it the app can see. It is in the catalogue because it fits
three minutes in a house he cannot leave, and it is marked as unmeasurable so
nobody later mistakes a flat reading for a move that did not work.

**Fit.** Three minutes, indoors, no equipment, works with a sleeping child.

---

#### B4 · A set on the floor — press-ups, squats, whatever you have

**effortful · now 0.45 · tomorrow 0.35 · friction 0.40 · size 12**

**Evidence.** Resistance exercise training reduced depressive symptoms across 33
randomised trials and 1,877 participants, with a mean effect of Δ = 0.66, and the
effect did not depend on how much strength was actually gained (Gordon et al.,
_JAMA Psychiatry_ 75(6):566–576, 2018).

**Why these numbers.** `now` 0.45, at `ease-off`'s level. `tomorrow` 0.35 — higher
than B1 or B3, because the evidence here is about a course of training rather than
a single bout and a prior that ignored that would under-rate the only entry with a
multi-week effect. `friction` 0.40, just under `move`'s 0.45.

**Seen in.** Mood, energy, confidence. The strength itself is invisible to the
app.

**Fit.** **The only training entry that works with a sleeping child in the house
and no way to leave.** That is why it is here and why its `size` is twelve minutes
rather than forty.

---

### C — Steadying

#### C1 · Five minutes of breathing, the out-breath longer than the in

**restorative · now 0.55 · tomorrow 0.15 · friction 0.15 · size 5**

**Evidence.** Five minutes a day of structured breathing for 28 days improved mood
and lowered respiratory rate relative to mindfulness meditation, with cyclic
sighing — a long exhale — producing the largest effect (Balban et al., _Cell
Reports Medicine_ 4(1):100895, 2023; randomised, n = 108). The physiological
mechanism is reviewed in Zaccaro et al., _Frontiers in Human Neuroscience_ 12:353, 2018.

**Why these numbers.** `now` 0.55 — this is one of the few entries whose whole
effect is in the same block, and the trial measured it there. `tomorrow` 0.15:
essentially none of it carries. `friction` 0.15, beside `recover`'s 0.10 — it is
the lowest-friction thing in the catalogue that actually does something.

**Seen in.** Stress, irritation, mood.

**Fit.** Five minutes, silent, needs nothing, can be done in a room with a
sleeping child in it. **The entry with the fewest preconditions of any here.**

---

#### C2 · Say what you are feeling, in one sentence

**light · now 0.40 · tomorrow 0.10 · friction 0.25 · size 3**

**Evidence.** Putting a feeling into words reduced amygdala response and increased
right ventrolateral prefrontal activity — affect labelling as incidental emotion
regulation (Lieberman et al., _Psychological Science_ 18(5):421–428, 2007; n = 30,
fMRI).

**Why these numbers.** `now` 0.40, below C1 because the effect is smaller and the
evidence is a mechanism study rather than an outcome trial. `tomorrow` 0.10:
nothing survives. `friction` 0.25, at `recall-practice` — naming it is a small act
of will and sometimes an unwelcome one.

**Seen in.** Irritation, stress, mood.

**Fit.** Three minutes. **Flagged:** the closest surviving pair in the catalogue
is C2/C3 — adjudicated in the coherence pass.

---

#### C3 · Put everything on your mind on one page, in no order

**light · now 0.50 · tomorrow 0.35 · friction 0.30 · size 10**

**Evidence.** Unfulfilled goals intrude on attention until a plan exists; writing
them down removes the intrusion (Masicampo & Baumeister, _Journal of Personality
and Social Psychology_ 101(4):667–683, 2011). Written before bed, the same act
shortened sleep onset (Scullin et al., 2018, above).

**Why these numbers.** `now` 0.50 — the load coming off is felt immediately.
`tomorrow` 0.35, because a page that still exists tomorrow is still doing
something. `friction` 0.30 — looking at the whole list is the barrier, and it is
the reason this is not a lower number.

**Seen in.** Overwhelm, stress, focus.

**Fit.** Ten minutes, interruptible, and the page survives the interruption.

---

#### C4 · Ask what you would say to someone else in this position

**light · now 0.40 · tomorrow 0.15 · friction 0.30 · size 5**

**Evidence.** Reflecting on a stressor in second- or third-person language rather
than first-person produced less distress, less rumination afterwards, and better
appraisals — across several experiments including one under social-evaluative
stress (Kross et al., _Journal of Personality and Social Psychology_
106(2):304–324, 2014).

**Why these numbers.** `now` 0.40, level with C2 and on comparable evidence.
`tomorrow` 0.15, with a nod to the reduced-rumination finding, which is the one
part of it that carries. `friction` 0.30 — it requires taking a position on your
own situation, which is harder than describing it.

**Seen in.** Stress, confidence, mood.

**Fit.** Five minutes, no materials, no privacy required.

---

### D — Eating and drinking

#### D1 · Eat something now

**light · now 0.60 · tomorrow 0.05 · friction 0.20 · size 10**

**Evidence.** Across 21 days of experience sampling, greater hunger was associated
with greater anger and irritability and lower pleasure, in everyday settings
rather than in a lab (Swami et al., _PLOS ONE_ 17(6):e0269629, 2022; n = 64).

**Why these numbers.** `now` 0.60 — the top of the fourth band, and the highest
`now` in the catalogue, because this is the only entry whose effect is on a
reading the check-in takes **by name** and the effect is large and fast.
`tomorrow` 0.05: nothing. `friction` 0.20.

**Seen in.** **Hunger, directly** — plus irritation and focus. Hunger is one of
the thirteen readings, so this move's effect is _read_ rather than inferred, which
is true of almost nothing else here.

**Fit.** Ten minutes, in the house, and it is the entry most likely to be the
right answer on the evenings that go worst.

---

#### D2 · A glass of water

**light · now 0.25 · tomorrow 0.05 · friction 0.05 · size —**

**Evidence.** Mild dehydration at around 1.6% of body mass increased fatigue and
tension and reduced vigour in young men, at a level below the threshold of thirst
(Ganio et al., _British Journal of Nutrition_ 106(10):1535–1543, 2011; n = 26).

**Why these numbers.** `now` 0.25 — real, small, and the evidence is about a
deficit being corrected rather than about a benefit being added. `tomorrow` 0.05.
`friction` 0.05, between `hold` and `recover`: it is the easiest thing in the
catalogue.

**Seen in.** Energy, mood.

**Fit.** Needs nothing. **This is the owner's own example move, and it appears in
this catalogue exactly once.** Its twin — the one that would say _"drink some water
then jump up and down"_ — is the thing the coherence pass exists to keep out, and
D-290 quotes it by name.

---

### E — The certification

**All seven are tier 2**: they need a learning topic to exist before they can be
offered, and none of them can fire on an empty store. **All seven share one
problem** — the check-in has no reading for progress, so their measurable effect is
confidence, motivation and focus, and a session that taught him a great deal and
left him tired will read as a move that made things slightly worse.

Practice testing and distributed practice are the two techniques rated **high
utility** in the largest review of learning techniques; most of the popular
alternatives were rated low (Dunlosky et al., _Psychological Science in the Public
Interest_ 14(1):4–58, 2013). Five of these seven are one or the other.

#### E1 · Write down three things you could not answer, before you look anything up

**light · now 0.50 · tomorrow 0.40 · friction 0.30 · size 10**

**Evidence.** Retrieval practice beat restudying at a one-week delay — 61% against
40% — despite students predicting the opposite (Roediger & Karpicke, _Psychological
Science_ 17(3):249–255, 2006).

**Why these numbers.** `now` 0.50, level with shipped `recall-practice`'s 0.50,
because it is the same mechanism at the same dose. `tomorrow` 0.40, above
`recall-practice`'s 0.30, because the retrieval effect is specifically a delayed
one and the shipped prior arguably under-rates it. `friction` 0.30, just above
`recall-practice`'s 0.25 — closing the book first is the harder part.

**Seen in.** Confidence, focus. Not progress.

**Fit.** Ten minutes, interruptible, needs only the material.

---

#### E2 · Redo the ones you got wrong last time, not the ones you got right

**effortful · now 0.55 · tomorrow 0.45 · friction 0.45 · size 20**

**Evidence.** Distributed practice outperformed massed practice across 254 studies
and more than 14,000 participants, with the advantage growing with the retention
interval (Cepeda et al., _Psychological Bulletin_ 132(3):354–380, 2006).
Interleaved practice of different problem types produced 80% against 38% at a
delayed test (Rohrer, Dedrick & Stershic, _Journal of Educational Psychology_
107(3):900–908, 2015).

**Why these numbers.** `now` 0.55 exactly at shipped `review-weak-topic`, `tomorrow` 0.45 above its
0.35 and `friction` 0.45 above its 0.40 — because this is that move with a
selection rule attached, and the rule makes it both more durable and harder. `friction` 0.45 — deliberately re-reading what he already
failed at is harder than reviewing generally.

**Seen in.** Confidence.

**Fit.** Twenty minutes, and it survives being cut short better than E3.

---

#### E3 · Sit one section timed, under exam conditions

**effortful · now 0.50 · tomorrow 0.50 · friction 0.70 · size 45**

**Evidence.** Practice testing is the single highest-utility technique in Dunlosky
et al. (2013), and the testing effect is Roediger & Karpicke (2006) above. A timed
section also produces calibration — it tells him what he does not know, which is
the thing he cannot get from reading.

**Why these numbers.** `now` and `tomorrow` both 0.50. `friction` 0.70, matched
exactly to shipped `hands-on-lab`, because it is the same shape of commitment.

**Seen in.** Confidence — and this is the entry where that is least adequate.

**Fit.** **Forty-five uninterrupted minutes is the thing most of his evenings
cannot give.** It is in the catalogue because the certification cannot be passed
without it, and it is marked as needing an evening that is actually his.

---

#### E4 · Explain one thing out loud as if you were teaching it

**light · now 0.50 · tomorrow 0.35 · friction 0.30 · size 10**

**Evidence.** Students prompted to explain each line of a text to themselves
learned substantially more than students who read it twice, and the gain came from
the explaining rather than from the extra exposure (Chi, de Leeuw, Chiu &
LaVancher, _Cognitive Science_ 18(3):439–477, 1994).

**Why these numbers.** `now` 0.50, level with E1 on comparable mechanism.
`tomorrow` 0.35. `friction` 0.30 — talking to an empty room is a small barrier and
a real one.

**Seen in.** Confidence, focus.

**Fit.** Ten minutes and it can be done while doing something else with his hands.

---

#### E5 · Open it and do five minutes — you may stop after five

**light · now 0.35 · tomorrow 0.30 · friction 0.15 · size 5**

**Evidence.** Behavioural activation — scheduling and doing the small thing before
the motivation arrives rather than after — produced a mean effect of d = 0.87
across 16 studies (Cuijpers, van Straten & Warmerdam, _Clinical Psychology Review_
27(3):318–326, 2007). Naming the moment and the place in advance adds d = 0.65
(Gollwitzer & Sheeran, _Advances in Experimental Social Psychology_ 38:69–119,
2006), which is already cited in `cue.ts`.

**Why these numbers.** `now` 0.35 — five minutes of study is worth five minutes of
study, and the value is that it happened at all. `tomorrow` 0.30. `friction` 0.15
— **the lowest in this family by design.** This entry exists because the other six
are too heavy for a bad evening, and if its friction is not visibly the lowest it
will never be chosen on the evening it is for.

**Seen in.** Motivation, confidence.

**Fit.** Five minutes, abandonable without waste, works on the evenings that are
not his after the house is quiet.

---

#### E6 · Decide the when and where of the next session, in writing

**light · now 0.20 · tomorrow 0.55 · friction 0.10 · size 3**

**Evidence.** An if-then plan naming when, where and how has a mean effect on goal
attainment of d = 0.65 across 94 independent studies and over 8,000 participants
(Gollwitzer & Sheeran, 2006). This is the best-evidenced single lever in the whole
bibliography and the codebase already says so.

**Why these numbers.** `now` 0.20 — it does nothing today and that is the point.
`tomorrow` 0.55, the highest `tomorrow` in this family, on the strongest evidence
in it. `friction` 0.10.

**Seen in.** Motivation tomorrow. **Nothing in the same block** — one of the four
entries that has to be able to say so.

**Fit.** Three minutes. **Flagged:** the app must not invent the _when_ — `cue.ts`
is explicit that a wrong cue is worse than none, so the moment has to come from
him or from a boundary already in his record.

---

#### E7 · Book the exam date

**effortful · now 0.15 · tomorrow 0.40 · friction 0.85 · size 15**

**Evidence.** Self-imposed deadlines improved performance relative to no deadlines,
though not as much as externally imposed ones — people know they procrastinate and
will pay to precommit (Ariely & Wertenbroch, _Psychological Science_ 13(3):219–224,
2002).

**Why these numbers.** `now` 0.15 — the evening it happens is worse, not better.
`tomorrow` 0.40 on the commitment effect. `friction` **0.85, above anything in the
shipped table**, and the band above `hands-on-lab`'s 0.70 was defined for this one
entry.

**Seen in.** Stress — probably upward. Motivation, later.

**Fit.** **Fails admission test 4 on purpose**: it costs money and it is not
reversible in the way every other entry here is. It is in the catalogue because a
certification he is behind on is one of the four facts that define this owner's
situation, and precommitment is the intervention with evidence behind it.

**This is the entry most likely to be absurd on a bad evening and it is first on
the veto list.**

---

### F — The house

#### F1 · Put tomorrow morning's things where you will trip over them

**light · now 0.20 · tomorrow 0.55 · friction 0.20 · size 10**

**Evidence.** The environmental half of an implementation intention — the plan
works because the cue is encountered, and an object in the doorway is a cue that
cannot be missed (Gollwitzer & Sheeran, 2006). Separately, women whose home
descriptions were loaded with clutter and unfinished tasks showed flatter diurnal
cortisol slopes and more depressed mood over the day (Saxbe & Repetti, _Personality
and Social Psychology Bulletin_ 36(1):71–81, 2010; n = 60).

**Why these numbers.** `now` 0.20 — it is work done for someone else, and that
someone is him tomorrow. `tomorrow` 0.55. `friction` 0.20, at `wind-down`.

**Seen in.** Overwhelm tonight; motivation next morning.

**Fit.** Ten minutes, indoors, and it is the entry that pays off best on the
mornings that start badly. **Flagged:** adjudicated against A4 in the coherence
pass — they are close and must not both be offered on one evening.

---

### G — People

#### G1 · Call them instead of texting

**light · now 0.50 · tomorrow 0.20 · friction 0.50 · size 15 · tier 2**

**Evidence.** People expect a phone call to be more awkward than a text and
predict a weaker connection; both predictions were wrong. Voice produced a
stronger connection at no cost in awkwardness, across several experiments (Kumar &
Epley, _Journal of Experimental Psychology: General_ 150(3):595–607, 2021). More
frequent contact, including brief and weak-tie contact, predicts greater happiness
and belonging day to day (Sandstrom & Dunn, _Personality and Social Psychology
Bulletin_ 40(7):910–922, 2014).

**Why these numbers.** `now` 0.50. `tomorrow` 0.20. `friction` 0.50 — **and this
is the one friction prior in the catalogue that the research itself is about.**
The anticipated awkwardness is the barrier, the studies measured it, and the
finding is that it is an over-estimate. The prior is set at the barrier as he
experiences it, not at the barrier as the research says it should be, because the
prior's job is to predict whether he will start.

**Seen in.** Social energy, loneliness, mood.

**Fit.** **Tier 2** — it needs a person he has named, so it cannot fire on day
one. Fifteen minutes and it works from the house. **Flagged:** adjudicated against
shipped `reach-out` in the coherence pass.

---

### H — Deliberate rest

#### H1 · Ten minutes lying down, before three o'clock

**restorative · now 0.50 · tomorrow 0.10 · friction 0.30 · size 10**

**Evidence.** Of 5-, 10-, 20- and 30-minute naps after restricted sleep, the
**10-minute** nap produced immediate improvements in alertness and cognitive
performance that lasted up to 155 minutes; the longer naps produced sleep inertia
first (Brooks & Lack, _Sleep_ 29(6):831–840, 2006). The bound on the hour comes
from the two-process model: sleep pressure discharged in the late afternoon is not
available at night (Borbély, 1982).

**Why these numbers.** `now` 0.50. `tomorrow` 0.10 — and it must not be higher,
because a nap that helps tomorrow is a nap that took something from tonight.
`friction` 0.30 — lying down in the middle of a day is harder than it sounds.

**Seen in.** Energy, focus, mood.

**Fit.** Ten minutes, indoors, and it fits an afternoon that is his.

**The bound is the entry.** Unbounded, this contradicts every entry in family A —
see the coherence pass, where it is the one contradiction the catalogue actually
contained and where bounding it, rather than dropping it, is recorded as the
resolution.

---

### J — Money

#### J1 · Look at the balance you have been avoiding. Just look.

**effortful · now 0.10 · tomorrow 0.40 · friction 0.70 · size 10**

**Evidence.** The ostrich effect: investors looked at their portfolios markedly
less often when markets were falling — attention to financial information declines
exactly when the information matters most (Karlsson, Loewenstein & Seppi, _Journal
of Risk and Uncertainty_ 38(2):95–115, 2009).

**Why these numbers.** `now` 0.10 — **this move makes the evening worse and the
prior says so.** `tomorrow` 0.40, because what he is avoiding costs him more than
what he would see. `friction` 0.70, above shipped `handle-money-item`'s 0.55, and
the gap between them is the whole point: looking is harder than doing, when
looking is the thing being avoided.

**Seen in.** Stress — likely upward in the same block. Overwhelm, downward, later.

**Fit.** Ten minutes, indoors, needs nothing. **Flagged:** adjudicated against
shipped `handle-money-item` in the coherence pass, and one of the three entries
that deliberately take something from the block they happen in.

---

## The coherence pass (D-290), done on the document

D-290, in the owner's words: not _"drink some water"_ followed by _"drink some
water then jump up and down"_; not _"go outside for a walk today"_ beside _"stay
indoors today"_. **A generatively-built catalogue contains both by construction**,
and this document is the only place the whole set is visible at once.

### The method, and the thing it had to be widened to catch

Every entry was compared against **every other entry** and against **all sixteen
shipped profiles in `src/intelligence/moves.ts`**. The second half is not
optional: the shipped table and the catalogue are one candidate pool at ranking
time, so a catalogue entry that duplicates a shipped verb is a duplicate in
exactly D-290's sense, and checking the catalogue only against itself would have
missed four of the five duplicates found.

Two tests, run on every pair:

- **Duplication** — would offering both on the same day read as the app saying the
  same thing twice?
- **Contradiction** — does doing one make the other wrong, or undo it?

### What it caught

**Five duplicates, removed.** Four against the shipped table, one internal.

| Removed                              | Duplicate of                   | Note                                                                                                        |
| ------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| _Walk for 25 minutes_                | shipped `move`                 | **The exact sentence the owner complained about.** It was never going in.                                   |
| _Clear one surface, not the room_    | shipped `reset-space` (15 min) | Same act, shorter. A shorter duplicate is still a duplicate.                                                |
| _Send one message to one person_     | shipped `reach-out`            | Same act. The channel-specific version (G1) survived; this did not.                                         |
| _Ten minutes of recall, book closed_ | shipped `recall-practice`      | Identical. E1 survived because "before you look anything up" is a different instruction, not a shorter one. |
| _Twenty minutes in green space_      | B1, internally                 | Merged into B1, whose evidence already covers both.                                                         |

**One contradiction, resolved by bounding rather than by dropping.** An unbounded
_"have a ten-minute nap"_ contradicts every entry in family A: sleep pressure spent
in the late afternoon is not available at night, so the app would be recommending
the thing that undoes A1–A6. **H1 carries "before three o'clock" in its own name**,
and the bound is derived from the same two-process model that justifies A1. This is
the only true contradiction the catalogue contained.

**One contradiction avoided by refusing an entry.** _"Have a coffee"_ has a real
literature behind it and it is not in the catalogue. It contradicts A6 directly,
and the owner's own second-order example is about exactly this move — _"his state
boosted from 50% to 80%, but an hour later it drops to 35%."_ **A catalogue that
contains both the boost and the cutoff is the app arguing with itself**, and the
one with the better evidence stays.

### The four pairs that survived, and why

These are the closest surviving pairs. Each is a judgement, and each is written
down so the owner can overturn it rather than discover it on a Tuesday.

**A4 (write tomorrow's first job) and C3 (put everything on your mind on one
page).** Both are writing, both cite Masicampo & Baumeister. **Distinct because
A4 is one line at bedtime about tomorrow and C3 is the whole load at any hour.**
The shared citation is a warning sign and it is recorded as one: if routing 95
finds they behave identically in his data, C3 is the one to keep.

**A4 (write tomorrow's first job) and F1 (put tomorrow's things in the doorway).**
Both prepare tomorrow at the end of tonight. **Distinct because one is cognitive
and one is physical** — the line on paper is about his head letting go, the object
in the doorway is about the friction of the morning. **They must not both be
offered on the same evening**, and nothing in the current architecture stops that.

**C1 (breathing) and C2 (naming the feeling).** Both are five minutes or fewer,
restorative in effect, aimed at stress and irritation. **Distinct because one is
physiological and one is cognitive**, and the demand differs — C1 is
`restorative`, C2 is `light`. Comfortable.

**G1 (call instead of text) and shipped `reach-out`.** **The only difference is the
channel**, which by the standard applied to the four removed duplicates should have
removed this one too. It survived because the channel _is_ the research — the
finding is specifically that voice beats text and that he will predict otherwise —
and because `reach-out` does not name a channel, so the two are a category and an
instance rather than two instances. **This is the weakest adjudication in the pass
and it is flagged as such.**

**J1 (look at the balance) and shipped `handle-money-item`.** Distinct because
looking is not handling and the priors differ in the direction the research
predicts — `now` 0.10 against 0.40, `friction` 0.70 against 0.55.

### The finding this pass produced, and it is larger than the pass

**Six of the sixteen shipped verbs are categories rather than moves.**
`wind-down`, `recover`, `ease-off`, `lighten-the-day`, `move` and `reach-out` each
name a kind of thing to do rather than a thing to do. **The catalogue's entries are
instances of several of them**, and two of the four surviving adjudications above
turn on that distinction.

**On the same evening, a category and one of its own instances is D-290's first
example.** _"Wind down before bed"_ followed by _"screens down and the lights low
for the last twenty minutes"_ is the app saying the same thing twice, and nothing
in `recent-duplication`, `ACTION_FAMILIES` or routing 93's shown ledger can see it,
because all three act on one move at a time.

**Routing 95 has to decide this and this document does not.** The two available
shapes are that the category retires when its instances land, or that the category
stays and the instances become its objects. **What must not happen is that neither
is chosen**, because the default is both on screen.

### What this pass cannot do

It compared 27 entries against each other and against 16 shipped profiles — 351
internal pairs and 432 cross pairs. **It is a human reading of a document, not a
test**, it will not survive the catalogue growing, and it says nothing about
whether two entries turn out to have the same effect in his data. D-290's
statistical bar is a different instrument for a different question, and it belongs
to routing 98.

---

## Considered and refused

Recorded because a refusal with a reason is worth as much to routing 95 as an
entry, and because two of these will otherwise be proposed again.

| Refused                                      | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Have a coffee**                            | Contradicts A6, and it is the owner's own worked example of a move that boosts and then costs. Evidence exists; coherence wins.                                                                                                                                                                                                                                                                                                                        |
| **Fifteen minutes of expressive writing**    | Fails admission test 3. It reliably worsens mood in the same session before it helps, so it must not be started and interrupted — and the pooled effect is small anyway (Frattaroli, _Psychological Bulletin_ 132(6):823–865, 2006: 146 studies, r ≈ .075).                                                                                                                                                                                            |
| **Sit quietly with your own thoughts**       | The evidence points the other way: people find unstructured solitary thinking aversive enough to prefer an electric shock (Wilson et al., _Science_ 345(6192):75–77, 2014).                                                                                                                                                                                                                                                                            |
| **Stand up and move for two minutes**        | **Cut for want of a citation.** The general case for breaking up sitting is real; nothing supports a two-minute dose, and the friction number had no anchor either. It is the rule biting.                                                                                                                                                                                                                                                             |
| **Three good things / gratitude at bedtime** | Refused on bound 1 — it is the first entry a generic wellness library would contain, it touches none of the four facts that define this owner's situation, and its effect lands on mood where nine other entries already land. **The evidence is genuinely decent** (Seligman et al., _American Psychologist_ 60(5):410–421, 2005; n = 411, randomised, effects at six months), so this is a judgement rather than a refutation — see the review list. |
| **Anything involving Adaya**                 | Out of scope by instruction, not by evidence. D-291 governs anything measured about a child and this exercise has no business near it. See the gaps below.                                                                                                                                                                                                                                                                                             |

---

## Deliberate gaps

**A catalogue that is silent about something is not the same as a catalogue that
covers it badly**, and each of these is silence on purpose.

**Fatherhood.** No entry in this catalogue involves the owner's daughter. D-291
governs anything measured about a child, routing 96 is the Fatherhood phase, and
the dispatch that produced this document put the subject out of scope. **This is
the largest gap in the catalogue and it is the right one** — but it means the
catalogue is silent about a large part of his life, and the shipped `time-with`
and `growth-opportunity` verbs remain the only things that speak to it.

**Faith and meaning.** `faith.practice-recent` is a concept and `DOMAIN.faith` is a
domain. **Research cannot supply this.** What his practice is, is his to author,
and `AUTHORABLE_KINDS` stays exactly as D-289 says. An entry here would be a
generative process inventing a practice for him, which is the failure mode D-289's
whole reasoning is about.

**Private health.** Out of scope on privacy grounds and not examined.

**Anything needing an entity he has not authored.** Eight entries are tier 2 for
this reason and they are marked. There is no tier-3: an entry that could only ever
work on a fully-populated store did not go in, because the catalogue exists for the
empty one.

**Sleep beyond the wind-down.** No entry addresses waking at 4 a.m. and staying
awake, or the effects of a child waking in the night. Both are plausibly frequent
in this owner's life and neither has an intervention this catalogue could offer in
ten minutes.

---

## What the owner should look for

D-296's third bound: _"Not trusting himself to generate is not the same as
declining to veto"_ — he is still the only person who can say _"I would never do
that."_ **A catalogue he has not read is a catalogue that will propose something
absurd on a bad evening.**

**Five entries are flagged for a decision, and each is a real question:**

1. **E7 — Book the exam date.** Costs money, is not reversible, and has by far the
   highest friction in the catalogue. **The one most likely to be absurd on a bad
   evening.** Keep, cut, or keep with a rule that it is never offered when the
   state score is low?
2. **E3 — Sit one section timed, 45 minutes.** The longest entry by a factor of
   two, and most of his evenings cannot give it. Is it worth carrying for the
   evenings that can?
3. **A6 — No more caffeine from now on today.** Takes something away and gives
   nothing back until tomorrow. Is that a move he wants offered, or a rule he
   wants left alone?
4. **J1 — Look at the balance you have been avoiding.** The app deliberately
   making an evening worse. Correct, or intrusive?
5. **G1 — Call them instead of texting.** The weakest adjudication in the coherence
   pass; it is very close to the shipped `reach-out`.

**One left out that he may want back:** three good things at bedtime, refused for
being the entry a generic library would contain first. The evidence is real. If he
wants it, it goes in.

**And two structural questions only he can settle:**

- **Nineteen tier-1 entries against a candidate set of one.** Is that the variety
  he was asking for, or does it need to be larger before routing 95 builds?
- **Every measurable effect is a feeling.** He asked for _"the moves measurably get
  better over time"_ as one of his four proofs of learning. On this catalogue and
  this check-in, what gets measurably better is how he feels — not what he gets
  done. Is that acceptable, or does the check-in need something the certification
  can show up in?

---

## What routing 95 has to decide, and this document does not

Recorded so the build half starts from a list rather than from a blank page.
**None of these is decided here.**

1. **The category-versus-instance question.** Whether the six category verbs retire
   when their instances land, or keep them as objects. Nothing else in this
   document matters if both end up on screen.
2. **Whether B1 and shipped `move` share an `ACTION_FAMILIES` entry.** They are a
   ten-minute walk and a twenty-five-minute one. `ACTION_FAMILIES` is empty by
   design and D-091 says adding to it is _"a deliberate act with a name on it"_ —
   so this is a decision, not a tidy-up, and it is not made here.
3. **The day-one rule.** D-289's honest residue: on day one nothing is measured and
   the choice among plausible moves is necessarily the prior's. The catalogue makes
   that easier by spreading across three demands and the full friction range, but
   it does not supply the rule.
4. **How effect is measured for the entries whose effect the check-in cannot
   see** — the seven certification entries and the two training ones. Either an
   honest _"this is not measurable"_, or a reading the check-in does not currently
   take.
5. **What `suits`, `refuses`, `outcome`, `aspects`, `measures`, `affects` and
   `requiresLeaving` are for each entry.** D-296 required five fields and this
   document supplies exactly those five plus the research context. The remaining
   eight are build decisions with existing rules behind them — D-059, D-089,
   AUD-0045 — and inventing them here would have been this exercise doing routing
   95's job badly.
6. **Whether the six entries with a `now` at or below 0.20 are shown
   differently.** A1, A6, E6, E7, F1 and J1 — and three of them (A6, E7, J1) take
   something from the block they happen in rather than merely failing to help. The
   app has to be able to say so.

---

## Sources

Listed once, in the order first cited. **Not retrieved — see [Verification
status](#verification-status-of-the-sources--read-this-before-trusting-a-number).**

1. Windred et al. (2024). Sleep regularity is a stronger predictor of mortality
   risk than sleep duration. _Sleep_ 47(1):zsad253. ~61,000 participants.
2. Borbély (1982). A two process model of sleep regulation. _Human Neurobiology_
   1:195–204.
3. Gooley et al. (2011). Exposure to room light before bedtime suppresses melatonin
   onset. _Journal of Clinical Endocrinology & Metabolism_ 96(3):E463–E472.
4. Haghayegh et al. (2019). Before-bedtime passive body heating and sleep. _Sleep
   Medicine Reviews_ 46:124–135. 17 studies.
5. Scullin et al. (2018). The effects of bedtime writing on difficulty falling
   asleep. _Journal of Experimental Psychology: General_ 147(1):139–146. n = 57.
6. Masicampo & Baumeister (2011). Consider it done! Plan making can eliminate the
   cognitive effects of unfulfilled goals. _JPSP_ 101(4):667–683.
7. Bootzin (1972). Stimulus control treatment for insomnia. _Proceedings of the
   American Psychological Association_.
8. Trauer et al. (2015). Cognitive behavioral therapy for chronic insomnia.
   _Annals of Internal Medicine_ 163(3):191–204. 20 RCTs.
9. Drake et al. (2013). Caffeine effects on sleep taken 0, 3, or 6 hours before
   going to bed. _Journal of Clinical Sleep Medicine_ 9(11):1195–1200.
10. Ekkekakis, Hall, VanLanduyt & Petruzzello (2000). Walking in (affective)
    circles. _Journal of Sport & Exercise Psychology_ 22:245–275.
11. Hunter, Gillespie & Chen (2019). Urban nature experiences reduce stress in the
    context of daily life. _Frontiers in Psychology_ 10:722.
12. Wright et al. (2013). Entrainment of the human circadian clock to the natural
    light-dark cycle. _Current Biology_ 23(16):1554–1558. **n = 8.**
13. Jenkins et al. (2019). Do stair climbing exercise "snacks" improve
    cardiorespiratory fitness? _Applied Physiology, Nutrition, and Metabolism_
    44(6):681–684.
14. Gordon et al. (2018). Association of efficacy of resistance exercise training
    with depressive symptoms. _JAMA Psychiatry_ 75(6):566–576. 33 RCTs, 1,877
    participants.
15. Balban et al. (2023). Brief structured respiration practices enhance mood and
    reduce physiological arousal. _Cell Reports Medicine_ 4(1):100895. n = 108.
16. Zaccaro et al. (2018). How breath-control can change your life. _Frontiers in
    Human Neuroscience_ 12:353.
17. Lieberman et al. (2007). Putting feelings into words. _Psychological Science_
    18(5):421–428.
18. Kross et al. (2014). Self-talk as a regulatory mechanism: how you do it
    matters. _JPSP_ 106(2):304–324.
19. Swami et al. (2022). Hangry in the field. _PLOS ONE_ 17(6):e0269629. n = 64,
    21 days.
20. Ganio et al. (2011). Mild dehydration impairs cognitive performance and mood of
    men. _British Journal of Nutrition_ 106(10):1535–1543.
21. Dunlosky et al. (2013). Improving students' learning with effective learning
    techniques. _Psychological Science in the Public Interest_ 14(1):4–58.
22. Roediger & Karpicke (2006). Test-enhanced learning. _Psychological Science_
    17(3):249–255.
23. Cepeda et al. (2006). Distributed practice in verbal recall tasks.
    _Psychological Bulletin_ 132(3):354–380. 254 studies.
24. Rohrer, Dedrick & Stershic (2015). Interleaved practice improves mathematics
    learning. _Journal of Educational Psychology_ 107(3):900–908.
25. Chi, de Leeuw, Chiu & LaVancher (1994). Eliciting self-explanations improves
    understanding. _Cognitive Science_ 18(3):439–477.
26. Cuijpers, van Straten & Warmerdam (2007). Behavioral activation treatments of
    depression. _Clinical Psychology Review_ 27(3):318–326. 16 studies.
27. Gollwitzer & Sheeran (2006). Implementation intentions and goal achievement.
    _Advances in Experimental Social Psychology_ 38:69–119. 94 studies, 8,000+
    participants. **Already cited in `src/intelligence/cue.ts`.**
28. Ariely & Wertenbroch (2002). Procrastination, deadlines, and performance.
    _Psychological Science_ 13(3):219–224.
29. Saxbe & Repetti (2010). No place like home. _Personality and Social Psychology
    Bulletin_ 36(1):71–81. n = 60.
30. Kumar & Epley (2021). It's surprisingly nice to hear you. _Journal of
    Experimental Psychology: General_ 150(3):595–607.
31. Sandstrom & Dunn (2014). Social interactions and well-being: the surprising
    power of weak ties. _Personality and Social Psychology Bulletin_ 40(7):910–922.
32. Brooks & Lack (2006). A brief afternoon nap following nocturnal sleep
    restriction. _Sleep_ 29(6):831–840.
33. Karlsson, Loewenstein & Seppi (2009). The ostrich effect. _Journal of Risk and
    Uncertainty_ 38(2):95–115.
34. Frattaroli (2006). Experimental disclosure and its moderators. _Psychological
    Bulletin_ 132(6):823–865. 146 studies. **Cited for a refusal.**
35. Wilson et al. (2014). Just think: the challenges of the disengaged mind.
    _Science_ 345(6192):75–77. **Cited for a refusal.**
36. Seligman et al. (2005). Positive psychology progress. _American Psychologist_
    60(5):410–421. n = 411. **Cited for a refusal the owner may overturn.**

---

## Provenance

**Produced by:** the move catalogue research exercise, Claude Opus 5, 2026-09-04.
**Authorised by:** D-296, which separated this from routing 95.
**Bounded by:** D-289 (research proposes, his data ranks), D-290 (coherence),
D-291 (nothing about Adaya), §13C (a prior may not determine a recommendation).
**Consumed by:** routing 95's build half, and nothing else.
**Not a build phase.** No `src/` change, no test, no gate, no routing integer,
and no QA round — this document is not a phase and there is nothing to certify.
