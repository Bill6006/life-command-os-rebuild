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

### DEF-0129 — the closed catalogue was closed over one module, not over the screen

- Status: Fixed
- Severity: Blocker — D-193's guarantee did not hold, so a future edit could put
  a promise on the owner's screen with all three gates green
- Found in: routing 84 / `0f9b882`
- Found by: **independent QA round 4** (QA-84-012), by reading the whole Health
  panel and the resume panel and asking the catalogue about what it saw
- Class: **a guard collected where copy is written rather than where it is
  read.** The third variation on one theme: DEF-0127 listed phrases, DEF-0128
  listed verbs, and this one listed a module.
- Reproduction: from **The first evening**, answer **Enough**, press **Can't
  right now**, choose **Can't leave — someone's in my care**, then read the whole
  Health panel and Now's resume panel. Six owner-visible strings — the panel
  title, the paragraph above the rows, **Not true any more** and its accessible
  name, **Where you left off**, the state sentence and the closing note — all
  answer `false` to `isApprovedBlockerCopy`, and the two catalogue tests pass
  anyway.
- Root cause: `everyRenderedBlockerString()` collected the return values of
  `blockerQuestionFor` and the `BLOCKER_OPTIONS` table. It had no path to
  JSX-composed copy, and neither the browser nor the Android D-187 case read
  beyond a child locator inside the panel.
- Repair: a rendering collector — `tests/synthetic/blocker-copy.test.tsx` mounts
  `BlockersPanel`, `BlockerQuestion` and `ResumePanel` in every branch and reads
  every text-bearing element and every `aria-label`. The surfaces are enumerated
  by `blockerSurfacesInSource()` from the blocker-path types in their props, and
  the catalogue is split into the half `blockers.ts` assembles and the half the
  surfaces compose, each proved by the check that can reach it. See **D-194**.
- Regression: four cases in `blocker-copy.test.tsx`, plus the browser and Android
  D-187 cases now reading whole panels element by element.
- Proved by reintroduction three ways, two of them the boundaries QA named: **the
  promise QA proposed** for the domain panel's parent note (_"The app keeps these
  so it can choose something better next time."_) fails the synthetic catalogue
  **and** the browser gate; **an unapproved string in the resume panel's title**
  fails the catalogue; and **a fourth component taking a `StandingBlocker` that
  nothing renders** fails the surface enumeration.
- Siblings: checked by the instrument rather than by reading — it reports every
  feature component whose props include a blocker-path type, and all three are
  rendered. Two owner-visible strings the first collector could not reach were
  found while writing it: the resume panel's bare _"You said this did not fit at
  the time."_ (reached by **Just leave it**) and its part-done-after-a-blocker
  form.

### DEF-0128 — the guard that replaced a phrase list was a phrase list

- Status: Fixed
- Severity: Blocker — the standing protection for D-187 did not hold, so a future
  copy edit could restore the forbidden behaviour with every gate green
- Found in: routing 84 / `cdd9259`
- Found by: **independent QA round 3** (QA-84-011), by writing four ordinary
  sentences and running them through the guard
- Class: **a guard that enumerates what somebody remembered and calls it a
  class.** The same class as DEF-0127 one layer deeper: that entry replaced five
  phrases with a cross-product of three word lists, and the unbounded dimension —
  the verb — was still a list.
- Reproduction:

  ```
  node --input-type=module -e "import {adaptationClaims} from './scripts/adaptation-claims.mjs'; for (const l of ['The app will choose a more suitable option.','The app will pick something else for you.','The app will use this when deciding what comes next.','The app will prefer an option that works indoors.','Future recommendations will take this into account.','The app remembers this for future recommendations.','Recommendations will be different next time.']) console.log(JSON.stringify(adaptationClaims(l)), l)"
  ```

  Every line is a promise the engine cannot keep. Every line returned `[]`.

- Root cause: `ADAPTATION_VERBS` — a finite list of what a promise might be
  _about_. `choose`, `pick`, `use` and `prefer` were not in it, and nominal and
  passive forms (_"Future recommendations will…"_, _"what you are shown will…"_)
  had no listed subject either.
- Repair, in two parts. **The guarantee is a closed catalogue**:
  `APPROVED_BLOCKER_COPY` enumerates every string the blocker path renders, and
  the synthetic gate asserts both directions against a walk of the whole scenario
  library — nothing rendered that is not approved, nothing approved that is not
  rendered. **The classifier is the net**, rebuilt with no verb list at all: a
  subject that is the app or its output, plus a modal auxiliary (a closed class
  in English) or forward deixis. See **D-193**.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — five cases
  under _"QA-84-011 — the adaptation guard, rebuilt on what is actually closed"_.
  The one that answers QA's objection is **"does not depend on knowing the
  verb"**: 3,248 generated sentences over subject × modal × verb, the verbs
  including three that are not English words. A guard with a verb list fails it
  on the first unfamiliar one.
- Proved by reintroduction, three ways: putting a verb list back into the
  classifier fails the generated sweep; putting QA-84-010's shipped promise back
  into the note fails the catalogue check; and an ordinary, honest-sounding copy
  edit nobody approved fails it too. The third of those found a real weakness
  first — the approval check was walking one evening rather than the library, and
  an edit to the repeatedly-blocked note went straight past it.
- Siblings: checked. The browser suite and the Android gate import the same
  module and now make both checks rather than one. `already-known` renders the
  owner's own words rather than app copy and is deliberately outside the
  catalogue.
- Note on honesty: the classifier still cannot decide entailment — _"the app
  learns from this"_ escapes it — and the module says so where it is defined.
  That is why the catalogue, not the classifier, is what the phase relies on.

### DEF-0127 — a promise the engine cannot keep, and the guard written to stop it

- Status: Fixed
- Severity: Blocker — the exact class D-187 was written to prevent, on the screen
  D-187 is about, already in the tree when D-187 was written
- Found in: routing 84 / `94e1716`
- Found by: **independent QA round 2** (QA-84-010), reading the note under
  _"What got in the way?"_ on the deployed build
- Class: **a copy guard that asserts the phrases somebody thought of rather than
  the claim the rule forbids** — and, beneath it, _the same rule maintained
  separately in three gates_.
- Reproduction: from a store where the walk is on Now, press **Can't right now**
  and read the note before choosing a cause. It said _"This is kept so the app
  can offer something that fits next time."_ A second branch, reached after a
  move has failed to fit more than once, said _"so the app can stop putting it in
  front of you at the wrong moment."_ Nothing performs either: `applyConstraints`
  never reads `situation.constraints`, and `cautionsFor` matches a constraint's
  concept against a candidate's `leansOn`, which never holds a `blocker.*`
  concept.
- Root cause: the copy predates D-187 and was never swept, because the sweep
  written **with** D-187 blacklisted five formulations — _stop_, _won't_, _no
  longer_, _avoid_, _from now on_ — and neither string contains any of them. The
  synthetic guard collected the live note and did not match it. The browser suite
  and the Android gate each carried a narrower copy of the same list.
- Repair: both notes now say what is recorded and where, and nothing about what
  follows. The guard is `scripts/adaptation-claims.mjs` — actor × non-present
  modality × adaptation verb — in one module imported by all three gates.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — _"QA-84-010 —
  nothing on the blocker path claims the app will change what it offers"_ and
  _"— and the guard catches the wording that shipped, not only the one it was
  written for"_; `tests/browser/phase84.spec.ts` and `scripts/android-gate.mjs`
  assert the same module against the deployed strings. Proved by reintroducing
  the exact deployed note in both the synthetic and browser gates.
- Siblings: checked. The repeated-inability branch carried its own promise and is
  repaired with it; the silent branch's _"there is nothing the app would do
  differently"_ is a denial and correctly survives. The authoring form's _"it will
  not start suggesting it"_ about a routine is **true** (AUD-0045) and is outside
  this guard's path by design.

### DEF-0126 — Timeline called a partial completion "Done", one line above a sentence saying otherwise

- Status: Fixed
- Severity: Blocker — the owner's own distinction, contradicted inside a single
  rendered row
- Found in: routing 84 / `94e1716`
- Found by: independent QA round 2 (QA-84-009)
- Class: **a rendered entry that contradicts itself**, from a table keyed on
  record kind where the kind is not the whole of what an entry is.
- Reproduction: **The first evening**, answer **Enough**, **Start it**, then
  **Only part of it**. Now says **Part done**; Health & Recovery says **Got part
  way**; Timeline shows the tag **Done** directly above _"Got part of the way —
  getting out for a walk."_
- Root cause: `TAGS['action-completion']` is `'Done'` and the table is keyed on
  kind alone. The round 1 repair fixed the sentence and left the tag, with a
  comment arguing that a tag is one word and a domain page shows no tag at all —
  which was true of the domain page and false of Timeline, where the two sit one
  above the other.
- Repair: `tagOf(record)` returns `'Part done'` for a partial completion and is
  what every surface renders; `tagFor(kind)` stays for the schema's
  exhaustiveness sweep.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — _"QA-84-009 —
  and no rendered entry in the library contradicts itself about extent"_, which
  walks every record in every scenario rather than this one case; plus the
  deployed Timeline row in `phase84.spec.ts` and `scripts/android-gate.mjs`.
  Proved by reintroduction in both.
- Siblings: checked — the export composer used the same tag and now uses `tagOf`.
  No other record kind carries an extent today; the library sweep is what will
  see the next one.

### DEF-0125 — the Health form promised the app would not suggest the step, then it suggested it

- Status: Fixed
- Severity: Blocker — a false pre-action consequence, on the path D-173 protects
- Found in: routing 84 / `94e1716`
- Found by: independent QA round 2 (QA-84-008)
- Class: **a confirmation describing an engine behaviour that has since moved**,
  with no compiler edge between the two and a pair of tests each holding one half.
- Reproduction: on Health & Recovery, name the destination _"Build sustainable
  strength"_ with next step _"Lift twice each week"_. The form says _"The app will
  know it is what you are working towards; it will not start suggesting it."_
  Save, return to Now, answer **Enough** — Now says _"Get some movement in: Lift
  twice each week."_
- Root cause: `describeMilestone` was written when Health's milestone was inert.
  QA-84-001's repair made `healthCandidates` propose exactly that milestone, which
  is the whole of that repair, and the sentence was not re-read.
- Repair: the Health wording now says the app will start suggesting it **on
  evenings there is something to spend on it**, which is the condition the
  generator actually applies.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — _"QA-84-008 —
  no confirmation denies a suggestion the app then makes"_, which reads the
  sentence and then makes the app do the thing, for every proving domain, in one
  test; and `phase84.spec.ts` reads the form and the resulting headline in one
  browser case. Proved by reintroducing the old sentence.
- Siblings: checked. Career's and Money's sentences promise a suggestion and their
  generators make one. The authoring form's routine sentence still says the app
  will not suggest it, and that is still true — AUD-0045 is untouched.

### DEF-0124 — the first screen of a first run offered only a developer tool

- Status: Fixed
- Severity: Major — the product's first impression, and in production a screen
  with nothing on it at all
- Found in: routing 84 / `94e1716`
- Found by: independent QA round 2 (QA-84-007), in the manual cold-store
  owner-use check
- Class: **a screen treating an empty history as an empty page**, and so
  switching off the controls that exist to end the emptiness.
- Reproduction: open the deployed Preview in a genuinely fresh store without
  opening the QA laboratory. Now says _"There is no history here yet"_ and its
  only control is **Open the QA laboratory** — hidden in production, leaving
  nothing. Life exposes no area links. Every domain page says _"Nothing loaded"_.
  Insights is the only ordinary route that continues, because it is the only one
  that never had the guard.
- Root cause: `LifeScreen` and `DomainPage` both opened with `if (!memory.ready ||
memory.snapshot.records.length === 0) return undefined`. The second clause is
  not a readiness check.
