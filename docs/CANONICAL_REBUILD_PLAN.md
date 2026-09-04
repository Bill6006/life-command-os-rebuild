# Life Command OS — Canonical Rebuild Plan v1.2

## Status

- **Purpose:** governing plan for the next Life Command OS rebuild.
- **Intent:** make this the version that can evolve instead of being repeatedly replaced.
- **Architecture posture:** new foundation; old implementations are evidence, not blueprints.
- **Primary build route:** GitHub/repository-based application, not a single standalone HTML file.
- **Primary owner experience:** mobile-first, phone-testable throughout development.
- **Privacy note for this plan:** do not include the owner's email, last name, street address, or equivalent direct identifiers.
- **Allowed planning examples:** first names may be used when they materially clarify the product, including Adaya.
- **Legacy rule:** no old feature, screen, score, tab, algorithm, or architecture survives merely because it existed before.
- **Developer handoff rule:** this document is self-contained. The developer is not expected or authorized to request the older planning/archive documents unless the owner explicitly chooses to provide one later.
- **New repository:** `Bill6006/life-command-os-rebuild`.
- **Existing repository protection:** `Bill6006/life-command-os` is legacy/reference only and must never be modified, reinitialized, force-pushed, repointed, or overwritten during this rebuild unless the owner explicitly reopens that decision.

---

## v1.2 change log

This revision makes two focused product/workflow clarifications without changing the rebuild sequence or reopening completed phases:

- adds a permanent independent-QA phase gate: the builder stops at **YELLOW — READY FOR INDEPENDENT QA**, a fresh QA conversation tests the deployed checkpoint in a real Android-style mobile context, writes a standard handoff report, and the original builder repairs any failures before GREEN;
- extends Phase 6 with progressively disclosed evidence/analytics so the owner can inspect the actual numerical support behind a recommendation or learned pattern without turning Now into a statistics dashboard;
- permits likelihood/rate percentages only when the underlying quantity is defined and enough comparable evidence exists, with sample size, context, counterexamples, uncertainty, and the measured outcome aspect kept visible;
- clarifies that the eleven modeled core areas intentionally map to ten baseline Life pages because Health & Physical Capacity and Sleep & Recovery share the **Health & Recovery** inspection page.

**v1.2 addendum (D-082):** the independent-QA gate this revision added did not yet say, in the plan itself, that a QA handoff must carry the complete next prompt automatically on both PASS and FAIL. Phase 5's first QA run returned FAIL without one, and the owner had to ask for it separately. Section 43's QA report contract and defect loop now state the requirement directly. This is a completion of the QA gate already listed above, not a new workflow, so it does not warrant its own version number.

**v1.2 addendum (D-089):** the plan said the app learns from "observed
outcomes" (section 20) and said a percentage must name the quantity it measures
(section 51). It never said **who supplies the judgment**. Phase 6's first QA
pass passed section 51's gate as written and the owner then read one sentence —
*"How much did a walk do for you?"* — and found the gap underneath it: nine of
fifteen action verbs ask him to grade an action's causal contribution, and Phase
6 renders tallies of those grades as percentages that read as measurements.
Sections 20 and 51 below now state the observe-first principle directly. This
closes a gap in what the plan asked for rather than changing the rebuild
sequence, so it does not warrant its own version number, for the same reason
D-082 and D-083 did not.

**v1.2 addendum (D-090, D-091):** the QA gate this revision added said the reviewer must be a fresh conversation; it did not say the reviewer must be a *different reader*. Phase 6 showed the difference. A Claude QA conversation checked section 51's gate item by item and passed it, the pass was withdrawn on a sentence the owner read, and after the repair an independent Codex cold-use audit found seven further blockers in a phase carrying 22 purpose-written regressions, all green. Independent QA therefore moves permanently to **Codex**, begins with sealed cold owner-use before reading any repository document, and audits meaning before duplicating gates the builder already ran (D-090, section 43). D-091 states how far anything the app works out may then be stated: identity, negative exposure, context, confounding, correctability, tracked-state meaning, and historical order. Both close gaps in what the plan asked for rather than changing the rebuild sequence, so neither warrants its own version number, for the same reason D-082, D-083 and D-089 did not.

**v1.2 addendum (D-083):** writing the complete next prompt into the governing MD (D-082, section 43) and then also pasting that same prompt into the chat response was solving one owner problem — never having to hunt for the next instruction — by recreating another: reading a long prompt twice. Section 43 now also requires a short, separate launcher at the end of any response that writes or updates `docs/NEXT_PROMPT.md` or a `docs/qa/PHASE_XX_QA_HANDOFF.md`, naming the model, intelligence level, conversation instruction, and a short copy/paste prompt that points at the exact file to read and execute rather than repeating it. This does not shorten what is written to either file; it does not warrant its own version number for the same reason D-082 did not.

**v1.2 addendum (D-109 to D-113):** a whole-app intelligence and product audit
(`docs/WHOLE_APP_INTELLIGENCE_AUDIT.md`, 51 findings) and the independent review
that followed it produced five owner decisions, and one of them changes the phase
sequence for the first time. **Two initiatives now precede Phase 9:** Phase 81,
correctness and truthfulness, and Phase 82, the structural intelligence skeleton
(D-109). They exist because the audit found the app stating things that are not
true — a time limiter that says "tonight" at 08:40, a claim that a four-year-old
did something "three times running" when she did it three times out of six — and
because nine findings create controls, surfaces and recommendation shapes that
Phase 9 would otherwise design without. Canonical Phase 10 keeps its scope
(performance, PWA, reliability) unchanged; the remaining intelligence work
becomes one later phase, sequenced after Phase 9 and before Phase 10, whose
permanent number is assigned before it is reached. Section 61's copy example is
corrected (D-110), D-036 gains a narrow consequential exception (D-111), D-070's
sufficiency rule is corrected (D-112), and move diversity is named as a product
outcome (D-113). None of this reopens a completed phase, and it does not warrant
its own version number for the same reason D-082, D-083, D-089, D-090 and D-091
did not.

**v1.2 addendum (D-158 to D-173):** an independent sealed owner-use review
(`docs/qa/WHOLE_APP_OWNER_USE_REVIEW.md`, 44 findings) was completed after Phase
82 closed GREEN and adjudicated against this plan, the intelligence audit, the
decision log and the repository. The adjudication is
`docs/PRODUCT_ADJUDICATION.md` and the owner approved it. **Two build phases now
precede canonical Phase 9** — routing 83, the ordinary-use acceptance instrument
and the observed defects; and routing 84, the destination and discovery structure
the visual phase designs its product contract around (D-158). The review's
central finding survived verification against the tree: the product holds no
representation of what the owner is trying to become, so it cannot represent
progress or a strategy that fails, and that changes what a domain page is. Five
owner questions are answered: six distinct emotional dimensions with no composite
(D-166, closing Q7); private influence as one owner-controlled permission
defaulting off (D-167, closing Q8); **Love / Dating / Romantic Life as a twelfth
core domain** with its own page, making twelve domains and eleven pages (D-168,
amending D-078); an in-product review loop on Insights and the domain pages with
no new navigation tab (D-169); and Faith's current passivity recorded as an
interim state rather than the product design (D-170). Cross-device continuity is
deferred and local-first stands (D-171); Q6 is reopened before the later
intelligence phase, with the finite concept vocabulary explicitly refused as a
permanent ceiling (D-172). Section 4.1 gains the twelfth domain, section 11 gains
the permission, sections 22, 23 and 54 are amended, and **new section 43A
reconciles canonical phase names with orchestrator routing integers** (D-159) —
canonical Phases 9, 10, 11 and 12 are all unroutable as bare integers and route
as 90, 92, 93 and 94. Canonical Phase 10 is **not** re-scoped by receiving a
routing label; D-109 stands. No completed phase is reopened and no canonical
phase is renumbered, so this does not warrant its own version number for the same
reason the addenda above did not.

**v1.2 addendum (D-174 to D-176):** routing 83 built the ordinary-use acceptance
instrument D-161 asks for and repaired the defects the owner-use review found,
and its own sweeps produced three further rules. **A copy catalogue is rendered
along every axis its sentence branches on** (D-174) — the instrument built in
Phase 81 to render every no-action sentence renders them against one history, so
the sentence that called four records "plenty of history" was never rendered by
it. **A promise about what a surface will not show lives beside the policy that
decides it** (D-175) — the Private page's promise was written in one file and
implemented in another and they disagreed for four phases. **Every owner-facing
control carries an accessible name, and a placeholder is not one** (D-176) —
section 37 now says so directly, and section 26 gains Timeline's own version of
D-153. None of this reopens a completed phase or changes the sequence, so it does
not warrant its own version number for the same reason the addenda above did not.

**v1.2 addendum (D-177 to D-180):** routing 83's first submission failed independent QA, and its four findings produced four more rules. Three of the four were one shape — **a guard that could not fail**. **A quantity in a sentence is compared with the count behind it, never matched against a list of phrases** (D-177): the guard written for the phase's own quantity acceptance item held a list of unmeasurable phrases while Now said "the last few times" over one occasion, which is measurable and was simply never measured. **A claim of exhaustiveness is a test, or it is a comment** (D-179): the ordinary-use route table said "every" with nothing comparing it to source. **A commit that is not pushed has met no gate** (D-180, amending D-147): the aggregate `npm run verify` was red at a head CI had never seen, because the commit had never been pushed. The fourth was structural rather than a guard — **one name for an action, in the layer every surface can reach** (D-178): the table that names an action with its subject in it lived above the two files that write the belief sentence and the button that corrects it, so one card carried four registers for one walk. Section 43A, the routing map and every phase scope are unchanged, so this does not warrant its own version number for the same reason the addenda above did not.

## v1.1 change log

This revision closed four implementation ambiguities before developer handoff:

- made the plan self-contained and explicitly excluded old planning/archive documents from normal developer inputs;
- locked the rebuild to a brand-new repository: `Bill6006/life-command-os-rebuild`, with hard safeguards protecting `Bill6006/life-command-os`;
- strengthened the phone-preview contract so owner-visible verified checkpoints are consistently deployable to one stable phone URL and Preview SHA must be reported against checkpoint SHA;
- required every Claude Code handoff to recommend the intelligence level and CURRENT/NEW conversation, explain both choices, and provide the next copy/paste prompt immediately.

# 1. Source authority

This plan was created from the actual project material, not from memory alone, but it is now intended to be **self-contained for the developer**.

## Developer authority order

When implementing the rebuild, use this order:

1. **Explicit current owner decisions given during the rebuild**
2. **This canonical plan**
3. **Owner-approved amendments to this canonical plan**
4. **`docs/DECISION_LOG.md`**
5. **Verified implementation/tests created inside the new rebuild repository**

## Old-document boundary

The developer will **not** be given the old planning/archive documents as normal build inputs.

Therefore:

- do not ask the owner to upload the old plans simply because they are named in this plan;
- do not treat the old app or old repository as a specification;
- do not browse, clone, inspect, or mine `Bill6006/life-command-os` for product requirements unless the owner explicitly authorizes a narrowly defined reference task;
- do not recreate a legacy feature because an old implementation happens to contain it;
- if a requirement seems missing or ambiguous, surface the question against **this plan** rather than searching old material for an answer;
- any future legacy-data migration work must follow this plan's migration boundary and must not use old runtime architecture as authority.

## Provenance only

This plan was synthesized from a broad body of historical project material, including prior requirements, plans, HTML generations, exports/backups, reliability maps, acceptance documents, and current-conversation decisions.

That provenance explains why the plan is detailed, but those historical files are **not dependencies of the rebuild**.

## Conflict rule

- Preserve **human intent** over old implementation.
- Preserve **repeated real workflows** over one-off feature ideas.
- Preserve **data meaning** over legacy schema shape.
- Preserve **recent owner decisions** over older plans.
- Surface unresolved contradictions instead of silently inventing an answer.
- Never use the absence of an old document as permission to guess.

---

# 2. Product promise

Life Command OS is a **whole-life personal intelligence system**.

It should continuously build a useful model of the owner's life, recognize what matters now, choose the best credible next move, explain that move in normal human language, learn from the outcome, and improve future decisions.

The product is **not**:

- a generic productivity dashboard;
- a to-do list with AI wording;
- a habit tracker with more charts;
- a life score machine;
- a collection of separate mini-apps;
- a static questionnaire;
- a dashboard that requires the owner to manually patrol every life area;
- an app optimized for engagement time;
- an architecture demonstration.

The product should eventually feel like:

> **It knows what is going on, knows what actually matters, remembers enough context, and gives me one useful move without making me manage the system all day.**

---

# 3. Definition of success

The rebuild is successful only if all of the following are true.

## Intelligence

- Recommendations are specific to the actual subject.
- The app never loses the noun and degrades into vague language such as “it” when the subject is known.
- It uses relevant lifetime history without treating all history as equally predictive.
- It understands durable context and does not repeatedly ask what it already knows.
- It identifies missing information only when that information could materially change a decision.
- It learns from actual outcomes.
- It recognizes uncertainty.
- It does not invent precision.
- It understands cross-domain tradeoffs.
- It can choose rest, wait, no action, or stop when those are best.
- It can recognize stale coverage before a domain quietly goes unmaintained.

## Experience

- The owner does **not** have to visit every domain page to keep the system intelligent.
- Domain pages remain available when the owner wants to inspect or manually update something.
- The main daily experience is low-friction.
- Time-block guides stay on one flow and ask one useful question at a time.
- The visual experience feels modern, alive, dimensional, and intentional.
- It does not look like a submarine console, a dark cave, a developer dashboard, or a pastel wellness app.
- Real-phone use feels first-class.

