import { createRecordFactory } from '../domain/build'
import type { LifeDomainId } from '../domain/domains'
import type { EntityRef } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import type {
  CanonicalRecord,
  CoverageUpdateRecord,
  DomainUpdateRecord,
  GrowthStage,
  Provenance,
} from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import type { OccasionContext } from '../domain/records'
import { confidence, confidenceFromSampleCount, type Confidence } from '../domain/knowledge'
import { localDaysBetween, localDayIdAt } from '../domain/time'
import type { Episode } from './lifecycle'
import { resultReached } from './outcomes'
import type { Situation } from './situation'

/**
 * Growth evidence, and when it is worth proposing a change (section 9, D-112).
 *
 * Section 9 sets out the whole loop and then puts one sentence under it as a
 * rule:
 *
 * > Meaningful growth-stage changes should not be silently invented from one
 * > event.
 *
 * So this proposes and never decides. He confirms, rejects, or corrects —
 * section 9's own list — and either answer is recorded, because a question that
 * changes nothing is D-029's complaint with a different label.
 *
 * ## What D-112 changed, and why it had to
 *
 * The first version built its evidence by **discarding** every occasion that
 * did not go all the way, and then wrote the headline from the length of what
 * was left: *"Adaya has handled ordering her own food 3 times running."*
 *
 * The audit constructed a history of six occasions — all the way, part of the
 * way, all, part, all, part — and the deployed build said exactly that
 * sentence. Three separate things were wrong with it at once. **It was false:**
 * "running" means consecutively and these were never twice in a row. **It hid
 * the disconfirming evidence:** a child who manages a thing three times in ten
 * was described identically to one who manages it three times in three. **And
 * the most recent occasion contradicted it:** the run ended on a partial and
 * the sentence did not change. Tapping "Yes, she has got this" would have
 * recorded *"She handles ordering her own food independently now."*
 *
 * D-112 replaces the rule rather than the wording, and the replacement is one
 * sentence: **the evidence is the sequence, not the survivors.**
 *
 * - An occasion is one the owner actually attempted. A decline or an
 *   unable-now is evidence about *his* evening and never about her (AUD-0014).
 * - Every attempted occasion counts, including the ones that went the other
 *   way. Nothing is filtered out of the evidence it is evidence against.
 * - Consecutiveness may be claimed only when the sequence supports it, so the
 *   count that matters is the **run in progress** rather than a total. The most
 *   recent occasion that went the other way ends the run, and therefore holds a
 *   settled suggestion back on its own.
 * - **No new threshold.** There is no percentage, no share and no pass mark
 *   about a four-year-old anywhere in this file. What replaced the filter is
 *   the ordinary meaning of "in a row".
 *
 * ## What the owner reads
 *
 * Counts of occasions, in his own words, and nothing that grades her (section
 * 4.4, section 22, D-112). The suggestion carries an internal confidence
 * because every other claim in the product carries one — and it is internal:
 * `confidenceFrom`'s vocabulary ("Worth noticing", "Fairly consistent") is
 * right for a move and is a grade with a friendly face attached to a sentence
 * about a child, which is the one place in the product where that shared
 * vocabulary must **not** be reused (AUD-0049).
 *
 * **Why three.** `PATIENCE` is 3 in `learning.ts` for the same reason and it is
 * the same claim: one occasion is an anecdote. A child who orders her own food
 * once has had a good day. A child who has done it three times in a row has
 * changed, and the app may say so out loud — as a question.
 */

export const GROWTH_OCCASIONS = 3

/** How well it has to have gone. `all the way`, not `part of the way`. */
const GROWTH_CLEARLY = 0.9

/**
 * How long a development skill goes before its evidence is worth refreshing.
 *
 * Section 8's own example: "a child's developmental skill may need periodic
 * evidence". A fortnight is periodic without being a schedule, and the number
 * is here rather than in the concept registry because the thing that ages is
 * the skill rather than any concept — there is no `ordering-her-own-food`
 * concept and there should not be one.
 */
export const GROWTH_EVIDENCE_AGES_AFTER_DAYS = 14

export const GROWTH_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

/**
 * One attempted go at a growth skill, and how far it got.
 *
 * `cleared` is the same judgement `GROWTH_CLEARLY` always made; what changed is
 * that the occasions which did not clear it are kept rather than dropped, so
 * the sequence can be read.
 */
