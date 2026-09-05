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
   behind"_ is never fine. The owner's own word lists from his previous app
   apply: **use** Protect · Stabilize · Build · Recover · Partial · Open ·
   Catch-up · Not logged yet · Needs support · One small move. **Never** Failed ·
   Bad · Lazy · Behind · Weak · Failure · Slipped again · You missed everything.
10. **Nothing about Adaya is measured against anything outside your own record.**
    Counts and change over time; never a percentage, a bar, or an age norm.
11. **Every question has to earn its place.** No two readings that measure the
    same thing; no question the brain does not use. When two readings move
    together for weeks, one retires. The previous app asked near-duplicates three
    times a day and it was the first thing that made it feel clunky.
12. **Silence is not evidence.** A reading that was not taken never raises or
    lowers anything. The previous app's forecast got redder the less he logged —
    _"water not logged"_, _"food not logged"_ — and that is why it felt like
    nagging.
13. **Private things are measured, never mentioned.** What you log privately
    feeds the effect measurement and nothing else. The app never raises it, never
    suggests anything about it, and never shows it on a shared surface or in an
    export — unless you turn that on yourself. You name the items in the app, not
    in any document.

## The phases

Each one ships something you use that day. Each is one conversation. Small on
purpose — if a builder finds the scope growing past what is listed, it stops and
says so.

| #   | You get                                                                                                 | Needs first       |
| --- | ------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | **The move catalogue** — a document you read. **Done: 26 moves, your decisions recorded.**              | —                 |
| 2   | **New moves in the app**, from the catalogue. "Why this." "I'm testing this." One-tap "did you do it?"  | 1                 |
| 3   | **See yourself.** Today's trace, the week, a heatmap, readings side by side, moves overlaid.            | —                 |
| 4   | **Make it beautiful.** One visual system across everything shipped so far.                              | 2, 3              |
| 5   | **What worked.** "Last time you were like this, X moved irritation 4→2." Learned weights, behind a bar. | weeks of 2's data |
| 6   | **Where you're heading.** The 7-day forecast, scored, misses shown. The morning brief.                  | 5                 |
| 7   | **Testing smarter.** An exploration policy. Move chains, after a real bar. Revisiting old moves.        | 6                 |
| 8   | **Fatherhood.** The ladder screen — counts, never percentages — with a sourced skill list.              | —                 |
| 9   | **Fast and installable.** PWA, offline, performance, release.                                           | —                 |

**8 depends on nothing.** Pull it forward whenever you want it.

---

## 1 — the catalogue — DONE

**Done.** `docs/MOVE_CATALOGUE.md` — researched, every prior sourced, and you have
read it. Your decisions are recorded at the top of `docs/NEXT_PROMPT.md` and they
stand: **booking the exam date is cut** (nothing left in the catalogue costs money
or is irreversible), so it is **26 moves, 19 of them offerable on an empty store**
against the one you see today. The timed exam section, no-caffeine-today, the
avoided balance and call-instead-of-text all ship, with the app required to say
out loud when a move takes something from the evening. "Three good things at
bedtime" stays out. Nineteen is enough variety; the catalogue is not padded.

**One thing you still owe a decision on, and it is written down rather than
solved:** every effect the check-in can measure is a _feeling_. Half the catalogue
exists to get something done, and none of the thirteen readings can see that.
Phase 2's one-tap "did you do it?" records completion; whether you also want a
reading the certification shows up in is yours to say, whenever you like.

**Extended in phase 2's first step, document only:** three more families the
owner asked for — **presence and charisma reps** with a ladder (eye contact,
ten seconds longer, saying the thing), **faith** (a verse, five minutes of
prayer, one honest sentence — small, offered, never pushed), and **finishing
reps** (moves sized to be completed in one sitting). He reads them before they
are wired, the same as the first 26.

**Your old data: start clean.** The 36-day export from the previous app was read
in full — nine readings × three blocks on 1–10, 46 moves, a rules-based forecast,
a journal — and the owner chose not to import it. Its lessons are in this plan
(rules 11 and 12, the word lists, the evening additions, the fatherhood
vocabulary). Nothing from it enters the app.

---

## 2 — new moves

**Step 0, before any code — extend the catalogue.** Add the three families above
to `docs/MOVE_CATALOGUE.md`, run the same coherence pass, and show the owner. He
says Green; then the build. This is the second and last research pass.

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
- **Two evening additions, both optional and both one tap.** _"Tomorrow's minimum
  win"_ — one line, forward-looking, no verdict; it is the only part of the
  previous app's daily review that was an intention rather than a grade, and the
  rest of that review is dropped. And two chips — _caffeine after midday_ and
  _late or heavy dinner_ — because evening food and caffeine were the strongest
  evening-to-next-morning signal in his old data. Not the twelve food chips per
  block the old app had; that was the clutter.
