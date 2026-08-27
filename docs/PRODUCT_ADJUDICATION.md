# Product adjudication — after Phase 82, before the visual phase

**Status: APPROVED BY THE OWNER, 2026-08-27**, with the amendments in section 0
below. Recorded in the governing documents as **D-158 … D-173**. No phase was
started by this round and no product code changed.
**Inputs:** `qa/WHOLE_APP_OWNER_USE_REVIEW.md` (44 findings, 36 sealed evidence
entries, 88 owner wishes), `WHOLE_APP_INTELLIGENCE_AUDIT.md` (51 AUD findings),
`CANONICAL_REBUILD_PLAN.md` v1.2, `DECISION_LOG.md` D-001…D-157,
`PHASE_STATUS.md`, the completed Phase 81 and Phase 82 records, and the
repository at `87e2057`.
**Method:** the owner-use review was read first and in full. Every classification
below that says "verified" was checked against source in the current tree, not
against what a document says was built.

---

## 0. Owner approval, and what it changed

The owner approved the architecture, the 83/84 split and the classification of
all 44 findings, and closed five of the seven decisions section 10 asked for.
**Where the approval differs from or extends what section 13 recommended, the
owner's ruling governs and this section is the record of it.** The sections below
are the adjudication as submitted and are not rewritten; read them through this
one.

| Decision               | Owner ruling                                                                                                                                                                                                                                                                     | Recorded as | Effect on this document                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| Architecture and split | Approved as submitted. 83 and 84 **must not be merged**.                                                                                                                                                                                                                         | D-158       | §8 stands.                                                                                    |
| Routing map            | Approved: 83, 84, 90, 91, 92, 93, 94. Canonical product phase names unchanged.                                                                                                                                                                                                   | D-159       | §9 stands.                                                                                    |
| **Q7 — emotional**     | **Answered.** Six dimensions: mood, stress, motivation, confidence, loneliness / social connection need, mental overload / overwhelm. Distinct, independently unknown, never composited, not all asked daily. Free text coexists. **Energy and tiredness stay in Health/Sleep.** | D-166       | §10 item 1 closed. Unblocks AUD-0011's emotional half in routing 91.                          |
| **Q8 — private**       | **Answered, and it is a third option neither the audit nor this document offered.** One owner control — _"Allow Private / Sexual Health to influence recommendations"_, **default OFF** — rather than a standing policy either way. Domain-level consent, not per entry.         | D-167       | §10 item 2 closed. §11's refusal of per-entry consent is affirmed. Unblocks Reach.            |
| **Romantic life**      | **Approved as recommended (a):** a distinct core domain with its own Life page. **Twelve domains, eleven pages.**                                                                                                                                                                | D-168       | §10 item 3 closed. Amends D-078.                                                              |
| **Review surface**     | **Approved as recommended:** Insights plus relevant domain pages, **no new navigation tab**.                                                                                                                                                                                     | D-169       | §10 item 4 closed. §11's refusal of Timeline search is affirmed.                              |
| **Faith**              | **Overrules the deferral this document proposed.** Faith's passivity is recorded as an **interim state, not the product design**, with the owner's aim and its guardrails written down now rather than left as a later question.                                                 | D-170       | §10 item 5 is **not** left open. Scope of routing 84 is unchanged; Faith joins in routing 91. |
| **Cross-device**       | **Deferred, as recommended.** Local-first stands; no accounts, cloud sync, servers or new threat model before release.                                                                                                                                                           | D-171       | §10 item 6 closed. §11's classification of F37 is affirmed.                                   |
| **Q6 — open-space**    | **Reopened, and widened beyond what this document asked.** No live model in 83 or 84. Before routing 91, adjudicate model-assisted hypothesis generation, another bounded mechanism, or a hybrid — and **the finite concept vocabulary is explicitly refused as a ceiling.**     | D-172       | §12 items 2 and 3 become a scheduled adjudication rather than a standing risk.                |
| **Routing 84 gate**    | **Strengthened.** Acceptance is the owner's own journey sentence, not a set of fields — ending in _"without requiring me to already understand myself."_                                                                                                                         | D-173       | §8's routing 84 gate gains this as its governing criterion.                                   |
| Q1, Q4                 | Remain deferred as adjudicated.                                                                                                                                                                                                                                                  | D-172       | §10 item 7 stands.                                                                            |

**Two rulings went further than this document recommended, and both are
improvements.**

**Faith.** Section 10 listed Faith as an open owner question and would have left
the domain in deliberate passivity until someone asked again. The owner instead
ruled the passivity **interim** and recorded the requirement now. That closes the
exact failure mode the review named — a deliberately passive domain quietly
becoming the design — without expanding routing 84.

**Q6.** Section 12 raised the concept ceiling as a risk. The owner made it a
**scheduled adjudication with named guardrails** — provenance, uncertainty,
privacy, owner correction, deterministic safety constraints, association not
causation, and no silent canonical facts from model inference. Section 12 item 3
observed that seventeen concepts, not the question cap, is the real ceiling; the
ruling makes widening that vocabulary part of what routing 91's design must
answer.

**One ruling settled a question this document could not.** Q8's answer is neither
of the audit's two options. Section 11 wins **conditionally, on the owner's
switch** — which preserves the plan's intent without making private influence the
default, and leaves the structural discretion guard as a precondition rather than
a substitute for consent.

---

## 1. Executive judgement

**The owner-use review is right about the central thing, and the roadmap does not
already answer it.**

Phase 81 made the app stop saying untrue things. Phase 82 built continuity: a
course of action, an obligation, a goal's date and pieces, a fifth Now state, a
stage on a child's skill. Both were correctly scoped and both delivered.

But every object Phase 82 built is scoped to **today, or to a bounded three-step
course**. Verified in the tree: there is no `destination`, no `milestone` and no
`baseline` anywhere in `src/` — the only matches are URL routing. The product can
represent _what to do next_. It cannot represent _what the owner is trying to
become_, and therefore it cannot represent progress, and therefore it cannot
represent a strategy that fails.

That is not a feature gap. It is the missing half of the product promise in plan
section 2, and it changes what a domain page **is**. Phase 9 would typeset a
fact-viewer, take it to the owner's phone, and pass the gate — and then the
destination model would have to re-open it.

**Three further conclusions, each of which changes what happens next.**

**F43 is not "suspected". It is confirmed, and the mechanism is located.**
`stateOfChosen()` (`src/intelligence/engine.ts:944`) resolves the state of the
chosen move by matching `(verb, object.id)` across `situation.recentMoves` — and
`recentMoves` is a **three-day** window (`src/intelligence/situation.ts:1282`,
`addLocalDays(moment.now, -3, zone)`), with no day filter in the match. A walk
completed on 22 August therefore settles a freshly generated walk on 25 August.
`TRANSITIONS.completed` is `[]` (`lifecycle.ts:76`), and `NowScreen.tsx:644-656`
disables every button not in `availableActions(state)`. So the card reads
**"Where this stands — Done" with all five controls inert** — exactly what E31
and E02 recorded, including why the observed gap was three days. The lifecycle
planner is correct (`openEpisode` keys on `(target, dayId)`); the _display_ path
is not. This makes the product's single most important interaction unusable on
any day within three days of a completion of the same move, and no AUD finding,
no package and no defect-ledger entry covers it.

