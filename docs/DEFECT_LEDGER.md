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

### DEF-0019 — a move was praised for having a record, against one with none

- Status: Fixed
- Severity: Major — the app stating a finding it had not made
- Found in: Phase 3 / `b0e23ed`
- Found by: printing the copy the owner would actually read on the new
  scenarios, rather than only asserting on parts of it
- Class: **D-038's rule reaching a dimension instead of a sentence.** An
  absence may not be asserted from ignorance, and `follow-through` was doing
  exactly that: its prior is "anything can be done", so a move managed every
  time sits _at_ the prior — which is the absence of evidence against it, not
  evidence for it. Scoring that at +1 let a move with four completions beat one
  with no history at all, and the explanation then said so out loud.
- Reproduction: load "A month of what actually worked". _Why this one_ read
  **"More likely to actually happen."** — comparing clearing the kitchen, which
  had four completions, against a subnetting recall the app had never once
  watched the owner attempt. It is not more likely to happen. It is the one we
  know about.
- Root cause: `value: scaled((rate - 0.8) * 5)`, which is positive whenever the
  rate is above 0.8 — including when nothing has been learned at all.
- Fix: the dimension only ever speaks against a move, and only when a shortfall
  has actually been observed. `scaled((rate - 1) * 4)`, abstaining at zero
  weight when the rate is at the prior. D-048's rule extended: a dimension with
  nothing to say must cost nothing to have, and sitting at the prior is nothing
  to say.
- Consequence, and it is the point: two demonstrations turned out to have been
  riding on the bogus bonus. "A completed action changes which move wins" needed
  a fortnight of real evidence on both sides rather than three evenings on one,
  and G-014's counterexample needed to name all three things holding that
  evening still rather than one. Both fixtures are more honest for it, and both
  were quietly weaker than they read before.
- Regression: `tests/synthetic/outcome-learning.test.ts` — "costs nothing at all
  when nothing has ever been blocked" already asserted the zero-sample case;
  what was missing was the at-the-prior case, now covered by the same check
  plus G-014's "is not resting on any one of them on its own". Restoring the old
  formula was tried; the winner flips back and the counterexample fails.
- Siblings: checked the other two learned quantities. `effect` is symmetric
  around its prior by construction and cannot reward an absence. `appetite`
  starts at zero and only ever goes negative, so it has the same shape as the
  fix rather than the defect.
- Fixed in: the fourth Phase 3 checkpoint

### DEF-0018 — the second half of a double tap landed on a different button

- Status: Fixed
- Severity: Major — a record of something the owner did not do
- Found in: Phase 3 / `dc58ca7`
- Found by: a browser test that hung at desktop width, and reading why
- Class: **a target that moves out from under a finger that has not lifted.**
  The lifecycle row drew only the transitions available from the current state,
  so tapping **Start it** removed it and slid **Done** into the space it had
  occupied. The second half of a fast double tap then landed on "I have done
  this" — which is a legal transition from `started`, a plausible thing to have
  meant, and indistinguishable downstream from the truth.
- Reproduction: at desktop width, tap **Start it** and tap again immediately.
  The engine's own guards make a duplicate _episode_ impossible, which is why
  every unit test passed: the two taps were never duplicates. They were two
  different events, and the second one was wrong.
- Root cause: the row rendered `ACTION_ORDER.filter(available)`. Every state
  change re-flowed it.
- Fix: every button is always drawn and the unavailable ones are disabled. The
  positions do not move, and starting something twice is not offered because it
  is not a transition. The synchronous latch in `NowScreen` still swallows a
  second tap on the _same_ button before React re-renders; this is the other
  half, for a second tap that would have hit a different one.
- Regression: `tests/browser/now.spec.ts` — "keeps the buttons where they were
  after one is pressed", which measures the position of **Done** inside the row
  before and after, and "creates one episode from a double tap", which
  dispatches both clicks in one task rather than as two Playwright clicks.
- Note on the first attempt: the original test used two `click()` calls in a
  `Promise.all`. That is a slow tap, not a fast one — the second waits for the
  page to settle — and at desktop width it waited forever for a button that had
  just been removed. The test hung rather than failing, which is how the defect
  was found at all.
