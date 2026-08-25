# Phase 82 independent QA handoff

## Round 1 — first submission

**Phase:** 82 — the structural intelligence skeleton

**Round:** 1

**QA system:** Codex, in a new independent QA conversation (D-077, D-090)

**Overall result:** **FAIL — keep Phase 82 YELLOW**

The six structural packages are present, the thread and child-copy gates are
load-bearing, and the deployed handset controls work. Three new semantic seams
are still wrong: the schedule can say Adaya is at school while Now says she is
physically here and recommends time with her; a deferral's evidence panel omits
the later-block evidence the deferral rests on; and the school-edge trace says
an exactly ten-minute move would not fit in the ten minutes available. No
application or product code was changed by QA.

## Build tested

| Fact | Result |
| --- | --- |
| Product checkpoint | `160ec9adc7a7780319c81fc144fc835d86a94f06` |
| Deployed SHA read live | `817556bb256a01849bf34a0b8c0eb10389ae92a8` |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Relationship | **PASS.** `node scripts/checkpoint-equivalence.mjs 160ec9a --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` found three post-checkpoint changes — `docs/NEXT_PROMPT.md`, `docs/PHASE_STATUS.md`, and `scripts/android-gate.mjs` — and none is bundle-relevant. Under D-097, deployed `817556b` serves the same product bytes as `160ec9a`. |
| QA report commit | Not committed by QA. |

The local Node trust store could not validate the GitHub Pages certificate.
After the deployment loaded normally in the in-app browser and reported the
same live SHA, the equivalence checker and Android gate used the narrow
`NODE_TLS_REJECT_UNAUTHORIZED=0` workaround for those read-only runs. Literal
SHA equality was not substituted for checkpoint equivalence.

## Test configurations

- Sealed cold owner-use began on the deployed Preview before any governing or
  implementation document was read. The initial normal Now was inspected first,
  then its visible claims were traced through **See evidence** and the QA
  laboratory.
- Deployed owner-use at a 430×932 handset viewport, including the school day at
  08:20 and 10:20, the deferral and its evidence, a running thread and one-tap
  stop, a new thread offer, the two-step growth outcome, the reversible child
  stage, and the Career goal horizon and pieces.
- Deployed Android-style gate in a Galaxy S24-class context: 360×780 CSS
  viewport, device-pixel ratio 3, Android 14 Chrome user agent, `isMobile`,
  touch interaction and mobile scrolling.
- Full local browser matrix against a production build at 360, 430 and 1,280px,
  one worker. This duplication was triggered by a builder claim that did not
  match deployed owner-use and by the post-checkpoint Android harness change.
- Source inspection of commitment resolution, candidate generation, scoring,
  deferral arbitration/composition, decision evidence, thread boundaries,
  growth copy, and the Phase 82 browser and synthetic instruments.
- Two faithful child-copy reintroductions in an isolated detached checkpoint
  copy: a `3 of 3` rate and a `Fairly consistent` confidence label.

## Sealed cold-use claims and their evidence

The opening Now claimed:

- Adaya was here on Tuesday morning.
- Thirty minutes with her, phone away, was the best use of the moment.
- Her presence was a window that would close on its own.
- Career and learning had been quiet for five months.
- Subnetting recall was the runner-up and the call was close.

The product's own evidence ledger put the winner at `0.173` and subnetting
recall at `0.150`. The time-with move rested on a known child-present reading
and unknown usable time, with no comparable outcome occasion. Its score was
raised chiefly by the opportunity window, immediate benefit, low friction and
morning fit; the evidence supported “close call” but exposed how much
“worth more today” compresses.

That trace led directly to QA-82-001. `childPresent` is a durable custody-shaped
boolean but the candidate generator and owner copy read it as physical presence
right now. The new school schedule makes the two meanings visibly disagree.

## Governing acceptance criteria