**The roadmap's canonical Phases 10, 11 and 12 are as unroutable as Phase 9.**
`NEXT_PROMPT.md` records that `**Phase:** 9` parses to 9 and never routes because
`build_candidates()` keeps only `max(qa_phase(r))` and 82 is on disk. The same
arithmetic disqualifies **10, 11 and 12**. Nobody has written that down. Reserving
90 for canonical Phase 9 and leaving 10/11/12 as they are would move the silent
failure three phases down the road rather than removing it.

**Not one of the 44 findings is fully solved by Phase 81 or Phase 82.** That is
not a criticism of either phase — neither was scoped at these findings — but it
means "already handled" is unavailable as a disposition anywhere in this
document, and it has not been used.

**What is not being recommended.** The review contains 44 findings and 88 wishes.
Dragging them all in front of Phase 9 would produce exactly the mega-phase the
audit's own adjudication refused ("the discipline is the test, not the
enthusiasm"). **Twelve findings need work before Phase 9. Nine more need only
that Phase 9 leave room for their shape. Twenty-three belong after it.**

---

## 2. Classification of all 44 findings

**A = ALREADY SOLVED · B = COVERED, not yet implemented · C = PARTIALLY COVERED ·
D = NEW PRODUCT REQUIREMENT · E = REJECT / BOUND**

Where a finding splits, both letters are given and the split is stated. "Verified"
means checked against source in the tree at `87e2057`.

| #   | Finding                                       | Class                                   | Basis for the classification                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 | Destination model, not domain model           | **D**                                   | Verified: no destination/milestone/baseline concept exists. §21's "major goals, commitments, identity standards" is aspiration, not specification.                                                                                                                                                                                                          |
| F02 | Progressive discovery ≠ decision questions    | **D**                                   | Verified: 6 questions (`questions.ts`), cap 3/day (`guide.ts:53`), every one an immediate-decision reading. `guide.ts` structurally _cannot_ ask a question that would not move today's answer (audit §10 item 20). The second agenda does not exist.                                                                                                       |
| F03 | A strategy must be able to fail               | **C**                                   | Threads shipped in 82 with live/paused/expired/stopped. No hypothesis, expected evidence, review trigger or verdict. D-133 bounds them deliberately.                                                                                                                                                                                                        |
| F04 | Objects reachable in fixtures, not in use     | **D**                                   | Verified: the only creation affordance in the product is `DomainPage.tsx:834` "Add this", which writes a **fact**. No route creates a goal, routine, person, place or skill. Goal _pieces_ select from entities that already exist.                                                                                                                         |
| F05 | Activity is not achievement                   | **C**                                   | Plan §23 states it; D-053 distinguishes completion from achievement; `OUTCOME_ASPECTS` is `result \| effect \| comfort` — three aspects, none of which is retained capability or transfer.                                                                                                                                                                  |
| F06 | Cross-horizon tradeoffs                       | **C**                                   | Weekly direction + commitment windows model _today_. No representation of protected responsibilities or competing multi-month aims. Depends on F01.                                                                                                                                                                                                         |
| F07 | "Can't now" does not learn the blocker        | **C** _(with a new edge)_               | Verified and sharper than the review knew: `action-unable-now` **already carries an optional `blocker`** (`records.ts:488`), plumbed to `request.reason` (`lifecycle.ts:384`) and stored on the episode (`:208`). **No surface writes it and nothing reads it.** This is AUD-0050's exact pattern — complete enforcement, no control — one kind further on. |
| F08 | Repeated inability → strategy change          | **C**                                   | Depends on F07 and F03. D-045 gives feasibility learning; nothing aggregates a blocker across actions.                                                                                                                                                                                                                                                      |
| F09 | Deferral needs a carried intention            | **C**                                   | `hold` shipped; D-134 bounds it to a later block **today**, deliberately, because there is no model of tomorrow. The bound is right; the missing piece is the intention's own fate.                                                                                                                                                                         |
| F10 | Interruption, partial completion, recovery    | **C**                                   | Verified: `MoveState` is `shown \| started \| completed \| declined \| unable-now`. No partial, no interrupted. `completed` is terminal with no undo.                                                                                                                                                                                                       |
| F11 | Completion needs closure and next frontier    | **C**                                   | Now recomputes on every settle. Nothing recognises milestone completion, and D-052's always-drawn control row has no "enough" state.                                                                                                                                                                                                                        |
| F12 | Recommendation diversity                      | **B**                                   | AUD-0045 + D-113, later Reach, named high priority. Verified: `A_WALK` is still hardcoded as physical health's only subject (`candidates.ts:606`). Not a new gap — but **unreachable without F04**, which is new.                                                                                                                                           |
| F13 | Silence taxonomy                              | **C**                                   | D-149 already names six reasons for not knowing and holds one copy table. AUD-0034 split two no-action states. The _productive_ response to exhaustion — acquire something, or preserve an intention — does not exist.                                                                                                                                      |
| F14 | Maintenance crowding out advancement          | **C**                                   | Plan's evaluation dimensions include long-range fit and opportunity cost. Nothing demonstrates that easy work cannot indefinitely displace hard work. Depends on F01.                                                                                                                                                                                       |
| F15 | Combinations, timing, competing explanations  | **C**                                   | `association.ts` is single-action, two-arm, with `MIN_PAIRS = 4` each side. Plan Phase 6 permits interactions; no mechanism proposes or tests one.                                                                                                                                                                                                          |
| F16 | Observe-first is strong but narrow            | **B**                                   | AUD-0042, later Validity, explicitly widens observed outcomes beyond the sleep path. Correctly planned; not yet built.                                                                                                                                                                                                                                      |
| F17 | Closed-world evidence                         | **C** + **E**                           | The _distinction_ (missing vs. unrecorded vs. did-not-happen) is a real gap. The proposed _active acquisition_ is bounded: see §11.                                                                                                                                                                                                                         |
| F18 | Insight → strategy → evaluation               | **C**                                   | AUD-0029/0043 bring trajectories into scoring and add a "working out" panel. Neither changes an approach because a pattern said so. Depends on F03.                                                                                                                                                                                                         |
| F19 | Resources, places, obligations, opportunities | **C**                                   | Splits. The _creation_ half is F04 (new, pre-9). The _reach_ half is AUD-0040/0041/0047, later Reach.                                                                                                                                                                                                                                                       |
| F20 | Sleep: restoration, not hours                 | **C**                                   | An instance of F01 in the sleep domain. AUD-0007/0009 (Validity) supply load and recovery runs, not a waking-state success criterion.                                                                                                                                                                                                                       |
| F21 | Health: strength, muscle, capability          | **C**                                   | An instance of F01. Plan §23 explicitly permits detailed programming to live elsewhere; it does not exempt the OS from knowing the destination.                                                                                                                                                                                                             |
| F22 | Career: a competency route                    | **C**                                   | An instance of F01. Plan §23 names skill progression, retrieval, labs, work proof, interview stories, resume readiness — and no package builds any of it.                                                                                                                                                                                                   |
| F23 | Money: an outcome path                        | **C**                                   | An instance of F01. Verified: money's only concept is `cash-buffer-state`, free text; its generator needs a `financial-goal` entity the owner cannot create.                                                                                                                                                                                                |
| F24 | Fatherhood: closeness, not one skill          | **C**                                   | The growth model is the product's best-evidenced mechanism and Phase 81/82 just corrected it twice. The breadth gap is real and belongs **after** the destination object exists, not beside it.                                                                                                                                                             |
| F25 | Social capability vs. appetite                | **C**                                   | An instance of F01. AUD-0013/0047 (Reach) address appetite and relationship recency, not capability progression.                                                                                                                                                                                                                                            |
| F26 | Romantic life has no home                     | **D**                                   | Verified: `CORE_LIFE_DOMAINS` holds eleven; romance is not among them. Plan §4.1 says the registry must be extensible — permission, not a plan.                                                                                                                                                                                                             |
| F27 | Distinct emotional dimensions                 | **B**                                   | Genuinely covered as an **acknowledged owner-blocked decision** (Q7, DEF-0056, audit §10 item 16). The architecture already supports the right answer with no schema change. The owner has not answered.                                                                                                                                                    |
| F28 | Faith: direction with honest uncertainty      | **C**                                   | AUD-0011 leaves faith inspect-and-record deliberately; `faithPractice` declares `materialToDecision: false`. The review is right that being deliberate does not make it adequate — but this is the owner's faith and the owner's call.                                                                                                                      |
| F29 | Home: recurring friction vs. resolution       | **C**                                   | An instance of F01 plus F03. Nothing distinguishes a reset from a fix.                                                                                                                                                                                                                                                                                      |
| F30 | Private consent and metadata                  | **C** _(split)_                         | Verified contradiction: the Private page reads _"Nothing here appears anywhere else"_ (`domainPages.ts:104`) while `privacy.ts:72` renders **"Private entry"** on Timeline — and `compose.ts:676` documents that behaviour knowingly. The **honesty half is a truthfulness defect, not a future capability**. The consent-granularity half is Q8-blocked.   |
| F31 | Life-season reorientation                     | **C**                                   | Life seasons and staleness exist; AUD-0044 groups stale cards in the visual phase. The reorientation conversation does not exist.                                                                                                                                                                                                                           |
| F32 | Correction grammar                            | **C**                                   | D-047's watershed is right and must survive. What is missing is the owner-facing _grammar_: wrong event / wrong date / wrong current fact / disagree with the inference are one gesture today.                                                                                                                                                              |
| F33 | Explanations expose deciding evidence         | **B**                                   | AUD-0027/0028 shipped in Phase 81 and the association reaches Now. The residual weak-topic mismatch is a concrete acceptance case, not a new capability.                                                                                                                                                                                                    |
| F34 | Meaningful recall and review                  | **C** + **E**                           | The review loop is a real gap. Search over Timeline is refused: see §11. Whether an in-product review surface exists is **navigation**, so it is an owner decision before Phase 9.                                                                                                                                                                          |
| F35 | Life shows understanding, not recency         | **D**                                   | Verified: rounds 9–12 improved the _truthfulness_ of Life's coverage copy (D-154/155/156/157) and left its _organising question_ untouched — `standing.ts` still groups by Recent / Going quiet / Nothing here yet. AUD-0043 adds a panel to a page whose anatomy is the problem.                                                                           |
| F36 | Capture: semantics and precision              | **C**                                   | Free-text inputs with no interpretation check; sleep is four coarse buttons with no exact-hours path. Rides with F04's confirm pattern.                                                                                                                                                                                                                     |
| F37 | Lifetime memory continuity                    | **C** + **E**                           | Backup/restore is complete (Phase 7) and Phase 10 hardens the lifecycle. Cross-device continuity is refused for this generation: see §11. The **honesty** about single-device is a copy item.                                                                                                                                                               |
| F38 | Acceptance from ordinary owner use            | **D**                                   | Not a feature — a **method**. Every gate to date is green against fixtures authored by the same process that wrote the code. Phase 81's own lesson was "the instrument first".                                                                                                                                                                              |
| F39 | Empty-state wording overstates                | **D** _(specific cases; class covered)_ | Verified surviving: `engine.ts:902` emits _"There is plenty of history here"_ whenever `history.all.length > 0` — any non-empty history, four records included. D-153 named exactly this rule in round 8 and this instance was not swept.                                                                                                                   |
| F40 | Unlabeled inputs                              | **D** _(specific defect; req. covered)_ | Verified: `DomainPage.tsx:694` is `<input type="text">` with `placeholder="What's changed"`, **no `aria-label`, no `<label htmlFor>`** — while the same file uses `aria-label` correctly three times elsewhere.                                                                                                                                             |
| F41 | Preview state discontinuities                 | **C**                                   | Unreproduced. Some are plausibly the F43 mechanism seen from another angle; the rest need isolation before any cause is named.                                                                                                                                                                                                                              |
| F42 | One move can serve two domains                | **B**                                   | AUD-0022, later Validity, bounded to one clause; Q9 settled it as the standing default. Fully covered as scoped.                                                                                                                                                                                                                                            |
| F43 | A past occurrence settles today's move        | **D — CONFIRMED, not suspected**        | Mechanism located: `engine.ts:944` × `situation.ts:1282`. See §1.                                                                                                                                                                                                                                                                                           |
| F44 | Is the app's help worth the burden?           | **C** + **E**                           | The measurable half survives; the self-feedback half is refused: see §11.                                                                                                                                                                                                                                                                                   |

