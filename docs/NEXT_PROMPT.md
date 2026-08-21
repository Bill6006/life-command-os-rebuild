# Next prompt

Canonical plan section 43. The intelligence level, model and conversation
instruction sit outside the prompt so the owner can switch Claude Code before
pasting.

**Phase 5 is YELLOW — READY FOR INDEPENDENT QA.** Verified product checkpoint
`34e03b6`; current `main` HEAD is documentation only past that SHA — no
product code differs. Test whatever `main` HEAD is deployed at the moment of
testing, confirmed against `preview/build-info.json`. It does not become
GREEN here. Owner decision D-077 and the protocol in
[`qa/README.md`](qa/README.md): a builder conversation may not approve its
own phase. The full closing report is in
[`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 5 — the Life domain
experience."

---

## NEXT CLAUDE ACTION

- **Model:** Sonnet-class (Claude Sonnet 5 or the nearest current equivalent)
- **Intelligence level:** High
- **Conversation:** **NEW — required for independence**
- **Why this model:** ordinary UI/record-correction work under an established
  pattern (`qa/README.md`'s "Sonnet-class, High when sufficient" bucket) —
  nothing here needs cross-system semantic redesign, learning/inference
  mathematics, or privacy/migration architecture.
- **Why this level:** the same reason — routine independent QA against a
  phase whose acceptance criteria are already concrete and testable.
- **Why a new conversation:** independent QA must not inherit the builder's
  model of why its own work is correct (plan section 43, D-077). A reviewer
  handed the author's reasoning stops being independent.
- **Attach/reference:** nothing beyond what the prompt below already names —
  the repository is public and the prompt gives every path QA needs.

---

## COPY/PASTE PROMPT

```text
You are independent QA for Life Command OS Phase 5 — the Life domain
experience. This is a NEW conversation with no memory of how this phase was
built. Do not ask for or assume access to any prior conversation.

Repository: https://github.com/Bill6006/life-command-os-rebuild (public,
branch main). The verified product checkpoint is 34e03b6; current `main`
HEAD may be a later SHA if documentation-only commits followed it — check
`git log -- src tests` from HEAD if you want to confirm nothing under
those two directories differs from 34e03b6 (it should not). Fetch
https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
first and treat its `commitSha` as the SHA under test — verify it is at or
after 34e03b6 before testing anything else; if the Preview is somehow behind
34e03b6, stop and report that alone.

Preview URL: https://bill6006.github.io/life-command-os-rebuild/preview/

Read these, in this order, before testing anything:

1. docs/CANONICAL_REBUILD_PLAN.md — the sole governing authority (v1.2).
   Section 50 governs this phase directly. Sections 4.1, 7, 8, 11, 59, 61,
   62 and 63 govern specific claims the phase makes. Read the whole
   document, not only section 50 — several of the rules a domain page can
   violate are stated elsewhere (section 11 for the private domain, section
   61 for copy style, section 4.6 for specificity, sections 37 for mobile/
   accessibility).
2. docs/qa/README.md — the protocol you are executing. It governs your role,
   what you may and may not do, and the report you must produce.
3. docs/PHASE_STATUS.md — read only the "Phase 5 — the Life domain
   experience" section (the first phase entry in the file) for the exact
   gate checklist, verification results and files changed. Do not read this
   as a claim of correctness — it is the builder's own account of its own
   gate, which is exactly what you are here to test independently.
4. docs/DECISION_LOG.md — D-081 specifically (a domain page corrects a
   durable concept as context, not as a fact). D-070 to D-076 give
   background on the coverage engine and growth-suggestion mechanism this
   phase's corrections build on.
5. docs/ARCHITECTURE_BOUNDARIES.md — module ownership, particularly the
   `src/features/life/` paragraph.
6. docs/DEFECT_LEDGER.md — DEF-0028 to DEF-0030 specifically: three defects
   the builder's own gate found and fixed before this checkpoint. Read them
   so you know what was already caught; do not assume they are the only
   defects of their class.

Then read the implementation: src/features/life/domainPages.ts,
src/features/life/DomainPage.tsx, src/features/life/LifeScreen.tsx,
src/intelligence/corrections.ts, src/platform/routing.ts.

## What this phase claims to build

Ten domain pages (section 50), reachable only from Life, each showing what
the app currently believes about that domain, why, what changed recently,
whether it is fresh, and offering a way to correct it. Every Life area name
links to its page. A domain page correction writes a canonical record
through one of six new functions in corrections.ts (facts, context, goals,
direction, coverage interpretation, domain status) plus the two that already
existed from Phase 4 (a learned effect, a learned preference — both still
reached from Now, not from a domain page).

## Governing acceptance criteria (canonical plan section 50, and the phase
## brief this builder worked from)

- The fourteen existing golden scenarios (G-001 through G-014, minus none)
  still pass, unchanged.
- Every domain in the registry (eleven of them — see section 4.1) is
  reachable from exactly one of the ten pages, none omitted, none
  duplicated. The Health & Recovery page is the one page that covers two
  domains (Health & Physical Capacity, Sleep & Recovery) — this is
  deliberate (D-078), not a defect, but confirm both domains are actually
  represented on that page rather than only named in its title.
- A correction made on a domain page demonstrably changes later reasoning —
  not merely that a record is written, but that some other screen (Life's
  coverage status, Now's recommendation, the guide's questions) reads
  differently afterward because of it.
- The private domain (Private / Sexual Health) is manual-entry-first and
  discreet elsewhere: explicit content entered there must not appear on Now,
  Life's overview, Timeline, or any other domain page — test this directly,
  do not take the builder's word for it.