- Repair: both now gate on readiness alone, as `InsightsScreen` always has, and
  Now's abstention names the ordinary ways on — the second agenda, and Life —
  without inventing a recommendation.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` —
  _"QA-84-007 — no screen decides it has nothing to offer because the store is
  empty"_, a source instrument over every feature file that assembles a
  situation, plus a test that every domain page assembles from an empty store;
  browser cases for the first-run Now, Life and Career; and the same walk in the
  deployed Android gate. Proved by reintroduction.
- Siblings: checked with the instrument rather than by reading — it reports every
  file that assembles a situation and gates on the store's record count, and
  reports none. `Discovery.tsx`'s check that a _built result_ is non-empty is a
  different claim and is correct.
- Note on scope: QA-84-007 came from a manual cold-store owner-use check that no
  automated gate performed, which is why it took nine rounds of green gates and a
  person with a fresh browser to find.

### DEF-0123 — the discovery card wrote an aspiration without ever proposing one

- Status: Fixed
- Severity: Major — the owner confirmed something he was never shown, on the
  surface he actually used
- Found in: routing 84 / `328e42f`, by the owner on the deployed build
- Found by: **owner use**, not a gate. Every automated claim about the
  propose-and-confirm contract was true of the domain page's form, which is the
  surface that has it; nothing asked whether the other surface that authors the
  same thing had it too.
- Class: **one contract, two surfaces, and only one of them holds it.** The same
  class as QA-84-005 one step out: there the confirmation described something
  the app then did not do, here there was no confirmation at all. The family is
  _a rule enforced where it was written rather than where it applies_, and its
  members are found by asking which other screens reach the same builder.
- Reproduction: from a near-empty store, open Insights. The agenda asks _"What
  are you hoping Career & Learning eventually looks like?"_. Type **More money**
  and press **That is it**. A `destination` entity and record are written
  immediately. No interpretation, no list of what will be created, and no
  statement of what is **not** being assumed appears at any point — while
  `DomainPanels.tsx`'s authoring form has shown all three since package 3.
- Root cause: `Discovery.tsx` never imported `proposeAuthoring`. Its destination
  branch was `return destinationRecords({ aim: said, domain: asked.domain }, …)`
  — a direct call to the builder. And it could not have imported it as written:
  `proposeAuthoring` is keyed on `AuthorableKind`, which is six kinds, and
  `destination` is not one of them (D-188 records the choice made instead).
- Repair: `proposeDestination()` in `authoring.ts`, returning the same
  `AuthoringProposal` shape and composing `milestoneConfirmation()`. The card
  renders it in the panel chrome the authoring form already uses, and both the
  confirm button and the record builder are gated on `problems` being empty. The
  obligation branch on the same card went through `proposeAuthoring` at the same
  time, from a single draft — a proposal composed from one object and a record
  written from another is how a confirmation stops describing what happens.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — _"owner
  addendum — the discovery card stops bypassing the confirmation"_, seven cases.
  The one that would have caught this is **"cannot come back: no screen brings
  something into being without proposing it"**, which reads the tree:
  `everyAuthoringSurface()` in `tests/synthetic/journey.ts` reports which feature
  files call a builder returning `AuthoringResult` and which of them compose an
  `AuthoringProposal` first. Proved by reintroduction — putting the direct call
  back fails it with _"/src/features/insights/Discovery.tsx builds
  authoringRecords, destinationRecords, milestoneFor"_.
- Siblings: checked, and this is why the guard is a source instrument rather
  than three more test cases. `DomainPage.tsx` calls `destinationRecords`,
  `authoringRecords` and `milestoneFor` and proposes nothing — it is the
  container for `DomainPanels`' form, which proposed and confirmed before
  handing the draft over, and it is named in `PROPOSES_ELSEWHERE` with that
  reason rather than filtered out silently. No third surface authors anything.
- Note on scope: this is **owner-directed**, not a QA finding. Codex raised
  neither addendum fix in Round 1, and QA-84-001…006 are unchanged by it.

### DEF-0120 — the question about what was in the way disappeared when there was nothing else to suggest

- Status: Fixed
- Severity: Blocker — the one question D-164 allows, absent on the evenings its
  answer is worth most
- Found in: routing 84 / `42667ea`
- Found by: the browser suite at 360px. It passed at the other two widths, which
  is what a defect that depends on whether something else happens to be on
  screen looks like.
- Class: **a control nested under a condition it has nothing to do with.**
- Reproduction: on **The first evening**, answer the guide, press **Can't right
  now**. At 360px no blocker question and no silent line appear at all.
- Root cause: the panel was rendered inside the `explanation !== undefined`
  branch — the half of Now that draws the move currently on screen. The move he
  just pressed has **left** that screen by then, because a move blocked in this
  block is out of the running for it (AUD-0023), so the question survived only
  when some other candidate happened to take its place. On an evening the app
  had nothing else for, it vanished.
- Repair: it renders at the top level, beside the resume panel, from the session
  state that holds the move he actually pressed.
- Regression: `tests/browser/phase84.spec.ts` — "asks once what was in the way,
  and offers a way out of the question", which asserts that one of the two
  branches is visible. The synthetic suite could not have caught it: it holds
  `blockerQuestionFor`, and the decision was right the whole time.
- Fixed in: `42667ea`

---

### DEF-0121 — a new button's name contained the name of the button beside it

- Status: Fixed
- Severity: Major — two controls in one row whose accessible names are
  substrings, on the row D-052 requires to be always drawn
- Found in: routing 84 / `42667ea`
- Found by: the browser suite, twenty-six assertions across three widths, and CI
  on the same commit
- Class: **an owner-facing label that is unique to a reader and ambiguous to a
  machine** — and, in this case, ambiguous to a reader too.
- Reproduction: any test doing `getByRole('button', { name: 'Done' })` inside
  `now-actions` resolves to two elements: **Done** and **Got some of it done**.
- Root cause: `part-done` shipped as _"Got some of it done"_, which contains
  _Done_. Accessible-name matching is substring by default, and a person
  scanning six buttons reads the shorter label inside the longer one.
- Repair: _"Only part of it"_ — what he would actually say, and it does not say
  the other button's word.
- Regression: the existing browser suite, which failed on it without being
  changed. That is worth noting: no new test was needed, because the assertions
  that already described the row were the ones that broke.
- Siblings: swept. No other pair of labels in `ACTION_WORDS`, `BLOCKER_OPTIONS`
  or the outcome answers is a substring of another.
- Fixed in: `42667ea`

---

### DEF-0122 — Life became a wall again, and a measured budget said so

- Status: Fixed
- Severity: Major — the exact failure Phase 5 spent a phase removing, put back
  by a panel whose own decision forbids becoming a chore
- Found in: routing 84 / `42667ea`
- Found by: `shell.spec.ts` — "fits in about a screen and a half rather than two
  and a half", at 360px
- Class: **a new surface added to a screen that already has a measured budget.**
- Reproduction: open Life at 360 wide on **The first evening**. The body scroll
  height was 2.24 screens against a ceiling of 1.9.
- Root cause: the second agenda rendered its question, its note and its input
  permanently on Life. Two further problems came with it: the prompt names the
  area it is about, and `shell.spec.ts` also requires Life to name each of the
  eleven areas **exactly once** — so _Career & Learning_ appeared twice.
- Repair, and it took three attempts, which is the useful part. Closing the
  control until tapped got it to 2.09. Trimming to one line and one link got it
  to 2.02. Dropping the panel chrome entirely got it to 1.91 — still over. The
  budget was saying the thing it was written to say: **Life has no room**, and
  shaving a sentence until a measured constraint stops complaining is the move
  the constraint exists to stop.
- So the agenda moved to **Insights**, which is where it belongs on its own
  merits: D-169 puts the review loop on Insights and the domain pages, F02 asks
  for a _"what I understand / am working out"_ state distinct from the guide, and
  AUD-0043 already puts a working-out panel there. A question about what the app
  does not understand sits on the screen about what it does.
- Regression: `shell.spec.ts`, unchanged and now green, plus
  `tests/browser/phase84.spec.ts` — "asks on Insights and not on Now".
- Fixed in: `42667ea`

---

### DEF-0119 — the question about a finished course keyed on a state nothing writes

- Status: Fixed
- Severity: Blocker — two new `OutcomeAspect`s with no reachable control, which
  is the exact pattern this phase exists to stop repeating
- Found in: routing 84 / `42667ea`
- Found by: the builder, writing the test that asks whether the thing can be
  reached at all. Every other test of the two aspects passed without it.
- Class: **a reader keyed on a value the writer never produces** — AUD-0050's
  pattern, and routing 83 found the same shape in `action-unable-now.blocker`:
  complete plumbing, no control.
- Reproduction: start the recovery run the app offers beside a recovery move,
  complete its three occasions, travel past its expiry, and call
  `dueCourseReflections`. It returns nothing, for ever.
- Root cause: it required `thread.state === 'done'`, and **nothing writes that
  state**. The Life panel offers _Stop this_ and _Pick this up again_, so the
  only states an owner can write are `abandoned` and `running`; a course that
  simply ran to its end stays `running` with `live: false`. `ThreadState`
  carries `done` because the record kind was written with four states in Phase
  82, and no control ever reached the fourth.
- Repair: `ActiveThread.finished` — one definition, computed where the rest of
  the thread's standing is: `state === 'done'`, or `running` with as many
  occasions behind it as the plan expected. Abandoned is not finished and
  neither is paused; he said so.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — "asks a
  finished course what is left of it, days later", which starts the course the
  app offers, finishes it through the ordinary controls over three evenings, and
  is asked. It fails on the original condition.
- Siblings: swept. `retained` and `transfer` are the only aspects reached from
  outside `outcomes.ts`, and `finished` is read in one place.
- Fixed in: `42667ea`

---

### DEF-0117 — naming the next step wrote the owner's aspiration into the record a second time

- Status: Fixed
- Severity: Major — the owner reads one aim twice on his own page, with half its
  milestones under each
- Found in: routing 84 / `994284a`
- Found by: the builder, reading its own code back before the handoff was
  written. Nothing reported it and no test failed on it.
- Class: **a builder used for the wrong half of an object it can build both
  halves of.** `destinationRecords` writes a destination and, optionally, its
  first milestone; calling it to add a milestone to a destination that already
  exists writes both again.
- Reproduction: on **The first evening**, open Career & Learning, say what you
  are aiming at without naming a next step, then use **Fill that in** to name
  one. Two `destination` records now carry the same aim, and
  `resolveDestinations` walks records rather than entities.
- Root cause: the entity id is derived from the label, so the entity was written
  over itself and nothing errored — which is exactly why nothing caught it. The
  duplication is in the record layer, and the surface reads the record layer.
- Repair: `milestoneFor` — a milestone for a destination that already exists,
  which adds a goal and touches the destination not at all. Both callers use it:
  the domain page's **Fill that in** and the second agenda's next-step prompt.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — "names a
  next step without the aim appearing twice", which asserts one destination, one
  milestone, and the next step reading back.
- Siblings: none. It is the only place two builders could write the same object.
- Fixed in: `42667ea`

---

### DEF-0118 — the second agenda wrote a Wednesday out of a question that never mentioned a day

- Status: Fixed
- Severity: Major — a consequential fact about the owner's week, invented
- Found in: routing 84 / `994284a`
- Found by: the builder, reading its own code back
- Class: **the app inferring a consequential fact from ambiguous input** — F36's
  own sentence, and the class the whole owner-use review is about.
- Reproduction: on Life, answer the second agenda's _"Is there something that
  takes a regular chunk of your week?"_ with a name and a start time. The
  resulting `commitment-window` carried `recurrence: { kind: 'weekly', days:
[3] }`.
- Root cause: the form asked for two things and the handler needed three, so the
  third was written as a literal. The value was chosen because a weekday was
  needed, not because anything knew one.
- Repair: the prompt asks which day, will not save without it, and
  `authoringRecords` writes a recurring span **only** where weekdays were given
  and a one-off **only** where a day was. The note under the control says the
  app will not guess at a span.
- Regression: `tests/synthetic/destination-and-discovery.test.ts` — "never
  invents a day of the week the owner did not name — F36", held on the builder
  rather than on the form, because the builder is what every surface reaches.
- Siblings: swept. `proposeAuthoring` is the only other place a time or a day is
  read from owner input, and it reports a missing one as a problem rather than
  supplying it.
- Fixed in: `42667ea`

---

### DEF-0115 — a guard reported every correctly labelled control in the phase as unlabelled

- Status: Fixed
- Severity: Major — the guard is D-176's enforcement and F40's acceptance item,
  and what it fails is the repair rather than the defect
- Found in: routing 84 / pre-checkpoint, before anything was pushed
- Found by: the builder's own gate, on the first run after the new controls
  existed
- Class: **a source-reading guard whose hypothesis about how the thing is
  written down is narrower than the language** — D-183.
- Reproduction: add `<label htmlFor="a-name">…</label>` and
  `<input id="a-name" …/>` to any file under `src/features`, then run
  `tests/unit/architecture-guards.test.ts` — "names every input, textarea and
  select under `src/features`". It reports the control as having no accessible
  name.
- Root cause: `unnamedControlsIn` accepted `htmlFor={` + a template literal and
  `htmlFor={` + a bare expression, and nothing else. A plain quoted string —
  the simplest correct spelling there is, and the one a new form reaches for
  first — matched neither branch. Ten controls added by this phase read as
  unlabelled while a browser computes a name for every one of them.
- Repair: the reader accepts the quoted form as well, on the same condition as
  the other two — the `htmlFor` must name **that control's own id**. Nothing was
  relaxed and no file was exempted, which is the half D-183 is about: the
  tempting fix is to write the template form everywhere and leave the guard
  teaching authors to match its habits.
- Regression: the same test, plus "bites on the field that was reported, and on
  a placeholder standing in for a label", which is unchanged and still fails on
  both original shapes; and `tests/browser/phase84.spec.ts` — "every input on
  the new controls has a name a browser can compute", which asks the running app
  through `element.labels` rather than asking the source.
- Siblings: DEF-0116, immediately below, is the same class in the same phase on
  a different reader. Both were found within an hour of each other and neither
  by the same means.
- Fixed in: `994284a`

---

### DEF-0116 — the instrument's route reader could not see a control that creates an entity

- Status: Fixed
- Severity: Blocker — the claim it guards is routing 83's fifth acceptance item
  and routing 84's third, and it was silently narrower than both
- Found in: routing 84 / pre-checkpoint
- Found by: the builder's own gate, when the route table's "bites when a control
  is taken out" case could not find a control that plainly exists
- Class: the same as DEF-0115 — **a source-reading guard blind to a shape it was
  not written for**, and this one is D-179's own failure mode occurring inside
  the guard D-179 was written for.
- Reproduction: at `b76ce91` minus the reader change, run
  `tests/synthetic/ordinary-use-journey.test.ts` — "lists every control on every
  screen that writes a record". It is green with `destinationRecords` and
  `authoringRecords` absent from `OWNER_ROUTES`, and they are the two
  highest-leverage controls in the phase.
- Root cause: `buildersDeclaredIn` finds a record builder by two conditions —
  it returns something whose type name ends in `Record`, and it takes a moment.
  A control that brings a **semantic entity** into being returns entities and
  records together, because that is one act (D-182), so its return type is
  `AuthoringResult` and the first condition rejected it. The exhaustiveness
  claim above the table stayed true of everything the reader could see.
- Repair: the reader recognises one named bundle type alongside a return type
  ending in `Record`. Named rather than pattern-matched — "anything ending in
  `Result`" would pick up half the codebase — so a second bundle type is an edit
  with a sentence saying why. The moment condition is unchanged, which is what
  still excludes `standingCommitments` and every reader.
- Regression: the same test, and "bites when a control is taken out of the
  table", which now also removes `destinationRecords` from the domain page and
  from Life separately — two screens, one builder, two controls, which is
  QA-83-003's own second finding arriving one phase later.
- Siblings: DEF-0115. Both are D-183.
- Fixed in: `994284a`

---

### DEF-0114 — the standing gate was red at a head nothing but this machine had seen

- Status: Fixed
- Severity: Blocker for closeout — the aggregate gate is the gate
- Found in: routing 83 / repository head `76d9587`
- Found by: independent QA round 1, by running `npm run verify` on a clean tree
  rather than trusting the phase record
- Class: **a commit that never reached the remote and therefore met no gate but
  the one its author remembered to run** — D-180, amending D-147.
- Reproduction: check out `76d9587` and run `npm run verify`. It exits 1 in its
  first stage: `prettier --check .` reports `docs/NEXT_PROMPT.md`.
- Root cause: two of them, and only the second is worth the entry. The surface
  cause is one character — `*after*` where Prettier writes `_after_`. The real
  one is that `76d9587` was **never pushed**. CI runs `npm run verify` on every
  push and would have failed in under a minute; it never ran, because there was
  nothing to run on. Every result recorded in the phase record was green and
  every one of them was taken before that commit existed.
- Repair: the file is formatted. The class guard is in
  `scripts/checkpoint-equivalence.mjs`, which exists to certify that what QA
  reads and what QA tests line up and is therefore the right place to notice —
  it now reports commits on `HEAD` that no remote branch contains, naming each
  one.
- Why it reports rather than refuses: a local commit is an ordinary state
  halfway through a phase, and the bundle equivalence the script certifies is
  true either way. What it stops is finishing a phase without noticing.
- Proof: run before the push and it names `76d9587` and `32c68c2`. The argument
  order is load-bearing and is commented — `--not --remotes HEAD` negates HEAD
  as well, always returns empty and always passes, which is a guard that cannot
  fail.
- Siblings: checked. The other documentation commits in this phase were pushed
  and CI was green on each.
- Fixed in: `9e6d46e`, the routing 83 round-1 repair — the checkpoint independent QA passed in round 2

### DEF-0113 — an instrument claimed to list every owner control and listed most of them

- Status: Fixed
- Severity: Blocker — the claim **is** the phase's fifth acceptance item, and
  the list is routing 84's brief
- Found in: routing 83 / `582f648`
- Found by: independent QA round 1, by reading the source against the table
- Class: **a claim of exhaustiveness with nothing able to falsify it** — D-179.
- Reproduction: read `OWNER_ROUTES` in `tests/synthetic/journey.ts`, headed
  "every control on an owner-facing screen that appends to the record", against
  `src/features/life/Threads.tsx` (**Stop this** / **Pick this up again**,
  calling `setThreadStateRecord`) and `src/features/insights/InsightsScreen.tsx`
  (**That is not right**, calling `beliefCorrectionRecord`). Neither is in the
  table.
- Root cause: the table was compiled by reading four files; there are five. The
  test above it, named "keeps the route table honest", asserted that ids were
  unique, that `writes` was non-empty and that the builder string contained a
  dot — three things that are true of a table missing half its rows.
- Repair: both controls added, and a reader that compares the table with the
  source. It finds builders by **what they return and what they take** rather
  than by name — `describeRecord`, `describeThreadRecord`, `isWithheldRecord`
  and `sourcesOfRecords` return or read records and build none, and a first
  draft reported every one of them; `standingCommitments` returns records and
  filters rows already in the history, and is excluded because it takes no
  moment. A record it invents needs an `occurredAt`; a reader does not.
- **And it asks per screen.** `beliefCorrectionRecord` was already listed under
  Now, so a per-builder check stays green over the missing Insights control —
  the second of the two. Two screens calling one builder are two controls.
- Regression: `tests/synthetic/ordinary-use-journey.test.ts` — "lists every
  control on every screen that writes a record", and "bites when a control is
  taken out of the table".
- Proof by reintroduction: removing the `insights-belief-correction` route fails
  the guard with `/src/features/insights/InsightsScreen.tsx calls
beliefCorrectionRecord (insights)` — the file and the control QA named.
- Also repaired, and reported separately by QA: the enumerated object-creation
  stop said the owner cannot name a topic he is studying. He can, and the
  instrument now shows it — Life → Career & Learning → **Add this** stores
  "Cloud engineering (AWS)" and reads it back. What is true is one layer under
  it: the fact creates **no entity**, so no study move is generated, no goal can
  name it as a piece and no course can take it as a subject. The brief now says
  that, and names routing 84's whole authoring list — goal, routine, person,
  place, skill and obligation.
- And the test titled "gets past the four steps … and stops at the four" had a
  map of three and five. The phase record was right; the test title was not.
- Siblings: swept. `More / Data` writes nothing — import and restore replace the
  store from a file. `MemoryProvider` appends derived outcomes on its own; it is
  deliberate, documented, and now listed as a write that is not a control rather
  than filtered out silently.
- Fixed in: `9e6d46e`, the routing 83 round-1 repair — the checkpoint independent QA passed in round 2

### DEF-0112 — a deferral counted the hold's occasions beside the held move's conclusion

- Status: Fixed
- Severity: Major — two honest statements about two different verbs, one tap
  apart, with nothing on the screen to reconcile them
- Found in: routing 83 / `582f648`
- Found by: **the class sweep written for DEF-0110**, on its first run. Not
  reported by QA and not in scope; found by looking for the reported defect's
  class rather than its instance.
- Class: DEF-0033's — a panel and the line above it counting different things
  and saying so in the same register.
- Reproduction: load **A month of what actually worked** and read Now at five in
  the morning, where the app defers the kitchen to the morning. Open **See
  evidence**. It says _"Nothing in the record is much like this morning yet"_
  and _"too early to say · **0 occasions**"_ directly above _"Clearing the
  kitchen has worked **several times** in situations like today."_
- Root cause: `engine.ts` composes a hold by taking the held move's semantics
  and changing the verb to `hold`, so `explanation.semantics.target.verb` is
  `hold` on a deferral. `evidenceForDecision` read that verb for its counts —
  there are no `hold` episodes, so zero — and read `explanation.restsOn`, which
  was computed from the held move's own verb before the rewrite, for its
  conclusion.
- Repair: the panel scopes its evidence to `evaluation.candidate.semantics.target`,
  which is the move on every decision and the **held** move on a hold. Identical
  on everything that is not a deferral. The sentence on screen stays the hold's,
  because that is what the owner is looking at, and the deferral rows above it
  still answer _why not yet_ (QA-82-002).
- Regression: `tests/synthetic/quantity-agrees.test.ts` — the library-wide sweep
  that found it. Reintroducing the `explanation`-scoped verb fails it with
  `what-worked at early-morning · concluded: says four or more over 0`.
- Siblings: checked. `observed` was reading the same rewritten target and now
  reads the move's; `rates` and the context split are each named from their own
  set (D-178).
- Fixed in: `9e6d46e`, the routing 83 round-1 repair — the checkpoint independent QA passed in round 2

### DEF-0111 — the action's name was lost at the two places it mattered most

- Status: Fixed
- Severity: Major, blocking for the submission — a generic verb is not an
  adequate subject for what the owner is being asked to correct
- Found in: routing 83 / `582f648`
- Found by: independent QA round 1, by reading one whole card
- Class: **an identity that survives in the key and dies on the way to the
  screen** — `corrections.ts` names it in its own comment, for the association
  aspect, in the R3-B2 repair that left the five verb-scoped aspects behind.
  D-178.
- Reproduction: load **Three days since that walk** and open Now. The headline
  reads _"Move for 25 minutes: **a walk**."_ Directly under it: _"**Move** has
  made little difference in situations like tonight."_ The correction control's
  accessible name: _"Not how it went — correct what **move** does for you."_ One
  tap lower, the evidence panel: _"how often **getting out for a walk**…"_ Four
  registers for one thing, on one screen.
- Root cause: structural rather than careless. The table that names an action
  with its subject in it lived in `insights.ts`, **above** `learning.ts` and
  `corrections.ts`. The two files that write the sentence and the button had
  nothing to reach for but `verbLabel` — the eyebrow word on a recommendation
  card, which is not a name for a thing.
- Repair: `PATTERN_NAME` and `patternNameFor` moved to
  `src/domain/recommendation.ts`, beside `verbLabel`. `LearnedEffect` gains
  `named`, computed under the pooled-object rule; `Explanation` carries it;
  `describeBelief` takes it. The belief key stays verb-scoped and so does what a
  correction rejects — only the words change.
- Regression: `tests/synthetic/one-name-for-an-action.test.ts` — the reported
  card read as QA read it, plus a library-wide sweep that the statement, the
  button and the panel say one name, and a guard on the file the table lives in.
- One existing test asserted the defect. `outcome-learning.test.ts` pinned
  _"**Reset a space** has worked a few times…"_; it now pins _"Clearing the
  kitchen…"_ and says why it changed.
- Siblings: swept. Every history at every block; the association aspect was
  already correct and is untouched.
- Fixed in: `9e6d46e`, the routing 83 round-1 repair — the checkpoint independent QA passed in round 2

### DEF-0110 — one occasion was called "the last few times"

- Status: Fixed
- Severity: Blocker — acceptance item 2 of the phase this defect was found in
- Found in: routing 83 / `582f648`
- Found by: independent QA round 1, by opening the evidence under the sentence
- Class: **a quantity stated in a sentence and compared with nothing** — D-177.
- Reproduction: load **Three days since that walk** and open Now. The reason
  reads _"Energy is good, and the evening suits a walk. **The last few times**
  made little difference, and nothing else here fits better."_ Open **See
  evidence**: _"**One occasion** in the record is like this evening — 22 May"_
  and _"too early to say · **1 occasion**."_
- Root cause: `explain.ts` returned the clause as a fixed string. The count was
  three lines away in `learning.ts`, which already had the correct singular
  branch for the sentence beside it.
- Why the guard written for this exact acceptance item missed it:
  `history-size-copy.test.ts` holds a list of unmeasurable phrases — "plenty of
  history", "everything that happened" — and checks that none appears. _"The
  last few times"_ is not unmeasurable. It is measurable and was never measured,
  so a phrase list could not see it. A list of known-bad phrases only ever finds
  the phrases somebody already thought of.
- Repair: the clause is generated from `learned.samples`, in the vocabulary
  `learning.ts` already uses for the same number — one vocabulary for one count
  rather than two files each rounding it their own way.
- Regression: `tests/synthetic/quantity-agrees.test.ts`, which **compares**
  rather than matching: every owner-visible sentence a decision produces, on
  every history at every hour, against the number its own source counted. A
  phrase nobody has thought of fails the moment it disagrees.
- Proof by reintroduction, and it found more than was reported: putting the
  hard-coded phrase back fails at counts of **1, 4 and 12**, across three
  histories. The plural was wrong in more places than the one an independent
  reader stood on.
- The one exemption is itself a check: a quantity quoted verbatim from the
  record — _"the /26 boundaries went wrong twice"_ is the owner's own recorded
  words — is not the app's claim to make, and the sweep allows it only where the
  phrase appears word for word in a record the history holds.
- Siblings: swept, and one more was found — DEF-0112.
- Fixed in: `9e6d46e`, the routing 83 round-1 repair — the checkpoint independent QA passed in round 2

### DEF-0109 — two owner-facing inputs with no accessible name

- Status: Fixed
- Severity: Major — an unlabelled control on a phone, in a phase whose successor
  designs repeated components
- Found in: routing 83 / `87e2057`
- Found by: the independent owner-use review (F40, E13), and the second one by
  the sweep written for the first
- Class: **a control named by nothing, or named only by a placeholder.** Not two
  fields: the gate had no way at all to tell a labelled control from an
  unlabelled one, so which pattern a new form inherits was whichever one its
  author happened to copy. `DomainPage.tsx` uses `aria-label` correctly three
  times a few hundred lines from the field that had none.
- Reproduction: open any Life page, tap **Not right?** on a reading with no
  closed set of answers — a bare `<input type="text">` appears with no label, no
  `aria-label` and no placeholder. On a stale area with no single overdue
  reading, **Something's changed** opens a second one whose only description is
  `placeholder="What's changed"`, which disappears the moment anything is typed
  and which assistive technology is not required to read.
- Root cause: the controls were written inline beside their buttons and nothing
  in the gate read them. The three correct `aria-label`s in the same file are
  what makes this a class rather than an oversight — the file already knew how.
- Regression: `tests/unit/architecture-guards.test.ts` — "F40 — no owner-facing
  control without a name", which scans every `<input>`, `<textarea>` and
  `<select>` under `src/features` and accepts a name from `aria-label`,
  `aria-labelledby`, a wrapping `<label>` or a `htmlFor` that points at it.
  `tests/browser/phase83.spec.ts` — "no control anywhere the owner can reach is
  nameless", which asks the running app the same question through the DOM's own
  `element.labels`.
- Proof by reintroduction: the guard's own "bites on the field that was
  reported" case runs the exact JSX that was in the tree, twice — once with the
  placeholder and once with nothing — and both are reported.
- Siblings: swept. Every other control in the app was already named — `Data`,
  `ImportPanel`, `DayShape` and the QA laboratory all wrap theirs in a `<label>`
  or carry an `aria-label`, and the goal-date control on the same page uses
  `htmlFor`. The two repaired here were the whole class.
- Also repaired, because F40 asks for it in the same breath: both controls now
  state what the app wants and what it will do with the answer. A name satisfies
  a checker; the note is for the owner.
- Fixed in: `582f648`, carried into the approved checkpoint `9e6d46e` and confirmed still closed by independent QA in round 2

### DEF-0108 — the Private page promised more than the behaviour keeps

- Status: Fixed
- Severity: Major — a privacy promise that is not true is worse than no promise
- Found in: routing 83 / `87e2057`
- Found by: the independent owner-use review (F30, E36)
- Class: **a promise written in one file about behaviour decided in another.**
  The sentence lived in `features/life/domainPages.ts` and the policy in
  `domain/privacy.ts`, and they disagreed from Phase 5 to Phase 82 with nothing
  able to notice.
- Reproduction: open **Life → Private / Sexual Health**. The page reads _"Yours
  to enter. Nothing here appears anywhere else."_ Enter anything. Open Timeline:
  a dated row appears reading **"Private entry"**. The words are concealed; that
  something was written, and when, is not.
- Root cause: `mayShowDetail` withholds the _detail_ of a private record from a
  primary surface and `discreetPlaceholder` stands in for it — deliberately,
  because dropping the row would tell the owner his history is thinner than it
  is. `compose.ts` documents the same distinction knowingly one layer up, for
  the export, where the row really is dropped. Nothing carried that distinction
  into the sentence the owner reads.
- Repair: plan section 11 offers two ways out — withhold the existence and the
  timing too, or say what the promise actually covers — and this is the second.
  Timeline keeps the row, because on his own screen a record that hides rows
  from him is a record he cannot trust the length of, and the promise now says
  so. **The sentence moved to `domain/privacy.ts`**, beside the policy it
  describes, which is the structural half: a change to `mayShowDetail` is now a
  change to a promise in the same file.
- Regression: `tests/synthetic/private-promise.test.ts`, which runs it from both
  ends — the sentence claims exactly what the display policy does, and a real
  private record rendered through `assembleTimeline` behaves exactly as the
  sentence says. `tests/browser/phase83.spec.ts` reads both screens.
- Siblings: checked. The export was already correct (`compose.ts`, DEF-0096) and
  says plainly that the area was left out. The domain page itself is the one
  surface allowed to show the detail and still does. No other surface makes a
  promise about the private area.
- Not repaired here, and deliberately: whether private evidence may _influence_
  a recommendation. That is D-167's owner permission, it is off by default, and
  it is routing 84's. This entry is about a sentence that was false whatever
  that permission later does.
- Fixed in: `582f648`, carried into the approved checkpoint `9e6d46e` and confirmed still closed by independent QA in round 2

### DEF-0107 — Timeline called part of the record the whole of it, under a heading claiming everything that happened

- Status: Fixed
- Severity: Major — two claims about the size and scope of the owner's own
  record, on the surface whose whole job is being the record
- Found in: routing 83 / `87e2057`
- Found by: the class sweep written for DEF-0106, which is the point of sweeping
  the class
- Class: **a sentence about a quantity or scope of history, checked against
  nothing.** D-153 states the rule and round 8 of Phase 82 repaired one instance
  of it on this very screen — the _empty_ case, `onlyLater`. The case with rows
  on the page was not, because nothing rendered it.
- Reproduction: load **"One answer, and a lot of silence"** — four records, one
  of them dated the following day — and open Timeline. Two rows render, the
  third record having been superseded by the retraction and the fourth being
  later, and the footer reads _"That is the whole record — 2 entries."_ The page
  header reads
  _"Everything that happened, in the order it happened."_ over a record of what
  the owner told the app.
- Root cause: `TimelineData.total` counts entries at or before the moment being
  read and `later` counts the rest. The footer read `total` and called it the
  record; the lede was written before `later` existed at all.
- Repair: the footer says what it counted and names the rest — _"That is
  everything up to the moment on screen — 2 entries. 1 entry is dated later;
  move forward and it is there."_ Where nothing is later the absolute stays,
  because there it is true, which is D-153's own condition. The lede says
  _"Everything recorded here"_, which is the distinction the review asked for in
  its own words. Both sentences moved into `timelineEntries.ts` as
  `TIMELINE_LEDE` and `describeExtent`, so a test can read them without a
  browser.
- Regression: `tests/synthetic/history-size-copy.test.ts` — "does not call part
  of the record the whole of it when entries are dated later", plus the sweep
  "never calls part of the record the whole of it, on any history at any hour",
  which is the assertion that would have caught this without anyone thinking of
  `mostly-unknown`. `tests/browser/phase83.spec.ts` reads the rendered footer.
- Siblings: swept. Every history in the library at every block, and every
  no-action sentence at every history size. The `Show earlier (N more)` count is
  `total - shown`, both counted; the `onlyLater` sentence was already repaired.
- Fixed in: `582f648`, carried into the approved checkpoint `9e6d46e` and confirmed still closed by independent QA in round 2

### DEF-0106 — a sentence called any non-empty history "plenty"

- Status: Fixed
- Severity: Major — copy that sounds confident about the wrong scope makes the
  honest uncertainty next to it harder to trust
- Found in: routing 83 / `87e2057`
- Found by: the independent owner-use review (F39, E17)
- Class: **a sentence about a quantity of history the app never measured** —
  D-153's rule, applied to the instance D-153's own round did not sweep.
- Reproduction: load **"One answer, and a lot of silence"** — four records — and
  open Now. It reads _"There is plenty of history here, and none of it says how
  today is going."_ The same sentence appears on a store of **one** record.
- Root cause: the branch tested `history.all.length === 0` and, on anything
  else, said "plenty". The only quantity anything in the branch measured was
  whether there was any history at all.
- Why every existing sweep passed: `no-action-copy.test.ts` was written for
  exactly this class and renders every no-action reason at every block — against
  **one** history, a man three nights short of sleep. On that history
  `nothing-proposed` always has a recovery limiter and always takes the limiter
  branch, so the sentence underneath was never rendered by the instrument built
  to render every sentence. **The catalogue had one axis and the sentence
  branched on two.**
- Repair: the sentence says what the branch above it checked and nothing more —
  _"There is history here, and none of it says how tonight is going."_ No count
  replaces it: `history.all` includes rows that have been superseded and
  retracted, so a number taken from it would need explaining before it could be
  read, and a quantity that needs a footnote is worse than none.
- Regression: `tests/synthetic/history-size-copy.test.ts`, which adds the second
  axis — every reason at every block **at every history size**, including both
  four-record histories and a hundred and twenty-nine.
- Siblings: checked, and one more was found — DEF-0107. The `everything-ruled-out`
  and `nothing-in-reach` sentences were already grounded in what their rejection
  lists counted.
- Fixed in: `582f648`, carried into the approved checkpoint `9e6d46e` and confirmed still closed by independent QA in round 2

### DEF-0105 — a completion three days back settled today's recommendation and disabled every control on it

- Status: Fixed
- Severity: Blocker — the product's single most important interaction was
  unusable on any day within three days of a completion of the same move
- Found in: routing 83 / `87e2057`
- Found by: the independent owner-use review (F43, E02 and E31), confirmed with
  the mechanism located by the product adjudication before any code was written
- Class: **a surface resolving an occurrence's state through an action's
  identity** — D-160. An action has a stable identity, which is what learning
  pools on; each time it is put in front of the owner is a separate occurrence
  with its own day and state.
- Reproduction: load **"Three days since that walk"** — a walk suggested and
  completed on 22 May, read on 25 May with today's own answers given — and open
  Now. Before the repair the card read **"Where this stands — Done"** with all
  five controls inert, on a suggestion the owner had never seen.
- Root cause: `stateOfChosen` (`engine.ts`) matched `(verb, object.id)` across
  `situation.recentMoves` with **no day filter**, and `recentMoves` is a
  three-day window (`situation.ts`, `addLocalDays(moment.now, -3, zone)`).
  `TRANSITIONS.completed` is `[]` and `NowScreen` disables every action not in
  `availableActions(state)`.
- What was **not** wrong, and was not touched: the lifecycle planner.
  `openEpisode` keys on `(target, dayId)` and `planLifecycle` writes correctly.
  The defect was in the display path only.
- What was **not** narrowed: the three-day window. `recent-duplication` and the
  ignoring-is-a-response rule in `evaluate.ts` both need to see beyond today, and
  narrowing the window would have made the test pass by making the evidence
  disappear. The **match** changed.
- Repair: `stateOfChosen` resolves today's occurrence through `openEpisode` —
  the same function `planLifecycle` uses to decide what a tap would do, so the
  state the screen shows and the transition a tap would take cannot disagree.
- **A second bound, found while writing the repair rather than reported.**
  `learning.episodes` is every episode in the record, and
  `view.history.effective` is not filtered by the moment — each caller does that
  in its own words (`assembleTimeline`, `recentChanges`, `growthStandingFor`).
  `recentMoves` carried the bound in the upper end of its window, so switching
  source dropped it: under time travel an episode later on the _same_
  owner-local day could have settled a move the owner had not touched. The
  filter is stated on its own now, with its own regression, and that regression
  fails when the filter is removed. No shipped history reaches this state and
  the library sweep asks `openEpisode` the same question the engine does, so
  neither could have seen it — the case is built by hand.
- Regression: `tests/synthetic/occurrence-identity.test.ts`, six cases: the
  three-day fixture reads `shown` with all five actions available; today's own
  completion still settles today; the older occurrence is still in
  `recentMoves`; and the library-wide sweep asserts, for every history at every
  block, that `decision.state` equals today's episode's state or `shown`, and
  the later-today case above.
  `tests/browser/phase83.spec.ts` reads the card and presses the buttons.
- Proof by reintroduction: "comes back the moment the old match is
  reintroduced" runs the pre-repair matching function, copied from `engine.ts`
  at `87e2057` rather than approximated, against the same situation. It returns
  `completed`, and `availableActions` on it is empty.
- Which automated tests gave false confidence: **all of them.** 1,675 unit,
  contract, synthetic and adversarial tests and 501 browser assertions were
  green before the repair and green after it; not one of them read the state of
  a move on a history whose only completion of that move was on an earlier day.
  `lifecycle.test.ts` covers the planner, which was correct.
- Siblings: swept. `continuing()` in the same file already filtered
  `recentMoves` by day and was correct. `settledRecently` in `constraints.ts`
  uses a deliberate one-day suppression window and is about filtering a
  candidate rather than resolving a state; `refusalsInBlock` is block-scoped.
  The library-wide sweep is what says there is no second instance.
- Fixed in: `582f648`, carried into the approved checkpoint `9e6d46e` and confirmed still closed by independent QA in round 2

### DEF-0104 — a regression test that could not have failed

- Status: Fixed
- Severity: Minor in effect, worth recording in full — **the product was already
  correct**; the guard over it was not
- Found in: Phase 82 / `5dd55cc`, in the round 11 regression written for DEF-0103
- Found by: independent QA round 12, by reading the test rather than running it
- Class: **a test that rebuilds its fixture for the second half of the case.**
  The window-closure case advanced the clock past a completed move's result
  window and asserted the route had gone — but it called `scenario.build()`
  again for the later moment, so none of the lifecycle went forward with the
  clock. There was no completed episode there at all, and the route was absent
  for the trivial reason that nothing had ever been finished. It would have
  passed just as happily if the window never closed.
- Why it matters at GREEN: every other guard in this phase was proved by
  reintroduction, and this one was in the set that ran — its assertion simply
  could not distinguish the repair from its absence. A test in that state is
  worse than no test, because the count includes it.
- Repair: the completed history now goes forward with the clock; the episode is
  asserted to still be present and still `completed`; `outcomeWindowFor` is
  asserted to still return a window; the clock is asserted to be past it; and
  only then is the route asserted gone and the sentence absent.
- Proof: with `domainsWithEvidenceComing` taught never to close the window, the
  hardened case fails. QA's own round 12 probe asserts the same boundary
  independently.
- Fixed in: the Phase 82 GREEN closeout commit

### DEF-0103 — a started move was reported as an answer already arriving

- Status: Fixed
- Severity: Major — Life claiming an answer is on its way for something the
  owner may never finish
- Found in: Phase 82 / `95363ff`; present since the coverage engine was written
- Found by: independent QA round 11 — QA-82-016
- Class: the same as DEF-0102 — a projection modelling another module's rule
  instead of calling it.
- Reproduction: live Preview, **A month of what actually worked**, four `+1 week`
  presses to owner-local 2026-03-19 19:30. Now offers "Spend 15 minutes clearing
  the kitchen". Press **Start it** and nothing else: Life puts Home under
  **Catching up** and says _"An answer is already on its way."_
- Root cause: `domainsWithEvidenceComing` accepted `action-start` alongside
  `action-completion`, while its own comment said _finished_ and
  `outcomeWindowFor` returns undefined until the episode is `completed` — it
  says in its own words that a move started and never finished "is still a
  lifecycle question".
- Repair: the function now collects episodes and asks `outcomeWindowFor` whether
  a result window exists and is still open. The two-day guess it kept beside the
  outcome layer's real window is gone with it.
- Regression: `tests/synthetic/qa-82-round-11.test.ts` — the exact lifecycle,
  started and left, with the episode asserted `started`, `outcomeWindowFor`
  asserted undefined, the route asserted not `normal-life` and Life's sentence
  asserted absent; then the same move completed, proving the window opens, the
  route returns and the sentence comes back; then the clock moved past the
  window, proving it stops; and a declined move, proving a refusal is not an
  answer either.
- Fixed in: the checkpoint that closes QA round 11

### DEF-0102 — Life denied a route while the app was already taking it

- Status: Fixed
- Severity: Major — the app telling the owner nothing could be done about an
  area, on the same screen-pair and at the same moment as it asked him the one
  question that would fix it
- Found in: Phase 82 / `95363ff`; present since the coverage engine was written
- Found by: independent QA round 11 — QA-82-015
- Class: **a projection reading a flag that resembles the capability instead of
  the capability.** The round 10 comment claimed `askable` was "the guide's own
  answer"; it is `worthAsking` from the fact layer, and it was being read
  through `neglected`.
- Reproduction: live Preview at 360 and 430px, **A Thursday with nothing needing
  doing**, four `+1 week` presses to owner-local 2026-04-16 20:30. Life says
  **Needs a check-in** for Health and _"Nothing the app can do on its own will
  bring these back."_ Now displays "How much energy have you got left?" One tap
  on **Plenty** turns Health **Recent**.
- Root causes, stacked: `routeFor` was handed only the **standing** concepts, and
  `energy.current` is not one; and the test over them was `neglected && askable`,
  where `neglected` is about a durable answer that has lapsed and says nothing
  about whether a question exists.
- Extent: QA's probe found 71 scenario/clock/domain contradictions, and reached
  the `a-question` route **zero** times — the route was effectively unreachable.
- Repair: `routeFor` now receives every concept row in the area and applies
  `askable && questionFor(concept) !== undefined` — character-for-character the
  filter `probeSwings` opens with, so the route and the guide select from one
  set.
- Regression: `tests/synthetic/qa-82-round-11.test.ts` — the corpus-wide
  invariant that no area is denied a route while the guide is asking about it;
  QA's reproduction with the question asserted to reach Now and the answer
  asserted to make Health current; the genuine `needs-review` case kept, and it
  is round 10's own Social reproduction; and the shared filter asserted from both
  ends. Six reintroductions run, all six fail.
- Note on what remains open: round 11's probe additionally requires every
  `a-question` row to be the domain the guide is asking about _at this moment_.
  That is not reachable from coverage — see D-156 — and is recorded in the round
  11 handoff for round 12 to settle rather than resolved by weakening the probe.
- Fixed in: the checkpoint that closes QA round 11

### DEF-0101 — Life promised a move the app had no way to make

- Status: Fixed
- Severity: Major — a promise of an app-owned path, on the deployed owner
  surface, contradicted by the same screen's own decision trace
- Found in: Phase 82 / `9bda989`; the projection has routed this way since the
  coverage engine was written
- Found by: independent QA round 10 — QA-82-014
- Class: **a projection describing a capability the code behind it lacks.**
  `routeFor` derived `an-action` from "this domain has something named in it";
  `coverageCandidates` needs a move for the domain and a subject of that move's
  kind, and has three (Home/place, Career/learning-topic, Money/financial-goal).
- Reproduction: live Preview at 360px, QA laboratory, **A Saturday with people
  in it**, +1 week pressed five times to owner-local 2026-08-15 15:30. QA says
  **Nothing here to push you toward**, Moves considered 0, Ruled out 0. Life
  shows Social & Relationships as **Going quiet**, saying both that something
  worth doing may come up on Now and that the app will bring it back on its own.
- Root causes: `routeFor` asking `hasSubject` rather than the generator's own
  capability; and `coverageCandidates` serving only `coverage.mostNeglected`
  while Life makes the promise on every `an-action` row it renders.
- Extent: 21 rows where the most-neglected area had no move (what QA's probe
  reaches), and **117 rows in total** once every promised area is enumerated —
  Health, Social, Fatherhood and Sleep with no move at all, and Home and Career
  ranked behind another area in the same situation.
- Repair: the table moves to `src/intelligence/refreshing.ts` and both sides
  read it. The route additionally requires a subject of the move's own kind and
  excludes a domain the app may never raise of its own accord; the generator
  serves every area the route promised, in registry order, rather than one.
  Nothing was added to the table — the areas with no move fall to
  `needs-review`, which is section 8's fifth preference and is true.
- Regression: `tests/synthetic/qa-82-round-10.test.ts` — the cross-projection
  invariant over every scenario, clock and domain, asserted twice: on the route
  field and on the **rendered Life sentence**; the reported reproduction and its
  Health, Fatherhood and Social siblings; a constructed history where Home keeps
  a subject but loses the one of the right kind; a registry where Home is
  reclassified private so the branch that protects a future table row can
  actually be reached; and the opposite errors — no invented move, no supported
  direction lost. Nine reintroductions run, all nine fail.
- Note on why the green suites passed: the G-007 test reaches `an-action` in
  Career, one of the three supported domains, and stops there. Nothing
  enumerated the domains that can _receive_ the route and asked whether the
  generator could serve each. 1,651 unit tests and a 552-check browser matrix
  were green with the defect deployed.
- Fixed in: the checkpoint that closes QA round 10

### DEF-0100 — the new distinction was read by one consumer of three

- Status: Fixed
- Severity: Major — one rendered bullet contradicting itself, and Life telling
  the owner he had never mentioned an area he had mentioned four times
- Found in: Phase 82 / `c81de7e`; both surviving claims are consumers DEF-0099's
  repair did not reach
- Found by: independent QA round 9 — QA-82-011 reopened, and QA-82-013
- Class: **a distinction added to a projection and read in one place.**
  DEF-0099 gave `DomainCoverage` a `later` count and taught `summary` to use it.
  Two other surfaces answer the same question from the same projection and were
  left deriving the coarser answer.
- Reproductions:
  - **QA-82-011.** At live `c81de7e`, 2026-04-01 19:00 America/Denver, one
    Coverage bullet reads `Sleep & Recovery — unheard, evidence none; nothing
heard at all. Nothing has come in about sleep & recovery at this point. 4
entries here are later than it.` Private opt-in does not change it and
    Diagnostics is not needed to see it.
  - **QA-82-013.** The same clock: Life shows one **Nothing here yet** group
    containing all eleven areas, noted _"You have not mentioned these, and
    nothing is asking you to."_ One week forward the same unchanged records move
    Sleep and Home into **Quiet**, which is what proves the group was produced by
    the clock rather than by an unmentioned record.
- Root causes: `coverageSection` deriving its `HEARD` clause from
  `daysSinceHeard === undefined` alone, and `standingFor` mapping every
  `status === 'unheard'` area to one standing without reading `later`.
- Regression: `tests/synthetic/qa-82-round-9.test.ts` — the **rendered bullet**
  under three selections, asserted to carry neither absolute and both halves of
  the truth; the absolute preserved for an area nothing ever reached, in both the
  prefix and the summary; an area that has been heard from left alone; Life's
  group word kept, its note carrying no _never_ or _have not mentioned_, the
  later areas given a line that names the count, genuinely untouched areas given
  no line so the compact list survives, one note for the whole group whichever
  kind reached it first, and the areas leaving the group once the moment catches
  up. Eight reintroductions run, all eight fail.
- Siblings: enumerated as consumers of the **projection** rather than of the
  reported sentence — everything reading `daysSinceHeard === undefined` or
  `status === 'unheard'`. Those are the two repaired here plus `summary`, which
  DEF-0099 already carried. Insights' coverage cards read `lastEvidenceAt` and
  were repaired under DEF-0097; Direction, Learning and Insights were read at the
  same clock and make no absolute claim.
- Note on why the round 8 guards passed: they asserted `entry.summary`, the half
  that had been repaired, and the whole-document check rejected only `ever come
in` — so the older absolute in the same bullet went through. And
  `life-pages.test.ts` builds every coverage value with `later: 0`, so Life's
  `unheard` branch had never once been rendered with a later record.
- Fixed in: the checkpoint that closes QA round 9

### DEF-0099 — three sentences reached past the moment they were reading

- Status: Fixed
- Severity: Major — a screen that contradicts the panel beneath it, a document
  that contradicts its own record span, and a storage fault the default document
  never mentions
- Found in: Phase 82 / `d3df449`; the first of the three was introduced by
  DEF-0098's repair one round earlier
- Found by: independent QA round 8 — QA-82-010, QA-82-011 and QA-82-012
- Class: **a reading of one moment worded as a claim about the whole record.**
  D-152 separated the reasons a list can be empty; this is the same class one
  level up, in the sentence rather than the list.
- Reproductions:
  - **QA-82-010.** Load **A file with damage in it**, press **−1 week**, open
    Timeline. The panel says _"nothing has been lost and nothing is
    unreadable"_ directly above six rows reading _"could not be read"_.
  - **QA-82-011.** The same clock, Data with the ordinary sections: the header
    says `Record covers: 2026-04-05 to 2026-04-08, 5 entries`, Recent record says
    five entries are later, and Coverage says _"Nothing has ever come in about
    sleep & recovery"_ — where four of those five entries are Sleep readings.
  - **QA-82-012.** Two readable records whose `supersedes` pointers form a cycle.
    `resolveHistory` holds both back and reports two `supersession-cycle`
    issues; `assembleTimeline` returns `tangled: 2, unreadable: 0`; Recent record
    emits only _"There are no entries to show here."_
- Root causes, three: an unconditional clause in `TimelineScreen`'s later-history
  panel; `describe()` in `coverage.ts` wording the `unheard` status as an
  absolute when `evidenceByDomain` had correctly skipped later records; and
  `historySection`'s fault block iterating `timeline.unreadable` while
  `timeline.tangled` sat beside it unread.
- Regression: `tests/synthetic/qa-82-round-8.test.ts` — the tangle reaching the
  timeline as a tangle rather than an unreadable row; both of its faults reported
  in Recent record under all three selections, as two lines rather than one
  summary; the default document specifically, because Diagnostics is not in it;
  no invented day heading or entry count; a clean history growing no fault
  section; the later-panel source carrying no absolute about readability while
  keeping its reassurance; both facts stated in the document without either
  denying the other; `DomainCoverage.later` counted without becoming current
  evidence; the absolute preserved where nothing ever did arrive; and a
  cross-line check that no area named in the record span is called never-heard in
  the same document. Nine reintroductions run, all nine fail.
- Siblings: the other empty paths QA named were pressed in the same document and
  do not make the absolute claim — Direction states the current direction is
  unset, Learning says the record does not support a relationship and explicitly
  declines to equate that with nothing to find, and Insights says nothing
  _currently_ rises to a stated reading. Coverage was the one that did.
- Note on what the round 7 tests could not see: they proved future count, damaged
  count and coordinates as separate facts and never rendered the combined
  sentence, and their replacement-cycle coverage checked `later === 0` only for
  stores with no tangle in them. That is why the new guards read whole section
  bodies and compare words against the other words in the same document.
- Fixed in: the checkpoint that closes QA round 8

### DEF-0098 — an empty display was read as an empty or unreadable store

- Status: Fixed
- Severity: Major — a document that mentions a real storage fault nowhere, and a
  screen that blames the owner's file for the clock he moved
- Found in: Phase 82 / `4403a3f`
- Found by: independent QA round 7 — QA-82-009, seven variants of one path
- Class: **an empty list read as a claim about the store.** Four different
  situations produce nothing to display — an empty store, a store whose only
  rows are damaged, a store whose readable rows are all later than the moment
  being viewed, and a scoped store whose readable rows were all withheld — and
  two surfaces collapsed them into one.
- Reproduction: load **A file with damage in it**, press **−1 week**, reaching
  2026-04-01 19:00 America/Denver. Timeline says _"Nothing in what was loaded
  could be read. That is a problem with the file rather than an empty history"_
  over five records that parsed perfectly and are dated 5–8 April. Data →
  Select all emits `## Recent record` / `_Nothing in the record for this._` and
  no fault list; with Diagnostics off, the document mentions the six damaged
  rows nowhere.
- Root cause: `historySection` returned `NOTHING_HERE` when `days.length === 0`,
  before the unreadable-row block; and `TimelineScreen` derived
  `nothingReadable` from `data.total === 0`, which `assembleTimeline` computes
  after filtering entries to the moment being viewed.
- Regression: `tests/synthetic/qa-82-round-7.test.ts` — the three empty
  displays × three selections all describing both faults and their
  coordinate-omission explanation; the default selection specifically, because
  Diagnostics is not in it; the withheld and damaged-only sections asserted
  **identical**; the empty-state sentence asserted to be present and to give no
  reason; later history said to be later; an empty store still saying nothing;
  and `later` counted from readable records rather than from damaged rows. Plus
  `tests/browser/qa-lab.spec.ts` — "does not blame the file for history that has
  simply not happened yet", which walks the deployed reproduction. Eight
  reintroductions run, all eight fail.
- Siblings: enumerated from the same question — _what else reads an empty list
  as a claim?_ `TimelineData.shown` and `total` are used for the "Show earlier"
  control, which is correct: it is about paging, not about existence. Diagnostics
  counts from the store rather than the display and was right throughout, which
  is exactly why it hid the defect from a reader who had it selected.
- Note on a guard that could not see a disclosure: reintroducing _"and some were
  left out of this document"_ into the private-off empty sentence passed every
  paired comparison in the suite, because a sentence said on both sides of a pair
  cannot be seen by comparing them. The guard that catches it asserts that no
  reason is given. That is a limit of paired testing worth keeping in view, and
  the fifth time this phase a reintroduction found what reading the test did not.
- Fixed in: the checkpoint that closes QA round 7

### DEF-0096 — a document that left the private area out still reported its size

- Status: **Reopened twice. Closed at the store in round 5, and at what a
  retained row carries in round 6.** Three passes are recorded here because the
  shape of the misses is the useful part.
- Reopened again by: independent QA round 6 — QA-82-007, five variants of one
  metadata channel
- What the second repair missed: `withheldFrom` removes private records,
  entities and unreadable rows, so every count and conclusion became a fact
  about the record the owner chose to share. It cannot remove metadata a
  **retained** row brought with it. A malformed row keeps its own `index`, and
  Recent record printed `Record row 19`. One private record ahead of it made the
  same line read `Record row 20`; three made it `Record row 22`; a private
  _entity_ moved `Entity row 2` to `Entity row 3`. A private row inserted
  **after** the broken one changed nothing, which is what localised the channel
  to original positions rather than to detail or totals.
- Third root cause: `timelineEntries.ts` turned `index + 1` into the row's
  label and `compose.ts` printed it. The position is a coordinate into the
  owner's file, and a review export does not describe his whole file.
- Third repair: the coordinate stays on the owner's own Timeline, where the file
  is. The export names the row by what it is and says once that the position is
  on his screen rather than in the document. **D-151.**
- Why the survivors are not renumbered: `snapshotFromWire` carries a malformed
  row's `index` through a backup verbatim, so a restored row's position refers
  to some previous file's array. Subtracting today's removals from it would
  produce a false claim about the file — the defect D-091 forbids, in place of
  the privacy one. This is asserted in the regression rather than argued.
- Third regression: `tests/synthetic/qa-82-round-6.test.ts` — a **sweep** that
  inserts a private record at every index of the record array and a private
  entity at every index of the entity array, with an unreadable public row
  present, and requires the private-off document to be identical every time;
  the same sweep with an unreadable _private_ row as the thing inserted; a
  malformed row whose position came out of a backup; the storage fault still
  reported and still described; the two lists still told apart; the explanation
  present; opt-in unchanged; and the coordinate still on the owner's screen.
  Plus an architecture guard that fails the build if any export file reads
  `UnreadableRow.where`, and a browser assertion that the owner's screen still
  shows it. Nineteen reintroductions run, all nineteen fail.
- Why the second regression could not see it: it added private objects to clean
  histories, or put an unreadable private object last and checked it was gone.
  None kept an ordinary unreadable row _after_ a removed private one, so nothing
  ever compared a survivor's label across a removal.
- Note on a guard that was blind, found by running the mutation: removing the
  coordinate from the **owner's** screen broke nothing. The architecture guard
  matched `row.where` in a React `key` prop and was satisfied; no test read the
  rendered row. The browser suite now asserts the text. That is the fourth time
  this phase a reintroduction found what reading the test did not.
- Fixed in: the checkpoint that closes QA round 6. The round 5 and round 4
  entries below stand as written.

### DEF-0096 (round 5) — the second pass, at the store

- Status: Superseded by the entry above
- Severity: Blocker
- Reopened by: independent QA round 5 — QA-82-007, five constructed
  paired-history cases. The round 4 repair was correct in the four places it
  looked and absent in five more.
- What the round 4 repair missed: it filtered **renderers**. Diagnostics counted
  the records it was allowed to count, the timeline took its page from what it
  was allowed to show, the supersession list dropped entries pointing at
  withheld records — and `directionSection`, `correctionsSection`,
  `learningSection`, `insightsSection` and `nowSection` were handed the whole
  history and the finished decision and were never filtered at all. So a
  private-off document printed a private goal's statement and a private
  commitment verbatim, printed the reason a private answer was withdrawn, and
  published relationship counts, date spans and trends computed entirely from
  private readings.
- The case that settles where the boundary belongs: a private observation of
  the owner's energy outranks the public one beneath it, and the suggestion
  changes from ten minutes with Adaya to a light day — along with its reason,
  subject, follow-up, limiter, trace score and ranking. **There is no filter
  over a finished decision that unmakes it.** Withholding only the fact row
  leaves the conclusion standing with its evidence removed, which is what
  D-091 exists to prevent.
- Second root cause: `composeExport` composed from the caller's objects, which
  are the ones the owner's own screens render — the whole history, the whole
  decision, the whole insights report. It now withholds once at the store
  (`src/features/export/scope.ts`) and runs the app's own pipeline over what is
  left, declaring in the document that it has done so. **D-150.**
- Second regression: `tests/synthetic/qa-82-round-5.test.ts` — a table of
  private things **by kind**, each reaching a different section, asserted to
  change nothing about a private-off document: a goal with its subject and a
  commitment; a withdrawal and its reason; a supersession pointing at nothing; a
  subject nothing refers to; unreadable rows naming the area in the singular, in
  the plural, and by privacy alone; three carrying only one of the two privacy
  facts; a reading the decision would otherwise have used; and the readings a
  relationship was learned from. Plus the other direction — opt-in restores
  detail and counts, the public record stays whole, the document says what it
  was worked out from, an unclassifiable unreadable row is still reported, and
  the owner's own store is untouched. Fourteen reintroductions run, all
  fourteen fail, none by a module-load or type error.
- Why the first regression could not see it: it injected one inert
  `privatePattern` observation into all 24 histories and asserted paired
  equality. That record is not a goal, not a correction, not a reading anything
  decides from and not one side of a learned relationship, so it reaches none
  of the five leaking paths. **A paired-history property only covers the
  sections the private data can actually reach** — QA's sharpest sentence this
  phase, and the reason the new table is a table of kinds.
- Siblings, second pass: `claimsWithheld` read a record's plural `domains` and
  not an entity's singular `domain`, so a malformed entity naming the private
  area was counted. Both shapes are read now, and the one-way trust is
  unchanged: a row that says nothing about its area is still reported.
- Fixed in: the checkpoint that closes QA round 5. The round 4 entry below
  stands as written; nothing in it was wrong, and all of it was insufficient.

### DEF-0096 (round 4) — the first pass, at the renderers

- Status: Superseded by the entry above
- Severity: Blocker — the participation fact a private record's discretion
  exists to protect, disclosed under an explicit promise not to, in the document
  **Select all** produces
- Found in: Phase 82 / `da31c6d`
- Found by: independent QA round 4 — QA-82-007
- Class: **a section that describes the store rather than the document.** Every
  other builder takes the `ExportHeader` and asks what this document may
  describe; `diagnosticsSection` took only the request. So the rule in D-098 was
  implemented in the places that had been thought about and absent in the one
  that had not — the third time this phase that a boundary was correct where it
  was looked at.
- Reproduction: load **Two ordinary weeks** on the deployed Preview, open
  More → Exports, press **Select all**, and leave Private / Sexual Health
  unchecked. The document promises _"Nothing below says anything about that area
  in either direction"_ and then reports `Store: 19 records` where the same
  history without its one private record reports `18`, `Records still standing
after corrections: 19` against `18`, and `Recent private pattern — never
answered`. The label appears in **23 of 24** library histories; the exception
  is the one where the private fact is actually known.
- Root cause: `diagnosticsSection(request)` read `snapshot.records`,
  `snapshot.entities`, `summary.effective`, `summary.displaced`,
  `summary.byLocalDay`, `history.issues` and `facts.inState('unknown')`
  directly. Separately, `historySection` filtered the private rows out of a page
  `assembleTimeline` had already chosen from the whole history, so a withheld
  record consumed one of the forty slots and the section rendered thirty-nine.
- Regression: `tests/synthetic/qa-82-round-4.test.ts` — "composes the same
  document with the private record and without it", "holds for every history in
  the library, not only the one that has a private record", "counts no private
  entity, and no unreadable row that says it is private", "reports no tangle
  that only a withheld record is in", "names no private concept, and not merely
  the one private concept there is", "withholds a private concept filed outside
  the private area", "still says the counts, and still says what it is not
  counting", "gives all of it back when the owner asks for it deliberately",
  "leaves the owner's own raw memory alone";
  `tests/synthetic/export-honesty.test.ts` — "says nothing about the private
  area on <id>", per scenario, with the forbidden labels read from the registry;
  `tests/browser/phase82.spec.ts` — "says nothing about the area it says it is
  leaving out"; and four new deployed Android checks. Eight reintroductions run,
  all eight fail.
- Siblings: enumerated rather than searched for, and the paired-history property
  is what enumerated them. Two were found that QA had not named and that no
  existing test could see: the **timeline page**, above, and the **supersession
  issue list**, where a dangling reference on a withheld record reported that
  there is an entry in the area the document had just promised to be silent
  about. `coverageSection` and `historySection` already consulted the header;
  `coverageCards` in `insights.ts` already excluded the private domain of its
  own accord.
- Note on what the guard could not see at first: the reintroduction that removes
  the issue-list filter **passed**. No library history has a supersession
  problem involving a private record, so the list could be left reading the
  whole history and nothing noticed — DEF-0094's shape one field over, found by
  running the mutation rather than by reading the test. The guard now constructs
  that history.
- Note on the repair QA forbade: private facts are not suppressed in the owner's
  raw memory, diagnostics are not removed, and the exclusion promise is not
  weakened. Section 11's rule that discretion is a display decision and never a
  storage decision is intact, and the counts survive with a sentence saying what
  they are of — stated before them, because a document is read in order.
- Fixed in: the checkpoint that closes QA round 4

### DEF-0097 — six ways of not knowing were printed as one

- Status: Fixed
- Severity: Major — a document contradicting itself about whether a question was
  ever asked, on a surface that asks its reader to treat it as the source of
  truth
- Found in: Phase 82 / `da31c6d`
- Found by: independent QA round 4 — QA-82-008
- Class: **a fallback that is the whole behaviour.** `UnknownReason`
  distinguishes never-observed, retracted, contradicted, lapsed, not-applicable
  and malformed; two surfaces rendered `state === 'unknown'` as one sentence and
  never read the reason at all. Four of the six sit on top of an answer the
  record actually holds, so the sentence was false for four of them.
- Reproduction: load **One answer, and a lot of silence** at 07:00 and compose an
  export with Now, Recent record and Diagnostics. The same document says
  `Withdrawn: Withdrew an earlier entry — Tapped the wrong row`,
  `Soreness or pain — not known — retracted` under what it read to decide, and
  `Soreness or pain — never answered` under what it does not know. **Second
  thoughts, kept honestly** loses its retracted emotional-state reason the same
  way.
- Root cause: the loop over `facts.inState('unknown')` in `diagnosticsSection`
  hard-coded `never answered` and discarded `Knowledge.reason`. In
  `insights.ts`, `coverageCards` reached the same sentence from a different
  field: `lastEvidenceAt` is undefined for every unknown reason, not only for
  the one that means nobody ever asked.
- Regression: `tests/synthetic/qa-82-round-4.test.ts` — "reads every reason as a
  different thing", "keeps the specifics the fact layer left, and the future-only
  note", "never calls a withdrawn answer one that was never given", "never says
  it of any library history, for any reason but the one", "reaches contradicted,
  lapsed and malformed through real records", "leaves the honest unknown list
  full", "says the same thing on Insights as in the document";
  `tests/unit/architecture-guards.test.ts` — "is a table over the reasons, so a
  new reason cannot be forgotten", "is not hand-written anywhere else", "bites on
  a reintroduction of the sentence it forbids";
  `tests/browser/phase82.spec.ts` — "says why it does not know, rather than one
  sentence for every reason"; and two new deployed Android checks. Four
  reintroductions run, all four fail.
- Siblings: `insights.ts` was found by asking who else turns "no evidence" into
  a sentence, and it is the only other one. The QA laboratory's fact browser and
  `ConsideredFact.reading` already carry the reason and are untouched — QA named
  both as preserving the distinction. `describeUnknown` is now the only place
  the sentence is written, and an architecture guard fails the build if a
  surface composes its own.
- Note on the three reasons the library never produces: contradicted, lapsed and
  malformed are reached in the regression through **real record resolution** —
  two readings at one instant, an expired bounded context, an unreadable row —
  rather than by handing the composer a `Knowledge`. A test that injects the
  state proves the sentence and not the path to it.
- Note on what was deliberately not shortened: the unknown list. Naming a reason
  must not remove a line, and the regression walks every concept the owner can
  answer to assert it is still there.
- Fixed in: the checkpoint that closes QA round 4

### DEF-0094 — the review export said the app had never answered a question it had just answered

- Status: Fixed
- Severity: Blocker — one generated document contradicting itself about one
  fact, on a surface that explicitly asks its reader to treat it as the source
  of truth
- Found in: Phase 82 / `da1a4ee`
- Found by: independent QA round 3 — QA-82-005
- Class: **a surface that reads raw fact state rather than the decision, for a
  concept no record can carry.** The fact layer seeds an entry for every concept
  in the registry so that a concept nothing has been said about still resolves
  to a _known_ unknown — which is right for everything the owner can answer and
  wrong for a derived one. `coverage.ts` had its own exclusion for that;
  `compose.ts` did not; and the next surface to walk the same list would not
  have known it needed one either.
- Reproduction: load **A school morning** on the deployed Preview, advance to
  10:20, open More → Exports. Under _What it read to decide that_: **"Child here
  right now — No — Adaya's school day is on until 15:00. (inferred)"**. Under
  _Things the app knows it does not know_: **"Child here right now — never
  answered."**
- Root cause: `resolveFacts` seeds `conceptIds` from `concepts.all()`. Nothing
  writes a record for `family.child-here-now`, so it resolved as `unknown`
  permanently, and `situation.view.facts.inState('unknown')` handed that to the
  export's diagnostics and to the QA laboratory's fact-state browser.
- Regression: `tests/synthetic/qa-82-round-1.test.ts` — "does not say the app
  never answered something it worked out", "never states a reading and lists the
  same concept as unanswered", "never manufactures an unanswered fact for
  something no record can carry", "excludes any derived concept, not the one
  that happens to exist", "still says the app has not heard about the things it
  genuinely has not", "leaves a history with no child alone entirely";
  `tests/synthetic/export-honesty.test.ts` — "never answers a question and
  disowns it", per scenario; `tests/browser/phase82.spec.ts` — "does not disown
  the reading in the document it puts it in". Four reintroductions run, all four
  fail.
- Siblings: enumerated rather than searched for, and the enumeration is the
  test. Every consumer of raw fact state was checked against a derived concept:
  `facts.get`, `inState('unknown')`, `facts.questions` (`worthAsking`), the
  coverage rows, and the guide. `worthAsking` and the guide were already clean
  because a derived concept has no question spec; coverage had its own
  exclusion; the export and the QA fact browser did not, and both are fixed by
  the single change at the fact layer.
- Note on where the fix went, and why not in the export: the export was the
  symptom. The one place that knows a concept cannot be recorded is the layer
  that resolves records, so that is where the exclusion lives. `coverage.ts`
  keeps its own because it walks the registry directly rather than the fact
  layer — two guards for two different traversals, not one guard written twice.
- Note on what the first version of the regression missed: reintroducing a
  narrower fix — excluding `family.child-here-now` by id rather than every
  derived concept — **passed**, because that concept is the only derived one
  today. The guard now exercises the rule against a registry extended with a
  second, invented derived concept, and confirms an ordinary invented concept is
  still seeded. Found by running the reintroduction rather than by reading it.
- Fixed in: the checkpoint that closes QA round 3

### DEF-0095 — a documentation commit went out without the gate being re-run

- Status: Fixed
- Severity: Major — the handoff named CI green at a head where CI was red
- Found in: Phase 82 / `e302394`
- Found by: independent QA round 3 — QA-82-006
- Class: **a gate run before the last commit rather than on it.** `npm run
verify` and CI were both run and both green, and then one more
  documentation-only commit was made and neither was run again. The handoff then
  reported the earlier head's results as the handoff head's.
- Reproduction: `npm run verify` from a clean tracked tree at `e302394` stops at
  `format:check` on `docs/qa/README.md`. CI run `32889209473` failed the same
  job on the same file.
- Root cause: the content was one emphasis marker — `*"…"*` where Prettier wants
  `_"…"_` — which is exactly why it is worth recording. The defect is not the
  marker; it is that a docs-only change was treated as not needing the gate, and
  that component results from an earlier head were reported as the aggregate
  result for a later one.
- Regression: the gate itself, run in the right order. There is deliberately no
  new test: a test cannot assert that somebody ran the gate. What changes is
  **D-147**, which states the finishing condition — the aggregate `npm run
verify` from a clean clone of the tracked head, and CI green at that exact
  SHA, both after the last commit — and the handoff now names the head those
  results came from so a wrong claim is checkable rather than plausible.
- Siblings: checked. The other builder-owned documents are Prettier-clean, and
  `npm run format:check` covers the whole tree rather than a list of paths, so
  the instrument was never the problem.
- Fixed in: the checkpoint that closes QA round 3

### DEF-0092 — every touch target was specified at exactly the size the gate measures against

- Status: Fixed
- Severity: Major — a mobile gate that reports a different result on the same
  bytes cannot be acted on, and it hid a real undersized control (DEF-0093)
- Found in: Phase 82 / `0899f18`
- Found by: independent QA round 2 — QA-82-004
- Class: **a threshold and the thing it measures written as the same number.**
  Fifteen declarations of `min-height: 2.75rem` — 44px — against an Android gate
  asserting `>= 44`. At a device pixel ratio of 3 the measured height of the
  growth-stage control came back as `44.00006103515625`, so which side of the
  requirement it landed on was decided by subpixel layout rather than by the
  design. It is not a flaky test; it is a design with no margin, measured
  exactly.
- Reproduction: the deployed Android gate against `8e2e588` exited non-zero at
  125/126 for QA on "the growth stage clears 44px of thumb". The same command
  against the same deployment reported 126/126 here. Measured directly, the
  control is `min-height: 44px` rendering at `44.00006103515625`.
- Root cause: two, and they compound. The product wrote the accepted minimum as
  its own target size, in fifteen places, so there was no margin anywhere. The
  gate then stated three different numbers for one standard: two checks were
  _named_ "clears 44px of thumb" and asserted `>= 40`, four asserted `>= 44`,
  and every one of them printed the measurement through `Math.round` — so the
  failing run's own diagnostic said the control was "44px tall" beside a
  predicate that had just rejected it for being under 44.
- Regression: `tests/unit/architecture-guards.test.ts` — "clears the gate's own
  threshold with room to spare" reads `--touch-target` out of `tokens.css` and
  `THUMB` out of `android-gate.mjs` and requires the first to be strictly
  greater; "is the only place a target size is written down" sweeps every
  stylesheet; "the gate reports the measurement it tested, unrounded" forbids a
  rounded height in a threshold diagnostic and a hand-written threshold beside
  the named one. Five reintroductions run, all five fail.
- Siblings: found by the guard on its first run, and both were real. One control
  was declared `min-height: 44px` rather than `2.75rem` — the same number in a
  different unit, which is how a sweep for one misses the other — and one was
  36px under a comment claiming it was a real touch target (DEF-0093). Every
  target now reads `var(--touch-target)`, which is 48px.
- Note on the choice of 48: it is the comfortable-target size in the mobile
  guidelines and it clears the gate's 44 by four pixels, which is the smallest
  margin that cannot be erased by rounding at any device pixel ratio the app is
  likely to meet.
- Fixed in: the checkpoint that closes QA round 2

### DEF-0093 — the control on every screen was 36px, under a comment saying it was a real target

- Status: Fixed
- Severity: Major — an undersized target on the app shell, reachable from every
  screen in the product
- Found in: Phase 82 / `0899f18`
- Found by: the class guard written for DEF-0092, on its first run
- Class: DEF-0092's, and the reason that class matters. `.topbar__more` carried
  `min-height: 2.25rem` — 36px — with the comment _"Section 37 — a real touch
  target, not a 16px glyph in a corner."_ The comment was the whole defence, and
  it was wrong by eight pixels.
- Reproduction: the overflow control in the top bar, at any width. Nothing
  measured it: the Android gate checks the controls the phase under test added,
  and this one has been there since Phase 2.
- Root cause: the number was written by hand rather than read from anywhere, so
  it was free to be any number, and the comment beside it was never checked
  against it. That is exactly what the token exists to stop.
- Regression: `tests/unit/architecture-guards.test.ts` — "is the only place a
  target size is written down". Reintroducing `2.25rem` fails it.
- Siblings: the sweep is the check. Every `min-height` and `min-width` on a
  control in every stylesheet now reads the token or fails the build.
- Fixed in: the checkpoint that closes QA round 2

### DEF-0089 — a standing custody arrangement was read as a claim that she was in the room

- Status: Fixed — **reopened once.** Round 2 found the repair had reached the
  decision path and none of the surfaces that render the concept registry. What
  round 1 did is recorded first; the round 2 half follows it.
- Severity: Blocker — a false statement about where the owner's daughter is, on
  the primary surface, at a moment he can see out of the window is wrong
- Found in: Phase 82 / `160ec9a`
- Found by: independent QA round 1, gate item 4 — QA-82-001
- Class: **one field carrying two meanings, and every consumer believing the
  wrong one.** `Situation.childPresent` is the durable custody arrangement:
  whose week it is, answered once, never re-asked (section 62). Five separate
  places read it as a claim about the room — the generator, the filter, the
  premise, the context the learner compares evenings on, and the trace beneath
  all of them — so the app was wrong about her for the six and a half hours of
  every weekday a school day differs from a weekend, not on one line at one
  hour.
- Reproduction: load "A school morning" and advance the clock to 10:00 on the
  Wednesday. The premise read _"Wednesday morning, 8 hours of sleep, Adaya is
  here."_ and the headline read _"Spend the next 30 minutes with Adaya, phone
  away."_, while the Life page beside it listed her school day as 08:30 to 15:00.
- Root cause: the concept was written in Phase 1 for a full-custody arrangement
  that changes weekly, and Phase 82 added the first fact in the model capable of
  contradicting it — an obligation belonging to somebody other than the owner.
  Nothing brought the two together, and nothing had to: `Obligation` did not
  record whose span it was, so a school day was a shape in the day with nobody
  in it.
- Regression: `tests/synthetic/qa-82-round-1.test.ts` — "does not say she is
  here during her own school day", "does not offer a move that needs her while
  she is at school", "keeps the arrangement itself, and never re-asks it",
  "agrees with itself about her at every hour of the school day", "never invents
  presence the record does not carry", "writes it on the path the owner actually
  takes", "removes it, and says which span took her"; and in the browser,
  `tests/browser/phase82.spec.ts` — "stops claiming she is here once her school
  day has started". Seven separate reintroductions were run and each fails.
- Siblings: enumerated rather than searched for. `Situation.childHere` is worked
  out once in `assembleSituation`, and every consumer of presence now reads it:
  `candidates.ts` (the generator), `constraints.ts` (the filter),
  `explain.ts` (the premise), and `contextFor`, which is what `learning.ts`
  compares evenings on — two evenings resemble each other by who was in the
  house, and a standing arrangement is not an answer to that. The record itself
  is untouched: `childPresent` is still explicit, still true, and still never
  re-asked.
- Note on what the repair must not break: her school day is **hers**. Reading it
  as time the owner is busy would silence the app through the five hours of a
  full-custody week he is most able to do something, which is the opposite of
  what AUD-0004 asked for. Asserted directly.
- Fixed in: the checkpoint that closes QA round 1
- **Round 2 — what the first repair missed.** The class was stated as "one field
  carrying two meanings, and every consumer believing the wrong one", and then
  only the consumers that make a _decision_ were repaired: the generator, the
  filter, the premise and the learning context. The concept's own identity was
  left exactly as it was — labelled `Child with the owner`, read `for whether
she is here today` — so every surface that renders the registry rather than
  the decision went on presenting the durable custody record as the answer to
  where she was. On the deployed build at 10:20 the QA laboratory's fact ledger
  read _"Child with the owner · known — yes — for whether she is here today"_
  and the Fatherhood page read _"Child with the owner — yes"_, one tap from a
  Now screen that had just been repaired to say her school day ran until three.
  A registry is a generic surface: repairing the readers one at a time cannot
  reach it, and there is no list of readers to finish, because the next one has
  not been written yet.
- **Round 2 — the repair.** The identity is now two concepts.
  `family.child-present` is relabelled `Child in the owner’s care today` and
  read `for whether she is in your care today`, which is the question the guide
  actually asks and the answer the durable record actually holds — she is in his
  care all day on a day that is his, school included. `family.child-here-now`
  — `Child here right now` — is the narrowed reading, carried on the decision
  and rendered by the same generic surfaces, and it names the span: _"No —
  Adaya’s school day is on until 15:00."_ `ConceptDefinition.derived` is what
  makes the second one safe: never asked (no question spec, and `guide.ts`
  cannot ask what has none), never counted as coverage (nothing writes a record
  for it, so measuring its age would report permanent neglect of a fact the
  owner cannot supply — DEF-0015's class), and never correctable (a correction
  typed on a conclusion would write a record nothing reads, and on that page
  would read as changing the arrangement underneath).
- **Round 2 — regression.** `tests/synthetic/qa-82-round-1.test.ts` — "shows the
  arrangement and the reading as two different things", "puts the reading on the
  Fatherhood page beside the arrangement", "never shows a presence claim the
  decision does not hold"; `tests/browser/phase82.spec.ts` — "says the same
  thing about her on the fact ledger and the domain page"; and six new checks in
  the deployed Android gate. Six reintroductions run, all six fail.
- **Round 2 — siblings.** The export composer renders `usedFor` from the same
  facts and is fixed by the same change. `life-domain.spec.ts` was correcting
  the arrangement through the old label and now names the new one, which is the
  point: the row he corrects is the one he answered.

### DEF-0090 — the evidence panel for a held decision explained the move it was not offering

- Status: Fixed
- Severity: Major — the one surface that exists to answer _why this?_ said
  nothing about the decision on screen
- Found in: Phase 82 / `160ec9a`
- Found by: independent QA round 1, gate item 4 — QA-82-002
- Class: **a surface built for one decision kind, reused for another without
  asking what the question had become.** On a `move`, "See evidence" answers
  why that move; on a `hold` the app is declining to offer the move, so the
  question is why not yet — and every field on the panel was about the move.
  The conditions came from the held candidate's `leansOn` list, which is a list
  about the move and cannot answer a question about the hour.
- Reproduction: load "Before the house is up" (05:30), open Now, tap "See
  evidence". The panel led with "What this rested on this morning: Usable time
  now — Not known yet; Child with the owner — yes", under a headline reading
  _"The morning suits Adaya better than now."_ Nothing on the panel mentioned
  the morning, the room in it, or why now was refused.
- Root cause: the fifth Now state was added in this phase and the panel was not
  revisited. `evidenceForDecision` reads everything off the decision, which is
  correct and is why it kept working — the deferral simply was not on the
  decision to read.
- Regression: `tests/synthetic/qa-82-round-1.test.ts` — "answers the deferral on
  the panel that exists to explain the decision", "says nothing about a deferral
  where there was none", "answers for every decision kind the library can
  reach", "holds it to somewhere, and never argues for doing it now"; and
  `tests/browser/phase82.spec.ts` — "says why later rather than now when the
  owner asks". Four reintroductions run, each fails.
- Siblings: the class check is the enumeration itself. Every `Decision['kind']`
  the library reaches is now asserted against what the panel owes it: a `move`
  gets a panel and no deferral, a `hold` gets a panel and a deferral, and
  `no-action` correctly gets no panel because Now carries its own explanation
  for a night with nothing on it. A fourth kind fails the test the day it exists.
- Note on where the words are written: in `arbitrate.ts`, beside the conditions
  they describe, and quoted by the panel unchanged. Section 51 forbids a
  parallel explanation truth and the cheapest way to honour it is for there to
  be nothing to disagree with.
- Fixed in: the checkpoint that closes QA round 1

### DEF-0091 — a move that fitted exactly was told it would not fit

- Status: Fixed — **reopened once.** Round 2 found the near-fit sibling
  surviving inside the band round 1 created.
- Severity: Major — the app contradicting its own figure, in the trace the
  inspector reads and the score the ranking uses
- Found in: Phase 82 / `160ec9a`
- Found by: independent QA round 1, gate item 4 — QA-82-003
- Class: **a band whose sentence is not true of its own range.** `time-fit` had
  three bands and the third covered everything above 0.8, so it had to pick one
  sentence for two different facts: "this will use everything you have left" and
  "this will run past the thing you have to be at". Those are different
  statements about a move, they deserve different scores, and the owner acts on
  them differently — the first is a choice and the second is not one.
- Reproduction: load "A school morning" at 08:20, ten minutes before her school
  day. Every move is trimmed to ten minutes by `sizeFor`, and every one of them
  carried `time-fit 0 — "would not fit before Adaya's school day"`.
- Root cause: the note was written for the far end of the band and the near end
  was never looked at. Nothing in the scenario library sat at a share between
  0.8 and 1 until this phase gave the engine an obligation to count down to.
- Regression: `tests/synthetic/qa-82-round-1.test.ts` — "does not say a
  ten-minute move will not fit in ten minutes", "still says so when a move
  genuinely does not fit", "never tells the owner a move will not fit when it
  does, at any hour", "reaches all four bands, so none of them is a guard
  nobody checks". Both reintroductions run, both fail.
- Siblings: the sweep is the check. The approach to her school day is walked
  minute by minute from 08:00 to 08:35, which crosses all four bands, and every
  `time-fit` note in the library at every block is compared against the two
  figures the dimension was given. A note and a score that drift apart again
  fail on the next run rather than on the morning somebody reads it.
- Note on the score, which was the same defect in the number: an overrunning
  move used to abstain, so a move that cannot be finished ranked level with one
  that fits exactly. It now scores −0.5. The band is reachable and it is worth
  saying why it is not obvious that it is: `constraints.ts` already removes a
  move longer than the free time the owner **stated**, but `inHand` is the
  smaller of that and what the day allows, and `sizeFor` floors a move at five
  minutes. Three minutes before the school run, a five-minute move arrives at
  the evaluator with three minutes to do it in.
- Fixed in: the checkpoint that closes QA round 1
- **Round 2 — what the first repair missed.** Round 1 split "does not fit" off
  the top of the band and left everything from four-fifths to all of it saying
  _"would use all the time before Adaya's school day"_. At 08:18, with twelve
  minutes before her school day and a ten-minute recall session,
  `opportunity-cost` said the move takes about 83 percent and `time-fit` said it
  would use all of it — two of the app's own figures about one move, one row
  apart. The reason the round 1 guard could not see it is worth writing down:
  it compared the words against the minutes only for "would not fit", because
  "all" was not a claim it knew how to check, and it separately asserted that
  four note strings were reachable. Both questions had the right answer.
- **Round 2 — the repair.** Five bands, and the top three are decided by
  comparing the two figures the sentence is actually about rather than by the
  ratio: `minutes > left` does not fit, `minutes === left` uses all of it, and
  the rest of the near range uses most of it. Only "fits" and "fits comfortably"
  — which genuinely are claims about proportion — are still chosen by the share.
  The score judgement from round 1 is deliberately unchanged.
- **Round 2 — regression.** `tests/synthetic/qa-82-round-1.test.ts` — "says
  \"all\" only when the move uses every minute there is" (the report's own
  10-of-12 reproduction) and "never disagrees with the percentage printed beside
  it", which checks each sentence against the percentage the app prints one row
  below it, swept minute by minute through the approach and then across the
  library. Three reintroductions run, all three fail.

### DEF-0087 — the trigger that means "nothing raised this" asserted that nothing else was pressing

- Status: Fixed
- Severity: Major — an owner-facing falsehood of a class this file already
  holds twice, on the primary surface
- Found in: Phase 82 / package 3
- Found by: the first scenario in the library with a career move and no career
  goal, on its first run — `study-thread`
- Class: **an absence asserted from ignorance** — DEF-0012's family, and the
  third member of it in the same file. "Nothing else is pressing" reads as a
  finding about the owner's life and is a statement about how little the engine
  could see: `nothing-better` means nothing raised this candidate in
  particular, which is a fact about the catalogue.
- Reproduction: any history with a `career` learning topic and no active career
  goal. `explain.ts:653` rendered `Nothing else is pressing, and subnetting
pays back tomorrow.` on Now.
- Root cause: the branch was written before either of its siblings was
  repaired, and no history in the scenario library reached it. Both siblings —
  the walk's sleep figure and "nothing more pressing is in the way" on
  `good-conditions` — were removed with the rule written down beside them, and
  this one was not touched because nothing rendered it.
- Regression: `tests/synthetic/no-hidden-genericity.test.ts` — "claims nothing
  about what it could not see — DEF-0012" already forbade the exact phrase and
  was passing over a set that did not contain it. The new test beside it,
  "names which why-now triggers the library actually reaches — DEF-0012",
  enumerates the reached set and names the one it does not reach with the reason
  and with where that sentence is covered instead. Reintroducing the string
  fails the first test; removing a scenario that reaches a trigger fails the
  second.
- Siblings: checked. Every one of the eight `WhyNowTrigger` branches is now
  either reached by the library or named as unreached with its coverage
  elsewhere. The growth branches were repaired in Phase 81; `stale-evidence`,
  `constraint-active`, `good-conditions`, `deficit`, `opportunity-window`,
  `recent-struggle` and `nothing-better` are all read from a real history.
- Note on the fix: the replacement claims nothing about what else exists.
  "Subnetting is the one you have open" is a fact from the record; whether
  anything else was pressing is not a question this trigger was answering.
- Fixed in: the checkpoint that closes Phase 82

---

### DEF-0088 — a study session was offered at eleven at night

- Status: Fixed
- Severity: Major — the class the whole temporal half of the audit is about,
  surviving on the primary surface
- Found in: Phase 82 / package 6
- Found by: the tournament rubric, widened under AUD-0039(b) to ask "does it get
  the hour right" at every block rather than at the hour each history was
  written for
- Class: **a move profile that refuses no hour at all.** `recall-practice` was
  the only entry in `MOVE_PROFILES` with an empty `refuses` list, so nothing
  could stop it: it is `light`, so `protection` had nothing to say about it; the
  deferral path added in this phase has nowhere to defer to once the last block
  has begun; and the filter only removes what a profile refuses.
- Reproduction: "The same week, properly slept" at 23:00. The app offered
  _"Spend 10 minutes recalling subnetting before you reopen your notes."_
- Root cause: an oversight rather than a decision. Every sibling that suits the
  same three blocks — `review-weak-topic`, `time-with`, `move`, `reset-space`,
  `reach-out` — refuses the late night for the same reason, and this one was
  left empty with no comment saying why.
- Regression: `tests/synthetic/intelligence-tournament.test.ts` — "gets the hour
  right", per profile, swept across all five blocks. Reintroducing the empty
  `refuses` list fails it.
- Siblings: checked, and the check is now the rubric itself rather than a list:
  every profile is swept at every block on every tournament profile, so a new
  verb with an empty `refuses` fails on the first run rather than on the evening
  somebody reads it.
- Note on what the repair then broke: making the move refuse the late night
  changed which rejection reasons reach the no-action copy at that hour, and a
  branch that required **every** rejection to be repetition stopped firing —
  putting "none of them suit where you actually are" back on a screen QA-81-006
  had repaired. That condition is now stated as what it always meant (D-134's
  neighbour, in `noActionCopy`), and the mixed case has its own line and its own
  row in the copy table.
- Fixed in: the checkpoint that closes Phase 82

---

### DEF-0085 (QA-81-006) — the repetition rule promoted a move the situation argued against

- Status: Fixed
- Severity: Blocker — regression against gate item 2 and the recovery/capacity
  invariant
- Found in: Phase 81 QA round 2 / `1fc6420`
- Found by: independent QA, walking one deployed session across three hours
- Class: **two rules written a day apart, each correct alone, never run against
  each other.** More precisely: a bookkeeping rule about what has been
  _displayed_ was allowed to change what the app _believes_. The shown-ledger is
  a record of screens and has no standing as evidence about the owner's life
  (D-118), so it may make the app quieter and may not make it wrong.
- Reproduction: deployed laboratory, "A morning after three bad nights", one
  uninterrupted session, Now at 15:00, 20:00 and 23:00 on `2026-09-15`, pressing
  no lifecycle action. The first two say _"Take the rest of the afternoon as
  recovery — no subnetting session."_ and its evening form. The third said
  _"Spend 10 minutes recalling subnetting before you reopen your notes."_ while
  the situation line still read nine hours short of sleep.
- Root cause: `applyConstraints` removed the recovery move as `just-covered`,
  and the ranking was then computed over what was left. `bottleneck-fit` for the
  survivor is −0.25 and `capacity-fit` is −0.36: every dimension that reads the
  body was against it. It won on `direction-fit` and `goal-fit` alone — on
  ambition, against the body, at eleven at night.
- Regression: `tests/synthetic/recovery-has-somewhere-to-go.test.ts` — "does not
  prescribe the study session it spent the day declining" (the exact three-hour
  sequence), "says why it has nothing rather than blaming the hour", "holds
  across the library, at every hour of a kept day" (swept **with the ledger
  running**, which is the thing every existing sweep did not do), and "leaves the
  rule alone where the answer is not what was withheld" — the over-correction
  guard. Also `tests/browser/phase81.spec.ts` at three widths and
  `scripts/android-gate.mjs` on a handset.
