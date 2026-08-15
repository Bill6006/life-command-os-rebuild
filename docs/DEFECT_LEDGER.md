# Defect ledger

Verified defects and their resolution. Canonical plan section 42 governs the
process:

1. reproduce;
2. identify the whole defect **class**, not only the reported line;
3. write a focused regression;
4. prove the regression fails when the defect is reintroduced;
5. fix the root cause;
6. rerun focused coverage;
7. rerun the full relevant gate.

A defect is not closed until a regression exists that would have caught it, and
until its siblings in the same failure class have been checked.

## Entry format

```
### DEF-000n — <short title>

- Status:        Open | Fixed | Won't fix
- Severity:      Blocker | Major | Minor
- Found in:      <phase> / <SHA>
- Found by:      <automated gate | owner phone test | independent adversarial pass>
- Class:         <the whole family of failures this belongs to>
- Reproduction:  <exact steps or failing scenario>
- Root cause:    <what was actually wrong, not the symptom>
- Regression:    <test file and name that fails when the defect is reintroduced>
- Siblings:      <other places sharing the class, and their status>
- Fixed in:      <SHA>
```

---

## Open

None.

## Fixed

### DEF-0008 — the guide kept asking after asking stopped helping

- Status: Fixed
- Severity: Major — section 47 fails the phase outright on "too many questions"
- Found in: Phase 2 / `0757e58`
- Found by: owner phone test
- Class: **a per-question justification with no view of the sequence.** Each
  question passed its own test — some answer to it would change the
  recommendation — and nothing anywhere asked whether the run of them was worth
  the owner's attention. Two separate holes made it: a question qualified if a
  single corner-case answer would move the outcome, and the catalogue's order
  decided which one was asked rather than which was worth most.
- Reproduction: load "A topic that keeps slipping", open Now, answer every
  question the guide offers. Four questions, and the recommendation is identical
  after all four.
- Root cause: `changesTheAnswer` is the right test for the inspector and too
  loose for the guide, and `swings.find(...)` took the first in list order.
- Fix, in three parts: the guide asks the question whose answers diverge most,
  requires at least two of its answers to lead away from where the engine
  currently stands, and stops once an answer has moved nothing — because the
  best question was asked first, so the ones behind it are worth less by
  construction.
- Regression: `tests/synthetic/adaptive-guide.test.ts` — "asks at most two
  questions on any scenario in the library", "stops once an answer changes
  nothing", "keeps going while the answers are still moving it". Reintroducing
  the list-order pick and dropping the two rules was tried; the second fails.
- Siblings: checked — the per-day floor still exists underneath all of this, and
  the inspector deliberately keeps the looser definition, because "these answers
  would land elsewhere" is true and worth showing even when it is not worth a
  tap.
- Fixed in: the repair checkpoint after `0757e58`

### DEF-0007 — development scaffolding became the product

- Status: Fixed
- Severity: Major — owner-facing surfaces stating things about the app that were
  no longer true
- Found in: Phase 2 / `0757e58`
- Found by: owner phone test
- Class: **a phase number written into a screen.** It looks deliberate, it
  survives every later phase, and nothing ever revisits it — the only person who
  finds it is the owner, on a real phone, wondering why the product is talking
  about its own construction. The same applies to any sentence describing part
  of the system as absent: it stops being true the moment that part is built and
  gives no signal when it does.
- Reproduction: open Life, Timeline or Insights. Each carried "PHASE 0" above
  the title, two phases after Phase 0 ended. Timeline additionally said the
  canonical record store "does not exist until Phase 1", which by then was
  false in a way that would make an owner wonder where their history had gone.
- Root cause: five hand-written phase strings across four screens, and no reason
  for anyone to look at them again.
- Fix: one `REBUILD_PHASE` constant in `src/platform/buildInfo.ts`; phase
  language confined to the build panel behind More and to the QA laboratory,
  both of which read it from there; the false claims rewritten to describe what
  is actually true now.
- Regression: `tests/unit/architecture-guards.test.ts` — "mentions a phase on no
  primary destination", "keeps the phase itself in one place", "claims nothing
  about the app that has stopped being true". Putting the eyebrow and the
  sentence back on Timeline was tried, and two of the three fail.
- Siblings: swept every file under `src/features/` rather than the three screens
  reported. More's "Exports, backup and restore arrive in Phase 7" and its
  "there is still no engine choosing anything" were both stale and both fixed.
- Fixed in: the repair checkpoint after `0757e58`

### DEF-0006 — the explanation rationalised the winner

- Status: Fixed
- Severity: Blocker — the app presenting reasoning it did not use
- Found in: Phase 2 / `0757e58`
- Found by: owner phone test
- Class: **an explanation that may cite any fact rather than only the evidence
  the decision leaned on.** Each branch of the reason generator reached for
  whichever particular was nearest and, failing that, the next nearest — which
  produces something that reads exactly like reasoning and is not. This is worse
  than saying less: it invites the owner to trust a chain of inference that was
  never drawn.
