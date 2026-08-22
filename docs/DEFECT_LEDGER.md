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

### DEF-0053 — a status word renamed in one file and ordered in another, and three areas silently left off Life

- Status: Fixed
- Severity: Major — no error, no empty group, three of eleven areas simply absent
- Found in: Phase 6 / this repair, by the browser gate
- Found by: the **builder's own browser suite**, on the rerun after DEF-0051's copy change — and only because a test asserts every one of the eleven areas appears exactly once
- Class: **one decision held in two files, and only one of them updated.** The word a group is called and the order the groups render in are the same decision; they lived in `standingFor` and in a `const ORDER` array respectively.
- Reproduction: rename the `current` group's word without editing `ORDER`. Life renders `ORDER.map(...).filter(...)`, so a group whose word is not listed is dropped — along with every area in it.
- Root cause: the filter is correct behaviour for a fixed layout and dangerous unchecked. An unlisted word does not render wrong; it does not render.
- Fix: `GROUP_ORDER` moved into `src/features/life/standing.ts` beside the words it orders, and `everyStandingWord()` enumerates every word `standingFor` can produce so the pairing can be checked rather than remembered.
- Regression: `tests/unit/life-pages.test.ts` → "gives every word it can produce a place in the order Life renders". Proved by renaming the word and watching it fail.
- Siblings: swept — no other surface filters a rendered list against a separately held vocabulary.
- Note: recorded even though it never reached the owner. The class is the same one that produced DEF-0051 two files away, and the guard is what makes the next rename safe.
- Fixed in: this checkpoint

### DEF-0052 — a conclusion the app reached on its own, with no way for the owner to say it was wrong

- Status: Fixed
- Severity: Blocker — the app can now conclude things about his life, and could not be told it had misread one
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use and semantic audit**, after QA-A1's repair had already been deployed
- Class: **a conclusion with no correction identity.** Every belief card the app already showed carried a `belief` key and a "That is not right" control, because each was a tally of the owner's own opinions. The one card that states a conclusion of the app's own — the class most worth being able to overrule — had `belief: undefined`, with a comment explaining that there was nothing to disagree with.
- Reproduction: build any history where a comparison clears both groups. The observed-relationship card appears, ranks a recommendation through the `observed-change` dimension, and offers no control. The owner's only routes to changing it were to stop recording readings or to delete history.
- Root cause: the correction machinery is keyed on `beliefKey(aspect, verb)`, and the five aspects were all summaries of owner attributions. A learned relationship is not one of those, is scoped to an action rather than a verb, and so had no identity in that namespace at all.
- Fix: a sixth `BeliefAspect`, `association`, whose payload is the **action scope** rather than a verb (`associationBeliefKey`), so rejecting what the app concluded about walking says nothing about cycling. `buildLearning` passes the rejections through to `observedAssociations` as a per-scope watershed. Rejection deletes nothing: readings, episodes and history are untouched, everything before the moment he said so stops counting toward that conclusion, and evidence after it counts normally — so the app can reach the opposite conclusion later from evidence he has not disputed.
- Regression: `tests/synthetic/observed-relationships.test.ts` → "correcting what the app has worked out" — "offers the finding as something to disagree with", "scopes the correction to the action, not to the verb", "stops the disputed run counting, and deletes nothing", "lets the app conclude again from evidence he has not disputed". Proved by reintroduction twice: `belief: undefined` on the card, and a watershed that never filters.
- Siblings: checked. The other five aspects already had correction identities and keep them; `describeBelief` gained an `association` branch, and `Insight.beliefLabel` lets a card name the object where the key can only name the verb.
- Principle: D-091 invariant 5. **Preserve history. Correct future interpretation.**
- Fixed in: this checkpoint

### DEF-0051 — "up to date on what matters", printed above a belief the app had marked out of date

- Status: Fixed
- Severity: Major — the owner cannot trust a freshness claim he can see contradicted on the same screen
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use audit**, reading Life on the deployed Preview
- Class: **one word answering two different questions.** _How recently has anything come in about this area_ and _is what the app believes about this area still good_ are separate facts about separate things. `CoverageStatus` measures the first; Life's word and note asserted the second.
- Reproduction: any domain whose coverage reads `current` while a concept on the same page is past its own freshness window. Life shows **"Fresh — Up to date on what matters."** and the domain page shows **"Career & Learning is current."**, directly above a reading tagged out of date.
- Root cause: `describe()`'s `current` branch and `standingFor`'s `current` branch were both written as claims about the area rather than about the app's intake. `current` means _something came in recently, or a standing concept is held_ — nothing more. QA-M1 had already repaired exactly this sentence for the `quiet` status; the `current` status was the untouched sibling, and `quiet`'s Life note ("Nothing new, and nothing out of date") still carried the old over-claim.
- Fix: the coverage summary says `Something has come in about <area> recently.` and Life says `Recent — Something has come in here lately. Anything out of date says so on its own line.` Neither concept is dropped and neither absorbs the other; the out-of-date row still names itself. `quiet` repaired in the same pass.
- Regression: `tests/unit/life-pages.test.ts` → "the status word Life puts on a group of areas" (no status word may claim currency of belief; `current` must say something came in), and `tests/synthetic/domain-page-data.test.ts` → "never says an area is up to date while a reading on the same page is not". Written as rules about what the copy may not claim rather than as its exact sentences, so an improvement to the wording does not fail them.
- Siblings: `unheard` and the three `stale` variants checked and clean. `standingFor` moved to `src/features/life/standing.ts` so the rule can be tested directly rather than through a rendered screen.
- Principle: D-091's freshness-language rule.
- Fixed in: this checkpoint

### DEF-0050 — Life's "recently" showed a sequence of events in an order in which they did not happen

- Status: Fixed
- Severity: Major
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use audit**, reading a domain page on the deployed Preview
- Class: **history presented as a sequence, ordered on `occurredAt` alone.** A correction is _always_ about the same moment as the thing it corrects, so `occurredAt` can never separate the two, and the tie falls to whatever order the records happen to arrive in.
- Reproduction: record energy 3 of 5 at six o'clock, complete a walk, then correct the six o'clock reading to 2 of 5. Life's "Recently" shows 3/5, then the walk, then the correction — the correction two rows below the reading it replaces and beneath an event that happened after both.
- Root cause: `recentChanges` sorted with `(a, b) => b.occurredAt - a.occurredAt`. Timeline has used `compareRecordOrder` — `occurredAt`, then `recordedAt`, then id — since it was written. The same list of the same records had two different orders depending on which surface asked.
- Fix: `-compareRecordOrder(a, b)`. There is one right order for canonical records and it already existed.
- Regression: `tests/synthetic/domain-page-data.test.ts` → "puts a same-moment correction after the thing it corrects, in 'recently'". The fixture is written newest-first so nothing can pass by accident of insertion order.
- Siblings: swept. Timeline was already correct; no other surface sorts records on `occurredAt` alone.
- Principle: D-091 invariant 7.
- Fixed in: this checkpoint

### DEF-0049 — "nothing else happened in between", from a check of one record kind

- Status: Fixed
- Severity: Blocker — the sentence is a claim about the owner's life made from a partial check, on the card whose whole job is to say what the finding rests on
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use and semantic audit**
- Class: **claiming the check you did not run.** The app can only know what it was told; the defect is not the narrow check, it is describing a narrow check in words that assert a broad one.
- Reproduction: a history with four walks, each followed by a recorded `relationship-event` between the walk and the later energy reading. `confounded` comes back **0**, and the card's reasoning reads "No occasion had to be left out for something else happening in between."
- Root cause: the confounding test was `other completed episodes of a different scope`, and nothing else. Four difficult conversations, a change of circumstances, a constraint coming into force and a decision the owner recorded were all invisible to it — and the copy generalized from "no other suggestion was completed" to "nothing else happened".
- Fix: `CONFOUNDING_KINDS` names the recorded classes that make a before-and-after uninterpretable — `relationship-event`, `context`, `constraint`, `domain-update`, `decision` — checked alongside other-scope completions. The copy now names the classes it looked in, both when it found something and when it did not, so the sentence describes the check rather than the evening.
- Regression: `tests/synthetic/observed-relationships.test.ts` → "what else the record holds about the gap" — "discards a pair with a recorded event in between, not only another move", "treats the confounding classes as a class, not as one special case", "claims only the check it actually ran".
- Siblings: readings are deliberately **not** confounders — an observation falling between two others is the ordinary business of a day. Stated in the registry's own comment so the omission is a decision rather than an oversight.
- Principle: D-091 invariant 4.
- Fixed in: this checkpoint

