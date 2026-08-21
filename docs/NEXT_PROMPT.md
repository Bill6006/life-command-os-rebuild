# Next prompt

Canonical plan section 43, and the independent-QA protocol in
[`qa/README.md`](qa/README.md). The model, intelligence level and conversation
instruction sit outside the prompt so the owner can switch Claude Code before
pasting.

**Phase 6 is YELLOW — READY FOR INDEPENDENT QA.** Product checkpoint
`e681a66`. Everything on `main` past it is documentation, so the deployed
Preview SHA is `main`'s current HEAD and is at or after `e681a66`. Full
builder report in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 6 —
Timeline + Insights".

Per D-077 the builder may not approve its own phase. What follows is the
handoff to a fresh QA conversation.

---

## NEXT CLAUDE ACTION

- **Model:** Sonnet-class (Claude Sonnet 5 or the nearest current equivalent)
- **Intelligence level:** High
- **Conversation:** **NEW — NEW CONVERSATION REQUIRED FOR INDEPENDENCE**
- **Why this model:** the work is reading whole screens as a person, checking
  figures against the counts printed beside them, and driving a real mobile
  context — careful, ordinary independent QA rather than cross-system
  architecture reasoning. D-080 asks for the lowest combination that does not
  materially risk quality, and every defect this phase closed was found by
  reading rendered output rather than by reasoning about the kernel.
- **Why this level:** High is the default for ordinary independent QA per
  `qa/README.md`'s own rule. The one place Max would earn its keep — judging
  whether a learned pattern is statistically defensible — is a question the
  phase answers with counts printed on screen, so it can be checked by
  arithmetic rather than by inference.
- **Why a new conversation:** D-077, and it is the whole point of the gate. A
  reviewer that inherits the builder's model of why something is correct
  re-checks what the builder already checked.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
You are independent QA for the Life Command OS rebuild. This is a fresh
conversation and that is deliberate: you have not seen how any of this was
built, and you should not ask.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

The phase under test is Phase 6 — Timeline + Insights.

Product checkpoint SHA: e681a66. Everything on main past that commit is
documentation, so the deployed Preview SHA is main's current HEAD and is at
or after e681a66. Verify all of that rather than taking it from here: check
preview/build-info.json against what the app shows under More → This build,
and check `git log e681a66..HEAD --stat` for anything outside docs/.

YOUR ROLE

You test. You do not repair. Owner decision D-077 and the protocol in
docs/qa/README.md govern this, and the division is not negotiable by
anything you conclude:

- you may not change application or product code, at any point, for any
  reason, including a change you are certain is right;
- you may create or update exactly one file — docs/qa/PHASE_06_QA_HANDOFF.md
  — plus narrowly scoped QA evidence artifacts the protocol needs;
- you do not decide GREEN. You recommend PASS or FAIL; the owner decides.

Read these first, in this order:

1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority (v1.2), read
   it completely. Section 51 is this phase's own goal, build list and gate.
   Section 26 governs Timeline. Section 27 governs Insights' language.
   Sections 4.6, 11, 36, 37, 60, 61, 63 and 64 govern specificity, private
   display, error handling, mobile and accessibility, stale copy, product
   copy, hidden staleness and hidden genericity — all of which this phase
   touches.
2. docs/qa/README.md — the protocol you are running, including section 3a
   (D-082): your handoff must carry the complete next prompt automatically,
   on both PASS and FAIL, and section 3a's D-083 amendment on the short
   launcher that closes your response.
3. docs/PHASE_STATUS.md — the Phase 6 entry in full, including what the
   builder says it deliberately did not build and what it says it found.
   Treat every claim in it as a claim to be checked, not as information.
   Also read the Phase 5 and Phase 4 entries for the deferred items you must
   confirm unchanged rather than report as new.
4. docs/DECISION_LOG.md — D-084 to D-088 in full (this phase's decisions:
   how a figure may reach a screen, why Insights may read what has been
   learned, why only one card per move, why Timeline has no actions, and why
   one description of a record is shared by two surfaces). Also D-059 to
   D-079 for the rules those sit on top of, and D-077, D-080, D-082, D-083
   for the protocol.
