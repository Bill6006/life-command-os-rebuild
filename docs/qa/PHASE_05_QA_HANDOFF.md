# Phase 5 QA handoff — the Life domain experience

**Overall: FAIL.** Two blocking defects, one major defect, both blocking
defects reproducible on the deployed Preview from a clean/default state.

## Identity

| | |
|---|---|
| Phase | 5 — the Life domain experience |
| Checkpoint SHA tested | `34e03b6` (verified product checkpoint — where the builder's own gate, including its Android pass, ran) |
| `main` HEAD at test time | `da7cd5887ce053c138449acfde0f8c343c16d6cd` — confirmed documentation-only past `34e03b6` (`git diff --stat 34e03b6..HEAD` touches only `docs/DEFECT_LEDGER.md`, `docs/NEXT_PROMPT.md`, `docs/PHASE_STATUS.md`; `git log -- src tests` is unchanged since `34e03b6`) |
| Deployed Preview SHA | `da7cd5887ce053c138449acfde0f8c343c16d6cd` (`commitShort da7cd58`), read from `preview/build-info.json`, built `2026-08-21T14:12:51.034Z` |
| Match | Yes — deployed Preview equals `main` HEAD, and `main` HEAD is behaviorally identical to the pinned checkpoint |
| Preview URL tested | https://bill6006.github.io/life-command-os-rebuild/preview/ |

## Mobile/desktop configuration

- Mobile: 360×780 viewport (Galaxy-class), dark color scheme, via the Claude Browser pane's device emulation.
- Desktop: 1280×900 viewport.
- **Disclosed limitation:** the hosting environment's Browser pane did not composite visible frames this session (`screenshot`/`computer` click actions timed out with "pane is not displayed" regardless of viewport). No screenshots could be captured, and UI interaction (opening a correction control, typing into a field, tapping Save) was driven via `element.click()` / native-setter `input` events dispatched through the page's own JS context rather than synthesized OS-level touch/pointer events. This exercises the real React event handlers and the real deployed bundle, and DOM geometry (`getBoundingClientRect`) was used in place of visual inspection for layout checks (touch-target size, bottom-nav overlap, horizontal overflow). It does **not** reproduce genuine multi-touch gesture behavior (a physical double-tap, a fast swipe) — rapid navigation was instead tested by firing many hash changes in immediate succession and checking the settled DOM and console for errors. Physical-phone/true-touch validation of double-tap and swipe hazards specifically is not covered by this pass and should not be inferred from it.

## Governing acceptance criteria used

`docs/CANONICAL_REBUILD_PLAN.md` v1.2 in full, with particular weight on §4.1 (whole-life model, ten pages/eleven domains), §4.4 (anti-shame / no gap-framing), §4.6 (specificity), §7 (Life/domain-page purpose), §8 (coverage intelligence, concept-specific freshness), §11 (private domain), §37 (mobile/accessibility), §50 (Phase 5 gate), §59 (legacy exclusions), §61 (copy rules), §62 (correction model, six new kinds), §63 (no-hidden-staleness); `docs/qa/README.md`; the Phase 5 section of `docs/PHASE_STATUS.md` (read as the builder's own account, not as ground truth); `docs/DECISION_LOG.md` D-070–D-076, D-081; `docs/ARCHITECTURE_BOUNDARIES.md`; `docs/DEFECT_LEDGER.md` DEF-0028–DEF-0030.

---

## Blocking defects

### QA-B1 — The app's own "where the rebuild is" screen denies that Phase 5 exists

- **Class:** stale scaffolding copy reaching a primary owner surface (§60, §61) — the same class D-074's copy guard exists to catch, on a claim that guard's fixed list does not cover.
- **Where:** `src/platform/buildInfo.ts:47` — `export const REBUILD_PHASE = { number: 4, title: 'the coverage engine and adaptive guides', next: 'the Life domain experience' }`. Read by `src/features/more/MoreScreen.tsx:71-72` and `src/features/qa/QaScreen.tsx:189`.
- **Reproduction:** Open the deployed Preview → header → **More**. Under "Where the rebuild is": **Phase: 4 — the coverage engine and adaptive guides / Next: the Life domain experience**, followed by the sentence *"...and now notices when a life area has gone quiet... The domain pages behind Life are next."* Separately, the QA laboratory (`#/qa`) header eyebrow reads **"Phase 4"**.
- **Why it is wrong now, not hypothetically:** this is the Phase 5 checkpoint. The ten domain pages this sentence says are still in the future are live, reachable from every Life area name, and were exercised successfully throughout this pass (see PASS list below). An owner opening More is told, in the app's own voice, that a shipped feature does not exist yet — the literal failure mode §61 and §60 exist to prevent ("technical/internal copy must not leak into primary owner UI," "must not claim the app cannot do something it actually can"), and it is not confined to a developer surface: More is one tap from the header on every screen, unlike the QA lab.
- **Root cause:** `REBUILD_PHASE` is a single hardcoded object that nothing in this phase's changed-file list (`domainPages.ts`, `DomainPage.tsx`/`.css`, `LifeScreen.tsx`, `routing.ts`, `corrections.ts`) touched, and no test asserts it against the actual current phase.
- **Severity:** Blocking — false, currently owner-visible claim about the phase's own core deliverable.

### QA-B2 — Two of the six new correction kinds write a record and then visibly do nothing

- **Class:** a correction that "changes what the app reports next" only sometimes — the exact class §50/§62/PHASE_STATUS's own gate claims is closed ("A correction made on a domain page demonstrably changes later reasoning — not merely that a record is written, but that some other screen... reads differently afterward").
- **Where:** `CoveragePanel` in `src/features/life/DomainPage.tsx:292-361`, backed by `coverageInterpretationRecord` / `domainStatusCorrectionRecord` in `src/intelligence/corrections.ts:273-320`, read by `assembleCoverage` in `src/intelligence/coverage.ts:458-599`.
- **Reproduction (both sub-cases confirmed live on the deployed Preview):**
  1. QA lab (`#/qa`) → load scenario **"A month of history, three weeks ago"**.
  2. Navigate to `#/life/home`. "How this stands" reads *"Nothing has come in about home & environment for 3 weeks,"* with both correction buttons showing.
  3. Tap **"I've been keeping on top of this."** "Recently" gains a new row, *"Reviewed — the owner has looked at this," dated today* — the write succeeds. "How this stands" is **unchanged**: still *"Nothing has come in about home & environment for 3 weeks."* Both correction buttons are **still offered**, immediately below the sentence the owner just tried to answer.
  4. Reloading the tab and re-navigating to the same hash (ruling out a stale in-memory cache) reproduces the same unchanged text.
  5. Separately, on the same page, tapping **"Something's changed"** and saving the sentence *"Cleared the table and put the mail away"* produces the identical result: the sentence lands in "Recently," dated today, and "How this stands" still reads the unchanged 3-week-stale sentence, buttons still showing.
- **Root cause, read from source:** `assembleCoverage`'s status line (`coverage.ts:570-577`) is `heard === undefined ? 'unheard' : anyNeglected || goneQuiet ? 'stale' : ...`. `anyNeglected` (`coverage.ts:536-542`) is computed **per standing concept**, from that concept's own `knowledge.observedAt` — entirely independent of any domain-scoped record. `coverageInterpretationRecord` and `domainStatusCorrectionRecord` write non-concept-bearing records (`coverage-update` / `domain-update`); `evidenceByDomain` (`coverage.ts:254-316`) correctly folds these into `heardAt` (clearing `goneQuiet`), but nothing resets the specific standing concept's `neglected` flag, because these records carry no `concept` field to resolve against. So whenever a domain's staleness is driven by `anyNeglected` — a neglected **standing** concept — rather than by `goneQuiet` alone, the coverage-review buttons are structurally incapable of clearing it. Only a `factCorrectionRecord`/`contextCorrectionRecord` on the specific stale concept (the "Not right?" control on that concept row, which I confirmed works — see PASS list) can do that.
- **Scope:** eight of the ten domain pages carry a standing concept (`sleepHours` → Health & Recovery, `custodyArrangement` → Fatherhood, `learningTopic` → Career, `cashBuffer` → Money, `homeFriction` → Home, `privatePattern` → Private, `weeklyFocus` → Direction, `faithPractice` → Faith). Only Social and Emotional have none. On any of those eight, once staleness comes from the standing concept (which, per DEF-0030's own fix, is now essentially always true whenever the correction buttons show at all — `canCorrect` is `coverage.status === 'stale'`), tapping either button is a dead end that looks like it worked.
- **Which existing automated test gave false confidence:** `tests/synthetic/domain-corrections.test.ts`, the `describe('coverage interpretation...')` and `describe('domain status...')` blocks (lines ~192–237). Both fixtures build their "stale, silent" precondition from a `preference` record dated 40 days ago on **`DOMAIN.social`** and **`DOMAIN.emotional`** respectively — the two domains with no standing concept, i.e. the only two domains where `anyNeglected` can never be true and the bug is structurally invisible. The tests correctly prove `goneQuiet` clears; they never exercise a domain with a standing concept, so they certify a claim ("this correction kind changes what the app reports") that is false for 8 of the 10 shipped pages. `PHASE_STATUS.md`'s gate-checklist row citing this test as proof reflects that gap.
- **Severity:** Blocking — fails the phase's own stated acceptance gate for 2 of 6 correction kinds on the large majority of pages.

---

## Major, non-blocking defect

### QA-M1 — A domain page can tell the owner two contradictory things about freshness on one screen

- **Class:** a contradiction between two lines of the same screen (exactly what the QA protocol asks a reader, not an assertion, to catch).
- **Reproduction:** On the deployed Preview's default (freshly-loaded, no scenario) synthetic seed data:
  - `#/life/health-recovery`: "Sleep & Recovery" coverage panel reads *"Sleep & Recovery has been quiet, and nothing here has gone out of date."* Two lines below, in the same "What the app currently believes" panel: **"Hours slept last night — 7 hours — out of date."**
  - `#/life/home`: "Home & Environment has been quiet, and nothing here has gone out of date." followed by **"Home friction — kitchen counter — out of date."**
- **Root cause:** the domain-level `status` text comes from `mattersToOwner` (`coverage.ts:333-370`) — true only if the domain has an entity, goal, commitment, or a handful of other record kinds attached — while a concept row's own `— out of date` badge (`domainPages.ts:150`, `DomainPage.tsx:397`) is set purely from that concept's `knowledge.state === 'stale'`, independent of whether the domain "matters." Neither of these two neighboring sentences is factually wrong in isolation (the domain genuinely isn't being flagged for owner attention, and the specific fact genuinely has aged past its own freshness window) — but a person reading the panel top-to-bottom, which is exactly what §50 asks the page to support, is told "nothing here has gone out of date" and then shown a line explicitly tagged "out of date" one glance below it.
- **Severity:** Major — undercuts §50's "whether it is fresh" promise and §8/§63's trust-building purpose on two of ten pages in the default state, but the correction mechanism itself (unlike QA-B2) works correctly here.

---

## PASS — scenarios and flows verified

| Area | Result |
|---|---|
| Ten pages reachable from Life (link hrefs) and via direct `#/life/<slug>` for all ten slugs | **PASS** — none omitted, none duplicated |
| Health & Recovery page represents both Health & Physical Capacity and Sleep & Recovery as separate coverage panels and separate concept-group headings | **PASS** |
| Fact correction demonstrably changes later reasoning | **PASS** — correcting Career's "Current learning topic" (stale, 7 weeks) via "Not right?" flips "How this stands" to "Career & Learning is current," and the QA inspector's "The decision" flips from the coverage-driven "Spend 10 minutes recalling subnetting..." (Limiter: "Nothing has come in about career & learning for 7 weeks") to "Move for 25 minutes: a walk" (Limiter: "nothing in particular") |
| Context correction (closed-option, `childPresent`) demonstrably changes later reasoning | **PASS** — Fatherhood page's "Not right?" on "Child with the owner" offers the same closed *Yes / Not tonight* the guide would; selecting "Not tonight" flips the reading to "no" and the QA inspector confirms the fact resolver now reads `Child with the owner · known — no`, and "What it would ask" drops by one (the guide no longer needs to ask it) |
| Goal correction | **PASS** — "Done" on "Pass the CCNA" removes it from "Goals here" and appends "Goal: Pass the CCNA (achieved)" to Recently, dated today |
| Domain-status and coverage-interpretation corrections write records | **PASS** for the write itself — see QA-B2 for why the write does not close the loop |
| Private domain is manual-entry-first; "Not known yet" reads as invitation ("Add this"), not a gap | **PASS** |
| Private domain discretion | **PASS** — entered an explicit sentence ("masturbated after late-night scrolling, felt lonely") via `#/life/private`; checked Now, Life overview, and all nine other domain pages afterward — the sentence appears nowhere but its own page and its own "Recently" list; Life's overview shows only "Fresh — Up to date on what matters" for Private, no detail line |
| Unheard domain reads as invitation, not failure (§4.4) | **PASS**, checked on Fatherhood, Money, Social, Emotional, Faith, Direction |
| Stale-domain correction path matches the actual answer (closed-option where a QuestionSpec exists, free text otherwise) | **PASS** |
| Malformed record scenario ("A file with damage in it") | **PASS** — Life overview and a domain page (Health & Recovery) both render normally with the malformed rows isolated in the QA inspector's "Unreadable rows" list; nothing blanks |
| Rapid navigation (30 hash changes across all ten domain pages fired without delay) | **PASS** — settles correctly on the last-requested page, no console errors, no stale content |
| Horizontal overflow at 360px and 1280px | **PASS** — none (`scrollWidth === clientWidth` both widths) |
| Touch targets on domain-page correction controls (Save/Cancel/options) | **PASS** — measured 44×44px via `getBoundingClientRect` |
| Fixed bottom nav covering a control | Initially appeared to overlap an "Add this" button at default scroll position; re-tested by scrolling to the true document bottom (`scrollY` = max) and the control cleared the nav with room to spare — **not reproducible as a permanent trap; not reported as a defect** |
| Coverage status agreement between Life overview and a domain page for the same moment | **PASS** in every case checked — both read the identical `situation.coverage`, and the words matched exactly each time (including the QA-M1 cases, where the *words* agree between screens even though the domain page's own two panels disagree with each other) |
| Deployed/checkpoint SHA match | **PASS** |

---

## Explicit deferrals — confirmed unchanged

- **P4-6, the no-action eyebrow** — not independently re-verified pixel-by-pixel this pass, but `git diff --stat 1d52de4..34e03b6 -- src/features/now src/intelligence/lifecycle.ts src/intelligence/guide.ts` is empty: nothing in Now/guide/lifecycle changed since Phase 4 GREEN.
- **P4-7, the More button is 81×36** — re-measured live: `80.575×36`. Unchanged.
- **A started move that is never settled** — unchanged by the same diff evidence above.
- **The inline Life-area link below 44px** — re-measured live on a Life-overview link: `115.9×20.8`. Unchanged, confirmed still present, and the reasoning in `LifeScreen.css` (padding causes adjacent-link overlap; WCAG 2.5.5's link-in-a-sentence exception applies) was reviewed and is sound — not disputed.
- Older deferred items (ranking dimensions costing weight at zero knowledge, `hold` never generated, free-text constraints unenforced, Emotional Health's thin "current understanding" panel) — not exercised this pass; none are Phase 5 surfaces and none contradict anything found here.

---

## Recommendation

**FAIL.** Return to the original builder conversation with this report.

Both blocking defects are narrowly scoped:

- QA-B1 is a one-line data fix (`REBUILD_PHASE` in `src/platform/buildInfo.ts`) plus, per §42, a regression that asserts the displayed phase number against the actual current phase so it cannot silently go stale again next phase.
- QA-B2 needs an actual design decision, not just a patch: either give `coverageInterpretationRecord`/`domainStatusCorrectionRecord` a way to also clear the specific neglected standing concept(s) they're implicitly vouching for, or change `CoveragePanel`'s copy/`canCorrect` gating so the buttons never appear (or appear with different wording) when the true cause is a neglected standing concept a concept-level correction would actually resolve. Whichever direction is chosen, per §42 it needs a regression on a domain **with** a standing concept — Home, Career, Money, Faith, Direction, Private, Fatherhood, or Sleep — not Social or Emotional, so the fix's own test does not repeat the blind spot that let this ship.

QA-M1 should be fixed or explicitly deferred with a stated reason in the same pass, since it sits in the same code paths as QA-B2's fix.

**Recommended next step:** the original builder conversation, **Sonnet-class at High**. Reason: QA-B1 is mechanical. QA-B2 is a real but narrow design/root-cause fix inside a single, well-understood module (`coverage.ts`'s status computation plus `corrections.ts`'s two record builders) rather than architecture, learning/inference, or privacy work — High is sufficient; Max is not needed. **Conversation: the builder repairs in its own current/continuing conversation for this unresolved phase** (per `qa/README.md` §4); **retest returns to this same QA conversation** once a repaired checkpoint is deployed.