### DEF-0048 — an evening nobody was asked about, counted as an evening without the move

- Status: Fixed
- Severity: Blocker — the comparison group is the whole reason the first number means anything, and it was being filled with evenings the record says nothing about
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use and semantic audit**
- Class: **missing evidence treated as negative evidence.** G-009's rule — unknown is unknown — applied to exposure rather than to a fact.
- Reproduction: a history with eight completed walks, twelve evenings carrying before-and-after readings and no episode at all, and no occasion where the record says he did not walk. The app stated a relationship over "eight with it, twelve without". Nothing in that history says he did not walk on those twelve evenings; it says nobody asked.
- Root cause: exposure was a boolean. A completed episode of this scope in the gap meant _with_; everything else meant _without_.
- Fix: three states. **present** — a completed episode of this exact action settled in the gap. **absent** — the move was put in front of him and he declined it or could not, so the record positively says so. **unknown** — anything else, which belongs to no comparison group, is counted in `unknownExposure`, and is reported on the card and in the withheld message. Where no legitimate comparison group exists the app abstains and says why. The `observed-evenings` scenario was rebuilt so its fourteen evenings without a walk carry declined episodes, and it gained three evenings nobody asked about, which exist to be left out.
- Regression: `tests/synthetic/observed-relationships.test.ts` → "evenings the record cannot place" — four tests, including the abstention and the card's own sentence — plus a library-wide sweep, "never treats an evening the record cannot place as one without the move", that walks every scenario.
- Siblings: checked. `unable-now` counts as absent alongside `declined`; a missing reading on either side was already excluded and still is.
- Principle: D-091 invariant 2. **Missing evidence is not negative evidence.**
- Fixed in: this checkpoint

### DEF-0047 — a relationship that held on weekdays and on no weekend, printed as "no different" and used to rank a Tuesday

- Status: Fixed
- Severity: Blocker
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use and semantic audit**, with a focused adversarial history
- Class: **a claim scoped wider than the contexts its evidence covers.** The plan already required a discovered pattern to stay scoped to the contexts the evidence supports; the new learned quantity was built outside that rule.
- Reproduction: four weekday evenings where a walk was followed by higher energy and four where it was declined and energy fell; four weekend evenings the other way round. The app reports four of eight against four of eight — "no different" — a figure describing an evening that never happened, and that figure reaches the ranking on a Tuesday.
- Root cause: the comparison was computed once, over the whole record. Every other learned quantity in the system is context-aware; this one had no notion of context at all.
- Fix: every change pair carries the coarse context of its own moment, and the relationship is computed per band as well as across the record. Bands are the two features derivable from an instant alone — weekend/weekday and evening/earlier — deliberately, because an occasion where nothing was decided has no assembled context, and banding on the richer features would mean inventing context for exactly the occasions the comparison depends on. Where two supported bands materially disagree, `applicableAssociation` returns the band the moment falls in or nothing at all, and the card states both bands and does not print the whole-record figure — not softened, not with a caveat beside it. A reader given a number and a caveat remembers the number.
- Regression: `tests/synthetic/observed-relationships.test.ts` → "a relationship that depends on the kind of evening" — five tests, including one that runs the whole engine at a Tuesday and asserts the ranking used the weekday comparison, and one that holds the other half of the rule: where nothing disagrees the whole record is the honest scope.
- Siblings: the previous round's test "reads the whole record rather than only evenings like tonight" **approved** this behaviour explicitly. It was revisited, not deleted: it is now "reads the whole record where nothing disagrees, and says so".
- Principle: D-091 invariant 3.
- Fixed in: this checkpoint

### DEF-0046 — four walks and four bike rides pooled under one verb, and printed as a finding about a walk

- Status: Fixed
- Severity: Blocker
- Found in: Phase 6 / `5f93465`
- Found by: **independent Codex cold-use and semantic audit**, with a focused adversarial history
- Class: **identity.** A verb is not an action. The system had a perfectly good notion of a semantic action — `targetKey` is verb _and_ object, and episodes have used it since Phase 3 — and the new learned quantity keyed on the verb alone.
- Reproduction: four walks after which energy was higher, four bike rides after which it was lower. The app pools all eight, cancels them to "no different", and prints the result under whichever object it happened to meet first — "Current energy moves about the same whether or not **a walk** happens."
- Root cause: `associationFor(verb)` and a learning index keyed by verb.
- Fix: scoped to `actionScopeOf(target)` — the target key, or an explicitly declared family. `ACTION_FAMILIES` is the only route back to aggregation and starts **empty**: pooling two of the owner's subjects is a claim that they are the same thing for the purposes of a learned relationship, so it is a written decision with a reason attached rather than a default.
- Regression: `tests/synthetic/observed-relationships.test.ts` → "the action a relationship is about" — five tests. `tests/unit/architecture-guards.test.ts` → "an interchangeable-action family is a written decision" — three tests, proved to bite by adding a reasonless family, a family of one, a malformed member and an action pooled twice.
- Siblings: **found during the repair, same class, one layer out.** With the arithmetic scoped correctly, the card's _name_ still fell back to the verb's phrase when the object's label did not resolve — so two findings with different numbers would both have printed as "after getting some movement in", with nothing on screen to say which was which. A finding the app cannot name is now a finding it may not state: no card, and a gathering line where nothing is claimed. Regression: "never borrows the verb's phrase for an action it cannot name". The learning index, the ranking, the evidence panel, the gathering lines and the card ids were all swept for verb-keying at the same time.
- Principle: D-091 invariant 1.
- Fixed in: this checkpoint

### DEF-0045 — the app asked the owner to do the causal analysis it exists to do, and printed his answers as measurements

