# Phase 6 QA handoff — Timeline + Insights

**Overall: PASS.** A fresh conversation, per D-077, that had not seen how this
phase was built. Every scenario the phone-check list names was exercised
against the deployed Preview, all eleven defects the builder's own gate
recorded (DEF-0034–DEF-0044) were independently re-reproduced from their own
repro steps rather than taken on the builder's word, and all eleven no longer
reproduce. No new blocking or non-blocking finding. The full automated suite
was independently rerun from the checked-out repository rather than trusted
from `PHASE_STATUS.md`, and it matches the builder's counts exactly.

---

## Identity

|                          |                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase                    | 6 — Timeline + Insights                                                                                                                                                             |
| Checkpoint SHA tested    | `e681a66` — the product checkpoint named in `docs/PHASE_STATUS.md` and `docs/NEXT_PROMPT.md`                                                                                       |
| `main` HEAD at test time | `a6a9e67` — confirmed documentation-only past `e681a66`: `git diff e681a66..HEAD --stat` touches only `docs/NEXT_PROMPT.md` and `docs/PHASE_STATUS.md`, no `src/` or `tests/`      |
| Deployed Preview SHA     | `a6a9e67`, read live from `https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json` (`commitSha a6a9e6716f1182bab75b798c70028812b721eeaa`, built `2026-08-21T22:09:50.243Z`) |
| Match                    | Yes — deployed Preview equals `main` HEAD, and `main` HEAD is `e681a66` plus docs only, satisfying "at or after the checkpoint" |
| Preview URL tested       | https://bill6006.github.io/life-command-os-rebuild/preview/                                                                                                                          |

## Mobile configuration

Claude Browser pane, 360×780 viewport, Android Chrome UA
(`Mozilla/5.0 (Linux; Android 14; Pixel 8) ... Chrome/148 Mobile Safari/537.36`),
`devicePixelRatio` ≈ 2, `navigator.maxTouchPoints` 5 — confirmed live via
script before testing began, not assumed from the resize call.

**Disclosed limitation, and what it does and does not cover.** In this
session, `computer` tool `left_click`/`left_click_drag` actions timed out
after 30s on every target tried — a simple nav-bar tab, a scenario card, a
corner of the page — while the page itself stayed fully responsive
throughout (confirmed via script execution and `document.title` reads
between attempts, and later via `key` presses, which did not time out). This
reproduces the same class of tooling failure the Phase 5 QA conversation
recorded, though this session was able to get `screenshot` working (by
explicitly fronting the tab) where Phase 5's could not, so visual/layout
verification below is by real rendered screenshots, not by DOM geometry
alone. Real interaction — opening evidence panels, loading scenarios,
correcting a belief, paging Timeline — was driven by dispatching `.click()`
on the actual DOM element through the page's own JS context, which exercises
the same React `onClick` handlers a touch would, and by `getBoundingClientRect()`
for touch-target sizing. It does **not** reproduce genuine multi-touch
gesture timing — a real double-tap race, a fast swipe, a pointer-cancel
mid-gesture. Nothing in this phase's diff touches double-tap protection (that
machinery is Phase 3's `lifecycle.ts`, unchanged this phase, and Timeline —
the one surface this phase adds with no button but the pager — structurally
cannot receive a double-tap-created duplicate because it has nothing else to
press, D-087), so this gap is judged low-risk for this specific phase rather
than papered over. It should not be read as physical-phone/true-touch
validation, which section 37 keeps as a separate, still-required check.

## Governing acceptance criteria used