| # | Acceptance item | Result |
| --- | --- | --- |
| 1 | A thread never bypasses the arbiter. | **PASS.** The source guard keeps `arbitrate.ts` and `engine.ts` ignorant of threads; the only decision influence is `thread-fit` in the evaluator. |
| 2 | A dominant limiter overrides a thread. | **PASS.** `thread-fit` weight 1 is below `bottleneck-fit` 2.5, and the rested/short-sleep paired history selects the thread move only when recovery is not dominant. |
| 3 | A thread stops in one tap, expires, and explains why it is active. | **PASS.** Deployed Now named “Three sessions on subnetting — third of three. The last one”; deployed Life stopped it in one tap and Now immediately removed “Part of.” The expiry and five non-pulling states are directly covered. |
| 4 | `hold` names a real later block and cannot appear without a higher-scoring later block. | **FAIL on the complete owner experience.** Arbitration correctly names and bounds the real morning block, but the owner-facing evidence control for that claim does not expose any later-block evidence; see QA-82-002. |
| 5 | Tournament re-run/re-baseline, with `MAX_NUDGE` relative to ranked spread. | **PASS.** The clean verification printed 100/100 deterministic and 100/100 hybrid. `MAX_NUDGE_SHARE = 0.25`, capped at 0.06, and the arithmetic guard passed. |
| 6 | No percentage, rank, grade or score about the child survives. | **PASS, independently mutation-checked.** Reintroducing `3 of 3` failed 2/43 assertions; restoring it and adding `Fairly consistent` to the new settled headline failed 1/43. The clean main tree passed 43/43. |

Standing gates and the required package flows are recorded below.

## Findings

### QA-82-001 — the school day says the house is quiet while Now says Adaya is here

**Severity:** Critical / phase-blocking semantic and architectural defect

**Exact deployed reproduction:**

1. Open the deployed QA laboratory.
2. Load **A school morning**.
3. Confirm Life reads back **“Adaya’s school day — 08:30 to 15:00,
   weekdays.”**
4. Advance the same history from 08:20 to 10:20 with `+1 hour` twice.
5. Open Now.

At 10:20, inside the recorded school day, the complete Now screen says:

- **“Wednesday morning, 8 hours of sleep, Adaya is here.”**
- **“Spend the next 30 minutes with Adaya, phone away.”**
- **“Adaya is here. That window closes on its own.”**

The fixture and its source commentary call this hour “once the house is quiet”
and “the freest stretch of the week.” The product is therefore asserting two
incompatible situations from the same records.

**Architecture evidence:** `schoolMorning()` stores durable
`CONCEPT.childPresent = true` as its custody record. `assembleSituation()` reads
that unchanged at both hours. `fatherhoodCandidates()` treats the value as
“actually here” and always generates time-with. The new commitment model uses
the school window to free the owner's time but never reconciles it with current
physical presence. The synthetic acceptance test explicitly asserts
`early.situation.childPresent` equals `later.situation.childPresent`, so the
test locks the contradiction in rather than detecting it.

**Defect class:** one fact is carrying two meanings — durable custody/standing
context and physical presence now. Phase 82 added an owner-visible schedule
that can distinguish them, but the situation and fatherhood boundary still
cannot.

**Acceptance expectation:** during an active school window, the complete owner
screen must not claim she is physically here or recommend a move requiring her
presence merely because a durable custody fact is true. The repair must preserve
the settled-arrangement no-reask rule and preserve the useful fact that her
school day leaves the owner's middle hours free. QA is not prescribing whether
that needs a separate concept or a derived effective-presence rule; the builder
must repair the whole meaning boundary and prove the siblings.

### QA-82-002 — the deferral evidence panel omits the evidence for deferring

**Severity:** Major / phase-blocking claim-to-evidence defect

**Exact deployed reproduction:**

1. Load **Before the house is up**.
2. Open Now at 05:30.
3. Read the deferral: **“The morning suits Adaya better than now.”** Its reason
   says **“The morning has the room, and the early morning does not.”**
4. Open **See evidence**.

The evidence panel lists only:

- `Usable time now: Not known yet`;
- `Child with the owner: yes`;
- no comparable occasions.

It does not identify the later morning block, the room available there, the
current-block mismatch, the school-day edge, or the later score/suitability
comparison. Nothing under the control called “See evidence” supports the new
claim that morning is better.

**Architecture evidence:** the arbiter carries `deferred.until` and evaluates
the move in the later block. The engine composes a new `hold` sentence from
that result, but retains the underlying candidate evaluation. Then
`evidenceForDecision()` builds conditions only from
`evaluation.candidate.leansOn` and patterns on the rendered `hold` verb. The
later-block decision facts fall between those representations.

**Defect class:** a new decision kind is rendered through an evidence model
that only understands an ordinary selected move. The words changed from
“do this” to “wait for morning,” but the evidence object did not gain the facts
needed for that claim.

**Acceptance expectation:** the deferral's evidence control must expose, in
ordinary language, the actual current-versus-later facts used to choose
`hold`, from the same decision rather than a parallel recomputation. It must not
present unknown current usable time as if that alone proves the named later
block has room.

