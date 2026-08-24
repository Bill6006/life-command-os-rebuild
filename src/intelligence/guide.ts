import type { CanonicalRecord } from '../domain/records'
import { localDayIdAt } from '../domain/time'
import { buildView, type MemoryView } from '../memory/view'
import { awaitedReadings } from './derived'
import {
  decide,
  probeSwings,
  type Decision,
  type DecideOptions,
  type DecisionMoment,
} from './engine'
import {
  GUIDE_PROVENANCE,
  QUESTIONS,
  questionFor,
  type QuestionOption,
  type QuestionSpec,
} from './questions'
import type { Swing } from './trace'

/**
 * The adaptive guide (canonical plan section 12).
 *
 * Section 12 replaces the fixed questionnaire with a loop: show one question,
 * record the answer, recompute immediately, work out whether another answer
 * could materially change the recommendation, ask again only if it could, stop
 * when enough is known.
 *
 * The fifth step is the one that is easy to fake and hard to do. "Could this
 * change the recommendation?" is answered here by actually finding out — the
 * decision is re-run under each possible answer through the whole pipeline, and
 * a question is worth asking only when the answers genuinely land somewhere
 * different. It is why the guide can ask zero questions, which section 12
 * explicitly requires and no questionnaire can do.
 *
 * The consequence is worth stating plainly: **a question the owner would find
 * pointless is one this cannot ask**, because a question that cannot change the
 * answer is filtered by the same measurement that ranks the answers.
 */

/**
 * How many the guide will ask in one owner-local day, whatever the swings say.
 *
 * The swing rule is the real stopping condition. This is a floor under the
 * owner's patience: section 47 fails the phase outright if the answer is "too
 * many questions", and a run of individually-justified questions is still a
 * run of questions.
 */
export const QUESTIONS_PER_DAY = 3

/**
 * How much of a question has to be live before it is worth asking: half of it.
 *
 * One answer out of four is not enough — a question where a single corner-case
 * answer would move the recommendation is technically capable of changing it
 * and practically a waste of a tap, and because the guide re-asks after every
 * answer, a run of those is how "too many questions" happens without any single
 * question being unjustifiable.
 *
 * The share matters rather than the count, and that is the correction. An
 * earlier version required two answers outright, which quietly made every
 * two-option question unaskable: one of the two answers is almost always the
 * situation the engine is already standing in, so a binary question can only
 * ever reach one. "Is she with you tonight?" sat at 1-of-2 in every scenario in
 * the library and was never asked, while answering yes would have turned a solo
 * walk into an afternoon with his daughter. Half of two is one.
 */
function worthATap(overturns: number, options: number): boolean {
  return options > 0 && overturns * 2 >= options
}

export interface GuideQuestion {
  readonly spec: QuestionSpec
  readonly prompt: string
  readonly options: readonly QuestionOption[]
  /** What the answers would lead to. Shown in QA, not to the owner. */
  readonly outcomes: readonly { readonly answer: string; readonly wouldChoose: string }[]
}

export interface GuideStep {
  readonly kind: 'question' | 'settled'
  readonly question: GuideQuestion | undefined
  readonly decision: Decision
  readonly askedToday: number
  /** Why the guide is asking, or why it stopped. QA copy. */
  readonly because: string
}

/**
 * Of the questions that would change the answer, the one that changes it most.
 *
 * An earlier version took the first question in the catalogue's order, which
 * meant the guide could ask about last night's sleep while the recommendation
 * actually turned on how much of the evening was left. Order is a reasonable
 * last resort and a poor first one.
 *
 * Two measures, both taken from the probe rather than assumed. How many
 * different places the answers lead — a question with three outcomes is
 * genuinely more open than one with two. Then how many of the answers lead
 * somewhere other than where the engine currently stands, because a decision
 * most answers would overturn is a decision resting on very little.
 */
