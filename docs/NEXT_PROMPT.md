# Next dispatch — routing 95: the catalogue wired, and what a move did

**Phase:** 95 — **The move catalogue as candidates, and measured effect**

**Next actor:** Claude
**Target system:** Claude
**Model:** Claude Opus 5
**Reasoning / Effort:** Max
**Conversation:** CURRENT
**Independent QA:** OFF — this file opens no QA round. Phase 95 will be recorded
`BUILT / QA DEFERRED` and an independent round settles it later.

**Written after the owner read `docs/MOVE_CATALOGUE.md`.** That read was the whole
reason D-296 split routing 95 in two, and it has now happened. This is the build
half.

**You are the conversation that wrote the catalogue**, and that is deliberate:
the coherence pass you ran is the reasoning behind decision 3 below, and it is
cheaper to keep it than to re-derive it. **Two consequences.** You have already
spent context on the research half, so commit in working increments rather than
saving everything for the end — a phase that dies with nothing committed has to
be redone from the document. And if you find yourself running short, **write
`docs/qa/PHASE_95_QA_HANDOFF.md` and the next dispatch before you polish
anything**; an unfinished build with an honest handoff is recoverable, a finished
build nobody recorded is not.

---

## Read this first: the owner's decisions, and they are settled

Six things were put to him out of the catalogue's _"What the owner should look
for"_. These are the answers. **Do not reopen them, do not re-argue them, and do
not quietly widen them.**

### 1. E7 "Book the exam date" is CUT

His word was _"cut it"_. Remove the entry. **The catalogue is 26 entries, not
27** — 19 tier 1, 7 tier 2.

Two consequences to carry through rather than leave dangling:

- **Admission test 4 now has no deliberate failure.** E7 was the only entry that
  cost money and was not reversible. Nothing in the shipped catalogue asks him to
  buy, book or arrange anything. Say so where the admission test is recorded.
- **The friction range now tops out at 0.70**, not 0.85. The band above
  `hands-on-lab`'s 0.70 was defined for E7 alone; with E7 gone it is empty. Either
  the band goes, or it is documented as reserved and unoccupied. **Do not leave a
  0.85 ceiling in the code with nothing at it.**

### 2. E3, A6, J1 and G1 all ship — with three conditions

- **E3** (45-minute timed section) keeps its marking as needing an evening that is
  actually his. It is the longest entry by a factor of two and the top of the size
  range; the certification cannot be passed without it.
- **A6 and J1 take something from the block they happen in.** A6 gives nothing
  back until tomorrow; J1 makes the evening worse and its prior says so. **The app
  has to be able to say that out loud.** That was open decision 6 in the
  catalogue's own list — it is now mandatory, not optional. See §4 below.
- **G1** (call instead of texting) is _"the weakest adjudication in the coherence
  pass"_ by the catalogue's own admission. It does not get to stay unexamined
  beside `reach-out`. **It is a `reach-out` instance and it must be resolved by
  decision 3, not left sitting next to its category.**

### 3. Category versus instance: you decide, and you justify it

He kept his veto at the phase gate rather than choosing the shape now. So **you
choose**, you implement it, and you write down the reasoning where QA can judge it.

Six of the sixteen shipped verbs are categories rather than moves: `wind-down`,
`recover`, `ease-off`, `lighten-the-day`, `move`, `reach-out`. The two available
shapes are:

- the category **retires** when its instances land, or
- the category **stays and the instances become its objects**.

**What must not happen is that neither is chosen**, because the default is a
category and one of its own instances on the same evening — D-290's first example
exactly, and nothing in `recent-duplication`, `ACTION_FAMILIES` or routing 93's
shown ledger can see it, because all three act on one move at a time.

Whichever you pick, the QA handoff must carry the argument, not the conclusion.

### 4. Effect measurement stays on feelings. Write the gap down; do not close it

**Do not extend the check-in in this phase.** Routing 95 measures against the
thirteen readings routing 94 already ships and nothing else. Adding a reading is a
phase, not a sub-task, and it is not this one.

What is required instead is honesty in the data:

- **Every entry whose plausible effect lands on none of the thirteen readings must
  declare that in its own record**, not in prose. The seven certification entries
  and the two training ones are the known cases; there may be more once E7 is out.
- **The app must never claim to have learned from an entry it cannot read.** An
  entry marked unmeasurable contributes no evidence to anything that ranks,
  reweights or reports.
- **Register the gap as a named finding for the owner**, in the QA handoff, in one
  paragraph: he asked for _"the moves measurably get better over time"_ as one of
  his four proofs of learning, and on this catalogue and this check-in what
  improves measurably is how he feels — not what he gets done. That is a decision
  he still has to make. **Do not solve it here and do not bury it.**

### 5. "Three good things at bedtime" stays out

Refused deliberately in the research half for being the entry a generic library
would contain first. **That refusal stands.** Not re-litigated, not re-added.

### 6. Nineteen tier-1 entries is enough variety

Nineteen entries that need nothing he has authored, against a candidate set of
one, is the answer to _"walk for 25 minutes"_. **Do not pad the catalogue** to
make a number look better.

---

## What to build