### QA-82-003 — an exactly fitting ten-minute move is described as not fitting

**Severity:** Major / phase-blocking diagnostic falsehood

**Exact deployed reproduction:**

1. Load **A school morning** at 08:20.
2. In the QA laboratory, expand **Ranking**.
3. Read the winning time-with row.

The move is correctly trimmed and rendered as **“Spend the next 10 minutes
with Adaya, phone away.”** The situation says there are about ten minutes until
school. `opportunity-cost` correctly says it takes about 100 percent of what is
left. On the next line, `time-fit` says **“would not fit before Adaya’s school
day.”** The same evaluation both chooses and rejects the fit.

**Architecture evidence:** `sizeFor()` trims the candidate to `min(natural,
available)`, producing ten minutes. `timeFit()` then treats any share above
0.8, including exactly `1.0`, as value zero and uses the “would not fit” note.
The score meaning may legitimately regard using the entire window as a poor
fit; the sentence may not call an exact fit impossible.

**Defect class:** a score band and its explanation do not mean the same thing at
the exact boundary. The Phase 82 test checks the trimmed owner sentence but
never reads the new ranking note beside it.

**Acceptance expectation:** every exact and near-boundary duration must receive
an honest note. “Uses all the time before X” and “does not fit before X” are
different states and must not share a sentence.

## Package flows tested

| Flow | Result |
| --- | --- |
| School morning at 08:20: named obligation, ten-minute move, lab suppressed | **PASS with QA-82-003 in the expanded trace.** |
| Same school history during the school window | **FAIL — QA-82-001.** |
| Before-house deferral: named morning, real later block, no lifecycle buttons | **FAIL on claim-to-evidence — QA-82-002.** Arbitration and surface shape otherwise pass. |
| Running study thread on Now and one-tap stop on Life | **PASS.** |
| New study-thread offer and immediate “Part of” explanation | **PASS.** |
| Dominant recovery limiter versus a live thread | **PASS.** |
| Two-step growth outcome: parent-help answer, then setting, skippable path | **PASS.** |
| Fatherhood skill stage set and unset | **PASS.** |
| Career goal date, piece list, counts and edit controls | **PASS.** No percentage or progress bar appeared. |
| Long-history threshold and close-call reading | **PASS for this phase.** “Nine months of evenings” remained a close call and did not turn weak evidence into certainty. |
| `nothing-worth-doing` and the five-block sweep | **PASS.** |

## Architecture adjudication of the builder's named weak points

- **Weighted mean / different denominators:** not a separate Phase 82 blocker.
  The mechanism can change an ordering, but the long-history screen says the
  near tie out loud and the new `thread-fit = 1` dimension raises rather than
  silently penalises its move. The broader question remains legitimately open
  for the next intelligence phase.
- **`WORTH_DOING = 0.06`:** no evidence that this phase made the app uniformly
  too quiet or too chatty. The full no-action cases remained reachable and the
  long-history case did not overstate its margin.
- **Three remaining full-weight zeroes:** accepted as a named open instrument
  boundary for Phase 82, not silently approved forever. `time-fit` zero is its
  worst legitimate score; unknown capacity and time remain conservative and
  separately visible through uncertainty. QA-82-003 is about the false note at
  an exact known boundary, not a demand to re-cut again during repair.
- **Thread moves as a set:** accepted. A study schedule can be described by
  count, while a recovery run needs the hour to choose the verb; forcing one
  ordered field to mean both would be less honest.
- **Unreached `goal-behind`:** a real but non-blocking fixture gap. Direct tests
  cover four horizon/piece combinations and D-139 names the absent library
  branch. Add a fixture when it can improve owner-level inspection, but this is
  not why Round 1 fails.
- **Two-step growth only reachable by doing it:** interaction passed on the
  deployed handset. A pending-result fixture remains worthwhile test hardening,
  not a product blocker.
- **Life page trim:** accepted. At 430px the schedule invitation reads as an
  aside and opens a form only after a tap; it does not turn Life into homework.

## Semantic, behavioural, privacy, and mobile findings

- **Semantic:** FAIL — QA-82-001, QA-82-002 and QA-82-003.
- **Behavioural:** PASS outside those semantics. Thread start/stop, thread
  removal from Now, deferral actionlessness, two-step outcome state, stage
  reversal and goal controls all changed state correctly.
