# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Claude Code / **builder**.
**Conversation:** **NEW** — not the routing 83 builder, and not the Codex QA
conversation.
**Model:** Claude Opus-class.
**Intelligence level:** **Max.**

Canonical plan section 43 for the workflow, section 43A for routing, section 58
for the report format. Independent QA is Codex (D-090); Claude builds. Every
handoff ends with the model, the level, the conversation and a short copyable
launcher (D-092, D-083).

**Routing 83 is GREEN.** Closed by the independent Codex QA conversation at
product checkpoint `9e6d46e` on 2026-08-27, after one FAIL round and a retest.
The record is [`PHASE_STATUS.md`](PHASE_STATUS.md); the QA report is
[`qa/PHASE_83_QA_HANDOFF.md`](qa/PHASE_83_QA_HANDOFF.md). Nothing here reopens
it.

**Routing 84 is blocked on no owner decision.** The four it was blocked on —
Q7, Q8, the romantic placement and the review surface — were answered by the
owner on 2026-08-27 as **D-166, D-167, D-168 and D-169**. Q1, Q4 and Q6 do not
block it and are not this phase's to answer.

**Why Max, and why the obvious answer is wrong here too.** Routing 83 was
classified High in a first draft, corrected to Max, and then still failed
independent QA on four findings — three of which were guards that could not
fail. This phase is larger than that one: a new persistent object, a second
questioning agenda, a generic authoring pattern, and a consent model. The
standing owner decision of 2026-08-25 covers **any further phase created by the
audit campaign's adjudication**, and `qa/README.md` predicts this
misclassification by name. **Judge the level by what the change has to reason
about, not by how large the diff looks.**

**The QA block is Codex's and takes `High`, never `Max`.** Codex has no Max
level and the application will not switch to its top level under automation; a
handoff asking for Max stops the orchestrator with the level unset. That has now
happened three times across this campaign.

---

## The constraint every phase from here carries

**Your `**Phase:**` field is `84`.** Never `9`, `09`, `8.4` or `9.1` — those
parse at or below 82 and never route, silently. Plan **section 43A** and
**D-159** hold the map: 83, 84, 90, 91, 92, 93, 94. Canonical phase names are
unchanged and canonical Phase 10 is **not** re-scoped by receiving a routing
label (D-109 stands). A QA round does not get a new integer; rounds 1…n of this
phase all carry **84**.

---

## What this phase is

**The destination and discovery structure — canonical Phase 9's product
contract.**

The review's central finding, verified against the tree and still true: there is
no `destination`, `milestone` or `baseline` anywhere in `src/`. The product can
represent _what to do next_ and cannot represent _what the owner is trying to
become_ — so it cannot represent progress, and cannot represent a strategy that
fails. That changes what a domain page **is**, and Phase 9 would otherwise
typeset a fact-viewer and pass the owner's phone gate on it.

### Your brief already exists, and it was built for you

**Routing 83's deliverable is this phase's scope.** [`PHASE_STATUS.md`](PHASE_STATUS.md)
carries an enumerated list of the points where an ordinary owner journey
**cannot proceed**, produced by walking the app from a near-empty store through
the controls the surfaces actually draw — not by reading the code and forming an
opinion about it. Five stops, each with its reason:

1. **Unknown aspiration** — no concept in the registry is about anything he is
   aiming at; the longest-horizon thing he can state is this week's focus.
2. **Discovery** — the guide's whole catalogue is six readings of today's
   capacity, and D-036 caps it at three questions a day.
3. **Object creation** — he **can** state a current-topic fact and it creates no
   entity, so nothing can refer to it: no study move, no goal piece, no course
   subject. `constraint`, `goal`, `commitment` and `relationship-event` have no
   owner route at all.
4. **Interruption** — "Can't right now" is recorded and the move then leaves the
   screen; `TRANSITIONS` allows the return and no surface offers it. No reason
   is asked for or stored, though the field exists.
5. **Event correction** — a fact corrects from its own row; nothing withdraws a
   completion, moves an entry to the day it happened, or backfills one.

Read it before writing the packages. It is evidence, not a summary — and
independent QA checked it for completeness in round 2 and found no stop it does
not name.

---

## Scope — six work packages

[`PRODUCT_ADJUDICATION.md`](PRODUCT_ADJUDICATION.md) section 8 is the
specification and this is its shape.

