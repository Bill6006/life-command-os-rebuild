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
