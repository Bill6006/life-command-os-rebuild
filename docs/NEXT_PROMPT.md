# Next dispatch — the move catalogue research (D-296)

**Phase:** 95 — **The move catalogue research: the document routing 95 builds against**

**Next actor:** Claude
**Target system:** Claude
**Model:** Claude Opus 5
**Reasoning / Effort:** Max
**Conversation:** NEW
**Independent QA:** OFF — this file starts no QA round.

**Written by the Claude builder conversation that finished routing 94.**

---

## Read this before anything else: this is not a build phase

**D-296 is explicit and it is owner-decided.** The catalogue research follows the
adjudication precedent — _"not a build phase; it produced a decision, not a
diff"_ — **carries no routing integer, and meets no build gate.**

**The `Phase: 95` above is a routing key and nothing more.** The orchestrator
needs an integer to open a conversation with; D-296 gives this exercise none. It
is filed under the phase that consumes its output. **This dispatch is the
research half only.** Routing 95's build — the catalogue wired as candidates, and
the effect measurement beside it — is a **separate, later dispatch**, and it does
not start until the owner has read the document this one produces.

**If you find yourself editing `src/`, stop.** The output is one file:
`docs/MOVE_CATALOGUE.md`. No commit to product code, no test, no gate.

---

## Why this exists, in one paragraph

The owner has asked three times when he stops seeing only _"walk for 25
minutes"_. The answer is routing 95, and routing 95 cannot start from nothing:
D-289 approved a **research-built** move catalogue for a reason he gave himself —
_"I don't trust myself if I am the one coming up with the moves."_ D-296 then
found that leaving the research inside routing 95 would make that phase _research
plus build plus coherence-check plus effect measurement_, which is D-283's
fourteen-package mistake with a different subject.

**And the window costs nothing.** Routing 95's effect-measurement half has to wait
for state history to accumulate anyway. Routing 94 shipped the check-in that
produces it; this is what that wait is for.

---

## What the research has to produce, and the code already dictates it

`MoveProfile` is not free text. **Every catalogue entry needs all of these**, and
an entry missing one is not an entry:

| Field      | What the research must supply                                              |
| ---------- | -------------------------------------------------------------------------- |
| `demand`   | what kind of effort it asks for                                            |
| `now`      | expected value in the block it happens in, **0–1**                         |
| `tomorrow` | expected value the following day, **0–1**                                  |
| `friction` | how hard it is to start, **0–1**, higher is harder                         |
| `size`     | minutes where the move has a natural length, **omitted where it does not** |

**`now`, `tomorrow` and `friction` are research priors in the exact sense §13C
means**, and the code comment on them already says _"Learning moves this."_ The
research **seeds** them; the owner's measured effects move them. That is D-289's
_"research proposes, his data ranks"_ arriving as three numbers rather than as a
slogan.

**Every prior carries its citation**, the way Wood/Bruner/Ross and
Gollwitzer & Sheeran already do in this codebase. A number without one is a
builder's guess wearing a lab coat.

### Routing 94 changed nothing about what those three fields mean

Checked, because D-296 asks for it. The state score is **a reading of the owner at
a moment** — it is never a move's expected value, it is never compared to one, and
nothing in routing 94 reads or writes `MoveProfile`. Brief the research against
`now`, `tomorrow` and `friction` exactly as D-296 writes them.

**One thing routing 94 does give you, and it is worth using.** There are now
thirteen readings on a five-point scale with a stated direction, and a 0–100
reading over ten of them. When routing 95 measures what a move did, **that is what
it will measure against.** A catalogue entry whose plausible effect is on nothing
the check-in reads is an entry whose effect can never be measured — worth knowing
while the entries are being written rather than after.

---

## Three bounds on the research itself — D-296

1. **It must fit this owner's actual life, not a generic wellness library.** A
   catalogue of moves for someone with unlimited evenings is worse than no
   catalogue: every entry he cannot do is a candidate the arbiter has to reject,
   and D-286's whole point is that offering him things is how the app learns. He
   has a young daughter, a custody arrangement, a certification he is behind on,
   and evenings that are frequently not his.
2. **D-290 is checked on the document, before any code depends on it.** No two
   entries saying the same thing; no two that contradict. His own words: not
   _"drink some water"_ followed by _"drink some water then jump up and down"_;
   not _"go outside for a walk today"_ beside _"stay indoors today"_. **A
   generatively-built catalogue contains both by construction**, and the document
   is the only place the whole set is visible at once.
3. **The owner reviews it before routing 95 builds against it.** _"Not trusting
   himself to generate is not the same as declining to veto"_ — he is still the
   only person who can say _"I would never do that."_ A catalogue he has not read
   is a catalogue that will propose something absurd on a bad evening.

---

## What is not in this exercise