- **A private log**, one tap in the evening check-in. The owner names the items
  himself, in the app; they live under the Private area with its existing
  protections — the engine may reason from them, may never raise them, and they
  appear in no export unless he turns that on. Rule 13. Its whole purpose is
  phase 5: he asked _"is this affecting my data?"_, and this is how the app
  answers from his own record instead of from a rule.
- **One optional evening reading — _felt close to God today?_** Skippable with no
  penalty (rule 12), one tap to turn off, never a streak. It is the effect
  measurement for the faith moves and nothing else.
- **Instant.** The check-in must feel instant to tap through. The previous app
  re-rendered a 1.4 MB page on every tap and he felt it.

**Where the owner's previous app already measured a move, the builder may read
it when setting a prior** — protect-sleep averaged +1.9 for him, caffeine control
+2.1, and the morning light-and-water prime **−0.4** (it did not help him). Those
are his numbers, which beat a citation; but nothing is imported and the priors
still learn from scratch.

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
**Next up.** Nothing of it has been built yet.

---

## 3 — see yourself

The mirror before the oracle. It needs no learning and it is what makes the
check-in worth doing before anything is learned. **The previous app had no
mirror at all** — 600 readings over 36 days and no screen that showed him a
single day's shape or a week's — which is a large part of why answering felt
like feeding a void.

**Ships:**

- **Today:** the readings across the day's check-ins, as a trace, with the moves
  you did marked on it.
- **The week:** seven days, each reading as a line; a heatmap of the score by day
  and time.
- **Readings side by side:** which ones move together.
- **"Today so far"** at the morning check-in: yesterday in two lines. Facts only —
  rule 1.
- **Follow-through, as counts.** _This week: 9 started, 4 finished._ Never a rate,
  never a grade. He said he does not finish what he starts; this is the mirror
  for it, and the catalogue's one-sitting moves are the intervention.

**Not in it:** any interpretation. Any "because". Any prediction.

**Done when** the owner can answer _"how was Tuesday?"_ from the app in five
seconds.

---

## 4 — make it beautiful

**Ships:** one visual system — type, colour, spacing, motion, dark by default —
applied to every screen shipped so far. The check-in is the most-used screen and
must feel good to tap through. The reading is the hero. One scroll per screen,
sections, progressive disclosure: **not cluttered, not short of anything.**

Start from `docs/VISUAL_DESIGN_RECORD.md`; go further than it did.

**Done when** the owner is proud to show it to someone.

**Standing rule from here on:** every later phase ships looking finished. Design
is not a separate pass again.

---

## 5 — what worked

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

- **The redundancy check (rule 11), mechanically.** Readings that have moved
  together for weeks — stress and overwhelm, loneliness and social energy are the
  suspects from his old data — are named on screen and one is retired with his
  say-so. Fewer taps, same information.
  **The new families measure against readings that already exist.** Presence reps
  against confidence and social energy in the blocks after; faith moves against
  the evening _felt close_ reading; finishing reps against the follow-through
  count; and the private log against energy, mood, drive, focus, loneliness and
  confidence — reported to him alone.

**Two kinds of effect, kept apart.** For moves that change how he feels, the
readings are the effect. For moves that get something done — the certification
entries — the effect is the completion tap from phase 2 and whatever downstream feeling
follows; the app says plainly when a move's effect is not something it can see.

**Done when** the app tells the owner one true thing about himself he did not
already know, and shows the evidence.

---

## 6 — where you're heading

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
- **The direction line.** One sentence, his, about where he is trying to go —
  written once, edited whenever. The forecast is shown against it, because he
  said life feels like it is going nowhere, and you cannot feel movement toward
  something you have not named.

**A forecast that reads the same three days running is a defect.** The previous
app's never changed — same colour, same lever — because rules do not move. This
one is read from his data and has to visibly move with it.

**Done when** the forecast has a visible track record the owner can judge.

---

## 7 — testing smarter

**Ships:**

- **An exploration policy:** when to repeat what works and when to test an
  alternative. This is the owner's novelty-seeking, fed on purpose and inside the
  plan — he said he goes looking for newness when life feels meek, and a test is
  newness with a reason. Always announced: _"you have done this five times and it helps;
  let's see if anything beats it."_
