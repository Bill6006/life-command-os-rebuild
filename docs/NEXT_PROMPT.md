# Next prompt

Canonical plan section 43. The intelligence level, model and conversation
instruction sit outside the prompt so the owner can switch Claude Code before
pasting.

**Phase 5 is GREEN**, approved after independent QA's round 2 retest returned
PASS. Approved checkpoint `8d06dae`; QA-tested SHA `72c6d9f`; report at
[`qa/PHASE_05_QA_HANDOFF.md`](qa/PHASE_05_QA_HANDOFF.md). Full closeout in
[`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 5 — the Life domain
experience."

---

## NEXT CLAUDE ACTION

- **Model:** Opus-class (Claude Opus 5 or the nearest current equivalent)
- **Intelligence level:** High
- **Conversation:** **NEW — a fresh builder conversation for Phase 6**
- **Why this model:** Phase 6's hard part is not UI wiring — it is deciding
  what makes a learned pattern honest to show at all: when a rate or
  likelihood is statistically defensible, how to keep four different
  evidence dimensions (direct result, downstream effect, comfort,
  follow-through) from collapsing back into one number the way DEF-0020
  did in Phase 3, and how to expose real reasoning in a "Pattern Detail"
  view without building a second recommendation engine. That is
  learning/inference-adjacent design judgment, not routine domain wiring.
- **Why this level:** High is enough — this is disciplined application of
  rules the plan and decision log already state (D-059, D-060, section 27,
  section 51's own pattern-quality list), not open architecture invention;
  Max is not needed.
- **Why a new conversation:** a genuinely new phase after GREEN, per
  `qa/README.md`'s conversation rule and plan section 43's default routing.
  Phase 5's repair history is not load-bearing context for Phase 6's work.
- **Attach/reference:** nothing beyond what the prompt below already names.

---

## COPY/PASTE PROMPT

```text
You are continuing the Life Command OS rebuild. Phase 5 is complete and
GREEN, approved by independent QA. Begin Phase 6.

Work in this repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
GitHub: Bill6006/life-command-os-rebuild (public, default branch main)
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/
Phase 5 was approved after independent QA's round 2 retest returned PASS,
at approved checkpoint 8d06dae (QA-tested SHA 72c6d9f). The independent-QA
gate (D-077), the eleven-domains/ten-pages rule (D-078), and the QA-handoff
output rule (D-082 — every QA run or retest, PASS or FAIL, outputs the
complete next prompt automatically) all remain in force and unchanged.

Read these first, in this order:

1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority (v1.2),
   read it completely. Section 51 is Phase 6's own goal and build list;
   sections 27 and 61 govern Insights' language; section 4.6 and section 60
   govern specificity and stale-copy discipline the way they did in every
   prior phase.
2. docs/qa/README.md — the independent QA protocol, including section 3a
   (D-082): QA's own handoff must carry the complete next prompt
   automatically, on both PASS and FAIL. This governs how Phase 6 ends and
   changes what you are allowed to declare.
3. docs/PHASE_STATUS.md — read the Phase 5 entry in full: what it delivered,
   both independent-QA rounds (round 1 FAIL — QA-B1/QA-B2/QA-M1 — and round
   2 PASS), and the formal GREEN closeout. Also skim Phase 4's entry for the
   coverage engine's own history, since Phase 6's Insights build on it.
4. docs/DECISION_LOG.md — D-059 to D-076 (reliability, coverage, inferred
   evidence, and how Life presents them — the same rules govern how Insights
   presents them), D-077 (the QA protocol), D-078 (domains/pages), D-079
   (plan v1.2, which is what actually authorizes Phase 6's progressively
   disclosed evidence/analytics — read this one in full), D-080 (model
   recommendations), D-081 (a domain page corrects a durable concept as
   context — background for how corrections already work, relevant if
   Insights ever offers one), D-082 (the QA output rule).
5. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, and the line between
   deciding and recording. Note which `src/intelligence/` modules a feature
   may import (`OPEN_TO_SURFACES` in `tests/unit/architecture-guards.test.ts`
   is the enforced list) — `learning.ts` is **not** on it, the same way
   `coverage.ts` is not; Insights will need a way to read what has been
   learned without importing the module that decides how a move is ranked,
   the same shape of problem Phase 5 solved for coverage via `situation`.
6. docs/DEFECT_LEDGER.md — read DEF-0020 in full (the four-facts-collapsed-
   into-one defect from Phase 3: completion, direct result, downstream
   effect, comfort are separate, and a single "success" number that folds
   them back together is precisely the failure section 51's own "Any
   percentage must identify the quantity it measures... do not collapse
   direct result, downstream effect, comfort/follow-through into one generic
   success statistic" exists to prevent). Also read DEF-0028 to DEF-0033 —
   Phase 5's own defects, all found by reading whole screens as a person
   rather than by a failing assertion, which is the standard Phase 6's own
   gate will be held to as well.

Then read the engine you are building on: src/intelligence/learning.ts (what
is actually tracked per learned quantity — priors, evidence counts, context
similarity weighting; this is Phase 6's primary data source), outcomes.ts,
lifecycle.ts (episodes — Timeline's other primary data source), trace.ts
(the decision trace — what "See evidence" on Now will read), explain.ts
(how a decision is currently explained, so a deeper evidence view augments
rather than duplicates it), coverage.ts and growth.ts (coverage insights
and pattern-confidence precedent). Also src/domain/records.ts (every
canonical record kind Timeline will need to describe — Phase 5's
`describeChange` in src/features/life/domainPages.ts is the nearest existing
precedent, domain-scoped rather than whole-life), src/domain/concepts.ts,
and the surfaces you will be building: src/features/timeline/TimelineScreen.tsx
and src/features/insights/InsightsScreen.tsx (both currently shells), plus
src/features/now/NowScreen.tsx (for the "See evidence" entry point) and
src/features/life/DomainPage.tsx (for the established closed-until-tapped
detail-panel pattern this phase should reuse rather than reinvent).

HOW THIS PHASE ENDS — READ BEFORE YOU START

You may not approve your own phase. This is owner decision D-077 and it is
not negotiable by anything you conclude while building.

When you believe the implementation is complete:

- the phase becomes YELLOW — READY FOR INDEPENDENT QA. Never GREEN.
- you complete your normal gate first: unit, contract, synthetic and
  adversarial tests; browser tests; clean-checkout npm run verify; privacy
  scan; CI; deployed Preview SHA equal to the checkpoint SHA; and your own
  Android-style mobile pass, because Timeline and Insights are both entirely
  owner-facing surfaces.
- in that same response, without being asked, you provide: phase status;
  checkpoint SHA; deployed Preview SHA and whether they match; exact
  verification counts; known, open and deferred items; the recommended
  Claude model and intelligence level for QA (D-080 — lowest combination
  that does not risk quality); the conversation instruction NEW; the exact
  QA report path docs/qa/PHASE_06_QA_HANDOFF.md; and the COMPLETE
  copy/paste prompt for the independent QA conversation.

Write that QA prompt so it does not contaminate the review, per D-082 and
qa/README.md section 3a: give QA the governing requirements, the acceptance
criteria, the checkpoint, the explicit deferrals and the repository paths
it needs. Do not tell it what you believe is correct, which behaviours are
intentional, or what conclusion you expect.

If QA reports FAIL, the owner returns here. You read
docs/qa/PHASE_06_QA_HANDOFF.md, take each blocking defect through plan
section 42 — reproduce, identify the whole class, write a regression,
prove it fails when the defect is reintroduced, fix the root cause, rerun
the full gate, deploy a new checkpoint — and you still do not mark the
phase GREEN. You give the repaired SHA and a retest prompt for the SAME QA
conversation.

Only after QA reports PASS does the owner return here for the formal
closeout, and only then is the phase GREEN.

HARD RULES

- The canonical plan is the sole governing authority. Authority order:
  explicit current owner decisions, then the plan, then owner-approved
  amendments, then docs/DECISION_LOG.md, then verified implementation in
  this repository.
- The old planning and archive documents are intentionally excluded. Do not
  ask for them. Do not treat the old app as a specification.
- Bill6006/life-command-os is legacy/reference only. Never clone, inspect,
  modify, repoint or mine it. It is not a requirements source.
- No real owner data enters this repository. Fixtures are synthetic only.
  scripts/privacy-scan.mjs runs in CI and must stay clean.
- No legacy feature returns merely because it existed before.
- Run npm run verify before every push. Not a subset of it. Run
  npm run test:browser before handing off to QA.
- If something conflicts with the plan or is genuinely ambiguous, stop and
  ask the owner rather than guessing.

WHAT PHASES 1 TO 5 BUILT, AND WHAT YOU MUST NOT WEAKEN

Everything Phase 5's own handoff already listed remains load-bearing —
unknown stays unknown; canonical records are append-first; there is exactly
one arbitration path; the evaluator and arbiter know no life area by name;
the explanation may only cite evidence the decision leaned on; a context in
force is current whatever the age of the record carrying it; a move that
resolves an unknown is not scored down or rewarded for it; a limiter carries
its own label; owner-facing copy may not claim the app cannot do something
it does (D-074's guard, which Phase 5's own QA-B1 finding slipped past once
already — read that guard in tests/unit/architecture-guards.test.ts before
writing any Insights copy); a question names what it is about; inference
completes a loop and never opens one and may never conclude harm; a
growth-stage change is proposed after three occasions and never applied by
the app; the bottom navigation has exactly four primary destinations; phase
language appears in exactly two places, both reading REBUILD_PHASE from
src/platform/buildInfo.ts (update REBUILD_PHASE when Phase 6 lands — and
read DEF-0031 first: the number and the *summary sentence describing
current capability* are the same field now, precisely so this cannot go
stale in two places again); the deterministic baseline is the selected
architecture, no live model inference.

Phase 5 additionally built, and this phase must not weaken: ten domain
pages behind Life, one per registry domain except Health & Recovery which
covers two (D-078); six of section 62's eight correction kinds working
through existing record kinds, with a domain page's coverage-review actions
(D-072's shape, generalized) pointing at a specific overdue concept rather
than offering a button that cannot resolve it when one is the cause
(DEF-0032); coverage status agreeing exactly between Life's overview and a
domain page because both read the same computation; a domain-level status
sentence that never contradicts a concept-level freshness tag on the same
screen (DEF-0033).

DEFERRED BY THE OWNER — DO NOT FIX THESE AS INCIDENTAL WORK

From Phase 4, confirmed unchanged through both of Phase 5's QA rounds:

- P4-6 — the no-action eyebrow renders a whole sentence in an uppercase
  micro-label slot.
- P4-7 — the More button is 81×36 (re-measured at 80.575×36), below the
  44px minimum.
- A started move that is never settled stays "Under way" indefinitely and
  no result is ever asked for.

From Phase 5, confirmed unchanged and not this phase's to fix unless the
owner reopens them:

- An inline Life-area link (e.g. "Career & Learning" in a row of names) is
  below a 44px touch target — deliberately: padding it caused adjacent
  wrapped links to overlap, which is worse, and the small target itself is
  WCAG 2.5.5's exception for a link inside a sentence.
- Creating a brand-new goal from a domain page is not supported — only
  correcting an existing one's standing.
- No domain page offers a dated situational-exception control beyond what
  the guide's own closed-option questions already reach.
- "Recent changes" on a domain page is domain-scoped, not chronological —
  this is precisely what Phase 6's Timeline replaces with the whole-life
  version. Building Timeline does not obligate you to also rebuild domain
  pages' "Recently" panels to match; they may keep serving their narrower,
  faster purpose.

Tell QA these are known and unchanged so it does not report them as new.

ELEVEN DOMAINS, TEN PAGES — SETTLED, DO NOT RE-DERIVE

D-078 already settled this in Phase 5 and it is fully built:
src/features/life/domainPages.ts's LIFE_PAGES is the registry,
tests/unit/life-pages.test.ts asserts every domain reaches exactly one page.
Nothing about this needs revisiting in Phase 6.

PHASE 6 GOAL (plan section 51)

Make memory and learning visible without turning the normal experience into
a statistics dashboard. The system, not the owner, discovers useful
patterns from recorded history, context, outcomes, counterexamples and
change over time — the owner may inspect or correct what the system
concludes, but is not required to diagnose his own patterns first.

BUILD

- chronological Timeline — filters if actually needed, not by default;
- human-readable Insight cards: meaningful patterns, trajectories, emerging
  changes, stable strengths, repeated friction, context-specific move
  effectiveness, stale assumptions, contradictions, coverage gaps,
  life-season change;
- pattern confidence, stated in the owner's own words first;
- an explanation drill-down: a deeper Pattern Detail / Evidence surface
  opened from an Insight, not forced into the first view;
- progressively disclosed evidence for the *current* Now recommendation: a
  compact "See evidence" entry point that opens an owner-readable subset of
  the same reasoning and evidence the decision already used — current
  conditions that mattered, comparable situations, prior outcomes for the
  move or learned family, sample size and counterexamples, confidence, and
  why the chosen move beat the strongest credible alternative;
- percentages or rates only when the underlying quantity is well-defined
  and enough comparable evidence exists, with sample size, context,
  counterexamples, uncertainty and the measured outcome aspect kept
  visible — and never collapsing direct result, downstream effect, and
  comfort/follow-through into one generic number (D-079, and DEF-0020's
  lesson from Phase 3, applied here first).

WHAT MUST BE TRUE

- Useful insights are understandable without research language.
- The owner can open a deeper evidence view without that machinery being
  forced into the first view.
- A current recommendation can expose the meaningful evidence behind its
  choice without cluttering Now.
- Percentages/rates appear only when the quantity, denominator, context and
  evidence are defensible; any displayed rate names the aspect it measures.
- Weak evidence produces an honest "not enough evidence yet" state rather
  than invented precision — this is the same discipline as G-009's "unknown
  stays unknown," applied to a learned pattern instead of a fact.
- Synthetic long histories prove that context and combinations can change a
  pattern's interpretation; counterexamples and later contradictory
  evidence can weaken or reverse an earlier learned pattern.
- Malformed records do not break Timeline or Insights (section 26, section
  36 — an unreadable row is isolated and reported, never silently dropped,
  and Timeline in particular must never create a phantom actionable item
  from corrupt data).
- Private data obeys display policy: Timeline must respect the same
  discretion Phase 5 already proved for domain pages (src/domain/privacy.ts,
  section 11) — explicit private content stays off Timeline's default view
  the same way it stays off every other primary surface.
- One arbitration path still decides; Insights contributes an interpretation
  of history, never a second recommendation.

GATE — Phase 6 reaches YELLOW — READY FOR INDEPENDENT QA when all of these
hold

- the fourteen existing golden scenarios still pass, unchanged;
- Timeline renders real canonical history for at least the record kinds
  that matter to an owner reading chronologically, with malformed rows
  isolated rather than breaking the surface;
- at least one Insight card is produced from real synthetic learning
  history and demonstrably changes when a counterexample is added;
- "See evidence" on Now opens real evidence for the actual current
  recommendation, not placeholder text;
- no percentage appears anywhere without a defensible sample and a named
  measured aspect, and at least one synthetic scenario proves the "not
  enough evidence yet" state instead of a manufactured number;
- private-domain discretion holds on Timeline the same way it already holds
  on every other surface;
- CI is green: privacy scan, format, lint, typecheck, unit, browser, build;
- npm run verify passes from a clean checkout;
- preview deploys automatically and the deployed Preview SHA equals the
  checkpoint SHA;
- your own Android-style mobile pass finds nothing blocking — a real mobile
  browser context with touch, a mobile user agent and a realistic device
  pixel ratio, run against the deployed Preview, not merely a narrow
  desktop viewport.

Phase 6 becomes GREEN only after independent QA reports PASS and the owner
returns here for the closeout.

Phase 4 passed 574 unit tests and 171 browser tests and then failed an
Android gate on five counts. Phase 5 passed its own builder gate cleanly,
then failed independent QA's first pass on two blocking and one major
defect — none from a failing assertion, all from reading whole screens as
a person would. Expect the same discipline to matter here: a pattern card
that is individually well-worded can still misrepresent what the evidence
actually shows once read next to the number underneath it, exactly the way
DEF-0033 discovered on Life. Print what the owner will actually read, prove
every regression fails when its defect is reintroduced, and when QA
disagrees with a diagnosis, check the code before defending it.

WORKING RULES

- Make reasonably small checkpoint commits. Every push to main that passes
  the gate redeploys Preview automatically, so tell the owner when a new
  phone-testable checkpoint is available.
- Keep the kernel pure and clock-free.
- Write tests that verify semantic behaviour, not implementation paths.
- Follow plan section 42 for any defect: reproduce, identify the whole
  defect class, write a focused regression, prove it fails when
  reintroduced, fix the root cause, rerun the gate.
- Keep docs/DECISION_LOG.md, docs/PHASE_STATUS.md, docs/DEFECT_LEDGER.md and
  docs/NEXT_PROMPT.md current. Do not write docs/qa/PHASE_06_QA_HANDOFF.md —
  that file belongs to QA.

HANDING OFF TO QA

End with the section 58 report, adjusted for the protocol per D-082: phase
status YELLOW — READY FOR INDEPENDENT QA; checkpoint SHA; deployed Preview
SHA and whether they match; Preview URL; files changed; exact test counts;
product and semantic behaviour changed; open defects; deferred items
confirmed unchanged; decisions made; the recommended Claude model for QA;
the recommended Claude Code intelligence level for QA; the conversation
instruction NEW; one short reason for each of those three; required
references; the QA report path docs/qa/PHASE_06_QA_HANDOFF.md; and the
complete QA copy/paste prompt — all in the same response. Do not make the
owner ask for the QA prompt.

Recommend the model per D-080: the lowest model/effort combination that
does not materially risk quality. Independent QA on a phase like this is
ordinarily Sonnet-class at High; escalate only if what you are handing off
genuinely needs Opus-class cross-system reasoning to review.
```