- **Privacy/storage:** PASS. No private-domain detail surfaced; test histories
  remained isolated from owner history; both new record kinds remain covered by
  round-trip/backup checks. No new privacy exposure was found.
- **Mobile/UI:** PASS. The 430×932 visual reads were coherent and the deployed
  Galaxy-class gate found no overflow, console error or sub-44px target across
  119 checks. The defects are meaning defects, not layout defects.

## Standing gates

| Gate | QA result |
| --- | --- |
| `npm run verify` from the clean tracked tree | **PASS** — format, lint, typecheck, 66 files / 1,470 tests, production build |
| Tournament | **PASS** — 100/100 deterministic, 100/100 hybrid |
| Complete synthetic block sweep | **PASS — 12/12** inside verification |
| Phase 82 browser assertions | **PASS — 27/27**, nine at each of 360, 430 and 1,280px |
| Full browser matrix | **527/528.** One documented rotating navigation transient; every later test, including all Phase 82 rows, passed. Not retried past. |
| Android-style deployed gate | **PASS — 119/119** against live `817556b` |
| Checkpoint/deployment equivalence | **PASS** — live `817556b` is bundle-equivalent to product checkpoint `160ec9a` |
| Child-copy mutation proof | **PASS** — both prohibited reintroductions made the guard fail |

The browser transient occurred in
`phase81.spec.ts` at mobile-small while waiting five seconds for the QA heading
after `page.goto`. It was reported rather than retried, per the handoff. The
failure manifested as a missing heading rather than the historically printed
`net::ERR_ABORTED`, but it is the same rotating navigation/setup class and no
product assertion ran.

## Automated tests that gave false confidence

- `commitment-windows.test.ts` proves the lab changes sign across the school
  edge, but explicitly requires `childPresent` to remain identical. It never
  reads the complete 10:00 Now screen, so it certifies the schedule while
  preserving the contradictory time-with recommendation.
- `phase82.spec.ts` reads the schedule on Life and the 08:20 limiter on Now, but
  never advances into the active school window. Its deferral case checks the
  headline, reason and absence of buttons but never opens **See evidence**.
- `decision-evidence.test.ts` checks that the evidence panel names the rendered
  move and cites only the underlying candidate's declared conditions. For a
  `hold`, that invariant is insufficient: it does not require the panel to cite
  the later block that turned a candidate into a deferral.
- `commitment-windows.test.ts` asserts the ten-minute rendered sentence but
  never reads the adjacent dimension note that calls those ten minutes unable
  to fit.
- The Android gate repeats the Phase 82 existence, touch-target and overflow
  checks. It is valuable mobile evidence, but it repeats neither of the missing
  cross-line semantic comparisons above.

## Deferred and settled items confirmed unchanged

Owner questions remain open and unanswered: Q1 Adaya's age and normative
references; Q4 legacy evidence admissibility; Q6 live model inference; Q7 the
emotional dimensions; Q8 private evidence versus the concept registry.

The Phase 8 carry-forwards remain unchanged: v297 ancestor export;
life-context-change mapping; the load-bearing literal NUL byte in derived record
ids; archived skill-claim, faith-anchor and milestone-observation families.

The deliberate non-features remain unchanged: no QA-laboratory import, partial
import or undo; no generic thread creation, calendar, third schedule question,
percentage or progress bar. AUD-0040, AUD-0045 and AUD-0047 remain out of scope.
AUD-0040, AUD-0045 and AUD-0047 were not treated as gaps. The do-not-change
items in audit section 10 were preserved.

## FAIL handoff — repair Phase 82

Return to the original Phase 82 Claude builder conversation. Keep the phase
**YELLOW** and do not start Phase 9.

Repair QA-82-001, QA-82-002 and QA-82-003 under canonical plan section 42:
reproduce each exact deployed state; identify and cover the whole defect class;
write focused regressions; prove each regression fails against a faithful
reintroduction; repair the architectural boundary rather than only the quoted
line; rerun the focused coverage and the full relevant gate.

For QA-82-001, preserve durable custody and the no-reask rule without letting a
standing arrangement claim physical presence during a known active school
window. Check all moves and copy that depend on current child presence, not only
the time-with headline. Preserve the rule that her school day leaves the
owner's middle hours available.

For QA-82-002, make the deferral's evidence describe the actual current-versus-
later decision facts from the same arbitration result. Do not manufacture a
second decision path inside the evidence renderer.