function mostValuable(swings: readonly Swing[], decision: Decision): Swing | undefined {
  const standing =
    decision.evaluation?.candidate.id ?? `nothing (${decision.noAction?.reason ?? 'unknown'})`
  const order = QUESTIONS.map((question) => question.concept)

  /*
   * How far past its own mark this concept has gone — section 8's contribution
   * to adaptive question selection, and deliberately the smallest one that is
   * honest.
   *
   * **Coverage never makes a question askable.** It sits below the two
   * measurements that already decide that, and above the catalogue's order,
   * which is what it replaces: order was a reasonable last resort and carried
   * no information at all. Between two questions the engine has already judged
   * equally worth a tap, the one about the thing nobody has mentioned for
   * longest is the better use of it.
   *
   * Putting coverage any higher would be the failure DEF-0008 records and
   * section 47 fails a phase for: a coverage engine that can create questions
   * is the most likely thing yet built to turn a guide into a questionnaire.
   */
  const overdue = (concept: Swing['concept']): number => {
    for (const domain of decision.situation.coverage.domains) {
      for (const entry of domain.concepts) {
        if (entry.concept !== concept) continue
        if (entry.daysSince === undefined || entry.neglectedAfterDays === undefined) return 0
        return entry.daysSince / entry.neglectedAfterDays
      }
    }
    return 0
  }

  const rank = (swing: Swing) => ({
    outcomes: new Set(swing.outcomes.map((outcome) => outcome.wouldChoose)).size,
    overturns: swing.outcomes.filter((outcome) => outcome.wouldChoose !== standing).length,
    options: questionFor(swing.concept)?.options(decision.situation).length ?? 0,
    overdue: overdue(swing.concept),
    position: order.indexOf(swing.concept),
  })

  const beats = (mine: ReturnType<typeof rank>, theirs: ReturnType<typeof rank>): boolean => {
    if (mine.outcomes !== theirs.outcomes) return mine.outcomes > theirs.outcomes
    if (mine.overturns !== theirs.overturns) return mine.overturns > theirs.overturns
    if (mine.overdue !== theirs.overdue) return mine.overdue > theirs.overdue
    return mine.position < theirs.position
  }

  let best: Swing | undefined
  let bestRank: ReturnType<typeof rank> | undefined

  for (const swing of swings) {
    if (!swing.changesTheAnswer) continue
    const scored = rank(swing)
    if (!worthATap(scored.overturns, scored.options)) continue
    if (bestRank === undefined || beats(scored, bestRank)) {
      best = swing
      bestRank = scored
    }
  }

  return best
}

/**
 * Whether the last thing the owner told the guide actually moved anything.
 *
 * The guide asks its best question first, so if that one changed nothing, the
 * ones behind it are by construction worth less — and carrying on is how a
 * sequence of individually reasonable questions becomes the "too many
 * questions" the phase fails on. The decision is replayed without the most
 * recent answer and compared, which costs one extra pass and is the only
 * honest way to know.
 *
 * Returns undefined when the guide has not asked anything yet today.
 */
function lastAnswerMovedIt(
  view: MemoryView,
  moment: DecisionMoment,
  options: DecideOptions,
  standing: Decision,
): boolean | undefined {
  const today = localDayIdAt(moment.now, moment.zone)
  let latest: CanonicalRecord | undefined
  for (const record of view.history.effective) {
    if (record.provenance.writtenBy !== GUIDE_PROVENANCE.writtenBy) continue
    if (localDayIdAt(record.occurredAt, moment.zone) !== today) continue
    // By when it was written down, not by when it is about: every answer in a
    // session is about the same moment, so `occurredAt` cannot separate them.
    if (latest === undefined || record.recordedAt > latest.recordedAt) latest = record
  }
  if (latest === undefined) return undefined

  const without = buildView(
    {
      ...view.snapshot,
      records: view.snapshot.records.filter((record) => record.id !== latest.id),
    },
    {
      now: moment.now,
      zone: moment.zone,
      ...(moment.weekStartsOn === undefined ? {} : { weekStartsOn: moment.weekStartsOn }),
    },
  )

  const before = decide(without, moment, { ...options, probe: false })
  return choiceOf(before) !== choiceOf(standing)
}

function choiceOf(decision: Decision): string {
  return decision.evaluation?.candidate.id ?? `nothing (${decision.noAction?.reason ?? 'unknown'})`
}