## Development

- Every meaningful accepted code change can be seen on a phone through a stable preview workflow.
- Synthetic JSON can drive QA without touching private owner data.
- The developer can inspect why the engine made a decision.
- Tests verify semantic behavior, not only implementation paths.
- A coding agent cannot silently change foundational requirements.

## Durability

- Historical data survives.
- Backups are restorable.
- One malformed record cannot blank the app.
- Migrations are explicit.
- Legacy data can be preserved without forcing the new architecture to imitate the legacy app.
- Future improvements should upgrade the system rather than require another ground-up rewrite.

---

# 4. Non-negotiable product principles

## 4.1 Whole-life model, no domain shutoff

All core life domains remain part of the intelligence model.

A domain may be:

- stable;
- quiet;
- low priority right now;
- recently covered;
- stale;
- uncertain;
- urgent;
- constrained.

A domain is **not** removed from the model because a switch is off.

### Initial core domains

- Health & Physical Capacity
- Sleep & Recovery
- Fatherhood / Family
- Career & Learning
- Money & Financial Resilience
- Social & Relationships
- Emotional Health
- Faith & Meaning
- Home & Environment
- Private / Sexual Health
- Love / Dating / Romantic Life
- Long-Range Direction / Identity

The domain registry must be extensible.

**Twelve core domains, eleven baseline pages (D-168, amending D-078).**
_Love / Dating / Romantic Life_ was added by owner decision after the sealed
owner-use review found the owner's romantic aspiration had no home anywhere in
the model. It is a distinct domain with its own Life page and is **not** reduced
to Social or Private: hiding it inside Social would force one domain to carry two
unrelated destinations. It must be able to hold relationship aspirations, dating
and social opportunity, compatibility and boundaries, relationship development,
relevant confidence and social context, and the owner's own stated desired
relationship direction. It must never become a date quota, a partner score, a
compatibility percentage or a ranking of people.

The remaining gap between twelve domains and eleven pages is unchanged and is
D-078's: **Health & Recovery** covers _Health & Physical Capacity_ and
_Sleep & Recovery_ together, because the engine reads them together.

## 4.2 One global brain

There is one whole-life decision system.

Domain analysis may specialize in domain meaning, but there must not be separate competing recommendation brains for each tab.

The global system decides what reaches the owner.

## 4.3 Owner sovereignty

The owner can:

- accept;
- reject;
- modify;
- postpone;
- say “can’t now”;
- request another option;
- correct context;
- correct a learned belief;
- explicitly forbid a recommendation family;
- set their own direction.

The app must distinguish disagreement from inability.

An owner override must become the truth used by later reasoning.

## 4.4 Anti-shame

The system should push growth without grading the owner's worth.

It must not frame:

- rest as failure;
- low capacity as weakness;
- parenting time as lost productivity;
- a bad day as identity failure;
- missing data as failure.

## 4.5 Low burden

The app should require less input as it learns more.

It should not collect data merely because a field exists.

## 4.6 Specificity over polished generic language

A specific ordinary sentence is better than an elegant generic one.

If the app knows the subject, use the subject.

---

# 5. Main navigation model

The rebuild should **not** create one permanent bottom tab per life domain.

## Primary mobile navigation

Use four primary destinations:

1. **Now**
2. **Life**
3. **Timeline**
4. **Insights**

Data, exports, backup/restore, settings, privacy, and QA/developer controls belong behind a secondary destination such as **More**, **Data**, or a profile/settings entry rather than consuming a permanent primary slot.

Exact iconography and final labels can be refined during design implementation, but the conceptual structure is fixed.

---

# 6. Now — the proactive command surface

**Now is where the app comes to the owner.**

The owner should not have to browse domain pages to discover what matters.

## Now should be able to show

- current premise / situation;
- current constraint or limiter;
- one primary next move;
- time/effort;
- a concise reason;
- relevant tradeoff;
- uncertainty when it matters;
- one missing question when needed;
- an active recommendation state;
- result/outcome follow-up when due.

## Now may choose

- act;
- continue;
- wait;
- recover;
- protect sleep;
- spend time with Adaya;
- do a career/learning rep;
- remove one home friction;
- make a social move;
- handle a money issue;
- stop for the night;
- do nothing more.

## Now must not become

- a wall of scores;
- a dashboard of every domain;
- a long research explanation;
- a feed of generic cards;
- a fixed checklist;
- a place where every domain fights for screen space.

---

# 7. Life — optional domain inspection

**Life is where the owner goes to inspect the model.**

The owner should not need to visit Life for routine system maintenance.

## Life overview

Show all core domains with a simple, human status.

Possible owner-facing states include:

- Fresh
- Quiet / stable
- Changing
- Needs a check-in
- Needs attention
- Uncertain

Avoid technical evidence terminology on the overview.

## Domain page purpose

A domain page should answer:

- What does the app currently understand?
- What changed recently?
- What goals or responsibilities matter here?
- What evidence supports that understanding?
- What is stale or uncertain?
- What is the app currently learning?
- What can the owner correct?
- What optional manual update can the owner make?

## Domain pages are not separate brains

A Career page, Fatherhood page, Health page, or Money page provides focused inspection and input.

The global decision engine still sees all domains together.

---

# 8. Coverage intelligence — prevent silent neglect

The app must give the owner confidence that an unvisited domain is not silently frozen.

Create a **Coverage Engine**.

## Coverage Engine responsibilities

For every important domain and meaningful sub-area, track internally:

- last meaningful evidence;
- strength of evidence;
- whether evidence was direct, inferred, or outcome-based;
- freshness appropriate to that kind of information;
- unresolved uncertainty;
- whether current beliefs are still supported;
- whether a natural opportunity exists to refresh evidence.

## Important rule

Freshness is **concept-specific**, not one universal number of days.

Examples:

- current sleep may become stale quickly;
- a durable custody arrangement does not need to be re-asked every day;
- a child's developmental skill may need periodic evidence;
- a long-term financial goal may remain valid longer;
- a current symptom may expire quickly.

## How stale coverage is repaired

The engine should prefer, in order:

1. use trustworthy evidence already being generated by normal life;
2. infer cautiously from related evidence when appropriate;
3. create a useful action that naturally produces evidence;
4. ask one small question at an appropriate moment;
5. surface a “needs update” signal in Life if manual review is actually needed.

The owner should not have to patrol tabs.

---

# 9. Fatherhood / Adaya growth model

Fatherhood is a core identity domain, not a productivity score.

## Durable context

The system must support durable family facts.

Example:

- full custody should be treated as durable context;
- the app should not repeatedly ask “Do you have Adaya tonight?” unless there is evidence of an exception such as travel or a schedule change.

## Growth evidence

The app should be able to understand development goals and skills without requiring constant manual status updates.

Example flow:

1. The app knows a current growth area is independent speaking.
2. Now suggests a natural opportunity:
   - let Adaya order her own food;
   - let her ask an employee a question;
   - let her answer an adult directly.
3. Later the app asks a short outcome question.
4. The outcome becomes evidence.
5. After enough evidence, the app may suggest:
   - “She seems more comfortable doing this on her own. Update this growth area?”
6. The owner can confirm, reject, or correct the interpretation.

## Rule

Meaningful growth-stage changes should not be silently invented from one event.

---

# 10. Social / confidence intelligence

Social intelligence should support grounded confidence without turning human interaction into a game.

## Possible recommendations

When context supports it, the app may suggest:

- initiate one conversation;
- give one genuine compliment;
- spend time somewhere social;
- express an observation instead of staying silent;
- reconnect with someone;
- protect solitude when social energy is genuinely low.

## No quota mentality

Avoid:

- “compliment 1/1”;
- approach streaks as a moral score;
- treating women or conversations as points;
- forcing social action when the current bottleneck is elsewhere.

## Outcome learning

The app can learn:

- whether the owner acted;
- how comfortable it felt;
- whether an approach style was easier;
- whether social action improved or worsened the current state;
- which contexts make connection easier.

---

# 11. Private / Sexual Health domain

Private / Sexual Health is a first-class domain.

It may include owner-defined goals or concerns related to:

- pornography;
- masturbation;
- compulsive behavior;
- frequency;
- timing;
- triggers;
- sleep impact;
- loneliness;
- stress;
- dating/social effects;
- faith alignment;
- mood;
- confidence;
- post-behavior outcomes.

## Manual-entry-first

This is one of the few domains where the owner is comfortable intentionally navigating to the domain to enter explicit private data.

The app should **not** behave as though the owner must answer unsolicited private questions during normal check-ins.

## Intelligence use

Private evidence may influence whole-life reasoning when relevant **and only when the owner has switched that influence on** (D-167, closing Q8).

One explicit owner control governs it:

> **Allow Private / Sexual Health to influence recommendations** — default **OFF**.

**When OFF:** private evidence stays stored and inspectable inside its authorized private surfaces. It does **not** influence cross-domain recommendation ranking and does not enter pattern discovery.

**When ON**, all four of these hold at once:

- ordinary Now and Timeline copy stays discreet;
- an explanation must not reveal an intimate premise to someone reading over the owner's shoulder;
- the owner can turn the permission off again;
- turning it off stops **future** use without falsifying, rewriting or deleting history.

Consent is at the **domain level**, not per entry, unless later evidence shows domain-level consent is insufficient.

The **structural discretion guard is still required** and is not replaced by the permission: when the permission is ON it must be structurally impossible — not merely conventional — for an explanation or an evidence panel to render an explicit private reading. If that guarantee cannot be made, the permission cannot be offered.

Examples of what the permission, once ON, makes possible:

- late-night scrolling + fatigue + repeated private behavior may make a bedtime/phone-boundary recommendation more useful;
- loneliness may suggest social connection rather than a generic willpower message.

## No shame

The app must not independently decide that pornography or masturbation is morally wrong.

The owner defines the desired relationship with those behaviors.

## Display discretion

Normal Now/Timeline surfaces should avoid unnecessarily exposing explicit private details.

Exact reveal/discretion behavior can be refined during implementation.

**A discretion promise must be true of metadata as well as content.** The owner-use review found the Private page promising that nothing here appears anywhere else while Timeline showed that a private entry existed and when it occurred. Concealing the sentence is not concealing the entry. Either the existence and timing are also withheld, or the promise says what it actually covers — and that is a truthfulness repair rather than a future capability, so it is routing 83's, not routing 84's, and it does not wait on the permission above.

## Export requirement

Private / Sexual Health must be supported by **every export family**.

- Full backup must preserve it for restoration.
- AI-review exports must offer it as an explicit selectable section.
- It must not be silently impossible to export because it is private.
- The export UI should clearly show whether it is included.

---

# 12. Time-block guides

Morning, afternoon, evening, and other time-aware guidance remain useful concepts, but they are **not fixed questionnaires**.

## Interaction model

The guide stays on the **Now flow**.

Do not route the owner:

> Health tab → Career tab → Fatherhood tab → Money tab → back to Now.

Instead:

1. open the guide;
2. show one question;
3. record the answer;
4. recompute immediately;
5. determine whether another answer could materially change the recommendation;
6. ask another question only if needed;
7. stop when enough is known;
8. show the recommendation.

## Question examples

The guide may ask about:

- sleep;
- energy;
- pain/soreness;
- usable time;
- work context;
- a recent career outcome;
- an event involving Adaya;
- whether a prior recommendation happened;
- a current constraint.

## Rules

- Already-known durable facts should not be re-asked.
- Recent answers can carry forward only when still valid.
- Unknown remains unknown.
- Questions should come from the whole-life brain, not from whichever domain page is open.
- The guide should resume after interruption without restarting.
- A guide should sometimes ask **zero** questions if the engine already has enough evidence.

---

# 13. Canonical data architecture

The new architecture should preserve meaning before UI convenience.

## 13.1 Canonical record layer

Use a versioned local canonical store.

Preferred direction:

- IndexedDB or equivalent transactional browser database;
- append-first history;
- explicit correction/supersede records;
- stable IDs;
- schema versioning;
- provenance;
- local timestamp and timezone semantics;
- privacy classification;
- source classification.

Avoid using `localStorage` as the authoritative lifetime history store.

## 13.2 Core record meanings

Canonical records should distinguish at least:

- Observation
- ExplicitFact
- Context
- Constraint
- Goal
- Commitment
- Preference
- Decision
- ActionRecommendation
- ActionStart
- ActionCompletion
- ActionDecline
- ActionUnableNow
- Outcome
- Correction
- RelationshipEvent
- DomainUpdate
- CoverageUpdate
- ImportedLegacyRecord

## 13.3 Semantic entity layer

Create stable semantic entities such as:

- Person
- Relationship
- Goal
- Project
- Skill
- LearningTopic
- Responsibility
- Routine
- Place
- WorkItem
- FinancialGoal
- HealthConcern
- DevelopmentSkill
- Behavior
- LifeDomain

A record can refer to one or more entity IDs.

## 13.4 Prevent the “it” problem structurally

A recommendation must not depend on the UI guessing its subject from free text.

A recommendation should carry structured semantic references such as:

- subject entity;
- domain;
- action target;
- why-now context;
- related goal;
- evidence references.

The display sentence is derived from structured meaning.

If a recommendation is about subnetting, the object remains subnetting.

If it is about an Adaya growth skill, that skill remains attached.

---

# 14. Derived model layer

Canonical records are the source of truth.

