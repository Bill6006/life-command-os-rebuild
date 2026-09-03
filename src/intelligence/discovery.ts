import { createRecordFactory } from '../domain/build'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import { newRecordId, type RecordId } from '../domain/ids'
import type { CanonicalRecord, DiscoveryResponseRecord, Provenance } from '../domain/records'
import { localWeekIdAt, type Instant, type TimeZoneId, type WeekStartDay } from '../domain/time'
import { buildView, type MemoryView } from '../memory/view'
import { milestoneQuestion, PROVING_DOMAINS } from './authoring'
import type { ActiveDestination } from './destinations'
import { readingFor } from './interpret'
import { priorFor, type ResearchPrior } from './priors'
import { decide, type DecideOptions, type DecisionMoment } from './engine'
import type { Situation } from './situation'

/**
 * The second information agenda — questions asked to understand the owner over
 * time (F02, D-163, package 4).
 *
 * ## Why the guide could not do this
 *
 * `guide.ts` decides whether to ask by re-running `decide()` under every
 * possible answer and asking whether the answers land anywhere different. That
 * mechanism is correct, it is protected, and it means the guide **structurally
 * cannot ask a question that would not move today's answer**. It is also, on
 * its own, a system that can know nothing whatever about a life while being
 * quite certain it has nothing worth asking — which is exactly what the review
 * found: six readings of today's capacity, and no way to learn that a man wants
 * to be employable.
 *
 * ## Two budgets, and neither borrows from the other
 *
 * D-163. The decision guide is untouched: D-036's answer-share rule, D-111's
 * narrow consequential exception and the three-a-day cap all stand, and nothing
 * here raises them. This agenda has its own budget, {@link DISCOVERY_PER_WEEK},
 * and it is a **week** rather than a day because what it asks about does not
 * change daily.
 *
 * ## The four rules, and where each is kept
 *
 * - **Never on Now's critical path.** Nothing in this file is read by
 *   `NowScreen`; the agenda renders on Life and on a domain page, which is also
 *   where D-169 puts the review loop.
 * - **Always skippable, and a skip is respected.** A skip writes a
 *   `discovery-response` and the prompt is not put again. The thing it was
 *   asking about stays authorable directly from the page, so respecting the
 *   skip costs him nothing.
 * - **An answer is remembered and not re-asked.** Same record, and separately
 *   every prompt knows how to check whether the app already has what it was
 *   asking for — so answering the question *by doing the thing* silences it
 *   too.
 * - **It must show what the answer changed.** {@link discoveryChanges} replays
 *   the decision without the record an answer produced and reports the
 *   difference. That is the rule an agenda cannot fake, and it is why the
 *   response record carries what it produced.
 *
 * ## What this must not become
 *
 * An onboarding questionnaire, a domain maintenance chore, or a licence to ask
 * more in total. Less wasted questioning, more useful learning.
 */

/**
 * How many of these the app will put up in one owner-local week.
 *
 * Two. It is a floor under his patience rather than the stopping condition —
 * the real stopping condition is that a prompt only exists while the app does
 * not have what it is asking for, so the agenda empties itself as it learns.
 * The cap is what stops a newly opened store asking eleven things in an
 * evening.
 *
 * Deliberately **not** three-a-day like the guide. These questions are not
 * about tonight and asking two of them a day would be the onboarding
 * interrogation D-163 forbids by name.
 */
export const DISCOVERY_PER_WEEK = 2

export const DISCOVERY_TOPICS = [
  'aspiration',
  'next-step',
  'baseline',
  'evidence',
  'commitment',
] as const

export type DiscoveryTopic = (typeof DISCOVERY_TOPICS)[number]

/**
 * What answering one of these produces.
 *
 * The agenda does not have a record shape of its own: an aspiration becomes a
 * `destination`, a next step becomes a milestone, a commitment becomes a span
 * of the week. That is what keeps it from being a survey — every answer lands
 * as an object the rest of the app already understands.
 */
export type DiscoveryShape = 'destination' | 'milestone' | 'baseline' | 'evidence' | 'obligation'

