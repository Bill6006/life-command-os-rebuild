# Routing 91 — semantic capture, and the real-owner Now gate

**Status:** a brief, not a handoff. Written 2026-08-27 during routing 84's Round 1
repair, so the reasoning behind it survives the conversation that produced it.
**Nothing here is approved to build.** It becomes buildable when routing 84 is
GREEN and the owner amends the roadmap.

**Routing:** none. This file is invisible to the orchestrator, which routes only
on `docs/NEXT_PROMPT.md` and `docs/qa/PHASE_<digits>_QA_HANDOFF.md`
(`handoff_source.py:21-22`). It carries **no completion marker** and must never be
given one.

**It changes nothing in routing 84.** No QA-owned file is touched, no acceptance
item is altered, and QA-84-001…006 are untouched. Routing 84's scope is what
`qa/PHASE_84_QA_HANDOFF.md` and `PHASE_84_OWNER_ADDENDUM.md` say it is.

---

## 1. The distinction this file exists to protect

The owner-use review and the adjudication of 2026-08-27 established that **two
different capabilities were hiding inside one open question**, and that the
smaller and more urgent of them was at risk of being absorbed by the larger and
never receiving a gate of its own.

|       | Capability                             | Question it answers                                                                                                          |
| ----- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **A** | **Semantic capture and clarification** | _"What does the owner mean by the natural-language thing they just wrote?"_                                                  |
| **B** | **Open-space longitudinal inference**  | _"What patterns, combinations, sequences, variables and hypotheses can the system discover from accumulated life evidence?"_ |

**D-172 is about B and only B.** Its question, verbatim, is _"How can this system
discover hypotheses, combinations, sequences and potentially important variables
that were not manually hardcoded in advance?"_ Nothing in it concerns capture.

**A has no owner anywhere in the roadmap.** It is not F36 — that finding is about
_precision and temporal clarity_ (exact hours rather than four coarse buttons,
distinguishing an observation from an intention), and its routing 84 half shipped
as `proposeAuthoring` while its Reach half is registry reach. It is not F02/D-163,
which is the discovery _agenda_ and has shipped. It is not in Reach and not in
Validity. **It genuinely falls between**, which is why it needs naming here.

**A is cheaper than B, lands sooner, and is the one the owner is feeling now.**

### Rule

**Semantic capture is routing 91 package 1, first, and its gate is its own.**
It may not be closed by B's adjudication, and B's adjudication may not absorb it.
A and B are separately scoped and separately gated.

---

## 2. What is actually wrong today

Verified against the tree at `3dbfc9b`. These citations are recorded so a future
builder does not have to re-derive them.

**Nothing anywhere reads owner text for meaning.** Three places in the
intelligence layer touch string content and none of them is interpretation:
`advisor.ts` scans the app's _own_ generated wording for overconfident words;
`corrections.ts:211` lowercases one character for grammar; `coverage.ts`
lowercases a domain label for a sentence.

**The whole of interpretation today is one line.** `destinationRecords()`
(`authoring.ts:494`) does `const aim = draft.aim.trim()`. The aim becomes an
entity label and an `aim` string. **The domain comes from `draft.domain`** — the
domain of the prompt that was asked — never from anything the words say.

**And in the owner's exact case it changes nothing at all.** "More money" filed as
a Career destination with no milestone produces **no candidate**: `nextMilestoneIn`
is called once, for Health only (`candidates.ts:674`), and the Career generator
requires a `learning-topic` entity (`candidates.ts:365`). Its effect on Now is
zero, and stays zero until the owner manually authors a second object.

**What does exist, and is the seam to build on:** `AuthoringProposal`
(`authoring.ts:146`) already carries `interpretation`, `creates`, `unknowns` and
`problems`. `ActiveDestination.unknowns[]` (`destinations.ts:66`) is already a
first-class place to record what the app declined to conclude. The discovery
agenda is already the follow-up channel, with its own budget and a
`discoveryChanges` replay that proves an answer changed something. **Routing 84's
D-188 adds `proposeDestination()`**, returning that same shape — which is
precisely the producer a semantic interpreter becomes a second source for.

---

## 3. CASE A — the mandatory acceptance case

**This is not an illustration. It is the gate.**