- **Move chains:** _"A makes B likelier, and B is where the gain is."_ **Only after
  a bar that corrects for how many chains are being tested at once** — thousands
  are, and a plain significance test hands back confident nonsense by volume.
- **Revisiting old moves** when the trend has changed.

**Owner gate before it ships:** the bar is specified and the owner has approved
the mechanism. It is the one standing hold in `docs/CAMPAIGN_HOLDS.md`.

**Done when** a test is proposed, run, and its result shown — including one that
lost.

---

## 8 — Fatherhood

**Ships:** the ladder screen — _Not introduced → Practicing with Daddy → Needs
support → Doing sometimes → Doing often_ — with **counts and change over time,
never a percentage or a bar.** A skill list **with its source stated**. "Time
with Adaya" stays a first-class move, separate from working on something with
her. **Use his own vocabulary from the previous app**: the reps — warm
connection · active play · read/talk · name a feeling · independence rep ·
repair · noticed effort · tiny lesson — and the coaching modes — modeled ·
practiced · prompted · let her try · praised · repaired. And keep the weekly
_"best moment"_ entry, the best thing in his old data.

**Done when** the owner can see where to put his attention this week without
being shown a grade.

---

## 9 — fast and installable

**Ships:** PWA install, offline, performance, release to the production URL.

---

## How a phase runs — the owner's two words

**You say one of two things, and nothing else is asked of you.**

- **"Green — next phase."** The phase is accepted. The builder starts the next one.
- **"Yellow — …"** followed by what is wrong, in your words. The builder fixes it in
  place and comes back with it on your phone.

**The builder conversation drives everything else:** reads this file and the
phase's section, builds, runs the mechanical gates — tests, build, browser matrix,
deploy, and proof that the deployed build is the one it tested — then tells you
what to open on your phone and what to look at. It keeps the decision log, writes
a short handoff per phase for whenever independent review resumes, and writes
`docs/NEXT_PROMPT.md` for its own successor conversation, because context runs
out and the next conversation has to pick up exactly where this one stopped.

**The orchestrator app is retired.** The integers in the table below survive only
as file names; `docs/CAMPAIGN_HOLDS.md` is no longer read by anything.

**Independent QA rounds are off** by your choice. They are owed for routing 91–94
and are not waived; the per-phase handoffs are where that debt is visible.

**Small phases.** If the list for a phase grows while building, the builder stops
and says so rather than absorbing it.

## What is parked

Kept on the record so it is not lost; not built until the owner asks.

- Separate domain generators for Emotional, Faith, Private, Direction and
  Romantic. **Not needed:** Emotional is the check-in; Faith and Romantic enter
  through the catalogue families; Private enters through the private log;
  Direction enters as the direction line. A domain gets its own generator only
  when there is an aim in it.
- Advancement and revision machinery.
- The nineteen instrument-hardening findings, plus DEF-0169.
- Independent QA rounds for routing 91, 92, 93 and 94 — **owed, not waived.**
- The old plan and adjudication documents — history, not instructions.
- An inventory of the twenty years of legacy records — ask for it when wanted.
- From the previous app, deliberately not carried: the seven-question daily
  review (it graded him; his journal shows it landing), the twelve food chips per
  block, the environment-chore checklist and the fourteen habit completion rates,
  the Azure proof ladder and flashcard engine, and the 4 a.m. day rollover. Any
  of them can come back if asked for.

## What already exists and is used

Similarity matching over past situations · effect as a recorded outcome ·
learned pull weighted by similarity and reliability · confidence bands · the
concept registry and record store · the check-in with 65 anchors and a 0–100
reading · authoring your own routines, goals, people and places · legacy import ·
deployment with release integrity.

## The orchestrator's numbers — the only place they appear

The orchestrator routes a phase only if its integer is higher than any it has
seen before (94 as of today), so each plan phase carries one of these on its
`Phase:` line and nowhere else. **The plan is numbered 1–9; this table is
plumbing.**

| Plan | Orchestrator integer | Plan | Orchestrator integer              |
| ---- | -------------------- | ---- | --------------------------------- |
| 1    | — (done, no code)    | 6    | 99                                |
| 2    | **95** — next        | 7    | 100 — the standing hold sits here |
| 3    | 96                   | 8    | 101                               |
| 4    | 97                   | 9    | 102                               |
| 5    | 98                   |      |                                   |

`stop_after_phase` in the orchestrator is the owner's throttle; the holds are the
gates. Builders also keep a decision register in `docs/DECISION_LOG.md`; the owner
never needs to read it.