export interface GrowthOccasion {
  readonly episode: Episode
  readonly cleared: boolean
  /**
   * What else was true of it — AUD-0017. Absent on every occasion recorded
   * before the second step existed, and those must not be back-filled.
   */
  readonly occasion: OccasionContext | undefined
}

/**
 * How many distinct settings a run has to span before "settled" is offered.
 *
 * Two, and it **amends D-070 rather than replacing it** (see the decision log).
 * Three occasions is still the count; what is added is that they cannot all be
 * the same place. Generalisation across settings, people and time is the thing
 * that has to be programmed and probed, not inferred from a run in one context
 * (Stokes & Baer, *Journal of Applied Behavior Analysis* 10(2):349–367, 1977) —
 * and the claim the app was making, "she handles this independently now", is a
 * generalisation claim resting on evidence about repetition.
 *
 * Raising the bar means the suggestion fires less often. That is correct and it
 * will feel like a regression against the three-occasion rule, which is why it
 * is written down as an amendment.
 */
export const SETTINGS_FOR_SETTLED = 2

/**
 * A settled skill, and what the owner can do about it — AUD-0015(a).
 *
 * The owner's confirmation used to change nothing. `growthAnswerRecord` wrote a
 * free-text `domain-update`, `development-skill` entities carried no status,
 * and `fatherhoodCandidates` enumerated every one of them unconditionally — so
 * "Yes, she has got this" suppressed the *suggestion* and not the *move*, and
 * the app went on proposing a skill he had told it she had.
 *
 * **`settled` is never permanent, and that is not a nicety.** Regression is
 * real in children. It is set by one tap and unset by one tap, from the page
 * where the skill is listed.
 */
export type { GrowthStage }

/**
 * How long a settled skill goes before the app asks about it again, the first
 * time — AUD-0015(a).
 *
 * Two months, and then twice as long each time. Expanding intervals are what
 * the maintenance literature recommends after mastery, and the point is that
 * the app stops *proposing* a settled skill and keeps a way of noticing a
 * regression — which is a different sentence and a much rarer one: *"She hasn't
 * ordered for herself in a couple of months — worth a check?"*
 *
 * The doubling is what keeps it from becoming a schedule. A skill she settled
 * two years ago is asked about roughly once a year, and one she settled last
 * month is not asked about at all.
 */
export const MAINTENANCE_FIRST_DAYS = 60

/**
 * What the app is actually offering — AUD-0017.
 *
 * Two different sentences with two different meanings, and conflating them is
 * what the finding is about. `settled` asks a question and writes a belief
 * about his daughter if he agrees. `widen-the-setting` asks nothing: it is a
 * suggestion, and a genuinely useful one — *"three times, all at the same
 * place. Worth trying somewhere new before we call it."* — rather than a hedged
 * version of the first.
 */
export type GrowthSuggestionKind = 'settled' | 'widen-the-setting'

export interface GrowthSuggestion {
  readonly kind: GrowthSuggestionKind
  readonly skill: EntityRef
  /** The life area the update belongs to, taken from the skill itself. */
  readonly domain: LifeDomainId
  readonly person: EntityRef | undefined
  /** What the app noticed, in ordinary words, naming her and the skill. */
  readonly headline: string
  /**
   * The evidence under the headline, in the owner's own words.
   *
   * Present whenever any occasion went the other way, because a sufficiency
   * claim about his daughter that he cannot check is one he cannot judge — and
   * absent when there is nothing to say, rather than rendering "0 of them"
   * about a four-year-old.
   */
  readonly occasionsSummary: string | undefined
  /** What would be written down if he agrees. */
  readonly statement: string
  /** Attempted occasions in the record, whichever way they went. */
  readonly occasions: number
  /** How many of those went all the way. */
  readonly cleared: number
  /** How many of those went the other way. */
  readonly wentOtherWay: number
  /** How many all-the-way occasions the current run is, in a row. */
  readonly runLength: number
  /**
   * How sure the app is, and **it never renders** (AUD-0049, D-112).
   *
   * Every other claim in the product carries one of these and this one did not,
   * which is what let a filtered count read as mastery. It is here so the
   * standard is the same; it is internal so that no badge, grade or scale about
   * a child reaches a surface. `tests/synthetic/g003-growth-evidence.test.ts`
   * fails the build if it does.
   */
  readonly confidence: Confidence
  readonly evidence: readonly RecordId[]
}