The app may build regenerable derived models for speed and intelligence.

Examples:

- current owner context;
- domain summaries;
- entity graph;
- goal state;
- coverage state;
- recent trend;
- life-season state;
- learned move effects;
- candidate indexes;
- historical analogues.

## Rule

Derived state must be rebuildable from canonical records.

A corrupted cache must not corrupt lifetime history.

---

# 15. Time architecture

Time semantics must be explicit.

## Separate concepts

Do not treat these as interchangeable:

- real instant;
- owner-local date;
- owner-local time;
- local day identifier;
- local week identifier;
- observation window;
- due window;
- data freshness window.

## Rules

- Owner-facing time uses the owner's timezone.
- Week boundaries use owner-local calendar semantics.
- A week identifier is not an instant.
- DST must be tested.
- Different intelligence questions may use different time horizons.
- Export range does not limit intelligence history.

---

# 16. Lifetime memory

The system should preserve meaningful history over years.

## Required horizons

The intelligence layer should be capable of reasoning across:

- current moment;
- current block;
- today;
- recent days;
- recent weeks;
- recent months;
- current life season;
- long-term baseline;
- all retained history.

## Contextual historical comparison

Historical similarity should consider relevant context, not only date proximity.

Potential factors:

- workday vs weekend;
- WFH vs on-site;
- parenting context;
- time of day;
- sleep;
- workload;
- health state;
- obligations;
- available time;
- life season.

## Recency

Recent evidence can matter more without deleting old evidence.

Old evidence from another life season remains visible but may be less predictive.

---

# 17. Intelligence architecture

The architecture must not repeat the mistake of letting a weak brain hide behind a large UI.

Build a small intelligence kernel first.

## 17.1 Intelligence pipeline

1. **Fact resolver**
   - knows what is explicit, inferred, stale, corrected, or unknown.

2. **Context assembler**
   - builds the current situation from durable and temporary context.

3. **Coverage engine**
   - identifies meaningful stale/uncertain areas.

4. **Goal/direction resolver**
   - understands current long-range direction and active priorities.

5. **Candidate generator**
   - produces realistic possible actions.

6. **Constraint filter**
   - removes actions that do not fit current reality.

7. **Candidate evaluator**
   - compares likely benefits, costs, friction, confidence, future effects, and tradeoffs.

8. **Global arbitration**
   - selects one primary move or a valid non-action.

9. **Explanation generator**
   - converts the structured decision into concise human language.

10. **Outcome learner**
    - updates context-specific evidence after observed results.

11. **Inspector**
    - exposes the reasoning trace in QA/diagnostics.

## 17.2 One decision brain

No domain-specific module gets to independently present a competing final recommendation.

Domain modules contribute facts, interpretation, constraints, and candidates.

One arbitration path decides.

---

# 18. AI/model strategy — do not lock intelligence to the old ceiling

Older plans eventually made local-only deterministic intelligence and no paid AI a hard requirement.

That is **not automatically inherited**.

The new architecture must support an intelligence tournament.

## Required candidates

At minimum compare:

### A. Structured deterministic baseline

- local facts;
- local rules;
- transparent ranking;
- full offline capability.

### B. Structured semantic/model-assisted approach

- deterministic canonical facts and safety boundaries;
- model-assisted semantic interpretation, candidate generation, or explanation where it provides measurable value;
- strict structured output validation;
- provenance and confidence.

### C. Hybrid approach

- deterministic facts/constraints/safety;
- local derived model;
- selective model-assisted reasoning;
- deterministic verification before a recommendation becomes actionable.

## Decision rule

Choose the simplest architecture that clearly produces better decisions on the agreed synthetic test suite.

## Guardrails

A model must not:

- silently write canonical facts without validation/provenance;
- invent user decisions;
- override explicit owner facts;
- bypass privacy policy;
- bypass hard safety constraints;
- turn low confidence into confident language.

## Hosting consequence

The frontend remains GitHub/repository-driven.

If secure remote inference proves necessary, use the smallest secure inference service required.

Do **not** expose permanent API secrets in the browser.

Do not store the owner's full life history on a server merely because inference needs a network request.

---

# 19. Candidate decision model

The final algorithm is not predetermined.

It must be tested.

## Candidate evaluation dimensions

A move may be evaluated on:

- relevance to current bottleneck;
- relevance to long-range direction;
- weekly/directional fit;
- urgency;
- expected immediate benefit;
- next-block effect;
- next-day effect;
- sustainability;
- opportunity cost;
- friction;
- available time;
- physical/emotional capacity;
- location/context fit;
- responsibility fit;
- completion probability;
- owner preference;
- recent duplication;
- prior outcomes in comparable contexts;
- uncertainty;
- protection of important domains.

## Important behavior

A smaller move can beat a larger move if its total effect is better.

A valid decision may be:

- wait;
- rest;
- continue;
- stop;
- ask one question;
- no additional move.

---

# 20. Outcome learning

The app learns from **observed outcomes**, not from recommendation generation alone.

## Separate lifecycle states

Track:

- shown;
- accepted;
- started;
- completed;
- abandoned;
- declined;
- unable now;
- replaced;
- outcome observed;
- outcome unknown.

## Learning rules

- Rejection is not “ineffective.”
- Unable-now is context evidence.
- One success is not proof.
- Context similarity matters.
- Same-block effects and next-day effects can differ.
- Sleep/recovery actions may need next-morning evaluation.
- Learned effects should be reversible when later evidence contradicts them.

## Who supplies the judgment (owner decision D-089)

Learning from “observed outcomes” means the **system** works out whether one
thing followed another. It does not mean the owner is asked to work that out and
the answer is then filed as an observation.

In order of preference:

1. **observe first** — read what the ordinary record already contains;
2. **infer cautiously**, and say the inference is one;
3. **ask for a concrete fact** when one is needed and nothing supplies it;
4. **ask for current subjective state** when that state is itself what matters —
   how the owner feels is a fact only he holds, and asking for it is wanted;
5. **never ask the owner for the causal relationship the system exists to
   learn.**

Consequences:

- **Who inferred a figure is part of what it means.** A figure built from the
  owner’s own judgments and a figure built from observed state are different
  kinds of claim and must not be rendered as the same one.
- **Association is never written as causation, in either direction.** A worse
  state after an action is a worse state, not harm. This generalizes the rule
  that inference may not conclude harm.
- **A relationship claim requires a comparison group** — comparable situations
  where the action did not happen, identified and counted. Without one, a figure
  describes the occasions that happened to include the action.
- **Absence of evidence is a first-class answer.** Missing before- or
  after-observations produce “not enough to say”, never a figure computed over
  whichever occasions happen to have both.
- **History keeps its original meaning.** Judgments the owner has already given
  remain his judgments. A new observed quantity is added beside them; nothing is
  relabelled, reinterpreted or deleted.

Where a move has no observable state dimension the app could read, asking the
owner for his own view of it remains legitimate — and it is then shown as his
view rather than as a measurement.

---

# 21. Weekly direction and long-range direction

Long-range direction and week-level emphasis can remain useful.

They must not become domain-off switches.

## Weekly Direction

- May identify one useful emphasis.
- May be deliberately quiet.
- Must support non-career focuses.
- Must carry actual semantic domain/category information.
- Owner custom wording must remain visible.
- An adjusted/custom direction is not agreement with the prior proposal.
- It expires at the correct owner-local week boundary.
- It should influence arbitration without dominating unrelated urgent needs.

## Long-range direction

The owner can define and revise:

- future direction;
- major goals;
- commitments;
- identity standards.

Historical evidence must not be rewritten retroactively when direction changes.

---

# 22. Scores and forecasts

Do **not** make a giant Life Score a foundation requirement.

## First-release rule

- No single score is required for the initial rebuild.
- Use trajectories, confidence, coverage, bottlenecks, and actual next decisions first.
- A score or forecast may be added later only if it clearly improves decisions.

## This binds the destination model (D-162)

The destination and progression objects routing 84 introduces — what the owner is aiming at, where he is now, what would count as evidence of progress, what is next, and what is unknown — are **qualitative by default**. A quantity appears only where the owner supplied one and it names what it measures (D-084).

Forbidden on every owner surface, about the owner and about Adaya: a score, a percentage, a share, a rate, a rank, a grade, a completion bar, a readiness number, or any composite across domains.

Still allowed, and what a destination is described with: counts of occasions, dates, the owner's own stated targets in his own units, and honest uncertainty.

**Why this needs saying twice.** A phase whose whole subject is progress is the one place a percentage arrives looking reasonable. Avoiding an unsupported percentage is correct; avoiding a meaningful progress model is not. The answer to that tension is description with evidence, not a number with a friendly face.

## If forecasts are used

They must define:

- what is being forecast;
- time horizon;
- confidence;
- missing evidence;
- what could change the forecast.

Do not use a number as a proxy for personal worth.

---

# 23. Domain-specific intelligence boundaries

## Health / Physical Capacity

Support:

- sleep;
- energy;
- soreness/pain/caution;
- hydration;
- meals;
- recovery;
- movement;
- workout readiness;
- active physical load;
- symptoms;
- caffeine timing;
- sunlight/outdoor time.

Do not diagnose.

## Workout integration

Life Command OS should primarily decide:

- whether movement fits;
- how hard the day can support;
- whether recovery should win;
- whether training fits the whole-life situation.

Exact exercise programming can remain the responsibility of a dedicated workout system unless the owner later decides otherwise.

## Career & Learning

Support:

- actual skill progression;
- retrieval;
- weak-topic review;
- labs;
- work proof;
- explain-from-memory;
- interview stories;
- honest resume readiness.

Study consumption alone is not proof.

## Money

Support:

- financial direction;
- obligations;
- cash resilience;
- debt;
- saving;
- spending drift;
- current goals.

Do not hardcode stale historical dollar amounts.

## Emotional Health

Support useful emotional context without diagnosis.

Do not turn every interaction into therapy language.

**Six distinct dimensions, owner-decided (D-166, closing Q7):** mood; stress; motivation; confidence; loneliness / social connection need; mental overload / overwhelm.

They stay distinct, may each be unknown independently, and **never form a composite wellness score** — nothing anywhere may aggregate across them. Not all of them are asked on any given day; they are asked or observed when informationally useful. Free-text emotional context still coexists with them where useful.

**Energy and tiredness/recovery are not among them.** They stay represented through their existing Health and Sleep concepts and must not be silently duplicated into an emotional reading: one quantity with two homes is two answers to one question.

A single `emotional.score` concept is the wellness score arriving through the back door and is forbidden.

## Faith & Meaning

Respect owner-defined faith.

Never claim divine authority.

**Faith's current passivity is an interim state, not the product design (D-170).** The owner's stated aim is greater closeness to God and stronger genuine belief while honestly recognizing uncertainty. Faith must eventually be able to participate, when the owner chooses that direction, in destination, discovery, practices and experiences, reflection, strategy and pattern learning.

It must never manufacture certainty, tell the owner what he believes, grade faith, treat doubt as failure, or become a devotional app by default. But "respectful" must not mean the app permanently does nothing.

## Home & Environment

Recognize small environmental friction and future-block impact.

Prefer small useful resets over giant cleaning commands.

---

# 24. Visual design contract

The plan should be specific about **feel and anti-patterns**, not exact pixels.

## Direction

- dark-first;
- modern;
- alive;
- dimensional;
- premium without luxury cliché;
- grounded;
- masculine-neutral;
- calm when calm is appropriate;
- capable of urgency when urgency is real;
- personality without gimmicks.

## Must avoid

- submarine/cockpit control-panel look;
- mysterious dark cave;
- near-black everything;
- low-contrast text;
- neon borders around every card;
- gamer RGB;
- tiny telemetry labels;
- dense developer-dashboard grids;
- sterile enterprise UI;
- pastel wellness aesthetic;
- decorative “AI brain” sci-fi.

## Preferred feel

- illuminated dark surfaces;
- clear hierarchy;
- selective accent color;
- depth;
- readable typography;
- strong spacing rhythm;
- richer visual focus on the current decision;
- restrained micro-interactions;
- motion that communicates change;
- mood that can subtly reflect state/time without becoming theatrical.

## Design freedom

Do not lock exact:

- hex values;
- gradient recipes;
- card radii;
- shadow counts;
- animation milliseconds;
- complete screen layouts

before seeing the real interface on a phone.

## Acceptance

The owner reviews the actual design on the phone during development.

If it feels bland, cave-like, overly technical, or lifeless, the design gate fails even if CSS tests pass.

---

# 25. Motion and personality

Motion should help the interface feel alive.

Potential uses:

- recommendation changes;
- state transitions;
- completion;
- updated insight;
- priority shift;
- opening deeper reasoning;
- guide progress.

Motion must be:

- restrained;
- fast enough not to slow use;
- reduced-motion compatible;
- meaningful.

Personality belongs in:

- concise copy;
- subtle feedback;
- occasional humor;
- small moments of delight;
- context-specific language.

Do not use personality as a substitute for intelligence.

---

# 26. Timeline

Timeline is the chronological truth surface.

It should show meaningful history such as:

- observations;
- explicit updates;
- decisions;
- recommendations;
- starts/completions;
- outcomes;
- corrections;
- direction changes;
- domain changes;
- imported history markers.

## Rules