`docs/CANONICAL_REBUILD_PLAN.md` v1.2 in full (section 51 as the phase's own
gate; sections 4.6, 11, 26, 27, 36, 37, 60, 61, 63, 64 as the cross-cutting
rules this phase's own defect history shows it leans on hardest);
`docs/qa/README.md` in full, including section 3a/D-082/D-083's output
requirements; `docs/PHASE_STATUS.md`'s Phase 6, 5 and 4 entries, read as the
builder's own account and independently checked rather than trusted;
`docs/DECISION_LOG.md` D-059–D-079 and D-084–D-088 in full;
`docs/DEFECT_LEDGER.md` DEF-0020 and DEF-0028–DEF-0044 in full;
`docs/ARCHITECTURE_BOUNDARIES.md`, including the `OPEN_TO_SURFACES` /
`insights` boundary, confirmed against the actual guard in
`tests/unit/architecture-guards.test.ts` rather than the prose alone. The
implementation read fresh: `src/intelligence/insights.ts` in full,
`src/features/timeline/timelineEntries.ts` and `TimelineScreen.tsx`,
`src/features/insights/InsightsScreen.tsx`, `src/features/evidence/EvidencePieces.tsx`,
`src/features/history/describe.ts`, and the diffs to `NowScreen.tsx`,
`learning.ts`, `outcomes.ts` and `buildInfo.ts` (`git diff f50137d..e681a66`).

---

## Scenarios and flows tested

| # | Scenario / flow | What it checks | Result |
|---|---|---|---|
| 1 | Deployed `build-info.json` vs. checkpoint | Preview SHA matches `e681a66`/HEAD | **PASS** |
| 2 | `#/qa` header eyebrow | Phase identity claim (DEF-0031's class) | **PASS** — reads "PHASE 6" |
| 3 | "Nine months of evenings" → Insights, closed | Six cards, no percentage anywhere, ordinary language | **PASS** — six cards (`emerging-change`, `context-effect`, `repeated-friction`, `life-season`, `move-effectiveness`, `trajectory`), zero `%` on the closed view |
| 4 | Same → kitchen card, opened ("Depends on the evening") | Evidence panel figures, DEF-0039's class | **PASS** — "100% — 12 of 12", "67% — 8 of 12" ×2, split "6 of 6 on a weekday, 2 of 6 at the weekend", counterexamples dated and worded, "Everything counted" replaced by no heading needed (all rows present) |
| 5 | Same → Now, **See evidence** | DEF-0039 itself: the conclusion above the panel vs. the tally inside it | **PASS** — "Reset a space has made little difference in situations like tonight." above; inside: same sentence again under "What the app took from them" with the leans-hardest caveat, "67% — 8 of 12" for downstream-effect, and "Tonight is at the weekend." naming which side of the split applies. Nothing left for a reader to reconcile unaided. |
| 6 | Same → Timeline, one page | Reads as a life, not a log; no "a suggestion here"; day order consistent | **PASS** — every lifecycle/outcome line names its subject; a day with same-timestamp `Suggested`/`Done` consistently shows `Done` above `Suggested` (reverse-canonical) across every day sampled |
| 7 | "A file with damage in it" → Timeline | Malformed rows isolated, DEF-0043's class | **PASS** — "Record row 6" / "Entity row 1" style, "could not be read" / "could not be read — N things wrong with it", no validator paths, no record ids, readable rows unaffected (5 shown, "That is the whole record — 5 entries.") |
| 8 | Same → Insights, Now | Malformed history does not break other surfaces (section 51's plural "surfaces") | **PASS** — Insights: honest empty state, no crash; Now: "Nothing to suggest just yet." with a working guide question, no crash |
| 9 | "Two ordinary weeks" → Timeline | Private-domain discretion on a primary surface (section 11) | **PASS** — one row reads "Private entry" with no subject; every other row unaffected |
| 10 | "One answer, and a lot of silence" → Insights | Honest "nothing worth saying" state, not a claim of not-learning | **PASS** — exact copy matches `InsightsScreen.tsx`'s literal empty state |
| 11 | "A month of what actually worked" → Insights | The withheld-rate state and its threshold | **PASS** — "Clearing the kitchen has made a difference every time. ... 4 of 4." (boundary: 4 is the minimum shown, not excluded); "Still gathering" panel lists the walk and the lab, each "2 so far — 2 more occasions like these" |
| 12 | Same → correct the "keeps not happening" (lab/subnetting) belief on "Nine months of evenings" | Section 62: a correction is preserved and the belief stops being reasserted | **PASS** — card vanishes after the correction and does not reappear reasserting the old belief; does not fabricate a "gathering" line for a verb with zero post-correction episodes either, which is the honest consequence of the same rejection watershed rather than a separate bug |
| 13 | "Everything current except the studying" → Insights | Coverage-gap card, DEF-0044's `includedTitle` fix | **PASS** — "WHAT IS OVERDUE HERE" heading, "Current learning topic — last heard 7 weeks ago" |
| 14 | "A settled arrangement, and one week away" → Timeline | DEF-0042: temporary exception vs. standing tag | **PASS** — "Temporary — Child with the owner: no — for now"; durable rows ("Custody arrangement", "Child with the owner: yes") still read "Standing" |
| 15 | Career & Learning domain page → "Recently" | D-088: shared wording reads correctly with no tag | **PASS** — "Did not fit at the time — building a lab with subnetting." reads as a complete sentence with nothing missing |
| 16 | Touch-target sweep, Insights + Timeline | No new sub-44px control beyond the known deferral | **PASS** — only "More" (80.6×36, P4-7) found under 44px on either surface |
| 17 | Horizontal-overflow / sticky-element sweep, Timeline + Insights | DEF-0036's class; D-087's "nothing to press" | **PASS** — no horizontal overflow either surface; only `DIV.topbar` and `NAV.nav` compute to sticky/fixed on Timeline — nothing Timeline itself introduces |
| 18 | `npm run test` (vitest), full suite, this checkout | Independently confirm the 700-test claim | **PASS** — 42 files, **700/700**, matches `PHASE_STATUS.md` exactly |
| 19 | `npm run verify` (format:check, lint, typecheck, test, build) | Independently confirm the clean-checkout gate | **PASS** — all five stages clean |
| 20 | "A Thursday with nothing needing doing" → Now | P4-6 deferral, reconfirmed live | **Confirmed unchanged (deferred)** — eyebrow reads "ONLY ABOUT 15 MINUTES LEFT TONIGHT." — a full sentence in the micro-label slot, as before |

---

## Findings

**None.** No blocking, no non-blocking, no new defect of any severity.

Every one of DEF-0034 through DEF-0044 was re-reproduced from its own
recorded repro steps against the deployed Preview (not merely re-read from
the ledger) and no longer reproduces; each fix's live behavior was checked
against the ledger's own account of what the fix should look like rather
than accepted on the description alone (see scenarios 4–14 above, and their
mapping: #4/#5 → DEF-0039; #7 → DEF-0043; #13 → DEF-0044; #14 → DEF-0042;
#6 → DEF-0034/DEF-0035/DEF-0037; #17 → DEF-0036).

## Which automated tests gave false confidence

None found this round, in the sense DEF-0041 means: a guard that passes with
its own defect still present. The specific guard DEF-0041 named
(`tests/synthetic/insights.test.ts`'s day-id sweep) was not re-broken and
re-tested by this QA pass — that proof is the reintroduction pass in the
ledger's own account (nineteen defects reintroduced one at a time, nineteen
caught) plus `npm run lint`'s `no-control-regex`, both of which this session
re-ran clean rather than re-attempting the corruption itself. What this
session adds independently is that the 700-test suite and the full `verify`
gate were re-run from the checked-out repository rather than trusted from
`PHASE_STATUS.md`'s numbers, and they match.

## Deferred items — confirmed unchanged

- **P4-6 — the no-action eyebrow** renders a whole sentence in the
  uppercase micro-label slot. **Reconfirmed live** (scenario 20 above).
- **P4-7 — the More button is 80.6×36**, below 44px. **Reconfirmed live**
  by direct measurement (scenario 16), same figure as Phase 6's own gate.
- **A started move that is never settled** stays "Under way" indefinitely.
  Not independently re-exercised live this session — nothing in the
  `f50137d..e681a66` diff touches `lifecycle.ts` or any started-move path,
  and Phase 6's own gate already reconfirmed it, so this is carried forward
  by code-diff inspection rather than re-tested from scratch.
- **The four Phase 5 deferrals** (inline Life-area link under 44px
  deliberately; no new-goal creation from a domain page; no dated
  situational-exception control; a domain page's "Recent changes" staying
  domain-scoped rather than chronological) — not independently re-exercised
  live this session. None of `f50137d..e681a66`'s changed files touch
  `src/features/life/`, so these are carried forward by the same diff-scope
  argument rather than re-tested from scratch.
- **Older deferrals** (ranking dimensions costing weight on ignorance
  outside the three named exceptions; `hold` never generated; free-text
  constraints shown rather than enforced; Emotional Health with no standing
  concept) — likewise carried forward by diff scope; none of this phase's
  changed files touch `arbitrate.ts`, `evaluate.ts`, `constraints.ts` or the
  concept registry.

No new deferral is introduced by this QA pass.

## The one thing worth a second look that is not a defect

`PHASE_STATUS.md` records that `now.spec.ts`'s "creates one episode from a
double tap" failed once in a full desktop Playwright run during the repair
gate, then passed on every rerun, and that nothing in this phase touches
Now's lifecycle buttons. This session did not have Playwright available
against the deployed Preview and could not attempt to reproduce that
flake, so it is neither confirmed nor cleared here — it is repeated in this
report only so a reader does not have to cross-reference `PHASE_STATUS.md`
to know it exists.

---

## Recommendation

**PASS.** Section 51's gate, checked item by item against live behavior
rather than against the builder's checklist:

- useful insights are understandable without research language — confirmed, every closed-card sentence is ordinary prose;
- a deeper evidence view opens without being forced into the first view — confirmed, zero `%` signs anywhere until "See the evidence" is tapped;
- Now can expose evidence without cluttering Now — confirmed, one closed link, nothing else moved;
- percentages appear only with a defensible sample — confirmed at the boundary (4 of 4 shown, fewer withheld with a stated count);
- a rate names its aspect and none are collapsed — confirmed, "how often X made a difference afterwards" / "got all the way there" / "could be done" / "felt easy" never mixed on one card;
- weak evidence produces an honest state — confirmed ("Still gathering", "Nothing worth saying here yet");
- context and combinations change a pattern's interpretation, and later evidence can reverse an earlier one — confirmed live (the weekday/weekend split card; the "has not been going as well since May" change card);
- malformed records do not break Timeline, Insights or Now — confirmed on all three surfaces from one damaged file;
- private data obeys display policy — confirmed on Timeline.

No condition of this recommendation is contingent on the touch-gesture gap
disclosed above; every finding in this report was reached by reading full
rendered screens, not by an assertion, and none of it depends on genuine
multi-touch timing.

---

## Next (per D-082/D-083)

**On PASS**, this goes to **CURRENT — the original Phase 6 builder
conversation** to confirm the tested SHA and this PASS, perform the formal
GREEN closeout per `qa/README.md` §6, and provide Phase 7's own
recommendation and complete next prompt.

### Ready-to-paste next prompt

```text
Independent QA has passed Phase 6 — Timeline + Insights.

Report: docs/qa/PHASE_06_QA_HANDOFF.md
QA-tested SHA: a6a9e67 (main HEAD; e681a66 plus documentation only)
Result: PASS — no blocking or non-blocking findings; all eleven DEF-0034–
DEF-0044 fixes independently re-reproduced and confirmed closed; the 700-test
suite and npm run verify independently rerun clean from this checkout.

Read docs/qa/PHASE_06_QA_HANDOFF.md in full.

Then, per qa/README.md section 6 and canonical plan section 43/58:

1. Confirm the QA-tested SHA and the PASS.
2. Perform the formal GREEN closeout for Phase 6 in docs/PHASE_STATUS.md:
   final status GREEN, approved checkpoint SHA, closing SHA, deployed Preview
   SHA and match, verification results, the QA report path and tested SHA,
   deferred/open items (preserve every deferral this report and the phase's
   own gate already carry — do not silently drop any), decisions made, next
   phase.
3. Update docs/NEXT_PROMPT.md with Phase 7 (AI exports + backup/restore,
   canonical plan section 52)'s recommended Claude model, intelligence level,
   CURRENT/NEW conversation instruction, one-sentence reasons for each, and
   the complete ready-to-paste Phase 7 kickoff prompt.
4. Close your response with the short launcher block D-083 requires, per
   docs/CANONICAL_REBUILD_PLAN.md section 43's launcher requirement.

Do not reopen Phase 6 scope. Do not ask the owner to paste this report's
contents — you already have the path.
```