- Siblings: checked. `answersLimiter` is now one definition read by the
  dimension, the filter and the invariant. And one real sibling found: the
  session ledger survived a change of history, so loading one laboratory fixture
  after another carried the first one's showings into the second and a move could
  arrive already used up — not reachable by an owner, entirely reachable by an
  auditor, and it made the builder's own gate report the wrong screen for this
  very finding. Fixed in `MemoryProvider`, with
  `tests/unit/memory-provider-race.test.tsx` holding both paths.
- Measured: the new rule fires on 2 of 105 decisions across the library with the
  ledger kept, and both are the reported defect.
- Fixed in: `7e00dac`

### DEF-0086 (QA-81-007) — the no-action screen at late night was not a sentence

- Status: Fixed
- Severity: Major — owner-visible broken English, in the phase about what the
  app says
- Found in: Phase 81 QA round 2 / `1fc6420`
- Found by: independent QA, after the refusal sequence and a block rollover
- Class: **a fragment with a semantic contract dropped into a grammatical
  frame.** `blockNoun` is documented as "a plain noun phrase, for a sentence
  that needs one"; nothing held it to that, and it is used in six frames that
  take a bare noun.
- Reproduction: deployed, "A week pointed at the house" at 19:30 — refuse,
  refuse, answer the soreness question, refuse — then advance four hours to
  23:30. The reset block printed _"Nothing on the list is worth night it would
  cost. That is a real answer."_