export interface DiscoveryPrompt {
  /** Stable, so an answer and a skip are both remembered against it. */
  readonly id: string
  readonly topic: DiscoveryTopic
  readonly domain: LifeDomainId
  readonly shape: DiscoveryShape
  readonly prompt: string
  /** What the app will do with the answer, in view while he answers — D-176. */
  readonly note: string
  /** Why it is worth asking, in the agenda's own terms. QA copy. */
  readonly because: string
  /**
   * A research claim that makes this worth one of two slots a week — §13C,
   * option B.
   *
   * Present only where one applies, and it is the answer to *"why did you ask
   * me this?"* — which §13C names as a condition on the permission rather than
   * a nicety. What it carries is a statement about **people**, with its
   * citation, and never a statement about him: *"adults who…"* is a prior,
   * *"you probably…"* is a finding, and the second is the first thing option B
   * forbids.
   *
   * **It changes the order of the agenda and nothing else.** A prior never
   * creates a prompt, never removes one, never becomes a record, and never
   * reaches a recommendation. Where it applies, the question it points at goes
   * first among the ones that were already going to be asked.
   */
  readonly prior: ResearchPrior | undefined
  /** The destination it is about, where it is about one. */
  readonly destination: ActiveDestination | undefined
}

export interface DiscoveryAgenda {
  /** The one to put up, or nothing. */
  readonly prompt: DiscoveryPrompt | undefined
  /** Everything the app does not know and could ask about. */
  readonly outstanding: readonly DiscoveryPrompt[]
  /** How many have been put up in this owner-local week. */
  readonly askedThisWeek: number
  readonly budget: number
  /** How many have been answered, ever. */
  readonly answered: number
  /** How many have been skipped, ever. Respected, not retried. */
  readonly skipped: number
  /** Why it is asking, or why it is not. */
  readonly because: string
}

interface AgendaMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn: WeekStartDay
}

/**
 * Every prompt the app could put, given what it does not know.
 *
 * The list is generated from the gaps rather than written out, which is what
 * makes *"question volume falls as answers accumulate"* a property rather than
 * a hope: a prompt exists only while the thing it asks about is missing, so
 * filling the thing in — by answering, or by doing it directly on the page —
 * removes the prompt. The measurement is across the library, in
 * `tests/synthetic/destination-and-discovery.test.ts`.
 *
 * **Three proving domains, not twelve.** Career, Health and Money. Fatherhood
 * is deliberately outside the proving scope and so is everything else; a phase
 * that asked an aspiration question about all eleven pages would be the twelve
 * progression models the adjudication refused.
 */