- Timeline should remain readable.
- Private detail should respect the private-display policy.
- Malformed records should not crash Timeline.
- Unreadable rows should be isolated/reported.
- Timeline should never create phantom actionable items from corrupt data.
- **Timeline describes itself as what is recorded, not as what happened.** The app does not watch the owner's life; it holds what it was told and what it worked out from that. The owner-use review found the page opening with _"Everything that happened, in the order it happened."_ over a partial record, and calling the two rows it could show "the whole record" on a history of four, one of them dated the following day. A sentence about how much of the record is on the page is checked against how much is on the page (D-153, D-174).

---

# 27. Insights

Insights answers:

> **What is the system learning about my life?**

## Insight types

- meaningful patterns;
- trajectories;
- emerging changes;
- stable strengths;
- repeated friction;
- context-specific move effectiveness;
- stale assumptions;
- contradictions;
- coverage gaps;
- life-season change.

## Main UI language

Translate technical evidence into normal language.

Deep evidence can expose:

- sample count;
- time window;
- included/excluded evidence;
- confidence;
- context similarity;
- counterexamples;
- relevant trend over time;
- reason trace;
- a rate or estimated likelihood when the evidence actually supports one.

Any number must say what it measures. Do not collapse direct result, downstream effect, comfort/friction, or follow-through into one generic “success” percentage.

A percentage must not appear merely because the interface has room for one. When the denominator is too small, the situations are not comparable enough, or the quantity is not well-defined, say that there is not enough evidence yet.

Do not display research machinery by default.

---

# 28. AI review exports

AI review is a first-class workflow.

## Export composer

The owner can select one, several, or all sections.

Possible sections:

- whole-life summary;
- current context;
- Health & Recovery;
- Fatherhood / Adaya;
- Career & Learning;
- Money;
- Social & Relationships;
- Emotional Health;
- Faith & Meaning;
- Home & Environment;
- Private / Sexual Health;
- goals and direction;
- recent Timeline;
- Insights/patterns;
- current recommendation;
- coverage gaps;
- app/intelligence diagnostics.

## Private-section rule

Private / Sexual Health is a valid selectable section in every AI-review export family.

It must never be technically impossible to include.

## Prompt travels with the export

Every AI-review export must carry a ready-to-paste handoff prompt.

The prompt should instruct the receiving AI to:

- read the export first;
- treat it as the source of truth for the exported state;
- summarize the current state;
- identify the main limiter rather than every possible problem;
- distinguish owner/life advice from app-tuning advice;
- identify what is working;
- identify what is drifting;
- say what should change;
- say what should stay;
- say what should be removed/simplified;
- explicitly include **what not to change**;
- avoid generic productivity advice;
- avoid judging the owner;
- avoid recommending more inputs unless missing information truly matters;
- state uncertainty clearly;
- ask questions only when necessary.

## Packaging

At minimum:

- export JSON contains the handoff prompt in structured metadata;
- export UI provides a clear **Copy Prompt** action.

A companion prompt file may be added later if it improves mobile workflow, but should not be required for the first useful version.

---

# 29. Full backup and restore

Full backup is different from AI review.

## Full backup

- full restoration fidelity;
- all owner-authorized domains;
- private domain included;
- schema version;
- app version;
- integrity metadata;
- no silent omission of records required for restoration.

## Restore

- validate before apply;
- preview when useful;
- atomic apply;
- post-apply verification;
- rollback on failure;
- no false success;
- no stale recovery layer overwriting the restored state;
- same-file retry works after a failed attempt.

## Corruption

- authenticated/tamper validation and structural validation are separate concerns;
- malformed records must not blank the app;
- restore controls remain reachable.

---

# 30. Legacy data strategy

Legacy import is **not** the foundation of the new architecture.

## Sequence

1. Build the new semantic/data model.
2. Prove the intelligence loop with synthetic data.
3. Freeze the canonical schema for the first migration boundary.
4. Only then design legacy import.

## Legacy importer rules

- detect legacy format;
- quarantine raw input;
- inventory records;
- map only semantics that are understood;
- preserve raw legacy payload when mapping is uncertain;
- preview;
- dry run;
- backup current state;
- apply atomically;
- verify;
- rollback;
- preserve provenance;
- preserve unknown fields;
- prevent duplicates;
- keep imported legacy records from silently driving intelligence until they are explicitly mapped/approved.

## Critical rule

**Do not contort the new architecture to make legacy mapping easier.**

If a legacy concept does not map cleanly, preserve it as historical archive data instead of recreating the old model.

---

# 31. Synthetic JSON QA laboratory

QA is a first-class product-development surface.

It is not a hidden emergency hack.

## Capabilities

The QA environment must support:

- loading arbitrary synthetic JSON;
- creating synthetic profiles;
- editing state;
- creating months/years of events;
- injecting missing data;
- contradictions;
- malformed records;
- stale beliefs;
- alternate timezones;
- DST;
- date/time travel;
- different custody/parenting contexts;
- different work contexts;
- low/high capacity;
- non-career weekly directions;
- custom owner overrides;
- private-domain scenarios;
- social scenarios;
- changing life seasons.

## Inspector

Expose:

- canonical facts;
- inferred facts;
- stale facts;
- current context;
- entities;
- relationships;
- coverage;
- candidate actions;
- rejected candidates;
- ranking;
- chosen action;
- explanation inputs;
- confidence;
- learning history;
- what would change the answer.

## Production isolation

- no real owner data in repo fixtures;
- no test bridge in production bundle;
- synthetic preview builds clearly labeled;
- test-only actions unavailable in production.

---

# 32. Golden intelligence scenarios

The rebuild does not expand until the engine passes a curated synthetic suite.

## G-001 — No orphan pronoun

Input:
- the owner is studying a specific technical concept and recently struggled with it.

Expected:
- recommendation names the concept;
- follow-up names the concept;
- no vague “it.”

## G-002 — Durable family context

Input:
- durable full-custody context is already known.

Expected:
- guide does not repeatedly ask if Adaya is with the owner;
- temporary exceptions can override durable context.

## G-003 — Adaya growth evidence

Input:
- a child growth skill has stale/limited evidence.

Expected:
- the system can suggest a natural practice opportunity;
- outcome updates evidence;
- repeated evidence can produce a suggested growth-status update;
- no stage jump from one event.

## G-004 — Social opportunity

Input:
- good energy, appropriate public setting, active social-growth goal, no stronger urgent bottleneck.

Expected:
- a specific natural social move may win, such as a genuine compliment or conversation start;
- no quota/gamification;
- outcome learning records comfort/result.

## G-005 — Sleep beats ambition

Input:
- severe sleep deficit and a career goal.

Expected:
- career does not automatically win;
- sleep/recovery can be the recommendation.

## G-006 — Private behavior in context

Input:
- repeated late-night private behavior associated with bedtime scrolling and fatigue.

Expected:
- recommendation may target the underlying setup;
- no moralizing;
- explicit private content is handled discreetly.

## G-007 — Coverage freshness

Input:
- owner has not manually opened a domain for weeks.

Expected:
- the app recognizes whether evidence is still sufficient;
- if stale, it creates a natural refresh path;
- the domain does not silently remain frozen.

## G-008 — Non-career Weekly Direction

Input:
- current weekly direction is home, fatherhood, health, or another non-career domain.

Expected:
- stored semantic category matches;
- arbitration uses the real direction;
- no hardcoded career value.

## G-009 — Unknown is unknown

Input:
- a field has never been answered.

Expected:
- no false zero/average/default evidence;
- question is asked only if needed.

## G-010 — Owner override

Input:
- app proposes direction/action A;
- owner replaces it with B.

Expected:
- future reasoning uses B;
- UI shows B;
- A is retained only as historical proposal.

## G-011 — Timezone/week boundary

Expected:
- local week/date semantics hold across multiple timezones and DST.

## G-012 — Malformed record

Expected:
- app remains usable;
- Data/restore remains reachable;
- error is visible;
- corrupt row does not create phantom actions.

## G-013 — Export handoff

Expected:
- selected sections are present;
- Private section can be included;
- handoff prompt is embedded;
- prompt says what to keep/change/remove/not change.

## G-014 — No-action is valid

Input:
- current state is stable and no move has positive net value.

Expected:
- the system can say nothing additional is needed.

---

# 33. Phone-first preview workflow

This is a **hard development requirement**, not final-release polish.

## Goal

The owner should be able to bookmark **one stable preview URL** on the phone and consistently see the newest verified development checkpoint without a local-network setup ritual.

The intended loop is:

> code change → verification/checkpoint → automatic preview deployment → refresh the same phone URL → newest verified build

## Required properties

- one stable preview URL that remains usable throughout the rebuild;
- automatic deployment from a dedicated preview branch/environment or equivalent workflow;
- every owner-visible checkpoint that changes behavior or design is pushed/deployed to Preview after its required tests pass;
- no phase may be called GREEN while Preview is behind that phase's verified checkpoint;
- every phase handoff reports both:
  - verified checkpoint SHA;
  - deployed Preview SHA;
- a mismatch between those SHAs must be explained and resolved before owner phone testing;
- commit SHA visible in a low-profile About/QA area;
- build timestamp visible;
- clear Preview label;
- synthetic data by default;
- no private owner data bundled into the deployed preview;
- easy refresh;
- preview must not remain stuck on an old service-worker build;
- preview URL should be simple enough to bookmark and reuse, not regenerated every phase;
- the developer must tell the owner when a new phone-testable checkpoint is available rather than making the owner guess.

## Checkpoint cadence

“Latest” means the latest **verified checkpoint**, not every unsaved keystroke.

During active implementation:

- make reasonably small checkpoint commits;
- when a checkpoint changes owner-visible behavior/design and its focused gate passes, update Preview;
- do not hold several major owner-visible changes locally until the end of a long phase if the owner could usefully test them earlier;
- full phase gates may still run later before the phase is declared GREEN.

This preserves frequent phone inspection without publishing broken work after every edit.

## Service-worker rule

For preview builds:

- disable the service worker, **or**
- use an update strategy that makes the latest build unambiguous.

The owner should never have to wonder whether the phone is showing stale code.

## Production separation

Preview and production must not overwrite each other accidentally.

- Preview uses a clearly separate deployment target/path/environment.
- Production is not updated merely because Preview changes.
- Promotion to production happens only through the release phase.

The exact GitHub Pages/environment mechanism is chosen in Phase 0 based on the simplest reliable implementation.

---

# 34. Repository structure principles

Do not over-design folders before code exists, but preserve clear boundaries.

Minimum conceptual modules:

- `domain/`
  - record meanings
  - entities
  - validation
  - time semantics

- `memory/`
  - canonical storage
  - projections
  - migrations

- `intelligence/`
  - context
  - coverage
  - candidate generation
  - evaluation
  - arbitration
  - learning
  - explanation

- `features/`
  - Now
  - Life
  - Timeline
  - Insights
  - Data/Exports
  - QA

- `platform/`
  - PWA
  - deployment
  - update handling

- `tests/`
  - unit
  - contract
  - browser
  - synthetic intelligence
  - mobile

- `docs/`
  - canonical plan
  - architecture decisions
  - phase handoffs
  - defect ledger
  - next prompt

Exact folder names can vary; ownership boundaries cannot.

---

# 35. Developer observability

The system must be explainable during QA.

For every recommendation, the QA inspector should be able to show:

- what facts were considered;
- which were explicit vs inferred;
- active context;
- current coverage;
- candidate list;
- filtered candidates and why;
- selected candidate;
- ranking dimensions;
- uncertainty;
- semantic subject/entity;
- expected check window;
- learning that influenced the decision.

This is developer/QA information, not normal daily copy.

---

# 36. Error handling

## Rules

- One unreadable record cannot blank the shell.
- Error boundaries must be placed where they protect real owner surfaces.
- A fallback must not look like a confident empty-state answer when data processing failed.
- Data/restore must remain reachable.
- Errors should be visible but concise.
- Detailed technical diagnostics belong behind inspection.

---

# 37. Mobile and accessibility

## Required

- practical touch targets;
- one-handed repeated flows;
- no accidental horizontal overflow;
- no sticky nav covering actions/fields;
- dialogs usable on common Android widths;
- text scaling/zoom supported;
- visible keyboard focus;
- reduced motion;
- screen-reader labels;
- no accessibility “fix” that disables zoom.

**Every owner-facing control carries an accessible name, and a placeholder is not one (D-176).** An `<input>`, `<textarea>` or `<select>` is named by `aria-label`, by `aria-labelledby`, by being wrapped in a `<label>`, or by an `id` a `htmlFor` points at. A placeholder is a hint, it disappears the moment there is anything in the field, and assistive technology is not required to read it. A free-text control also states, in view while the owner is typing, what the app will do with the answer — the owner-use review found the owner typing into a box with no way to tell whether the app understood the answer as a current fact, a standing constraint or an event.

## Test widths

Cover representative mobile widths and a desktop width.

Physical-phone validation remains mandatory for important flows.

---

# 38. PWA / offline

Offline resilience remains valuable but should not cap intelligence unnecessarily.

## Minimum offline behavior

At minimum, the owner should be able to:

- open the app shell;
- view locally stored state;
- make local entries;
- inspect history;
- use deterministic fallback intelligence when remote inference is unavailable, if remote inference is adopted.

## If remote model intelligence exists

Clearly distinguish:

- what works offline;
- what requires network;
- what data is sent;
- what remains local;
- how failure degrades.

Do not cache exported private JSON in the service worker.

---

# 39. Privacy model

## Owner data

- private owner data stays out of public repository history;
- synthetic fixtures only in repo;
- no emails, addresses, or unnecessary direct identifiers in fixtures/docs;
- real backups/exports are not committed.

## Data classes