/** Every time this growth skill was put in front of the owner, oldest first. */
function occasionsFor(situation: Situation, skill: EntityRef): readonly Episode[] {
  return situation.learning.episodes
    .filter(
      (episode) =>
        episode.semantics.target.verb === 'growth-opportunity' &&
        episode.semantics.target.object.id === skill.id &&
        episode.shownAt <= situation.at,
    )
    .sort((a, b) => a.shownAt - b.shownAt)
}

/**
 * Whether the owner actually went and did it — AUD-0014, D-112.
 *
 * A `declined` or `unable-now` episode is the owner exercising the sovereignty
 * section 4.3 gives him, and it says nothing whatever about his daughter. It
 * was being counted as practice: `daysSincePractice` took the last episode of
 * any state, so pressing **"Can't right now"** on a growth move reset the app's
 * belief about when she last practised, flipped the candidate's trigger from
 * `stale-evidence` to `opportunity-window`, and suppressed the honest reason at
 * exactly the moment it was true.
 *
 * Note the mirror-image care taken one file over: `learning.ts` deliberately
 * down-weights a "Something else" decline so it is not read as a verdict on the
 * move. The same care was not taken here, and a refusal belongs where every
 * other refusal goes — `owner-preference`, never the growth model.
 */
function wasAttempted(episode: Episode): boolean {
  if (episode.state === 'completed') return true
  return episode.state === 'started' && episode.outcomes.length > 0
}

/**
 * The attempted occasions, and how far each got.
 *
 * Only the ones the owner has actually said something about: an attempt with no
 * answer to "how far did she get" is a fact about his evening rather than about
 * her, and counting it either way would be inventing the answer.
 */
function judgedOccasions(situation: Situation, skill: EntityRef): readonly GrowthOccasion[] {
  const out: GrowthOccasion[] = []
  for (const episode of occasionsFor(situation, skill)) {
    if (!wasAttempted(episode)) continue
    const reached = resultReached(episode)
    if (reached === undefined) continue
    out.push({ episode, cleared: reached >= GROWTH_CLEARLY, occasion: occasionOf(episode) })
  }
  return out
}

/** What the owner said about where this occasion happened, if he said. */
function occasionOf(episode: Episode): OccasionContext | undefined {
  for (const outcome of episode.outcomes) {
    if (outcome.aspect !== 'result') continue
    return outcome.occasion
  }
  return undefined
}

/**
 * How many distinct settings a run of occasions covers.
 *
 * A named place counts as itself; the two coarse answers count as themselves.
 * An occasion with no setting counts as **nothing at all** — not as a third
 * setting and not as a repeat of the last one. That is G-009's rule applied to
 * the one claim in the product that is about a child: unknown is unknown, and
 * the reading that asserts less is the safe one.
 */
function settingsIn(occasions: readonly GrowthOccasion[]): number {
  const seen = new Set<string>()
  for (const occasion of occasions) {
    const setting = occasion.occasion?.setting
    if (setting === undefined) continue
    seen.add(setting.kind === 'place' ? `place:${setting.place.id}` : setting.kind)
  }
  return seen.size
}

/** How many all-the-way occasions the record ends on, in a row. */
function trailingRun(occasions: readonly GrowthOccasion[]): number {
  let run = 0
  for (let index = occasions.length - 1; index >= 0; index -= 1) {
    if (occasions[index]?.cleared !== true) break
    run += 1
  }
  return run
}

/**
 * How sure the app is that this has changed, from the whole sequence.
 *
 * Internal, and never rendered. It rises with the run the record ends on and
 * with how much has been seen, and it is held down by the occasions that went
 * the other way — which is the property the first version could not have at
 * all, because it had already thrown those occasions away.
 *
 * It is not a threshold and nothing is gated on it (D-112). Sufficiency is the
 * sequence rule; this is the app holding its highest-stakes claim to the same
 * standard as every other claim it makes.
 */