- Reproduction: load "One answer, and a lot of silence" and open Now. The app
  recommended a twenty-five minute walk and explained it as "You are an hour
  down, which is not enough to sit still for." The move's evidence is energy and
  soreness, both unknown; the sleep shortfall contributed nothing to it winning
  and, if anything, argues the other way.
- Root cause, in two layers. The reason generator had no notion of which facts
  the winning move rested on. Underneath that, the move should not have won at
  all: `strain` can be worked out from sleep alone, which was enough to fire the
  movement generator on a history that knew nothing about how the owner felt.
  "There is capacity for it" is a claim about the body, and three good nights is
  not evidence of it.
- Fix: the reason may only cite a concept in the winning candidate's `leansOn`,
  and the movement generator now requires a real energy or soreness reading. The
  premise is deliberately exempt — "Monday morning, an hour short on sleep" is a
  true statement about the situation, not a claim about why anything won.
- Consequence, and it is the right one: four scenarios that used to produce a
  walk now say there is nothing to suggest and ask one question. One tap turns
  each into a walk explained by the thing that was actually asked.
- Regression: `tests/synthetic/no-hidden-genericity.test.ts` — "cites a sleep
  figure only when the move rests on sleep", "never argues from a shortfall for
  a move that spends energy", "proposes no movement at all without a reading of
  how the body is". Both layers were reintroduced separately, and each fails the
  matching test with the owner's own sentence quoted back.
- Siblings: checked every branch of the reason generator against the `leansOn`
  of the moves that can reach it. `good-conditions` was the only one citing
  evidence it had no claim on; the others were already citing their own.
- Fixed in: the repair checkpoint after `0757e58`

### DEF-0005 — the app stated a number and asked for it in the same breath

- Status: Fixed
- Severity: Major — the owner cannot tell a contradictory screen from one that
  has forgotten what it was told
- Found in: Phase 2 / `0757e58`
- Found by: owner phone test
- Class: **a row labelled as something other than what it carries.** Now showed
  "Time: about 30 minutes", which was the suggested move's own length, while the
  guide underneath asked "How much time have you got?" and a third row said the
  usable time was still unknown. Every one of those was individually true and
  the screen as a whole was incoherent.
- Reproduction: load "A settled arrangement, and one week away" and open Now.
  The move is thirty minutes with Adaya; the row reads as thirty minutes free.
- Root cause: the duration belongs to the move, and where it matters the
  sentence already carries it — "spend 15 minutes clearing the kitchen". The row
  was both ambiguous and a repeat.
- Fix: the row is gone. So are "Still unknown", which is the app talking about
  itself when the guide below already surfaces anything material, and "Where
  this stands: New tonight", which says nothing until a move has a history.
- Regression: `tests/synthetic/adaptive-guide.test.ts` — "never asks about
  something already known" over every scenario and every step of the guide, and
  "shows no length of time on Now while asking how much time there is".
  `tests/browser/now.spec.ts` — "states no duration it is about to ask for, and
  no engine bookkeeping".
- Siblings: the underlying invariant — the guide never asks about a concept that
  is already usable — was already true and is now asserted across every scenario
  and every guide step rather than assumed.
- Fixed in: the repair checkpoint after `0757e58`

### DEF-0004 — the ranking was not a real order

- Status: Fixed
- Severity: Major — a reproducible decision trace cannot be built on a
  comparator whose result depends on the sort implementation
- Found in: Phase 2 / pre-`5447900`
- Found by: reading the first ranking the engine produced, and noticing that a
  lower score sat above a higher one
- Class: **an ordering rule with an equality window.** The comparator treated
  any two scores within 0.02 as tied and settled them on friction. That is not
  transitive: with three moves spaced 0.015 apart, the first ties the second and
  the second ties the third while the first beats the third outright, so what
  `Array.prototype.sort` returns is up to the engine. It is the whole family —
  any "close enough to be equal" comparison has it, and the symptom is not a
  wrong answer but an answer that stops being reproducible.
- Reproduction: rank three moves scoring 0.300, 0.285 and 0.270 where the
  highest is not the cheapest to start. The ranking came back
  `[0.300, 0.270, 0.285]`.
- Root cause: friction was being counted twice. It is already one of the
  fifteen dimensions inside the score; using it again as a tiebreak was an
  attempt to be clever that bought nothing and cost the ordering guarantee.
- Regression: `tests/unit/intelligence-kernel.test.ts` — "the ranking is a real
  order — DEF-0004": highest score first, same order whichever way the moves
  arrive, and an exact draw settled identically every time. Reintroducing the
  window was tried, and the first of those fails with exactly the
  `[0.300, 0.270, 0.285]` above.
- Siblings: checked — `compareRecordOrder` and the fact resolver's `laterOf`
  both compare exact values with explicit tiebreaks and have no window. The
  `WORTH_DOING` threshold is a cutoff rather than a comparison, so it does not
  belong to this class.