**No code. No tests. No gates. No routing integer of its own.** And nothing from
routing 95's build half: the candidates are not wired, `ACTION_FAMILIES` is not
extended, no dimension is added, and effect measurement is not designed.

**And nothing about Adaya.** D-291 governs anything measured about a child and
this exercise has no business near it.

---

## How to run it

**Model:** strongest current Claude Opus-equivalent.
**Intelligence level:** **Max.**
**Conversation:** **NEW.**

```text
Run the move catalogue research for the Life Command OS rebuild. This is NOT a
build phase — it produces docs/MOVE_CATALOGUE.md and no diff to src/, no test
and no gate. Keep the Phase field exactly 95; that is a routing key, and D-296
gives this exercise no routing integer of its own.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full, then D-296, D-290 and D-289 in
docs/DECISION_LOG.md, then docs/STATE_ENGINE_OWNER_DECISION.md. Read
src/intelligence/moves.ts for MoveProfile and ACTION_FAMILIES, and
src/intelligence/readings.ts for the thirteen readings routing 94 now takes,
because those are what a move's effect will later be measured against.

Produce docs/MOVE_CATALOGUE.md. Every entry carries demand, now, tomorrow,
friction and size (size omitted where the move has no natural length), with
now/tomorrow/friction as 0-1 priors and every prior carrying its citation.
Research proposes and his data ranks (D-289), so these are seeds the owner's
measured effects will move.

Three bounds. It must fit this owner's actual life — a young daughter, a custody
arrangement, a certification he is behind on, evenings that are frequently not
his — rather than a generic wellness library. D-290 is checked on the document
before any code depends on it: no two entries saying the same thing, no two that
contradict, and a generatively-built catalogue contains both by construction. And
the owner reviews it before routing 95 builds against it.

Do not edit src/. Do not wire candidates, extend ACTION_FAMILIES, add a
dimension, or design effect measurement — those are routing 95's build half and a
separate later dispatch. Nothing about Adaya; D-291 governs that and this
exercise has no business near it.

Four phases are unapproved and none of their handoffs may be edited for any
reason: docs/qa/PHASE_91_QA_HANDOFF.md, docs/qa/PHASE_92_QA_HANDOFF.md,
docs/qa/PHASE_93_QA_HANDOFF.md and docs/qa/PHASE_94_QA_HANDOFF.md.
```

### Short launcher

**Model:** strongest current Claude Opus-equivalent. **Intelligence level:** Max.
**Conversation:** NEW.

```text
Run the move catalogue research for the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/NEXT_PROMPT.md in full and execute it exactly as written. Keep the
Phase field exactly 95. It is a research exercise, not a build phase: the output
is docs/MOVE_CATALOGUE.md and nothing under src/ is touched. Leave the four QA
handoffs in docs/qa/ unedited, and do not ask me to paste the file contents.
```

---

## The state of the campaign, so it is not lost

**Routing 94 is YELLOW — READY FOR INDEPENDENT QA**, at the checkpoint named in
`docs/PHASE_STATUS.md`. It is not GREEN, no round has run, and D-077 is unchanged.

### Five debts this dispatch is carrying

**Routing 91's independent QA.** Round 10's brief is written and waiting. Unrun.

**Routing 92's independent QA.** Round 0 written, **zero rounds**, widest blast
radius of anything in the campaign.

**Routing 93's independent QA.** Round 0 written, **zero rounds**, and it opens
with D-283 — fourteen packages carrying one phase's worth of scrutiny.

**Routing 94's independent QA.** Round 0 written, **zero rounds.** It touched the
concept registry, added a record kind, narrowed a standing guard that has held
since D-166, and put a number about the owner on a screen for the first time in
the campaign.

**The nineteen D-210 instrument-hardening findings**, plus **DEF-0169** as a
twentieth: the test suite is red under parallel load on a fourteen-core machine
and the symptom is patched while the cause — a dozen concurrent single-threaded
library sweeps — is untouched. Backlog blob
`58d5af071355d252c4a254fc685fcc9e8e88f417`.

### And the roadmap after this exercise

| #              | Phase                                  | State                           |
| -------------- | -------------------------------------- | ------------------------------- |
| 94             | the check-in, the readings, the score  | **YELLOW — awaiting QA**        |
| _(no integer)_ | **the move catalogue research**        | **this dispatch**               |
| 95             | the move catalogue and measured effect | needs this document first       |
| 96             | domains and progression (Fatherhood)   | ready; D-291 changes rollups    |
| 97             | the forecast                           | needs 95                        |
| 98             | exploration and causal chains          | needs 97, and **D-172 is open** |
| 99             | advancement and revision               | —                               |
| 100            | _(reserved headroom)_                  | —                               |

**D-172 blocks phase 98 and nothing before it.** `docs/CAMPAIGN_HOLDS.md` carries
the declaration and it is still `open`.

<!-- LCO_COMPLETE -->