export function answeredToday(view: MemoryView, moment: DecisionMoment): number {
  const today = localDayIdAt(moment.now, moment.zone)
  let count = 0
  for (const record of view.history.effective) {
    if (record.provenance.writtenBy !== GUIDE_PROVENANCE.writtenBy) continue
    if (localDayIdAt(record.occurredAt, moment.zone) !== today) continue
    count += 1
  }
  return count
}

export function nextGuideStep(
  view: MemoryView,
  moment: DecisionMoment,
  options: DecideOptions = {},
): GuideStep {
  const decision = decide(view, moment, { ...options, probe: false })
  const askedToday = answeredToday(view, moment)

  if (askedToday >= QUESTIONS_PER_DAY) {
    return {
      kind: 'settled',
      question: undefined,
      decision,
      askedToday,
      because: `already asked ${askedToday} today — that is enough`,
    }
  }

  if (lastAnswerMovedIt(view, moment, options, decision) === false) {
    return {
      kind: 'settled',
      question: undefined,
      decision,
      askedToday,
      because: 'the last answer did not move it, and the best question was the one already asked',
    }
  }

  /*
   * A reading a result is waiting on — section 8's first preference, as a
   * question rather than as an inference.
   *
   * The morning after an early night, the app would otherwise put "how much did
   * winding down do for your sleep?" on screen. There is a better question
   * available for the same fact: how much sleep did you actually get. It is
   * concrete, it is the one he would expect, it feeds the recovery model, and
   * the grade falls out of it — `derived.ts` writes the outcome from the
   * answer, so the second question never has to be asked at all.
   *
   * **This does not raise the number of things asked for**, which is the rule
   * DEF-0008 exists to protect and section 47 fails a phase on. `outcomes.ts`
   * holds the effect question back for exactly the episodes this fires on, so
   * one card is swapped for a better one. The daily floor above still applies,
   * and if he answers nothing the window closes and the result is unknown —
   * which section 20 lists as a real and acceptable state.
   */
  const waiting = awaitedReadings(view, { now: moment.now, zone: moment.zone })
  for (const concept of waiting) {
    // `awaitedReadings` has already established that this is worth asking —
    // the check lives there because `outcomes.ts` has to make the identical
    // judgement to decide whether to hold its own question back, and two
    // copies of one rule is how the two ends of a swap stop agreeing.
    const entry = view.facts.get(concept)
    const spec = questionFor(concept)
    if (entry === undefined || spec === undefined) continue
    return {
      kind: 'question',
      question: {
        spec,
        prompt: spec.prompt(decision.situation),
        options: spec.options(decision.situation),
        outcomes: [],
      },
      decision,
      askedToday,
      because: `a result is waiting on “${entry.definition.label.toLowerCase()}”, and asking for the reading beats asking for a verdict`,
    }
  }

  const swings = probeSwings(view, moment, options, decision)
  const worthAsking = mostValuable(swings, decision)

  if (worthAsking === undefined) {
    /*
     * Two different reasons for stopping, and they had been sharing a sentence.
     *
     * The inspector was reporting four questions as changing the answer while
     * the line beneath it said none of them would — both taken from the same
     * run. They are not the same claim: a question whose answers all land in
     * the same place cannot change anything, and a question where one answer in
     * four would is simply not worth a tap. Saying the second in the words of
     * the first is the inspector contradicting itself.
     */
    const movable = swings.filter((swing) => swing.changesTheAnswer).length
    return {
      kind: 'settled',
      question: undefined,
      decision,
      askedToday,
      because:
        swings.length === 0
          ? 'nothing left worth asking about'
          : movable === 0
            ? `${swings.length} question(s) could be asked and none of them would change the answer`
            : `${movable} of ${swings.length} could change the answer, and none on enough of their answers to be worth a tap`,
    }
  }

  const spec = questionFor(worthAsking.concept)
  if (spec === undefined) {
    return {
      kind: 'settled',
      question: undefined,
      decision,
      askedToday,
      because: 'nothing left worth asking about',
    }
  }

  return {
    kind: 'question',
    question: {
      spec,
      prompt: spec.prompt(decision.situation),
      options: spec.options(decision.situation),
      outcomes: worthAsking.outcomes,
    },
    decision,
    askedToday,
    because: `the answer to “${worthAsking.label.toLowerCase()}” lands in different places`,
  }
}
