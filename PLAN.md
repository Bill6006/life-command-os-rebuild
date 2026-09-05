# Life Command OS — the plan

**Written 2026-09-04 from what the owner actually described.** This replaces
`docs/CANONICAL_REBUILD_PLAN.md` and `docs/PRODUCT_ADJUDICATION_2.md`, which are
kept as history and are not planned from any more.

**Same codebase.** Nothing built is thrown away. The check-in, the record store, the
tests and the deployment all stay; the phases below build on them.

**To start a phase, read this file and `docs/NEXT_PROMPT.md`. Nothing else is
required.**

---

## The app, in one paragraph

Three times a day it asks how you are — a few taps, words not numbers. It shows
you a 0–100 reading and the readings behind it. It suggests a move from a
researched catalogue, says why, and says when it is testing something new. Over
weeks it learns which moves actually change _your_ readings — from your record,
never from a rule about people — and it forecasts where the next seven days are
heading if you do nothing, so you can change that. Every claim opens into the
evidence behind it. It never grades you as a person.

## The rules — these are the owner's

1. **Questions are for facts. The forecast is the only place the app may assume.**
2. **Silence and repetition kill trust; being wrong does not.** Show it, with the
   confidence attached, rather than showing nothing.
3. **It has to see you act to learn.** Variety early, not later.
4. **Moves never contradict or repeat each other.**
5. **The smart choice, not the seemingly-smart one.** Net effect over the right
   window, not the immediate spike.
6. **Revisit old moves when your situation has changed.**
7. **When tonight's best move and your aims' best move differ, say so.** Do not
   blend them into one.
8. **Every check-in gives something back the same day.** The old app "asked but
   never learned"; that is the failure to avoid.
9. **A reading, never a verdict.** _"You are at 62%"_ is fine. _"You are falling
   behind"_ is never fine.
10. **Nothing about Adaya is measured against anything outside your own record.**
    Counts and change over time; never a percentage, a bar, or an age norm.

## The phases

Each one ships something you use that day. Each is one conversation. Small on
purpose — if a builder finds the scope growing past what is listed, it stops and
says so.

| #       | You get                                                                                                 | Needs first                  |
| ------- | ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **95**  | **The move catalogue** — a document you read. **No code. DONE 2026-09-04: 27 moves.**                   | you answer three questions   |
| **96**  | **New moves in the app**, from the catalogue. "Why this." "I'm testing this." One-tap "did you do it?"  | you have read 95's catalogue |
| **97**  | **See yourself.** Today's trace, the week, a heatmap, readings side by side, moves overlaid.            | —                            |
| **98**  | **Make it beautiful.** One visual system across everything shipped so far.                              | 96, 97                       |
| **99**  | **What worked.** "Last time you were like this, X moved irritation 4→2." Learned weights, behind a bar. | weeks of 96's data           |
| **100** | **Where you're heading.** The 7-day forecast, scored, misses shown. The morning brief.                  | 99                           |
| **101** | **Testing smarter.** An exploration policy. Move chains, after a real bar. Revisiting old moves.        | 100                          |
| **102** | **Fatherhood.** The ladder screen — counts, never percentages — with a sourced skill list.              | —                            |
| **103** | **Fast and installable.** PWA, offline, performance, release.                                           | —                            |

**102 depends on nothing.** Pull it forward whenever you want it.

---

## Phase 95 — the catalogue — DONE, awaiting your read

**Shipped 2026-09-04 as research, no code:** `docs/MOVE_CATALOGUE.md` — **27
moves, every prior sourced, 19 of them offerable on an empty store** against the
one move you see today. Read the section _What the owner should look for_.

**Three things only you can settle, and 96 is held until you do:**

1. **Five flagged entries, one left out.** Booking the exam date (costs money,
   irreversible — the one most likely to be absurd on a bad evening); a timed
   45-minute exam section; no more caffeine today; looking at the balance you
   have been avoiding; calling instead of texting. And _three good things at
   bedtime_ was left out — say if you want it back.
