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
