# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 and 2 of
`docs/qa/PHASE_84_QA_HANDOFF.md`. Not a new conversation, and not the Claude
builder.
**Model:** Codex.
**Reasoning level:** **High.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 84 is YELLOW.** You have failed it twice and been right twice. Round 2
returned FAIL with four findings — QA-84-007 through QA-84-010 — and all four are
repaired. The repaired product checkpoint is `cdd9259`. The builder has not
declared GREEN (D-077); your rounds are in
[`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), unedited, with the
builder's repair record appended **below** them.

**The reasoning level is `High`, and it is not a Max phase for QA.** Codex has
no Max level and the application will not switch to its top level under
automation; a handoff asking for Max stops the orchestrator with the level
unset. The builder's own level being Max does not change the QA block's.

---

## The constraint every phase from here carries

**Your `**Phase:**` field is `84`.** Never `9`, `09`, `8.4` or `9.1` — those
parse at or below 82 and never route, silently. Plan **section 43A** and
**D-159** hold the map: 83, 84, 90, 91, 92, 93, 94. **A QA round does not get a
new integer**; rounds 1…n of this phase all carry **84**, and there must be no
`PHASE_85_*` file on disk.

---

## What Round 2 found, and what each finding is now

| Finding   | Your reproduction                                                                                                                           | What it is now                                                                                                                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-84-007 | a genuinely fresh store offered **Open the QA laboratory** as Now's only control; Life and the domain pages were blank                      | One clause in two files. `LifeScreen` and `DomainPage` both gated on `snapshot.records.length === 0`, which is not a readiness check — it switched off the aspiration form, the six authoring controls and the area links. `InsightsScreen` never had it, which is exactly why the agenda was the only door you found. **D-189** |
| QA-84-008 | Health promised _"it will not start suggesting it"_ and then suggested it one screen later                                                  | The sentence described the behaviour QA-84-001's repair had just changed. It now says the app will start suggesting the step **on evenings there is something to spend on it**, which is the condition `healthCandidates` applies. **D-190**                                                                                     |
| QA-84-009 | Timeline's tag said **Done** directly above _"Got part of the way"_                                                                         | `tagOf(record)` reads the extent and is what every surface renders; `tagFor(kind)` stays for the schema's exhaustiveness sweep. **D-191**                                                                                                                                                                                        |
| QA-84-010 | the blocker note promised _"the app can offer something that fits next time"_, and the D-187 guard collected the string without matching it | The copy says what is recorded and where. The guard is now over the **class** — actor × non-present modality × adaptation verb — in `scripts/adaptation-claims.mjs`, imported by the synthetic suite, the browser suite and the Android gate. **D-192**                                                                          |

**You were right that the guard was the finding, not the sentence.** Three
narrower copies of one phrase blacklist had grown across the three gates, and all
three were green while the promise rendered. The new module carries **no negation
exemption** — the first draft had one and it immediately let through _"the app
will no longer put this in front of you"_ — and its `MUST_BE_CAUGHT` fixture names
**the two strings you read off the build**, so a pass cannot be earned on generic
examples.

**Round 1's repairs produced two of Round 2's defects.** QA-84-008 exists because
QA-84-001 was fixed; QA-84-009 exists because QA-84-002 was fixed in the sentence
and argued away in the tag. Every one of the four decisions above is therefore
about a **class** rather than about the sentence that was found — and each is
proved by faithfully reintroducing the defect and watching the guard fail.

---

## What Round 3 is judging it against

The **same seven-item gate** in `PRODUCT_ADJUDICATION.md` section 8, governed by
**D-173**. Items 1, 3, 4, 6 and 7 passed in Round 2; item 2 failed only on the
Timeline tag, item 5 only on the D-187 note. **Re-verify all seven anyway** — the
last two rounds each broke something a previous round had passed.

Plus the standing gates: the aggregate `npm run verify` from a clean checkout,
the browser suite at three widths, the Android-style gate on the deployed build,
the privacy scan, the block sweep, and the copy guards.

### The cold-store owner-use check, again

**Repeat it.** It is the check that found QA-84-007, and no automated gate could
have — every gate begins by loading a scenario. Same terms as Round 2: a
genuinely fresh browser store, **no QA laboratory**, no seeded fixture, ordinary
product screens only, and it is a **cold-store owner-use check and not a sealed
one**, because Round 1 and Round 2 knowledge already exist in this conversation.

The builder's own cold read after the repair, which you should test rather than
accept:

- **Now** still abstains — _"There is no history here yet"_, no invented
  recommendation, no lifecycle controls — and offers two ordinary ways on.
- **Life** lists all eleven areas, every one under **Nothing here yet**, none of
  them claiming a standing.
- **Every domain page** carries the aspiration form (on the proving domains) and
  all six authoring controls.
- **Insights** carries the second agenda, as before.

**The claim to attack is that there is no remaining point where ordinary owner use
cannot continue without the QA laboratory.** Walk it and say whether that is true.

Keep **CASE A** (answer the agenda with _"More money"_, read what it says it will
create and what it is **not** assuming before confirming, then inspect what was
written) and **CASE B** (_"Can't right now"_ and the caregiving blocker for the
real owner situation) exactly as they were.

### And two things worth attacking specifically

1. **The new class guard.** It is the second attempt at this rule. Try to write a
   sentence that promises a future adaptation and slips past
   `adaptationClaims` — and if the copy on the blocker path can be made to say
   something the engine does not do, that is a finding.
2. **Nothing invented to fill the first screen.** The abstention had to survive
   the repair. If a first run now produces a recommendation, a placeholder
   history or a suggested first move, that is a finding and a serious one.

---

## What must not have happened, and QA should confirm it did not

- **No strategy evaluation** (F03), **no pattern-discovery engine** (F15/F17/F18).
- **No enforcement of a blocker constraint.** D-187 and D-192 are about _saying_
  so honestly. If a recommendation now changes because of a blocker, that is a
  finding, not an improvement.
- **No semantic interpretation of the owner's words** (D-024, D-025, D-172).
- **No domain progression models** beyond Career, Health and Money. Fatherhood is
  outside the proving scope and the growth model is untouched.
- **No owner routines library** (AUD-0045). QA-84-008's repair changed a
  _sentence about a destination's next step_, not what is recommendable.
- **No backfill of a historical event** (D-165). **No twelfth domain page.**
- **No scoring change of any kind** (D-137, D-138).
- **No new visual language.** The first-run routes reuse existing panel chrome.
- **No `PHASE_85_*` file**, no alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`,
  no orchestrator change.

---

## Handoff — independent QA of routing phase 84, round 3

**Model:** Codex.
**Reasoning level:** **High** — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 and 2.

```text
Round 3 retest of routing Phase 84 of Life Command OS: "what the owner is
trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You failed this phase in Round 1 and again in Round 2, and were right both
times. All four Round 2 findings are repaired. Routing 84 is still YELLOW at
repaired product checkpoint cdd9259; the builder has not declared GREEN
(D-077).

Read, in full, and in this order:
1. docs/qa/README.md            — the protocol. Step 1 is cold use of the
                                  deployed Preview BEFORE any repository
                                  document, and the order is the point.
2. docs/qa/PHASE_84_QA_HANDOFF.md — your rounds 1 and 2, unedited, with the
                                  builder's repair records appended below them
3. docs/PRODUCT_ADJUDICATION.md section 8 — the seven-item gate; section 11 is
                                  the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169, D-173, D-177..D-192
5. docs/DEFECT_LEDGER.md DEF-0119..DEF-0127
6. docs/PHASE_STATUS.md — the routing 84 record, rounds 1 and 2 included

Confirm the deployed build against the repaired checkpoint before testing:
  node --use-system-ca scripts/checkpoint-equivalence.mjs cdd9259 --deployed \
    https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

Repeat the manual COLD-STORE OWNER-USE CHECK on the same terms as Round 2: a
genuinely fresh browser store, no QA laboratory, no seeded fixture, ordinary
screens only, CASE A ("More money" into the second agenda) and CASE B (the
caregiving blocker) unchanged. It is a cold-store owner-use check, NOT a
sealed check. The claim to attack is that there is no remaining point where
ordinary owner use cannot continue without QA Lab.

Then reproduce each of your own Round 2 reproductions, and re-verify all seven
acceptance items — the last two rounds each broke something an earlier round
had passed.

Attack in particular:
- whether anything is now invented to fill a first-run screen, which the
  abstention had to survive;
- whether a sentence promising future adaptation can still slip past
  scripts/adaptation-claims.mjs, and whether any blocker copy claims
  behaviour the engine does not perform;
- whether the Health confirmation and the Health recommendation still agree;
- whether any rendered history entry contradicts itself about extent.

Use a real Android-style context, read whole screens as a person, and actively
try to disprove that the repairs hold. Name which automated tests still give
false confidence.

Write Round 3 into docs/qa/PHASE_84_QA_HANDOFF.md, below the builder's Round 2
repair record. The builder does not edit your rounds and you do not change
product code. Your **Phase:** field is 84 — a QA round does not get a new
integer, and you must not create any PHASE_85_* file.

End your response with the four lines and a launcher (D-092): model, reasoning
level, conversation, and a short copyable prompt naming the file the next
conversation must read.

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Codex. **Reasoning level:** High — never Max.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 and 2.

```text
Round 3 retest of routing Phase 84 of Life Command OS, after your Round 2 FAIL.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_84_QA_HANDOFF.md in full — your rounds 1 and 2 and the
builder's repair records below them — and execute the QA protocol in
docs/qa/README.md exactly as written. Step 1 is cold use of the deployed
Preview before any repository document.

Repaired product checkpoint: cdd9259. Your **Phase:** field is 84. Do not
create any PHASE_85_* file.

Repeat the manual cold-store owner-use check from a genuinely fresh browser
store without ever opening the QA laboratory, including CASE A and CASE B.
docs/NEXT_PROMPT.md states it in full.

Write Round 3 into docs/qa/PHASE_84_QA_HANDOFF.md, below the Round 2 repair
record. Do not change product code, and reproduce the builder's claims rather
than accepting them.

Do not ask me to paste file contents.
```

<!-- LCO_COMPLETE -->