- Root cause: `blockNoun('late-night')` returned "tonight", an adverb. The
  fallback arm returned "the time you have", a noun phrase already carrying a
  relative clause, which breaks the same frame. Both are now a determiner and at
  most two words.
- Regression: `tests/synthetic/no-action-copy.test.ts` — every reason at every
  block rendered as a finished sentence and held against a written-out table of
  forty lines, plus a shape guard on `blockNoun` itself and its counterpart on
  `hereNowWord`. Also `tests/browser/phase81.spec.ts`, which walks QA's own
  sequence, and two checks in the Android gate.
- Siblings: checked, and one more of the same class found on the first render of
  the catalogue: `nothing-in-reach` ended _"rather than about your evening"_ at
  every block, including nine in the morning — a gate item 1 violation, in a
  sentence written to protect a different truth, under the sweep built to catch
  precisely that. It reads the horizon now.
- Note on why everything was green: every existing sweep over this copy asks
  which words appear, and can only see the branches the scenario library
  reaches. Most of this catalogue had never been rendered by anything.
- Fixed in: `7e00dac`

### DEF-0080 (QA-81-001) — a named limiter with nowhere to go, and the wrong reason for it

- Status: Fixed
- Severity: Blocker — audit section 6 gate item 2
- Found in: Phase 81 / `736a761`
- Found by: independent QA, reading the regression that documented the gap
- Class: **a fact read as an argument about every option rather than about the
  options it is actually about.** Soreness is a statement about what the body
  can be _asked_ for. `capacityFit` applied it as a single downward slope over
  all candidates, so a reading about a shoulder marked down half an hour with a
  four-year-old, which asks nothing of a shoulder.