**Counts.** A: **0**. B: **5** (F12, F16, F27, F33, F42). C: **26**. D: **10**
(F01, F02, F04, F26, F35, F38, F39, F40, F43, and F07's unwritten-field edge).
E, in whole or part: **4** (F17, F34, F37, F44). Several findings carry two
letters; the letters are assigned to the halves, not to the finding.

---

## 3. Findings requiring structural accommodation by Phase 9 (reserve only)

These do **not** need building first. Phase 9 must leave a shape for them, and the
phone gate must not be passed on a design that forecloses them.

| Finding             | What Phase 9 must leave room for                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **F03**             | A thread carrying a **review status and a verdict sentence** — one more status on an object Phase 9 already designs.                       |
| **F06**             | A tradeoff clause that names a **longer horizon**, inside Q9's one-clause budget. Not a second card.                                       |
| **F08**             | A **recurring constraint** the owner can see and dismiss, on the domain page — not a new screen.                                           |
| **F09**             | A held intention resolving to **fulfilled / missed / expired** — three outcomes for a state Phase 9 already designs.                       |
| **F14**             | A "this is maintenance, that is advancement" **distinction in the reason line**, not a chart.                                              |
| **F15 / F18**       | An evidence card that can carry a **competing explanation and an open question**, and a visible link from a pattern to a changed approach. |
| **F24 / F25 / F29** | Domain pages must compose a **destination section with an existing progression object** (Adaya's growth stage is the test case).           |
| **F31**             | A compact **reentry state** — one screen, not a wall of stale cards. AUD-0044 is the grouping half of this.                                |
| **F44**             | A restrained **"why am I being asked this?"** affordance. No dashboard, no score.                                                          |

---

## 4. Findings requiring implementation BEFORE Phase 9

The membership test is the audit's, sharpened by the review:

> Would Phase 9 approve the wrong product structure, or pass the owner's phone
> gate on a screen that is untrue, if this landed afterwards?

**Twelve findings pass it**, plus four riders that travel with them.

| Finding                      | Why it cannot wait                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F43**                      | The Now card is unusable for up to three days after any completion. Nobody can approve Now on a phone until this is right.                                                            |
| **F39**                      | The app asserts a quantity of history it never measured, on a screen Phase 9 will typeset as final. D-153 already forbids it.                                                         |
| **F40**                      | Phase 9 designs repeated form components. An unlabeled input inherited into the design system becomes settled design and fails Phase 11's accessibility attack.                       |
| **F30** _(honesty half)_     | The Private page's promise is broader than the behaviour. Phase 9's review list names private-domain discretion explicitly; it must not typeset a false promise.                      |
| **F38** _(instrument)_       | Every acceptance after this depends on it. Phase 81's own sequence put the instrument first for exactly this reason.                                                                  |
| **F01**                      | A domain page without a destination section is a **different page**. This is the single load-bearing item.                                                                            |
| **F35**                      | Life's organising question — recency vs. direction — is the anatomy Phase 9 designs around. Empty without F01; F01 is invisible without it.                                           |
| **F04**                      | Creation is a **different control class** from fact correction. Phase 9 designs one "Add this" pattern today and would need a second afterwards. Also the only route to F12 and F19.  |
| **F02**                      | A second questioning surface, distinct from the guide's one-question-at-a-time flow. A new interaction the phone gate must approve.                                                   |
| **F05**                      | Progress language must distinguish attempt from capability **from the first typesetting**. Retrofitting the distinction means rewording every progress surface.                       |
| **F07**                      | A new optional branch **after** a control Phase 9 designs. The schema field already exists and is inert — this is cheap and it closes the review's most emotionally-loaded complaint. |
| **F26** _(placement only)_   | Navigation. A twelfth destination arriving after the phone gate re-opens it.                                                                                                          |
| _rider:_ **F10 / F11 / F13** | _(state vocabulary only)_ Phase 9 designs the control row and the empty states. A sixth lifecycle state or a seventh no-action reason arriving later re-flows both.                   |
| _rider:_ **F32 / F36**       | _(grammar only)_ Correction is a repeated component on every evidence surface. Four distinct gestures cannot be retrofitted into one.                                                 |

---

## 5. Findings belonging to later Reach

Reach is _what the brain can see_. Its existing membership (AUD-0040, 0011, 0041,
0047, 0045, 0012, 0013, 0006, 0050-retraction) is unchanged and correct. The
owner-use findings that join it:

| Finding                         | Joins because                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **F12**                         | AUD-0045 already is this. F04 supplies the missing route; per-object size/demand remains its precondition. |
| **F19** _(reach half)_          | AUD-0040/0041/0047 are the registry-driven read this needs.                                                |
| **F27**                         | AUD-0011's emotional half, once Q7 is answered.                                                            |
| **F30** _(consent granularity)_ | AUD-0040's structural discretion guard is the same work. Q8-blocked.                                       |
| **F32** _(retraction/backfill)_ | AUD-0050's retraction half. The grammar precedes it; the authoring surface follows.                        |
| **F36** _(observation breadth)_ | Registry reach is what makes new capture kinds decisional rather than inert.                               |

---

## 6. Findings belonging to later Validity

Validity is _what it concludes from what it sees_. Existing membership unchanged.
Joining it:

| Finding                       | Joins because                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **F03**                       | Strategy evaluation. Depends on F01 (a strategy fails _against_ a destination) and F05 (evidence kinds).                                                                                                                                                                                                                                               |
| **F08**                       | Blocker aggregation. Depends on F07's data actually existing.                                                                                                                                                                                                                                                                                          |
| **F09** _(carried intention)_ | Depends on a richer commitment model than two seed questions.                                                                                                                                                                                                                                                                                          |
| **F14**                       | Anti-stagnation is a scoring judgement over goals that must exist first.                                                                                                                                                                                                                                                                               |
| **F15 / F17** _(bounded)_     | Combination and lag discovery, with the acquisition half bounded per §11.                                                                                                                                                                                                                                                                              |
| **F16**                       | AUD-0042 already is this.                                                                                                                                                                                                                                                                                                                              |
| **F18**                       | Pattern → approach → re-evaluation. Depends on F03.                                                                                                                                                                                                                                                                                                    |
| **F20–F25, F28, F29**         | Every one is an **instance of F01 in one domain**. Once the destination object is proved on three domains, each of these is content and evidence work, not new structure. This is the largest single deferral in this document and it is deliberate: twelve domain progression models built before the shape is proved is the mega-phase failure mode. |
| **F31**                       | Reorientation, after AUD-0044's grouping lands in the visual phase.                                                                                                                                                                                                                                                                                    |
| **F34** _(bounded)_           | The review loop, on Insights and domain pages.                                                                                                                                                                                                                                                                                                         |
| **F42**                       | AUD-0022 already is this.                                                                                                                                                                                                                                                                                                                              |
| **F44** _(bounded)_           | The measurable half only.                                                                                                                                                                                                                                                                                                                              |

---

## 7. Findings belonging somewhere else

| Finding                                           | Where                                                     | Why                                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **F37** _(reliability half)_                      | **Canonical Phase 10** (routing 92)                       | Browser lifecycle, long-history performance and restore progress are already its build list. Not re-scoped. |
| **F37** _(cross-device)_                          | **Refused for this generation** — §11                     |                                                                                                             |
| **F41**                                           | **Routing 83, as isolation work; then wherever it lands** | Some of it is plausibly F43 seen from another angle. No cause may be named before reproduction.             |
| **F33** _(residual)_                              | **Acceptance cases in 83 and 90**                         | The capability shipped in Phase 81; what remains is a test, not a feature.                                  |
| **F38** _(method half)_                           | **A governing amendment**, binding 83, 84, 90 and 91      | Not a phase member. The instrument is; the rule is a decision-log entry.                                    |
| **F26, F27, F28, F30, F34** _(the policy halves)_ | **Owner decisions** — §10                                 | Each is the owner's judgement, not the builder's.                                                           |

---

## 8. Recommended phase architecture between Phase 82 and canonical Phase 9

**Two phases, not one.** The seam is real and it is about **what blocks on the
owner**: routing 83 needs no owner decision and can begin the moment this
adjudication is approved; routing 84 is blocked on four of them. Merging them
would make a confirmed, unusable-Now-card defect wait on a policy question about
faith and romance.

---

### Routing Phase 83 — _"The instrument, and the things that are untrue"_

**Product name:** Owner-journey acceptance and observed-defect correctness.
**Routing integer:** **83**
**Owner decisions required to start:** **none.**
**Shape:** deliberately Phase 81's shape — the instrument first, then a small set
of things the app states or does that are wrong.

| #        | Work package                    | Findings                          | Contents                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **83.0** | **The ordinary-use instrument** | F38                               | A journey fixture family that starts from a **near-empty** store and runs: unknown aspiration → discovery → object creation → real action → interruption → concrete outcome → correction → changed recommendation. Plus the two histories the review's own gaps need: a store of four records (F39's case), and a completion three days before the read (F43's case). **Do this first; everything after is verified with it.** |
| **83.1** | **Occurrence identity**         | F43, F41 _(the part it explains)_ | Separate an action's **stable identity** (what learning pools on) from an **occurrence's** state. `stateOfChosen` must not read a settled episode from another day. The decision that goes in the log before the code: _a move's identity is what learning pools on; a state belongs to one occurrence on one day._ Then re-run F41's unreproduced observations against the repaired build and report which survive.           |
| **83.2** | **Sentences that overstate**    | F39, F33 _(residual)_             | `nothing-proposed` must ground its quantity language in what it actually counted — D-153's rule, applied to the instance D-153's own round did not sweep. Plus the weak-topic evidence-panel acceptance case from E19.                                                                                                                                                                                                         |
| **83.3** | **The private promise**         | F30 _(honesty half)_              | Either Timeline stops revealing that a private entry exists, or the Private page stops promising that nothing appears elsewhere. **This is a truthfulness repair, not a consent feature**, and it does not touch Q8.                                                                                                                                                                                                           |
| **83.4** | **Form components**             | F40                               | Every owner-facing input gains a real accessible name and a stated expectation. Phase 9 inherits a labelled component, and Phase 11's accessibility attack has nothing here to find.                                                                                                                                                                                                                                           |

**Dependency order:** 83.0 → 83.1 → {83.2, 83.3, 83.4} in any order.

**Acceptance gate.**

1. A completion of the same move on any earlier day **cannot** settle today's
   recommendation or disable its controls, proved on the three-day fixture and by
   reintroducing the defect.
2. No owner-visible sentence asserts a quantity of history the app did not count,
   proved by the copy catalogue at every history size including four records.
3. The Private page's promise and Timeline's behaviour agree, proved from both ends.
4. Every owner-facing input has an accessible name, swept.
5. The ordinary-use journey from a near-empty store completes end to end, and the
   points where it **cannot** proceed are enumerated with reasons — that list is
   routing 84's own brief.

**What 83 deliberately does NOT include.** No destination object. No new domain.
No consent model. No new questioning surface. No change to any scoring dimension.
No re-opening of Phase 81 or 82.

---

### Routing Phase 84 — _"What the owner is trying to become"_

**Product name:** The destination and discovery structure — Phase 9's product contract.
**Routing integer:** **84**
**Owner decisions required to start:** **Q7, Q8, the romantic placement, and the
review-surface question** (§10). Q1, Q4 and Q6 do not block it.
**Membership test:** the audit's, sharpened — _would Phase 9 approve the wrong
product structure if this landed afterwards?_
**Six work packages, matching Phase 82's discipline.**

| #     | Work package                            | Findings                      | Why Phase 9 needs it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----- | --------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **The destination object**              | F01, F35, F26                 | One revisable object per aspiration: what the owner is aiming at, where he is now, what would count as evidence of progress, what is next, and what is unknown. Qualitative by default. **No score, no percentage, no progress bar** — plan §22 and D-129 already forbid them and both stand. **Proved on exactly three domains: Career, Health, Money.** Career because it has the richest existing evidence; Health because it is the owner's clearest activity-vs-achievement case; Money because it is the thinnest surface and proves the object works from nothing. Life's anatomy changes with it: destination, what is understood, what is changing, what the app is working out. **Fatherhood is deliberately excluded** — see below. |
| **2** | **Progress evidence semantics**         | F05, F11                      | Attempt, completion, quality, retained capability, transfer, and eventual outcome become **distinct kinds**, with uncertainty. Milestone completion becomes a state distinct from action completion, and "enough for today" becomes sayable. Phase 9 must know these render differently from the first typesetting.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **3** | **Owner authoring**                     | F04, F19 _(creation)_, F36    | One generic create-and-confirm pattern for a goal, a routine, a person, a place, a skill and an obligation — accepting partial information, proposing an interpretation, and confirming a consequential relationship. Precision where the owner has it (exact hours, not four buttons). **No entity-management dashboard.** This is the single highest-leverage unlock in the document: it converts fixture-only objects into ordinary-use objects, and it is what makes AUD-0045's diversity work reachable at all.                                                                                                                                                                                                                           |
| **4** | **The second information agenda**       | F02                           | Questions asked to **understand the owner over time**, distinct from questions asked to decide today. An attention budget, never on Now's critical path, always skippable, remembered so it is not re-asked, and it must **show what the answer changed**. Fewer questions as it learns, not more. **Explicitly not an onboarding questionnaire, and D-036's daily cap on the decision guide is untouched.**                                                                                                                                                                                                                                                                                                                                   |
| **5** | **Inability, interruption, the states** | F07, F10, F13, F11 _(states)_ | Write the `blocker` field that already exists, behind **one** compact optional question gated on information value, not on a refusal count — with "just leave it" always available. Add the lifecycle states real life needs: partial, interrupted, resumable. Complete the no-action taxonomy against D-149's six reasons so Phase 9 designs each empty state once.                                                                                                                                                                                                                                                                                                                                                                           |
| **6** | **Correction grammar, private consent** | F32, F30 _(consent)_          | Correcting an event, its date or subject, a current fact, and a learned interpretation become **different gestures with different consequences**, each previewing what it will change. Separate permissions to store, to reason from, to display and to export sensitive information. **Q8-blocked.** D-047's watershed survives unchanged; AUD-0050's retraction/backfill stays in Reach.                                                                                                                                                                                                                                                                                                                                                     |

**Dependency order:** 1 → 2 → 3 → 4 → 5 → 6, with package 1 first and absolutely
so — packages 2, 4 and 5 are all shaped by what a destination turns out to be.
Packages 5 and 6 may float relative to each other.

**Acceptance gate.**

1. Starting from the **near-empty** store built in 83.0, the owner can name a
   desired outcome in each of the three proving domains, and the app's next
   recommendation visibly changes because of it.
2. A completed session, a completed course and a milestone are **three different
   things on screen**, and no surface claims capability from attendance.
3. Every object the rich fixtures contain — goal, routine, person, place, skill,
   obligation — is reachable through ordinary use, proved by building one of each
   from empty.
4. The discovery agenda asks a question that would **not** change today's
   recommendation, and can be shown to have changed a later one; and question
   volume falls as answers accumulate, measured across the library.
5. "Can't right now" produces a durable, correctable statement about **what was in
   the way** on at least one path, and asks nothing when the constraint is already
   known — with the no-question path proved as carefully as the question path.
6. Each correction gesture states its consequence before it acts, and a private
   reading can be stored without being reasoned from.
7. Standing guards still bite: no score about the owner, no percentage, rank,
   grade or score about Adaya, no wellness composite, no Life Score.

**What 84 deliberately does NOT include.**

- **No strategy evaluation** (F03). Threads gain room for a review status; the
  verdicts are Validity, because a strategy can only fail against a destination
  that must exist first.
- **No pattern-discovery engine** (F15/F17/F18). No combinations, no lags, no
  hypothesis machinery.
- **No domain-specific progression models** for Sleep, Fatherhood, Social, Faith,
  Home (F20, F24, F25, F28, F29). Three proving domains, not twelve.
- **Fatherhood is excluded from package 1 on purpose.** The growth model is the
  product's best-evidenced mechanism and Phase 81 and 82 each corrected it. It is
  the _hardest_ place to prove a new object and the _worst_ place to break one.
  It joins once the shape is proved.
- **No owner routines library** (AUD-0045). 84 builds the route; Reach walks it.
- **No scoring change of any kind.** Phase 82 re-cut the instrument and
  re-baselined the tournament; 84 must not disturb it.
- **No new visual language.** That is Phase 9's, and this phase must not spend it.

---

## 9. Updated campaign sequence

```
82 GREEN  ──▶  this adjudication  ──▶  owner approval
                                            │
                        ┌───────────────────┴──── no owner decision needed
                        ▼
         83   The instrument, and the things that are untrue
                        │
                        │  ◀── Q7, Q8, romantic placement, review surface
                        ▼
         84   The destination and discovery structure
                        │
                        ▼
         90   canonical Phase 9 — visual coherence, motion, mobile
                        │            (+ AUD-0038 a/b, 0043, 0044)
                        ▼
         91   later intelligence — Reach, then Validity
                        │            (+ the deferred owner-use findings)
                        ▼
         92   canonical Phase 10 — performance, PWA, reliability   [scope unchanged]
                        ▼
         93   canonical Phase 11 — independent adversarial hardening
                        ▼
         94   canonical Phase 12 — release
```

**Product name and routing integer are different things, and this table is the
only place they are reconciled.** A builder or QA conversation reading a
`PHASE_90_QA_HANDOFF.md` is reading about canonical Phase 9.

| Product / canonical name                               | Routing integer | Handoff file                |
| ------------------------------------------------------ | --------------- | --------------------------- |
| Owner-journey acceptance and correctness               | **83**          | `qa/PHASE_83_QA_HANDOFF.md` |
| The destination and discovery structure                | **84**          | `qa/PHASE_84_QA_HANDOFF.md` |
| **Canonical Phase 9** — visual coherence               | **90**          | `qa/PHASE_90_QA_HANDOFF.md` |
| Later intelligence — Reach, then Validity              | **91**          | `qa/PHASE_91_QA_HANDOFF.md` |
| **Canonical Phase 10** — performance, PWA, reliability | **92**          | `qa/PHASE_92_QA_HANDOFF.md` |
| **Canonical Phase 11** — adversarial hardening         | **93**          | `qa/PHASE_93_QA_HANDOFF.md` |
| **Canonical Phase 12** — release                       | **94**          | `qa/PHASE_94_QA_HANDOFF.md` |

**The routing constraint is wider than anyone has written down.**
`_stated_or_inferred_phase()` parses `**Phase:**` as a bare integer and
`build_candidates()` keeps only `max(qa_phase(r))`, which is 82. `NEXT_PROMPT.md`
records that 9 never routes. **10, 11 and 12 never route either** — they are all
≤ 82, their QA reports would be discarded as history, and the builder → QA →
repair → retest lifecycle would never start, with nothing warning anyone. Fixing
only Phase 9 moves the silent failure three phases downstream. **Canonical Phase
10 is not re-scoped by giving it routing integer 92; only its routing label
changes.** D-109 stands.

---

## 10. Owner decisions still required

Only decisions that genuinely need the owner's judgement. Each says exactly what
it blocks.

**Blocking routing 84:**

1. **Q7 — which emotional dimensions exist?** _(pre-existing, unanswered)_
   The review supplied useful examples — confidence, mood, loneliness, stress,
   motivation and tiredness can move independently — but examples are not an
   answer. The architecture already supports structured optional dimensions **and**
   free text coexisting with no schema change. _Blocks:_ the emotional destination
   in 84 package 1, and AUD-0011 in Reach. **No generic wellness score, whatever
   the answer.**

2. **Q8 — does plan section 11 or the concept registry win on private evidence?**
   _(pre-existing, unanswered)_
   _Blocks:_ 84 package 6 and the whole Reach package. The standing rule holds: if
   the structural guarantee cannot be made, option (b) — inspect-and-record — is
   safer. **83.3 fixes the honesty defect regardless of the answer**, so this
   decision no longer blocks a truthfulness repair.

3. **Romantic life: where does it live?** _(new)_
   **(a)** A twelfth core domain with its own page. **(b)** An aspiration attached
   to Social or Private, with no page of its own. **(c)** Not represented.
   _Recommendation: (a)._ Plan §4.1 requires the registry to be extensible, the
   review establishes this as a real owner priority, and hiding it inside Social
   forces one domain to carry two unrelated destinations. It is navigation, so it
   must be decided before Phase 9 regardless of when it is built.
   _Blocks:_ 84 package 1 and Phase 9's navigation.

4. **Is there an in-product review surface?** _(new)_
   Does the product gain a place to ask "what changed, what did I achieve, what
   should change next?" — or does that stay outside the app, in the AI review
   export? _Recommendation: yes, but on Insights and the domain pages, not as a new
   tab and not as search over Timeline._ D-087 keeps Timeline a passive ledger.
   _Blocks:_ Phase 9's navigation; the build is Validity.

**Not blocking 83 or 84, but needed before the phases named:**

5. **Faith — does the deliberate passivity stand?** _(new, from F28)_
   AUD-0011 leaves faith inspect-and-record by design. The review argues that a
   deliberately passive domain can still violate the product purpose. This is the
   owner's faith and the owner's call; it is not answered here by implication.
   _Blocks:_ F28 in Validity.

6. **Cross-device continuity — confirm it is out of scope?** _(new, from F37)_
   The recommendation is to refuse it for this generation and say so plainly in the
   product. Confirm, or reopen. _Blocks:_ the copy in 83 and the scope of 92.

7. **Q1 (Adaya's age and normative references)**, **Q4 (legacy evidence
   admissibility)** and **Q6 (live model inference)** remain open and unchanged.
   None blocks 83 or 84. **Q6 is worth revisiting on its merits before 91** — see
   §12.

---

## 11. Explicit do-not-change protections

**Everything in audit section 10's DO-NOT-CHANGE list carries forward unchanged**,
including all five lifecycle buttons always drawn (D-052), the shared
health/sleep page (D-078), `hybrid` and `deterministic` agreeing (D-024/D-025),
"Something else" being down-weighted rather than treated as a refusal, a refusal
never reaching `immediate-benefit`, the association engine's thresholds and
comparison groups, growth changes proposed and never applied (D-070/D-112/D-135),
stale coverage scoring zero (D-063/D-073), nothing written on render (D-043), the
engine naming only its own routines (D-021/D-018), timezone and week handling,
`nothing-worth-doing` as a real answer, time with Adaya as a first-class move,
legacy archiving over force-fitting (D-101), imported-goal identity from record
id, `emotionalState` having no invented scale (DEF-0056), `faithPractice` and
`custodyArrangement` staying unread, Life grouping rather than listing (D-075),
`derived.ts` reaching only sleep for now, the guide's inability to ask a pointless
question, and the QA laboratory's probe.

**Additionally protected by this adjudication:**

- **Phase 82's re-cut instrument and re-baselined tournament** (D-137, D-138).
  Routing 84 introduces no scoring dimension and changes no weight. The open
  question about whether a weighted mean is the right shape at all is named in
  Phase 82's record and belongs to 91, not to 84.
- **Threads bounded to three types with no generic creation** (D-133). Package 3's
  authoring pattern covers goals, routines, people, places, skills and
  obligations — **not** threads.
- **`hold` cannot name tomorrow** (D-134). F09's carried intention does not become
  a licence to invent a model of tomorrow.
- **D-047's correction watershed.** F32 adds grammar above it; it does not replace
  suppression with deletion.
- **D-087's passive Timeline.** No filter, no search, nothing to press.
- **D-129's counts-not-shares** and plan §22. No score, no percentage and no
  progress bar reaches any owner surface, about the owner or about Adaya — and a
  "destination" must not become a score through the back door. This is the single
  largest risk in package 1 and the gate names it.
- **D-036's daily question cap on the decision guide.** The second agenda in
  package 4 is a separate budget; it is not permission to raise the first.
- **Q9's one-additional-clause rule.** Neither a destination nor a tradeoff earns
  a second clause on Now.
- **The twelve QA rounds in `qa/PHASE_82_QA_HANDOFF.md`** are the independent
  record and are not edited.
- **`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md`** is not deleted, replaced, formatted,
  staged, committed or altered by this round.
- **Phases 1–82 are not reopened.**

**Refused as proposed (classification E), with what survives:**

| Proposal                                                                                        | Refused because                                                                                                                                                                                                                     | What is accepted instead                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F17** — actively gather missing comparison evidence                                           | As written this edges toward turning the owner's life into a study protocol, which the review itself warns against, and it is how an observe-first system becomes an experiment its subject did not consent to.                     | The **distinction** — missing data, unrecorded activity and actual non-occurrence are three different states — plus the engine's existing `resolves:` mechanism preferring a candidate that would answer an unknown. No comparison arms, no assigned exposures.                                                                           |
| **F34** — meaningful retrieval by goal/person/topic/period over Timeline                        | A query surface over a life record is a large product, and D-087 made Timeline passive deliberately. Search would also be the first surface where a private entry becomes findable by attribute.                                    | A **review loop on Insights and the domain pages**, where the evidence and its provenance already live. Subject to owner decision 4.                                                                                                                                                                                                      |
| **F37** — cross-device continuity                                                               | Cloud sync for this data means an account, a server and a threat model this product has never had. The review explicitly does not demand it.                                                                                        | **Honesty**: the product states plainly that it is one device and one browser, and what the owner must do to keep the record. Reliability stays in canonical Phase 10 (routing 92).                                                                                                                                                       |
| **F44** — the app evaluates whether its own help is worth the burden, partly via owner feedback | A satisfaction loop is an engagement metric wearing a humbler name, and plan §2 rules out optimising for engagement. Asking the owner whether the app is helping also asks him to perform the assessment the app exists to perform. | The **objectively measurable half**: whether questions asked per week fall while decisions still land, whether corrections rise, and whether known-but-unused facts accumulate. Measured internally, surfaced only when it should change behaviour. **No Life Score, no engagement target, no claim that the app caused an improvement.** |

---

## 12. What would still prevent this from becoming a true personal intelligence system

Assume 83, 84, 90, 91, 92, 93 and 94 all ship exactly as specified. **These are the
reasons it could still fall short, ranked by how much they would cost.**

**1. Nothing revises a destination except the owner.**
The chain the owner describes ends in _revision_. After 84, a destination is an
object the owner edits. Nothing detects that a destination has quietly stopped
mattering, that two destinations are incompatible with the hours in his week, or
that he has been pursuing one for eight months with no evidence of movement. A
destination the system can only receive is a form. **The revision loop is the top
of the chain and no phase in this plan closes it.** F31 and F03 are the nearest
things and neither is the same.

**2. The deterministic architecture is a ceiling on the discovery the owner
actually wants.**
D-024 recorded that `hybrid` and `deterministic` chose identically on all ten
golden profiles, and D-025 made the simpler architecture an owner decision. Both
were correct on the evidence. But the audit itself says the tournament rubric
"measures what rules are already good at and cannot detect the difference this
audit is about." Finding **combinations, sequences and lags** across a life is a
search over a space nobody wrote a dimension for. A hand-authored dimension set
can only find patterns someone anticipated. The owner's request — _discover
patterns I could not identify myself_ — is Top-10 rank 7 and it is the one
capability the current architecture is structurally worst at. **Q6 should be
reconsidered on its merits before 91**, not because a model is fashionable but
because rules cannot do hypothesis generation over an open space.

**3. Seventeen concepts is the real ceiling, not the question cap.**
The system can only find relationships among things it records. It records sleep
hours and quality, energy, soreness, child-present, custody, learning topic,
usable time, cash buffer, social energy, home friction, private pattern, weekly
focus, emotional state and faith practice. **It has no concept for where he was,
who he was with, what he ate, whether he trained, how work went, how much he was
outdoors, or what the weather did.** Package 3 lets him create _entities_; it does
not widen the _observation_ vocabulary. "What combination makes a strong week" is
not answerable in a seventeen-concept space where a third of the concepts are
single free-text strings.

**4. Observe-first plus manual entry plus one browser is a self-limiting evidence
supply.**
D-089 is right that the owner must not supply the causal analysis. That leaves
observation — and this product observes nothing automatically. No sensors, no
health data, no calendar, no location, no photos. Every single observation costs a
deliberate tap. The review's "closed-world evidence trap" is not a design mistake;
it is the arithmetic consequence of the deployment choice. **Either the product
accepts a permanently thin evidence base, or a decision about connected data
sources has to be taken, and it is in no phase in this document.**

**5. "Activity is not achievement" is stated but largely unfalsifiable.**
Package 2 gives capability and transfer their own evidence kinds. But the product
can only know what the owner types. Retention evidence means the app has to _test_
him — spaced retrieval is an entire product the plan does not contain. Strength
evidence means a number he records. Employability evidence means an artifact, a lab
that ran, an interview that happened. **Without external evidence, "retained
capability" risks becoming a second self-report wearing a better name**, which is
precisely the failure F05 exists to prevent.

**6. There is no model of the week, the month or the year.**
`hold` cannot name tomorrow, by deliberate and correct decision. Commitment windows
are two seed questions with a recurrence. There is no calendar, no forward view and
no representation of a month. So _"what should I do right now"_ is answerable and
_"am I on track this month"_ is not representable at all — and the second question
is the one a life-steering system exists to answer. F06 and F09 nibble at this;
neither builds it.

**7. Every gate so far is green against fixtures written by the same process that
wrote the code.**
Eighteen synthetic scenarios, all builder-authored. The strongest evidence in this
whole campaign that this matters is the review itself: an independent reader with a
browser found 44 things that 1,332 unit tests, 501 browser assertions, a 93-check
Android gate and twelve rounds of independent QA did not. **F38 is the finding whose
absence quietly weakens the acceptance of everything else**, which is why its
instrument is 83.0 and not a footnote. It still will not be a real week of the
owner's actual life.

**8. A five-year memory living in browser storage is a mismatch with the value
proposition.**
The review rates F37 P2. That is too low. The product's entire argument is that it
compounds — that year three is worth more than year one. Its substrate can be
erased by clearing site data, and its backup is a file the owner must remember to
make. Phase 10 hardens the browser lifecycle; it does not make a five-year record
safe. **The more valuable this becomes, the worse this gets.**

**9. The phase machine may be the binding constraint, not the design.**
Phase 82 took **twelve QA rounds** to close six packages, and each round costs a CI
run and a Pages deploy. Routing 84 is six packages of genuinely novel product
structure — harder to specify, harder to test, and with more owner-facing meaning to
get wrong than Phase 82 had. On Phase 82's observed round count, 83 + 84 + 90 + 91
is a very long road. **The realistic risk is not that this plan is wrong; it is that
it does not finish.** If throughput is the constraint, the honest lever is scope
inside 84 — three proving domains, not twelve — which is why package 1 is bounded
that way.

**10. The owner cannot verify the thing he most needs to trust.**
The product will eventually tell him a strategy is not working, or that a
combination of conditions predicts his weak weeks. Those are the statements with the
most power over his life and the least available ground truth. The review's
acceptance questions in its §11.8 are the right test and **nothing in this plan
commits to passing them**. They should become a standing acceptance instrument, run
at 90 and again at 91, not a research aspiration.

---

## 13. Final recommendation

**Approve the adjudication. Then run 83 immediately, and 84 once four decisions
land.**

1. **Do not proceed directly to the visual phase.** Phase 9 would design a
   fact-viewer, pass the owner's phone gate on it, and make it settled design.
   F01, F35, F04, F02 and F05 change what a domain page and a Life overview _are_.
2. **Do not build all 44 findings first.** Twelve need work before Phase 9; nine
   need only accommodation; twenty-three belong after it. Domain-by-domain
   progression models (F20–F25, F28, F29) are the largest deferral and the most
   important one — building twelve before the shape is proved on three is the
   mega-phase failure the audit already refused once.
3. **Split the pre-9 work into 83 and 84**, because 83 is blocked on nothing and 84
   is blocked on four owner decisions, and a confirmed unusable-Now-card defect
   must not wait on a policy question.
4. **Assign routing integers to canonical Phases 10, 11 and 12 as well as 9.** They
   are all currently unroutable, and only Phase 9's case has been noticed.
5. **Amend the acceptance method, not just the backlog.** F38 binds 83, 84, 90 and
   91: a capability is accepted when an ordinary owner can reach it from a
   near-empty store, not when a prepared fixture demonstrates it.
6. **Take Q6 back to the owner before 91.** Not to change D-025 by default, but
   because the pattern discovery the owner most wants is the thing rules are
   structurally worst at, and the current tournament rubric cannot see the
   difference.

**On the disagreement between the two documents.** Where the intelligence audit and
the owner-use review conflict, **the review wins on what the product is for and the
audit wins on how to sequence it.** The audit's membership test — _would Phase 9
approve the wrong structure?_ — is the right instrument and this document uses it
unchanged. What the audit got wrong is not its method but its scope: it audited the
intelligence the product **has** and found 51 real defects in it. The review audited
the intelligence the product **promised** and found the promise itself
unrepresented. Both readings are correct. Only one of them changes the phase
architecture, and it is the review's.

**No decision in D-001…D-157 is now wrong.** Several are narrower than the product
now needs — D-087 (passive Timeline), D-133 (three thread types), D-134 (hold
bounded to today), D-036's cap — and each was correctly bounded for the phase that
wrote it. They should be **extended by later decisions, never contradicted**, and
84's own decision-log entries are where that happens. D-109's ruling that canonical
Phase 10 keeps its scope stands, and giving it routing integer 92 does not disturb
it.

---

## 14. Phased implementation plan

**Not authorized. Nothing below begins until the owner approves this document and
answers the decisions in §10.**

### Stage 0 — on approval, before any code

Written first, in this order, because the plan sits above the code:

1. **Amend `CANONICAL_REBUILD_PLAN.md`**: a new section reconciling product names
   with routing integers (§9's table); §54's Phase 9 gate gains the structural
   accommodation list from §3; §22's no-score rule is restated as binding on the
   destination object.
2. **New decision-log entries**, drafted before their code:
   - _A move's identity is what learning pools on; a state belongs to one occurrence
     on one day._ (F43)
   - _A capability is accepted when an ordinary owner can reach it from a near-empty
     store._ (F38)
   - _A destination is described, never scored._ (F01, package 1's central guard)
   - _A question asked to understand the owner is budgeted separately from a question
     asked to decide today, and neither borrows from the other._ (F02)
   - _A reason for inability is asked when the answer has a use, and never to fill a
     field._ (F07)
   - _A correction states its consequence before it acts._ (F32)
   - _Routing integers are strictly greater than 82 for every phase from here to
     release._ (orchestration)
3. **Update `PHASE_STATUS.md`** with the adjudication result and the sequence.
4. **Write `docs/NEXT_PROMPT.md`** as the executable kickoff for routing 83 —
   `**Phase:** 83`, actor Claude Code / builder, conversation NEW, Opus-class, Max —
   plus a short launcher, per D-092 and D-083.

### Stage 1 — routing 83 (no owner decision needed)

83.0 instrument → 83.1 occurrence identity → 83.2 overstated sentences / 83.3 the
private promise / 83.4 form components → YELLOW → independent Codex QA → repair
rounds → GREEN. The gate is §8's five items.
**83.0's output — the enumerated points where an ordinary owner journey cannot
proceed — is routing 84's brief**, and it should be read before 84 is specified in
detail.

### Stage 2 — owner decisions

Q7, Q8, romantic placement, review surface. May run in parallel with Stage 1; must
complete before 84 is dispatched.

### Stage 3 — routing 84

Packages 1 → 2 → 3 → 4 → 5 → 6, package 1 first and absolutely so. YELLOW →
independent QA → GREEN. The gate is §8's seven items, and item 7 — the standing copy
and score guards still biting — is the one most likely to be quietly lost in a phase
about progress.

### Stage 4 — routing 90, canonical Phase 9

The visual phase, now designing a product contract that has a destination, a
progression, an authoring route, a discovery agenda and a complete state vocabulary.
Carries AUD-0038(a/b), AUD-0043 and AUD-0044. Gate: owner physical-phone approval,
plus the §3 accommodation list, plus the review's §11.8 acceptance questions run for
the first time.

### Stage 5 — routing 91, later intelligence

Reach then Validity, with the two internal gates unchanged — Reach's privacy
guarantee and no-added-noise check, Validity's scoring and learning correctness. The
deferred owner-use findings join per §5 and §6. Q6 is reconsidered before this phase
starts. This is where the twelve domain progression models land, and where strategy
evaluation, blocker aggregation and combination discovery become possible because
the objects they reason over finally exist.

### Stage 6 — routing 92, 93, 94

Canonical Phases 10, 11 and 12, scope unchanged, routing labels corrected.

---

**End of adjudication. Nothing here is approved.**
