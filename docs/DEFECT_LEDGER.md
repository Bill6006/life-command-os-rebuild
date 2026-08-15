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