- Reproduction: `soreAndRested(1)` — three nights of 7.5, 7.75 and 8 hours, a
  current soreness of 4/5, decided at `2026-04-15 20:00 America/Denver`. The
  limiter is `capacity`; no candidate addressed it, and the test asserted that
  as the expected result.
- Root cause: not the generator. The gate on `sleepCandidates` was closed
  because opening it produced "ease off today" over time with Adaya — but the
  reason Adaya lost was upstream, in a dimension that had no branch for a move
  which asks nothing of a sore body. Fixing the reading let the gate open
  without the regression it had been closed to avoid.
- Regression: `tests/synthetic/recovery-has-somewhere-to-go.test.ts` — "reaches
  the capacity limiter at all, so the sweep above is not vacuous" and "does not
  conclude anything about a light move from a sore body". The fixture gained
  Adaya and a durable custody record on purpose: without a light move in it,
  the second assertion passed by never meeting one, which is D-108's hole.
- Siblings: checked — the `recovery` arm was already covered; `bottleneck-fit`,
  `direction-fit` and `protection` were read for the same shape and none of
  them apply a reading outside what it is about. D-111's exception was
  over-firing as a consequence (sixteen histories of twenty-one) and is bounded
  to effortful standing moves.
- Note: the sleep-protection move still out-ranks time with Adaya on this
  fixture, 0.354 to 0.098, decided by `bottleneck-fit` at 2.375 against −0.250.
  `capacity-fit` now reads +0.48, 0.00 and −0.66 across the restorative, light
  and effortful candidates, which is the correction this entry is about. The
  ordering that remains is arbitration on the merits, and it is named in the
  handoff rather than hidden.
- Fixed in: `1fc6420`

### DEF-0081 (QA-81-002) — the trade-off recommended the move the app had rejected

- Status: Fixed
- Severity: Blocker — semantic falsehood, D-114
- Found in: Phase 81 / `736a761`
- Found by: independent QA, reading the deployed Preview at 15:00
- Class: **a composed clause completing itself with an entity it did not derive
  from the thing the clause is about.** DEF-0001's failure one level up: there
  the sentence lost the noun, here it borrowed the wrong one.
- Reproduction: deployed QA laboratory, "A morning after three bad nights",
  clock at `2026-09-15 15:00 America/Denver`, open Now. Observed: _"Take the
  rest of the afternoon as recovery — no subnetting session. … The week is
  pointed at the CCNA push, and subnetting still looks like the better call."_
  with the subnetting recall listed under **Chosen over**. Same at evening and
  late night; correct in the morning, which is the one hour the library sweep
  reads.
- Root cause: `costClause` took an `object` string and assumed it named the
  winner. For a `recover` move `target.object` is the thing being put down.
- Regression: `tests/synthetic/decision-evidence.test.ts` — "does not call
  subnetting the better call while putting subnetting down" (the exact hour),
  "makes no verdict about an alternative, at any hour of any history" (every
  scenario × five hours, against an enumerated list of what counts as a
  verdict), "still says what the choice cost" and "names the cost even when
  nothing is short".
- Siblings: checked — every clause in `explain.ts` now takes no noun at all.
  `learnedBandClause` was reworded for the same reason and says neither a noun
  nor a pronoun.
- Note on the first repair: it also made the clause conditional on a limiter,
  which deleted AUD-0026 in every state the library can reach. Measured: at no
  hour of any history is `direction-fit` materially against with nothing short.
  The unit suite passed; a browser test pressing the guide's answer caught it.
  That state is now a unit test.
- Fixed in: `1fc6420`

### DEF-0082 (QA-81-003) — the ignored recommendation still came back four times

- Status: Fixed
- Severity: Blocker — the promised owner-visible behaviour was false
- Found in: Phase 81 / `736a761`
- Found by: independent QA, one uninterrupted browser session
- Class: **a promise about an outcome kept only with a score adjustment.** A
  weighted dimension can make a move cheaper; it cannot stop a move whose lead
  exceeds that dimension's entire range at its current weight. Anything stated
  as "the app will not do X" needs a rule that cannot be outvoted.
- Reproduction: deployed laboratory, "A week pointed at the house", Now at
  06:30, 10:30, 14:30 and 19:30 on `2026-09-15`, pressing no lifecycle action.
  All four showed _"Spend 15 minutes clearing the kitchen."_
