# Decision log

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
