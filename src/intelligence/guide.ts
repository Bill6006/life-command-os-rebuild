import { localDayIdAt } from '../domain/time'
import type { MemoryView } from '../memory/view'
import {
  decide,
  probeSwings,
  type Decision,
  type DecideOptions,
  type DecisionMoment,
} from './engine'
import { GUIDE_PROVENANCE, questionFor, type QuestionOption, type QuestionSpec } from './questions'

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
export const QUESTIONS_PER_DAY = 4

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

  const swings = probeSwings(view, moment, options, decision)
  const worthAsking = swings.find((swing) => swing.changesTheAnswer)

  if (worthAsking === undefined) {
    return {
      kind: 'settled',
      question: undefined,
      decision,
      askedToday,
      because:
        swings.length === 0
          ? 'nothing left worth asking about'
          : `${swings.length} question(s) could be asked and none of them would change the answer`,
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
      options: spec.options,
      outcomes: worthAsking.outcomes,
    },
    decision,
    askedToday,
    because: `the answer to “${worthAsking.label.toLowerCase()}” lands in different places`,
  }
}