`docs/MOVE_CATALOGUE.md` is the input. It supplies five `MoveProfile` fields per
entry — `demand`, `now`, `tomorrow`, `friction`, `size` — plus evidence, a
citation, the readings a plausible effect would show up in, and the fit argument.
**Those five are given. The rest is yours.**

1. **Wire the 26 entries as candidates.** Tier 1 must be offerable on an empty
   store — that is the day the catalogue exists for. Tier 2 entries need a
   learning topic or a person to exist first and must not fire before one does.
2. **Supply the remaining eight fields** — `suits`, `refuses`, `outcome`,
   `aspects`, `measures`, `affects`, `requiresLeaving` and the tier marking — under
   the rules that already govern them: D-059, D-089, AUD-0045. These are build
   decisions with existing precedent, which is exactly why the research half did
   not invent them.
3. **The day-one rule.** D-289's honest residue: on day one nothing is measured and
   the choice among plausible moves is necessarily the prior's. The catalogue
   spreads across three demands and the full friction range to make that easier; it
   does not supply the rule. Supply it.
4. **`B1` and shipped `move`.** A ten-minute walk and a twenty-five-minute one.
   Whether they share an `ACTION_FAMILIES` entry is a decision, not a tidy-up —
   D-091 says adding to `ACTION_FAMILIES` is _"a deliberate act with a name on
   it"_. Make it deliberately, with the name on it, or decline it explicitly.
5. **Show the low-`now` entries differently.** With E7 cut these are A1, A6, E6,
   F1 and J1, and two of them — A6 and J1 — **take** something from the block
   rather than merely failing to help. The owner has ruled that the app must say
   so on screen. An app that offers "no more caffeine from now on" with no
   explanation looks like it is recommending things that do not help.
6. **Measured effect.** What a move did, read against the thirteen readings, for
   the entries that have one. Priors are seeds; his measured effects move them —
   D-289's _"research proposes, his data ranks"_.

**Every prior keeps its citation.** A number without one is a builder's guess
wearing a lab coat, and the catalogue already did this work — do not drop it in
transit.

---

## The gate

`npm run verify` — format check, lint, typecheck, tests, build, rendered-copy scan.

**Read the summary line and its count, not the exit status.** A pipeline reports
the last stage's code, and this campaign has already been told a gate was green
while two tests were failing. Quote the counts in the QA handoff.

**You may not mark this phase GREEN.** No phase in this campaign is GREEN until an
independent QA round passes it and the owner accepts that verdict. Report what you
built and what you proved; the verdict is not yours to write.

---

## What to leave behind — and this is the opposite of what the research half was told

The research half was forbidden to write a QA brief or a routing dispatch, because
either one would have recorded phase 95 as finished when only half of it had run.
**That half is over. This one closes the phase, so both are now required.**

1. **Write `docs/qa/PHASE_95_QA_HANDOFF.md`.** It carries: what you built, the
   category-versus-instance decision and its argument, the `ACTION_FAMILIES`
   decision, the day-one rule, which entries are unmeasurable and how that is
   declared in the data, the effect-measurement gap as a named finding for the
   owner, and the gate's summary counts.
2. **Rewrite this file as the routing 96 dispatch.** It must carry an explicit
   Phase field near the top — the bolded label followed by the **routing**
   integer for domains and progression, not a canonical phase number — laid out
   exactly as line 3 of this document lays it out. An absent or non-numeric value
   makes the parser count phase mentions instead, and a document that discusses
   the phase it just finished at length while opening the next one gets read as
   the wrong one.

   **Write that field once, and only once.** This very document was drafted with
   the field spelled out a second time inside this instruction as an example, and
   the parser read the example rather than the header: it routed to the next
   phase instead of this one, and a check caught it before it was sent. **Refer
   to the field; do not reproduce it.**

**Two numbering systems are in play.** Canonical phases 9, 10, 11, 12 map to
routing 90, 92, 93, 94; plan section 43A is the only place they are reconciled.
State the routing one.

---

## The roadmap after this phase

| #   | Phase                                     | State                                |
| --- | ----------------------------------------- | ------------------------------------ |
| 91  | reach, then validity                      | **BUILT / QA DEFERRED**              |
| 92  | —                                         | **BUILT / QA DEFERRED**              |
| 93  | —                                         | **BUILT / QA DEFERRED**              |
| 94  | the check-in, the readings, the score     | **BUILT / QA DEFERRED**              |
| 95a | the move catalogue research               | **done** — `docs/MOVE_CATALOGUE.md`  |
| 95  | **the catalogue wired, and effect**       | **this dispatch**                    |
| 96  | domains and progression (Fatherhood)      | ready; D-291 changes rollups         |
| 97  | the forecast                              | needs 95                             |
| 98  | exploration and causal chains             | needs 97, and **D-172 is open**      |
| 99  | advancement and revision                  | —                                    |

**Four phases are unapproved and none of their handoffs may be edited for any
reason.** They are awaiting independent QA, and a builder editing a brief for a
phase it did not run is how a deferred debt gets quietly cleared.

**D-172 blocks phase 98 and nothing before it.** `docs/CAMPAIGN_HOLDS.md` carries
the declaration and it is still `open`.

<!-- LCO_COMPLETE -->