- Fixed in: `5447900`

### DEF-0003 — a reason that never said what it was about

- Status: Fixed
- Severity: Major — this is G-001's failure, reaching an owner surface through
  composed prose instead of through a template
- Found in: Phase 2 / pre-`5447900`
- Found by: `tests/synthetic/no-hidden-genericity.test.ts`, on its first run
- Class: **owner-facing text assembled outside the renderer.** DEF-0001 was
  fixed inside `renderRecommendation`, where the templates live and where G-001
  sweeps. The explanation generator composes sentences too, and nothing was
  holding it to the same rule — so the noun could be lost again in a file the
  original regression does not look at.
- Reproduction: any history with a bad outcome recorded against a topic. The
  reason came out as "Yesterday: the /26 boundaries went wrong twice." — good
  English, entirely specific, and it never says the word subnetting. Two
  materially different profiles received it word for word, which is what the
  section 64 check caught.
- Root cause: the reason was built from the outcome's own note and the date it
  happened. Both are particulars; neither is the subject.
- Regression: `tests/synthetic/no-hidden-genericity.test.ts` — "never loses the
  noun", which holds every line the engine can put on screen to the rule that it
  either contains no standalone pronoun or names its subject, and runs over
  every scenario rather than a sample.
- Note on the rule: the move sentence keeps the strict form — names the thing,
  no pronoun at all. A reason may run to two sentences and may say "it" once the
  subject has been named. DEF-0001's note warns against relaxing the check, and
  this is not that: the requirement in section 3 is that the noun is not lost,
  not that a pronoun never appears, and a blanket word ban would have forced
  "The kitchen table is buried again — and the kitchen table costs you the start
  of every evening."
- Siblings: checked — the premise, the limiter summary, the no-action copy and
  the follow-up all pass the same sweep.
- Fixed in: `5447900`

### DEF-0002 — a DST warning outlived the time it was about

- Status: Fixed
- Severity: Minor — wrong information on a QA surface, not on an owner surface
- Found in: Phase 1 / `c655b9c`
- Found by: re-reading the QA screen while the final gate ran
- Class: **state that describes one input, left standing after the input
  changes.** The note belonged to a typed wall-clock time; every other control
  on the panel moved the clock without clearing it.
- Reproduction: open the QA lab, set the timezone to America/New_York, travel to
  2026-03-08 02:30 — a wall-clock time the clocks jump over, correctly reported.
  Then press +1 hour. The screen still said 04:30 does not exist.
- Root cause: `travelTo` set the instant and nothing else. The resolution was
  only ever written by the date input, so it could only ever be cleared there.
- Regression: `tests/browser/qa-lab.spec.ts` — "does not leave a DST warning up
  after moving away from the gap". Reintroducing the defect was tried, and the
  test fails.
- Siblings: checked — loading a scenario also moves the clock, and now goes
  through the same `travelTo`. The timezone selector does not move the clock, so
  a note about the previous zone's gap could in principle survive a zone change;
  the resolution is recomputed on the next travel and the case needs a real
  fixture to be worth a test, so it is noted rather than guessed at.
- Fixed in: the checkpoint that closes Phase 1

### DEF-0001 — recommendation templates reached for a pronoun

- Status: Fixed
- Severity: Major — this is the defect scenario G-001 exists to prevent
- Found in: Phase 1 / pre-`b637ab3`
- Found by: the automated class sweep in `tests/synthetic/g001-no-orphan-pronoun.test.ts`,
  on its first run
- Class: **any sentence template that can render a pronoun where the subject is
  known.** Not "three bad strings" — a catalogue that grows one verb at a time,
  where each new entry is an opportunity to reintroduce the same failure.
- Reproduction: render `review-weak-topic`, `recover`, or the `deficit` reason
  for any subject. Sentences came out as "Go back over subnetting, the part
  **that** keeps slipping", "…leave you better **this** morning", "subnetting is
  the **thing** running short".
- Root cause: the templates were written by hand with no rule applied to them.
  The subject was present in every case, so the defect was invisible to a
  spot-check of one sentence — which is exactly how it would have reached a
  phone.
- Regression: `tests/synthetic/g001-no-orphan-pronoun.test.ts` — "covers every
  verb in the catalogue", "covers every reason the catalogue can give", and
  "also renders cleanly with no duration and no goal". The sweep walks
  `ACTION_VERBS` and `WHY_NOW_TRIGGERS` rather than a list of known-bad cases,
  so a fourteenth verb is checked the moment it exists.
- Siblings: checked and clean — all fourteen verbs, both the with-duration and
  without-duration forms, all eight reasons, and every follow-up question.
- Note on the fix: the copy changed, not the rule. Relaxing the check to allow
  a relative pronoun would have been defensible for each individual sentence and
  would have left a loophole the next template gets written through.
- Fixed in: `b637ab3`
