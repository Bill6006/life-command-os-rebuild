# Next prompt

**Phase:** 91 — **semantic capture and clarification**

**Actor:** Claude Code / **builder**.
**Conversation:** **NEW** — a fresh Claude builder conversation. Routing 90 is GREEN and closed; this is a new phase (D-092, `qa/README.md` conversation rule).
**Model:** Claude Opus 5.
**Reasoning level:** **Max** — the audit-repair campaign classification in `qa/README.md` covers every phase created by its adjudication, and this is one.

---

## Read these first, in this order

1. `docs/ROUTING_91_BRIEF.md` **in full** — this phase's reasoning, its CASE A acceptance tests, and the seven rules any interpreter must obey. It is a brief rather than a handoff and carries **no completion marker**; do not give it one.
2. `docs/PRODUCT_ADJUDICATION_2.md` **§6.3** — the approved scope, the two QA contracts and the completion condition. Also **§6.1**, which defines the ordinary-owner and synthetic tracks and the time-advance mechanism.
3. `docs/DECISION_LOG.md` — **D-188** (destinations are proposed), **D-143** (what the app was told and what it worked out are two rows), **D-167** (the private permission, off by default), **D-162** (no score), **D-176**, **D-184**. Then **D-238**, which routing 90 earned and which binds every test this phase writes.
4. `docs/CANONICAL_REBUILD_PLAN.md` **section 43A** (the routing map and the monotonic-integer rule) and **section 22** (scores and forecasts).
5. `docs/qa/README.md` — the independent QA protocol. **You may not approve your own phase.**

**Routing 91 is not gated by any campaign hold.** `docs/CAMPAIGN_HOLDS.md` declares D-172 against **routing 97** only, and D-172 is about longitudinal inference — CASE B — which this phase must not touch.

---

## What this phase is

**Make the words the owner types mean something.**

Today he types _"More money"_ under the Career aspiration prompt and the app files it in Career, stores it, and does nothing else with it. The brief's finding is that **two capabilities were hiding inside one open question** — capture (what did he mean by what he just wrote?) and longitudinal inference (what can be discovered from accumulated evidence?) — and that the smaller, more urgent one had no owner anywhere in the roadmap.

This phase is the whole of routing 91, and its gate is its own. It may not be absorbed into D-172's adjudication, and D-172's adjudication may not absorb it.

**A deterministic capture-time interpreter needs no secret and no network.** D-025 blocks a network call to a model, not interpretation; the only `fetch` in `src/` is a same-origin `build-info.json` read.

---

## Work packages

### 91.1 — A second producer of `AuthoringProposal`, reading words rather than a kind-picker

Alongside `proposeDestination()` (D-188), obeying **all seven** of the brief's section 4 rules:

1. **Proposed, never silently asserted** — nothing written without confirmation.
2. **The owner's wording is preserved byte-identically.** D-162 forbids scoring it; this forbids editing it.
3. **A derived meaning is a sibling row, never a replacement** — `provenance: 'derived'`, pointing at his record (D-143).
4. **Cross-domain meaning is proposed or clarified, never assumed.** The app may ask whether this belongs in Money. It may not move it.
5. **`unknowns` is explicit.** An empty `unknowns` for a two-word aim is a failure, not a success.
6. **The private boundary is D-167's** — and see 91.3, because it is not yet a single chokepoint.
7. **No score.** D-162 binds here as everywhere.

### 91.2 — Close correction 3.6's gap · **the hardest item in the phase**

A destination with no milestone creates a `destination` entity **no generator consumes**, so a bare aim reaches nothing. Either the clarification must reach a milestone, or the bare aim must reach Now by some other route.

**Naming which, and proving it, is this phase's hardest item**, and it is the difference between shipping interpretation and shipping a better-worded string. Acceptance test 6 — _Now produces a move it did not produce before_ — is the strongest single test on the list and is what this package exists to satisfy.

### 91.3 — Consolidate the private boundary

`situation.ts:525` is the reasoning check. **Six other sites exclude private material permission-blind** — `coverage.ts:638,871` and `insights.ts:1601,1816,2026,2559`. Consolidating them is part of this package rather than an assumption it may make, so that _"private text never reaches the interpreter with D-167 off"_ becomes a property rather than a convention.

---

## Acceptance gate