> Insights asks: _"What do you hope Career & Learning eventually looks like?"_
> The owner types **"More money"** and confirms.

The system must not treat this as an inert Career string. It must recognise the
financial meaning, or recognise the ambiguity, and either **propose** a
Money/cross-domain reading or **ask one concrete clarification**.

### Acceptance tests

Each is falsifiable, and the build at `3dbfc9b` fails every one.

1. **It reaches the right domain.** "More money" typed under the Career prompt
   produces a proposal that names Money, or asks which. Today: silently Career.
2. **The words survive.** After confirmation the stored aim is **byte-identical**
   to `"More money"`, and any derived meaning is a separate row.
3. **Ambiguity is declared, not resolved.** `unknowns` names what was not
   concluded — an amount, a horizon, income versus savings. An empty `unknowns`
   for a two-word aim is a failure.
4. **Exactly one follow-up, and it is concrete.** One clarification under the
   existing discovery budget. Not three.
5. **Declining costs nothing.** Rejecting the interpretation leaves the aim stored
   and produces no derived record.
6. **Now changes.** After clarification, a destination in the resolved domain
   produces a candidate. Today it produces none — **the strongest single test on
   this list.**
7. **Cross-domain links are proposed, never asserted.** Any Career↔Money link is
   confirmable and reversible.
8. **Privacy holds.** With D-167's permission off, no private text reaches the
   interpreter — proved by asserting the digest's contents, not by reading copy.

---

## 4. The rules any interpreter must obey

1. **Interpretation is proposed, never silently asserted.** Nothing is written
   without confirmation. This is the existing `AuthoringProposal` contract, and
   D-188 has just extended it to destinations.
2. **The owner's original wording is preserved verbatim.** The aim is stored as
   typed. D-162 already forbids scoring it; this forbids editing it.
3. **A derived meaning is a sibling of the words, never a replacement.** It is a
   `provenance: 'derived'` row pointing at the owner's record. D-143 already says
   what the app was told and what it worked out are two rows; this applies that to
   interpretation.
4. **Cross-domain meaning is proposed or clarified, never assumed.** The app may
   say _"this sounds like it is about Money — shall I file it there, or keep it in
   Career?"_. It may not move it.
5. **Ambiguity and unknowns must be explicit.** `unknowns` is the half of a
   confirmation that earns it — the existing `NOT_ASSUMED` table already
   establishes the pattern.
6. **The private boundary is D-167's.** The permission —
   _"Allow Private / Sexual Health to influence recommendations"_, default **OFF**
   — governs whether private text may reach an interpreter at all. Note the
   boundary is **not yet a single chokepoint**: `situation.ts:525` is the
   reasoning check, but six other sites exclude private material permission-blind
   (`coverage.ts:638,871`; `insights.ts:1601,1816,2026,2559`). Consolidating that
   is part of this package, not an assumption it can make.
7. **No score.** D-162 binds here as everywhere.

---

## 5. Why routing 85 was rejected

The owner proposed inserting a narrowly scoped routing 85 for semantic capture
between routing 84 and canonical Phase 9. It was adjudicated on 2026-08-27 with
six verification probes and three adversarial challenges, and **rejected 2–1
against, with all three challenges agreeing on the decisive facts.** The reasons,
because they will be re-proposed otherwise:

1. **Creating a `PHASE_85_QA_HANDOFF.md` would silently orphan routing 84's QA
   loop.** `build_candidates()` keeps only `max(qa_phase(r) for r in reports)` and
   discards every lower phase as history; `_freshness` times dirty files by mtime,
   so **an uncommitted file counts**. The moment an 85 handoff exists on disk,
   `PHASE_84_QA_HANDOFF.md` stops being a routing candidate. This is D-159's
   failure class running in the opposite direction, and it is a hard ordering
   constraint rather than a preference.
2. **CASE B is undeliverable inside a capture-only phase** — see §6. Shipping
   CASE A's capture without CASE B's enforcement produces the worst outcome
   available: the app says it understood, and offers the walk again tomorrow at
   full score.
3. **The confirm seam did not exist on the surface where CASE A happens.**
   `Discovery.tsx` never imported `proposeAuthoring`. Routing 84's addendum fixes
   this (D-188) — which is _why_ it was routing 84's to fix and not 85's.
