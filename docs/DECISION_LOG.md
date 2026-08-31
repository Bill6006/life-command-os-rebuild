# Decision log

## D-210 — Phase 84 product acceptance is separated from QA-instrument hardening

**Phase:** 84 · **Status:** Decided by the owner, 2026-08-30.

Rounds 15 to 19 produced twenty findings, four per round, with no taper. A
review of all twenty found:

- **0** owner-visible product-behaviour defects;
- **19** guard, scanner, oracle, verifier or test-instrument findings;
- **1** exception, QA-84-064, concerning release and deployed-byte integrity.

Every round's product gates passed throughout: the seven acceptance items,
CASE A and CASE B fresh-store owner use, the full test suite, the browser
matrix, the Android checks and the privacy scan. Every FAIL in that window was
caused by an instrument finding.

Each round attacked the previous round's repair, and hardening a detector
creates new surface for the next attack. QA-84-062 states the terminal case:
_the oracle shares the defect it is meant to detect._ There is no finite end
to that process, and `ROUTING_91_BRIEF.md` §7 had already named the pattern:
bundling an unproven instrument with the product whose acceptance depends on
it is routing 82's failure mode, with instrument and product failing together
and no way to tell which.

### The ruling

1. **Instrument hardening is deferred from Phase 84 GREEN.** The nineteen
   findings are preserved verbatim in
   [`qa/INSTRUMENT_HARDENING_BACKLOG.md`](qa/INSTRUMENT_HARDENING_BACKLOG.md)
   and indexed in the defect ledger. They are open, not closed, and no round
   may edit, remove or renumber them.
2. **QA-84-064 remains blocking.** It is the one finding that would still
   matter if every guard were retired, because it shows the published artifact
   can change after the gate passes while build identity stays green.
3. **Phase 84 GREEN means bounded product acceptance only.** It does not mean
   the deferred instrument findings are resolved, and it may not be read that
   way. Any later reader is directed to the backlog by this decision.
4. **The bounded closeout may not reopen general instrument hardening.** Only
   a genuinely new owner-visible product defect, or a release-integrity defect
   comparable to QA-84-064, may block GREEN from here.

D-209 was left alone: rounds 19's findings already cite it, and taking it
would have collided with the repair record that round intends to write.

Decisions that shape the rebuild and the reason behind each one. Entries are
append-only. When a decision is reversed, add a new entry that supersedes the
old one rather than editing history.

Authority order (canonical plan section 1): explicit current owner decisions →
this canonical plan → owner-approved amendments → this log → verified
implementation in this repository.

---

## D-001 — The rebuild lives in a brand-new repository

**Phase:** 0 · **Status:** Active

`Bill6006/life-command-os-rebuild` is the rebuild. `Bill6006/life-command-os` is
legacy/reference only and must never be modified, reinitialized, force-pushed,
repointed or overwritten.

**Why:** Canonical plan sections 0 and 45. A new foundation cannot be built
inside a tree whose history and remotes belong to the architecture being
replaced.

**Safety gate result:** The gate ran before anything was created. The shell's
starting directory turned out to be the legacy working tree, which is an
explicit stop condition, so the developer stopped and the owner chose a separate
location. `life-command-os-rebuild` did not exist remotely, so no name had to be
invented. The legacy repository was fingerprinted (`HEAD 45091d0`, 32 unpushed
local commits, 1 untracked file) so it can be proven unchanged at the gate.

---

## D-002 — The repository is public

**Phase:** 0 · **Status:** Active

**Why:** GitHub Pages on a private repository requires a paid plan. The stable
phone Preview URL is a hard development requirement (section 33), so a free,
reliable Pages deployment matters more than repository secrecy — particularly
because section 39 already keeps all real owner data out of the repository.
Owner-approved before creation.

**Consequence:** Fixtures are synthetic only. Real backups, exports and owner
history must never be committed. `.gitignore` blocks the obvious shapes, and a
privacy scan runs at each phase gate.

---

## D-003 — Preview and production are two paths on one `gh-pages` branch

**Phase:** 0 · **Status:** Active

- Preview: `https://bill6006.github.io/life-command-os-rebuild/preview/`
- Production: `https://bill6006.github.io/life-command-os-rebuild/`

The preview workflow replaces only the `preview/` subtree. The production
workflow is `workflow_dispatch` only and writes only the root, never `preview/`.

**Why:** Section 33 requires one stable bookmarkable Preview URL _and_ that
production is not updated merely because preview changes. GitHub Pages'
Actions-artifact mode was rejected: each deployment replaces the entire site, so
a single artifact would have to contain both, meaning every preview deploy would
also republish production.

**Rejected alternatives:** Cloudflare Pages or Netlify (adds an external account
and an auth dependency for no gain); a second repository for preview (more
moving parts, and section 45 forbids inventing extra repositories).

---

## D-004 — Preview deploys on every push to `main`

**Phase:** 0 · **Status:** Active

**Why:** It keeps the deployed Preview SHA equal to `main` HEAD at all times,
which makes the section 58 requirement — that the deployed Preview SHA matches
the verified checkpoint SHA — true by construction rather than by inspection.
The deploy job depends on the verification job, so a red gate never reaches the
phone.

---

## D-005 — Hash routing

**Phase:** 0 · **Status:** Active, revisitable

**Why:** The site is served from a sub-path on GitHub Pages with no server-side
rewrite available. Hash routes are deep-linkable, back-button correct and cannot
404 on a phone bookmark. The alternative — a `404.html` SPA fallback — returns a
real 404 status and is easy to get subtly wrong.

**Revisit if:** a rewrite-capable host is ever adopted.

---

## D-006 — No service worker in this phase

**Phase:** 0 · **Status:** Active until Phase 10

No worker is registered, and any worker previously registered at this scope is
unregistered on load. Asset filenames are content-hashed, so only `index.html`
can be served stale; the running app re-reads `build-info.json` with `no-store`
on load and whenever the tab becomes visible, and offers an explicit reload when
the deployed SHA differs.

**Why:** Section 33 — "The owner should never have to wonder whether the phone
is showing stale code." Offline behaviour is Phase 10 work and must not be
bought at the cost of preview ambiguity now. A failed check is never reported as
staleness, so an offline phone is not told its build is old.

---

## D-007 — Build identity is compiled in and also published as a file

**Phase:** 0 · **Status:** Active

The commit SHA, branch, target and build time are injected at build time and
emitted to `build-info.json` beside `index.html`.

**Why:** Section 33 requires proving that the deployed Preview SHA matches the
verified checkpoint SHA at every handoff. A plain HTTP request to
`build-info.json` answers that without opening the app, and the same values
drive the in-app About/QA panel and the stale-build check.

---

## D-008 — Stack: Vite + React + TypeScript, Vitest, Playwright

**Phase:** 0 · **Status:** Active

Strict TypeScript, including `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`.

**Why:** Section 45 asks for "Vite/TypeScript/React or equivalent modern static
frontend". Strict settings are cheap now and materially harder to adopt once the
canonical record layer exists. Playwright covers 360px, 430px and 1280px;
physical-phone validation stays mandatory regardless (section 37).

---

## D-009 — Initial visual direction: illuminated dark, single ember accent

**Phase:** 0 · **Status:** Active, deliberately unlocked

Deep blue-charcoal ground (never black), surfaces that climb toward the light,
one warm ember accent reserved for the current decision, a violet used only
inside gradients for depth, and body text at or above 6:1 contrast.

**Why:** Section 24 asks for dark-first, alive, dimensional and grounded while
explicitly rejecting the cave, the submarine console, neon card borders and
gamer RGB. Depth comes from light and shadow rather than outlines, which is what
separates this from a control panel.

**Not locked:** Section 69 keeps the exact palette, radii and animation system
open until the interface has been judged on a real phone.

---

## D-010 — Phase 0 screens state honestly that nothing is built

**Phase:** 0 · **Status:** Active

Now, Life, Timeline and Insights render real design but say plainly that there
is no engine, no record store and no learning yet.

**Why:** Section 36 — a fallback must not look like a confident empty-state
answer. Showing a plausible-looking recommendation before the engine exists
would be exactly the "large UI in front of a weak brain" failure this rebuild
exists to correct.

---

## D-011 — Fact resolution is Phase 1, not Phase 2

**Phase:** 1 · **Status:** Active

Working out what is currently known — which record wins, what has been
superseded, what has gone stale, what is simply unknown — lives in
`src/memory/facts.ts` and ships with the meaning layer.

**Why:** Section 17.1 lists the fact resolver as step one of the intelligence
pipeline, which reads as Phase 2 work. But the Phase 1 gate requires G-002 and
G-009 to pass as automated scenarios, and neither question can be answered
without resolving facts. The boundary that actually holds is this: Phase 1
decides _what is known_; Phase 2 decides _what to do about it_ — candidates,
constraints, evaluation, arbitration, explanation. None of the latter exists
yet.

---

## D-012 — Narrower scope wins, and a context is current because its window says so

**Phase:** 1 · **Status:** Active

Among the records that apply right now, a statement about this moment beats a
temporary arrangement, which beats a standing one. Within a tier, the latest
wins. Separately: point-in-time evidence ages against the concept's freshness
window, and a context record does not — a context is in force between its
`validFrom` and `validUntil`, and that is the whole of its currency.

**Why:** These two rules together are what make scenario G-002 work without a
special case for custody. Full custody is a durable context, so it answers
indefinitely and is never re-asked (section 8). A trip is a situational context,
so it wins for three evenings and then stops mattering, without erasing
anything. Tonight's explicit answer beats both, and goes stale tomorrow.

**Rejected alternative:** giving the concept a `durable` freshness horizon. It
made the durable case work and quietly broke the point-in-time case — an
observation about one evening would never have expired.

---

## D-013 — Time is several distinct branded types, and the local ones are derived

**Phase:** 1 · **Status:** Active

`Instant`, `LocalDayId`, `LocalWeekId`, `LocalTimeOfDay` and `TimeZoneId` are
nominal types that will not substitute for one another. Records store an instant
and a timezone; the local day and week are computed on demand and never stored.
Calendar arithmetic runs on civil dates, never on milliseconds.

**Why:** Section 15 requires these concepts not to be interchangeable and states
that a week identifier is not an instant. Branding makes that a compile error
rather than a code review. Deriving the local parts means they cannot drift out
of agreement with the instant they came from, and it lets the owner's week start
change without rewriting history. Civil-date arithmetic is why a 23-hour local
day is 23 hours long everywhere it matters.

---

## D-014 — Knowledge has four states and no way to ask for a default

**Phase:** 1 · **Status:** Active

`explicit | inferred | stale | unknown`. There is no `valueOr`, no `getOrElse`.
The exits are `matchKnowledge`, which requires every case to be handled, and
`valueIfUsable`, which returns `undefined`. Aggregating nothing returns unknown,
never zero.

**Why:** G-009. A convenience default is how "never answered" becomes "answered
zero", and once one exists every caller reaches for it. Stale is a separate
state rather than a flag for the same reason: a value with `fresh: false` reads
perfectly well if you forget to check, which is how months-old assumptions get
presented as current (section 63).

---

## D-015 — The store keeps wire JSON and parses on the way out; append is all-or-nothing

**Phase:** 1 · **Status:** Active

IndexedDB holds records in the same JSON an export produces. Reading parses
them, so a row that has gone bad on disk returns as an inspectable malformed row
rather than as an exception. Appending the identical record twice is a no-op;
a different record wearing a taken id is rejected; one rejection rejects the
batch. There is no update and no delete.

**Why:** Sections 13.1, 20 and 29. Idempotent append is what lets an import be
re-run. All-or-nothing is what stops a half-applied batch reporting a success it
cannot deliver. Parsing on read is what makes corruption cost one entry instead
of a lifetime.

---

## D-016 — One IndexedDB database per deploy target

**Phase:** 1 · **Status:** Active

`life-command-os:preview`, `life-command-os:production`,
`life-command-os:development`.

**Why:** IndexedDB is scoped to an origin, not to a path, and D-003 puts Preview
and production on two paths of one `github.io` origin. Without a name per target
they would share a database, and synthetic QA data would land in the same place
as real history — the opposite of the separation section 33 requires.

---

## D-017 — Unrecognised fields survive at the top of a record and are refused inside it

**Phase:** 1 · **Status:** Active

A field the schema does not know, at the top level of a record, is carried
through verbatim and written back out unchanged. The same field inside a
provenance block, an entity reference or a fact value is a validation issue.

**Why:** Section 30 requires unknown fields to survive an eventual legacy
import, and "canonical data round-trips without loss" should be true of data
this version has never seen. Inside a nested structure there is no such case to
serve — an extra key there is a mistake, and silently dropping it on the next
round-trip is worse than saying so. Legacy payloads that fit nowhere have their
own record kind, which keeps them verbatim by design.

---

## D-018 — A recommendation that cannot resolve its subject renders nothing

**Phase:** 1 · **Status:** Active

`renderRecommendation` returns either a complete sentence or the list of
references that failed to resolve. There is no fallback wording.

**Why:** Section 13.4 and the Phase 1 special acceptance. A fallback string is
precisely how "it" reaches a screen: the moment a renderer can degrade, the
degraded path becomes the one nobody notices. A surface can say a recommendation
could not be shown. It must never say something confident about an unnamed
subject.

---

## D-019 — Synthetic scenarios are their own module

**Phase:** 1 · **Status:** Active

`src/synthetic/` holds the scenario library. It has no React and no DOM, and it
produces JSON documents rather than in-memory object graphs.

**Why:** Section 31 makes the synthetic laboratory a first-class surface, and the
same scenarios are used by the QA screen and by the golden tests. Putting them
under `features/qa/` would tie the test suite to a UI folder; putting them in
`domain/` or `memory/` would put fixtures inside the layers they exercise.
Emitting documents rather than objects means a scenario is loaded through the
same parser a pasted file uses — section 60's warning that fixtures must not
make hardcoded logic look correct.

---

## D-020 — Browser tests run at one worker, locally as well as in CI

**Phase:** 1 · **Status:** Active, revisitable

**Why:** A single `vite preview` process drops connections under concurrency.
That was survivable at two workers until a route arrived in its own chunk: a
lazily loaded screen adds a mid-test request, and under load that request is the
one that stalls — which presents as a hung screen rather than as a busy server.
Section 60 records that failures which merely look like product failures cost
real time. Matching CI exactly is worth more than the seconds saved.

**Revisit if:** the preview build is ever served by something sturdier than
`vite preview`.

---

## D-021 — The engine may name its own routines; it may never name the owner's life

**Phase:** 2 · **Status:** Active

`src/intelligence/vocabulary.ts` holds exactly three entities the engine
provides for itself: sleep, winding down, and a walk. Every other subject a
recommendation can be about must already exist in the owner's history, or the
move is not proposed.

**Why:** D-018 means a recommendation without a resolvable subject renders
nothing, so a move like "start winding down" needs an entity behind the words.
The tempting fix — letting generators invent whatever entity they need — would
quietly defeat section 64: an engine that can invent subjects can always produce
a well-formed, entirely generic sentence about a life it knows nothing about.
Restricting invention to the engine's own routines keeps the failure mode
visible, because a history with nothing in it produces no move rather than a
plausible one.

**Consequence:** the home generator needs a `place` entity, the fatherhood
generator needs a `person`, the money generator needs a `financial-goal`. A
domain with nothing named in it stays quiet, which is correct.

---

## D-022 — A weekly direction points at an entity, and expires at the week boundary

**Phase:** 2 · **Status:** Active

The direction's semantic category is the life domain of the entity it points at;
the owner's own wording is that entity's label. Free text is accepted, and
categorised only when it unambiguously names a life area — otherwise the
direction is `uncategorised`, which pulls arbitration nowhere. The week rule
lives in `src/intelligence/direction.ts` and compares owner-local weeks.

**Why:** Section 21 asks for four things at once — a real semantic category, the
owner's wording still visible, no hardcoded career value, and expiry at the
correct owner-local week boundary. An entity reference carries the first two in
one field. `uncategorised` is what "no hardcoded career value" actually
requires: the failure is not choosing career deliberately, it is having any
fallback at all, because whichever domain is first in the registry then becomes
the answer for every phrase nobody parsed.

**Why the week rule is not a freshness horizon:** it would fit the concept
registry, and freshness is concept-specific by design (section 8). But
`freshUntil` has no week start in scope, and a week start is an owner preference
rather than a property of the concept — threading one through freshness
resolution to serve a single concept would put an owner setting inside the
meaning layer's aging rules.

**Revisit if:** a second concept ever needs week-boundary freshness.

---

## D-023 — The move profile table is priors, not learned effects

**Phase:** 2 · **Status:** Active until Phase 3

`src/intelligence/moves.ts` states, for each kind of move, what it demands, what
it is worth tonight and tomorrow, how hard it is to start, how long it takes, and
which parts of the day it suits.

**Why:** Section 20 is explicit that the app learns from observed outcomes rather
than from having generated a recommendation, and Phase 3 is where a completed
move starts changing these numbers for this owner. Until then the engine still
needs a starting belief about whether a lab at 23:00 is a good idea. Writing that
belief down in one table — rather than as conditions scattered through the
evaluator — is what makes it reviewable now and replaceable later.

**Consequence:** the numbers are coarse on purpose. Section 22 forbids inventing
precision, and an evaluation's confidence is capped well below certainty because
nothing here has been checked against an outcome yet.

---

## D-024 — The deterministic baseline is the selected architecture

**Phase:** 2 · **Status:** Active, revisitable at any phase

Section 18's tournament was run on the ten golden synthetic profiles, comparing a
deterministic baseline against a hybrid that puts a semantic advisor between
ranking and choosing. **Both scored 60 of 60 against the fixed rubric, and chose
the same move on every profile.** The rule is "the simplest architecture that
_clearly_ produces better decisions", so the baseline is selected.

**What was compared:** decides the right kind of thing (a move, or no action);
reaches the same answer twice; explains itself; keeps the noun; says something
particular rather than something pleasant; lands in the expected life area where
the scenario states one; names the thing the history is about. Seven checks on
the five profiles with a stated expectation, five on the rest.

**What the advisor actually did:** it fired. On the profiles carrying free-text
outcome notes it read them, judged the trouble specific rather than general, and
had a bounded nudge applied — and landed exactly where the deterministic ranking
already was. That is the finding, and it is stronger evidence for the baseline
than a disagreement would have been: the semantic reading agreed with the rules,
so it earned no decisions.

**Not deleted.** The hybrid path still runs, still passes its guardrails, and is
selectable in the QA laboratory. `tests/synthetic/intelligence-tournament.test.ts`
fails if the hybrid ever scores higher, which forces this decision to be made
again rather than inherited.

---

## D-025 — No live model inference in this phase, and what it would take

**Phase:** 2 · **Status:** Active — **owner decision required to change**

The hybrid architecture is complete: the request digest, the reply contract, the
strict validation, the bounded nudge, the trace entry. What is not wired up is a
network call to a model.

**Why:** Section 18 forbids permanent API secrets in the browser and forbids
storing the owner's life history on a server merely because inference needs a
network request. Honouring both requires the "smallest secure inference service"
that section allows — an endpoint holding the key, receiving only the digest, and
returning structured output that is validated before use. That needs a hosting
account and a secret the owner would have to create, which is an owner decision
and not a developer one.

**What exists instead:** a local advisor that reads the free text the rules
cannot parse, and an adversarial advisor used by
`tests/synthetic/model-guardrails.test.ts` to prove every section 18 guardrail
bites. Swapping in real inference is a change of adapter, not of architecture.

---

## D-026 — A question is worth asking only if the answer lands somewhere different

**Phase:** 2 · **Status:** Active

The guide re-runs the whole decision under each possible answer and asks only
when the answers reach different moves. A floor of four questions per
owner-local day sits under that.

**Why:** Section 12 asks the guide to "determine whether another answer could
materially change the recommendation". Answering that by measurement rather than
by a rule of thumb is what makes zero questions possible, which section 12
explicitly requires and no questionnaire can do. The consequence is worth stating
plainly: a question the owner would find pointless is one the guide cannot ask,
because the same machinery that ranks the answers filters the question.

**The floor exists because the swing rule is not enough.** Section 47 fails the
phase outright if the owner reasonably says "too many questions", and a run of
individually justified questions is still a run of questions.

---

## D-027 — One store and one clock, above the whole shell

**Phase:** 2 · **Status:** Active

`MemoryProvider` owns the canonical store and the moment being asked about.
Every surface reads both.

**Why:** Now has an engine behind it and needs the same history the QA laboratory
loads; two IndexedDB connections to one database would drift the moment either
wrote. The clock moves for a related reason — time travel is a QA control, but it
has to reach the engine rather than stopping at the screen that offers it, or
loading a scenario and walking to Now would show a different evening. Nothing
below the UI reads a wall clock, so moving the moment here moves it everywhere.

**Consequence:** the scenario library is deliberately not imported by the
provider. A document arrives as text, the same text a pasted file would be, so a
production build never downloads a fixture — and a guard fails the build if any
surface outside `src/features/qa/` imports it.

---

## D-028 — More leaves the bottom bar

**Phase:** 2 · **Status:** Active

The bottom navigation holds exactly Now, Life, Timeline and Insights. More is a
header entry; QA is reached from inside it.

**Why:** Section 5 fixes the conceptual structure at four primary destinations
and puts data, exports, settings, privacy and QA behind a secondary entry.
Phase 1 left More in the bar because there was nowhere else to put it, which is
exactly how a secondary surface becomes permanent: convenient once, never
revisited, and four destinations quietly become five.

---

## D-029 — The recommendation lifecycle stays in Phase 3; the guide is the interaction

**Phase:** 2 · **Status:** Active until Phase 3

Now shows the chosen move and the state it is in. It offers no accept, decline or
can't-now control.

**Why:** Section 48 assigns start, complete, decline, can't-now, outcome capture
and learning to Phase 3, and a lifecycle button that records an event nothing yet
learns from would be a control that does not work. The guide is the interaction
this phase can honestly offer: an answer changes the recommendation on the spot,
which is a demonstration of the engine rather than a placeholder for one.

---

## D-030 — The evaluator and the arbiter may not know a life area by name

**Phase:** 2 · **Status:** Active

`src/intelligence/evaluate.ts` and `src/intelligence/arbitrate.ts` contain no
domain identifier, import no domain registry, and compare against no domain name.
A guard fails the build if that changes. Reading the situation and generating
candidates are exempt — a sleep generator has to know it is about sleep.

**Why:** Section 32 asks for "no hardcoded career value", and that defect does not
get written deliberately. It gets written as one condition in a scoring function,
added to make one scenario come out right, six months after anybody read section 32. Judging a move on what it demands, costs and pays back is what makes G-005
and G-008 pass for the right reason rather than by coincidence.

---

## D-031 — An explanation may only cite evidence the decision leaned on

**Phase:** 2 · **Status:** Active

The reason generator can reach a fact only if the winning candidate lists its
concept in `leansOn`. The premise is exempt.

**Why:** DEF-0006. Left free to reach for whichever particular was nearest, the
generator produced sentences that read exactly like reasoning and were not — a
walk explained by a sleep shortfall that contributed nothing to it winning and
argued the other way. Saying less is better than that, because a plausible false
chain invites the owner to trust reasoning nobody did.

**Why the premise is exempt:** "Monday morning, an hour short on sleep" is a
true statement about where the owner is. Describing the situation does not
require having decided from it, and holding the premise to the same rule would
leave the app unable to say what it can plainly see.

---

## D-032 — A move that claims capacity needs evidence of capacity

**Phase:** 2 · **Status:** Active

The movement generator requires a usable energy or soreness reading. Strain
inferred from sleep alone is not enough.

**Why:** DEF-0006's root cause. "There is capacity for it" is a claim about how
the owner feels, and three good nights is not evidence of it. The generator was
firing on histories that knew nothing about the body, which is how an effortful
twenty-five minutes came to be recommended on no grounds at all.

**Consequence, and it is the point:** four scenarios that used to produce a walk
now say there is nothing to suggest and ask one question. That is the honest
answer, and one tap turns each of them into a walk with a reason that is
actually about the walk.

---

## D-033 — The guide asks the question that moves things most, and stops when one does not

**Phase:** 2 · **Status:** Active

Three rules, replacing "the first question in the catalogue that could change
the answer": ask the one whose answers diverge most; require at least two of its
answers to lead away from where the engine stands; stop once an answer has moved
nothing.

**Why:** DEF-0008. Every question was individually justifiable and the sequence
was not — four in a row while the recommendation sat still. The third rule
follows from the first: if the best question changed nothing, the ones ranked
below it are worth less by construction.

**What is deliberately not changed:** the inspector keeps the looser definition
of what would change the answer. "These answers would land elsewhere" is true
and worth showing even when it is not worth a tap.

---

## D-034 — Phase language lives in one constant, and only on two surfaces

**Phase:** 2 · **Status:** Active

`REBUILD_PHASE` in `src/platform/buildInfo.ts`. The build panel behind More and
the QA laboratory read it. No primary destination mentions a phase, and a guard
fails the build if one starts to.

**Why:** DEF-0007. Life, Timeline and Insights each carried a hand-written
"PHASE 0" two phases after Phase 0 ended, and Timeline still told the owner the
canonical record store "does not exist until Phase 1". A phase number written
into a screen looks deliberate, survives every later phase, and gives nobody a
reason to look at it again — so the only person who finds it is the owner, on a
phone, reading the product talk about its own construction.

---

## D-035 — What a move was chosen over, and why, comes from the arbitration

**Phase:** 2 · **Status:** Active

Now shows the runner-up's sentence and one short phrase naming the dimension on
which the winner most out-scored it. Any runner-up, not only one from a
different life area.

**Why:** Section 6 asks Now to show the relevant tradeoff, and the owner asked
for it more precisely: if walking beats studying, resting or doing nothing, the
reason should make that understandable. Taking the phrase from the widest
dimension gap means the explanation cannot offer a reason the ranking did not
have — the same discipline as D-031, applied to the comparison rather than to
the move.

**Consequence:** every phrase it can use corresponds to a dimension the
evaluator actually computes, which a test asserts. Adding a dimension without
giving it a phrase would be caught.

---

## D-036 — A question is worth asking when half its answers would land elsewhere

**Phase:** 2 · **Status:** Active

`overturns * 2 >= options`, replacing a flat requirement of two.

**Why:** DEF-0009. The count worked for the four-option questions it was written
against and quietly disabled every binary one, because one of a binary
question's two answers is almost always the situation the engine is already in.
A share handles both without a special case for either, which is the reason for
preferring it over an exception carved out for two-option questions.

**What it must keep doing:** DEF-0008's job. A question that one answer in four
would move is still not asked, and that is checked directly rather than assumed.

**Amended by D-111 — a narrow consequential exception.** The share rule measures
the fraction of answer values that switch the decision. The value of a question is
the expected reduction in loss, and those diverge exactly where it matters: the app
would recommend a 25-minute walk without asking about pain, because only one of
soreness's three answers stops it. The rule now carries one exception, and D-111
states its bounds. The share rule remains the default and this regression remains
in force for every concept not marked `consequential`.

---

## D-037 — A guide answer records when it was written down

**Phase:** 2 · **Status:** Active

`answerRecord` accepts the moment the answer was written, distinct from the
moment it is about. The surface supplies the real clock; the kernel stays
clock-free.

**Why:** DEF-0010. Every answer in a session is about the same moment, so
`occurredAt` cannot separate them; `recordedAt` defaulted to it; and canonical
order then falls through to the record id, which carries no meaning by design.
The rule that stops asking once an answer has changed nothing was removing an
arbitrary answer as a result.

**Consequence:** under time travel the two genuinely differ — an observation
about a travelled evening, written down today — which is the case the envelope
was built for in the first place.

---

## D-038 — An absence may not be asserted from ignorance

**Phase:** 2 · **Status:** Active

An explanation may not say that nothing else was pressing, or that nothing was
in the way, on the strength of having found nothing.

**Why:** DEF-0012, and it extends D-031 from facts to findings. "Nothing more
pressing to spend it on" reads as a conclusion about the owner's life and was a
statement about how little the engine could see — one candidate, and everything
else unknown or months stale. `bottleneck-fit` scoring zero means no limiter was
detected, which is a different claim from there being none.

**What replaced it:** the part of the day, read off the `context-fit` dimension
rather than assumed, so a move can only claim the hour suits it when the ranking
actually scored that.

---

## D-039 — A question names what it is about

**Phase:** 2 · **Status:** Active

Every prompt in the catalogue contains a content word, and a sweep strips the
interrogative frame from each one and fails if nothing is left.

**Why:** DEF-0011. Section 3's rule is that the app never loses the noun when it
knows it, and G-001 sweeps the recommendation catalogue for exactly that failure
— but nothing swept the questions, so "How much have you got left?" shipped
asking about energy and saying so nowhere. The owner had to ask what it meant,
which is the evidence.

---

## D-040 — The word for the hour and the boundary for the decision are separate

**Phase:** 2 · **Status:** Active

The evening begins at 18:00 for every purpose the engine has — which moves are
eligible, which suit the hour, what protects tomorrow. For display only, the
last hour before it reads as "late afternoon".

**Why:** The owner looked at their phone at a quarter to six and read "Saturday
afternoon". By the clock and by the daylight that is correct; by how it lands it
is not. Moving the real boundary to 17:00 would fix the word and make "start
winding down now and let tonight be a recovery night" proposable at five past
five, which is worse than the thing being fixed.

**What this is not:** a new time block. `DayBlock` is unchanged, every move
profile is unchanged, no filter or score moves. A test holds the two apart by
asserting the boundary is still 18:00 and that the set of candidates generated
at 17:45 is identical to the set at 16:30.

---

## D-041 — A scenario the owner is shown has to be a life they recognise

**Phase:** 2 · **Status:** Active

`gone-quiet` carries the durable full-custody arrangement, because the owner
does. Fixtures that need a fact deliberately missing are built inside the test
that needs them and are never added to the scenario library.

**Why:** DEF-0015. The scenario was written to demonstrate staleness and
modelled only the things that go stale, so the app asked whether his daughter
was with him — and looked to have forgotten a settled arrangement it had never
been told about. Section 60 warns that fixtures must not make hardcoded logic
look correct; the same carelessness in the other direction makes correct logic
look broken, and costs more, because the owner has no way to tell which it is
from the outside.

**Consequence:** the binary-question regression that needs an unknown
`childPresent` builds its own history, `beforeTheArrangementIsKnown` — a
plausible moment, before the owner has told the app anything, that nobody is
handed on a phone.

**Not changed:** the engine's custody and presence behaviour. G-002 was correct
throughout, and `durable-custody` and `week-pointed-at-home` have never asked.

---

## D-042 — An episode is what it is about, not the record that created it

**Phase:** 3 · **Status:** Active

The unit of the lifecycle is an **episode**: one suggestion, on one day, and
everything that happened to it. It is keyed by the verb, the object and the
owner-local day. Two records about the same move on the same day fold into one
episode.

**Why:** Section 60 lists "double taps must not create duplicate episodes" among
the failures to carry forward, and the tempting fix is a guard in the surface —
remember not to write twice. A surface that has not re-rendered cannot remember
anything, which is exactly the case a double tap is. Keying the episode by its
meaning makes a duplicate **unrepresentable** rather than prevented: two records
produce one episode because there is nowhere for a second one to live.

**Consequence, and it is load-bearing:** the recommendation record carries a
`derivedRecordId` built from the same key, so a second tap writes a
byte-identical row and the store's existing idempotency (D-015) skips it. That
mechanism was built so an import could be re-run; a double tap is the same
problem arriving from the other direction.

---

## D-043 — Nothing is written until the owner acts

**Phase:** 3 · **Status:** Active

Now does not record a recommendation because it displayed one. The
`action-recommendation` record is written on the first tap, together with the
event that prompted it.

**Why:** A history that grew a row every time a screen rendered would be
unreadable within a week, and every one of those rows would be an episode
nothing ever happened to — noise in the Timeline, noise in the duplication
check, and noise in the evidence learning reads. Section 20 lists "shown" as a
lifecycle state, and it is one: it is the state of the decision currently on
screen, which needs no record because it is recomputed from the situation every
time.

**Consequence:** the first tap writes two records rather than one, and the
context is captured at the moment the owner acted rather than the moment the
app rendered. The second is the better moment anyway.

---

## D-044 — A recommendation records the context it was made in, and never revises it

**Phase:** 3 · **Status:** Active

`ActionRecommendationRecord` gains an optional `DecisionContext`: the part of
the day, weekday or weekend, how strained, whether she was there, how much time
there was. Five coarse features, written once.

**Why:** Section 16 requires historical comparison to weigh context rather than
date proximity, and that is impossible to do honestly after the fact.
Re-deriving "what was that evening like?" from today's history would answer with
everything written since — the outcome included — so a move would appear to have
been recommended in the conditions it produced.

**Why so coarse:** section 22 forbids inventing precision, and a fingerprint
fine enough to be unique matches nothing. A similarity of 0.6 here means "quite
like it", not a measurement.

**Consequence:** an episode with no context recorded cannot claim to resemble
tonight and contributes nothing to learning. It is still history; it is not
evidence about a situation.

---

## D-045 — Declines, inabilities and outcomes reach three different places

**Phase:** 3 · **Status:** Active

A completed move with an answered result reaches `effect`. An unable-now reaches
`follow-through`. A decline reaches `appetite`, which feeds `owner-preference`
and nothing else.

**Why:** Section 20's first two rules — "rejection is not ineffective",
"unable-now is context evidence" — are the kind of thing an app gets wrong by
being reasonable. The owner keeps saying no, so the app concludes the move does
not work and stops offering it, having learned nothing except that it was
ignored. Writing the rule as a comment would not survive the first edit made in
a hurry.

**What makes it hold:** the code paths do not meet. `effectFor` filters to
completed episodes with a sentiment-bearing outcome before it does anything
else, so there is no branch a decline could travel down. A history of nothing
but refusals moves the effect by zero, and that is asserted directly rather than
assumed.

---

## D-046 — The priors are pulled toward outcomes by `n / (n + 3)`

**Phase:** 3 · **Status:** Active, revisitable

`moves.ts` still states what each kind of move is expected to be worth.
`learning.ts` pulls those numbers toward what actually happened in comparable
situations, weighted by similarity and gently by recency, by the effective
sample count over itself plus `PATIENCE`.

**Why:** This is D-023 discharged. Section 20 says the app learns from observed
outcomes, and also that one success is not proof — which is a statement about
_how much_ an outcome should move a belief, not merely that it should. One
perfectly comparable evening moves the starting belief a quarter of the way. Six
move it two-thirds. Nothing ever reaches the observation outright, which is what
leaves the prior able to pull it back when later evidence disagrees.

**Why a prior remains:** the engine has to decide the first evening too, and
section 22 forbids inventing precision — including the false precision of
treating one data point as a measurement. The prior is what the coarse table was
always for; what has changed is that it is no longer the last word.

**Revisit if:** the tournament is re-run with enough outcome history to compare
`PATIENCE` values against something other than judgement.

---

## D-047 — A belief correction is a watershed, not a retraction

**Phase:** 3 · **Status:** Active

`belief-correction` is a new record kind. Rejecting a belief stops every episode
recorded up to that moment from counting toward it; what happens afterwards
counts normally. `restore` removes the watershed.

**Why:** Section 62 requires a learned pattern to be correctable and the app to
"stop reasserting the old belief unless new evidence genuinely supports
revisiting it". A learned belief is not one row, so a `correction` has nothing
to point at — and retracting the outcomes underneath it would throw away what
the owner actually observed, which is worse than the belief. A watershed says
exactly what section 62 says, and needs no threshold nobody chose: new evidence
is evidence the owner has not already seen and disagreed with.

**Where it is offered:** beside the decision it moved. A belief the owner cannot
see is a belief they cannot correct, and Now is the only place this phase states
one in words.

---

## D-048 — A dimension with nothing to say carries no weight

**Phase:** 3 · **Status:** Active

`follow-through` returns weight 0 when nothing has ever been blocked, rather
than a value of 0 at full weight.

**Amended before the phase closed, and the amendment is the more important
half.** The first version abstained only when there were _no_ comparable
episodes. That still rewarded a move for having a record that agreed with the
prior — four completions and no interruptions scored +1, which let it beat a
move the app had never watched the owner attempt, and the explanation said
"more likely to actually happen" about the difference. That is DEF-0019, and it
is D-038's rule arriving in a dimension instead of a sentence. So the rule is
not "no evidence" but "nothing to say": the dimension abstains whenever the rate
sits at its prior, and only ever speaks against a move.

**Why:** The score is a weighted mean, so a dimension contributing zero at full
weight drags every move toward the middle. Adding `follow-through` did exactly
that — it moved the `WORTH_DOING` bar by widening the denominator, and turned a
walk that had been worth doing for two phases into no action at all, on a
history where nothing had been learned about anything. A dimension with nothing
to say must cost nothing to have.

**Not applied retroactively:** the older dimensions still score zero at full
weight in their unknown cases. That is a wart rather than a principle — the
weights were tuned with them present, and re-cutting the instrument means
re-running section 18's tournament, which belongs to a phase that can.

---

## D-049 — A started move stays in front of the owner

**Phase:** 3 · **Status:** Active

After arbitration, a move that is started, unsettled, from today and still among
the surviving candidates is chosen regardless of the ranking. The trace says so.

**Why:** Every lifecycle event recomputes the decision, which is the point — and
it means tapping **Start it** immediately makes that move a recently-offered one
and can hand the top spot to something else. The owner looks up from the sink
and the app is suggesting a walk. Section 19 lists "continue" as a valid
decision and section 6 asks Now to show an active recommendation state; both
point here.

**Why it is not a score:** a bonus large enough to always win would be a number
chosen to force an outcome, and it would still lose on some evening nobody
tested. Saying it outright, in one place, keeps the ranking underneath honest
about what would otherwise have been picked.

**Limit:** it only overrides a candidate still on offer. A walk started at seven
and remembered at midnight is not something to still be recommending.

---

## D-050 — The clock advances when the app is looked at, and once for a due result

**Phase:** 3 · **Status:** Active

`MemoryProvider` refreshes the moment when the tab becomes visible, and sets one
timer for the instant `nextOutcomeDueAt` reports. No polling.

**Why:** Phase 2 captured the moment at mount and never moved it, and nothing
needed more — every decision is a pure function of the moment it is given, so a
tab left open was simply answering the question it had been asked. Outcome
windows are the first thing that cares: a result due at ten past eight never
becomes due on a screen frozen at half past seven.

**Why not a heartbeat:** the engine can say _when_, so there is nothing to poll
for. One timer for a known instant is cheaper and cannot drift.

**Where the clock is:** in the surface, and only there. `nextOutcomeDueAt`
computes an instant and compares it to nothing, so the kernel stays clock-free
and the guard in `tests/unit/architecture-guards.test.ts` still holds.

---

## D-051 — `ease-off`, the afternoon's recovery move

**Phase:** 3 · **Status:** Active

A fourth restorative verb with its own routine in the engine's vocabulary —
D-021's list grows from three to four. It suits the afternoon and refuses every
other block.

**Why:** DEF-0016, deferred by the owner at the end of Phase 2. `protect-sleep`
and `wind-down` are right to refuse the afternoon, and being right left a man
nine hours short of rest at a quarter to six with "Nothing fits tonight" and no
alternative. The fix is not a looser filter; it is having something to say.

**Why it refuses the evening:** `protect-sleep` is the better sentence after
six, and two recovery moves competing for one evening is one wording too many —
the same argument that keeps the sleep generator from proposing both a wind-down
and a named alternative on the same night.

---

## D-052 — Every lifecycle button is always drawn

**Phase:** 3 · **Status:** Active

The action row renders all five actions and disables the ones the state machine
does not allow, rather than rendering only the allowed ones.

**Why:** DEF-0018. Removing a button re-flows the row: tapping **Start it** slid
**Done** into the space under a finger that had not lifted, so the second half
of a fast double tap recorded "I have done this". It is a legal transition from
`started`, a plausible thing to have meant, and indistinguishable downstream
from the truth — which is what makes it worse than a crash.

**Why the latch is not enough on its own:** the synchronous ref in `NowScreen`
swallows a second tap on the same button before React re-renders. It does
nothing about a second tap on a _different_ button, because that is not a
duplicate — it is a different event, and the guards that make duplicates
harmless have no opinion about it.

---

## D-053 — Completion is the attempt, not the achievement

**Phase:** 3 · **Status:** Active

`action-completion` means the owner carried out the action the sentence asked
for. It says nothing about whether the intended end state was reached.

**Why:** DEF-0020, and it was found by the owner disagreeing with a diagnosis.
The record had no definition anywhere — unlike `action-decline` and
`action-unable-now`, which both carry one — so "Done" was ambiguous between
attempt and achievement, and the whole learning layer rested on which it was.
Fifteen minutes clearing the kitchen can be done in full and leave the kitchen
half clear. Section 20 already lists `completed` and `outcome observed` as
different states; this says which is which.

**Consequence:** "How much of the kitchen got cleared?" is a legitimate question
_after_ Done rather than a redundant one, which is the opposite of what the
first diagnosis concluded.

---

## D-054 — An outcome says which of three things it is an observation of

**Phase:** 3 · **Status:** Active

`OutcomeRecord.aspect` is `result | effect | comfort`. Only an effect answer
carries a `sentiment`.

**Why:** One better/same/worse judgement was standing in for four different
facts — completion, direct result, downstream effect, comfort — so the app was
collecting evidence about one thing and learning another from it. The plan never
asked for one shape: section 10 lists five things to learn from a social move,
"whether the owner acted" among them; section 9's growth evidence is a fact
about a child; section 19 lists completion probability and prior outcomes as
separate dimensions. The single judgement was a Phase 3 implementation choice.

**Why three suffice, and not four:** whose result it is comes from the subject,
not from the aspect. "How did Adaya do?" is a `result` about a development skill
that links to her, structurally identical to "How much of the kitchen got
cleared?".

**Why only effect carries a sentiment:** `roughOutcomesFor` reads `worse` as
"this topic went badly" and fires the weak-topic generator from it. A _result_
of "not at all" wearing that flag would produce a study recommendation off an
evening that says nothing about studying.

---

## D-055 — Direct result is its own learned quantity, and can only count against

**Phase:** 3 · **Status:** Active

`resultFor` is separate from `followThroughFor`. Its prior is 1 — a move
achieves what it is for — so _achieved_ sits at the prior and abstains, and only
_partly_ and _not at all_ speak.

**Why separate:** follow-through asks whether the move can happen here at all,
from unable-now — evidence about the _situation_. This asks whether it lands
when it does. Clearing the kitchen every time it is suggested and only ever
half-clearing it is perfect follow-through and a poor result, and folding them
would have the app say "something usually gets in the way" of an evening where
nothing did.

**Why penalty-only:** `reset-space` is the only move that produces both a result
and an effect, so one good evening produces two answers. If both fed positive
dimensions, a move with a decomposable outcome would out-rank an identical move
with a simple one — an advantage earned from the taxonomy rather than from the
world. Making the result non-positive dissolves it: the second aspect can only
ever cost. Same rule as `follow-through` after DEF-0019.

**Rejected alternative:** multiplying the effect by the achievement rate, which
is the semantically neat version of "expected value". It asserts that partial
achievement produces proportionally partial benefit, and we have no evidence for
that shape (section 22).

---

## D-056 — An effect answer is absolute worth, in four levels including harm

**Phase:** 3 · **Status:** Active

`A real difference · Some difference · Not much · Backfired` → 0.85 · 0.50 ·
0.15 · 0.00. `shrink()` is unchanged.

**Why absolute:** the labels were comparative and the values absolute, so one
tap meaning "it made no difference" pulled a move with a 0.8 prior down, left
`reset-space` at 0.4 exactly where it was, and would have pushed a 0.05 prior
up. A relative judgement written into an absolute scale moves different moves in
different directions.

**Why four:** harm is not the same evidence as no help. A walk that aggravated
soreness and a walk that did nothing should not teach the same thing, and
`sentiment: 'worse'` had existed since Phase 1 — collapsing to three would have
discarded a distinction the domain already carried. The scale has no room below
zero, so ranking treats harm as worthless; the record keeps them apart, which is
what lets the owner see the difference and correct it.

**Rejected alternative — a delta model** (`observed = prior + Δ`), which was
proposed and then withdrawn after working the arithmetic. It passes most checks
and fails the one that matters: with Δ = 0 for "no change", **a move that
consistently does nothing keeps its prior forever**. "Spending time with Adaya
never changes the evening", told fifty times, would leave `time-with` at 0.80.
It also saturates at the clamp after three good answers on a 0.9 prior.

**Checked before adoption**, across the real prior range 0.40–0.90: one
observation moves a quarter of the gap; repeated evidence increasingly outweighs
the prior; contradictory evidence reverses it below the prior; the largest
single move is 0.225 and leaves the belief at 0.675; nothing clips, because
learned is always bounded by `[min(prior, 0), max(prior, 0.85)]`.

**Known and accepted:** `protect-sleep`, `recover` (0.90) and `wind-down` (0.85)
sit at or above the top answer, so the best possible answer cannot raise them —
it converges them on 0.85. Those priors were never earned, and raising the top
value would make "a real difference" a near-certainty claim from one tap.

---

## D-057 — Comfort is learned as friction

**Phase:** 3 · **Status:** Active

A comfort answer moves `MoveProfile.friction` by the same `shrink()`, and the
`friction` dimension and `bottleneckFit`'s short-evening branch read the learned
value. The arbitration tiebreak keeps the immutable prior.

**Why:** asking whether something felt easy, awkward or hard work and then doing
nothing with the answer is D-029's own complaint — a question that changes
nothing is the same mistake as a button that records nothing. Friction is what
the answer is _about_.

**Why signed both ways**, unlike result and follow-through: their priors are
ceilings, so only failure is informative. Friction's prior is a middling guess
per move, so "easier for you than it looks" is real news about this owner.

**Why the tiebreak keeps the prior:** it exists only to settle an exact draw
deterministically, and a tiebreak that depended on history would make an
identical draw resolve differently on two devices with different pasts.

---

## D-058 — A result of "not at all" ends the sequence

**Phase:** 3 · **Status:** Active

Aspects are asked in the order the move declares them, one at a time, and a
direct result of "not at all" suppresses the effect question for that episode.

**Why:** "How much did clearing the kitchen do for the evening?" has no honest
answer on an evening when the kitchen was never cleared, and whichever one the
owner picked would be recorded as evidence about clearing kitchens. It also
saves a tap on the evening they least want to be asked twice.

**Why an ordering rule rather than a filter in learning:** filtering afterwards
would still have asked, and the tap is the cost worth removing. Suppressing the
question means there is nothing to filter.

---

## D-059 — How much a piece of evidence is worth depends on the source _and_ the concept

**Phase:** 3 · **Status:** Active — **owner decision, governs Phase 4**

There is no standing hierarchy in which an explicit owner report always outweighs
a derived, device or model one. What a piece of evidence is worth is a property
of the **pair**: this source, measuring this concept.

- A watch measuring hours slept may be better than the owner's recollection of
  hours slept.
- A financial record of a balance may be better than the owner's estimate of it.
- A model's inference about how the owner _feels_ should generally be weaker
  than the owner saying how he feels.

**Why:** the alternative — ranking by source alone — is the same mistake section
8 already forbids one layer down. "Freshness is concept-specific, not one
universal number of days" is the identical argument about a different property,
and a flat source ranking would make the app trust a guess about someone's mood
exactly as much as a measurement of their sleep.

**The codebase already half-agrees, which is the evidence this is right.**
`knowledgeFromRecord` in `src/memory/facts.ts` treats a `device` observation as
`explicit` — the same standing as a self-report, not below it. What it also does
is give every `derived` observation a flat confidence of 0.6 regardless of what
is being measured, and that flat number is the thing this decision replaces.

**What does not vary, and is not a matter of reliability at all:**

- Derived, inferred or model evidence must **never silently masquerade as
  explicit fact**. A high-reliability inference is still an inference, and the
  four knowledge states exist so it cannot be read as anything else (D-014).
- **Provenance stays visible** wherever the evidence surfaces — the record, the
  fact layer, the learning trace, the inspector.

Those two are absolute. Reliability decides how much a reading _moves_ a belief;
it never decides whether the reading can pass itself off as something it is not.

**Where it belongs:** `ConceptDefinition` already carries `freshness`, `privacy`
and an ask policy per concept. A per-concept source-reliability entry is the same
shape of thing and belongs beside them, with a conservative default per source
that a concept may override where there is a reason to.

**Consequence for Phase 4:** the sleep-outcome matcher cannot be written against
"derived is worth less". It has to say what a watch or a morning self-report is
worth _for sleep hours_, and defend that number.

---

## D-060 — Reliability is a table read in two places, and it never decides the state

**Phase:** 4 · **Status:** Active

`ConceptDefinition.reliability` is a partial map from `ProvenanceSource` to a
number in 0–1, with `DEFAULT_SOURCE_RELIABILITY` behind it. Two consumers spend
it: `knowledgeFromRecord` as the confidence of an inference, and `learning.ts`
as a third term in the weight beside similarity and recency.

**Why one table for both:** they are the same question — how far should a
reading from here move what we believe about this — and two tables would drift.

**What it never touches.** Which of the four knowledge states a record resolves
to depends only on whether a person observed the thing or something concluded
it. A derived, model or legacy-import reading is `inferred` at any reliability,
including one. That is D-014 held against the pressure D-059 creates: a
high-reliability inference is still an inference.

**Where it earns its keep at the fact layer:** two readings of the same concept
at the same instant with different values used to resolve to `contradicted` for
every pair. Now the more reliable source for that concept wins, and only a
genuine draw goes unresolved. The rule is deliberately narrow — it settles a
draw and nothing else. Two records at _different_ moments are still ordered by
D-012, because a later statement about the same night is a correction rather
than a rival.

**`MoveProfile.measures`** supplies the second half of the pair in learning: an
outcome about `protect-sleep` is a reading about sleep, so a derived answer to
it is worth what a derived reading of sleep is worth. Undefined where no
registry concept honestly fits, which falls back to the defaults.

---

## D-061 — A concept is standing or momentary, and only standing ones are coverage

**Phase:** 4 · **Status:** Active

`ConceptDefinition.standing` defaults to false. Eight concepts set it: hours
slept, the custody arrangement, the learning topic, the cash buffer, home
friction, the private pattern, the weekly direction and recent faith practice.

**Why:** section 8 asks coverage to track "meaningful sub-areas", and most of
what the guide asks about is not one. "How much time have you got tonight?" goes
stale every four hours by design and says nothing whatever about the owner's
career; counting it would put every domain permanently in the red and teach him
to ignore the one signal section 63 exists to give him.

**What coverage adds over per-concept freshness**, which is the question the
phase brief asks directly: freshness answers yes/no about one reading. Coverage
adds _how far past_ — three of the concept's own windows, floored at a week, so
the threshold stays concept-specific for the same reason freshness is — the
_area_ rather than the reading, since acting in a domain is evidence about it
and no concept records that, and _whether anything is being done about it_.

**And it never contradicts the fact layer.** A concept that resolves to a usable
value is covered whatever the age of the record behind it. Without that rule a
learning topic stated as standing context reads as neglect four months later,
which is DEF-0015's failure arriving from a new direction.

---

## D-062 — Which areas matter is read off the owner's history, never ranked here

**Phase:** 4 · **Status:** Active

A domain matters if the owner has named an entity in it, set a goal or
commitment there, stated a preference, or acted in it. Coverage reports on every
domain; only one that matters can become neglected or reach the limiter.

**Why:** section 8 says "every important domain", and the tempting
implementation is a ranking of the eleven written by the developer — this file
deciding that faith matters less than career in somebody else's life. Reading it
off his own commitments makes the answer his.

**Consequence, and it is section 4.4:** an area he has never mentioned reads
"nothing here yet" and is left alone. Missing data is not failure, and an app
that asked about faith on the strength of a registry entry would be collecting
data because a field exists.

**Read from `view.entities`, not the decision entities.** The engine's own four
routines carry life domains (D-021), so reading importance off the folded list
would make sleep and health matter in every history ever loaded, including an
empty one.

---

## D-063 — Stale coverage is the fourth limiter and scores nothing

**Phase:** 4 · **Status:** Active

`LimiterKind` gains `coverage`, ordered last: recovery, then capacity, then
time, then coverage. `bottleneckFit` returns zero for every candidate under it,
which is identical to an evening with no limiter at all.

**Why it is a limiter:** section 63 requires the owner to be told, and the
limiter line is where Now says what is in the way. It also makes the
`stale-evidence` trigger reachable, which Phase 2 and Phase 3 both recorded as
existing and barely reachable.

**Why it scores nothing.** The first version gave a move in the quiet area +0.6
on `bottleneck-fit`, and on the scenario built to demonstrate exactly this it
produced "spend 15 minutes clearing the kitchen" on a Saturday evening with the
owner's daughter in the house — beating time with her, on the strength of the
app not knowing what the kitchen looked like, with an explanation that would
have read "answers what is actually in the way". A quiet area is the app's own
blind spot. It is not in the way of anything.

**How a stale area surfaces instead:** it earns a candidate that would not
otherwise exist, carrying `stale-evidence`'s low urgency. So it wins on an
evening with nothing better and loses to anything real, and the owner is told
either way — the limiter line names it whenever the chosen move is not about it.

---

## D-064 — The morning reading is the outcome, under four conditions

**Phase:** 4 · **Status:** Active — **owner conditions, do not relax**

`derived.ts` writes an `outcome` record with `aspect: 'effect'` for a completed
`protect-sleep`, `wind-down` or `recover` episode, read off the `sleepHours`
observation belonging to the morning that judges it.

**Why:** section 8 puts evidence normal life already produces first and asking
fourth. The morning after an early night the guide collects hours slept and a
separate card asks how much the early night did for his sleep — the same
question twice, and the second time worse.

The four conditions, each with a regression proved to fail when removed:

1. **It closes a loop and never opens one.** `outcomeWindowFor` is read rather
   than reimplemented, so nothing is derived unless the owner said he did it. A
   wind-down started and never finished, followed by eight hours of sleep,
   produces nothing at all.
2. **It never reads as something he said.** Provenance is `derived`, and
   `evidenceSourceOf` reports it as such wherever it surfaces.
3. **It is worth what a derived reading of sleep hours is worth** — 0.8 against
   his own 1.0. The reading is excellent; the _attribution_ is the assumption,
   and the discount is for that. The number is about sleep hours: the same
   machinery pointed at how he feels would be worth 0.4.
4. **It writes the ordinary outcome record.** No second outcome path and no
   second learner.

**Which verbs are eligible is read off the profile** — `measures`,
`outcome.when` and `aspects` — rather than from a list in the matcher, so a
sixteenth restorative verb is covered by writing one.

---

## D-065 — A derived record is stamped with the morning it is about

**Phase:** 4 · **Status:** Active

`occurredAt` is the reading's instant, and `recordedAt` defaults to it.

**Why:** it is the honest reading of `occurredAt` — the effect happened
overnight — and it is what makes the record a pure function of the history.
Stamping the moment of derivation would produce a _different_ record wearing the
same derived id an hour later, and the store would rightly refuse it (D-015). As
it stands, deriving twice produces the identical row and the second append is a
no-op, on whichever day it happens.

**Consequence:** section 14's "derived state must be rebuildable" holds for this
too. Rebuild from the same records and get the same derived record.

---

## D-066 — Inference may never conclude harm

**Phase:** 4 · **Status:** Active

The effect scale has four levels and the sleep matcher can produce three. Four
hours after a wind-down reads as "not much", never as "backfired", at any number
of hours.

**Why:** harm is a claim about causation. A short night after a wind-down is a
short night; concluding that the wind-down made it worse is an assertion from
what the app can see alone, which is D-038's rule. Only the owner can say a move
backfired, and leaving that to him is what keeps `sentiment: 'worse'` meaning
something when it does appear.

---

## D-067 — Evidence carries its provenance into the trace

**Phase:** 4 · **Status:** Active

`LearningTrace.evidence` and every learned quantity carry `EvidenceRef` —
record, source, whether the owner said it, and the reliability applied — rather
than a bare `RecordId[]`. The QA inspector shows the mix in a line.

**Why:** "3 comparable results" could be three things he said, three things the
app worked out, or a mix, and he cannot judge whether to correct a belief
without knowing which. That gap was tolerable while every outcome was a tap. It
stops being tolerable the moment the app can write one he never typed, so it was
closed **before** the first derived outcome rather than after.

**`fromOwner` is a separate field from `reliability` on purpose.** How far a
reading moved a belief and whether a person said it are different questions, and
D-059 turns on not letting the first answer the second.

---

## D-068 — Coverage orders questions and never authorises one

**Phase:** 4 · **Status:** Active

In `mostValuable`, staleness sits below the two measurements that decide whether
a question is worth a tap and above the catalogue's order, which it replaces.

**Why:** section 12 requires the guide to be able to ask nothing, DEF-0008 is the
worked example of a run of justified questions becoming too many, and section 47
fails a phase outright on the owner's verdict of it. A coverage engine that can
create questions is the most likely thing yet built to break that. Catalogue
order was a reasonable last resort carrying no information at all; between two
questions already judged equally worth asking, the one about the thing nobody
has mentioned for longest is the better use of the tap.

---

## D-069 — Ask for the reading, not for the verdict

**Phase:** 4 · **Status:** Active

When a due result could be settled by a reading the guide is entitled to ask
for, the effect question is held back and the guide asks for the reading
instead. `readingAwaitedBy` decides, and both ends read the same function.

**Why:** DEF-0021. On the morning after an early night the app was putting "how
much did skipping subnetting do for your rest?" on screen — asking him to grade
something when it could ask how long he slept and work the grade out. The second
question is concrete, is the one he expects, feeds the recovery model, and makes
the first unnecessary.

**Why this does not break section 12:** it is a swap. One card is replaced by a
better one and the count of things asked does not move. The daily floor still
applies above it, and if he answers nothing the window closes with the result
unknown — which section 20 lists as a real and acceptable state.

**Why the swap is conditional on the question actually being asked:** a reading
from outside the window can leave the concept currently known, in which case the
guide will not ask for it, and holding the effect question back on top of that
would mean no reading, no question, and nothing collected.

---

## D-070 — A growth-stage change is proposed after three occasions, and never applied

**Phase:** 4 · **Status:** Active

Three completed `growth-opportunity` episodes about one skill, each answered
"all the way", produce a suggestion beside the decision. The owner agrees or
says not yet. Nothing is written until he answers.

**Why three:** section 9's own rule — "meaningful growth-stage changes should not
be silently invented from one event" — and `PATIENCE` is 3 in `learning.ts` for
the same reason. A child who orders her own food once has had a good day.

**Why both answers are records.** Agreeing writes a `domain-update` saying what
changed; "not yet" writes a `coverage-update` saying the area was reviewed by
the person who would know. Both are read by the coverage engine as evidence
about that area, and both stop the suggestion returning on the same three
occasions. A button that records something nothing reads is D-029's mistake.

**Why it is a watershed and not a mute button** (D-047's shape): what suppresses
it is an answer given _after_ the evidence that raised it, so a fourth good
occasion is genuinely new.

**Amended by D-112 — the sequence, not the survivors.** The rule above counted
three _cleared_ occasions and the implementation built that list by discarding
every occasion that went the other way, then described what remained as "3 times
running". On a history of six occasions alternating all-the-way and
part-of-the-way, the app told the owner his daughter had handled it three times
running while the Fatherhood page displayed the alternating record on the next
screen. D-112 states the corrected rule in full. **What does not change: a
growth-stage change is still proposed and never applied, the owner still answers,
and nothing is written until he does.**

---

## D-071 — Coverage is reached through the situation; `derived` and `growth` are open

**Phase:** 4 · **Status:** Active

`derived` and `growth` join the modules a surface may import. `coverage` does
not — surfaces reach it through `situation`, which they already have.

**Why the first two are open:** neither chooses anything. They turn history into
canonical records, which is the surface's own job, and it is the same line
Phase 3 drew for `lifecycle`, `outcomes` and `corrections`. Note which half of
`growth` a surface touches: the suggestion arrives on the `Decision`, and what
Now imports is the function that writes down the answer.

**Why coverage is not:** the Life overview must show the coverage the decision
was made from, not a second computation over the same history. Two of those
would eventually disagree and the owner would have no way to tell which screen
was lying.

---

## D-072 — A move may declare what it exists to find out, and uncertainty says nothing about it

**Phase:** 4 (repair) · **Status:** Active

`Candidate.resolves` holds the concepts a move exists to settle. It is always a
subset of `leansOn`, empty for every ordinary generator, and non-empty only
where a move was proposed because something had gone quiet. `uncertainty` sets
those aside and judges what is left.

**Why:** DEF-0023. The coverage generator proposes a move because an area has
gone quiet and `uncertainty` then marked that same move down because the area
had gone quiet — the same fact, twice, in opposite directions, with the penalty
the larger of the two. On the evening built to demonstrate a seven-week gap the
differential was 0.054 against a score gap of 0.027, so section 8's third
refresh route was reliably cancelled by the thing that created it.

**Why not a compensating term**, which was the obvious alternative and is the
owner's explicit instruction: a positive weight big enough to overpower the
penalty is a number chosen to force an outcome, and it would be wrong by a
different amount on every other evening. Removing the double count leaves the
rest of the ranking to decide, which it does — a ten-minute recall serving a
live goal beats a twenty-five minute walk with none.

**Why abstaining and not rewarding.** The dimension returns zero at zero weight,
not the +0.4 a move earns for genuinely resting on known facts. Approving a move
for the gap it was created by is the same error wearing the other sign, and
D-048's rule supplies the shape: a dimension with nothing to say must cost
nothing to have.

**Why it is the class and not the case.** The money generator declares it too,
whenever the cash buffer is what is unknown. And the invariant is swept rather
than remembered: every `stale-evidence` candidate must declare the unknowns that
prompted it, across the whole scenario library, so a future refresh generator
fails the build rather than quietly cancelling itself.

---

## D-073 — A limiter carries its own label, because the honest word depends on the kind

**Phase:** 4 (repair) · **Status:** Active

`Limiter.label` is set beside `summary` from one table keyed on the kind, and
travels through `Explanation` so the two halves cannot be rendered apart.
Recovery, capacity and time read "What is in the way". A coverage gap reads
"Out of date".

**Why:** DEF-0024. Now hardcoded "What is in the way" for whatever the limiter
happened to be, and produced **"What is in the way — Nothing has come in about
career & learning for 7 weeks."** A quiet life area obstructs nothing; it is the
app's own blind spot, which D-063 states outright and `bottleneck-fit` already
scored at zero. The ranking knew and the screen did not.

**Why not one new universal label.** Something vague enough to cover both would
be wrong for the three kinds the old one was right for. A body that needs rest
really is in the way of an effortful evening, and saying so plainly is worth
more than a word that fits everything.

**Why on the limiter rather than in the surface:** the kind is in scope where
the limiter is built and nowhere else, and a second surface rendering the
summary would otherwise have to make the same judgement again.

---

## D-074 — The copy guard is a rule about claims, not a list of past mistakes

**Phase:** 4 (repair) · **Status:** Active

Two checks replace the four remembered sentences. Every deferral claim in
owner-facing copy must appear in a short acknowledged list with a reason. And
six capabilities the kernel demonstrably has — asking what came of a move,
watching what happens afterwards, learning from it, choosing and explaining,
keeping a canonical history, noticing a quiet area — are each proved by an
export that must exist, and may not be denied on any screen.

**Why:** DEF-0025. The old guard passed for two whole phases while Insights told
the owner the app was "not yet asking" for outcomes. A guard made of strings
somebody already got wrong can only ever catch the mistake somebody already
made, and copy of this kind goes stale silently: it looks deliberate, nothing
revisits it, and the only person who finds it is the owner on a phone.

**Why a burden inversion works where a longer list does not.** New copy that
says the app cannot do something now fails the build until a person either fixes
it or writes down why it is still true. The list grows with deliberate decisions
rather than with defects, and it is currently five entries long.

**Why the capability half matters as well:** it ties the claim to the code. If a
capability is genuinely removed one day, the proof fails first and names itself,
rather than the guard quietly enforcing a rule about something that no longer
exists.

---

## D-075 — Life groups by standing, and says each thing once

**Phase:** 4 (repair) · **Status:** Active

The overview lists areas wanting attention individually with the line that
explains each, and everything calm as a heading and a row of names, with the
group's explanation said once.

**Why:** DEF-0026. One row per domain followed the data structure rather than
the question the owner is asking, and with a whole sentence in a right-aligned
value slot it produced two and a half phone screens, seven of the eleven lines
identical. Every sentence was true; the screen was homework.

**What did not change, and it is the constraint that matters:** one coverage
computation. This is the same `CoverageState` from the same `assembleSituation`
the decision on Now was made from — presentation only, no second reading, no
questionnaire, no maintenance chores, and no cards added to fill space.

**Consequence for the private area:** it appears by name in whichever group it
falls into and shows its discreet line only where the group is being read line
by line anyway. Giving it a line unconditionally would drag its whole group into
the per-area layout, which on most histories is the seven-area quiet group — the
wall, straight back.

---

## D-076 — An emulated Android gate can stand as the owner's phone acceptance

**Phase:** 4 · **Status:** Active — **owner decision**

The Phase 4 acceptance was made on a Galaxy S24 browser context driven against
the deployed Preview, not on the owner's handset. He ran the earlier gate
himself, it failed on five counts, and he accepted the re-run of that same gate
against the repaired build as his acceptance.

**Why it is sound here:** what the gate actually exercised was the deployed
Preview at `1d52de4` over the network, at 360×780 with touch, a device pixel
ratio of 3 and an Android Chrome user agent — the same bytes his phone would
fetch, laid out the same way. The findings it produced are the proof: a
self-cancelling ranking, a label contradicting the ranking beneath it, two
screens describing an app from two phases earlier, a wall of repeated text, and
a sentence about his daughter that said the same thing twice. None of those came
from an assertion, and a narrow desktop viewport would have shown none of them.

**What it does not replace.** An emulated context cannot judge how something
feels in the hand, and section 37 keeps physical-phone validation mandatory for
important flows. This decision covers one acceptance where the owner had already
run the gate himself and was accepting a repair; it is not a standing
substitution, and section 24's design gate — bland, cave-like, lifeless — is
still his eyes and not a script's.

**Consequence:** later phases should run the Android context as part of the
gate rather than instead of it. Phase 4 is the evidence for that: every defect
it closed was invisible to 171 passing browser tests at three viewport widths.

---

## D-077 — A builder conversation may not approve its own phase

**Phase:** 4 → permanent · **Status:** Active — **owner decision, governs every remaining build phase**

From Phase 5 onward, a builder that believes an implementation is complete moves
the phase to **YELLOW — READY FOR INDEPENDENT QA** and never to GREEN. A fresh
conversation performs independent QA against the deployed checkpoint, writes
`docs/qa/PHASE_XX_QA_HANDOFF.md`, and recommends PASS or FAIL. QA tests and may
not change product code; the builder fixes and does not test its own repair. The
loop repeats in the same QA conversation until QA passes, and only then does the
owner return to the builder for the formal closeout.

The full protocol is [`docs/qa/README.md`](qa/README.md).

**Why:** Phase 4 is the argument. It passed everything it could measure — 574
unit tests, 171 browser tests at three viewport widths, a clean-checkout verify,
green CI, a matching Preview SHA — and then failed a phone gate on five counts,
three of them blocking. **Not one came from a failing assertion.** The builder
had written the tests, so the tests asked the questions the builder already knew
to ask; the defects lived exactly where its attention had not been. DEF-0023 is
the sharpest case: two individually correct halves of the ranking cancelling
each other, which no assertion about either half could have caught.

**Why a separate conversation rather than a second pass:** a reviewer who
inherits the author's model of why something is correct re-checks what the
author already checked. Section 43 already says an independent retest "may not
be cleared by the same reasoning context that authored the repairs it is
certifying" — this applies that rule one phase at a time instead of once at the
end.

**Why QA may not repair:** the moment the tester can fix, it stops looking for
what it cannot fix, and the report stops being a record of what was actually
wrong.

**What it does not replace:** section 56's independent adversarial hardening.
Per-phase QA asks whether this phase worked; section 56 asks whether the phases
break each other once they all exist. Both remain.

**Consequence for handoffs:** every builder response that ends a phase now
carries the QA prompt without being asked, and every intelligence-level
recommendation is the lowest level appropriate to the work rather than Max by
default — High for ordinary implementation, UI, domain wiring, documentation and
normal repairs; Max reserved for hard cross-system semantics, inference
mathematics, privacy or migration architecture, and genuinely ambiguous
root-cause work.

---

## D-078 — Eleven domains, ten baseline pages, and the pair that shares one

**Phase:** 4 · **Status:** Active

The model keeps **eleven** life domains. Phase 5 builds **ten** baseline pages.
The difference is not a dropped domain: section 50's first page, **Health &
Recovery**, covers two of section 4.1's domains — _Health & Physical Capacity_
and _Sleep & Recovery_. Every other entry maps one-to-one under looser naming
("Money" for _Money & Financial Resilience_, "Fatherhood / Adaya" for
_Fatherhood / Family_, "Long-Range Direction" for _Long-Range Direction /
Identity_).

**Why the plan is consistent rather than contradictory:** section 4.1 is titled
"Whole-life model, no domain shutoff" and is about the **model** — what the
engine reasons over, and what may never be switched off. Section 50 is a list of
**pages** — surfaces the owner navigates. A page is free to cover two domains
where the domains are read together, and these two are: section 23's own
Health / Physical Capacity list contains sleep, energy, soreness, recovery,
movement and workout readiness in one breath, and the engine already fuses them
in a single `Capacity` reading of hours slept, sleep debt, energy, soreness and
strain.

**Why it is worth a decision rather than a note:** the mismatch reads like an
off-by-one, and the two ways of "fixing" it are both wrong. Building eleven
pages splits a reading the engine takes as one. Building ten domains drops
_Sleep & Recovery_ from the model, which section 4.1 forbids outright and which
would silently break the coverage engine, the recovery limiter and G-005.

**The rule for Phase 5:** all eleven domains stay in the registry, every one
remains reportable on the Life overview, and every one is reachable from a page.
Ten pages, none omitted, none duplicated, and the Health & Recovery page names
both domains it covers.

---

## D-079 — Canonical plan adopted as v1.2

**Phase:** 4 → permanent · **Status:** Active

`docs/CANONICAL_REBUILD_PLAN.md` now holds the owner's v1.2 revision, copied
verbatim, replacing v1.1. Section 34 requires it verbatim; D-004's "copied
into repo as `docs/CANONICAL_REBUILD_PLAN.md`" step is what this decision
re-runs.

v1.2's own change log names four changes, and none of them reopen a completed
phase:

- the permanent independent-QA gate beginning at Phase 5 — already recorded as
  [[D-077]] and now also stated directly in the plan (section 43's "Permanent
  per-phase independent QA protocol", section 58);
- Phase 6 (section 51) extended with progressively disclosed evidence and
  analytics — a compact "See evidence" entry point from a Now recommendation, a
  Pattern Detail / Evidence view opened from an Insight, sample size,
  comparable situations, counterexamples, context, confidence, and a rate or
  likelihood only when the underlying quantity is well-defined and enough
  comparable evidence exists. No fake precision, no second recommendation
  engine, and no collapsing of direct result, downstream effect, comfort and
  follow-through into one generic percentage. This governs Phase 6 when the
  owner opens it; it changes nothing about Phase 5's scope;
- the eleven-domains/ten-pages clarification — already recorded as [[D-078]]
  and now stated directly in the plan (section 50);
- the per-phase independent QA workflow this project already built in
  [`docs/qa/README.md`](qa/README.md).

**Why this is a decision and not a silent file swap:** the plan is the second
rung of the authority order (plan section 1), and D-078's own case for a
decision applies here too — a document swap that looks routine is exactly the
kind of change that should be visible rather than inferred from a diff.

**What did not change:** Phase 4's approval, the deferred items from its
closeout, and every decision D-001 through D-078. v1.2 formalizes what D-077
and D-078 had already established; it does not amend them.

---

## D-080 — Every handoff recommends a Claude model, not only a level

**Phase:** 4 → permanent · **Status:** Active — **owner decision, applies to
every remaining checkpoint, QA, repair and phase handoff**

Section 43 already requires an intelligence level and a CURRENT/NEW
conversation instruction, each with a one-sentence reason, at every handoff.
From this decision forward, every handoff adds a third, parallel
recommendation: **which Claude model** to run that next step on. All three —
model, intelligence level, conversation — are stated outside the copy/paste
prompt, each with its own one-sentence reason, so the owner can set up the
next conversation before pasting anything.

**The rule:** choose the lowest model/effort combination that does not
materially risk quality. Do not default to the strongest available model or
to Max effort.

- Ordinary implementation, UI work, straightforward domain wiring,
  documentation, routine repairs, and ordinary independent QA → the current
  Sonnet-class coding model, at High when High is sufficient.
- Difficult cross-system semantic reasoning, learning/inference design,
  privacy architecture, migration architecture, unusually ambiguous
  root-cause analysis, or demanding adversarial reasoning → the current
  Opus-class model, at High or Max according to actual difficulty.
- Genuinely safe, mechanical, local work may use a cheaper/lower option.
- If Anthropic renames or replaces a model, recommend the closest current
  equivalent rather than preserving an obsolete name, and say that is what
  happened.

**Why:** this generalizes the intelligence-level rule already in
[[D-077]] and in [`docs/qa/README.md`](qa/README.md) — recommend for the job,
not for headroom — to the axis of which model runs the job at all. The two
choices are independent: a Sonnet-class model at High and an Opus-class model
at High are not the same recommendation, and collapsing them back into one
"intelligence level" line under-specifies the handoff.

**Where this is enforced:** [`docs/qa/README.md`](qa/README.md) carries the
full rule and the required-fields list for both the builder's YELLOW handoff
and the QA report's PASS/FAIL recommendation. `docs/NEXT_PROMPT.md` states the
model outside its copy/paste prompt, same as it already does for intelligence
level and conversation.

---

## D-081 — A domain page corrects a durable concept as context, and everything else as a fact

**Phase:** 5 · **Status:** Active

`factCorrectionRecord` and `contextCorrectionRecord` (`corrections.ts`) both
correct a concept reading, and a domain page's correction control picks
between them on one test: whether `ConceptDefinition.freshness.unit ===
'durable'`. Only `custodyArrangement` sets it in the starting registry.
Durable goes through `contextCorrectionRecord` with `durability: 'durable'`;
everything else goes through `factCorrectionRecord`.

**Why this is not a free choice.** `resolveOne` in `src/memory/facts.ts` picks
its candidate pool by the highest `scopeTier` present — `context` records
score 1 (durable) or 2 (situational), everything else scores 3 — and the
highest tier wins **outright, regardless of date**. An `explicit-fact` is
tier 3. Write one for `custodyArrangement`, whose freshness is `DURABLE` and
therefore never ages out of `bucket.applicable`, and it would outrank every
`context` record for that concept **forever**, including situational
exceptions written after it. The mechanism that lets a temporary exception
override a durable arrangement "for a window without erasing it" (section 8,
G-02) depends on the override arriving as a `context` record; a fact
correction on a durable concept would quietly turn that mechanism off for the
rest of the concept's history.

**Why `childPresent` still goes through `factCorrectionRecord`.** Its
freshness is `localDays(1)`, not durable, so a fact correction there behaves
exactly like tonight's guide answer already does: it wins for about a day and
then ages out of `applicable`, at which point whatever `context` is currently
in force — durable or situational — resumes answering the concept. That is
the same "a statement about tonight beats a temporary arrangement, which
beats a standing one" rule `situation.ts` already documents, so a domain-page
correction of `childPresent` needed no new mechanism, only the existing one
reached from a second surface.

**Why the rule reads the registry rather than a hardcoded concept list.** A
future durable concept — a home address, a standing work arrangement — gets
the correct behaviour automatically, from the same `freshness` field that
already governs everything else about how that concept ages. Naming
`custodyArrangement` specifically in the domain page would be section 4.5's
mistake in a new place: a rule that has to be remembered to be extended
correctly rather than one that extends itself.

**Consequence:** `tests/synthetic/domain-corrections.test.ts` proves the
`context` half — a situational correction overriding a durable one for a
window and reverting after — and the browser suite
(`tests/browser/life-domain.spec.ts`) proves the closed-option control on
`childPresent` writes and reads back correctly from the fatherhood page. No
regression test proves the `explicit-fact`-outranks-context-forever failure
directly, because `contextCorrectionRecord` makes it structurally
unreachable from the domain page rather than merely discouraged.

---

## D-082 — Every independent QA handoff outputs the complete next prompt, automatically

**Phase:** 5 → permanent · **Status:** Active — **owner decision, governs every
remaining QA run and retest**

Independent QA's response — first run or retest, PASS or FAIL — must end with
the complete ready-to-paste next prompt, in the same response, without the
owner asking for one. Alongside it: the QA-tested product SHA, the QA-report
commit SHA if the report was committed, the exact report path, and the
recommended Claude model, intelligence level, and conversation instruction for
the next action, each with a one-sentence reason. On FAIL, the prompt is
addressed to **CURRENT — the original builder conversation** and instructs it
to read the report, stay YELLOW, repair under section 42, preserve everything
already passed and every explicit deferral, deploy a repaired checkpoint, and
give a retest prompt for the same QA conversation. On PASS, the prompt is
addressed to that same builder conversation and instructs it to confirm the
tested SHA and the PASS, perform the formal GREEN closeout, update the
governing docs, preserve deferred items, and provide the next phase's
recommendation and prompt.

**Why:** Phase 5's first QA run is the case. It returned FAIL with a
recommended next action — "the original builder conversation, Sonnet-class at
High" — but no prompt to paste into it. The owner had to return with an
explicit request before the repair could start. Section 43 already required
this discipline of the _builder's_ handoffs (D-011's "ready-to-paste next
prompt immediately," restated for QA at D-077); this decision closes the one
place the same requirement had not yet been written down for QA's own output,
and [`qa/README.md`](qa/README.md)'s section 3a is where the full rule lives.

**Why QA rather than the owner assembles it:** QA holds the exact
reproduction, the defect class, and the acceptance expectation the moment it
finishes testing. Deferring the prompt to a later turn re-derives from a
report what QA already knows, and is the same "wasted turn" section 43
already argues against for the builder side.

**What this does not change:** QA still does not prescribe the implementation
fix — the FAIL prompt gives reproductions, defect class, evidence and
acceptance expectations, and leaves root-cause repair to the builder. The
conversation-routing rule is unchanged (NEW for a first QA run, SAME for a
retest, CURRENT for the builder either way); this decision only requires that
the prompt following that routing rule actually gets produced, every time,
without being asked for.

**Where this is enforced:** [`docs/qa/README.md`](qa/README.md) section 3a
carries the full rule. [`docs/CANONICAL_REBUILD_PLAN.md`](CANONICAL_REBUILD_PLAN.md)
section 43 states it directly in the QA report contract and defect loop, as a
v1.2 addendum rather than a new plan version — it completes a QA gate v1.2
already added (D-079) rather than introducing a new one.

---

## D-083 — A handoff that writes to an existing handoff MD also closes with a short launcher, separate from the full prompt

**Phase:** 5 → permanent · **Status:** Active — **owner decision, governs
every builder and QA response that writes or updates
`docs/NEXT_PROMPT.md` or a `docs/qa/PHASE_XX_QA_HANDOFF.md`**

D-082 fixed QA's handoff so the complete next prompt is always produced
automatically, in the same response, on both PASS and FAIL. It did not say
where that prompt has to live relative to the chat. Section 43's prompt
presentation format already asks for the complete prompt printed in the
response every time, and D-082 inherited that shape for QA — so the same
several-hundred-line prompt has been appearing twice: once written into the
governing MD, once again pasted into the chat response.

This decision keeps the MD file requirement exactly as it was and adds a
second, separate ending to the chat response. Whenever a builder or QA
response writes or updates `docs/NEXT_PROMPT.md` or a
`docs/qa/PHASE_XX_QA_HANDOFF.md` — a builder's YELLOW handoff, a QA run or
retest on either PASS or FAIL, a repair handoff, or a GREEN closeout — the
response still writes the complete prompt into that MD file, exactly as
section 43 and `qa/README.md` section 3a already require. The response then
also ends with a short, standalone launcher block:

- the recommended Claude **model**;
- the recommended **intelligence level**;
- the **conversation** instruction — NEW, CURRENT, or SAME;
- a short ready-to-copy **launcher prompt** that names the repository path,
  the exact MD file the next conversation must read
  (`docs/NEXT_PROMPT.md`, or the specific
  `docs/qa/PHASE_XX_QA_HANDOFF.md`), which handoff it is executing, an
  instruction to read that file in full and execute it exactly as written,
  and an instruction not to ask the owner to paste the file's contents back.

**Why:** the owner should never have to open GitHub and hunt for the next
prompt, and should also not have to read the same prompt twice — once
because it is genuinely needed, once again because that was the only way to
satisfy the "print the next prompt" rule. Printing the whole thing a second
time in the chat solved the first problem by recreating a version of the
second: Phase 6's own kickoff prompt is long enough that finding "what do I
actually do next" inside it, a second time, is itself work. A launcher that
just says which file to read and to execute it as written removes that
without touching what gets written to disk.

**What this does not change:** the governing MD — `docs/NEXT_PROMPT.md`, or
the relevant `docs/qa/PHASE_XX_QA_HANDOFF.md` — still must carry the
complete prompt, per section 43's prompt presentation format and, for QA,
D-082 and `qa/README.md` section 3a. This decision does not create a new
handoff file type and does not shorten what is written to either file; it
only gives the chat response's closing block a second, shorter form in
addition to the file write.

**Where this is enforced:**
[`docs/CANONICAL_REBUILD_PLAN.md`](CANONICAL_REBUILD_PLAN.md) section 43
states the launcher block directly, alongside the existing prompt
presentation format. [`docs/qa/README.md`](qa/README.md) section 3a is
amended to require it alongside the existing next-prompt rule, for every QA
PASS and FAIL. It applies equally to builder handoffs under section 43,
which is where the requirement is stated for that side.

---

## D-084 — A number reaches an owner surface only through the thing that names what it measures

**Phase:** 6 · **Status:** Active

There is one `MeasuredRate` type and one component that can render it
(`src/features/evidence/EvidencePieces.tsx`). The type carries the aspect, a
sentence naming the quantity in ordinary words, its own numerator and its own
denominator; the component renders all four together. A guard in
`tests/unit/architecture-guards.test.ts` fails the build if any other owner
surface prints a per-cent sign or multiplies by a hundred. The QA laboratory is
exempt and says why — it is a developer surface whose job is the machinery
(section 35), and it is not in a production build.

Four aspects, and there is no fifth: **follow-through**, **direct result**,
**downstream effect**, **comfort**. A rate for one is never combined with a rate
for another, and a sweep fails on an aspect whose name contains "success",
"overall", "effectiveness", "score" or "total".

**Why:** section 51 states the rule — _"Any percentage must identify the
quantity it measures. Do not merge direct result, downstream effect,
comfort/friction, or follow-through into one generic success statistic."_ —
and DEF-0020 is the record of what happens when four facts share one carrier
because nothing stopped them. A rule about how a number is worded cannot be kept
by everyone remembering it at each call site. It can be kept by there being one
place that knows how, taking the whole rate, so that printing the figure without
its sentence is not something a caller is able to do.

**The threshold is four, and it is defensible rather than round.** `PATIENCE` in
`learning.ts` is 3 — where observation starts outweighing the starting belief —
so a figure the app is willing to _print_ should rest on more evidence than it
takes to move a belief a quarter of the way. `tests/unit/insights-copy.test.ts`
asserts that relationship rather than the number, so re-tuning either forces the
other to be reconsidered.

**Below it, the figure is withheld with the reason and the count.** That is
G-009's "unknown stays unknown" applied to a pattern: the app would rather say
it cannot tell yet than manufacture a figure, and showing how far off it is
("only 2 so far") is more useful than silence. `MeasuredRate.percent` and
`.withheld` are exactly one of the two, never both and never neither, which
makes the honest state a value the type can hold rather than a case a surface
has to remember to check for.

---

## D-085 — Insights reads the situation's learning index and may never build one

**Phase:** 6 · **Status:** Active

`src/intelligence/insights.ts` joins the modules a surface may import. It reads
beliefs off `situation.learning` — the index the decision on Now was made from —
and takes its raw counts over the episode set that same index selects, through
`comparableEpisodes`, now exported from `learning.ts` for that purpose.

Three things are structural rather than promised, each with a reintroduction
proved to fail:

- it cannot reach `candidates`, `constraints`, `evaluate`, `arbitrate` or
  `advisor`, so it has nowhere to obtain a recommendation from;
- it cannot reach `renderRecommendation`, so a card physically cannot print an
  instruction;
- it cannot call `buildLearning` or `noLearning`, so it cannot compute beliefs
  of its own.

**Why the module is open at all, when `learning` is closed.** The reason
`learning` is closed is that a surface reading it directly could put a number on
screen the arbitration never saw. `insights` does not have that property: every
figure it shows is over the evidence the arbitration used, because it is handed
the same index and the same selection rather than repeating either. That is
D-071's argument for coverage — _the status Life shows is the object the
decision was made from, and two computations over one history would eventually
disagree with the owner unable to tell which screen was lying_ — applied to a
second reader.

**Why one definition of "a situation like this one" matters more here than
anywhere else.** Insights counts raw answers over the set a belief was computed
from. If it drew that set with a filter of its own, a card would eventually say
"4 evenings like tonight" over a belief that had counted five, and nothing on
either screen would explain the difference. That is DEF-0033's shape with
numbers instead of sentences.

---

## D-086 — One card per move about what happens when you do it

**Phase:** 6 · **Status:** Active

Four cards can describe the same run of episodes — a context split, a change
over time, a counterexample against the run, and the flat pattern. At most one
reaches the screen, chosen in that order, and the split and the trend are still
computed and still reach the deeper view whichever wins.

**Why the order.** A context split _explains_ the exceptions rather than
reporting them. On twelve evenings clearing the kitchen, "usually helps, and on
20 June it did not" presents as random what is in fact systematic: it helped on
all six weekday evenings and on two of six weekends. A change subsumes the
single counterexample that signalled it, and both subsume the flat average —
which on that history is eight of twelve, true, and a description of an evening
that never happened.

**Why only one.** Printing two would put "Getting out for a walk usually makes a
difference" directly above "Getting out for a walk has not been going as well
since May", both true, both from the same episodes, and the screen as a whole
wrong. That is DEF-0033's class: a contradiction between two lines the reader
has no way to reconcile. The card that reports the _age_ of the evidence stands
beside whichever won, because it answers a different question from what the
evidence says.

**Consequence, and it is the reason this is a decision rather than a
preference:** a finding that does not win the headline is not lost. It is in the
Pattern Detail under "where it looks different" or "earlier and later", which is
where section 51 puts both of them anyway.

---

## D-087 — Timeline offers nothing to press, and no filter

**Phase:** 6 · **Status:** Active

Timeline is the only primary destination with no action on it: no button but
the pager, no field, no correction, and no import of `corrections`, `lifecycle`,
`outcomes` or `growth`. A guard counts the click handlers and fails on a second
one.

**Why:** section 26 requires that Timeline "never create phantom actionable
items from corrupt data". The usual way to satisfy that is to check that corrupt
rows produce no action, which proves it for the corruption somebody thought of.
This proves it for all of them, including the ones nobody has written a fixture
for yet: there is nothing on the surface for a corrupt row to produce.

**Where corrections live instead.** Beside the claim. Now carries the
correction for the belief it states, and a domain page carries the corrections
for the readings it shows. Timeline makes no claim — it is the record — so
there is nothing on it to disagree with.

**No filter, and it is section 51's own wording:** "filters if actually needed,
not by default". Day headings plus a page that grows on request do the work a
filter would on every history in the library. This is worth revisiting when a
real history makes scrolling to a known area genuinely tedious; a control
nobody needs is one that has to be maintained and understood.

---

## D-088 — A record's line is written once; the surfaces differ in what they ask for

**Phase:** 6 · **Status:** Active

`src/features/history/describe.ts` turns one canonical record into one line and
a short owner-facing word for its kind. Timeline and a domain page's "Recently"
panel both read it. They differ in two things and only two: **which record kinds
they ask about**, and **what discretion they owe** — Timeline is a primary
surface and fixes `DISCREET_PRIMARY`; a domain page is inspection, and reveals
private detail only on the page that is for it.

**Why shared.** DEF-0028 and DEF-0029 were both the same defect — a line failing
to say what it was about — found separately on two record kinds. Fixing that
twice, in two files, is how one of them gets fixed and the other does not.

**What the owner's deferral covers, and what it does not.** The owner deferred
rebuilding a domain page's panel to match the whole-life surface: it is still
domain-scoped, still narrower, still shows its own thirteen record kinds and not
Timeline's twenty. That stands untouched. What is shared is the _wording_ of a
line, which was never what the deferral was about.

**One rule the shared version adds.** Every line is written to read correctly
with no tag beside it, because a domain page shows none. An outcome says which
of the three questions it answers in the sentence itself — "How far clearing the
kitchen got: completely" against "What clearing the kitchen was worth: a real
difference" — rather than leaving that to a label only one of the two surfaces
renders. That also keeps Timeline from printing the same word twice in a row,
which is section 61's repeated boilerplate.

**A latent hole closed on the way past.** Phase 5's panel rendered every matched
record's detail unconditionally, so a record tagged with both `home` and
`private-health` would have shown its private detail on the Home page. No
history in the library has such a record, so nothing observable changes — but
the rule is now the same one Timeline obeys rather than an accident of how the
fixtures happen to be tagged.

---

## D-089 — Observe first: the system performs the causal inference, never the owner

**Phase:** 6 (QA repair) · **Status:** Active — **owner decision, raised by the
owner after Phase 6's first QA pass, and governing every phase from here**

The app may ask the owner what happened and how he is. It may not ask him what
an action _did_ for him. Working out whether one thing follows another is the
thing the system exists to do, and asking him to do it is asking him to hand
over the answer and then be shown it back as a finding.

**The principle, in order of preference:**

1. **observe first** — read what the ordinary record already contains;
2. **infer cautiously** — and say the inference is one;
3. **ask for a concrete fact** when one is needed and nothing supplies it;
4. **ask for current subjective state** when that state is itself what matters —
   how he feels is a fact only he holds, and asking for it is not the problem;
5. **never ask the owner for the causal relationship the system exists to
   learn.**

### What this was found by

QA-A1, raised by the owner from one sentence on Now: _"How much did a walk do
for you?"_, answered **A real difference / Some difference / Not much /
Backfired**.

That question asks for the walk's contribution against an unstated
counterfactual, and grades it. It is generated for nine of the fifteen action
verbs — every one whose profile lists `effect`. The answer is stored as an
`outcome` record with `aspect: 'effect'`, and `effectFor` in `learning.ts` has
no other source: `gather` selects on the aspect and nothing else, by an explicit
design note that says it "asks nothing about where the record came from". The
observe-first path that does exist, `derived.ts`, is gated to three verbs and one
concept.

On "Nine months of evenings" — the history built to demonstrate section 51 —
**forty-six of the forty-six figures Insights prints are tallies of the owner's
own judgments**, and none is worked out from a reading. The flagship line reads
_"How often clearing the kitchen made a difference afterwards — 67% — 8 of 12."_
The label asserts an observed fact about the world; the denominator counts
opinions. Both halves are honest and the sentence they form is not.

### Five consequences, each binding

**1. Who inferred it is part of what a figure means.** DEF-0020 separated four
facts that had shared one carrier. It never asked _who supplies the effect_, and
section 51's percentage rule requires a figure to name the quantity it measures
without requiring it to name who performed the inference. **A figure built from
the owner's judgments and a figure built from observed state may not render as
the same kind of claim**, and no owner surface may present an aggregate of
attributions in language that asserts an observed fact.

**2. Association is never written as causation, in either direction.** A learned
relationship reads _"on evenings like these, your energy an hour later has
usually been higher than on evenings without a walk"_ and never _"walks improve
your energy"_. This **generalizes D-066** rather than overturning it: D-066
forbids inference concluding harm, and the rule is now that inference concludes
no causal direction at all. A worse state after an action is a worse state.

**3. A relationship claim requires a comparison group.** Comparable situations
where the action did _not_ happen must be identifiable and counted. Without
them a figure describes the evenings that happened to include a walk; it is not
evidence about walks. This needs no new sensors — `energy` is already
`materialToDecision: true, askWhenStale: true`, so readings on evenings without
an action are already being collected.

**4. Absence of evidence stays a first-class answer.** Missing before- or
after-observations produce an honest "not enough to say", never a figure
computed over whichever occasions happen to have both. G-009's rule, applied to
a relationship.

**5. History keeps its original meaning.** Every existing
`aspect: 'effect'` record is an owner attribution and stays exactly that — not
relabelled, not reinterpreted as an observation, not deleted. This is the
owner's explicit instruction and it is why the observed quantity is **additive**
rather than a redefinition of `effect`.

### What this does not say

It does not say stop asking how he feels. Current state is a fact only he holds,
and step 4 asks for it deliberately. What is removed is the demand that he
supply the _relationship_ between an action and that state.

It does not say the owner may never offer an opinion. Where a move has no
observable state dimension the app could read, the attribution question is kept
— and it is then labelled as his view wherever it is shown, rather than dressed
as a measurement.

It does not reopen Phase 1's canonical record layer, which is sound: records
already carry a concept, a value and an `occurredAt`, and episodes already carry
`shownAt`, `settledAt` and their context. The raw material for the join was
always there. What was missing was the collection, the computation and the
words.

### Which decisions this touches

- **D-066 — generalized, not overturned.** Its rule becomes the special case of
  a broader one.
- **D-054 — incomplete rather than wrong.** Its three aspects are all judgments
  _about an action_; what was missing is a class that is not, and the
  distinction between an owner attribution and a system finding.
- **D-064 — revisited.** `effectStepForSleep` maps an absolute reading against a
  fixed baseline with no comparison to nights without the wind-down, so it is
  itself an attribution, acknowledged only as a reliability discount. Its four
  owner conditions all still hold and none of them is reopened; what changes is
  that the app stops _extending_ that shape to new concepts. The reading and the
  relationship are separate objects from here.
- **D-069 — generalized.** "Ask for the reading, not for the verdict" was
  written for one concept judged the next morning. It is now the rule wherever a
  move declares an observable state dimension.

### Where this is enforced

`docs/CANONICAL_REBUILD_PLAN.md` sections 20 and 51 state it directly, as
owner-approved amendments under section 1. In code:
`MoveProfile.affects` declares the state dimension a move is expected to move;
`outcomes.ts` asks for that reading instead of the grade; `association.ts`
computes the relationship against a comparison group and is the only thing
allowed to state one; and `tests/unit/architecture-guards.test.ts` fails the
build if an owner surface renders an attribution-derived figure in observed-fact
language.

---

## D-090 — Independent QA runs in Codex, begins cold, and audits meaning before it duplicates gates

**Phase:** 6 (second QA repair) · **Status:** Active — **owner decision,
governing every phase from here**

Independent QA moves permanently from Claude to **Codex**. Claude remains the
builder. The loop is unchanged in shape and changed in who runs which half:

> Claude builds → **Codex** independent QA (NEW conversation) → Claude repairs →
> the **same** Codex conversation retests → PASS → Claude GREEN closeout → next
> phase.

D-077 is not overturned; it is satisfied more strictly. Its rule was never "a
different Claude conversation" — it was **the reviewer must not inherit the
author's model of why the thing is correct**. Two conversations of the same
model, reading the same documents, reach the same reading of them. Phase 6 is
the demonstration: a Claude QA conversation checked section 51's gate item by
item, passed it, and had to withdraw the pass when the owner read one sentence
on Now. The gate was checked correctly and the screen was not honest.

### The order Codex works in

Cold first, and the order is the decision.

1. **Sealed cold owner-use.** Open the deployed Preview at a normal Now, as the
   owner, **before reading any repository document**. Use it. Write down what it
   appears to claim.
2. **Claim-to-evidence semantic audit.** For each claim the screens make, find
   what it actually rests on. Every defect in Phase 6's three rounds was a claim
   printed wider than its evidence, and every one of them was visible here.
3. **Semantic and product correctness.** Does the app mean what it says, and is
   what it says worth saying?
4. **Targeted phase acceptance.** The phase's own gate, now that the meaning is
   understood.
5. **Targeted known-defect regression.** The ledger's entries for surfaces this
   phase touched.
6. **Architecture inspection where warranted** — where a defect suggests the
   boundary rather than the line is wrong.
7. **Full-suite duplication only on a concrete trigger**: a builder claim that
   does not match observed behaviour, a suspected false-green, or a change to
   the harness itself.

**Green builder tests are evidence.** Re-running a suite the builder already ran
green, to watch it go green again, buys nothing and costs the attention that
steps 1 and 2 need. This makes QA leaner, not weaker: the three rounds of Phase
6 were lost to things no suite was asked, and found by somebody using the app.

### Why cold, and why sealed

The audit that produced this decision found seven blockers in a phase that had
already passed independent QA once, been repaired, and had 22 purpose-written
regressions passing over it. It found them by using the app first. A reviewer
who reads `D-089` before opening Now already knows what the walk card is
_supposed_ to mean, and will read the screen as confirming it.

### What does not change

- The builder never approves its own phase, and never marks GREEN (D-077).
- The report path stays `docs/qa/PHASE_XX_QA_HANDOFF.md`. **No new file type.**
- Every QA run and retest still ends with the complete next handoff (D-082) and
  a short launcher (D-083).
- The builder may not edit the QA report; QA may not edit product code.
- Phase status, deferrals and the defect ledger stay the builder's to write.

### The handoff standard this changes

A handoff names the model, the level and the conversation **for whoever runs the
next step**, which is no longer always Claude:

- **Builder handoffs** name the Claude model, the intelligence level, and
  CURRENT/NEW, each with a one-sentence reason.
- **QA handoffs** name the **Codex model**, the **Codex reasoning level**, and
  **NEW or SAME**, each with a one-sentence reason. First QA run of a phase is
  **NEW**; a retest after a builder repair is **SAME**.

D-080's rule carries over unchanged in substance: recommend the lowest
model/effort that does not materially risk quality, for whichever system is
being addressed. Do not mechanically reach for the strongest Codex model or the
highest reasoning level.

---

## D-091 — A learned claim is scoped to the evidence under it, and the owner can overrule it

**Phase:** 6 (second QA repair) · **Status:** Active — **owner decision,
governing every phase from here**

D-089 said the system must do the inference rather than ask the owner for it.
This says how far the result may then be stated. An independent cold-use audit
found the app doing the inference and then printing it wider than the evidence
underneath it, in five separate ways — the same failure as DEF-0020 and QA-A1,
one layer further in.

Seven invariants. They apply to anything the app works out, not only to the
first thing that worked anything out.

**1 — ACTION IDENTITY.** A learned relationship is scoped to the semantic
action: verb **and** object. Never the verb alone. Four walks followed by higher
energy and four bike rides followed by lower energy are two findings, and
pooling them produced "no different" printed as a finding about _a walk_. Two
objects may be aggregated only through an explicit, named, reasoned entry in an
interchangeable-action registry (`ACTION_FAMILIES`), which starts empty. **A
finding the app cannot name is a finding it may not state** — falling back to
the verb's phrase would print two different findings under one sentence, which
is the same defect in the copy after it was fixed in the arithmetic.

**2 — NEGATIVE EXPOSURE.** Three states, not two: the action was **present**,
the action was **absent**, or the record is **silent**. Absence must be
positively recorded — the move was put in front of him and he declined it or
could not. Silence is **unknown**, belongs to no comparison group, is counted,
and is reported. _Missing evidence is not negative evidence._ Where there is no
legitimate comparison group, the app abstains and says why.

**3 — CONTEXT.** Context must be able to change a learned relationship, and a
global relationship may not drive a contextual recommendation when the contexts
it covers materially disagree. Where two supported contexts disagree, the
whole-record figure describes an occasion that never happened: it is not
softened and not printed with a caveat beside it — it is not printed. The
applicable reading is the one for the occasion being asked about, or nothing.

**4 — CONFOUNDING.** The classes of recorded evidence that invalidate a
before-and-after are named, checked, and stated. The app may claim only the
check it ran. "Nothing else happened in between" is a claim about his life; what
the app knows is which recorded classes it looked in.

**5 — CORRECTABILITY.** Every conclusion the app reaches on its own carries a
correction identity, scoped as the conclusion is scoped, so the owner can reject
the interpretation without rewriting the history under it. **Preserve history.
Correct future interpretation.** A rejection is a watershed, not a silence: what
came before it stops counting toward that conclusion, what comes after counts
normally, and the app may reach the opposite conclusion later from evidence he
has not disputed.

**6 — TRACKED STATE MEANING.** A tracked dimension has a stable construct, a
stable scale and a stable direction, and dimensions are not collapsed into one
another. Mood, stress, confidence and motivation are four things; a single
generic emotional quantity standing for all of them is the wellness score the
owner rules out. Which dimensions exist is the owner's to say — inventing a
taxonomy to fill the field in is the mistake D-089 is about. `emotionalState`
remains one undivided dimension and an **open question for the owner**.

**7 — HISTORICAL ORDER.** Anything that presents history as a sequence orders it
canonically: `occurredAt`, then `recordedAt`, then id. A correction is always
about the same moment as the thing it corrects, so `occurredAt` alone can never
separate the two, and a list sorted on it alone shows an order of events that
did not happen.

**8 — SYNTHETIC AND REAL NEVER SHARE A STORE.** A synthetic history is not a
version of the owner's life and may never be written over it. The laboratory
keeps its own database; nothing it does can reach his; and a fixture stays
inspectable from every normal surface — which is precisely why every normal
surface must **say whose evening is on screen** while one is loaded, and offer
one press back to his own.

This is not a new rule. `indexedDbStore.ts` carried it from Phase 1: without a
database name per target, "synthetic QA data would land in the same place as
real history — exactly the separation section 33 requires." It had been applied
between Preview and production and never between the laboratory and the owner,
and the owner lost real records to the gap (DEF-0054). **A separation is only
drawn where somebody drew it**; the axis nobody looked at is where the data goes.

### And one that is not about learning

**Freshness language.** _How recently has anything come in about this_ and _is
what the app believes about this still good_ are two questions about two
different things. No surface may answer the second with the first, and neither
concept absorbs the other. Anything out of date says so on its own row, where it
can name itself.

### Where this is enforced

`src/intelligence/association.ts` holds 1–5 in the computation and says so in
its own header. `src/features/life/domainPages.ts` and
`src/features/life/standing.ts` hold 7 and the freshness rule.
`src/domain/concepts.ts` holds 6 — and holds it by naming the value shape a
tracked reading takes, so the declaration can be checked against `numericValue`
rather than believed (DEF-0056). `src/features/memory/MemoryProvider.tsx` holds 8. The regression architecture is
`tests/synthetic/observed-relationships.test.ts` — one describe block per
invariant, each proved to fail when its own defect is reintroduced — with the
two owner-surface invariants in `tests/synthetic/domain-page-data.test.ts` and
`tests/unit/life-pages.test.ts`.

---

## D-092 — Every handoff ends with four lines and a launcher, in the response itself

**Phase:** 6 (Round 4 repair) · **Status:** Active — **owner decision, governing
every handoff in every direction from here**

The owner must never have to hunt through a report for the next instruction, and
must never have to copy a long prompt out of one. Every handoff response —
without exception and without being asked — **ends** with:

1. **Model** — the Claude model where the next step is the builder's, the Codex
   model where it is QA's.
2. **Reasoning / intelligence level.**
3. **Conversation** — NEW, CURRENT or SAME, and which system it addresses.
4. **A short, complete, copyable launcher**, printed in the response, that names
   the repository path and the exact MD file to read, and instructs the next
   conversation to read that file in full and execute it — never asking the
   owner to paste anything.

### Which handoffs

All of them, in both directions:

- builder → QA (a phase reaching YELLOW),
- QA → builder (PASS or FAIL),
- repair → retest (back to the SAME QA conversation),
- PASS → GREEN closeout,
- phase → phase.

### Where the detail lives

**In the repository, not in the response.** The full instructions stay in the
governing MD files, which is what the launcher points at:

- `docs/NEXT_PROMPT.md` — what the builder writes for whoever acts next.
- `docs/qa/PHASE_XX_QA_HANDOFF.md` — what QA writes, and QA alone.

**No new file type.** This decision adds nothing to the repository's shape; it
constrains the last four lines of a response.

### What this changes about D-082 and D-083

Neither is overturned and both are tightened. D-082 said a QA handoff must
carry the complete next prompt automatically; D-083 said a response that writes
one into an MD may close with a short launcher instead of repeating it. This
makes the launcher **mandatory rather than permitted**, extends it to builder
handoffs as well as QA ones, and fixes the four lines that precede it.

The reason is the same one D-082 was written for, one step further on: a
recommendation the owner has to assemble is a recommendation that costs him a
turn. Round 4's handoff was correct and complete in the repository and still
left him reading a long report to find the paste-able part.

### What it does not license

It does not shorten what gets written to the MD files — the full prompt still
goes there in full. It does not let a builder mark its own phase GREEN, and it
does not let a builder write the QA report or QA write product code (D-077,
D-090). A launcher is how a handoff ends, not what a handoff is.

---

## D-093 — A backup is of the owner's own store, and a restore only ever runs on his own history

**Phase:** 7 · **Status:** Active

Two operations, one rule, and it is D-091's eighth invariant applied to the two
places where getting it wrong cannot be undone by pressing something again.

**A backup reads the owner's store, whatever is on screen.** Not the active
one. The laboratory is inspectable from every surface — that is the point of it
— so a backup taken while a fixture is loaded would be a backup of an invented
life, filed under his name, and discovered six months later on the evening he
needed the real one. `MemoryContextValue.ownerSnapshot()` exists for exactly
this and is deliberately not `snapshot`.

**A restore does not run at all while a fixture is on screen.** It replaces his
only copy of his own history, and the one thing that must not be in doubt at
that moment is which history is about to be replaced. Putting the laboratory
away is one press and it is the press the shell already offers, so the cost is
a tap; the alternative was a screen where the notice says "this is a test
history, not yours" directly above a button that replaces yours.

**Why not simply restore into the owner's store and switch to it.** That was
the first design and it is worse in a specific way: it makes a restore
_implicitly_ empty the laboratory, so one press does two destructive things,
and the second is invisible in the preview the owner just read. A refusal that
names its own remedy is smaller and it is honest.

**What the refusal is called.** `RestoreStage` carries `not-attempted`
alongside the stages that mean something was read or written. "The app declined
to start" and "the app started and put everything back" are different sentences
to somebody deciding what to do next, and collapsing them into "restore failed"
is the failure mode section 29 calls a false report.

---

## D-094 — An export is chosen by section; the domains in it are reported, not chosen

**Phase:** 7 · **Status:** Active

Canonical plan section 52 asks for "section selection" and, separately, for the
document to carry "current selected domains". Those can be read as two
controls. They are one control and one **report**.

**The unit of choice is a section.** A domain-by-domain chooser lets the owner
build a document that contradicts itself — the learned relationships kept, the
history they were learned from dropped — and an assistant reading it has no way
to tell that a claim's evidence was removed from under it. A section is a
coherent thing to include or leave out: what the app reasons from, what it has
worked out, what it has been told, what it knows it does not know.

**The domains are then read off the records actually in the document.** That
satisfies "current selected domains" with something checkable instead of a
second control that could disagree with the contents.

### The private section, and the two things that are not allowed to touch it

Section 11 pulls both ways at once: private detail should not appear on
ordinary surfaces unasked, and it must never be technically impossible to
export. So the section exists, and:

- **Select all does not reach it.** A control labelled "select all" is not the
  owner deciding to share the most sensitive thing the app holds. `inSelectAll`
  is a field on the registry with exactly one `false` in it, and the exception
  is the reason the field exists.
- **It is never remembered.** Every other section is a preference; that one is
  a decision, and a decision made once on one evening should not silently apply
  to every export afterwards. It starts off each time.
- **The document says which way round it is, either way.** Silence would leave
  a reader unable to tell a life with nothing private recorded from a document
  with that part taken out, so both the header and the prompt state it.

### And the source, always

The header names whose history was composed, and a document built from a
fixture says outright that it is not a real person's record. Same rule as the
notice in the app shell, one artefact further out — and this artefact is the
one that leaves the device.

---

## D-095 — Integrity is a content fingerprint; authenticated validation is deferred, and says so

**Phase:** 7 · **Status:** Active

Section 29 asks for "integrity metadata" and separately notes that
"authenticated/tamper validation and structural validation are separate
concerns". This build ships two of those three and names the third as absent
rather than letting a checksum stand in for it.

**Structural validation** is `snapshotFromWire` — the same reader the QA
laboratory uses, so a row that cannot be read becomes an inspectable malformed
row rather than an exception.

**Integrity** is a SHA-256 over the canonically ordered, key-sorted contents.
It catches a file truncated by a failed download, mangled by an editor, or
corrupted in storage, and it survives reformatting and key reordering — a
restore should refuse a damaged file and accept a re-indented one.

**Authenticated validation is not built, and cannot honestly be.** The
algorithm is public, so anyone editing the contents can recompute the
fingerprint; it proves the file is intact, never that this app wrote it. A real
tamper check needs a key, and there is nowhere on a device to keep one that an
attacker holding the device could not also read. Recording it as a deliberate
deferral is worth more than a checksum wearing a signature's name.

`sha256Hex` is written out rather than reached for through `crypto.subtle`,
because that API is asynchronous and absent or partial in several environments
this code runs in — and a restore whose guarantee depended on where it ran
would not be a guarantee. It is proved against published vectors and against
Node's own implementation across every block-boundary length.

---

## D-096 — Data is a destination of its own, reached from More

**Phase:** 7 · **Status:** Active

Section 5 fixes four primary destinations and the bottom bar still holds
exactly those four. Data joins More and QA as a secondary destination with its
own route rather than becoming a panel inside More.

**Why a route.** G-012 requires Data and restore to stay reachable while the
app is in a degraded state, and a route resolves from a typed address and a
bookmark — where a panel three scrolls down another screen depends on that
screen rendering first. It also carries a whole export composer, a backup and a
restore, which is more than a panel's worth of surface.

**Why not a fifth tab.** For the reason section 5 gives and Phase 1 already
learned once: a secondary surface promoted for convenience is how four primary
destinations quietly become five.

---

## D-097 — A handoff never asserts literal SHA equality against a commit a later push has already superseded

**Phase:** 7 (QA-07-001 repair) · **Status:** Active — **owner decision, governs every future handoff in every direction**

This repository's CI redeploys the Preview on **every** push to `main`,
including a documentation-only one, and `build-info.json` always reports the
SHA of whatever commit was actually pushed (section 33's own mechanism,
working exactly as designed). A "pin the checkpoint" commit that writes prose
naming an earlier product commit as "the deployed checkpoint, confirmed live"
is therefore self-contradicting the moment it is pushed: pushing it is what
moves the deployed SHA past the value it names.

Phase 7's own QA handoff asserted exactly that contradiction — "confirm
`build-info.json` reports `322c00b`; if it does not, stop" — and independent
QA correctly stopped, at the mandatory precondition, before any product
behaviour was tested (QA-07-001, DEF-0061). The mismatch was real and the stop
was right. The defect was upstream of it: the assertion should never have been
written as literal string equality against a commit already superseded by the
one making the assertion.

**What actually matters is bundle equivalence, not SHA equality.** A docs-only
commit changes nothing the browser downloads. Phases 1 through 6 relied on
exactly this reasoning informally — "the closing SHA… `git diff X..HEAD
--name-only` shows only `docs/`, so the deployed product code **is** the
checkpoint's" — without ever writing it down as a rule or making it checkable.
Phase 7 is the first time the informal version was dropped in favour of a
literal precondition, and it is the first time it broke.

**The rule, from here:** a handoff, a QA report, or a retest prompt may name a
**product checkpoint** — the last commit that changed anything the build
emits — for audit purposes, and may separately report the **deployed SHA** —
whatever `build-info.json` reports live. It must never instruct the reader to
block on the two being the same string. Where equivalence needs to be
established, it is established by showing the diff between them touches
nothing bundle-relevant, not by asserting they match.

**Made checkable rather than remembered.** `scripts/checkpoint-equivalence.mjs
<product-sha>` runs `git diff --name-only` between the named product commit
and the current ref and fails if anything under `src/`, `public/`, or the
handful of build-input files at the repository root changed; it passes and
prints what did change otherwise. It knows nothing about `docs/`, `scripts/`,
`tests/` or `.github/` because none of them can alter one byte of `dist/`, and
it fails safe on anything it has not been taught about rather than assuming
irrelevance.

### Amendment, after QA round 3 (DEF-0063)

D-097 said how to _report_ a checkpoint and not **when it may be named**. A
handoff naming `3a8e8b6` was written and pushed before that commit's deploy had
landed, so it was true about the repository and false about the live site at the
moment QA read it — and a second whole QA round produced no product testing.

Two things close it. The checker distinguishes "the deployed build is older and
does not contain the checkpoint yet" from "something bundle-relevant differs",
because a diff is direction-blind and the first message QA got pointed at the
wrong problem entirely. And the builder must read the **live deployed SHA**
after CI completes — not merely observe that the CI workflow succeeded, because
GitHub's own `pages-build-deployment` runs afterwards — and confirm the
checkpoint is an ancestor of it, before writing a handoff that names it.

`node scripts/checkpoint-equivalence.mjs <checkpoint> --deployed <build-info-url>`
does both in one command. **Naming a checkpoint is something done after a
deploy, not before one.**

**Consequence for every future "pin the checkpoint" commit:** run the script
before writing the checkpoint section, and write what it printed rather than
asserting a match from memory. `qa/README.md`'s "checkpoint SHA tested" /
"deployed SHA tested" pair already asks for both values reported separately;
this decision is what stops the gap between them being read as a failure
instead of the ordinary consequence of a docs commit landing between the
build and the QA read of it.

---

## D-098 — An artefact that leaves the device says whose life it is in its first line, and an excluded area is excluded from the metadata too

**Phase:** 7 (QA round 2 repair) · **Status:** Active

Two halves of one rule: **a document is read in order, and a correction that
arrives later does not repair an instruction already given.**

### Whose life it is

The review export's opening sentence is an identity claim. It was written once,
for the owner, and used for both sources — so a document composed from a
synthetic laboratory history opened with "you are reviewing one person's own
record of his life… he is the owner of everything below", and disclosed that it
was an invented history several paragraphs later under a heading (QA-07-002).

Both statements were in the document. That is not enough, and the test that
checked only for presence — "not a real person" appears somewhere — passed on
exactly that artefact. An assistant reading in order has already been told
whose life it is by the time the correction arrives, and the two cannot both be
true. D-091's eighth invariant is about identity, so it governs the first line
of an artefact and not merely a section of it.

**The rule:** where an artefact makes an identity claim, it makes it once, at
the top, from the source. Not repaired below.

### What an exclusion excludes

The private section is off by default and includes nothing when off — the
entries, that is. The document went on to report the area as current, moderately
evidenced and last heard three days ago, listed it under the header's life
areas, and carried a dated `Noted: Private entry` row in the recent record
(QA-07-003).

**Participation is the part of a private record that stays sensitive after the
detail is withheld.** A placeholder is not a redaction when its presence is the
fact: a dated row saying something private happened, and when, discloses the
thing the exclusion exists to protect while appearing to protect it.

**The rule:** an excluded area is excluded from the metadata as well as the
detail — status, freshness, evidence strength, domain lists, and withheld
placeholder rows — and the document states once, plainly, that the exclusion
covers whether anything is recorded there. That last part is what stops the
silence being read as an empty life, which is the failure this rule must not
trade itself for.

### And where it does _not_ apply

Timeline keeps the private row on his own screen and replaces its detail with a
placeholder, and that stays right. Dropping it there would tell him his history
is thinner than it is, and he already knows what is in it. The difference is
that a review export leaves the device under an explicit statement that nothing
from that area is below. Same data, different promise, different answer.

---

## D-099 — A restore's confirmation is part of its result, and a failed confirmation is not rolled back

**Phase:** 7 (QA round 2 repair) · **Status:** Active

A restore writes, reads back and fingerprints, then closes the database, opens
it again, and reads once more — because surviving a reopen is the thing a
backup actually promises and the thing a browser under storage pressure is
entitled to break.

That last read was a **footnote**. Whatever it found, the operation returned the
success from two steps earlier and set a separate line beside it. Force it to
fail and the screen said, in green, that the store now held the backup exactly,
with "what came back after reopening the database is not what was restored"
printed underneath (QA-07-007). Two contradictory claims about one operation,
the confident one first. Section 29 forbids a false success and does not stop
forbidding it because a caveat follows.

**The confirmation is part of the result.** It has its own stage, `confirm`, and
three ways of failing that all get one answer: the reopen threw, the reopen
degraded to an in-memory store, or the reopened contents differ.

**And it is deliberately not rolled back.** Every other failure in a restore
rolls back, and this one must not. By the time it runs the write has committed
and matched its fingerprint, so the restored history is very probably on disk —
QA proved it was — and undoing it would trade a restore that probably worked for
one that certainly did not happen. The honest outcome is a third state:
**applied, verified once, not confirmed, not undone**, with the owner told to
reopen the app and look before restoring anything else over it.

`applied` exists on the failure variant for that sentence. "Your history is
untouched" and "the restore happened and the app cannot confirm it" are
different things to tell somebody deciding what to do next, and section 29's ban
on a false success equally forbids a failure report that talks him out of a
restore that worked.

### Two things the repair had to know

`openStore` degrades to an in-memory store rather than throwing, and an empty
memory store fingerprints as an empty history — so the check has to notice the
**fallback itself**, not merely compare contents, or it reports "the restore
lost everything" and publishes that empty store as his history.

And the operation's outer `catch` returned `notAttempted`, which for a restore
that has already written is the opposite of what happened. Whether a throw
lands before or after the write is now the difference between two different
outcomes rather than one wrong one.

---

## D-100 — A sticky layer owns its own opacity, and legibility is proved with pixels rather than rectangles

**Phase:** 7 (QA round 4 repair) · **Status:** Active

Two rules from one defect (DEF-0064, QA-07-010).

### The layer

Anything pinned over scrolling content composites against whatever passes
beneath it. A background that looks deliberate at the top of a document — a
tint, a wash, a pane of glass — becomes a window the moment the layer starts
sticking, and the copy inside it becomes unreadable exactly when it is being
read over content rather than over the page background.

That is not a property of any one notice's colour. It is a property of the
**group**, so the group carries it: one opaque backing under
`.shell__top`, and every member composites over that. Members keep their own
tints. A notice added later inherits the guarantee instead of having to
remember it — which is the same reasoning that made the group sticky rather
than its members (QA-07-006), applied one layer down.

The `backdrop-filter` this replaces is the evidence for the rule. It gave the
top bar the property and gave it to nothing else, so the two notices underneath
were transparent for two whole phases without anybody noticing.

### The proof

**A geometry assertion cannot see a legibility defect.** QA compared all three
header controls at four scroll positions, found no overlap, and the warning text
was visibly interleaved with the page underneath. The controls did not overlap;
the words did.

So a claim about what something _looks like_ is proved with an image. The
regression captures the sticky header at rest and again with a page scrolled
beneath it and requires the two to be identical — if anything shows through,
they differ. It is deterministic, it needs no baseline file, and it states the
defect in the only form that can hold it.

This does not make every visual property a screenshot test. It applies where
the claim is about compositing — a layer over other content — and it comes with
the structural assertion beside it, so the _reason_ survives a change that
happens to keep the images equal.

---

## D-101 — A legacy concept with no honest home is archived and named, never mapped to the nearest fit

**Phase:** 8 · **Status:** Active

Section 30's critical rule — _do not contort the new architecture to make legacy
mapping easier_ — is a rule about pressure, and pressure arrives one plausible
mapping at a time. Every one of the previous generation's twenty-eight record
families is a place where something nearly fits.

So the registry in `src/legacy/mapping.ts` gives every family one of four
dispositions and a written reason, and the import report shows the count for
each:

- **`map`** — the same act in this app's vocabulary. Becomes canonical history
  and participates in everything, because it _is_ history.
- **`archive`** — real, kept verbatim, mapped to nothing. Becomes an
  `imported-legacy-record`, which the Phase 1 quarantine contract already proves
  cannot answer a question however good its payload looks.
- **`excluded`** — section 59 says it does not return. Recognised, counted,
  named, and **written nowhere**. The difference from `archive` matters: an
  excluded concept is one the owner decided against, and keeping a copy in the
  store is leaving it where a later feature can read it.
- **`undecided`** — real history with no honest home yet. Archived, and
  additionally flagged for the owner, because the alternative is inventing a
  mapping he never agreed to.

**Silence is not one of the four.** Mapping what is recognised and ignoring the
rest makes "we decided against this" and "we forgot about this" the same
outcome, and the second is a defect nobody can see.

The same rule one level down. Five of the previous generation's sixty-four
observation attributes map. The rest are archived, and the ones where a near-fit
was genuinely available are listed in `DECLINED_ATTRIBUTES` with the argument
against — because an attribute nobody thought about and an attribute somebody
rejected look identical from outside a registry that only lists what it accepts.

Four of those declines are D-091 invariant 6 by name: mood, stress, confidence
and overwhelm are four constructs, and pouring them into one emotional quantity
is the wellness score the owner rules out. Two more are the old model's own
warnings taken seriously — physical and mental energy were split _because_
averaging them loses what would have chosen between them, and financial pressure
says on its face that it is not a measure of how much money there is.

**Every imported record's provenance names the rules version**, not "the
importer". A mapping rule is a claim about meaning and claims get revised;
anything imported under one revision has to stay tellable apart from anything
imported under the next, or a later correction silently rewrites history that was
brought across correctly under the old rule.

---

## D-102 — There is one door out of the previous generation, and it needs the passphrase

**Phase:** 8 · **Status:** Active — **the owner should be told this rather than asked to choose**

The old application has exactly one complete data-out path: a portable backup
that is encrypted with no plaintext branch — `encrypted: z.literal(true)` in its
own schema. Its other export is a readable markdown summary that says on its own
face that it is lossy and not for recovery, so it is not a migration source.

That leaves two ways to read the owner's history: implement a compatible reader,
or change the old application to write something else. **The second is
forbidden** — D-001 protects that tree absolutely. So the passphrase is not one
option among several; it is the only door, and saying so plainly is more useful
than offering a choice that does not exist.

The reader is a reader for a documented format and nothing more:
PBKDF2-HMAC-SHA-256 and AES-256-GCM through Web Crypto, at whatever parameters
the file declares, with the old application's own pipe-joined canonicalisation of
the crypto metadata reproduced byte for byte as additional authenticated data.
Reordering those eight fields — even into something tidier — would make every
backup the owner has undecryptable, and would present as a wrong passphrase
rather than as a code change. It is pinned by a test that states the exact
string.

**Decrypt only.** There is no encryptor in `src/legacy/`, and an architecture
guard keeps one out: this app writes its own backup format, so an encryptor here
would be code whose only possible future is being misused. The fixture that
builds test files has its own, which is also what makes the decryptor provable
against a genuinely encrypted file rather than against a mock that would agree
with whatever the reader did.

**The generation before the previous one is recognised and not imported.** The
single-HTML application's export is identified by shape and refused with a
sentence saying what it is. Two reasons, and the first is the one that matters:
mapping it would mean a second complete set of claims about a second data model,
derived from reading somebody else's reader for it rather than the format itself.
The second is that the previous generation built its own importer for that
format, so anything brought across then is already inside its records. **Whether
the owner wants it read directly anyway is his decision to make**, not this
build's assumption, and it is an open question in the Phase 8 handoff.

---

## D-103 — A standing instruction that cannot be honoured is named, not kept as an inert record

**Phase:** 8 · **Status:** Active — **owner-facing rule, governing every phase from here**

The previous generation's `move-preference` with the stance `forbidden` is
section 4.3 in one record: the owner told the old app never to suggest something.
It looks like the single most important thing this phase could carry across, and
carrying it across would have been the worst thing this phase did.

It is keyed on `engineCandidateId` — the **old generator's** candidate identity.
This app's vetoes match on an entity reference, and its candidates have entirely
different identities, so an imported veto matches nothing. It would sit in
history saying a move is forbidden while the engine could never act on it.
**An inert veto is worse than no veto, because it looks kept.**

Two ways to make it fire, and both are the contortion section 30 forbids:
reshape this app's candidate identities to match the old catalogue's, which is
section 59's first exclusion arriving through the back door; or widen the veto to
the domain the old id was prefixed with, which would forbid every move in an area
of his life because he once declined one move in it.

So the rule, and it is not about legacy import specifically:

> Where the app cannot keep a standing instruction the owner gave it, it says
> **which instruction**, in the owner's own words for it, at the moment the
> shortfall is created — and keeps the original in history, so nothing is
> destroyed by not being honoured.

The import report lists the forbidden moves by name. It reads the **chain**
rather than every record: a stance superseded by a later one for the same move is
not standing, so a `forbidden` the owner afterwards `restored` is not handed back
to him. Returning a rule he had already cancelled is worse than losing it,
because he would very likely re-state it.

---

## D-104 — An import is the restore transaction with different contents, not a second write path

**Phase:** 8 · **Status:** Active

Section 30 asks an importer for snapshot, atomic apply, verify and rollback.
`restoreInto` is already exactly that, down to the outcome type that keeps
"nothing was written", "everything was written and checked" and "something was
written, it was wrong, and the old history is back" as three different sentences
rather than one boolean — and D-099's confirmation ladder sits on top of it in
the provider.

So an import is expressed as what it actually is: **the current history plus some
records**, applied as one transaction, through the same function. The owner
surface hands `importRestorePlan(...)` straight to `restoreOwner`, inheriting the
whole ladder — the owner's store and no other, the snapshot and the clock
published together, the database reopened and read back, an unconfirmed result
rather than a false success. Reimplementing any of it for imports would have
meant a second copy of the most carefully argued code in the repository,
differing at first only in the wording of its errors.

`append` was the obvious alternative and is not sufficient: it is all-or-nothing
for records and cannot carry the entities an imported goal refers to in the same
transaction. An import that wrote its records and then failed to write their
subjects would show the owner his own history with the names taken out.

**Two consequences that are not obvious, and both were defects before they were
rules.**

The merged snapshot must be in canonical order. `snapshotToWire` serialises in
the order it is given, so the verification fingerprint is order-sensitive, and a
store returns its records sorted — an unsorted merge going in fingerprints
differently from the identical history coming out, and _every_ import would
report that what was written is not what the file holds and roll itself back. It
is independently right: D-091's seventh invariant, and appending imported rows to
the end would put a decade-old reading after last night's.

And what counts as "nothing to do" is one predicate consulted by both callers.
Two `length === 0` checks in two files is one decision made twice and free to
drift — which it did: entities were collected without checking the store, so a
second pass over an already-imported file produced an empty append list and a
full list of subjects, and the screen offered to bring across a file it had just
reported as entirely already present.

---

## D-105 — A reason the owner reads and a reason that survives audit are two strings

**Phase:** 8 · **Status:** Active — **owner-facing rule, governing every phase from here**

A registry entry that decides something about the owner's life has to justify
itself twice, to two readers who need opposite things.

**The audit trail** is for whoever opens the file in a year. It cites decisions,
plan sections and the names of things beside it, because that is what makes a
claim about meaning checkable rather than merely confident. It must not be
softened.

**The owner's sentence** is for the person on the screen. Second person, no
decision ids, no section numbers, no identifier from this codebase, no word that
only means something to somebody who has read the plan.

They were one field, and the import report rendered it verbatim. So the panel
sent the owner to a constant called `MOVE_PREFERENCE_NOTE`, quoted "Section 59"
and "D-091 invariant 6" at him, used the word "defect", and discussed him in the
third person while he was reading it — "the wellness score **he** rules out",
"something **the owner** did not". DEF-0068, and a blocker rather than a polish
item: that report is the whole safeguard of a phase that writes a
re-interpretation of his history into the only copy of it.

**The rule is not "review the copy".** It is that the two audiences get two
fields, and that both are swept:

- over the **registry**, so a twenty-ninth entry inherits the rule instead of
  having to remember it — and, in the same suite, over the audit trail, so it
  cannot be watered down to pass. A test asserts each owner sentence differs
  from its audit trail and that several audit trails still cite what they rest
  on;
- over the **rendered screen**, every disclosure opened, because a component can
  grow developer vocabulary in a label or a heading that no registry sweep looks
  at.

Running the second sweep over the whole of Data rather than only over the new
panel failed immediately on a Phase 7 string — the export section chooser
offered "Where **the owner** has overruled the app". It is fixed rather than
exempted. A rule with a carve-out for the place it was first broken is not a
rule.

### The smaller lesson beside it

An assertion on developer wording is an assertion **that the developer wording
is on screen**. `toContainText('move catalogue')` was in the browser suite
throughout, green, holding the defect in place. When a test names a phrase, the
phrase it names should be one the owner would recognise as addressed to him.

---

## D-106 — An entry the owner did not write says so, wherever it is read

**Phase:** 8 (QA round 1 repair) · **Status:** Active — **owner-facing rule,
governing every phase from here**

D-014 has always required provenance to stay visible everywhere a record
surfaces. It was true of the record layer and false of every surface: an
imported reading, a device reading and a derived one each rendered exactly like
one the owner had typed that morning, because `describeRecord` returned a kind,
a sentence and a withheld flag, and there was nothing else for a surface to
show.

Independent QA found it as "mapped legacy imports lose their origin". The class
is wider, and treating it as the reported symptom would have fixed one origin
and left the next one to be found the same way.

**The rule.** A record whose evidence source is not the owner carries a short
word saying whose it is, and every surface that renders that record — or a
belief resting on it — renders that word. Timeline, a domain page's entries,
its readings, its goals, the evidence behind a figure, and the export.

**The owner is the default and says nothing.** Marking his own entries would
badge almost every row in his history and teach him to stop reading the one
that matters. A test asserts both halves: the imported entry is marked, and his
own is not.

**A mixed basis says nothing either.** A belief resting on one imported reading
and one of his own is not an imported belief, and a badge over it would be a
claim wider than the evidence (D-091's first invariant). The entries underneath
say it individually, where he can see which is which.

**The origin survives a withheld detail.** Where an entry came from is not the
private detail — the detail is what it says. Withholding both would make a
private imported row read as one he wrote, on the surface least able to correct
it.

**The knowledge state is a different question and does not substitute.** An
imported reading resolves as `inferred`, because this app did not watch it
happen, and the export duly labelled one `(inferred)`. That is not "imported":
it reads as the app having concluded something, when in fact he reported it, in
the old app, two years ago. Both facts belong on the row.

### The false green underneath it

`tests/contract/legacy-import.test.ts` carried a test titled "every imported
record says it was imported, **wherever it surfaces**". It asserted
`provenance.source` and rendered nothing. Anybody auditing the suite for that
claim would have found it, ticked it and moved on — which is what makes a title
wider than its evidence worse than no test at all.

A test's title is a claim. Where it is broader than what the body actually
exercises, the body is what is true and the title is what gets believed.

---

## D-107 — Nothing about the transport may enter the identity of the thing transported

**Phase:** 8 (QA round 1 repair) · **Status:** Active

A record built from a legacy row is two things joined: what the old application
wrote, and what this build made of it. Only the first can change without the
file changing — so only the first may take part in deciding whether the file
changed.

The archive label carried the backup's own creation time. Taking a **new**
backup of the same append-first history therefore rewrote every archived row's
fingerprint, and the importer reported six unchanged rows as saying something
different, drowning the one row that had genuinely changed. Taking a later
backup is the ordinary way an old history gains rows, so this was not an edge
case; it was the normal path.

Fixing the label alone would have left the class. Two more members were live:
the **mapping rules version**, so revising a rule would have made every
previously imported row a conflict; and the **device's timezone**, so importing
the same file after travelling would have done the same.

So the comparison asks what the old file says, with everything this build
stamped on the row taken back off — and each exclusion is named beside its
reason rather than inferred from a list of fields.

**A re-reading is not a conflict, and not silence either.** Where the rules have
been revised since a row came across, the report says so in its own words:
nothing in his history changed, and this build reads it differently from the
build that imported it. Calling that a conflict blames his old history for a
change in this app; calling it "already present" hides a real difference in
what the app believes his history means.

---

## D-108 — A conclusion drawn from records discloses their origin, not only the records under it

**Phase:** 8 (QA retest repair) · **Status:** Active — **owner-facing rule,
governing every phase from here**

D-106 said an entry the owner did not write says so wherever it is read. It was
implemented on `DescribedRecord`, which is the shape for **showing** a record —
so every surface that lists entries was fixed and every surface that states a
conclusion was not.

Independent QA retested and found the claim still failing on Life's overview, an
Insights coverage card, and four sections of the review export. Each of those is
a sentence _drawn from_ records rather than one that shows them, and each read
as though the owner had gone quiet about an area he had in fact never mentioned
to this app at all — everything it knew had been migrated.

**The rule.** Where a conclusion rests on a body of evidence and every part of
that body shares one non-owner origin, the conclusion says so, in the same word
the entries use. Where the body is mixed, or is his, it says nothing — one
record of his own is enough to make an area his again, and a badge over a mixed
basis would be a claim wider than the evidence (D-091's first invariant).

**Two questions, not one.** `DomainCoverage.source` already existed and answers
"where did the newest evidence come from", which is the right question for
reliability and the wrong one for disclosure. An area with one recent entry of
his own on top of a decade of imports would read as entirely his; the reverse
would read as entirely imported. So the whole body is carried alongside, and
`sources` and `source` are deliberately different fields with different jobs.

**The brain carries the fact, the surface carries the word.** `sources` is a
list of `ProvenanceSource`; which word the owner reads is presentation's
business, and `originOfSources` is the one place it is decided — the same
function the entry-level rule uses, so the two can never drift into saying
different things about the same origin.

**A new conclusion inherits it.** `Insight.sources` is filled centrally from
what each card cites, so a card written next year discloses correctly without
its author having to know this rule exists. A card whose evidence cites
something other than records — a coverage card names concepts — sets it itself,
and says why beside the code.

### The lesson this round is really about

The round-1 report found a test titled "every imported record says it was
imported, **wherever it surfaces**" that asserted storage and rendered nothing,
and wrote down that a title is a claim.

The repair for it then shipped a test titled "every surface tells them apart"
which asserted the four record-shaped surfaces and none of the four aggregate
ones — and QA named that title as the reason the gap went unnoticed. The lesson
was written down and then broken by the commit that wrote it down.

So: **when a title says "every", the body enumerates what "every" means, and
each item is proved by reintroduction separately.** A sweep that covers four of
eight is not a weaker version of the claim; it is a false one, and the passing
result is what makes it dangerous.

### And it happened a third time, which is what makes the rule concrete

The repair for the paragraph above shipped two more. One asserted
`Array.isArray(insight.sources)` under the title "every insight declares where
its evidence came from" — true of a build with the computation deleted, because
every constructor initialises the field to `[]`. The other claimed four export
sections and held three, and the count was wrong **in the same document that
made the claim**: a table naming four sections, and a reintroduction account
three lines below saying "each of the three export sections one". Independent QA
found the second by reading the repair's own prose against itself.

Writing "a title is a claim" three times has not stopped it. What stops it is
mechanical, and it is now the standing rule for any assertion of this shape:

1. **Enumerate in the body.** The list of things "every" covers is written out
   by name and asserted to be exactly that list, so a member that stops existing
   is a failure rather than silently reduced coverage.
2. **Assert the value, never the container.** `Array.isArray`, `toBeDefined`,
   `not.toBeNull` and `length >= 0` are all satisfiable by the defect. Assert
   what the owner would read.
3. **Reintroduce the claim, not the assertion.** Delete the code the _title_
   names — not the line the test happens to touch — and require a failure. The
   `Array.isArray` test would have been caught in a minute by deleting
   `withSources`, which nobody did because the assertion beside it looked
   related.
4. **A guard in the assertion is a hole.** `if (sources.length > 0)` reads as
   caution and means "skip the case where the field is empty", which is exactly
   the state the defect produces. QA's own probe carried that guard, and it hid
   a real product gap — a `life-season` card that cites no evidence lines and
   therefore disclosed nothing at all. Removing the guard found it.

### The fourth round, and what actually closed it

Independent QA passed the phase on the round after these four checks were
written, and it passed them the only way that means anything: it reproduced both
named reintroductions itself rather than reading the account of them, and it
audited the enumeration for honesty — asking whether the nine named kinds really
are what the library produces and whether the two absent ones really are
unreachable, rather than whether the list was internally consistent.

That is the check the rule was missing. An enumeration written by the same
conversation that wrote the code it enumerates is a claim about that code by its
author. **What made these four checks binding was somebody else running them**,
which is the whole argument for D-077 restated at the level of a single
assertion.

Three phases have now produced the same finding in different clothes: green
gates are evidence about the gates. Phase 4 found it with a phone, Phase 7 found
it by reading a screen, and Phase 8 found it by reading the tests. The rule
generalises past origin badges — **any** sweep in this repository whose title
begins "every" is subject to the four checks above, and the closing note is that
being told a rule is not the same as the rule being enforced.

---

## D-109 — Two initiatives precede Phase 9, and canonical Phase 10 keeps its scope

**Phase:** 8 → 9 boundary · **Status:** Active — **owner decision**

The rebuild sequence gains two initiatives between Phase 8 and Phase 9:

- **Phase 81 — correctness and truthfulness.** 22 audit findings in 6 steps.
- **Phase 82 — the structural intelligence skeleton.** 9 audit findings in 6 work packages.

Then Phase 9 as written (section 54), then **one later intelligence phase** carrying the
remaining 20 findings in two internally gated packages — Reach, then Validity — and then
**canonical Phase 10, 11 and 12 unchanged**.

**Why Phase 81.** `docs/WHOLE_APP_INTELLIGENCE_AUDIT.md` found 51 findings, and 22 of them are
the app stating something untrue on a screen the owner reads, or an action the plan promises
that the interface lacks. Phase 9's review list includes copy and its gate is owner
physical-phone approval. A sentence that is factually wrong does not become right by being well
set: if Phase 9 runs first, these get typeset, approved on a phone, and become the thing the
design depends on. The two sharpest are a time limiter that reads "Only about 10 minutes left
tonight" at 08:40, and a claim that a four-year-old handled something "3 times running" when she
handled it three times out of six with the most recent try needing help.

**Why Phase 82, and why it is only nine findings.** Membership was decided by one test and
nothing else: _does this create or change a control, a surface, or the shape of a recommendation
that Phase 9 must design and the owner must approve on his phone?_ Nine pass — threads,
commitment windows, deferral, goal horizon and parts, growth stage and occasion context, and the
score re-cut that completes the thread work. Three were in an earlier draft and failed the test
on re-examination: AUD-0040, AUD-0045 and AUD-0047. Importance was explicitly **not** the test;
several important findings are in the later phase.

**Why canonical Phase 10 is not re-scoped.** Section 55 defines it as performance, PWA and
reliability, and release is gated on those items. The audit's first draft routed all structural
intelligence work there, which would have put the intelligence programme after the visual gate
and immediately before release hardening. That was the audit's own error, caught by independent
review, and the correction is a new phase rather than a re-scoping.

**Numbering.** The product calls these Phase 81 and Phase 82; the external orchestrator routes on
integers and the handoff carries an explicit `**Phase:**` field. Builder, QA, repair and retest
rounds all stay under the same routing number — **QA rounds do not get new phase numbers**
(D-092, D-097). The later intelligence phase is deliberately unnumbered until it is reached, and
that does not block Phase 81.

---

## D-110 — Owner-facing copy names the horizon the owner is actually in

**Phase:** 81 · **Status:** Active — **owner decision**

Section 61's target-style example is corrected from "situations like tonight" to "situations like
this one", and the plan now says the horizon in that example is illustrative rather than
canonical. Where a sentence names a horizon it reads it from the current day block.

**Why:** the audit found the string `tonight` or `evening` 113 times across 29 source files, and
reproduced the consequence on the deployed build at 08:40 on a Tuesday: the situation line read
"Tuesday morning" and the limiter directly beneath it read "Only about 10 minutes left tonight."
The guide offered "The evening is clear" as an answer about a morning. The evidence panel — the
surface whose job is to be checkable — described "situations like tonight" throughout.

**Why the plan had to change first.** The plan sits above the code in the authority order
(section 1), and its own copy example blessed the word. Fixing the code against an example that
reads the other way is the thing section 1 exists to prevent.

**What this is not:** a change to any decision boundary. D-040 already separated the word for the
hour from the boundary for the decision — the evening begins at 18:00 for every purpose the
engine has, and only the word moves. This extends D-040 from "late afternoon" to every horizon
word in the product.

---

## D-111 — A question may be asked when the answer decides whether the action is appropriate

**Phase:** 81 · **Status:** Active — **owner decision**. Amends D-036.

D-036's share rule — `overturns * 2 >= options` — remains the default. One narrow exception is
added: **the app may ask a question the share rule would not trigger when the unknown could
materially change whether the proposed action is appropriate at all**, and in particular for
soreness or pain and for a severe recovery shortfall.

**Why:** the share rule measures the fraction of answer values that switch the decision. The
value of a question is the expected reduction in loss, which depends on how bad it is to be
wrong. Those diverge exactly where it matters. On the default history the app's own probe reads
_"3 of 4 could change the answer, and none on enough of their answers to be worth a tap"_ — and
it then recommends a 25-minute walk to a man it has not asked about pain, because only one of
soreness's three answers stops it. A one-in-three chance of prescribing exertion to someone who
is quite sore is worth one tap.

**Bounds, and they are the point. The owner approved this narrow and it stays narrow.**

- It applies to concepts explicitly marked `consequential` in the registry, not to any question
  that happens to feel important.
- It applies only when the flip is toward **less** action — no action, or an easier move. It is
  not a licence to ask in order to justify doing more.
- The daily cap of three questions (`QUESTIONS_PER_DAY`) is unchanged.
- D-036's existing regression stays in force: a one-in-four question is still not asked for every
  concept not marked consequential, and that is asserted directly rather than assumed.
- Average questions-per-day across the scenario library must not rise materially. Section 47's
  gate fails a phase on "too many questions", and that has not been relaxed.

**What this is not:** a probability model. The app cannot honestly compute an expected
opportunity loss and is not being asked to. This is a floor under one class of harm, not a
calculation.

---

## D-112 — Growth sufficiency reads the sequence, not the survivors

**Phase:** 81 · **Status:** Active — **owner decision**. Amends D-070.

The revised rule, in full.

**What counts as an occasion.** Every `growth-opportunity` episode about the skill that the owner
actually attempted. A **decline or an unable-now is not practice** and must not reset the app's
sense of when the skill was last practised.

**What the evidence is.** The whole sequence of attempted occasions and how far each got —
**not** a filtered list of the ones that went well. Partial and unsuccessful occasions remain
evidence and are counted, displayed and reasoned about.

**What may be claimed.** The app may never state or imply "running", "consecutive", "settled",
"independent" or any equivalent unless the underlying sequence actually supports the statement.
Where occasions alternate, it says so. **The most recent contrary occasion must be capable of
preventing a settled suggestion on its own.**

**How it is said.** Owner-facing language describes occasions rather than scoring the child.
Counts of occasions are legitimate and necessary — the owner cannot judge a sufficiency claim
without them. **Rates, percentages, ranks, grades, confidence badges and performance scores about
Adaya are forbidden, anywhere in the product.** Internal confidence may exist and govern
sufficiency; it never renders.

**No new threshold.** Implementing this must **not** introduce an arbitrary child-performance
percentage threshold. The rule is about honesty of description and about which occasions count,
not about a new number to clear.

**Unchanged from D-070, and load-bearing:** a growth-stage change is **proposed and never
applied**. The owner confirms, rejects or corrects; nothing is written until he answers; both
answers are records; and it remains a watershed rather than a mute button.

**Why:** the audit constructed a history of six occasions alternating all-the-way and
part-of-the-way — three of six, never twice in a row, the most recent needing help — and the
deployed build said _"Adaya has handled ordering her own food 3 times running. Worth calling that
settled?"_ while the Fatherhood page displayed the alternating record on the next screen. Tapping
yes would have recorded _"She handles ordering her own food independently now."_ No scenario in
the library contains a failed growth occasion, which is why 1,199 green assertions never saw it.

**Sequence:** this decision is written before `growth.ts` is touched, which is the whole point of
recording it here.

---

## D-113 — Move diversity and owner-defined routines are a named product outcome

**Phase:** later intelligence phase, Reach package · **Status:** Active — **owner decision**

The owner has stated directly that repeatedly seeing the same move — "walk 25 minutes" above all
— is a product problem in its own right. **Move diversity and owner-defined routines are a
high-priority outcome of the later intelligence work**, and AUD-0045 is not to be treated as a
cosmetic nicety because it sits outside Phase 82.

**What the goal is:**

- the system knows more real actions the owner can actually take;
- it can use **owner-defined** routines rather than only the four the engine names for itself;
- different routines stay **semantically distinct**;
- walking, lifting, cycling and active play are **not pooled** as though they had identical
  demand or identical outcomes;
- recent repetition matters;
- learned outcomes and current context influence which action is proposed;
- the app does not keep falling back to one move merely because a domain has one modelled action.

**What the goal is not:** artificial novelty, and not adding random verbs to make the list longer.

**Why it sits in the later phase rather than Phase 82.** Its safe implementation requires
`profileFor(verb)` to become keyed on `(verb, object)` first: the profile supplies `size`,
`demand` and `friction`, which the constraint filter reads for `no-time` and `too-strained` and
the evaluator reads for `friction`, `time-fit`, `opportunity-cost` and `capacity-fit`. A
25-minute walk and a 90-minute gym session sharing one profile would make all six wrong. That is
a scoring-model change rather than a UI change, and it is why this is not pre-Phase-9 work — not
because it matters less.

**What is already right and must survive:** `ACTION_FAMILIES` in `association.ts` is deliberately
empty and requires a written `because` for any entry (D-091, DEF-0046). Pooling two routines is a
claim that the owner's own two subjects are the same thing. **Diversity is delivered by modelling
more distinct routines, never by pooling them.**

---

## D-114 — An inference below a stated confidence says where it came from

**Phase:** 81 · **Status:** Active — builder decision, AUD-0032

An owner-facing sentence may assert a reading as a fact when the reading is `explicit`, or when
it is `inferred` at a confidence of **0.7 or above**. Below that it names what the inference rests
on instead: _"Going on how the last few days have gone, there should be enough for a walk."_

`SPOKEN_AS_FACT` lives in `explain.ts` beside the sentences it governs.

**Why:** `isUsable()` collapses `known` and `inferred`, and the phrasing read it that way. On the
default history the belief store reported _"Current energy — 2 of 5 · inferred, 50%"_ while Now
said, flatly, _"There is enough in the tank for a walk, and the afternoon suits it."_ Two of five
is the second-lowest reading on the scale, the confidence was a coin flip, and the sentence
carried no hedge at all. Section 18's guardrail — never turn low confidence into confident
language — is written as something a _model_ must not do, and the deterministic layer was doing
it. `Knowledge` carries four states precisely so they can be told apart (D-014).

**Why a threshold rather than hedging every inference.** The opposite failure is real and just as
damaging: an app that qualifies every sentence sounds unsure of everything, and section 61 asks
for direct copy. 0.7 is where a reading stops being a guess and starts being a working belief —
the same shape as `MIN_PAIRS` and `MATERIAL_GAP` in `association.ts`, which is a number written
down so it can be argued with.

**What this is not:** a change to what the engine believes. The reading, its confidence and its
weight in the ranking are all unchanged. Only the sentence moves.

---

## D-115 — An explanation may prefer a winning dimension's own sentence, and D-031 is not widened

**Phase:** 81 · **Status:** Active — builder decision, AUD-0027

`whyNow()` switches on the candidate's `trigger`, which is set at generation time before anything
is scored — so it can only ever say why a move was _proposed_, never why it _won_. A dimension may
now answer instead, and it is bounded on three sides:

1. it must have **materially moved the score** — `value × weight ≥ 0.2`, and positive;
2. it must **rest on a concept in the winning candidate's `leansOn`**, which is D-031 and
   DEF-0006's rule, unchanged;
3. it must carry a **`phrase` written for the owner**, never the `note` written for the inspector.

The third is DEF-0040's rule given a type. `ConsideredFact.reading` was written for the inspector,
reused verbatim on the evidence panel, and shipped _"not known — never-observed"_ to the owner;
`note` says "+0.50 — current energy rose 11 of 14 times with it and 4 of 14 without, across the
record", and shipping it raw would repeat that defect and breach section 61's ban on confidence
arithmetic.

**Why:** the app's best sentence about the owner's own life was computed, used to rank, and never
shown to him. On "Two months of readings, and nothing graded" the screen said _"There is enough in
the tank for a walk, and the evening suits it"_ while the ranking carried the specific,
comparative, non-causal statement made entirely of his own record. Section 4.6 asks for the
specific ordinary sentence over the elegant generic one, and the specific one already existed one
layer down.

**The refusal half of AUD-0027 is deliberately not shipped.** Surfacing _"you have passed on this
fourteen times"_ requires widening the DEF-0006 rule from _concepts in `leansOn`_ to _concepts in
`leansOn`, plus dimensions that materially moved the score_ — a deliberate amendment to a fix for
a Blocker. Three things decided against it, and the audit itself names the tiebreak: it calls that
sentence _"the riskiest copy in the audit"_, offers no wording it is willing to endorse, and says
in as many words that it is the half to drop if either is in doubt. It also does not need the
amendment to be reached later: the rule can be widened the day there is a sentence worth widening
it for.

**Consequence, asserted rather than assumed:** `tests/synthetic/no-hidden-genericity.test.ts`'s
DEF-0006 regression is unchanged and still bites, and
`tests/synthetic/decision-evidence.test.ts` asserts that no reason in the library mentions a
refusal.

---

## D-116 — `protection` is half-reachable, and the unreachable half duplicates the filter

**Phase:** 81 · **Status:** Active — builder finding, AUD-0026's second half

The audit asked for `protection` to be explained: it reported `+0.00 — costs no other area
anything` in every ranking observed, and asked either that it be given inputs or that it be
recorded as dormant. Measured across every scenario in the library at six hours of the day —
167 ranked rows — it is neither.

- **`+0.5 — protects tomorrow`** fires 8 times. The dimension is live.
- **`−0.5 — borrows against rest`** requires an effortful move with non-severe strain, which is
  reachable in principle and which no history in the library currently produces.
- **`−0.8 — this late it costs tomorrow`** requires an effortful move at late night, and **every
  effortful move already refuses late night in its own profile**. The constraint filter removes
  it before the evaluator sees it, so that branch is structurally unreachable.

So `protection`'s heaviest branch is a second copy of a rule the filter already enforces, which is
why it never fires and why nothing was lost by its never firing. It is left in place: removing a
guard because the thing it guards is currently prevented elsewhere is how the thing stops being
prevented.

**What follows from this, and does not belong here.** Whether the ranking should keep a dimension
whose strongest reading cannot occur is a question about the instrument, and AUD-0035 is the
finding that asks it. This entry exists so that the answer is on the record when that phase asks.

---

## D-117 — Growth's own sufficiency is not a rate, so it is not on the rate screen

**Phase:** 81 · **Status:** Active — builder decision, AUD-0037

`growth-opportunity` is excluded from Insights' "Still gathering" list.

**Why:** `GROWTH_OCCASIONS` is 3 and `MIN_FOR_A_RATE` is 4, and they measure different quantities —
how many occasions before the app asks whether something about _her_ has changed, and how many
before it can state a rate about what follows a _move_. The owner has no way to know that. At one
instant, in one build, about one skill, Now asked him to conclude she had mastered it while
Insights said the evidence needed one more occasion, and whichever he read second undermined the
first.

Excluding the verb rather than relabelling both, because `growth.ts` decides sufficiency here and
the growth suggestion now carries its own evidence line (D-112, AUD-0049) — so nothing is lost.
The exclusion is keyed on the verb rather than on whether a suggestion happens to be standing,
because otherwise the contradiction returns the moment he answers.

---

## D-118 — What has merely been on screen is the surface's note, not the owner's history

**Phase:** 81 · **Status:** Active — builder decision, AUD-0025

A session-scoped ledger records which moves have been put in front of the owner today: one entry
per move per owner-local day, holding the moment it was last shown and a count. It lives in the
surface, it is rebuilt every session, and it reaches the engine **as data on the moment** —
`Situation.shown` — read by `recent-duplication` and by nothing else.

**Why it exists.** Ignoring a suggestion is a response and it is the most common one, and the app
could not count it at all. `recent-duplication` reads `situation.recentMoves`, which is built from
recorded `action-recommendation` records — only the moves he _responded to_ — so a move shown at
06:30 and left produced no trace, and at 10:00 the same morning it scored **"+0.20 — not offered
lately"**. That is a false statement inside the ranking, and it produced the most visible
repetition in the product: the identical kitchen sentence at four separate hours of one day.

**Why it is not a record. D-043 is untouched and every reason it gives still holds:** a row per
render would be unreadable within a week, would poison the duplication check, and would become
learning evidence about an evening nothing happened in. What was missing was something cheaper
than a record, not a reason to write one.

**Three properties, and each is guarded rather than remembered.**

- **It is not evidence.** `learning.ts`, `insights.ts`, `association.ts` and every Timeline
  surface are forbidden from reading it; `tests/unit/architecture-guards.test.ts` fails the build
  on any of them, and asserts that the duplication check really does read it.
- **It is not the owner's history.** No module under `src/memory/` and nothing in the export path
  may know it exists. D-107's rule in a smaller key: a backup that carried it, or a fingerprint
  that hashed it, would make one owner's two sessions produce two different backups of one
  history.
- **It is an argument, never a lookup.** `src/intelligence/` is pure and clock-free
  (`ARCHITECTURE_BOUNDARIES.md`) — the moment is an argument so that time travel reaches the
  engine rather than stopping at the screen that offers it. Reaching for a ledger from inside the
  engine would breach that _invisibly_: it is not a directory violation, so the existing guard
  would not fire.

**An entry is stamped with the moment it was shown at, and the situation reads only entries
strictly earlier than the moment being decided.** Otherwise noting a render would change the
render, and the screen would oscillate between two moves each marking the other down.

**What this does not fix, and it is worth writing down.** The penalty is real and it grows with
each showing, and on several histories it changes what the app says across a day. On "A week
pointed at the house" — the audit's own reproduction — the kitchen still wins at every hour,
because its lead is larger than the whole range of this dimension at its current weight. Whether
`recent-duplication` is weighted correctly against the rest of the ranking is **AUD-0035's
question**, and answering it here would be re-cutting the scoring instrument inside a
truthfulness phase.

---

## D-119 — Three refusals in a block is an answer

**Phase:** 81 · **Status:** Active — builder decision, AUD-0023

Within one day block: a move that has been refused is not offered again; after the second refusal
the guide may ask a question the share rule would have refused; after the third the app stops
offering and says so. The block turning over starts it again, and the copy says that is what
happens.

**Why:** section 4.3 gives the owner the right to postpone, to say can't-now and to ask for
another option, and the app honoured each of those individually while having **no response to the
pattern**. The audit's reproduction: Can't right now ×1 → the walk. ×2 → the growth opportunity.
×3 → back to _"Spend the next 30 minutes with Adaya, phone away"_, badged _"You said not right
now"_. ×4 → identical screen, no button doing anything. Three refusals in a row is the clearest
signal a person can send without typing, and the correct reading of it is not "here is a fourth
suggestion".

**Why a block rather than a day.** "I can't do that right now" is a statement about now, not a
verdict — it says nothing about eight o'clock. A decline still holds for the day, which is what
`settledRecently` already did and is unchanged; an unable-now now holds for the stretch of time it
was said in, which is what it means.

**Why two before asking and three before stopping.** Two would make the app sulky and four is not
listening. The second refusal is where the evidence stops being about the move and starts being
about something the app cannot see, which is what a question is for.

**What this is not:** a veto. Stopping for a block is not "never suggest this again", and the copy
must not read as though it were — that is a separate thing the owner chooses (AUD-0050, D-120).

---

## D-120 — The sixth owner action is a control, and lifting it is half of it

**Phase:** 81 · **Status:** Active — builder decision, AUD-0050

Now gains **"Stop suggesting this"**, behind a refusal and behind a confirmation, writing a
`preference` with `stance: 'forbids'` scoped either to the move's object or to its life area. The
relevant domain page lists every standing veto and lifts one in a tap.

**Why:** section 4.3 is a non-negotiable product principle and it lists _explicitly forbid a
recommendation family_ among the things the owner can do. The enforcement has always been
complete — `vetoFor` handles the domain-level case and cites section 4.3 by name — and **no
control anywhere in the product could produce the record it enforces**. The interface offered five
of the six actions, and the one it could not express was _stop_. In one history the probe read
_"owner-preference −0.40 — passed on 14 times before in situations like this"_, and the app
recommended the walk anyway, as the only candidate.

**Why a decline is not this, and must not become this.** `owner-preference` deliberately treats a
refusal as the owner exercising sovereignty rather than as a verdict on the move (D-045, section
20), so a refused move comes back with a slightly lower score. That is right for a decline, and it
is exactly why there had to be a separate way to say never.

**The bounds.**

- **Two taps and a confirmation.** A veto is the most permanent thing the owner can do and the
  easiest to do by accident on a phone, so it appears only after he has already refused the move
  and asks again before writing anything.
- **Listed and liftable, or it should not exist.** A veto he cannot find again is worse than none.
  The confirmation names the page it can be lifted on.
- **An area veto is not a domain-off switch**, which section 4.1 forbids. It suppresses
  _recommendations_; the area keeps its page, its coverage, its history and its place in the
  model, and the copy says so on both screens.
- **Lifting is a retraction, not a milder preference.** He is withdrawing the entry rather than
  stating something weaker, and `correction` is the kind that exists for exactly the case where
  there is nothing to put in its place.

**One implementation note worth recording.** `vetoFor` enforced an area veto by resolving the
preference's subject to a `life-domain` entity, and the only such entity that has ever existed is
sleep — because the engine deliberately names its own routines and never the owner's life (D-021).
Rather than invent ten entities to hold ten possible vetoes, the enforcement also reads the areas
the record was filed under, which is the same fact without the invented noun.

---

## D-121 — Silence says what the app cannot do, not that it is not ready

**Phase:** 81 · **Status:** Active — builder decision, AUD-0034

`nothing-proposed` splits again. Where the app has a current picture of the moment and still has
nothing to propose, it says so — _"Nothing here to push you toward"_ — and names the limit as its
own reach. Where the history genuinely has not told it how the day is going, the old sentence
stands. The line describing where the owner is now renders in **every** no-action state.

**Why:** _"Nothing to suggest just yet"_ reads as the app not being ready, and it was what a
rested man got at seven in the morning and what a father got on the three evenings his daughter is
away. "Just yet" implies something is coming; nothing is. And it was the wrong diagnosis: the
honest sentence is not "I have nothing to suggest", it is that there is nothing _here_ the app
knows how to help with — a different admission and a more useful one.

**The line this must not cross is D-038's.** The new branch must not claim the evening is quiet
when the truth is that the app has no vocabulary for it — that is asserting an absence from
ignorance. So it names the reach rather than the evening, and a guard asserts it.

**On the situation line.** It was rendered only when there was a move, so on the screens with the
least on them the one piece of orientation the screen offers vanished at the moment it was most
needed. It is a statement about the situation rather than about the decision, and it is true
whether or not there is one.

---

## D-122 — Soreness is a reading about exertion, and says nothing about a light move

**Phase:** 81 (QA repair) · **Status:** Active — builder decision, QA-81-001

`capacityFit` treated a soreness reading as an argument against every candidate. It is not: it is
a statement about what the body can be _asked_ for. An effortful move is marked down by it, a
restorative one is what it is asking for, and a light one — half an hour with Adaya, phone away —
is untouched by it. The dimension now says that in three branches instead of one slope, each with
its own note.

**Why this and not a wider generator.** Phase 81 shipped with the `capacity` limiter having no
move that addressed it, and the reason recorded at the time was real: widening the recovery
generator on `strain === 'none'` produced "ease off today" over an hour with a daughter, which is
a scoring-model change wearing a copy fix's clothes. The mistake was locating the fault in the
generator. A sore, well-rested father had a light move available the whole time and it was being
marked down by a fact about his shoulder. With the reading corrected, the gate can be opened
without the regression it was closed to avoid, and the arbitration decides on the merits.

**What is not claimed.** That `ease-off` never out-ranks time with Adaya. On the fixture built for
this it still does, on `bottleneck-fit`, and that is a judgement the ranking is entitled to make
once nothing false is feeding it. Section 10's protection of that move is against being merged or
made conditional, not against being out-ranked. [[D-125]]

**And the guide narrows with it.** D-111's exception — ask anyway when an answer would let the app
ask _less_ — fired on sixteen of twenty-one histories once soreness had a move of its own, because
almost any answer could now flip something. It is bounded to standing moves that are actually
effortful: where the app is already proposing something light, there is no harm to put a floor
under, and section 47 fails a phase for asking too much. Back to nine.

---

## D-123 — A composed clause names nothing it did not derive

**Phase:** 81 (QA repair) · **Status:** Active — builder decision, QA-81-002

No sentence-building function in `explain.ts` takes a noun from its caller. The trade-off clause
had been handed the chosen move's `target.object` and assumed it named the winner; for a `recover`
move that object is the thing being put **down**, so under _"Take the rest of the afternoon as
recovery — no subnetting session"_ the app printed _"subnetting still looks like the better call"_,
while listing that same move under **Chosen over**.

**The class is not the sentence.** It is a clause completing itself with an entity it did not
derive from the thing the clause is about — the same shape as DEF-0001's orphan pronoun, one level
up. The fix removes the parameter rather than correcting the argument, so the next clause written
cannot make the mistake.

**And the clause stayed.** The first repair also made the trade-off conditional on a limiter, which
was silently the deletion of AUD-0026: at no hour of any history in the library is `direction-fit`
materially against with nothing short — measured, zero — so every unit test passed and the only
thing that caught it was a browser test pressing an answer. Saying nothing passes every falsehood
test ever written. The cost is still named; what completes it is what the app read, and when
nothing is short, that the hour is time away from the week he set. [[D-114]]

---

## D-124 — A move put on screen twice and left is taken off the table

**Phase:** 81 (QA repair) · **Status:** Active — builder decision, QA-81-003

`applyConstraints` rejects a candidate the surface has already rendered `SHOWN_ENOUGH_TIMES_TODAY`
times in the owner-local day. Twice is a coincidence; a third is the app not listening.

**Why a filter and not a weight.** D-118 gave the ledger a score penalty, which is the gentler half
and stays — it is what makes a second showing cheaper than a first. What a penalty cannot do is
promise an outcome: a move whose lead is wider than that dimension's whole range at its current
weight keeps winning however often it has been read, and the audit's own reproduction did exactly
that at four hours of one day. Re-cutting the weights is AUD-0035's work. A bounded rule in the
filter keeps the promise without touching the scoring model.

**The silence it can cause is named.** Three histories in the library now end a day with every
candidate held back for having been read already. _"There were things worth doing and none of them
suit where you actually are"_ is false there — they suit fine — so that state says so in its own
words. A repair for one falsehood has no business introducing another.

---

## D-125 — Two refusals stop the offers; an answer re-opens them

**Phase:** 81 (QA repair) · **Status:** Active — builder decision, QA-81-004

The escalation AUD-0023 describes is _stop offering and ask_, and Phase 81 built only half of it.
The guide relaxed the bar a question had to clear while the engine went on ranking, so a history
where no counterfactual question existed fell straight through to a third suggestion — on the
audit's own reproduction, a third guess about time with Adaya, under _"Nothing else worth asking
right now"_. Both halves now read the same threshold, and the engine is where stopping happens.

**An answer is the way back, and not only a courtesy.** Two refusals mean something the app cannot
see is in the way; an answer is the owner making it visible, and a changed picture earns a fresh
look. Without that, an app that stopped at two would have nothing to refuse a third time, and
D-119's stop could never be reached at all.

**What the copy promises.** That it has stopped guessing, and that the block turning over is the
way back. Not a question — the guide may have none worth asking, and the honest fallback is the
state itself rather than a promise the app cannot keep. Where there is one, it renders directly
beneath. [[D-119]] [[D-111]]

---

## D-126 — A rule about listening may stop the app speaking, not change its mind

**Phase:** 81 (QA round 2 repair) · **Status:** Active — builder decision, QA-81-006

When the repetition rule (D-124) withholds the only candidate that answers a named limiter,
nothing that fails to answer that limiter may take its place. What is left is a real no-action
state, and it says why it is one.

**Why the two rules needed an order.** They were written a day apart and each was correct alone.
D-122 gave the `capacity` limiter a move; D-124 stopped a move being put on screen more than twice
in a day. Their interaction is the defect independent QA found: once the recovery move had been
read twice, the filter removed it, the ranking was recomputed over what remained, and the
runner-up won. On "A morning after three bad nights" that runner-up is ten minutes of subnetting
recall — offered at eleven at night to a man the same screen described as nine hours short of
sleep, by an app that had spent the afternoon and the evening saying _"no subnetting session"_.

**The principle, stated so the next pair of rules inherits it.** The shown-ledger is a record of
screens. It is not evidence about the owner's life, it never was (D-118), and it therefore has no
standing to change what the app believes is good for him. It may make the app quieter. It may not
make it wrong.

**One definition of "answers the limiter."** `answersLimiter` lives beside `Limiter` and is read
by the dimension that rewards it, the filter that protects it and the invariant that sweeps for
it. Three copies of that rule would have drifted, and the way they would have drifted is the way
this defect already went: the filter removing what the evaluator thought was the only good answer.

**Measured, not assumed.** The rule fires on two of a hundred and five decisions across the
library with the ledger running, and both are the reported defect. A version without the bound —
firing whenever anything at all was withheld — blanks ordinary screens and breaks D-124's own
reproduction; there is a test for that direction too. [[D-124]] [[D-122]]

---

## D-127 — A horizon fragment keeps the grammatical shape its callers assume

**Phase:** 81 (QA round 2 repair) · **Status:** Active — builder decision, QA-81-007

`blockNoun` returns a bare noun phrase — a determiner and at most two words — for every block and
for the fallback. `hereNowWord` is where an adverb belongs. Every branch of the no-action copy is
held as a finished sentence at every block, in `tests/synthetic/no-action-copy.test.ts`.

**What the contract was worth without a guard.** The function was documented as "a plain noun
phrase, for a sentence that needs one" and returned "tonight" for late night, which is an adverb.
Every caller drops it into a frame that takes a noun, and the no-action screen at half past eleven
read _"Nothing on the list is worth tonight it would cost."_ The fallback arm returned "the time
you have" — a noun phrase, but one already carrying a relative clause, which breaks the same
frame.

**Why every existing sweep was green.** They ask which words appear. `block-sweep.test.ts` checks
that nothing says "evening" outside the evening, across every scenario at every block — and it can
only see the branches the library actually reaches. The no-action states are reached in ones and
twos, so most of this catalogue had never been rendered by anything.

**What rendering it found.** Beyond the reported sentence: the fallback arm above, and a third —
`nothing-in-reach` ended _"rather than about your evening"_ at every block, including nine in the
morning. That is gate item 1 of this phase, in a sentence written to protect a different truth,
under the sweep built to catch precisely it.

**So the guard is a table of finished lines.** Forty of them, written out rather than generated,
because a generated expectation is the implementation restated and this file exists because the
implementation was wrong in a way only a reader could see.

---

## D-128 — A goal is behind only when its own trajectory says so

**Phase:** 82 · **Status:** Active — AUD-0046

The `goal-behind` trigger may be raised only where a goal carries both a date the owner set and a
set of named pieces, and less of the work has moved than of the time. Where either is missing it is
not raised at all.

**Why this is not an unused-field story.** `GoalRecord.targetWindow` had parsed, serialised and
reached `ActiveGoal` since Phase 1 with nothing reading it, which sounds like tidiness. The
consequence was not: `candidates.ts` raised `goal-behind` whenever a career goal merely existed and
whenever the cash buffer was merely known, and `evaluate.ts` pays that trigger `urgency 0.4`. So
every career recommendation carried an urgency premium justified by a claim nothing checked, and
there is an owner-facing template for it — _"X is behind where you wanted."_

**Why the measurement is a trajectory rather than a pace.** The app knows when the goal was set,
when the owner said it should be done by, and how many of its pieces have had a session. Comparing
the share of the work that has moved against the share of the time that has gone needs no tuned
constant, because both quantities are his. A pace — "a piece a week" — would have been a number
somebody chose.

**The comparison never reaches a surface.** It is a ratio, and a ratio about a man's own
certification is a completion percentage with the arithmetic hidden. What he reads is counts of
pieces and the date he set (D-129).

---

## D-129 — A goal's pieces are counted and never divided

**Phase:** 82 · **Status:** Active — AUD-0021

`describeGoalTrajectory` says how many named pieces have had a session and how far off the date is.
It says no share, no percentage and no verdict, on any surface — the Career page, the Insights
card, the reason on Now.

**Why the rule needs writing down rather than intending.** AUD-0021 names the risk itself: a "4 of
9" reading is one short step from a completion percentage, which is a score by another name and is
what section 22 forbids. The step is short enough that the next person to touch the card will take
it without noticing, so the guard sweeps for `%`, `percent`, `score` and "on track" over every
sentence the trajectory can produce — and asserts the Insights card carries no `rate`, because the
evidence panel renders a rate as a percentage and a card could print "0%" under his certification
without any sentence containing a `%`.

**A piece "has had a session" and nothing more.** The weakest claim the evidence supports:
something about it happened and was written down. Not mastered, not finished.

---

## D-130 — An obligation says whose time it takes

**Phase:** 82 · **Status:** Active — AUD-0004

A `commitment-window` carries `whose: 'mine' | 'theirs'`. A span of the owner's own time — his
working hours — makes him unavailable throughout. A span of somebody else's — his daughter's school
day — shapes his day at its **edges** and leaves its middle free.

**Why it is not a nicety.** AUD-0004's two seed questions are the school day and the working day,
and reading them the same way would have the app fall silent from half past eight to three: the
five hours a father with full custody actually has. That is the opposite of the finding, produced
by implementing it literally.

**What it costs to get wrong is asymmetric**, which is why the field is required rather than
optional with a default. Treating his time as free produces a suggestion he cannot act on; treating
her school day as his makes the app go quiet at the only hours it could help.

---

## D-131 — The two schedule questions live on Life and are never asked on Now

**Phase:** 82 · **Status:** Active — AUD-0004

The app knows about two obligations by name — the school day and the working day — and there is no
general "add an event" control. Both are answered on the Life overview, once, and never re-asked.

**Why not through the guide.** `questions.ts` asks about concepts and writes observations; an
obligation is a record kind. Routing it through the guide would have meant either a second kind of
guide question or a concept invented to hold a schedule. Section 12's rotation is for things that
could change tonight's answer once answered; these change every evening after they are answered
once.

**Why the bound is two.** Section 4.5 constrains input burden and AUD-0004 names the mitigation:
ask twice, durably, never re-ask — the shape the custody arrangement already uses. Everything past
those two is a calendar, which is a different product.

**An unanswered seed costs nothing**, and it is written as an aside rather than as a panel. The app
simply does not know about his mornings, which is the state it has been in all along, and Life is a
report he visits rather than a form (D-075).

---

## D-132 — A thread influences the score and never the choice

**Phase:** 82 · **Status:** Active — AUD-0020, and the phase's first gate item

A course of action reaches a decision in exactly one place: the `thread-fit` dimension in
`evaluate.ts`. `arbitrate.ts` and `engine.ts` contain no reference to threads at all, and
`tests/unit/architecture-guards.test.ts` fails the build if either learns one.

**Why the existing guard was the wrong instrument.** Section 17.2 is enforced by an import list
over `src/features/`, and it would have been satisfied by a thread that overrode the ranking inside
the engine. That is a plausible thing for somebody to add: `engine.ts` already contains one
deliberate override (`continuing`, D-049), a second would look reasonable beside it, and nothing
would have caught it.

**So the guard is about where a thread is read, not about which directory read it.** Four files may
look — `situation.ts` assembles them, `threads.ts` is them, `evaluate.ts` scores one dimension,
`explain.ts` says which course a move belongs to. `lifecycle.ts` is the fifth and reads one only in
order to write one: a decline pauses the course, which is the recording side of the line
`docs/ARCHITECTURE_BOUNDARIES.md` draws.

**And `thread-fit` is weighted below `bottleneck-fit`**, asserted against the weights table
directly. A plan that could out-argue a body needing rest is the app nagging the owner with his own
past intentions.

---

## D-133 — Three courses, and no generic way to start a fourth

**Phase:** 82 · **Status:** Active — AUD-0020

`THREAD_KINDS` is `recovery-run`, `study-schedule`, `growth-ladder`, and there is no
thread-creation control anywhere in the app. Each kind is offered beside the move it would be the
first occasion of, and the owner starts it with one tap or ignores it.

**Why the bound is the decision.** AUD-0020 is explicit that this is a strategic skeleton rather
than a project-management subsystem and that the bound is what keeps it one. A screen where the
owner could invent a plan about anything is the second product, and it would arrive by accident.

**Each kind answers a finding raised separately** — recovery was always one night (AUD-0009),
studying had no schedule (AUD-0010), a growth skill had no next rung (AUD-0015a) — which is what
makes three the right number rather than a round one.

**A thread's moves and step count are written onto the record** rather than looked up from the
kind. A course outlives a release, and a table that changed underneath it would silently re-scope a
plan the owner agreed to.

**Its moves are a set rather than a sequence**, and that is a departure from the finding's wording
worth naming. AUD-0020 describes "a small ordered set of expected moves"; for a study schedule an
order is arguable, and for a recovery run it is not — which recovery verb is right depends entirely
on the hour (DEF-0016 gave the afternoon its own, AUD-0003 the morning). Rather than have two kinds
mean two things by one field, the plan counts occasions and the sequence lives in the sentence the
owner reads.

---

## D-134 — A deferral is bounded on four sides at once

**Phase:** 82 · **Status:** Active — AUD-0024

`hold` is returned when the best move — already above `WORTH_DOING` — does not suit this block and
does suit **the next one**, which must be at least an hour away and must have at least twenty
minutes of the owner's own time in it.

**Why four.** AUD-0024 names the risk in as many words: "`hold` could become a comfortable
default", and a deferral path is a new way for the app to say nothing. Each bound removes a
different way of abusing it, and none is a counter anybody has to maintain:

- **the next block only** — deferring across the day is not deferral, it is the app planning his
  Saturday. It also caps the whole thing structurally: a move held into the next block is offered
  there rather than pushed further down the day;
- **an hour of lead time** — "later" that is twenty minutes off is not advice he can act on
  differently from "now"; he would simply wait. Without it, every block boundary becomes a deferral
  opportunity, reachable at the moment it says least;
- **room in the block** — deferring into a stretch of day he does not have is the confident
  wrongness AUD-0004 was added to remove, arriving through the door AUD-0004 opened;
- **the last block of the day has nowhere to go**, so `hold` is unreachable there by construction.

**The held move's own reason does not survive.** "She is here, and that window closes on its own"
is an argument for doing it _now_, and printing it under a sentence that says to wait would be the
app contradicting itself in two lines. The reason is composed from what the deferral rests on: the
move, the block that suits it, and the block that does not.

**And a deferral has no "chosen over" row and no buttons.** Nothing was chosen, so a row saying
otherwise would describe a contest that did not happen; and there is nothing to start, because the
whole content of the sentence is that starting can wait.

---

## D-135 — Three occasions across two settings — D-070 amended, not replaced

**Phase:** 82 · **Status:** Active — AUD-0017, amends D-070 and D-112

Before the app offers to call a growth skill settled, the three-in-a-row the record ends on must
span at least two distinct settings. Where they do not, it says so instead — _"three times in a
row, all in the same place"_ — with the suggestion that would settle it.

**What does not change.** Three occasions, the sequence rather than the survivors (D-112), a
proposal the owner answers, and nothing written until he does.

**Why the bar moved.** The claim is about generalisation and the evidence was about repetition.
Generalisation across settings, people and time is the thing that has to be programmed and probed
rather than inferred from a run in one context (Stokes & Baer, _Journal of Applied Behavior
Analysis_ 10(2):349–367, 1977). Three good goes three weeks apart at the same restaurant with her
father at the table supports "she can do this here, with me" — and "independently now" is what got
written down.

**A skipped setting is unknown and never "familiar".** Two known settings plus a skip is a spread;
one known setting plus two skips is not. Where the record holds no settings at all the app says the
record does not say where, rather than claiming they were in one place — the difference between an
honest gap and an invented fact.

**And the occasion carries how much help she needed**, which is the scaffolding construct itself:
the adult's assistance is pitched slightly ahead of the child's competence and responsibility
transfers as she masters each component (Wood, Bruner & Ross, _J. Child Psychol. Psychiatry_
17(2):89–100, 1976). The three answers name what **he** did — "on her own", "with a small prompt",
"needed me" — which is where section 4.4 asks the framing to sit, and the scale underneath is
unchanged step for step, so every occasion recorded before this phase still parses and still
counts.

**This will fire less often, and that is the point.** It will feel like a regression against the
three-occasion rule, which is why it is written down as an amendment rather than left to be
noticed.

---

## D-136 — A stored judgement about a child is never permanent

**Phase:** 82 · **Status:** Active — AUD-0015(a)

A `development-skill` carries a stage — `practising` or `settled` — set by the owner's
confirmation, read by the candidate generator, and put back by one tap on the Fatherhood page. A
settled skill stops being proposed and comes round as an occasional check at expanding intervals,
in a different sentence.

**Why the stage had to exist at all.** His confirmation used to change nothing. It wrote a
free-text `domain-update` the coverage engine read, `development-skill` entities carried no status,
and `fatherhoodCandidates` enumerated every one of them unconditionally — so "Yes, she has got
this" suppressed the _suggestion_ and not the _move_. Section 62 forbids that in as many words: the
app should preserve the correction and stop reasserting the old belief.

**Why reversibility is not a nicety.** Regression is real in children, and the app must never make
"settled" permanent. The control that sets it is the control that unsets it, on the page where the
skill is listed — a belief he cannot find is a belief he cannot correct.

**The interval runs from her last go, not from his answer**, because that is what the sentence
says: "she hasn't ordered for herself in a couple of months". It doubles with every probe that
actually happens, so the app asks less and less and never becomes a schedule.

---

## D-137 — The instrument is re-cut once, and the constants re-derived from it

**Phase:** 82 · **Status:** Active — AUD-0035, completing D-048

`bottleneck-fit`, `direction-fit` and `goal-fit` abstain — zero value at zero weight — when there
is no limiter, no weekly direction and no goal in the area. D-048's rule, applied to the three
dimensions D-048 explicitly left alone.

**Why the bar could not be carried across.** The old score was a mean over a denominator carrying
between 3.5 and 5.3 units of forced zero depending on how much context a history happened to have.
Measured across the library, the same decisions land between 1.29 and 1.51 times higher once the
dead weight is gone — so `WORTH_DOING = 0.05` corresponded to somewhere between 0.064 and 0.076,
and **which of those depended on the history**. That is AUD-0035's complaint stated as a
translation problem: the bar was systematically harder exactly when the app had least context.

**Set at the bottom of that range and rounded down**, to 0.06. Setting it at the top would have
raised the bar hardest for the histories with least context — the same defect with the sign
flipped — and the app would have gone quieter on the evenings it was already too quiet on.

**`CLOSE_ENOUGH_TO_MENTION` is half the bar, and derived from it.** A gap smaller than half of what
a move needs in order to be worth doing at all is not a difference the app should present as a
decision. It stays absolute and may now do so honestly: AUD-0033 asked for it to be relative to the
ranked spread **or** for the two to be fixed together, and the two have now been fixed together.

**What the re-cut deliberately did not reach.** Three more dimensions still score zero at full
weight for an absent reading — `capacity-fit`, `opportunity-cost` and `time-fit`, each when the
reading it needs is unknown. AUD-0035 scopes itself to "the three older dimensions"; each further
one is a separate judgement about a differently shaped scale; and `time-fit` runs 0…1, so
abstaining there would _reward_ a move for the app not knowing how long the evening is.
`tests/synthetic/instrument-recut.test.ts` enumerates every remaining case with a reason, so the
next phase inherits a list rather than a search and a fourth one appearing fails the build.

**And a consequence worth naming.** Abstention makes the denominator differ between candidates in
the same field, so a candidate with more to say about it is judged over a larger one. That is not
new — D-048 introduced it in Phase 3 — but removing 5.3 units of shared weight made it larger, and
it is visible: on "Nine months of evenings" the ordering of three near-tied candidates changed. The
new ordering is the honest one — the move whose own record says it half-works at the weekend now
loses on a Saturday and wins on the Friday — and the app says out loud that the call was close.

---

## D-138 — An advisor's reach is a share of the field it is judging

**Phase:** 82 · **Status:** Active — AUD-0039

`MAX_NUDGE` is a quarter of the ranked spread, capped at the old absolute of 0.06. A field with one
candidate has no spread and no contest, so the bound is zero.

**Why a number was wrong.** The comment above it said a nudge "can settle a close contest and
cannot reverse a decided one", and 0.06 was chosen against an assumed score range. On the range the
evaluator actually produced, an ordinary evening's whole ranked field spanned 0.137 to −0.023 and
the top two were 0.002 apart — so 0.06 was large on that scale and would have reversed most
rankings the audit observed. The fence was calibrated against a scale nobody had measured, and
AUD-0035 was about to change the real one.

**What the share buys.** Two candidates can be moved past each other only if they were inside half
the spread to begin with — one lifted a quarter, one dropped a quarter — so the old comment's
sentence is now arithmetic. Asserted on the arithmetic rather than on a scenario, because it is a
claim about every possible field.

**The ceiling stays.** A very wide field must not buy a very large opinion: the advisor settles a
margin and never becomes a dimension.

**D-024 and D-025 are untouched.** The tournament was re-run against the re-cut instrument under a
rubric widened by the three checks AUD-0039 asks for — does it get the hour right, does it repeat
itself across a day, does it notice an approach failing — and both architectures scored 100/100.
The hybrid still scores no better, so the baseline stands for the reason it always did.

---

## D-139 — A sweep names the branches it does not reach

**Phase:** 82 · **Status:** Active — owner-facing rule, generalising D-108

Where a sweep asserts something about a closed set of owner-facing sentences, it enumerates which
members of that set the library actually reaches, and names the ones it does not with the reason
and with where they are covered instead.

**What this was learned from, twice in one phase.**

`explain.ts` rendered `nothing-better` as _"Nothing else is pressing, and X pays back tomorrow"_ —
DEF-0012's absence-asserted-from-ignorance, in the same file two siblings had already been removed
from, guarded by a test that forbids that exact phrase by name. It survived three phases because no
history in the library reached the branch. The first scenario with a career move and no career goal
printed it on the first run.

`recall-practice` refused no hour at all, so the app offered a study session at eleven at night. It
survived because every check of "does it suit the hour" ran at the one hour each history was
written for. The tournament rubric, widened to ask at every hour, found it immediately.

**So the rule is mechanical, and it is D-108's fourth check applied to coverage rather than to
assertions.** A green sweep over a set is evidence about the members it reached. Writing down which
those are turns "we did not check that" into a failing test the day somebody removes the exception
or adds a member, and turns an unread sentence into a named gap rather than a silent one.

---

## D-140 — A durable fact and a current reading are two concepts, and only one of them is asked

**Phase:** 82 (QA round 1) · **Status:** Active — engine rule

Where the app holds a durable arrangement about a person and can also observe
something that bears on where that person is right now, the two are separate
values. The arrangement is what the owner answered and is never re-asked
(section 62). The reading is derived from it, may only ever **narrow** it, and
is what every decision, filter and sentence uses.

**What this was learned from.** `Situation.childPresent` was written in Phase 1
to hold a weekly custody arrangement and was read everywhere as a claim that the
owner's daughter was in the room. Phase 82 gave the model its first fact capable
of contradicting that — an obligation belonging to somebody other than the
owner — and on a Wednesday at ten, inside a school day the owner had entered
himself, the app said _"Adaya is here"_ and offered thirty unhurried minutes with
her. Five consumers of that field were wrong for six and a half hours of every
weekday, and a passing test sat directly over it asserting that two hours of the
same day agreed about the value.

**Narrowing only, and the asymmetry is the whole rule.** A school day is
evidence about her afternoon, not about whose week it is. So an unknown
arrangement stays unknown — the guide still has a question to ask, and the
filter still has nothing to rule out — and a stated absence is never turned into
a presence. The derived value can subtract and can do nothing else, which is
what makes it safe to put in front of every consumer.

**One place, once.** The reading is computed in `assembleSituation` and carried,
along with the span that caused it. Three surfaces need to name that span — the
filter says why a move was removed, the premise says where she is, and the
evidence panel cites what the reading rests on — and three separate searches
through the obligation list would eventually name three different spans.

**What must survive the narrowing.** Her span is hers. Reading a child's school
day as time the _owner_ is busy would silence the app through the five hours of
a full-custody week he is most able to act, which is the opposite of what the
obligation was added for.

---

## D-141 — A decision kind that a surface cannot answer for is a defect in the surface

**Phase:** 82 (QA round 1) · **Status:** Active — surface rule

When a new decision kind is added, every surface that explains a decision must
be asked what that kind changes about the question it is answering. A surface
that renders without error for a new kind has not been checked; a surface that
answers the _old_ question about the new kind is worse than one that says
nothing, because the owner has no way to tell.

**What this was learned from.** Phase 82 added `hold`, the fifth Now state. The
evidence panel kept working, kept opening, and kept answering _why this move?_ —
under a headline whose entire content was that the app was **not** offering that
move. The conditions came from the held candidate's `leansOn` list, which is a
list about a move and cannot answer a question about an hour. The panel's own
invariant test passed throughout, because it asked whether the panel had a move
in it.

**The reasoning goes where the decision is made.** The grounds for a deferral
are written in `arbitrate.ts`, beside the conditions they describe, and quoted
by the panel unchanged. Section 51 forbids a parallel explanation truth, and the
cheapest way to honour that is for there to be nothing to disagree with.

**The guard is an enumeration, not an example.** Every `Decision['kind']` the
scenario library reaches is asserted against what each surface owes it,
including the kinds that correctly owe nothing. A sixth kind fails the test the
day it exists rather than the evening somebody reads it.

---

## D-142 — A scoring band states one fact, or it is two bands

**Phase:** 82 (QA round 1) · **Status:** Active — evaluator rule

A dimension's band must produce a sentence that is true everywhere in its range.
Where one band would have to describe two different situations, it is two bands
with two sentences and two values — and the dividing line is the same comparison
the sentence makes.

**What this was learned from.** `time-fit` had one band above 0.8 and it read
_"would not fit before Adaya's school day"_. Ten minutes before the school run,
with every move trimmed to ten minutes by the engine itself, that sentence
appeared beside a figure the same engine had worked out. The band was carrying
"uses everything there is" and "does not fit at all" at once, and had to pick.

**The score is half of the statement.** An overrunning move used to score zero —
the same as one that fits exactly — so the defect existed in the number as well
as in the words, and only the words were reported. Fixing the sentence and
leaving the score would have left the ranking believing something the trace no
longer said.

**Reachability is part of the claim.** A band nothing arrives at can say
anything, so the regression walks the approach to an obligation minute by
minute and asserts that all four bands are reached. That is D-139's rule applied
to a scale rather than to a sentence catalogue.

---

## D-143 — What the app was told and what the app worked out are two rows, and the registry says which

**Phase:** 82 (QA round 2) · **Status:** Active — registry rule, completing D-140

D-140 said a durable arrangement and a current reading are two concepts. This
says where the second one has to live: **in the concept registry**, marked
`derived`, so that every surface which renders the registry gets both — and so
that a surface written next year gets both without knowing anything about school
days.

**What this was learned from.** D-140's repair reached the generator, the
filter, the premise and the learning context, and the round 1 tests asserted
exactly those. Round 2 opened the two screens nobody had opened: the QA fact
ledger and the Fatherhood page's "What the app currently believes". Both render
the registry rather than the decision, and at ten past ten on a Wednesday both
still said _"Child with the owner — yes — for whether she is here today"_, one
tap from a Now screen that had just been repaired to say her school day ran
until three.

**The lesson is about the shape of the repair, not about a missed file.** Fixing
consumers one at a time cannot finish, because a generic renderer is not a
consumer — it is a loop over the registry, and the registry was still telling it
the wrong thing. **A concept's label and its stated purpose are owner-facing
copy**, and they were the last place the old meaning was written down.

**Three rules travel with the flag**, and each is a real hazard rather than
tidiness:

- **Never asked.** There is no question spec and there must not be one.
  `guide.ts` cannot ask what has none, and the owner does not answer the app's
  own conclusions on its behalf.
- **Never counted as coverage.** Nothing writes a record for a derived concept,
  so measuring how long it has been since one would report permanent neglect of
  a fact he cannot supply, and start prodding him about it. That is DEF-0015's
  failure arriving from a new direction.
- **Never corrected directly.** The domain page renders it read-only and points
  at the fact it rests on. A correction typed on a conclusion writes a record
  nothing reads, and on that page it would read as changing the arrangement
  underneath it.

**And a derived row states what it rests on.** "No" is a true row and a useless
one; _"No — Adaya's school day is on until 15:00"_ is the row the owner can act
on. A conclusion shown without its grounds is the app asking to be trusted.

---

## D-144 — A sentence about a quantity is checked against the quantity, not against the band that produced it

**Phase:** 82 (QA round 2) · **Status:** Active — evaluator rule, sharpening D-142

D-142 said a scoring band states one fact or it is two bands. This says how to
tell whether it does: **the sentence is compared with the figures it is a claim
about**, and where a band's words are about minutes, the band's boundary is a
comparison of minutes rather than of a ratio.

**What this was learned from.** D-142's repair split "does not fit" off the top
of a band and left the rest of it — everything from four-fifths of the window to
all of it — saying _"would use all the time before Adaya's school day"_. At
eighteen minutes past eight, with twelve minutes before her school day, a
ten-minute move carried that sentence directly above `opportunity-cost` saying
it takes about 83 percent. Two of the app's own numbers about one move, one row
apart, disagreeing.

**The guard failed for a reason worth keeping.** It asked two questions — are
the four note strings reachable, and does "would not fit" agree with an overrun
— and both had the right answer. It could not check "all", because "all" was a
claim about a quantity and the test only knew how to compare strings and bands.
So the rule now is that **every reachable note is checked against the numbers
the app prints beside it**: "all" means every minute, "most" means more than
half and not all, "would not fit" means more than there is.

**Bands that genuinely are about proportion keep a ratio.** "Fits comfortably"
and "fits" are claims about how much room is left over, and a share is the right
instrument for those. The mistake was using one instrument for both kinds of
sentence because they lived in one function.

---

## D-145 — A requirement and the design that meets it may not be the same number

**Phase:** 82 (QA round 2) · **Status:** Active — product and instrument rule

Where a gate asserts a minimum, the product clears it with margin, and the
margin is stated once as a token rather than repeated as a literal. A design
that sits exactly on a minimum has not met it; it is level with it, and which
side of it a given render lands on is decided by rounding.

**What this was learned from.** Every touch target in the app was declared
`min-height: 2.75rem` — 44px — and the deployed Android gate asserted `>= 44`.
At a device pixel ratio of 3 the growth-stage control measured
`44.00006103515625`. One deployed run reported 126 checks clean; the next
reported 125, on the same bytes and the same control. It was never a flaky test.

**The instrument half is the same rule turned around.** One number, read by the
check's name, its predicate and its diagnostic. The gate had three: two checks
were _named_ for 44 and asserted 40, four asserted 44, and every one of them
printed the measurement through `Math.round` — so the failing run's own
diagnostic reported the control as "44px tall" beside a predicate that had just
rejected it for being under 44. A gate whose report and whose test state
different numbers cannot be acted on, only re-run.

**And a literal repeated is a literal free to drift.** The token guard found two
siblings on its first run: one control written as `44px` instead of `2.75rem` —
the same number in a different unit, which is how a sweep for one misses the
other — and one written as `2.25rem`, thirty-six pixels, under a comment
asserting it was a real touch target. The comment was the whole defence and it
was wrong by eight pixels. That control is on the shell, reachable from every
screen in the product, and nothing had ever measured it.

---

## D-146 — A fact the app works out is excluded where records are resolved, not on the screens that show it

**Phase:** 82 (QA round 3) · **Status:** Active — memory rule, completing D-143

D-143 put the derived reading in the concept registry so every generic surface
would render it. This says the other half: **the fact layer must not manufacture
an answerable unknown for a concept no record can carry**, and that exclusion
lives in `resolveFacts` rather than in each surface that reads it.

**What this was learned from.** `coverage.ts` had an explicit
`definition.derived === true` exclusion, written when the flag was introduced,
because coverage was the surface that had been thought about. `compose.ts` read
`facts.inState('unknown')` and had none. So the review export printed _"Child
here right now — No — Adaya's school day is on until 15:00"_ under what it read
to decide, and _"Child here right now — never answered"_ under what it does not
know, in one document that asks another assistant to treat it as the source of
truth.

**The rule is about where the knowledge lives.** The registry seeds the fact
layer so that a concept nothing has been said about still resolves to a _known_
unknown — that is what lets the guide ask about it and the export say the app
has not heard. That is correct for every concept the owner can answer. The one
place that knows a concept cannot be answered at all is the layer that resolves
records, so that is where it is excluded, and every reader is right without
knowing the flag exists.

**Two guards, for two traversals, and that is not duplication.** `coverage.ts`
walks the registry directly rather than the fact layer, so it needs its own. A
surface that walks the fact layer needs none. Knowing which of those a new
surface is doing is the only thing anybody has to get right.

**And the honest unknowns must survive.** Excluding a concept from the unknown
list is only safe because nothing can ever answer it. Every concept the owner
_can_ answer still appears when nothing has been said about it, and the
regression asserts that as loudly as it asserts the exclusion — an over-broad
fix here would quietly empty the list the guide asks from.

---

## D-147 — The gate is run on the commit that is handed off, not on the one before it

**Phase:** 82 (QA round 3) · **Status:** Active — release rule

A phase is not handed off until the **aggregate** `npm run verify` has passed
from a clean clone of the exact tracked head being handed off, and CI is green
at that same SHA. Component results — lint passed, tests passed, the build
passed — are not a substitute for the aggregate command, and results from an
earlier head are not results for this one.

**What this was learned from.** Round 2's handoff reported CI green and a clean
verify. Both were true, of the head they were run on. One more
documentation-only commit followed, changing a single emphasis marker in
`docs/qa/README.md` from `*"…"*` to something Prettier rejects, and neither gate
was re-run. `npm run verify` at the handed-off head stopped at `format:check`
before lint, tests or build, and CI failed the same job. QA reproduced it in a
clean tracked tree in one command.

**The failure is not the marker.** It is that a documentation-only change was
treated as not needing the gate, and that an earlier head's results were
reported as this head's. Both are easy to do and neither is visible in the
diff — which is why the finishing condition is now written down as a sequence
rather than as a habit:

1. make the last commit;
2. clone the tracked head into a clean directory and run the aggregate
   `npm run verify` there;
3. wait for CI to finish green **at that SHA**;
4. only then write the counts into the handoff, naming the head they came from.

**Naming the head is the part that makes it checkable.** A handoff that says
"CI green" is a claim nobody can test six commits later. One that says "CI green
at `abc1234`" is a claim the next reader can verify in a second, which is the
whole point of D-097's insistence on reading the deployed SHA live rather than
asserting it.

---

## D-148 — A section of a document is inside the document, and inherits what it may say

**Phase:** 82 (QA round 4) · **Status:** Active

D-098 said an excluded area is excluded from the metadata as well as the
detail. It was implemented in the sections that had been thought about.
`diagnosticsSection` was the one builder that took only the request and never
looked at the `ExportHeader` it was handed, so it reported what the **store**
holds rather than what the **document** may describe: whole-store record,
entity, day and week counts, the complete supersession issue list, and every
entry in `facts.inState('unknown')`.

With Private / Sexual Health left out, one library history therefore disclosed
its withheld record twice — `19 records` where the same history without it says
`18`, and `Recent private pattern — never answered`, which names the area and
states that nothing is known in it (QA-82-007). Diagnostics is reached by
**Select all** and is not consent to include the private section, so this was
the document one tap produced.

**The rule:** a section may not describe the store. It describes the document,
and the header is what says which. Concretely, and each of these was a separate
leak the class guard found:

- **Counts are of what may be described**, and say so before they are given —
  D-098's other half is that a document is read in order, so a qualifier after
  the figures does not repair them.
- **A concept is withheld on either of its two privacy facts**, its area or its
  own class. Reading only the area leaks a private-classed concept filed
  elsewhere, which is the narrow-by-id mistake of D-146 one field over.
- **A page of the history is taken from what may be shown, before it is
  counted.** Filtering after `assembleTimeline` had chosen its forty entries
  let a withheld record consume a slot, so the section rendered thirty-nine and
  two histories lost a whole day off the end. The withheld record was
  observable from the length of a list that never mentioned it.
- **A row that could not be read is the one thing whose area is unknowable**, so
  its own claim is trusted in one direction only: a row saying it is private is
  not counted, and a row saying nothing about itself still is. It can subtract
  and never add, so a corrupt row cannot force a real entry to be disclosed,
  and a storage fault is not hidden behind a privacy promise.

**And the guard is a property of the artefact, not of the section that leaked.**
Two stores differing by exactly one private thing must compose the same
document. That covers the header, the trace, the issue list and whatever
section is added next — none of which the defect was found in, and any of which
could have carried it.

**What this does not do.** Discretion stays a display decision and never a
storage decision (section 11): the private record is still in the store, still
resolves, and still reaches the fact layer. Turning the section on restores the
detail _and_ the metadata. Nothing here wires private evidence into
intelligence, and Q8 is not answered by it.

---

## D-149 — Not knowing has six reasons, and one place says how each of them reads

**Phase:** 82 (QA round 4) · **Status:** Active

`UnknownReason` exists because the six ways of not knowing are not the same
thing. Two surfaces then chose their own sentence from `state === 'unknown'`
alone, and both chose the same one: **"never answered"**, which is true of
exactly one of the six.

So the review export said it of a soreness reading the owner gave at 06:41 and
withdrew at 06:55 — in a document that printed `Withdrew an earlier entry`
three sections above (QA-82-008). `insights.ts` said it from the other
direction: `coverageCards` reads `lastEvidenceAt`, which is undefined for
**every** unknown reason rather than only for the one that means nobody ever
asked.

**The rule:** how an unknown reads is written down once, beside the type, as a
`Record<UnknownReason, string>`. A seventh reason is then a compile error in one
file rather than a seventh thing that silently reads as never having been
asked — the fallback was the whole behaviour, which is why removing the
fallback is the fix rather than adding a case to it.

**Four of the six sit on top of an answer the record holds** — withdrawn,
contradicted, lapsed, unreadable — and only `never-observed` is a claim about
the whole history. That is the distinction the sentence was destroying, and it
is why this is a truthfulness rule rather than a copy preference.

**The note carries the specifics** the fact layer left: which records
disagreed, that the only rows were unreadable, that the only records for this
concept are still in the future. That last one is why the phrases are about
being _answered_ rather than about the record being empty — a concept whose only
record is dated tomorrow genuinely has never been answered, and the note is what
stops that reading as a life with no gaps in it.

**What this does not do.** It does not shorten the list. Every concept the owner
can actually answer still appears when nothing has been said about it; an
over-broad fix here would quietly empty the list the guide asks from, and the
regression asserts that as loudly as it asserts the reasons. `ConsideredFact`'s
own `not known — <reason>` on the QA inspector is untouched: QA named it as
already preserving the distinction, and it does.

---

## D-150 — A document is composed from the record it may describe, not filtered on the way out

**Phase:** 82 (QA round 5) · **Status:** Active

D-098 and D-148 said an excluded area is excluded from the metadata as well as
the detail, and from every section rather than the ones somebody thought about.
Both were implemented as **filters on renderers**, and both rounds that followed
found renderers nobody had filtered: the coverage list, the history rows, the
diagnostic counts, the unknown labels, the timeline page, the supersession list
— and then Direction printing a private goal's own words, Corrections printing
why a private answer was withdrawn, and Learning and Insights publishing
conclusions and occasion counts computed from private readings.

**A renderer is not the boundary. The record the document is composed from is.**

### The case that proves it, because no filter could have caught it

A private observation of the owner's energy outranks the public reading beneath
it. The app then says _"Set today up as a light day"_ instead of _"Spend the
next ten minutes with Adaya"_, and the reason, the subject, the follow-up, the
limiter, the trace score and the whole ranking change with it. Every one of
those sentences is the withheld reading's content in another form.

There is no filter over a finished decision that unmakes it. Withholding only
the fact row leaves the conclusion standing with its evidence removed, which is
the exact failure D-091 exists to prevent, one artefact further out: a claim
carried to a reader who cannot see what it rests on.

So a conclusion drawn from a withheld record **is** that record's content, and
goes with it. `composeExport` withholds once, at the store, and runs the app's
own pipeline over what is left.

### The composer may decide, and only here, and this is the rule rather than a hole in it

`compose.ts` has said since Phase 7 that it cannot reach anything that decides —
"an export that did its own arithmetic would be a second brain with no surface,
and the first time it disagreed with Now, nobody would find out." The point of
that rule is that the export must not reach a conclusion **by a means the app
does not use**. Running the app's own pipeline, in the app's own order, over a
store with one thing taken out of it is not a second means. It is the same
means, shown a redacted record, which is what the owner asked for when he turned
the section off.

What it may never become is a second _way_ of concluding something, and it has
not: `composedFrom` calls `buildView`, `assembleSituation`, `decide`,
`insightsFor` and `assembleTimeline` and nothing else, with the architecture the
owner's own screen used, so the only difference between the two runs is the
record they read.

### And the disagreement is declared rather than hidden

The honest cost is real: with something withheld, the document can state a
different suggestion from the one on the owner's phone. So it says so, in the
About block, before any of it — _"Everything below is worked out from the part
of the record in this document. The app reads the whole record, so where the
area left out matters, what it is saying on his own screen can differ from what
is here."_

**Unconditional whenever the section is off**, whether or not anything is
recorded in that area. A sentence that appeared only when there was something to
withhold would be the participation leak wearing a disclosure's clothes.

### Two facts, both shapes, one direction of trust

- A **record** is withheld on its privacy class _or_ its area, and an **entity**
  on either of the same two. Round 5 reached the class-without-area shape with an
  ordinary health reading marked private, which a rule about the private _domain_
  never sees.
- An **unreadable row** cannot be placed in an area, so it is reported — dropping
  it would hide a storage fault behind a privacy promise. One that _claims_ the
  area is withheld, and the claim is trusted in one direction only: it can remove
  a row and never add one. Round 5 found the claim read in the plural
  (`domains`, a record's shape) and not the singular (`domain`, an entity's).

### What this does not do

Nothing is deleted from the owner's own store; the withholding happens in a copy
the composer makes, and section 11's rule that discretion is a display decision
and never a storage decision is intact. Deliberate opt-in restores the detail
_and_ the counts. No public section is disabled, no genuine unknown is removed,
and no private evidence is wired into intelligence — Q8 and the Reach package
are untouched.

---

## D-151 — A document that withholds rows carries no coordinate into the file

**Phase:** 82 (QA round 6) · **Status:** Active

D-150 moved the export's boundary to the store it is composed from, and that
held for everything the store holds. What it could not reach is metadata a
**retained** row brought with it.

A malformed row keeps its own `index`, and Recent record printed it as
`Record row 19`. Put one private record ahead of that broken row and the same
line reads `Record row 20`; put three and it reads `Record row 22`. The text
names nothing private, and the number is a count of what was withheld — in a
document that has just promised to say nothing about whether anything is
recorded there.

**The survivors are not renumbered, and the reason is a fact rather than a
preference.** `snapshotFromWire` carries a malformed row's `index` through a
backup verbatim: a restored row's position refers to the array of whatever file
it came out of, which may have nothing to do with today's. Subtracting today's
removals from that would produce a number that means nothing rather than a safer
one — a false claim about the file, which is the defect D-091 forbids rather
than the privacy one it was meant to fix.

**The rule:** a row's position in the file is a coordinate into the file, and it
belongs where the file is. The owner's Timeline keeps it, because he has the file
and a row he cannot find is no use to him. The review export names the row by
what it is — _"A record — could not be read — 8 things wrong with it"_ — and says
once, in the same list, that the position is on his own screen rather than here.

**Dropped in both directions**, not only when something is withheld. A position
in a file the reader does not have was never worth much to them, and one rule is
easier to keep than two. `tests/unit/architecture-guards.test.ts` fails the build
if anything under `src/features/export/` reads the field again.

**And the storage fault is still reported.** The count is honest, the kind of row
is named, and what was wrong with it is described. Hiding the damaged rows to
make a privacy assertion pass would be the opposite defect: a fault concealed
behind a promise that was never about faults.

### The same shape, three rounds running

D-098 said an excluded area is excluded from the metadata. D-148 said every
section inherits that. D-150 said the record a document is composed from is the
boundary. This says the last part out loud: **what a retained row carries is
metadata too.** Each round the rule was right and its reach was one layer short,
and the thing that found the next layer each time was a paired document rather
than a reading of the code.

---

## D-152 — An empty list has more than one reason, and each of them is a different thing to say

**Phase:** 82 (QA round 7) · **Status:** Active

Four rounds of privacy work made the review export honest about what it was
allowed to describe. Round 7 found the place where it stopped describing
anything at all.

`historySection` returned `NOTHING_HERE` the moment it had no rows to render —
**before** the block that reports rows the app could not read. So a store whose
only rows were damaged produced a document saying _"Nothing in the record for
this"_, which is the opposite of true: there is something in the record and the
app could not read it. Diagnostics still counted the damaged rows, and
Diagnostics is off by default, so the ordinary document mentioned the fault
nowhere at all.

The same zero reached the owner's own screen from the other side. `TimelineData.total`
counts entries at or before the moment being viewed, so a history whose entries
are all _later_ reports zero — and Timeline read that as _nothing could be read_
and told him his file was the problem. Five records had parsed perfectly and were
dated next week.

### The four states

| The store                                      | What is true                                       | Where it is said                                |
| ---------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| nothing in it                                  | there is no history yet                            | "Nothing here yet"                              |
| only rows that could not be read               | there is history and the app cannot read it        | the fault list, and "Nothing readable here"     |
| readable rows, all later than the moment       | there is history and none of it has happened yet   | "…all of it is later than the moment on screen" |
| readable rows, all withheld from this document | there is history and this document may not show it | the same neutral sentence as the second         |

**The last two are the ones that were being called the second**, and each was a
different defect: one blamed the owner's file for the clock he had moved, and one
took a real storage fault down with it.

### Why the fourth reads identically to the second, deliberately

A store whose readable rows were all withheld and a store whose only rows were
damaged reach the same empty display, and in the export they **must read the
same**. The document has already promised, unconditionally, that the excluded
area is excluded down to whether anything is recorded in it; a sentence here that
told those two apart would take that promise back.

So the sentence states the situation and not its cause: _"There are no entries to
show here."_ A reintroduction that added _"and some were left out of this
document"_ passed every paired comparison, because it was said on **both** sides
of the pair — which is worth recording as a limit of paired testing rather than
as a near miss. The guard that catches it asserts that no reason is given, not
that the two sides match.

### And the fault is reported either way

The damaged rows are described whether or not there are entries above them, with
their kind named and their problem stated, as D-151 requires. Hiding them to tidy
an empty screen would be the app being neat about a failure — section 36's rule,
and the reason the "Nothing readable here" panel exists at all.

An empty store still says nothing, because inventing a fault where there is none
is the opposite error and just as available.

---

## D-153 — A reading of one moment may not be worded as a claim about the whole record

**Phase:** 82 (QA round 8) · **Status:** Active

D-152 said an empty list has more than one reason. Round 8 found the same class
three more times, and one of them was inside D-152's own repair — so this states
the rule one level up from the list, where the **sentence** is.

### The three

- **The reassurance that denied the panel under it.** D-152's new Timeline
  sentence said _"nothing has been lost and nothing is unreadable"_,
  unconditionally, and on the fixture it was written for it sat directly above
  six rows whose stated reason is _"could not be read"_. The clause was true of
  the entries it was about and false of the store, and the screen said both at
  once.
- **The area nothing had "ever" come in about.** `evidenceByDomain` correctly
  skips records dated after the moment being read — a reading from next week is
  not evidence about now. The silence that left was then worded _"Nothing has
  ever come in about sleep & recovery"_, in a document whose own header named
  five later entries in that area and their date span.
- **The fault that was read perfectly.** Two records that each claim to replace
  the other parse without trouble and are held back from reasoning.
  `historySection` walked only `unreadable`, so a history whose sole trouble was
  a replacement cycle produced _"There are no entries to show here"_ and nothing
  else. Diagnostics reported it, and Diagnostics is off by default.

### The rule

**A projection is a reading of one moment. A sentence about it must not reach
past that moment.** Concretely, in the three shapes this has now taken:

- _Never_ and _ever_ are claims about the whole record. Where the projection is
  empty only because the record is dated later, the sentence says **at this
  point** and says how much is later. Where nothing has genuinely ever arrived,
  the absolute stays, because there it is true and it is what tells the owner the
  app is not hiding a gap.
- A reassurance is about the thing it is reassuring the owner of, and nothing
  else. _"None of it has been lost"_ is about the later entries; _"nothing is
  unreadable"_ was about the store, which the panel below it was contradicting.
- **A row that was read and cannot be used is still a fault.** Held back from
  reasoning is not the same as absent, and a surface that reports only what
  failed to parse leaves the second kind unmentioned. They are listed separately
  because they are different things to tell somebody: one the app could not read,
  the other it read and cannot trust.

### What this does not license

It does not turn a held-back row into a dated entry, and it does not make future
data evidence about the present. Both would be the opposite error, and both are
proved by reintroduction rather than promised: `coverage.ts` still refuses a
later reading as current evidence, and the export still invents no day heading
and no entry count for a tangle.

---

## D-154 — A distinction is not carried until every consumer of the projection carries it

**Phase:** 82 (QA round 9) · **Status:** Active

D-153 said a reading of one moment may not be worded as a claim about the whole
record, and gave `DomainCoverage` a `later` count so the two silences could be
told apart. Round 9 found that the count had been added and **read in one place**.

- `coverageSection` builds one bullet as `label — status, evidence strength;
HEARD. SUMMARY`. Round 8 repaired `SUMMARY` and left `HEARD` deriving from
  `daysSinceHeard === undefined` alone, so the rendered line read _"nothing heard
  at all. Nothing has come in about sleep & recovery at this point. 4 entries
  here are later than it."_ The two halves of one sentence contradicting each
  other is worse than the absolute was on its own.
- `standingFor` in Life mapped every `unheard` area to one standing without
  reading `later` at all, so _"You have not mentioned these"_ was said over an
  area the owner had mentioned four times.

**The rule:** adding a field is not the repair. The repair is that **every
surface deriving the old, coarser answer now derives the new one** — and the way
to know is to enumerate the consumers of the projection rather than the
consumers of the sentence that was reported.

`daysSinceHeard === undefined` and `status === 'unheard'` are both that coarser
answer. Anything reading either of them is a consumer, whatever it goes on to
say.

### Two things this fixes, and the shapes they take

**A sentence assembled from parts is one sentence.** A bullet built by joining a
prefix, a status and a summary is read as a whole, and a guard that asserts one
part proves nothing about the line. The round 8 tests checked `entry.summary`
and the round 9 tests check the rendered bullet, which is why one passed while
the deployed line contradicted itself.

**A group heading and its note make different claims.** _"Nothing here yet"_ is
about the moment and is true of both kinds of area, so both stay in the group;
_"You have not mentioned these"_ is about the whole record and was true of only
one. The note is now true of both, and the areas that are merely ahead of the
owner say so on their own line.

That line appears only when there is one to write. A Life group grows the
per-area layout as soon as any area in it has a detail, and on an ordinary
history at an ordinary clock nothing is later — so the seven-area list stays one
line, which is what `groupsFrom`'s own note is protecting.

### What this does not license

Future records still do not become current evidence, an area nothing has ever
reached keeps its absolute in both the prefix and the summary, and no area is
moved out of a group to make a sentence easier. All three are proved by
reintroduction rather than promised.

---

## D-155 — A route may not promise what no generator can produce

**Phase:** 82 (QA round 10) · **Status:** Active

D-154 said a distinction is not carried until every consumer of the projection
carries it. This is the same rule pointed the other way: a projection may not
_describe_ a capability the code behind it does not have.

`routeFor` chose `an-action` — "the app will create something that brings this
area back" — whenever the stale domain had **any** entity in it.
`coverageCandidates` needs a move for that _domain_ and a subject of that move's
own _kind_, and it has three: a place in Home, a learning topic in Career, a
financial goal in Money. Social has people and places and goals in it and no
move at all, so Life said

```text
Going quiet. The app will try to bring these back on its own.
Social & Relationships … Something worth doing here may come up on Now.
```

on a screen whose own decision trace said **Moves considered 0**.

**The rule:** where one module decides what to promise and another has to keep
it, the capability is a single table both read. Not two models of the same
thing, however carefully each is written — one of them will be wrong and the
one that is wrong will be the one facing the owner.

`refreshing.ts` is that table. Adding a row is the only way to add a promise;
removing one removes the promise in the same commit.

### The route beside it already did this

`a-question` is chosen from `askable`, which is `worthAsking` — the guide's own
answer about whether a question exists. That route has never over-promised,
because it asks the generator instead of guessing at it. `an-action` was the
odd one out, and the fix is to make it ask too.

### Enumerate the consumers of the capability, not only of the route

The reported instance was the most-neglected area with no move at all. Two more
sat behind it, and both are the same rule:

- A domain that **has** a move but no subject of its kind. The old check asked
  for neither.
- A domain the generator would serve **eventually** but not now, because
  `coverageCandidates` only ever looked at `mostNeglected` while Life makes its
  promise on every row on the page. Worse, when the most-neglected area was one
  of the domains with no move at all, the route went silent for everybody and
  the areas that did have a move got nothing either.

Across the scenario corpus that is 21 rows QA found and 117 rows in total.

### What this does not license

**No move is invented to close the gap.** Movement and the social moves are
absent from the table on purpose: "there is capacity for it" and "you are up for
people" are claims about the body and the mood, and a quiet fortnight is
evidence of neither (DEF-0006). The absence of a row is a deliberate answer, and
the repair is to make the route honest about it — the area falls to
`needs-review`, and Life says _"Nothing the app can do on its own will bring
these back"_, which is true and is section 8's fifth preference doing its job.

**No supported direction is dropped** to make the invariant easier, and **no
domain the app may never raise of its own accord** is given a route through Now.
Both are proved by reintroduction rather than promised.

---

## D-156 — A projection reads the capability, not a flag that resembles it

**Phase:** 82 (QA round 11) · **Status:** Active

D-155 said a route may not promise what no generator can produce, and the round
10 repair made `an-action` read the generator's own table. Round 11 found the
same rule broken on both neighbouring routes — and found that the round 10
comment claiming `askable` was "the guide's own answer" was **not true**. It was
a guess dressed as a citation, and writing it down is what let it stand another
round.

### The two failures

**QA-82-015.** `routeFor` received `standing` — the concepts that are durable
facts — and asked whether any was `neglected && askable`. `energy.current` is
not a standing fact, so it can never be neglected, so an area whose only way back
was a question about tonight's energy fell to `needs-review`. Life said _"Nothing
the app can do on its own will bring these back"_ while Now was already asking
exactly that question, one tap from making the area current.

Two mistakes stacked: the wrong **set** of concepts (standing only), and the
wrong **test** over it (`neglected`, which is about a lapsed answer rather than
about whether a question exists).

**QA-82-016.** `domainsWithEvidenceComing` accepted an `action-start` as well as
an `action-completion`. Its own comment said _finished_, and `outcomeWindowFor`
says outright that a move "started and never finished is still a lifecycle
question". So pressing **Start it** and stopping there made Life say an answer
was already on its way.

### The rule

**Where a projection describes what another module will do, it calls that module
rather than modelling it.** A boolean that resembles the capability is worse than
no check at all, because it reads as though the question was asked.

- The question route now applies `askable && questionFor(concept) !== undefined`
  over **every** concept in the area. That is character-for-character the filter
  `probeSwings` opens with (`engine.ts`: for each of `QUESTIONS`, skip unless
  `worthAsking`), so the route and the guide select from one set.
- `domainsWithEvidenceComing` now calls `outcomeWindowFor` on the collected
  episodes and checks the window is still open. The two-day guess it kept beside
  the outcome layer's real window is gone with it.

### The standard this sets, and its limit

A route names a capability that a later layer chooses from. `an-action` promises
a move is **offered to the arbiter**, not that it wins — round 10 proved exactly
that, with two proposals reaching the trace and one chosen. `a-question` now
promises a question is **offered to the guide**, not that today's tap is spent on
it: the guide asks at most three a day and skips any question whose answers all
land in the same place.

Round 11's probe holds the question route to the stricter standard — that the
guide is asking about that area _at this moment_. That is not reachable from
here: coverage is assembled before the decision the guide's selection depends on,
`probeSwings` runs a full decision per answer option, and D-071 requires Life to
show the coverage object the decision was made from rather than a second one.
The disagreement is recorded rather than resolved by weakening the probe, and it
is the first thing round 12 is asked to settle.

---

## D-157 — A route names a capability offered, not a selection won

**Phase:** 82 (QA round 12, adjudicated) · **Status:** Active

D-155 and D-156 made each refresh route read the thing that has to keep its
promise. Round 11 then left one question open, and Round 12 settled it: **what
does naming a route claim — that the app _could_ do this, or that it _is_ doing
it right now?**

**It claims the capability.** `an-action` means a same-domain move is offered to
the arbiter, not that it wins; two proposals reach one trace and one is chosen.
`a-question` means a same-domain question is offered to the guide's candidate
set, not that today's tap is spent on it; the guide asks at most three a day and
skips any question whose answers all land in the same place.

### Why the other reading was refused

Not because it is stricter, but because it is unreachable from where the route is
computed and would break a rule that already exists:

- `assembleCoverage` runs inside `assembleSituation`, which runs inside `decide`,
  which is what the guide calls before it can rank anything. Reading the live
  question from coverage means `coverage → guide → engine → situation → coverage`
  at runtime, and `probeSwings` runs a full decision per answer option.
- Resolving it at the Life screen instead would hand Life a coverage object the
  decision was not made from — the disagreement D-071 exists to prevent, in its
  own words: _"two of those would eventually disagree, with the owner having no
  way to tell which screen was lying."_

### What keeps it honest

A capability claim is only worth anything if the capability is real, so the
boundary is proved rather than asserted: every question-route row carries an
askable catalogue question, every option of every such question can restore its
own area to current, and `needs-review` still exists for an area with neither a
move nor a question. Round 12's probe holds all three.

### The words on the page

_"A question will cover it"_ names what covers the area, not when. It stands
unchanged. A draft of the round 11 repair hedged it to _"would cover it"_, which
broke QA's own pinned expectation and was reverted — the sentence was never the
defect.

---

## D-158 — Two build phases precede canonical Phase 9, and the owner-use review is why

**Phase:** adjudication, after 82 · **Status:** Active

An independent sealed owner-use review (`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md`,
44 findings) was read after Phase 82 closed GREEN, and the owner adjudicated it
against the intelligence audit, the canonical plan, this log and the repository.
The result is recorded in full in `docs/PRODUCT_ADJUDICATION.md` and approved.

**Two build phases now precede canonical Phase 9**, and they are not merged:

- **Routing 83** — _"The instrument, and the things that are untrue."_ An
  ordinary-use acceptance instrument, plus the defects the review found that
  Phase 9 would otherwise typeset as settled design. Blocked on no owner
  decision.
- **Routing 84** — _"What the owner is trying to become."_ The destination and
  discovery structure that Phase 9 designs its product contract around.

**Why not one phase.** Routing 83 is blocked on nothing and routing 84 was
blocked on four owner decisions (D-166 … D-169). Merging them would have made a
confirmed, unusable-Now-card defect (D-160) wait on a policy question about faith
and romance.

**Why not straight to Phase 9.** The review's central finding survived
verification against the tree: there is no `destination`, `milestone` or
`baseline` concept anywhere in `src/`. The product can represent what to do next
and cannot represent what the owner is trying to become — so it cannot represent
progress, and cannot represent a strategy that fails. That changes what a domain
page **is**. Phase 9 would typeset a fact-viewer, pass the owner's phone gate on
it, and the destination model would then have to re-open a passed gate.

**What this does not do.** It does not reopen Phase 82 or anything before it, it
does not re-scope canonical Phase 10 (D-109 stands), and it does not renumber a
canonical phase. Twelve of the review's 44 findings need work before Phase 9;
nine need only that Phase 9 leave room for their shape; twenty-three belong
after it. The audit's membership test is used unchanged — _would Phase 9 approve
the wrong product structure if this landed afterwards?_

**Where the two documents disagreed:** the review wins on what the product is
for; the audit wins on how to sequence it. The audit examined the intelligence
the product **has** and found 51 real defects in it. The review examined the
intelligence the product **promised** and found the promise itself unrepresented.
Both readings are correct; only one changes the phase architecture.

---

## D-159 — Every phase from here to release carries a routing integer greater than 82

**Phase:** adjudication, after 82 · **Status:** Active

`_stated_or_inferred_phase()` parses the `**Phase:**` field as a bare integer and
`handoff_source.build_candidates()` keeps only `max(qa_phase(r) for r in reports)`,
discarding every lower phase as history. With phases 5, 6, 7, 8, 81 and 82 on
disk, the surviving maximum is **82**.

So `**Phase:** 9`, `09`, `8.3` and `9.1` all parse to something at or below 82 and
**never route** — the QA report is discarded, the builder → QA → repair → retest
lifecycle never starts, and nothing warns anyone.

**The constraint is wider than Phase 9, and this is the part nobody had written
down.** Canonical **Phase 10, Phase 11 and Phase 12 are equally unroutable** —
10, 11 and 12 are all ≤ 82. Fixing only Phase 9 would move the silent failure
three phases downstream.

**Product phase names and routing integers are different things.** This table is
the only place they are reconciled, and the `**Phase:**` field carries the routing
integer:

| Product / canonical name                               | Routing integer | Handoff file                |
| ------------------------------------------------------ | --------------- | --------------------------- |
| The instrument, and the things that are untrue         | **83**          | `qa/PHASE_83_QA_HANDOFF.md` |
| What the owner is trying to become                     | **84**          | `qa/PHASE_84_QA_HANDOFF.md` |
| **Canonical Phase 9** — visual coherence               | **90**          | `qa/PHASE_90_QA_HANDOFF.md` |
| Later intelligence — Reach, then Validity              | **91**          | `qa/PHASE_91_QA_HANDOFF.md` |
| **Canonical Phase 10** — performance, PWA, reliability | **92**          | `qa/PHASE_92_QA_HANDOFF.md` |
| **Canonical Phase 11** — adversarial hardening         | **93**          | `qa/PHASE_93_QA_HANDOFF.md` |
| **Canonical Phase 12** — release                       | **94**          | `qa/PHASE_94_QA_HANDOFF.md` |

**Giving canonical Phase 10 the routing integer 92 does not re-scope it.** Only
its routing label changes; its build list is unchanged and D-109 stands. The same
is true of 11 and 12.

**A QA round does not get a new routing integer.** Rounds 1 … n of one phase all
carry that phase's integer, as they did through Phase 82's twelve rounds.

**Routing 83 was briefly claimed by the adjudication round itself** — the held
`NEXT_PROMPT.md` written at the Phase 82 closeout carried `**Phase:** 83 —
product adjudication`. That round was never dispatched through the orchestrator;
no `PHASE_83_QA_HANDOFF.md` exists, and the owner ran the adjudication directly.
**Routing 83 therefore belongs to the build phase D-158 names**, and the held
handoff's scope is superseded rather than reused.

---

## D-160 — A move's identity is what learning pools on; a state belongs to one occurrence on one day

**Phase:** 83 · **Status:** Active

An action has a **stable identity** — the thing outcome learning and the
association engine pool evidence over — and each time it is put in front of the
owner is a separate **occurrence** with its own date, state and outcome. Those
are different things, and no surface may resolve one through the other.

Concretely: the state shown on a recommendation is the state of **this day's**
occurrence of it, or `shown` if there is none. A settled occurrence from an
earlier day may not supply it.

**Why:** verified in the tree at `87e2057`. `stateOfChosen()`
(`src/intelligence/engine.ts:944`) matches `(verb, object.id)` across
`situation.recentMoves`, and `recentMoves` is a **three-day** window
(`src/intelligence/situation.ts:1282`, `addLocalDays(moment.now, -3, zone)`) with
no day filter in the match. `TRANSITIONS.completed` is `[]`, and
`NowScreen.tsx:644-656` disables every action not in `availableActions(state)`.
So a walk completed on the 22nd makes a freshly generated walk on the 25th read
_"Where this stands — Done"_ with all five controls inert — which is exactly what
the owner-use review recorded in E02 and E31, including why the observed gap was
three days.

**The lifecycle planner is already right and is not what changes.**
`openEpisode()` keys on `(target, dayId)`; `planLifecycle` writes correctly. The
defect is in the display path only, and the repair must not "fix" the planner to
match.

**What must not be lost:** `recentMoves`' three-day window is correct for what it
was built for — `recent-duplication` and learning both need to see beyond today.
Narrowing the window would break them. What changes is the **match**, not the
window.

**Why it is a decision rather than a one-line fix:** the review classified this as
a suspected bug and the fix is small, but the rule underneath it is the one the
audit's own blind-spot list names — _"one action identity, many occurrences"_ —
and it will be needed again wherever a surface asks "where does this stand".

---

## D-161 — A capability is accepted when an ordinary owner can reach it from a near-empty store

**Phase:** 83 · **Status:** Active · **Binds:** 83, 84, 90, 91

A capability is not accepted because a prepared fixture demonstrates it. It is
accepted when an ordinary owner, starting from a **near-empty store**, can reach
it through normal use — and the points where an ordinary journey **cannot**
proceed are enumerated with reasons rather than left to be discovered.

**Why:** every gate in this campaign so far is green against fixtures authored by
the same process that wrote the code. Eighteen synthetic scenarios, all
builder-written. The evidence that this matters is the owner-use review itself:
an independent reader with a browser found 44 things that 1,332 unit tests, 501
browser assertions, a 93-check Android gate and twelve rounds of independent QA
did not — and the largest class of them was **objects that are easy to encounter
in a fixture and impossible to introduce as an owner**.

**The instrument comes first**, as it did in Phase 81 (AUD-0008, step 81.0): the
journey fixture family is routing 83's first work package, and everything after
it is verified with it.

**The journey it must run:** unknown aspiration → discovery → object creation →
real action → interruption → concrete outcome → correction → changed
recommendation.

**What this is not.** It is not a demand for more favourable examples, and it does
not replace the existing gates. A rich fixture still proves what it always
proved; it just stops being sufficient on its own.

---

## D-162 — A destination is described, never scored

**Phase:** 84 · **Status:** Active

The destination object routing 84 introduces — what the owner is aiming at, where
he is now, what would count as evidence of progress, what is next, and what is
unknown — is **qualitative by default**. A quantity appears only where the owner
supplied one and it names what it measures (D-084).

**Forbidden on every owner surface, about the owner and about Adaya:** a score, a
percentage, a share, a rate, a rank, a grade, a completion bar, a readiness
number, or any composite across domains.

**Why this needs its own entry rather than resting on the rules already in
place:** plan section 22 forbids a Life Score and D-129 forbids dividing a goal's
pieces, and both stand. But a phase whose whole subject is _progress_ is the one
place where a percentage arrives looking reasonable, and the review is explicit
that avoiding an unsupported percentage is correct while avoiding a meaningful
progress model is not. The answer to that tension is **description with
evidence**, not a number with a friendly face — the same repair AUD-0049 made to
the growth suggestion, applied to the owner.

**What is still allowed:** counts of occasions, dates, the owner's own stated
targets in his own units, and honest uncertainty. Those are what a destination is
described with.

---

## D-163 — Two question budgets, and neither borrows from the other

**Phase:** 84 · **Status:** Active

A question asked to **decide today** and a question asked to **understand the
owner over time** are different instruments with different justifications, and
they carry separate budgets.

- The decision guide is unchanged. D-036's answer-share rule, D-111's narrow
  consequential exception and the three-a-day cap all stand, and routing 84 does
  not raise them.
- The second agenda may ask something whose answer would **not** change today's
  recommendation — an aspiration, a recurring obstacle, a resource, a change —
  because its value is future information rather than a decision flip.

**Rules for the second agenda:** it is never on Now's critical path; it is always
skippable and a skip is respected; an answer is remembered and not re-asked; and
it must be able to **show what the answer changed**. Question volume falls as
answers accumulate, and that is measured across the library rather than asserted.

**Why:** the review's F02, and the audit's own §10 item 20 — `guide.ts` decides
whether to ask by re-running `decide()` under every possible answer, so it
**structurally cannot** ask a question that would not move today's answer. That
mechanism is correct and protected. It is also, on its own, a system that can
know nothing about a life while being certain it has nothing worth asking.

**What this must not become:** an onboarding questionnaire, a domain maintenance
chore, or a licence to ask more in total. Less wasted questioning, more useful
learning.

---

## D-164 — A reason for inability is asked when the answer has a use, and never to fill a field

**Phase:** 84 · **Status:** Active

When the owner says he cannot do something now, the app may ask **one** compact,
optional question about what was in the way — gated on whether the answer has a
credible path to a better decision or a useful future understanding, **not** on a
refusal count.

**Ask when:** the recommendation could be adapted in materially different ways
depending on the blocker; a high-priority intention is repeatedly blocked and the
cause is unknown; a known time/place/resource assumption may be wrong; one answer
could identify a constraint affecting several recommendations; or a
safety-relevant unknown decides whether to offer something easier or stop.

**Do not ask when:** the app already knows the constraint and it is still current;
the owner just answered, skipped or asked to be left alone; there is no useful
adaptation or future consequence; the next move is an obvious respectful stop; or
the only purpose is to populate a record.

**"Just leave it" is always available**, and an unanswered question leaves the
cause unknown rather than guessed.

**Why:** the field already exists and is inert. `action-unable-now` carries an
optional `blocker` (`records.ts:488`), plumbed to `request.reason`
(`lifecycle.ts:384`) and stored on the episode (`:208`) — and **no surface writes
it and nothing reads it**. That is AUD-0050's pattern exactly: complete
plumbing, no control. D-045's separation of inability from decline from effect is
what makes the reason worth capturing, and it stands unchanged.

**What must not be inferred from an inability:** dislike, a verdict on the move,
lack of commitment, a permanent veto, or anything about the owner's character.
The review's own table of meanings is the reference.

**The no-question path is proved as carefully as the question path.** Sometimes
the intelligent response is silence, and an app that asks after every tap has
failed this decision rather than implemented it.

---

## D-165 — A correction states its consequence before it acts

**Phase:** 84 · **Status:** Active

Correcting an **event**, its **date or subject**, a **current fact**, and a
**learned interpretation** are four different gestures with four different
consequences, and each says what it will change before it changes it.

**Why:** today they are one gesture. The review watched _"Not how it went"_
immediately remove a conclusion with no scope shown and no visible way back, and
watched a corrected energy reading leave two readings on screen with nothing
marking one as superseded. The owner needs to repair the memory without becoming
a database operator or invalidating a much broader conclusion than he intended.

**D-047 is not weakened.** A belief correction remains a **watershed** rather than
a deletion: history is preserved, the conclusion is suppressed from that point
forward, and provenance survives. What this adds is the owner-facing grammar
above that mechanism, and a visible distinction between a superseded reading and
a second genuine measurement.

**Out of scope here:** authoring or backfilling a historical event. That is
AUD-0050's retraction half and stays in the later Reach package. The grammar
precedes the authoring surface; it does not wait for it.

**The owner is never asked to diagnose causation** in order to correct something
(D-089).

---

## D-166 — Six emotional dimensions, distinct, independently unknown, never composited

**Phase:** 84 · **Status:** Active · **Answers:** Q7 · **Supersedes the open
question in** DEF-0056

The owner has named the dimensions. The first structured emotional-state model
holds:

- mood
- stress
- motivation
- confidence
- loneliness / social connection need
- mental overload / overwhelm

**Rules, all owner-stated:**

- they stay **distinct** and may each be unknown independently;
- they **do not** form a composite wellness score, and nothing anywhere may
  aggregate across them;
- not all of them are asked on any given day;
- they are asked or observed when informationally useful, under D-163's budgets;
- **free-text emotional context still coexists** with them where useful.

**Energy and tiredness/recovery are not among them.** They stay represented
through their existing Health and Sleep concepts and must not be silently
duplicated into an emotional reading — one quantity with two homes is two
answers to one question.

**Why the architecture already supports this:** verified in the audit and
unchanged since — each dimension is its own `ConceptId` with its own `FactValue`,
`tracked` is per-concept and optional, as are `standing` and `privacy`, and
nothing aggregates across concepts. Structured optional dimensions and free text
coexist **with no schema change**.

**What would break it:** a single `emotional.score` concept. That is the wellness
score arriving through the back door, it is what DEF-0056 refused in writing, and
AUD-0041's guard plus this entry are what prevent it. **The audit's own first
draft nearly proposed it.**

**This unblocks** AUD-0011's emotional half in the later Reach package. It does
not authorise implementing it before then.

---

## D-167 — Private influence is one owner-controlled permission, and it is off

**Phase:** 84 · **Status:** Active · **Answers:** Q8

Private / Sexual Health **must not** silently influence ordinary cross-domain
intelligence. One explicit owner control governs it:

> **Allow Private / Sexual Health to influence recommendations** — default **OFF**.

**When OFF:** private evidence stays stored and inspectable inside its authorised
private surfaces. It does **not** influence cross-domain recommendation ranking
and does not enter pattern discovery.

**When ON:** the intelligence system may use authorised private evidence, and
four things hold at once —

- ordinary Now and Timeline copy stays discreet;
- an explanation must not reveal an intimate premise to someone reading over the
  owner's shoulder;
- the owner can turn the permission off again;
- turning it off stops **future** use without falsifying, rewriting or deleting
  history.

**Domain-level consent, not per-entry.** Per-entry consent is not required unless
later evidence shows the domain-level control is insufficient — it is burden
without a demonstrated benefit, and section 4.5 governs.

**This is neither of the two options the audit framed.** Q8 offered "section 11
wins, behind a structural barrier" or "the registry wins, inspect-and-record".
The owner's answer is a third: **the registry may win, when and only when the
owner has said so.** Plan section 11's "private evidence may still influence
whole-life reasoning" is therefore true **conditionally**, and section 11 is
amended to say so rather than being overruled.

**The structural discretion guard is still required**, not replaced by the
permission. When the permission is ON, `createFactReader.read()` places rendered
values onto `situation.factsConsidered`, and it must remain **structurally**
impossible — not merely conventional — for an explanation or evidence panel to
render an explicit private reading. If that guarantee cannot be made, the
permission cannot be offered.

**This unblocks** AUD-0040 and therefore the later Reach package. It does not
authorise implementing them before then.

**Separately and immediately:** the honesty defect in routing 83 is not gated on
this. The Private page currently promises _"Nothing here appears anywhere else"_
(`domainPages.ts:104`) while `privacy.ts:72` renders **"Private entry"** on
Timeline. One of those two must change in routing 83, whatever this permission
later does.

---

## D-168 — Love / Dating / Romantic Life is the twelfth core domain — D-078 amended

**Phase:** 84 · **Status:** Active · **Amends:** D-078

**Love / Dating / Romantic Life becomes a distinct core domain with its own Life
page.** The model holds **twelve** core domains and the product builds **eleven**
baseline pages — the difference remains the Health & Recovery page, which covers
_Health & Physical Capacity_ and _Sleep & Recovery_ together (D-078's reasoning,
unchanged).

**It is not reduced to Social or Private.** Hiding a romantic aspiration inside
Social forces one domain to carry two unrelated destinations, and Private is
about a different thing entirely.

**What it must eventually be able to hold:** relationship aspirations; dating and
social opportunity; compatibility and boundaries; relationship development;
relevant confidence and social context; and the owner's own stated desired
relationship direction.

**What it must never become:** a date quota, a partner score, a compatibility
percentage, or a ranking of people. D-162 and plan section 22 apply here as
everywhere, and AUD-0047's rule — a quality signal may **only suppress, never
rank** — applies to any person this domain touches.

**Why it is decided now rather than when it is built:** placement is
**navigation**, and Phase 9's gate is owner physical-phone approval. A twelfth
domain arriving after that gate re-opens it.

**Plan section 4.1 already permitted this** — "the domain registry must be
extensible" — which is permission rather than a plan. This is the plan.

---

## D-169 — Review lives on Insights and the domain pages, and earns no navigation tab

**Phase:** 84 structure, 91 build · **Status:** Active

The product gains an in-product way to ask _"what changed, what did I achieve,
what matters, and what should change next?"_ It lives on **Insights and the
relevant domain pages**, where the evidence and its provenance already are.

**It does not get a top-level navigation tab.** Navigation stays as it is.

**What the owner should eventually be able to inspect:** what the system believes;
what it is uncertain about; what it appears to be learning; the current
destination, milestone and strategy; why a strategy changed; and meaningful
progress evidence.

**D-087 stands unchanged.** Timeline offers nothing to press and no filter. It
remains the raw chronological ledger, and the review loop is built elsewhere.
Search over Timeline is refused: it is a large surface D-087 deliberately
declined, and it would be the first place a private entry becomes findable by
attribute.

**No compulsory weekly ritual.** A review the owner must perform is life
administration, which section 4.5 and section 65 both forbid.

---

## D-170 — Faith's passivity is an interim state, not the product design

**Phase:** 84 records it, 91 builds it · **Status:** Active · **Amends:**
AUD-0011's disposition and the audit's DO-NOT-CHANGE item 17

`faithPractice` is currently unread by the intelligence layer and declares
`materialToDecision: false`, and AUD-0011 left the domain inspect-and-record **by
design**. The owner has now ruled that this is **an interim state and not the
eventual product design**.

The owner's stated aim, recorded in his own terms: to pursue **greater closeness
to God and stronger genuine belief while honestly recognising uncertainty**.

**Faith must eventually be able to participate, when the owner chooses that
direction, in:** destination; discovery; practices and experiences; reflection;
strategy; and pattern learning.

**It must never:** manufacture certainty; tell the owner what he believes; grade
faith; treat doubt as failure; claim divine authority (plan section 23); or
become a devotional app by default.

**Why this is a decision rather than a backlog item:** "respectful" had become
indistinguishable from "the app permanently does nothing", and a deliberately
passive domain can still violate the product purpose. Being deliberate did not
make it adequate. Recording it as an explicit later requirement is what stops the
non-decision hardening into the design.

**Scope discipline:** this does **not** expand routing 84 beyond its approved
proving scope of Career, Health and Money. Faith joins when the destination shape
is proved, in the later intelligence phase.

**The custody-arrangement half of DO-NOT-CHANGE item 17 is untouched** and
remains correct.

---

## D-171 — Cross-device continuity is deferred; local-first stands

**Phase:** adjudication, after 82 · **Status:** Active

The product remains **local-first**: the owner's own browser storage, with
explicit backup and restore. Cross-device continuity is **deferred**.

**No accounts, no cloud synchronisation, no server and no new threat model** are
introduced before release merely to solve it.

**Why:** the owner-use review raises a real tension — the product's argument is
that it compounds over years, and its substrate can be erased by clearing site
data — and it explicitly does not demand synchronisation. The cost of an account,
a server and a data-protection surface for a record this intimate is not
justified before the product has proved it is worth keeping.

**What still happens:** backup and restore stay complete and owner-controlled
(Phase 7), reliability work stays in canonical Phase 10 at routing 92, and the
product is **honest** about being one device and one browser rather than letting
the owner assume otherwise.

**Revisit** if the owner reopens it, or if release evidence shows the manual
backup burden is not being carried.

---

## D-172 — Q6 is reopened before routing 91, and the finite concept vocabulary is not the ceiling

**Phase:** before 91 · **Status:** Open — adjudication required before routing 91
starts

**No live model is wired during routing 83 or 84.** D-024 and D-025 stand for
those phases.

Before routing 91 begins, the later-intelligence design must explicitly answer:

> **How can this system discover hypotheses, combinations, sequences and
> potentially important variables that were not manually hardcoded in advance?**

and adjudicate whether **model-assisted hypothesis generation**, **another
bounded inference mechanism**, or a **hybrid** is required.

**Why it is reopened.** The owner's ranked priority is discovering patterns he
cannot identify himself. `association.ts` is single-action and two-arm; a
hand-authored dimension set can only find patterns somebody anticipated; and the
audit's own words are that the current tournament rubric "measures what rules are
already good at and cannot detect the difference this audit is about". Separately,
the product holds **seventeen concepts**, several of them single free-text
strings, and has none for where the owner was, who he was with, whether he
trained, or how work went. **The finite concept vocabulary must not silently
become the permanent ceiling of what the product can understand**, and widening
it is part of what this adjudication must consider.

**Any model-assisted path must preserve, without exception:**

- provenance;
- uncertainty;
- privacy, including D-167's permission;
- owner correction;
- deterministic safety constraints;
- association, never causation (D-089, D-091);
- **no silent canonical facts from model inference** — an inference is a
  conclusion with its evidence attached, never a recorded truth.

**D-025 is not reversed by this entry.** It is scheduled for reconsideration on
evidence, under a rubric strong enough to see the difference (AUD-0039), which is
the condition D-025 itself named.

**Q1** (Adaya's age and normative references) and **Q4** (legacy evidence
admissibility) remain deferred as adjudicated. Neither blocks routing 83 or 84.

---

## D-173 — Routing 84 is accepted on an owner journey, not on a set of fields

**Phase:** 84 · **Status:** Active

Routing 84 must not deliver prettier goal fields. Its acceptance gate proves an
ordinary owner journey, in the owner's own words:

> "I start with a vague desire I have not fully planned myself → the app helps
> make the desired direction concrete → it establishes enough baseline and
> unknowns → it identifies a meaningful next milestone → it connects a strategy to
> that milestone → daily actions can serve that strategy → completion is
> distinguished from actual progress → the system can acquire additional useful
> information without requiring me to already understand myself."

That journey runs on the near-empty store D-161 requires, in each of the three
proving domains — **Career, Health and Money**.

**Why this is the gate rather than a goal:** the review's finding is that the app
understands activities better than the life those activities are supposed to
build. A phase that added a destination field to every domain page would satisfy
a checklist and change nothing about that. The last clause is the load-bearing
one: **the owner is not required to already understand himself**, which is what
separates this from an onboarding form.

**Fatherhood is deliberately outside the proving scope.** The growth model is the
product's best-evidenced mechanism and Phases 81 and 82 each corrected it; it is
the hardest place to prove a new object and the worst place to break one. It
joins once the shape is proved.

**The standing guards must still bite at the end of it** — D-162's no-score rule,
the child copy guard from Phase 81, no wellness composite, no Life Score. A phase
about progress is where those are most likely to be quietly lost.

---

## D-174 — A copy catalogue is rendered along every axis its sentence branches on

**Phase:** 83 · **Status:** Active

A sweep that renders a catalogue of owner-facing copy must vary **every input
the copy branches on**, not only the one the last defect was found on.

**Why:** `no-action-copy.test.ts` exists because a sweep that asks _which words
appear_ can only see the states the scenario library happens to reach. It was
written in Phase 81, it renders every no-action reason at every part of the day,
and it found two further defects of its own class on its first run. It did not
find F39, and the reason is the rule.

It renders against **one** history — a man three nights short of sleep. On that
history `nothing-proposed` always has a recovery limiter and therefore always
takes the limiter branch, so the sentence underneath it, the one that said
_"There is plenty of history here"_, was never rendered by the instrument built
to render every sentence. The catalogue had one axis and the sentence branched
on two: the block **and** the history it was standing on.

**The rule.** Before a catalogue is called complete, list what the sentences
under it actually switch on and check that the catalogue varies each of them.
For the no-action copy that is the block, the rejection shape and the size and
shape of the history; for Timeline's own claims about the record it is how much
of the record is at or before the moment being read.

**What this is not.** It is not a demand that every test be a cross-product of
everything. It is a question to answer once per catalogue, in the file, in
writing — and the answer is cheap to check because the branches are visible in
the function being swept.

**Discovered by this phase rather than before it.** The rule became visible only
when the sweep for F39 was written and the existing catalogue turned out to have
been passing over the defect for two phases. It is recorded here so that the
next catalogue starts with the question rather than with one axis.

---

## D-175 — A promise about what a surface will not show lives beside the policy that decides it

**Phase:** 83 · **Status:** Active

Where the app promises the owner that something will not appear somewhere, the
sentence is written in the module that implements the withholding, and the
surface renders it from there.

**Why:** the Private page said _"Nothing here appears anywhere else."_ in
`features/life/domainPages.ts`. What a primary surface may show is decided by
`mayShowDetail` and `discreetPlaceholder` in `domain/privacy.ts`, which withhold
the **detail** of a private record and deliberately keep the row. Two files, one
claim about the other's behaviour, and they disagreed from Phase 5 until an
independent reader opened Timeline in Phase 82's aftermath. Nothing could have
noticed: there was no place where both facts were in view.

**Concretely:** `PRIVATE_PAGE_PROMISE` is exported from `domain/privacy.ts` and
`domainPages.ts` renders it. A change to `mayShowDetail` is now a change to a
promise in the same file, and the regression reads the constant from one end and
a rendered private record from the other.

**The general form.** A promise about behaviour is a claim, and a claim belongs
where its evidence is (D-143's shape, one layer up). This applies to any surface
that tells the owner what it will not do — discretion, exclusion from an export,
a reading held back from reasoning.

**What this does not settle.** Which of the two repairs section 11 allows is the
right one in a given case. Here the row stayed on Timeline and the promise
changed, because on the owner's own screen a record that hides rows from him is
a record he cannot trust the length of — and the export, where the reader is
somebody else, drops the row instead (DEF-0096). Same policy module, two
surfaces, two correct answers.

---

## D-176 — Every owner-facing control has a name and says what the answer is for

**Phase:** 83 · **Status:** Active · **Binds:** 83, 90, 93

Every `<input>`, `<textarea>` and `<select>` on an owner-facing surface carries
an accessible name — `aria-label`, `aria-labelledby`, a wrapping `<label>`, or a
`htmlFor` that points at it — and every free-text control also states, in view
while the owner is typing, what the app will do with the answer.

**A placeholder is neither.** It is a hint, it disappears the moment there is
anything in the field, and assistive technology is not required to read it.

**Why now rather than in the accessibility phase:** canonical Phase 9 designs
repeated components. An unlabelled input inherited into the design system
becomes settled design, and Phase 11's accessibility attack would then be
re-opening a passed phone gate rather than finding a bug. F40 is the finding;
the timing is the adjudication's.

**Why the second half is not decoration.** E13 recorded the owner typing into a
box and having no way to tell whether the app understood the answer as a current
fact, a standing constraint, an aspiration or an event. A name tells assistive
technology what the control is. The note tells everybody what happens next, and
on a domain page that is the difference between _"add this"_ and _"this becomes
what the app believes from now on"_.

**Enforced rather than remembered.** `tests/unit/architecture-guards.test.ts`
scans every control under `src/features` and fails the build on one with no
name; `tests/browser/phase83.spec.ts` asks the running app the same question
through `element.labels`, which is what a browser actually computes a name from.

---

## D-177 — A quantity in a sentence is compared with the count behind it, never matched against a list of phrases

**Phase:** 83 (QA round 1) · **Status:** Active

Where an owner-visible sentence states a quantity, the guard over it **reads the
number the sentence's own source used and compares the two**. A list of
forbidden phrases is not a guard; it is a record of the phrases somebody has
already thought of.

**Why:** routing 83's second acceptance item is that no owner-visible sentence
asserts a quantity the app did not count, and the guard written for it — a sweep
for phrases like _"plenty of history"_ and _"everything that happened"_ — was
green while Now read _"**The last few times** made little difference"_ on a
history whose evidence panel, one tap lower, said _"**One occasion** in the
record"_ and _"**1 occasion**."_

The phrase list could not have found it, and the reason is the rule. _"The last
few times"_ is not an unmeasurable phrase. It is a perfectly measurable one that
was never measured — `explain.ts` hard-coded it and the count was three lines
away in `learning.ts`, which had the correct singular branch already.

**What the comparison found that the instance did not.** Reintroducing the
hard-coded phrase fails the new sweep at counts of **1, 4 and 12** across three
histories. The wrong plural was wrong in more places than the one an independent
reader happened to stand on.

**The one exemption, and it is a check.** A quantity the app is quoting back —
_"the /26 boundaries went wrong twice"_ is the owner's own recorded words — is
not the app's claim to make. The sweep allows it only where the phrase appears
verbatim in a record the history holds. The app cannot escape the rule by
choosing careful words; only by quoting.

**This does not replace D-174**, which is about the axes a catalogue is rendered
along. D-174 said render every axis the sentence branches on; this says what to
assert once it is rendered. Both were needed and only one existed.

---

## D-178 — One name for an action, in the layer every surface can reach

**Phase:** 83 (QA round 1) · **Status:** Active

There is one table that names an action with its subject in it, it lives in
`src/domain/recommendation.ts` beside `verbLabel`, and every layer reads it.

**`verbLabel` is the eyebrow word on a recommendation card and is not a name for
a thing.** "Move" is not a noun phrase in English. It may open a card headed
_"Move for 25 minutes: a walk"_ and it may not be the subject of a sentence.

**Why:** independent QA read one Now card that said four different things about
one walk — the headline said _"a walk"_, the learned statement said _"**Move**
has made little difference"_, the button that corrects that statement said
_"correct what **move** does for you"_, and the evidence panel one tap lower said
_"getting out for a walk"_.

The panel was right and it was right alone, and that was structural rather than
careless: the naming table lived in `insights.ts`, **above** `learning.ts` and
`corrections.ts`. The two files that write the sentence and the button had
nothing to reach for. Moving the table down is the repair; the four registers
were a layering fact wearing a copy problem's clothes.

**The name is narrowed only where the evidence is.** An `effect` belief pools
every episode with a verb, whatever its object, so the object is named **only
where the pooled episodes agree on one** — `patternName`'s existing rule in
`insights.ts`, now applied wherever a set is described. Naming one object across
a pooled walk and a pooled bike ride would state a claim narrower than its own
evidence, which is D-153's error pointing the other way.

**And each label is named from the set it labels.** One name taken from
tonight's object was labelling two different pooled sets — the rates over
comparable episodes and the split over every occasion. Same rule, asked once per
set rather than once per screen.

**What does not change:** the belief **key** stays verb-scoped, and so does what
a correction rejects. `effect:move` rejects what the app concluded about moving.
Only the words change.

---

## D-179 — A claim of exhaustiveness is a test, or it is a comment

**Phase:** 83 (QA round 1) · **Status:** Active

Where a document, a table or a test says it covers **every** case, something has
to be able to fail when it does not. A list that nothing compares against source
is a comment with a strong adjective in it.

**Why:** routing 83's ordinary-use instrument carried a table headed _"every
control on an owner-facing screen that appends to the record"_. It was compiled
by reading four files; there are five. It missed the course controls on Life and
the belief correction on Insights, and the test above it — called _"keeps the
route table honest"_ — checked that ids were unique, that a field was non-empty
and that a string contained a dot. All three are true of a table missing half its
rows.

The instrument's whole subject is what an ordinary owner can reach, and its
output is routing 84's brief. An incomplete list there is not a tidiness
problem: it is the phase's fifth acceptance item asserting itself.

**What the guard has to compare, and what it cannot.** The reader finds every
record builder the screens call, from the return type and the parameters rather
than from the name — `describeRecord` and `standingCommitments` return records
and build none. It asks **per screen**, because two screens calling one builder
are two controls and a per-builder check stayed green over exactly that case.

What a control _needs_ before it appears is a reading of a screen and stays
hand-written. That half cannot be derived, and saying so is part of the claim.

**A write that nobody taps is named rather than filtered.** `MemoryProvider`
appends the outcomes a history already implies. It is deliberate, documented and
not an owner control, so it is listed as one — because an instrument about
ordinary use has to be honest about what it does not cover.

---

## D-180 — A commit that is not pushed has met no gate — D-147 amended

**Phase:** 83 (QA round 1) · **Status:** Active · **Amends:** D-147

D-147 says the gate is run on the commit that is handed off. This adds the half
it assumed: **the commit that is handed off is one the remote has.** A local
commit has met exactly the checks its author remembered to run.

**Why:** independent QA found `npm run verify` red at the repository head — a
one-character formatting difference in `docs/NEXT_PROMPT.md`, in a
documentation-only commit that was never pushed. CI runs the same command on
every push and would have found it in under a minute. It never ran, because
there was nothing to run on.

The failure is not the asterisk. It is that a commit can exist which nothing
except its author has examined, and the phase's own standing gate is red on it
while every recorded result says green.

**The guard.** `scripts/checkpoint-equivalence.mjs` already exists to certify
that what QA reads and what QA tests line up, so it now also reports commits on
`HEAD` that no remote branch contains. It **reports rather than refuses**: a
local commit is an ordinary state halfway through a phase, and the bundle
equivalence it certifies is true either way. What it stops is finishing a phase
without noticing.

**What this does not license.** It is not permission to push freely. Every push
costs a CI run and a Pages deployment, and several in an hour back the queue up
past the deploy job's own read-back window. Batch the commits; check the head.

---

## D-181 — A milestone is a goal that names its destination

**Phase:** 84 · **Status:** Active

What is **next** on the way to something the owner is aiming at is a `goal`
record carrying `milestoneOf`, not a second record kind. `GoalRecord` gains one
optional reference; there is no `milestone` in `RECORD_KINDS` and there must not
be one.

**Why:** a milestone is a named objective, with a date the owner set and named
work inside it, that can be reached or given up. That is what a goal already is,
in every field. D-178's rule — one name for a thing, in the layer every surface
can reach — applies to objects and not only to actions, and a second kind here
would have meant two horizon readings, two trajectory sentences, two answers to
whether the thing is done, and eventually two of them disagreeing on a screen.

**What the field actually buys**, which is the whole reason it exists:

- **The word on screen.** A milestone belongs to something larger and says so; a
  goal that stands on its own does not.
- **What may be concluded from finishing it.** Reaching a milestone is progress
  evidence about a destination. Finishing an ordinary goal is not, because there
  is nothing for it to be evidence about.

**What it must never buy: a milestone reached from anything except the owner
saying so.** Not from a run of completions, not from a finished course, not from
covered parts. F05 is that attendance is not capability, and a milestone that
marked itself reached would be the same error inside the object built to prevent
it.

**Where the shape is held:** `direction.ts` carries `milestoneOf` on
`ActiveGoal`; `destinations.ts` groups milestones under the destination they
name; `goalCorrectionRecord` carries the reference forward unconditionally, so
marking one reached cannot quietly turn it back into an ordinary goal.

---

## D-182 — An authoring gesture writes the entity before the record

**Phase:** 84 · **Status:** Active

Where a control brings a **semantic entity** into being along with the record
that refers to it, the entity is written first. `MemoryContextValue.create`
takes both and does them in that order; so does the ordinary-use instrument.

**Why:** the two failure modes are not symmetric. A record naming an entity the
index does not have is a **dangling reference**, and every renderer in this
product is built to refuse to speak rather than reach for "it" (D-018) — so a
half-applied write becomes a screen that has gone silent about something the
owner just did. An entity with nothing referring to it is **inert and
invisible**: it appears on no surface, contributes to no decision, and is
overwritten by the identical entity if the gesture is repeated, because
`putEntities` is a put keyed by id.

**Not a transaction, and it does not need to be.** The store's all-or-nothing
guarantee is about a batch of records (section 29); entities are idempotent by
id. What this rule buys is that the intermediate state is the harmless one.

**Where it applies:** any later control that creates an entity. There is exactly
one path today, and the point of writing this down is that the second one gets
written by somebody who was not here.

---

## D-183 — A guard that reads source is widened by the spelling it could not read, never exempted from it

**Phase:** 84 · **Status:** Active

When a guard that scans source reports something correct as wrong, or fails to
see something it should have seen, **the repair is in the reader**. Adding the
file to an allow-list, or rewriting the code into the shape the reader happens
to recognise, is the guard being taught to agree with itself.

**Why: two of them in one phase, and both were one edit away from being hidden.**

- F40's accessible-name scan accepted a template literal and a bare expression
  after `htmlFor=` and **not** a plain quoted string — the simplest correct
  spelling there is, and the one a new form reaches for first. Every correctly
  labelled control added by this phase read as unlabelled. The tempting fix is
  to write the template form everywhere, which leaves the guard teaching authors
  to match its habits rather than to name their controls.
- The ordinary-use instrument's builder reader found a control by its **return
  type ending in `Record`**. The two highest-leverage controls in this phase
  return entities _and_ records together, because that is one act (D-182) — so
  the table's claim to list every control stayed green while it could not see
  them. That is D-179's own failure mode occurring inside the guard D-179 was
  written for.

**The general form.** A source-reading guard encodes a hypothesis about how the
thing it looks for is written down, and the hypothesis is always narrower than
the language. So the question when one fires — or conspicuously does not — is
whether the code is wrong or the hypothesis is, and often it is the second.

**What this does not license.** Widening a reader until it accepts what it was
built to reject. Both widenings here kept every existing condition: the F40 scan
still requires a `htmlFor` naming that control's own id, and the builder reader
still requires a moment argument and a return type from a named list. What
changed is how many ways each may be spelled.

---

## D-184 — The second agenda offers one question per object at a time

**Phase:** 84 · **Status:** Active

The discovery agenda emits **one** prompt per destination — the first thing
about it the app does not know — and the next appears when that one is filled.
It does not emit one per gap.

**Why:** D-163 requires _fewer questions as it learns, not more_, and a
destination has four parts of which three can be missing at once. A prompt per
gap would mean that answering _"what are you hoping Career eventually looks
like?"_ replaced one question with three — the rule inverted, and the agenda
getting louder the more the owner told it. It is also simply how a person asks.

**Measured rather than asserted**, in
`tests/synthetic/destination-and-discovery.test.ts`: over a run of answers the
number outstanding never rises, and by the end it has fallen; and across the
whole shipped library no history asks more than the near-empty store does.

**The general form.** An agenda that decomposes an object into questions has to
ask them in series. Breadth is what turns a conversation into a form.

---

## D-185 — A new no-action reason re-labels a silence and never creates one

**Phase:** 84 · **Status:** Active

Adding a `NoActionReason` may change **which sentence** the owner reads about a
silence the app was already going to keep. It may not change whether the app
says nothing.

**Why:** F11 asks that _"enough for today"_ be sayable — that an evening where
the owner did the thing and there was nothing else should not read as **"Nothing
new for today"**, which is the app reporting the emptiness of its own list on a
day he actually got somewhere. That is a true and useful repair, and it is also
one condition away from a rule that decides for him that he has done enough.

So `enough-done-today` is computed **after** the arbiter has finished, from the
reason the arbiter actually reached, and it fires only where everything
surviving was withheld for having already been on screen **and** at least one
move was completed today. The decision is byte-for-byte the one that would have
been made without it. Phase 82 re-cut the instrument and re-baselined the
tournament (D-137, D-138), and this is what keeps a copy repair from disturbing
either.

**A part-done evening does not count**, and that is the rule in miniature: he
said himself that he did not finish, and telling him he has done enough would be
the app contradicting him.

---

## D-186 — A gate's result is its exit status, never the tail of its output

**Phase:** 84 · **Status:** Active · **Extends:** D-180

A gate has passed when the command that runs it exits zero. It has not passed
because the last few lines you looked at said a number followed by the word
_passed_.

**Why:** the browser suite was run as
`npx playwright test --reporter=dot 2>&1 | tee out.txt | tail -6`. The summary
block is longer than six lines when anything fails, so the visible tail read
**"622 passed (12.8m)"** — and the line above it, cut off, said **"26 failed"**.
The pipeline exited zero because the exit status of a pipeline is `tail`'s.
Twenty-six failures across three widths were reported as a clean run, and CI
found them a few minutes later on exactly the commit that had just been pushed.

That is D-180's shape one layer in. D-180 says a commit nothing but its author
has examined has met no gate; this says a gate whose output its author filtered
has not been read. Both cost the same thing — a green claim over a red result —
and both are cheap to avoid.

**The rule.** Read the status. Where the output is filtered for length, filter
for the failure signatures too, and never through a pipe whose last stage
swallows the status. `grep -E "passed|failed"` over the whole captured file is
enough; `tail` alone is not, because a failing run's summary is longer than a
passing one's, which is precisely when the tail stops containing it.

**What this does not license.** Reading less. The point is not that a summary
line is untrustworthy — it is that the line you did not see is the one that
mattered.

---

## D-187 — A constraint the engine does not act on is recorded plainly and promised nothing

**Phase:** 84 (owner addendum) · **Status:** Active

Where the owner tells the app what was in the way, the app **records it and says
so**. It may not say, or imply, that a recommendation will change because of it,
unless something actually reads the record and changes one.

**Why, and it is a fact about this tree rather than a principle in the abstract:**
a `constraint` is attached as a caution and shown; it is not enforced.
`applyConstraints` never reads `situation.constraints`. `cautionsFor` matches a
constraint's concept against a candidate's `leansOn`, and no `leansOn` anywhere
contains a `blocker.*` concept — so for a blocker that branch **cannot fire**.
`constraints.ts` records the non-enforcement as deliberate.

So a sentence like _"the app will stop putting this in front of you"_ would be
false today, and falsifiable by the owner within one evening — which is worse
than saying nothing, because it teaches him that the app's promises are
decorative.

**What may be said:** what was recorded, where it is, and how to take it back.
**What may not:** what will follow from it.

**Why this is not a reason to withhold the control.** The owner's case is real —
his daughter is asleep and there is nobody else to watch her — and the seven
causes had nothing for it. `someone-needs-me` is semantically wrong (nobody
needed his time; he was not free to leave) and it is `standing: false`, so it
wrote no durable record at all. Capturing it honestly now is the precondition for
F08's blocker aggregation later, which is adjudicated to Validity and needs a
supervision concept, a candidate attribute for _requires leaving the house_, and
a reversal of the non-enforcement decision. None of those is this phase's.

**The guard is a reintroduction, not a promise.** A copy sweep asserts that no
owner-visible string on the blocker path claims a future recommendation will
change, and it is proved by putting such a sentence in and watching it fail.

**This is D-018 and G-009's discipline applied to a capture path**: never claim
knowledge the system does not act on, and never let an absence read as a
capability.

---

## D-188 — A destination is proposed and confirmed by its own function, not by widening the authorable kinds

**Phase:** 84 (owner addendum) · **Status:** Active

The discovery card writes a destination only through `proposeDestination()`,
which returns the same `AuthoringProposal` shape the six authorable kinds return
and composes `milestoneConfirmation()`. `AUTHORABLE_KINDS` stays at six and
`destination` is not added to it.

**The choice, and why this one.** The instruction was to route the discovery
answer through the existing `proposeAuthoring` contract, and that cannot be done
as stated: `proposeAuthoring` is keyed on `AuthorableKind`, which is six kinds,
and a destination is not one of them. Two ways out were available.

- **(a) Add `destination` to `AUTHORABLE_KINDS`.** Four exhaustive tables gain a
  row, which the compiler enforces — genuinely the safer half. But `ENTITY_FOR`
  would have to say what kind of thing in the world a destination is, and it is
  not one: a person, a place and a routine are things he has; a destination is
  what they are **for**. Widening a closed set to reuse a function is the kind of
  change that reads as tidy and leaves the set meaning less.
- **(b) `proposeDestination()`.** No table churn, the six-kind exhaustiveness is
  untouched, and it composes the confirmation sentence this repair had already
  written for the same path.

**(b), and the deciding argument is what the two sets are.** `AUTHORABLE_KINDS`
answers _"what can the owner bring into being?"_ — its members are objects the
rest of the app refers to. A destination is authored through the same **pattern**
(propose, show what is not assumed, confirm) and is not a member of that
category. Sharing the pattern is the point; sharing the enum would be an
overloading of it.

**What the proposal must contain**, and it is the same contract the panel has:
what the app understood, what it will create, and **what it is not assuming**.
The last is the half that earns a confirmation, and the bare-aim case — no
milestone — is exactly where the owner is least able to check it (D-173).

**No interpretation of the words.** The aim is stored byte-identical to what he
typed, in the prompt's own domain. _"More money"_ under a Career prompt stays
Career. Whether it means a Money aim, what amount, what horizon, is routing 91
package 1 (D-172), and this decision does not open it.

**Composed where a test can read it.** QA-84-005 is the standing lesson: a
sentence a surface composes inline is a sentence no test can hold to what is
actually written.

---

## D-189 — An empty history is a reason to report nothing, not a reason to offer nothing

**Phase:** 84 (QA round 2 repair) · **Status:** Active

A screen may not decide it has nothing to show because the store has no records
in it. Readiness is a reason to wait; a record count is not. Where a screen
assembles a situation, it assembles one from an empty view — which
`assembleSituation` has always supported — and each panel says nothing for
itself when it has nothing to say.

**The defect this closes is the product's first impression.** `LifeScreen` and
`DomainPage` both opened with

    if (!memory.ready || memory.snapshot.records.length === 0) return undefined

and that second clause switched off every control that exists **so the owner can
write the first record**: the aspiration form, the six authoring controls, the
area links. `InsightsScreen` never had it. So on a genuinely fresh store Life was
blank, every domain page was blank, and Now — which correctly declines to guess —
offered exactly one control: **Open the QA laboratory**. In production even that
is hidden, so the first screen of the app was empty. QA-84-007.

**Abstaining from a recommendation is not the same as having nothing to offer.**
The abstention itself is right and is untouched: D-018 and G-009 mean the engine
says it does not know rather than inventing something plausible. What was wrong
was treating that silence as the whole of what the product had for him. Now keeps
the headline and adds the ways on that already existed and were unreachable from
it.

**Nothing is invented to fill the screen**, and that is the boundary. The links
go to controls that exist; no recommendation, no placeholder history and no
suggested first move appears. A screen that abstains and then offers a route is
honest; one that abstains and then guesses is the thing the abstention was for.

**The guard is a source instrument**, `screensGatedOnRecordCount()`, because the
defect was a condition rather than a rendering: it reports any file that
assembles a situation and also gates on the store's record count. It reads the
**store's** emptiness specifically — `Discovery.tsx` checks whether a _built
result_ is empty before writing, which is a different claim and a correct one.

---

## D-190 — A confirmation that describes engine behaviour is re-read whenever that behaviour moves

**Phase:** 84 (QA round 2 repair) · **Status:** Active

Where the app tells the owner what it will do before it does it, that sentence is
a claim about the engine, and it is only true of the engine as it stands. When a
generator, a ranking or a reader changes what the app does, **every confirmation
describing that behaviour is part of the change** — and the test that protects it
must hold both halves at once.

**Why this needed saying.** QA-84-001 made `healthCandidates` propose a Health
destination's next milestone. The confirmation on the form that creates that
milestone said _"The app will know it is what you are working towards; it will
not start suggesting it"_ — accurate before the repair, false after it, and false
within the same round. The owner read that sentence and then, on the next screen,
was suggested the step. QA-84-008.

**Two green tests held it open, and that is the instructive part.** One asserted
the Health sentence contained _"will not start suggesting it"_. Another proved the
same step becomes a candidate. Each was true; together they were a contradiction,
and nothing in either could see the other. **A pair of tests that each hold one
half of a contradiction will never fail.** So the regression reads the
confirmation and then makes the app do the thing, on one path, and compares.

**The wording carries the condition the generator actually applies.** Health's
generator returns nothing at all unless the body has something to spend, so the
sentence says so rather than promising a suggestion that a run of bad nights
would not produce. And it remains squarely outside AUD-0045: this sentence is
only ever composed for a **destination's next step**, which is the one routine
the app proposes; a routine the owner introduces through the authoring control is
still never suggested, and that form's own sentence still says so, truthfully.

---

## D-191 — A rendered history entry is one statement

**Phase:** 84 (QA round 2 repair) · **Status:** Active

A tag and the sentence beneath it are one thing the owner reads, not two things
that may disagree. Where a record carries a distinction the owner made, every
part of its rendered entry carries it.

**The round 1 repair is the argument for the rule.** _"Only part of it"_ was
being counted as a completed session and called _Followed through_. The repair
gave a partial completion its own progress rung and its own sentence, and left
the tag alone with a comment arguing that a tag is one word and the sentence
carries the meaning. On Timeline the tag sits **directly above** the sentence, so
the entry read

    Done
    Got part of the way — getting out for a walk.

QA-84-009. The owner's own distinction, contradicted inside a single row, by a
repair that had just been made for that distinction.

**`TAGS` is keyed on record kind, and a kind is not always one thing.** Two
entries of one kind can be different things to the owner — a completion and a
partial completion are the plainest case. So `tagFor(kind)` remains for the
exhaustiveness sweep, which is a claim about the schema, and `tagOf(record)` is
what a surface renders, which is a claim about an entry.

**The guard is over the library rather than the case**: for every record in every
scenario, the tag and the sentence may not disagree about extent. That is the
class — _a rendered entry contradicting itself_ — rather than the one contradiction
that was found.

---

## D-192 — A guard against a promise asserts the class, in one place

**Phase:** 84 (QA round 2 repair) · **Status:** Active

Where a rule forbids a kind of claim, the guard is written over the **class** of
claim and lives in **one module** that every gate imports. A list of phrases is
not a guard; it is a record of the wordings somebody already thought of.

**D-187 said the blocker path may not promise a future adaptation. The guard
written with it blacklisted five formulations** built around _stop_, _won't_, _no
longer_, _avoid_ and _from now on_. On the deployed build the note under _"What
got in the way?"_ said

    This is kept so the app can offer something that fits next time.

and a second branch said _"so the app can stop putting it in front of you at the
wrong moment."_ The guard **collected the first string** and did not match it.
Three narrower copies of that same list existed — in the synthetic suite, the
browser suite and the Android gate — and all three passed while the promise
rendered. QA-84-010.

**The class has three parts** and `scripts/adaptation-claims.mjs` asks for all
three rather than for a sentence: an **actor** (the app, or an unnamed _it_), a
**modality that is not the present** (_can_, _will_, _would_, _next time_, _from
now on_, _later_, _again_), and an **adaptation verb** — something about what is
put in front of him. The cross product is a few hundred formulations from three
short lists, and it catches wordings nobody wrote down.

**No negation exemption.** The first draft carried a list of negators that
cancelled a match, and it immediately let through _"the app will no longer put
this in front of you"_ — reading the _no_ in _no longer_ as a denial. **A negated
promise is still a promise.** Honest denials pass on their own merits, because
they contain no adaptation verb: _"there is nothing the app would do differently"_
is about doing nothing.

**It is plain ESM under `scripts/`** for one reason: `scripts/android-gate.mjs`
cannot import TypeScript, and the finding was that the three gates had drifted
into three different rules. A guard that says different things in different places
is not a guard.

**Scope is the path, not the vocabulary.** _"The app will know it exists and can
refer to it; it will not start suggesting it"_ is the authoring form's sentence
about a routine and is **true** — AUD-0045 means an owner routine genuinely is
never suggested. The rule is not "never speak of the future"; it is "not on a path
where nothing acts".

**And the reintroduction proves the class, not the case.** The old guard passed
its own reintroduction — one already-listed phrase — while the shipped string
sailed through it. The exported `MUST_BE_CAUGHT` names the two strings QA read off
the build, so a future pass cannot be earned by catching only the generic examples.

---

## D-193 — A rule about what may not be said is guarded by closing the set of what is said

**Phase:** 84 (QA round 3 repair) · **Status:** Active · Supersedes the guard
mechanism of **D-192**; D-192's rule about the class stands.

Where a rule forbids a kind of **claim**, the guard has two parts and they do
different jobs:

1. **A closed catalogue of the copy that path renders**, asserted in both
   directions — nothing rendered that is not approved, nothing approved that is
   not rendered. This is the guarantee. It has no escapes, because it is an
   allowlist over a finite set rather than an attempt to recognise a claim.
2. **A classifier over the class**, built only from **closed grammatical
   classes**, shared by every gate. This is a net for new copy, and it is
   best-effort by nature.

**Three guards have now been written for D-187 and two of them failed the same
way.** The first listed five phrases and the shipped string used none of them
(QA-84-010). The second took a cross-product of an actor list, a modality list
and an _adaptation verb_ list, and QA-84-011 broke it in four ordinary words:

    The app will choose a more suitable option.
    The app will pick something else for you.
    The app will use this when deciding what comes next.
    The app will prefer an option that works indoors.

Every one is a plain promise; every one returned nothing, solely because
_choose_, _pick_, _use_ and _prefer_ were absent from the list. QA's sentence for
it is the one to keep: _"the old guards listed remembered phrases; the
replacement takes a cross-product of remembered words and calls that the semantic
class."_

**The lesson is not that the third list should be longer.** Recognising a promise
in ordinary English is not decidable by a rule, and any classifier will have
escapes — _"the app learns from this"_ has no modal and no forward reference and
is still a promise. A guard that claims completeness over ordinary language is
the mistake, not the list.

**So the classifier stopped consulting the verb.** What a promise is _about_ is
unbounded. What is not unbounded is the grammar that puts a sentence in a later
moment: the **modal auxiliaries**, which are a closed class in English, and
**forward deixis**, which is a short closed set. A claim is the app — or its
output, named or nominalised — plus one of those. The verb between them is never
read, which is why _choose_, _pick_ and _prefer_ now fail and why a verb nobody
has invented yet will fail too.

**And the proof changed with it.** A fixture of remembered strings proves only
that somebody remembered them, which was QA-84-011's real objection. The boundary
is now generated: subject × modal × verb over a vocabulary that includes words
that are not words at all — _frobnicate_, _zorble_, _quibblify_ — and every one
of the several thousand sentences must be caught. **A guard with a verb list in
it fails that sweep on the first unfamiliar word.**

**Where a catalogue is not possible**, the classifier is what there is, and the
honest thing is to say so where it lives rather than let a green gate imply more.

---

## D-194 — A catalogue of what may be said is closed over what is rendered, not over where it is written

**Phase:** 84 (QA round 4 repair) · **Status:** Active · Extends **D-193**, whose
two-part shape stands.

Where a rule closes the set of copy a path may render, the set is collected by
**rendering the surfaces and reading what comes out** — every text-bearing
element and every accessible name — and the surfaces themselves are enumerated
**from what they take**, not from a list somebody wrote.

**D-193 closed a catalogue and called it closed. It was closed over one module.**
`APPROVED_BLOCKER_COPY` held everything `blockers.ts` assembles, and the check
collected the return values of `blockerQuestionFor`. But `BlockersPanel` composes
a title, a paragraph and an `aria-label` in JSX, and `ResumePanel` composes a
title, two state sentences and an interpolated note. Six owner-visible strings
answered `false` to `isApprovedBlockerCopy` and **no gate asked them the
question** — QA-84-012.

QA's sentence for it: _"A closed catalogue over data returned by `blockers.ts` is
not a closed catalogue over what the owner and accessibility tree receive."_

**So the collector renders.** `blocker-copy.test.tsx` mounts every surface in
every branch and reads the DOM, which is the only place an interpolated sentence
and a template-literal accessible name exist whole. A seventh string added to one
of those panels tomorrow fails without anybody having thought of it, which is the
property a hand-assembled set cannot have.

**And the enumeration of surfaces is structural too**, or the next component is
invisible in exactly the same way. `blockerSurfacesInSource()` derives the list
from the props: a component taking a `StandingBlocker`, a `BlockerDecision` or a
`ResumableMove` renders blocker copy, and the rendered set must equal that set. A
fourth panel fails until it is rendered here.

**The catalogue has two halves because they are reached differently** — one by
walking the scenario library through `blockerQuestionFor`, one by rendering — and
each check is responsible for its own. A single list would let an unreachable
entry in one half be excused by the other.

**The rendered gates read whole panels.** The browser and Android D-187 cases
read a _child_ locator — the question's inner block, the standing blocker's own
row — so the panel title and the paragraph above the rows were outside every
assertion. They now read the panel, element by element, plus the accessibility
tree.

**The general rule, three findings deep:** a guard over copy must be collected
where the owner reads it. Where it is written is an implementation detail, and
every version of this guard that trusted the writing place has been wrong.

---

## D-195 — Copy is guarded per record and per describer, not per surface

**Phase:** 84 (QA round 5 repair) · **Status:** Active · Completes **D-193** and
**D-194**.

Where a rule closes the set of copy a path may render, the enumeration is over
**the records that path writes** and **the functions that turn a record into
words** — not over the screens those words appear on. A screen is where copy is
read; a describer is where it is made, and one describer feeds four screens.

**D-194 enumerated surfaces and closed the catalogue over three React panels.**
Round 4's repair record then _declared_ the rest — Timeline, the domain page's
"Recently", the correction list and the export — a boundary it had not closed.
**Declaring a boundary is not closing one.** Round 5 changed the shared lifecycle
frame for an `action-unable-now` to _"The app will choose something better next
time"_, and the real `describeRecord` rendered that promise to the owner while
431 tests passed across five suites. QA-84-013.

**Why the surface enumeration could not have found it.**
`blockerSurfacesInSource()` looks for React components whose props include a
blocker-path type. `describeRecord` is not a component and takes none of those
types; it takes a `CanonicalRecord`. The four surfaces that render its sentence
are covered by describing the record once, and were covered by nothing when the
guard looked for panels.

**So the guarantee has three halves**, each proved by the check that can reach
it: what `blockers.ts` assembles (walked through the scenario library), what the
surfaces compose in JSX (rendered), and **what a record reads as** (described).

**And the describers are enumerated from source.** `recordTextFunctionsInSource()`
returns every exported function in `src/` taking a `CanonicalRecord`, and every
one must either be exercised by the guard or named in `NOT_OWNER_TEXT` with the
reason it gives the owner no words. A fourth describer fails until somebody
classifies it — which is the moment to decide whether its words belong in the
catalogue. **That is the part that had to be structural**, because the failure
mode is always the same: a new way of saying something, invisible to a guard that
knows only the old ways.

**The general rule, five findings deep.** A guard over copy must be collected
where the copy is **made** and asserted against what the owner **reads**. Every
version of this guard that enumerated something else — phrases, verbs, modules,
screens — was wrong in the same way, and each was found by somebody writing one
ordinary sentence the guard had not imagined.

---

## D-196 — A sink renders the describer's value and does not add to it

**Phase:** 84 (QA round 6 repair) · **Status:** Active · Completes **D-195**.

Where a rule closes the set of copy a path may render, the guard asserts against
**the value the owner actually receives**, and the invariant that makes that
checkable is: **a surface renders a described record's value unchanged.** A place
that reads a described record may choose whether to show it and may not add to
it.

**D-195 catalogued what a describer returns, which is not what the owner reads.**
Round 6 put one line inside `assembleTimeline`:

    text: record.kind === 'action-unable-now'
      ? `${described.text} The app will choose something better next time.`
      : described.text,

The promise rendered on an ordinary Timeline row. The catalogue was asked about
the honest half — the describer's own output — and 118 tests passed. QA-84-014.

**Why the describer inventory could not find it.** `recordTextFunctionsInSource()`
looks for functions taking a `CanonicalRecord`. `assembleTimeline` takes a
`Situation`; the record is local data inside it. The same is true of the domain
page's assembler and the export composer. **No signature says "this renders a
record"**, so the enumeration has to key on something else.

**It keys on the import.** Whatever else a sink takes, it must import
`describeRecord` to have a described value at all. `recordTextSinksInSource()`
returns every file under `src/features/` that does, and each must be walked by
the guard. A fourth sink is discovered the moment it exists, and the thing that
makes that reliable is that there is no other way to obtain the value.

**And the check needs no catalogue of its own**, which is the part worth keeping.
Comparing the final value against the describer's own output requires no
placeholders, no normalisation and no second list: any composition at all — a
promise, a helpful clause, a stray full stop — makes the two differ. The
catalogue still guards what the describer says; this guards that nothing is added
after it.

**The export is the one sink that legitimately composes** — a date, a tag and an
origin around the sentence — so identity is the wrong test there. What is
asserted instead is that the sentence it carries is the describer's, that the
scaffolding around it is not itself a sentence, and that the whole line makes no
adaptation claim.

**Why not a branded type.** Making `DescribedRecord.text` opaque would turn the
mutation into a compile error, which is attractive. It was not done, for two
reasons. A brand is satisfied by a named constructor, so it makes accidental
composition impossible and deliberate composition merely visible — it is not
itself the guarantee QA asked for, which is over **values**. And it would put a
typing change through eight product call sites during a QA loop that has been
clean on the product for four consecutive rounds. The value-level check catches
accidental and deliberate composition alike, and fails in `npm run verify`, which
is before any browser or release gate.

**Five findings, one rule, now complete.** Copy is collected where it is **made**,
enumerated by what cannot be avoided — the import, the type in the props, the
record kind — and asserted against what the owner **reads**.

---

## D-197 — An exception is permitted exactly, and a screen's blocker copy is proved by what appears with it

**Phase:** 84 (QA round 7 repair) · **Status:** Active · Completes **D-196**.

Two rules, from the two ways D-196's guarantee was still open.

**1. Where a guard grants an exception, the exception is enumerated, not
measured.** D-196 let the export compose "a date, a tag and an origin" around a
record's sentence and checked that the leftover _"is not itself a sentence"_ — by
asking whether it was **longer than sixty characters**. Those are not the same
claim. Round 7 inserted _"This needs special care."_ — twenty-four characters —
before every exported history sentence and 331 tests passed. The scaffolding is
now normalised back to `{day}`, `{tag}`, `{text}`, `{origin}` and must match one
of `APPROVED_EXPORT_SCAFFOLDS` exactly. **Nothing is inferred from how short an
addition happens to be**, which is the general form: a threshold in a guard is a
guess about the thing it is meant to establish.

**2. A screen's blocker copy is whatever appears with the blocker surface and
goes with it.** D-194 enumerated blocker components by the types in their props.
Round 7 wrote one sentence beside `<BlockerQuestion>` inside the same branch of
`NowScreen`, which takes no blocker prop — it derives `blocked` and
`blockerDecision` from local state — and imports no `describeRecord`. **Every
enumeration this phase had built was blind to it**: the synthetic catalogue
passed 13/13 and the browser case 3/3 while the sentence rendered.

**What a parent cannot avoid is that its sentence arrives with the surface and
leaves with it.** So the copy is proved by a **rendered delta**: the whole screen
with the surface up, the whole screen with it dismissed, and everything in the
difference must be approved. That is exactly _"what is on screen because the
blocker is"_, wherever it was written and whatever the writer takes as props.

**The enumeration of hosts is separate and structural.**
`blockerHostsInSource()` finds every file whose JSX contains a blocker surface
tag, which a parent also cannot avoid. A new host fails until a delta covers it.
Naming `NowScreen` in a list would have been the wrong repair and Round 7 said
so; what is listed is which hosts have coverage, and that list is checked against
the JSX rather than trusted.

**And the copy check is not a source parse, deliberately.** The first attempt
read the JSX branch around the tag and pulled the author's text out of it. It
does not work honestly — the enclosing `{` of a JSX expression is not
distinguishable from a block brace by counting, and the extractor walked out of
the branch and reported `const [conceptDraft, setConceptDraft] = useState('')` as
owner copy. **A half-written parser inside a guard is the same mistake as a
half-written classifier.** The enumeration is done where it is exact, in source;
the copy is checked where it exists, on the screen.

---

## D-198 — The screen is the boundary, and the whole export is the boundary

**Phase:** 84 (QA round 8 repair) · **Status:** Active · Supersedes the host
enumeration of **D-197**; its export rule and its two calibrations stand.

Three rules, from the three ways Round 8 got past the last set.

**1. A guard over what the owner reads is scoped to the screens the owner can
reach, not to the components that render them.** Every enumeration this phase
built on how a component is _spelled_ — its prop types (D-194), the module it
imports (D-196), the JSX tag it writes (D-197) — was defeated by writing it
differently. QA-84-018 did it in two lines:

    import { BlockerQuestion as Surface } from './DomainPanels'
    export function WrappedBlockerHost(props) { return <Surface {...props} /> }

**A screen the owner can reach cannot be aliased.** It is behind the bottom bar
or behind a link on Life, and the sweep walks both rather than being told what
they are, so a twelfth page joins by existing. The host inventory is **deleted**
rather than narrowed — Round 8 offered exactly that alternative — because a
narrowed version would still read as an inventory and still be wrong.

**2. A comparison that subtracts is made against the state before the cause, not
against a transition.** D-197 claimed a parent's blocker copy "arrives with the
surface and leaves with it". It does not: **Can't right now** also creates a
resumable move, `ResumePanel` stays after the question is dismissed, and copy
keyed to _that_ state sat in both snapshots and was subtracted away. QA-84-016.

The sweep now compares every screen against the same screens **before the block**,
**in one session**. The first build of it loaded the scenario twice and answered
the guide twice, and `answerGuideWith` answers whatever is being asked — so the
two halves could answer a different number of questions, and the difference then
carried a reading the second pass had recorded. It passed alone and failed at two
of three widths inside the full suite, which is the signature of a comparison
whose halves are not the same run. **A subtraction is only sound when one side is
the other side plus the cause**, and the only way to guarantee that is to block
the move in the session that was just swept.

Comparing against the pristine screens brings along everything else the new records changed — Now's no-action line,
Timeline's total, Insights' counts, the correction control that appears once there
is something to correct — and those are approved in
`APPROVED_WHEN_A_MOVE_IS_BLOCKED`, **under that name rather than as blocker
copy**, because that is what they are. The cost is real and is why the list is
separate: an unrelated edit to an Insights count will fail the blocker gate until
it is approved. That is accepted, because the alternative is a guard that names
some feature of the blocker path and is wrong about it.

It also holds one thing that is not the app's prose at all — `{n} of {n}`, which
is a **reading the owner gave**. `readingText` sends a scale fact through
`describeFactValue`, which renders it bare, and the row is a leaf whenever no
origin badge sits beside it. A reading recorded on the way to blocking a move
lands in the difference like anything else. It is listed under its own comment
rather than quietly, because a list that does not say what its entries are is the
same failure one level down.

**3. A guard over generated output covers the whole output, not a line found by
searching it.** The export check took the one row containing the describer's
sentence, validated its shape, and looked no further — so a second bullet pushed
beside it was never inspected, and 441 tests passed with a promise in the owner's
document. It also `continue`d in silence when no row matched, so its closing
`checked > 0` proved only that _some_ line existed. QA-84-017.

Three claims replace it, none of which selects a line: every line of the document
is free of adaptation claims; the day blocks hold **exactly one bullet per
timeline entry**; and every blocker record's line is **found** — a miss is a
failure, not a `continue` — and its shape approved.

**And the classifier has two calibrations, deliberately.** Run over every screen,
the blocker-path rule flags honest sentences — _"the app cannot work out on its
own"_, _"what the app may reason from"_ — because its subjects include a bare
`it` and its modals include ability. **Narrowing the shared rule until the noise
stopped would be tuning a guard to pass**, which is the failure this phase keeps
finding. So `adaptationClaimsOnAnyScreen` is a second calibration with a
principled difference: a **named** subject and **futurity**, never ability. It
misses three wordings the blocker-path rule catches, and those three are named in
the test rather than left implied.

---

## D-199 — The route set, the reading unit, and every document the owner can select

**Phase:** 84 (QA round 9 repair) · **Status:** Active · Extends **D-198**,
which was right about the boundary and wrong about how to find it three times
over.

Round 8 moved the guarantee from components to **screens the owner can reach**.
Round 9 kept that and broke the three things underneath it: which screens those
are, what a sentence is, and which document "the export" means.

**1. A coverage claim taken from one navigation surface is a claim about that
surface.** The crawl read the `.nav` buttons and the `#/life/` links on Life,
and its own comment claimed a fifth destination would "join the sweep by
existing". **More** is behind a button in the header. **Data** is behind a link
on More. Neither was ever visited, and a plain future-tense promise on the Data
screen passed all three widths (QA-84-019). Adding the header would have been
the same mistake with a bigger number.

The route set is now **seeded from the routing contract** — `routing.ts` is
where a destination becomes one, because `destinationFromHash` sends anything it
does not declare to Now — and then **followed transitively** through every `#/`
link on every screen visited, to a fixed point. Sub-pages arrive that way. It is
read as text rather than imported, because `routing.ts` pulls in the Vite
compile-time defines and importing it from a spec throws (D-197), and it is read
with `indexOf` rather than a regex, because `\[` inside a template literal
collapses to `[` and the pattern that reaches `RegExp` throws where it stands.

`#/qa` is the one exclusion and it is not a choice: `QA_AVAILABLE` is
`!isProduction`, so the route does not exist in the product. The check fails if
that stops being true, so the exclusion cannot outlive its reason.

**2. A leaf node is a unit of markup. A sentence is a unit of meaning.** Four
collectors — three in the browser spec, one in the Android gate — took elements
with no element children and read their text. Two lines defeated all four:

    <p><span>The app</span> <span>will choose something better next time.</span></p>

The owner reads one sentence; the guard read _"The app"_ and _"will choose
something better next time."_, and both are honest alone (QA-84-020).
**A classifier is only as good as the unit it is given.**

The unit is now what the browser lays out as one run of text: an element none of
whose descendants is a block, decided by `getComputedStyle` rather than by a
list of tags — a `<div>` set to `inline` reads as one sentence and a `<span>`
set to `block` does not, and only the computed value knows which. Leaves still
come through, so this strictly widens what is checked. It also splits on
newlines, because a `<textarea>` can hold a whole composed document, and a
proximity window over one enormous string would read the end of one line against
the start of the next.

**3. "The whole export" is every document the owner can select.** D-198 said
every line of the document is free of adaptation claims, and then composed
`['history']`. There are **ten** selectable sections and ten composers. Round 9
put the promise in `correctionsSection()` and **all 1,860 tests passed** with it
sitting in a document the owner can produce from Data in two taps (QA-84-021).
The sections now come from `EXPORT_SECTION_IDS` — the list the product itself
offers — each composed alone and all composed together.

**And the two claims are scoped differently, on purpose.** The promise check
runs over **everything** the crawl reads, chrome included. The catalogue check —
everything the block brought must be approved by name — runs over that **minus
the composed review**, because Data renders the export in a `<textarea>` and
blocking a move rewrites the document. Approving its lines by name would mean
listing every line of every document the app can compose. The exclusion is not a
claim that the document is safe: it is guarded line by line over every
selectable section in the synthetic suite, which is where QA-84-021 now fails.
The subtraction is checked rather than trusted — the composed document must be
non-empty and must have been found, so it cannot quietly start subtracting
nothing, or everything.

**One false positive, enumerated rather than tuned away.**
`REBUILD_PHASE.summary` has described the product since Phase 8; More renders it
and the Overview export includes it, so widening brought it inside the net. The
app-wide rule flags it on _"watches what happens **afterwards**"_ — a named
subject and forward deixis two words later. That is sequence, not futurity, and
the deixis belongs to _"what happens"_ rather than to anything the app says it
will do; telling them apart needs to know which verb an adverb attaches to, and
**a half-written parser inside a guard is D-197's mistake**. The branch is not
removable either: requiring a modal would drop three real promises that carry
none — _"the app can offer something that fits next time"_, _"remembers this for
future recommendations"_, _"ought to weigh this next time"_. So the sentence is
listed exactly, like every other exception in the module, and the cost is
declared: editing the product's self-description fails the gate until the new
wording is approved, which is precisely when somebody might promise something
the engine does not do.

**What is still open, stated rather than found.** A destination cannot be missed
— the contract seeds it. A screen reachable by a link cannot be missed — the
crawl follows it. A **parameterised** sub-route reachable only by a button that
sets the hash, linked from nowhere, would still be missed; clicking every button
on every screen to find out is not something a guard may do, because buttons
write records. The `#/life/` family is counted against the plan's ten pages so
that the one parameterised family in the product cannot silently shrink.

---

## D-200 — Owner-reachable state, everything the browser renders, provenance, and the whole selection

**Phase:** 84 (QA round 10 repair) · **Status:** Active · Extends **D-199**,
which was right about the boundary and wrong about its extent four more times.

Round 9 said the unit of a claim must be as big as the claim. Round 10 found
four places where it still was not, and one place where the gate measured a
moving thing.

**1. Route reachability is not owner-state reachability.** The crawl visited
routes and read them as they arrived. An ordinary **Read more** button on More,
with the prohibited sentence behind it, passed all three widths (QA-84-022) —
and the concession D-199 offered, a parameterised sub-route reachable only by a
button, was **narrower than the actual hole**: no second route was needed at
all. A screen has states, and the owner presses into them.

So a second sweep presses. On every reachable route it clicks each button in
turn and reads the screen after each press, following the app back when a press
navigates away. Presses compound deliberately: a state two presses in is still a
state the owner can be in, and the claim is one-directional — more states can
only find more. It is **not** the sweep the catalogue comparison uses, because
that one needs two states differing by exactly one cause; this one wanders, and
answers only _is there a promise anywhere the owner can get to_. Every click is
bounded and its failure swallowed: a gate that fails because a control was busy
is a gate about timing, which is precisely what went wrong below.

**2. `textContent` is not everything the browser renders.** A `placeholder` is on
the screen and is not text content, and Round 10 put the prohibited sentence in
one (QA-84-023). So the collector now also reads `placeholder`, `title`, `alt`,
what a text control currently holds, and anything a stylesheet inserts through
`content`. **These are enumerated because HTML enumerates them** — they are the
attributes the browser turns into words — rather than because somebody guessed
which ones mattered.

**3. Provenance is not a property of a string.** D-199 excluded the composed
review from the catalogue check by removing every screen line **equal to** a
line of the export. Round 10 rendered _"This needs special care."_ on Data once a
blocker existed and put the same words in the document, and the ordinary
sentence was erased along with the generated one (QA-84-024). A unit is now part
of the composed review when **the element it was read from** is inside the
control that holds it, decided as it is read. A string that appears in both
places is prose, because the owner reads it in both places.

**4. A combinatorial choice is not its endpoints.** The export guarantee composed
each section alone and all ten together. Ten checkboxes are **1,023 documents**,
and Round 10 added a sentence that appears only when exactly `overview` and
`corrections` are ticked (QA-84-025). The selection space is now walked
**exactly** — it is small enough to — on a history that exercises the blocker
path, so a rule keyed on both a selection and a record has something to fire on.
The content space stays every section on every history. Neither is a sample of
the other, and saying which is which is the part that makes the pair a claim
rather than a hope.

**5. A whole-screen comparison needs a whole-screen stability condition.** The
oldest delta clicked, waited for one child to disappear, and read. Dismissing
the blocker question also rewrites the rest of Now, and that write can land after
the child has gone — so the difference attributed eleven ordinary lines to the
blocker, and the case passed on a rerun (QA-84-026). **A gate that a rerun fixes
is a gate that was measuring the wrong thing.** The screen is now read until two
consecutive reads agree: what settles is the thing being measured, not a proxy
for it.

**And the exception list is named for what it holds.** Round 9's
`APPROVED_PRODUCT_DESCRIPTION` had one entry; pressing buttons reached two more
honest sentences — Now's _"The engine **will** not guess"_, which is a promise to
do nothing, and a Timeline record reading _"Left one of the app's questions for
**another time**"_, which describes what already happened. Neither is a product
description, so the list is `APPROVED_NOT_A_PROMISE`. Each would need a different
piece of understanding to dismiss automatically — negation, tense, what an adverb
attaches to — and every one of those is a parser inside a guard (D-197). **The
rule stays blunt and the exceptions stay visible**, at the declared cost that
editing any of those sentences fails the gate until the new wording is approved.

---

## D-201 — The completeness claim stops being about states

**Phase:** 84 (QA round 11 repair) · **Status:** Active · Changes the **kind** of
the whole-app claim that **D-198**, **D-199** and **D-200** each tried to make by
exploring further.

Eight rounds attacked the same sentence — _no screen the owner can reach
promises an adaptation_ — and eight rounds found the same shape of hole: some
set was explored and called every state. Components, then screens, then routes,
then presses. Round 11 ended the argument by finding two holes that **cannot be
closed by exploring harder**:

- **QA-84-027.** The promise sat behind _type `show`, then press_. A sweep that
  presses every button never supplies the word, and no sweep can guess it. The
  reachable-state space is not enumerable by a machine that does not know the
  passwords.
- **QA-84-031.** The promise arrived a second after the screen looked settled.
  Two equal reads 100ms apart declared stability; **any** settle window can be
  outlasted by a longer timer.

Widening the sweep again would have been the ninth version of the same mistake.

**So the claim changes kind.** Whatever state the owner reaches, and whenever it
arrives, the words on the screen came from a string in the bundle that ships.
**That set is finite, knowable exactly, and indifferent to how a state was
reached or how late it appeared.** `scripts/rendered-copy-scan.mjs` reads every
string literal and template piece out of the built owner-facing chunk and
classifies each one.

It is parsed with **acorn**, the parser the toolchain already carries, now
declared as a dependency rather than borrowed transitively. That is not
incidental: the first draft used a hand-written tokenizer and mis-read three
fragments of React's own minified code as product copy. **A hand-written parser
inside a guard is D-197's mistake**; using a real one is not.

**What it does not establish, stated because the pair only works if both halves
are named.** It cannot see a sentence assembled at runtime from pieces that are
each innocent — `'The app will ' + verb + ' next time'` is three strings in the
bundle and one sentence on the screen. **Static covers every state; dynamic
covers composition.** The browser sweeps therefore stay exactly as they are, and
neither is a sample of the other.

**And the cost is the largest this campaign has accepted.** Fifteen shipped
sentences trip the rule, all honest, now listed in `APPROVED_FUTURE_COPY` with
their reasons: promises to do **nothing** (_"will never decide you have got
there"_), confirmations of behaviour the engine really has (naming a next step
does make the engine propose it — acceptance item 1), and statements about what
a backup or restore will do with a file. From here, **any new or edited sentence
anywhere in the product that speaks about what the app will do fails the gate
until somebody writes down why it is honest.** That is a tax on ordinary copy
work. It is accepted because the alternative, demonstrated eight times, is a
guarantee that reads as whole-app and is not.

### The three that were narrower, and are closed exactly

**A document's nodes are not everything rendered inside it (QA-84-028).**
`readingUnits` walked one document; the promise went into a same-origin
`<iframe srcDoc>` on a crawled route. Every frame in the tree is now read. A
frame that genuinely cannot be read is **reported as a hole**, not skipped — and
the surrounding `catch` now rethrows anything that is not a cross-origin or
detached-frame error, because the first draft swallowed a `ReferenceError` from a
half-applied edit and reported every frame unreadable, which looked exactly like
a finding and was not.

**DOM containment is not composition provenance (QA-84-029).** Round 10 asked
`closest('[data-testid="export-text"]')`, so Round 11 moved the marker onto a
wrapper holding the textarea _and_ an ordinary paragraph, and the paragraph
inherited a provenance it never had. What the composer produced is exactly the
string the control holds, so the element must carry the marker **itself** and the
text must be that control's own — whichever property it is read from.

**Exhaustive coverage of each axis is not coverage of their product
(QA-84-030).** All 1,023 selections on one history, plus every section on every
history, missed a rule keyed on a selection **and** on a record only another
history has. The product is now walked whole: every non-empty selection on every
history. Large, finite, and with no sampling left to be wrong about.

---

## D-202 — Two halves with a gap between them, and what is left open

**Phase:** 84 (QA round 12 repair) · **Status:** Active · Corrects the
"whole-app" language of **D-201** and narrows what this campaign claims.

D-201 split the guarantee in two and said so: _static covers every state; dynamic
covers composition._ Round 12's finding is that **the intersection of the two
holes is not empty.** A sentence composed at runtime, in a state no sweep
reaches, is in neither half. Four of the five findings are that gap in a
tractable form; the fifth is the general case, and it is not closed.

**1. Adjacent literals are one sentence (QA-84-032).** The static scan read each
string separately, so `'The app will ' + 'choose something better ' + 'next
time' + '.'` was four innocent strings. It now joins the pieces of a `+` chain, a
template's quasis and an array's elements, and classifies **both** the
space-joined and the bare-joined form, because which one the code produces
depends on where the spaces were put. This is the composition rule the dynamic
half was supposed to be sole owner of; it now owns only the part that needs
**data**.

**2. A stylesheet renders words (QA-84-033).** `content: "…"` puts a sentence on
the screen that no JavaScript string holds. The browser collector already read
`::before` and `::after`; the static scan read no CSS at all. It now parses every
shipped stylesheet's `content` declarations, and `::marker` joins the
pseudo-elements the browser collector asks about. _A first repair attempt wrote
the rule against `src/index.css` — a file that exists in no import graph. It is
recorded rather than tidied away: the guard was green because the promise never
shipped, which is the same false green this campaign keeps finding._

**3. An approval is a claim about a place (QA-84-034).** `APPROVED_FUTURE_COPY`
matched text anywhere, so a sentence honest on the milestone surface was
transplanted verbatim under **A blocker**, where `this` names the blocker and the
promise is false. **An exception is only honest where it was reasoned about.**
Each of the seventeen entries now names the source files it may live in, checked
in both directions: the same words elsewhere is a transplant and fails, and a
listed file that no longer contains them is a stale approval and fails too —
because an exception nothing needs is a hole waiting for the sentence to return
somewhere else. Two entries are joined forms that appear in no file literally, so
they pin on the piece that does.

**4. Carrying the marker is not being the thing (QA-84-036).** D-201 moved
provenance onto the element itself, which was right and still trusted an
assertion: a second textarea with the same `data-testid` and the export's own
label inherited the composed review's exemption. There is exactly one composed
review, so the sweep now asserts exactly that before reading anything. **A
self-declared identity is checkable only by counting the declarations.**

**5. The late frame, narrowed and named (QA-84-035).** A frame attached after the
collector asked is invisible to it. The sweep now subscribes to `frameattached`
for the whole session and reads every frame that ever attached and still lives.
**This narrows the hole; it does not close it.** Proved both ways here: a frame
appearing one second in is caught, and QA's own ten-second frame is _not_ — the
crawl finishes in three. What caught QA's is the static scan, which does not care
when a frame appears.

### What remains open, stated rather than claimed

**A sentence composed at runtime from data, in a state nothing reaches, is not
covered by either half.** The static scan sees the pieces and cannot know what
the engine will put between them; the sweeps would see the sentence and cannot
get to the state. This is not a gap that a wider sweep or a cleverer parser
closes — deciding it is deciding what the program prints, and D-197 forbids the
half-parser that pretending otherwise would need.

So the guarantee is written down at its true size. **Every string the app ships,
and every literal composition of them, is checked; every state the sweeps reach
is checked; a runtime composition in an unreached state is not.** D-201's
"whole-app" phrasing overstated this and is superseded here. Making that
statement smaller and true is the point of the round.

---

## D-203 — An approval is about production, and identity is demonstrated rather than declared

**Phase:** 84 (QA round 13 repair) · **Status:** Active · Narrows **D-202**,
which was right about the shape of the guarantee and wrong about three things it
claimed were inside it.

D-202 said: every string the app ships, and **every literal composition of
them**, is checked. Round 13 took that sentence apart three ways, and each way
was the same mistake in a different place — **a property was checked against how
copy is written, and then used as if it were a property of what copy becomes.**

**1. An approval is a claim about production, not about spelling (QA-84-037).**
D-202 pinned each approved sentence to the source files it may live in, and
checked that by looking for the literal. More then built an approved sentence
out of two fragments — `'…and the app'` and `'will start suggesting work towards
it.'` — neither of which is the approved text. The pin saw nothing to object to;
the joiner assembled the approved words; the global removal erased them. Under
**A blocker**, `this` names the blocker and the promise is false.

So the same extractor that reads the bundle now reads the **source**, and a file
_produces_ an approved sentence when anything it can compose carries those
words, written whole or assembled. Both directions still fail: an unlisted file
that can produce it is a transplant, and a listed file that can no longer
produce it is a stale approval. **One extractor, two inputs** — a second
implementation for source would drift from the one that reads the bundle, and
the entire claim is that the two agree about what a composition is. `acorn` does
not parse TypeScript or JSX, so each file is stripped to JavaScript by
**esbuild**, the transform Vite already builds this product with, now declared
rather than borrowed for the reason acorn was declared in D-201.

**2. "Every literal composition" was three shapes (QA-84-038).** A four-argument
call to a local helper that reduces its arguments with spaces produced a
promise, and the evaluator followed none of it. **Following the call is not the
repair.** A helper can reverse, filter or rewrite its arguments, and an
evaluator that chases user functions is the interpreter-inside-a-guard D-197
forbids. What _is_ enumerable is the set of constructs in which the language
writes an **ordered sequence of expressions**, and an argument list is one of
them exactly as an array literal is. Argument lists are now joined, on the same
terms: every argument must be literal, so `f(x, 'a')` stays quiet. **So is every
other such construct**, enumerated beside the code rather than described here:
a `+` chain, a template’s quasis, an array literal, an object literal’s values,
a sequence expression, an argument list and a multi-declarator statement. JSX
needs no entry — both the bundle and the transformed source reach the parser as
function calls.

**And the claim shrinks to match.** It is no longer "every literal
composition" — it is **"every ordered group of literals the language writes
down"**. A computation that reorders or transforms them is outside it, and that
is the same frontier D-202 already declared for data: a value the guard would
have to run the program to know. The frontier has not moved; **the description
of it was wrong, and is now right.**

**3. Uniqueness is cardinality, not identity (QA-84-039).** D-202 asserted there
is exactly one control carrying the composed review's marker, which is true and
proves only that one thing claims to be it. Round 13 kept the count at one and
replaced the value with a twenty-five-line document that is not an export,
ending in an unapproved sentence — and it inherited the exemption, because the
supporting check was a size floor, which proves a document is big.

**Identity cannot be asserted by the page, so it is demonstrated.** The composed
review is a function of the section selection and nothing else on the screen is:
untick every section and it must change; tick them back and the original must
return. A static impostor can do neither, whatever it carries and however long
it is.

### And the frame claim, corrected rather than defended (QA-84-040)

D-202 said every frame that ever attached is read. It was not: the final pass
skipped any frame that had since detached, so the claim was really _every frame
that survived until the end_. A frame that lived ten milliseconds was
remembered and then stepped over.

The read now **starts when the frame attaches** and the promise is kept. A frame
that still could not be read is **reported as a hole** rather than skipped —
Round 11's rule for a frame that cannot be entered, applied to a frame that is
no longer there. The product attaches no frames at all, so anything unreadable
is something new that nobody has looked at. Both paths were proved separately: a
frame living one second is caught by **reading** it, and one living ten
milliseconds by **reporting** it.

**And it is applied in both sweeps, which it was not.** The remembered-frame
read lived in the route crawl alone, so the press sweep — the one that reaches
the states a frame is most likely to be created in — still saw a snapshot.
Nobody reported that; it was found reading this repair back. **A rule applied
in one of two places is the mistake this campaign has made more often than any
other**, so there is one implementation and both sweeps call it.

### What is still open, unchanged in substance

A sentence the app composes by **running** — from data, or by a computation over
literals the guard does not evaluate — in a state no sweep reaches, is covered
by neither half. D-202 said this of data; D-203 says it of any computation,
which is what it always was. Everything the language groups is checked;
everything the program computes is not.

---

## D-204 — Provenance is read from what shipped, and grouping is read off the tree

**Phase:** 84 (QA round 14 repair) · **Status:** Active · Replaces the source
approximation and the construct list that **D-203** introduced.

D-203 made two claims by approximation, and Round 14 broke both. Each break is
the same lesson in a different place: **a guard that models the product is
guessing; a guard that reads the product is not.**

### 1. Provenance: from `src` to the bundle (QA-84-041, QA-84-042)

D-203 checked where an approved sentence may live by reading
`src/**/*.ts(x)` and asking what those files _can compose_. Round 14 showed
that this is two approximations stacked:

- **The extension is not the module graph.** An approved sentence imported from
  a `.js` module beside the repository shipped, was removed globally as
  approved, and had no origin the check could see. `More` itself held only an
  identifier.
- **"Can compose" is not "did".** A dead `void ['Leave it empty and the app',
'will not invent one.']` kept the approval alive for a sentence the bundler
  had deleted — an exact search of every built asset found **zero** copies of
  it. The stale direction, which exists to retire exceptions nothing needs, was
  the direction that broke.

**So provenance is read from the artefact.** The built chunk carries a
sourcemap, so every string in it traces to the module that produced it — no
extension filter, no `src` assumption, and nothing that was compiled away.
`@jridgewell/trace-mapping` does the tracing, the mapper Vite already builds
this product with, declared for the reason acorn was declared in D-201; the
`esbuild` source pass D-203 added is gone, and with it the crash Round 14 found
in it (QA-84-045 — a valid ambient declaration is not executable TypeScript,
and a guard that dies on a normal source file cannot claim to cover source).

There are now three ways to fail and they say different things: an unlisted
module that ships the words is a **transplant**, a listed module that no longer
ships them is a **stale approval**, and a sentence that is not in the bundle at
all is **dead**. **And the scan fails if a chunk ships without a sourcemap**,
because provenance is the whole of this check and a check with nothing to
compare would otherwise report a clean run. For the same reason, an approved
sentence that also ships from a position the map cannot place is a failure:
a handful of strings trace to nothing, which is harmless for copy the rule
already clears, and useless as evidence about where a second copy of an
approved sentence came from.

### 2. Grouping: from a list of constructs to the shape of the tree (QA-84-044)

D-202 joined three syntactic shapes and called it _every literal composition_.
D-203 made it seven and called it _every ordered group the language writes
down_. Round 14 wrote the words as **computed property names**, which is an
eighth. **A list that has been short three times is not going to be complete on
the fourth guess.**

So the grouping is read off the tree. At every node, each run of adjacent
children that yield literal pieces is joined — whatever that node is. Nothing
enumerates a construct, so nothing can omit one. Two rules keep the runs
meaningful: a **non-string literal contributes nothing and breaks nothing**
(`0` in `{['The app']: 0}` is not a word and is not a reason to stop reading),
and **anything the guard cannot evaluate breaks the run**, because words either
side of an unknown value were never provably adjacent on a screen.

**One detail is worth keeping, because the first attempt got it wrong.** The
repair initially asked whether a property key was `computed` — a question about
source that the bundle has already answered. `{ ['The app']: 0 }` ships as
`{ "The app": 0 }`, and the distinction the check relied on was compiled away
before it ever looked. What survives minification is whether the key is a
**string**, so that is what is asked. This is the same lesson as the provenance
half, one layer down: **ask the artefact, not the source you imagine.**

### 3. Identity: from responsiveness to composition (QA-84-043)

D-203 demonstrated that the marked control is the composed review by unticking
every section and watching it change. Round 14 wrote an impostor whose first
line echoed the chosen ids, so it changed too. **Responding to a control proves
a dependency on that control and nothing else.**

The composed review is not _a function of the selection_; it is **the selected
sections, composed**. So each section's own heading must be in the document when
its box is ticked and absent when it is not, and unticking one must remove
exactly its heading and leave the others standing. An impostor passes this only
by composing the sections, at which point it is the export.

### What is still open, unchanged

A sentence the app composes by **running** — over data, or by a computation the
guard does not evaluate — in a state no sweep reaches, is covered by neither
half. D-202 said this of data and D-203 of any computation; nothing here
narrows it further, and nothing here pretends to.

---

## D-205 — Corroborate the account, read the rendering, and make identity answer to both inputs

**Phase:** 84 (QA round 15 repair) · **Status:** Active · Repairs the four
places **D-204** trusted something it had not checked.

D-204's rule was _read the product rather than model it_, and it was right. Round
15 showed that reading is not the same as **corroborating**: three of these
findings are the guard believing an account without a second source, and the
fourth is reading the wrong artefact.

### 1. A sourcemap is an account, not evidence (QA-84-046)

Provenance came from the built chunk's map, which was a real improvement and
still a single source. Round 15 changed **no shipped JavaScript at all**: in the
map only, it pointed More's copy of an approved sentence at the module that is
allowed to say it, and a caught transplant went clean. **Requiring a map and
counting the positions it places proves a map exists and is busy** — not that
any one attribution is true.

So the account is corroborated against itself and against the tree it describes:

- **the map's copy of a module must be the module.** `sourcesContent` is the
  build's copy of every file it read; when a name is changed without its body,
  the map ends up claiming one module has two different bodies, and comparing
  each against the file on disk says so immediately.
- **the position must say what it is credited with.** Every attribution is
  checked against the source the map itself carries: the words must be at the
  place it names, within a line either side, allowing for a literal that was
  wrapped when it was written. An attribution the named module does not
  corroborate is reported as **disputed**, and a disputed origin for an approved
  sentence fails.

### 2. Tree adjacency is not rendered adjacency (QA-84-047)

D-204 read grouping off the syntax tree, which closed the constructs. Round 15
wrote one sentence as four sibling `<span>`s inside one paragraph: separate in
the tree, one line on the screen. **The tree says how the code is written; the
DOM says what is read.**

A call now contributes its **arguments'** text, so a built element contributes
the text of its children — which is what puts the four spans back together. And
**the element's type is dropped from the join**, because it is what is being
built, not what is read. That second half is not tidying: a nested version,
`<span><strong>The app </strong></span>` and so on, pushed subject and verb far
enough apart with `span` and `strong` that the classifier no longer saw them
together, and the promise passed. **The noise was the hole.** Element names are
a closed set because HTML closes it — the same reason D-200 enumerated the
attributes a browser renders as words. **And the drop is scoped to the type
position**, a call’s first argument, rather than to the word wherever it
appears: matching everywhere would quietly delete _“a table”_ or _“the code”_
from ordinary copy before the classifier ever saw the sentence, which is a
guard weakening itself while looking stricter.

### 3. Membership is not content (QA-84-048)

D-204 proved the marked control is the composed review by requiring each chosen
section's heading and no others'. Round 15 wrote exactly those headings over
thirty invented lines. **Headings show which sections an impostor knows were
chosen; they say nothing about where the bytes underneath came from.**

The document is composed from two things, so it is now required to answer to
both. Its headings track the **selection**, one section at a time as before. Its
body must track the **history**: the same selection over a different life must
produce a different document. An impostor keyed on the checkboxes cannot manage
that — it does not know which history it is standing in front of. This also
retires the "one history" limit the Round 15 dispatch named, because the check
needs two.

### 4. An exemption is worth what proved it (QA-84-049)

The marked control is exempt from the catalogue comparison. That exemption was
granted wherever the marker appeared, while what justified it — the identity
test — ran on Data. Round 15 left the real export alone and put a second marked
control on **More**: one per page, so the uniqueness rule held; never visited by
the identity test; honoured by the crawl that did visit it.

A marker now only grants its exemption on the screen the identity proof covers.
**The screen is read as well as the address, and the count is read after the two
agree** — a press that navigates changes the URL before React has replaced the
document, so a rule keyed on the address alone accuses the honest product
mid-navigation, and a count taken before the new screen arrives belongs to the
old one. Both of those happened here before the settle was added; they are
D-200's race arriving from two new directions.

### What is still open, unchanged

A sentence the app composes by **running** — over data, or by a computation the
guard does not evaluate — in a state no sweep reaches is covered by neither
half. Nothing here narrows that, and nothing here pretends to.

---

## D-206 — Ask the repository, test the pairs that could matter, and make a section prove its own body

**Phase:** 84 (QA round 16 repair) · **Status:** Active · Replaces the
self-corroborating provenance of **D-205** and the two claims it rested on.

D-205 answered _is this account true_ with more statements from the same
account. Round 16 wrote an account that agrees with itself and is false.

### 1. Provenance leaves the build's account (QA-84-050, QA-84-052)

The sourcemap was checked against the files on disk and against its own
positions, and both checks are made of the map's own words. Round 16 changed
**no shipped JavaScript at all** and rewrote the mappings for a transplanted
sentence so they named the module that is allowed to say it: the name existed,
`sourcesContent` matched the file exactly, and the named position really did
contain the sentence. Every check passed. A second version pointed at a comment
sharing the credited sentence's first twenty characters, which was enough
because the check measured twenty characters in a guessed line window — **a
threshold inside a guard, which D-197 has always called a guess about the thing
the guard exists to establish**.

So _which module produces these words_ is answered from the **repository**,
which is not a statement the build gets to make. The app is walked from
`src/main.tsx` through its **relative** imports, each module is stripped to
JavaScript by esbuild and read with the bundle's own extractor, and a module
produces an approved sentence when anything it can compose carries those words.
Two things keep that honest rather than merely different:

- **the bundle still says what ships.** Source alone cannot tell a live sentence
  from one the bundler deleted, which is what QA-84-042 exploited, so the
  approval check keeps asking the artefact that question.
- **an import that cannot be followed fails the scan**, and a repo-local module
  the _map_ names that the walk never reached fails it too. A resolver that
  quietly skipped what it did not understand would shrink the set it claims to
  have read, and a guard that passes by having nothing to say is D-186's
  mistake. The map is now the build's inventory and a tripwire — never the
  authority.

The twenty-character window is gone. What remains of the map check asks for the
**whole** credited text in the module the map names, with no window and no
prefix, and reports a disagreement rather than deciding provenance with it.

### 2. A composition is a hypothesis about pairs, not a paragraph (QA-84-051)

D-204 joined a call's arguments so that an element contributes its children's
text. Round 16 called a helper that returns its first and third arguments and
**drops the second**, with the dropped one long enough to push the subject and
its verb apart. Every word the owner read was a literal argument; this guard put
a hundred and twenty characters of scaffolding between them, and the classifier,
which asks for the modal _near_ the subject, saw nothing.

**Widening that window is the wrong answer.** Unbounded, the rule convicts the
private-permission note, which joins an honest sentence about now to an honest
sentence about a setting — the exact reason the bound exists. What is actually
true is that **any two pieces of a run might end up beside each other**, because
what happens to the pieces between them is a computation this does not evaluate.

Testing every ordered pair says that, and costs the square of the run: on this
bundle it does not finish. So only the pairs that could carry a claim are
built — a piece naming a subject with a later piece carrying a modal or a
deixis. **That is not a sample.** It is every pair the rule could fire on, and
the rest are silence either way.

### 3. Varying is not being (QA-84-053)

D-205 made the composed review prove itself by its headings and by differing
across two histories. Round 16 kept the headings, invented the bodies, and added
a counter taken from the record count — so the documents differed, and the check
was satisfied by a document with no relationship to the record. **A document
that changes when the boxes change has shown only that it watched the boxes.**

_The first repair attempt here was defeated by the same trick and is recorded
rather than quietly replaced_: comparing two single-section documents with their
headings removed, on the theory that a body must depend on which section it is.
The impostor's counter varies with the selection too, so the bodies differed and
it passed.

What works is grounding, not variation. One section is made to prove its own
contribution: the lines ticking **Recent record** adds to the document, and
unticking takes away, must include something the app itself renders on
**Timeline** for this history. Those words exist because of what is in the
record, and an impostor cannot invent them without composing the record. It is
checked in both directions, so the content is tied to that section rather than
merely present somewhere.

### What is still open, unchanged

A sentence the app composes by **running** — over data, or by a computation this
guard does not evaluate — in a state no sweep reaches is covered by neither
half. Nothing here narrows that.

---

## D-207 — Ask the build for its own graph, and ask the app for its own document

**Phase:** 84 (QA round 17 repair) · **Status:** Active · Ends the provenance
argument that ran through **D-203** to **D-206**, and replaces the part-wise
proof of the composed review.

Five rounds have now asked _which module produced these words_, and five answers
have been broken. It is worth writing down as one line, because the shape is the
same every time and the fix is the same shape too.

| Answer                                              | Broken by                                                |
| --------------------------------------------------- | -------------------------------------------------------- |
| D-203 — read `src`, ask what a file could compose   | a `.js` module beside the repository (R14)               |
| D-204 — trace the built chunk's sourcemap           | the map rewritten (R15)                                  |
| D-205 — corroborate the map against disk and itself | a map made consistently wrong (R16)                      |
| D-206 — walk the app's relative imports             | a **Vite alias**, which that walk does not resolve (R17) |

Every one of them is **a second account of what the build did.** A resolver
written here is not the resolver that built the app; a map is the build talking
about itself; a corroboration inside one account is that account again.

### 1. The build hands over its own graph (QA-84-054, QA-84-055)

Vite is now run in process, and Rollup's output gives, for each chunk, the
**rendered code of every module in it**. That is not an account of provenance —
it is the shipped bytes, already grouped by the module they came from, by the
tool that put them there. An alias, a conditional export, a plugin-generated
module: all of them arrive resolved, because the thing that resolved them is
what produced this. There is no map to forge and no resolver to disagree with.

**And the build the guard makes is tied to the build that shipped.** Running
Vite in process is what makes the graph available, and it is also a build made
for the guard; if it diverged from the deployed one, the owner would be reading
copy this never saw. So each chunk is compared against `dist/`, byte for byte,
with exactly two things masked: the **content-hash filenames** chunks use to
refer to each other, and the **build stamp** the product embeds. Both differ
between any two builds of identical source, neither is copy, and the second is
what makes the first differ.

Two consequences, and the second is Round 17's other finding:

- **"can compose" is gone.** A module produces a sentence when its _rendered_
  code carries it, so a literal the bundler dropped is not production, and a
  shipped sentence has a producer by construction rather than by pairing _this
  module could say it_ with _the words ship somewhere_ — which is exactly what
  QA-84-055 pulled apart, leaving an unused literal in the approved module and
  rendering the sentence from a stylesheet.
- **stylesheets are in the graph.** Vite lists every `.css` module of a chunk,
  so a `content:` string in the emitted stylesheet is attributed to the graph
  stylesheet that carries it, and **a shipped `content:` nobody can place fails**
  rather than being copy with no owner.

Coverage still comes from the whole chunk — every string in the finished file is
classified, whether or not a module accounts for it. What the modules add is
_which_ module, where that matters. A **literal** in the chunk that no module
accounts for is an anomaly; a **join** whose pieces sit in two modules belongs to
neither, and is not.

### 2. An opener may be assembled (QA-84-056)

D-206 built the pairs that could carry a claim by asking, of each piece, whether
it could open one. Round 17 wrote the subject as `'The '` and `'app '`: neither
piece opens a claim, so no pair was built, and the dropped middle argument kept
the whole-run join out of the classifier's reach.

An opener is now the **shortest run of adjacent pieces ending here** that can
open a claim, and a closer the shortest run starting here that can close one.
Neither search is capped by a number chosen for it: nothing in the vocabulary is
longer than its longest phrase, and a phrase must be contiguous, so a window
wider than that can never newly match. **The bound is the vocabulary's, not a
guess** — which is the difference D-197 has always drawn.

### 3. The app hands over its own document (QA-84-057)

D-206 grounded the composed review one section at a time: the record section's
contribution had to include something Timeline renders. Round 17 kept that
section honest and invented the other nine. **Proving one section's body does
not transfer to the others**, and adding a check per section would only move the
line to whichever section had none — a probe over the real product found that
only three of ten sections contribute anything another screen also renders, so
requiring it everywhere would have been false.

The app already hands the same document over twice: the field shows it and the
copy control puts it on the clipboard. Reading it back and comparing gives the
**whole document at once**, with nothing left for a fabricated section to hide
in. An impostor that changes the field must now change the composition itself,
at which point it is the composition.

### What is still open, unchanged

A sentence the app composes by **running** — over data, or by a computation this
guard does not evaluate — in a state no sweep reaches is covered by neither
half. Nothing here narrows that.

---

## D-208 — Every output, the value the browser composes, the occurrence rather than the words, and an oracle

**Phase:** 84 (QA round 18 repair) · **Status:** Active · Repairs the four
places **D-207** claimed more than it had.

D-207 asked the build for its own graph, which was right and covered less than
it said. Round 18 found four gaps, and three of them share a shape: **a rule
was applied to one kind of thing and described as applying to all of them.**

### 1. Build identity means every output (QA-84-058)

The tie to `dist/` walked the **script chunks**. Round 18 wrote a plugin whose
`generateBundle` hook looked at `isWrite`: on the guard's in-process build the
stylesheet was harmless, and on the writing build that produced `dist/` it said
_"The app will choose something better next time."_ Nothing compared it, so no
mask was even needed.

Every emitted output is now paired with what is on disk — chunks, stylesheets,
`index.html`, the build info, the sourcemaps. **And the guard's build no longer
overrides the project's options**: only `write` is turned off, because anything
else overridden is a way for the two builds to differ, and the comparison would
then be comparing two different things.

### 2. CSS composes adjacent strings (QA-84-059)

`content: 'The app ' 'will choose ' 'something better ' 'next time.'` is one
value, not four. The extractor read each quoted fragment separately, and the
attribution then asked whether a source stylesheet _contained_ that fragment —
so neither operation ever saw the sentence the browser puts on the screen.

Adjacent strings are now joined in order, exactly as CSS joins them, and the
composed value is classified. **The source stylesheets are read with the same
rule**, rather than by text containment, so both sides of the attribution are
asked the same question.

### 3. An occurrence, not the words (QA-84-060)

D-207 allowed an unplaced **join**, because a join whose pieces sit in two
modules belongs to neither. Round 18 used exactly that: a `renderChunk` plugin
wrote an approved sentence into the chunk _after_ the modules were attributed,
as two literals nobody could place, and the join of them borrowed its approval
from the honest occurrence in another module entirely.

An unplaced join is now allowed **only when every piece it was made from is
itself placed**. A join made of nothing anybody wrote is not a join across
modules; it is copy that arrived after them.

### 4. Two consumers of one object agree about delivery (QA-84-061)

D-207 compared the field against the clipboard. Round 18 corrupted `composed`
itself, so both consumers delivered the same false document, and every part-wise
check that touched the one honest section passed.

The document is now composed **again**, in the test process, from the scenario's
own history and the product's own composer — an oracle that never touches the
object the screen is holding. Every line of the field must be a line that
composition produces. **One line is excepted, and the product names it itself**:
_the real moment this was composed, in the owner's real zone — a fact about the
act of composing, not about the history being described_. It is the only line
that legitimately differs between two composings of the same history.

The clipboard comparison stays. It is a smaller claim — that the field and the
copy control deliver the same thing — and it is still the one that catches a
field tampered with on its own.

### What is still open, unchanged

A sentence the app composes by **running** — over data, or by a computation this
guard does not evaluate — in a state no sweep reaches is covered by neither
half. Nothing here narrows that.

---

## D-211 — What is served is proved against what was verified, not against a name for it

**Phase:** 84 (bounded closeout under **D-210**) · **Status:** Active · Repairs
**QA-84-064**, the one Round 15–19 finding the owner kept blocking.

The deploy job downloaded the artifact the gate had verified, published it, and
then proved the deployment by reading `commitSha` out of the served
`build-info.json`. Round 19 put a step between the download and the publish that
appended a visible rule to the app stylesheet. No source byte and no verified
`dist/` byte had changed when the gates ran, `build-info.json` was untouched,
and the verifier reported **"Deployed SHA matches"** over a site that was now
saying something the engine cannot do.

**A commit identifier names what was built. It says nothing about what is
served.** Anything after the gate can decorate around it, because the field it
checks is one the decoration has no reason to touch. That is not a guard that
was outwitted; it is a guard that was never looking at the artifact.

### What replaces it

`npm run build` now writes `dist/release-manifest.json`: a SHA-256 for every
file in the built tree, and a digest over that list. It is written by the build,
so it always travels with the bytes it describes, and it contains no clock —
two runs over identical bytes produce identical manifests, or the comparison it
exists for would be comparing runs rather than releases.

`scripts/release-integrity.mjs <base-url> --manifest <path>` then fetches every
file the manifest names **from the live site** and hashes what the host actually
returns. Every digest must be the one recorded when the gates passed. It also
fetches the site's own copy of the manifest and requires it to be the verified
one, so a publication that rewrote the tree _and_ its record is named too.

**And the manifest the deploy job checks against does not come from the tree it
is publishing.** The verify job uploads it a second time as its own artifact,
and the deploy job downloads that into a separate directory. A step that
rewrites what it is about to publish has not thereby rewritten the record of
what was verified.

### What this does not establish, said plainly

**A hostile step inside the deploy job can subvert any check in that job** — it
could rewrite this script as easily as the stylesheet. No arrangement of steps
fixes that, and pretending otherwise would be the same mistake in a new place.
What closes the class QA demonstrated is that the check now reads the artifact
rather than a name for it, and that **it can be run from outside CI**: the
manifest is a published artifact, so QA or the owner can verify any deployment
at any time, from a machine the pipeline does not control. A check that only
ever runs beside the thing it checks is the shape of the problem, not the fix.

The SHA check stays. It answers a different and still-useful question — whether
the phone is looking at this commit at all — and it was never wrong about that.

### Scope

This is the bounded closeout D-210 describes. The nineteen deferred instrument
findings are untouched, and `qa/INSTRUMENT_HARDENING_BACKLOG.md` is unchanged.

---

## D-212 — Eleven routed phases, and routing integers increase monotonically — D-159 extended

**Phase:** second adjudication · **Status:** Active · **Extends:** D-159

The owner approved the second adjudication's roadmap on 2026-08-31. The record is
`docs/PRODUCT_ADJUDICATION_2.md` and the map is:

| Product / canonical name                                 | Routing |
| -------------------------------------------------------- | ------- |
| The instrument, and the things that are untrue           | 83      |
| What the owner is trying to become                       | 84      |
| **Canonical Phase 9** — visual coherence, motion, mobile | **90**  |
| Semantic capture and clarification                       | **91**  |
| Reach — what the brain can see                           | **92**  |
| Validity — what it concludes from what it sees           | **93**  |
| Domains and progression                                  | **94**  |
| Advancement and revision                                 | **95**  |
| Expectation and reconciliation                           | **96**  |
| Longitudinal inference — D-172's mechanism               | **97**  |
| _(98–100 reserved headroom)_                             | —       |
| **Canonical Phase 10** — performance, PWA, reliability   | **101** |
| **Canonical Phase 11** — adversarial hardening           | **102** |
| **Canonical Phase 12** — release                         | **103** |

**D-159 stated half the routing rule. This is the other half.**
`handoff_source.routing_ceiling()` keeps only the **maximum** phase with a QA
report, so an integer below the current ceiling never routes — silently, with
nothing warning anyone. **Routing integers must therefore increase monotonically
in execution order, not merely exceed 82.**

That is why 85–89 are unusable: they sit below routing 90, which runs first. And
it is why canonical Phases 10, 11 and 12 move to **101, 102 and 103** — 92, 93
and 94 are needed by the intelligence phases that run before them. **Their scope
is unchanged, exactly as it was unchanged when D-159 gave canonical Phase 10 the
integer 92. D-109 stands.**

Three-digit integers parse correctly: `_stated_or_inferred_phase` reads
`re.search(r"\d+", raw)` and `QA_FILE_RE` is `^PHASE_(\d+)_QA_HANDOFF\.md$`.

**98–100 are deliberate headroom.** The campaign has now inserted phases into its
own map twice, and every insert renumbers everything downstream. The reserve has
already earned itself once: splitting routing 95 in two pushed longitudinal
inference from 96 to 97 without renumbering anything below it.

---

## D-213 — Routing 94 runs as three internal cycles under one routing integer

**Phase:** 94 · **Status:** Active

Routing 94 covers nine remaining domains and, after the owner-decision sequence,
nine Fatherhood-specific deliverables. It executes as **three cycles under the
single integer 94**:

- **94.1 — Fatherhood alone**, carrying its destination plus every added
  deliverable: the `development-skill` authoring route, the `about-person`
  relationship repair, the near-duplicate guard, scaffolding guidance, the
  help-ladder reader, the two-class cap and its trace integrity, the birthdate
  field, and the normative suppression filter.
- **94.2 — Sleep, Social, Home, Romantic.**
- **94.3 — Emotional, Faith, Private, Long-Range Direction.**

**94.1 must have its own explicit acceptance list and gate, and it closes before
94.2 begins.**

**Why one integer.** D-212's monotonic rule leaves no integers between 94 and 95,
and **D-159 already settles the convention: a QA round does not get a new routing
integer.** Rounds 1…n of one phase carry that phase's integer, as they did
through routing 82's twelve and routing 84's nineteen.

**Why Fatherhood is alone.** The four-domains-per-cycle slice rule counts
_domains_, and it cannot see that nine deliverables landed on one of them. By
deliverable count that slice is roughly nine times the weight of the Home slice.
**The concentration is accepted knowingly rather than hidden by the arithmetic**,
and gating 94.1 separately is what keeps its failure localisable.

---

## D-214 — Advancement survives before expectation machinery

**Phase:** roadmap · **Status:** Active

**Routing 95 is preserved before routing 96.** If scope pressure forces a
deferral, **96 is deferred before 95.**

**Why.** Routing 95 carries the advancement and revision work the owner asked
for — rung advancement, new ground versus repeatedly reaching the same ground,
and a destination that has stopped moving. Routing 96 carries the named
expectation and its reconciliation, which is a new claim class. **The half the
owner asked for survives; the machinery built on top of it is what goes first.**

**This is the ordinary cut order and it is not the minimum-release path.** The
aggressive path named in the adjudication — 90 → 91 → 92 → 93 → 101 → 102 → 103 —
is a last resort that drops 94, 95, 96 and 97 together. **It must not be read as
the routine deferral sequence**, and reaching for it is a decision the owner
makes, not a consequence of a phase running long.

---

## D-215 — D-172's hold moves from routing 91 to routing 97

**Phase:** roadmap · **Status:** Active · **Amends the target of** D-172

`docs/CAMPAIGN_HOLDS.md` declared `blocks_phase=91` when routing 91 meant
_"later intelligence — Reach, then Validity."_ **Under D-212's map, routing 91 is
semantic capture and clarification, and the work D-172 is actually about is
routing 97.** The declaration and its prose are corrected to match.

**D-172 itself is unchanged and is not resolved.** Its question — how the system
discovers hypotheses, combinations, sequences and potentially important variables
that were not hardcoded in advance — is still open, and routing 97 still may not
start until it is adjudicated.

**Why the target moves rather than the hold being released.**
`ROUTING_91_BRIEF.md` established that semantic capture and open-space inference
are two capabilities inside one open question, that **D-172 is about the second
only**, and that _"it may not be closed by B's adjudication, and B's adjudication
may not absorb it."_ Holding semantic capture against a question that is not
about it was the error; the fix is to point the hold at the work it governs.

**Consequence, stated rather than left implicit: routing 91 is no longer blocked
by D-172. Routings 90 through 96 are not gated by this hold. Routing 97 is.**
Nothing in this decision starts any routing phase.

**The declaration structure is unchanged.** Only the integer and the prose move.
`CAMPAIGN_HOLDS.md` itself records why: deleting a line does not release a hold —
the orchestrator reports the declaration as missing and refuses the phase.

**And part one of D-172's own answer is now scheduled.** D-172 refuses to leave
the finite concept vocabulary as a permanent ceiling; widening it is routing 92's
Reach work, which runs long before 97. **Deciding the search mechanism before
widening the space it searches would spend the campaign's hardest remaining
decision over six tracked concepts.**

---

## D-216 — The app describes its record; its record is not authority over the owner

**Phase:** 95 · **Status:** Active · **Owner decision #6**

The app may not make unsupported claims about the owner — _"you've stalled,"_
_"progress has been flat,"_ _"this hasn't moved in months."_ **It may describe
what its own record contains, and that record is its memory rather than his
history.**

**Record-fact grammar is necessary and not sufficient.** _"Nothing has been
recorded towards being closer to your daughter since March"_ is literally true
and unacceptable. **Safety is primarily structural**, in this order: an eligible
statement subject (D-217); delivery location and owner initiation; the domain
delivery policy; frequency and aggregate limits; suppression under declared life
seasons, standing blockers, custody constraints, recovery conditions and standing
obligations; and veto and correction affordances. **Wording is the
human-reviewed layer.**

**Domain delivery tiers, which govern mode only and never subject eligibility:**
push for Career, Money, Health and Home; pull-with-naming-only for Sleep and
Social; pull-only for Fatherhood, Romantic, Faith, Emotional and Long-Range
Direction; **never** for Private / Sexual Health.

**Frequency, from existing constants and no new ones:** a first statement only
after `DOMAIN_QUIET_DAYS = 28`; a repeat floor of `STALE_BELIEF_DAYS = 60`;
**calendar time alone never permits a repeat** — both the floor and materially
new information are required; volunteered question-shaped statements inherit
`DISCOVERY_PER_WEEK = 2` and D-184's one-prompt-per-object rule; pull content is
capped at one line per destination per composed view.

**Nothing is volunteered on Now by default.** Where a move already serves a
destination, advancement language rides the existing `proposedBecause` reason
line, so it is not an additional clause and never competes for Q9's slot.

**The QA rule, which is part of the decision.** The section 4.4 gate on this work
is the **ordinary-owner reality track and the phone gate**, not a shame or copy
scanner. Modal auxiliaries are a closed grammatical class; **shame is not.**
Guarding this with an ever-growing catalogue is the instrument-hardening pattern
that turned routing 84 into nineteen rounds (D-210). **Guard the closed
structural rules mechanically; read the wording with a person.**

---

## D-217 — Free-aim kinds are context, never the subject of an assertion

**Phase:** 95 · **Status:** Active · **Owner decisions #6 and #7**

A record-state or advancement statement requires a subject entity that satisfies
**both** conditions: its kind is in the closed permitted set, **and** it carries
at least one progress-evidence record naming it.

**Permitted kinds:** `routine`, `skill`, `learning-topic`, `development-skill`,
`project`, `work-item`, `financial-goal`; plus `health-concern` only as the object
of an owner-named goal. **Every other `EntityKind` fails closed, enforced by an
exhaustive `Record<EntityKind, …>` table** so a future kind is a compile error
rather than a kind that silently becomes permitted — which is exactly how the
hole opened, with `destination` inheriting permission by omission.

**Generic `destination` and `goal` are context.** They may be named in a question
or as a frame; they may never be what a sentence asserts about.

**Subject eligibility is universal across all twelve domains and does not depend
on the domain tier.** The tier governs delivery mode only.

**The test is on the sentence subject, evaluated per sentence, never on the
destination that contains it.** A destination-level test gives the wrong answer in
both directions: classify by the destination and a permitted routine is silenced;
classify by its contents and _"nothing recorded towards being closer to your
daughter"_ is permitted.

**Why this is a derivation rather than a stipulation.** `progress.ts`'s
`case 'goal'` branch breaks unless `milestoneOf !== undefined && status ===
'achieved'`, and no generator produces a move whose object is a bare `goal`
entity. **A bare `goal` can never accumulate a single rung, in any domain.**

**Preserved prohibitions:** no person or relationship as a subject; no feeling or
internal-state plateau — a state does not plateau; no belief or faith plateau,
though a named faith practice is a `routine` and is eligible; no counted absence,
meaning no rendered zero count and no denominator; no cross-domain comparison,
meaning at most one domain named per statement; **no attributed silence — the
grammatical subject is never "you"**; and no trend characterization in Private.

**The irreducible residual is recorded rather than denied.** The owner may name a
routine "get on better with my manager." The app then quotes **his own label**
inside a fixed frame, rendered verbatim, and never authors the phrase.

---

## D-218 — "The record is incomplete here" is a correction, and a correction may only make the app say less

**Phase:** 95 · **Status:** Active · **Owner decision #6** · **Extends** D-165

Every consequential record-state statement must be answerable. When the owner
says the equivalent of _"I've been doing this — it just isn't written down,"_ a
**known-incomplete marker** is recorded for that subject and span.

**It is a fifth correction gesture**, alongside D-165's wrong event, wrong date,
wrong current fact and disagree-with-the-inference, and it inherits D-165's rule
unchanged: **it states its consequence before it acts.**

**What it is not:** progress evidence. It manufactures no event, date, quantity,
milestone or rung, and it does not silently reaffirm the destination — correcting
the record is not renewing the aim.

**What it does:** changes the span **from empty to unknown**, and therefore
prevents that span supporting **either stagnation or advancement**. The asymmetry
matters — a correction that suppressed only the negative statement while still
permitting advancement over the same span would be a way to buy good news.

> **A correction may cause the app to say less. It may not silently conclude
> more.**

Repeated corrections may reduce how often the app speaks about that record — a
behaviour change, monotone toward silence — but **must never become a conclusion
about the owner's character or reliability.**

**It does not collide with backfill.** A known-incomplete marker is a statement
_about the record_, the same class as a correction, not a backfilled event.

---

## D-219 — Advancement is described, never rated — D-162 extended to the owner's trajectory

**Phase:** 95 · **Status:** Active · **Owner decision #7** · **Extends** D-162

**Life Command OS explicitly helps the owner continue becoming more capable over
time, rather than merely maintaining his current level.** The system is
**positively authorized** to say when advancement is genuinely supported by the
evidence — the permission matters as much as the prohibition, because a rule
phrased only as "do not say these things" would not authorise the half that
serves the intent.

**The approved minimum, routing 95 package 1:** **rung advancement** — is
evidence arriving at higher rungs than in a comparable earlier window — and **new
ground versus repeatedly reaching the same ground.**

**Refused, on grounds independent of D-162:** any rendered capability score,
percentage, rate, rank, grade or acceleration figure. The progress ladder is
**ordinal** — `rankOf` returns an index, so a derivative of it is arithmetic on
labels; the evidence bar compounds, since distinguishing _improving_ from
_improving faster_ needs three separated windows each clearing the
first-derivative bar, per quantity; and differencing amplifies noise over a
**non-stationary** series, so a second derivative would be dominated by the life
season rather than by the owner.

**Deferred:** inferred milestone difficulty — "harder" is not recorded and
inferring it would be the app judging his work — and breadth and transfer, until
their upstream evidence and domain dependencies exist.

**A correction to the record.** An earlier draft of the second adjudication
refused this capability and cited D-162 as authority. **D-162 forbids the
rendered figure and explicitly permits _"description with evidence"_**; the
shipped `trajectoryCards` computes a normalised rate of change and deliberately
renders none. **The capability was never D-162's to refuse.**

---

## D-220 — A concept ships as askable only when a consumer can be moved by the answer

**Phase:** 92 · **Status:** Active · **Owner decision #3**

**`QUESTIONS_PER_DAY = 3` remains a hard ceiling and is not raised. Daily push
burden does not increase. Unknown remains unknown. No question becomes eligible
merely because it is stale. Information-value gating is untouched.** The owner
accepts wider evidence coverage even where individual concepts are refreshed less
often.

**Approved without condition:** the supervision / must-stay concept,
`requiresLeaving`, a bounded blocker `until`, `health.trained-today` **derived
whenever existing movement evidence can settle it**, and `context.people-present`
**reached from the relationship graph that already exists** rather than from new
owner input.

**The condition on anything askable:**

> **A concept may ship as askable only when an actual consumer exists that makes
> at least one possible answer capable of materially changing a decision. Do not
> ship declared-but-unreachable concepts.**

This is `emotionalState`'s failure written as a rule: `materialToDecision: true`,
`askWhenStale: true`, absent from the `QUESTIONS` catalogue, and read by nothing
since Phase 1.

**The selector is unchanged.** `mostValuable`'s `overdue` term is already the
bounded least-recently-used tiebreak, below the two information-value measures and
above catalogue order. **No staleness quotas, no forced rotation, no coverage rule
that creates eligibility.**

**A standing starvation gate, with a closed exemption discipline.** A concept
declaring `materialToDecision: true` that wins zero question slots across the
complete scenario library is a defect. A concept genuinely too narrow to win may
be exempt **only** through a named, exhaustive registry carrying the concept id, a
written reason, the circumstance in which it becomes decision-relevant, and **a
test proving that circumstance can make it win.** **A concept with no consumer may
never use the exemption.**

**Performance ships with the expansion, not with routing 101.** Measured: ≈21 full
`buildView + decide` evaluations per guide render today, ≈50 under a naive
expansion — and the worst case is the common case, because `shouldAsk` returns
true for `unknown` and the new concepts are unknown by design. Pre-filter probe
candidates to concepts with an active consumer; use incremental probe projection;
keep answer sets to the smallest honest size. **These must not alter selection
semantics.**

**Tier 3 — caffeine, alcohol, hydration — is deferred to routing 97** and gets no
ordinary-use logging channel before then.

---

## D-221 — D-166's six dimensions may land in different routing packages

**Phase:** 92 · **Status:** Active · **Clarifies** D-166

**D-166 is not reversed and the six dimensions remain approved.** What is
clarified is that **D-166 does not require all six to become askable in routing 92.** Their implementation follows their honest consumers:

- **loneliness / social-connection need** — routing 92, via AUD-0013's missing
  social-demand path;
- **overwhelm** — routing 92, via the capacity limiter, which renders as _"What is
  in the way"_;
- **motivation** and **stress** — routing 92 **only if** an honest
  capacity/friction or friction/opportunity-cost consumer is demonstrated;
- **mood** — **not askable in routing 92** without a real consumer;
- **confidence** — **deferred to routing 94 / F25**, where the progression
  consumer belongs.

**Approval of the vocabulary is not approval to create unreachable questions.**
Building all six as askable in 92 would recreate the exact `emotionalState`
defect for at least two of them — the thing D-220 exists to prevent.

---

## D-222 — Research may decide what is worth asking, and may never become a finding

**Phase:** 92 · **Status:** Active · **Owner decision #2**

General-population research may influence **what Life Command OS decides is worth
asking or investigating** about the owner. Approved uses: identify potentially
useful questions; spend the bounded discovery agenda more intelligently; identify
evidence worth seeking; and know where caution or missing evidence matters.

**A prior may not** become a finding about the owner, determine a recommendation,
influence ranking because personal evidence is sparse, or persist as a substitute
for personal evidence.

**When a prior causes a question:** the question still satisfies every discovery
rule; **the owner's answer becomes the personal evidence**; the prior does not
become a belief about him; **skipping produces no inferred fact**; and provenance
must support answering _"why did you ask me this?"_

> **The permission is intentionally self-extinguishing. Research may help decide
> what is worth learning about the owner. Once he answers, his evidence replaces
> the prior's role.**

**Ranking influence on sparse evidence is refused, and the reasoning inverts the
obvious one.** That option's safety rests on the prior weakening as personal
evidence accumulates. With no connected-data source and a three-question daily
ceiling, **evidence accumulates slowly and permanently — so a mechanism designed
to be temporary would become the standing behaviour, and a rule whose safety
depends on a condition that will not arrive is not safe.**

Population evidence directly determining recommendations with no personal
evidence is refused outright.

---

## D-223 — Child progress stays qualitative, and C19 is independently load-bearing

**Phase:** 94 · **Status:** Active · **Owner decision #1** · **Preserves** D-070,
D-112, D-117, D-135, D-136

**The existing protected qualitative, per-entity growth model is kept.** Not
authorized: rates, shares, percentages, grades, rankings or numeric progress
summaries about Adaya.

**The reason is the denominator.** The app sees only a fraction of the occasions
that actually happen, so _"3 of 6 recorded occasions"_ must never silently become
_"she succeeds 50% of the time."_ **The denominator is the app's observed record,
not her life**, and more recorded data does not fix it unless the system observes
a sufficiently complete denominator, which this product should not assume.

**And a percentage cannot answer the question the owner is asking** — _how close
is she to doing this on her own?_ These three produce 50% and mean different
things: `✗✗✗✓✓✓`, `✓✓✓✗✗✗`, `✓✗✓✗✓✗`. **A harder task can also lower a percentage
while she is advancing, and that must never read as regression.**

> **The #6/#7 subject-class rule does not protect this boundary**, because
> `development-skill` is already a permitted statement subject. **C19 remains
> independently load-bearing.** Two constraints: the subject rule governs which
> entity may be a subject; C19 governs what may be said about it.

**Preserved and available:** occasion history including occasions that went the
other way; the help ladder; current run; setting; widening settings; cross-setting
generalization; owner-confirmed reversible settled status; `widen-the-setting`;
qualitative per-entity advancement; and internal confidence that never renders.

**A year-scale qualitative progression view is legal and does not reopen this** —
March: _"1 in a row, one setting."_ October: _"4 in a row, three settings."_

**The legal composition pattern**, recorded because it is the one to build:
_"Towards being closer to Adaya — the Saturday-morning routine has occasions
across three settings now."_ **The destination is context; the routine or
`development-skill` is the assertion subject.** Fatherhood remains pull-only.

**D-135 is not retracted by D-219's deferral of breadth and transfer.** Its
setting-spread capability has its own shipped evidence supply — `OccasionSetting`,
`settingsIn()`, the two-setting bar, `widen-the-setting` — and remains protected.

**And a correction to the adjudication's own record: there is no
settled-sufficiency defect.** The capture answers write result and help together,
so `cleared` is equivalent to `help === 'on-her-own'`, and the existing trailing
run already requires three consecutive independent occasions with D-135 adding two
settings. **Form (a) is deleted and no D-112/D-135 amendment is required.**

---

## D-224 — The owner names the growth area; the app helps him pitch the help

**Phase:** 94 · **Status:** Active · **Owner decision #4**

The owner may name a growth area to work on with Adaya, and Life Command OS may
help him plan **how** to support it using evidence it already records. **He
chooses what. The app may help decide how to pitch his assistance next time.**

> **Teaching support is an optional branch of Fatherhood, never the definition of
> good Fatherhood.**

**Owner-directed authoring.** `development-skill` is not authorable through
ordinary use today, and every one arrives through a fixture — F04's pattern one
entity kind further on. The authoring route reuses the existing create-and-confirm
contract and introduces **no new record family, provenance model or schema**.

**Authoring is behavioural, not structural.** A `development-skill` authored
through ordinary owner use must be created; be associated with Adaya **using the
relationship shape the Fatherhood reasoning actually consumes**; survive
projection and reload; appear in the Fatherhood skill structure; and **produce an
eligible `growth-opportunity` candidate on the next qualifying render.**
**Existing in the entity store is not sufficient**, and an authoring route that
writes a syntactically valid but reasoning-invisible skill is a failure of this
decision (DEF-0147).

**Near-duplicates are surfaced, never silently created.** `entityId(kind, name)`
is label-derived, so _"Getting dressed"_ and _"Getting dressed on her own"_ are
different entities with separate evidence pools, and neither may reach the
sequence the growth model needs. Before creating a close match for the same
child, surface the existing skill through **`AuthoringProposal.problems`** and let
the owner choose. **Do not auto-merge. Do not silently redirect his wording.**
Preserve his choice if he creates the distinct skill anyway.

**Scaffolding guidance.** The app may consume the ordinal help ladder
`needed-me → a-small-prompt → on-her-own` to show approach-to-independence and
help him decide how much assistance to give next. **Legal language uses ordinal
rungs, counts, sequence and setting spread. Forbidden: percentages, rates, shares,
grades, ranks, numeric scores and rendered zero counts.** Guidance preserves
D-136's shape — proposed, owner-confirmed where a stored judgement is involved,
reversible, never silently a developmental fact.

**Delivery — both surfaces coexist.** Pull-only governs the **new** "closer"
register and the **new** guidance, on the Fatherhood or destination surface. **The
existing growth suggestion is unchanged and stays on Now**, because it is a
proposal attached to a move he has just acted on — a different speech act from
volunteering a progress report. **Moving or gating it would break the loop by
which settled judgements are proposed, confirmed, rejected and revisited.**

**Ordinary time stays first-class.** `time-with` is not merged into
`growth-opportunity`, is not scored for developmental productivity, and ordinary
play, affection, presence and shared experience are never characterized as a
missed developmental opportunity.

**Outside this decision:** system-directed teaching suggestions and any
system-decided learning sequence — both routed to Q1 and declined there (D-226).

---

## D-225 — At most one practice and one maintenance growth candidate reach arbitration

**Phase:** 94 · **Status:** Active · **Owner decision #4**

`generateCandidates` deduplicates by `verb/object.id`, so different
`development-skill` entities are different objects and are **not** deduplicated.
Three non-settled skills produce three `growth-opportunity` candidates against one
`time-with`. **The threat to ordinary time is candidate volume, not copy**, and it
is already mildly true today.

**`growth-opportunity` candidates are partitioned by `standing.stage`, and the
top-scoring candidate of each class is kept: at most one practice candidate and at
most one maintenance probe.** The bound is constant regardless of how many skills
the owner authors.

**Two classes rather than one slot**, because `candidates.ts:496` re-admits
settled skills when `maintenanceProbeDue()` is true, and a single slot would let
an active skill suppress the probe — the only app-initiated safeguard against
`settled` becoming permanent, which D-136 and AUD-0015(a) both forbid.

**Selection within a class is the existing move score, then the deterministic id
tiebreak, and nothing else.** For two growth candidates `compare` collapses past
its middle terms — they share the verb so friction ties, and share the domain so
the limiter term ties — **so the discriminator is score alone.** The selection
answers _which move is most useful tonight_ and cannot answer _which skill is she
best or worst at_. **No ordering of her development-skills is rendered or
persisted.**

**Placement: after evaluation, before arbitration.** Not before evaluation,
because choosing the best candidate needs scores that do not yet exist and any
other rule would be a judgement about her. Not after arbitration, because the
crowding-out happens during it.

**Trace integrity.** Set-aside candidates are accounted for truthfully in
`ranked.length` notes, runner-up reporting, chosen-from-N notes and no-action
language — for example _"chosen at 0.62 from 5 that fitted, with 3 further growth
opportunities set aside."_ **The requirement is truthful accounting, not that
sentence.**

---

## D-226 — Age is known; the normative reference may only suppress, never speak

**Phase:** 94 · **Status:** Active · **Owner decision Q1** · **Unblocks** AUD-0018

**Adaya's date of birth may be recorded** — optional, asked once, durable, never
re-asked, exactly like custody. It is a fact the owner supplies, not a claim about
her, and it changes no judgement by itself.

**A bounded, cited normative reference is approved as a one-way protective filter
only.**

> **The app may never render a norm statement. Not on Now, not on the Fatherhood
> page, not on pull, not in the trace, not in the export.**

**Why speech was refused in both forms.** A symmetric norm is a percentile with
extra steps: a table that can say _"most four-year-olds are still working on
this"_ is the same mechanism that says _"most four-year-olds have this by now."_
And asymmetric pull-only speech fails for the same reason — its protection
depends on the owner being unable to tell whether the source covers a skill, which
does not hold for obviously standard ones. **The asymmetry is the tell: positive
support produces speech, so absence of speech on a standard skill means the
negative case.**

**The reassurance is not forgone.** D-224's scaffolding register delivers a better
version from a better source: _"three weeks, from needing you to a small prompt,
and it held at Grandma's."_ That is about her, it is true, and it needs no table.

**The rule:**

> **Positive normative support may make the app say LESS. Lack of positive
> normative support may NEVER make the app say MORE.**

**Non-suppression carries no meaning.** It covers at least: the source does not
cover this skill; the source is ambiguous; evidence is insufficient; the skill is
owner-defined with no normative analogue; the source cannot justify suppression.
**These are indistinguishable and must remain so.** Failure to suppress must not
increase urgency, score or priority, create a "behind" state or concern flag,
become evidence against her, or imply the source says she should already have it.

**Placement is the enforcement.** The norm may only cause `fatherhoodCandidates`
to skip a skill in its existing loop. **Not a dimension** — a `norm-fit` dimension
would carry a value and a weight, so non-suppression would participate in scoring.
**Not a rejection** — `features/export/compose.ts` iterates `trace.rejected` into
the AI review export, a production feature, so a rejection reason would reach the
owner. **A generation-time skip is never proposed and never rejected, so there is
nothing to disclose**, which is consistent with section 35: it is a candidate
never thought of rather than a rejection nobody can see.

**Structural assertion:** the norm module is imported by `candidates.ts` and by
nothing in the evaluation or arbitration path, and **`Candidate` gains no field.**

**Cap interaction: none.** A suppressed skill is absent before D-225's cap exists
and cannot consume the practice slot.

**The residual is recorded rather than denied.** The set of suppressed versus
unsuppressed skills is inferable, diluted heavily by the base rate of not-covered
owner-defined skills and stronger the more standard the owner's skills are.
**Accepted as smaller than the harm running today** — that every unsettled skill
reads as a growth area with no way to know it is ordinary, which is AUD-0018's
own finding: _"the risk is not shaming the owner, it is quietly framing normal."_

**Declined at the same time:** system-directed teaching suggestions, because they
need a generative source that does not exist and a checklist that cannot cover
"ordering her own food" cannot generate a curriculum for it; a system-decided
learning sequence, which has no source, no scope and the largest collision with
the protected item; and admitting `milestone-observation`, which needs a checklist
registry carrying list identity and revision.

---

## D-227 — The legacy quarantine holds; objective episodes stay archived

**Phase:** roadmap · **Status:** Active · **Owner decision Q4** · **Answers** Q4

**Objective legacy episodes stay archived as `imported-legacy-record` and do not
become admissible evidence. AUD-0030(b) is not built.**

**The reason is a failed justification, not caution.** AUD-0030(b) is justified as
_"the difference between a brain that starts cold and one that starts with
years."_ **That is false as built.** `comparable` wraps `comparableEpisodes` for
all five verb-keyed dimensions, and `comparableEpisodes` requires a
`DecisionContext` in the current shape and then requires it to resemble tonight.
**Legacy episodes cannot carry that context**: `context-snapshot` is archived under
an independent decision, and reconstructing it means importing the old engine's
taxonomy that D-101 exists to prevent. **The narrow verb-keyed position does not
rescue it, because it passes through the same gate.**

**Association is not admitted.** Section 59's own note — _"importing these would
make the old catalogue **the object** of every relationship this app learns"_ —
describes `observed-change`'s key exactly, and no sealed wrapper changes a key.

**`legacy-import` reliability stays 0.5 as a second fence** and is not asked to be
the only one.

**The other three rungs.** Owner-reported states already map and remain canonical.
Owner attributions remain the owner's and may never become observed causal
relationships — already structural, since an imported judgement cannot manufacture
the comparison group `association.ts` requires. Old-system conclusions never
become canonical facts.

**`milestone-observation` is outside this decision and stays archived.** No part
of this answer admits it, and importing checklist-based developmental claims about
Adaya is against D-223. It was separately declined at D-226.

**`life-context-change` is routed to routing 92 as vocabulary work.** It is not an
admissibility question: a `ContextRecord` carries `concept` + `value` and the
registry has no entry for _"something changed in my life."_ **When the concept
exists it returns as its own decision**, with its `lifeSeasonCards` consequence and
its retroactive season-marking effect stated.

**AUD-0030(a) is retained and wanted:** the import screen states plainly which
families came across as history and which did not. **A "no" here is not silence.**

---

## D-228 — Connected data sources are parked for want of a source, not decided

**Phase:** roadmap · **Status:** Open — parked · **Owner decision #5**

**The owner does not currently track sleep with a device**, so the preferred
read-only fetch-on-open pilot for `sleepHours` — the concept whose registry entry
declares `device: 1, owner: 0.85` — **has no source to connect to.** The decision
is not made and is not deferred on principle; it is parked because the pilot has
nothing to attach to.

**What this does not imply.** No stored third-party credential is approved. **No
D-171 amendment is implied, and D-171 stands entire.** No substitute pilot was
adopted to keep the decision alive.

**Preserved for whenever it returns.** `cashBuffer` declares `device: 0.95,
derived: 0.9, owner: 0.6` — the only concept where the owner sits below three
other sources — so **the registry's second-strongest case for connected evidence
is financial, and true financial connectivity needs a confidential server client,
which conflicts with local-first and no-server.** That tension is unresolved and
is the most likely future reason to reopen the architecture question.

**And the provenance ladder is already settled by D-227.** If connected evidence
ever arrives it inherits that ladder rather than inventing a second provenance
model.

---

## D-229 — The maintenance probe is a calibration property, not a scoring defect

**Phase:** 93 · **Status:** Active

A due maintenance probe carries `stale-evidence` urgency 0.3 against an active
skill's `opportunity-window` 0.5 — a **0.20 weighted disadvantage** — and it must
**win** arbitration to be shown, because an episode exists only after the owner
acts on a chosen move and `probes` counts only attempted episodes.

**The existing duplication mechanisms recover it, on two paths.** On the **ignore
path**, each active skill accrues −0.35 per distinct `now` while an unshown probe
holds the +0.2 _"not offered lately"_ branch: a 0.55 gap at weight 0.8 = **+0.44**.
On the **response path**, competing skills accumulate `sameThing` (−0.5) while the
probe carries only `sameShape` (−0.2): **+0.24**. Both clear the deficit.

**Thread-fit can delay it, and the delay is bounded.** A live `growth-ladder`
thread on a competing skill carries weight 1. But `steps: 3`, `lastsDays: 42`,
expiry _"set once, here, and never extended"_; `activeThreads` includes finished,
stopped, abandoned and expired threads, so `threadOfferFor`'s `answered` check
**permanently blocks a re-offer on the same subject**; `startThreadRecord` has one
product call site gated on that offer; and `entityId` is deterministic, so
re-authoring the same normalized label cannot evade the block.

> **At most one growth-ladder thread per `development-skill` for that skill's
> lifetime, and at most 42 days of thread-fit per skill. Bounded delay, not
> indefinite starvation.**

**Classification: calibration and regression QA.** **No scoring package, no new
dimension, no probe-specific urgency escalation, no global `stale-evidence`
change, and no separate scoring decision.** Routing 93 carries a five-arm
regression: the ignore path with `now` advanced between visits; the response path
across evenings; loop close proving `probes` increments and the interval doubles;
a null arm; and the thread-fit bound arm asserting the documented mechanics rather
than whatever happens.

**Owner correction remains independently available** through the Fatherhood page's
stage control. **A delayed app reminder is not an inability to correct the
belief.**

**D-225's cap is a candidate-volume protection and neither causes nor fixes this.**

---