2. **Every effect the check-in can measure is a feeling.** None of the thirteen
   readings says whether anything got done, and half the catalogue exists to get
   something done. Phase 96's one-tap _"did you do it?"_ is the completion
   record; is that enough, or do you want a reading the certification shows up
   in?
3. **Is 27 the variety you meant, or does it need to be larger** before 96 builds?
   A second research pass is cheap and needs no code.

**Done when** you have answered those three and said which moves you would never
do. The gate is `docs/CAMPAIGN_HOLDS.md` (D-298); resolving it releases 96.

**Not done:** an inventory of your old data. Parked — ask for it when you want it.

---

## Phase 96 — new moves

**Ships:**

- The catalogue wired in as candidates. Ranked by the fit the app already
  measures — time, capacity, strain, context — with the research priors seeding
  what learning will later move.
- **"Why this"** on every move, one tap: which readings it is expected to move, and
  how sure the app is.
- **"I'm testing this"** on any move the app has fewer than a handful of your own
  observations for. The first form of exploration, and it costs nothing.
- **"Since last time, did you…"** — the check-in gains one-tap yes/no for moves
  that were offered. This is the action record everything after it needs.
- **Coherence:** no two moves offered in one day that contradict or duplicate.

**Decisions this phase makes, listed by the catalogue so it starts from a list:**
whether the six category verbs (e.g. _wind down_) retire when their instances
land or keep them as objects — **both on screen is the failure**; whether a
ten-minute walk and the shipped twenty-five-minute one share a family; the
day-one rule for choosing among unmeasured moves; how the seven certification
entries and two training entries are measured when the check-in cannot see their
effect (honest _"not measurable"_, or the completion tap); the eight profile
fields the research did not supply; and whether the six entries that take
something from the evening (e.g. _no more caffeine today_) are shown differently.

**Not in it:** measuring what a move did. Learned weights. The forecast.

**Done when** the owner sees at least five different moves in a week without
having authored any; every one opens into "why"; and "did you do it?" is one tap.

---

## Phase 97 — see yourself

The mirror before the oracle. It needs no learning and it is what makes the
check-in worth doing before anything is learned.

**Ships:**

- **Today:** the readings across the day's check-ins, as a trace, with the moves
  you did marked on it.
- **The week:** seven days, each reading as a line; a heatmap of the score by day
  and time.
- **Readings side by side:** which ones move together.
- **"Today so far"** at the morning check-in: yesterday in two lines. Facts only —
  rule 1.

**Not in it:** any interpretation. Any "because". Any prediction.

**Done when** the owner can answer _"how was Tuesday?"_ from the app in five
seconds.

---

## Phase 98 — make it beautiful

**Ships:** one visual system — type, colour, spacing, motion, dark by default —
applied to every screen shipped so far. The check-in is the most-used screen and
must feel good to tap through. The reading is the hero. One scroll per screen,
sections, progressive disclosure: **not cluttered, not short of anything.**

Start from `docs/VISUAL_DESIGN_RECORD.md`; go further than it did.

**Done when** the owner is proud to show it to someone.

**Standing rule from here on:** every later phase ships looking finished. Design
is not a separate pass again.

---

## Phase 99 — what worked

**Ships:**

- **Effect, per move, per reading, from his record.** Measured over the window
  that suits the move — next check-in for some, a week for others. **Never
  immediately, and never by asking him to attribute it.**
- **"Last time you were like this…"** on the move screen, per dimension, with the
  count behind it: _"three times, irritation 4→2 twice."_
- **Learned weights:** which readings actually drive his score. **Only once a
  stated statistical bar is met**; until then equal weights, and the screen says
  so.
- **The bar is written down before anything ships.** Nine dimensions over a few
  weeks will overfit and discover that Thursdays matter.

**Two kinds of effect, kept apart.** For moves that change how he feels, the
readings are the effect. For moves that get something done — the certification
entries — the effect is the completion tap from 96 and whatever downstream feeling
follows; the app says plainly when a move's effect is not something it can see.