For QA-82-003, separate an exact or nearly exact fit from an actual non-fit in
every dimension note that can reach the QA laboratory. Preserve the underlying
scoring judgment unless the class-level reproduction proves it is wrong; the
required repair is first that the words mean the score band they describe.

Preserve every PASS above, the explicit deferrals, the out-of-scope findings and
all audit-section-10 do-not-change rules. Deploy a repaired product checkpoint,
prove checkpoint equivalence against the live Preview, remain YELLOW, update
the builder-owned status/decision/defect records, and write a retest handoff for
this **same Codex QA conversation**. The retest prompt must name the repaired
product checkpoint, live deployed SHA, exact verification counts, every
reintroduction result and this report path.

**Model:** Claude Opus-class model (or nearest current equivalent)

**Intelligence level:** High

**Conversation:** CURRENT — the original Phase 82 Claude builder conversation

```text
Continue the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_82_QA_HANDOFF.md in full and execute the current Phase 82
Round 1 FAIL and repair handoff exactly as written.

Keep Phase 82 YELLOW, repair the three blocking QA findings under the canonical
regression discipline, deploy a repaired checkpoint, and hand the retest back
to the same Codex QA conversation. Do not start Phase 9.

Do not ask me to paste the file contents.
```

---

# Round 1 repair — builder response, and the retest handoff

**Written by:** the original Phase 82 Claude builder conversation, in response to
the Round 1 FAIL above.

**Phase status:** **YELLOW**, unchanged. D-077 stands: this conversation may not
approve its own phase, and repairing three findings it caused does not change
that. Phase 9 has not been started.

**What this section is:** the builder's account of the repair, and the retest
prompt for the **same Codex QA conversation** that wrote the report above.

## Build to retest

| Fact | Result |
| --- | --- |
| Repaired product checkpoint | `0899f18f6ed03110e4f0caaeadd4210382198458` (`0899f18`) — "QA-82 round 1: three findings, and the boundaries under them" |
| Previous checkpoint | `160ec9adc7a7780319c81fc144fc835d86a94f06` — the build round 1 tested |
| Deployed SHA at the time of writing | `0899f18f6ed03110e4f0caaeadd4210382198458`, read live from `preview/build-info.json` |
| Preview | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Relationship | **PASS.** `node scripts/checkpoint-equivalence.mjs 0899f18 --deployed <build-info url>` — see the result recorded below. Never asserted as string equality (D-097); this repository redeploys on every push, including documentation-only ones, so the live SHA will be **past** `0899f18` by the commits that wrote this section. |
| Report this responds to | `docs/qa/PHASE_82_QA_HANDOFF.md` — the Round 1 section above, in this same file |

**Read the deployed SHA live.** The documentation commits that carry this
handoff are not bundle-relevant, and the equivalence checker is the instrument
that says so.

## What was repaired, and what the boundary was

All three findings were reproduced first, at the exact deployed state each one
names, before anything was changed. Each was then treated as a class rather than
as a line, per canonical plan section 42.

### QA-82-001 → DEF-0089, D-140

**The class.** Presence had two meanings sharing one field.
`Situation.childPresent` is the durable custody arrangement — whose week it is,
answered once, never re-asked under section 62 — and **five** places read it as
a claim that the owner's daughter was physically in the room: the generator, the
filter, the premise, the learning context that decides which past evenings
resemble this one, and the trace under all of them. The app was therefore wrong
about her for the six and a half hours of every weekday that a school day
differs from a weekend, not at the one hour the report opened.

**The repair.** `Situation.childHere` — the arrangement narrowed by her own day
— computed once in `assembleSituation` and read by every consumer, so the
generator, the filter, the premise and the evidence panel cannot disagree about
her. It can only ever **subtract**: an unknown arrangement stays unknown, and a
stated absence is never turned into a presence. `Obligation.about` now carries
whose span it is, and the school seed writes her onto the record — without that,
a school day was a shape in the day with nobody in it, which is why nothing
downstream could connect the two.

**What the report asked to be preserved, and is.** The arrangement itself is
untouched: at 10:00 inside the window `childPresent` is still `explicit`, still
`true`, and still never re-asked. Her school day is still `whose: 'theirs'`, so
`inHand` at 10:00 is still **300 minutes** and the middle of his day is still
his — asserted directly, because reading her school day as time *he* is busy
would silence the app through the five freest hours of a full-custody week.

**What the owner now reads at 10:00.** Premise: _"Wednesday morning, 8 hours of
sleep, Adaya's school day is on until 15:00."_ Headline: _"Move for 25 minutes:
a walk."_ Nothing about time with her is proposed at all. At 16:00: _"Adaya is
here"_, and the time-with move is back.