function confidenceIn(occasions: readonly GrowthOccasion[]): Confidence {
  if (occasions.length === 0) return confidence(0)
  const run = trailingRun(occasions)
  const otherWay = occasions.filter((occasion) => !occasion.cleared).length
  const seen = confidenceFromSampleCount(occasions.length)
  const settled = Math.min(1, run / GROWTH_OCCASIONS)
  const held = otherWay === 0 ? 1 : GROWTH_OCCASIONS / (GROWTH_OCCASIONS + otherWay)
  return confidence(seen * settled * held)
}

/**
 * When this skill was last practised, in owner-local days.
 *
 * Undefined when it never has been, which is a different thing and is treated
 * as one: a skill with no history at all is not stale evidence, it is no
 * evidence, and G-009's distinction holds here as everywhere else.
 */
export function daysSincePractice(situation: Situation, skill: EntityRef): number | undefined {
  const attempted = occasionsFor(situation, skill).filter(wasAttempted)
  const last = attempted[attempted.length - 1]
  if (last === undefined) return undefined
  return Math.max(0, localDaysBetween(last.dayId, localDayIdAt(situation.at, situation.zone)))
}

/** Whether a practice opportunity here is about refreshing what is known. */
export function practiceEvidenceHasAged(situation: Situation, skill: EntityRef): boolean {
  const days = daysSincePractice(situation, skill)
  return days === undefined || days >= GROWTH_EVIDENCE_AGES_AFTER_DAYS
}

/**
 * Whether the owner has already answered a suggestion about this skill.
 *
 * Both answers count, and both are records: agreeing writes a `domain-update`
 * saying what changed, and "not yet" writes a `coverage-update` saying the area
 * was looked at. Either way the app has been told, and asking again on the
 * strength of the same evidence would be nagging.
 *
 * It is a watershed rather than a mute button (D-047): what suppresses the
 * suggestion is an answer given *after* the evidence that raised it, so a
 * fourth good occasion after a "not yet" is genuinely new and may raise it
 * again.
 */
function answeredSince(situation: Situation, skill: EntityRef, since: Instant): boolean {
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'domain-update' && record.kind !== 'coverage-update') continue
    if (record.occurredAt <= since) continue
    if (record.occurredAt > situation.at) continue
    if (record.entities.some((ref) => ref.id === skill.id)) return true
    if (record.kind === 'coverage-update' && record.subArea === skill.id) return true
  }
  return false
}

/**
 * Growth areas the evidence says have moved on, as questions.
 *
 * Nothing here writes anything and nothing here changes a decision. It is a
 * reading of what already happened, offered beside the move it belongs to —
 * the same place, and for the same reason, as the belief correction in
 * `explain.ts`: a finding the owner cannot see is one he cannot correct.
 */
export function growthSuggestions(situation: Situation): readonly GrowthSuggestion[] {
  const out: GrowthSuggestion[] = []

  for (const skill of situation.entities.byKind('development-skill')) {
    const ref: EntityRef = { id: skill.id, kind: skill.kind }
    const occasions = judgedOccasions(situation, ref)

    /*
     * The sufficiency rule, and the whole of it — D-112.
     *
     * Not from one occasion and not from two, which is section 9's rule and is
     * unchanged. What changed is which three: **the three the record ends on**.
     * An occasion that went the other way ends the run, so the most recent one
     * holds this back on its own, and a history that alternates never reaches
     * three however many good days it contains.
     *
     * There is no share, no rate and no pass mark here. "Three in a row" is the
     * ordinary meaning of the sentence the app wants to say, and the rule is
     * that it may only say it when it is true.
     */
    const runLength = trailingRun(occasions)
    if (runLength < GROWTH_OCCASIONS) continue

    const run = occasions.slice(occasions.length - runLength)
    const latest = run[run.length - 1]
    if (latest === undefined) continue
    if (answeredSince(situation, ref, latest.episode.shownAt)) continue

    /*
     * And whether the run says anything about generalisation — AUD-0017.
     *
     * The count is unchanged; what is added is that three occasions in one
     * place do not support "independently now". Where they do not span two
     * settings the app says so instead, which is a more useful sentence than a
     * hedge and is the one the finding asks for.
     */
    const spread = settingsIn(run)
    const kind: GrowthSuggestionKind =
      spread >= SETTINGS_FOR_SETTLED ? 'settled' : 'widen-the-setting'

    const person = situation.entities.linked(skill.id, 'about-person')
    const who = person?.label ?? 'she'
    const otherWay = occasions.filter((occasion) => !occasion.cleared)

    /*
     * Said once, not twice.
     *
     * The first wording was "has managed ordering her own food **on her own** 3
     * times running", which says independently twice in eight words — and the
     * skill label supplies the first one, so any sentence that adds a second is
     * going to stumble. "Handled" carries it on its own, and the statement uses
     * "independently" where the label does not repeat it.
     *
     * It is worth the care: this is the app making a claim about his daughter,
     * and the whole point of asking rather than deciding is that he reads the
     * sentence and judges it.
     */
    out.push({
      kind,
      skill: ref,
      domain: skill.domain,
      person: person === undefined ? undefined : { id: person.id, kind: person.kind },
      headline:
        kind === 'settled'
          ? `${who} has handled ${skill.label} ${runLength} times in a row, in more than one place.`
          : `${who} has handled ${skill.label} ${runLength} times in a row, ${describeSpread(run)}.`,
      occasionsSummary: describeOccasions(occasions.length, otherWay.length),
      statement: `${who} handles ${skill.label} independently now.`,
      occasions: occasions.length,
      cleared: occasions.filter((occasion) => occasion.cleared).length,
      wentOtherWay: otherWay.length,
      runLength,
      confidence: confidenceIn(occasions),
      evidence: run.map((occasion) => occasion.episode.recommendation),
    })
  }

  return out
}

