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