- Root cause: the shown-ledger fed `recent-duplication` only. Phase 81's own
  report conceded the reproduction did not flip and routed the weights to
  AUD-0035.
- Regression: `tests/synthetic/refusal-and-veto.test.ts` — "stops giving the
  same answer at four hours of one day", now on `week-pointed-at-home` at the
  audit's own hours rather than on `rested-and-behind`, which varies by
  mid-afternoon on its own and passed while the reproduction repeated; "takes a
  move off the table once showing it again would be repeating"; and "does not
  tell him nothing suits when the truth is that he has read it". Also
  `scripts/android-gate.mjs`, forwards through the day on a handset.
- Siblings: checked — D-043 is untouched (nothing is written when a screen
  renders), and the architecture guards on the ledger still hold: it stays a
  session note handed in on the moment, never history, never evidence.
- Fixed in: `1fc6420`

### DEF-0083 (QA-81-004) — the promised question did not follow the second refusal

- Status: Fixed
- Severity: Blocker — interaction failure
- Found in: Phase 81 / `736a761`
- Found by: independent QA, pressing `Can't right now` twice
- Class: **half an escalation.** One component relaxed its standard while the
  component that produces the behaviour carried on unchanged, so the escalation
  existed only where the other half happened to have something to contribute.
- Reproduction: deployed laboratory, "A week pointed at the house", Now at
  19:30, `Can't right now` twice. Observed a third move — _"Spend the next 30
  minutes with Adaya, phone away"_ — under _"Nothing else worth asking right
  now"_. The third refusal did correctly reach _"Nothing then"_.
- Root cause: `REFUSALS_BEFORE_ASKING` lived in `guide.ts` and governed only the
  bar a question had to clear. `decide` had no branch between one refusal and
  three.
- Regression: `tests/synthetic/refusal-and-veto.test.ts` — "asks after the
  second refusal rather than offering a third suggestion" (rewritten onto the
  audit's history; the previous version proved `growth-mixed-evidence`, where a
  question was available anyway, and passed throughout), "never offers a third
  move, on any history that can be refused twice", "stops offering even when it
  has nothing left to ask" (the daily question cap spent, so the honest fallback
  is exercised rather than assumed), and "takes the answer as the reason to look
  again". Also `tests/browser/phase81.spec.ts` at three widths and
  `scripts/android-gate.mjs` on a handset.
- Siblings: checked — D-119's third-refusal stop and the block rollover both
  still hold, and are reachable only because an answer re-opens the offers.
- Fixed in: `1fc6420`

### DEF-0084 (QA-81-005) — clean-tree verify timed out on a test that grew quadratically

- Status: Fixed
- Severity: Blocker — the standing gate is "verify from a clean checkout"
- Found in: Phase 81 / `736a761`
- Found by: independent QA, from a fresh clone
- Class: **a fixture rebuilt inside the loop that consumes it.** Invisible while
  the library is small, and it fails on the phase that adds the fixture that
  crosses the threshold rather than on the phase that wrote the loop.
- Reproduction: `npm run verify` from a clean checkout —
  `tests/synthetic/imported-origin.test.ts` exceeded the 5s default.
- Root cause: `situationsFor` built all twenty-one scenarios for every card it
  checked. Phase 81 added three fixtures.
- Regression: the test itself, which now runs in a tenth of the time; the gate
  is `npm run verify` from a clean checkout, re-run below.
- Siblings: checked — no other synthetic test rebuilds the library inside a
  loop.
- Fixed in: `1fc6420`

### DEF-0074 (AUD-0001, AUD-0002, AUD-0036) — the app told the owner the time, and got it wrong

- Status: Fixed
- Severity: Major
- Found in: whole-app audit / `0eb920b`
- Found by: independent audit, on the deployed Preview
- Class: **a word typed at the point of use rather than derived from what is
  known.** Not a copy preference: the app's central claim is that it knows what
  is going on, and two components of one decision disagreeing about what time it
  is makes that claim visibly false. `tonight` or `evening` appeared 113 times
  across 29 source files, so the assumption had been made 113 separate times and
  could only be unmade 113 times.
- Reproduction: the deployed build at **08:40 on a Tuesday morning**, with a
  usable-time reading of 10 minutes. Now showed _"Tuesday morning, 8 hours of
  sleep, about 10 minutes free."_ and, directly beneath it, _"What is in the way
  — Only about 10 minutes left tonight."_ At 07:30 the guide asked how much time
  there was and offered **"The evening is clear"** as an answer. The evidence
  panel — the surface whose job is to be checkable — read _"WHAT THIS RESTED ON
  TONIGHT"_, _"SITUATIONS LIKE TONIGHT"_ and _"An evening counts as comparable
  on the same few things the app compares evenings on"_ at every hour of the day.
- Root cause: there was no shared vocabulary for the horizon. `whenPhrase`
  existed in exactly one file and was private to it; `findLimiter` was never
  passed the block, and the seam was inside `situation.ts` itself — the block was
  assembled after the limiter that needed it.
- Regression: `tests/synthetic/block-sweep.test.ts` — _"the app never asserts the
  evening outside the evening"_, swept over every scenario at every block across
  every owner-visible string a decision can produce, plus the guide's question
  and its answer labels. Its sibling asserts the other half: at eight in the
  evening the app still says so, because a find-and-replace would pass the first
  test and make the product worse.
- Siblings: the state label ("New tonight"), the decline button, the
  recommendation and trigger templates, the four "why this one" phrases, the
  no-action copy, the Insights eyebrow, the export sections and the concept
  registry's own display label — all in the same commit.
- Fixed in: `979179e`

### DEF-0075 (AUD-0005) — last night's sleep expired mid-morning, and a buried table did not

- Status: Fixed
- Severity: Major
- Found in: whole-app audit / `0eb920b`
- Found by: independent audit, on the deployed Preview
- Class: **a freshness window measured as elapsed time when the fact is true of
  something.** Every unit was a countdown from the reading, so a fact about a
  specific night aged like milk while a claim about the state of a room did not.
- Reproduction: "A week pointed at the house". At 06:30 the situation line read
  _"Wednesday early morning, 8 hours of sleep, Adaya is here."_; at 10:00 the same
  day it read _"Wednesday morning, Adaya is here."_ — same value, same night, and
  the app had lost its best morning fact at the hour it most needed it.
- Root cause: `FreshnessHorizon` had two units and both were elapsed-time
  measures. There was no unit meaning "valid for the local day it describes" or
  "valid within the part of the day it was said in".
- Regression: `tests/unit/registries.test.ts` — _"a reading expires with the
  thing it is about"_, including the assertion that the new unit is **not** a
  widening; and `tests/synthetic/g011-timezone-and-week-boundary.test.ts`, where
  G-011's own claim is now proved twice.
- Siblings: `usableTimeTonight` expired four hours after it was said rather than
  at its block boundary; `homeFriction` was current for a week. Both changed, and
  the reasoning for each is written where the number is.
- Fixed in: `f40a6e9`

### DEF-0076 (AUD-0003) — nine hours short of rest at ten in the morning, and it prescribed a study session

- Status: Fixed
- Severity: Blocker
- Found in: whole-app audit / `0eb920b`
- Found by: independent audit, on the deployed Preview
- Class: **DEF-0016 a second time — a filter with no fallback**, and the reason
  it came back is written into DEF-0016's own regression: that sweep runs "every
  half hour from noon to midnight". The morning was never swept.
- Reproduction: "Three broken nights, and a deadline", clock at **10:00
  Tuesday**. Now: _"Tuesday morning, 9 hours short on sleep."_ / *_"RECALL
  PRACTICE — Spend 10 minutes recalling subnetting before you reopen your
  notes."_ / _"What is in the way — About 9 hours short of rest over the last few
  nights."_ The probe reported three candidates, all career, and two ruled out as
  `too-strained`.
- Root cause: `sleepCandidates` returned `[]` outright before noon, because no
  recovery verb suits those blocks and proposing one would only be refused. The
  early return was honest about the verb table; nothing was put in its place.
- Regression: `tests/synthetic/recovery-has-somewhere-to-go.test.ts` — the sweep
  now runs **midnight to midnight**, plus AUD-0003's invariant swept over every
  scenario at every block, plus the reproduction itself.
- Siblings: the `capacity` limiter still has no restorative candidate. That is
  named in the same file rather than hidden, with the reasoning: AUD-0003's
  implementation guidance says to gate on strain exactly as the existing
  generator does, and widening it made a sore, well-rested father be told to ease
  off instead of spending half an hour with his daughter.
- Fixed in: `ecd1656`

### DEF-0077 (AUD-0048, AUD-0049) — "three times running" about a four-year-old, from a record that alternates

- Status: Fixed
- Severity: Blocker
- Found in: whole-app audit / `0eb920b`
- Found by: independent audit, through the QA document loader
- Class: **a claim written from the survivors of a filter, as though the filter
  had ordered them.** It is also DEF-0022 / DEF-0033 / DEF-0039's class a fifth
  time — two owner-visible lines about one thing that a reader has no way to
  reconcile — and the subject this time is a child.
- Reproduction: a constructed history of six occasions of "ordering her own
  food", alternating all-the-way and part-of-the-way — three of six, never twice
  in a row, the most recent one needing help. At one instant, on two screens:
  **Now** — _"Adaya has handled ordering her own food 3 times running. Worth
  calling that settled?"_ with [Yes, she has got this]; **Fatherhood** — the
  alternating record, in full. Tapping yes would have recorded _"She handles
  ordering her own food independently now."_
- Root cause: `growthSuggestions` built `cleared` by discarding every occasion
  that did not reach 0.9 and wrote the headline from the length of what was left.
  Nothing checked adjacency because nothing needed to until a history contained a
  failure — and **no scenario in the library contained one**.
- Regression: `tests/synthetic/g003-growth-evidence.test.ts` — _"D-112 — the app
  reads the sequence rather than the survivors"_, including the exact
  reproduction, the run that ends on a partial, the copy sweep for any
  percentage, rank, grade or scale about her, and the assertion that the internal
  confidence never renders.
- Siblings: `daysSincePractice` counted a refusal as practice (AUD-0014); the
  explanation rendered a skill through a sentence written for a person
  (AUD-0015b); the reason for a developmental challenge was the age of the app's
  own records (AUD-0016); and Insights and Now stated different sufficiency about
  one skill at one instant (AUD-0037). All four in the same commit.
- Fixed in: `e4f72e7`

### DEF-0078 (AUD-0028, AUD-0032) — a causal claim with nothing behind it, and a coin flip spoken as a fact

- Status: Fixed
- Severity: Major
- Found in: whole-app audit / `0eb920b`
- Found by: independent audit, on the deployed Preview
- Class: **a constant that reads as a finding.** A clause that cannot be
  falsified by evidence, because no evidence reaches it; and a phrasing layer
  that collapsed `known` and `inferred` and therefore could not tell a reading
  from a guess.
- Reproduction: "A month of what actually worked" and "Nine months of evenings"
  produced **byte-identical** recommendation and explanation — _"The kitchen
  table is buried again — and it costs you the start of every evening."_ — with
  the only difference one advisory line below, which said the move had made
  little difference. Separately, the default history at Monday 15:05: Now said
  _"There is enough in the tank for a walk"_ while the belief store said
  _"Current energy — 2 of 5 · inferred, 50%"_.
- Root cause: the causal clause was a string constant in `explain.ts`, and the
  learned band was rendered as a separate advisory line that never reached
  `whyNow()`. `isUsable()` collapses two knowledge states, and the phrasing read
  it that way.
- Regression: `tests/synthetic/decision-evidence.test.ts` — the section-64
  regression, the causal sweep, and AUD-0032's hedge asserted in both directions;
  plus `tests/unit/architecture-guards.test.ts`, whose causal sweep now covers
  `explain.ts` and `recommendation.ts`. It covered the surfaces and the module
  that words a _finding_, and missed the module that words the _reason_.
- Siblings: none outstanding. The same sweep found no other causal construction.
- Fixed in: `c7ee339`

### DEF-0079 (AUD-0023, AUD-0025, AUD-0050) — the decline loop jammed, and there was no way to say stop

- Status: Fixed
- Severity: Major
- Found in: whole-app audit / `0eb920b`
- Found by: independent audit, on the deployed Preview
- Class: **every owner action honoured individually, with no response to the
  pattern of them.** Section 4.3 gives the owner six things he can do and the
  interface offered five.
- Reproduction: "Three times running", 17:00. Can't right now ×1 → the walk. ×2 →
  the growth opportunity. ×3 → **back to** _"Spend the next 30 minutes with
  Adaya, phone away"_, badged _"You said not right now"_. ×4 → identical screen,
  no button doing anything, and the situation line gone. Separately: the
  identical kitchen sentence at 06:30, 10:00, 14:00 and 19:00 of one day, because
  a move shown and ignored left no trace and scored _"+0.20 — not offered
  lately"_.
- Root cause: `settledRecently` held a decline for a day and an unable-now for
  nothing at all, so the rotation could walk back onto its own first move;
  `recent-duplication` read only recorded recommendations, which is to say only
  the moves the owner responded to; and no control in the product could construct
  the `preference` record `vetoFor` had always enforced.
- Regression: `tests/synthetic/refusal-and-veto.test.ts`, plus
  `tests/browser/phase81.spec.ts` for the controls a thumb has to find, plus the
  architecture guard asserting the shown-ledger is unreachable from learning,
  insights, association, Timeline, the store and the export path.
- Siblings: `nothing-proposed` read as the app not being ready at seven in the
  morning (AUD-0034), and the situation line vanished in every no-action state.
  Both in the same commit.
- Fixed in: `cb44c62`

### DEF-0073 (QA-08-003, QA-08-004) — two regressions that claimed more than they asserted

- Status: Fixed
- Severity: Blocker for closeout — no product defect was visible through them,
  which is precisely the problem: both could pass with the behaviour they are
  named for removed
- Found in: Phase 8 / `d433079`
- Found by: **independent Codex QA**, second retest, by reading the regressions
  the repair added rather than only re-running them
- Class: **a test title that is a claim the body does not hold.** The third
  occurrence in this phase, and the second inside a repair for the rule against
  it (D-108).
  - `every insight declares where its evidence came from` asserted
    `Array.isArray(insight.sources)`. Every constructor initialises `sources:
[]`, so deleting `withSources` — the code that actually finds the cited
    records and resolves their origins — left every value an array and the test
    green. A trajectory or association card could lose all disclosure with the
    named regression passing.
  - The repair claimed imported-origin disclosure in **four** aggregate export
    sections and the tests held **three**. QA found the mismatch in the repair's
    own documentation: the surface table said four, the reintroduction account
    said "each of the three export sections one". Removing `fromSources` from
    `insightsSection` restored the live defect on "What has been worked out"
    with every named regression still green.
- Reproduction: delete the `withSources(...)` call in `insightsFor`, or the
  `fromSources(...)` wrapper in `insightsSection`, and run the suite. Before the
  repair: green in both cases.
- Root cause: the first assertion was written from the shape of the field rather
  than from what the field is for; the second was an enumeration that stopped
  one short of the claim beside it.
- Regression: `tests/synthetic/imported-origin.test.ts`.
  "every insight kind the library produces declares its origin" rewrites every
  golden scenario's provenance to each of the four origins in turn, asserts each
  card's `sources` **and the word the owner would read**, and asserts the set of
  kinds exercised equals a list written out by name — so a kind that stops being
  produced is a visible failure rather than quietly reduced coverage. Its
  companion asserts a mixed basis resolves to nothing, across more than three
  kinds. "marks the insight summaries — the fourth aggregate section" isolates
  `## What has been worked out` and pairs an imported-only insight against the
  same history flipped to the owner's. Both proved by reintroduction: removing
  `withSources` fails five; removing `fromSources` from `insightsSection` fails
  one.
- Siblings: **one real product gap, which the weak assertion had hidden.**
  Removing the `sources.length > 0` guard that QA's own probe used showed that a
  `life-season` card carries no sources at all — it cites no evidence lines, so
  `withSources` finds nothing to resolve, and a season standing on an imported
  context read as though the owner had told this app himself. It now sets its
  own sources from the arrangement and the entries it counts, and says why. QA
  reported "no current product-behaviour defect was observed"; the guard is why.
- Note on the technique: the enumeration is built from the scenario library
  rather than from purpose-built fixtures, which is QA's idea and a good one —
  those histories are rich enough to produce nine kinds of card, and a fixture
  per kind would be nine things that resemble the product rather than nine
  histories it actually reasons about.
- Confirmed by: **independent Codex QA, third retest — PASS.** It did not accept
  either reintroduction on report: it removed `withSources` itself and saw five
  focused failures, removed the `fromSources` wrapper itself and saw the
  isolated fourth-section test fail, and checked that the nine-kind enumeration
  is honest rather than convenient. It verified the `life-season` sibling on the
  deployed build in all three states — imported marked, owner unmarked, mixed
  unmarked.
- Fixed in: `1fc41cf`, the checkpoint that closes Phase 8

### DEF-0072 — one badge, five stylesheets, and an eyebrow that shouted through it

- Status: Fixed
- Severity: Major — the badge is how the owner tells his own history from
  migrated history, and on one surface it did not read as a badge at all
- Found in: Phase 8 / `606197e`
- Found by: **the builder, by reading the deployed Life and Insights screens**
  after the Android gate had passed 56 checks including "an Insights card drawn
  from it says so too"
- Class: **one appearance defined in five places.** The origin badge shows on
  Timeline, a domain page, the Life overview, an Insights card and an evidence
  line, and each surface's stylesheet carried its own copy of the same
  declarations. The copies drifted immediately: on the Insights card the badge
  was nested inside an eyebrow carrying `text-transform: uppercase` and
  `letter-spacing: 0.1em`, inherited both, and rendered as
  `OUT OF DATEIMPORTED` — a wide-tracked run of capitals that reads as part of
  the eyebrow rather than as a separate thing.
- Reproduction: import a legacy backup whose only Career record is a goal, then
  open Insights. The card's eyebrow reads `OUT OF DATEIMPORTED`.
- Root cause: the badge inherited what its parent imposed, because nothing said
  otherwise, and there was no single definition where "otherwise" could be said
  once.
- Regression: `tests/unit/architecture-guards.test.ts`, "the origin badge is
  defined once" — the shared class exists and resets the properties a parent can
  impose; no surface stylesheet styles its own; and every surface that renders
  the badge renders the shared class. Proved by reintroduction in both
  directions: adding `.in-origin` back to a surface sheet fails, and pointing a
  surface's markup at its own class fails.
- Siblings: all five were the same defect and all five now use one class. The
  Insights badge also moved **out** of the eyebrow, because resetting the
  inherited properties fixes the symptom and the two are still different kinds
  of thing about the card.

  And one more found by the same reading: the badge was separated from the text
  before it by `margin-left` and by nothing else, so on the Life overview the
  rendered text ran "…may come up on Now.Imported" as one word. A margin
  separates a badge on screen and nowhere else — not read aloud, not copied
  out, not in any assertion over text. Every badge now has a real space before
  it, held by `tests/browser/legacy-import.spec.ts`, "the badge is separated by
  a space, not only by a margin", which asserts the rendered text rather than
  the style because a margin is exactly the thing that looks like it has solved
  this and has not. Proved by reintroduction on the Life overview — the Insights
  card is a flex row, where the browser separates the two anyway, so the probe
  there passes either way and the honest place to prove it is where it broke.

- Note on how it was found: the gate asserted the badge was _present_ and
  counted it. Present and legible are two claims, and only the first can be
  counted — the same distinction as "on the screen" versus "distinguishable on
  the screen" from the round-1 repair, one layer in.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0071 (QA-08-001, retest) — a conclusion drawn entirely from imported history did not say so

- Status: Fixed
- Severity: Blocker — the surfaces that lost it are the ones the owner reads a
  conclusion on, and an exported reviewer has nothing else to go on
- Found in: Phase 8 / `d072012`
- Found by: **independent Codex QA**, retest of the round-1 repair, by importing
  and then reading Life, Insights and the export rather than Timeline
- Class: **the aggregate half of DEF-0069.** The first repair threaded origin
  through `DescribedRecord` — the shape for showing a record — and every surface
  that renders records was fixed. Four surfaces do not render records; they
  state a **conclusion drawn from** them:
  - Life's overview: "Nothing has come in about career & learning for 3 months";
  - an Insights coverage card, and the same sentence in the export;
  - the export's current facts, active goals, coverage and insight summaries.

  Each was true and each read as though the owner had gone quiet, when in fact
  he had never said anything about the area _to this app_ and everything it knew
  had been migrated.

- Reproduction: import a legacy backup whose only Career record is a goal, then
  open Life. The overview says `GOING QUIET / Nothing has come in about career &
learning for 3 months` with no cue. Same on the Insights card and in four
  export sections, while the Recent record rows underneath do carry `· Imported`.
- Root cause: the intelligence layer already computed the origin of the newest
  evidence (`DomainCoverage.source`) and nothing computed whether the **whole**
  body agreed. Disclosure needs the second question; reliability needs the first.
- Regression: `tests/synthetic/imported-origin.test.ts`, "every surface that
  states a conclusion tells them apart" — the coverage sources at the
  intelligence layer, an area with one entry of his own in it staying unmarked,
  an Insights coverage card, and the export's aggregate sections. **The first
  version of this entry said "three export sections" while the repair claimed
  four, and the fourth was genuinely untested** — independent QA found the
  contradiction here rather than in the code (DEF-0073). All four are held now.
  Proved by reintroduction at each: removing the area sources fails three, the
  card's sources one, and each export section one.
  `tests/browser/legacy-import.spec.ts` and `scripts/android-gate.mjs` both hold
  it on Life and Insights against the deployed build.
- Siblings: checked. `Insight.sources` is filled for **every** kind, centrally,
  from what the card cites — so a card added later inherits the rule instead of
  having to remember it. Coverage cards set it themselves because their evidence
  lines name concepts rather than records.
- Note on the false green: the round-1 repair shipped a test headed "every
  surface tells them apart" that asserted Timeline, a domain page, an evidence
  resolver and one Recent record line. QA named the title as the reason nobody
  noticed the gap — **the same defect the round-1 report had found in somebody
  else's test, committed by the repair for it.** The block is retitled to what
  it holds, and the aggregate surfaces have their own.