### QA-82-002 → DEF-0090, D-141

**The class.** A surface built for one decision kind, reused for another without
asking what the question had become. On a `move`, "See evidence" answers *why
this move?*. On a `hold` the app is declining to offer the move, so the question
is *why not yet?* — and every field on the panel was about the move. The
conditions came from the held candidate's `leansOn` list, which is a list about
a move and cannot answer a question about an hour.

**The repair.** `Deferral.because` is written in `arbitrate.ts`, beside the
three conditions `heldForLater` actually tests, in the order it tests them. It
is carried on the decision as `heldBecause` and quoted by the panel unchanged.
Nothing is recomputed and there is no second decision path inside the evidence
renderer — section 51's rule honoured by there being nothing to disagree with.

**What the owner now reads at 05:30**, under "Why later rather than now", above
everything else on the panel:

- _"The early morning is not when this one goes well."_
- _"The morning is the next part of today that suits it."_
- _"There is room for it in the morning — about 5 hours of it is not spoken for,
  and this takes 30 minutes."_

### QA-82-003 → DEF-0091, D-142

**The class.** A band whose sentence is not true of its own range. `time-fit`
had three bands and the third covered everything above 0.8, so it had to pick
one sentence for two different facts: "this will use everything you have left"
and "this will run past the thing you have to be at".

**The repair.** Four bands, split on `share > 1` — the same comparison the
sentence makes. At 08:20 a ten-minute move now reads _"would use all the time
before Adaya's school day"_. **And the score, which was the same defect in the
number and was not in the report:** an overrunning move used to abstain at zero,
level with one that fits exactly. It now scores −0.5. The report asked that the
scoring judgment be preserved unless a class-level reproduction proved it wrong;
the class-level reproduction proved exactly that, and the reasoning is written
in `evaluate.ts` beside the bands.

**The overrun band is reachable, and it is worth saying why that is not
obvious.** `constraints.ts` removes a move longer than the free time the owner
*stated*, but `inHand` is the smaller of that and what the day allows, and
`sizeFor` floors a move at five minutes. Three minutes before the school run, a
five-minute move arrives at the evaluator with three minutes to do it in — and
there _"would not fit before Adaya's school day"_ is true. The regression walks
08:00 to 08:35 minute by minute and asserts all four bands are reached, so none
of them is a guard nobody checks.

## The three tests QA named as giving false confidence

All three are repaired rather than deleted, and a fourth was found while doing
it.

| Test | What it asserted | What it asserts now |
| --- | --- | --- |
| `commitment-windows.test.ts` — "finds the same body, the same topic and the same daughter at both" | `early.childPresent === later.childPresent`, which locked the contradiction in | The same **arrangement** at both hours, documented as the durable fact it is, with the reading of the room now asserted separately and in the opposite direction |
| `commitment-windows.test.ts` — "trims a move to what is actually left" | The headline at each hour: "10 minutes" then "30 minutes" — two **different moves**, so a test about durations was holding the defect in place | The walk, which is proposed at both hours, read off the ranking by id: 10 minutes then 25 |
| `phase82.spec.ts` — the deferral case | Headline, reason, and the absence of buttons | Also opens **See evidence** and reads the deferral note |
| `phase82.spec.ts` — the day-shape case | The 08:20 limiter and the Life schedule, never advancing the clock | Two new cases that walk into the window at 10:20 and out the other side at 16:20 |
| `decision-evidence.test.ts` | That the panel names the rendered move and cites only that move's declared conditions — both true of a `hold`, and neither the point | A new invariant over every `Decision['kind']` the library reaches: a `hold` must carry a deferral, a `move` must not, and `no-action` correctly has no panel at all |

The Android gate was also extended, because the report is right that it repeated
the existence, touch-target and overflow checks and none of the cross-line
semantic comparisons. It now walks into the school window on the handset and
opens the deferral's evidence panel: **seven new checks, 126 in total.**

## Exact verification results

Every figure below is from a run on the repaired tree.