export function outstandingPrompts(situation: Situation): readonly DiscoveryPrompt[] {
  const out: DiscoveryPrompt[] = []
  const destinations = situation.direction.destinations
  /*
   * Finishing what was started comes before starting something else — routing 91.
   *
   * The agenda walks the three proving areas in registry order, so answering the
   * Career aspiration used to make *"what are you hoping Health looks like?"* the
   * next question. That was harmless while an aspiration was an inert string. It
   * is not harmless now: the app has just said it read his words as being about
   * Money and offered to act on that, and the one question that would make the
   * offer true is the clarification. Asking about Health instead is the app
   * saying it understood and then changing the subject — the brief's own worst
   * outcome, one level up from where it names it.
   *
   * So a clarification is hoisted, and **only** a clarification: everything else
   * keeps the order routing 84 shipped, and nothing is added or removed by this,
   * so the measured property that what is outstanding never rises after an answer
   * is untouched.
   */
  const first: DiscoveryPrompt[] = []

  for (const domain of PROVING_DOMAINS) {
    const area = situation.domains.labelFor(domain)
    const here = destinations.filter(
      (destination) => destination.domain === domain && destination.state === 'active',
    )

    if (here.length === 0) {
      out.push({
        id: `aspiration.${domain}`,
        topic: 'aspiration',
        domain,
        shape: 'destination',
        prompt: `What are you hoping ${area} eventually looks like?`,
        note: 'This is kept as what you are aiming at. It is described in your words and never scored, and you can change it whenever it changes.',
        because: `nothing in the record says what ${area} is for`,
        prior: priorFor('aspiration', domain),
        destination: undefined,
      })
      continue
    }

    for (const destination of here) {
      /*
       * **One at a time, per destination** — D-163's "fewer questions as it
       * learns, not more".
       *
       * A destination has four parts and three of them can be missing at once.
       * Emitting a prompt for each would mean that answering *"what are you
       * aiming at"* replaced one question with three, which is the rule
       * inverted: the agenda would get louder the more the owner told it. So
       * only the first gap is offered, and the next one appears when it is
       * filled — which is also how a person would ask.
       *
       * The measurement is in `destination-and-discovery.test.ts`: what is
       * outstanding never rises after an answer, on any history in the library.
       */
      const already = out.length + first.length
      if (destination.next === undefined) {
        /*
         * The one follow-up, and where it was read it is concrete — routing 91.
         *
         * **The same slot, better words.** D-184 already guarantees one question
         * per destination at a time, and that is the budget acceptance test 4
         * means by *"exactly one follow-up, not three"*. So interpretation does
         * not add a question here; it changes the one that was already going to
         * be asked, from *"what would be the next step"* to the thing that area
         * actually needs — and it does so only where the words were read and the
         * owner agreed with the reading.
         *
         * Where he declined, or where the words named nothing, this is D-188's
         * sentence unchanged. That is the synthetic contract's null case: an
         * unambiguous phrase produces no clarification at all.
         */
        const read = readingFor(situation.view, destination.destination, situation.at) !== undefined
        ;(read ? first : out).push({
          /*
           * **One id, both wordings** — D-163's "a skip is respected".
           *
           * Two ids would mean that skipping the money-flavoured question and
           * then taking the reading back put the plain one in front of him
           * again, because nothing would have been settled against it. One
           * thing is being asked about — the next step towards this aim — and
           * what the reading changes is how it is worded, not what it is.
           */
          id: `next-step.${destination.destination.id}`,
          topic: 'next-step',
          domain,
          shape: 'milestone',
          prompt: read
            ? milestoneQuestion(domain, destination.aim)
            : `What would be the next step towards “${destination.aim}”?`,
          note: 'This becomes a milestone with its own date, and the app will start suggesting work towards it.',
          because: read
            ? `the words were read as being about ${situation.domains.labelFor(domain)} and nothing names one`
            : 'there is an aim here with nothing named on the way to it',
          prior: priorFor('next-step', domain),
          destination,
        })
      }
      if (out.length + first.length > already) continue
      if (destination.baseline === undefined) {
        out.push({
          id: `baseline.${destination.destination.id}`,
          topic: 'baseline',
          domain,
          shape: 'baseline',
          prompt: `Where would you say you are with “${destination.aim}” right now?`,
          note: 'This is kept as your starting point, in your words. Nothing is measured against it.',
          because: 'there is nothing to read progress against',
          prior: priorFor('baseline', domain),
          destination,
        })
      }
      if (out.length + first.length > already) continue
      if (destination.evidence.length === 0) {
        out.push({
          id: `evidence.${destination.destination.id}`,
          topic: 'evidence',
          domain,
          shape: 'evidence',
          prompt: `What would tell you that “${destination.aim}” was actually happening?`,
          note: 'This is kept as what would count. The app will never decide you have got there — it holds what you said would show it.',
          because: 'nothing says what would count as getting somewhere',
          prior: priorFor('evidence', domain),
          destination,
        })
      }
    }
  }

  /*
   * And the one that is not about a destination at all — gate item 4.
   *
   * *"The discovery agenda asks a question that would not change today's
   * recommendation, and can be shown to have changed a later one."* A regular
   * commitment is exactly that shape: telling the app that Wednesday morning is
   * spoken for changes nothing about a Monday evening, and changes what it says
   * on Wednesday at ten. It is the honest demonstration that this agenda is a
   * different instrument from the guide rather than the same one asked less
   * often.
   */
  if (situation.commitments.length === 0 && standingWindows(situation) === 0) {
    out.push({
      id: 'commitment.week',
      topic: 'commitment',
      domain: DOMAIN.direction,
      shape: 'obligation',
      prompt: 'Is there something that takes a regular chunk of your week?',
      note: 'This is kept as a part of every week that is already spoken for, so the app stops suggesting things into it. It changes nothing about today unless today is that day.',
      because: 'nothing in the record says what an ordinary week looks like',
      prior: priorFor('commitment', DOMAIN.direction),
      destination: undefined,
    })
  }

  /*
   * And research annotates the agenda without reordering it — §13C, option B.
   *
   * ## What was built first, and why it was pulled back
   *
   * The first version put a question a prior speaks to in front of one it does
   * not, on the strength of *"spend the bounded discovery agenda more
   * intelligently"*. It worked, and what it did was move the **opening
   * question** of a brand-new owner's life from Career to Health on the
   * strength of a WHO exercise guideline. That is not more intelligent; it is a
   * research claim deciding the app's first sentence, and the proving order —
   * Career, Health, Money — is a product decision routing 84 made rather than a
   * gap in the app's knowledge.
   *
   * So the order is untouched, and what a prior does is the other two approved
   * uses: **identify potentially useful questions**, and **help the system know
   * where caution or missing evidence matters**. It says why the app thinks
   * this one is worth one of two slots a week, in a claim about people with a
   * citation attached, and the owner reads that beside the question.
   *
   * `tests/synthetic/reach-priors.test.ts` asserts the order is identical with
   * the priors and without them, which is the property that makes this option B
   * rather than something further along the alphabet.
   */
  return [...first, ...out]
}