| #     | Package                                 | Findings                    |
| ----- | --------------------------------------- | --------------------------- |
| **1** | **The destination object**              | F01, F35, F26               |
| **2** | **Progress evidence semantics**         | F05, F11                    |
| **3** | **Owner authoring**                     | F04, F19 (creation), F36    |
| **4** | **The second information agenda**       | F02                         |
| **5** | **Inability, interruption, the states** | F07, F10, F13, F11 (states) |
| **6** | **Correction grammar, private consent** | F32, F30 (consent)          |

**Dependency order: 1 → 2 → 3 → 4 → 5 → 6, package 1 first and absolutely so** —
packages 2, 4 and 5 are all shaped by what a destination turns out to be. 5 and
6 may float relative to each other.

**Package 1 is proved on exactly three domains: Career, Health, Money.** Career
because it has the richest existing evidence, Health because it is the owner's
clearest activity-versus-achievement case, Money because it is the thinnest
surface and proves the object works from nothing. **Fatherhood is deliberately
excluded** — the growth model is the product's best-evidenced mechanism, Phases
81 and 82 each corrected it, and it is the hardest place to prove a new object
and the worst place to break one. It joins once the shape is proved.

**Package 3 is the single highest-leverage item in the adjudication.** It
converts fixture-only objects into ordinary-use objects, and routing 83's brief
is the evidence for why: no control anywhere in `src/features` calls
`createEntity`, and a guard now fails the build if that changes without the
route table saying so.

---

## Decisions you build against

Already written and approved; this phase implements against them rather than
authoring them.

- **D-162** — a destination is described, never scored. **This is package 1's
  central guard** and the one most likely to be quietly lost in a phase about
  progress.
- **D-163** — two question budgets, and neither borrows from the other.
- **D-164** — a reason for inability is asked when the answer has a use, and
  never to fill a field.
- **D-165** — a correction states its consequence before it acts.
- **D-166 … D-169** — the four owner answers that unblocked this phase.
- **D-161** — a capability is accepted when an ordinary owner can reach it from a
  near-empty store. **It binds this phase**, and 83.0's three fixtures are in the
  shipped library for you to use.
- **D-173** — routing 84 is accepted on the owner's own journey sentence, not on
  a set of fields.

**And four rules routing 83's own QA round produced**, which bind every guard
you write:

- **D-177** — a quantity in a sentence is **compared** with the count behind it,
  never matched against a list of phrases. A blacklist finds only the phrases
  somebody already thought of.
- **D-178** — one name for an action, in the layer every surface can reach.
- **D-179** — a claim of exhaustiveness is a test, or it is a comment.
- **D-180** — a commit that is not pushed has met no gate.

Anything this phase discovers that needs a new rule gets its own entry, written
before the code that implements it, in the repository's standing pattern.

---

## Gate — seven items

1. From the **near-empty** store built in 83.0, the owner can name a desired
   outcome in each of the three proving domains, and the app's next
   recommendation visibly changes because of it.
2. A completed session, a completed course and a milestone are **three different
   things on screen**, and no surface claims capability from attendance.
3. Every object the rich fixtures contain — **goal, routine, person, place,
   skill, obligation** — is reachable through ordinary use, proved by building
   one of each from empty.
4. The discovery agenda asks a question that would **not** change today's
   recommendation, and can be shown to have changed a later one; and question
   volume falls as answers accumulate, measured across the library.
5. "Can't right now" produces a durable, correctable statement about **what was
   in the way** on at least one path, and asks nothing when the constraint is
   already known — with the no-question path proved as carefully as the question
   path.
6. Each correction gesture states its consequence before it acts, and a private
   reading can be stored without being reasoned from.
7. **The standing guards still bite** — no score about the owner, no percentage,
   rank, grade or score about Adaya, no wellness composite, no Life Score. This
   is the item most likely to be quietly lost in a phase about progress.

Plus the standing gates: the **aggregate** `npm run verify` from a clean
checkout, the browser suite at three widths, the Android-style gate on the
deployed build, the privacy scan, the block sweep, and the copy guards.

---

## What must not happen in this phase

- **No strategy evaluation** (F03). Threads gain room for a review status; the
  verdicts belong to later Validity, because a strategy can only fail against a
  destination that must exist first.
- **No pattern-discovery engine** (F15/F17/F18). No combinations, no lags, no
  hypothesis machinery.