4. **"Hybrid" would pre-empt a scheduled owner decision.**
   `ArchitectureId = 'deterministic' | 'hybrid'` is a reserved term, D-024 selected
   deterministic, and `intelligence-tournament.test.ts` fails if hybrid ever scores
   higher — deliberately, so the decision must be re-made rather than inherited.
   D-172 reserves that adjudication for before routing 91.
5. **Canonical Phase 9 would not design the wrong structure.** The campaign's own
   membership test, applied rigorously: every surface class semantic capture needs
   is already designed, reserved or shipped, and the gap closes with one line in
   plan §54's accommodation list.

**One worry was investigated and dismissed.** D-025 does **not** block semantic
capture — it blocks the _network call to a model_, not interpretation. A
deterministic capture-time interpreter needs no secret and no network; the only
`fetch` in `src/` is a same-origin `build-info.json` read. **Semantic capture is
sequence-blocked, never infrastructure-blocked.**

---

## 6. CASE B — the worked example, and why it cannot be enforced yet

> Now recommends _"Move for 25 minutes: a walk."_ The owner taps **Can't right
> now**. The real reason: **his daughter is asleep and there is nobody else to
> watch her.**

The system should understand a caregiving/supervision/location constraint, and a
later recommendation in the same context should respect it rather than re-offering
the outdoor walk.

**The capture half is being built in routing 84** — the addendum's fix 1 adds a
standing blocker cause meaning "I must stay here", writing a durable
`ConstraintRecord` the owner can lift. **D-187 governs it: it records plainly and
promises nothing**, because the engine does not act on it.

**The enforcement half cannot be built before Validity.** Four pieces are missing,
and all four were verified:

| #   | Missing piece                                                        | Verified                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **A supervision / location / egress concept**                        | The registry holds seventeen concepts (`concepts.ts:230-253`) and none is about location, egress or being tied to the house.                                                                                                                                                                                                                                                                                      |
| 2   | **An egress attribute on candidates** — "requires leaving the house" | Nothing in `candidates.ts:53-132` or `ACTION_VERBS` distinguishes it; `A_WALK` is an undifferentiated `entityRef('routine','a walk')` (`candidates.ts:86`).                                                                                                                                                                                                                                                       |
| 3   | **Actual constraint enforcement**                                    | `applyConstraints` never reads `situation.constraints` (`constraints.ts:201-349`); `cautionsFor` matches `constraint.concept` against `candidate.leansOn` (`evaluate.ts:1106-1112`) and **no `leansOn` anywhere contains a `blocker.*` concept**, so that branch cannot fire. `constraints.ts:25-28` records the non-enforcement as deliberate: constraints are _"attached as cautions and shown, not enforced."_ |
| 4   | **A bounded `until` / context duration**                             | No blocker path ever sets `ConstraintRecord.until` (`blockers.ts:327-340`, payload `records.ts:267-270`). "While she is asleep" has no representation.                                                                                                                                                                                                                                                            |

Piece 1 is exactly what **D-172 refuses to leave as a permanent ceiling**. Piece 3
is **F08 blocker aggregation, adjudicated to later Validity**.

### Rule

**CASE B is the worked example that forces D-172's adjudication before routing 91.** It is not an acceptance case for semantic capture, and semantic capture must
not claim it. Capturing it honestly now (routing 84, D-187) is what makes
enforcing it possible later.

---

## 7. The real-owner Now QA gate

### The finding

**Every browser spec in the repository seeds its state through the QA
laboratory.** All twelve spec files navigate to `#/qa` and click a scenario; there
is no `localStorage.clear()` and no fresh-store test anywhere. Even
`phase84.spec.ts`, whose own header says _"open the near-empty history, read the
screen, press the thing"_, opens that history **via `loadInQa()`**. The
Android-style gate seeds the same way.

Routing 83's instrument (`tests/synthetic/journey.ts`) is the closest thing and it
is good — it drives the surfaces' own calls from a near-empty store and
`recordKindsWithNoOwnerRoute()` is checked against source. But it is **in-process**:
it calls `planLifecycle` the way `NowScreen.act` does rather than clicking
`NowScreen`. It proves the record layer is reachable. It cannot prove the screen is
usable, and it cannot observe what a person actually types.