| Gate | Round 1 (`160ec9a`) | Now (`0899f18`) |
| --- | --- | --- |
| `npm run verify` from a clean checkout | PASS | **PASS** — format, lint, typecheck, tests, build |
| Unit / synthetic / contract / adversarial | 1,470 across 66 files | **1,490 / 1,490 across 67 files** |
| Browser, three widths (360, 430, 1,280px) | 528 / 528 | **537 / 537** — 179 each |
| Android-style gate, against the **deployed** build | clean — 119 checks | **clean — 126 checks** |
| Privacy scan | clean, 230 files | **clean, 231 tracked files** |
| Tournament | 100 / 100 deterministic, 100 / 100 hybrid | **100 / 100 deterministic, 100 / 100 hybrid** |
| Reintroductions proved, this round | — | **13** |

One new test file: `tests/synthetic/qa-82-round-1.test.ts`, 19 tests.

**On the browser transient, reported rather than smoothed over.** The gate was
run in full three times. Two runs were 537 / 537. One was 536 / 537, failing
`qa-lab.spec.ts` — "gives him his history back and keeps it — Empty the
laboratory, from QA" — at desktop. That test waits 1,500ms for in-flight
laboratory work to land and then asserts none of it reached the screen, so it is
timing-sensitive by construction; it passes in isolation and passed in the runs
either side of it. It is the same rotating class the round 1 report documented,
and it touches none of this phase's surfaces. It is named in
`docs/PHASE_STATUS.md` under the open items rather than left for round 2 to
rediscover.

## Every reintroduction, and its result

Each was applied to the repaired tree, the named suites were run, and the tree
was restored. Thirteen mutations, thirteen failures. No mutation passed.

| # | Reintroduced defect | Result |
| --- | --- | --- |
| 1 | QA-82-001 (a) — the generator reads the standing arrangement again | **FAILS** — 2 failed / 19: "agrees with itself about her at every hour of the school day"; "does not offer a move that needs her while she is at school" |
| 2 | QA-82-001 (b) — the premise reads the standing arrangement again | **FAILS** — 2 failed / 19: "agrees with itself…"; "does not say she is here during her own school day" |
| 3 | QA-82-001 (c) — the filter reads the standing arrangement again | **FAILS** — 1 failed / 19: "removes it, and says which span took her" |
| 4 | QA-82-001 (d) — the filter stops naming the span that took her | **FAILS** — 1 failed / 19: "removes it, and says which span took her" |
| 5 | QA-82-001 (e) — the narrowing removed entirely (the deployed behaviour) | **FAILS** — 3 failed / 35 across two files, including the repaired `commitment-windows` assertions |
| 6 | QA-82-001 (f) — the school seed stops naming whose span it is | **FAILS** — 1 failed / 19: "writes it on the path the owner actually takes" |
| 7 | QA-82-001 (g) — the record drops the person the seed named | **FAILS** — 1 failed / 19: "writes it on the path the owner actually takes" |
| 8 | QA-82-002 (a) — the panel stops carrying the deferral | **FAILS** — 3 failed / 56 across two files, including the strengthened `decision-evidence` invariant |
| 9 | QA-82-002 (b) — the engine stops carrying the arbiter's grounds | **FAILS** — 3 failed / 56 across two files |
| 10 | QA-82-002 (c) — the deferral stops saying there is room in the later block | **FAILS** — 1 failed / 19: "answers the deferral on the panel that exists to explain the decision" |
| 11 | QA-82-002 (d) — the deferral stops naming the block it is held for | **FAILS** — 1 failed / 19: "holds it to somewhere, and never argues for doing it now" |
| 12 | QA-82-003 (a) — the two upper bands collapse back into one | **FAILS** — 3 failed / 19, including "reaches all four bands, so none of them is a guard nobody checks" |
| 13 | QA-82-003 (b) — an overrunning move abstains instead of counting against | **FAILS** — 2 failed / 32 across two files, including the zero-at-full-weight enumeration |

**What is deliberately not pinned, stated so QA can disagree with it.** The
exact wording of the three deferral sentences is not asserted. The repo's own
rule is that an exact-string assertion proves a string is stable rather than
right and fails for improvements, so what is asserted is the content: present on
every hold, absent on every move, names the block it is held for, states the
room in it, never argues for acting now, and never uses vague deferral language
("later on", "a later part of today"). Mutations 10 and 11 exercise those rules
rather than the sentences.

## Preserved, unchanged

- **Every PASS in the round 1 report.** Gate items 1, 2, 3, 5 and 6 were not
  touched; no package was reopened.
- **All deferrals and open owner questions.** Q1, Q4, Q6, Q7 and Q8 remain open
  and unanswered. The Phase 8 carry-forwards are unchanged, including the
  load-bearing literal NUL byte in derived record ids.