- No domain page reads as a static questionnaire dump (section 59 excludes
  the old domain maturity UI and the old category switches by name). Judge
  this as a person reading the whole page, not by checking whether input
  fields exist.
- Coverage status shown on a domain page must agree with what Life's
  overview shows for the same domain at the same moment — one computation,
  not two that could disagree.
- CI green: privacy scan, format, lint, typecheck, unit, browser, build.
- `npm run verify` passes from a clean checkout.
- The deployed Preview SHA equals the checkpoint SHA (checked above).
- Section 61's copy rules apply to every new sentence: concise, specific,
  ordinary, no research-report language, no internal type names, no moral
  judgment.

## How to test

Use a real Android-style Playwright context — touch, a mobile user agent
(e.g. Galaxy S24 or Pixel-class, ~360×780), a realistic device pixel ratio
(2 or 3), mobile scrolling and interaction — against the deployed Preview
URL above, not merely a narrow desktop viewport. Also exercise a desktop
width, since the repository's own browser suite tests three widths and a
regression could be width-specific.

The QA laboratory is reachable from the deployed Preview at
`#/qa` (header → More → "Open the QA laboratory" also works). It has a
library of synthetic scenarios you can load, a clock you can move, and an
inspector over facts, coverage, entities and history. No real owner data
exists anywhere in this repository or its scenarios (section 39) — you may
load, edit and time-travel through any of them freely.

Test at minimum:

- Reaching each of the ten domain pages from Life, and from a direct hash
  link (`#/life/<slug>` — slugs are health-recovery, fatherhood, career,
  money, social, emotional, faith, home, private, direction).
- Reading each page as a person: does it say what the app believes, why,
  what changed, whether it is fresh, and how to correct it — in that order
  of importance, without contradictions between two lines of the same
  screen.
- Making at least one correction of each of the six new kinds (fact,
  context, goal, direction, coverage interpretation, domain status) and
  confirming it changes something else in the app, not only the field you
  edited.
- The private domain specifically: enter something there, then check Now,
  Life, Timeline and every other domain page for leakage.
- A domain with nothing known yet (an "unheard" area) — does it read as an
  invitation to enter something, or as a gap/failure? Section 4.4 forbids
  the latter.
- A domain that is stale — does the correction path offered there actually
  match what a person would want to say, or does it feel like it is asking
  the wrong question?
- Malformed or contradictory synthetic data (the QA lab has scenarios for
  this) against a domain page — confirm nothing blanks the surface.
- Rapid navigation between domain pages (a real double-tap or fast swipe
  case) — confirm nothing crashes and nothing shows stale/wrong content
  from the previous page.
- Touch targets, overflow, safe-area behavior, and whether the fixed bottom
  navigation ever covers content or a control on a domain page.
- Whether any owner-facing sentence on a new screen claims the app cannot
  do something it actually can (section 61, and the architecture guard this
  repository already enforces for it) — read the copy skeptically rather
  than trusting it.
- Which existing automated tests, if any, gave false confidence — i.e.
  passed while the actual owner-facing behavior was wrong. Name them
  specifically if you find any.

## Explicit deferrals — confirmed unchanged, do not report these as new

From Phase 4, untouched by this phase (Now, the guide and the lifecycle were
not modified):

- The no-action eyebrow renders a whole sentence in an uppercase micro-label
  slot (P4-6).
- The More button is 81×36, below the 44px touch-target minimum (P4-7).
- A started move that is never settled stays "Under way" indefinitely.

New to this phase, and deliberate:

- Creating a brand-new goal is not supported from a domain page — only
  correcting the standing of an existing one (mark done / no longer this).
- No domain page offers a control to set a dated situational exception on a
  concept other than the ones already reachable through the adaptive
  guide's own questions (e.g. "is she with you tonight"). The underlying
  mechanism supports it; no UI reaches it yet for other concepts.
- "Recent changes" on a domain page is domain-scoped, not a full
  chronological timeline — the whole-life Timeline is Phase 6.
- Progressively disclosed evidence/analytics (sample sizes, rates,
  likelihoods) do not exist anywhere yet — Phase 6, per D-079. Do not
  expect them on a domain page.
- An inline Life-area link (e.g. "Career & Learning" in a row of names) is
  smaller than a 44px touch target. This was investigated deliberately: the
  usual padding/negative-margin fix made adjacent wrapped links overlap,
  which is a worse defect than the small target, and the small target
  itself falls under WCAG 2.5.5's exception for a link inside a sentence.
  If you still think this is wrong, say so — the reasoning is in
  `LifeScreen.css` (search "44px") for you to evaluate independently rather
  than take on faith.

## Report

Write your findings to `docs/qa/PHASE_05_QA_HANDOFF.md`. Follow the format
in `docs/qa/README.md` section 3 exactly: phase; checkpoint SHA tested;
deployed SHA tested; Android/mobile configuration used; the acceptance
criteria you used; every scenario/flow tested with PASS/FAIL; exact
reproductions for any defect; semantic, behavioral, privacy and mobile/UI
findings kept separate; blocking vs non-blocking classification; evidence
references; which automated tests gave false confidence, if any; explicit
confirmation the deferred items above are unchanged; an overall PASS or
FAIL; and a recommended next action, including the recommended Claude model
and intelligence level for that next step if it sends the owner back to the
builder.

You do not repair product code. If you find something wrong, describe it
precisely enough that the original builder conversation can reproduce it
without guessing.
```