function standingWindows(situation: Situation): number {
  let count = 0
  for (const record of situation.view.history.effective) {
    if (record.kind === 'commitment-window') count += 1
  }
  return count
}

/** Prompts the owner has already answered or skipped, by id. */
export function settledPrompts(
  view: MemoryView,
  now: Instant,
): ReadonlyMap<string, DiscoveryResponseRecord> {
  const out = new Map<string, DiscoveryResponseRecord>()
  for (const record of view.history.effective) {
    if (record.kind !== 'discovery-response') continue
    if (record.occurredAt > now) continue
    out.set(record.prompt, record)
  }
  return out
}

/**
 * What to put up, and why it is or is not asking.
 *
 * The order the checks run in is the order D-163 states the rules in, and the
 * `because` line names whichever one stopped it — so an inspector reading the
 * agenda sees the rule rather than an absence.
 */
export function discoveryAgenda(situation: Situation, moment: AgendaMoment): DiscoveryAgenda {
  const settled = settledPrompts(situation.view, moment.now)
  const outstanding = outstandingPrompts(situation).filter((prompt) => !settled.has(prompt.id))

  let answered = 0
  let skipped = 0
  for (const record of settled.values()) {
    if (record.disposition === 'answered') answered += 1
    else skipped += 1
  }

  const thisWeek = localWeekIdAt(moment.now, moment.zone, moment.weekStartsOn)
  let askedThisWeek = 0
  for (const record of settled.values()) {
    if (localWeekIdAt(record.occurredAt, moment.zone, moment.weekStartsOn) === thisWeek) {
      askedThisWeek += 1
    }
  }

  const common = {
    outstanding,
    askedThisWeek,
    budget: DISCOVERY_PER_WEEK,
    answered,
    skipped,
  }

  if (outstanding.length === 0) {
    return {
      ...common,
      prompt: undefined,
      because:
        settled.size === 0
          ? 'nothing here the app does not already have'
          : `everything it was going to ask about is answered or left (${answered} answered, ${skipped} left)`,
    }
  }

  if (askedThisWeek >= DISCOVERY_PER_WEEK) {
    return {
      ...common,
      prompt: undefined,
      because: `already asked ${askedThisWeek} this week — that is enough`,
    }
  }

  const next = outstanding[0]
  if (next === undefined) throw new RangeError('an outstanding list with nothing in it')
  /*
   * And research is named where research is part of the reason — §13C.
   *
   * *"Provenance must support answering 'why did you ask me this?'"* The
   * agenda's own `because` is what the QA laboratory prints and what the card
   * shows, so the claim goes there rather than into a second field nothing
   * reads. It is a statement about people, not about him.
   */
  return {
    ...common,
    prompt: next,
    because: next.prior === undefined ? next.because : `${next.because}, and ${next.prior.claim}`,
  }
}