**D-161 must therefore extend from record-kind reachability to screen
reachability:** a capability is proved in a browser that has never opened the QA
laboratory.

### Two gates, not one

- **First, at routing 84's GREEN closeout.** A bounded browser gate that clears
  storage, never navigates to `#/qa`, and proves an owner can reach a useful Now:
  answer a question, author a destination, get a move, complete it, reopen, see it
  react. This is the "can a normal person use this at all" gate.
- **Second, after semantic capture lands in routing 91.** The interesting failures
  then are about interpretation, and CASE A belongs there.

### Three unsolved mechanics the first gate must solve

Named so nobody discovers them mid-phase:

1. A genuinely empty store renders `EmptyNow` — _"There is no history here yet"_ —
   so the gate must first author records through owner controls.
2. Outside the laboratory the clock is wall-clock at mount
   (`MemoryProvider.tsx:135,187`) and `travelTo` is a lab control, so
   block-dependent behaviour is non-deterministic across CI run times.
3. Nothing in `tests/browser` uses Playwright's `page.clock`. That determinism
   mechanism is new, unproven infrastructure.

**Keep the gate separate from semantic capture.** Bundling an unproven instrument
with the product whose acceptance depends on it is routing 82's failure pattern —
instrument and product failing together with no way to tell which.

---

## 8. What stays synthetic, and why it is better there

The split is not cost. **Synthetic proves the engine reasons correctly over
evidence; real-owner proves the evidence can be created at all.** Neither
substitutes for the other.

Synthetic remains the right instrument for:

- **Long histories** — nine months of evenings, life-season changes, the
  association engine's comparison arms. You cannot live a year to test a year.
- **Controlled clocks and replay** — same history, same answer twice; time travel
  across blocks, week boundaries, timezones and DST.
- **Adversarial and malformed states** — hostile records, legacy import,
  cross-tab races.
- **The block sweep and copy catalogues** — every scenario × every block is
  combinatorial and must cover branches the library does not naturally reach.
  Phase 81's whole lesson.
- **Anything requiring a history no owner could produce in a test.**

---

## 9. Numbering

**D-187 and D-188 are taken.** Routing 84's owner addendum claimed them on
2026-08-27 — D-187 (a constraint the engine does not act on promises nothing) and
D-188 (a destination is proposed by its own function). The decision log is
append-only and first writer wins.

**Decisions arising from this brief begin at D-189.** The ones anticipated:

- the A/B split of D-172, with semantic capture as routing 91 package 1;
- an interpretation is a proposal and never a fact;
- D-161 extended to screen reachability — proved in a browser that has never
  opened the QA laboratory;
- the real-owner gate runs twice, with what stays synthetic named explicitly.

Check the log's tail before allocating; routing 84 is still open and may claim
more.

---

## 10. Documents that will need amending, when the owner approves

Not now. At routing 84's GREEN closeout or later.

| Document                         | Change                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DECISION_LOG.md`                | D-189+ per §9.                                                                                                                                                                                                                    |
| `CANONICAL_REBUILD_PLAN.md` §54  | Add the cross-domain re-file row to the Phase 9 accommodation list — a proposal that can name a second reading and let the owner re-file it, as one option row inside the confirm block, not a picker screen.                     |
| `CANONICAL_REBUILD_PLAN.md` §43A | Note that routing 91's first package is semantic capture.                                                                                                                                                                         |
| `PRODUCT_ADJUDICATION.md` §0     | Rows for the A/B split and the real-owner gate.                                                                                                                                                                                   |
| `PRODUCT_ADJUDICATION.md` §5/§6  | F36's disposition is refined: precision to Reach, interpretation to 91 package 1.                                                                                                                                                 |
| `qa/README.md`                   | Separately and unrelated: the "never write Max into a Codex block, it stalls the orchestrator" claim is **stale** — `_EFFORT_RUNG` now maps `max` and `extra high` to one `top` rung. Keep the convention, drop the stalls claim. |

**Delete this file when routing 91 is specified.** What survives it is the
decisions in §9 and the amendments in §10.