5. docs/DEFECT_LEDGER.md — DEF-0020 in full (four facts collapsed into one,
   from Phase 3 — the defect section 51's percentage rules exist to prevent
   recurring), DEF-0028 to DEF-0033 (Phase 5's, all found by reading whole
   screens rather than by a failing assertion), and DEF-0034 to DEF-0044
   (this phase's, same). The standard you are being asked to apply is the
   one those were found by.
6. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, and which
   src/intelligence/ modules a surface may import (the enforced list is
   OPEN_TO_SURFACES in tests/unit/architecture-guards.test.ts).

Then read the implementation fresh: src/intelligence/insights.ts,
src/features/timeline/timelineEntries.ts, src/features/timeline/TimelineScreen.tsx,
src/features/insights/InsightsScreen.tsx, src/features/evidence/EvidencePieces.tsx,
src/features/history/describe.ts, and the changes to src/features/now/NowScreen.tsx,
src/intelligence/learning.ts, src/intelligence/outcomes.ts and
src/synthetic/scenarios.ts. `git diff f50137d..e681a66` is the whole phase.

HOW TO TEST

Use a real Android-style Playwright mobile context — touch, a mobile user
agent, a realistic device pixel ratio, mobile scrolling and interaction —
driven against the DEPLOYED Preview, not a local build and not a narrowed
desktop viewport. Phase 4's five defects were invisible at three desktop
widths; Phase 5's three were found by reading whole screens as a person.

Read complete screens as an owner would rather than asserting on strings.
Actively try to disprove that this phase is correct. Look for:

- contradictions between two lines of one screen, especially between a
  number and the sentence above or below it;
- a figure whose denominator, or the quantity it measures, is not defensible
  from what is on screen;
- research or developer vocabulary reaching a primary surface;
- claims made from ignorance, false precision, or a pattern stated more
  confidently than its evidence supports;
- lost subjects and orphan pronouns;
- stale product or scaffolding copy, and any claim that the app cannot do
  something it demonstrably does;
- questionnaire, dashboard or nag behaviour;
- touch targets, horizontal overflow, sticky or fixed chrome covering
  content, safe-area problems, control movement between renders, and
  double-tap hazards;
- anything on a surface that could act on corrupt data.

Name which existing automated tests gave false confidence, if any.

THE ACCEPTANCE CRITERIA YOU ARE TESTING AGAINST

These are the plan's, not the builder's. Section 51's gate:

- useful insights are understandable without research language;
- the owner can open a deeper evidence view without that machinery being
  forced into the first view;
- a current recommendation can expose the meaningful evidence behind its
  choice without cluttering Now;
- percentages and rates appear only when the underlying quantity,
  denominator, context and evidence are defensible;
- any displayed rate names the aspect it measures, and does not collapse
  direct result, downstream effect, comfort/follow-through into one generic
  success statistic;
- weak evidence produces an honest "not enough evidence yet" state rather
  than invented precision;
- synthetic long histories prove that context and combinations can change a
  pattern's interpretation, and that counterexamples and later contradictory
  evidence can weaken or reverse an earlier learned pattern;
- malformed records do not break Timeline or Insights — an unreadable row is
  isolated and reported, never silently dropped, and Timeline never creates
  a phantom actionable item from corrupt data;
- private data obeys display policy (src/domain/privacy.ts, section 11);
- one arbitration path still decides; Insights contributes an interpretation
  of history, never a second recommendation.

And the phase brief's own additions: the fourteen existing golden scenarios
still pass unchanged; CI is green; npm run verify passes from a clean
checkout; the deployed Preview SHA equals the checkpoint SHA.

WHAT MUST NOT HAVE BEEN WEAKENED

Everything phases 1 to 5 established remains load-bearing: unknown stays
unknown; canonical records are append-first; there is exactly one
arbitration path; the evaluator and arbiter know no life area by name; an
explanation may only cite evidence the decision leaned on; a context in
force is current whatever the age of the record carrying it; a limiter
carries its own label; owner-facing copy may not claim the app cannot do
something it does; a question names what it is about; inference completes a
loop and never opens one and may never conclude harm; a growth-stage change
is proposed after three occasions and never applied by the app; the bottom
navigation has exactly four primary destinations; phase language appears in
exactly two places, both reading REBUILD_PHASE from src/platform/buildInfo.ts;
the deterministic baseline is the selected architecture; ten domain pages
cover eleven domains (D-078); coverage status agrees between Life and a
domain page because both read the same computation.

DEFERRED BY THE OWNER — CONFIRM UNCHANGED, DO NOT REPORT AS NEW

From Phase 4:
- P4-6 — the no-action eyebrow renders a whole sentence in an uppercase
  micro-label slot.
- P4-7 — the More button is below the 44px minimum (most recently measured
  at 80.6×36).
- A started move that is never settled stays "Under way" indefinitely and no
  result is ever asked for.

From Phase 5:
- An inline Life-area link is below a 44px touch target, deliberately.
- Creating a brand-new goal from a domain page is not supported.
- No domain page offers a dated situational-exception control.
- "Recent changes" on a domain page is domain-scoped, not chronological.

Older, also unchanged: the older ranking dimensions still cost weight when
they know nothing; `hold` is never generated; free-text constraints are
shown rather than enforced; Emotional Health has no standing concept.

The Phase 6 entry in docs/PHASE_STATUS.md lists what this phase says it
deliberately did not build. Check those claims like any other.

WHERE TO START LOOKING

The QA laboratory (More → Open the QA laboratory) loads seventeen invented
histories. "Nine months of evenings" is the longest and is where most of
this phase's behaviour is visible; "A file with damage in it", "Two ordinary
weeks", "A month of what actually worked", "One answer, and a lot of
silence" and "A settled arrangement, and one week away" each exercise a
different corner. Time travel is in the same screen.

HOW THIS ENDS

Write docs/qa/PHASE_06_QA_HANDOFF.md containing, at minimum: phase;
checkpoint SHA tested; deployed SHA tested; your Android/mobile
configuration; the governing acceptance criteria you used; scenarios and
flows tested with PASS/FAIL for each; exact reproductions for every defect;
semantic, behavioural, privacy and mobile/UI findings separately; blocking
vs non-blocking; evidence references; which automated tests gave false
confidence; confirmation that the deferred items above are unchanged; and
an overall PASS or FAIL.

Then, in the same response and without being asked (D-082, qa/README.md
section 3a): the overall verdict; the QA-tested product SHA; the QA-report
commit SHA if you committed it; the exact report path; the recommended
Claude model, intelligence level and conversation instruction for the next
action, each with a one-sentence reason; and the complete ready-to-paste
next prompt written into the report file. Close the response with the short
launcher block D-083 requires rather than repeating the whole prompt inline.

On FAIL the next prompt goes to CURRENT — the original builder conversation
— to repair under plan section 42 and return to you for retest. On PASS it
goes to CURRENT for the formal GREEN closeout.

Do not prescribe the implementation fix beyond what your own evidence
supports. Reproductions, the defect class, the evidence and the acceptance
expectation the fix must meet are yours to give; root-cause repair is the
builder's.
```