/**
 * The occasions that went the other way, counted and never rated.
 *
 * Gate item three of this phase in one line: the suggestion states how many
 * occasions went the other way. Counts of occasions are legitimate and
 * necessary — the owner cannot judge a sufficiency claim about his own daughter
 * without them — and the denominator-as-rate construction is not, because a
 * ratio repeated week after week becomes a report card whatever the intent
 * (D-112, section 4.4).
 *
 * Absent when there is nothing to say, rather than announcing a zero about a
 * four-year-old.
 */
/**
 * Why a run does not yet support "settled", in the owner's own terms.
 *
 * Two cases, and they are different claims. The app either knows the occasions
 * were all in one place, or it does not know where they were — and saying "all
 * at the same place" about a run it has no settings for would be asserting the
 * very fact it is short of (D-038).
 */
function describeSpread(run: readonly GrowthOccasion[]): string {
  const known = run.filter((occasion) => occasion.occasion?.setting !== undefined).length
  if (known === 0) return 'and the record does not say where'
  return 'all in the same place'
}

function describeOccasions(total: number, otherWay: number): string | undefined {
  if (otherWay === 0) return undefined
  const goes = otherWay === 1 ? 'one earlier go' : `${otherWay} earlier goes`
  const chances = total === 1 ? 'one go' : `${total} goes`
  return `She has had ${chances} at it in the record, and ${goes} needed a hand.`
}

export interface GrowthAnswerMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt?: Instant
}

/**
 * The owner's answer, as a canonical record.
 *
 * Agreeing is a `domain-update`: the app's understanding of that area changed,
 * and the sentence is what changed. "Not yet" is a `coverage-update`: nothing
 * about the skill changed, and the area has nonetheless just been reviewed by
 * the person who would know — which is real coverage, and the coverage engine
 * reads it as such rather than continuing to call the area quiet.
 *
 * Both are read. That is the point of choosing these two kinds over a flag.
 */
export function growthAnswerRecord(
  suggestion: GrowthSuggestion,
  agreed: boolean,
  moment: GrowthAnswerMoment,
  id: RecordId = newRecordId(),
): DomainUpdateRecord | CoverageUpdateRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: GROWTH_PROVENANCE })
  const domain = suggestion.domain
  const entities = [
    suggestion.skill,
    ...(suggestion.person === undefined ? [] : [suggestion.person]),
  ]
  const envelope = {
    occurredAt: moment.now,
    ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
    id,
    domains: [domain],
    entities,
  }

  return agreed
    ? build('domain-update', envelope, {
        domain,
        summary: suggestion.statement,
        /*
         * The half that changes what the app does — AUD-0015(a).
         *
         * The sentence has always been written down; what was missing was
         * anything the candidate generator could read, so his answer suppressed
         * the *suggestion* and not the *move*. Both are here now, and the
         * sentence is still exactly what he agreed to.
         */
        growthStage: { skill: suggestion.skill, stage: 'settled' },
      })
    : build('coverage-update', envelope, {
        domain,
        evidenceStrength: 'moderate',
        subArea: suggestion.skill.id,
      })
}