- Note on the second one, found while fixing it: the first version of the new
  fixture gave Career an imported _observation_ as well as the goal, so the
  coverage card's evidence lines resolved and the assertion passed even with the
  area-level origin removed. It could not fire. The fixture now matches QA's:
  one goal and nothing else, which is what makes the card depend on the area.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0070 (QA-08-002) — a new backup's own timestamp turned unchanged rows into conflicts

- Status: Fixed
- Severity: Blocker — taking a later backup is the ordinary way an append-first
  old history gains rows, and doing so made the importer call six unchanged
  entries edited or damaged
- Found in: Phase 8 / `b593a49`
- Found by: **independent Codex QA**, round 1, by generating a second backup of
  the same source rows with a later `createdAt` — which no test in the
  repository did
- Class: **something about the transport participating in the identity of the
  thing transported.** `legacyFormatLabel` returned
  `life-command-os.backup@<the backup's createdAt>`, and `archiveOf` stored that
  string in every `imported-legacy-record`'s `legacyFormat`. Conflict detection
  fingerprinted the whole canonical record, so recreating the backup changed
  every archived row's fingerprint while its legacy payload was byte-identical.
  Two more members of the same class were live and unreported: the mapping
  rules version (`provenance.writtenBy`), so revising a rule would have made
  every previously imported row a "conflict"; and `zone`, so importing the same
  file after travelling would have done the same.
- Reproduction: import a legacy backup, then generate a second backup of the
  same ten rows with one row changed and a later `createdAt`, and preview it.
  Before the fix: `Already here from an earlier run 2` and "7 entries … now say
  something different". The honest answer is one.
- Root cause: two, and only fixing the reported one would have left the class.
  The label named a file where its own field name says format; and the
  comparison asked "is this canonical record identical" when the question is
  "does the old file still say the same thing".
- Regression: `tests/contract/legacy-import.test.ts`, "a later backup of the
  same old history is not a changed file — QA-08-002" — five tests: a later
  timestamp alone changes nothing; one changed row is exactly one conflict; a
  different device timezone changes nothing; a revised rules version is
  reported as a re-reading rather than a conflict; and the label carries no
  timestamp. Proved by reintroduction: restoring the per-file label **and** the
  whole-record comparison fails all five plus two pre-existing ones.
  `scripts/android-gate.mjs` drives both later-backup cases on the deployed
  build by touch.
- Siblings: checked. `provenance.note` is derived from the legacy record id and
  is stable; `occurredAt`, `recordedAt`, `raw`, `privacy`, `domains` and the
  derived record id all come from the row. `legacyIdentity` names the three
  that do not and says why for each.
- Note on the fix: a revised mapping rule is now **its own count** rather than
  either a conflict or silence. The file has not changed and this build reads
  it differently; calling that "now says something different" blames his old
  history for a change in this app, and calling it "already present" hides a
  real difference in what the app believes his history means.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0069 (QA-08-001) — nothing on any surface said where an entry came from

- Status: Fixed
- Severity: Blocker — an imported reading became indistinguishable from one the
  owner typed this morning, on every surface he reads, and it can drive
  decisions
- Found in: Phase 8 / `b593a49`
- Found by: **independent Codex QA**, round 1, by importing and then reading
  Timeline, Life, a domain page, Insights and the export
- Class: **wider than it was reported.** The record layer was correct
  throughout — `evidenceSourceOf` returned `legacy-import`, the store kept it,
  a backup carried it. The presentation layer never asked. `describeRecord`
  returned a kind, a sentence and a withheld flag, and every surface rendered
  those three, so **no entry on any list surface said where it came from**. A
  device reading and a derived one were equally silent; legacy import is
  simply the first origin that both matters enormously and actually occurs in
  the owner's real history. D-014 asks for all of them.
- Reproduction: import a legacy backup containing an energy reading, then open
  Timeline. `08:30 Noted Current energy: 1 of 5` — identical in every respect
  to a reading he entered himself. Same on the domain page, in the export's
  Recent record, and in the evidence behind an Insights figure. A backup taken
  immediately afterwards shows the provenance correctly on every one of those
  rows.
- Root cause: `DescribedRecord` had no origin field, so there was nothing for a
  surface to render even if it had wanted to.
- Regression: `tests/synthetic/imported-origin.test.ts` — one history holding
  the owner's own reading and an identical imported one, walked through
  Timeline, the domain page's readings, entries and goals, the export, and the
  evidence resolver. Each surface must tell them apart, and **the owner's own
  entry must carry nothing** — a build that marked every row would satisfy a
  weaker test and would teach him to stop reading the badge. Device and derived
  origins are held in the same file so the next one to matter cannot slip back
  in. `tests/browser/legacy-import.spec.ts` proves it on the rendered Timeline
  and in the composed export; `scripts/android-gate.mjs` proves it on the
  deployed build by touch. Proved by reintroduction, whole and per surface:
  removing `originOf` fails all eight; removing it from Timeline alone fails
  two; from the domain page alone, one; from the export alone, one.
- Siblings: checked. The private placeholder keeps its origin — where an entry
  came from is not the private detail, and withholding both would make a
  private imported row read as one he wrote on the surface least able to
  correct it. The archive row's tag moved from "Imported" to "Kept", because
  the origin now says imported and what is distinctive about an archived row is
  that nothing was made of it.
- Note on the false green: `tests/contract/legacy-import.test.ts` carried a
  test titled "every imported record says it was imported, **wherever it
  surfaces**" which asserted `provenance.source` and rendered nothing. Anybody
  auditing the suite for that claim would have found it and ticked it. It is
  retitled to what it proves.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0068 — the import report read the audit trail out to the owner

- Status: Fixed
- Severity: Blocker — the report is the whole safeguard of this phase. It is
  what the owner reads before agreeing to write a re-interpretation of his
  history into the only copy of it, and it was written to somebody else
- Found in: Phase 8 / `2d2d70e`
- Found by: **the builder, by opening the deployed build and reading the
  panel** — after 1163 unit-layer tests, 441 browser tests and a 44-check
  Android gate had all passed on it
- Class: **one string doing two jobs whose audiences disagree.** Every rule in
  `src/legacy/mapping.ts` carried a single `because`, written as an audit trail
  so that a claim about somebody else's data model stays checkable a year
  later — it cites decisions, plan sections and the names of things in that
  file. The import report then rendered it verbatim. Not one entry, all of
  them: the panel told the owner about "D-091 invariant 6", "Section 59 — the
  old move catalogue", "the contortion section 30 forbids", "the defect D-091
  exists for", `ATTRIBUTE_RULES`, and — for the single most important row on the
  screen — "See MOVE_PREFERENCE_NOTE", which is a constant in a file he cannot
  open. It also discussed him in the third person while he was reading it:
  "the wellness score he rules out", "something the owner did not", "The owner
  decides whether these come across."
- Reproduction: open the deployed Preview, go to Data, paste any legacy backup,
  read it, and open "Every kind of entry in that file, and what became of it".
  Every line is the registry's own prose.
- Root cause: the audit trail is genuinely valuable and had to keep citing what
  it rests on; the screen needed a sentence. Both were asked of one field, and
  the field that already existed was the developer's.
- Regression: two, because there are two ways in.
  `tests/unit/legacy-mapping.test.ts` — "what the owner reads is not the audit
  trail" sweeps **every** owner-facing string in the registry for decision ids,
  plan section numbers, SCREAMING_CASE identifiers, plan vocabulary, developer
  vocabulary and the third person, and separately asserts the audit trail still
  exists, still cites, and is still a different string.
  `tests/browser/legacy-import.spec.ts` — "speaks to the owner rather than to
  whoever wrote it" sweeps the **rendered panel** with every disclosure opened,
  because a component can grow developer vocabulary in a label or a heading
  where a registry sweep never looks. Both proved by reintroduction.
- Siblings: checked and clean. The refusal sentences built per-row in
  `translate.ts` were in the same class and were split the same way
  (`because` and `ownerBecause`); `MOVE_PREFERENCE_NOTE` itself is not
  rendered; the panel's own copy, the outcome sentences and the refusal labels
  were read and are clean. The screen sweep now holds all of it.
- Note on the fix: the audit trail was **not** watered down to pass the sweep.
  It moves. A test asserts each `owner` string differs from its `because`, and
  that several `because` strings still cite a decision or a section — otherwise
  a registry that argued nothing anywhere would satisfy the guard.
- Note on how it was found: it is the exact shape Phase 7 recorded twice — a
  gate that is green and a person who reads the screen and finds something no
  assertion was asked. One browser test in this very file already asserted
  `toContainText('move catalogue')`, which is an assertion **that the developer
  wording is on screen**. It was green throughout.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0067 — a guard that could never fire, and an assertion that compared nothing to nothing

- Status: Fixed
- Severity: Major — not a product defect, and the reason it is here is that
  Phase 7 shipped three of this exact shape and the Phase 8 handoff is under
  explicit instructions not to ship a fourth
- Found in: Phase 8 / pre-checkpoint
- Found by: the builder, by **reintroducing the defect each new guard was
  written for** and watching whether the guard noticed — and, for the second
  half, by `tsc` refusing a property that does not exist
- Class: **coverage that reads as evidence in both directions.** Two distinct
  ways in, and neither is visible in a passing run:
  1. a pattern that cannot match. The wall-clock guard over `src/legacy/`
     contained a literal `0x08` byte where `\b` was intended, so its regex was
     `/^HDate\.now.../` and matched nothing. It passed with a `Date.now()`
     sitting in `src/legacy/plan.ts`.
  2. an assertion whose two sides are both `undefined`.
     `tests/synthetic/legacy-inert.test.ts` compared
     `after.evaluation?.evidence` with `before.evaluation?.evidence`, and
     `Evaluation` has no `evidence` — so the strongest assertion in the file
     was `expect(undefined).toEqual(undefined)`.
- Reproduction: put `export const probeNow = Date.now()` at the end of
  `src/legacy/plan.ts` and run `tests/unit/architecture-guards.test.ts`. Before
  the fix: 39 passed. Add `evidence` to an `Evaluation` under an older
  TypeScript and the second half reproduces the same way.
- Root cause: the guard bodies were written through a shell heredoc that
  collapsed one level of backslash escaping, so `\\b` reached the file as a
  control character. The vacuous assertion was written from memory of the type
  rather than from the type.
- Regression: **a direct sweep**, added after this happened a second time.
  `tests/unit/architecture-guards.test.ts` — "nothing in the source is
  invisible" reads every file under `src`, `tests` and `scripts` and fails on
  any control character, with exactly one named exception: `derivedRecordId`
  joins its parts with a NUL, which has been there since Phase 3 and is
  load-bearing — changing that separator changes every derived record id and
  would break the identity of every episode already written. A third test
  fails if that allowance ever names something no longer there.
  Plus the guards themselves, each proved by reintroduction —
  `lets nothing below the UI know the old format exists`,
  `keeps the quarantined shapes and the registry inside the importer`,
  `reaches no store of its own`, `never writes a legacy file, only reads one`
  and `reads no wall clock` all fail on their own probe. A repository-wide sweep
  for control characters in `src`, `tests`, `scripts` and `docs` is clean.
- Siblings: **one, and it is why the fix is a sweep rather than a repair.** The
  same escaping collapse happened again later in the phase, in a browser spec
  written the same way — six patterns in one `for` loop, every `\b` a
  backspace. That one still matched, because a pattern like `/\bD-\d{3}/`
  is merely less precise rather than inert, so it would have passed review and
  passed CI. There is now nothing to remember: the sweep reads the bytes.
  Every new sweep added by this phase was reintroduction-tested individually,
  and `tests/synthetic/legacy-inert.test.ts` was rebuilt
  around the same finding — its fixture originally pulled in two directions at
  once and cancelled on the one scenario that was already depleted, so three of
  that scenario's four assertions could not have failed. It now runs each
  scenario against two opposite pulls, and `running-on-empty` was **removed**
  from the list because neither pull moved it.
- Note on the fix: the escaping was repaired rather than the pattern relaxed,
  and the vacuous comparison was replaced with the dimensions and the score —
  the numbers a legacy row would nudge without flipping the ranking, which is
  the shape the assertion was supposed to catch.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0066 — a re-import reported that everything was already there and offered to do it again

- Status: Fixed
- Severity: Major — the offer, if accepted, rewrites the whole store in one
  transaction to change nothing
- Found in: Phase 8 / pre-checkpoint
- Found by: the browser suite, on the first run of
  `the same file twice says there is nothing left rather than doing it again`
- Class: **two halves of one answer filtered against different things.**
  `planImport` filtered records against the store and collected entities without
  filtering them at all. A second pass over an already-imported file therefore
  produced an empty `toAppend` and a full list of subjects, so
  `importChangesNothing` was false while the report above the button said every
  entry was already present — two contradictory claims about one file, on one
  screen.
- Reproduction: import a legacy backup containing a `goal`, then read the same
  file again. The report says "Already here from an earlier run"; the button
  still reads "Bring it across" and is enabled.
- Root cause: `heldEntities` did not exist. `snapshotWith` already preferred an
  existing entity over an incoming one, which made the write harmless and the
  _decision_ wrong — the plan is what the screen reads, and it was claiming work
  that did not exist.
- Regression: `tests/contract/legacy-import.test.ts` —
  `recognises its own work exactly rather than by resemblance` now also asserts
  `again.entities` is empty and `importChangesNothing(again)` is true. Proved by
  reintroduction: removing the `heldEntities` check fails it.
- Siblings: checked. `toAppend` was already filtered; malformed rows are carried
  through untouched by design; `snapshotWith` is the only other place the two
  halves meet and it prefers what the store holds.
- Note on the fix: D-104 records the general form — what counts as "nothing to
  do" is one predicate consulted by both callers, not one check written twice.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0065 — every import would have verified false and rolled itself back

- Status: Fixed
- Severity: Blocker — no import could ever have succeeded
- Found in: Phase 8 / pre-checkpoint
- Found by: the contract suite, on the first end-to-end run through a real store
- Class: **an order-sensitive fingerprint compared across a boundary that
  reorders.** `snapshotToWire` serialises records in the order it is handed
  them; a store returns them sorted. `restoreInto` fingerprints what goes in and
  what comes back out and compares the two, so a merged snapshot built as
  `[...current, ...incoming]` fingerprints differently from the identical
  history read back — and the verification correctly reported that what was
  written is not what the file holds, and correctly undid it.
- Reproduction: import any legacy file containing more than one record into a
  store holding anything at all. The outcome is `stage: 'verify'`,
  `rolledBack: true`, and nothing is added.
- Root cause: `snapshotWith` did not sort. The failure looked like a storage
  fault and was a merge that had not been put in canonical order.
- Regression: `tests/contract/legacy-import.test.ts` —
  `is idempotent through the store, not only through the plan` goes through
  `createMemoryStore` end to end rather than through the plan alone, which is
  what made this visible at all; the earlier plan-only assertions passed
  throughout.
- Siblings: checked. `planRestore` for a backup file takes a snapshot that has
  already been through `snapshotFromWire`, which sorts on the way in, so the
  Phase 7 path was never exposed to this.
- Note on the fix: sorting is independently correct rather than a workaround —
  D-091's seventh invariant, and appending imported rows to the end of the
  record list would put a decade-old reading after last night's.
- Fixed in: Phase 8, carried in the closing product checkpoint `1fc41cf`

### DEF-0064 (QA-07-010) — a sticky layer was a window, and rectangles could not see it

- Status: Fixed
- Severity: Blocker — the one piece of copy whose whole job is to stop the owner mistaking old code for the deployed product, rendered unreadable in the ordinary scrolled condition
- Found in: Phase 7 / `3a8e8b6`
- Found by: **independent Codex QA**, round 4, by looking at a screenshot after its own geometry assertions had passed
- Class: **a sticky member with a non-opaque background.** DEF-0062's repair made the header stick as a group, which fixed the members overlapping _each other_ and said nothing about what is behind them. `.build-notice` is `linear-gradient(rgba(255, 125, 77, 0.2), rgba(255, 125, 77, 0.11))` with no blur: at the top of a document the only thing behind it is the page background, so it reads as a tint; once the group starts sticking it is a window. `.topbar` was in the same class and merely disguised by a `backdrop-filter`, and `.lab-notice` happened to be opaque — which is why QA saw one notice readable and the other not, in the same stack.
- Reproduction: make the app's freshness request return a different valid SHA so the real stale-build notice appears, then scroll Data until section text is behind the header. "What has been observed to follow what" is drawn through "A newer build is deployed." Same on Timeline with "6.75 hours". With both notices present at the Restore panel, the lower laboratory notice stays opaque and readable while the warning above it does not.
- Root cause: the background belonged to the members. A sticky layer composites over whatever scrolls beneath it, so the property that had to be true was about the **group**, not about any one notice's colour.
- Fix: one opaque backing on `.shell__top`. Every member composites over that instead of over the page — including the next notice somebody adds — and keeps its own tint, so nothing changes at the top of a document and everything changes halfway down one. `.topbar`'s `backdrop-filter` is removed in the same pass: it was doing this job for one member only, which is precisely how the notices below it went unnoticed.
- Regression: `tests/browser/sticky-header.spec.ts`. **Three of its four tests compare the header's pixels** at rest against its pixels with a page scrolled underneath, on Data, on Timeline, and with both notices stacked at the Restore panel — if anything shows through, the images differ. The fourth asserts the group has an opaque backing, so the reason survives a refactor that keeps the screenshots passing by accident. Reintroduced two ways — removing the backing, and making it translucent as a per-member fix would — and **all four tests fail both times.**
- **Why rectangles were never going to find it, in QA's own words.** Its first pass compared all three header controls at four scroll positions and passed while the warning text was visibly interleaved with the page. The controls do not overlap; the _words_ do. A geometry assertion cannot express that, which is why the regression above is an image comparison and not a bounding-box one.
- Siblings: swept. Every member of the sticky group is now backed by an opaque surface by construction rather than by each having remembered to be opaque; `.lab-notice` was already fine and stays unchanged.
- Fixed in: this checkpoint

### DEF-0063 (QA round 3) — a handoff named a checkpoint whose deploy had not landed, and the checker could not say so

- Status: Fixed
- Severity: Blocker — a second whole QA round produced no product testing
- Found in: Phase 7 / `5405eb4`
- Found by: **independent Codex QA**, round 3, at the checkpoint gate
- Class: **a gate that is right to fail and wrong about why.** Two distinct situations produce a non-empty diff between a named checkpoint and a deployed ref: the deployment is _newer_ and something bundle-relevant genuinely changed, or the deployment is _older_ and simply does not contain the checkpoint yet. `git diff` cannot tell them apart, and the script only diffed.
- Reproduction: with Preview serving `3fc1dde` and the handoff naming `3a8e8b6`, run `node scripts/checkpoint-equivalence.mjs 3a8e8b6 --ref 3fc1dde`. It exits 1 and lists eight files under `src/` as "bundle-relevant differences" — which reads as a repair that touched things it should not have. The truth was that the deployed build predated the repair by two commits and the answer was to wait for the Pages deploy.
- Root cause, two of them, and the process one matters more. **The script** reported a direction-blind diff. **The handoff** named `3a8e8b6` as the checkpoint and was pushed before that commit's deploy had landed, so the document was true about the repository and false about the live site at the moment QA read it. The builder confirmed the CI _workflow_ succeeded and did not confirm the _bytes_ — and GitHub's own `pages-build-deployment` runs after the workflow that pushes to `gh-pages`.
- Fix: `contains()` — `git merge-base --is-ancestor` — runs before the diff and reports a ref that predates the checkpoint as its own outcome, in words that name the remedy: the deploy has not landed, wait and read the deployed SHA again, nothing here says the checkpoint is wrong. And `--deployed <build-info-url>` reads the live SHA itself, so the check is one command rather than a value copied out of a browser tab.
- Regression: the script, run both ways against the real history. `--ref 3fc1dde` (the exact invocation QA ran) now exits 1 with the ancestry message rather than a file list; `--deployed` against the live Preview exits 0. Both are in the round-3 record in `PHASE_STATUS.md`.
- **What was not wrong.** Nothing in the repair. The live build at `5405eb4` was confirmed by hand afterwards to carry every round-2 fix — the first line of a synthetic export, the absent ownership claim, the single full stop, and Private gone from the header's life areas. QA's round-3 stop was correct in every respect except the conclusion it was pushed toward by a misleading message.
- Siblings: swept. D-097 gains the missing step — the builder reads the **live deployed SHA** after CI completes and confirms the checkpoint is an ancestor of it before writing a handoff that names it. Naming a checkpoint is now something done after a deploy, not before one.
- Fixed in: this checkpoint

### DEF-0062 (QA-07-002 … QA-07-009) — eight things the green suites could not see

- Status: Fixed
- Severity: Blocker — five of the eight are blocking, two of those on the surface that writes to the owner's only copy of his own history
- Found in: Phase 7 / `322c00b`
- Found by: **independent Codex QA**, round 2, the first full product pass
- Class: **a claim that is true somewhere in the artefact and false where it is read.** Not one class in the ordinary sense, and grouped as one entry deliberately, because the same shape produced five of the eight: a document that opens by claiming the wrong identity and corrects it later; an exclusion that covers the entries and not whether there are any; a header that describes the store while the sentence beneath it describes the document; a green success with its own contradiction printed underneath; a headline that ends twice. In each case both halves were present and the reader meets the wrong one first.

#### The findings