- Status: Fixed
- Severity: Blocker — the phase's stated purpose is making learning visible, and what it made visible was mislabelled at the root
- Found in: Phase 6 / `a6a9e67`
- Found by: **the owner**, from one sentence on Now, after independent QA had already passed the phase — then independently investigated and confirmed by QA as **QA-A1**, which withdrew the PASS
- Class: **DEF-0020's, one level up.** DEF-0020 was four different facts sharing one carrier. This is one fact — _who performed the causal inference_ — absent from the model entirely, so an owner opinion and a system finding occupied the same slot and printed in the same sentence.
- Reproduction: any history with a completed `move` episode. Now asks **"How much did a walk do for you?"** and offers _A real difference / Some difference / Not much / Backfired_. Load "Nine months of evenings" and open any Insights card: **"How often clearing the kitchen made a difference afterwards — 67% — 8 of 12."** The label asserts an observed fact about the world; the eight are a count of the occasions the owner _said_ it made a difference. On that history, all forty-six figures Insights printed were tallies of his judgments and none was worked out from a reading.
- Root cause: four independent lines, and no one of them is the defect on its own.
  - The question exists for **nine of the fifteen action verbs** — every one whose profile lists `effect` — and asks for the move's contribution against an unstated counterfactual, then grades it.
  - `effectFor` in `learning.ts` has exactly one source: `gather` selects records on `aspect === 'effect'` and nothing else, by an explicit design note reading _"it asks nothing about where the record came from"_. That note was written to avoid a second outcome path (D-064's requirement 4) and its consequence is that the belief cannot tell a fact the system observed from an opinion the owner supplied. Provenance survives on the record and reaches the QA trace; it does not survive into the quantity.
  - The observe-first path that does exist, `derived.ts`, is gated to three verbs and one concept — and is itself an attribution, mapping an absolute sleep reading onto the effect scale against a fixed baseline with no comparison to nights without the move.
  - `MoveProfile.measures` already said the walk speaks to `energy`, and nothing read it for collection. The declaration was there and dead.
- **The specification did not ask otherwise, and that is why this is a plan amendment before it is a repair.** Section 20 said the app learns from "observed outcomes" without saying who judges them. Section 51 required a percentage to name the quantity it measures, and did not require it to name who inferred it — which is precisely why QA's first pass checked every gate item correctly and passed a screen that was not honest.
- Fix, against QA's acceptance criteria A–I:
  - **the governing documents first (A).** D-089 records the principle — observe first, infer cautiously, ask for a concrete fact, ask for current subjective state when that state matters, never ask the owner for the causal relationship the system exists to learn. Plan sections 20 and 51 state it directly; D-054, D-064, D-066 and D-069 are annotated as revisited, generalized or incomplete rather than overturned.
  - **`MoveProfile.affects`** names the observable state dimension a move is expected to move, distinct from `measures`. Set on five verbs where it is defensible and deliberately absent on the rest — a learning topic is an entity, home friction is free text, and nothing in the registry honestly says what unhurried time with a daughter moves. Inventing those would be section 4.5's mistake and a relationship nobody can observe.
  - **the grading question is taken off every verb declaring `affects`**, in one place keyed on the profile, and the app asks for the reading instead. The count of things asked does not move; what changed is which one, and who does the thinking (D-069 generalized).
  - **`association.ts`** compares two readings of a concept close enough together to be about the same stretch of day, sorted by what happened between them: this move alone, nothing at all, or something else — the third discarded and counted as discarded. Both groups come from one rule over one history, which is what makes the comparison a comparison. Nothing is stated unless each side clears four pairs on its own.
  - **`observed-change`**, a ranking dimension, so the finding reaches the decision and not only the screen. It abstains at zero weight where there is nothing to say (D-048), which is why no golden scenario moved.
  - **`ConceptDefinition.tracked`** separates "worth reporting over time" from `standing`. The trajectory card gated on `standing`, which is false for every dimension the owner reports about himself by design (D-061) — so energy, soreness, mood, social energy and sleep quality were collected, spent on similarity matching, and never once read as evidence.
  - **every attribution-derived figure now says whose judgment it is.** "How often **you said** clearing the kitchen made a difference afterwards." Follow-through is the deliberate exception and is asserted as one: whether a move could be done is read from what he did.
  - **history keeps its meaning (G).** Every existing `aspect: 'effect'` record is still an owner attribution, still counted by `effectFor`, not relabelled and not deleted. The observed quantity is additive; `association.ts` writes no record at all.
- Regression: `tests/synthetic/observed-relationships.test.ts` — twenty tests covering the twelve behaviours QA required, including **the one whose absence allowed this**: "learns a real relationship on a history with no causal answer in it", built on a new scenario containing not one `effect` outcome. Plus four guards in `tests/unit/architecture-guards.test.ts` (the grading question is removed by profile, one module may state a relationship, no causal wording on any surface, the two kinds stay in different types), and three sweeps in `insights.test.ts`. **Twelve defects reintroduced one at a time; twelve caught** — four of them only after the first pass showed the guard did not bite.
- Siblings: `tests/synthetic/inferred-evidence.test.ts` asserts `deriveOutcomes` fires for exactly three verbs, which QA correctly identified as pinning the limitation in place. It is kept, with the reasoning written into the file: extending that mechanism would have produced _more_ attributions wearing the app's name, and the repair was to stop needing them.
- Deliberately not done: splitting `emotionalState` into named dimensions. QA is right that one generic "Current emotional state" is closer to a wellness score than to separate dimensions — but which dimensions is the owner's to say, and inventing a taxonomy is the mistake this whole entry is about. It is now `tracked`, so it participates; the split is an open question for the owner.
- Fixed in: the Phase 6 QA-A1 repair checkpoint

### DEF-0044 — a fixed heading over a list that was never counted toward anything

- Status: Fixed
- Severity: Minor — a heading describing a list as something it is not
- Found in: Phase 6 / `df06a12`
- Found by: the builder's own Android-style gate, against the deployed Preview
- Class: **DEF-0038's, on the block underneath it.** One shared panel wording something in a way that is right for one card and wrong for another.
- Reproduction: deployed Preview at 360×780, "Everything current except the studying" → Insights → **See the evidence** on the coverage card: **EVERYTHING COUNTED / Current learning topic — last heard 7 weeks ago.** Nothing was counted; the list is what is overdue. The trajectory card had the same heading over a list of readings.
- Root cause: the heading was a literal in the surface, which cannot know what any given card's list is.
- Fix: `PatternEvidence.includedTitle`, set by the card that built the evidence — "What is overdue here" for coverage, "Every reading" for a trajectory — and absent everywhere the list genuinely is everything counted.
- Regression: none dedicated. `tests/synthetic/insights.test.ts` already sweeps every card's owner-facing strings, and the heading is now a value on the evidence rather than a literal in one component, so the failure mode it had is gone rather than guarded against. Recorded here so the omission is a decision rather than an oversight.
- Fixed in: the Phase 6 repair checkpoint

### DEF-0043 — the parser talking to the owner, in two numbering schemes at once

- Status: Fixed
- Severity: Major — developer diagnostics on a primary surface, and a row reference that points at the wrong list
- Found in: Phase 6 / `df06a12`
- Found by: the builder's own Android-style gate, against the deployed Preview
- Class: **DEF-0007's** — development output reaching the product — compounded by two indexes with the same name.
- Reproduction: deployed Preview at 360×780, "A file with damage in it" → Timeline, scroll to the bottom:

  ```
  Row 6      expected an object (records[5])
  Row 7      missing a non-empty string (records[6].id), and 8 other problems
  Row 8 (GE000000000000000000000001)
             expected an ISO-8601 instant, got string (records[7].occurredAt)
  Row 1 (person:ghost)
             missing a non-empty string (entities[0].label), and 3 other problems
  ```

- Root cause: two of them. The validator's `ValidationIssue.problem` and `.path` were rendered verbatim, which is correct for the QA inspector — where they already appear, in full, with every issue listed — and is exactly what section 36 puts _behind_ inspection: "errors should be visible but concise; detailed technical diagnostics belong behind inspection". And records and entities are parsed from two arrays, each row's `index` relative to its own, so "Row 1" and "Row 6" appeared in one list with nothing saying they were counted from different places.
- Fix: `UnreadableRow` carries `where` and a plain `problem`. `where` reads "Record row 6" or "Entity row 1", decided from the issue's own path, which is the only thing that knows. `problem` reads "could not be read", with a count when there is more than one thing wrong. No paths, no validator vocabulary, and no record identifiers — the supersession issues lost theirs too, since the identifier was unactionable on a surface with nothing to act with.
- Regression: `tests/synthetic/timeline.test.ts` — "says which list a bad row came from, and reports both", and "reports the damage without the parser talking to the owner", which sweeps both kinds of damaged row for validator paths, schema vocabulary and record ids.
- Fixed in: the Phase 6 repair checkpoint

### DEF-0042 — a temporary exception tagged as a standing arrangement

- Status: Fixed
- Severity: Major — a row contradicting itself between its label and its sentence
- Found in: Phase 6 / `df06a12`
- Found by: the builder's own Android-style gate, against the deployed Preview
- Class: **DEF-0033's, at the smallest possible scale** — two parts of one line, each true of something, saying opposite things about the same record.
- Reproduction: deployed Preview at 360×780, "A settled arrangement, and one week away" → Timeline. Yesterday, 11:00: **Standing — Child with the owner: no — for now.**
- Root cause: `describe.ts` tagged every `context` record "Standing", which is the right word for a durable one and the wrong word for the situational exception that exists precisely to override it for a window (section 8, G-002, D-081). The sentence had the durability right; the tag did not read it.
- Fix: the tag follows `durability` — "Standing" or "Temporary". The sentence keeps its own "— for now", because it has to read correctly on a domain page, which shows no tag at all (D-088).
- Regression: `tests/synthetic/timeline.test.ts` — "does not call a temporary exception a standing arrangement", which requires both kinds to exist in the library and asserts that neither carries the other's wording.
- Fixed in: the Phase 6 repair checkpoint

### DEF-0041 — a regression sweep that could not fail

- Status: Fixed
- Severity: Major — the guard written for DEF-0037 passed with DEF-0037 still in place
- Found in: Phase 6 / pre-checkpoint
- Found by: **the reintroduction pass required by plan section 42, step 4** — not by anything the suite reported
- Class: **a guard that cannot fail.** `tests/unit/architecture-guards.test.ts` has said since Phase 1 that "a guard that cannot fail is decoration" and proves each of its own scans bites on a violation. A sweep written elsewhere carries no such proof, so the only thing standing between it and decoration is the reintroduction step.
- Reproduction: put the raw day id back into `PatternEvidence.counted` (DEF-0037's defect) and run `tests/synthetic/insights.test.ts`. All twenty-nine tests pass.
- Root cause: the regex literal had been written through a shell heredoc and arrived in the file with its two `\b` word boundaries replaced by **literal backspace characters** (U+0008). The pattern therefore required a backspace either side of the date and could never match anything. It read correctly in an editor, it exercised the right strings, and it passed.
- **ESLint would have caught it, and the sequencing is why it did not.** `no-control-regex` is on and flags exactly this shape. It was never given the chance: the corruption was written, found by the reintroduction pass, and repaired, all before the next full `npm run verify`. The rule proved itself a few hours later by catching the identical mistake in `tests/synthetic/timeline.test.ts` the moment lint ran over it. So the lesson is narrower than "a guard cannot be trusted": **the reintroduction step and the lint gate cover the same failure, and running lint before believing a new guard is the cheaper half.** The one shape lint cannot see is the same corruption inside a `String.raw` template, which is not a regex literal — both occurrences are now plain literals.
- Fix: the pattern rewritten so it survives being written, verified by reintroducing DEF-0037 and watching the test fail. A sweep over the whole repository for stray control characters was run twice — once at discovery and once at the close of the phase — and found one other occurrence, in `src/domain/ids.ts`: `parts.join('\x00')`, a deliberate hash separator from Phase 1, and correct.
- Regression: the reintroduction pass itself, run for every guard this phase added — nineteen defects reintroduced one at a time, nineteen caught — plus `npm run lint`, which is already in `npm run verify` and in CI.
- Fixed in: the Phase 6 checkpoint

### DEF-0040 — inspector language on Now's evidence panel

- Status: Fixed
- Severity: Major — internal vocabulary on a primary owner surface
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, reading the assembled panel rather than asserting on it
- Class: **DEF-0007's** — development vocabulary reaching the product, on a field that was written for the QA inspector and then read by something else.
- Reproduction: load any history where the chosen move leans on a concept nothing has answered, open **See evidence** on Now: "Usable time tonight: not known — never-observed".
- Root cause: `ConsideredFact.reading` spells an absence as `not known — ${knowledge.reason}`, where `reason` is a `KnowledgeGap` identifier. That is correct for the trace, which is where it was written to be read (section 35). The evidence panel reused the field verbatim.
- Fix: `ConditionLine` carries `known`, and an unknown reading renders as "Not known yet". The condition is still listed — a fact the choice leaned on and does not know is part of why the app is hedging, and dropping it would hide that.
- Regression: `tests/synthetic/decision-evidence.test.ts` — "speaks in ordinary language, with no machinery and no lost nouns", which sweeps every scenario for inspector vocabulary and asserts the wording of every unknown condition. Proved to fail when the field is read verbatim again.
- Fixed in: the Phase 6 checkpoint

### DEF-0039 — the app's conclusion and its own tally contradicted each other on one screen

- Status: Fixed
- Severity: Blocker — two figures about the same move, on one screen, reading as opposites
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, reading the whole of Now with the evidence open
- Class: **DEF-0033's, and DEF-0022's before it** — two lines of one screen, each individually true, that a reader has no way to reconcile.
- Reproduction: load "Nine months of evenings", open **See evidence** on Now. Directly above the panel: _"Reset a space has made little difference in situations like tonight."_ Inside it: _"How often clearing the kitchen made a difference afterwards — 67% — 8 of 12."_
- Root cause: not an error in either. The line on Now is `learning.ts`'s belief — a weighted mean of the effect answers, where similarity to tonight decides the weight, and tonight is a weekend. The figure in the panel is the plain proportion of comparable evenings that made any difference, unweighted. They measure different things and the screen said nothing about that.
- Fix: three parts, none of which suppresses either number. The panel now carries the same sentence Now shows, under "What the app took from them", with one line saying it leans hardest on the evenings most like tonight and can therefore be more cautious than the plain count. And the split line names which side tonight falls on — "6 of 6 on a weekday, 2 of 6 at the weekend. Tonight is at the weekend." — which is what the difference between the two numbers actually is.
- Regression: `tests/synthetic/decision-evidence.test.ts` — "states the belief in the words Now already used, never a second version" (the panel's `concluded` must be `explanation.restsOn` on every scenario) and "says where it goes better, and says which set that figure is over". Both proved to fail when reintroduced.
- Fixed in: the Phase 6 checkpoint

### DEF-0038 — a count labelled in units its own card does not count

- Status: Fixed
- Severity: Major — a number described as something it is not, on the surface whose job is to be honest about numbers
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, opening the deeper view on each kind of card in turn
- Class: **DEF-0033's** — one shared panel wording a value in a way that is right for one card and wrong for another.
- Reproduction: load "Nine months of evenings", open **See the evidence** on the "Over time" card: "12 comparable occasions, between 8 January and 12 November." The twelve are nightly sleep readings. Nothing was compared to anything. The same sentence appeared on the life-season card, where the count was of entries predating a standing arrangement.
- Root cause: the surface composed the sentence from `PatternEvidence.comparable`, a number it could render but could not know the units of.
- Fix: `PatternEvidence.counted` is a sentence, written by whichever card built the evidence, in the units that card counts — and absent on the three kinds whose own detail line already says it, rather than repeated one tap lower.
- Regression: `tests/synthetic/insights.test.ts` — "says what a count is of, in the units that card actually counts", which requires the sentence on every belief-bearing card and forbids it on every reading-style one. Proved to fail when a trajectory is given a count of "comparable occasions".
- Fixed in: the Phase 6 checkpoint

### DEF-0037 — a machine identifier where a person expects a date

- Status: Fixed
- Severity: Major — an identifier on the surface section 27 asks to be readable without research language
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, reading the deeper view
- Class: **DEF-0029's** — a value rendered without the thing that makes it legible, on a surface where nothing else supplies it.
- Reproduction: open any Insight's evidence: "12 comparable occasions, between 2026-01-08 and 2026-11-12."
- Root cause: `PatternEvidence.window` holds `LocalDayId`s, which are identifiers by design (section 15 — a day id is derived and never an instant), and the sentence interpolated them directly.
- Fix: `describeDay` everywhere a day reaches owner-facing text — "8 January" — with the window kept as ids in the data for anything that needs to compare them.
- Regression: `tests/synthetic/insights.test.ts` — "puts no machine identifier where a person expects a date", swept over every owner-facing string an insight can produce, so a new card composing a sentence from a `dayId` fails there rather than on whichever history reaches it. See DEF-0041 for what the first version of this sweep turned out to be.
- Fixed in: the Phase 6 checkpoint

### DEF-0036 — a day heading came to rest behind the app bar

- Status: Fixed
- Severity: Major — sticky chrome covering content, which section 37 rules out by name
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, **measuring rather than looking** — a scripted geometry pass over the rendered surface at 375px
- Class: two sticky elements in one scroll container, neither aware of the other.
- Reproduction: Timeline on a long history at 375×812, scrolled to 1200px. A `.tl-day__label` sits at 8–38px; `.topbar` occupies 0–53px. The date rests underneath translucent chrome.
- Root cause: `.tl-day__label` was `position: sticky; top: 0; z-index: 1`. The app bar is `position: sticky; top: 0; z-index: 20` in the same scroll container, so "top" for the heading is behind the bar.
- Fix: the sticky positioning removed rather than corrected. Keeping it would have meant reproducing the bar's own safe-area arithmetic in a second file and keeping the two in step forever; day headings recur every few entries, so one that scrolls away costs nothing.
- Regression: `tests/browser/timeline-insights.spec.ts` — "pins nothing of its own under the app bar", which asserts that no element inside Timeline computes to `position: sticky` or `fixed`. **The first version of this test was wrong and is worth recording:** it asserted that no heading ever intersects the bar, which cannot hold and should not — ordinary content scrolls under a sticky translucent bar by design — and it passed at 360px only because the scroll position happened to be kind, failing at 430px. What distinguishes the defect from normal scrolling is whether Timeline pins anything at all.
- Fixed in: the Phase 6 checkpoint

### DEF-0035 — the order within a day came from an arbitrary tiebreak

- Status: Fixed
- Severity: Major — the chronological surface reading as though it were not chronological
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, reading a whole page of Timeline on a long history
- Class: a sort that ignores half of the canonical order and lets an identifier decide the rest.
- Reproduction: Timeline on "Nine months of evenings". On 4 November the day reads "Done" then "Suggested"; on 19 September the same pair reads "Suggested" then "Done". Same fixture, same shape of episode.
- Root cause: every event in one session shares an `occurredAt` — that is what `occurredAt` means (the moment being reasoned about, D-037) — so the whole order within a day fell to the tiebreak, which was the record id and carries no meaning.
- Fix: `-compareRecordOrder(a, b)`, the canonical order reversed. `compareRecordOrder` is when it happened, then when it was written down, then the id; reversing it puts what was written last at the top, which is what a reverse-chronological list means.
- Regression: `tests/synthetic/timeline.test.ts` — "reads a day in one consistent order rather than an arbitrary one", asserted across every scenario in the library rather than on the two dates that showed it.
- Fixed in: the Phase 6 checkpoint

### DEF-0034 — the record described the schema rather than what happened

- Status: Fixed
- Severity: Major — generic language section 4.6 asks the app not to settle for, over most of a surface
- Found in: Phase 6 / pre-checkpoint
- Found by: the builder, reading a whole page of Timeline
- Class: **DEF-0028's, arriving at the scale that makes it a wall.** The repair for DEF-0028 appended the resolved subject to a generic sentence — "Followed through on a suggestion here — the kitchen." — which was tolerable on a domain page where a handful sit under a heading that already supplies the area.
- Reproduction: Timeline on "Nine months of evenings". Four lines a day, most of the screen: "Followed through on a suggestion here — a walk." / "Said what a suggestion here was worth — a walk." / "Said how far a suggestion here got — your sister." The subject was resolved and the sentence was still about the app's own record shape. Worse, an outcome row said nothing about the answer: "Said what a suggestion here was worth" over an evening the owner had marked as having backfired.
- Root cause: the sentence was written for a panel with a heading above it and reused on a surface with none, and the outcome's `observation` — the thing the owner actually said — was never read.
- Fix: the line names the move and states the answer, and both halves are read rather than composed. The move's name comes from the same table Insights uses (`patternNameFor`); the answer comes from the same table the button was rendered from (`outcomeAnswerLabel`, new in `outcomes.ts`) — DEF-0020's own sibling rule that "the words on the button and the words in the trace have to mean the same thing". Which of the three questions an outcome answers is carried by the sentence rather than by a tag, because a domain page shows no tag. Where the reference cannot be resolved the generic sentence stands, unchanged (D-018).
- Regression: `tests/synthetic/timeline.test.ts` — "says what became of a suggestion by naming the suggestion" (no line about an episode may say "a suggestion here" while the reference resolves), "tells a result, an effect and a comfort apart in the sentence itself", and "says what the owner answered, in the words the button used". Phase 5's own DEF-0028 regression was rewritten to assert the rule rather than the sentences the first repair happened to produce — it would otherwise have failed for an improvement, which is the failure mode DEF-0020's repair records.
- Fixed in: the Phase 6 checkpoint

### DEF-0033 — a domain's calm word and a concept's own tag answered different questions

- Status: Fixed
- Severity: Major — undercuts section 50's "whether it is fresh" promise on the default state of two of ten pages
- Found in: Phase 5 independent QA (QA-M1) / checkpoint `34e03b6`
- Found by: independent QA, reading a whole domain page as a person rather than asserting on parts of it
- Class: a contradiction between two lines of the same screen — the same class DEF-0022 and DEF-0017 belong to, on a new pair of sentences.
- Reproduction: on the default seed data, `#/life/health-recovery`: "Sleep & Recovery has been quiet, and nothing here has gone out of date." two lines above "Hours slept last night — 7 hours — out of date." `#/life/home` showed the identical shape.
- Root cause: `coverage.ts`'s `describe()` for the `quiet` status made an absolute claim about every reading in the domain. `quiet` only means no standing concept has crossed its own neglect threshold and the domain is not `goneQuiet` (D-061); neglect is three times a concept's own freshness window, floored at a week, so a concept can be individually `stale` in the fact layer for up to two of those windows before the domain-level sentence would ever say so. Both sentences were individually true; the copy asserted one and showed its negation underneath.
- Fix: reworded to the claim that is actually true — `"${label} has been quiet, without anything here needing your attention."` The concept row's own "out of date" tag is untouched.
- Regression: `tests/synthetic/domain-page-data.test.ts` — "never claims a domain has nothing out of date while a reading on the same page is tagged out of date — QA-M1", built on a homeFriction reading 10 days old (past its own 7-day window, short of its 21-day neglect threshold). Reverting the wording was tried; it fails.
- Fixed in: the Phase 5 repair checkpoint

### DEF-0032 — two of six correction kinds wrote a record and then visibly did nothing

- Status: Fixed
- Severity: Blocker — fails the phase's own stated acceptance gate ("a correction demonstrably changes later reasoning") for 2 of 6 kinds on 7 of 10 pages
- Found in: Phase 5 independent QA (QA-B2) / checkpoint `34e03b6`
- Found by: independent QA, on the deployed Preview
- Class: an offered action whose own copy implies it can do something it structurally cannot.
- Reproduction: load "A month of history, three weeks ago", open `#/life/home`. "How this stands" reads the 3-week-stale sentence with both correction buttons showing. Tapping either — "I've been keeping on top of this" or "Something's changed" — writes a real row to "Recently," and "How this stands" is unchanged, buttons still offered, immediately under the sentence the owner just tried to answer.
- Root cause: `coverageInterpretationRecord` and `domainStatusCorrectionRecord` write non-concept-bearing records (`coverage-update` / `domain-update`), correctly folded by `evidenceByDomain` into heard-from evidence. `ConceptCoverage.neglected` is computed per standing concept from that concept's own `knowledge.observedAt`, which neither record carries a reference to — so on any domain whose staleness comes from a neglected standing concept (seven of the ten pages: Sleep, Career, Money, Home, Private, Direction, Faith — not Social or Emotional, which have no standing concept, and not Fatherhood, whose only standing concept is durable and per D-061 can never be neglected), the buttons cannot move the sentence they sit under. This was the fact layer correctly refusing to invent a value nobody reported, not a bug in `coverage.ts`.
- Fix: not a change to the coverage computation, which was already honest. `CoveragePanel` now reads `coverage.weakest` (already computed, non-undefined exactly when a specific standing concept is the cause) and, when set, shows which concept is actually overdue and points at that concept's own "Not right?" control instead of offering the two generic buttons. When `weakest` is undefined (the `goneQuiet`-only case), the original two buttons are unchanged.
- Regression: `tests/synthetic/domain-corrections.test.ts` — two new siblings to the existing Social/Emotional cases proving Home specifically does not manufacture freshness, plus a sweep across every domain with a neglectable standing concept (Sleep, Career, Money, Home, Private, Direction, Faith). `tests/browser/life-domain.spec.ts` — "QA-B2 — points at the overdue reading instead of offering a button that cannot settle it," proving the UI consequence on Career.
- Siblings: the existing Social/Emotional tests in `domain-corrections.test.ts` are exactly the false-confidence gap QA-B2 named — both fixtures were built on the only two domains where this defect is structurally unreachable. Kept, and now captioned as such.
- Fixed in: the Phase 5 repair checkpoint

### DEF-0031 — the app's own build screen denied that Phase 5 exists

- Status: Fixed
- Severity: Blocker — a false, owner-visible claim about the phase's own core deliverable, on a screen one tap from every other screen
- Found in: Phase 5 independent QA (QA-B1) / checkpoint `34e03b6`
- Found by: independent QA
- Class: stale scaffolding copy reaching a primary owner surface — the same class D-074's copy guard exists to catch, on a claim phrased as "still ahead of us" rather than "missing," which the guard's fixed pattern list did not cover.
- Reproduction: `#/more` → "Where the rebuild is": "Phase: 4 — the coverage engine and adaptive guides / Next: the Life domain experience," followed by "...the domain pages behind Life are next" — on the exact checkpoint that shipped them, reachable and exercised throughout the same QA pass. The QA laboratory's own header eyebrow separately read "Phase 4."
- Root cause: `REBUILD_PHASE.number`/`.title` were the only fields anything read from `buildInfo.ts`. The sentence describing what the build currently does and what is next was separate hand-written prose in `MoreScreen.tsx`, so bumping the number left that sentence's own claim stale.
- Fix: `REBUILD_PHASE` gains a `summary` field; `MoreScreen.tsx` renders it instead of carrying its own copy of the claim. `DEFERRAL_CLAIMS` (the D-074 guard) gains `/\b(?:is|are) next\b/i`, and the guard's prose sweep now also covers `REBUILD_PHASE.summary` directly rather than only the FEATURES files' literal source — the claim used to live as data specifically to have one source, so the guard has to follow it there. A new capability entry, "provides domain pages behind Life," denies the claim absolutely (no acknowledgment can excuse it, unlike Timeline/Insights which genuinely are Phase 6).
- Regression: `tests/unit/architecture-guards.test.ts` — "the current phase is stated once, and matches what has actually shipped" (direct), plus the strengthened `DEFERRAL_CLAIMS`/capability sweeps. `REBUILD_PHASE.number` reverted to 4, and the old sentence pasted back into `MoreScreen.tsx`, were both tried; both fail on the repaired guard.
- Fixed in: the Phase 5 repair checkpoint

### DEF-0030 — a domain page asked the owner to confirm an area it never doubted

- Status: Fixed
- Severity: Minor — an unnecessary correction control, not a wrong reading
- Found in: Phase 5 / `727ad7b`
- Found by: the builder's own Android-style gate, against the deployed Preview
- Class: **a control offered on a wider condition than the sentence above it
  actually claims.** `CoveragePanel`'s correction buttons — "I've been keeping
  on top of this" and "Something's changed" — appeared whenever
  `coverage.status` was `stale` or `quiet`. Life's own grouping (D-075) already
  treats `quiet` as calm and unflagged: "Nothing new, and nothing out of
  date," `attention: false`. Offering a correction there asks the owner to
  confirm something the app was not asking about.
- Reproduction: load a scenario with a domain heard from eight to twenty-seven
  days ago and nothing currently held, open that domain's page — the
  correction buttons appear under a summary that says nothing is overdue.
- Root cause: `canCorrect` was written against "the app has anything to say
  about staleness" rather than against "the app is actually asking for
  something," and `quiet` satisfies the first without meaning the second.
- Fix: `canCorrect = coverage.status === 'stale'` — the same condition Life's
  own grouping uses to decide whether an area gets `attention: true`.
- Regression: none dedicated; the existing `tests/browser/life-domain.spec.ts`
  suite exercises `stale` areas throughout, and a `quiet`-area regression was
  judged not worth a fixture of its own for a control that is now simply
  absent rather than behaving differently.
- Fixed in: `34e03b6`

### DEF-0029 — a fact's own concept went unnamed in "Recently"

- Status: Fixed
- Severity: Major — an owner-facing line that does not say what it is about
- Found in: Phase 5 / `727ad7b`
- Found by: the builder's own Android-style gate, against the deployed Preview
- Class: **the same class DEF-0028 belongs to, on the other kind of record.**
  `describeChange` rendered an observation, explicit-fact or context record as
  its bare value — `describeFactValue(record.value)` — with nothing saying
  which concept it was a reading of.
- Reproduction: load "A week pointed at the house" and open the Direction
  page: "Recently" read **"60 min"**, alone, with no indication it was a
  reading of usable time tonight rather than of the week's direction itself.
  Reachable because a record's own `domains` tag and its concept's
  _registered_ domain can differ by design — `usableTimeTonight`'s concept is
  filed under Career, and several scenarios tag the record itself under
  Direction because it is evidence about the week rather than about the
  topic — so a reading can legitimately appear on a page other than the one
  its concept lives on, with nothing else on that page to supply the context
  a reader on the concept's own page gets for free.
- Root cause: the value was rendered without its concept's label, which is
  fine wherever a heading already supplies it (the "What the app currently
  believes" panel) and wrong wherever nothing does (a chronological list).
- Fix: every observation, explicit-fact and context line now leads with
  `concepts.definitionFor(record.concept).label`, the same "Label: value"
  shape `"Goal:"` and `"Commitment:"` already used two lines down.
- Regression: none dedicated — covered by reading the rendered line in the
  fix itself and by the unchanged `domain-page-data.test.ts` /
  `life-domain.spec.ts` suites, which use substring matching and did not need
  updating.
- Fixed in: `2adc6f4`

### DEF-0028 — four repeats of "a suggestion here," never naming which one

- Status: Fixed
- Severity: Major — generic language section 4.6 asks the app not to settle
  for when the subject is known
- Found in: Phase 5 / `727ad7b`
- Found by: the builder's own Android-style gate, against the deployed Preview
- Class: **the object of a lifecycle or outcome record was never resolved.**
  `action-completion`, `action-decline`, `action-unable-now` and `outcome`
  records carry a reference to the `action-recommendation` they belong to
  rather than a subject of their own, and `describeChange` never followed it.
- Reproduction: load "A month of what actually worked" and open the Home
  page: "Recently" read **"Said what a suggestion here was worth"** and
  **"Followed through on a suggestion here"**, each four times, on a history
  whose only subject for a month was one place.
- Root cause: the generic phrasing was correct as far as it went — the record
  itself carries no subject — but nothing resolved the recommendation it
  points at to find one, even though the reference was one lookup away.
- Fix: `subjectOf` resolves the referenced `action-recommendation` and reads
  its target object's label; `describeChange` appends it with an em dash
  ("...here — the kitchen.") when resolvable, and leaves the sentence exactly
  as generic as before when it is not — never a broken reference in place of
  an absent one. Punctuation gets its own fix in the same commit: the first
  version stranded the full stop before the em dash.
- Regression: `tests/synthetic/domain-page-data.test.ts` — "names the subject
  a completion or an outcome was about, in 'recently'", against the same
  scenario the gate found it on.
- Fixed in: `e4944a5`

### DEF-0023 — the coverage move was cancelled by the silence that created it

- Status: Fixed
- Severity: Blocker — the phase's headline feature undoing itself
- Found in: Phase 4 / `bdb1e18`
- Found by: **the owner's Android phone gate**, reading the ranking in the QA
  inspector rather than trusting the score
- Class: **one fact counted twice, in opposite directions, by two dimensions.**
  The coverage generator proposes a move _because_ an area has gone quiet;
  `uncertainty` then marks that same move down _because_ the area has gone
  quiet. Nothing in either half is wrong on its own, which is why it survived —
  the generator is right to propose, and `uncertainty` is right that the move
  rests on something unknown. What is wrong is that the second is a restatement
  of the first.
- Reproduction: load "Everything current except the studying" and open the QA
  ranking.

  | move                 | uncertainty | score |
  | -------------------- | ----------- | ----- |
  | a 25-minute walk     | +0.40       | 0.166 |
  | recalling subnetting | −1.00       | 0.139 |

  Total weight 15.6, so the uncertainty differential is 0.054 against a score
  gap of 0.027 — **exactly twice the margin that decided the evening**. On Now
  it read as circular reasoning: _"Nothing has come in about career & learning
  for 7 weeks"_, then a walk, explained as _"Better supported by what is
  known."_

- Root cause: `uncertainty` had no way to tell "this move rests on something we
  do not know" from "this move exists to find that out".
- Fix: `Candidate.resolves` — the concepts a move exists to settle, always a
  subset of `leansOn` and empty for every ordinary generator. `uncertainty` sets
  those aside and judges what is left. Three things it deliberately is not: not
  a reward (the dimension abstains at zero, it does not turn positive — the
  owner's instruction, and the same error with the other sign), not a licence
  (`resolves` is narrowed to `leansOn` when the candidate is built), and not a
  special case for career (`money` declares it too, whenever the cash buffer is
  the thing that is unknown).
- Regression: `tests/synthetic/evidence-moves.test.ts` — nine checks, including
  the control that `uncertainty` still bites on an ordinary move resting on an
  unknown, and the class-wide invariant that **every** `stale-evidence`
  candidate declares the unknowns that prompted it, swept over the whole
  scenario library so a future refresh generator cannot quietly cancel itself.
  Three separate reintroductions — the penalty restored, the abstention turned
  into a reward, and a generator forgetting to declare — all caught.
- Consequence, and it is the point: on "Everything current except the studying"
  the refresh is now the recommendation rather than the runner-up. A ten-minute
  recall serving a live CCNA goal beats a twenty-five minute walk with no goal
  attached, which is what the app would have chosen anyway had the topic been
  fresh. The limiter line disappears from that screen, because the app is doing
  something about the gap instead of mentioning it.
- Fixed in: the Phase 4 repair checkpoint

### DEF-0024 — a gap in what the app knows was labelled as an obstacle

- Status: Fixed
- Severity: Blocker — the screen contradicting the ranking underneath it
- Found in: Phase 4 / `bdb1e18`
- Found by: the owner's Android phone gate
- Class: **one label hardcoded for every kind of thing it can describe.** Now
  rendered `label: 'What is in the way'` for whatever the limiter happened to
  be. That is right for a body that needs rest, a sore shoulder, a night nearly
  over. It is wrong for a quiet life area, which obstructs nothing — D-063 says
  so in as many words, and `bottleneck-fit` already scored it zero. The screen
  was calling it an obstacle anyway.
- Reproduction: load "Everything current except the studying" and open Now:
  **"What is in the way — Nothing has come in about career & learning for 7
  weeks."**
- Root cause: the label lived in the surface, where the limiter kind was not in
  scope.
- Fix: `Limiter.label`, set beside the summary from one table keyed on the kind,
  and travelling with it through `Explanation` so the two halves cannot drift.
  Recovery, capacity and time keep "What is in the way" — replacing it with one
  word vague enough to cover a coverage gap as well would make it wrong for the
  three it was right for. A coverage gap reads "Out of date".
- Regression: `tests/synthetic/g007-coverage-freshness.test.ts` — "calls a
  coverage gap what it is, and never an obstacle", "still calls a real limiter
  an obstacle, because it is one", and "gives every limiter kind a label, so a
  fifth cannot arrive unnamed". Reverting the label table was tried; the first
  fails.
- Siblings: the label now passes through every copy sweep in
  `no-hidden-genericity` alongside the summary, minus the finished-sentence rule
  — a column heading is not a sentence and a full stop on it would be wrong.
- Fixed in: the Phase 4 repair checkpoint

### DEF-0025 — two screens described an app from two phases ago

- Status: Fixed
- Severity: Blocker — a false claim on a primary destination
- Found in: Phase 4 / `bdb1e18`
- Found by: the owner's Android phone gate, reading every surface rather than
  the ones the flows touched
- Class: **DEF-0007's, and the guard written for DEF-0007 could not catch it.**
  That guard held four literal sentences that had once been wrong. It passed for
  two whole phases while Insights told the owner _"the app is not yet asking"_
  for outcomes — untrue since Phase 3, and untrue twice over in Phase 4, where
  some answers are worked out without being asked at all. More carried the same
  claim in different words.
- Reproduction: open Insights, or More, on any build since Phase 3.
- Root cause: a guard made of remembered strings only ever catches the mistake
  somebody already made.
- Fix, in two parts and neither of them a longer list. **A burden inversion:**
  every deferral claim in owner-facing copy must be acknowledged in a short list
  with a reason, so new copy saying the app does not do something fails the
  build until a person either fixes it or states why it is still true. **A tie
  to the code:** six capabilities the kernel demonstrably has, each proved by an
  export that must exist, each with the ways of denying it — if the capability
  is there and a screen denies it, the build fails, and if the capability is
  ever genuinely removed the proof fails first and says so.
- Regression: `tests/unit/architecture-guards.test.ts` — "acknowledges every
  claim that something is not built" and "denies no capability the kernel
  demonstrably has". Four reintroductions, all caught: both original sentences
  verbatim, **a brand new deferral nobody had acknowledged**, and **a denial of
  a capability in fresh wording** — the last two being exactly what the old
  guard would have missed.
- Fixed in: the Phase 4 repair checkpoint

### DEF-0026 — the Life overview was a wall of the same sentence

- Status: Fixed
- Severity: Major — the phase's main new surface reading as homework
- Found in: Phase 4 / `bdb1e18`
- Found by: the owner's Android phone gate, at 360×780
- Class: **a component used past what it was built for.** `Row` renders a short
  label against a short right-aligned value — `Commit / bdb1e18`. Given a whole
  sentence it wraps to four or five lines with a ragged left edge, and given
  eleven of them, seven identical, it produced 1856px on a 780px screen: about
  two and a half screens of _"Nothing here yet — You have not mentioned this,
  and nothing is asking you to."_ Every sentence was true and every existing
  assertion passed.
- Reproduction: load any scenario and open Life on a phone-sized viewport.
- Root cause: the presentation followed the data structure — one row per domain
  — rather than the question the owner is asking, which is "does anything here
  need me?".
- Fix: presentation only, and one coverage computation still. The status does
  the sorting: anything wanting attention is listed on its own with the line
  that explains it, everything calm is a heading and a row of names, and the
  sentence that repeated seven times is said once for the group. Attention
  groups come first. No questionnaire, no chores, no decorative cards, and the
  private area still never shows its subject.
- Regression: `tests/browser/shell.spec.ts` — "says the same sentence once
  rather than seven times", which fails on any sentence the owner reads twice,
  and "fits in about a screen and a half rather than two and a half", which
  measures the page against the viewport. Both were proved to fail with the
  repeated line restored. Plus "names every one of the eleven areas exactly
  once", so compressing the screen cannot quietly drop an area.
- Note on what the old tests proved: `toHaveCount(11)` and a text match on the
  quiet area both passed throughout. They asserted the data was present, which
  was never in doubt.
- Fixed in: the Phase 4 repair checkpoint

### DEF-0027 — the app said "her own" twice about his daughter

- Status: Fixed
- Severity: Minor — but on the one sentence where the app makes a claim about
  the owner's child
- Found in: Phase 4 / `bdb1e18`
- Found by: the owner's Android phone gate
- Class: **composed copy repeating what the subject already carries.** The
  headline was `${who} has managed ${skill.label} on her own ${n} times
running`, and the skill is labelled "ordering her own food" — so it read
  "managed ordering her own food on her own", saying independently twice in
  eight words. Any sentence that adds an independence phrase to a skill label
  that already contains one will stumble the same way.
- Reproduction: load "Three times running, and the app noticed" and read the
  panel under the move.
- Fix: "has handled" carries it alone. The statement uses "independently", which
  the label does not repeat.
- Regression: `tests/synthetic/g003-growth-evidence.test.ts` — "says
  independently once, in both sentences", which sweeps both sentences for any
  repeated independence word rather than matching the old string, and "reads as
  a whole sentence beside the question the panel asks". Restoring the old
  wording was tried; the first fails.
- Fixed in: the Phase 4 repair checkpoint

### DEF-0022 — the premise said she was here and the line above it said nothing had

- Status: Fixed
- Severity: Major — a screen contradicting itself, about the one fact the plan
  uses as its example of something that never needs re-asking
- Found in: Phase 4 / `10a0be9`
- Found by: **printing every line the owner would read on every scenario**, after
  the whole suite was green and the checkpoint was pushed. Exactly how DEF-0019
  was found, and the reason that step is worth doing when everything already
  passes.
- Class: **the same class as DEF-0017 — a sentence about the app's own blindness
  written as a finding, on a screen that already says otherwise.** Two lines from
  one run of "A week pointed at the house":

  > Tuesday evening, 8 hours of sleep, about 60 minutes free, **Adaya is here**.
  > _Nothing has come in about fatherhood / family for 6 months._

- Reproduction: load "A week pointed at the house" and open Now.
- Root cause: coverage measured the **age of the record** carrying a durable
  context rather than asking whether the context was in force. The custody
  arrangement in that history is dated six months back and has no end, so the
  fatherhood domain looked six months silent while `childPresent` resolved
  `explicit` from the very same record.

  D-012 already settles this and coverage was on the wrong side of it: "a
  context is in force between its `validFrom` and `validUntil`, and that is the
  whole of its currency." Section 8 uses this exact case as its own example — a
  durable custody arrangement does not need re-asking every day — so the engine
  was contradicting the paragraph that asked for it.

- Fix: a context currently in force counts as heard **now**. One line, and it
  applies to every concept and every domain rather than to custody.
- Regression: `tests/synthetic/g007-coverage-freshness.test.ts` — "never calls an
  area silent while a context about it is in force" and "puts no line on Now
  that the premise directly contradicts", both sweeping the whole scenario
  library rather than the one that reported it. Reverting the fix was tried;
  three tests fail.
- Siblings: swept every scenario for the general shape — a domain reported stale
  while a concept in it resolves usable. The two rules now asserted are the
  concept-level one ("never calls a concept neglected while the fact layer still
  answers it") and this domain-level one, and the second was missing precisely
  because the first was proved on `durable-custody`, which is protected three
  ways over and so proved the behaviour rather than the rule.
- Consequence, and it is a real narrowing: a learning topic stated as _standing
  context_ now reads as current however old the statement is, where before four
  months of silence would have flagged it. That is the correct reading of D-012
  — a standing statement with an open window is not an ageing assumption — and
  the signal survives where it matters, because a topic recorded as an ordinary
  observation still expires on its own horizon. `career-gone-quiet` demonstrates
  that at seven weeks.
- Fixed in: the sixth Phase 4 checkpoint

### DEF-0021 — the app asked for a verdict when it could have asked for the fact

- Status: Fixed
- Severity: Major — the exact complaint that started the derived-evidence work,
  surviving inside the repair for it
- Found in: Phase 4 / `ecb18eb`
- Found by: **a browser test written to demonstrate the fix, which could not be
  made to pass.** The assertion was that the guide asks how much sleep he got;
  what the app actually put on screen was an outcome card asking him to grade
  the early night.
- Class: **two questions about one fact, where the worse one wins because it is
  drawn first.** Now shows a due result above the guide, deliberately — a result
  expires and answering it improves the next decision (Phase 3). So on the
  morning after an early night the outcome card takes the slot, and the guide's
  question about last night's sleep is never asked. The derived matcher, which
  exists precisely to turn that reading into the outcome, then has no reading to
  read.
- Reproduction: load "Three broken nights, and a deadline", tap **Done**, travel
  forward one day. The card read _"How much did skipping subnetting do for your
  rest?"_ — a verdict, on a morning when the app could simply have asked how
  long he slept.
- Root cause: the derivation was built to avoid asking twice and nothing was
  built to make the better question happen. Section 8's preference order was
  implemented for the case where the reading arrives on its own and not for the
  case where the app has to go and get it.
- Fix, in two halves that read the same function. `readingAwaitedBy` in
  `outcomes.ts` says whether a due effect could be settled by a reading the
  guide is entitled to ask for; the outcome card holds its own question back
  while that is true, and the guide asks for the reading. One card swapped for a
  better one, so the number of things asked does not move — which is the only
  shape section 12 leaves room for (D-069).
- Regression: `tests/synthetic/guide-resume.test.ts` — "never puts a guide
  question and an outcome question about the same fact on screen together",
  "never asks for a reading a result is waiting on more than once", "keeps the
  awaited reading under the day's floor like everything else", and
  `tests/browser/now.spec.ts` — "does not ask what an early night did once it
  knows how the night went". All four were proved to fail with the hold-back
  removed.
- Siblings: swept the other two-aspect moves. `reset-space`, `reach-out` and
  `start-conversation` all produce a result and something else, and none of
  their aspects is a reading the guide collects — nothing in the question
  catalogue measures whether a kitchen is clear. The class is narrow and is
  asserted where it is real: the pairing comes from `MoveProfile.measures`
  matching a concept the guide can ask about, so a future move that measures
  energy would be covered by the same code.
- Consequence, and it is the better behaviour: the fallback matters as much as
  the swap. A reading recorded _outside_ the window leaves the concept known, so
  the guide will not ask for it — and holding the effect question back on top of
  that would mean no reading, no question, and a window closing with nothing
  collected. The hold-back is conditional on the better question actually being
  asked, and that condition has its own regression.
- Fixed in: the fifth Phase 4 checkpoint

### DEF-0020 — a question its own answers could not answer

- Status: Fixed
- Severity: Blocker — the app collecting evidence about one thing and learning
  another from it
- Found in: Phase 3 / `9a2b729`
- Found by: **owner phone test, first pass**
- Class: **four different facts collapsed into one judgement, and a prompt that
  came from somewhere other than its answers.** The renderer's conversational
  `followUp` was reused verbatim as the outcome prompt, while the answers came
  from the learning model, and nothing anywhere required the two to be about the
  same thing.
- Reproduction: kitchen recommendation → **Start it** → **Done** → advance the
  clock. The card asked _"Did the kitchen get cleared?"_ and offered **Better
  than usual · About the same · Worse**.
- What the owner saw, and what was underneath it: eight of fifteen follow-ups
  were unanswerable by the offered options — six asked whether something
  happened, two were effect questions in yes/no clothing — and the six that
  parsed did so loosely, importing a comparison the question had not asked for.
  Not one of the fifteen was clean.

#### The wrong diagnosis, and the owner's correction

The first diagnosis said the question was redundant because Done already
records that it happened. **That was wrong, and the owner said so.**
`action-completion` had no definition anywhere in the codebase — unlike
`action-decline` ("Disagreement") and `action-unable-now` ("Inability") — and
the only reading the code supported was the lifecycle terminal state. Fifteen
minutes clearing the kitchen can be done in full and leave the kitchen half
clear. **Done is the attempt; whether the intended end state occurred is a
separate fact**, and asking about it is legitimate.

That correction is what turned a copy fix into a semantic one.

#### Root cause

Four facts had one carrier:

- **completion** — the attempt was made (lifecycle);
- **direct result** — the intended end state occurred;
- **downstream effect** — what it was worth afterwards;
- **comfort** — how it felt.

Section 20 lists `completed` and `outcome observed` as separate states; section
10 lists five distinct things to learn from a social move, "whether the owner
acted" among them; section 19 lists `completion probability` and `prior outcomes
in comparable contexts` as separate dimensions. **A single effect judgement was
an implementation choice made in Phase 3, not a requirement of the plan.**

Two arithmetic faults sat under it:

- `OBSERVED_VALUE` mapped a **relative** answer ("About the same") onto an
  **absolute** scale, so one tap meaning "it made no difference" pulled a move
  with a 0.8 prior down, left `reset-space` at 0.4 exactly where it was, and
  would have pushed a 0.05 prior up. On the card in the screenshot, two of the
  three answers moved the belief by nothing while still counting as a sample.
- Three levels could not tell **harm** from **no help**. A walk that aggravated
  soreness and a walk that did nothing are not the same evidence.

#### Fix

- `action-completion` is **defined as the attempt**, in a doc comment beside the
  two that already had one.
- `OutcomeRecord` carries an explicit **`aspect: result | effect | comfort`**.
  Whose result it is needs no fourth aspect — the subject carries that, so "how
  did Adaya do" is a `result` about a development skill that links to her.
- **Only an effect answer carries a `sentiment`.** Load-bearing:
  `roughOutcomesFor` reads `worse` as "this topic went badly", so a _result_ of
  "not at all" wearing that flag would fire the weak-topic generator off an
  evening that says nothing about a topic.
- **A per-verb aspect table** beside the move profile, decided by one test: does
  the sentence name an end state, or only an activity? Eleven verbs produce one
  kind of evidence; three produce two; `hold` produces none.
- **`resultFor`** — a new learned quantity, prior 1.0, feeding a new
  **`direct-result`** dimension that abstains at the prior and is **non-positive
  below it**. That is what stops a two-aspect move collecting two positive
  rewards for one good evening: its second aspect can only ever cost it. Same
  shape as `follow-through` after DEF-0019.
- **Effect answers are four absolute levels** — 0.85 / 0.50 / 0.15 / 0.00,
  approved after a sensitivity check across the real prior range. `shrink()` is
  unchanged.
- **Comfort is learned as friction**, signed both ways, because its prior is a
  middling guess rather than a ceiling.
- **A "not at all" result ends the sequence.** No honest answer exists to how the
  evening went after clearing a kitchen that was never cleared, and whichever
  one was picked would be recorded as evidence about clearing kitchens.

#### Regression

`tests/synthetic/outcome-questions.test.ts` — seventeen class-wide checks that
walk every verb and every aspect, so a sixteenth verb is covered the moment it
exists. Plus behavioural coverage in `outcome-learning.test.ts` (double reward,
comfort-as-friction) and `lifecycle.test.ts` (the short-circuit), and the two
browser flows.

**Eight defects were reintroduced one at a time and all eight were caught:** the
reported yes/no-against-graded-answers, an outcome question losing its subject,
a result answer wearing an effect sentiment, harm collapsed back into no-help,
an effect label taking a word the engine already uses, a move declaring an
aspect nothing asks about, `direct-result` rewarding a move for landing, and the
short-circuit removed.

The first run caught six of eight. The two that escaped were the two most
important claims in the design — that a two-aspect move is not rewarded twice,
and that a failed result stops the effect question — and neither had a test
exercising a history with result evidence in it. Both now do.

#### Siblings

- The sensitivity check found a second collision before it shipped: the answer
  labelled "A little" (0.50) would have been reported back by `describeLevel` as
  "a fair amount". The words on the button and the words in the trace have to
  mean the same thing, and a sweep now says so.
- `growth-opportunity` was in the comfort table — "How did ordering food
  independently seem to go for her?" answered _Easy / A bit awkward / Hard work_
  and filed as the owner's feelings. It is section 9's growth evidence, and it is
  now a `result` about her.
- The two tests that asserted the exact broken strings —
  `lifecycle.test.ts` and `now.spec.ts` — are why nothing caught this. An
  exact-string assertion proves a string is stable, not that it is right. Both
  are now class checks plus one representative example.

#### Deferred

- **Repeated harm** ranks a move at the floor and does nothing more. Pattern
  recognition and a proposed recommendation-family veto (§4.3) belong with
  Insights, **Phase 6**.
- **Deriving sleep outcomes from the next morning's `sleepHours` reading**, which
  §8 prefers to asking, needs observation-to-episode matching and belongs with
  the coverage engine, **Phase 4**.
- Fixed in: the fifth Phase 3 checkpoint

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