export const DISCOVERY_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'discovery' }

export interface DiscoveryMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt: Instant
  readonly nextId?: () => RecordId
}

/**
 * The record that remembers what became of a prompt.
 *
 * Written when the owner **acts** and never when a prompt is rendered — D-043
 * is untouched. A skip writes one of these and nothing else; an answer writes
 * one alongside whatever object the answer became, carrying its id so the
 * agenda can go back and say what it changed.
 */
export function discoveryResponseRecord(
  prompt: DiscoveryPrompt,
  disposition: 'answered' | 'skipped',
  produced: RecordId | undefined,
  moment: DiscoveryMoment,
): DiscoveryResponseRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: DISCOVERY_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  return build(
    'discovery-response',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      id: moment.nextId?.() ?? newRecordId(),
      domains: [prompt.domain],
    },
    {
      prompt: prompt.id,
      disposition,
      ...(produced === undefined ? {} : { produced }),
    },
  )
}

// ---------------------------------------------------------------------------
// What the answer changed — D-163's fourth rule
// ---------------------------------------------------------------------------

export interface DiscoveryChange {
  readonly prompt: string
  readonly at: Instant
  /** What the app says now. */
  readonly now: string
  /** What it would be saying if he had not answered. */
  readonly without: string
  readonly changed: boolean
}

/**
 * What each answered prompt actually changed, worked out rather than claimed.
 *
 * The decision is replayed against a history with the produced record removed
 * and the two answers are compared — the same technique `guide.ts` uses to
 * decide whether its last question was worth asking, which is the only honest
 * way to know. It costs an extra pass per answered prompt, which is why it is
 * on Life and not on Now.
 *
 * **A prompt whose answer changed nothing today still reports honestly**, and
 * that is the point of the surface rather than an admission. The whole reason
 * this agenda exists is that a question can be worth asking without moving
 * tonight's answer; a display that only listed the ones that did would be
 * re-introducing the guide's own rule one layer up.
 */
export function discoveryChanges(
  view: MemoryView,
  moment: DecisionMoment,
  options: DecideOptions = {},
): readonly DiscoveryChange[] {
  const out: DiscoveryChange[] = []
  const standing = describe(decide(view, moment, { ...options, probe: false }))

  for (const record of view.history.effective) {
    if (record.kind !== 'discovery-response') continue
    if (record.occurredAt > moment.now) continue
    if (record.disposition !== 'answered' || record.produced === undefined) continue

    const produced = record.produced
    const without = buildView(
      {
        ...view.snapshot,
        records: view.snapshot.records.filter((entry) => entry.id !== produced),
      },
      {
        now: moment.now,
        zone: moment.zone,
        ...(moment.weekStartsOn === undefined ? {} : { weekStartsOn: moment.weekStartsOn }),
      },
    )
    const before = describe(decide(without, moment, { ...options, probe: false }))
    out.push({
      prompt: record.prompt,
      at: record.occurredAt,
      now: standing,
      without: before,
      changed: before !== standing,
    })
  }

  return out
}

function describe(decision: ReturnType<typeof decide>): string {
  return (
    decision.explanation?.rendered.sentence ?? decision.noAction?.headline ?? 'nothing on screen'
  )
}

/** Every record an answer to a prompt produced, for a surface that lists them. */
export function producedBy(view: MemoryView, prompt: string): CanonicalRecord | undefined {
  for (const record of view.history.effective) {
    if (record.kind !== 'discovery-response') continue
    if (record.prompt !== prompt || record.produced === undefined) continue
    return view.history.byId(record.produced)
  }
  return undefined
}