/** Just the record, for a surface that only wants to append it. */
export function growthAnswerRecords(
  suggestion: GrowthSuggestion,
  agreed: boolean,
  moment: GrowthAnswerMoment,
): readonly CanonicalRecord[] {
  return [growthAnswerRecord(suggestion, agreed, moment)]
}

// ---------------------------------------------------------------------------
// The stage, and what the generator does with it — AUD-0015(a)
// ---------------------------------------------------------------------------

/**
 * Where the owner says this skill has got to, and when he said so.
 *
 * Read from `domain-update` records rather than from the entity, because the
 * entity is a name and this is a judgement that changes. Append-first: the
 * latest one wins, so putting a settled skill back to `practising` is one more
 * record and nothing is edited.
 *
 * `practising` is the answer for a skill nobody has judged, and it is the same
 * answer as "he judged it and put it back" on purpose: the app's behaviour
 * should be identical in both cases, because in both cases she is working on it.
 */
export interface GrowthStanding {
  readonly stage: GrowthStage
  /** When it became settled. Undefined while it is being practised. */
  readonly settledAt: Instant | undefined
}

export function growthStandingFor(situation: Situation, skill: EntityRef): GrowthStanding {
  let latest: { at: Instant; stage: GrowthStage } | undefined
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'domain-update') continue
    if (record.occurredAt > situation.at) continue
    const stage = record.growthStage
    if (stage === undefined || stage.skill.id !== skill.id) continue
    if (latest === undefined || record.occurredAt >= latest.at) {
      latest = { at: record.occurredAt, stage: stage.stage }
    }
  }
  if (latest === undefined || latest.stage !== 'settled') {
    return { stage: 'practising', settledAt: undefined }
  }
  return { stage: 'settled', settledAt: latest.at }
}

/**
 * Whether a settled skill is due an occasional check — AUD-0015(a).
 *
 * The interval doubles with every probe that has actually happened since it
 * settled, so the app asks less and less. It never reaches zero and it never
 * becomes a schedule.
 *
 * A skill that is being practised is not probed: it is simply proposed, which
 * is what the generator has always done.
 */
export function maintenanceProbeDue(situation: Situation, skill: EntityRef): boolean {
  const standing = growthStandingFor(situation, skill)
  if (standing.stage !== 'settled' || standing.settledAt === undefined) return false

  const today = localDayIdAt(situation.at, situation.zone)
  const settledOn = localDayIdAt(standing.settledAt, situation.zone)
  const sinceSettled = Math.max(0, localDaysBetween(settledOn, today))

  const settledAt = standing.settledAt
  const probes = occasionsFor(situation, skill).filter(
    (episode) => wasAttempted(episode) && episode.shownAt > settledAt,
  ).length

  const days = daysSincePractice(situation, skill)
  const sinceLast = days ?? sinceSettled
  return sinceLast >= MAINTENANCE_FIRST_DAYS * 2 ** probes
}

/**
 * The owner putting a skill back, or forward, in one tap — AUD-0015(a).
 *
 * **A stored judgement about a child must be correctable and reversible**, and
 * the finding says why in one line: regression is real in children, and the app
 * must never make "settled" permanent. So this is the same record kind his
 * confirmation writes, with the stage he chose and a sentence saying what he
 * chose — nothing is edited, and the earlier judgement stays exactly as he made
 * it.
 */
export function growthStageRecord(
  skill: EntityRef,
  label: string,
  domain: LifeDomainId,
  stage: GrowthStage,
  moment: GrowthAnswerMoment,
  id: RecordId = newRecordId(),
): DomainUpdateRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: GROWTH_PROVENANCE })
  return build(
    'domain-update',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [domain],
      entities: [skill],
    },
    {
      domain,
      summary: stage === 'settled' ? `${label} is settled.` : `${label} is being worked on again.`,
      growthStage: { skill, stage },
    },
  )
}