- Siblings: checked the other tap targets on Now. The guide's answers and the
  outcome's answers both re-render as a set when the question changes, and in
  both cases the panel is replaced rather than re-flowed, so there is no
  half-changed row to mis-hit.
- Fixed in: the third Phase 3 checkpoint

### DEF-0017 — the app called its own history silent

- Status: Fixed
- Severity: Major — the same family as DEF-0012, found the same way
- Found in: Phase 3 / `79d033b`
- Found by: sweeping DEF-0016's siblings across every hour rather than only the
  one that was reported
- Class: **a sentence about the engine's own blindness, written as a finding
  about the owner's life.** `nothing-proposed` had two branches — no history at
  all, and history that does not say how today is going — and no branch for the
  case where the history says exactly how today is going and the catalogue is
  what is empty.
- Reproduction: the nine-hours-down history at 09:00. Now printed the shortfall
  in the line above the decision — "About 9 hours short of rest over the last
  few nights." — and directly underneath it, "There is plenty of history here,
  and none of it says how tonight is going." Both halves came from the same run.
  The screen contradicted itself, which is DEF-0005's shape as well as
  DEF-0012's.
- Root cause: every recovery move belongs to an hour that had not arrived yet,
  so nothing was proposed — and the copy for "nothing was proposed" assumed the
  only reason could be that nothing was known.
- Fix: when the engine can name what is in the way, it may not claim the history
  is silent. A third branch says only the part the limiter line does not — that
  nothing on offer would move it — with wording per limiter kind.
- Regression: `tests/synthetic/recovery-has-somewhere-to-go.test.ts` — "says
  nothing about the history being silent when it can name the limiter", and
  "holds for every scenario and every hour, not only the morning". Removing the
  branch was tried; both fail.
- Siblings: the branch that was right stays right, and is asserted directly —
  "still says the history is thin when the history really is thin".
- Fixed in: the first Phase 3 checkpoint

### DEF-0016 — a strained late afternoon had nowhere to go

- Status: Fixed
- Severity: Major
- Found in: Phase 2 / `be032cc`
- Found by: inspecting what changes at the evening boundary, while diagnosing an
  unrelated wording question
- Class: **a filter with no fallback.** `protect-sleep` and `wind-down` refuse
  every block before 18:00, which is right — telling someone at five to start
  winding down for the night is worse than saying nothing. But when they are the
  only recovery moves available, refusing them leaves the owner with nothing at
  all.
- Reproduction: a history with severe sleep debt and no current learning topic,
  read at 17:45. The sleep generator proposes `protect-sleep`, the filter
  rejects it as `wrong-time-of-day`, and Now says **"Nothing fits tonight."** to
  someone nine hours down. Fifteen minutes later the same history says "Start
  winding down now and let tonight be a recovery night."
- Owner decision: recorded and deferred during the second Phase 2 repair,
  because adding a verb is a change to what the engine can suggest and section
  47's gate was about the moves the owner already saw. Phase 3 is where a new
  move belongs.
- Fix: a fourth recovery verb, `ease-off`, with its own routine in the engine's
  vocabulary — "Start easing off now — the rest of today can be a light one."
  It suits the afternoon and refuses every other block, so it does not compete
  with `protect-sleep` for an evening. The sleep generator picks the verb the
  hour can actually use rather than proposing a certain refusal.
- Regression: `tests/synthetic/recovery-has-somewhere-to-go.test.ts` — "offers
  something at a quarter to six rather than nothing", "never leaves a strained
  afternoon or evening with nothing" (every half hour from noon to midnight),
  and "reports no wrong-time-of-day refusal on the way there". Reverting the
  generator branch was tried; three of the four fail.
- Siblings: swept every generator at every block across the whole scenario
  library. Two turned up — the fatherhood generator offering only `time-with` at
  23:00, and the home generator offering only `reset-space` — and neither is
  this defect: nothing is pressing at eleven at night in those histories, and
  "Nothing fits tonight" is an honest answer to a quiet evening. The class that
  is real is narrower and is asserted directly: when the engine can name what is
  in the way and proposes something because of it, the hour may not remove all
  of it. Finding DEF-0017 is what the sweep was actually worth.