**Done when** the app tells the owner one true thing about himself he did not
already know, and shows the evidence.

---

## Phase 100 — where you're heading

**Ships:**

- **The forecast:** today's shape, and the next seven days, **if you do nothing.**
  That baseline is what makes it checkable — acting on it is a departure, not a
  contamination.
- Confidence attached. Reasoning opens: which past days it matched, what happened
  then.
- **Scored.** Every prediction checked against what happened, on days he did not
  act. **Misses shown.** A forecast without a track record is decoration.
- **The morning brief:** the forecast for today in three lines, at the morning
  check-in.

**Done when** the forecast has a visible track record the owner can judge.

---

## Phase 101 — testing smarter

**Ships:**

- **An exploration policy:** when to repeat what works and when to test an
  alternative. Always announced: _"you have done this five times and it helps;
  let's see if anything beats it."_
- **Move chains:** _"A makes B likelier, and B is where the gain is."_ **Only after
  a bar that corrects for how many chains are being tested at once** — thousands
  are, and a plain significance test hands back confident nonsense by volume.
- **Revisiting old moves** when the trend has changed.

**Owner gate before it ships:** the bar is specified and the owner has approved
the mechanism. This is where `D-172` in `docs/CAMPAIGN_HOLDS.md` releases.

**Done when** a test is proposed, run, and its result shown — including one that
lost.

---

## Phase 102 — Fatherhood

**Ships:** the ladder screen — _Not introduced → Practicing with Daddy → Needs
support → Doing sometimes → Doing often_ — with **counts and change over time,
never a percentage or a bar.** A skill list **with its source stated**. "Time
with Adaya" stays a first-class move, separate from working on something with
her.

**Done when** the owner can see where to put his attention this week without
being shown a grade.

---

## Phase 103 — fast and installable

**Ships:** PWA install, offline, performance, release to the production URL.

---

## How a phase runs

1. **One new Claude conversation.** It reads this file and `docs/NEXT_PROMPT.md`.
2. **It builds**, then runs the mechanical gates: tests, build, browser matrix,
   deploy, and proves the deployed build is the one it tested.
3. **The owner opens it on his phone.** Yes → next phase. No → a fix round in the
   same conversation.
4. **It writes the next `docs/NEXT_PROMPT.md`** with `Phase: N` on its own line
   near the top, and `<!-- LCO_COMPLETE -->` as the last line.

**Independent QA rounds are off** by the owner's choice. They are owed for routing
91–94 and the orchestrator's ledger keeps that debt. They are not waived.

**Owner gates** live in `docs/CAMPAIGN_HOLDS.md` and the orchestrator will not
start a held phase. Two exist: after 95 (the owner has read the catalogue) and
before 101 (the bar is approved).

**Small phases.** The previous plan's phase 93 shipped fourteen packages against a
five-package rule. If the list above grows while building, stop and say so.

---

## What is parked

Kept on the record so it is not lost; not built until the owner asks.

- Expanding to twelve domains (Emotional, Faith, Private, Direction, Romantic
  generators). Add a domain when there is an aim in it.
- Advancement and revision machinery.
- The nineteen instrument-hardening findings, plus DEF-0169.
- Independent QA rounds for routing 91, 92, 93 and 94 — **owed, not waived.**
- The old plan and adjudication documents — history, not instructions.
- An inventory of the twenty years of legacy records — ask for it when wanted.

## What already exists and is used

Similarity matching over past situations · effect as a recorded outcome ·
learned pull weighted by similarity and reliability · confidence bands · the
concept registry and record store · the check-in with 65 anchors and a 0–100
reading · authoring your own routines, goals, people and places · legacy import ·
deployment with release integrity.

## Routing

Phases carry the integers 95–103 directly. `docs/NEXT_PROMPT.md` always names the
next one. The orchestrator's `stop_after_phase` is the owner's throttle; the holds
are the gates.