At minimum support privacy metadata such as:

- normal;
- sensitive;
- private;
- child/family-sensitive.

Exact taxonomy can be refined.

## Private use

Privacy must protect the owner without making safe synthetic QA impossible.

---

# 40. Performance

Lifetime memory should not make routine interaction slow.

## Rules

- do not scan all raw history on every render;
- use derived indexes/projections;
- cache regenerable summaries;
- heavy analysis on demand;
- AI export built on demand;
- large restore shows progress;
- normal Now navigation feels immediate;
- normal Life navigation feels immediate;
- mobile export/restore must not freeze the browser.

Measure performance; do not guess.

---

# 41. Testing strategy

## Test layers

### Unit

- pure domain semantics;
- time logic;
- coverage;
- constraints;
- learning;
- ranking components.

### Contract

- record schemas;
- entity references;
- import/export;
- migration;
- privacy boundaries.

### Synthetic intelligence

- golden scenarios;
- counterexamples;
- life-season variations;
- long histories.

### Browser

- real owner flows;
- guides;
- recommendations;
- correction;
- export;
- restore;
- domain inspection;
- phone-sized layout.

### Adversarial

- malformed data;
- races;
- double taps;
- stale service worker;
- timezone;
- DST;
- long histories;
- interrupted flows;
- repeated reload.

### Physical phone

- preview update;
- Now;
- guide;
- Life;
- Timeline;
- Insights;
- private domain;
- AI export;
- backup/restore.

---

# 42. Regression discipline

For verified defects:

1. reproduce;
2. identify the whole defect class;
3. write a focused regression;
4. prove the regression fails when the defect is reintroduced;
5. fix the root cause;
6. rerun focused coverage;
7. rerun the full relevant gate.

Do not patch only the reported line when siblings share the same failure class.

---

# 43. Development workflow, Claude Code orchestration, and prompt economy

The workflow should not waste owner turns merely to obtain the next instruction.

The owner manually changes Claude Code's intelligence/effort level. The developer must therefore make the recommendation explicit at every boundary.

## Every phase/checkpoint handoff must produce

- checkpoint SHA;
- deployed Preview SHA when applicable;
- exact verification results;
- open issues;
- decision log;
- next phase/role;
- **recommended model for whoever runs the next step** — a Claude model where that is the builder, a **Codex model** where it is independent QA (D-090);
- **recommended intelligence level (Claude) or reasoning level (Codex)**;
- **conversation instruction: CURRENT, NEW or SAME**, and which system it addresses;
- one short reason for the model choice;
- one short reason for the level choice;
- one short reason for the conversation choice;
- **and the response ends with the model, the level, the conversation, and a short copyable launcher naming the exact MD file the next conversation must read and execute** (owner decision D-092). This holds for every handoff in both directions — builder to QA, QA to builder on PASS or FAIL, repair to retest, the GREEN closeout, and phase to phase. The complete prompt still goes into the MD file in full; the launcher points at it, so the owner never hunts through a report or copies a long prompt out of one. It adds no new file type.
- any files/docs that should be attached or referenced;
- **ready-to-paste next prompt immediately**.

## Intelligence-level recommendation

Recommend from the Claude Code levels actually available at that time.

Current expected labels include:

- Low
- Medium
- High
- Max
- Ultra Code

If Anthropic renames or changes the available levels, use the nearest current equivalent and say so.

Choose the level based on the job rather than cost alone.

General guidance:

- mechanical/local edits with narrow scope may use lower levels;
- architecture, integration judgment, model/intelligence design, ambiguous root-cause work, and adversarial analysis should use stronger levels;
- code-heavy Fixer work may favor Ultra Code when available;
- broad independent exploration/reasoning may favor Max or the strongest suitable reasoning mode;
- release mechanics may use a lower level only when no unresolved judgment-heavy work remains.

These are guidance, not hardcoded phase assignments. The developer must recommend the level that fits the actual next task.

## Conversation instruction

Every handoff must explicitly say one of:

- **CONTINUE IN CURRENT CONVERSATION**
- **START A NEW CONVERSATION**
- **NEW CONVERSATION REQUIRED FOR INDEPENDENCE**

Use a new conversation when:

- independent adversarial testing/retesting is part of the gate;
- an independent reviewer must not inherit the repair author's reasoning;
- context contamination would weaken the test;
- the current conversation has become so large/confused that a fresh context materially improves reliability.

Prefer the current conversation when:

- continuity of implementation/root-cause knowledge is valuable;
- the same Fixer/Integrator is continuing scoped work;
- independence is not part of the acceptance gate.

An independent Explorer/Retest role may not be cleared by the same reasoning context that authored the repairs it is certifying.

## Permanent per-phase independent QA protocol

Beginning with Phase 5, a builder conversation may not self-approve its own phase.

**Claude builds; Codex runs independent QA (owner decision D-090).** The rule was never "a different Claude conversation" — it was that the reviewer must not inherit the author's model of why the thing is correct, and two conversations of the same model reading the same documents reach the same reading of them. This does not overturn the independent-QA gate; it is how that gate is satisfied from here.

When the builder believes implementation is complete:

1. complete the normal automated/build/deploy gate;
2. confirm the deployed Preview SHA matches the checkpoint SHA;
3. run its own Android-style mobile gate where the phase has owner-visible behavior;
4. stop at **YELLOW — READY FOR INDEPENDENT QA**;
5. output the complete independent-QA handoff in the same response.

The builder's QA handoff must include:

- checkpoint SHA;
- deployed Preview SHA and match status;
- exact verification results;
- known open and deferred items;
- recommended **Codex model** for QA, and recommended **Codex reasoning level**, each with a one-sentence reason;
- **NEW CODEX CONVERSATION REQUIRED FOR INDEPENDENCE** — and a retest after a builder repair goes to the **SAME** Codex conversation;
- the exact report path `docs/qa/PHASE_XX_QA_HANDOFF.md`;
- a complete ready-to-paste QA prompt.

### Independent QA role

Independent QA always begins in a fresh **Codex** conversation, and works in this order (D-090):

1. **sealed cold owner-use** — open the deployed Preview at a normal Now and use it as the owner would, **before reading any repository document**, recording what it appears to claim;
2. **claim-to-evidence semantic audit** — for each claim on screen, establish what it actually rests on;
3. **semantic and product correctness** — does the app mean what it says, and is what it says worth saying;
4. **targeted phase acceptance**, now that the meaning is understood;
5. **targeted known-defect regression** for the surfaces this phase touched;
6. **architecture inspection where warranted**, when a defect suggests the boundary is wrong rather than the line;
7. **full-suite duplication only on a concrete trigger** — a builder claim that does not match observed behavior, a suspected false-green, or a change to the test harness itself.

Green builder tests are evidence. Re-running a suite the builder already ran green, to watch it go green again, buys nothing and costs the attention steps 1 and 2 need. This makes QA leaner, not weaker: three rounds of Phase 6 were lost to things no suite was asked and a person found by using the app.

It must:

- read the governing repository docs and the actual implementation fresh;
- test the deployed checkpoint, not merely local source;
- use an Android-style Playwright mobile context with touch, a mobile user agent, realistic device pixel ratio, scrolling, and mobile interaction behavior rather than only narrowing a desktop viewport;
- test semantic, behavioral, adversarial, state-transition, privacy, and owner-facing UI behavior relevant to the phase;
- read complete screens as an owner would, not only individual asserted strings;
- look for contradictions, stale scaffolding, subject/noun loss, questions the app already knows the answer to, claims made from ignorance, false precision, questionnaire/nag behavior, overflow, safe-area problems, target-size problems, control movement, and double-tap hazards;
- identify where existing automated tests gave false confidence;
- actively try to disprove that the phase is correct.

Independent QA does **not** repair application/product code during discovery or retest.

It may create or update only its QA handoff report and narrowly scoped QA evidence artifacts needed by the protocol.

### QA report contract

Use:

`docs/qa/PHASE_XX_QA_HANDOFF.md`

For each report, include at minimum:

- phase;
- checkpoint SHA tested;
- deployed SHA tested;
- Android/mobile configuration;
- governing acceptance criteria;
- scenarios/flows tested;
- PASS/FAIL per flow;
- exact reproductions for defects;
- semantic, behavioral, privacy, and mobile/UI findings as applicable;
- blocking vs non-blocking classification;
- evidence/screenshot references where useful;
- automated tests that gave false confidence;
- explicit deferred items confirmed unchanged;
- overall recommendation: PASS or FAIL;
- recommended next action, including the recommended Claude model, intelligence level, and CURRENT/NEW/SAME conversation instruction for that action, each with a one-sentence reason;
- the complete ready-to-paste next prompt.

The QA prompt should provide requirements, acceptance criteria, checkpoint, explicit deferrals, and repository paths, but should not be contaminated with the builder's conclusion that particular behavior is correct.

**Every independent QA handoff — PASS or FAIL, first run or retest — outputs the complete ready-to-paste next prompt automatically, in the same response, without waiting for another owner turn.** On FAIL the prompt goes to the original builder conversation for repair under section 42; on PASS it goes to the original builder conversation for the formal GREEN closeout. QA does not wait to be asked for it (D-082).

### Defect loop

If independent QA fails:

1. return to the **original builder conversation**;
2. the builder reads the exact QA handoff report;
3. repair each blocking defect under section 42;
4. deploy a new checkpoint;
5. remain YELLOW;
6. output the repaired SHA and a retest prompt;
7. return to the **same independent QA conversation**;
8. QA retests the repaired checkpoint and updates the same report.

Repeat until independent QA passes.

The builder remains the fixer. The QA conversation remains the tester.

Owner screenshot/interface review may add additional phase-gate feedback after the QA run. Material findings return through the same builder → QA retest loop.

After independent QA passes, return to the original builder conversation for the formal GREEN closeout. Independent QA does not replace owner physical-phone approval where this plan separately requires it.

### Default conversation routing

- same unresolved phase implementation/repair → **CURRENT builder conversation**;
- independent QA → **NEW QA conversation**;
- QA retest after repair → **SAME QA conversation**;
- genuinely new phase after GREEN → normally **NEW builder conversation**, while still requiring an explicit recommendation at the handoff.

### Intelligence-level default

Do not default every task to Max.

Use the lowest level appropriate to the work:

- ordinary implementation, UI work, straightforward domain wiring, documentation, normal repairs, and normal independent QA → usually **High**;
- difficult cross-system semantics, learning/inference design, privacy architecture, migration architecture, ambiguous root-cause work, or especially demanding adversarial reasoning → **Max** or the strongest appropriate reasoning mode;
- lower levels remain valid for truly mechanical/local work.

This guidance does not override the requirement to recommend the level based on the actual next task.

### Relationship to Phase 11

Per-phase independent QA does not replace Phase 11.

Per-phase QA asks:

> **Did this phase actually work?**

Phase 11 asks:

> **Can the completed system be broken across phase boundaries?**

Both remain required.

## Prompt presentation format

At every boundary, print the next action in this exact human-facing structure:

**NEXT CLAUDE ACTION**

- **Intelligence level:** `<recommended level>`
- **Conversation:** `CURRENT` or `NEW`
- **Why this level:** `<one short sentence>`
- **Why this conversation:** `<one short sentence>`
- **Attach/reference:** `<only what is actually needed>`

**COPY/PASTE PROMPT**

```text
<complete next prompt>
```

The intelligence-level instruction should be shown **outside** the copy/paste prompt so the owner can manually switch Claude Code first.

Do not bury the level inside the prompt.

## Launcher requirement when a handoff MD is written or updated (owner decision D-083)

