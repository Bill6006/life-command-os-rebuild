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