- **QA-07-002 (blocking, semantic).** A synthetic export opened "you are reviewing one person's own record of his life… he is the owner of everything below" and disclosed that it was an invented history further down, under a heading. **Fix:** `handoffPrompt` takes the source; the identity claim is made once, at the top, from it. **D-098.**
- **QA-07-003 (blocking, privacy).** With the private section off, the document said "nothing from that area is below" and then reported the area as current, moderately evidenced, last heard three days ago; listed it under the header's life areas; and carried a dated `Noted: Private entry` row. **Participation is what stays sensitive after the detail is withheld.** **Fix:** the exclusion covers coverage rows, header domains and withheld placeholder rows, and the document says once that it covers whether anything is recorded there. **D-098.**
- **QA-07-004 (blocking, semantic).** "No sections were chosen, so this document contains nothing about the owner" printed directly under a row reporting nineteen entries across four life areas. **Fix:** `recordsInScope` derives the range, count and areas from the records the chosen sections actually draw on.
- **QA-07-005 (blocking, storage metadata).** A backup took its records from the owner store, correctly, and its `createdAt`, its Taken row and its filename from the laboratory's February clock. **Fix:** `ownerMoment()` — the same decision `ownerSnapshot()` already made, applied to time. The export's "composed on" line uses it too.
- **QA-07-006 (major, mobile).** The bar and both notices were each `position: sticky; top: 0`, so once the page scrolled they occupied one coordinate and the higher z-index took the tap: the **Show mine** that the restore refusal names as the way out was underneath **More** at the scroll position where the refusal is legible. **Fix:** the header group sticks, its members do not.
- **QA-07-007 (blocking, storage).** A failed post-restore reopen left a green "the store now holds the backup exactly" with "what came back is not what was restored" underneath, no rollback, and an empty fallback store published as his history. **Fix:** the confirmation is part of the result, with its own stage and three failure modes, and is deliberately not rolled back. **D-099.**
- **QA-07-008 (non-blocking, copy).** `Nothing to suggest just yet..` — a headline that already carried its terminator joined to a fragment that added one.
- **QA-07-009 (documentation, closeout-blocking).** `PHASE_STATUS.md` still asserted "Deployed Preview SHA `322c00b`" and "Do they match? Yes" after D-097 had removed exactly that pattern from the handoff. **Fix:** rewritten to D-097's pattern, with the equivalence script as the check.

- Regression: `tests/synthetic/export-honesty.test.ts` (QA-07-002 opening-line order, QA-07-003 leak sweep, QA-07-004 scope, QA-07-005 composing moment, QA-07-008 doubled terminators); `tests/unit/memory-provider-restore.test.tsx` (QA-07-005 owner moment, QA-07-007 across all three confirmation failures plus the outer-catch path); `tests/browser/data.spec.ts` (QA-07-005 on a loaded fixture, QA-07-006 tapped from the scroll position where the refusal is read). **Twelve reintroductions, twelve caught.**
- **Which assertions let these through, and why.** QA named them and the list is the useful part. `export-honesty` checked that "not a real person" appeared _somewhere_. The G-013 private test proved the heading and detail were absent and never looked at coverage metadata. The header test compared the document's domains against the **entire source record**, encoding the contradiction. The backup-under-laboratory test checked provenance and record ids and never the dates. The restore-under-laboratory test asserted the refusal contained the words "Show mine" and never tapped it. `memory-provider-restore` exercised a successful reopen and a first-write failure, and no confirmation failure at all. `scripts/android-gate.mjs` never loads a fixture, so 27 green checks could not observe either laboratory-scoped defect.
- **Two reintroductions escaped first, both the same shape as this phase's earlier ones — a sweep that could not fire.** The private word list named the area's labels and not `discreetPlaceholder('private')`, so the dated placeholder row it existed to catch went past it. And forcing the reopen to _throw_ never reaches the operation's outer `catch`, because `openStore` catches everything and degrades to memory — proving that path needed a reopened store that refuses to be **read**.
- Siblings: swept. Every artefact that leaves the device now takes its identity and its moment from the source rather than the screen; every restore failure path returns a stage-specific outcome; no notice sticks at the same coordinate as another.
- Fixed in: `3a8e8b6`

### DEF-0061 (QA-07-001) — a QA handoff asserted literal SHA equality against a commit its own push had already superseded

- Status: Fixed
- Severity: Blocker — independent QA correctly refused to test any product behaviour and returned FAIL; zero acceptance testing of Phase 7 occurred on the first QA attempt
- Found in: Phase 7 / `66eeab3`
- Found by: **independent Codex QA**, at the mandatory deployed-checkpoint preflight, before reading any other repository document (D-090 step 1)
- Class: **a handoff asserting a fact its own act of writing it makes false.** This repository's CI redeploys on every push to `main`, including a documentation-only one, so `build-info.json` always reports whatever commit was actually pushed last. `docs/NEXT_PROMPT.md` for Phase 7 was written into commit `66eeab3` and named `322c00b` — an earlier, already-superseded commit — as "the deployed checkpoint," and told QA to stop if `build-info.json` did not report it. It never could: pushing that very sentence is what moved the deployed SHA to `66eeab3`.
- Reproduction: open `https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` after `66eeab3` deployed. `commitSha` reads `66eeab3...`, not `322c00b`. Compare against `docs/NEXT_PROMPT.md`'s CHECKPOINT section in that same commit, which requires `322c00b`.
- Root cause: not the mismatch — the mismatch is the ordinary, correct consequence of a docs-only commit landing between a build and a later read of it. The defect is asserting literal SHA equality as a blocking precondition at all, rather than asserting the thing actually true and actually needed: that nothing the deployed bundle contains had changed.
- Fix: `scripts/checkpoint-equivalence.mjs <product-sha>` checks bundle equivalence directly — `git diff --name-only` between the named product commit and the current ref, failing if anything under `src/`, `public/`, or the build-input files at the repository root changed. `docs/NEXT_PROMPT.md`'s checkpoint section is rewritten to report the product checkpoint and the live deployed SHA as two separately-named things, backed by this script's output, rather than asserting they are the same string.
- Regression: the script itself, run against the real history (`node scripts/checkpoint-equivalence.mjs 322c00b` from `66eeab3` and later commits) — passes, reporting the four documentation files that actually changed. Reintroduced by committing a one-line change to a `src/` file and rerunning: the script fails and names the file. Reverted; the same command against the untouched history passes again.
- **What this is not.** Not a claim that Phase 7's product behaviour is verified — QA had not yet tested any of it when this stopped it. That testing is the retest this repair hands back to the same Codex QA conversation.
- Siblings: **every prior phase's "Pin the Round N checkpoint" commit relied on the same reasoning this defect broke, informally and unchecked.** None of them are being retroactively rewritten — their QA rounds already passed against those deployments — but D-097 makes the reasoning durable and checkable for every phase and round from here.
- Fixed in: this checkpoint

### DEF-0060 — a count printed beside a plural noun, and two sweeps that could not fire on it

- Status: Fixed
- Severity: Major — owner-facing copy on the surface that handles his only copy of his own history, and the reason it survived is more interesting than the wording
- Found in: Phase 7 / `cc221bd`, and the second half in `91bf40f`
- Found by: the builder's own owner-style read-through of the deployed Preview on an Android context, **after** the automated Android gate had come back clean
- Class: **a fact about a screen that no assertion is shaped to notice.** `expect(row).toContainText('1 entries')` is exactly as green as `'1 entry'`. Everything in this class shares that property — a plural, a pronoun, a raw timestamp, a sixty-four character hash on a phone — and none of it fails a test unless somebody writes the test _about the wording itself_.
- Reproduction, on the deployed build with one record in the owner's store: Data reads "Record covers: 2026-08-22 to 2026-08-22, 1 entries"; the restore preview reads "It will restore 1 entries"; the line after a restore reads "1 entry came back exactly as the backup holds them" and "read back all 1 records identically". Also "Written 2026-08-23T06:04:04.513Z" and a full digest on a 360px row.
- Root cause: counts interpolated straight into a sentence, and two values rendered in their wire form rather than in the owner's.
- Fix: `src/domain/counts.ts` — `countOf(count, one, many)`, taking both words rather than deriving a plural. A backup's moment is read through `localDateTimeAt` in the zone the app is currently using, so it agrees with every other date on screen including under time travel. The fingerprint shows twelve characters; the full digests still appear, in full, in the refusal where two of them have to be compared.
- Regression: `tests/synthetic/export-honesty.test.ts` → "the document reads as English" over every scenario, plus "says '1 entry' on a history that holds exactly one"; `tests/browser/data.spec.ts` → "agrees with itself about how many entries there are" and "shows no raw machine timestamp on the surface"; and three checks in `scripts/android-gate.mjs`.
- **The half worth recording: the first two sweeps could not fire.** No scenario in the library holds exactly one record, and the browser seed wrote two — and a count only disagrees with its noun when the count is one. Both sweeps passed over everything and proved nothing. It was found by reintroducing the defect to check the sweep bit, and watching it not. Both now construct a one-of-something history of their own.
- **A third, smaller one, named for whoever tests this next.** `npx playwright test` serves a prebuilt `dist` and never builds; `npm run test:browser` is the script that builds first. A reintroduction made in `src/` and checked with a bare `playwright test` tests the previous bytes and passes.
- Siblings: swept. Every count on an owner surface in this phase's code goes through `countOf`; `MemoryProvider`'s storage-check sentences were repaired in the same pass even though the QA laboratory is the only place two of them appear.
- Fixed in: `91bf40f` and `322c00b`

### DEF-0059 — two standing copy guards silently stopped reading a file part-way through

- Status: Fixed
- Severity: Major — not a defect in the product, a defect in the thing that proves the product. Two of the guards holding D-089 and section 51 were covering less than they claimed, and passing.
- Found in: Phase 7 / this checkpoint
- Found by: the builder, while writing the export composer's own honesty suite — the new test flagged a sentence that `architecture-guards.test.ts` had just passed
- Class: **a scan that cannot pair quotes.** Both sweeps found string literals with `/'([^']{4,})'|`[^`]{4,}`/g`, and a regex has no idea which quote opens and which closes. The pairing holds until a file contains an **empty** literal: `''` is shorter than the four characters the pattern needed, so it was skipped, the scan resumed at its _closing_ quote, and from there every subsequent quote paired with the wrong partner. The contents of every literal after that point fell into a gap nothing looked at.
- Reproduction: `src/features/export/compose.ts` contains `'…not claims about cause.'` — a literal in a `const lines = [ … ]` array a few entries after an `''`. `/\bcauses?\b/i` matches it, and `it('cannot say one thing caused another, on any surface')` passed. Replicating the guard's own extraction over the file returns **zero** literals containing the word, while the file plainly contains it.
- Root cause: the extraction, not the rules. Both rules were correct and neither was being applied to the text it was written for.
- Fix: `stringLiterals(text)` walks the source with the same scanner that already strips comments — which had to understand quoting to do its job — and returns each literal's contents. The causal sweep and the per-cent sweep both read from it now.
- Regression: `tests/unit/architecture-guards.test.ts` → "reads every literal in a file, including the ones after an empty one" builds the exact defeating shape, asserts the walker finds the offending sentence, and asserts the old regex pairing does **not** — so the guard's own coverage is now a thing that fails rather than a thing that is assumed. "keeps a comment out of the literals, and a literal out of the comments" holds the other half. Reintroduced by reverting `stringLiterals` to the regex: caught.
- **What it had been hiding.** One sentence, in code written the same day, which is the only reason it was found at all. Every file the guards have covered since Phase 2 has been re-swept by the repaired scanner and nothing else surfaced — but the honest reading is that a guard passing is now evidence and was not before.
- Siblings: swept. The other sweeps in that file read `readCode` for structure (imports, identifiers, handler counts) rather than for literal contents, so the pairing bug could not reach them. The deferral-claim sweep reads whole-file prose with the comments stripped, which has no pairing to get wrong.
- Fixed in: this checkpoint

### DEF-0058 — the laboratory's clock came back with the owner's records, and hid the newer ones

- Status: Fixed
- Severity: Blocker — both return controls could present a valid owner history as empty or partial, with the notice already gone
- Found in: Phase 6 / `28d2efc`
- Found by: **independent Codex QA, Round 5** (R5-B1), on the deployed build
- Class: **half a projection.** DEF-0057 established that only the newest work may publish the source and the snapshot. What a reader actually sees is `buildView(snapshot, { now, zone, weekStartsOn })` — so the clock is the other half, and returning his records under the laboratory's clock is not returning his history.
- Reproduction, both paths, on the deployed build: load _Two ordinary weeks_ (clock 2026-02-15) and press **Empty the laboratory** — QA's Storage block still lists every raw owner record while Timeline shows none of them, because they are dated after February. Load _One answer, and a lot of silence_ (clock 2026-06-15), answer its energy question, press **Show mine** — his August records are gone. A reload restores both, by restoring real time.
- Root cause: a scenario button calls `setZone`, `setWeekStartsOn` and `travelTo` before `loadDocument`. `clear()` restored the source and the snapshot and none of the three, so the owner's records were evaluated against the fixture's instant and correctly excluded as not yet having happened.
- Fix: the return publishes **one coherent context** — owner source, owner snapshot, the system clock, the system zone, the default week start, and `travelled` false — in a single continuation, so React renders it in one pass.
- **Restored rather than remembered, and the comment says why.** Nothing outside the laboratory can change the clock, the zone or the week start; those controls are QA's. If that ever stops being true this becomes a stash taken when the laboratory takes over, and the test named below is what will say so.
- Regression: `tests/unit/memory-provider-race.test.tsx` → "gives back his clock as well as his records" drives the provider at a controlled clock and asserts the **view**, not only the store. `tests/browser/qa-lab.spec.ts` → "gives back his clock as well as his records, after answering the fixture" performs the owner's actual sequence. Nine reintroductions across Rounds 4 and 5, all nine caught.
- **The coverage hole QA named, and it was real.** Every Round 4 return test seeded the owner's row at 2026-05-01 and loaded a fixture clocked 2026-05-02 — one day later — so no assertion could observe a record hidden for not having happened yet. The tests proved the store boundary and were blind to the temporal half of the same screen. The seed is now dated August, after every scenario clock, and the guard bites.
- Also fixed: the provider tests ran without `IS_REACT_ACT_ENVIRONMENT`, so every render printed an `act(...)` warning. A warning that noisy makes the assertions around it harder to trust.
- Siblings: swept. `apply` deliberately does not restore anything — entering is the laboratory's to define — and `verifyStorage` and `append` do not touch the frame.
- Fixed in: this checkpoint

### DEF-0057 — the return from the laboratory published an empty history, and said nothing of his had changed

- Status: Fixed
- Severity: Blocker — the owner was told his history was untouched and shown an empty one, indefinitely
- Found in: Phase 6 / `8680642`
- Found by: **independent Codex QA, Round 4** (R4-B1), on the deployed build — one press of **Show mine** after inspecting a fixture
- Class: **an async operation publishing a store the owner has already left.** Not a storage defect: DEF-0054's two databases held, and every byte of his history was safe throughout. What was wrong was the _picture_ of it, and the picture is what he reads.
- Reproduction: record something at a normal Now; open QA and load a scenario; press **Show mine**. Timeline says "Nothing here yet" and stays saying it. A full reload restores everything.
- Root cause: `append` captured the active store, awaited its write, and then published `await current.snapshot()`. When `clear()` ran during that await — emptying the laboratory and switching to the owner — the append then published the laboratory's snapshot, now empty. `apply`, `verifyStorage` and the shared `busy`/`error` state had the same shape.
- Fix: the rule moved out of the component into `src/features/memory/projection.ts`. Every operation claims a job before it starts; anything newer makes it stale; a stale job still finishes its write — the records are already going somewhere real — but publishes nothing: not a snapshot, not `busy`, not an error, not the source. A switch is atomic from the reader's side.
- **Why it left the component.** A rule about interleaving cannot be tested by hoping two things overlap, and this is the third round on one defect class. In `projection.ts` the sequences are written down and asserted in order, every run.
- Regression: `tests/unit/memory-projection.test.ts` — eight sequences, including the reported one exactly. `tests/unit/memory-provider-race.test.tsx` — the provider driven with fake stores whose reads are **held open by the test**, so the overlap is constructed rather than awaited. `tests/browser/qa-lab.spec.ts` — both entry points with owner content, asserted immediately and after a delay. Five reintroductions, five caught.
- **False confidence, and it is the point of this entry.** QA's Round 4 regression failed three-for-three in a focused run and passed three-hundred-for-three-hundred in the full suite, on identical code. Re-running it green proves nothing; it reads as evidence either way. On this repair the same focused run passed for the builder first time, which is exactly why the browser test was not allowed to be the proof.
- Siblings: swept — `apply`, `clear`, `verifyStorage` and the startup read all take a job and all check it. `HistorySource` had been declared in two files and now has one home, DEF-0053's class on a type.
- Fixed in: this checkpoint

### DEF-0056 — a concept declared trackable whose readings the tracking path throws away

- Status: Fixed
- Severity: Blocker — D-091 invariant 6, and the builder had told QA this concept "participates"
- Found in: Phase 6 / `481c3a7`
- Found by: **independent Codex QA, Round 3** (R3-B3), checking a builder claim against the code rather than against the registry
- Class: **an unverifiable declaration.** `tracked` was a boolean asserting that a concept is worth a trend and can be learned from, and nothing anywhere checked that the machinery could read what the concept actually holds. Any concept could carry it, truthfully or not.
- Reproduction: `emotionalState` was `tracked: true`. Its values are free text — `flat`. Both the trajectory path and `association.ts` call `numericValue`, which returns `undefined` for text, so every reading was discarded before any scale, direction, trajectory or before-and-after comparison existed. The concept was declared tracked, said to participate, and could not.
- Root cause: the registry described no value shapes at all, so `tracked` was a claim with nothing to check it against. QA-A1's repair had added the flag to fix a real problem — that no subjective dimension could be learned from — and reached one concept too far.
- Fix: `tracked` now names **how** a reading becomes a number — `'scale' | 'number' | 'duration'`, exactly the shapes `numericValue` reads. Six concepts declare theirs. `emotionalState` declares none and is not tracked, with the reason written where the concept is defined.
- **What was deliberately not done:** no scale was invented for how he feels. Mood, stress, confidence and motivation are four things and one number for all four is the wellness score the owner rules out. The concept keeps everything else — asked for, material to a decision, sensitive, shown as he said it. Which dimensions exist is his to say, and it stays an open question (D-091 invariant 6).
- Regression: `tests/unit/registries.test.ts` → "a tracked dimension is one thing, on one scale" — "can actually be read as a number by the path that tracks it" runs each declared shape through the real `numericValue` rather than trusting the label; "never declares a shape the tracking path would throw away"; "leaves the emotional taxonomy open rather than inventing one". Proved by declaring a concept tracked on a text shape and watching it fail.
- Siblings: swept — the other six tracked concepts all declare shapes the path reads, and the trajectory consumer was moved from `!== true` to `=== undefined` in the same pass.
- Fixed in: this checkpoint

### DEF-0055 — a correction scoped to a walk, described to the owner as the verb

- Status: Fixed
- Severity: Blocker — the phase gate forbids printing a learned relationship under a name that fits a different action
- Found in: Phase 6 / `481c3a7`
- Found by: **independent Codex QA, Round 3** (R3-B2), by pressing the control and then reading Timeline
- Class: **an invariant that held in the key and died on the way to the screen.** DEF-0046 scoped the association, its key and its card control to the action. The _stored_ record is read back by a different renderer, months later, and that path was never part of the identity work.
- Reproduction: open the walk relationship — its control correctly says `what the app has worked out follows a walk` — press `That is not right`, then open Timeline. The row read: **`Told the app to stop assuming what the app has worked out follows move.`** A sentence that fits the bike ride the owner never disputed, on the surface that is meant to be the canonical account of what he did.
- Root cause: `Insight.beliefLabel` knows the object only while the card renders. `describeBelief` works from the key alone, and a key carries an action scope but not an entity registry, so it fell back to the verb — and `describeRecord` used that fallback.
- Fix: `actionScopeParts` reads the action back out of a scope, and `describeBelief` takes the entity index and names the object. Every owner-facing caller passes one. A family scope names several actions on purpose and says so. The key, the watershed and the evidence underneath are untouched.
- Regression: `tests/synthetic/observed-relationships.test.ts` → "names the action in the owner's own history, not the verb" builds a real correction and passes it through `assembleTimeline` — the shared renderer, which is where the assertion was missing. Proved twice by reintroduction: the verb fallback, and the renderer dropping the index.
- Siblings: checked. `NowScreen`'s beliefs are the five verb-scoped aspects, where naming the verb is correct; Insights already preferred `beliefLabel` and now passes the index behind it.
- Fixed in: this checkpoint

### DEF-0054 — loading a QA scenario destroyed the owner's real history

- Status: Fixed
- Severity: Blocker — reproducible loss of canonical owner data, with no warning and no undo
- Found in: Phase 6 / `481c3a7`
- Found by: **the owner**, who answered a question on a normal Now and later found Timeline empty — then reproduced and diagnosed by independent Codex QA, Round 3 (R3-B1)
- Class: **a separation drawn on one axis and not on the other axis it exists to protect.** `indexedDbStore.ts`'s own comment states the rule: without a database name per target, "synthetic QA data would land in the same place as real history — exactly the separation section 33 requires." That was applied between Preview and production, and never between the laboratory and the owner. Within one target they were one store.
- Reproduction: on a normal Now, record something. It appears in Timeline and survives navigation, refresh, tab close and reopen. Open QA, load any scenario. The owner's history is gone — `loadDocument` calls `replaceAll`, which clears every object store before writing the fixture.
- Root cause: one database, `life-command-os:${target}`, for every surface including the laboratory.
- Fix: two databases. The laboratory gets `…:laboratory` and nothing it does can reach the owner's. Which one is active is **derived** from whether the laboratory is holding anything, rather than remembered in a flag — an empty laboratory is one that is not in use, so putting a fixture away is emptying it, nothing can drift, and a reload lands where it left off. Answers written while a fixture is on screen go to the fixture, which is right: his own history comes back untouched.
- **And the app now says whose evening it is.** A fixture must stay inspectable from Now, Timeline, Insights, Life and a domain page — that is the point of the laboratory — which is exactly why a person standing on Now has to be told when the evening in front of him is not his. A notice on every surface says so and offers `Show mine`, which costs nothing because his history was never written over. `Clear everything` is now `Empty the laboratory`, because the old name promised something it must no longer do.
- Regression: `tests/browser/qa-lab.spec.ts` → "the laboratory and the owner keep separate histories" — three tests: his record survives a loaded scenario and comes back when the laboratory is emptied; a normal surface says whose evening is on screen; a reload keeps both the fixture and the notice. Proved by pointing both names at one database and watching his record vanish.
- **False confidence, named by QA and confirmed:** `qa-lab.spec.ts` already proved a loaded scenario survives reload and reopen, and even exercised clearing — and never once put an owner record in front of the laboratory. Every assertion passed while the defect destroyed real data.
- Siblings: swept. Deployment does not orphan the store — the database name carries no SHA and `DB_VERSION` is unchanged — and Preview and production remain separated. `append`, `clear` and `verifyStorage` all act on the active store.
- Fixed in: this checkpoint

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