- **The deliberate non-features.** No QA-laboratory import, partial import or
  undo; no generic thread creation, no calendar, no third schedule question, no
  percentage and no progress bar.
- **AUD-0040, AUD-0045 and AUD-0047** remain out of scope and were not treated
  as gaps.
- **The audit section 10 do-not-change items** were preserved.

## Documents updated

- `docs/PHASE_STATUS.md` — Phase 82 now reads **YELLOW — READY FOR INDEPENDENT
  QA, ROUND 2**, with a two-column verification table and a round 1 section.
- `docs/DECISION_LOG.md` — **D-140** (a durable fact and a current reading are
  two concepts, and only one of them is asked), **D-141** (a decision kind a
  surface cannot answer for is a defect in the surface), **D-142** (a scoring
  band states one fact, or it is two bands).
- `docs/DEFECT_LEDGER.md` — **DEF-0089**, **DEF-0090**, **DEF-0091**, each with
  class, reproduction, root cause, regression, siblings and reintroduction
  result.

## What round 2 should press hardest

Offered as the builder's own view of where this repair is most likely to be
wrong, not as a scope limit — round 2 is QA's to design.

1. **The narrowing's asymmetry.** It must only ever subtract. A history that has
   never said whose week it is must still produce an unknown at every hour of a
   school window, because that is a question for the guide rather than an
   absence for the filter.
2. **The edges of the window, on the deployed build.** 08:29 and 08:31; 14:59
   and 15:01; and the weekend, where the recurrence does not apply at all.
3. **The five hours in the middle.** The whole reason the obligation was worth
   entering. If the app has gone quiet about time between drop-off and pick-up,
   the repair has broken the finding it was built for.
4. **The deferral panel on a hold that is not the 05:30 one**, if the library
   can reach another — and on a `move`, where the deferral note must be absent
   rather than empty-but-present.
5. **The four `time-fit` bands as an owner would meet them**, walking the clock
   toward the school run on a handset and reading the trace beside the move at
   each step.

---

## Retest handoff — Phase 82, round 2

**Model:** Claude Opus-class model (or nearest current equivalent) is the
builder's; **QA runs on Codex**, per D-090.

**Intelligence level:** High

**Conversation:** SAME — the Codex QA conversation that wrote the round 1 report
above.

```text
Continue independent QA of the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You wrote the Phase 82 round 1 report in docs/qa/PHASE_82_QA_HANDOFF.md and
returned FAIL with three findings. The builder has repaired all three and
deployed a repaired checkpoint.

Read docs/qa/PHASE_82_QA_HANDOFF.md in full — both the round 1 report you wrote
and the builder's repair response beneath it — and run round 2 exactly as the
retest handoff there specifies.

Repaired product checkpoint:
0899f18f6ed03110e4f0caaeadd4210382198458

Deployed SHA at the time of writing:
0899f18f6ed03110e4f0caaeadd4210382198458 — read it live from
preview/build-info.json and prove checkpoint equivalence rather than string
equality, per D-097. Documentation commits carrying this handoff will have
moved the live SHA past the checkpoint.

Preview:
https://bill6006.github.io/life-command-os-rebuild/preview/

Verify against the deployed build, not the local tree:

- QA-82-001. During an active school window the complete owner screen must not
  claim she is physically here and must not recommend a move requiring her
  presence. The durable custody arrangement must still be intact and must not
  be re-asked. Her school day must still leave the owner's middle hours free.
- QA-82-002. A held decision's evidence panel must describe the actual
  current-versus-later facts, read off the same arbitration result, with no
  second decision path inside the renderer.
- QA-82-003. Every dimension note reaching the QA laboratory must distinguish an
  exact or near-exact fit from an actual non-fit, and the score must agree with
  the words.

Re-verify every PASS from round 1 rather than assuming it survived, and confirm
that every deferral, out-of-scope finding and audit-section-10 do-not-change
rule is unchanged.

Builder's verification counts to check rather than trust: 1,490 unit tests
across 67 files; browser at 360, 430 and 1,280px; Android gate clean at 126
checks against the deployed build; privacy scan clean at 231 tracked files;
tournament 100/100 deterministic and 100/100 hybrid; 13 reintroductions proved,
each listed with its failing test names in the repair response.

Write your round 2 result into docs/qa/PHASE_82_QA_HANDOFF.md as a new section,
on PASS or FAIL, and end with the complete next handoff and a short launcher.

Do not ask me to paste the file contents.
```

<!-- LCO_COMPLETE -->