- Fixed in: the first Phase 3 checkpoint

### DEF-0015 — a scenario that misrepresented the owner's own life

- Status: Fixed
- Severity: Major — correct behaviour made to look broken
- Found in: Phase 2 / `be032cc`
- Found by: owner phone test, third pass
- Class: **a fixture that leaves out something the owner actually has.** Section
  60 warns that fixtures must not make hardcoded logic look correct; this is the
  same failure read from the other side. `gone-quiet` was built to represent the
  owner's history after a few days away and contained an Adaya entity, three
  evenings together, and no custody context at all — so `childPresent` resolved
  to unknown and the guide asked whether his daughter was with him. The engine
  had not forgotten a durable arrangement. There was none there to forget.
- Reproduction: load "A month of history, three weeks ago", answer the energy
  question, and the next question is "Is Adaya with you tonight?" — with full
  custody already a settled fact of the owner's real life.
- Root cause: the scenario was written to demonstrate staleness and modelled
  only the things that go stale.
- Fix: the durable custody arrangement and durable presence are in it now, as
  they are in `durable-custody`. The engine is unchanged — G-002's behaviour was
  correct throughout, and `durable-custody` and `week-pointed-at-home` have
  never asked.
- Consequence, and it is the better scenario: everything in that history has
  expired except the one thing that never does, so the app acts on the custody
  arrangement rather than saying it has nothing. That demonstrates the
  distinction the scenario is named for more sharply than "nothing to suggest"
  did.
- Regression: `tests/synthetic/adaptive-guide.test.ts` — "does not ask about
  something a durable arrangement already answers" already covered the rule;
  what was missing was a scenario shaped like the owner. The binary-question
  regression that needed an unknown `childPresent` now builds its own fixture,
  `beforeTheArrangementIsKnown`, which is never shown on a phone.
- Fixed in: the third repair checkpoint after `be032cc`

### DEF-0013 — an empty card under the recommendation

- Status: Fixed
- Severity: Minor — a piece of furniture with nothing in it
- Found in: Phase 2 / `9a742e4`
- Found by: owner phone test, second pass
- Class: **a container rendered unconditionally around conditional contents.**
  All four rows under the decision are optional, and on an evening with no
  limiter and a single candidate every one of them is absent — leaving a
  bordered, padded rectangle with nothing inside it.
- Reproduction: load "A settled arrangement, and one week away" and open Now.
- Root cause: the panel did not ask whether it had anything to show.
- Regression: `tests/browser/now.spec.ts` — "renders no empty card when there
  is nothing to put in one", and "never draws a panel with nothing in it, on
  any scenario", which walks five of them.
- Fixed in: the second repair checkpoint after `9a742e4`

### DEF-0012 — an absence asserted from ignorance

- Status: Fixed
- Severity: Major — same class as DEF-0006, and subtler
- Found in: Phase 2 / `9a742e4`
- Found by: owner phone test, second pass
- Class: **stating that nothing exists when nothing was visible.** "Nothing more
  pressing to spend it on" reads as a finding about the owner's life. It was a
  statement about how little the engine could see: on the evening it was caught
  there was exactly one candidate, and the topic, the house, the daughter and
  the evening were all unknown or months stale.
- Reproduction: any history where the movement generator is the only one that
  fires. The reason ended "…and nothing more pressing to spend it on."
- Root cause: the clause was written into the `good-conditions` branch as
  atmosphere rather than derived from anything. Nothing in the ranking supports
  it — `bottleneck-fit` scoring zero means "no limiter was detected", which is
  not the same claim.
- Fix: the branch now says only what the ranking can support — the reading the
  owner gave, and the part of the day, which is checked against the actual
  `context-fit` dimension rather than assumed.
- Regression: `tests/synthetic/no-hidden-genericity.test.ts` — "claims nothing
  about what it could not see". Reintroducing the clause was tried; it fails.
- Note on the first attempt: the regression initially did **not** bite, because
  the copy sweeps only inspected decisions made before any answer, and this
  branch is only reachable after one. The sweeps now run over every scenario a
  second time with each possible first answer given — which is what the owner
  was doing when they found it.