- **No domain-specific progression models** for Sleep, Fatherhood, Social, Faith
  or Home. Three proving domains, not twelve.
- **No owner routines library** (AUD-0045). This phase builds the route; Reach
  walks it.
- **No scoring change of any kind.** Phase 82 re-cut the instrument and
  re-baselined the tournament (D-137, D-138).
- **No new visual language.** That is canonical Phase 9's, and this phase must
  not spend it.
- **No live model.** D-172 keeps D-024/D-025 standing through 84.
- **No reopening of routing 83, Phase 82 or anything before them.**
- **No alteration of `qa/WHOLE_APP_OWNER_USE_REVIEW.md`.** It is a tracked,
  durable artifact and this phase reads it.
- **No orchestrator changes.**

Everything in audit section 10's DO-NOT-CHANGE list carries forward, and
`PRODUCT_ADJUDICATION.md` section 11 adds to it.

---

## Handoff — routing phase 84

**Model:** Claude Opus-class.
**Intelligence level:** **Max** — the standing audit-campaign rule, and see the
reasoning at the top of this file.
**Conversation:** a **new** conversation. Not the routing 83 builder, which
carries two rounds of repair context, and not the Codex QA conversation.

```text
Build routing Phase 84 of Life Command OS: "what the owner is trying to become."

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Routing 83 is GREEN at product checkpoint 9e6d46e, closed by independent Codex
QA after one FAIL round and a retest. All four owner decisions this phase was
blocked on are answered (D-166..D-169). You are blocked on nothing.

Read, in full, before writing code:
1. docs/NEXT_PROMPT.md          — this handoff, and your scope
2. docs/PHASE_STATUS.md         — the routing 83 record, and inside it the
                                  enumerated list of points where an ordinary
                                  owner journey cannot proceed. That list is
                                  your brief; it was built for you, and
                                  independent QA checked it for completeness.
3. docs/PRODUCT_ADJUDICATION.md section 8 — the six packages and the seven-item
                                  gate; section 11 is the do-not-change list
4. docs/DECISION_LOG.md D-161..D-169 and D-173, then D-177..D-180
5. docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md — F01, F02, F04, F05, F07, F10, F11,
                                  F13, F19, F26, F30, F32, F35, F36
6. docs/CANONICAL_REBUILD_PLAN.md sections 11, 22, 23, 43A, 54

Build the six packages in dependency order, package 1 first and absolutely so.
Package 1 is proved on Career, Health and Money only; Fatherhood is deliberately
excluded and joins once the shape is proved.

Your **Phase:** field is 84. Never 9, 09, 8.4 or 9.1 — those parse at or below
82 and silently never route. Plan section 43A has the map.

D-162 is package 1's central guard: a destination is described, never scored. No
percentage, rank, grade, share, completion bar or readiness number reaches an
owner surface, about the owner or about Adaya. A phase whose whole subject is
progress is where a number arrives looking reasonable.

Constraints:
- Do not build strategy evaluation, a pattern-discovery engine, domain
  progression models beyond the three proving domains, an owner routines
  library, any scoring change, or any new visual language.
- Do not reopen routing 83, Phase 82 or anything before them.
- Do not alter docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md.
- Every guard you write obeys D-177 and D-179: compare a quantity with the count
  behind it rather than matching a phrase list, and make any claim of
  exhaustiveness something that can actually fail. Routing 83 failed its first
  QA round on three guards that could not.
- Run the AGGREGATE npm run verify on the commit you hand off, and push it —
  D-180. A commit that is not pushed has met no gate.

Stop at YELLOW — READY FOR INDEPENDENT QA and write
docs/qa/PHASE_84_QA_HANDOFF.md. A builder conversation may not approve its own
phase (D-077).

Do not ask me to paste file contents.
```

### Short launcher

**Model:** Claude Opus-class. **Level:** Max.
**Conversation:** NEW — a new conversation, not the routing 83 builder and not
the Codex QA conversation.

```text
Build routing Phase 84 of Life Command OS.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute it exactly as the handoff there
specifies. Routing 83 is GREEN and all four owner decisions are answered; you
are blocked on nothing. Build package 1 first.

Your **Phase:** field is 84 — never 9, 09, 8.4 or 9.1, which never route.

Stop at YELLOW and write docs/qa/PHASE_84_QA_HANDOFF.md. Do not approve your own
phase.

Do not ask me to paste file contents.
```