`docs/NEXT_PROMPT.md` and `docs/qa/PHASE_XX_QA_HANDOFF.md` are the only two handoff MD types this repository uses (the rolling next-action handoff, and that phase's QA report). No other handoff file type may be introduced to satisfy this rule or any other.

Whenever a builder or QA response writes or updates one of those two files — a builder's YELLOW handoff, an independent QA run or retest on either PASS or FAIL, a repair handoff, or a formal GREEN closeout — the response still writes the complete next prompt into that file in full, exactly as the prompt presentation format above and, for QA, `qa/README.md` section 3a already require.

The response must then **also** end with a second, short, standalone block — in addition to, not instead of, the full prompt already written to the file:

- the recommended Claude **model**;
- the recommended **intelligence level**;
- the **conversation** instruction — **NEW**, **CURRENT**, or **SAME**;
- a short ready-to-copy **launcher prompt** that:
  - names the repository path;
  - names the exact MD file the next conversation must read (`docs/NEXT_PROMPT.md`, or the specific `docs/qa/PHASE_XX_QA_HANDOFF.md`);
  - states which handoff it is executing — builder, QA, repair, retest, closeout, or next-phase;
  - instructs the next conversation to read that file **in full** and execute it **exactly as written**;
  - instructs the next conversation **not** to ask the owner to paste the file's contents.

Do not duplicate the entire MD prompt inside the response merely to satisfy this rule — the launcher exists precisely so that duplication is not necessary. Only repeat the full prompt inline when there is a specific reason to (for example, the owner asks to see it, or nothing has yet been written to any file).

**Why:** the owner should not have to open GitHub and manually hunt for the next prompt, and should also not have to read the same long prompt twice in one response merely because it was written once to satisfy the file requirement and once again to satisfy the "print it in the response" requirement. See decision D-083.

Example launcher shape:

```text
Continue the Life Command OS rebuild.

Repository:
<repository path>

Read <exact MD path> in full and execute the current <builder / QA / repair /
retest / closeout / next-phase> handoff exactly as written.

Do not ask me to paste the file contents.
```

## Prompt timing

- Provide the next prompt **in the same response that closes the current phase/checkpoint**.
- Do not say “say go and I’ll give you the prompt.”
- Do not require an extra owner message merely to unlock the next prompt.
- If the next role requires a level change or new conversation, STOP after providing the handoff and prompt; do not begin that next role automatically.
- A plain acknowledgement from the owner should not be treated as permission to skip a required conversation/mode boundary.

## Required repo docs

Maintain:

- `docs/CANONICAL_REBUILD_PLAN.md`
- `docs/DECISION_LOG.md`
- `docs/DEFECT_LEDGER.md`
- `docs/PHASE_STATUS.md`
- `docs/NEXT_PROMPT.md`

`docs/NEXT_PROMPT.md` must contain:

- recommended intelligence level;
- CURRENT/NEW conversation instruction;
- reason;
- required references/attachments;
- complete next copy/paste prompt.

---

# 43A. Phase names and orchestrator routing integers (D-159, D-212)

**A canonical phase name and its routing integer are different things, and this section is the only place they are reconciled.**

The external orchestrator parses the `**Phase:**` field of a handoff as a **bare integer**, and `handoff_source.build_candidates()` keeps only `max(qa_phase(r) for r in reports)`, discarding every lower phase as history. With phases 5, 6, 7, 8, 81 and 82 on disk, the surviving maximum is **82**.

So `**Phase:** 9`, `09`, `8.3` and `9.1` all parse to something at or below 82 and **never route**. The QA report is discarded, the builder → QA → repair → retest lifecycle never starts, and nothing warns anyone.

**The constraint is wider than Phase 9.** Canonical Phases **10, 11 and 12 are equally unroutable** — 10, 11 and 12 are all ≤ 82. Fixing only Phase 9 would move the silent failure three phases downstream.

## The map

Approved by the owner on 2026-08-31 (**D-212**), after the second product adjudication (`docs/PRODUCT_ADJUDICATION_2.md`).

| Product / canonical name                                 | Routing integer | Handoff file                 |
| -------------------------------------------------------- | --------------- | ---------------------------- |
| The instrument, and the things that are untrue           | **83**          | `qa/PHASE_83_QA_HANDOFF.md`  |
| What the owner is trying to become                       | **84**          | `qa/PHASE_84_QA_HANDOFF.md`  |
| **Canonical Phase 9** — visual coherence, motion, mobile  | **90**          | `qa/PHASE_90_QA_HANDOFF.md`  |
| Semantic capture and clarification                       | **91**          | `qa/PHASE_91_QA_HANDOFF.md`  |
| Reach — what the brain can see                           | **92**          | `qa/PHASE_92_QA_HANDOFF.md`  |
| Validity — what it concludes from what it sees           | **93**          | `qa/PHASE_93_QA_HANDOFF.md`  |
| **State — the readings, the score and what they are for** | **94**          | `qa/PHASE_94_QA_HANDOFF.md`  |
| Domains and progression                                  | **95**          | `qa/PHASE_95_QA_HANDOFF.md`  |
| **The move catalogue and measured effect**                | **96**          | `qa/PHASE_96_QA_HANDOFF.md`  |
| Expectation and reconciliation — **re-derive as the forecast** | **97**    | `qa/PHASE_97_QA_HANDOFF.md`  |
| Longitudinal inference — D-172's mechanism               | **98**          | `qa/PHASE_98_QA_HANDOFF.md`  |
| Advancement and revision                                 | **99**          | `qa/PHASE_99_QA_HANDOFF.md`  |
| _(100 reserved headroom)_                                | —               | —                            |
| **Canonical Phase 10** — performance, PWA, reliability    | **101**         | `qa/PHASE_101_QA_HANDOFF.md` |
| **Canonical Phase 11** — adversarial hardening            | **102**         | `qa/PHASE_102_QA_HANDOFF.md` |
| **Canonical Phase 12** — release                          | **103**         | `qa/PHASE_103_QA_HANDOFF.md` |

> **The map shifted by one on 2026-09-04 — D-292.** Routing 94 is now the **state
> engine's first slice**: the check-in, the readings stored, and the score.
> Everything from _domains and progression_ down moved one integer up, into the
> headroom this section reserved. **D-172's hold retargets 97 → 98** in
> `CAMPAIGN_HOLDS.md` and follows the work it governs.
>
> **97 and 98 may not be dispatched against their current §6.x contracts.**
> "Expectation and reconciliation" is D-288's forecast and "longitudinal inference"
> is D-290's causal-chain bar — the same work under older names — and both are
> re-derived once routing 94 has produced data to design against.
>
> Read [`STATE_ENGINE_OWNER_DECISION.md`](STATE_ENGINE_OWNER_DECISION.md) and
> D-285 … D-294 before planning any phase from 94 on.

**Eleven routed phases remain.** 83, 84 and 90 are GREEN; 98–100 carry no work.

## Rules

- Every phase created from here to release carries a routing integer **strictly greater than 82**.
- **Routing integers increase monotonically in execution order** (D-212). `handoff_source.routing_ceiling()` keeps only the **maximum** phase with a QA report, so an integer below the current ceiling never routes — silently, with nothing warning anyone. This is why 85–89 are unusable: they sit below routing 90, which runs first. **Stating only the "greater than 82" half of this rule is what made 85–89 look available.**
- **Canonical phases are not renumbered.** Section 54 is still Phase 9, section 55 is still Phase 10. Only the routing label differs, and giving canonical Phase 10 the integer **101** does **not** re-scope it — D-109 stands, exactly as it stood when the same phase was labelled 92.
- **98–100 are deliberate headroom.** The campaign has inserted phases into this map twice, and every insert renumbers everything downstream. The reserve has already earned itself once: splitting routing 95 in two pushed longitudinal inference from 96 to 97 without renumbering anything below it.
- **A QA round does not get a new routing integer.** Builder, QA, repair and retest rounds all stay under the same number, as they did through Phase 82's twelve rounds and Phase 84's nineteen.
- A document filename may follow either convention, but the `**Phase:**` field carries the **routing integer**, and a QA handoff filename follows the routing integer so the orchestrator and a human reader agree.

## Routing 94 runs as three internal cycles (D-213)

Routing 94 covers nine remaining domains **and** nine Fatherhood-specific deliverables added by the owner-decision sequence. It executes as three cycles **under the single integer 94**:

- **94.1 — Fatherhood alone.** Its destination, plus the `development-skill` authoring route, the `about-person` relationship repair, the near-duplicate guard, scaffolding guidance, the help-ladder reader, the two-class growth-opportunity cap and its trace integrity, Adaya's birthdate, and the normative suppression filter.
- **94.2 — Sleep, Social, Home, Romantic.**
- **94.3 — Emotional, Faith, Private, Long-Range Direction.**

**94.1 has its own explicit acceptance list and gate, and it closes before 94.2 begins.**

**No new routing integer is created for a cycle.** The monotonic rule leaves no integers between 94 and 95, and a cycle is not a phase. The four-domains-per-cycle slice rule counts *domains* and cannot see that nine deliverables landed on one of them; **the concentration is accepted knowingly rather than hidden by that arithmetic**, and gating 94.1 separately is what keeps its failure localisable.

## Deferral order under scope pressure (D-214)

**Routing 95 is preserved before routing 96.** If scope pressure forces a deferral, **96 is deferred before 95** — the advancement and revision work survives, and the expectation machinery built on top of it goes first.

**This is the ordinary cut order.** The minimum-release path named in the second adjudication — 90 → 91 → 92 → 93 → 101 → 102 → 103 — drops 94, 95, 96 and 97 together and is a last resort. **It is not the routine deferral sequence, and reaching for it is an owner decision rather than a consequence of a phase running long.**

## Campaign holds

`docs/CAMPAIGN_HOLDS.md` is the machine-readable declaration of owner decisions that gate a phase. **D-172 gates routing 97** (D-215); routings 90 through 96 are not gated by it. A hold is released by editing its `status`, never by deleting the line — a missing declaration makes the orchestrator refuse the phase.

---

# 44. Phase gates

Do not run the whole rebuild as one enormous coding session.

Each phase has a narrow purpose and a stop gate.

---

# 45. Phase 0 — New repo foundation + phone preview

## Goal

Create the clean rebuild foundation without importing legacy architecture.

## Repository identity and safety gate

The new repository is:

- **GitHub:** `Bill6006/life-command-os-rebuild`
- **default branch:** `main`

The existing repository:

- `Bill6006/life-command-os`

is **legacy/reference only**.

Before creating or changing anything, the developer must:

1. print the current working directory;
2. run/inspect `git status` and `git remote -v` if inside a Git repository;
3. verify it is **not** the existing `Bill6006/life-command-os` working tree;
4. verify whether `Bill6006/life-command-os-rebuild` already exists remotely;
5. verify the intended new local directory is new/empty and is not nested inside an existing Life Command OS repository.

### Stop conditions

STOP and ask the owner before proceeding if:

- `Bill6006/life-command-os-rebuild` already exists;
- the target local directory is non-empty;
- the current directory belongs to `Bill6006/life-command-os`;
- the remote destination is ambiguous;
- any command would overwrite, repoint, force-push, reinitialize, or delete an existing repository.

Do **not** silently invent another repository name if the intended name is unavailable.

Do **not** change remotes in the old repository to “turn it into” the rebuild.

## Build

- create the brand-new `Bill6006/life-command-os-rebuild` repository only after the safety gate passes;
- create a new clean local working directory;
- Vite/TypeScript/React or equivalent modern static frontend;
- CI;
- lint/format/typecheck;
- unit/browser skeleton;
- stable phone preview deployment;
- dedicated Preview/Production separation;
- automatic Preview deployment for verified owner-visible checkpoints;
- visible preview SHA/build time;
- synthetic-only preview data;
- initial design tokens based on the visual principles;
- canonical plan copied into repo as `docs/CANONICAL_REBUILD_PLAN.md`;
- decision log;
- phase status;
- defect ledger;
- next-prompt file.

## Do not build yet

- full domain UI;
- legacy importer;
- giant recommendation library;
- life score;
- complete backup complexity;
- old tabs.

## Gate

- new repository identity is verified as `Bill6006/life-command-os-rebuild`;
- existing `Bill6006/life-command-os` is unchanged;
- owner opens the stable Preview URL on phone;
- latest verified checkpoint SHA is obvious;
- deployed Preview SHA matches the verified checkpoint SHA;
- refresh reliably shows the current Preview build;
- Preview URL is bookmarkable/reusable;
- no submarine/cave visual direction;
- CI green;
- no private owner data in repo;
- `docs/NEXT_PROMPT.md` already contains the recommended next intelligence level, CURRENT/NEW conversation instruction, and Phase 1 copy/paste prompt.

**STOP and obtain owner visual/workflow approval before Phase 1.**

---

# 46. Phase 1 — Canonical records + semantic model + QA lab

## Goal

Build the meaning layer before the product shell expands.

## Build

- versioned canonical record schemas;
- entity model;
- explicit/inferred/unknown distinction;
- corrections/supersession;
- owner-local time semantics;
- privacy metadata;
- IndexedDB/equivalent storage;
- derived projection mechanism;
- synthetic JSON loader/editor;
- time travel;
- QA inspector;
- initial golden scenarios.

## Special acceptance

The semantic model must be able to retain:

- exact learning topic;
- exact goal;
- exact person/relationship;
- exact recommendation subject.

## Gate

- G-001, G-002, G-009, G-011 pass;
- malformed synthetic inputs are inspectable;
- canonical data can round-trip;
- no full UI dependency;
- preview deploys automatically.

---

# 47. Phase 2 — Intelligence tournament + first real Now

## Goal

Prove the brain can produce an excellent recommendation before building the full app.

## Build

- fact resolver;
- context assembler;
- candidate generation;
- constraints;
- arbitration;
- explanation;
- decision trace;
- deterministic baseline;
- at least one model-assisted/hybrid candidate architecture if feasible;
- simple Now surface;
- one adaptive guide flow.

## Intelligence test

Compare candidate approaches on golden synthetic profiles.

Do not select an architecture because it sounds more advanced.

## Gate

The owner must test the slice on the phone.

The phase fails if the owner reasonably says:

- generic;
- dumb;
- vague;
- too many questions;
- doesn't understand what it is talking about;
- looks lifeless;
- recommendation is technically valid but not useful.

**Do not expand to the rest of the app until this gate is passed.**

---

# 48. Phase 3 — Recommendation lifecycle + outcome learning

## Goal

Complete the loop.

## Build

- start;
- complete;
- decline;
- can't now;
- try another;
- pause/continue if needed;
- outcome windows;
- outcome capture;
- context-specific learning;
- recomputation;
- duplicate protection;
- owner correction.

## Gate

- completed action changes later reasoning;
- decline is not mislabeled ineffective;
- can't-now changes context appropriately;
- one event does not become proof;
- semantic subject remains intact through follow-up;
- G-004 and G-014 pass;
- phone flow feels fast.

---

# 49. Phase 4 — Coverage Engine + adaptive guides

## Goal

Make the system trustworthy without manual tab maintenance.

## Build

- domain/sub-area coverage model;
- concept-specific freshness;
- stale belief detection;
- natural refresh opportunities;
- adaptive question selection;
- guide resume;
- stop asking when enough is known;
- coverage status for Life overview.

## Gate

- G-003 and G-007 pass;
- owner can ignore Life pages for a realistic synthetic period without the system silently freezing;
- stale important areas eventually surface naturally;
- no fixed “ask every domain” questionnaire.

---

# 50. Phase 5 — Life domain experience

## Goal

Give the owner optional deep inspection without fragmenting the brain.

## Build

- Life overview;
- domain pages;
- correction flows;
- goals;
- current understanding;
- coverage;
- recent changes;
- optional manual updates.

## Include baseline pages

The intelligence model contains eleven core areas, but Phase 5 intentionally presents ten baseline Life pages. **Health & Physical Capacity** and **Sleep & Recovery** remain separate modeled areas and share one **Health & Recovery** inspection page. Do not merge their underlying semantics, duplicate them into extra pages, or treat one as missing.

- Health & Recovery
- Fatherhood / Adaya
- Career & Learning
- Money
- Social & Relationships
- Emotional Health
- Faith & Meaning
- Home & Environment
- Private / Sexual Health
- Long-Range Direction

## Private domain

Implement manual-entry-first behavior and discreet normal-surface behavior.

## Gate

The owner can navigate each page on phone and understand:

- what the app believes;
- why;
- what changed;
- whether information is fresh;
- how to correct it.

No domain page should look like a static questionnaire dump.

---

# 51. Phase 6 — Timeline + Insights

## Goal

Make memory and learning visible without turning the normal experience into a statistics dashboard.

The system, not the owner, is responsible for discovering useful patterns from recorded history, context, outcomes, counterexamples, and change over time. The owner may inspect or correct what the system concludes, but is not required to diagnose his own patterns before the system can learn.

## Build

- chronological Timeline;
- filters if needed;
- human-readable insight cards;
- trajectories;
- pattern confidence;
- context-specific learning;
- coverage insights;
- explanation drill-down;
- progressively disclosed evidence/analytics for learned patterns;
- progressively disclosed evidence for the current Now recommendation.

## Evidence / analytics detail

The first view stays human-readable and concise.

A learned Insight can open a deeper **Pattern Detail / Evidence** surface. The exact mobile interaction may be a dedicated detail view, bottom sheet, or another owner-tested pattern; do not force a permanently expanded analytics block into the primary view.

The deeper view can expose, when relevant and supported:

- comparable-situation count;
- sample size and time window;
- helpful, neutral, adverse, partial, or unachieved evidence as appropriate to the learned aspect;
- counterexamples;
- context similarity;
- contexts where the pattern appears stronger or weaker;
- trend/change over time;
- confidence/evidence strength;
- included/excluded evidence where useful;
- reason trace;
- a rate or estimated likelihood when mathematically and semantically justified.

Any percentage must identify the quantity it measures. Do not merge direct result, downstream effect, comfort/friction, or follow-through into one generic success statistic.

When enough comparable historical evidence exists, the deeper view should show a meaningful rate or estimated likelihood where that quantity is well-defined. This may eventually include a **peak-state likelihood** or a recommendation-specific likelihood. These are predictions, not guarantees.

When the evidence is too sparse, too heterogeneous, or not sufficiently calibrated, withhold the percentage and say that there is not enough evidence yet.

## Current recommendation evidence

Now remains action-first and uncluttered.

Provide a compact secondary entry point such as **See evidence** for the current recommendation. Opening it should expose an owner-readable subset of the same evidence and reasoning already used by the decision/learning system, such as:

- the current conditions that materially influenced the choice;
- relevant comparable situations;
- prior outcomes for the move or learned family when applicable;
- sample size and counterexamples;
- confidence/evidence strength;
- why the chosen move beat the strongest credible alternative.

Do not create a second analytics engine, a second recommendation brain, or a parallel explanation truth.

## Pattern quality rules

Insights must not degrade into one-variable folklore.

- **A figure must say who inferred it, not only what it measures** (D-089). A
  tally of the owner’s own judgments about an action may not be worded as an
  observed fact about the world. This sits beneath the percentage rule above
  rather than replacing it: naming the quantity is necessary and is not
  sufficient.
- **A stated relationship requires a comparison group**, and reads as
  association rather than as cause.
- **A learned claim is scoped to the evidence under it** (D-091). Seven
  invariants, and each was a defect an independent cold-use audit reproduced on
  the deployed build:
  - **action identity** — a relationship is scoped to the semantic action, verb
    _and_ object, never the verb alone; two objects are pooled only through an
    explicit, named, reasoned registry entry; and a finding the app cannot name
    is a finding it may not state;
  - **negative exposure** — present, absent and unknown are three states, not
    two; absence must be positively recorded; silence belongs to no comparison
    group, is counted, and is reported; where no legitimate comparison group
    exists the app abstains and says why;
  - **context** — context must be able to change a learned relationship, and
    where two supported contexts materially disagree the whole-record figure is
    not printed at all and may not drive a contextual recommendation;
  - **confounding** — the recorded classes that invalidate a before-and-after
    are named, checked, and stated, and the app claims only the check it ran;
  - **correctability** — every conclusion the app reaches on its own carries a
    correction identity scoped as the conclusion is scoped, so the owner can
    reject the interpretation without rewriting the history under it; a
    rejection is a watershed, not a silence;
  - **tracked state meaning** — a tracked dimension has a stable construct,
    scale and direction, and separate dimensions are not collapsed into one
    generic emotional quantity;
  - **historical order** — anything presenting history as a sequence orders it
    canonically, `occurredAt` then `recordedAt` then id, because a correction is
    always about the same moment as the thing it corrects.
- **Freshness language says which question it answers** (D-091). _How recently
  has anything come in about this_ and _is what the app believes about this
  still good_ are two questions about two different things; no surface answers
  the second with the first, and neither concept absorbs the other.
- One success is not proof.
- Context similarity matters.
- Counterexamples matter.
- Learned effects remain reversible when later evidence contradicts them.
- Association must not be written as causal certainty.
- Combinations and interactions may be more informative than isolated variables.
- A discovered pattern should remain scoped to the contexts the evidence actually supports.
- The absence of enough evidence is a valid result.

## Gate

- useful insights are understandable without research language;
- the owner can open a deeper evidence view without that machinery being forced into the first view;
- a current recommendation can expose the meaningful evidence behind its choice without cluttering Now;
- percentages/rates appear only when the underlying quantity, denominator, context, and evidence are defensible;
- any displayed rate names the aspect it measures and does not collapse result/effect/comfort/follow-through;
- any displayed figure makes clear **whether it is the system’s finding or the owner’s own judgment**, and a relationship is stated only against a comparison group and only as association (D-089);
- a learned relationship is **scoped to the action, exposure, context and confounders its evidence actually covers**, is **correctable by the owner without deleting the history under it**, and is never printed under a name that would fit a different action (D-091);
- no surface answers *is what the app believes still current* with *something came in recently* (D-091);
- weak evidence produces an honest “not enough evidence yet” state rather than invented precision;
- synthetic long histories prove that context and combinations can change a pattern's interpretation;
- counterexamples and later contradictory evidence can weaken or reverse an earlier learned pattern;
- malformed records do not break surfaces;
- private data obeys display policy.

---

# 52. Phase 7 — AI exports + backup/restore

## Goal

Build the workflows that repeatedly mattered across prior versions.

## Build

### AI export composer

- section selection;
- select all;
- clear;
- remembered last selection if useful;
- Private / Sexual Health available;
- embedded handoff prompt;
- Copy Prompt;
- current app/engine version;
- current data range;
- current selected domains.

### AI handoff prompt

Must contain:

- source-of-truth instruction;
- current-state review;
- main limiter;
- app-tuning review when diagnostics included;
- what is working;
- what is drifting;
- what to change;
- what to remove/simplify;
- **what not to change**;
- next practical actions;
- uncertainty rule;
- ask only necessary questions.

### Full backup/restore

- complete;
- transactional;
- verified;
- rollback;
- mobile tested.

## Gate

- G-013 passes;
- private section can be intentionally included;
- export remains reliable on phone;
- restore exactness proven;
- Data/restore accessible during degraded-state tests.

---

# 53. Phase 8 — Legacy migration

## Goal

Bring forward useful history without importing the old architecture.

## Build

- legacy detector;
- quarantined parser;
- mapping inventory;
- explicit semantic mappings;
- raw preservation for uncertain fields;
- preview/dry run;
- snapshot;
- atomic apply;
- verify;
- rollback;
- idempotency;
- duplicate detection;
- provenance.

## Gate

- legacy import does not change the recommendation engine architecture;
- ambiguous mappings remain explicit;
- imported raw legacy records cannot silently drive decisions;
- current app behavior remains correct with no legacy data present.

---

# 54. Phase 9 — Visual coherence + motion + mobile refinement

**Routes as phase 90** — see section 43A. Preceded by routing 83 and routing 84 (D-158).

Visual design begins earlier, but this phase performs whole-product coherence.

## Review

- hierarchy;
- spacing;
- typography;
- surface depth;
- contrast;
- motion;
- mood;
- copy;
- repeated components;
- phone density;
- navigation;
- private-domain discretion;
- empty states;
- error states.

## Explicit anti-pattern review

Reject:

- submarine panel;
- cave;
- gamer UI;
- developer dashboard;
- card soup;
- massive empty dark spaces;
- endless tiny metrics;
- pastel wellness.

## Structural accommodation (D-158)

The owner-use review identified relationships the visual design must **leave room for** without building. Passing the phone gate on a design that forecloses one of these re-opens a passed gate later.

- A course of action carrying a **review status and a verdict sentence** — one more status on an object this phase already designs.
- A tradeoff clause naming a **longer horizon**, inside Q9's one-additional-clause budget. Not a second card.
- A **recurring constraint** the owner can see and dismiss, on the domain page rather than a new screen.
- A held intention resolving to **fulfilled, missed or expired** — three outcomes for a state this phase already designs.
- A **maintenance-versus-advancement distinction in the reason line**, not a chart.
- An evidence card able to carry a **competing explanation and an open question**, and a visible link from a pattern to a changed approach.
- Domain pages composing a **destination section with an existing progression object** — Adaya's growth stage is the test case.
- A compact **reentry state** after a long absence: one screen, not a wall of stale cards.
- A restrained **"why am I being asked this?"** affordance. No dashboard, no score.

## What routing 84 shipped, and this phase now typesets

Routing 84 built the product contract this phase designs against, and the
distinction matters to what its gate is: these objects exist, they are reachable
from a near-empty store, and **none of them has a visual language yet**. That
was deliberate — routing 84 must not spend Phase 9's budget — so what is on
screen today is honest and plain, and re-typesetting it is this phase's work.

- **A destination**, per life area, with four parts: what he is aiming at, where
  he is now, what would count as getting somewhere, and what he is unsure about.
  Any part may be absent and an absent one reads as unstated (G-009).
- **A milestone**, which is a goal that names its destination (D-181). It reads
  as a different thing from a goal and from a completed session, and it is
  reached only when the owner says so.
- **Seven rungs of progress evidence** — attempt, part-done, completion, quality, retained
  capability, transfer, milestone — each with its own sentence and its own
  statement of what it is *not* evidence of. A completed session, a completed
  course and a milestone are three different things on the page.
- **One create-and-confirm control** for a goal, a routine, a person, a place, a
  skill and an obligation, including the interpretation the owner agrees to and
  the list of what the app will not assume.
- **A second questioning surface** on Insights, with its own weekly budget, always
  skippable, and able to show what an answer changed.
- **One optional question after "Can't right now"**, and a way back to a move
  that was interrupted or half-finished.
- **Two correction gestures on a recorded event** — withdraw and re-date — each
  stating its consequence and what it preserves before it acts.
- **One owner permission**, on the Private page, off by default.

**The no-score rule binds every one of them** (D-162, section 22). No
percentage, share, bar, rank, grade or readiness figure about the owner or about
Adaya, and a "destination" must not become a score through the back door. A
phase whose subject is *visual* coherence is the second place where one arrives
looking reasonable — the first was the phase that built the objects.

## Gate

Owner physical-phone approval required.

Plus the structural accommodation list above, and the owner-use review's own acceptance questions (its section 11.8) run for the first time.

## What routing 90 built against this section (D-230 to D-237)

The design decisions, and the reasoning for each, are recorded once in
`docs/VISUAL_DESIGN_RECORD.md`. The four that constrain every later phase:

- **Surface weight is one axis with three values** (D-230) — and it says how
  settled the *app* is, never how the owner is doing.
- **Object kinds are typographic, uncoloured, unordered and one size** (D-231).
  A coloured marker per kind reads as a ranking of the kinds, which is a score
  in costume.
- **The progress ladder is ordinal in the code and may never be drawn as one**
  (D-233), and a destination's four parts are four booleans no surface can add
  up (D-232).
- **Motion is attached to a change or it is not there** (D-237). Nothing in this
  product animates on its own.

**The accommodation list above is now a machine-checked table** (D-235),
`tests/synthetic/accommodation.ts`, holding two falsifiable claims per row: the
composition that would carry it takes a variable number of things, and named
tokens that must be absent from `src/`. The nine rows above are its **A** series;
the second adjudication's six and the D-222 provenance refinement are its **B**
series.

---

# 55. Phase 10 — Performance, PWA, reliability

**Routes as phase 101** — see section 43A. **Its scope is unchanged** by that label (D-109, D-159, D-212).

## Build/harden

- startup;
- caching;
- service-worker update behavior;
- offline shell;
- lifetime-history performance;
- restore/export progress;
- malformed-record handling;
- browser lifecycle;
- long-history synthetic load;
- interruption/reload resilience.

## Gate

- preview never ambiguously serves stale build;
- production update behavior understandable;
- long-history interaction remains responsive;
- no critical data or restore failure;
- physical phone passes.

---

# 56. Phase 11 — Independent adversarial hardening

**Routes as phase 102** — see section 43A. Scope unchanged (D-212). It additionally carries the nineteen deferred instrument findings in `qa/INSTRUMENT_HARDENING_BACKLOG.md` as a standing input (D-210).

Use a fresh independent context/agent that did not author the latest repairs.

## Attack

- semantic failures;
- stale coverage;
- owner overrides;
- non-career directions;
- private-domain boundaries;
- long histories;
- malformed data;
- double taps;
- cross-tab races where relevant;
- timezones;
- DST;
- interrupted guides;
- stale service worker;
- AI export completeness;
- backup/restore;
- phone behavior;
- accessibility;
- design regressions.

## Rule

Explorer does not repair during the independent discovery pass.

Verified blockers return to a separate Fixer pass.

Then rerun integration and a fresh independent retest.

---

# 57. Phase 12 — Release

**Routes as phase 103** — see section 43A. Scope unchanged (D-212).

## Release only when

- canonical tests green;
- synthetic intelligence gate green;
- no open release-blocking semantic defects;
- independent retest green;
- clean checkout green;
- CI green;
- exact release SHA deployed;
- deployed bundle verified;
- phone smoke green;
- backup/restore green;
- AI export green;
- privacy scan green;
- accessibility/mobile green;
- owner says the current experience is good enough to become the evolving production base.

---

# 58. Phase acceptance report format

Every phase ends with:

- phase status: GREEN / YELLOW / RED;
- checkpoint SHA;
- deployed Preview SHA;
- whether Preview SHA exactly matches the checkpoint;
- stable Preview URL/state;
- files changed;
- exact test counts;
- independent QA required? yes/no;
- independent QA report path when required;
- QA-tested SHA and PASS/FAIL when available;
- owner-phone test required? yes/no;
- product behavior changed;
- semantic behavior changed;
- open defects;
- deferred items;
- decisions made;
- next phase/role;
- recommended Claude Code intelligence level;
- CURRENT/NEW conversation instruction;
- reason for the level;
- reason for the conversation choice;
- required references/attachments;
- complete next copy/paste prompt.

Beginning with Phase 5, implementation completion is **YELLOW — READY FOR INDEPENDENT QA**, not GREEN. GREEN requires the independent QA loop in section 43 to pass, plus any separately required owner phone approval.

If owner-visible behavior changed, the phase cannot be GREEN until the Preview deployment is current enough for the required owner phone check.

---

# 59. Explicit legacy exclusions

The following do **not** return automatically:

- single HTML architecture;
- old tab list;
- old card layout;
- old category switches;
- fixed guide questionnaires;
- old 0/1/2 life score;
- giant Forecast 100 as the center of the product;
- old move catalogue as product truth;
- old exact bottleneck taxonomy;
- old exact workout programming;
- old equipment inventory;
- old fixed weekly anchors;
- old 4 AM rollover;
- old streak system;
- old export ranges;
- old privacy toggle design;
- old domain maturity UI;
- old developer-facing language on owner surfaces;
- legacy parity as an acceptance gate.

Any one of these may only return through an explicit new decision with a current reason.

---

# 60. Explicit failure lessons from the current GitHub generation

Carry these forward as tests and architecture lessons:

- Weekly-direction controls must have visible persisted behavior.
- Custom direction must remain the owner's actual direction.
- Non-career direction must not be mislabeled career.
- Guide answers must land in the state the decision engine reads.
- Guide completion must not loop back to the same unresolved question.
- Double taps must not create duplicate episodes/actions.
- Owner-local week logic must not use UTC identifiers as instants.
- A custom/adjusted direction must not be read as agreement with the original proposal.
- Written data must have a read path.
- Malformed records must not blank every surface.
- Error/degraded state must not look like a confident empty state.
- Defensive record filtering must happen before broad shell computation.
- Backup must not report success when it cannot restore.
- App-level tests must exercise non-career, adjusted, malformed, stale, and contradictory states.
- Test fixtures must not accidentally make hardcoded logic look correct.
- Browser green does not prove semantic intelligence.
- Real-phone experience can reveal problems automation misses.
- Technical/internal copy must not leak into primary owner UI.
- Data & Privacy must not become a giant wall of explanations.
- Visual polish is not an end-of-project afterthought.

---

# 61. Product copy rules

Normal owner-facing copy should be:

- concise;
- specific;
- ordinary;
- direct;
- warm;
- occasionally playful;
- context-aware.

Avoid:

- research-report language;
- internal type names;
- excessive confidence math;
- generic encouragement;
- therapy language everywhere;
- moral judgment;
- repeated boilerplate.

Examples of the target style:

Instead of:

> Moderate evidence · 7 comparable observations, recent and consistent.

Prefer something closer to:

> This has worked several times in situations like this one.

**The horizon in that example is illustrative, not canonical (D-110).** Earlier
revisions wrote it as "situations like tonight", and the wording was read as the
target rather than as the register. It is the register that is the target: short,
ordinary, specific, no confidence arithmetic. **Owner-facing copy must name the
horizon the owner is actually in.** "Tonight" is correct in the evening and wrong
at nine in the morning, and the app said it at nine in the morning for a long
time because its own constitution appeared to bless the word. Where a sentence
names a horizon, it reads it from the current day block rather than assuming one.

Instead of:

> Try to recall it before looking anything up.

Prefer:

> Spend 10 minutes recalling the subnetting rules you missed yesterday before reopening your notes.

---

# 62. User-control and correction model

The owner must be able to correct:

- facts;
- context;
- inferred patterns;
- goals;
- direction;
- coverage interpretation;
- domain status;
- learned preference.

The app should preserve the correction and stop reasserting the old belief unless new evidence genuinely supports revisiting it.

---

# 63. No-hidden-staleness rule

A domain may be quiet.

A domain may be stable.

A domain may be low priority.

A domain must **not** silently remain based on months-old assumptions while the UI gives the impression that the app is current.

If the system lacks fresh evidence and the distinction matters, it must:

- gather evidence naturally;
- ask;
- or label uncertainty.

---

# 64. No-hidden-genericity rule

If two substantially different synthetic people repeatedly receive the same recommendation wording and reasoning despite materially different data, treat that as a possible intelligence defect.

Personalization must affect substance, not just names.

---

# 65. No-hidden-maintenance rule

The owner should not need to understand the app's schema to keep it useful.

The app should learn through:

- normal actions;
- outcomes;
- periodic high-value questions;
- natural domain interactions;
- imported trusted context.

Manual maintenance remains available but optional.

---

# 66. Design of the first useful vertical slice

Before broad app development, the smallest credible slice must support:

1. load a synthetic owner history;
2. understand entities and durable context;
3. identify a current bottleneck;
4. generate multiple candidate moves;
5. select one;
6. preserve the actual subject;
7. explain the choice naturally;
8. show it on Now;
9. let the owner accept/decline/can't-now;
10. record the outcome;
11. learn from the outcome;
12. alter the next decision;
13. inspect the trace in QA;
14. refresh the latest build on a phone.

If this slice is not impressive, fix the foundation.

Do not compensate by adding more screens.

---

# 67. First phone-preview scenarios

The first real phone build should include synthetic scenario buttons in Preview/QA only:

- Strong normal day
- Poor sleep
- Adaya growth opportunity
- Azure weak-topic review
- Social opportunity
- Quiet/stable evening
- Home friction
- Stale-domain coverage
- Private late-night pattern
- Non-career weekly direction
- Unknown-data case

This gives the owner a fast way to judge intelligence and design without importing private JSON.

---

# 68. Research discipline

For health, behavioral, learning, sleep, and other evidence-sensitive rules:

- identify what claim the app is making;
- use authoritative/peer-reviewed evidence where appropriate;
- distinguish general research from personal outcome evidence;
- avoid causal language when only association exists;
- prefer reversible rules;
- document uncertainty;
- do not add input burden unless expected decision value justifies it.

---

# 69. What remains intentionally flexible

The following should remain open until tested:

- exact color palette;
- exact animation system;
- exact card styling;
- exact Life overview layout;
- exact Insights layout;
- final More/Data label;
- exact remote-AI provider, if any;
- exact model architecture;
- exact scoring/forecast presentation;
- exact domain freshness thresholds;
- exact workout-app integration;
- exact serverless inference design if needed;
- exact AI export preset names;
- exact dark/light appearance support.

These are **not missing requirements**.

They are deliberately left flexible so the build can discover the best implementation without recreating legacy assumptions.

---

# 70. Decisions already made by this plan

The following are no longer open questions unless the owner explicitly reopens them:

- GitHub/repository route.
- New repository is `Bill6006/life-command-os-rebuild`; existing `Bill6006/life-command-os` is protected legacy/reference only.
- The canonical plan is self-contained for the developer; old planning/archive documents are not normal build inputs.
- New architecture, not legacy parity.
- No important domain switches.
- Primary navigation is Now / Life / Timeline / Insights conceptually.
- Domains live under Life rather than each owning a permanent primary tab.
- Now is proactive.
- Life pages are optional inspection/manual update.
- Time-block guides remain on one adaptive flow.
- Coverage intelligence prevents silent domain neglect.
- Fatherhood/Adaya growth can be learned from natural evidence and suggested updates.
- Social recommendations may include natural conversation/compliment actions when contextually correct.
- Private / Sexual Health is manual-entry-first but remains part of the intelligence model.
- Private / Sexual Health can be included in every export family and is selectable for AI review.
- AI-review exports include a handoff prompt.
- Synthetic JSON QA is first-class.
- Easy phone preview exists throughout development and tracks the latest verified owner-visible checkpoint through one stable reusable URL.
- Every phase/checkpoint handoff includes the recommended Claude Code intelligence level and whether to continue in the current conversation or start a new one.
- Beginning with Phase 5, a builder cannot self-approve GREEN; implementation stops at YELLOW — READY FOR INDEPENDENT QA until a fresh QA conversation passes the deployed checkpoint.
- Independent QA uses `docs/qa/PHASE_XX_QA_HANDOFF.md`, does not repair product code, and returns failures to the original builder conversation; repaired checkpoints return to the same QA conversation for retest.
- Independent retest/review roles that require independence use a fresh conversation.
- New phases normally begin in a fresh builder conversation; same-phase repairs normally remain in the current builder conversation.
- Intelligence level is chosen for the actual job and must not default mechanically to Max.
- Phase 6 exposes progressively disclosed numerical evidence/analytics, including rates or likelihoods only when justified by comparable evidence, while keeping Now simple.
- The eleven modeled core areas intentionally map to ten baseline Life pages because Health & Physical Capacity and Sleep & Recovery share one Health & Recovery inspection page.
- The next copy/paste prompt is provided immediately at the boundary, not after an extra “go” turn.
- Visual direction is dark-first, modern, alive, dimensional, and personality-rich.
- No submarine panel.
- No dark cave.
- No three competing design directions.
- No requirement to preserve a giant Life Score.
- No requirement to stay deterministic/local-only if a better architecture proves materially smarter.
- Real owner data does not enter public repo fixtures.
- New implementation expands only after the intelligence kernel proves itself.

---

# 70A. Developer delivery boundary

The normal developer handoff for this rebuild is intentionally small.

## Give the developer

- this canonical plan;
- later owner-approved amendments to this plan;
- files generated inside the **new rebuild repository** as the project progresses.

## Do not give the developer by default

- `LifeApp.zip`;
- old standalone HTML apps;
- old implementation plans;
- old acceptance plans;
- old requirements registers;
- old Prompt 10/Prompt 12 files;
- old backups/exports containing personal history;
- the old `Bill6006/life-command-os` repository as a requirements source.

The developer must not complain that the old documents are “missing.” They are intentionally excluded.

If a later phase genuinely requires a narrowly scoped historical artifact, the developer must:

1. explain exactly what question the artifact would answer;
2. explain why the canonical plan/new repository cannot answer it;
3. request explicit owner authorization;
4. use only the minimum necessary historical material;
5. never convert legacy implementation detail into a new requirement without owner approval.

---

# 71. Canonical acceptance sentence

The rebuild is ready to become the long-term production base when:

> **The owner can open the latest build on the phone, the app understands the actual situation and subject, every important life area remains intelligently covered without manual tab patrol, the system asks only what it needs, gives one credible next move in normal human language, learns from what happens, exposes its reasoning when asked, preserves private/history data safely, and feels modern and alive rather than generic, technical, or oppressive.**

---

# 72. Immediate next action

Do **not** begin by importing or inspecting the old application.

Begin with **Phase 0**:

- verify the current working directory and Git remotes before touching anything;
- prove the existing `Bill6006/life-command-os` repository will remain unchanged;
- verify `Bill6006/life-command-os-rebuild` does not already exist;
- create the clean new repository only after the repository safety gate passes;
- create the stable reusable phone Preview URL;
- install this canonical plan as the governing authority;
- create the decision log, phase status, defect ledger, and next-prompt file;
- prove that the owner can see the exact latest verified Preview SHA on the phone;
- stop for owner approval;
- in the same Phase 0 closing response, provide the Phase 1 intelligence-level recommendation, CURRENT/NEW conversation recommendation, reasons, and complete copy/paste prompt.

Then Phase 1 builds meaning.

Then Phase 2 proves intelligence.

Only after the brain passes does the application expand.