**All eight CASE A acceptance tests** (`ROUTING_91_BRIEF.md` section 3), from a fresh store, in a browser that has never opened `#/qa` — plus test 6 proved in **two** domains.

1. It reaches the right domain — _"More money"_ names Money, or asks which.
2. The words survive byte-identically, and any derived meaning is a separate row.
3. Ambiguity is declared, not resolved.
4. Exactly one follow-up, and it is concrete — under the existing discovery budget, not three.
5. Declining costs nothing — the aim survives, no derived record is written.
6. **Now changes.** A destination in the resolved domain produces a candidate where none existed.
7. Cross-domain links are proposed, never asserted — confirmable and reversible.
8. Privacy holds — with D-167 off, no private text reaches the interpreter, **proved by asserting the digest's contents rather than by reading copy**.

**The ordinary-owner contract**, from §6.3: fresh store, no laboratory. Open Insights, meet the Career aspiration question, type _"More money"_, and walk (a) through (h) — including **(g) advance three days and confirm the interpretation is not re-proposed**, which is what routing 90's time-advance instrument (`tests/browser/phase90-clock.spec.ts`) exists for. Then the same journey in a second domain with a differently-shaped phrase, to prove the interpreter is not one hard-coded case.

**The synthetic contract:** byte-identity of stored wording across every phrase in the copy library; `provenance: 'derived'` on every derived row; a digest assertion that private material is absent from the interpreter's input; adversarial phrases — empty, whitespace, a single character, thousands of characters, mixed-domain, contradictory; and **the null case, where an unambiguous phrase produces no clarification at all**.

**The normal required gates:** full test suite, browser matrix at 360/430/1280, the Android-style pass, privacy scan, checkpoint equivalence, release integrity against the manifest (D-211), CI green, and a clean worktree.

---

## What routing 90 learned, and this phase is bound by

**D-238 — a test's title is a claim.** Routing 90 took three independent QA rounds, **every blocker was an instrument defect rather than a product one, and four of the five were false greens in regressions the builder wrote and reported as proof.** Two corollaries bind directly here:

- **A page-wide assertion cannot localise a defect.** Where a rendered value has more than one source, assert each source where it renders.
- **A negative claim needs an instrument that could have returned a positive.** Before writing _nothing / none / unreachable_, demonstrate the positive case once with the same instrument. Routing 90 reported a false "unreachable" from a clock-only probe and cost QA a round.

This phase is full of assertions of the form _"no derived record was written"_ and _"no private text reached the interpreter"_. Every one of them is a negative claim, and every one needs a probe that has been shown to find the positive.

---

## What this phase must NOT do

- **CASE B, explicitly.** The brief is right that capture without enforcement produces the worst outcome available — the app says it understood and offers the walk again tomorrow at full score.
- **No model, no hybrid, no network call.** D-025.
- **No inference over history.** That is routing 97, and it is held by D-172.
- **No widened vocabulary** beyond what the interpreter itself needs. That is routing 92.
- **No emotional dimensions.** D-166 and D-221 place them in 92 and 94.
- **No new conclusions from evidence** (93), no new domain built (94), no advancement register (95), no named expectation or reconciliation (96).
- **No scoring change of any kind**, and no change to `QUESTIONS_PER_DAY` or `DISCOVERY_PER_WEEK`.
- **Phases 1 through 90 are not reopened.**

---

## When you believe it is complete

The phase becomes **YELLOW — READY FOR INDEPENDENT QA**, never GREEN. **A builder conversation may not approve its own phase** (D-077).

In that same response, without being asked, provide: phase status; checkpoint SHA; deployed Preview SHA and whether they match; exact verification counts; known, open and deferred items — including the nineteen D-210 instrument-hardening findings, which stay untouched; the recommended **Codex** model and reasoning level for QA — **a middle level, and never Max, which is not a Codex level**; the conversation instruction (**NEW**); the exact QA report path `docs/qa/PHASE_91_QA_HANDOFF.md`; and the complete QA prompt written into that file.

End with the four lines and the launcher (D-092).

---

## Short launcher

**Model:** Claude Opus 5. **Reasoning level:** Max. **Conversation:** NEW.

```text
Continue the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute the current handoff exactly as
written. This is routing phase 91, semantic capture and clarification. Do not
ask me to paste the file contents.
```

**Do not write a completion marker into this file until this dispatch is actually finished.**