- Siblings: swept every line the engine can produce, in both passes. "Nothing
  else is pressing" in the `nothing-better` branch is the same claim and is
  covered by the same check.
- Fixed in: the second repair checkpoint after `9a742e4`

### DEF-0011 — a question that never said what it was about

- Status: Fixed
- Severity: Major — the owner could not tell what was being asked
- Found in: Phase 2 / `9a742e4`
- Found by: owner phone test, second pass — by having to ask
- Class: **losing the noun in a question rather than in a recommendation.**
  G-001 sweeps the recommendation catalogue for exactly this failure and
  nothing swept the questions, so "How much have you got left?" shipped: a
  sentence with every content word removed, which could have been about time,
  sleep, patience or money. The registry has always called the concept
  "Current energy".
- Reproduction: load any history with no capacity reading and open Now.
- Root cause: the prompt was written as conversational shorthand, and section
  3's rule was being applied to one kind of owner-facing sentence and not the
  other.
- Regression: `tests/unit/intelligence-kernel.test.ts` — "names what it is
  asking about", which strips the interrogative frame from every prompt in the
  catalogue and fails if nothing is left, plus a direct check on energy.
  Reverting the prompt was tried; both fail.
- Siblings: checked all six. Sleep, time, the child, soreness and company all
  name their subject already; energy was the only one that did not.
- Fixed in: the second repair checkpoint after `9a742e4`

### DEF-0010 — the guide could not tell which answer was the last one

- Status: Fixed
- Severity: Major — a rule that silently removed an arbitrary answer
- Found in: Phase 2 / `9a742e4`
- Found by: tracing why a repaired guide still asked three questions
- Class: **ordering by a field that cannot separate the records in question.**
  Every answer in a session is about the same moment, so `occurredAt` is
  identical across them; `recordedAt` defaulted to it; and canonical order then
  falls through to the record id, which carries no meaning by design. "The
  answer you gave last" was whichever id happened to sort last.
- Reproduction: answer two guide questions in one session. DEF-0008's stopping
  rule replays the decision without the most recent answer — and was removing
  one at random, so a run that should have stopped at two questions ran to
  three.
- Root cause: the envelope has always distinguished when a thing happened from
  when it was written down, and guide answers were collapsing the two.
- Fix: an answer now carries the moment it was written down. Under time travel
  those genuinely differ; within one session they are what tells two answers
  apart.
- Regression: `tests/synthetic/adaptive-guide.test.ts` — "writes each answer
  down at a distinct moment" and "stops after the answer that changed nothing,
  not before it". Collapsing `recordedAt` back was tried; both fail.
- Siblings: checked — `laterOf` in the fact resolver has the same shape and
  already falls through to the record id deliberately, for records that are
  genuinely simultaneous. This is the case where they were not.
- Fixed in: the second repair checkpoint after `9a742e4`

### DEF-0009 — every two-option question was unaskable

- Status: Fixed
- Severity: Blocker — the guide could not ask the question that mattered most
- Found in: Phase 2 / `9a742e4`
- Found by: owner phone test, second pass, and confirmed against the trace
- Class: **a threshold expressed as a count where the quantity is a share.**
  DEF-0008's repair required at least two of a question's answers to lead
  somewhere other than where the engine already stood. One of a binary
  question's two answers is almost always the situation it is already in, so a
  binary question can only ever reach one. "Is she with you tonight?" sat at
  0-of-2 or 1-of-2 in every scenario in the library and was never asked.
- Reproduction: "A month of history, three weeks ago", answer the energy
  question, and Now settles on a solo twenty-five minute walk — while the trace
  shows that answering yes to the child question would have made it an
  afternoon with his daughter.
- Root cause: `overturns >= 2`.
- Fix: `overturns * 2 >= options`. Half of two is one, and the four-option
  questions behave exactly as before — verified across every question in every
  scenario before the change was made.
- Regression: `tests/synthetic/adaptive-guide.test.ts` — "asks about the child
  when the answer would change the move", "turns the walk into time with her
  when the answer is yes", and "still refuses a question only one answer in
  four would move", which holds DEF-0008's ground. Restoring the count rule was
  tried; the first two fail.
- Fixed in: the second repair checkpoint after `9a742e4`

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
